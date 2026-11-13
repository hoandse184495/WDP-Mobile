import { ReactElement } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { colors, ui } from '@/core/theme/theme';
import { Button, Empty, Failure, Loading } from './ui';

export function PagedList<T>({
  items,
  renderItem,
  getId,
  pending,
  error,
  refreshing,
  refresh,
  more,
  loadingMore,
  loadMore,
  header,
  emptyLabel,
}: {
  items: T[];
  renderItem: (item: T) => ReactElement;
  getId: (item: T) => string;
  pending: boolean;
  error: unknown;
  refreshing: boolean;
  refresh: () => void;
  more?: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  header?: ReactElement;
  emptyLabel?: string;
}) {
  return (
    <FlatList
      data={items}
      keyExtractor={getId}
      renderItem={({ item }) => renderItem(item)}
      contentContainerStyle={ui.content}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={header}
      refreshControl={
        <RefreshControl
          refreshing={refreshing && !pending}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        pending ? (
          <Loading />
        ) : error ? (
          <Failure error={error} retry={refresh} />
        ) : (
          <Empty label={emptyLabel} />
        )
      }
      ListFooterComponent={
        items.length ? (
          error ? (
            <Failure error={error} retry={refresh} />
          ) : more ? (
            <Button title="Tải thêm" secondary busy={loadingMore} onPress={loadMore} />
          ) : undefined
        ) : undefined
      }
    />
  );
}
