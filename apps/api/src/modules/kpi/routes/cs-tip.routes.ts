import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import {
  CsTipGroupMetrics,
  CsTipQueryParams,
  CsTipRecord,
  CsTipResponse,
  CsTipStoreBreakdown,
  CsTipSummary,
  SafeAny,
} from '@mos-lab/shared';
import { buildComboLiveAtBookingSql } from '../../customers/services/combo-recognition.service.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDatePart(value: string | undefined, fallback: string): string {
  const datePart = value?.includes('T') ? value.split('T')[0] : value;
  return datePart && ISO_DATE_PATTERN.test(datePart) ? datePart : fallback;
}

function buildActualCheckinOrdersWithLiveCte(comboLiveSql: string): string {
  return `
    WITH filtered_orders AS (
      SELECT ro.order_id AS orderId, ro.actual_booking_date_start AS checkinTime
      FROM report_order ro
      INNER JOIN \`order\` o ON o.id = ro.order_id
      WHERE o.order_state = 'Completed'
        AND ro.actual_booking_date_start >= ?
        AND ro.actual_booking_date_start <= ?

      UNION ALL

      SELECT o.id AS orderId, o.booking_date_start AS checkinTime
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND ro.actual_booking_date_start IS NULL
        AND o.booking_date_start >= ?
        AND o.booking_date_start <= ?
    ),
    orders_with_live AS (
      SELECT
        fo.orderId,
        fo.checkinTime,
        o.user_id,
        o.client_store_id,
        CASE WHEN (${comboLiveSql}) THEN 1 ELSE 0 END AS is_combo_live
      FROM filtered_orders fo
      JOIN \`order\` o ON o.id = fo.orderId
    )
  `;
}

function actualCheckinQueryParams(startPart: string, endPart: string): string[] {
  const start = startPart.includes(' ') ? startPart : `${startPart} 00:00:00`;
  const end = endPart.includes(' ') ? endPart : `${endPart} 23:59:59`;
  return [start, end, start, end];
}

function calculateGroupMetrics(
  visits: number,
  tippedVisits: number,
  customerTip: number,
  totalCustomerTip: number
): CsTipGroupMetrics {
  const roundedTip = Math.round(customerTip);
  return {
    totalCustomerTip: roundedTip,
    csTipBonus: Math.round(roundedTip * 0.03),
    totalVisits: visits,
    tippedVisits,
    tipRatePercent: visits > 0 ? Math.round((tippedVisits / visits) * 1000) / 10 : 0,
    avgTipPerVisit: visits > 0 ? Math.round(roundedTip / visits) : 0,
    avgTipPerTippedVisit: tippedVisits > 0 ? Math.round(roundedTip / tippedVisits) : 0,
    sharePercent: totalCustomerTip > 0 ? Math.round((roundedTip / totalCustomerTip) * 1000) / 10 : 0,
  };
}

