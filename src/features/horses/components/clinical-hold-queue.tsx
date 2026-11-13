import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Failure, Loading } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { useSession } from '@/features/auth/stores/session-store';
import { horseApi } from '../api/horse-api';
import { isClinicalHold, canControlTraining } from '../utils/clinical-hold';
import type { Horse } from '../types/horse';
export async function loadClinicalHolds(signal?: AbortSignal) {
  const horses: Horse[] = [];
  let page = 1;
  while (true) {
    const result = await horseApi.list({ page, limit: 50 }, signal);
    horses.push(...result.items.filter(isClinicalHold));
    if (page >= result.pagination.totalPages) return horses;
    page++;
  }
}
export function ClinicalHoldQueue() {
  const user = useSession((s) => s.user),
    [count, setCount] = useState(4);
  const query = useQuery({
    queryKey: ['clinical-holds', user?._id, user?.role],
    queryFn: ({ signal }) => loadClinicalHolds(signal),
    enabled: canControlTraining(user?.role),
    retry: false,
  });
  if (!canControlTraining(user?.role)) return null;
  return (
    <Card>
      <Text style={ui.heading}>
        Chờ khám xác nhận{query.data && !query.error ? ' (' + query.data.length + ')' : ''}
      </Text>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : query.data?.length ? (
        <>
          {query.data.slice(0, count).map((horse) => (
            <View key={horse._id} style={{ gap: 8, paddingVertical: 8 }}>
              <Text style={ui.label}>
                {horse.name} · {horse.registrationCode}
              </Text>
              <Text style={ui.error}>{horse.trainingLockReason}</Text>
              <Button
                secondary
                title={'Mở hồ sơ ' + horse.name}
                onPress={() => router.push({ pathname: '/horses/[id]', params: { id: horse._id } })}
              />
              {user?.role === 'veterinarian' && (
                <Button
                  title={'Khám xác nhận ' + horse.name}
                  onPress={() =>
                    router.push({
                      pathname: '/operations/[operation]',
                      params: { operation: 'medical.encounter', horseId: horse._id },
                    })
                  }
                />
              )}
            </View>
          ))}
          {query.data.length > count && (
            <Button secondary title="Xem thêm ngựa chờ khám" onPress={() => setCount(count + 4)} />
          )}
        </>
      ) : (
        <Text style={ui.muted}>Không có ngựa đang tạm khóa chờ khám xác nhận.</Text>
      )}
      <Button
        secondary
        title="Làm mới hàng đợi khám"
        busy={query.isFetching}
        onPress={() => void query.refetch()}
      />
    </Card>
  );
}
