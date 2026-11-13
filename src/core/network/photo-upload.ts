import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { AppError } from '@/core/errors/app-error';
import { apiClient, requestData } from './api-client';

export async function pickAndUploadPhoto(path: string, revision: number, camera: boolean) {
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new AppError(
        'Cần quyền máy ảnh để chụp bằng chứng. Bạn cũng có thể chọn ảnh từ thư viện.',
      );
  }
  const result = camera
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const mime = asset.mimeType ?? 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime))
    throw new AppError('Chọn ảnh JPEG, PNG hoặc WebP.');
  const bytes = await (await fetch(asset.uri)).arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024)
    throw new AppError('Ảnh tối đa 5 MB. Vui lòng chọn ảnh nhỏ hơn.');
  return requestData(
    apiClient.post(path, bytes, {
      params: {
        revision,
        uploadKey: Crypto.randomUUID(),
        fileName: asset.fileName ?? 'evidence.jpg',
      },
      headers: { 'Content-Type': mime },
      transformRequest: [(data) => data],
      timeout: 45000,
    }),
  );
}
