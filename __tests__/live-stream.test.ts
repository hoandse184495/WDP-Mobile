import { TextEncoder, TextDecoder } from 'node:util';
import {
  consumeEvents,
  connectEventStream,
  type StreamBody,
  type StreamFetcher,
} from '@/core/network/event-stream';
import { environment } from '@/core/config/environment';
Object.assign(globalThis, { TextEncoder, TextDecoder });
const encoder = new TextEncoder();
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
function body(chunks: Uint8Array[]) {
  const reader = {
    read: jest.fn(async () =>
      chunks.length ? { done: false, value: chunks.shift() } : { done: true },
    ),
    cancel: jest.fn(async () => {}),
    releaseLock: jest.fn(),
  };
  return { getReader: () => reader, reader };
}
const response = (stream: StreamBody | null, status = 200) => ({
  ok: status === 200,
  status,
  headers: { get: () => 'text/event-stream' },
  body: stream,
});
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
  jest.useFakeTimers();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
test('decodes fragmented UTF-8, CRLF, multiline payloads and comments', async () => {
  const bytes = encoder.encode(
    ': heartbeat\r\n\r\nevent: refresh\r\ndata: Chấn thương\r\ndata: mới\r\n\r\ndata: next\n\n',
  );
  const stream = body(Array.from(bytes, (b) => Uint8Array.of(b))),
    events = jest.fn();
  await consumeEvents(stream, events, new AbortController().signal);
  expect(events.mock.calls.map((x) => x[0])).toEqual([
    { type: 'refresh', data: 'Chấn thương\nmới' },
    { type: 'message', data: 'next' },
  ]);
  expect(stream.reader.cancel).toHaveBeenCalled();
  expect(stream.reader.releaseLock).toHaveBeenCalled();
});
test('oversized event is rejected and reader released', async () => {
  const stream = body([encoder.encode('data: ' + 'x'.repeat(131073))]);
  await expect(consumeEvents(stream, jest.fn(), new AbortController().signal)).rejects.toThrow(
    'giới hạn',
  );
  expect(stream.reader.releaseLock).toHaveBeenCalled();
});
test('abort cancels blocked reader and suppresses subsequent packets', async () => {
  let resolve!: (value: { done: boolean; value?: Uint8Array }) => void;
  const read = jest.fn(
    () =>
      new Promise<{ done: boolean; value?: Uint8Array }>((r) => {
        resolve = r;
      }),
  );
  const reader = {
    read,
    cancel: jest.fn(async () => {
      resolve({ done: true });
    }),
    releaseLock: jest.fn(),
  };
  const controller = new AbortController(),
    event = jest.fn();
  const pending = consumeEvents({ getReader: () => reader }, event, controller.signal);
  controller.abort();
  await pending;
  expect(event).not.toHaveBeenCalled();
  expect(reader.releaseLock).toHaveBeenCalled();
});
test.each([401, 403, 404])(
  'HTTP %s stops retries and distinguishes session versus scope',
  async (status) => {
    const denied = jest.fn(),
      fetcher = jest.fn(async () => response(null, status));
    const stop = connectEventStream({
      path: '/notifications/stream',
      token: 'private-token',
      isCurrent: () => true,
      onEvent: jest.fn(),
      onStatus: jest.fn(),
      onDenied: denied,
      fetcher,
    });
    await flush();
    expect(denied).toHaveBeenCalledWith(status === 401 ? 'session' : 'access');
    await jest.advanceTimersByTimeAsync(60000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    stop();
  },
);
test('uses bearer header, bounded reconnect and cancels retries on disposal', async () => {
  const fetcher = jest.fn(async () => {
      throw Error('offline');
    }),
    statuses = jest.fn();
  const stop = connectEventStream({
    path: '/notifications/stream',
    token: 'private-token',
    isCurrent: () => true,
    onEvent: jest.fn(),
    onStatus: statuses,
    onDenied: jest.fn(),
    fetcher,
  });
  await flush();
  expect((fetcher.mock.calls[0] as unknown[])[0]).toBe(
    'http://10.0.2.2:3000/api/notifications/stream',
  );
  expect((fetcher.mock.calls[0] as unknown[])[1]).toMatchObject({
    headers: { Authorization: 'Bearer private-token', Accept: 'text/event-stream' },
    cache: 'no-store',
  });
  await jest.advanceTimersByTimeAsync(1000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  stop();
  await jest.advanceTimersByTimeAsync(60000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
test.each([
  ['session_revoked', 'session'],
  ['unavailable', 'access'],
])('%s event shuts down stream', async (type, reason) => {
  const denied = jest.fn(),
    event = jest.fn(),
    stream = body([encoder.encode('event: ' + type + '\ndata: {}\n\n')]);
  const stop = connectEventStream({
    path: '/daily-tasks/a/telemetry/stream',
    token: 't',
    isCurrent: () => true,
    onEvent: event,
    onStatus: jest.fn(),
    onDenied: denied,
    fetcher: async () => response(stream),
  });
  await flush();
  expect(denied).toHaveBeenCalledWith(reason);
  expect(event).not.toHaveBeenCalled();
  stop();
});
test('late response from old session is cancelled without events or logout', async () => {
  let current = true,
    resolve!: (value: Awaited<ReturnType<StreamFetcher>>) => void;
  const fetcher: StreamFetcher = () =>
      new Promise((r) => {
        resolve = r;
      }),
    event = jest.fn(),
    denied = jest.fn(),
    stream = body([]);
  const stop = connectEventStream({
    path: '/notifications/stream',
    token: 'old',
    isCurrent: () => current,
    onEvent: event,
    onStatus: jest.fn(),
    onDenied: denied,
    fetcher,
  });
  current = false;
  resolve(response(stream, 401));
  await flush();
  expect(denied).not.toHaveBeenCalled();
  expect(event).not.toHaveBeenCalled();
  expect(stream.reader.releaseLock).toHaveBeenCalled();
  stop();
});
