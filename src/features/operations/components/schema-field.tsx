import { resetLocationsForHorseChange } from '@/features/medical/model/reset-surface-locations';
import { SurfaceLocationField } from '@/features/medical/components/surface-location-field';
import { Text, View } from 'react-native';
import { Button, Card, Choice, Field } from '@/shared/components/ui';
import { DateField } from '@/shared/components/date-field';
import { ui } from '@/core/theme/theme';
import { InputSchema, JsonRecord, Operation, asRecord, entityId } from '../types/operation';
import { branchFor, initialValue, itemRule } from '../contracts/schema';
import { choiceLabel, fieldLabel } from '../contracts/labels';
import { ReferenceField } from './reference-field';
interface Props {
  schema: InputSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  path: string;
  required?: boolean;
  operation: Operation;
  payload: JsonRecord;
  context: JsonRecord;
  id?: string;
}
const metadata = new Set([
  'revision',
  'requestKey',
  'trainingPlanRevision',
  'expectedVersion',
  'modelId',
  'modelVersion',
  'layer',
]);
export function SchemaField(props: Props) {
  const { schema, value, onChange, path, required = false, operation } = props;
  const key = path.split('.').at(-1) ?? '';
  if (schema.not !== undefined || metadata.has(key) || operation.hidden?.includes(key)) return null;
  if (operation.module === 'rations' && key === 'key' && path.startsWith('meals.')) return null;
  if (
    operation.module === 'warehouses' &&
    (key === 'stableId' ||
      (key === 'assignedGroomIds' && props.payload.type === 'medicine_cabinet') ||
      (key === 'responsibleVetId' && props.payload.type !== 'medicine_cabinet'))
  )
    return null;
  if (key === 'assignedGroomIds') return <ReferenceField {...props} />;
  if (key === 'surfaceLocation') {
    const horseId = entityId(
      props.payload.horseId ??
        asRecord(props.payload.record).horseId ??
        props.context.horseId ??
        asRecord(props.context.schedule).horseId,
    );
    return <SurfaceLocationField value={value} onChange={onChange} horseId={horseId} />;
  }
  const label = `${/^\d+$/.test(key) ? `Chi tiết dòng ${Number(key) + 1}` : fieldLabel(key)}${required ? ' *' : ''}`;
  if (schema.oneOf) {
    const selected = schema.oneOf.findIndex((branch) =>
      Object.entries(branch.properties ?? {}).some(
        ([name, rule]) => rule.const !== undefined && asRecord(value)[name] === rule.const,
      ),
    );
    return (
      <View style={{ gap: 10 }}>
        {!required && value !== undefined && (
          <Button
            title={`Bỏ ${fieldLabel(key).toLowerCase()}`}
            secondary
            onPress={() => onChange(undefined)}
          />
        )}
        <Choice
          label={label}
          value={selected < 0 ? undefined : String(selected)}
          onChange={(index) => onChange(initialValue(schema.oneOf![Number(index)]))}
          options={schema.oneOf.map((branch, i) => ({
            value: String(i),
            label: choiceLabel(
              String(
                Object.values(branch.properties ?? {}).find((rule) => rule.const !== undefined)
                  ?.const ?? `Lựa chọn ${i + 1}`,
              ),
            ),
          }))}
        />
        {selected >= 0 && <SchemaField {...props} schema={schema.oneOf[selected]} />}
      </View>
    );
  }
  const rule = branchFor(schema, value);
  const nullable = schema.anyOf?.some((branch) => branch.type === 'null');
  if ((!required || nullable) && value == null)
    return (
      <Button
        secondary
        title={`Thêm ${fieldLabel(key).toLowerCase()}`}
        onPress={() => onChange(initialValue(rule, undefined, true, key) ?? '')}
      />
    );
  const remove =
    (!required || nullable) && value !== undefined ? (
      <Button
        secondary
        title={`Bỏ ${fieldLabel(key).toLowerCase()}`}
        onPress={() => onChange(nullable && required ? null : undefined)}
      />
    ) : null;
  if (rule.type === 'object')
    return (
      <Card>
        {path && <Text style={ui.heading}>{label}</Text>}
        {Object.entries(rule.properties ?? {}).map(([child, childRule]) => (
          <SchemaField
            {...props}
            key={child}
            schema={childRule}
            path={path ? `${path}.${child}` : child}
            required={rule.required?.includes(child)}
            value={asRecord(value)[child]}
            onChange={(next) => {
              const updated = { ...asRecord(value), [child]: next };
              if (
                (child === 'id' || child === 'trainingPlanId' || child === 'trainingExerciseKey') &&
                next &&
                typeof next === 'object'
              ) {
                const selected = asRecord(next);
                updated[child] = selected._id;
                if (child === 'trainingExerciseKey')
                  updated.trainingPlanRevision = selected.planRevision ?? 0;
                if (child === 'trainingPlanId') {
                  updated.trainingPlanRevision = selected.revision ?? 0;
                  updated.trainingExerciseKey = undefined;
                }
                if (rule.properties?.expectedVersion) updated.expectedVersion = selected.__v ?? 0;
                if (child === 'id' && rule.properties?.revision)
                  updated.revision = selected.revision ?? 0;
              }
              if (operation.module === 'warehouses' && child === 'type') {
                delete updated.stableId;
                if (next === 'medicine_cabinet') updated.assignedGroomIds = [];
                else updated.responsibleVetId = null;
              }
              if (
                operation.module === 'transfers' &&
                ['sourceWarehouseId', 'destinationWarehouseId'].includes(child)
              ) {
                updated.lines = [{ balanceId: undefined, quantity: undefined }];
                if (child === 'sourceWarehouseId' && next === updated.destinationWarehouseId)
                  updated.destinationWarehouseId = undefined;
              }
              if (operation.id === 'replenishments.create' && child === 'warehouseId')
                updated.itemId = undefined;
              onChange(resetLocationsForHorseChange(value, updated));
            }}
          />
        ))}
        {remove}
      </Card>
    );
  if (rule.type === 'array') {
    const rows = Array.isArray(value) ? value : [];
    return (
      <Card>
        <Text style={ui.heading}>{label}</Text>
        {rows.map((row, i) => (
          <View style={{ gap: 10 }} key={i}>
            <Text style={ui.label}>Dòng {i + 1}</Text>
            <SchemaField
              {...props}
              schema={itemRule(rule, i)}
              path={`${path}.${i}`}
              required
              value={row}
              onChange={(next) => onChange(rows.map((old, j) => (i === j ? next : old)))}
            />
            {!rule.prefixItems && (
              <Button
                title="Bỏ dòng"
                danger
                onPress={() => onChange(rows.filter((_, j) => i !== j))}
              />
            )}
          </View>
        ))}
        {!rule.prefixItems && rows.length < (rule.maxItems ?? 100) && (
          <Button
            title={`Thêm dòng ${fieldLabel(key).toLowerCase()}`}
            secondary
            onPress={() => onChange([...rows, initialValue(itemRule(rule, rows.length))])}
          />
        )}
        {remove}
      </Card>
    );
  }
  if (rule.type === 'boolean')
    return (
      <View style={{ gap: 8 }}>
        <Choice
          label={label}
          value={value === true ? 'yes' : value === false ? 'no' : undefined}
          options={[
            { value: 'no', label: 'Chưa / Không' },
            { value: 'yes', label: 'Có / Xác nhận' },
          ]}
          onChange={(next) => onChange(next === 'yes')}
        />
        {remove}
      </View>
    );
  if (rule.const !== undefined) return null;
  if (rule.enum)
    return (
      <View style={{ gap: 8 }}>
        <Choice
          label={label}
          value={value === undefined ? undefined : String(value)}
          onChange={(next) => onChange(rule.enum!.find((item) => String(item) === next))}
          options={rule.enum.map((item) => ({
            value: String(item),
            label: choiceLabel(String(item)),
          }))}
        />
        {remove}
      </View>
    );
  if (
    rule.pattern?.includes('{24}') ||
    (['trainingExerciseKey', 'rationMealKey'].includes(key) && operation.module === 'tasks') ||
    ['lineId', 'ownerId', 'horseId', 'groomId', 'itemId', 'warehouseId', 'balanceId'].includes(key)
  )
    return (
      <View style={{ gap: 8 }}>
        <ReferenceField {...props} />
        {remove}
      </View>
    );
  const dateKind =
    rule.format === 'date-time'
      ? 'date-time'
      : rule.pattern?.includes('d{4}') && rule.pattern.includes('d{2}')
        ? 'date'
        : key === 'time' || key === 'startTime' || key === 'endTime'
          ? 'time'
          : undefined;
  if (dateKind)
    return (
      <View style={{ gap: 8 }}>
        <DateField
          label={label}
          kind={dateKind}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
        />
        {remove}
      </View>
    );
  return (
    <View style={{ gap: 8 }}>
      <Field
        label={label}
        value={value === undefined || value === null ? '' : String(value)}
        onChangeText={onChange}
        keyboardType={
          rule.type === 'number' || rule.type === 'integer'
            ? 'decimal-pad'
            : key === 'email'
              ? 'email-address'
              : 'default'
        }
        secureTextEntry={key.toLowerCase().includes('password')}
        autoCapitalize={
          key === 'email' || key.toLowerCase().includes('password') ? 'none' : 'sentences'
        }
        autoCorrect={!key.toLowerCase().includes('password')}
        multiline={[
          'description',
          'instructions',
          'notes',
          'note',
          'reason',
          'diagnosis',
          'treatment',
          'treatmentPlan',
          'resolvedNotes',
          'objective',
          'trainerNotes',
          'groomNotes',
        ].includes(key)}
        maxLength={rule.maxLength}
      />
      {remove}
    </View>
  );
}
