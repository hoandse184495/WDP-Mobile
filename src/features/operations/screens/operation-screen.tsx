import { CareCompletionFields } from '@/features/medical/components/care-completion-fields';
import {
  ClinicalFormHint,
  EmergencyOperationHelp,
  encounterHorseId,
} from '@/features/horses/components/training-hold';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Empty, Failure, Loading, Screen } from '@/shared/components/ui';
import { RoleGuard } from '@/shared/components/role-guard';
import { useSession } from '@/features/auth/stores/session-store';
import { ui } from '@/core/theme/theme';
import { AppError } from '@/core/errors/app-error';
import { sessionVersion } from '@/features/auth/utils/session';
import { operationsApi } from '../api/operations-api';
import { findOperation, allowedOperation } from '../contracts/registry';
import { Operation, JsonRecord, asRecord } from '../types/operation';
import {
  operationInitial,
  operationSchema,
  prepareOperation,
  operationErrors,
} from '../contracts/business-rules';
import { SchemaField } from '../components/schema-field';
import { ReferenceField } from '../components/reference-field';
import { ResponseSummary } from '../components/response-summary';
import { ReplenishmentDemand } from '@/features/inventory/components/replenishment-demand';
function RecordSelection({ operation }: { operation: Operation }) {
  const [id, setId] = useState('');
  return (
    <Screen>
      <Text style={ui.title}>{operation.title}</Text>
      <ReferenceField
        operation={{
          ...operation,
          references: { ...operation.references, medicalRecordId: operation.recordSelection! },
        }}
        path="medicalRecordId"
        value={id}
        onChange={(value) => setId(String(value))}
        payload={{}}
        context={{}}
      />
      <Button
        title="Tiếp tục"
        disabled={!id}
        onPress={() =>
          router.replace({
            pathname: '/operations/[operation]',
            params: { operation: operation.id, id },
          })
        }
      />
    </Screen>
  );
}
function OperationForm({
  operation,
  context,
  id,
  reload,
}: {
  operation: Operation;
  context: JsonRecord;
  id?: string;
  reload: () => void;
}) {
  const client = useQueryClient();
  const [version] = useState(sessionVersion);
  const [preview, setPreview] = useState<JsonRecord | null>(null);
  const [previewInput, setPreviewInput] = useState('');
  const form = useForm<{ payload: JsonRecord }>({
    defaultValues: { payload: operationInitial(operation, context) },
  });
  const values = useWatch({ control: form.control });
  const payload = asRecord(values.payload);
  const baseSchema = operationSchema(operation, context);
  const role = useSession((state) => state.user?.role);
  const missingCabinet =
    operation.id === 'prescriptions.issue' &&
    role === 'veterinarian' &&
    asRecord(asRecord(context._details).warehouse).type !== 'medicine_cabinet';
  const medicatedCare =
    operation.id === 'schedules.complete' &&
    ['vaccination', 'deworming'].includes(String(context.type));
  const schema =
    operation.id === 'replenishments.create' && role === 'warehouse_keeper'
      ? {
          ...baseSchema,
          properties: Object.fromEntries(
            Object.entries(baseSchema.properties ?? {}).filter(([key]) => key !== 'taskId'),
          ),
        }
      : medicatedCare
        ? {
            ...baseSchema,
            properties: Object.fromEntries(
              Object.entries(baseSchema.properties ?? {}).filter(
                ([key]) => !['administration', 'stockIssue', 'nextDueDate'].includes(key),
              ),
            ),
          }
        : baseSchema;
  const body = prepareOperation(operation, payload);
  const previewBody = { ...body };
  delete previewBody.token;
  const fingerprint = JSON.stringify(previewBody);
  const previewMutation = useMutation({
    mutationFn: async () => {
      const errors = operationErrors(operation, body, true);
      if (errors.length) throw new AppError(errors.join('\n'));
      return operationsApi.preview(operation, id, previewBody);
    },
    onSuccess: (data) => {
      setPreview(data);
      setPreviewInput(fingerprint);
      if (data.token) form.setValue('payload', { ...payload, token: data.token });
    },
  });
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: async () => {
      if (version !== sessionVersion())
        throw new AppError('Phiên đăng nhập đã thay đổi. Mở lại hồ sơ để tiếp tục.');
      const checked = prepareOperation(operation, form.getValues('payload'));
      const errors = operationErrors(operation, checked, false, context);
      if (errors.length) throw new AppError(errors.join('\n'));
      if (
        operation.previewPath &&
        (!preview || previewInput !== fingerprint || preview.ready === false)
      )
        throw new AppError('Hãy kiểm tra lại bản xem trước hợp lệ trước khi xác nhận.');
      return operationsApi.submit(operation, id, checked);
    },
    onSuccess: async (result) => {
      if (version !== sessionVersion()) return;
      await client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
      Alert.alert('Đã lưu', `${operation.title} thành công.`);
      if (['admissions.create', 'incidents.create'].includes(operation.id)) {
        const record = asRecord(
          asRecord(result)[operation.id === 'admissions.create' ? 'application' : 'report'],
        );
        if (typeof record._id === 'string') {
          router.replace({
            pathname: '/records/[module]/[id]',
            params: { module: operation.module, id: record._id },
          });
          return;
        }
      }
      router.back();
    },
  });
  const busy = mutation.isPending || previewMutation.isPending;
  const submit = () =>
    operation.destructive || operation.confirmation
      ? Alert.alert(
          operation.title,
          operation.confirmation ?? 'Thao tác sẽ được ghi nhận vào hệ thống. Xác nhận tiếp tục?',
          [
            { text: 'Quay lại', style: 'cancel' },
            { text: 'Xác nhận', style: 'destructive', onPress: () => mutation.mutate() },
          ],
        )
      : mutation.mutate();
  return (
    <Screen>
      <Text style={ui.title}>{operation.title}</Text>
      {operation.description && <Text style={ui.muted}>{operation.description}</Text>}
      {missingCabinet && (
        <Text style={ui.error}>
          Chưa có tủ thuốc thú y hoạt động. Liên hệ Thủ kho tạo tủ và chuyển thuốc vào tủ, sau đó
          tải lại hồ sơ.
        </Text>
      )}
      {[
        'medical.create',
        'medical.encounter',
        'schedules.encounter',
        'incidents.encounter',
      ].includes(operation.id) && <ClinicalFormHint horseId={encounterHorseId(payload)} />}
      {['horses.emergency-lock', 'horses.emergency-unlock'].includes(operation.id) && (
        <EmergencyOperationHelp
          unlock={operation.id === 'horses.emergency-unlock'}
          context={context}
          reason={payload.reason}
          onPreset={(reason) => form.setValue('payload', { ...payload, reason })}
        />
      )}
      {operation.scope === 'record' && (
        <Card>
          <Text style={ui.heading}>Hồ sơ hiện tại</Text>
          <ResponseSummary
            data={
              operation.module === 'prescriptions'
                ? context._details
                : { name: context.name ?? context.title ?? context.number, status: context.status }
            }
          />
        </Card>
      )}
      {operation.id === 'disposals.create' && (
        <ReferenceField
          operation={operation}
          path="warehouseId"
          value={payload.warehouseId}
          onChange={(value) =>
            form.setValue('payload', { ...payload, warehouseId: value, balanceId: undefined })
          }
          payload={payload}
          context={context}
        />
      )}
      <Controller
        control={form.control}
        name="payload"
        render={({ field }) => (
          <View pointerEvents={busy ? 'none' : 'auto'} accessibilityState={{ disabled: busy }}>
            <SchemaField
              operation={operation}
              schema={schema}
              value={field.value}
              onChange={(value) => field.onChange(asRecord(value))}
              path=""
              required
              payload={payload}
              context={context}
              id={id}
            />
          </View>
        )}
      />
      {medicatedCare && (
        <View pointerEvents={busy ? 'none' : 'auto'}>
          <CareCompletionFields
            payload={payload}
            context={context}
            onChange={(next) => form.setValue('payload', next)}
          />
        </View>
      )}
      {operation.id === 'replenishments.create' && <ReplenishmentDemand payload={payload} />}
      {operation.previewPath && (
        <>
          <Button
            title="Kiểm tra và xem trước"
            secondary
            busy={previewMutation.isPending}
            disabled={mutation.isPending}
            onPress={() => previewMutation.mutate()}
          />
          {preview && (
            <Card>
              <ResponseSummary data={preview} />
              {previewInput !== fingerprint && (
                <Text style={ui.error}>Thông tin đã thay đổi, cần xem trước lại.</Text>
              )}
            </Card>
          )}
        </>
      )}
      {(mutation.error || previewMutation.error) && (
        <Failure error={mutation.error ?? previewMutation.error} />
      )}
      <Button
        title="Lưu và xác nhận"
        busy={mutation.isPending}
        disabled={previewMutation.isPending || missingCabinet}
        onPress={submit}
      />
      <Button
        title="Tải lại dữ liệu hồ sơ"
        secondary
        disabled={busy}
        onPress={() =>
          Alert.alert(
            'Tải lại dữ liệu?',
            'Nội dung chưa lưu sẽ được đặt lại theo hồ sơ hiện tại.',
            [
              { text: 'Giữ nội dung', style: 'cancel' },
              { text: 'Tải lại', onPress: reload },
            ],
          )
        }
      />
    </Screen>
  );
}
function LoadOperation({
  operation,
  id,
  horseId,
}: {
  operation: Operation;
  id?: string;
  horseId?: string;
}) {
  const user = useSession((state) => state.user)!;
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['operation', operation.id, id, reloadKey, page, ...(horseId ? [horseId] : [])],
    queryFn: ({ signal }) => operationsApi.context(operation, id, signal, page, horseId),
    staleTime: 0,
    retry: false,
  });
  if (!query.data)
    return (
      <Screen>
        {query.isPending ? (
          <Loading />
        ) : (
          <Failure error={query.error} retry={() => void query.refetch()} />
        )}
      </Screen>
    );
  if (!allowedOperation(operation, user.role, query.data, user._id))
    return (
      <Screen>
        <Empty
          label="Thao tác không còn khả dụng"
          detail="Kiểm tra trạng thái hồ sơ và phạm vi phụ trách của bạn."
        />
      </Screen>
    );
  const totalPages = Number(asRecord(query.data.linePagination).totalPages ?? 1);
  const changePage = (next: number) =>
    Alert.alert(
      'Chuyển trang kiểm đếm?',
      'Lưu số lượng của trang hiện tại trước khi chuyển. Nội dung chưa lưu sẽ bị bỏ.',
      [
        { text: 'Ở lại', style: 'cancel' },
        { text: 'Chuyển trang', onPress: () => setPage(next) },
      ],
    );
  return (
    <View style={{ flex: 1 }}>
      {operation.id === 'stocktakes.save' && totalPages > 1 && (
        <View style={{ padding: 12, gap: 8 }}>
          <Text style={ui.muted}>
            Trang {page}/{totalPages} · Lưu từng trang trước khi gửi toàn bộ kết quả.
          </Text>
          <View style={ui.row}>
            <Button
              title="Trang trước"
              secondary
              disabled={page === 1}
              onPress={() => changePage(page - 1)}
            />
            <Button
              title="Trang sau"
              secondary
              disabled={page === totalPages}
              onPress={() => changePage(page + 1)}
            />
          </View>
        </View>
      )}
      <OperationForm
        key={[operation.id, id, reloadKey, page, ...(horseId ? [horseId] : [])].join('-')}
        operation={operation}
        context={query.data}
        id={id}
        reload={() => setReloadKey((key) => key + 1)}
      />
    </View>
  );
}
export default function OperationScreen() {
  const {
    operation: id,
    id: recordId,
    horseId,
  } = useLocalSearchParams<{
    operation: string;
    id?: string;
    horseId?: string;
  }>();
  const operation = findOperation(id);
  if (!operation)
    return (
      <Screen>
        <Empty label="Không tìm thấy thao tác" />
      </Screen>
    );
  return (
    <RoleGuard roles={operation.roles}>
      {operation.recordSelection && !recordId ? (
        <RecordSelection operation={operation} />
      ) : (
        <LoadOperation operation={operation} id={recordId} horseId={horseId} />
      )}
    </RoleGuard>
  );
}
