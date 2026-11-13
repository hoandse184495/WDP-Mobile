import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { clubDate, formatDate, formatTime } from '@/core/utils/date';
import { Button, Field } from './ui';
import { colors, ui } from '@/core/theme/theme';
import { Icon } from './icon';
export function DateField({
  label,
  value,
  onChange,
  kind = 'date',
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  kind?: 'date' | 'date-time' | 'time';
}) {
  const [mode, setMode] = useState<'date' | 'time' | null>(null);
  const parsed = value
    ? kind === 'time'
      ? new Date(`${clubDate()}T${value}:00+07:00`)
      : kind === 'date'
        ? new Date(`${value}T12:00:00+07:00`)
        : new Date(value)
    : new Date();
  const current = Number.isFinite(parsed.getTime()) ? parsed : new Date();
  if (Platform.OS === 'web')
    return (
      <Field
        label={label}
        value={value ?? ''}
        onChangeText={onChange}
        placeholder={
          kind === 'date' ? 'YYYY-MM-DD' : kind === 'time' ? 'HH:mm' : 'YYYY-MM-DDTHH:mm:ssZ'
        }
      />
    );
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.label}>{label}</Text>
      <View
        style={[
          ui.row,
          {
            padding: 13,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surfaceMuted,
            gap: 9,
          },
        ]}
      >
        <Icon name={kind === 'time' ? 'activity' : 'calendar'} size={18} color={colors.primary} />
        <Text style={[ui.body, ui.grow, { fontSize: 13 }]}>
          {value
            ? kind === 'date'
              ? formatDate(value)
              : kind === 'time'
                ? value
                : `${formatDate(value)} ${formatTime(value)} (Việt Nam)`
            : 'Chưa chọn'}
        </Text>
      </View>
      <View style={ui.row}>
        {kind !== 'time' && <Button title="Chọn ngày" secondary onPress={() => setMode('date')} />}
        {kind !== 'date' && <Button title="Chọn giờ" secondary onPress={() => setMode('time')} />}
      </View>
      {mode && (
        <DateTimePicker
          value={current}
          mode={mode}
          timeZoneName="Asia/Ho_Chi_Minh"
          onChange={(event, date) => {
            setMode(null);
            if (event.type === 'dismissed' || !date) return;
            onChange(
              kind === 'date'
                ? clubDate(date)
                : kind === 'time'
                  ? new Intl.DateTimeFormat('en-GB', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                      hour: '2-digit',
                      minute: '2-digit',
                      hourCycle: 'h23',
                    }).format(date)
                  : date.toISOString(),
            );
          }}
        />
      )}
    </View>
  );
}
