import { PropsWithChildren } from 'react';
import { Text } from 'react-native';
import { ui } from '@/core/theme/theme';
import { Button, Failure, Loading, Screen } from '@/shared/components/ui';
import { useSession } from '../stores/session-store';
import { restoreSession, signOut } from '../utils/session';

export function SessionBootstrap({ children }: PropsWithChildren) {
  const { status, error } = useSession();
  if (status === 'restoring' || status === 'signing-out')
    return (
      <Screen>
        <Loading
          label={
            status === 'restoring' ? 'Đang kiểm tra phiên đăng nhập…' : 'Đang xóa phiên đăng nhập…'
          }
        />
      </Screen>
    );
  if (status === 'restore-error')
    return (
      <Screen>
        <Text style={ui.heading}>Không thể kiểm tra phiên</Text>
        <Failure error={error} retry={() => void restoreSession()} />
        <Button title="Về đăng nhập" secondary onPress={() => void signOut()} />
      </Screen>
    );
  if (status === 'signout-error')
    return (
      <Screen>
        <Text style={ui.heading}>Chưa xóa được phiên đã lưu</Text>
        <Failure error={error} retry={() => void signOut()} />
      </Screen>
    );
  return children;
}
