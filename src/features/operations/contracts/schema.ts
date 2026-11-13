import * as Crypto from 'expo-crypto';
import generated from './generated-schemas.json';
import { InputSchema, JsonRecord, asRecord } from '../types/operation';
import { fieldLabel } from './labels';
import { extraSchemas } from './extra-schemas';
export const contracts: Record<string, InputSchema> = {
  ...(generated as unknown as Record<string, InputSchema>),
  ...extraSchemas,
};
export function schemaFor(name: string): InputSchema {
  const schema = contracts[name];
  if (!schema) throw new Error(`Thiếu hợp đồng mobile: ${name}`);
  return schema;
}
export function branchFor(schema: InputSchema, value: unknown): InputSchema {
  const variants = schema.oneOf ?? schema.anyOf;
  if (!variants) return schema;
  const object = asRecord(value);
  return (
    variants.find((branch) =>
      Object.entries(branch.properties ?? {}).some(
        ([key, rule]) => rule.const !== undefined && object[key] === rule.const,
      ),
    ) ??
    variants.find((branch) => branch.type !== 'null') ??
    schema
  );
}
export function initialValue(
  schema: InputSchema,
  existing?: unknown,
  required = true,
  key = '',
): unknown {
  if (schema.not !== undefined) return undefined;
  if (schema.oneOf) return existing ?? undefined;
  const rule = branchFor(schema, existing);
  if (existing !== undefined) {
    if (rule.type === 'string' && existing !== null && typeof existing === 'object')
      return asRecord(existing)._id;
    if (rule.type === 'object') return initialObject(rule, asRecord(existing));
    if (rule.type === 'array' && Array.isArray(existing))
      return existing.map((row, i) => initialValue(itemRule(rule, i), row));
    return existing;
  }
  if (schema.default !== undefined) return schema.default;
  if (key === 'key' && rule.pattern?.includes('{0,29}'))
    return 'meal_' + Crypto.randomUUID().slice(0, 8);
  if (!required) return undefined;
  if (rule.const !== undefined) return rule.const === true ? false : rule.const;
  if (rule.type === 'object') return initialObject(rule, {});
  if (rule.type === 'array')
    return rule.prefixItems ? rule.prefixItems.map((item) => initialValue(item)) : [];
  if (rule.type === 'boolean') return false;
  if (rule.type === 'integer' && ['revision', 'expectedVersion'].includes(key)) return 0;
  if (rule.format === 'date-time') return new Date().toISOString();
  return undefined;
}
export function initialObject(schema: InputSchema, existing: JsonRecord): JsonRecord {
  return Object.fromEntries(
    Object.entries(schema.properties ?? {})
      .filter(([, rule]) => rule.not === undefined)
      .map(([key, rule]) => [
        key,
        initialValue(rule, existing[key], schema.required?.includes(key), key),
      ]),
  );
}
export function itemRule(schema: InputSchema, index: number): InputSchema {
  return schema.prefixItems?.[index] ?? (typeof schema.items === 'object' ? schema.items : {});
}
export function normalizeInput(schema: InputSchema, value: unknown): unknown {
  const rule = branchFor(schema, value);
  if (value === undefined || value === null) return value;
  if (rule.type === 'object')
    return Object.fromEntries(
      Object.entries(rule.properties ?? {})
        .filter(([key, child]) => child.not === undefined && asRecord(value)[key] !== undefined)
        .map(([key, child]) => [key, normalizeInput(child, asRecord(value)[key])]),
    );
  if (rule.type === 'array' && Array.isArray(value))
    return value.map((item, i) => normalizeInput(itemRule(rule, i), item));
  if ((rule.type === 'number' || rule.type === 'integer') && typeof value === 'string')
    return value.trim() ? Number(value) : undefined;
  return value;
}
export function validateInput(schema: InputSchema, value: unknown, path = ''): string[] {
  if (value === undefined)
    return [`${fieldLabel(path.split('.').at(-1) ?? path)}: cần nhập thông tin.`];
  if (schema.anyOf || schema.oneOf) {
    const branches = schema.oneOf ?? schema.anyOf ?? [];
    if (branches.some((branch) => validateInput(branch, value, path).length === 0)) return [];
    return validateInput(branchFor(schema, value), value, path);
  }
  const label = fieldLabel(path.split('.').at(-1) ?? path);
  const error = (message: string) => [`${label}: ${message}`];
  if (schema.type === 'null') return value === null ? [] : error('giá trị không hợp lệ.');
  if (value === null) return error('cần nhập thông tin.');
  if (schema.const !== undefined && value !== schema.const)
    return error(
      schema.const === true ? 'cần xác nhận đã kiểm tra thực tế.' : 'lựa chọn không hợp lệ.',
    );
  if (schema.enum && !schema.enum.includes(value as string)) return error('hãy chọn một giá trị.');
  if (schema.type === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) return error('thông tin chưa hợp lệ.');
    const object = asRecord(value);
    return Object.entries(schema.properties ?? {}).flatMap(([key, child]) =>
      child.not !== undefined || (object[key] === undefined && !schema.required?.includes(key))
        ? []
        : validateInput(child, object[key], path ? `${path}.${key}` : key),
    );
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return error('cần nhập danh sách.');
    if (value.length < (schema.minItems ?? 0)) return error(`cần ít nhất ${schema.minItems} dòng.`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      return error(`tối đa ${schema.maxItems} dòng.`);
    return value.flatMap((item, i) => validateInput(itemRule(schema, i), item, `${path}.${i + 1}`));
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      (schema.type === 'integer' && !Number.isInteger(value))
    )
      return error('cần nhập số hợp lệ.');
    if (
      (schema.minimum !== undefined && value < schema.minimum) ||
      (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) ||
      (schema.maximum !== undefined && value > schema.maximum) ||
      (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum)
    )
      return error('nằm ngoài giới hạn cho phép.');
  }
  if (schema.type === 'boolean' && typeof value !== 'boolean')
    return error('cần chọn Có hoặc Không.');
  if (schema.type === 'string') {
    if (typeof value !== 'string') return error('cần nhập thông tin.');
    if (value.length < (schema.minLength ?? 0))
      return error(`cần ít nhất ${schema.minLength} ký tự.`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      return error(`tối đa ${schema.maxLength} ký tự.`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value))
      return error('định dạng chưa hợp lệ.');
    if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return error('email không hợp lệ.');
    if (schema.format === 'date-time' && !Number.isFinite(Date.parse(value)))
      return error('ngày giờ không hợp lệ.');
  }
  return [];
}
