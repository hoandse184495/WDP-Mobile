import { cleanup, render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HorseThumbnail } from '@/features/horses/components/horse-thumbnail';
import { horseSchema } from '@/features/horses/types/horse';
import { useSession } from '@/features/auth/stores/session-store';
import { apiClient } from '@/core/network/api-client';
import { environment } from '@/core/config/environment';
jest.mock('expo-image', () => ({ Image: 'Image' }));
const id = 'a'.repeat(24),
  url = 'https://storage.example.com/horse.webp?token=temporary';
const clients: QueryClient[] = [];
const horse = { _id: id, name: 'Silver Wind', avatar: { path: 'horses/' + id + '/avatar.webp' } };
async function mount(value: Parameters<typeof HorseThumbnail>[0]['horse']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  clients.push(client);
  await render(
    <QueryClientProvider client={client}>
      <HorseThumbnail horse={value} />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
  useSession.setState({
    status: 'authenticated',
    user: {
      _id: 'groom',
      fullName: 'Groom',
      email: 'groom@example.com',
      role: 'groom',
      isActive: true,
    },
  });
});
afterEach(async () => {
  await cleanup();
  clients.forEach((c) => c.clear());
  clients.length = 0;
  useSession.setState({ status: 'guest', user: null });
});
const requests = (data: unknown) => {
  const calls: string[] = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url!);
    return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data } };
  };
  return calls;
};
test('horse parser preserves uploaded avatar metadata and legacy image', () => {
  const parsed = horseSchema.parse({
    ...horse,
    profileImage: 'https://example.com/old.jpg',
    registrationCode: 'SW-01',
    breed: 'Thoroughbred',
    gender: 'stallion',
    dateOfBirth: '2021-01-01',
    fitnessScore: 100,
    healthStatus: 'ready',
    isTrainingLocked: false,
  });
  expect(parsed.avatar?.path).toBe(horse.avatar.path);
  expect(parsed.profileImage).toBe('https://example.com/old.jpg');
});
test('private avatar loads from protected endpoint and uses signed URL without disk cache', async () => {
  const calls = requests({ url });
  await mount(horse);
  const image = await screen.findByLabelText('Ảnh đại diện Silver Wind');
  expect(calls).toEqual(['/horses/' + id + '/avatar']);
  expect(image.props.source.uri).toBe(url);
  expect(image.props.cachePolicy).toBe('none');
  await fireEvent(image, 'error');
  expect(screen.queryByLabelText('Ảnh đại diện Silver Wind')).toBeNull();
});
test('legacy image loads without requesting a signed URL', async () => {
  const calls = requests({ url });
  await mount({ ...horse, avatar: null, profileImage: 'https://example.com/legacy.jpg' });
  expect(screen.getByLabelText('Ảnh đại diện Silver Wind').props.source.uri).toBe(
    'https://example.com/legacy.jpg',
  );
  expect(calls).toEqual([]);
});
test('missing avatar stays as fallback and does not fetch every horse', async () => {
  const calls = requests({ url });
  await mount({ _id: id, name: 'Silver Wind' });
  expect(screen.queryByLabelText('Ảnh đại diện Silver Wind')).toBeNull();
  expect(calls).toEqual([]);
});
test('invalid URL cannot be used as an image', async () => {
  const calls = requests({ url });
  await mount({ ...horse, avatar: null, profileImage: 'file:///private/avatar.jpg' });
  expect(screen.queryByLabelText('Ảnh đại diện Silver Wind')).toBeNull();
  expect(calls).toEqual([]);
});
test('a private avatar must not silently fall back to an old legacy image on denial', async () => {
  const calls = requests({ url: null });
  await mount({ ...horse, profileImage: 'https://example.com/old.jpg' });
  expect(screen.queryByLabelText('Ảnh đại diện Silver Wind')).toBeNull();
  expect(calls).toHaveLength(1);
});
