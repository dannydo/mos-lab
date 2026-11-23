import { FastifyInstance } from 'fastify';
import { CvTipRecord, CvTipResponse, SafeAny, TIP_SYSTEM_CONFIG, TipFilterType } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import {
  buildCvTipStaffMatchSql,
  createFastifyLegacyTipExecutor,
  CvlTrainingMentorshipService,
} from '../../services/cvl-training-mentorship.service.js';
import {
  CV_TIP_DEFAULT_PAGE_SIZE,
  CV_TIP_MAX_PAGE_SIZE,
  actualCheckinQueryParams,
  buildActualCheckinOrdersCte,
  buildStaffTipSubquery,
  emptyCvTipSummary,
  getActiveCvIds,
  resolveTipDateRange,
  resolveTipStatus,
} from './cv-tip.helpers.js';

export function registerCvTipRecordsRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cv-tip/records
  fastify.get('/kpi/cv-tip/records', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      dateFrom,
      dateTo,
      storeId,
      consultantId,
      tipFilter = 'ALL',
      page = 1,
      limit = CV_TIP_DEFAULT_PAGE_SIZE,
      search,
      includeSummary = 'true',
    } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
      consultantId?: string;
      tipFilter?: TipFilterType;
      page?: number;
      limit?: number;
      search?: string;
      includeSummary?: string | boolean;
    };

    const { startPart, endPart } = resolveTipDateRange(dateFrom, dateTo);
    const pageNum = Math.max(1, Math.floor(Number(page) || 1));
    const limitNum = Math.min(CV_TIP_MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(limit) || CV_TIP_DEFAULT_PAGE_SIZE)));
    const offset = (pageNum - 1) * limitNum;
    const shouldIncludeSummary = includeSummary !== false && includeSummary !== 'false';

    try {
      const [activeCvIdsRaw, activeTrainingPairs] = await Promise.all([
        getActiveCvIds(fastify),
        CvlTrainingMentorshipService.getActivePairsForRange(fastify, startPart, endPart),
      ]);
      await CvlTrainingMentorshipService.reconcileTrainingCvlStaffTips(
        createFastifyLegacyTipExecutor(fastify),
        activeTrainingPairs
      );
      const activeCvIds = activeCvIdsRaw || [47510, 48026, 46092, 37790, 34295, 51659];
      const activeCvStr = activeCvIds.join(',');

      const whereConditions: string[] = [];
      const whereQueryParams: Array<string | number> = [];

      if (consultantId && consultantId !== 'ALL') {
        const numId = Number(consultantId);
        if (!isNaN(numId)) {
          whereConditions.push('os.assigned_staff_id = ?');
          whereQueryParams.push(numId);
        } else {
          whereConditions.push('tech_p.full_name LIKE ?');
          whereQueryParams.push(`%${consultantId}%`);
        }
      } else {
        whereConditions.push(`os.assigned_staff_id IN (${activeCvStr})`);
      }

      if (storeId && storeId !== 'ALL') {
        whereConditions.push('csl.client_store_name LIKE ?');
        whereQueryParams.push(`%${storeId}%`);
      }

      if (search?.trim()) {
        const searchPattern = `%${search.trim()}%`;
        whereConditions.push(
          '(tech_p.full_name LIKE ? OR client_p.full_name LIKE ? OR sl.service_name LIKE ? OR s.service_key LIKE ?)'
        );
        whereQueryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      const baseWhereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const customerTipExpr = 'COALESCE(st.customer_tip_100, 0)';
      const tipFilterClause =
        tipFilter === 'TIPPED'
          ? ` AND ${customerTipExpr} >= ${TIP_SYSTEM_CONFIG.MIN_VALID_CUSTOMER_TIP_AMOUNT}`
          : tipFilter === 'SMALL_CHANGE'
            ? ` AND ${customerTipExpr} > 0 AND ${customerTipExpr} < ${TIP_SYSTEM_CONFIG.MIN_VALID_CUSTOMER_TIP_AMOUNT}`
            : tipFilter === 'NO_TIP'
              ? ` AND COALESCE(st.tip_amount, 0) = 0`
              : '';
      const filteredWhereClause = `${baseWhereClause}${tipFilterClause}`;
      const filteredOrdersCte = buildActualCheckinOrdersCte();
      const dateQueryParams = actualCheckinQueryParams(startPart, endPart);
      const recordTipMatchSql = buildCvTipStaffMatchSql(
        activeTrainingPairs,
        'st_raw',
        'os_sub.assigned_staff_id',
        'os_sub.checkinTime'
      );
      const summaryTipMatchSql = buildCvTipStaffMatchSql(
        activeTrainingPairs,
        'st',
        'scoped.assigned_staff_id',
        'scoped.checkinTime'
      );
      const staffTipSubquery = buildStaffTipSubquery(recordTipMatchSql);

      const recordsFromSql = `
        FROM filtered_orders fo
        JOIN \`order\` o ON o.id = fo.orderId
        JOIN order_service os ON os.order_id = o.id
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        JOIN service s ON os.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN user_profile client_p ON o.user_id = client_p.user_id
        LEFT JOIN user_profile tech_p ON os.assigned_staff_id = tech_p.user_id
        LEFT JOIN (
          ${staffTipSubquery}
        ) st ON st.order_id = o.id AND st.assigned_staff_id = os.assigned_staff_id
      `;

      const rawSql = `
        ${filteredOrdersCte}
        SELECT 
          o.id as orderId,
          os.id as serviceId,
          DATE_FORMAT(fo.checkinTime, '%Y-%m-%d %H:%i:%s') as checkinTime,
          o.user_id as clientId,
          COALESCE(client_p.full_name, '') as clientName,
          COALESCE(csl.client_store_name, '') as store,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          COALESCE(tech_p.full_name, '') as techName,
          COALESCE(tech_p.avatar, '') as avatar,
          COALESCE(st.customer_tip_100, 0) as totalCustomerTip,
          COALESCE(st.tip_amount, 0) as cvTipAmount,
          COALESCE(st.tip_percentage, 70) as cvTipPercentage
        ${recordsFromSql}
        ${filteredWhereClause}
        GROUP BY os.id, fo.checkinTime
        ORDER BY fo.checkinTime DESC, os.id DESC
        LIMIT ? OFFSET ?
      `;

      const countSql = `
        ${filteredOrdersCte}
        SELECT COUNT(DISTINCT os.id) as total
        ${recordsFromSql}
        ${filteredWhereClause}
      `;

      const summarySql = `
        ${filteredOrdersCte}
        , scoped_orders AS (
          SELECT DISTINCT o.id AS orderId, fo.checkinTime, os.assigned_staff_id
          ${recordsFromSql}
          ${baseWhereClause}
        ), order_tip_summary AS (
          SELECT
            scoped.orderId,
            MAX(CASE WHEN (CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END) >= ${TIP_SYSTEM_CONFIG.MIN_VALID_CUSTOMER_TIP_AMOUNT} THEN 1 ELSE 0 END) AS isTipped,
            MAX(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END) AS customerTip,
            SUM(COALESCE(st.tip_amount, 0)) AS cvTipBonus
          FROM scoped_orders scoped
          LEFT JOIN staff_tip st
            ON st.order_id = scoped.orderId
           AND ${summaryTipMatchSql}
          GROUP BY scoped.orderId
        )
        SELECT
          COUNT(*) AS totalVisits,
          COALESCE(SUM(isTipped), 0) AS tippedVisits,
          COALESCE(SUM(customerTip), 0) AS totalCustomerTip,
          COALESCE(SUM(cvTipBonus), 0) AS totalCvTipBonus
        FROM order_tip_summary
      `;

      const [dbRows, countRows, summaryRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          rawSql,
          ...dateQueryParams,
          ...whereQueryParams,
          limitNum,
          offset
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(countSql, ...dateQueryParams, ...whereQueryParams),
        shouldIncludeSummary
          ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(summarySql, ...dateQueryParams, ...whereQueryParams)
          : Promise.resolve<SafeAny[]>([]),
      ]);

      const clientIds = Array.from(
        new Set(
          dbRows
            .map((row) => Number(row.clientId || 0))
            .filter((clientId) => Number.isInteger(clientId) && clientId > 0)
        )
      );
      const customerHistoryRows = clientIds.length
        ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `
              SELECT
                history_o.user_id as clientId,
                COUNT(DISTINCT history_o.id) as clientTotalVisits,
                COUNT(DISTINCT CASE WHEN history_tip.tip_amount > 0 AND (CASE WHEN history_tip.tip_percentage > 0 THEN history_tip.tip_amount / (history_tip.tip_percentage / 100) ELSE history_tip.tip_amount END) >= ${TIP_SYSTEM_CONFIG.MIN_VALID_CUSTOMER_TIP_AMOUNT} THEN history_o.id END) as clientTippedVisits
              FROM \`order\` history_o
              LEFT JOIN staff_tip history_tip ON history_tip.order_id = history_o.id
              WHERE history_o.user_id IN (${clientIds.join(',')})
                AND history_o.order_state = 'Completed'
              GROUP BY history_o.user_id
            `
          )
        : [];
      const customerHistoryByClientId = new Map(
        customerHistoryRows.map((row) => [
          Number(row.clientId),
          {
            clientTotalVisits: Number(row.clientTotalVisits || 0),
            clientTippedVisits: Number(row.clientTippedVisits || 0),
          },
        ])
      );

      const data: CvTipRecord[] = dbRows.map((row) => {
        const cvTipAmount = Math.round(Number(row.cvTipAmount || 0));
        const totalCustomerTip = Math.round(Number(row.totalCustomerTip || 0));
        const tipStatus = resolveTipStatus(totalCustomerTip);
        const customerHistory = customerHistoryByClientId.get(Number(row.clientId || 0));
        return {
          orderId: Number(row.orderId),
          serviceId: Number(row.serviceId),
          checkinTime: String(row.checkinTime || ''),
          clientId: Number(row.clientId || 0),
          clientName: String(row.clientName || ''),
          store: String(row.store || 'PXL'),
          serviceName: String(row.serviceName || ''),
          techName: String(row.techName || ''),
          avatar: String(row.avatar || '') || null,
          totalCustomerTip,
          cvTipAmount,
          cvTipPercentage: Number(row.cvTipPercentage || 70),
          tipStatus,
          clientTippedVisits: customerHistory?.clientTippedVisits || 0,
          clientTotalVisits: customerHistory?.clientTotalVisits || 0,
        };
      });

      const summaryRow = summaryRows[0] || {};
      const totalVisits = Number(summaryRow.totalVisits || 0);
      const tippedVisits = Number(summaryRow.tippedVisits || 0);
      const summary = shouldIncludeSummary
        ? {
            totalVisits,
            tippedVisits,
            nonTippedVisits: Math.max(0, totalVisits - tippedVisits),
            tipRatePercent: totalVisits > 0 ? Math.min(100, Math.round((tippedVisits / totalVisits) * 100)) : 0,
            totalCustomerTip: Math.round(Number(summaryRow.totalCustomerTip || 0)),
            totalCvTipBonus: Math.round(Number(summaryRow.totalCvTipBonus || 0)),
          }
        : emptyCvTipSummary;

      const response: CvTipResponse = {
        data,
        total: Number(countRows[0]?.total || 0),
        summary,
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV Tip records');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy danh sách chi tiết CV Tip.' });
    }
  });
}
