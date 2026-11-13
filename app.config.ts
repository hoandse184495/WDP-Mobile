import { ConfigContext, ExpoConfig } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => {
  const development = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') === 'development';
  if (!development && !process.env.EXPO_PUBLIC_API_URL?.startsWith('https://')) {
    throw new Error('Staging/production cần EXPO_PUBLIC_API_URL dùng HTTPS.');
  }
  return {
    ...config,
    name: 'EquinePro',
    slug: 'equinepro-mobile',
    scheme: 'equinepro',
    userInterfaceStyle: 'light',
    ios: {
      ...config.ios,
      icon: './assets/images/icon.png',
      bundleIdentifier: 'com.equinepro.mobile',
      supportsTablet: true,
    },
    android: {
      ...config.android,
      package: 'com.equinepro.mobile',
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
      adaptiveIcon: { foregroundImage: './assets/images/icon.png', backgroundColor: '#126B51' },
    },
    plugins: [
      'expo-asset',
      'expo-sharing',
      '@react-native-community/datetimepicker',
      'expo-router',
      'expo-secure-store',
      [
        'expo-splash-screen',
        { backgroundColor: '#F5F7F3', image: './assets/images/icon.png', imageWidth: 100 },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Cho phép chọn ảnh để ghi nhận công việc và sự cố.',
          cameraPermission: 'Cho phép chụp ảnh bằng chứng công việc và sự cố.',
          microphonePermission: false,
        },
      ],
      [
        'expo-build-properties',
        { android: { usesCleartextTraffic: development }, ios: { deploymentTarget: '16.4' } },
      ],
    ],
    experiments: { typedRoutes: true },
  };
};
