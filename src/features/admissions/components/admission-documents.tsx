import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { Button, Card, Choice, Empty, Failure } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { useSession } from '@/features/auth/stores/session-store';
import { uploadAdmissionDocument, openPrivateDocument } from '@/core/network/private-files';
import { asRecord, JsonRecord, entityId } from '@/features/operations/types/operation';
const kinds = [
  ['horse_photo', 'Ảnh ngựa'],
  ['registration', 'Giấy đăng ký'],
  ['pedigree', 'Giấy phả hệ'],
  ['vaccination', 'Tiêm phòng'],
  ['deworming', 'Tẩy giun'],
  ['health_certificate', 'Giấy sức khỏe'],
  ['previous_medical', 'Bệnh án trước đây'],
  ['previous_injury', 'Lịch sử chấn thương'],
];
export function AdmissionDocuments({ record }: { record: JsonRecord }) {
  const user = useSession((state) => state.user)!;
  const client = useQueryClient();
  const [kind, setKind] = useState('horse_photo');
  const details = asRecord(record._details),
    files = Array.isArray(details.attachments) ? details.attachments.map(asRecord) : [];
  const upload = useMutation({
    mutationFn: () => uploadAdmissionDocument(entityId(record), kind),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['record', 'admissions', entityId(record)] }),
  });
  const open = useMutation({
    mutationFn: (file: JsonRecord) =>
      openPrivateDocument(entityId(record), entityId(file), String(file.fileName ?? 'document')),
  });
  return (
    <Card>
      <Text style={ui.heading}>Tài liệu tiếp nhận</Text>
      <Text style={ui.muted}>
        Ảnh ngựa, đăng ký, phả hệ và tiêm phòng là các tài liệu bắt buộc khi gửi hồ sơ.
      </Text>
      {files.length ? (
        files.map((file) => (
          <View key={entityId(file)} style={{ gap: 6 }}>
            <Text style={ui.body}>{String(file.fileName)}</Text>
            <Text style={ui.muted}>
              {kinds.find((row) => row[0] === file.kind)?.[1] ?? String(file.kind)}
            </Text>
            <Button
              title="Mở / chia sẻ tài liệu"
              secondary
              busy={open.isPending}
              onPress={() => open.mutate(file)}
            />
          </View>
        ))
      ) : (
        <Empty label="Chưa có tài liệu" />
      )}
      {user.role === 'horse_owner' &&
        ['draft', 'needs_documents'].includes(String(record.status)) && (
          <>
            <Choice
              label="Loại tài liệu"
              value={kind}
              onChange={setKind}
              options={kinds.map(([value, label]) => ({ value, label }))}
            />
            <Button
              title="Chọn và tải lên tài liệu"
              busy={upload.isPending}
              onPress={() => upload.mutate()}
            />
          </>
        )}
      {(upload.error || open.error) && <Failure error={upload.error ?? open.error} />}
    </Card>
  );
}
