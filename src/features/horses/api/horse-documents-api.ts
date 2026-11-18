import { z } from 'zod';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { apiClient, requestData } from '@/core/network/api-client';
import { openAuthenticatedDocument } from '@/core/network/private-files';
import { AppError } from '@/core/errors/app-error';
import { sessionVersion } from '@/features/auth/utils/session';
export const horseDocumentSchema = z.object({
  _id: z.string(),
  horseId: z.string(),
  fileName: z.string(),
  title: z.string().optional(),
  mimeType: z.enum(['image/png', 'image/jpeg', 'application/pdf']),
  size: z.number().positive(),
  source: z.enum(['horse', 'admission']),
  canDelete: z.boolean(),
  createdAt: z.string(),
  uploadedBy: z.object({ _id: z.string(), fullName: z.string() }).nullable().optional(),
});
export type HorseDocument = z.infer<typeof horseDocumentSchema>;
const base = (id: string) => `/horses/${encodeURIComponent(id)}/documents`;
export function validateHorseDocument(size: number, mimeType: string) {
  if (!['image/png', 'image/jpeg', 'application/pdf'].includes(mimeType))
    throw new AppError('Chỉ nhận PNG, JPEG hoặc PDF.');
  if (!Number.isFinite(size) || size <= 0 || size > 5 * 1024 * 1024)
    throw new AppError('Tệp phải có nội dung và tối đa 5 MiB.');
}
export const horseDocumentsApi = {
  list: async (id: string, signal?: AbortSignal) =>
    z
      .object({ documents: z.array(horseDocumentSchema) })
      .parse(await requestData(apiClient.get(base(id), { signal }))).documents,
  upload: async (id: string, title: string) => {
    const version = sessionVersion();
    if (title.trim().length > 200) throw new AppError('Tên giấy tờ tối đa 200 ký tự.');
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/png', 'image/jpeg', 'application/pdf'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    const file = new File(asset.uri);
    try {
      const mime = asset.mimeType ?? '';
      if (asset.size !== undefined) validateHorseDocument(asset.size, mime);
      const bytes = await file.arrayBuffer();
      validateHorseDocument(bytes.byteLength, mime);
      if (version !== sessionVersion()) throw new AppError('Phiên đăng nhập đã thay đổi.');
      return requestData(
        apiClient.post(base(id), bytes, {
          params: { fileName: asset.name, title: title.trim() },
          headers: { 'Content-Type': mime },
          transformRequest: [(value) => value],
          timeout: 45000,
        }),
      );
    } finally {
      if (file.exists) file.delete();
    }
  },
  open: (id: string, document: HorseDocument) =>
    openAuthenticatedDocument(`${base(id)}/${encodeURIComponent(document._id)}`, document.fileName),
  remove: (id: string, document: HorseDocument) => {
    if (document.source !== 'horse' || !document.canDelete)
      throw new AppError('Giấy tờ này chỉ được xem.');
    return requestData(apiClient.delete(`${base(id)}/${encodeURIComponent(document._id)}`));
  },
};
