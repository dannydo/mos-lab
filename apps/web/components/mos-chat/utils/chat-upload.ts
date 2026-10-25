import { apiClient } from '../../../lib/api-client';
import type { MosChatImageAttachment, SafeAny } from '@mos-lab/shared';

const EXT_TO_MIME_FALLBACK: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

/**
 * Reads any local file (image, PDF, Excel, Word, ZIP, etc.) as Base64 and uploads it to mOS Chat Storage
 */
export async function uploadSingleChatFile(file: File): Promise<MosChatImageAttachment | null> {
  const base64Data = await new Promise<string | null>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      const base64 = result?.split(',')[1] || null;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Không thể đọc tệp tin'));
    reader.readAsDataURL(file);
  });

  if (!base64Data) return null;

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  let mimeType = file.type || '';
  if (!mimeType || mimeType === 'application/octet-stream') {
    mimeType = EXT_TO_MIME_FALLBACK[ext] || 'application/octet-stream';
  }

  const res = await apiClient.chat.uploadImage({
    dataBase64: base64Data,
    fileName: file.name,
    mimeType: mimeType as SafeAny,
  });

  return res?.attachment || null;
}

/**
 * Backward compatible alias for uploading a single image or file
 */
export const uploadSingleChatImage = uploadSingleChatFile;

/**
 * Uploads multiple files (images, PDFs, documents) concurrently in parallel,
 * reporting progress and returning all successfully uploaded attachments.
 */
export async function uploadMultipleChatFiles(
  files: File[] | FileList,
  onProgress?: (completed: number, total: number) => void
): Promise<MosChatImageAttachment[]> {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) return [];

  let completed = 0;
  const results = await Promise.allSettled(
    fileArray.map(async (file) => {
      try {
        const att = await uploadSingleChatFile(file);
        completed++;
        onProgress?.(completed, fileArray.length);
        return att;
      } catch (err) {
        completed++;
        onProgress?.(completed, fileArray.length);
        throw err;
      }
    })
  );

  const successful: MosChatImageAttachment[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      successful.push(r.value);
    }
  }

  return successful;
}

/**
 * Backward compatible alias for multi-file upload
 */
export const uploadMultipleChatImages = uploadMultipleChatFiles;
