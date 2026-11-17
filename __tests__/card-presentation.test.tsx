import { render, screen, cleanup } from '@testing-library/react-native';
import { RecordSummary } from '@/features/workspace/components/record-summary';
import { Card, Detail } from '@/shared/components/ui';
import { getModule } from '@/features/workspace/types/catalog';
afterEach(cleanup);
test('summary displays populated horse names, status, and zero version without dumping objects', async () => {
  await render(
    <RecordSummary
      config={getModule('rations')!}
      record={{ horseId: { _id: 'h1', name: 'Hồng Phong' }, status: 'pending_review', version: 0 }}
    />,
  );
  expect(screen.getByText('Hồng Phong')).toBeTruthy();
  expect(screen.getByText('Chờ bác sĩ duyệt')).toBeTruthy();
  expect(screen.getByText('0')).toBeTruthy();
  expect(screen.queryByText('[object Object]')).toBeNull();
});
test('detail keeps zero and long values readable and nested cards retain all data', async () => {
  await render(
    <Card>
      <Detail label="Số lượng" value={0} />
      <Card>
        <Detail
          label="Nội dung"
          value="Ghi nhận chăm sóc trong ngày cho ngựa được phân công, theo lịch của câu lạc bộ."
        />
      </Card>
    </Card>,
  );
  expect(screen.getByText('0')).toBeTruthy();
  expect(screen.getByText(/Ghi nhận chăm sóc trong ngày/)).toBeTruthy();
});
