import { eligibleIncidentRecord } from '@/features/incidents/utils/lifecycle';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSession } from '@/features/auth/stores/session-store';
import { Choice, Empty } from '@/shared/components/ui';
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
  const source = referenceSource(operation, key, user.role, path);
  const [search, setSearch] = useState('');
  const scopedPayload = referencePayload(payload, path);
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
  if (operation.id === 'incidents.link' && key === 'medicalRecordId')
    rows = rows.filter((row) => eligibleIncidentRecord(row, context, user._id));
  const choices = rows.map((row, i) => ({ value: entityId(row), label: optionLabel(row, i) }));
  const dependency = source?.dependsOn && atPath(scopedPayload, source.dependsOn);
  return (
    <View style={{ gap: 8 }}>
      {source?.dependsOn && !dependency ? (
        <Text style={ui.muted}>Chọn {fieldLabel(source.dependsOn)} trước.</Text>
      ) : source || choices.length ? (
        <Choice
          label={fieldLabel(key)}
          onSearch={source?.paged && !local.length ? setSearch : undefined}
          loading={Boolean(source) && query.isFetching && !query.isFetchingNextPage}
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
