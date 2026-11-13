import { tokenStorage } from '@/core/storage/token-storage.web';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const values = new Map<string, string>();
const storage = {
  getItem: jest.fn((key: string) => values.get(key) ?? null),
  setItem: jest.fn((key: string, value: string) => void values.set(key, value)),
  removeItem: jest.fn((key: string) => void values.delete(key)),
};
beforeEach(() => {
  values.clear();
  jest.clearAllMocks();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { sessionStorage: storage },
  });
});
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

test('browser session survives a read and is removed on logout', async () => {
  await expect(tokenStorage.read()).resolves.toBeNull();
  await tokenStorage.write('browser-session');
  await expect(tokenStorage.read()).resolves.toBe('browser-session');
  await tokenStorage.clear();
  await expect(tokenStorage.read()).resolves.toBeNull();
});

test('server render has no stored session and cannot persist a token', async () => {
  Reflect.deleteProperty(globalThis, 'window');
  await expect(tokenStorage.read()).resolves.toBeNull();
  await expect(tokenStorage.clear()).resolves.toBeUndefined();
  await expect(tokenStorage.write('token')).rejects.toThrow('ngoài trình duyệt');
});

test('blocked browser storage propagates errors to the existing session recovery flow', async () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      get sessionStorage() {
        throw new Error('Storage blocked');
      },
    },
  });
  await expect(tokenStorage.read()).rejects.toThrow('Storage blocked');
  await expect(tokenStorage.write('token')).rejects.toThrow('Storage blocked');
  await expect(tokenStorage.clear()).rejects.toThrow('Storage blocked');
});
