import { act, render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import { Choice } from '@/shared/components/ui';
const options = [{ value: 'a', label: 'Trang đầu' }];
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});
test('debounces remote search, hides stale choices and keeps modal open', async () => {
  const search = jest.fn();
  const { rerender } = await render(
    <Choice label="Ngựa" options={options} onChange={jest.fn()} onSearch={search} />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Ngựa' }));
  await act(() => jest.advanceTimersByTime(250));
  search.mockClear();
  await fireEvent.changeText(screen.getByLabelText('Tìm trong ngựa'), 'Huyền');
  await fireEvent.changeText(screen.getByLabelText('Tìm trong ngựa'), 'Huyền Vũ');
  expect(screen.queryByRole('radio', { name: 'Trang đầu' })).toBeNull();
  await act(() => jest.advanceTimersByTime(249));
  expect(search).not.toHaveBeenCalled();
  await act(() => jest.advanceTimersByTime(1));
  expect(search).toHaveBeenCalledTimes(1);
  expect(search).toHaveBeenCalledWith('Huyền Vũ');
  await rerender(
    <Choice
      label="Ngựa"
      options={[{ value: 'b', label: 'Huyền Vũ' }]}
      onChange={jest.fn()}
      onSearch={search}
    />,
  );
  expect(screen.getByRole('radio', { name: 'Huyền Vũ' })).toBeTruthy();
});
test('closing cancels unsubmitted search and retry stays inside modal', async () => {
  const search = jest.fn(),
    retry = jest.fn();
  const { rerender } = await render(
    <Choice label="Ngựa" options={options} onChange={jest.fn()} onSearch={search} />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Ngựa' }));
  await fireEvent.changeText(screen.getByLabelText('Tìm trong ngựa'), 'abc');
  await fireEvent.press(screen.getByRole('button', { name: 'Đóng danh sách ngựa' }));
  await act(() => jest.advanceTimersByTime(500));
  expect(search).not.toHaveBeenCalled();
  await rerender(
    <Choice
      label="Ngựa"
      options={options}
      onChange={jest.fn()}
      onSearch={search}
      error={Error('offline')}
      onRetry={retry}
    />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Ngựa' }));
  expect(screen.queryByRole('radio')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại danh sách' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
