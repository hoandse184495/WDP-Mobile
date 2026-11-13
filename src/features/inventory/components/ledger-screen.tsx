import { useState } from 'react';
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { ui } from '@/core/theme/theme';
import { clubDate, formatDate, shiftDay } from '@/core/utils/date';
import { RoleGuard } from '@/shared/components/role-guard';
import { Button, Card, Choice, Failure, Screen } from '@/shared/components/ui';
import { DateField } from '@/shared/components/date-field';
import { ResponseSummary } from '@/features/operations/components/response-summary';
import { choiceLabel } from '@/features/operations/contracts/labels';
import { PagedList } from '@/shared/components/paged-list';
import { inventoryApi } from '../api/inventory-api';
function Ledger({
  warehouseId,
  itemId,
  name,
}: {
  warehouseId: string;
  itemId: string;
  name?: string;
}) {
  const [start, setStart] = useState(shiftDay(clubDate(), -30));
  const [end, setEnd] = useState(clubDate());
  const [period, setPeriod] = useState({ startDate: start, endDate: end });
  const [validation, setValidation] = useState('');
  const [lotId, setLotId] = useState('');
  const [type, setType] = useState('');
  const lots = useQuery({
    queryKey: ['ledger-options', warehouseId, itemId],
    queryFn: () => inventoryApi.ledgerOptions(warehouseId, itemId),
  });
  const document = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => inventoryApi.document(type, id),
  });
  const query = useInfiniteQuery({
    queryKey: ['ledger', warehouseId, itemId, period, lotId, type],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      inventoryApi.ledger(
        {
          warehouseId,
          itemId,
          ...period,
          lotId: lotId || undefined,
          type: type || undefined,
          page: pageParam,
        },
        signal,
      ),
    getNextPageParam: (p) =>
      p.pagination.page < p.pagination.totalPages ? p.pagination.page + 1 : undefined,
  });
  const apply = () => {
    const valid = (value: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value;
    if (
      !valid(start) ||
      !valid(end) ||
      start > end ||
      Date.parse(end) - Date.parse(start) >= 366 * 86400000
    ) {
      setValidation('Chọn khoảng ngày hợp lệ, tối đa 366 ngày.');
      return;
    }
    setValidation('');
    setPeriod({ startDate: start, endDate: end });
  };
  const summary = query.data?.pages[0].summary;
  return (
    <Screen scroll={false}>
      <PagedList
        items={query.data?.pages.flatMap((p) => p.items) ?? []}
        getId={(row) => row.key}
        pending={query.isPending}
        error={query.error}
        refreshing={query.isRefetching}
        refresh={() => void query.refetch()}
        more={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        loadMore={() => void query.fetchNextPage()}
        header={
          <View style={{ gap: 12, marginBottom: 18 }}>
            <Text style={ui.title}>Sổ kho · {name}</Text>
            <DateField label="Từ ngày" value={start} onChange={setStart} />
            <DateField label="Đến ngày" value={end} onChange={setEnd} />
            <Choice
              label="Lô vật tư"
              value={lotId}
              onChange={setLotId}
              options={[
                { value: '', label: 'Tất cả lô' },
                { value: 'none', label: 'Không quản lý lô' },
                ...(lots.data?.lots.map((lot) => ({ value: lot._id, label: lot.code })) ?? []),
              ]}
            />
            {lots.error && <Failure error={lots.error} retry={() => void lots.refetch()} />}
            <Choice
              label="Loại biến động"
              value={type}
              onChange={setType}
              options={[
                { value: '', label: 'Tất cả' },
                ...[
                  'medicine_issue',
                  'receipt',
                  'transfer_in',
                  'transfer_out',
                  'feed_issue',
                  'adjustment',
                  'disposal',
                ].map((value) => ({ value, label: choiceLabel(value) })),
              ]}
            />
            {validation && <Text style={ui.error}>{validation}</Text>}
            <Button title="Xem biến động" onPress={apply} />
            {document.error && <Failure error={document.error} />}
            {document.data && (
              <Card>
                <Text style={ui.heading}>Chứng từ gốc</Text>
                <ResponseSummary data={document.data} />
                <Button title="Đóng chứng từ" secondary onPress={() => document.reset()} />
              </Card>
            )}
            {summary && (
              <View style={ui.card}>
                <Text style={ui.body}>
                  Đầu kỳ: {summary.opening} · Nhập: {summary.incoming} · Xuất: {summary.outgoing}
                </Text>
                <Text style={ui.heading}>Cuối kỳ: {summary.closing}</Text>
                {summary.difference !== 0 && (
                  <Text style={ui.error}>Chênh lệch đối soát: {summary.difference}</Text>
                )}
              </View>
            )}
          </View>
        }
        renderItem={(row) => (
          <View style={ui.card}>
            <Text style={ui.heading}>
              {row.type} · {row.number}
            </Text>
            <Text style={ui.body}>
              {row.quantity > 0 ? '+' : ''}
              {row.quantity}
            </Text>
            <Text style={ui.muted}>
              {formatDate(row.occurredAt)} · {row.actorName}
            </Text>
            {typeof row.documentId === 'string' && (
              <Button
                title="Xem chứng từ gốc"
                secondary
                busy={document.isPending}
                onPress={() =>
                  document.mutate({
                    type: row.type.startsWith('transfer_') ? 'transfer' : row.type,
                    id: String(row.documentId),
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
export default function LedgerScreen() {
  const { warehouseId, itemId, name } = useLocalSearchParams<{
    warehouseId: string;
    itemId: string;
    name?: string;
  }>();
  return (
    <RoleGuard roles={['club_manager', 'warehouse_keeper']}>
      <Ledger warehouseId={warehouseId} itemId={itemId} name={name} />
    </RoleGuard>
  );
}
