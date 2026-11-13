import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Button } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import type { JournalPhoto as Photo } from '../types/care-journal';
import { illustrationPhoto, journalPhotoUrl } from '../utils/care-journal';
export function JournalPhoto({ photo, reload }: { photo: Photo; reload: () => void }) {
  const [open, setOpen] = useState(false),
    [failed, setFailed] = useState(false),
    url = journalPhotoUrl(photo.url),
    label = photo.fileName || 'Ảnh hoạt động';
  if (!url || failed)
    return (
      <View>
        <Text style={ui.muted}>Ảnh hiện không tải được.</Text>
        <Button
          title="Tải lại ảnh nhật ký"
          secondary
          onPress={() => {
            setFailed(false);
            reload();
          }}
        />
      </View>
    );
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Xem ảnh ' + label}
        onPress={() => setOpen(true)}
      >
        <Image
          source={{ uri: url }}
          cachePolicy="none"
          accessibilityLabel={label}
          contentFit="cover"
          style={{ height: 160, width: '100%', borderRadius: 12 }}
          onError={() => setFailed(true)}
        />
      </Pressable>
      {illustrationPhoto(url) && <Text style={ui.muted}>Ảnh minh họa do máy chủ cung cấp.</Text>}
      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, padding: 16, gap: 12, backgroundColor: '#14201a' }}>
          <Text style={{ color: 'white' }}>{label}</Text>
          <Image
            source={{ uri: url }}
            cachePolicy="none"
            accessibilityLabel={'Ảnh phóng to ' + label}
            contentFit="contain"
            style={{ flex: 1 }}
            onError={() => {
              setOpen(false);
              setFailed(true);
            }}
          />
          <Button secondary title="Đóng ảnh" onPress={() => setOpen(false)} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
