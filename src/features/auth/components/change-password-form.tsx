import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ui } from '@/core/theme/theme';
import { Button, Card, Failure } from '@/shared/components/ui';
import { FormField } from '@/shared/components/form-field';
import { PasswordInput, passwordSchema } from '../schemas/auth-schema';
import { useChangePassword } from '../hooks/use-change-password';

export function ChangePasswordForm() {
  const form = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const change = useChangePassword();
  const busy = change.isPending || form.formState.isSubmitting;
  const submit = form.handleSubmit(async (input) => {
    try {
      await change.submit(input);
    } finally {
      form.reset();
    }
  });
  return (
    <Card>
      <Text style={ui.heading}>Đổi mật khẩu</Text>
      <Text style={ui.muted}>
        Ít nhất 12 ký tự, tối đa 72 byte UTF-8. Sau khi đổi, bạn cần đăng nhập lại.
      </Text>
      <FormField
        control={form.control}
        name="currentPassword"
        label="Mật khẩu hiện tại"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        editable={!busy}
      />
      <FormField
        control={form.control}
        name="newPassword"
        label="Mật khẩu mới"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        editable={!busy}
      />
      <FormField
        control={form.control}
        name="confirmPassword"
        label="Xác nhận mật khẩu mới"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        editable={!busy}
      />
      {change.error && <Failure error={change.error} />}
      <Button title="Đổi mật khẩu" busy={busy} onPress={() => void submit()} />
    </Card>
  );
}
