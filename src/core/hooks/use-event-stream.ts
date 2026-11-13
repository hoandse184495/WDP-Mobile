import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/stores/session-store';
import { getApiToken, rejectApiSession } from '@/core/network/api-client';
import {
  connectEventStream,
  type ServerEvent,
  type StreamStatus,
} from '@/core/network/event-stream';
type Listener = { event: (event: ServerEvent) => void; status: (status: StreamStatus) => void };
type Shared = { token: string; status: StreamStatus; listeners: Set<Listener>; stop: () => void };
const connections = new WeakMap<QueryClient, Map<string, Shared>>();
export function acquireEventStream(
  client: QueryClient,
  path: string,
  token: string,
  listener: Listener,
) {
  let channels = connections.get(client);
  if (!channels) {
    channels = new Map();
    connections.set(client, channels);
  }
  let shared = channels.get(path);
  if (shared && shared.token !== token) {
    shared.stop();
    channels.delete(path);
    shared = undefined;
  }
  if (!shared) {
    shared = { token, status: 'connecting', listeners: new Set(), stop: () => {} };
    channels.set(path, shared);
    const current = shared;
    current.listeners.add(listener);
    current.stop = connectEventStream({
      path,
      token,
      isCurrent: () => getApiToken() === token,
      onEvent: (event) => {
        for (const item of [...current.listeners]) item.event(event);
      },
      onStatus: (status) => {
        current.status = status;
        for (const item of [...current.listeners]) item.status(status);
      },
      onDenied: (reason) => {
        if (reason === 'session') rejectApiSession(token);
      },
    });
  } else {
    shared.listeners.add(listener);
    listener.status(shared.status);
  }
  const current = shared;
  return () => {
    current.listeners.delete(listener);
    if (!current.listeners.size) {
      current.stop();
      if (channels?.get(path) === current) channels.delete(path);
    }
  };
}
function foreground() {
  return (
    AppState.currentState !== 'background' &&
    AppState.currentState !== 'inactive' &&
    (typeof document === 'undefined' || document.visibilityState !== 'hidden')
  );
}
export function useEventStream(
  path: string,
  enabled: boolean,
  onEvent: (event: ServerEvent) => void,
): StreamStatus {
  const client = useQueryClient();
  const session = useSession((state) => state);
  const [active, setActive] = useState(foreground);
  const [status, setStatus] = useState<StreamStatus>('paused');
  const callback = useRef(onEvent);
  useEffect(() => {
    callback.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    const update = () => setActive(foreground());
    const sub = AppState.addEventListener('change', update);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', update);
    return () => {
      sub.remove();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', update);
    };
  }, []);
  useEffect(() => {
    const token = getApiToken();
    if (!enabled || !active || session.status !== 'authenticated' || !token) {
      return;
    }
    return acquireEventStream(client, path, token, {
      event: (event) => callback.current(event),
      status: setStatus,
    });
  }, [client, path, enabled, active, session.status, session.user?._id, session.user?.role]);
  return !enabled || !active || session.status !== 'authenticated' ? 'paused' : status;
}
