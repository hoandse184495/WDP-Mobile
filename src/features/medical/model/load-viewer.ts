import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { viewerHtml } from './viewer-html';
import type { SurfaceLocation } from './surface-location';
let modelBase64: string | undefined;
export async function loadViewer(
  channel: string,
  marker: SurfaceLocation | null,
  editable: boolean,
) {
  if (!modelBase64) {
    // Metro needs a static require to bundle the offline GLB.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const asset = Asset.fromModule(require('../../../../assets/models/horse.glb'));
    await asset.downloadAsync();
    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Không tải được mô hình ngựa.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let raw = '';
      for (let i = 0; i < bytes.length; i += 8192)
        raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
      modelBase64 = btoa(raw);
    } else modelBase64 = await new File(asset.localUri ?? asset.uri).base64();
  }
  return viewerHtml(modelBase64, channel, marker, editable);
}
