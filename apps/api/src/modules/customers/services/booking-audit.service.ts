import { FastifyInstance } from 'fastify';
import { BookingActionType, BookingAuditLogFilter } from '@mos-lab/shared';

export interface CreateBookingLogParams {
  orderId: number;
  actionType: BookingActionType;
  actorStaffId: number;
  actorStaffName?: string;
  originalStaffId?: number | null;
  originalStaffName?: string;
  reasonCategory?: string | null;
  reasonNote?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export class BookingAuditService {
  /**
   * Resolve staff names for actor and original creator
   */
  static async resolveStaffNames(
    fastify: FastifyInstance,
    actorStaffId: number,
    originalStaffId?: number | null
  ): Promise<{ actorStaffName: string; originalStaffName: string }> {
    let actorStaffName = 'Booker';
    let originalStaffName = 'System';

    try {
      const idsToFetch = [actorStaffId];
      if (originalStaffId) idsToFetch.push(originalStaffId);

      const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ user_id: number; full_name: string }>>(
        `SELECT user_id, full_name FROM user_profile WHERE user_id IN (${idsToFetch.join(',')})`
      );

      const nameMap = new Map<number, string>();
      for (const sp of staffProfiles) {
        if (sp.full_name && sp.full_name.trim() !== '') {
          nameMap.set(Number(sp.user_id), sp.full_name.trim());
        }
      }

      // Fallback to user username if profile name empty
      const missingIds = idsToFetch.filter((id) => !nameMap.has(id));
      if (missingIds.length > 0) {
        const users = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ id: number; username: string }>>(
          `SELECT id, username FROM user WHERE id IN (${missingIds.join(',')})`
        );
        for (const u of users) {
          nameMap.set(Number(u.id), u.username);
        }
      }

      actorStaffName = nameMap.get(actorStaffId) || `Booker #${actorStaffId}`;
      if (originalStaffId) {
        originalStaffName = nameMap.get(originalStaffId) || `Booker #${originalStaffId}`;
      }
    } catch (err) {
      fastify.log.error(err, 'Failed to resolve staff names for audit log');
    }

