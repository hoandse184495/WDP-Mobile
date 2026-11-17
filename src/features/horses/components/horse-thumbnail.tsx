import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient, requestData } from '@/core/network/api-client';
import { useSession } from '@/features/auth/stores/session-store';
import { colors, ui } from '@/core/theme/theme';
import { Icon } from '@/shared/components/icon';
import { journalPhotoUrl } from '../utils/care-journal';
import type { Horse } from '../types/horse';
export function HorseThumbnail({
  horse,
}: {
  horse: Pick<Horse, '_id' | 'name' | 'avatar' | 'profileImage'>;
}) {
  const user = useSession((state) => state.user);
  const path = horse.avatar?.path;
  const [failedSource, setFailedSource] = useState('');
  const query = useQuery({
    queryKey: ['horse-avatar', horse._id, user?._id, user?.role, path],
    enabled: Boolean(user && horse._id && path),
    queryFn: async ({ signal }) =>
      z
        .object({ url: z.string().nullable() })
        .parse(
          await requestData(
            apiClient.get('/horses/' + encodeURIComponent(horse._id) + '/avatar', { signal }),
          ),
        ),
    staleTime: 120000,
    refetchInterval: 120000,
    gcTime: 0,
    retry: false,
  });
  const url = journalPhotoUrl(path ? (query.error ? null : query.data?.url) : horse.profileImage);
  const sourceKey = horse._id + ':' + url + ':' + query.dataUpdatedAt;
  return (
    <View style={[ui.iconTile, { width: 52, height: 56, borderRadius: 16, overflow: 'hidden' }]}>
      {url && failedSource !== sourceKey ? (
        <Image
          key={sourceKey}
          source={{ uri: url }}
          accessibilityLabel={'Ảnh đại diện ' + horse.name}
          contentFit="cover"
          cachePolicy="none"
          recyclingKey={horse._id + ':' + url}
          style={{ width: '100%', height: '100%' }}
          onError={() => setFailedSource(sourceKey)}
        />
      ) : (
        <Icon name="horse" size={32} color={colors.primary} />
      )}
    </View>
  );
}
