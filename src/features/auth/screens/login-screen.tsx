import { Text, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { Card, Screen } from '@/shared/components/ui';
import { Icon } from '@/shared/components/icon';
import { LoginForm } from '../components/login-form';
import { useSession } from '../stores/session-store';

export default function LoginScreen() {
  const notice = useSession((state) => state.notice);
  return (
    <Screen>
      <View style={[ui.hero, { padding: 24, paddingTop: 26, paddingBottom: 28, gap: 22 }]}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: '#FFFFFF12',
            right: -95,
            top: 38,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 150,
            height: 150,
            borderRadius: 75,
            borderWidth: 1,
            borderColor: '#FFFFFF12',
            right: -70,
            top: 63,
          }}
        />
        <View style={[ui.row, { gap: 10 }]}>
          <View
            style={{
              width: 38,
              height: 42,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#FFFFFF35',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Icon name="horse" color="#DCC49C" size={27} />
          </View>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.white, fontSize: 15, fontWeight: '700', letterSpacing: 2.5 }}
            >
              EQUINEPRO
            </Text>
            <Text style={{ color: '#B6CFC2', fontSize: 10, letterSpacing: 0.8 }}>
              CHĂM SÓC TẬN TÂM · HUẤN LUYỆN BỀN VỮNG
            </Text>
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Text
            style={{
              color: colors.white,
              fontSize: 28,
              lineHeight: 36,
              letterSpacing: -0.7,
              fontWeight: '700',
            }}
          >
            Chăm sóc tốt hơn.{'\n'}Bứt phá mỗi ngày.
          </Text>
          <Text style={{ color: '#C2D6C9', fontSize: 12, lineHeight: 20, maxWidth: 280 }}>
            Kết nối đội ngũ, sức khỏe và hành trình huấn luyện đàn ngựa của bạn.
          </Text>
        </View>
      </View>
      {notice && (
        <Card>
          <Text accessibilityLiveRegion="polite" style={ui.body}>
            {notice}
          </Text>
        </Card>
      )}
      <LoginForm />
      <View
        style={{ flexDirection: 'row', justifyContent: 'center', gap: 7, paddingHorizontal: 12 }}
      >
        <Icon name="shield" size={15} color={colors.muted} />
        <Text style={[ui.muted, { textAlign: 'center', fontSize: 11, flexShrink: 1 }]}>
          Tài khoản được quản lý bởi câu lạc bộ.{'\n'}Liên hệ quản lý nếu bạn cần hỗ trợ đăng nhập.
        </Text>
      </View>
    </Screen>
  );
}
