import { sessionVersion } from '@/features/auth/utils/session';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { apiClient, requestData } from './api-client';
import { AppError } from '@/core/errors/app-error';
export async function uploadAdmissionDocument(admissionId: string, kind: string) {
  const types =
    kind === 'horse_photo'
      ? ['image/jpeg', 'image/png']
      : ['image/jpeg', 'image/png', 'application/pdf'];
  const result = await DocumentPicker.getDocumentAsync({
    type: types,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0],
    bytes = await new File(asset.uri).arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024)
    throw new AppError('Tài liệu phải có nội dung và không vượt quá 5 MB.');
  const mime = asset.mimeType ?? '';
  if (!types.includes(mime)) throw new AppError('Chọn đúng định dạng PNG, JPEG hoặc PDF.');
  return requestData(
    apiClient.post(`/admissions/${admissionId}/attachments`, bytes, {
      params: { kind, fileName: asset.name },
      headers: { 'Content-Type': mime },
      transformRequest: [(value) => value],
      timeout: 60000,
    }),
  );
}
export async function openAuthenticatedDocument(path: string, fileName: string) {
  const version = sessionVersion();
  if (!(await Sharing.isAvailableAsync()))
    throw new AppError('Thiết bị chưa hỗ trợ mở hoặc chia sẻ tài liệu.');
  const response = await apiClient.get<ArrayBuffer>(path, { responseType: 'arraybuffer' });
  if (version !== sessionVersion()) throw new AppError('Phiên đăng nhập đã thay đổi.');
  const directory = new Directory(Paths.cache, 'equine-private');
  directory.create({ idempotent: true, intermediates: true });
  const safeName = fileName.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(-160);
  const file = new File(directory, `${Crypto.randomUUID()}-${safeName || 'document'}`);
  try {
    file.create({ overwrite: true });
    file.write(new Uint8Array(response.data));
    await Sharing.shareAsync(file.uri, {
      mimeType: String(response.headers['content-type'] ?? 'application/octet-stream'),
      dialogTitle: 'Mở hoặc chia sẻ tài liệu',
    });
  } finally {
    if (file.exists) file.delete();
  }
}

export function openPrivateDocument(admissionId: string, attachmentId: string, fileName: string) {
  return openAuthenticatedDocument(
    `/admissions/${admissionId}/attachments/${attachmentId}`,
    fileName,
  );
}
