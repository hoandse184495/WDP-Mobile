import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Image, Text, View } from 'react-native';
import { AppError } from '@/core/errors/app-error';
import { ui } from '@/core/theme/theme';
import { WorkspaceRecord, recordId } from '@/features/workspace/types/catalog';
import { useSession } from '@/features/auth/stores/session-store';
import { Button, Card, Failure, Field } from '@/shared/components/ui';
import { incidentApi } from '../api/incident-api';
import { incidentTransitions, canHandleIncident } from '../utils/lifecycle';
function IncidentPhoto({ id, photoId }: { id: string; photoId: string }) {
  const [failed, setFailed] = useState(false);
  const query = useQuery({
    queryKey: ['incident-photo', id, photoId],
    queryFn: () => incidentApi.photoUrl(id, photoId),
    staleTime: 120000,
    gcTime: 180000,
    refetchInterval: 240000,
  });
  if (failed)
    return (
      <Failure
        error={new Error('Không tải được ảnh sự cố.')}
        retry={() => {
          setFailed(false);
          void query.refetch();
        }}
      />
    );
  return query.data ? (
    <Image
      accessibilityLabel="Ảnh quan sát sự cố"
      source={{ uri: query.data.url }}
      style={{ width: '100%', height: 200, borderRadius: 12 }}
      onError={() => setFailed(true)}
    />
  ) : query.error ? (
    <Failure error={query.error} retry={() => void query.refetch()} />
  ) : null;
}
export function IncidentActions({
  record,
  refresh,
}: {
  record: WorkspaceRecord;
  refresh: () => void;
}) {
  const user = useSession((state) => state.user)!;
  const [note, setNote] = useState('');
  const client = useQueryClient();
  const id = recordId(record);
  const revision = typeof record.revision === 'number' ? record.revision : 0;
  const nextStatus = incidentTransitions(record)[0];
  const updated = async () => {
    refresh();
    await client.invalidateQueries({ queryKey: ['workspace', 'incidents'] });
  };
  const submit = useMutation({
    mutationFn: () => incidentApi.submit(id, revision),
    onSuccess: updated,
    onError: refresh,
  });
  const upload = useMutation({
    mutationFn: (camera: boolean) => incidentApi.upload(id, revision, camera),
    onSuccess: updated,
    onError: refresh,
  });
  const transition = useMutation({
    mutationFn: (status: 'acknowledged' | 'closed') => {
      if (!incidentTransitions(record).includes(status))
        throw new AppError('Báo cáo chưa đủ điều kiện chuyển trạng thái.');
      if (status === 'closed' && note.trim().length < 3)
        throw new AppError('Nhập ghi chú ít nhất 3 ký tự.');
      return incidentApi.transition(id, revision, status, note.trim());
    },
    onSuccess: updated,
    onError: refresh,
  });
  const photos = Array.isArray(record.photos) ? (record.photos as { _id: string }[]) : [];
  const remove = useMutation({
    mutationFn: (photoId: string) => incidentApi.removePhoto(id, photoId, revision),
    onSuccess: updated,
    onError: refresh,
  });
  return (
    <Card>
      <Text style={ui.heading}>Ảnh và xử lý</Text>
      {photos.map((photo) => (
        <View key={photo._id} style={{ gap: 8 }}>
          <IncidentPhoto id={id} photoId={photo._id} />
          {user.role === 'groom' && record.status === 'draft' && (
            <Button
              title="Xóa ảnh này"
              danger
              busy={remove.isPending}
              disabled={upload.isPending || submit.isPending}
              onPress={() =>
                Alert.alert('Xóa ảnh sự cố?', 'Ảnh sẽ bị gỡ khỏi bản nháp.', [
                  { text: 'Giữ lại', style: 'cancel' },
                  { text: 'Xóa', style: 'destructive', onPress: () => remove.mutate(photo._id) },
                ])
              }
            />
          )}
        </View>
      ))}
      {user.role === 'groom' && record.status === 'draft' && (
        <>
          {photos.length < 5 && (
            <>
              <Button
                title="Chụp ảnh sự cố"
                busy={upload.isPending}
                disabled={submit.isPending}
                onPress={() => upload.mutate(true)}
              />
              <Button
                secondary
                title="Chọn ảnh thư viện"
                busy={upload.isPending}
                disabled={submit.isPending}
                onPress={() => upload.mutate(false)}
              />
            </>
          )}
          <Button
            title="Gửi báo cáo"
            busy={submit.isPending}
            disabled={upload.isPending}
            onPress={() => submit.mutate()}
          />
        </>
      )}
      {canHandleIncident(record, user.role) && nextStatus && (
        <>
          <Field
            label="Ghi chú xử lý"
            multiline
            value={note}
            onChangeText={setNote}
            maxLength={1000}
          />
          <Button
            title={nextStatus === 'acknowledged' ? 'Tiếp nhận xử lý' : 'Đóng báo cáo'}
            busy={transition.isPending}
            onPress={() => transition.mutate(nextStatus)}
          />
        </>
      )}
      {(submit.error || upload.error || transition.error || remove.error) && (
        <Failure error={submit.error || upload.error || transition.error || remove.error} />
      )}
    </Card>
  );
}
