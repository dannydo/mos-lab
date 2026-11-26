import { execFile } from 'node:child_process';
import { readdir, rename, rm, stat, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import type { MosChatImageAttachment, MosChatMessage, MosChatThreadReply } from '@mos-lab/shared';
import { EXT_TO_CHAT_MIME, mosChatMediaRoot } from './chat-file.service.js';
import { chatRealtimeHub } from './chat-realtime.hub.js';
import { withChatMutationLock } from './chat-repository.service.js';
import { loadChatState, saveConversations } from './chat-state-store.js';

const execFileAsync = promisify(execFile);

const FAST_REMUX_MAX_BYTES = 35 * 1024 * 1024;
const MAX_VIDEO_WIDTH = 1920;
const MAX_VIDEO_HEIGHT = 1080;
const CHUNK_STALE_MS = 24 * 60 * 60 * 1000;
const TEMP_FILE_STALE_MS = 6 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const TRACKER_TTL_MS = 2 * 60 * 60 * 1000;

interface VideoProbeMetadata {
  videoCodec?: string;
  audioCodec?: string;
  width?: number;
  height?: number;
  durationSec?: number;
}

export interface VideoAttachmentPatch {
  url?: string;
  mimeType?: string;
  fileExt?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  posterUrl?: string;
  isProcessing?: boolean;
  processingStatus?: string;
  processedAt: string;
}

interface VideoProcessingRecord {
  status: 'processing' | 'ready' | 'failed';
  patch?: VideoAttachmentPatch;
  updatedAt: number;
}

interface QueuedTranscodeJob {
  fastify: FastifyInstance;
  fileUuid: string;
  targetPath: string;
  ext: string;
  posterFileName?: string;
  probe: VideoProbeMetadata;
}

const processingTracker = new Map<string, VideoProcessingRecord>();
const pendingJobs: QueuedTranscodeJob[] = [];
let activeJobsCount = 0;
let cleanupSchedulerStarted = false;

function getMaxConcurrentJobs(): number {
  const configured = Number(process.env.MOS_CHAT_VIDEO_CONCURRENCY || 2);
  if (!Number.isFinite(configured) || configured < 1) return 2;
  return Math.min(4, Math.floor(configured));
}

function pruneTracker(): void {
  const cutoff = Date.now() - TRACKER_TTL_MS;
  for (const [key, entry] of processingTracker.entries()) {
    if (entry.updatedAt < cutoff && entry.status !== 'processing') {
      processingTracker.delete(key);
    }
  }
}

export function reconcileAttachmentProcessingState(att: MosChatImageAttachment): MosChatImageAttachment {
  if (!att?.url || !att.isVideo) return att;
  const match = att.url.trim().match(/^\/api\/chat\/media\/([a-f0-9-]{36})\.[a-z0-9]{2,6}$/i);
  if (!match) return att;

  const fileUuid = match[1];
  const record = processingTracker.get(fileUuid);
  if (!record || !record.patch) return att;

  return {
    ...att,
    url: record.patch.url ?? att.url,
    mimeType: record.patch.mimeType ?? att.mimeType,
    fileExt: record.patch.fileExt ?? att.fileExt,
    sizeBytes: record.patch.sizeBytes ?? att.sizeBytes,
    width: record.patch.width ?? att.width,
    height: record.patch.height ?? att.height,
    durationSec: record.patch.durationSec ?? att.durationSec,
    posterUrl: record.patch.posterUrl ?? att.posterUrl,
    isProcessing: record.patch.isProcessing,
    processingStatus: record.patch.processingStatus,
    processedAt: record.patch.processedAt,
  };
}

async function probeVideoFile(targetPath: string): Promise<VideoProbeMetadata> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration:stream=codec_type,codec_name,width,height',
        '-of',
        'json',
        targetPath,
      ],
      { timeout: 10_000 }
    );
    const parsed = JSON.parse(stdout || '{}') as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
    };
    const videoStream = (parsed.streams || []).find((s) => s.codec_type === 'video');
    const audioStream = (parsed.streams || []).find((s) => s.codec_type === 'audio');
    const durationNum = parsed.format?.duration ? Math.round(Number(parsed.format.duration)) : undefined;
    return {
      videoCodec: videoStream?.codec_name?.toLowerCase(),
      audioCodec: audioStream?.codec_name?.toLowerCase(),
      width: videoStream?.width ? Number(videoStream.width) : undefined,
      height: videoStream?.height ? Number(videoStream.height) : undefined,
      durationSec: durationNum && Number.isFinite(durationNum) && durationNum > 0 ? durationNum : undefined,
    };
  } catch {
    return {};
  }
}

