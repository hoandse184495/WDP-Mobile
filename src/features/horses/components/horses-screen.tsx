import { useQueryClient } from '@tanstack/react-query';
import { HorseThumbnail } from './horse-thumbnail';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, ui } from '@/core/theme/theme';
import { Badge, Button, Field, Screen, ScreenHeader } from '@/shared/components/ui';
import { Icon } from '@/shared/components/icon';
import { PagedList } from '@/shared/components/paged-list';
import { useSession } from '@/features/auth/stores/session-store';
import { useHorses } from '../hooks/use-horses';
import { RoleGuard } from '@/shared/components/role-guard';
import { horseRoles } from '@/core/constants/roles';
import { healthLabels } from '../types/horse';

function HorseList() {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);
  const query = useHorses(search);
  const client = useQueryClient();
  const user = useSession((state) => state.user);
  return (
    <Screen scroll={false}>
      <PagedList
        items={query.data?.pages.flatMap((page) => page.items) ?? []}
        getId={(horse) => horse._id}
        pending={query.isPending}
        error={query.error}
        refreshing={query.isRefetching}
        refresh={() => {
          void query.refetch();
          void client.invalidateQueries({ queryKey: ['horse-avatar'] });
        }}
        more={query.hasNextPage}
        loadingMore={query.isFetchingNextPage}
        loadMore={() => void query.fetchNextPage()}
        emptyLabel="Không tìm thấy ngựa"
        header={
          <View style={{ gap: 14, marginBottom: 18 }}>
            <ScreenHeader
              title={user?.role === 'horse_owner' ? 'Ngựa của tôi' : 'Đàn ngựa'}
              eyebrow="HỒ SƠ CHIẾN MÃ"
              subtitle="Sức khỏe và hành trình của từng chiến mã."
              action={
                query.data ? (
                  <Badge label={`${query.data.pages[0].pagination.total} ngựa`} />
                ) : undefined
              }
            />
            <Field
              label="Tìm kiếm"
              icon="search"
              placeholder="Tên hoặc mã đăng ký"
              value={text}
              onChangeText={setText}
              maxLength={100}
            />
            {user?.role === 'club_manager' && (
              <Button
                title="Thêm hồ sơ ngựa"
                icon="plus"
                onPress={() => router.push('/horse-editor')}
              />
            )}
          </View>
        }
        renderItem={(horse) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem ${horse.name}`}
            style={({ pressed }) => [ui.card, { gap: 12, opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push({ pathname: '/horses/[id]', params: { id: horse._id } })}
          >
            <View style={ui.row}>
              <HorseThumbnail horse={horse} />
              <View style={[ui.grow, { gap: 4 }]}>
                <Text style={[ui.heading, { fontSize: 16 }]}>{horse.name}</Text>
                <Text style={[ui.muted, { fontSize: 11 }]}>
                  {horse.registrationCode} · {horse.breed}
                </Text>
              </View>
              <Icon name="chevron" size={17} color={colors.muted} />
            </View>
            <View style={ui.between}>
              <Badge
                label={healthLabels[horse.healthStatus]}
                danger={horse.healthStatus === 'injured' || horse.isTrainingLocked}
              />
              <Text style={[ui.muted, { fontSize: 11 }]}>
                Thể lực{' '}
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {horse.fitnessScore}/100
                </Text>
              </Text>
            </View>
            <View style={{ height: 3, backgroundColor: colors.primarySoft, borderRadius: 2 }}>
              <View
                style={{
                  height: 3,
                  backgroundColor: horse.isTrainingLocked ? colors.gold : colors.primary,
                  borderRadius: 2,
                  width: `${Math.max(0, Math.min(100, horse.fitnessScore))}%`,
                }}
              />
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}
export default function HorsesScreen() {
  return (
    <RoleGuard roles={horseRoles}>
      <HorseList />
    </RoleGuard>
  );
}
