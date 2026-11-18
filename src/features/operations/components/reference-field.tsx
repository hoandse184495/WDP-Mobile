import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { inventoryOptions } from '@/features/inventory/inventory-options';
import { Text, View } from 'react-native';
import { useSession } from '@/features/auth/stores/session-store';
import { Button, Choice, Empty, Failure } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { fieldLabel } from '../contracts/labels';
import {
  referenceSource,
  referencePayload,
  useReferenceOptions,
  optionLabel,
} from '../hooks/use-reference-options';
import { Operation, JsonRecord, asRecord, atPath, entityId } from '../types/operation';
export function ReferenceField({
  operation,
  path,
  value,
  onChange,
  payload,
  context,
  id,
}: {
  operation: Operation;
  path: string;
  value: unknown;
  onChange: (value: unknown) => void;
  payload: JsonRecord;
  context: JsonRecord;
  id?: string;
}) {
  const user = useSession((state) => state.user)!;
  const key = path.split('.').at(-1)!;
  const baseSource = referenceSource(operation, key, user.role, path);
  const [search, setSearch] = useState('');
  const scopedPayload = referencePayload(payload, path);
  const warehouseId =
    operation.module === 'transfers' && key === 'balanceId'
      ? entityId(payload.destinationWarehouseId)
      : operation.id === 'replenishments.create' && key === 'itemId'
        ? entityId(payload.warehouseId)
        : '';
  const warehouseQuery = useQuery({
    queryKey: ['inventory-warehouse', warehouseId],
    enabled: Boolean(warehouseId),
    queryFn: ({ signal }) => inventoryApi.warehouse(warehouseId, signal),
  });
  const source =
    operation.id === 'replenishments.create' && key === 'itemId' && user.role === 'warehouse_keeper'
      ? {
          path: '/inventory/items',
          key: 'items',
          paged: true,
          params: {
            category: warehouseQuery.data?.type === 'medicine_cabinet' ? 'medicine' : 'feed',
          },
        }
      : baseSource;
  const query = useReferenceOptions(source, scopedPayload, id, search);
  let local: JsonRecord[] = [];
  if (key === 'lineId') local = Array.isArray(context.lines) ? context.lines.map(asRecord) : [];
  if (key === 'id' && path.includes('injur')) {
    const rows = asRecord(context._details).injuries;
    if (Array.isArray(rows)) local = rows.map(asRecord);
  }
  let rows = local.length ? local : (query.data?.pages.flatMap((page) => page.rows) ?? []);
  if (operation.module === 'tasks' && ['trainingExerciseKey', 'rationMealKey'].includes(key)) {
    const training = key === 'trainingExerciseKey',
      plan = rows.find(
        (row) =>
          entityId(row) ===
          entityId(
            scopedPayload[training ? 'trainingPlanId' : 'rationPlanId'] ??
              context[training ? 'trainingPlanId' : 'rationPlanId'],
          ),
      );
    const children = plan?.[training ? 'exercises' : 'meals'];
    rows = Array.isArray(children)
      ? children
          .map(asRecord)
          .map((row) => ({ ...row, _id: row.key, planRevision: plan?.revision }))
      : training && plan
        ? [{ _id: 'legacy', title: 'Bài tập mặc định' }]
        : [];
  }
  if (
    key === 'groomId' &&
    ['schedules', 'medical'].includes(operation.module) &&
    source?.key === 'assignments'
  ) {
    const horseId = entityId(
      payload.horseId ?? asRecord(payload.record).horseId ?? context.horseId,
    );
    const grooms = rows
      .filter((row) => horseId && entityId(row.horseId) === horseId)
      .map((row) => asRecord(row.groomId))
      .filter((row) => entityId(row));
    rows = [...new Map(grooms.map((row) => [entityId(row), row])).values()];
  }
  if (operation.module === 'tasks' && ['trainingPlanId', 'rationPlanId'].includes(key)) {
    const horseId = entityId(scopedPayload.horseId ?? context.horseId);
    rows = rows.filter((row) => horseId && entityId(row.horseId) === horseId);
  }
  rows = inventoryOptions(operation, key, rows, payload, warehouseQuery.data);
  const choices = rows.map((row, i) => ({ value: entityId(row), label: optionLabel(row, i) }));
  if (key === 'assignedGroomIds') {
    const selected = Array.isArray(value) ? value.map(entityId).filter(Boolean) : [];
    const known = [
      ...rows,
      ...(Array.isArray(context.assignedGroomIds) ? context.assignedGroomIds.map(asRecord) : []),
    ];
    return (
      <View style={{ gap: 10 }}>
        <Text style={ui.label}>{fieldLabel(key)}</Text>
        <Text style={ui.muted}>Có thể chọn nhiều Groom; bỏ trống nếu chưa phân công.</Text>
        {selected.map((groomId) => (
          <Button
            key={groomId}
            secondary
            title={
              'Bỏ ' + (known.find((row) => entityId(row) === groomId)?.fullName ?? 'Groom đã chọn')
            }
            onPress={() => onChange(selected.filter((value) => value !== groomId))}
          />
        ))}
        <Choice
          label="Thêm Groom phụ trách"
          options={choices.filter((row) => !selected.includes(row.value))}
          loading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          onChange={(groomId) => onChange([...new Set([...selected, groomId])])}
        />
      </View>
    );
  }
  const dependency = source?.dependsOn && atPath(scopedPayload, source.dependsOn);
  return (
    <View style={{ gap: 8 }}>
      {warehouseQuery.error ? (
        <Failure error={warehouseQuery.error} retry={() => void warehouseQuery.refetch()} />
      ) : source?.dependsOn && !dependency ? (
        <Text style={ui.muted}>Chọn {fieldLabel(source.dependsOn)} trước.</Text>
      ) : source || choices.length ? (
        <Choice
          label={fieldLabel(key)}
          onSearch={source?.paged && !local.length ? setSearch : undefined}
          loading={
            (Boolean(source) && query.isFetching && !query.isFetchingNextPage) ||
            (Boolean(warehouseId) && warehouseQuery.isPending)
          }
          error={query.error}
          onRetry={() => void query.refetch()}
          hasMore={query.hasNextPage}
          loadingMore={query.isFetchingNextPage}
          onLoadMore={() => void query.fetchNextPage()}
          value={entityId(value)}
          onChange={(next) =>
            onChange(
              key === 'id' ||
                (['trainingPlanId', 'trainingExerciseKey'].includes(key) &&
                  operation.module === 'tasks')
                ? (rows.find((row) => entityId(row) === next) ?? next)
                : next,
            )
          }
          options={choices}
        />
      ) : (
        <Empty label={`Chưa có ${fieldLabel(key).toLowerCase()} phù hợp`} />
      )}
    </View>
  );
}
