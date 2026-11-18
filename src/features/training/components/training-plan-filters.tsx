import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { Choice } from '@/shared/components/choice';
import { Icon } from '@/shared/components/icon';
import { useHorses } from '@/features/horses/hooks/use-horses';
import type { JsonRecord } from '@/features/operations/types/operation';
export function TrainingPlanFilters({
  horseScoped,
  onApply,
}: {
  horseScoped: boolean;
  onApply: (value: JsonRecord) => void;
}) {
  const [value, setValue] = useState<JsonRecord>({});
  const [horseSearch, setHorseSearch] = useState('');
  const horses = useHorses(horseSearch);
  const update = (key: string, next: string) => {
    const updated = { ...value, [key]: next };
    setValue(updated);
    onApply(updated);
  };
  const active = Object.values(value).some(Boolean);
  return (
    <View style={{ gap: 9 }}>
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          accessibilityLabel="Tìm giáo án"
          placeholder="Tìm tên ngựa, mã hoặc giáo án…"
          placeholderTextColor={colors.muted}
          value={String(value.search ?? '')}
          onChangeText={(text) => update('search', text)}
          maxLength={150}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
        {!!value.search && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa tìm kiếm giáo án"
            onPress={() => update('search', '')}
            style={styles.clear}
          >
            <Icon name="close" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!horseScoped && (
        <Choice
          compact
          label="Lọc chiến mã"
          value={String(value.horseId ?? '')}
          options={[
            { value: '', label: 'Tất cả chiến mã' },
            ...(horses.data?.pages.flatMap((page) => page.items) ?? []).map((horse) => ({
              value: horse._id,
              label: `${horse.name} · ${horse.registrationCode}`,
            })),
          ]}
          onChange={(next) => update('horseId', next)}
          onSearch={setHorseSearch}
          loading={horses.isPending || (horses.isFetching && !horses.isFetchingNextPage)}
          error={horses.error}
          onRetry={() => void horses.refetch()}
          hasMore={horses.hasNextPage}
          loadingMore={horses.isFetchingNextPage}
          onLoadMore={() => void horses.fetchNextPage()}
        />
      )}
      <View style={[ui.row, { alignItems: 'flex-start', gap: 8 }]}>
        <View style={ui.grow}>
          <Choice
            compact
            label="Lọc giai đoạn"
            value={String(value.phase ?? '')}
            onChange={(next) => update('phase', next)}
            options={[
              { value: '', label: 'Tất cả giai đoạn' },
              { value: 'build_up', label: 'Xây nền' },
              { value: 'sprint', label: 'Nước rút' },
              { value: 'endurance', label: 'Sức bền' },
              { value: 'recovery', label: 'Phục hồi' },
              { value: 'pre_race', label: 'Tiền thi đấu' },
            ]}
          />
        </View>
        <View style={ui.grow}>
          <Choice
            compact
            label="Lọc trạng thái"
            value={String(value.isActive ?? '')}
            onChange={(next) => update('isActive', next)}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'true', label: 'Đang áp dụng' },
              { value: 'false', label: 'Đã kết thúc' },
            ]}
          />
        </View>
      </View>
      {active && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setValue({});
            onApply({});
          }}
          style={{ alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 4 }}
        >
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Xóa bộ lọc</Text>
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingVertical: 11,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
  },
  clear: { minHeight: 44, minWidth: 36, alignItems: 'center', justifyContent: 'center' },
});
