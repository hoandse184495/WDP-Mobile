import { Role } from '@/core/constants/roles';
export type JsonRecord = Record<string, unknown>;
export interface InputSchema {
  type?: string | string[];
  properties?: Record<string, InputSchema>;
  required?: string[];
  enum?: (string | number | boolean)[];
  const?: unknown;
  default?: unknown;
  anyOf?: InputSchema[];
  oneOf?: InputSchema[];
  not?: InputSchema;
  items?: InputSchema | boolean;
  prefixItems?: InputSchema[];
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  pattern?: string;
  format?: string;
}
export interface ReferenceSource {
  path: string;
  key: string;
  params?: JsonRecord;
  paged?: boolean;
  dependsOn?: string;
  parameter?: string;
  labelFields?: string[];
}
export interface Operation {
  id: string;
  module: string;
  title: string;
  description?: string;
  method: 'post' | 'put' | 'patch' | 'delete';
  path: string;
  contract: string;
  roles: readonly Role[];
  scope: 'collection' | 'record';
  statuses?: readonly string[];
  initial?: JsonRecord;
  hidden?: string[];
  references?: Record<string, ReferenceSource>;
  omit?: string[];
  recordSelection?: ReferenceSource;
  contextPath?: string;
  contextKey?: string;
  destructive?: boolean;
  confirmation?: string;
  previewPath?: string;
  previewMethod?: 'get' | 'post';
}
export interface SelectOption {
  value: string;
  label: string;
}
export const asRecord = (value: unknown): JsonRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
export const entityId = (value: unknown) =>
  typeof value === 'string' ? value : String(asRecord(value)._id ?? asRecord(value).id ?? '');
export function atPath(value: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (item, key) =>
        Array.isArray(item)
          ? /^(0|[1-9]\d*)$/.test(key)
            ? item[Number(key)]
            : undefined
          : asRecord(item)[key],
      value,
    );
}
