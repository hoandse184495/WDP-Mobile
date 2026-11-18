import { Text } from 'react-native';
import { Card } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import type { Task } from '../types/task';
export function TaskFeeding({ task }: { task: Task; editable: boolean }) {
  return (
    <Card>
      <Text style={ui.heading}>Khẩu phần bữa ăn</Text>
      {task.feedingSnapshot?.meal.lines.map((line, index) => (
        <Text key={index} style={ui.body}>
          {line.name}: {line.quantity} {line.unit}
        </Text>
      ))}
      <Text style={ui.muted}>
        Ghi nhận tình trạng ăn khi hoàn tất công việc. Không tự động trừ tồn kho.
      </Text>
    </Card>
  );
}
