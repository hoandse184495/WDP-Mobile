import { render, screen, fireEvent } from '@testing-library/react-native';
import { TrainingPlanCard } from '@/features/training/components/training-plan-card';
jest.mock('@/features/horses/components/horse-thumbnail', () => ({ HorseThumbnail: () => null }));
test('legacy plan displays translated phase, horse, limits, dates and opens the same record', async () => {
  const open = jest.fn();
  await render(
    <TrainingPlanCard
      onPress={open}
      plan={{
        title: 'Nền tảng thể lực',
        phase: 'build_up',
        isActive: true,
        horseId: {
          _id: 'h1',
          name: 'Thiên Phong',
          registrationCode: 'AP-2021-201',
          isTrainingLocked: true,
        },
        distance: 1200,
        targetSpeedMax: 18.5,
        targetHeartRateMax: 180,
        workloadLevel: 'moderate',
        surface: 'dirt',
        startDate: '2026-10-30',
        endDate: '2026-11-20',
      }}
    />,
  );
  expect(screen.getByText('Xây nền')).toBeTruthy();
  expect(screen.getByText('Thiên Phong · AP-2021-201')).toBeTruthy();
  expect(screen.getByText('Đang áp dụng')).toBeTruthy();
  expect(screen.getByText('Khóa tập')).toBeTruthy();
  expect(screen.getByText(/18,5/)).toBeTruthy();
  expect(screen.getByText('30/10/2026 — 20/11/2026')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Chi tiết giáo án: Nền tảng thể lực' }));
  expect(open).toHaveBeenCalledTimes(1);
});
test('multi-exercise plan shows exercise names instead of misleading plan-level limits', async () => {
  await render(
    <TrainingPlanCard
      onPress={jest.fn()}
      plan={{
        title: 'Sức bền',
        phase: 'endurance',
        isActive: false,
        distance: 9999,
        exercises: [
          { title: 'Khởi động', distance: 500 },
          { title: 'Chạy bền', distance: 2000 },
        ],
      }}
    />,
  );
  expect(screen.getByText('2 bài tập')).toBeTruthy();
  expect(screen.getByText('Khởi động · Chạy bền')).toBeTruthy();
  expect(screen.getByText('Đã kết thúc')).toBeTruthy();
  expect(screen.queryByText('Cự ly')).toBeNull();
  expect(screen.queryByText(/9.999/)).toBeNull();
});
