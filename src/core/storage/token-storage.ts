import * as SecureStore from 'expo-secure-store';

const key = 'equinepro.access-token';
export const tokenStorage = {
  read: () => SecureStore.getItemAsync(key),
  write: (token: string) =>
    SecureStore.setItemAsync(key, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  clear: () => SecureStore.deleteItemAsync(key),
};
