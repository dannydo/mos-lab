import { FastifyInstance } from 'fastify';
import { BkGameCreateInput, BkGameFinalizeInput, BkGameUpdateInput, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { BkGameService } from '../../services/bk-game.service.js';

function parseGameIdParam(id: string): number | null {
  const gameId = parseInt(id, 10);
  return isNaN(gameId) ? null : gameId;
}

export function registerBkGameRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════════
  // Game BK Module Endpoints
  // ═══════════════════════════════════════════

  // GET /kpi/bk/games
  fastify.get('/kpi/bk/games', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { status } = request.query as { status?: string };
      const result = await BkGameService.getGames(fastify, status);
      return reply.send(result);
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK games');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải danh sách Game BK.' });
    }
  });

  // GET /kpi/bk/games/:id
  fastify.get('/kpi/bk/games/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const gameId = parseGameIdParam(id);
      if (gameId === null) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID Game không hợp lệ.' });
      }

      const result = await BkGameService.getGameDetail(fastify, gameId);
      if (!result) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy Game BK.' });
      }

      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return reply.send(result);
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK game detail');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết Game BK.' });
    }
  });

  // GET /kpi/bk/games/:id/done-bonuses
  fastify.get('/kpi/bk/games/:id/done-bonuses', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const gameId = parseGameIdParam(id);
      if (gameId === null) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID Game không hợp lệ.' });
      }

      await BkGameService.syncGameDoneBonuses(fastify, gameId);

      const bonuses = await fastify.prisma.crm.crmBkGameDoneBonus.findMany({
        where: { gameId },
        orderBy: [{ orderCompletedAt: 'desc' }, { id: 'desc' }],
      });

      return reply.send({ data: bonuses, total: bonuses.length });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK game done bonuses');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải danh sách Bonus Done.' });
    }
  });

  // GET /kpi/bk/games/:id/team-booking-done-bonuses
  fastify.get('/kpi/bk/games/:id/team-booking-done-bonuses', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const gameId = parseGameIdParam(id);
      if (gameId === null) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID Game không hợp lệ.' });
      }

      const detail = await BkGameService.getGameDetail(fastify, gameId);
      if (!detail) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy Game BK.' });
      }

      const summary = detail.teamBookingDoneBonusSummary || null;
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return reply.send({
        summary,
        data: summary?.records || [],
        total: summary?.records?.length || 0,
      });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK game team booking done bonuses');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Lỗi tải danh sách thưởng Done theo mốc Booking Team.' });
    }
  });

  // POST /kpi/bk/games
  fastify.post('/kpi/bk/games', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const body = request.body as BkGameCreateInput;
      const user = request.user;
      const creatorStaffId = user?.id || 1;

      const createdGame = await BkGameService.createGame(fastify, body, creatorStaffId);
      return reply.status(201).send({ success: true, game: createdGame });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error creating BK game');
      return reply.status(400).send({
        error: 'Bad Request',
        message: err instanceof Error ? err.message : 'Lỗi tạo Game BK mới.',
      });
    }
  });

  // PATCH /kpi/bk/games/:id
  fastify.patch('/kpi/bk/games/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const gameId = parseGameIdParam(id);
      if (gameId === null) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID Game không hợp lệ.' });
      }

      const body = request.body as BkGameUpdateInput;
      const updatedGame = await BkGameService.updateGame(fastify, gameId, body);
      return reply.send({ success: true, game: updatedGame });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error updating BK game');
      return reply.status(400).send({
        error: 'Bad Request',
        message: err instanceof Error ? err.message : 'Lỗi cập nhật Game BK.',
      });
    }
  });

  // POST /kpi/bk/games/:id/finalize
  fastify.post('/kpi/bk/games/:id/finalize', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const gameId = parseGameIdParam(id);
      if (gameId === null) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID Game không hợp lệ.' });
      }

      const body = request.body as BkGameFinalizeInput | undefined;
      const finalizedGame = await BkGameService.finalizeGame(fastify, gameId, body);
      return reply.send({ success: true, game: finalizedGame });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error finalizing BK game');
      return reply.status(400).send({
        error: 'Bad Request',
        message: err instanceof Error ? err.message : 'Lỗi chốt kết quả Game BK.',
      });
    }
  });

  // DELETE /kpi/bk/games/:id
  fastify.delete('/kpi/bk/games/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const gameId = parseGameIdParam(id);
      if (gameId === null) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID Game không hợp lệ.' });
      }

      await BkGameService.cancelGame(fastify, gameId);
      return reply.send({ success: true, message: 'Đã hủy Game BK thành công.' });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error cancelling BK game');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi hủy Game BK.' });
    }
  });
}
