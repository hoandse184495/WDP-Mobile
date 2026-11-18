import { render, screen, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { OwnerOverview } from '@/features/home/components/owner-overview';
import { notificationDestination } from '@/features/notifications/utils/notification-destination';
import { getModule } from '@/features/workspace/types/catalog';
import type { Horse } from '@/features/horses/types/horse';
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/horses/components/horse-thumbnail', () => ({ HorseThumbnail: () => null }));
const horse = (id: string, name: string): Horse => ({
  _id: id,
  name,
  registrationCode: id,
  breed: 'Thoroughbred',
  gender: 'stallion',
  dateOfBirth: '2020-01-01',
  fitnessScore: 80,
  healthStatus: 'ready',
  isTrainingLocked: false,
});
test('owner switches horse and sees only its own sessions and medical records, with read-only links', async () => {
  await render(
    <OwnerOverview
      data={{
        horses: [horse('h1', 'Hồng Phong'), horse('h2', 'Thiên Phong')],
        plans: [],
        sessions: [
          {
            _id: 's1',
            horseId: 'h1',
            sessionDate: '2026-11-17',
            trainerNotes: 'Nhận xét Hồng Phong',
          },
          {
            _id: 's2',
            horseId: 'h2',
            sessionDate: '2026-11-17',
            trainerNotes: 'Nhận xét Thiên Phong',
          },
        ],
        records: [
          {
            _id: 'm2',
            horseId: 'h2',
            examinationDate: '2026-11-17',
            diagnosis: 'Khám Thiên Phong',
          },
        ],
      }}
    />,
  );
  expect(screen.getByText('Nhận xét Hồng Phong')).toBeTruthy();
  expect(screen.queryByText('Nhận xét Thiên Phong')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn chiến mã' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Thiên Phong · h2' }));
  expect(screen.getByText('Nhận xét Thiên Phong')).toBeTruthy();
  expect(screen.getByText('Khám Thiên Phong')).toBeTruthy();
  expect(screen.queryByText('Nhận xét Hồng Phong')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Chi tiết buổi tập' }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/records/[module]/[id]',
    params: { module: 'sessions', id: 's2' },
  });
  expect(screen.queryByRole('button', { name: 'Lưu đánh giá' })).toBeNull();
});
test('owner notification links open session details and old admission links return to owned horses', () => {
  expect(notificationDestination('/dashboard/training?review=s1', 'horse_owner')).toEqual({
    pathname: '/records/[module]/[id]',
    params: { module: 'sessions', id: 's1' },
  });
  expect(notificationDestination('/dashboard/admissions?application=a1', 'horse_owner')).toBe(
    '/(tabs)/horses',
  );
  expect(getModule('sessions')?.detailKey).toBe('$self');
});
