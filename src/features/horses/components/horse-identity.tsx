import { Text } from 'react-native';
import { Card, Detail } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import type { Horse } from '../types/horse';
const labels = {
  microchipNumber: 'Mã microchip',
  passportNumber: 'Số hộ chiếu',
  registryName: 'Đơn vị đăng ký',
  birthCountry: 'Quốc gia sinh',
  markings: 'Đặc điểm nhận dạng',
} as const;
export function HorseIdentity({ horse }: { horse: Horse }) {
  return (
    <Card>
      <Text style={ui.heading}>Nhận dạng & đăng ký</Text>
      {Object.entries(labels).map(([key, label]) => (
        <Detail
          key={key}
          label={label}
          value={horse.identity?.[key as keyof typeof labels] || 'Chưa bổ sung'}
        />
      ))}
    </Card>
  );
}
