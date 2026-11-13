import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { allRoles } from '@/core/constants/roles';
import { useSession } from '@/features/auth/stores/session-store';
import { destination, navigationGroups, workspaces } from '@/features/home/config/workspaces';
import MenuScreen from '@/features/home/components/menu-screen';
import { ActionMenu } from '@/shared/components/action-menu';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
test.each(allRoles)('%s has an authorized primary action and no duplicate navigation', (role) => {
  expect(destination(workspaces[role].primary, role)).toBeDefined();
  const paths = navigationGroups(role).flatMap((group) => group.items.map((item) => item.path));
  expect(new Set(paths).size).toBe(paths.length);
  expect(paths).not.toContain('/workspace/ledger');
});
test('owner has no staff or inventory controls; warehouse has no clinical or horse controls', () => {
  const owner = navigationGroups('horse_owner').flatMap((group) =>
    group.items.map((item) => item.key),
  );
  expect(owner).toEqual(
    expect.arrayContaining(['horses', 'training', 'sessions', 'medical', 'admissions', 'rations']),
  );
  for (const key of ['tasks', 'team', 'injuries', 'warehouses', 'prescriptions', 'stables'])
    expect(owner).not.toContain(key);
  const warehouse = navigationGroups('warehouse_keeper').flatMap((group) =>
    group.items.map((item) => item.key),
  );
  expect(warehouse).toContain('ledger');
  for (const key of ['horses', 'tasks', 'medical', 'injuries', 'training', 'feedIssues'])
    expect(warehouse).not.toContain(key);
  expect(destination('training', 'veterinarian')?.path).toBe('/workspace/sessions');
});
test('menu searches authorized destinations and opens the selected screen', async () => {
  useSession.setState({
    user: {
      _id: 'u1',
      fullName: 'Owner',
      email: 'owner@example.com',
      role: 'horse_owner',
      isActive: true,
    },
    status: 'authenticated',
  });
  await render(<MenuScreen />);
  expect(screen.queryByRole('button', { name: 'Bệnh án' })).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Tìm chức năng'), 'bệnh');
  await fireEvent.press(screen.getByRole('button', { name: 'Bệnh án' }));
  expect(router.push).toHaveBeenCalledWith('/workspace/medical');
  expect(screen.queryByText('Nhân sự')).toBeNull();
});
test('action sheet opens on demand and invokes only the selected action', async () => {
  const first = jest.fn(),
    second = jest.fn();
  await render(
    <ActionMenu
      actions={[
        { id: 'first', title: 'Duyệt hồ sơ', onPress: first },
        { id: 'second', title: 'Sửa hồ sơ', onPress: second },
      ]}
    />,
  );
  expect(screen.queryByText('Duyệt hồ sơ')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thao tác' }));
  expect(first).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Sửa hồ sơ' }));
  expect(second).toHaveBeenCalledTimes(1);
  expect(first).not.toHaveBeenCalled();
  expect(screen.queryByText('Sửa hồ sơ')).toBeNull();
});
