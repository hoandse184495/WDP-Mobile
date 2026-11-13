import { useState } from 'react';
import { Text } from 'react-native';
import { clubDate, shiftDay } from '@/core/utils/date';
import { Button, Card } from '@/shared/components/ui';
import { SchemaField } from '@/features/operations/components/schema-field';
import { contracts, normalizeInput, validateInput } from '@/features/operations/contracts/schema';
import {
  InputSchema,
  JsonRecord,
  Operation,
  asRecord,
} from '@/features/operations/types/operation';
import { getModule } from '../types/catalog';
import { ui } from '@/core/theme/theme';
const listing: Record<string, string> = {
  training: 'trainingPlan.trainingPlanListQuerySchema',
  sessions: 'trainingSession.trainingSessionListQuerySchema',
  medical: 'medicalRecord.medicalRecordListQuerySchema',
  injuries: 'injury.injuryListQuerySchema',
  schedules: 'medicalSchedule.listSchema',
  admissions: 'admission.admissionListSchema',
  rations: 'ration.list',
  prescriptions: 'prescription.list',
  items: 'inventory.itemList',
  warehouses: 'inventory.warehouseList',
  receipts: 'inventory.receiptList',
  transfers: 'inventory.transferList',
  replenishments: 'replenishment.list',
  stocktakes: 'stocktake.list',
  feedIssues: 'feedingStock.list',
  incidents: 'incident.list',
  team: 'user.userListQuerySchema',
  audit: 'auditLog.auditLogListQuerySchema',
  alerts: 'taskAlert.list',
};
const day: InputSchema = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const oid: InputSchema = { type: 'string', pattern: '^[a-fA-F0-9]{24}$' };
export const staffWorkFilters: InputSchema = {
  type: 'object',
  properties: {
    startDate: day,
    endDate: day,
    role: { type: 'string', enum: ['groom', 'head_trainer', 'veterinarian'] },
    employeeId: oid,
    horseId: oid,
    unassigned: { type: 'string', enum: ['true'] },
    kind: {
      type: 'string',
      enum: [
        'groom_task',
        'training_schedule',
        'training_plan',
        'training_review',
        'ration_proposal',
        'ration_review',
        'injury',
        'medical_record',
        'admission_vet',
      ],
    },
    state: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
  },
  required: ['startDate', 'endDate'],
};
export function listFilterSchema(module: string, horseScoped = false): InputSchema | undefined {
  const original =
    module === 'staffWork'
      ? staffWorkFilters
      : module === 'disposals'
        ? {
            type: 'object',
            properties: { status: { type: 'string', enum: ['pending', 'confirmed', 'rejected'] } },
          }
        : contracts[listing[module]];
  if (!original) return undefined;
  return {
    ...original,
    properties: Object.fromEntries(
      Object.entries(original.properties ?? {}).filter(
        ([key]) => !['page', 'limit', ...(horseScoped ? ['horseId'] : [])].includes(key),
      ),
    ),
    required: module === 'staffWork' ? ['startDate', 'endDate'] : [],
  };
}
export function WorkspaceFilters({
  module,
  horseScoped,
  onApply,
}: {
  module: string;
  horseScoped: boolean;
  onApply: (value: JsonRecord) => void;
}) {
  const [open, setOpen] = useState(false),
    [value, setValue] = useState<JsonRecord>(() =>
      module === 'staffWork'
        ? { startDate: shiftDay(clubDate(), -7), endDate: shiftDay(clubDate(), 7) }
        : {},
    ),
    [errors, setErrors] = useState<string[]>([]);
  const schema = listFilterSchema(module, horseScoped);
  if (!schema) return null;
  const op: Operation = {
    id: `${module}.filter`,
    module,
    title: 'Bộ lọc',
    method: 'post',
    scope: 'collection',
    contract: 'empty',
    path: getModule(module)!.path,
    roles: [],
    references: {
      employeeId: { path: '/users/work-monitor/options', key: 'employees' },
      actorId: { path: '/audit-logs/options', key: 'actors' },
    },
  };
  const apply = () => {
    const body = asRecord(normalizeInput(schema, value));
    const issues = validateInput(schema, body);
    if (body.startDate && body.endDate) {
      const days =
        (Date.parse(String(body.endDate)) - Date.parse(String(body.startDate))) / 86400000;
      if (days < 0 || (module === 'staffWork' && days > 92))
        issues.push('Khoảng ngày không hợp lệ (giám sát tối đa 93 ngày).');
    }
    if (body.employeeId && body.unassigned) issues.push('Chọn nhân viên hoặc chưa phân công.');
    setErrors(issues);
    if (!issues.length) {
      onApply(body);
      setOpen(false);
    }
  };
  return (
    <Card>
      <Button
        title={open ? 'Đóng bộ lọc' : 'Tìm kiếm và lọc'}
        secondary
        onPress={() => setOpen((old) => !old)}
      />
      {open && (
        <>
          <SchemaField
            operation={op}
            schema={schema}
            path=""
            value={value}
            onChange={(next) => setValue(asRecord(next))}
            payload={value}
            context={{}}
            required
          />
          {errors.map((error) => (
            <Text key={error} style={ui.error}>
              {error}
            </Text>
          ))}
          <Button title="Áp dụng bộ lọc" onPress={apply} />
          <Button
            title="Xóa bộ lọc"
            secondary
            onPress={() => {
              const defaults =
                module === 'staffWork'
                  ? { startDate: shiftDay(clubDate(), -7), endDate: shiftDay(clubDate(), 7) }
                  : {};
              setValue(defaults);
              setErrors([]);
              onApply(defaults);
            }}
          />
        </>
      )}
    </Card>
  );
}
