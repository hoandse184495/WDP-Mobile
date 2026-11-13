import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily, ui } from '@/core/theme/theme';
import { Icon } from './icon';

type Option<T extends string> = { value: T; label: string };
function normalize(text: string) {
  return text
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onSearch,
  loading = false,
  error,
  onRetry,
}: {
  label: string;
  options: readonly Option<T>[];
  value?: T;
  onChange: (value: T) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const searchCallback = useRef(onSearch);
  useEffect(() => {
    searchCallback.current = onSearch;
  }, [onSearch]);
  const remote = Boolean(onSearch);
  useEffect(() => {
    if (!open || !remote) return;
    const timer = setTimeout(() => {
      const query = search.trim();
      searchCallback.current?.(query);
      setSubmittedSearch(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [open, search, remote]);
  const busy = loading || (remote && search.trim() !== submittedSearch);
  const [lastSelection, setLastSelection] = useState<Option<T> | null>(null);
  const selected =
    options.find((option) => option.value === value) ??
    (lastSelection?.value === value ? lastSelection : null);
  const query = normalize(search.trim());
  const filtered =
    query && !remote
      ? options.filter((option) => normalize(option.label).includes(query))
      : options;
  const close = () => setOpen(false);
  return (
    <View style={{ gap: 9 }}>
      <Text style={ui.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Mở danh sách để chọn một mục"
        accessibilityState={{ expanded: open }}
        accessibilityValue={{ text: selected?.label ?? 'Chưa chọn' }}
        onPress={() => {
          setSearch('');
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.trigger,
          pressed && { backgroundColor: colors.primarySoft },
        ]}
      >
        <Text
          style={[ui.body, { flex: 1, color: selected ? colors.ink : colors.muted }]}
          numberOfLines={2}
        >
          {selected?.label ?? (value ? 'Mục đã chọn' : 'Chọn ' + label.toLocaleLowerCase('vi'))}
        </Text>
        <Icon name="down" size={18} color={colors.muted} />
      </Pressable>
      {open && (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
          <SafeAreaView style={styles.page} edges={['top', 'right', 'bottom', 'left']}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={[ui.heading, { flex: 1 }]}>
                {label}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={'Đóng danh sách ' + label.toLocaleLowerCase('vi')}
                onPress={close}
                style={styles.close}
              >
                <Icon name="close" size={22} />
              </Pressable>
            </View>
            {(remote || options.length > 5 || hasMore || search) && (
              <View style={styles.search}>
                <Icon name="search" size={19} color={colors.muted} />
                <TextInput
                  accessibilityLabel={'Tìm trong ' + label.toLocaleLowerCase('vi')}
                  placeholder="Tìm theo tên hoặc mã…"
                  placeholderTextColor={colors.muted}
                  value={search}
                  maxLength={100}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={styles.searchInput}
                />
                {!!search && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xóa tìm kiếm"
                    onPress={() => setSearch('')}
                    style={styles.close}
                  >
                    <Icon name="close" size={18} />
                  </Pressable>
                )}
              </View>
            )}
            <FlatList
              data={busy || error ? [] : filtered}
              extraData={value}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              initialNumToRender={12}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const checked = value === item.value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={item.label}
                    accessibilityState={{ checked }}
                    onPress={() => {
                      setLastSelection(item);
                      onChange(item.value);
                      close();
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      (checked || pressed) && { backgroundColor: colors.primarySoft },
                    ]}
                  >
                    <Text
                      style={[
                        ui.body,
                        { flex: 1 },
                        checked && { color: colors.primaryDeep, fontWeight: '600' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {checked && <Icon name="check" size={20} color={colors.primary} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                busy ? (
                  <View style={styles.empty}>
                    <ActivityIndicator
                      accessibilityLabel="Đang tìm lựa chọn"
                      color={colors.primary}
                    />
                  </View>
                ) : error ? (
                  <View style={styles.empty}>
                    <Text accessibilityRole="alert" style={ui.error}>
                      {error instanceof Error ? error.message : 'Không tải được danh sách.'}
                    </Text>
                    {onRetry && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Thử lại danh sách"
                        onPress={onRetry}
                        style={styles.more}
                      >
                        <Text style={ui.label}>Thử lại</Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <Text style={[ui.muted, styles.empty]}>
                    {search ? 'Không tìm thấy mục phù hợp.' : 'Chưa có lựa chọn phù hợp.'}
                  </Text>
                )
              }
              ListFooterComponent={
                hasMore && onLoadMore && !busy && !error ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tải thêm lựa chọn"
                    accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
                    disabled={loadingMore}
                    onPress={onLoadMore}
                    style={styles.more}
                  >
                    <Text style={[ui.body, { color: colors.primary }]}>
                      {loadingMore ? 'Đang tải…' : 'Tải thêm lựa chọn'}
                    </Text>
                  </Pressable>
                ) : undefined
              }
            />
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  page: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    backgroundColor: colors.surface,
    paddingLeft: 14,
    paddingRight: 4,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingVertical: 12,
    fontFamily,
    fontSize: 14,
    color: colors.ink,
  },
  list: { padding: 16, paddingBottom: 32 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  empty: { padding: 24, textAlign: 'center' },
  more: { minHeight: 52, padding: 16, alignItems: 'center' },
});
