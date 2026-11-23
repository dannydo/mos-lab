import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { StaffOffDayService } from '../services/staff-off-day.service.js';

export function registerStaffOffDayRoutes(fastify: FastifyInstance) {
  // GET /api/staff/off-days - Get off-day details for batch userIds or all staff
  fastify.get('/staff/off-days', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { userIds, dateFrom, dateTo } = request.query as {
        userIds?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      let parsedUserIds: number[] | undefined = undefined;
      if (userIds) {
        parsedUserIds = userIds
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id) && id > 0);
      }

      const batchMap = await StaffOffDayService.getBatchStaffOffDays(fastify, parsedUserIds, {
        dateFrom,
        dateTo,
      });

      const dataObj: Record<number, SafeAny> = {};
      batchMap.forEach((val, key) => {
        dataObj[key] = val;
      });

      return {
        data: dataObj,
        total: batchMap.size,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch batch staff off-days error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy thông tin ngày off của nhân viên',
      });
    }
  });

  // GET /api/staff/:id/off-days - Get off-day details for a single staff member
  fastify.get('/staff/:id/off-days', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { dateFrom, dateTo } = request.query as { dateFrom?: string; dateTo?: string };

      const userId = Number(id);
      if (isNaN(userId) || userId <= 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'ID nhân viên không hợp lệ',
        });
      }

      const result = await StaffOffDayService.getStaffOffDays(fastify, userId, { dateFrom, dateTo });
      return result;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch staff off-days error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy thông tin ngày off của nhân viên',
      });
    }
  });
}
