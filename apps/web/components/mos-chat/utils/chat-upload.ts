import {
  MOS_CHAT_MAX_VIDEO_BYTES,
  MOS_CHAT_VIDEO_CHUNK_BYTES,
  type MosChatImageAttachment,
  type SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { isSupportedVideoFile, extractVideoMetadata } from './chat-video';

const EXT_TO_MIME_FALLBACK: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
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

export interface ChatVideoUploadProgressInfo {
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  phase: 'uploading' | 'finalizing';
}

export interface UploadChatVideoOptions {
  onProgress?: (info: ChatVideoUploadProgressInfo) => void;
  signal?: AbortSignal;
  onUploadId?: (uploadId: string) => void;
  source?: 'clipboard' | 'drive' | 'upload';
}

const CHUNK_RETRY_DELAYS_MS = [800, 2000, 4000];

function isAbortLikeError(err: SafeAny): boolean {
  return (
    err?.name === 'AbortError' ||
    err?.name === 'CanceledError' ||
    err?.code === 'ERR_CANCELED' ||
    Boolean(err?.__ABORTED__)
  );
}

function shouldRetryChunkError(err: SafeAny): boolean {
  if (isAbortLikeError(err)) return false;
  const status = err?.response?.status;
  if (typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return false;
  }
  return true;
}

async function waitWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    const abortErr = new Error('Upload đã bị hủy.');
    abortErr.name = 'AbortError';
    throw abortErr;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      const abortErr = new Error('Upload đã bị hủy.');
      abortErr.name = 'AbortError';
      reject(abortErr);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Uploads a video file up to 100MB using 5MB chunked streaming + per-chunk retry + abort support.
 */
export async function uploadSingleChatVideo(
  file: File,
  progressOrOptions?: ((percent: number) => void) | UploadChatVideoOptions
): Promise<MosChatImageAttachment | null> {
  if (file.size <= 0 || file.size > MOS_CHAT_MAX_VIDEO_BYTES) {
    throw new Error(`Video "${file.name}" vượt quá dung lượng tối đa cho phép (100MB).`);
  }

  const opts: UploadChatVideoOptions =
    typeof progressOrOptions === 'function'
      ? { onProgress: (info) => progressOrOptions(info.percent) }
      : progressOrOptions || {};

  if (opts.signal?.aborted) {
    const abortErr = new Error('Upload đã bị hủy.');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  const metadata = await extractVideoMetadata(file).catch(() => ({
    durationSec: 0,
    width: undefined as number | undefined,
    height: undefined as number | undefined,
    posterDataUrl: undefined as string | undefined,
  }));

  if (opts.signal?.aborted) {
    const abortErr = new Error('Upload đã bị hủy.');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  const totalBytes = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalBytes / MOS_CHAT_VIDEO_CHUNK_BYTES));

  const initRes = await apiClient.chat.initVideoUpload({
    fileName: file.name,
    mimeType: file.type || undefined,
    totalSizeBytes: totalBytes,
    totalChunks,
    durationSec: metadata.durationSec || undefined,
    width: metadata.width,
    height: metadata.height,
    source: opts.source || 'upload',
  });

  const uploadId = initRes.uploadId;
  opts.onUploadId?.(uploadId);

  const effectiveChunkBytes = initRes.chunkSizeBytes || MOS_CHAT_VIDEO_CHUNK_BYTES;

  try {
    let completedBytes = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      if (opts.signal?.aborted) {
        const abortErr = new Error('Upload đã bị hủy.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      const start = chunkIndex * effectiveChunkBytes;
      const end = Math.min(totalBytes, start + effectiveChunkBytes);
      const chunkBlob = file.slice(start, end);
      const chunkSize = end - start;

      let attempt = 0;
      while (true) {
        try {
          await apiClient.chat.uploadVideoChunk(uploadId, chunkIndex, chunkBlob, {
            signal: opts.signal,
            onUploadProgress: (evt: SafeAny) => {
              const rawLoaded = typeof evt?.loaded === 'number' ? Math.min(evt.loaded, chunkSize) : 0;
              const loadedBytes = Math.min(totalBytes, completedBytes + rawLoaded);
              const pct = Math.min(99, Math.max(1, Math.round((loadedBytes * 100) / totalBytes)));
              opts.onProgress?.({
                percent: pct,
                loadedBytes,
                totalBytes,
                phase: 'uploading',
              });
            },
          });
          completedBytes = Math.min(totalBytes, completedBytes + chunkSize);
          const pct = Math.min(99, Math.round((completedBytes * 100) / totalBytes));
          opts.onProgress?.({
            percent: pct,
            loadedBytes: completedBytes,
            totalBytes,
            phase: chunkIndex === totalChunks - 1 ? 'finalizing' : 'uploading',
          });
          break;
        } catch (err: SafeAny) {
          if (opts.signal?.aborted || isAbortLikeError(err)) {
            throw err;
          }
          if (!shouldRetryChunkError(err) || attempt >= CHUNK_RETRY_DELAYS_MS.length) {
            throw err;
          }
          const delayMs = CHUNK_RETRY_DELAYS_MS[attempt];
          attempt += 1;
          await waitWithAbort(delayMs, opts.signal);
        }
      }
    }

    opts.onProgress?.({
      percent: 99,
      loadedBytes: totalBytes,
      totalBytes,
      phase: 'finalizing',
    });

    const completeRes = await apiClient.chat.completeVideoUpload(
      uploadId,
      {
        durationSec: metadata.durationSec || undefined,
        width: metadata.width,
        height: metadata.height,
        source: opts.source || 'upload',
      },
      { signal: opts.signal }
    );

    if (completeRes?.attachment) {
      if (!completeRes.attachment.posterUrl && metadata.posterDataUrl) {
        completeRes.attachment.posterUrl = metadata.posterDataUrl;
      }
      if (!completeRes.attachment.durationSec && metadata.durationSec) {
        completeRes.attachment.durationSec = metadata.durationSec;
      }
      completeRes.attachment.isVideo = true;
      opts.onProgress?.({
        percent: 100,
        loadedBytes: totalBytes,
        totalBytes,
        phase: 'finalizing',
      });
      return completeRes.attachment;
    }
    return null;
  } catch (err: SafeAny) {
    if (opts.signal?.aborted || isAbortLikeError(err)) {
      await apiClient.chat.abortVideoUpload(uploadId).catch(() => {});
    }
    throw err;
  }
}

export const uploadChatVideoChunked = uploadSingleChatVideo;

/**
 * Reads any local file (video, image, PDF, Excel, Word, ZIP, etc.) and uploads it to mOS Chat Storage
 */
export async function uploadSingleChatFile(
  file: File,
  onPercentProgress?: (percent: number) => void
): Promise<MosChatImageAttachment | null> {
  if (isSupportedVideoFile(file)) {
    return uploadSingleChatVideo(file, onPercentProgress);
  }

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
 * Uploads multiple files (videos, images, PDFs, documents) concurrently in parallel,
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
