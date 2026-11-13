import { PropsWithChildren } from 'react';
import { Role } from '@/core/constants/roles';
import { useSession } from '@/features/auth/stores/session-store';
import { Empty, Screen } from './ui';
export function RoleGuard({ roles, children }: PropsWithChildren<{ roles: readonly Role[] }>) {
  const user = useSession((state) => state.user);
  if (!user || !roles.includes(user.role))
    return (
      <Screen>
        <Empty
          label="Không có quyền truy cập"
          detail="Tài khoản của bạn không được sử dụng chức năng này."
        />
      </Screen>
    );
  return children;
}
