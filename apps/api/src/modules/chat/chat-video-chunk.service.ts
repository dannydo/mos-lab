import crypto from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { FastifyInstance } from 'fastify';
import {
  MOS_CHAT_MAX_CONCURRENT_VIDEO_UPLOADS,
  MOS_CHAT_MAX_VIDEO_BYTES,
  MOS_CHAT_VIDEO_CHUNK_BYTES,
  type CompleteMosChatVideoUploadRequest,
  type InitMosChatVideoUploadRequest,
  type InitMosChatVideoUploadResponse,
  type MosChatImageAttachment,
} from '@mos-lab/shared';
import { mosChatMediaRoot, resolveVideoFormat, validateVideoFileMagicBytes } from './chat-file.service.js';
import { runTier1VideoProcessing } from './chat-video-processor.service.js';

const MAX_CHUNKS_PER_UPLOAD = 25;
const MAX_SINGLE_CHUNK_BYTES = 6 * 1024 * 1024;
const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;

export interface ChunkedUploadSessionMeta {
  uploadId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  ext: string;
  totalSizeBytes: number;
  totalChunks: number;
  createdAtMs: number;
  lastActivityMs: number;
  uploadedChunkIndexes: number[];
  source?: 'clipboard' | 'drive' | 'upload';
  durationSec?: number;
  width?: number;
  height?: number;
}

const activeSessionsById = new Map<string, ChunkedUploadSessionMeta>();

function sanitizeUploadId(raw: string): string {
  const cleaned = String(raw || '').trim();
  if (!/^[a-f0-9-]{36}$/i.test(cleaned)) {
    throw new Error('Mã phiên tải video không hợp lệ.');
  }
  return cleaned;
}

function getChunksDir(uploadId: string, customRootDir?: string): string {
  const rootDir = customRootDir || mosChatMediaRoot();
  const dir = resolve(rootDir, '.chunks', uploadId);
  const chunksBase = resolve(rootDir, '.chunks');
  if (!dir.startsWith(`${chunksBase}${sep}`)) {
    throw new Error('Đường dẫn phiên tải video không hợp lệ.');
  }
  return dir;
}

