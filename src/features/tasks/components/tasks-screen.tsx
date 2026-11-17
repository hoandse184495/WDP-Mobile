import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { taskRoles } from '@/core/constants/roles';
import { colors, ui } from '@/core/theme/theme';
import { clubDate, formatDate, formatTime, shiftDay } from '@/core/utils/date';
import { Badge, IconButton, Screen, ScreenHeader } from '@/shared/components/ui';
import { Icon, IconName } from '@/shared/components/icon';
import { ActionMenu } from '@/shared/components/action-menu';
import { OperationPanel } from '@/features/operations/components/operation-panel';
import { PagedList } from '@/shared/components/paged-list';
import { RoleGuard } from '@/shared/components/role-guard';
import { referenceName } from '@/shared/types/api';
import { useSession } from '@/features/auth/stores/session-store';
import { useTasks } from '../hooks/use-tasks';
import { statusLabels, typeLabels } from '../types/task';
const typeIcons: Record<string, IconName> = {
  training: 'target',
  feeding: 'leaf',
  medical_support: 'medical',
  stall_cleaning: 'stable',
  bathing: 'horse',
  hoof_care: 'shield',
};
function TaskList() {
  const user = useSession((state) => state.user);
  const [day, setDay] = useState(clubDate());
  const [status, setStatus] = useState('');
  const query = useTasks(day, status);
  return (
    <Screen scroll={false}>
      <PagedList
        items={query.data?.pages.flatMap((p) => p.items) ?? []}
        getId={(t) => t._id}
        pending={query.isPending}
        error={query.error}
        refreshing={query.isRefetching}
        refresh={() => void query.refetch()}
        more={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        loadMore={() => void query.fetchNextPage()}
        emptyLabel="Không có công việc trong ngày"
        header={
          <View style={{ gap: 12, marginBottom: 18 }}>
            <ScreenHeader
              title="Lịch công việc"
              eyebrow="LÀM VIỆC MỖI NGÀY"
              subtitle="Sắp xếp rõ ràng, chăm sóc đúng giờ."
              action={
                user && ['club_manager', 'head_trainer'].includes(user.role) ? (
                  <IconButton
                    icon="plus"
                    label="Giao công việc"
                    onPress={() => router.push('/task-schedule')}
                  />
                ) : undefined
              }
            />
            <View
              style={[
                ui.between,
                {
                  backgroundColor: colors.surface,
                  borderRadius: 15,
                  padding: 5,
                  borderWidth: 1,
                  borderColor: colors.line,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ngày trước"
                onPress={() => setDay(shiftDay(day, -1))}
                style={{ padding: 12, transform: [{ rotate: '180deg' }] }}
              >
                <Icon name="chevron" size={19} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Về hôm nay"
                onPress={() => setDay(clubDate())}
                style={{ alignItems: 'center', gap: 3, paddingVertical: 7 }}
              >
                <Text style={ui.label}>{day === clubDate() ? 'Hôm nay' : formatDate(day)}</Text>
                <Text style={[ui.muted, { fontSize: 10 }]}>
                  {day === clubDate() ? formatDate(day) : 'Chạm để về hôm nay'} · UTC+7
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ngày sau"
                onPress={() => setDay(shiftDay(day, 1))}
                style={{ padding: 12 }}
              >
                <Icon name="chevron" size={19} color={colors.primary} />
              </Pressable>
            </View>
            <OperationPanel module="tasks" collection />
            <ActionMenu
              title={`Trạng thái: ${status ? statusLabels[status as keyof typeof statusLabels] : 'Tất cả'}`}
              actions={[
                { id: 'all', title: 'Tất cả', onPress: () => setStatus('') },
                ...Object.entries(statusLabels).map(([value, label]) => ({
                  id: value,
                  title: label,
                  onPress: () => setStatus(value),
                })),
              ]}
            />
          </View>
        }
        renderItem={(task) => (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [ui.card, { gap: 12, opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task._id } })}
          >
            <View style={ui.row}>
              <View
                style={[
                  ui.iconTile,
                  {
                    backgroundColor:
                      task.type === 'medical_support' ? colors.blueSoft : colors.primarySoft,
                  },
                ]}
              >
                <Icon
                  name={typeIcons[task.type] ?? 'tasks'}
                  size={22}
                  color={task.type === 'medical_support' ? colors.blue : colors.primary}
                />
              </View>
              <View style={[ui.grow, { gap: 4 }]}>
                <Text style={[ui.heading, { fontSize: 15, lineHeight: 21 }]}>{task.title}</Text>
                <Text style={[ui.muted, { fontSize: 11 }]}>
                  {typeLabels[task.type]} · {referenceName(task.horseId ?? task.stallId)}
                </Text>
              </View>
              <Text style={[ui.label, { color: colors.primary, fontSize: 12 }]}>
                {formatTime(task.scheduledStartAt)}
              </Text>
            </View>
            <View style={[ui.between, { paddingTop: 2 }]}>
              <Badge label={statusLabels[task.status]} />
              <Text style={[ui.muted, { fontSize: 11, flexShrink: 1 }]}>
                {referenceName(task.groomId)}
              </Text>
            </View>
            {task.blockedReason && (
              <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 10 }}>
                <Text style={[ui.error, { fontSize: 12 }]}>{task.blockedReason}</Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </Screen>
  );
}
export default function TasksScreen() {
  return (
    <RoleGuard roles={taskRoles}>
      <TaskList />
    </RoleGuard>
  );
}
