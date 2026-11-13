import { Alert, Text, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { roleLabels } from '@/core/constants/roles';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { signOut } from '@/features/auth/utils/session';
import {
  Badge,
  Button,
  Card,
  Detail,
  Empty,
  Failure,
  Loading,
  Screen,
  ScreenHeader,
} from '@/shared/components/ui';
import { Icon } from '@/shared/components/icon';
export default function ProfileScreen() {
  const query = useCurrentUser();
  return (
    <Screen>
      <ScreenHeader
        title="Tài khoản"
        subtitle="Thông tin cá nhân và bảo mật của bạn."
        eyebrow="CÁ NHÂN"
      />
      {query.isPending ? (
        <Loading label="Đang tải tài khoản…" />
      ) : query.data ? (
        <>
          <View style={[ui.hero, { alignItems: 'center', paddingVertical: 26, gap: 12 }]}>
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 24,
                backgroundColor: '#DCC49C',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 4,
                borderColor: '#FFFFFF18',
              }}
            >
              <Text style={{ color: colors.primaryDeep, fontSize: 25, fontWeight: '700' }}>
                {query.data.fullName
                  .trim()
                  .split(/\s+/)
                  .slice(-2)
                  .map((part) => part[0])
                  .join('')}
              </Text>
            </View>
            <Text style={[ui.heading, { color: colors.white, fontSize: 21 }]}>
              {query.data.fullName}
            </Text>
            <View
              style={{
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: '#FFFFFF18',
              }}
            >
              <Text style={{ color: '#DAE9DE', fontSize: 11 }}>{roleLabels[query.data.role]}</Text>
            </View>
          </View>
          <Card>
            <View style={ui.row}>
              <Icon name="user" size={19} color={colors.primary} />
              <Text style={ui.sectionTitle}>Thông tin liên hệ</Text>
            </View>
            <Detail label="Email" value={query.data.email} />
            <Detail label="Điện thoại" value={query.data.phone || 'Chưa cập nhật'} />
            <Badge label="Tài khoản câu lạc bộ" />
          </Card>
        </>
      ) : !query.error ? (
        <Empty label="Không có thông tin tài khoản" />
      ) : null}
      {query.error && <Failure error={query.error} retry={() => void query.refetch()} />}
      {query.data && <ChangePasswordForm />}
      <Button
        danger
        icon="logout"
        title="Đăng xuất"
        onPress={() =>
          Alert.alert('Đăng xuất?', 'Thông tin phiên trên thiết bị sẽ được xóa.', [
            { text: 'Ở lại', style: 'cancel' },
            { text: 'Đăng xuất', style: 'destructive', onPress: () => void signOut() },
          ])
        }
      />
      <Text style={[ui.muted, { textAlign: 'center', fontSize: 10, letterSpacing: 1.5 }]}>
        EQUINEPRO · CHĂM SÓC TẬN TÂM
      </Text>
    </Screen>
  );
}
