import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/stores/session-store';
import { ui } from '@/core/theme/theme';
import { formatDate } from '@/core/utils/date';
import { RoleGuard } from '@/shared/components/role-guard';
import { Screen, ScreenHeader, Card, Field, Detail, Button } from '@/shared/components/ui';
import { PagedList } from '@/shared/components/paged-list';
import { normalizeSearch } from '@/features/operations/hooks/use-reference-options';
import { cabinetApi, cabinetRoles } from '../api/medicine-cabinet-api';
function Cabinet() {
  const user = useSession((s) => s.user)!;
  const [search, setSearch] = useState(''),
    [expanded, setExpanded] = useState('');
  const query = useQuery({
    queryKey: ['medicine-cabinet', user._id, user.role],
    queryFn: ({ signal }) => cabinetApi.get(signal),
    retry: false,
  });
  const data = query.error ? undefined : query.data;
  const needle = normalizeSearch(search);
  const items = (data?.items ?? []).filter((item) =>
    normalizeSearch(item.name + ' ' + item.code).includes(needle),
  );
  return (
    <Screen scroll={false}>
      <PagedList
        items={items}
        getId={(item) => item._id}
        pending={query.isPending}
        error={query.error}
        refreshing={query.isFetching}
        refresh={() => void query.refetch()}
        loadingMore={false}
        loadMore={() => {}}
        header={
          <View style={{ gap: 12, marginBottom: 16 }}>
            <ScreenHeader
              title="Tủ thuốc thú y"
              subtitle={data?.warehouse?.name || 'Thuốc còn hạn và có thể xuất từ tủ'}
            />
            {data && !data.warehouse && (
              <Text style={ui.error}>
                Chưa có tủ thuốc hoạt động. Thủ kho cần tạo tủ và chuyển thuốc vào tủ.
              </Text>
            )}
            <Field label="Tìm thuốc" value={search} onChangeText={setSearch} />
          </View>
        }
        renderItem={(item) => (
          <Card>
            <Text style={ui.heading}>{item.name}</Text>
            <Text style={ui.muted}>
              {item.code} · {item.strength} · {item.dosageForm}
            </Text>
            <Detail label="Tồn có thể xuất" value={item.available + ' ' + item.unit} />
            <Button
              secondary
              title={expanded === item._id ? 'Ẩn lô thuốc' : 'Xem các lô còn hạn'}
              onPress={() => setExpanded(expanded === item._id ? '' : item._id)}
            />
            {expanded === item._id &&
              (item.lots.length ? (
                item.lots.map((lot, i) => (
                  <Text key={i} style={ui.body}>
                    {lot.code} · HSD {formatDate(lot.expiresOn)} · {lot.quantity} {item.unit}
                  </Text>
                ))
              ) : (
                <Text style={ui.muted}>Chưa có lô đủ điều kiện xuất.</Text>
              ))}
          </Card>
        )}
      />
    </Screen>
  );
}
export default function MedicineCabinetScreen() {
  return (
    <RoleGuard roles={cabinetRoles}>
      <Cabinet />
    </RoleGuard>
  );
}
