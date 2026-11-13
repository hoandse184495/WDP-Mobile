import { canManageTrainingPlan } from '@/core/constants/roles';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DateField } from '@/shared/components/date-field';
import { clubDate } from '@/core/utils/date';
import { ui } from '@/core/theme/theme';
import { useSession } from '@/features/auth/stores/session-store';
import { RoleGuard } from '@/shared/components/role-guard';
import { Button, Empty, Failure, Loading, Screen, ScreenHeader } from '@/shared/components/ui';
import { workspaceApi } from '../api/workspace-api';
import { getModule, recordTitle } from '../types/catalog';
import { RecordDetails } from './record-details';
import { IncidentActions } from '@/features/incidents/components/incident-actions';
import { OperationPanel } from '@/features/operations/components/operation-panel';
import { RecordExtras } from './record-extras';
function RecordContent({ module, id }: { module: string; id: string }) {
  const config = getModule(module)!;
  const [page, setPage] = useState(1);
  const [date, setDate] = useState(clubDate);
  const user = useSession((state) => state.user);
  const query = useQuery({
    queryKey: ['record', module, id, page, ...(module === 'stalls' ? [date] : [])],
    queryFn: ({ signal }) => workspaceApi.detail(module, id, signal, page, date),
  });
  return (
    <Screen>
      {module === 'stalls' && (
        <DateField label="Ngày xem công việc ô chuồng" value={date} onChange={setDate} />
      )}
      {query.isPending ? (
        <Loading />
      ) : !query.data ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <ScreenHeader
            title={recordTitle(query.data)}
            eyebrow={config.title.toLocaleUpperCase('vi')}
          />
          <RecordDetails config={config} record={query.data} />
          <RecordExtras module={module} record={query.data} />
          {Number(
            (query.data.linePagination as { totalPages?: number } | undefined)?.totalPages ?? 1,
          ) > 1 && (
            <>
              <Text style={ui.muted}>
                Trang chi tiết {page}/
                {String((query.data.linePagination as { totalPages: number }).totalPages)}
              </Text>
              <Button
                title="Trang trước"
                secondary
                disabled={page === 1}
                onPress={() => setPage((p) => p - 1)}
              />
              <Button
                title="Trang sau"
                secondary
                disabled={
                  page >= Number((query.data.linePagination as { totalPages: number }).totalPages)
                }
                onPress={() => setPage((p) => p + 1)}
              />
            </>
          )}
          <OperationPanel module={module} record={query.data} />
          {module === 'sessions' &&
            user?.role === 'head_trainer' &&
            query.data.status === 'completed' && (
              <Button
                title="Đánh giá buổi tập"
                onPress={() => router.push({ pathname: '/session-review/[id]', params: { id } })}
              />
            )}
          {module === 'incidents' && (
            <IncidentActions record={query.data} refresh={() => void query.refetch()} />
          )}
          {module === 'training' && user && canManageTrainingPlan(user.role) && (
            <Button
              title="Sửa giáo án"
              onPress={() => router.push({ pathname: '/training-editor', params: { id } })}
            />
          )}
          <Button title="Làm mới" secondary onPress={() => void query.refetch()} />
        </>
      )}
    </Screen>
  );
}
export default function RecordScreen() {
  const { module, id } = useLocalSearchParams<{ module: string; id: string }>();
  const config = getModule(module);
  return config?.detailKey ? (
    <RoleGuard roles={config.roles}>
      <RecordContent module={module} id={id} />
    </RoleGuard>
  ) : (
    <Screen>
      <Empty label="Không tìm thấy hồ sơ" />
    </Screen>
  );
}