async function extractVideoPoster(targetPath: string, rootDir: string, fileUuid: string): Promise<string | undefined> {
  const posterFileName = `${fileUuid}.jpg`;
  const posterPath = resolve(rootDir, posterFileName);

  for (const seekTime of ['00:00:00.500', '00:00:00.000']) {
    try {
      await execFileAsync(
        'ffmpeg',
        ['-ss', seekTime, '-i', targetPath, '-vframes', '1', '-q:v', '2', '-y', posterPath],
        { timeout: 15_000 }
      );
      const info = await stat(posterPath);
      if (info.size > 0) return posterFileName;
    } catch {
      // try next timestamp
    }
  }
  return undefined;
}

function isWithin1080p(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  const maxDim = Math.max(width, height);
  const minDim = Math.min(width, height);
  return maxDim <= MAX_VIDEO_WIDTH && minDim <= MAX_VIDEO_HEIGHT;
}

function isBrowserFriendlyH264(probe: VideoProbeMetadata): boolean {
  if (probe.videoCodec !== 'h264') return false;
  if (probe.audioCodec && !['aac', 'mp3'].includes(probe.audioCodec)) return false;
  return isWithin1080p(probe.width, probe.height);
}

async function syncProcessedVideoToChatState(
  fastify: FastifyInstance,
  fileUuid: string,
  patch: VideoAttachmentPatch
): Promise<void> {
  const needle = `/api/chat/media/${fileUuid}.`;

  await withChatMutationLock(async () => {
    const { conversations } = await loadChatState(fastify);

    for (const conv of conversations) {
      for (const msg of conv.messages || []) {
        let updatedRoot = false;
        if (Array.isArray(msg.attachments)) {
          const nextAtts = msg.attachments.map((att) => {
            if (!att?.url?.includes(needle)) return att;
            updatedRoot = true;
            return {
              ...att,
              url: patch.url ?? att.url,
              mimeType: patch.mimeType ?? att.mimeType,
              fileExt: patch.fileExt ?? att.fileExt,
              sizeBytes: patch.sizeBytes ?? att.sizeBytes,
              width: patch.width ?? att.width,
              height: patch.height ?? att.height,
              durationSec: patch.durationSec ?? att.durationSec,
              posterUrl: patch.posterUrl ?? att.posterUrl,
              isProcessing: patch.isProcessing,
              processingStatus: patch.processingStatus,
              processedAt: patch.processedAt,
            };
          });
          if (updatedRoot) {
            msg.attachments = nextAtts;
            conv.updatedAt = patch.processedAt;
            await saveConversations(fastify, conversations, {
              touchedConversation: conv,
              touchedMessage: msg as MosChatMessage,
            });
            chatRealtimeHub.publish({
              type: 'MESSAGE_UPDATED',
              conversationId: conv.id,
              payload: {
                conversationId: conv.id,
                messageId: msg.id,
                message: msg,
                target: msg,
              },
            });
          }
        }

        for (const reply of msg.thread || []) {
          if (!Array.isArray(reply.attachments)) continue;
          let updatedReply = false;
          const nextReplyAtts = reply.attachments.map((att) => {
            if (!att?.url?.includes(needle)) return att;
            updatedReply = true;
            return {
              ...att,
              url: patch.url ?? att.url,
              mimeType: patch.mimeType ?? att.mimeType,
              fileExt: patch.fileExt ?? att.fileExt,
              sizeBytes: patch.sizeBytes ?? att.sizeBytes,
              width: patch.width ?? att.width,
              height: patch.height ?? att.height,
              durationSec: patch.durationSec ?? att.durationSec,
              posterUrl: patch.posterUrl ?? att.posterUrl,
              isProcessing: patch.isProcessing,
              processingStatus: patch.processingStatus,
              processedAt: patch.processedAt,
            };
          });
          if (updatedReply) {
            reply.attachments = nextReplyAtts;
            conv.updatedAt = patch.processedAt;
            await saveConversations(fastify, conversations, {
              touchedConversation: conv,
              touchedMessage: msg as MosChatMessage,
              touchedReply: {
                conversationId: conv.id,
                parentMessageId: msg.id,
                reply: reply as MosChatThreadReply,
              },
            });
            chatRealtimeHub.publish({
              type: 'MESSAGE_UPDATED',
              conversationId: conv.id,
              payload: {
                conversationId: conv.id,
                messageId: msg.id,
                replyId: reply.id,
                target: reply,
              },
            });
          }
        }
      }
    }
  });
}

