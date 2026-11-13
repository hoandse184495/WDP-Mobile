import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { loadViewer } from '../model/load-viewer';
import type { HorseCanvasProps } from './horse-canvas-types';
export function HorseCanvas({ channel, marker, editable, onMessage }: HorseCanvasProps) {
  const ref = useRef<WebView<unknown>>(null),
    initial = useRef({ marker, editable });
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
    const instance = ref.current;
    return () => instance?.injectJavaScript('window.__disposeHorse?.();true;');
  }, [html]);
  useEffect(() => {
    ref.current?.postMessage(JSON.stringify({ channel, command: 'marker', value: marker }));
  }, [marker, channel]);
  return (
    <View style={{ height: 400 }}>
      {failed ? (
        <Text>Không tải được mô hình 3D. Đóng và thử lại.</Text>
      ) : !html ? (
        <ActivityIndicator accessibilityLabel="Đang tải mô hình" />
      ) : (
        <WebView<unknown>
          ref={ref}
          source={{ html, baseUrl: 'https://equinepro-model.invalid/' }}
          originWhitelist={['*']}
          nestedScrollEnabled
          javaScriptEnabled
          domStorageEnabled={false}
          allowFileAccess={false}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(request) =>
            request.url === 'about:blank' || request.url === 'https://equinepro-model.invalid/'
          }
          onMessage={(event) => onMessage(event.nativeEvent.data)}
          onError={() => onMessage(JSON.stringify({ channel, type: 'error' }))}
          style={{ flex: 1, backgroundColor: '#f3f6f5' }}
        />
      )}
    </View>
  );
}
