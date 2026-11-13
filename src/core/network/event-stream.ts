import { fetch as streamFetch } from 'expo/fetch';
import { environment, validateApiUrl } from '@/core/config/environment';
export type StreamStatus = 'connecting' | 'connected' | 'reconnecting' | 'paused' | 'denied';
export interface ServerEvent {
  type: string;
  data: string;
}
export type StreamBody = {
  getReader(): {
    read(): Promise<{ done: boolean; value?: Uint8Array }>;
    cancel(): Promise<void>;
    releaseLock(): void;
  };
};
export type StreamFetcher = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal; cache: 'no-store' },
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  body: StreamBody | null;
}>;
export async function consumeEvents(
  body: StreamBody,
  onEvent: (event: ServerEvent) => void,
  signal: AbortSignal,
  onActivity: () => void = () => {},
) {
  const reader = body.getReader(),
    decoder = new TextDecoder();
  let buffer = '';
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      onActivity();
      buffer += decoder.decode(value, { stream: true });
      let delimiter: RegExpExecArray | null;
      while ((delimiter = /\r?\n\r?\n/.exec(buffer))) {
        const block = buffer.slice(0, delimiter.index);
        buffer = buffer.slice(delimiter.index + delimiter[0].length);
        if (block.length > 131072) throw new Error('Luồng dữ liệu vượt giới hạn.');
        const lines = block.split(/\r?\n/);
        let type = 'message';
        const data: string[] = [];
        for (const line of lines) {
          if (line.startsWith('event:')) type = line.slice(6).trim();
          if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
        }
        if (data.length && !signal.aborted) onEvent({ type, data: data.join('\n') });
      }
      if (buffer.length > 131072) throw new Error('Luồng dữ liệu vượt giới hạn.');
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export function connectEventStream({
  path,
  token,
  isCurrent,
  onEvent,
  onStatus,
  onDenied,
  fetcher = streamFetch as StreamFetcher,
}: {
  path: string;
  token: string;
  isCurrent: () => boolean;
  onEvent: (event: ServerEvent) => void;
  onStatus: (status: StreamStatus) => void;
  onDenied: (reason: 'session' | 'access') => void;
  fetcher?: StreamFetcher;
}) {
  let stopped = false,
    controller: AbortController | undefined,
    retry: ReturnType<typeof setTimeout> | undefined,
    watchdog: ReturnType<typeof setTimeout> | undefined,
    failures = 0;
  const stop = () => {
    stopped = true;
    clearTimeout(retry);
    clearTimeout(watchdog);
    controller?.abort();
  };
  const denied = (reason: 'session' | 'access') => {
    if (stopped || !isCurrent()) return;
    onStatus('denied');
    stop();
    onDenied(reason);
  };
  const connect = async () => {
    if (stopped || !isCurrent()) return;
    controller = new AbortController();
    const signal = controller.signal;
    const alive = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => controller?.abort(), 45000);
    };
    onStatus('connecting');
    alive();
    try {
      if (!path.startsWith('/') || path.startsWith('//'))
        throw new Error('Đường dẫn luồng không hợp lệ.');
      const base = validateApiUrl(environment.apiUrl, __DEV__ ? environment.name : 'production');
      const response = await fetcher(base + path, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'text/event-stream' },
        signal,
        cache: 'no-store',
      });
      if (stopped || !isCurrent()) {
        const reader = response.body?.getReader();
        if (reader) {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
        return;
      }
      if ([401, 403, 404].includes(response.status)) {
        denied(response.status === 401 ? 'session' : 'access');
        return;
      }
      if (
        !response.ok ||
        !response.body ||
        !response.headers.get('content-type')?.includes('text/event-stream')
      )
        throw new Error('Không kết nối được luồng cập nhật.');
      await consumeEvents(
        response.body,
        (event) => {
          if (stopped || !isCurrent()) return;
          if (event.type === 'session_revoked') {
            denied('session');
            return;
          }
          if (event.type === 'unavailable') {
            denied('access');
            return;
          }
          failures = 0;
          alive();
          onStatus('connected');
          onEvent(event);
        },
        signal,
        alive,
      );
    } catch {
      /* Reconnect with a bounded delay; never log tokens or payloads. */
    } finally {
      clearTimeout(watchdog);
    }
    if (!stopped && isCurrent()) {
      onStatus('reconnecting');
      retry = setTimeout(
        () => void connect(),
        Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)),
      );
    }
  };
  void connect();
  return stop;
}