async function runTier2Job(job: QueuedTranscodeJob): Promise<void> {
  const rootDir = mosChatMediaRoot();
  const optPath = resolve(rootDir, `${job.fileUuid}.opt.mp4`);
  const finalMp4Name = `${job.fileUuid}.mp4`;
  const finalMp4Path = resolve(rootDir, finalMp4Name);

  try {
    await execFileAsync(
      'ffmpeg',
      [
        '-threads',
        '2',
        '-i',
        job.targetPath,
        '-vf',
        `scale='min(${MAX_VIDEO_WIDTH},iw)':'min(${MAX_VIDEO_HEIGHT},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '24',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        '-y',
        optPath,
      ],
      { timeout: 300_000 }
    );

    const optStat = await stat(optPath);
    if (optStat.size <= 0) {
      throw new Error('Optimized video output is empty.');
    }

    await rename(optPath, finalMp4Path);
    if (job.targetPath !== finalMp4Path) {
      await unlink(job.targetPath).catch(() => {});
    }

    const finalProbe = await probeVideoFile(finalMp4Path);
    const nowIso = new Date().toISOString();
    const patch: VideoAttachmentPatch = {
      url: `/api/chat/media/${finalMp4Name}`,
      mimeType: EXT_TO_CHAT_MIME.mp4,
      fileExt: 'mp4',
      sizeBytes: optStat.size,
      width: finalProbe.width ?? job.probe.width,
      height: finalProbe.height ?? job.probe.height,
      durationSec: finalProbe.durationSec ?? job.probe.durationSec,
      posterUrl: job.posterFileName ? `/api/chat/media/${job.posterFileName}` : undefined,
      isProcessing: false,
      processingStatus: undefined,
      processedAt: nowIso,
    };
    processingTracker.set(job.fileUuid, { status: 'ready', patch, updatedAt: Date.now() });
    await syncProcessedVideoToChatState(job.fastify, job.fileUuid, patch);
  } catch (err) {
    await unlink(optPath).catch(() => {});
    job.fastify.log?.warn?.({ err, fileUuid: job.fileUuid }, 'Tier 2 chat video optimization failed; keeping original');
    const nowIso = new Date().toISOString();
    const fallbackPatch: VideoAttachmentPatch = {
      isProcessing: false,
      processingStatus: undefined,
      processedAt: nowIso,
    };
    processingTracker.set(job.fileUuid, { status: 'failed', patch: fallbackPatch, updatedAt: Date.now() });
    await syncProcessedVideoToChatState(job.fastify, job.fileUuid, fallbackPatch).catch(() => {});
  } finally {
    pruneTracker();
  }
}

function drainQueue(): void {
  const maxConcurrent = getMaxConcurrentJobs();
  while (activeJobsCount < maxConcurrent && pendingJobs.length > 0) {
    const nextJob = pendingJobs.shift();
    if (!nextJob) break;
    activeJobsCount += 1;
    void runTier2Job(nextJob).finally(() => {
      activeJobsCount = Math.max(0, activeJobsCount - 1);
      drainQueue();
    });
  }
}

export async function runTier1VideoProcessing(input: {
  fastify?: FastifyInstance;
  targetPath: string;
  fileUuid: string;
  ext: string;
  sizeBytes: number;
  customRootDir?: string;
}): Promise<{
  finalFileName: string;
  finalMimeType: string;
  finalExt: string;
  finalSizeBytes: number;
  posterFileName?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  isProcessing: boolean;
  processingStatus?: string;
}> {
  const rootDir = input.customRootDir || mosChatMediaRoot();
  const [posterFileName, probe] = await Promise.all([
    extractVideoPoster(input.targetPath, rootDir, input.fileUuid),
    probeVideoFile(input.targetPath),
  ]);

  const canFastRemux = isBrowserFriendlyH264(probe) && input.sizeBytes <= FAST_REMUX_MAX_BYTES;
  if (canFastRemux && ['mp4', 'mov', 'm4v'].includes(input.ext)) {
    const fastPath = resolve(rootDir, `${input.fileUuid}.fast.mp4`);
    const finalMp4Name = `${input.fileUuid}.mp4`;
    const finalMp4Path = resolve(rootDir, finalMp4Name);
    try {
      await execFileAsync(
        'ffmpeg',
        ['-i', input.targetPath, '-c:v', 'copy', '-c:a', 'copy', '-movflags', '+faststart', '-y', fastPath],
        { timeout: 20_000 }
      );
      const fastStat = await stat(fastPath);
      if (fastStat.size > 0) {
        await rename(fastPath, finalMp4Path);
        if (input.targetPath !== finalMp4Path) {
          await unlink(input.targetPath).catch(() => {});
        }
        return {
          finalFileName: finalMp4Name,
          finalMimeType: EXT_TO_CHAT_MIME.mp4,
          finalExt: 'mp4',
          finalSizeBytes: fastStat.size,
          posterFileName,
          width: probe.width,
          height: probe.height,
          durationSec: probe.durationSec,
          isProcessing: false,
        };
      }
    } catch {
      await unlink(fastPath).catch(() => {});
    }
  }

  const shouldQueueBackground = Boolean(input.fastify);
  if (shouldQueueBackground && input.fastify) {
    processingTracker.set(input.fileUuid, {
      status: 'processing',
      updatedAt: Date.now(),
    });
    pendingJobs.push({
      fastify: input.fastify,
      fileUuid: input.fileUuid,
      targetPath: input.targetPath,
      ext: input.ext,
      posterFileName,
      probe,
    });
    drainQueue();
    return {
      finalFileName: `${input.fileUuid}.${input.ext}`,
      finalMimeType: EXT_TO_CHAT_MIME[input.ext] || 'video/mp4',
      finalExt: input.ext,
      finalSizeBytes: input.sizeBytes,
      posterFileName,
      width: probe.width,
      height: probe.height,
      durationSec: probe.durationSec,
      isProcessing: true,
      processingStatus: 'Đang tối ưu video (MP4 1080p)...',
    };
  }

  return {
    finalFileName: `${input.fileUuid}.${input.ext}`,
    finalMimeType: EXT_TO_CHAT_MIME[input.ext] || 'video/mp4',
    finalExt: input.ext,
    finalSizeBytes: input.sizeBytes,
    posterFileName,
    width: probe.width,
    height: probe.height,
    durationSec: probe.durationSec,
    isProcessing: false,
  };
}

export async function cleanupStaleChatMediaTempFiles(customRootDir?: string): Promise<{
  removedChunkDirs: number;
  removedTempFiles: number;
}> {
  const rootDir = customRootDir || mosChatMediaRoot();
  const now = Date.now();
  let removedChunkDirs = 0;
  let removedTempFiles = 0;

  const chunksRoot = resolve(rootDir, '.chunks');
  try {
    const entries = await readdir(chunksRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = resolve(chunksRoot, entry.name);
      try {
        const info = await stat(dirPath);
        if (now - info.mtimeMs > CHUNK_STALE_MS) {
          await rm(dirPath, { recursive: true, force: true });
          removedChunkDirs += 1;
        }
      } catch {
        // ignore individual stat/rm failures
      }
    }
  } catch {
    // .chunks directory may not exist yet
  }

  try {
    const rootEntries = await readdir(rootDir, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (!entry.isFile()) continue;
      const isStaleTemp =
        entry.name.endsWith('.opt.mp4') || entry.name.endsWith('.fast.mp4') || entry.name.endsWith('.tmp');
      if (!isStaleTemp) continue;
      const filePath = resolve(rootDir, entry.name);
      try {
        const info = await stat(filePath);
        if (now - info.mtimeMs > TEMP_FILE_STALE_MS) {
          await unlink(filePath);
          removedTempFiles += 1;
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // root dir may not exist yet
  }

  return { removedChunkDirs, removedTempFiles };
}

export function startChatMediaTempCleanupScheduler(): void {
  if (cleanupSchedulerStarted) return;
  cleanupSchedulerStarted = true;
  void cleanupStaleChatMediaTempFiles().catch(() => {});
  const timer = setInterval(() => {
    void cleanupStaleChatMediaTempFiles().catch(() => {});
  }, CLEANUP_INTERVAL_MS);
  timer.unref?.();
}
