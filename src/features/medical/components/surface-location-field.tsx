import { useEffect, useRef, useState } from 'react';
import { Linking, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { Button, Card, Choice } from '@/shared/components/ui';
import { ui } from '@/core/theme/theme';
import { HorseCanvas } from './horse-canvas';
import {
  parsePick,
  regions,
  sides,
  surfaceLocationSchema,
  type SurfaceLocation,
} from '../model/surface-location';
interface Props {
  value: unknown;
  onChange?: (value: SurfaceLocation | null) => void;
  horseId?: string;
  editable?: boolean;
}
export function SurfaceLocationField({ value, onChange, horseId, editable = true }: Props) {
  const parsed = surfaceLocationSchema.safeParse(value),
    location = parsed.success ? parsed.data : null;
  const [open, setOpen] = useState(false),
    previousHorse = useRef(horseId);
  useEffect(() => {
    if (previousHorse.current !== horseId) {
      previousHorse.current = horseId;
      setOpen(false);
      if (value != null) onChange?.(null);
    }
  }, [horseId, onChange, value]);
  return (
    <Card>
      <Text style={ui.heading}>Vị trí chấn thương 3D</Text>
      <Text style={ui.body}>
        {location
          ? regions.find((x) => x[0] === location.regionId)?.[1] +
            ' · ' +
            sides.find((x) => x[0] === location.side)?.[1]
          : value
            ? 'Vị trí đã lưu không tương thích phiên bản mô hình hiện tại.'
            : 'Chưa chọn vị trí trên mô hình.'}
      </Text>
      <Button
        secondary
        title={editable ? 'Chọn vị trí trên mô hình' : 'Xem vị trí trên mô hình'}
        disabled={!horseId || (!editable && !location)}
        onPress={() => setOpen(true)}
      />
      {!horseId && <Text style={ui.muted}>Chọn ngựa trước khi đánh dấu vị trí.</Text>}
      {editable && value != null && (
        <Button secondary title="Xóa vị trí 3D" onPress={() => onChange?.(null)} />
      )}
      <Text style={ui.muted} onPress={() => void Linking.openURL('https://skfb.ly/pGOFW')}>
        Mô hình Horse · OrelvysRodriguez · CC BY 4.0
      </Text>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        {open && (
          <Picker
            initial={location}
            editable={editable}
            close={() => setOpen(false)}
            confirm={(next) => {
              onChange?.(next);
              setOpen(false);
            }}
          />
        )}
      </Modal>
    </Card>
  );
}
function Picker({
  initial,
  editable,
  close,
  confirm,
}: {
  initial: SurfaceLocation | null;
  editable: boolean;
  close: () => void;
  confirm: (value: SurfaceLocation) => void;
}) {
  const [draft, setDraft] = useState(initial),
    [channel, setChannel] = useState(() => Crypto.randomUUID()),
    [error, setError] = useState(false),
    [notice, setNotice] = useState('');
  const receive = (text: string) => {
    if (text.length > 8192) return;
    try {
      const message = JSON.parse(text);
      if (message.channel !== channel) return;
      if (message.type === 'error') {
        setError(true);
        return;
      }
      if (message.type === 'miss') setNotice('Chạm vào phần thân ngựa để chọn vị trí.');
      if (message.type === 'pick' && editable) {
        setDraft(parsePick(message.payload));
        setError(false);
        setNotice('Đã chọn điểm. Kiểm tra vùng và bên trước khi dùng.');
      }
    } catch {
      setNotice('Điểm chọn không hợp lệ. Vui lòng chọn lại.');
    }
  };
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={ui.heading}>
          {editable ? 'Chọn vị trí chấn thương' : 'Vị trí chấn thương đã lưu'}
        </Text>
        <Text style={ui.muted}>
          Kéo để xoay, chụm để phóng to. {editable ? 'Bật Đánh dấu vị trí rồi chạm lên ngựa.' : ''}
        </Text>
        <HorseCanvas
          key={channel}
          channel={channel}
          marker={draft}
          editable={editable}
          onMessage={receive}
        />
        {!!notice && (
          <Text accessibilityLiveRegion="polite" style={ui.body}>
            {notice}
          </Text>
        )}
        {error && (
          <>
            <Text style={ui.body}>Không hiển thị được mô hình 3D.</Text>
            <Button
              secondary
              title="Tải lại mô hình"
              onPress={() => {
                setError(false);
                setChannel(Crypto.randomUUID());
              }}
            />
          </>
        )}
        {draft && (
          <View style={{ gap: 10 }}>
            {editable ? (
              <>
                <Choice
                  label="Vùng chấn thương"
                  value={draft.regionId}
                  options={regions.map(([value, label]) => ({ value, label }))}
                  onChange={(regionId) =>
                    setDraft({ ...draft, regionId: regionId as SurfaceLocation['regionId'] })
                  }
                />
                <Choice
                  label="Bên chấn thương"
                  value={draft.side}
                  options={sides.map(([value, label]) => ({ value, label }))}
                  onChange={(side) => setDraft({ ...draft, side: side as SurfaceLocation['side'] })}
                />
              </>
            ) : (
              <Text style={ui.body}>
                {regions.find((x) => x[0] === draft.regionId)?.[1]} ·{' '}
                {sides.find((x) => x[0] === draft.side)?.[1]}
              </Text>
            )}
          </View>
        )}
        {editable && (
          <Button
            title="Dùng vị trí này"
            disabled={!draft || error}
            onPress={() => {
              if (draft) confirm(surfaceLocationSchema.parse(draft));
            }}
          />
        )}
        <Button secondary title={editable ? 'Hủy chọn vị trí' : 'Đóng mô hình'} onPress={close} />
      </ScrollView>
    </SafeAreaView>
  );
}
