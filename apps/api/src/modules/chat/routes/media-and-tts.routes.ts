import crypto from 'crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type {
  CompleteMosChatVideoUploadRequest,
  InitMosChatVideoUploadRequest,
  MosChatImageAttachment,
  SafeAny,
  UploadMosChatImageRequest,
  UploadMosChatImageResponse,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { TelesaleTargetService } from '../../kpi/services/telesale-target.service.js';
import {
  CHAT_IMAGE_BODY_LIMIT,
  EXT_TO_CHAT_MIME,
  MAX_CHAT_VIDEO_BYTES,
  mosChatMediaRoot,
  decodeAndValidateChatFile,
  resolveVideoFormat,
  validateVideoFileMagicBytes,
} from '../chat-file.service.js';
import {
  abortChunkedVideoUpload,
  completeChunkedVideoUpload,
  initChunkedVideoUpload,
  saveVideoUploadChunk,
} from '../chat-video-chunk.service.js';
import { runTier1VideoProcessing, startChatMediaTempCleanupScheduler } from '../chat-video-processor.service.js';

export async function registerChatMediaAndTtsRoutes(fastify: FastifyInstance) {
  startChatMediaTempCleanupScheduler();
  const handleUploadChatFile = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as UploadMosChatImageRequest;
      const { buffer, finalMimeType, ext } = await decodeAndValidateChatFile(body);

      const fileUuid = crypto.randomUUID();
      const fileName = `${fileUuid}.${ext}`;
      const rootDir = mosChatMediaRoot();
      await mkdir(rootDir, { recursive: true, mode: 0o700 });
      const targetPath = resolve(rootDir, fileName);
      if (!targetPath.startsWith(`${rootDir}${sep}`)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Đường dẫn tệp không hợp lệ.' });
      }
      await writeFile(targetPath, buffer, { flag: 'wx', mode: 0o600 });

      const rawName = String(body.fileName || `file.${ext}`);
      const safeName = rawName.replace(/\.(heic|heif)$/i, `.${ext}`).slice(0, 150);
      const isVideo = finalMimeType.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext);

      const attachment: MosChatImageAttachment = {
        id: `att-${fileUuid.slice(0, 8)}`,
        url: `/api/chat/media/${fileName}`,
        name: safeName,
        mimeType: finalMimeType,
        sizeBytes: buffer.length,
        width: body.width ? Number(body.width) : undefined,
        height: body.height ? Number(body.height) : undefined,
        durationSec: body.durationSec ? Number(body.durationSec) : undefined,
        posterUrl: body.posterUrl ? String(body.posterUrl).trim() : undefined,
        isVideo: isVideo ? true : undefined,
        source: body.source || 'upload',
        fileExt: ext,
      };
      const response: UploadMosChatImageResponse = {
        success: true,
        attachment,
      };
      return response;
    } catch (err: SafeAny) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: err?.message || 'Không thể tải tệp lên.',
      });
    }
  };

  // POST /api/chat/upload-image
  fastify.post(
    '/chat/upload-image',
    {
      preHandler: [requireAuth],
      bodyLimit: CHAT_IMAGE_BODY_LIMIT,
    },
    handleUploadChatFile
  );

  // POST /api/chat/upload-file (MOS-BUG-147: Upload PDF, Word, Excel & general documents)
  fastify.post(
    '/chat/upload-file',
    {
      preHandler: [requireAuth],
      bodyLimit: CHAT_IMAGE_BODY_LIMIT,
    },
    handleUploadChatFile
  );

  // POST /api/chat/upload-video/init (100MB Chunked Video Upload - Step 1)
  fastify.post(
    '/chat/upload-video/init',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user as JwtUserPayload;
        const body = (request.body || {}) as InitMosChatVideoUploadRequest;
        return await initChunkedVideoUpload(user.id, body);
      } catch (err: SafeAny) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: err?.message || 'Không thể khởi tạo phiên tải video.',
        });
      }
    }
  );

  // POST /api/chat/upload-video/:uploadId/chunk (100MB Chunked Video Upload - Step 2)
  fastify.post(
    '/chat/upload-video/:uploadId/chunk',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user as JwtUserPayload;
        const { uploadId } = request.params as { uploadId: string };
        const query = (request.query || {}) as { chunkIndex?: string };
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Không tìm thấy dữ liệu mảnh video.',
          });
        }
        const fields = (data.fields || {}) as Record<string, SafeAny>;
        const rawIndex = query.chunkIndex ?? fields?.chunkIndex?.value ?? fields?.chunkIndex;
        const chunkIndex = Number(rawIndex);

        const result = await saveVideoUploadChunk({
          userId: user.id,
          uploadId,
          chunkIndex,
          stream: data.file,
        });
        return { success: true, ...result };
      } catch (err: SafeAny) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: err?.message || 'Không thể lưu mảnh video.',
        });
      }
    }
  );

  // POST /api/chat/upload-video/:uploadId/complete (100MB Chunked Video Upload - Step 3)
  fastify.post(
    '/chat/upload-video/:uploadId/complete',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user as JwtUserPayload;
        const { uploadId } = request.params as { uploadId: string };
        const body = (request.body || {}) as CompleteMosChatVideoUploadRequest;
        const attachment = await completeChunkedVideoUpload({
          fastify,
          userId: user.id,
          uploadId,
          body,
        });
        const response: UploadMosChatImageResponse = {
          success: true,
          attachment,
        };
        return response;
      } catch (err: SafeAny) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: err?.message || 'Không thể hoàn tất tải video.',
        });
      }
    }
  );

  // DELETE /api/chat/upload-video/:uploadId (Abort & cleanup chunked upload)
  fastify.delete(
    '/chat/upload-video/:uploadId',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user as JwtUserPayload;
        const { uploadId } = request.params as { uploadId: string };
        await abortChunkedVideoUpload(user.id, uploadId);
        return { success: true };
      } catch (err: SafeAny) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: err?.message || 'Không thể hủy phiên tải video.',
        });
      }
    }
  );

  // POST /api/chat/upload-video (Legacy single-request multipart upload, streamed straight to disk)
  fastify.post(
    '/chat/upload-video',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let tmpPath: string | null = null;
      try {
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Không tìm thấy tệp video được tải lên.',
          });
        }

        const originalFileName = data.filename || `video-${Date.now()}.mp4`;
        const { ext } = resolveVideoFormat(originalFileName, data.mimetype);
        const rootDir = mosChatMediaRoot();
        await mkdir(rootDir, { recursive: true, mode: 0o700 });

        const fileUuid = crypto.randomUUID();
        tmpPath = resolve(rootDir, `${fileUuid}.${ext}.tmp`);
        const targetPath = resolve(rootDir, `${fileUuid}.${ext}`);

        let streamedBytes = 0;
        const limiter = new Transform({
          transform(chunk, _encoding, callback) {
            streamedBytes += chunk.length;
            if (streamedBytes > MAX_CHAT_VIDEO_BYTES) {
              callback(new Error('Video quá lớn (tối đa 100MB).'));
              return;
            }
            callback(null, chunk);
          },
        });

        await pipeline(data.file, limiter, createWriteStream(tmpPath, { mode: 0o600 }));
        if (data.file.truncated || streamedBytes <= 0 || streamedBytes > MAX_CHAT_VIDEO_BYTES) {
          throw new Error('Video quá lớn (tối đa 100MB).');
        }
        await validateVideoFileMagicBytes(tmpPath, ext);
        await rename(tmpPath, targetPath);
        tmpPath = null;

        const tier1 = await runTier1VideoProcessing({
          fastify,
          targetPath,
          fileUuid,
          ext,
          sizeBytes: streamedBytes,
        });

        const fields = (data.fields || {}) as Record<string, SafeAny>;
        const durationSecRaw = fields?.durationSec
          ? Number(fields.durationSec?.value || fields.durationSec)
          : undefined;
        const widthRaw = fields?.width ? Number(fields.width?.value || fields.width) : undefined;
        const heightRaw = fields?.height ? Number(fields.height?.value || fields.height) : undefined;
        const posterUrlRaw = fields?.posterUrl ? String(fields.posterUrl?.value || fields.posterUrl).trim() : undefined;
        const posterUrl =
          posterUrlRaw || (tier1.posterFileName ? `/api/chat/media/${tier1.posterFileName}` : undefined);

        const safeName = originalFileName.slice(0, 150);
        const attachment: MosChatImageAttachment = {
          id: `att-${fileUuid.slice(0, 8)}`,
          url: `/api/chat/media/${tier1.finalFileName}`,
          name: safeName,
          mimeType: tier1.finalMimeType,
          sizeBytes: tier1.finalSizeBytes,
          width: widthRaw && !isNaN(widthRaw) ? widthRaw : tier1.width,
          height: heightRaw && !isNaN(heightRaw) ? heightRaw : tier1.height,
          durationSec: durationSecRaw && !isNaN(durationSecRaw) ? durationSecRaw : tier1.durationSec,
          posterUrl,
          isVideo: true,
          source: 'upload',
          fileExt: tier1.finalExt,
          isProcessing: tier1.isProcessing ? true : undefined,
          processingStatus: tier1.processingStatus,
        };

        const response: UploadMosChatImageResponse = {
          success: true,
          attachment,
        };
        return response;
      } catch (err: SafeAny) {
        if (tmpPath) {
          await unlink(tmpPath).catch(() => {});
        }
        return reply.status(400).send({
          error: 'Bad Request',
          message: err?.message || 'Không thể tải video lên.',
        });
      }
    }
  );

  // GET /api/chat/media/:fileName (MOS-CHAT-VIDEO: HTTP 206 Partial Content Range Streaming support)
  fastify.get('/chat/media/:fileName', async (request, reply) => {
    try {
      const { fileName } = request.params as { fileName: string };
      const normalized = String(fileName || '').trim();
      const match = normalized.match(/^([a-f0-9-]{36})\.([a-z0-9]{2,6})$/i);
      if (!match) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tệp đính kèm.' });
      }
      const ext = match[2].toLowerCase();
      if (!(ext in EXT_TO_CHAT_MIME)) {
        return reply.status(404).send({ error: 'Not Found', message: 'Định dạng tệp không được hỗ trợ.' });
      }
      let resolvedFileName = normalized;
      let resolvedExt = ext;
      const rootDir = mosChatMediaRoot();
      let targetPath = resolve(rootDir, resolvedFileName);
      if (!targetPath.startsWith(`${rootDir}${sep}`)) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tệp đính kèm.' });
      }

      let fileStat;
      try {
        fileStat = await stat(targetPath);
      } catch {
        // Automatic fallback: If .mp4 was requested but only .mov exists, or vice versa
        if (ext === 'mp4') {
          const fallbackMov = `${match[1]}.mov`;
          const fallbackPath = resolve(rootDir, fallbackMov);
          try {
            fileStat = await stat(fallbackPath);
            targetPath = fallbackPath;
            resolvedFileName = fallbackMov;
            resolvedExt = 'mov';
          } catch {
            return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tệp đính kèm.' });
          }
        } else if (ext === 'mov' || ext === 'm4v' || ext === 'webm') {
          const fallbackMp4 = `${match[1]}.mp4`;
          const fallbackPath = resolve(rootDir, fallbackMp4);
          try {
            fileStat = await stat(fallbackPath);
            targetPath = fallbackPath;
            resolvedFileName = fallbackMp4;
            resolvedExt = 'mp4';
          } catch {
            return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tệp đính kèm.' });
          }
        } else {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tệp đính kèm.' });
        }
      }

      const mimeType = EXT_TO_CHAT_MIME[resolvedExt] || 'application/octet-stream';
      const totalSize = fileStat.size;
      const rangeHeader = request.headers.range;

      if (rangeHeader && typeof rangeHeader === 'string' && rangeHeader.startsWith('bytes=')) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (isNaN(start) || start >= totalSize || end >= totalSize || start > end) {
          reply.header('Content-Range', `bytes */${totalSize}`);
          return reply.status(416).send({ error: 'Range Not Satisfiable' });
        }

        const chunkSize = end - start + 1;
        const stream = createReadStream(targetPath, { start, end });

        reply.status(206);
        reply.header('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        reply.header('Accept-Ranges', 'bytes');
        reply.header('Content-Length', chunkSize);
        reply.header('Content-Type', mimeType);
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');
        return reply.send(stream);
      }

      reply.header('Content-Type', mimeType);
      reply.header('Accept-Ranges', 'bytes');
      reply.header('Content-Length', totalSize);
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(normalized)}"`);

      const stream = createReadStream(targetPath);
      return reply.send(stream);
    } catch {
      return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy tệp đính kèm.' });
    }
  });

  // Helper for cleaning text before TTS synthesis
  function cleanChatTextForTts(text: string): string {
    if (!text) return '';
    return text
      .replace(/<thinking[\s\S]*?<\/thinking>/gi, '')
      .replace(/<thinking[\s\S]*$/gi, '')
      .replace(/<action[\s\S]*?<\/action>/gi, '')
      .replace(/<\/?action[^>]*>/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[*#_~>|]/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 4000);
  }

  function convertSpeedToRate(speed?: number | string, rate?: string): string {
    if (rate && String(rate).trim()) return String(rate).trim();
    if (speed !== undefined && speed !== null && speed !== '') {
      const s = typeof speed === 'string' ? parseFloat(speed) : speed;
      if (!isNaN(s) && s > 0) {
        const pct = Math.round((s - 1.0) * 100);
        return pct >= 0 ? `+${pct}%` : `${pct}%`;
      }
    }
    return '+0%';
  }

  const handleChatTtsRequest = async (
    params: {
      text?: string;
      voice?: string;
      speed?: string | number;
      rate?: string;
      pitch?: string;
    },
    reply: FastifyReply
  ) => {
    const rawText = params.text || '';
    const cleanText = cleanChatTextForTts(rawText);
    if (!cleanText) {
      return reply.status(400).send({ error: 'Text is required' });
    }

    const voice = (params.voice || 'vi-VN-HoaiMyNeural').trim();
    const rate = convertSpeedToRate(params.speed, params.rate);
    const pitch = (params.pitch || '+0Hz').trim();

    try {
      const audioBuffer = await TelesaleTargetService.synthesizeCelebrationAudio(cleanText, voice, rate, pitch);
      return reply
        .header('Content-Type', 'audio/mpeg')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .header('Access-Control-Allow-Origin', '*')
        .header('Accept-Ranges', 'bytes')
        .header('Cache-Control', 'public, max-age=86400')
        .send(audioBuffer);
    } catch (err: SafeAny) {
      fastify.log.error(`Failed to synthesize chat tts audio: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to synthesize chat tts audio' });
    }
  };

  // GET /api/chat/tts - Neural TTS stream with Hoai My voice & customizable playback speed
  fastify.get('/chat/tts', async (request, reply) => {
    return handleChatTtsRequest(request.query as SafeAny, reply);
  });

  // POST /api/chat/tts - Neural TTS stream via JSON body (no URL length constraints)
  fastify.post('/chat/tts', async (request, reply) => {
    return handleChatTtsRequest((request.body || {}) as SafeAny, reply);
  });
}
