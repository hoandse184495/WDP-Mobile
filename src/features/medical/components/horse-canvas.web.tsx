import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { loadViewer } from '../model/load-viewer';
import type { HorseCanvasProps } from './horse-canvas-types';
export function HorseCanvas({ channel, marker, editable, onMessage }: HorseCanvasProps) {
  const ref = useRef<HTMLIFrameElement>(null),
    initial = useRef({ marker, editable }),
    callback = useRef(onMessage);
  useEffect(() => {
    callback.current = onMessage;
  }, [onMessage]);
  const [html, setHtml] = useState(''),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    loadViewer(channel, initial.current.marker, initial.current.editable).then(
      (value) => {
        if (active) setHtml(value);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [channel]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source === ref.current?.contentWindow && typeof event.data === 'string')
        callback.current(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);
  useEffect(() => {
    ref.current?.contentWindow?.postMessage(
      JSON.stringify({ channel, command: 'marker', value: marker }),
      '*',
    );
  }, [marker, channel]);
  return (
    <View style={{ height: 400 }}>
      {failed ? (
        <Text>Không tải được mô hình 3D. Đóng và thử lại.</Text>
      ) : !html ? (
        <ActivityIndicator accessibilityLabel="Đang tải mô hình" />
      ) : (
        <iframe
          ref={ref}
          title="Mô hình vị trí chấn thương"
          srcDoc={html}
          sandbox="allow-scripts"
          style={{ height: 400, width: '100%', border: 0 }}
        />
      )}
    </View>
  );
}
