import { asRecord, entityId, type JsonRecord } from '@/features/operations/types/operation';
function clear(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clear);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        key === 'surfaceLocation' ? null : clear(child),
      ]),
    );
  return value;
}
// Clear every row in one form update, so multiple injury effects cannot restore each other's old points.
export function resetLocationsForHorseChange(previous: unknown, next: JsonRecord): JsonRecord {
  const before = asRecord(previous),
    oldHorse = entityId(before.horseId ?? asRecord(before.record).horseId),
    newHorse = entityId(next.horseId ?? asRecord(next.record).horseId);
  return oldHorse !== newHorse ? asRecord(clear(next)) : next;
}
