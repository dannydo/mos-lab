import { FalReadModel } from '@mos-lab/shared';
import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { getFalReadModelMap, toLogExplanationRecord } from './fal.service.js';

type CurrentUser = { id: number; role: string };
type LegacyFalRow = {
  orderServiceId: number;
  orderId: number;
  clientId: number;
  clientStoreId: number;
  checkin: string;
  clientName: string;
  clientAvatar: string | null;
  store: string;
  serviceName: string;
  effectiveServiceType: string;
  servicingMinutes: number | null;
  cleaningMinutes: number | null;
  nextFixOrderServiceId: number | null;
  nextAdjustOrderServiceId: number | null;
  nextLogOrderServiceId: number | null;
  ccInName: string;
  ccOutName: string;
  ccInAvatar: string | null;
  ccOutAvatar: string | null;
  bookerId: number | null;
  bookerName: string | null;
  bookerAvatar: string | null;
  cvId: number | null;
  ccInId: number | null;
  ccOutId: number | null;
  cvName: string;
  cvAvatar: string | null;
  originOrderServiceId: number | null;
  originCheckin: string | null;
  originServiceName: string | null;
  originCvName: string | null;
  originCvAvatar: string | null;
  originCcInName: string | null;
  originCcOutName: string | null;
  originCcInAvatar: string | null;
  originCcOutAvatar: string | null;
  originBookerId: number | null;
  originBookerName: string | null;
  originBookerAvatar: string | null;
  originCvId: number | null;
  originCcInId: number | null;
  originCcOutId: number | null;
  falRule: string;
  rotationPriorityStatus: 'READY' | 'CONSUMED' | 'EXPIRED' | null;
  rotationPriorityCompletedAt: string | null;
  rotationPriorityTotalMinutes: number | null;
  rotationPriorityQueueId: number | null;
  rotationPriorityConsumedOrderId: number | null;
  rotationPriorityConsumedAt: string | null;
  rotationPriorityExpiredAt: string | null;
};

type StaffLedgerRow = {
  orderServiceId: number;
  staffId: number;
  staffName: string;
  bonusPoints: number;
  cash: number;
  bananaCredit: number;
  trackingKeys: string | null;
  positiveConfiguredRuleCount: number;
  pointMultiplier: number;
  cashMultiplier: number;
};

