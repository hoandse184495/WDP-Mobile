import { PropsWithChildren, ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, ui } from '@/core/theme/theme';
import { toAppError } from '@/core/errors/app-error';
import { Icon, IconName } from './icon';

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
}: PropsWithChildren<{ scroll?: boolean; refreshing?: boolean; onRefresh?: () => void }>) {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={ui.page}>
      <KeyboardAvoidingView
        style={ui.grow}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={ui.content}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  busy,
  disabled,
  secondary,
  danger,
  icon,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  icon?: IconName;
}) {
  const foreground = danger ? colors.danger : secondary ? colors.primaryDeep : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: busy || disabled, busy }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: danger ? colors.dangerSoft : secondary ? colors.surface : colors.primary,
          borderColor: danger ? '#F1D8D8' : secondary ? colors.line : colors.primary,
          opacity: disabled || busy ? 0.45 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon && <Icon name={icon} color={foreground} size={18} />}
          <Text style={[styles.buttonText, { color: foreground }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
export type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  icon?: IconName;
  accessory?: ReactNode;
};
export function Field({ label, error, icon, accessory, onFocus, onBlur, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.label}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          props.multiline && { alignItems: 'flex-start' },
          focused && { borderColor: colors.primary, backgroundColor: colors.surface },
          Boolean(error) && { borderColor: colors.danger },
          props.editable === false && { opacity: 0.6 },
        ]}
      >
        {icon && (
          <View style={props.multiline ? { paddingTop: 15 } : undefined}>
            <Icon name={icon} size={19} color={focused ? colors.primary : colors.muted} />
          </View>
        )}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#97A39B"
          {...props}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            props.multiline && { minHeight: 104, textAlignVertical: 'top' },
            props.style,
          ]}
        />
        {accessory}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
export function Loading({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <ActivityIndicator color={colors.primary} />
      </View>
      <Text style={ui.muted}>{label}</Text>
    </View>
  );
}
export function Failure({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <View style={styles.failure}>
      <View style={[ui.row, { alignItems: 'flex-start', gap: 10 }]}>
        <Icon name="warning" size={18} color={colors.danger} />
        <Text accessibilityRole="alert" style={[ui.error, ui.grow]}>
          {toAppError(error).message}
        </Text>
      </View>
      {retry && <Button title="Thử lại" onPress={retry} secondary />}
    </View>
  );
}
export function Empty({ label = 'Chưa có dữ liệu', detail }: { label?: string; detail?: string }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Icon name="file" size={26} color={colors.muted} />
      </View>
      <Text style={[ui.heading, { textAlign: 'center', fontSize: 16 }]}>{label}</Text>
      {detail && <Text style={[ui.muted, { textAlign: 'center', maxWidth: 280 }]}>{detail}</Text>}
    </View>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={ui.card}>{children}</View>;
}
export function Badge({ label, danger }: { label: string; danger?: boolean }) {
  const text = label.toLocaleLowerCase('vi');
  const warning = !danger && /chờ|nháp|theo dõi|hồi phục|sắp|đang thực hiện/.test(text);
  const foreground = danger ? colors.danger : warning ? colors.gold : colors.primary;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: danger
            ? colors.dangerSoft
            : warning
              ? colors.goldSoft
              : colors.primarySoft,
        },
      ]}
    >
      <View style={{ height: 5, width: 5, borderRadius: 3, backgroundColor: foreground }} />
      <Text
        style={{
          fontFamily,
          color: foreground,
          fontSize: 11,
          lineHeight: 16,
          fontWeight: '600',
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
export { Choice } from './choice';
export function Detail({ label, value }: { label: string; value?: string | number | null }) {
  const long = String(value ?? '').length > 55;
  return (
    <View
      style={{
        flexDirection: long ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: long ? 'stretch' : 'flex-start',
        gap: long ? 5 : 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.lineSoft,
      }}
    >
      <Text style={[ui.muted, !long && { flex: 1 }]}>{label}</Text>
      <Text style={[ui.body, { fontWeight: '500' }, !long && { flex: 1.25, textAlign: 'right' }]}>
        {value ?? '—'}
      </Text>
    </View>
  );
}
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={[ui.between, { alignItems: 'flex-start' }]}>
      <View style={[ui.grow, { gap: 4 }]}>
        <Text style={ui.sectionTitle}>{title}</Text>
        {description && <Text style={ui.muted}>{description}</Text>}
      </View>
      {action}
    </View>
  );
}
export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={ui.between}>
        <View style={[ui.grow, { gap: 5 }]}>
          {eyebrow && <Text style={ui.eyebrow}>{eyebrow}</Text>}
          <Text style={ui.title}>{title}</Text>
        </View>
        {action}
      </View>
      {subtitle && <Text style={ui.muted}>{subtitle}</Text>}
    </View>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        ui.iconTile,
        {
          backgroundColor: pressed ? colors.primarySoft : colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
        },
      ]}
    >
      <Icon name={icon} color={colors.primaryDeep} size={21} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: 9,
    borderRadius: 13,
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 17,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    backgroundColor: colors.surfaceMuted,
  },
  input: {
    fontFamily,
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 0,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  state: { paddingVertical: 36, paddingHorizontal: 20, gap: 12, alignItems: 'center' },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  failure: {
    backgroundColor: colors.dangerSoft,
    padding: 14,
    borderRadius: 13,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F5DCDC',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
});
