import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { ui } from '@/core/theme/theme';
import { Button, Card, Empty, Failure, Loading } from '@/shared/components/ui';
import { taskApi } from '../api/task-api';
import { useRefreshTask } from '../hooks/use-tasks';
function Photo({
  taskId,
  photoId,
  fileName,
}: {
  taskId: string;
  photoId: string;
  fileName: string;
}) {
  const [failed, setFailed] = useState(false);
  const query = useQuery({
    queryKey: ['evidence-url', taskId, photoId],
    queryFn: () => taskApi.photoUrl(taskId, photoId),
    staleTime: 120000,
    gcTime: 180000,
    refetchInterval: 240000,
  });
  if (failed)
    return (
      <Failure
        error={new Error('Không tải được ảnh bằng chứng.')}
        retry={() => {
          setFailed(false);
          void query.refetch();
        }}
      />
    );
  return query.data ? (
    <Image
      accessibilityLabel={fileName}
      source={{ uri: query.data.url }}
      style={{ width: '100%', height: 180, borderRadius: 12 }}
      onError={() => setFailed(true)}
    />
  ) : query.isPending ? (
    <Loading />
  ) : (
    <Failure error={query.error} retry={() => void query.refetch()} />
  );
}
export function TaskEvidence({ id, editable }: { id: string; editable: boolean }) {
  const refresh = useRefreshTask(id);
  const query = useQuery({
    queryKey: ['evidence', id],
    queryFn: ({ signal }) => taskApi.evidence(id, signal),
  });
  const upload = useMutation({
    mutationFn: (camera: boolean) => taskApi.upload(id, query.data!.revision, camera),
    onSuccess: refresh,
    onError: refresh,
  });
  const remove = useMutation({
    mutationFn: (photoId: string) => taskApi.removePhoto(id, photoId, query.data!.revision),
    onSuccess: refresh,
    onError: refresh,
  });
  return (
    <Card>
      <Text style={ui.heading}>Ảnh bằng chứng</Text>
      <Text style={ui.muted}>
        Cần ít nhất 1 ảnh để hoàn thành, tối đa 3 ảnh. JPEG/PNG/WebP, tối đa 5 MB mỗi ảnh.
      </Text>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.photos.length ? (
        <Empty label="Chưa có bằng chứng" />
      ) : (
        query.data.photos.map((photo) => (
          <View key={photo._id} style={{ gap: 10 }}>
            <Photo taskId={id} photoId={photo._id} fileName={photo.fileName} />
            {editable && (
              <Button
                danger
                title="Gỡ ảnh"
                disabled={upload.isPending || remove.isPending}
                onPress={() =>
                  Alert.alert('Gỡ ảnh bằng chứng?', photo.fileName, [
                    { text: 'Giữ ảnh', style: 'cancel' },
                    {
                      text: 'Gỡ ảnh',
                      style: 'destructive',
                      onPress: () => remove.mutate(photo._id),
                    },
                  ])
                }
              />
            )}
          </View>
        ))
      )}
      {editable && query.data && query.data.photos.length < 3 && (
        <>
          <Button
            title="Chụp bằng chứng"
            busy={upload.isPending}
            disabled={remove.isPending}
            onPress={() => upload.mutate(true)}
          />
          <Button
            title="Chọn từ thư viện"
            secondary
            busy={upload.isPending}
            disabled={remove.isPending}
            onPress={() => upload.mutate(false)}
          />
        </>
      )}
      {(upload.error || remove.error) && <Failure error={upload.error || remove.error} />}
    </Card>
  );
}