type FalListOptions = {
  orderServiceId?: number;
  rule?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

function canExplainLog(role: string) {
  return ['admin', 'manager', 'oc', 'cc'].includes(role);
}

function dateRangeCondition(options: FalListOptions) {
  const dateFrom = options.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(options.dateFrom) ? options.dateFrom : null;
  const dateTo = options.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(options.dateTo) ? options.dateTo : null;
  return dateFrom && dateTo
    ? `AND DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) BETWEEN '${dateFrom}' AND '${dateTo}'`
    : '';
}

async function findLegacyFalRows(fastify: FastifyInstance, options: FalListOptions) {
  const orderServiceCondition = options.orderServiceId ? `AND os.id = ${Number(options.orderServiceId)}` : '';
  const ruleCondition =
    options.rule && ['Fix', 'Adjust', 'Log'].includes(options.rule) ? `AND falRule = '${options.rule}'` : '';
  const selectedDateCondition = dateRangeCondition(options);
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(options.limit) || 100));
  const offset = (page - 1) * limit;
  const rows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyFalRow[]>(`
    SELECT * FROM (
      SELECT
        os.id AS orderServiceId,
        o.id AS orderId,
        o.user_id AS clientId,
        o.client_store_id AS clientStoreId,
        DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d %H:%i:%s') AS checkin,
        COALESCE(client_p.full_name, '') AS clientName,
        NULLIF(client_p.avatar, '') AS clientAvatar,
        COALESCE(csl.client_store_name, '') AS store,
        COALESCE(sl.service_name, s.service_key) AS serviceName,
        COALESCE(ros.service_type, s.service_type, '') AS effectiveServiceType,
        CASE
          WHEN progress_start.date_created IS NULL OR progress_completed.date_created IS NULL THEN NULL
          WHEN progress_cleaned.date_created IS NULL THEN 0
          WHEN progress_cleaned.date_created < progress_start.date_created OR progress_cleaned.date_created > progress_completed.date_created THEN NULL
          ELSE CEIL(TIMESTAMPDIFF(SECOND, progress_start.date_created, progress_cleaned.date_created) / 60)
        END AS cleaningMinutes,
        CASE
          WHEN progress_start.date_created IS NULL OR progress_completed.date_created IS NULL THEN NULL
          WHEN progress_cleaned.date_created IS NULL THEN CEIL(TIMESTAMPDIFF(SECOND, progress_start.date_created, progress_completed.date_created) / 60)
          WHEN progress_cleaned.date_created < progress_start.date_created OR progress_cleaned.date_created > progress_completed.date_created THEN NULL
          ELSE CEIL(TIMESTAMPDIFF(SECOND, progress_cleaned.date_created, progress_completed.date_created) / 60)
        END AS servicingMinutes,
        os.next_fix_order_service_id AS nextFixOrderServiceId,
        os.next_adjust_order_service_id AS nextAdjustOrderServiceId,
        os.next_log_order_service_id AS nextLogOrderServiceId,
        COALESCE(checkin_p.full_name, '') AS ccInName,
        COALESCE(checkout_p.full_name, '') AS ccOutName,
        COALESCE(NULLIF(checkin_p.avatar, ''), NULLIF(checkin_p.avatar_internal, '')) AS ccInAvatar,
        COALESCE(NULLIF(checkout_p.avatar, ''), NULLIF(checkout_p.avatar_internal, '')) AS ccOutAvatar,
        o.created_staff_id AS bookerId,
        NULLIF(booker_p.full_name, '') AS bookerName,
        COALESCE(NULLIF(booker_p.avatar, ''), NULLIF(booker_p.avatar_internal, '')) AS bookerAvatar,
        os.assigned_staff_id AS cvId,
        os.check_in_staff_id AS ccInId,
        os.check_out_staff_id AS ccOutId,
        COALESCE(cv_p.full_name, '') AS cvName,
        COALESCE(NULLIF(cv_p.avatar, ''), NULLIF(cv_p.avatar_internal, '')) AS cvAvatar,
        origin_os.id AS originOrderServiceId,
        DATE_FORMAT(origin_ro.actual_booking_date_start, '%Y-%m-%d %H:%i:%s') AS originCheckin,
        COALESCE(origin_sl.service_name, origin_s.service_key) AS originServiceName,
        NULLIF(origin_cv_p.full_name, '') AS originCvName,
        COALESCE(NULLIF(origin_cv_p.avatar, ''), NULLIF(origin_cv_p.avatar_internal, '')) AS originCvAvatar,
        NULLIF(origin_cc_in_p.full_name, '') AS originCcInName,
        NULLIF(origin_cc_out_p.full_name, '') AS originCcOutName,
        COALESCE(NULLIF(origin_cc_in_p.avatar, ''), NULLIF(origin_cc_in_p.avatar_internal, '')) AS originCcInAvatar,
        COALESCE(NULLIF(origin_cc_out_p.avatar, ''), NULLIF(origin_cc_out_p.avatar_internal, '')) AS originCcOutAvatar,
        origin_o.created_staff_id AS originBookerId,
        NULLIF(origin_booker_p.full_name, '') AS originBookerName,
        COALESCE(NULLIF(origin_booker_p.avatar, ''), NULLIF(origin_booker_p.avatar_internal, '')) AS originBookerAvatar,
        origin_os.assigned_staff_id AS originCvId,
        origin_os.check_in_staff_id AS originCcInId,
        origin_os.check_out_staff_id AS originCcOutId,
        frp.status AS rotationPriorityStatus,
        DATE_FORMAT(frp.completed_at, '%Y-%m-%d %H:%i:%s') AS rotationPriorityCompletedAt,
        frp.total_minutes AS rotationPriorityTotalMinutes,
        frp.order_staff_queue_id AS rotationPriorityQueueId,
        frp.consumed_order_id AS rotationPriorityConsumedOrderId,
        DATE_FORMAT(frp.consumed_at, '%Y-%m-%d %H:%i:%s') AS rotationPriorityConsumedAt,
        DATE_FORMAT(frp.expired_at, '%Y-%m-%d %H:%i:%s') AS rotationPriorityExpiredAt,
        CASE
          WHEN parent_fix.id IS NOT NULL THEN 'Fix'
          WHEN parent_adjust.id IS NOT NULL THEN 'Adjust'
          WHEN parent_log.id IS NOT NULL THEN 'Log'
          WHEN ros.service_type IN ('Fix', 'Adjust', 'Log', 'Replace') THEN ros.service_type
          WHEN s.service_type IN ('Fix', 'Adjust', 'Log', 'Replace') THEN s.service_type
          ELSE ''
        END AS falRule
      FROM order_service os
      JOIN \`order\` o ON o.id = os.order_id AND o.order_state = 'Completed'
      LEFT JOIN report_order ro ON ro.order_id = o.id
      LEFT JOIN report_order_service ros ON ros.order_service_id = os.id
      LEFT JOIN order_service_progress progress_start ON progress_start.order_service_id = os.id AND progress_start.service_state = 'ServiceStart'
      LEFT JOIN order_service_progress progress_cleaned ON progress_cleaned.order_service_id = os.id AND progress_cleaned.service_state = 'ServiceCleaned'
      LEFT JOIN order_service_progress progress_completed ON progress_completed.order_service_id = os.id AND progress_completed.service_state = 'ServiceCompleted'
      LEFT JOIN order_service parent_fix ON parent_fix.next_fix_order_service_id = os.id
      LEFT JOIN order_service parent_adjust ON parent_adjust.next_adjust_order_service_id = os.id
      LEFT JOIN order_service parent_log ON parent_log.next_log_order_service_id = os.id
      LEFT JOIN service s ON s.id = os.service_id
      LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
      LEFT JOIN client_store_language csl ON csl.client_store_id = o.client_store_id AND csl.language_id = 1
      LEFT JOIN user_profile client_p ON client_p.user_id = o.user_id
      LEFT JOIN user_profile checkin_p ON checkin_p.user_id = os.check_in_staff_id
      LEFT JOIN user_profile checkout_p ON checkout_p.user_id = os.check_out_staff_id
      LEFT JOIN user_profile booker_p ON booker_p.user_id = o.created_staff_id
      LEFT JOIN user_profile cv_p ON cv_p.user_id = os.assigned_staff_id
      LEFT JOIN order_service origin_os ON origin_os.id = COALESCE(parent_fix.id, parent_adjust.id, parent_log.id)
      LEFT JOIN \`order\` origin_o ON origin_o.id = origin_os.order_id
      LEFT JOIN report_order origin_ro ON origin_ro.order_id = origin_o.id
      LEFT JOIN service origin_s ON origin_s.id = origin_os.service_id
      LEFT JOIN service_language origin_sl ON origin_sl.service_id = origin_s.id AND origin_sl.language_id = 1
      LEFT JOIN user_profile origin_cv_p ON origin_cv_p.user_id = origin_os.assigned_staff_id
      LEFT JOIN user_profile origin_cc_in_p ON origin_cc_in_p.user_id = origin_os.check_in_staff_id
      LEFT JOIN user_profile origin_cc_out_p ON origin_cc_out_p.user_id = origin_os.check_out_staff_id
      LEFT JOIN user_profile origin_booker_p ON origin_booker_p.user_id = origin_o.created_staff_id
      LEFT JOIN fal_rotation_priority frp ON frp.order_service_id = os.id
      WHERE 1 = 1 ${orderServiceCondition} ${selectedDateCondition}
    ) fal_cases
    WHERE falRule IN ('Fix', 'Adjust', 'Log') ${ruleCondition}
    ORDER BY checkin DESC, orderServiceId DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  await applyCrmAvatarFallbacks(fastify, rows);
  return rows;
}

async function applyCrmAvatarFallbacks(fastify: FastifyInstance, rows: LegacyFalRow[]) {
  const staffIds = [
    ...new Set(
      rows
        .flatMap((row) => [
          row.bookerId,
          row.ccInId,
          row.ccOutId,
          row.cvId,
          row.originBookerId,
          row.originCcInId,
          row.originCcOutId,
          row.originCvId,
        ])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
  if (!staffIds.length) return;
  try {
    const staff = await fastify.prisma.crm.crmStaff.findMany({
      where: { legacyStaffId: { in: staffIds } },
      select: { legacyStaffId: true, avatarUrl: true },
    });
    const avatars = new Map(
      staff
        .filter((item) => item.legacyStaffId && item.avatarUrl)
        .map((item) => [Number(item.legacyStaffId), item.avatarUrl as string])
    );
    const fallback = (avatar: string | null, staffId: number | null) => avatar || avatars.get(Number(staffId)) || null;
    rows.forEach((row) => {
      row.bookerAvatar = fallback(row.bookerAvatar, row.bookerId);
      row.ccInAvatar = fallback(row.ccInAvatar, row.ccInId);
      row.ccOutAvatar = fallback(row.ccOutAvatar, row.ccOutId);
      row.cvAvatar = fallback(row.cvAvatar, row.cvId);
      row.originBookerAvatar = fallback(row.originBookerAvatar, row.originBookerId);
      row.originCcInAvatar = fallback(row.originCcInAvatar, row.originCcInId);
      row.originCcOutAvatar = fallback(row.originCcOutAvatar, row.originCcOutId);
      row.originCvAvatar = fallback(row.originCvAvatar, row.originCvId);
    });
  } catch (error) {
    fastify.log.warn({ error }, 'FAL Trace CRM avatar fallback unavailable');
  }
}

async function getStaffLedgerByOrderService(fastify: FastifyInstance, orderServiceIds: number[]) {
  const ids = [...new Set(orderServiceIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (!ids.length) return new Map<number, StaffLedgerRow[]>();
  const rows = await fastify.prisma.legacy.$queryRawUnsafe<StaffLedgerRow[]>(`
    SELECT
      sb.order_service_id AS orderServiceId,
      sb.user_id AS staffId,
      COALESCE(up.full_name, CONCAT('Nhân sự #', sb.user_id)) AS staffName,
      SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END) AS bonusPoints,
      SUM(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END) AS cash,
      SUM(CASE WHEN sb.bonus_type IN ('Credit', 'Banana') THEN sb.bonus_amount ELSE 0 END) AS bananaCredit,
      GROUP_CONCAT(DISTINCT NULLIF(sb.tracking_key, '[]') SEPARATOR '||') AS trackingKeys,
      SUM(CASE WHEN COALESCE(sbr.bonus_amount, 0) > 0 THEN 1 ELSE 0 END) AS positiveConfiguredRuleCount,
      MAX(COALESCE(sbl.bonus_point_multiplier, 0)) AS pointMultiplier,
      MAX(COALESCE(sbl.bonus_cash_multiplier, 0)) AS cashMultiplier
    FROM staff_bonus sb
    LEFT JOIN user_profile up ON up.user_id = sb.user_id
    LEFT JOIN staff_bonus_rule sbr ON sbr.id = sb.staff_bonus_rule_id
    LEFT JOIN staff_bonus_level sbl ON sbl.id = sb.staff_bonus_level_id
    WHERE sb.order_service_id IN (${ids.join(',')})
    GROUP BY sb.order_service_id, sb.user_id, up.full_name
    ORDER BY sb.order_service_id, staffName
  `);
  return rows.reduce((result, row) => {
    const orderServiceId = Number(row.orderServiceId);
    const items = result.get(orderServiceId) || [];
    items.push({
      ...row,
      orderServiceId,
      staffId: Number(row.staffId),
      bonusPoints: Number(row.bonusPoints || 0),
      cash: Number(row.cash || 0),
      bananaCredit: Number(row.bananaCredit || 0),
      trackingKeys: row.trackingKeys || null,
      positiveConfiguredRuleCount: Number(row.positiveConfiguredRuleCount || 0),
      pointMultiplier: Number(row.pointMultiplier || 0),
      cashMultiplier: Number(row.cashMultiplier || 0),
    });
    result.set(orderServiceId, items);
    return result;
  }, new Map<number, StaffLedgerRow[]>());
}

async function countLegacyFalRows(fastify: FastifyInstance, options: FalListOptions) {
  const { rule } = options;
  const ruleCondition = rule && ['Fix', 'Adjust', 'Log'].includes(rule) ? `AND falRule = '${rule}'` : '';
  const selectedDateCondition = dateRangeCondition(options);
  const [result] = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ total: bigint | number }>>(`
    SELECT COUNT(*) AS total FROM (
      SELECT CASE
        WHEN parent_fix.id IS NOT NULL THEN 'Fix'
        WHEN parent_adjust.id IS NOT NULL THEN 'Adjust'
        WHEN parent_log.id IS NOT NULL THEN 'Log'
        WHEN ros.service_type IN ('Fix', 'Adjust', 'Log', 'Replace') THEN ros.service_type
        WHEN s.service_type IN ('Fix', 'Adjust', 'Log', 'Replace') THEN s.service_type
        ELSE ''
      END AS falRule
      FROM order_service os
      JOIN \`order\` o ON o.id = os.order_id AND o.order_state = 'Completed'
      LEFT JOIN report_order ro ON ro.order_id = o.id
      LEFT JOIN report_order_service ros ON ros.order_service_id = os.id
      LEFT JOIN order_service parent_fix ON parent_fix.next_fix_order_service_id = os.id
      LEFT JOIN order_service parent_adjust ON parent_adjust.next_adjust_order_service_id = os.id
      LEFT JOIN order_service parent_log ON parent_log.next_log_order_service_id = os.id
      LEFT JOIN service s ON s.id = os.service_id
      WHERE 1 = 1 ${selectedDateCondition}
    ) fal_cases
    WHERE falRule IN ('Fix', 'Adjust', 'Log') ${ruleCondition}
  `);
  return Number(result?.total || 0);
}

