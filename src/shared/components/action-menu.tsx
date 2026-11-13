import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, ui } from '@/core/theme/theme';
import { Icon } from './icon';

export function ActionMenu({
  title = 'Thao tác',
  actions,
}: {
  title?: string;
  actions: { id: string; title: string; onPress: () => void }[];
}) {
  const [visible, setVisible] = useState(false);
  if (!actions.length) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible(true)}
        style={[
          ui.between,
          {
            minHeight: 44,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Text style={{ color: colors.primaryDeep, fontSize: 12, fontWeight: '600', flexShrink: 1 }}>
          {title}
        </Text>
        <Icon name="more" color={colors.primary} size={20} strokeWidth={3} />
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0A211B77' }}>
          <Pressable
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel="Đóng menu thao tác"
            onPress={() => setVisible(false)}
          />
          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: '75%',
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: colors.line,
                borderRadius: 2,
                alignSelf: 'center',
                marginTop: 10,
              }}
            />
            <View style={[ui.between, { paddingHorizontal: 22, paddingTop: 10 }]}>
              <Text style={ui.heading}>{title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={() => setVisible(false)}
                style={{ padding: 14 }}
              >
                <Icon name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16, gap: 5 }}
            >
              {actions.map((action) => (
                <Pressable
                  key={action.id}
                  accessibilityRole="button"
                  accessibilityLabel={action.title}
                  onPress={() => {
                    setVisible(false);
                    action.onPress();
                  }}
                  style={{
                    minHeight: 54,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    backgroundColor: colors.surfaceMuted,
                    borderRadius: 13,
                  }}
                >
                  <Icon name="arrow" size={17} color={colors.primary} />
                  <Text style={[ui.body, ui.grow, { fontSize: 13 }]}>{action.title}</Text>
                  <Icon name="chevron" size={14} color={colors.muted} />
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
