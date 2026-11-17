import { asRecord, entityId, type JsonRecord } from '@/features/operations/types/operation';
export const stallHealthStates: Record<string, { label: string; fill: string; stroke: string }> = {
  ready: { label: 'Đủ điều kiện', fill: '#ECFDF5', stroke: '#059669' },
  monitoring: { label: 'Cần theo dõi', fill: '#FFFBEB', stroke: '#D97706' },
  injured: { label: 'Chấn thương', fill: '#FFF1F2', stroke: '#E11D48' },
  isolated: { label: 'Cách ly', fill: '#F5F3FF', stroke: '#7C3AED' },
};
export function stableMapCells(record: JsonRecord) {
  const plan = asRecord(record.floorPlan),
    details = asRecord(record._details);
  const stalls = Array.isArray(details.stalls) ? details.stalls.map(asRecord) : [];
  const occupancies = Array.isArray(details.occupancies) ? details.occupancies.map(asRecord) : [];
  const types: Record<string, string> = {
    aisle: 'Lối đi',
    gate: 'Cổng vào / ra',
    yard: 'Sân / khu trống',
    obstacle: 'Tường / vật cản',
  };
  return (Array.isArray(plan.items) ? plan.items.map(asRecord) : []).map((item) => {
    const stall =
      item.type === 'stall'
        ? stalls.find((row) => entityId(row) === entityId(item.stallId))
        : undefined;
    const occupancy = stall
      ? occupancies.find(
          (row) => entityId(row.stallId) === entityId(stall) && row.isActive !== false,
        )
      : undefined;
    const horse = asRecord(occupancy?.horseId);
    const hasHorse = Boolean(entityId(horse) && horse.name);
    const restricted = item.type === 'restricted' || (item.type === 'stall' && !stall);
    let fill = '#F1F5F9',
      stroke = '#94A3B8',
      status = '';
    if (stall) {
      status =
        stall.isActive === false
          ? 'Ngừng sử dụng'
          : stall.maintenance
            ? 'Bảo trì'
            : stall.occupied || hasHorse
              ? 'Có ngựa'
              : 'Trống';
      const health = hasHorse ? stallHealthStates[String(horse.healthStatus)] : undefined;
      if (health) {
        fill = health.fill;
        stroke = health.stroke;
        status = health.label;
      }
      if (horse.isTrainingLocked === true && hasHorse) status += ' · Khóa tập';
      if (stall.maintenance) {
        fill = '#FFF7ED';
        stroke = '#C2410C';
        status = 'Bảo trì';
      }
      if (stall.isActive === false) {
        fill = '#ECEFF2';
        stroke = '#9CA3AF';
        status = 'Ngừng sử dụng';
      }
    }
    return {
      item,
      stall,
      horse: hasHorse ? horse : undefined,
      id: String(item.id ?? ''),
      stallId: stall ? entityId(stall) : '',
      restricted,
      label: restricted
        ? 'Ngoài phạm vi xem'
        : String(stall?.code || item.label || types[String(item.type)] || ''),
      occupant: hasHorse
        ? String(horse.name)
        : stall?.occupied
          ? 'Ngựa ngoài phạm vi'
          : stall
            ? 'Chưa có ngựa'
            : '',
      registrationCode: hasHorse ? String(horse.registrationCode || '') : '',
      status,
      fill,
      stroke,
    };
  });
}
