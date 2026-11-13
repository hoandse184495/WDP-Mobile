import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Detail } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { formatDate } from '@/core/utils/date';
import { choiceLabel } from '@/features/operations/contracts/labels';
import type { ClinicalRecord, ClinicalSchedule } from '../types/health-dossier';
const person = (value: { fullName?: string | null } | null | undefined) => value?.fullName || '—';
export function ClinicalRecordCard({ record }: { record: ClinicalRecord }) {
  const [open, setOpen] = useState(false);
  const prescribed = record.prescription?.lines ?? [];
  const names = new Set(
    prescribed.flatMap((line) => [
      String(line.name ?? '')
        .trim()
        .toLowerCase(),
      (String(line.name ?? '') + (line.strength ? ' ' + line.strength : '')).trim().toLowerCase(),
    ]),
  );
  const extras = record.medications.filter(
    (med) => med.name && !names.has(med.name.trim().toLowerCase()),
  );
  return (
    <Card>
      <Text style={ui.heading}>
        {choiceLabel(record.type || 'Khám sức khỏe')} · {formatDate(record.examinationDate)}
      </Text>
      <Detail label="Bác sĩ" value={person(record.veterinarianId)} />
      <Text style={ui.body}>{record.diagnosis || 'Chưa có kết luận'}</Text>
      <Button
        secondary
        title={open ? 'Thu gọn lần khám' : 'Xem lần khám và thuốc'}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Detail label="Triệu chứng" value={record.symptoms.join(', ')} />
          <Detail label="Điều trị" value={record.treatment} />
          <Detail label="Cân nặng (kg)" value={record.weight} />
          <Detail label="Chiều cao (hands)" value={record.height} />
          <Detail label="Nhiệt độ (°C)" value={record.temperature} />
          <Detail label="Nhịp tim / phút" value={record.heartRate} />
          <Detail label="Nhịp thở / phút" value={record.respiratoryRate} />
          <Detail label="Ghi chú" value={record.notes} />
          {record.prescription && (
            <>
              <Badge label={choiceLabel(record.prescription.status)} />
              <Detail label="Người nhận thuốc" value={person(record.prescription.recipient)} />
              {record.prescription.stopReason && (
                <Detail label="Lý do dừng" value={record.prescription.stopReason} />
              )}
              {prescribed.map((line, i) => (
                <View key={line._id || String(i)} style={ui.card}>
                  <Text style={ui.label}>
                    {line.name} {line.strength}
                  </Text>
                  <Detail
                    label="Chỉ định"
                    value={[
                      line.dosage,
                      line.route,
                      line.frequency,
                      line.durationDays == null ? '' : line.durationDays + ' ngày',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                  <Detail
                    label="Lượng kê / đã xuất / còn lại"
                    value={
                      [line.quantity ?? '—', line.supplied ?? '—', line.remaining ?? '—'].join(
                        ' / ',
                      ) +
                      ' ' +
                      (line.unit || '')
                    }
                  />
                  {line.instructions && <Text style={ui.muted}>{line.instructions}</Text>}
                </View>
              ))}
            </>
          )}
          {extras.map((med, i) => (
            <Detail
              key={i}
              label={med.name || 'Thuốc ghi nhận'}
              value={[
                med.dosage,
                med.frequency,
                med.durationDays == null ? '' : med.durationDays + ' ngày',
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
          {record.issues.map((issue) => (
            <View key={issue._id} style={ui.card}>
              <Text style={ui.label}>
                {issue.number} · {formatDate(issue.confirmedAt)}
              </Text>
              <Detail label="Nguồn xuất" value={issue.warehouse?.name} />
              <Detail
                label="Người xuất / nhận"
                value={person(issue.confirmedBy) + ' / ' + person(issue.recipient)}
              />
              {issue.lines.map((line, i) => (
                <Text key={line._id || String(i)} style={ui.body}>
                  {line.name} · {line.quantity ?? '—'} {line.unit} · Lô {line.lotCode || '—'} · HSD{' '}
                  {formatDate(line.expiresOn)}
                </Text>
              ))}
            </View>
          ))}
        </>
      )}
    </Card>
  );
}
export function ClinicalScheduleCard({ schedule }: { schedule: ClinicalSchedule }) {
  const [open, setOpen] = useState(false);
  const entry = schedule.administration;
  return (
    <Card>
      <Text style={ui.heading}>{schedule.title}</Text>
      <Text style={ui.muted}>
        {choiceLabel(schedule.type)} · {formatDate(schedule.dueDate)}
      </Text>
      <Badge label={choiceLabel(schedule.displayStatus || schedule.status)} />
      <Button
        secondary
        title={open ? 'Thu gọn lịch chăm sóc' : 'Xem kết quả chăm sóc'}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Detail label="Bác sĩ" value={person(schedule.veterinarianId)} />
          <Detail label="Kết quả" value={schedule.result} />
          <Detail label="Địa điểm" value={schedule.location} />
          {entry && (
            <>
              <Detail label="Thực hiện ngày" value={formatDate(entry.performedOn)} />
              <Detail label="Thuốc / vaccine" value={entry.productName} />
              <Detail label="Liều" value={entry.dose} />
              <Detail label="Số lô" value={entry.lotNumber} />
              <Detail label="Phản ứng / lưu ý" value={entry.reaction} />
            </>
          )}
          {schedule.nextDueDate && (
            <Detail label="Hẹn tiếp theo" value={formatDate(schedule.nextDueDate)} />
          )}
          {schedule.medicineIssue && (
            <>
              <Detail label="Phiếu xuất thuốc" value={schedule.medicineIssue.number} />
              {schedule.medicineIssue.lines.map((line, i) => (
                <Text key={i} style={ui.body}>
                  {line.name} · {line.quantity ?? '—'} {line.unit} · Lô {line.lotCode}
                </Text>
              ))}
            </>
          )}
          {schedule.cancelReason && <Detail label="Lý do hủy" value={schedule.cancelReason} />}
          {schedule.linkedRecord && <ClinicalRecordCard record={schedule.linkedRecord} />}
        </>
      )}
    </Card>
  );
}
