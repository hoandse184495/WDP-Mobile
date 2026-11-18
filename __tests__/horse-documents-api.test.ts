import { environment } from '@/core/config/environment';
beforeEach(() => {
  environment.apiUrl = 'http://10.0.2.2:3000/api';
});
import * as DocumentPicker from 'expo-document-picker';
import { apiClient } from '@/core/network/api-client';
import {
  horseDocumentsApi,
  validateHorseDocument,
  type HorseDocument,
} from '@/features/horses/api/horse-documents-api';
import { openAuthenticatedDocument } from '@/core/network/private-files';
import { sessionVersion } from '@/features/auth/utils/session';
const mockDelete = jest.fn();
const mockRead = jest.fn(async () => new Uint8Array([37, 80, 68, 70, 45]).buffer);
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({
  File: class {
    exists = true;
    arrayBuffer = mockRead;
    delete = mockDelete;
  },
}));
jest.mock('@/core/network/private-files', () => ({ openAuthenticatedDocument: jest.fn() }));
jest.mock('@/features/auth/utils/session', () => ({ sessionVersion: jest.fn(() => 1) }));
const document: HorseDocument = {
  _id: 'd1',
  horseId: 'h1',
  title: 'Passport',
  fileName: 'passport.pdf',
  mimeType: 'application/pdf',
  size: 5,
  source: 'horse',
  canDelete: true,
  createdAt: '2026-11-18',
};
const adapter = apiClient.defaults.adapter;
afterEach(() => {
  apiClient.defaults.adapter = adapter;
  jest.clearAllMocks();
  jest.mocked(sessionVersion).mockReturnValue(1);
});
test('documents list preserves read-only legacy documents and manager delete flags', async () => {
  apiClient.defaults.adapter = async (config) => ({
    config,
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {
      success: true,
      data: {
        documents: [
          document,
          { ...document, _id: 'legacy', source: 'admission', canDelete: false },
        ],
      },
    },
  });
  const result = await horseDocumentsApi.list('h1');
  expect(result[1]).toMatchObject({ source: 'admission', canDelete: false });
  expect(() => horseDocumentsApi.remove('h1', result[1])).toThrow('chỉ được xem');
});
test('upload uses raw bytes and the new horse route, then clears the picker cache copy', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///picked.pdf',
        lastModified: 0,
        name: 'passport.pdf',
        mimeType: 'application/pdf',
        size: 5,
      },
    ],
  });
  apiClient.defaults.adapter = async (config) => {
    expect(config.url).toBe('/horses/h1/documents');
    expect(config.params).toEqual({ fileName: 'passport.pdf', title: 'Hộ chiếu' });
    expect(config.headers['Content-Type']).toBe('application/pdf');
    expect(config.data).toBeInstanceOf(ArrayBuffer);
    return {
      config,
      status: 201,
      statusText: 'Created',
      headers: {},
      data: { success: true, data: { document } },
    };
  };
  await horseDocumentsApi.upload('h1', ' Hộ chiếu ');
  expect(mockDelete).toHaveBeenCalledTimes(1);
});
test('canceling the picker does not upload, and unsupported, empty or oversized files are rejected', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null });
  expect(await horseDocumentsApi.upload('h1', '')).toBeNull();
  expect(mockRead).not.toHaveBeenCalled();
  for (const [size, mime] of [
    [0, 'application/pdf'],
    [5242881, 'image/png'],
    [5, 'image/webp'],
  ] as const)
    expect(() => validateHorseDocument(size, mime)).toThrow();
});
test('open uses an authenticated horse document download rather than a public storage URL', async () => {
  await horseDocumentsApi.open('h1', document);
  expect(openAuthenticatedDocument).toHaveBeenCalledWith('/horses/h1/documents/d1', 'passport.pdf');
});
test('changing session while choosing a document prevents upload and clears the temporary file', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///picked.pdf',
        lastModified: 0,
        name: 'passport.pdf',
        mimeType: 'application/pdf',
        size: 5,
      },
    ],
  });
  jest.mocked(sessionVersion).mockReturnValueOnce(1).mockReturnValue(2);
  const request = jest.fn();
  apiClient.defaults.adapter = request;
  await expect(horseDocumentsApi.upload('h1', '')).rejects.toThrow('Phiên đăng nhập');
  expect(request).not.toHaveBeenCalled();
  expect(mockDelete).toHaveBeenCalledTimes(1);
});
