import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { ui } from '@/core/theme/theme';
import { formatDate } from '@/core/utils/date';
import { useSession } from '@/features/auth/stores/session-store';
import { RoleGuard } from '@/shared/components/role-guard';
import { Badge, Button, Detail, Failure, Field, Screen } from '@/shared/components/ui';
import { PagedList } from '@/shared/components/paged-list';
import { inventoryApi } from '../api/inventory-api';
import { OperationPanel } from '@/features/operations/components/operation-panel';
function StockList({ id, name }: { id: string; name?: string }) {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const user = useSession((state) => state.user)!;
  const warehouse = useQuery({
    queryKey: ['inventory-warehouse', id],
    queryFn: ({ signal }) => inventoryApi.warehouse(id, signal),
  });
  const query = useInfiniteQuery({
    queryKey: ['stock', id, search],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => inventoryApi.stock(id, pageParam, search, signal),
    getNextPageParam: (p) =>
      p.pagination.page < p.pagination.totalPages ? p.pagination.page + 1 : undefined,
  });
  return (
    <Screen scroll={false}>
      <PagedList
        items={query.data?.pages.flatMap((p) => p.items) ?? []}
        getId={(row) => row._id}
        pending={query.isPending}
        error={query.error}
        refreshing={query.isRefetching}
        refresh={() => void query.refetch()}
        more={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        loadMore={() => void query.fetchNextPage()}
        header={
          <View style={{ gap: 12, marginBottom: 18 }}>
            <Text style={ui.title}>{warehouse.data?.name ?? name ?? 'Tồn kho'}</Text>
            {warehouse.error && (
              <Failure error={warehouse.error} retry={() => void warehouse.refetch()} />
            )}
            {warehouse.data && (
              <>
                <Detail
                  label="Groom phụ trách / kiểm kê"
                  value={
                    warehouse.data.assignedGroomIds?.map((groom) => groom.fullName).join(', ') ||
                    'Chưa phân công'
                  }
                />
                {!!warehouse.data.responsibleVetName && (
                  <Detail label="Vet phụ trách" value={warehouse.data.responsibleVetName} />
                )}
                {!!warehouse.data.stocktakeNumber && (
                  <Text style={ui.error}>
                    Kho đang khóa kiểm kê: {warehouse.data.stocktakeNumber}. Chưa thể xác nhận giao
                    dịch làm thay đổi tồn.
                  </Text>
                )}
                <OperationPanel module="warehouses" record={warehouse.data} />
              </>
            )}
            <Field
              label="Tìm vật tư"
              value={text}
              onChangeText={setText}
              maxLength={100}
              returnKeyType="search"
              onSubmitEditing={() => setSearch(text.trim())}
            />
            <Button secondary title="Tìm kiếm" onPress={() => setSearch(text.trim())} />
          </View>
        }
        renderItem={(row) => (
          <View style={ui.card}>
            <Text style={ui.heading}>{row.item.name}</Text>
            <Text style={ui.body}>
              {row.quantity} {row.item.unit}
            </Text>
            <Text style={ui.muted}>
              Lô: {row.lot?.code || 'Không có mã'} · HSD:{' '}
              {row.lot?.expiresOn ? formatDate(row.lot.expiresOn) : 'Chưa khai báo'}
            </Text>
            <Badge label={row.lotState} danger={row.lotState === 'expired'} />
            <OperationPanel
              module="disposals"
              record={{ ...row, warehouseId: id, balanceId: row._id }}
              collection
            />
            {['club_manager', 'warehouse_keeper'].includes(user.role) && (
              <Button
                secondary
                title="Xem sổ kho vật tư"
                onPress={() =>
                  router.push({
                    pathname: '/ledger',
                    params: { warehouseId: id, itemId: row.item._id, name: row.item.name },
                  })
                }
              />
            )}
          </View>
        )}
      />
    </Screen>
  );
}
export default function StockScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  return (
    <RoleGuard roles={['club_manager', 'warehouse_keeper', 'groom', 'veterinarian']}>
      <StockList id={id} name={name} />
    </RoleGuard>
  );
}
