import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Detail, Loading, Failure } from '@/shared/components/ui';
import { useSession } from '@/features/auth/stores/session-store';
import { ui } from '@/core/theme/theme';
import { roleLabels } from '@/core/constants/roles';
import { careJournalApi } from '../api/care-journal-api';
import { journalStamp } from '../utils/care-journal';
import { lockActionLabels } from '../utils/clinical-hold';
export function HorseLockHistory({ id }: { id: string }) {
  const [open, setOpen] = useState(false),
    [count, setCount] = useState(5),
    user = useSession((s) => s.user);
  const query = useQuery({
    queryKey: ['horse-lock-history', user?._id, user?.role, id],
    queryFn: ({ signal }) => careJournalApi.history(id, signal),
    enabled: open && !!user,
    retry: false,
  });
  return (
    <Card>
      <Button
        secondary
        title={open ? 'Ẩn lịch sử khóa huấn luyện' : 'Xem lịch sử khóa huấn luyện'}
        onPress={() => {
          setOpen(!open);
          setCount(5);
        }}
      />
      {open &&
        (query.isPending ? (
          <Loading />
        ) : query.error ? (
          <Failure error={query.error} retry={() => void query.refetch()} />
        ) : !query.data?.length ? (
          <Text style={ui.muted}>Chưa ghi nhận lệnh khóa hoặc mở khóa.</Text>
        ) : (
          <>
            {query.data.slice(0, count).map((row) => (
              <View key={row._id} style={{ gap: 6, paddingVertical: 10 }}>
                <Text style={ui.heading}>
                  {lockActionLabels[row.action] ?? 'Cập nhật trạng thái huấn luyện'}
                </Text>
                <Text style={ui.muted}>{journalStamp(row.createdAt)}</Text>
                <Detail
                  label="Người thực hiện"
                  value={
                    typeof row.actorId === 'object' ? row.actorId?.fullName : 'Chưa có thông tin'
                  }
                />
                <Detail
                  label="Vai trò"
                  value={roleLabels[row.actorRole as keyof typeof roleLabels] ?? row.actorRole}
                />
                <Text style={ui.body}>{row.description}</Text>
              </View>
            ))}
            {query.data.length > count && (
              <Button secondary title="Xem thêm lịch sử khóa" onPress={() => setCount(count + 5)} />
            )}
          </>
        ))}
    </Card>
  );
}
