import { validJournalDay } from '@/features/horses/utils/care-journal';
import { Text } from 'react-native';
import { Card, Choice, Detail, Field } from '@/shared/components/ui';
import { DateField } from '@/shared/components/date-field';
import { clubDate, shiftDay } from '@/core/utils/date';
import { ui } from '@/core/theme/theme';
import { asRecord, type JsonRecord } from '@/features/operations/types/operation';
import { cabinetSchema } from '@/features/inventory/api/medicine-cabinet-api';
export function CareCompletionFields({
  payload,
  context,
  onChange,
}: {
  payload: JsonRecord;
  context: JsonRecord;
  onChange: (next: JsonRecord) => void;
}) {
  const parsed = cabinetSchema.safeParse(context._cabinet);
  if (!parsed.success || !parsed.data.warehouse)
    return (
      <Text style={ui.error}>
        Chưa có tủ thuốc hoạt động hoặc chưa tải được tồn. Tải lại dữ liệu hồ sơ, hoặc liên hệ Thủ
        kho bổ sung tủ thuốc.
      </Text>
    );
  const cabinet = parsed.data,
    administration = asRecord(payload.administration),
    stock = asRecord(payload.stockIssue);
  const selected = cabinet.items.find((item) => item._id === stock.itemId);
  const updateAdmin = (key: string, value: string) =>
    onChange({
      ...payload,
      administration: { ...administration, [key]: value },
      ...(key === 'performedOn'
        ? {
            nextDueDate:
              Number(context.repeatDays) > 0 && validJournalDay(value)
                ? shiftDay(value, Number(context.repeatDays))
                : null,
          }
        : {}),
    });
  return (
    <Card>
      <Text style={ui.heading}>Thuốc và thực hiện chăm sóc</Text>
      <Detail label="Nguồn xuất" value={cabinet.warehouse?.name} />
      <Text style={ui.muted}>
        Tồn được lấy lúc mở hồ sơ. Dùng Tải lại dữ liệu hồ sơ để cập nhật tồn trước khi xác nhận.
      </Text>
      <DateField
        label="Ngày thực hiện thực tế"
        value={String(administration.performedOn ?? clubDate())}
        onChange={(value) => updateAdmin('performedOn', value)}
      />
      <Choice
        label={
          context.type === 'vaccination' ? 'Vaccine từ tủ thuốc' : 'Thuốc tẩy giun từ tủ thuốc'
        }
        value={String(stock.itemId ?? '')}
        options={cabinet.items.map((item) => ({
          value: item._id,
          label: item.name + ' · ' + item.strength + ' · Còn ' + item.available + ' ' + item.unit,
        }))}
        onChange={(value) => {
          const item = cabinet.items.find((candidate) => candidate._id === value);
          onChange({
            ...payload,
            stockIssue: { ...stock, itemId: value, quantity: undefined },
            administration: { ...administration, productName: item?.name || '', lotNumber: '' },
          });
        }}
      />
      <Field
        label={'Lượng thực tế xuất' + (selected ? ' (' + selected.unit + ')' : '')}
        keyboardType="decimal-pad"
        value={stock.quantity == null ? '' : String(stock.quantity)}
        onChangeText={(quantity) => onChange({ ...payload, stockIssue: { ...stock, quantity } })}
      />
      {selected && (
        <Text style={ui.muted}>
          {selected.available
            ? 'Lô xuất được hệ thống chọn theo hạn gần nhất.'
            : 'Tủ đang thiếu thuốc này. Liên hệ Thủ kho bổ sung.'}
        </Text>
      )}
      <Field
        label="Liều thực tế (kèm đơn vị)"
        value={String(administration.dose ?? '')}
        onChangeText={(value) => updateAdmin('dose', value)}
        maxLength={200}
      />
      <Field
        label="Phản ứng / lưu ý sau thực hiện"
        multiline
        value={String(administration.reaction ?? '')}
        onChangeText={(value) => updateAdmin('reaction', value)}
        maxLength={1000}
      />
      <DateField
        label="Ngày hẹn tiếp theo (để trống nếu không đặt)"
        value={payload.nextDueDate ? String(payload.nextDueDate) : undefined}
        onChange={(nextDueDate) => onChange({ ...payload, nextDueDate })}
      />
      <Choice
        label="Đặt lịch tiếp theo"
        value={payload.nextDueDate ? 'yes' : 'no'}
        options={[
          { value: 'no', label: 'Không đặt thêm' },
          { value: 'yes', label: 'Có ngày hẹn' },
        ]}
        onChange={(value) =>
          onChange({
            ...payload,
            nextDueDate:
              value === 'yes'
                ? shiftDay(clubDate(), Math.max(1, Number(context.repeatDays) || 1))
                : null,
          })
        }
      />
      <Text style={ui.muted}>
        Lưu hoàn tất sẽ xuất thuốc, ghi nhận thực hiện và tạo lịch tiếp theo nếu đã chọn ngày hẹn.
      </Text>
    </Card>
  );
}
