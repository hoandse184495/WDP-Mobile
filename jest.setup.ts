import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';
jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
}));

// Native streaming is tested with deterministic stream fixtures, never real network.
jest.mock('expo/fetch', () => ({
  fetch: jest.fn(async () => {
    throw new Error('Stream transport is mocked in tests');
  }),
}));

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
