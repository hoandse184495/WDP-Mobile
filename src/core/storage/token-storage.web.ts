// Metro selects this file on web; native apps keep using SecureStore.
const key = 'equinepro.access-token';

export const tokenStorage = {
  read: async (): Promise<string | null> =>
    typeof window === 'undefined' ? null : window.sessionStorage.getItem(key),
  write: async (token: string): Promise<void> => {
    if (typeof window === 'undefined') throw new Error('Không thể lưu phiên ngoài trình duyệt.');
    window.sessionStorage.setItem(key, token);
  },
  clear: async (): Promise<void> => {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
  },
};
