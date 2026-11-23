import { FastifyInstance } from 'fastify';
import { SafeAny, TelesalesAttendanceExceptionType } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import {
  canUserManageTelesalesAttendance,
  fetchTelesalesAttendanceAuditLogs,
  getActiveBkTelesalesIds,
  getBkPaystubData,
  getBkWorkLogs,
  upsertTelesalesAttendanceException,
} from '../../services/bk-salary.service.js';
import { buildBkStoreFilter, parseBkDateRangeParts } from './bk-route.helpers.js';

export function registerBkPaystubRoutes(fastify: FastifyInstance) {
  // 5. Paystub Live
  fastify.get('/kpi/bk/paystub', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const { startPart, endPart } = parseBkDateRangeParts(dateFrom, dateTo);

    try {
      const storeFilter = buildBkStoreFilter(storeId);
      const activeTelesalesIds = await getActiveBkTelesalesIds(fastify);
      const res = await getBkPaystubData(fastify, startPart, endPart, activeTelesalesIds, storeFilter);

      return {
        data: res.data,
        total: res.total,
        summary: res.summary,
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK paystub data');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Bảng Lương BK.' });
    }
  });

  // 5.1 Work Logs Daily (IN/OUT detail)
  fastify.get('/kpi/bk/work-logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const { staffId, dateFrom, dateTo } = request.query as {
      staffId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    if (!staffId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu tham số staffId.' });
    }

    const sid = Number(staffId);
    if (isNaN(sid)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'staffId không hợp lệ.' });
    }

    const { startPart, endPart } = parseBkDateRangeParts(dateFrom, dateTo);

    try {
      const res = await getBkWorkLogs(fastify, sid, startPart, endPart, request.user);
      if (!res) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân viên hoặc dữ liệu ca làm.' });
      }
      return res;
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK work logs');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết ca làm việc BK.' });
    }
  });

  // 5.2 Create / Update / Clear Attendance Exception (MOS-BUG-88)
  fastify.post('/kpi/bk/attendance-exception', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user;
    const body = request.body as {
      staffId?: number;
      workDate?: string;
      exceptionType?: TelesalesAttendanceExceptionType | 'CLEAR';
      reason?: string;
      manualInTime?: string;
      manualOutTime?: string;
      note?: string;
    };

    const { staffId, workDate, exceptionType, reason, manualInTime, manualOutTime, note } = body || {};

    if (!staffId || typeof staffId !== 'number') {
      return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu staffId hoặc staffId không hợp lệ.' });
    }
    if (!workDate || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'workDate không hợp lệ (định dạng YYYY-MM-DD).' });
    }
    if (!exceptionType) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu loại ngoại lệ exceptionType.' });
    }

    // Permission check (Requirement 4)
    const canManage = await canUserManageTelesalesAttendance(fastify, user, staffId);
    if (!canManage) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Quản lý (Manager) hoặc Admin mới có quyền thao tác ngoại lệ chấm công cho nhân viên này.',
      });
    }

    try {
      const result = await upsertTelesalesAttendanceException(fastify, {
        staffId,
        workDate,
        exceptionType,
        reason,
        manualInTime,
        manualOutTime,
        note,
        performedByStaffId: user.id,
        performedByName: user.displayName || user.username,
      });

      return result;
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error upserting Telesales attendance exception');
      const msg = (err as Error)?.message || 'Lỗi khi lưu ngoại lệ chấm công.';
      return reply.status(400).send({ error: 'Bad Request', message: msg });
    }
  });

  // 5.3 Audit Logs for Telesales Attendance Exceptions (MOS-BUG-88)
  fastify.get('/kpi/bk/attendance-exception/audit-logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const { staffId, dateFrom, dateTo } = request.query as {
      staffId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const sid = staffId ? Number(staffId) : undefined;
    try {
      const logs = await fetchTelesalesAttendanceAuditLogs(fastify, sid, dateFrom, dateTo);
      return { data: logs, total: logs.length };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching Telesales attendance exception audit logs');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải lịch sử audit log ngoại lệ.' });
    }
  });
}
