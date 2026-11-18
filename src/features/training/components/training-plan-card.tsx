import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { formatDate } from '@/core/utils/date';
import { Icon } from '@/shared/components/icon';
import { HorseThumbnail } from '@/features/horses/components/horse-thumbnail';
import { asRecord } from '@/features/operations/types/operation';
import type { WorkspaceRecord } from '@/features/workspace/types/catalog';

const phases: Record<string, { label: string; ink: string; background: string }> = {
  build_up: { label: 'Xây nền', ink: '#28749C', background: '#EFF8FE' },
  sprint: { label: 'Nước rút', ink: '#7862A5', background: '#F3EFFA' },
  endurance: { label: 'Sức bền', ink: colors.primary, background: colors.primarySoft },
  recovery: { label: 'Phục hồi', ink: '#946A2D', background: colors.goldSoft },
  pre_race: { label: 'Tiền thi đấu', ink: '#B54762', background: '#FFF0F3' },
};
const workloads: Record<string, string> = {
  light: 'Nhẹ',
  moderate: 'Vừa',
  intense: 'Cao',
  maximum: 'Tối đa',
};
const surfaces: Record<string, string> = {
  dirt: 'Đường đất',
  turf: 'Đường cỏ',
  synthetic: 'Đường tổng hợp',
};
const numeric = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)
    : '—';
const date = (value: unknown) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value)) ? formatDate(value) : '—';

export function TrainingPlanCard({
  plan,
  onPress,
}: {
  plan: WorkspaceRecord;
  onPress: () => void;
}) {
  const horse = asRecord(plan.horseId);
  const avatar = asRecord(horse.avatar);
  const exercises = Array.isArray(plan.exercises) ? plan.exercises.map(asRecord) : [];
  const multiple = exercises.length > 1;
  const exercise = exercises[0] ?? plan;
  const phase = phases[String(plan.phase)];
  const active = plan.isActive === true;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chi tiết giáo án: ${String(plan.title ?? 'Giáo án')}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[ui.row, { alignItems: 'flex-start', gap: 11 }]}>
        <HorseThumbnail
          horse={{
            _id: String(horse._id ?? horse.id ?? ''),
            name: String(horse.name ?? 'Ngựa'),
            profileImage: typeof horse.profileImage === 'string' ? horse.profileImage : null,
            avatar: typeof avatar.path === 'string' ? { path: avatar.path } : null,
          }}
        />
        <View style={[ui.grow, { gap: 4 }]}>
          <Text style={styles.title}>{String(plan.title ?? 'Giáo án')}</Text>
          <Text style={styles.subtitle}>
            {String(horse.name ?? 'Ngựa đã lưu trữ')} · {String(horse.registrationCode ?? '—')}
          </Text>
        </View>
      </View>
      <View style={styles.tags}>
        <View style={[styles.phase, { backgroundColor: phase?.background ?? colors.surfaceMuted }]}>
          <Text style={[styles.phaseText, { color: phase?.ink ?? colors.muted }]}>
            {phase?.label ?? 'Chưa xác định'}
          </Text>
        </View>
        <View style={[ui.row, { gap: 5 }]}>
          <View style={[styles.dot, { backgroundColor: active ? colors.primary : '#95A5AD' }]} />
          <Text style={[styles.small, { color: active ? colors.primary : colors.muted }]}>
            {active ? 'Đang áp dụng' : plan.isActive === false ? 'Đã kết thúc' : 'Chưa xác định'}
          </Text>
        </View>
        {horse.isTrainingLocked === true && (
          <View style={[ui.row, { gap: 4 }]}>
            <Icon name="lock" size={12} color={colors.danger} />
            <Text style={[styles.small, { color: colors.danger }]}>Khóa tập</Text>
          </View>
        )}
      </View>
      <Text style={styles.subtitle}>
        {multiple
          ? 'Thông số theo từng bài tập'
          : [
              workloads[String(exercise.workloadLevel)]
                ? `Tải ${workloads[String(exercise.workloadLevel)].toLocaleLowerCase('vi')}`
                : null,
              surfaces[String(exercise.surface)],
            ]
              .filter(Boolean)
              .join('  ·  ') || 'Chưa có thông tin bài tập'}
      </Text>
      {multiple ? (
        <View style={styles.metrics}>
          <Text style={ui.label}>{exercises.length} bài tập</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {exercises
              .slice(0, 2)
              .map((row) => String(row.title ?? 'Bài tập'))
              .join(' · ')}
            {exercises.length > 2 ? '…' : ''}
          </Text>
        </View>
      ) : (
        <View style={[styles.metrics, { flexDirection: 'row' }]}>
          {[
            { label: 'Cự ly', value: exercise.distance, unit: 'm' },
            { label: 'Tốc độ trần', value: exercise.targetSpeedMax, unit: 'm/s' },
            { label: 'Nhịp tim trần', value: exercise.targetHeartRateMax, unit: 'bpm' },
          ].map((metric) => (
            <View key={metric.label} style={{ flex: 1, gap: 5 }}>
              <Text style={styles.small}>{metric.label}</Text>
              <Text style={styles.value}>
                {numeric(metric.value)}
                <Text style={styles.unit}> {metric.unit}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.footer}>
        <View style={[ui.row, { flexShrink: 1, gap: 5 }]}>
          <Icon name="calendar" size={13} color={colors.muted} />
          <Text style={[styles.small, { flexShrink: 1 }]}>
            {date(plan.startDate)} — {date(plan.endDate)}
          </Text>
        </View>
        <View style={[ui.row, { gap: 4 }]}>
          <Text style={styles.link}>Chi tiết</Text>
          <Icon name="arrow" size={14} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderColor: colors.line,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  phase: { borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  phaseText: { fontSize: 11, lineHeight: 16, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  small: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  metrics: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: 14,
    gap: 8,
  },
  value: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  unit: { color: colors.muted, fontSize: 11, fontWeight: '400' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
    rowGap: 8,
  },
  link: { color: colors.primary, fontSize: 12, fontWeight: '600', lineHeight: 18 },
});
