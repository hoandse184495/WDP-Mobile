import { InputSchema } from '../types/operation';
const id: InputSchema = { type: 'string', pattern: '^[a-fA-F0-9]{24}$' };
const revision: InputSchema = { type: 'integer', minimum: 0 };
const reason: InputSchema = { type: 'string', minLength: 3, maxLength: 1000 };
const uuid: InputSchema = { type: 'string', format: 'uuid' };
export const extraSchemas: Record<string, InputSchema> = {
  empty: { type: 'object', properties: {} },
  'disposal.create': {
    type: 'object',
    properties: {
      balanceId: id,
      quantity: { type: 'number', exclusiveMinimum: 0, maximum: 1000000 },
      reasonType: { type: 'string', enum: ['expired', 'damaged'] },
      reason,
      requestKey: uuid,
    },
    required: ['balanceId', 'quantity', 'reasonType', 'reason', 'requestKey'],
  },
  'disposal.cancel': { type: 'object', properties: { revision, reason }, required: ['revision'] },
  'disposal.decision': {
    type: 'object',
    properties: {
      revision,
      status: { type: 'string', enum: ['confirmed', 'rejected'] },
      reason,
      handling: { type: 'string', enum: ['dispose', 'return_supplier'] },
    },
    required: ['revision', 'status', 'reason'],
  },
  'handover.preview': {
    type: 'object',
    properties: { groomId: id, reason },
    required: ['groomId', 'reason'],
  },
  'handover.confirm': {
    type: 'object',
    properties: { groomId: id, reason, token: { type: 'string', pattern: '^[a-f0-9]{64}$' } },
    required: ['groomId', 'reason', 'token'],
  },
  'telemetry.start': {
    type: 'object',
    properties: {
      scenario: { type: 'string', enum: ['normal', 'heart_rate', 'speed', 'both'] },
      durationSeconds: { type: 'integer', minimum: 15, maximum: 3600, default: 180 },
    },
    required: ['scenario', 'durationSeconds'],
  },
};
