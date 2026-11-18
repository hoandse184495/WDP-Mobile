import { useSession } from '@/features/auth/stores/session-store';
import { useNotificationStream } from '../hooks/use-notification-stream';
import { notificationDestination } from '../utils/notification-destination';
import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { formatDate, formatTime } from '@/core/utils/date';
import { Badge, Button, Choice, Failure, Screen, ScreenHeader } from '@/shared/components/ui';
import { Icon } from '@/shared/components/icon';
import { PagedList } from '@/shared/components/paged-list';
import { notificationApi } from '../api/notification-api';
export default function NotificationsScreen() {
  const role = useSession((state) => state.user?.role);
  const [filter, setFilter] = useState('all');
  const liveStatus = useNotificationStream();
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['notifications', filter],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      notificationApi.list(pageParam, filter === 'unread', signal),
    getNextPageParam: (p) =>
      p.pagination.page < p.pagination.totalPages ? p.pagination.page + 1 : undefined,
    refetchInterval: false,
  });
  const mutation = useMutation({
    mutationFn: (id: string) => notificationApi.read(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const all = useMutation({
    mutationFn: () => notificationApi.readAll(query.data!.pages[0].serverNow),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const target = useMutation({
    mutationFn: notificationApi.target,
    onSuccess: (data) => {
      if ('receipt' in data) {
        Alert.alert(data.receipt.title, data.receipt.message);
        return;
      }
      const destination = notificationDestination(data.path, role);
      if (destination) router.push(destination);
      else
        Alert.alert(
          'Nội dung chưa có đường dẫn mobile',
          'Mở mục nghiệp vụ tương ứng trong Không gian làm việc.',
        );
    },
  });
  return (
    <Screen scroll={false}>
      <PagedList
        items={query.data?.pages.flatMap((p) => p.items) ?? []}
        getId={(n) => n._id}
        pending={query.isPending}
        error={query.error}
        refreshing={query.isRefetching}
        refresh={() => void query.refetch()}
        more={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        loadMore={() => void query.fetchNextPage()}
        emptyLabel="Không có thông báo"
        header={
          <View style={{ gap: 12, marginBottom: 18 }}>
            <ScreenHeader
              title="Thông báo"
              eyebrow="CẬP NHẬT CÂU LẠC BỘ"
              subtitle="Theo dõi những việc cần bạn quan tâm."
              action={
                <View style={ui.iconTile}>
                  <Icon name="bell" color={colors.primary} />
                </View>
              }
            />
            <Text style={ui.muted}>
              {liveStatus === 'connected'
                ? 'Cập nhật trực tiếp'
                : liveStatus === 'denied'
                  ? 'Quyền nhận cập nhật đã thay đổi'
                  : liveStatus === 'paused'
                    ? 'Cập nhật tạm dừng'
                    : 'Đang kết nối lại cập nhật…'}
            </Text>
            <Badge label={`${query.data?.pages[0].unreadCount ?? '—'} chưa đọc`} />
            <Choice
              label="Hiển thị"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'unread', label: 'Chưa đọc' },
              ]}
            />
            <Button
              title="Đánh dấu tất cả đã đọc"
              secondary
              disabled={!query.data}
              busy={all.isPending}
              onPress={() => all.mutate()}
            />
            {(mutation.error || all.error || target.error) && (
              <Failure error={mutation.error || all.error || target.error} />
            )}
          </View>
        }
        renderItem={(notice) => (
          <View
            style={[
              ui.card,
              !notice.isRead && { borderLeftWidth: 3, borderLeftColor: colors.primary },
            ]}
          >
            {!notice.isRead && <Badge label="Mới" />}
            <Text style={ui.heading}>{notice.title}</Text>
            <Text style={ui.body}>{notice.message}</Text>
            <Text style={ui.muted}>
              {formatDate(notice.createdAt)} {formatTime(notice.createdAt)}
            </Text>
            {!notice.isRead && (
              <Button
                title="Đánh dấu đã đọc"
                secondary
                busy={mutation.isPending}
                onPress={() => mutation.mutate(notice._id)}
              />
            )}
            <Button
              secondary
              title="Mở nội dung liên quan"
              busy={target.isPending}
              onPress={() => target.mutate(notice._id)}
            />
          </View>
        )}
      />
    </Screen>
  );
}
