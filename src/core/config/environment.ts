export function validateApiUrl(value: string | undefined, environment: string) {
  if (!value) throw new Error('Thiếu EXPO_PUBLIC_API_URL. Hãy cấu hình .env theo README.');
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('API URL phải là URL HTTP(S), không chứa tài khoản, query hoặc fragment.');
  }
  if (environment !== 'development' && url.protocol !== 'https:') {
    throw new Error('Staging/production bắt buộc dùng HTTPS.');
  }
  return value.replace(/\/+$/, '');
}

export const environment = {
  name: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  // Validate at bootstrap so a configuration error can be displayed in the UI.
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
};
