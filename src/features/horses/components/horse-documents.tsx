import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/stores/session-store';
import { Button, Card, Failure, Field, Loading } from '@/shared/components/ui';
import { Icon } from '@/shared/components/icon';
import { colors, ui } from '@/core/theme/theme';
import { formatDate } from '@/core/utils/date';
import { horseDocumentsApi, type HorseDocument } from '../api/horse-documents-api';
export function HorseDocuments({ id }: { id: string }) {
  const user = useSession((state) => state.user);
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const key = ['horse-documents', id, user?._id, user?.role];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => horseDocumentsApi.list(id, signal),
    enabled: Boolean(user),
  });
  const refresh = () => client.invalidateQueries({ queryKey: ['horse-documents', id] });
  const upload = useMutation({
    mutationFn: () => horseDocumentsApi.upload(id, title),
    onSuccess: (result) => {
      if (result) {
        setTitle('');
        void refresh();
      }
    },
  });
  const open = useMutation({
    mutationFn: (document: HorseDocument) => horseDocumentsApi.open(id, document),
  });
  const remove = useMutation({
    mutationFn: (document: HorseDocument) => horseDocumentsApi.remove(id, document),
    onSuccess: refresh,
    onError: refresh,
  });
  const busy = upload.isPending || remove.isPending || open.isPending;
  return (
    <Card>
      <View style={ui.row}>
        <View style={ui.iconTile}>
          <Icon name="file" color={colors.primary} size={21} />
        </View>
        <View style={ui.grow}>
          <Text style={ui.heading}>Giấy tờ chiến mã</Text>
          <Text style={[ui.muted, { fontSize: 12 }]}>Hộ chiếu, phả hệ và tài liệu đính kèm</Text>
        </View>
      </View>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <Text style={ui.muted}>Chưa có giấy tờ đính kèm.</Text>
      ) : (
        query.data.map((document) => (
          <View key={`${document.source}-${document._id}`} style={ui.inset}>
            <Text style={ui.label}>{document.title || document.fileName}</Text>
            {document.title && <Text style={ui.muted}>{document.fileName}</Text>}
            <Text style={[ui.muted, { fontSize: 11 }]}>
              {Math.ceil(document.size / 1024)} KiB · {formatDate(document.createdAt)}
              {document.uploadedBy ? ` · ${document.uploadedBy.fullName}` : ''}
              {document.source === 'admission' ? ' · Hồ sơ tiếp nhận trước đây' : ''}
            </Text>
            <Button
              secondary
              title={`Mở / chia sẻ: ${document.title || document.fileName}`}
              disabled={busy}
              onPress={() => open.mutate(document)}
            />
            {user?.role === 'club_manager' && document.source === 'horse' && document.canDelete && (
              <Button
                danger
                title="Xóa giấy tờ"
                disabled={busy}
                onPress={() =>
                  Alert.alert('Xóa giấy tờ?', document.title || document.fileName, [
                    { text: 'Quay lại', style: 'cancel' },
                    { text: 'Xóa', style: 'destructive', onPress: () => remove.mutate(document) },
                  ])
                }
              />
            )}
          </View>
        ))
      )}
      {user?.role === 'club_manager' && (
        <View style={{ gap: 10 }}>
          <Field
            label="Tên giấy tờ (tùy chọn)"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            placeholder="Hộ chiếu, giấy đăng ký…"
          />
          <Text style={[ui.muted, { fontSize: 12 }]}>PNG, JPEG hoặc PDF, tối đa 5 MiB.</Text>
          <Button
            title="Chọn và tải giấy tờ"
            busy={upload.isPending}
            disabled={busy && !upload.isPending}
            onPress={() => upload.mutate()}
          />
        </View>
      )}
      {(upload.error || remove.error || open.error) && (
        <Failure error={upload.error || remove.error || open.error} />
      )}
    </Card>
  );
}
