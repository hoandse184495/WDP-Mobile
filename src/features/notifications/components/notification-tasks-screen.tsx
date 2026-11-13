import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Empty, Failure, Loading, Screen } from '@/shared/components/ui';
import { RoleGuard } from '@/shared/components/role-guard';
import { formatDate, formatTime } from '@/core/utils/date';
import { ui } from '@/core/theme/theme';
import { notificationApi } from '../api/notification-api';
function Content() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ['notification-tasks', id],
    queryFn: ({ signal }) => notificationApi.batchTasks(id, signal),
  });
  return (
    <Screen>
      <Text style={ui.title}>Đợt công việc được giao</Text>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <>
            <Text style={ui.muted}>
              {query.data.count} công việc · {query.data.unavailableCount} công việc không còn trong
              phạm vi truy cập.
            </Text>
            {!query.data.tasks.length && <Empty label="Không còn công việc khả dụng" />}
            {query.data.tasks.map((task) => (
              <Card key={task._id}>
                <Text style={ui.heading}>{task.title}</Text>
                <Text style={ui.body}>
                  {formatDate(task.scheduledStartAt)} · {formatTime(task.scheduledStartAt)} –{' '}
                  {formatTime(task.scheduledEndAt)}
                </Text>
                <Button
                  title="Mở công việc"
                  secondary
                  onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task._id } })}
                />
              </Card>
            ))}
          </>
        )
      )}
    </Screen>
  );
}
export default function NotificationTasksScreen() {
  return (
    <RoleGuard roles={['groom']}>
      <Content />
    </RoleGuard>
  );
}