export async function falRoutes(fastify: FastifyInstance) {
  fastify.get('/fal/cases', { preHandler: [requireAuth] }, async (request) => {
    const query = request.query as { rule?: string; dateFrom?: string; dateTo?: string; page?: string; limit?: string };
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(query.limit) || 100));
    const [rows, total] = await Promise.all([
      findLegacyFalRows(fastify, { rule: query.rule, dateFrom: query.dateFrom, dateTo: query.dateTo, page, limit }),
      countLegacyFalRows(fastify, { rule: query.rule, dateFrom: query.dateFrom, dateTo: query.dateTo }),
    ]);
    const models = await getFalReadModelMap(
      fastify,
      rows.map((row) => ({
        ...row,
        effectiveServiceType: row.falRule,
        originOrderServiceId: row.originOrderServiceId,
        rotationPriority:
          row.rotationPriorityStatus &&
          row.rotationPriorityCompletedAt &&
          row.cvId &&
          row.rotationPriorityTotalMinutes != null
            ? {
                status: row.rotationPriorityStatus,
                technicianStaffId: Number(row.cvId),
                clientStoreId: Number(row.clientStoreId),
                completedAt: row.rotationPriorityCompletedAt,
                totalMinutes: Number(row.rotationPriorityTotalMinutes),
                queueId: row.rotationPriorityQueueId == null ? null : Number(row.rotationPriorityQueueId),
                consumedOrderId:
                  row.rotationPriorityConsumedOrderId == null ? null : Number(row.rotationPriorityConsumedOrderId),
                consumedAt: row.rotationPriorityConsumedAt,
                expiredAt: row.rotationPriorityExpiredAt,
              }
            : null,
      }))
    );
    const logIds = rows
      .filter((row) => models.get(Number(row.orderServiceId))?.rule === 'Log')
      .map((row) => BigInt(row.orderServiceId));
    const explanations = logIds.length
      ? await fastify.prisma.crm.crmFalLogExplanation.findMany({ where: { orderServiceId: { in: logIds } } })
      : [];
    const explanationMap = new Map(
      explanations.map((item) => [Number(item.orderServiceId), toLogExplanationRecord(item)])
    );
    const ledgerByOrderService = await getStaffLedgerByOrderService(
      fastify,
      rows.flatMap((row) => [Number(row.orderServiceId), Number(row.originOrderServiceId || 0)])
    );
    return {
      data: rows.map((row) => ({
        ...row,
        fal: models.get(Number(row.orderServiceId)) as FalReadModel | null,
        logExplanation: explanationMap.get(Number(row.orderServiceId)) || null,
        trace: {
          origin: row.originOrderServiceId
            ? {
                orderServiceId: Number(row.originOrderServiceId),
                checkin: row.originCheckin,
                serviceName: row.originServiceName,
                cvName: row.originCvName,
                cvAvatar: row.originCvAvatar,
                bookerId: row.originBookerId,
                bookerName: row.originBookerName,
                bookerAvatar: row.originBookerAvatar,
                ccInName: row.originCcInName,
                ccOutName: row.originCcOutName,
                ccInAvatar: row.originCcInAvatar,
                ccOutAvatar: row.originCcOutAvatar,
                cvId: row.originCvId,
                ccInId: row.originCcInId,
                ccOutId: row.originCcOutId,
                ledger: ledgerByOrderService.get(Number(row.originOrderServiceId)) || [],
              }
            : null,
          remediation: {
            orderServiceId: Number(row.orderServiceId),
            checkin: row.checkin,
            serviceName: row.serviceName,
            cvName: row.cvName,
            cvAvatar: row.cvAvatar,
            bookerId: row.bookerId,
            bookerName: row.bookerName,
            bookerAvatar: row.bookerAvatar,
            ccInName: row.ccInName,
            ccOutName: row.ccOutName,
            cvId: row.cvId,
            ccInId: row.ccInId,
            ccOutId: row.ccOutId,
            ledger: ledgerByOrderService.get(Number(row.orderServiceId)) || [],
          },
        },
      })),
      total,
      page,
      limit,
    };
  });

  fastify.post('/fal/logs/:orderServiceId/explanation', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as CurrentUser;
    if (!canExplainLog(user.role))
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ CC/Quản lý/Admin có thể giải trình Log.' });
    const orderServiceId = Number((request.params as { orderServiceId: string }).orderServiceId);
    const { explanation, explanationChannel } = request.body as { explanation?: string; explanationChannel?: string };
    if (!explanation?.trim())
      return reply.status(400).send({ error: 'Bad Request', message: 'Giải trình Log là bắt buộc.' });
    const [row] = await findLegacyFalRows(fastify, { orderServiceId, limit: 1 });
    if (!row || row.falRule !== 'Log') {
      return reply
        .status(400)
        .send({ error: 'Bad Request', message: 'Order service này không phải Log được chọn từ Wings.' });
    }
    const record = await fastify.prisma.crm.$transaction(async (tx) => {
      const saved = await tx.crmFalLogExplanation.upsert({
        where: { orderServiceId: BigInt(orderServiceId) },
        update: {
          explanation: explanation.trim(),
          explanationChannel: explanationChannel || 'manual',
          explainedByStaffId: user.id,
          decisionStatus: 'PENDING',
          ledgerStatus: 'NOT_APPLIED',
          appliedAt: null,
          failureReason: null,
          rejectionReason: null,
        },
        create: {
          orderServiceId: BigInt(orderServiceId),
          explanation: explanation.trim(),
          explanationChannel: explanationChannel || 'manual',
          explainedByStaffId: user.id,
        },
      });
      await tx.crmFalLogExplanationAudit.create({
        data: { decisionId: saved.id, action: 'EXPLANATION_SUBMITTED', actorStaffId: user.id },
      });
      return saved;
    });
    return { success: true, data: toLogExplanationRecord(record) };
  });

  fastify.post(
    '/fal/logs/:orderServiceId/approval',
    { preHandler: [requireAuth, requireRole(['admin', 'manager', 'oc'])] },
    async (request, reply) => {
      const user = request.user as CurrentUser;
      const orderServiceId = Number((request.params as { orderServiceId: string }).orderServiceId);
      const { approved, rejectionReason } = request.body as { approved?: boolean; rejectionReason?: string };
      const explanation = await fastify.prisma.crm.crmFalLogExplanation.findUnique({
        where: { orderServiceId: BigInt(orderServiceId) },
      });
      if (!explanation?.explanation)
        return reply.status(400).send({ error: 'Bad Request', message: 'CC phải giải trình Log trước khi duyệt.' });
      if (!approved && !rejectionReason?.trim())
        return reply.status(400).send({ error: 'Bad Request', message: 'Cần nêu lý do từ chối.' });
      const record = await fastify.prisma.crm.$transaction(async (tx) => {
        const saved = await tx.crmFalLogExplanation.update({
          where: { orderServiceId: BigInt(orderServiceId) },
          data: {
            decisionStatus: approved ? 'APPROVED' : 'REJECTED',
            ledgerStatus: 'NOT_APPLIED',
            appliedAt: null,
            failureReason: null,
            approvedByStaffId: user.id,
            approvedAt: new Date(),
            rejectionReason: approved ? null : rejectionReason!.trim(),
          },
        });
        await tx.crmFalLogExplanationAudit.create({
          data: {
            decisionId: saved.id,
            action: approved ? 'APPROVED' : 'REJECTED',
            actorStaffId: user.id,
            details: rejectionReason || null,
          },
        });
        return saved;
      });
      return { success: true, data: toLogExplanationRecord(record) };
    }
  );
}
