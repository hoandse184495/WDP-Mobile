import { resetLocationsForHorseChange } from '@/features/medical/model/reset-surface-locations';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react-native';
import { SurfaceLocationField } from '@/features/medical/components/surface-location-field';
import { parsePick, surfaceLocationSchema } from '@/features/medical/model/surface-location';
import { HorseCanvas } from '@/features/medical/components/horse-canvas';
jest.mock('@/features/medical/components/horse-canvas', () => ({
  HorseCanvas: jest.fn(() => {
    const { View } = require('react-native');
    return <View />;
  }),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'channel-unique' }));
const pick = { point: [0, 2, 0.3], normal: [0, 0, 1] },
  location = parsePick(pick);
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});
const send = async (type: string, payload: unknown = pick, channel = 'channel-unique') => {
  const props = jest.mocked(HorseCanvas).mock.calls.at(-1)?.[0];
  await act(() => props?.onMessage(JSON.stringify({ channel, type, payload })));
};
test('pick payload has same pinned model and valid unit normal contract', () => {
  expect(location).toMatchObject({
    modelId: 'horse-orelvys',
    modelVersion: '1',
    layer: 'surface',
    side: 'left',
  });
  expect(surfaceLocationSchema.safeParse({ ...location, modelVersion: '2' }).success).toBe(false);
  expect(() => parsePick({ ...pick, normal: [0, 0, 0] })).toThrow();
  expect(() => parsePick({ ...pick, point: [Infinity, 0, 0] })).toThrow();
});
test('requires horse, rejects unrelated bridge messages, and confirms only explicit pick', async () => {
  const change = jest.fn();
  const { rerender } = await render(<SurfaceLocationField value={null} onChange={change} />);
  expect(screen.getByRole('button', { name: 'Chọn vị trí trên mô hình' })).toBeDisabled();
  await rerender(<SurfaceLocationField horseId="horse-a" value={null} onChange={change} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn vị trí trên mô hình' }));
  expect(screen.getByRole('button', { name: 'Dùng vị trí này' })).toBeDisabled();
  await send('pick', pick, 'wrong-channel');
  expect(screen.getByRole('button', { name: 'Dùng vị trí này' })).toBeDisabled();
  await send('pick');
  expect(change).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Dùng vị trí này' }));
  expect(change).toHaveBeenCalledWith(location);
});
test('cancel keeps old point; horse change clears point and closes picker', async () => {
  const change = jest.fn();
  const { rerender } = await render(
    <SurfaceLocationField horseId="horse-a" value={location} onChange={change} />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn vị trí trên mô hình' }));
  await send('pick', { ...pick, point: [0.2, 2, -0.3] });
  await fireEvent.press(screen.getByRole('button', { name: 'Hủy chọn vị trí' }));
  expect(change).not.toHaveBeenCalled();
  await rerender(<SurfaceLocationField horseId="horse-b" value={location} onChange={change} />);
  expect(change).toHaveBeenCalledWith(null);
});
test('read only detail displays stored location with no overwrite controls', async () => {
  await render(<SurfaceLocationField horseId="horse-a" value={location} editable={false} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Xem vị trí trên mô hình' }));
  expect(screen.queryByRole('button', { name: 'Dùng vị trí này' })).toBeNull();
  expect(jest.mocked(HorseCanvas).mock.calls.at(-1)?.[0]).toMatchObject({
    marker: location,
    editable: false,
  });
});

test('changing encounter horse clears points in all injury rows atomically without altering other fields', () => {
  const previous = {
    record: { horseId: 'old' },
    injuries: [
      { id: 'one', surfaceLocation: location },
      { id: 'two', surfaceLocation: location },
    ],
  };
  const changed = resetLocationsForHorseChange(previous, {
    ...previous,
    record: { horseId: 'new' },
  });
  expect(changed.injuries).toEqual([
    { id: 'one', surfaceLocation: null },
    { id: 'two', surfaceLocation: null },
  ]);
  expect(previous.injuries[0].surfaceLocation).toBe(location);
  expect(resetLocationsForHorseChange(previous, previous)).toBe(previous);
});
