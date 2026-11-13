import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Card, Button, Choice } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { useHorses } from '../hooks/use-horses';
export function OwnerJournalAccess() {
  const [id, setId] = useState<string>(),
    [search, setSearch] = useState('');
  const horses = useHorses(search);
  return (
    <Card>
      <Text style={ui.heading}>Nhật ký chăm sóc chiến mã</Text>
      <Choice
        label="Ngựa xem nhật ký"
        value={id}
        onChange={setId}
        onSearch={setSearch}
        options={
          horses.data?.pages
            .flatMap((p) => p.items)
            .map((h) => ({ value: h._id, label: h.name + ' · ' + h.registrationCode })) ?? []
        }
        loading={horses.isFetching && !horses.isFetchingNextPage}
        error={horses.error}
        onRetry={() => void horses.refetch()}
        hasMore={horses.hasNextPage}
        loadingMore={horses.isFetchingNextPage}
        onLoadMore={() => void horses.fetchNextPage()}
      />
      <Button
        title="Mở nhật ký chăm sóc"
        disabled={!id}
        onPress={() => {
          if (id) router.push({ pathname: '/care-journal', params: { id } });
        }}
      />
    </Card>
  );
}
