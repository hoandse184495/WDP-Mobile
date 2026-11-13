import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, Text, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { Icon } from '@/shared/components/icon';
import { Button, Card, Failure } from '@/shared/components/ui';
import { FormField } from '@/shared/components/form-field';
import { loginSchema, LoginInput } from '../schemas/auth-schema';
import { useLogin } from '../hooks/use-login';

export function LoginForm() {
  const [visible, setVisible] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const login = useLogin();
  const busy = login.isPending || form.formState.isSubmitting;
  const submit = form.handleSubmit(async (input) => {
    try {
      await login.submit(input);
    } finally {
      form.setValue('password', '');
      setVisible(false);
    }
  });
  return (
    <Card>
      <View style={{ gap: 5, marginBottom: 6 }}>
        <Text style={[ui.heading, { fontSize: 21 }]}>Chào mừng trở lại</Text>
        <Text style={ui.muted}>Đăng nhập bằng tài khoản câu lạc bộ.</Text>
      </View>
      <FormField
        control={form.control}
        name="email"
        label="Email"
        icon="mail"
        placeholder="Email của bạn"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        editable={!busy}
      />
      <FormField
        control={form.control}
        name="password"
        label="Mật khẩu"
        icon="lock"
        placeholder="Nhập mật khẩu"
        accessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            disabled={busy}
            onPress={() => setVisible(!visible)}
            style={{ padding: 8, marginRight: -6 }}
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} size={19} color={colors.muted} />
          </Pressable>
        }
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        editable={!busy}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      {login.error && <Failure error={login.error} />}
      <Button title="Đăng nhập" icon="arrow" busy={busy} onPress={() => void submit()} />
    </Card>
  );
}
