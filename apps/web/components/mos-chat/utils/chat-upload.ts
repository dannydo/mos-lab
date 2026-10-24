import { apiClient } from '../../../lib/api-client';
import type { MosChatImageAttachment, SafeAny } from '@mos-lab/shared';

/**
 * Reads a local image file as Base64 and uploads it to mOS Chat Media Storage
 */
export async function uploadSingleChatImage(file: File): Promise<MosChatImageAttachment | null> {
  const base64Data = await new Promise<string | null>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      const base64 = result?.split(',')[1] || null;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh'));
    reader.readAsDataURL(file);
  });

  if (!base64Data) return null;

  const res = await apiClient.chat.uploadImage({
    dataBase64: base64Data,
    fileName: file.name,
    mimeType: (file.type as SafeAny) || 'image/jpeg',
  });

  return res?.attachment || null;
}

/**
 * Uploads multiple image files concurrently in parallel, reporting progress
 * and returning all successfully uploaded attachments without aborting on partial errors.
 */
export async function uploadMultipleChatImages(
  files: File[] | FileList,
  onProgress?: (completed: number, total: number) => void
): Promise<MosChatImageAttachment[]> {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) return [];

  let completed = 0;
  const results = await Promise.allSettled(
    fileArray.map(async (file) => {
      try {
        const att = await uploadSingleChatImage(file);
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