    return { actorStaffName, originalStaffName };
  }

  /**
   * Log a booking action (CANCEL, RESCHEDULE, CHANGE_KTV, CHANGE_STORE, EDIT)
   */
  static async logAction(fastify: FastifyInstance, params: CreateBookingLogParams) {
    try {
      const { actorStaffName, originalStaffName } = await this.resolveStaffNames(
        fastify,
        params.actorStaffId,
        params.originalStaffId
      );

      const isCrossAction = Boolean(
        params.originalStaffId && params.actorStaffId && Number(params.actorStaffId) !== Number(params.originalStaffId)
      );

      const log = await fastify.prisma.crm.crmBookingLog.create({
        data: {
          orderId: params.orderId,
          actionType: params.actionType,
          actorStaffId: params.actorStaffId,
          actorStaffName: params.actorStaffName || actorStaffName,
          originalStaffId: params.originalStaffId || null,
          originalStaffName: params.originalStaffName || originalStaffName,
          isCrossAction,
          reasonCategory: params.reasonCategory || null,
          reasonNote: params.reasonNote || null,
          oldDataJson: params.oldData ? JSON.stringify(params.oldData) : null,
          newDataJson: params.newData ? JSON.stringify(params.newData) : null,
          ipAddress: params.ipAddress || null,
        },
      });

      return log;
    } catch (err) {
      fastify.log.error(err, 'Failed to create booking audit log record');
      return null;
    }
  }

  /**
   * Query logs for a single order
   */
  static async getLogsForOrder(fastify: FastifyInstance, orderId: number) {
    const logs = await fastify.prisma.crm.crmBookingLog.findMany({
      where: { orderId },
      orderBy: { dateCreated: 'desc' },
    });

    return logs.map((l) => ({
      id: l.id,
      orderId: l.orderId,
      actionType: l.actionType,
      actorStaffId: l.actorStaffId,
      actorStaffName: l.actorStaffName,
      originalStaffId: l.originalStaffId,
      originalStaffName: l.originalStaffName,
      isCrossAction: l.isCrossAction,
      reasonCategory: l.reasonCategory,
      reasonNote: l.reasonNote,
      oldDataJson: l.oldDataJson,
      newDataJson: l.newDataJson,
      ipAddress: l.ipAddress,
      dateCreated: l.dateCreated.toISOString(),
    }));
  }

  /**
   * Manager report listing for all audit logs
   */
  static async getAuditLogReport(fastify: FastifyInstance, filter: BookingAuditLogFilter) {
    const pageNum = Math.max(1, Number(filter.page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: SafeAny = {};

    if (filter.dateFrom || filter.dateTo) {
      where.dateCreated = {};
      if (filter.dateFrom) {
        where.dateCreated.gte = new Date(`${filter.dateFrom} 00:00:00`);
      }
      if (filter.dateTo) {
        where.dateCreated.lte = new Date(`${filter.dateTo} 23:59:59`);
      }
    }

    if (filter.actorStaffId && filter.actorStaffId !== 'ALL') {
      where.actorStaffId = Number(filter.actorStaffId);
    }

    if (filter.originalStaffId && filter.originalStaffId !== 'ALL') {
      where.originalStaffId = Number(filter.originalStaffId);
    }

    if (filter.isCrossActionOnly) {
      where.isCrossAction = true;
    }

    if (filter.actionType && filter.actionType !== 'ALL') {
      where.actionType = filter.actionType;
    }

    const [totalLogs, logs, crossActionsCount, crossCancelsCount, crossReschedulesCount] = await Promise.all([
      fastify.prisma.crm.crmBookingLog.count({ where }),
      fastify.prisma.crm.crmBookingLog.findMany({
        where,
        orderBy: { dateCreated: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.crm.crmBookingLog.count({ where: { ...where, isCrossAction: true } }),
      fastify.prisma.crm.crmBookingLog.count({
        where: { ...where, isCrossAction: true, actionType: 'CANCEL' },
      }),
      fastify.prisma.crm.crmBookingLog.count({
        where: { ...where, isCrossAction: true, actionType: 'RESCHEDULE' },
      }),
    ]);

    // Enrich logs with order key & customer details from legacy DB
    const orderIds = Array.from(new Set(logs.map((l) => l.orderId)));
    const orderMap = new Map<number, { orderKey: string; customerName: string; customerPhone: string }>();

    if (orderIds.length > 0) {
      const orders = await fastify.prisma.legacy.$queryRawUnsafe<
        Array<{ id: number; order_key: string | null; customer_name: string | null; customer_phone: string | null }>
      >(
        `SELECT o.id, o.order_key, up.full_name as customer_name, u.username as customer_phone
         FROM \`order\` o
         LEFT JOIN user_profile up ON o.user_id = up.user_id
         LEFT JOIN user u ON o.user_id = u.id
         WHERE o.id IN (${orderIds.join(',')})`
      );

      for (const o of orders) {
        orderMap.set(Number(o.id), {
          orderKey: o.order_key || `#${o.id}`,
          customerName: o.customer_name || 'Khách hàng',
          customerPhone: o.customer_phone || '',
        });
      }
    }

    const items = logs.map((l) => {
      const orderInfo = orderMap.get(l.orderId);
      return {
        id: l.id,
        orderId: l.orderId,
        orderKey: orderInfo?.orderKey || `#${l.orderId}`,
        customerName: orderInfo?.customerName || '',
        customerPhone: orderInfo?.customerPhone || '',
        actionType: l.actionType,
        actorStaffId: l.actorStaffId,
        actorStaffName: l.actorStaffName,
        originalStaffId: l.originalStaffId,
        originalStaffName: l.originalStaffName,
        isCrossAction: l.isCrossAction,
        reasonCategory: l.reasonCategory,
        reasonNote: l.reasonNote,
        oldDataJson: l.oldDataJson,
        newDataJson: l.newDataJson,
        ipAddress: l.ipAddress,
        dateCreated: l.dateCreated.toISOString(),
      };
    });

    return {
      items,
      pagination: {
        total: totalLogs,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalLogs / limitNum),
      },
      summary: {
        totalLogs,
        totalCrossActions: crossActionsCount,
        totalCrossCancels: crossCancelsCount,
        totalCrossReschedules: crossReschedulesCount,
      },
    };
  }
}
