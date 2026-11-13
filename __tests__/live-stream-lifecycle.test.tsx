import { act, renderHook, cleanup } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { acquireEventStream, useEventStream } from '@/core/hooks/use-event-stream';
import { connectEventStream } from '@/core/network/event-stream';
import { setApiToken, onUnauthorized } from '@/core/network/api-client';
import { useSession } from '@/features/auth/stores/session-store';
import type { PropsWithChildren } from 'react';
jest.mock('@/core/network/event-stream', () => ({ connectEventStream: jest.fn(() => jest.fn()) }));
const connect = jest.mocked(connectEventStream),
  path = '/notifications/stream',
  listener = () => ({ event: jest.fn(), status: jest.fn() });
beforeEach(() => {
  jest.clearAllMocks();
  setApiToken('one');
  useSession.setState({
    status: 'authenticated',
    user: {
      _id: 'a'.repeat(24),
      fullName: 'An',
      email: 'an@example.com',
      role: 'groom',
      isActive: true,
    },
  });
});
afterEach(() => {
  cleanup();
  setApiToken(null);
  useSession.setState({ status: 'guest', user: null });
});
test('two consumers share one authenticated stream until last release', () => {
  const client = new QueryClient(),
    a = listener(),
    b = listener(),
    offA = acquireEventStream(client, path, 'one', a),
    offB = acquireEventStream(client, path, 'one', b);
  expect(connect).toHaveBeenCalledTimes(1);
  const config = connect.mock.calls[0][0],
    stop = connect.mock.results[0].value;
  config.onEvent({ type: 'refresh', data: '{}' });
  expect(a.event).toHaveBeenCalledTimes(1);
  expect(b.event).toHaveBeenCalledTimes(1);
  offA();
  expect(stop).not.toHaveBeenCalled();
  offB();
  expect(stop).toHaveBeenCalledTimes(1);
  client.clear();
});
test('old subscriber disposal cannot close or remove new session stream', () => {
  const client = new QueryClient(),
    offOld = acquireEventStream(client, path, 'one', listener()),
    oldStop = connect.mock.results[0].value;
  setApiToken('two');
  const offNew = acquireEventStream(client, path, 'two', listener()),
    newStop = connect.mock.results[1].value;
  expect(oldStop).toHaveBeenCalledTimes(1);
  offOld();
  expect(newStop).not.toHaveBeenCalled();
  const offExtra = acquireEventStream(client, path, 'two', listener());
  expect(connect).toHaveBeenCalledTimes(2);
  offExtra();
  offNew();
  expect(newStop).toHaveBeenCalledTimes(1);
  client.clear();
});
test('session revocation signs out only matching token; access rejection leaves session', () => {
  const logout = jest.fn(),
    client = new QueryClient();
  onUnauthorized(logout);
  const off = acquireEventStream(client, path, 'one', listener()),
    config = connect.mock.calls[0][0];
  config.onDenied('access');
  expect(logout).not.toHaveBeenCalled();
  setApiToken('two');
  config.onDenied('session');
  expect(logout).not.toHaveBeenCalled();
  setApiToken('one');
  config.onDenied('session');
  expect(logout).toHaveBeenCalledTimes(1);
  off();
  onUnauthorized(() => {});
  client.clear();
});
test('background pauses stream, foreground reconnects and logout closes it', async () => {
  let state = 'active',
    change!: (state: typeof AppState.currentState) => void;
  const descriptor = Object.getOwnPropertyDescriptor(AppState, 'currentState');
  Object.defineProperty(AppState, 'currentState', { configurable: true, get: () => state });
  const subscription = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((event, callback) => {
      change = callback as typeof change;
      return { remove: jest.fn() };
    });
  const client = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  try {
    const hook = await renderHook(() => useEventStream(path, true, jest.fn()), { wrapper });
    expect(connect).toHaveBeenCalledTimes(1);
    const stop = connect.mock.results[0].value;
    await act(() => {
      state = 'background';
      change('background');
    });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toBe('paused');
    await act(() => {
      state = 'active';
      change('active');
    });
    expect(connect).toHaveBeenCalledTimes(2);
    await act(() => {
      setApiToken(null);
      useSession.setState({ status: 'guest', user: null });
    });
    expect(connect.mock.results[1].value).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toBe('paused');
    await hook.unmount();
  } finally {
    subscription.mockRestore();
    if (descriptor) Object.defineProperty(AppState, 'currentState', descriptor);
    client.clear();
  }
});
