import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import {
  TelesalePipelineStageKey,
  TelesaleTargetConfigDto,
  TelesaleTargetCloneDto,
  isAdminOrSuperAdminRole,
  TelesaleTvEventLog,
} from '@mos-lab/shared';
import { TelesaleTargetService } from '../services/telesale-target.service.js';

export async function registerTelesaleTargetRoutes(fastify: FastifyInstance) {
  // 1. Get Overview Metrics
  fastify.get('/kpi/telesale-target', { preHandler: [requireAuth] }, async (request, reply) => {
    const { month } = request.query as { month?: string };
    const user = (request as any).user;
    const currentStaffId = user?.staffId || user?.id;

    try {
      const data = await TelesaleTargetService.getOverview(fastify, month || '2026-10', currentStaffId);
      return reply.send(data);
    } catch (err: any) {
      fastify.log.error(`Failed to get telesale target overview: ${err.message}`);
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });

  // 2. List Configured Months
  fastify.get('/kpi/telesale-target/months', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const months = await TelesaleTargetService.listConfiguredMonths(fastify);
      return reply.send({ months });
    } catch (err: any) {
      fastify.log.error(`Failed to list telesale months: ${err.message}`);
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });

  // 3. Clone Target Config from Month to Month
  fastify.post('/kpi/telesale-target/clone', { preHandler: [requireAuth] }, async (request, reply) => {
    const { sourceMonth, targetMonth, overwrite } = request.body as TelesaleTargetCloneDto;

    try {
      if (!sourceMonth || !targetMonth) {
        return reply.status(400).send({
          error: 'Cần cung cấp cả tháng nguồn (sourceMonth) và tháng đích (targetMonth)',
        });
      }

      const cloned = await TelesaleTargetService.cloneConfig(fastify, sourceMonth, targetMonth, Boolean(overwrite));
      return reply.send({ success: true, config: cloned });
    } catch (err: any) {
      fastify.log.error(`Failed to clone telesale target config: ${err.message}`);
      return reply.status(400).send({ error: err.message });
    }
  });

  // 4. Save Target Config (Manager/Admin)
  fastify.post('/kpi/telesale-target/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as TelesaleTargetConfigDto;

    try {
      if (!body.month || !body.teamDoneTarget || !body.stageTargets) {
        return reply.status(400).send({ error: 'Thiếu thông tin cấu hình bắt buộc' });
      }

      const saved = await TelesaleTargetService.saveConfig(fastify, body);
      return reply.send({ success: true, config: saved });
    } catch (err: any) {
      fastify.log.error(`Failed to save telesale target config: ${err.message}`);
      return reply.status(400).send({ error: err.message });
    }
  });

  // 3. Get Customer Pool for Stage
  fastify.get('/kpi/telesale-target/pool', { preHandler: [requireAuth] }, async (request, reply) => {
    const { stage, bookerId, limit, offset } = request.query as {
      stage?: TelesalePipelineStageKey;
      bookerId?: string;
      limit?: string;
      offset?: string;
    };

    if (!stage || !['0_30', '31_60', '61_120', 'gt_120'].includes(stage)) {
      return reply.status(400).send({ error: 'Stage không hợp lệ' });
    }

    const parsedBookerId = bookerId && bookerId !== 'ALL' ? parseInt(bookerId, 10) : undefined;
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    try {
      const pool = await TelesaleTargetService.getCustomerPool(
        fastify,
        stage,
        parsedBookerId,
        parsedLimit,
        parsedOffset
      );
      return reply.send(pool);
    } catch (err: any) {
      fastify.log.error(`Failed to get customer pool: ${err.message}`);
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });

  // 5. Realtime WebSocket stream for TV Monitor Live Celebration & Pacing
  const tvSockets = new Set<any>();

  fastify.get('/kpi/telesale-target/stream', { websocket: true }, (socket) => {
    tvSockets.add(socket);
    try {
      socket.send(JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() }));
    } catch {
      // ignore
    }

    socket.on('message', (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'PING') {
          socket.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
        }
      } catch {
        // ignore
      }
    });

    socket.on('close', () => tvSockets.delete(socket));
    socket.on('error', () => tvSockets.delete(socket));
  });

  // 6. Generate Live Celebration Quote with Gemini AI & Wings Culture (Nam thần quyến rũ + Fallback)
  fastify.post('/kpi/telesale-target/live-celebration-quote', { preHandler: [requireAuth] }, async (request, reply) => {
    const { type, staffName } = (request.body as { type?: 'BOOK' | 'DONE'; staffName?: string }) || {};
    try {
      const result = await TelesaleTargetService.generateLiveCelebrationQuote(
        fastify,
        type === 'DONE' ? 'DONE' : 'BOOK',
        staffName || 'Bạn Telesales'
      );
      return reply.send(result);
    } catch (err: any) {
      fastify.log.error(`Failed to generate celebration quote: ${err.message}`);
      return reply.send({
        quote: TelesaleTargetService.getFallbackCelebrationQuote(
          type === 'DONE' ? 'DONE' : 'BOOK',
          staffName || 'Bạn Telesales'
        ),
        source: 'fallback',
      });
    }
  });

  // 7. Synthesize Studio Neural Audio for Live Celebration (Nam Minh / Hoài My)
  fastify.get('/kpi/telesale-target/live-celebration-audio', async (request, reply) => {
    const query = request.query as { text?: string; voice?: string };
    const text = (query.text || '').trim();
    const voice = query.voice || 'vi-VN-NamMinhNeural';

    if (!text) {
      return reply.status(400).send({ error: 'Text is required' });
    }

    try {
      const audioBuffer = await TelesaleTargetService.synthesizeCelebrationAudio(text, voice);
      return reply
        .header('Content-Type', 'audio/mpeg')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .header('Access-Control-Allow-Origin', '*')
        .header('Accept-Ranges', 'bytes')
        .header('Cache-Control', 'public, max-age=86400')
        .send(audioBuffer);
    } catch (err: any) {
      fastify.log.error(`Failed to synthesize celebration audio: ${err.message}`);
      return reply.status(500).send({ error: 'Failed to synthesize celebration audio' });
    }
  });

  // 8. TV Monitor Live Journal (Nhật ký TV Monitor - Manager/Admin Only)
  fastify.get('/kpi/telesale-target/tv-journal', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user;
    const isManagerOrAdmin = isAdminOrSuperAdminRole(user?.role) || user?.role === 'manager';

    if (!isManagerOrAdmin) {
      return reply.status(403).send({
        error: 'Chỉ Manager và Admin mới có quyền truy cập Nhật ký TV Monitor',
      });
    }

    const { date } = request.query as { date?: string };
    try {
      const journal = await TelesaleTargetService.getTvJournal(fastify, date);
      return reply.send(journal);
    } catch (err: any) {
      fastify.log.error(`Failed to get TV journal: ${err.message}`);
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });

  // 9. Sync Live Event Execution Status from TV Monitor Client
  fastify.post('/kpi/telesale-target/tv-journal/sync', { preHandler: [requireAuth] }, async (request, reply) => {
    const { records } = (request.body as { records?: TelesaleTvEventLog[] }) || {};
    try {
      const result = TelesaleTargetService.recordTvJournalSync(records || []);
      return reply.send(result);
    } catch (err: any) {
      fastify.log.error(`Failed to sync TV journal execution status: ${err.message}`);
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });
}

