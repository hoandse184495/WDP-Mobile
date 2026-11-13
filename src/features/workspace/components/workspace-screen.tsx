import { ClinicalHoldQueue } from '@/features/horses/components/clinical-hold-queue';
import { AuditChanges } from '@/features/audit/components/audit-changes';
import { canManageTrainingPlan } from '@/core/constants/roles';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, ui } from '@/core/theme/theme';
import { PagedList } from '@/shared/components/paged-list';
import { RoleGuard } from '@/shared/components/role-guard';
import { Badge, Button, Empty, Screen, ScreenHeader } from '@/shared/components/ui';
import { Icon, moduleIcons } from '@/shared/components/icon';
import { useSession } from '@/features/auth/stores/session-store';
import { getModule, recordId, recordTitle, WorkspaceRecord } from '../types/catalog';
import { useWorkspace } from '../hooks/use-workspace';
import { RecordDetails } from './record-details';
import { WorkspaceFilters } from './workspace-filters';
import { OperationPanel } from '@/features/operations/components/operation-panel';
import { ResponseSummary } from '@/features/operations/components/response-summary';
function WorkspaceList({ module, horseId }: { module: string; horseId?: string }) {
  const config = getModule(module)!;
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const query = useWorkspace(module, horseId, filters);
  const [expanded, setExpanded] = useState<string | null>(null);
  const user = useSession((state) => state.user);
  const open = (row: WorkspaceRecord) => {
    if (module === 'warehouses') {
      router.push({
        pathname: '/stock/[id]',
        params: { id: recordId(row), name: recordTitle(row) },
      });
      return;
    }
    if (config.detailKey) {
      router.push({ pathname: '/records/[module]/[id]', params: { module, id: recordId(row) } });
      return;
    }
    setExpanded(expanded === recordId(row) ? null : recordId(row));
  };
  return (
    <Screen scroll={false}>
      <PagedList
        items={query.data?.pages.flatMap((p) => p.items) ?? []}
        getId={(record) =>
          module === 'staffWork' ? `${String(record.kind)}-${recordId(record)}` : recordId(record)
        }
        pending={query.isPending}
        error={query.error}
        refreshing={query.isRefetching}
        refresh={() => void query.refetch()}
        more={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        loadMore={() => void query.fetchNextPage()}
        header={
          <View style={{ gap: 12, marginBottom: 18 }}>
            <ScreenHeader
              title={config.title}
              subtitle={config.description}
              eyebrow="KHÔNG GIAN LÀM VIỆC"
              action={
                <View style={ui.iconTile}>
                  <Icon name={moduleIcons[module] ?? 'file'} color={colors.primary} />
                </View>
              }
            />
            {query.data && (
              <Badge label={`${query.data.pages[0].pagination.total} hồ sơ phù hợp`} />
            )}
            {module === 'staffWork' && query.data?.pages[0].summary !== undefined && (
              <ResponseSummary data={query.data.pages[0].summary} />
            )}
            <OperationPanel module={module} collection />
            {module === 'medical' && <ClinicalHoldQueue />}
            <WorkspaceFilters module={module} horseScoped={Boolean(horseId)} onApply={setFilters} />
            {module === 'training' && (
              <Button
                secondary
                title="Xem kết quả buổi tập"
                onPress={() =>
                  router.push({
                    pathname: '/workspace/[module]',
                    params: { module: 'sessions', ...(horseId ? { horseId } : {}) },
                  })
                }
              />
            )}
            {module === 'training' && user && canManageTrainingPlan(user.role) && (
              <Button title="Tạo giáo án" onPress={() => router.push('/training-editor')} />
            )}
            {module === 'medical' && user && getModule('injuries')?.roles.includes(user.role) && (
              <Button
                secondary
                title="Theo dõi chấn thương"
                onPress={() => router.push('/workspace/injuries')}
              />
            )}
            {module === 'stables' && (
              <Button
                secondary
                title="Xem ô chuồng"
                onPress={() => router.push('/workspace/stalls')}
              />
            )}
            {module === 'incidents' && user?.role === 'groom' && (
              <Button title="Báo cáo sự cố mới" onPress={() => router.push('/incident-editor')} />
            )}
          </View>
        }
        renderItem={(record) => (
          <View style={ui.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mở ${recordTitle(record)}`}
              onPress={() => open(record)}
              style={{ gap: 10 }}
            >
              <View style={ui.between}>
                <Text style={ui.heading}>{recordTitle(record)}</Text>
                <Icon name="chevron" color={colors.muted} size={16} />
              </View>
              <RecordDetails
                config={config}
                record={record}
                compact={expanded !== recordId(record)}
              />
            </Pressable>
            {module === 'audit' && expanded === recordId(record) && (
              <AuditChanges metadata={record.metadata} />
            )}
            {!config.detailKey && <OperationPanel module={module} record={record} />}
            {module === 'sessions' &&
              user?.role === 'head_trainer' &&
              record.status === 'completed' && (
                <Button
                  secondary
                  title="Đánh giá buổi tập"
                  onPress={() =>
                    router.push({
                      pathname: '/session-review/[id]',
                      params: { id: recordId(record) },
                    })
                  }
                />
              )}
            {!config.detailKey && (
              <Button
                secondary
                title={
                  module === 'warehouses'
                    ? 'Xem tồn kho'
                    : expanded === recordId(record)
                      ? 'Thu gọn'
                      : 'Xem thêm'
                }
                onPress={() => open(record)}
              />
            )}
          </View>
        )}
      />
    </Screen>
  );
}
export default function WorkspaceScreen() {
  const { module, horseId } = useLocalSearchParams<{ module: string; horseId?: string }>();
  const config = getModule(module);
  if (!config)
    return (
      <Screen>
        <Empty label="Không tìm thấy chức năng" />
      </Screen>
    );
  return (
    <RoleGuard roles={config.roles}>
      <WorkspaceList module={module} horseId={horseId} />
    </RoleGuard>
  );
}