async function readSessionMeta(uploadId: string, customRootDir?: string): Promise<ChunkedUploadSessionMeta | null> {
  const cached = activeSessionsById.get(uploadId);
  if (cached) return cached;
  try {
    const metaPath = resolve(getChunksDir(uploadId, customRootDir), 'meta.json');
    const raw = await readFile(metaPath, 'utf-8');
    const parsed = JSON.parse(raw) as ChunkedUploadSessionMeta;
    activeSessionsById.set(uploadId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function writeSessionMeta(meta: ChunkedUploadSessionMeta, customRootDir?: string): Promise<void> {
  const dir = getChunksDir(meta.uploadId, customRootDir);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(resolve(dir, 'meta.json'), JSON.stringify(meta), { mode: 0o600 });
  activeSessionsById.set(meta.uploadId, meta);
}

function pruneExpiredUserSessions(userId: string, customRootDir?: string): void {
  const cutoff = Date.now() - SESSION_IDLE_TTL_MS;
  for (const [id, session] of activeSessionsById.entries()) {
    if (session.userId === userId && session.lastActivityMs < cutoff) {
      activeSessionsById.delete(id);
      void rm(getChunksDir(id, customRootDir), { recursive: true, force: true }).catch(() => {});
    }
  }
}

export function countActiveVideoUploadsForUser(userId: string, customRootDir?: string): number {
  const normalizedUser = String(userId);
  pruneExpiredUserSessions(normalizedUser, customRootDir);
  let count = 0;
  for (const session of activeSessionsById.values()) {
    if (session.userId === normalizedUser) count += 1;
  }
  return count;
}

export async function initChunkedVideoUpload(
  userId: string | number,
  input: InitMosChatVideoUploadRequest,
  customRootDir?: string
): Promise<InitMosChatVideoUploadResponse> {
  const normalizedUser = String(userId);
  pruneExpiredUserSessions(normalizedUser, customRootDir);

  if (countActiveVideoUploadsForUser(normalizedUser, customRootDir) >= MOS_CHAT_MAX_CONCURRENT_VIDEO_UPLOADS) {
    throw new Error(
      `Bạn đang tải lên tối đa ${MOS_CHAT_MAX_CONCURRENT_VIDEO_UPLOADS} video cùng lúc. Vui lòng đợi video hiện tại hoàn tất.`
    );
  }

  const fileName = String(input.fileName || '').trim() || `video-${Date.now()}.mp4`;
  const { ext, mimeType } = resolveVideoFormat(fileName, input.mimeType);

  const totalSizeBytes = Number(input.totalSizeBytes || 0);
  if (!Number.isFinite(totalSizeBytes) || totalSizeBytes <= 0 || totalSizeBytes > MOS_CHAT_MAX_VIDEO_BYTES) {
    throw new Error('Video quá lớn (tối đa 100MB).');
  }

  const totalChunks = Number(input.totalChunks || 0);
  if (!Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > MAX_CHUNKS_PER_UPLOAD) {
    throw new Error('Số lượng mảnh tải lên không hợp lệ.');
  }

  const uploadId = crypto.randomUUID();
  const nowMs = Date.now();
  const meta: ChunkedUploadSessionMeta = {
    uploadId,
    userId: normalizedUser,
    fileName: fileName.slice(0, 150),
    mimeType,
    ext,
    totalSizeBytes,
    totalChunks,
    createdAtMs: nowMs,
    lastActivityMs: nowMs,
    uploadedChunkIndexes: [],
    source: input.source || 'upload',
    durationSec: input.durationSec ? Number(input.durationSec) : undefined,
    width: input.width ? Number(input.width) : undefined,
    height: input.height ? Number(input.height) : undefined,
  };

  await writeSessionMeta(meta, customRootDir);

  return {
    success: true,
    uploadId,
    chunkSizeBytes: MOS_CHAT_VIDEO_CHUNK_BYTES,
    maxVideoBytes: MOS_CHAT_MAX_VIDEO_BYTES,
    expiresAt: new Date(nowMs + SESSION_IDLE_TTL_MS).toISOString(),
  };
}

export async function saveVideoUploadChunk(input: {
  userId: string | number;
  uploadId: string;
  chunkIndex: number;
  stream: NodeJS.ReadableStream;
  customRootDir?: string;
}): Promise<{ uploadId: string; chunkIndex: number; receivedBytes: number; uploadedChunks: number }> {
  const uploadId = sanitizeUploadId(input.uploadId);
  const meta = await readSessionMeta(uploadId, input.customRootDir);
  if (!meta) {
    throw new Error('Phiên tải video không tồn tại hoặc đã hết hạn.');
  }
  if (meta.userId !== String(input.userId)) {
    throw new Error('Bạn không có quyền ghi vào phiên tải video này.');
  }
  if (!Number.isInteger(input.chunkIndex) || input.chunkIndex < 0 || input.chunkIndex >= meta.totalChunks) {
    throw new Error('Chỉ số mảnh video không hợp lệ.');
  }

  const chunksDir = getChunksDir(uploadId, input.customRootDir);
  const padded = String(input.chunkIndex).padStart(5, '0');
  const tmpPartPath = resolve(chunksDir, `chunk-${padded}.part.tmp`);
  const finalPartPath = resolve(chunksDir, `chunk-${padded}.part`);

  let receivedBytes = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_SINGLE_CHUNK_BYTES) {
        callback(new Error('Dung lượng mảnh video vượt quá giới hạn 6MB.'));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(input.stream, limiter, createWriteStream(tmpPartPath, { mode: 0o600 }));
    if (receivedBytes <= 0) {
      throw new Error('Dữ liệu mảnh video bị trống.');
    }
    await rename(tmpPartPath, finalPartPath);
  } catch (err) {
    await unlink(tmpPartPath).catch(() => {});
    throw err;
  }

  if (!meta.uploadedChunkIndexes.includes(input.chunkIndex)) {
    meta.uploadedChunkIndexes.push(input.chunkIndex);
    meta.uploadedChunkIndexes.sort((a, b) => a - b);
  }
  meta.lastActivityMs = Date.now();
  await writeSessionMeta(meta, input.customRootDir);

  return {
    uploadId,
    chunkIndex: input.chunkIndex,
    receivedBytes,
    uploadedChunks: meta.uploadedChunkIndexes.length,
  };
}

export async function completeChunkedVideoUpload(input: {
  fastify?: FastifyInstance;
  userId: string | number;
  uploadId: string;
  body?: CompleteMosChatVideoUploadRequest;
  customRootDir?: string;
}): Promise<MosChatImageAttachment> {
  const uploadId = sanitizeUploadId(input.uploadId);
  const meta = await readSessionMeta(uploadId, input.customRootDir);
  if (!meta) {
    throw new Error('Phiên tải video không tồn tại hoặc đã hết hạn.');
  }
  if (meta.userId !== String(input.userId)) {
    throw new Error('Bạn không có quyền hoàn tất phiên tải video này.');
  }

  const chunksDir = getChunksDir(uploadId, input.customRootDir);
  const rootDir = input.customRootDir || mosChatMediaRoot();
  await mkdir(rootDir, { recursive: true, mode: 0o700 });

  for (let i = 0; i < meta.totalChunks; i += 1) {
    const partPath = resolve(chunksDir, `chunk-${String(i).padStart(5, '0')}.part`);
    try {
      const partStat = await stat(partPath);
      if (partStat.size <= 0) {
        throw new Error(`Mảnh video #${i + 1} bị rỗng.`);
      }
    } catch {
      throw new Error(`Thiếu mảnh video #${i + 1}/${meta.totalChunks}. Vui lòng thử tải lại.`);
    }
  }

  const fileUuid = crypto.randomUUID();
  const tmpAssembledPath = resolve(rootDir, `${fileUuid}.${meta.ext}.tmp`);
  const targetPath = resolve(rootDir, `${fileUuid}.${meta.ext}`);

  let assembledSize = 0;
  try {
    const writer = createWriteStream(tmpAssembledPath, { mode: 0o600 });
    await new Promise<void>((resolveWrite, rejectWrite) => {
      writer.on('error', rejectWrite);
      (async () => {
        for (let i = 0; i < meta.totalChunks; i += 1) {
          const partPath = resolve(chunksDir, `chunk-${String(i).padStart(5, '0')}.part`);
          await new Promise<void>((resolvePart, rejectPart) => {
            const reader = createReadStream(partPath);
            reader.on('data', (chunk) => {
              assembledSize += chunk.length;
              if (assembledSize > MOS_CHAT_MAX_VIDEO_BYTES) {
                reader.destroy(new Error('Video quá lớn (tối đa 100MB).'));
              }
            });
            reader.on('error', rejectPart);
            reader.on('end', resolvePart);
            reader.pipe(writer, { end: false });
          });
        }
        writer.end(() => resolveWrite());
      })().catch(rejectWrite);
    });

    if (assembledSize <= 0 || assembledSize > MOS_CHAT_MAX_VIDEO_BYTES) {
      throw new Error('Video quá lớn (tối đa 100MB) hoặc dữ liệu trống.');
    }

    await validateVideoFileMagicBytes(tmpAssembledPath, meta.ext);
    await rename(tmpAssembledPath, targetPath);
  } catch (err) {
    await unlink(tmpAssembledPath).catch(() => {});
    throw err;
  } finally {
    activeSessionsById.delete(uploadId);
    await rm(chunksDir, { recursive: true, force: true }).catch(() => {});
  }

  const tier1 = await runTier1VideoProcessing({
    fastify: input.fastify,
    targetPath,
    fileUuid,
    ext: meta.ext,
    sizeBytes: assembledSize,
    customRootDir: input.customRootDir,
  });

  const posterUrl =
    input.body?.posterUrl?.trim() || (tier1.posterFileName ? `/api/chat/media/${tier1.posterFileName}` : undefined);

  return {
    id: `att-${fileUuid.slice(0, 8)}`,
    url: `/api/chat/media/${tier1.finalFileName}`,
    name: meta.fileName,
    mimeType: tier1.finalMimeType,
    sizeBytes: tier1.finalSizeBytes,
    width: input.body?.width || meta.width || tier1.width,
    height: input.body?.height || meta.height || tier1.height,
    durationSec: input.body?.durationSec || meta.durationSec || tier1.durationSec,
    posterUrl,
    isVideo: true,
    source: input.body?.source || meta.source || 'upload',
    fileExt: tier1.finalExt,
    isProcessing: tier1.isProcessing ? true : undefined,
    processingStatus: tier1.processingStatus,
  };
}

export async function abortChunkedVideoUpload(
  userId: string | number,
  uploadId: string,
  customRootDir?: string
): Promise<void> {
  const safeId = sanitizeUploadId(uploadId);
  const meta = await readSessionMeta(safeId, customRootDir);
  if (meta && meta.userId !== String(userId)) {
    throw new Error('Bạn không có quyền hủy phiên tải video này.');
  }
  activeSessionsById.delete(safeId);
  await rm(getChunksDir(safeId, customRootDir), { recursive: true, force: true }).catch(() => {});
}

export function clearActiveVideoUploadSessionsForTests(): void {
  activeSessionsById.clear();
}
