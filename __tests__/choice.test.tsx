import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import { Choice } from '@/shared/components/ui';
const options = [
  { value: 'tp', label: 'Thanh Phong · AP-2021-206' },
  { value: 'hv', label: 'Huyền Vũ · AP-2021-205' },
  { value: 'nl', label: 'Ngọc Lâm · AP-2022-204' },
  { value: 'ls', label: 'Lam Sơn · AP-2020-202' },
  { value: 'kd', label: 'Kháng Đản · AP-2021-201' },
  { value: 'dh', label: 'Đại Hải · AP-2021-208' },
];
afterEach(cleanup);
function Form() {
  const [value, setValue] = useState<string>();
  return <Choice label="Ngựa" options={options} value={value} onChange={setValue} />;
}
test('long choices stay collapsed until opened, search without accents, select and close', async () => {
  await render(<Form />);
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.queryByText(options[0].label)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Ngựa' }));
  await fireEvent.changeText(screen.getByLabelText('Tìm trong ngựa'), 'HUYEN VU');
  expect(screen.queryByRole('radio', { name: options[0].label })).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: options[1].label }));
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.getByText(options[1].label)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Ngựa' }));
  expect(screen.getByLabelText('Tìm trong ngựa').props.value).toBe('');
  expect(screen.getByRole('radio', { name: options[1].label, checked: true })).toBeTruthy();
});
test('canceling the list never changes the selection', async () => {
  const change = jest.fn();
  await render(<Choice label="Ngựa" options={options} value="tp" onChange={change} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Ngựa' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Đóng danh sách ngựa' }));
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByText(options[0].label)).toBeTruthy();
  expect(screen.queryByRole('radio')).toBeNull();
});
test('searches registration code and handles no matches with a clear action', async () => {
  await render(<Form />);
  await fireEvent.press(screen.getByRole('button', { name: 'Ngựa' }));
  await fireEvent.changeText(screen.getByLabelText('Tìm trong ngựa'), '2022-204');
  expect(screen.getAllByRole('radio')).toHaveLength(1);
  expect(screen.getByRole('radio', { name: options[2].label })).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Tìm trong ngựa'), 'no-such-horse');
  expect(screen.getByText('Không tìm thấy mục phù hợp.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa tìm kiếm' }));
  expect(screen.getAllByRole('radio')).toHaveLength(options.length);
});
test('pagination is available inside the list without selecting a value', async () => {
  const more = jest.fn(),
    change = jest.fn();
  await render(<Choice label="Vật tư" options={[]} onChange={change} hasMore onLoadMore={more} />);
  expect(screen.queryByRole('button', { name: 'Tải thêm lựa chọn' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Vật tư' }));
  expect(screen.getByText('Chưa có lựa chọn phù hợp.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Tải thêm lựa chọn' }));
  expect(more).toHaveBeenCalledTimes(1);
  expect(change).not.toHaveBeenCalled();
});
