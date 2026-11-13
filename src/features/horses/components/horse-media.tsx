import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Image, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
import { AppError } from '@/core/errors/app-error';
import { Button, Card, Empty, Failure, Loading } from '@/shared/components/ui';
import { useSession } from '@/features/auth/stores/session-store';
import { ui } from '@/core/theme/theme';
import { asRecord } from '@/features/operations/types/operation';
import { ResponseSummary } from '@/features/operations/components/response-summary';
import { router } from 'expo-router';
export function HorseAvatar({ id }: { id: string }) {
  const user = useSession((state) => state.user)!;
  const client = useQueryClient();
  const [failed, setFailed] = useState(false);
  const query = useQuery({
    queryKey: ['horse-avatar', id],
    queryFn: async () =>
      z
        .object({ url: z.string().nullable() })
        .parse(await requestData(apiClient.get(`/horses/${id}/avatar`))),
    staleTime: 120000,
    refetchInterval: 240000,
    gcTime: 0,
  });
  const refresh = async () => {
    setFailed(false);
    await Promise.all([
      client.invalidateQueries({ queryKey: ['horse-avatar', id] }),
      client.invalidateQueries({ queryKey: ['horse', id] }),
      client.invalidateQueries({ queryKey: ['horses'] }),
    ]);
  };
  const upload = useMutation({
    mutationFn: async () => {
      const selected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (selected.canceled) return;
      const file = selected.assets[0];
      const mime = file.mimeType ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime))
        throw new AppError('Chọn ảnh JPEG, PNG hoặc WebP.');
      const bytes = await (await fetch(file.uri)).arrayBuffer();
      if (bytes.byteLength > 5 * 1024 * 1024) throw new AppError('Ảnh tối đa 5 MB.');
      return requestData(
        apiClient.put(`/horses/${id}/avatar`, bytes, {
          headers: { 'Content-Type': mime },
          transformRequest: [(data) => data],
          timeout: 45000,
        }),
      );
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => requestData(apiClient.delete(`/horses/${id}/avatar`)),
    onSuccess: refresh,
  });
  return (
    <Card>
      <Text style={ui.heading}>Ảnh hồ sơ</Text>
      {query.isPending ? (
        <Loading />
      ) : query.error || failed ? (
        <Failure
          error={query.error ?? new AppError('Không tải được ảnh.')}
          retry={() => void refresh()}
        />
      ) : query.data?.url ? (
        <Image
          accessibilityLabel="Ảnh ngựa"
          source={{ uri: query.data.url }}
          style={{ width: '100%', height: 220, borderRadius: 14 }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Empty label="Chưa có ảnh ngựa" />
      )}
      {['club_manager', 'head_trainer'].includes(user.role) && (
        <>
          <Button
            secondary
            title="Chọn / thay ảnh ngựa"
            busy={upload.isPending}
            disabled={remove.isPending}
            onPress={() => upload.mutate()}
          />
          {query.data?.url && (
            <Button
              danger
              title="Gỡ ảnh hồ sơ"
              busy={remove.isPending}
              disabled={upload.isPending}
              onPress={() =>
                Alert.alert('Gỡ ảnh ngựa?', 'Ảnh hồ sơ hiện tại sẽ được gỡ.', [
                  { text: 'Giữ ảnh', style: 'cancel' },
                  { text: 'Gỡ ảnh', style: 'destructive', onPress: () => remove.mutate() },
                ])
              }
            />
          )}
        </>
      )}
      {(upload.error || remove.error) && <Failure error={upload.error ?? remove.error} />}
    </Card>
  );
}
export function HorsePedigree({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['horse-pedigree', id],
    queryFn: () => requestData(apiClient.get(`/horses/${id}/pedigree`)),
  });
  const slots = [
    ['sire', 'Cha'],
    ['dam', 'Mẹ'],
    ['sireSire', 'Ông nội'],
    ['sireDam', 'Bà nội'],
    ['damSire', 'Ông ngoại'],
    ['damDam', 'Bà ngoại'],
  ];
  return (
    <Card>
      <Text style={ui.heading}>Phả hệ và nguồn chứng minh</Text>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {slots.map(([key, label]) => {
            const node = asRecord(asRecord(query.data?.tree)[key]);
            return (
              <Card key={key}>
                <Text style={ui.label}>{label}</Text>
                <Text style={ui.body}>{String(node.name ?? 'Chưa xác định')}</Text>
                {Boolean(node.registrationCode) && (
                  <Text style={ui.muted}>{String(node.registrationCode)}</Text>
                )}
                {node.canOpen === true && Boolean(node.horseId) && (
                  <Button
                    title="Mở hồ sơ"
                    secondary
                    onPress={() =>
                      router.push({
                        pathname: '/horses/[id]',
                        params: { id: String(node.horseId) },
                      })
                    }
                  />
                )}
              </Card>
            );
          })}
          <ResponseSummary
            data={{
              status: query.data?.status,
              sourceNote: query.data?.sourceNote,
              pending: query.data?.pending,
              lastReview: query.data?.lastReview,
            }}
          />
        </>
      )}
    </Card>
  );
}