export async function registerCsTipRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/kpi/cs-tip', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as CsTipQueryParams;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const dateFrom = normalizeDatePart(query.dateFrom, todayStr);
    const dateTo = normalizeDatePart(query.dateTo, todayStr);
    const storeId = query.storeId || 'ALL';
    const customerType = query.customerType || 'ALL';
    const tipFilter = query.tipFilter || 'ALL';
    const search = query.search?.trim();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const filteredOrdersCte = buildActualCheckinOrdersCte();
    const dateQueryParams = actualCheckinQueryParams(dateFrom, dateTo);
    const comboLiveSql = buildComboLiveAtBookingSql('o');

    let storeFilterClause = '';
    const storeQueryParams: string[] = [];
    if (storeId && storeId !== 'ALL') {
      storeFilterClause = 'AND (csl.client_store_name LIKE ? OR cs.client_store_key LIKE ?)';
      storeQueryParams.push(`%${storeId}%`, `%${storeId}%`);
    }

    // 1. Query Summary Metrics
    const summarySql = `
      ${filteredOrdersCte}
      SELECT
        COUNT(DISTINCT fo.orderId) AS totalVisits,
        COUNT(DISTINCT CASE WHEN COALESCE(st.customer_tip, 0) > 0 THEN fo.orderId END) AS totalTippedVisits,
        COALESCE(SUM(st.customer_tip), 0) AS totalCustomerTip,

        COUNT(DISTINCT CASE WHEN (${comboLiveSql}) THEN fo.orderId END) AS locaVisits,
        COUNT(DISTINCT CASE WHEN (${comboLiveSql}) AND COALESCE(st.customer_tip, 0) > 0 THEN fo.orderId END) AS locaTippedVisits,
        COALESCE(SUM(CASE WHEN (${comboLiveSql}) THEN st.customer_tip ELSE 0 END), 0) AS locaCustomerTip,

        COUNT(DISTINCT CASE WHEN NOT (${comboLiveSql}) THEN fo.orderId END) AS singleVisits,
        COUNT(DISTINCT CASE WHEN NOT (${comboLiveSql}) AND COALESCE(st.customer_tip, 0) > 0 THEN fo.orderId END) AS singleTippedVisits,
        COALESCE(SUM(CASE WHEN NOT (${comboLiveSql}) THEN st.customer_tip ELSE 0 END), 0) AS singleCustomerTip
      FROM filtered_orders fo
      JOIN \`order\` o ON o.id = fo.orderId
      LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
      LEFT JOIN client_store cs ON cs.id = o.client_store_id
      LEFT JOIN (
        SELECT
          st.order_id,
          MAX(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END) AS customer_tip
        FROM staff_tip st
        JOIN filtered_orders tip_orders ON tip_orders.orderId = st.order_id
        WHERE st.tip_amount > 0
        GROUP BY st.order_id
      ) st ON st.order_id = fo.orderId
      WHERE 1 = 1
        ${storeFilterClause}
    `;

    // 2. Query Store Breakdown
    const storeBreakdownSql = `
      ${filteredOrdersCte}
      SELECT
        COALESCE(cs.client_store_key, 'DT') AS storeKey,
        COALESCE(csl.client_store_name, 'Đề Thám') AS storeName,
        COUNT(DISTINCT fo.orderId) AS totalVisits,
        COUNT(DISTINCT CASE WHEN COALESCE(st.customer_tip, 0) > 0 THEN fo.orderId END) AS totalTippedVisits,
        COALESCE(SUM(st.customer_tip), 0) AS totalCustomerTip,

        COUNT(DISTINCT CASE WHEN (${comboLiveSql}) THEN fo.orderId END) AS locaVisits,
        COALESCE(SUM(CASE WHEN (${comboLiveSql}) THEN st.customer_tip ELSE 0 END), 0) AS locaCustomerTip,

        COUNT(DISTINCT CASE WHEN NOT (${comboLiveSql}) THEN fo.orderId END) AS singleVisits,
        COALESCE(SUM(CASE WHEN NOT (${comboLiveSql}) THEN st.customer_tip ELSE 0 END), 0) AS singleCustomerTip
      FROM filtered_orders fo
      JOIN \`order\` o ON o.id = fo.orderId
      LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
      LEFT JOIN client_store cs ON cs.id = o.client_store_id
      LEFT JOIN (
        SELECT
          st.order_id,
          MAX(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END) AS customer_tip
        FROM staff_tip st
        JOIN filtered_orders tip_orders ON tip_orders.orderId = st.order_id
        WHERE st.tip_amount > 0
        GROUP BY st.order_id
      ) st ON st.order_id = fo.orderId
      WHERE 1 = 1
        ${storeFilterClause}
      GROUP BY cs.client_store_key, csl.client_store_name
      ORDER BY totalCustomerTip DESC
    `;

    // 3. Build Record Filter Conditions
    let recordFilterClause = '';
    const recordQueryParams: SafeAny[] = [];

    if (customerType === 'LOCA') {
      recordFilterClause += ` AND (${comboLiveSql})`;
    } else if (customerType === 'SINGLE') {
      recordFilterClause += ` AND NOT (${comboLiveSql})`;
    }

    if (tipFilter === 'TIPPED') {
      recordFilterClause += ' AND COALESCE(st.customer_tip, 0) > 0';
    } else if (tipFilter === 'NO_TIP') {
      recordFilterClause += ' AND COALESCE(st.customer_tip, 0) = 0';
    }

    if (search) {
      if (/^\d+$/.test(search)) {
        recordFilterClause += ` AND (fo.orderId = ? OR EXISTS (
          SELECT 1 FROM user_contact uc WHERE uc.user_id = o.user_id AND uc.phone_number LIKE ? AND uc.is_disabled = 0
        ))`;
        recordQueryParams.push(Number(search), `%${search}%`);
      } else {
        recordFilterClause += ` AND (up.full_name LIKE ? OR EXISTS (
          SELECT 1 FROM user_contact uc WHERE uc.user_id = o.user_id AND uc.phone_number LIKE ? AND uc.is_disabled = 0
        ))`;
        recordQueryParams.push(`%${search}%`, `%${search}%`);
      }
    }

    // 4. Query Total Records Count
    const countSql = `
      ${filteredOrdersCte}
      SELECT COUNT(DISTINCT fo.orderId) AS totalCount
      FROM filtered_orders fo
      JOIN \`order\` o ON o.id = fo.orderId
      LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
      LEFT JOIN client_store cs ON cs.id = o.client_store_id
      LEFT JOIN \`user_profile\` up ON up.user_id = o.user_id
      LEFT JOIN (
        SELECT
          st.order_id,
          MAX(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END) AS customer_tip
        FROM staff_tip st
        JOIN filtered_orders tip_orders ON tip_orders.orderId = st.order_id
        WHERE st.tip_amount > 0
        GROUP BY st.order_id
      ) st ON st.order_id = fo.orderId
      WHERE 1 = 1
        ${storeFilterClause}
        ${recordFilterClause}
    `;

    // 5. Query Records with Pagination
    const recordsSql = `
      ${filteredOrdersCte}
      SELECT
        fo.orderId,
        fo.checkinTime,
        COALESCE(up.full_name, 'Khách hàng') AS customerName,
        (SELECT uc.phone_number FROM user_contact uc WHERE uc.user_id = o.user_id AND uc.is_disabled = 0 ORDER BY uc.id DESC LIMIT 1) AS customerPhone,
        COALESCE(csl.client_store_name, 'Đề Thám') AS storeName,
        COALESCE(cs.client_store_key, 'DT') AS storeKey,
        CASE WHEN (${comboLiveSql}) THEN 1 ELSE 0 END AS isLoCa,
        COALESCE(st.customer_tip, 0) AS totalCustomerTip,
        staff_info.tech_name AS technicianName,
        staff_info.cc_name AS ccName
      FROM filtered_orders fo
      JOIN \`order\` o ON o.id = fo.orderId
      LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
      LEFT JOIN client_store cs ON cs.id = o.client_store_id
      LEFT JOIN \`user_profile\` up ON up.user_id = o.user_id
      LEFT JOIN (
        SELECT
          st.order_id,
          MAX(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END) AS customer_tip
        FROM staff_tip st
        JOIN filtered_orders tip_orders ON tip_orders.orderId = st.order_id
        WHERE st.tip_amount > 0
        GROUP BY st.order_id
      ) st ON st.order_id = fo.orderId
      LEFT JOIN (
        SELECT
          os.order_id,
          MAX(tech_p.full_name) as tech_name,
          MAX(cc_p.full_name) as cc_name
        FROM order_service os
        JOIN filtered_orders os_orders ON os_orders.orderId = os.order_id
        LEFT JOIN user_profile tech_p ON tech_p.user_id = os.assigned_staff_id
        LEFT JOIN user_profile cc_p ON cc_p.user_id = COALESCE(NULLIF(os.check_out_staff_id, 0), os.check_in_staff_id)
        GROUP BY os.order_id
      ) staff_info ON staff_info.order_id = fo.orderId
      WHERE 1 = 1
        ${storeFilterClause}
        ${recordFilterClause}
      ORDER BY fo.checkinTime DESC, fo.orderId DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const [summaryRows, storeRows, countRows, recordsRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(summarySql, ...dateQueryParams, ...storeQueryParams),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(storeBreakdownSql, ...dateQueryParams, ...storeQueryParams),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          countSql,
          ...dateQueryParams,
          ...storeQueryParams,
          ...recordQueryParams
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          recordsSql,
          ...dateQueryParams,
          ...storeQueryParams,
          ...recordQueryParams,
          limit,
          offset
        ),
      ]);

      const rawSummary = summaryRows[0] || {};
      const totalVisits = Number(rawSummary.totalVisits || 0);
      const totalTippedVisits = Number(rawSummary.totalTippedVisits || 0);
      const totalCustomerTip = Number(rawSummary.totalCustomerTip || 0);

      const locaVisits = Number(rawSummary.locaVisits || 0);
      const locaTippedVisits = Number(rawSummary.locaTippedVisits || 0);
      const locaCustomerTip = Number(rawSummary.locaCustomerTip || 0);

      const singleVisits = Number(rawSummary.singleVisits || 0);
      const singleTippedVisits = Number(rawSummary.singleTippedVisits || 0);
      const singleCustomerTip = Number(rawSummary.singleCustomerTip || 0);

      const summary: CsTipSummary = {
        csBonusRatePercent: 3,
        total: calculateGroupMetrics(totalVisits, totalTippedVisits, totalCustomerTip, totalCustomerTip),
        loca: calculateGroupMetrics(locaVisits, locaTippedVisits, locaCustomerTip, totalCustomerTip),
        single: calculateGroupMetrics(singleVisits, singleTippedVisits, singleCustomerTip, totalCustomerTip),
      };

      const storeBreakdown: CsTipStoreBreakdown[] = storeRows.map((row) => {
        const rowTotalTip = Math.round(Number(row.totalCustomerTip || 0));
        const rowLocaTip = Math.round(Number(row.locaCustomerTip || 0));
        const rowSingleTip = Math.round(Number(row.singleCustomerTip || 0));

        return {
          storeKey: String(row.storeKey || 'DT').toUpperCase(),
          storeName: String(row.storeName || 'Đề Thám'),
          totalVisits: Number(row.totalVisits || 0),
          totalTippedVisits: Number(row.totalTippedVisits || 0),
          totalCustomerTip: rowTotalTip,
          totalCsTipBonus: Math.round(rowTotalTip * 0.03),
          locaVisits: Number(row.locaVisits || 0),
          locaCustomerTip: rowLocaTip,
          locaCsTipBonus: Math.round(rowLocaTip * 0.03),
          singleVisits: Number(row.singleVisits || 0),
          singleCustomerTip: rowSingleTip,
          singleCsTipBonus: Math.round(rowSingleTip * 0.03),
        };
      });

      const totalRecords = Number(countRows[0]?.totalCount || 0);
      const records: CsTipRecord[] = recordsRows.map((r) => {
        const tipVal = Math.round(Number(r.totalCustomerTip || 0));
        const isLoCa = Boolean(Number(r.isLoCa) === 1);

        return {
          orderId: Number(r.orderId),
          checkinTime: r.checkinTime ? new Date(r.checkinTime).toISOString().replace('T', ' ').slice(0, 19) : '',
          customerName: String(r.customerName || 'Khách hàng'),
          customerPhone: r.customerPhone ? String(r.customerPhone) : null,
          store: String(r.storeKey || r.storeName || 'PXL').toUpperCase(),
          isLoCa,
          customerType: isLoCa ? 'LoCa' : 'Khách Lẻ',
          technicianName: r.technicianName ? String(r.technicianName) : null,
          ccName: r.ccName ? String(r.ccName) : null,
          totalCustomerTip: tipVal,
          csTipBonus: Math.round(tipVal * 0.03),
          hasTip: tipVal > 0,
        };
      });

      const responsePayload: CsTipResponse = {
        summary,
        storeBreakdown,
        records,
        pagination: {
          page,
          limit,
          total: totalRecords,
          totalPages: Math.ceil(totalRecords / limit) || 1,
        },
      };

      return reply.send(responsePayload);
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Error executing GET /kpi/cs-tip');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi khi truy vấn số liệu Báo Cáo CS Tip.',
      });
    }
  });
}
