import crypto from 'crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type {
  MosChatImageAttachment,
  SafeAny,
  UploadMosChatImageRequest,
  UploadMosChatImageResponse,
} from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { TelesaleTargetService } from '../../kpi/services/telesale-target.service.js';
import {
  CHAT_IMAGE_BODY_LIMIT,
  EXT_TO_CHAT_MIME,
  mosChatMediaRoot,
  decodeAndValidateChatFile,
  saveChatVideoBuffer,
} from '../chat-file.service.js';

export async function registerChatMediaAndTtsRoutes(fastify: FastifyInstance) {
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

  // POST /api/chat/upload-video (MOS-CHAT-VIDEO: Multipart video streaming upload)
  fastify.post(
    '/chat/upload-video',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Không tìm thấy tệp video được tải lên.',
          });
        }

        const buffer = await data.toBuffer();
        const originalFileName = data.filename || `video-${Date.now()}.mp4`;
        const mimeType = data.mimetype;

        const {
          fileName,
          mimeType: finalMime,
          ext,
          posterFileName,
        } = await saveChatVideoBuffer(buffer, originalFileName, mimeType);

        const fields = (data.fields || {}) as Record<string, SafeAny>;
        const durationSecRaw = fields?.durationSec
          ? Number(fields.durationSec?.value || fields.durationSec)
          : undefined;
        const widthRaw = fields?.width ? Number(fields.width?.value || fields.width) : undefined;
        const heightRaw = fields?.height ? Number(fields.height?.value || fields.height) : undefined;
        const posterUrlRaw = fields?.posterUrl ? String(fields.posterUrl?.value || fields.posterUrl).trim() : undefined;
        const posterUrl = posterUrlRaw || (posterFileName ? `/api/chat/media/${posterFileName}` : undefined);

        const fileUuid = fileName.split('.')[0];
        const safeName = originalFileName.slice(0, 150);

        const attachment: MosChatImageAttachment = {
          id: `att-${fileUuid.slice(0, 8)}`,
          url: `/api/chat/media/${fileName}`,
          name: safeName,
          mimeType: finalMime,
          sizeBytes: buffer.length,
          width: widthRaw && !isNaN(widthRaw) ? widthRaw : undefined,
          height: heightRaw && !isNaN(heightRaw) ? heightRaw : undefined,
          durationSec: durationSecRaw && !isNaN(durationSecRaw) ? durationSecRaw : undefined,
          posterUrl,
          isVideo: true,
          source: 'upload',
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
        } else if (ext === 'mov') {
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
