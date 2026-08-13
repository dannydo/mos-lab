import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as CrmPrismaClient } from '../generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';
import { SafeAny } from '@mos-lab/shared';
import { CcKpiService, parseDateRange } from '../modules/kpi/services/cc-kpi.service.js';
import { ComboRecognitionService } from '../modules/customers/services/combo-recognition.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const legacy = new LegacyPrismaClient();
const crm = new CrmPrismaClient();

const dateFrom = process.argv[2] || new Date().toLocaleDateString('en-CA').slice(0, 7) + '-01';
const dateTo = process.argv[3] || new Date().toLocaleDateString('en-CA');
const storeId = process.argv[4] || 'ALL';

const startBound = `${dateFrom} 00:00:00`;
const endBound = `${dateTo} 23:59:59`;

const fastify = {
  prisma: { legacy, crm },
  log: {
    error: (error: unknown, message?: string) => console.error(message || 'error', error),
    warn: (error: unknown, message?: string) => console.warn(message || 'warning', error),
  },
} as SafeAny;

const comboCandidateSql = `
  SELECT
    candidate.source,
    candidate.orderId,
    candidate.userId,
    candidate.serviceId,
    candidate.servicePriceId,
    candidate.currentSaleAt,
    candidate.actualSaleAt,
    EXISTS (
      SELECT 1
      FROM user_service_balance usb
      WHERE usb.user_id = candidate.userId
    ) AS hasAnyBalance,
    EXISTS (
      SELECT 1
      FROM user_service_balance usb
      WHERE usb.user_id = candidate.userId
        AND usb.service_id = candidate.serviceId
        AND (
          usb.service_price_id = candidate.servicePriceId
          OR usb.service_price_id IS NULL
          OR candidate.servicePriceId IS NULL
        )
    ) AS hasServiceBalance,
    EXISTS (
      SELECT 1
      FROM user_service_balance usb
      WHERE usb.user_id = candidate.userId
        AND JSON_VALID(usb.tracking_key)
        AND CAST(JSON_UNQUOTE(JSON_EXTRACT(usb.tracking_key, '$.order_id')) AS UNSIGNED) = candidate.orderId
    ) AS hasTrackedOrder
  FROM (
    SELECT
      'order_service_combo' AS source,
      o.id AS orderId,
      o.user_id AS userId,
      osc.service_id AS serviceId,
      osc.service_price_id AS servicePriceId,
      COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created) AS currentSaleAt,
      COALESCE(ro.actual_booking_date_start, o.booking_date_start) AS actualSaleAt
    FROM \`order\` o
    JOIN order_service_combo osc ON osc.order_id = o.id
    LEFT JOIN report_order ro ON ro.order_id = o.id
    LEFT JOIN service_price sp ON sp.id = osc.service_price_id
    LEFT JOIN service_language sl ON sl.service_id = osc.service_id AND sl.language_id = 1
    WHERE o.order_state = 'Completed'
      AND osc.total_price > 0
      AND (sp.service_price_package_key IS NULL OR (
        LOWER(sp.service_price_package_key) NOT LIKE '%single%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
      ))
      AND (sl.service_name IS NULL OR (
        LOWER(sl.service_name) NOT LIKE '%single%'
        AND LOWER(sl.service_name) NOT LIKE '%refill%'
        AND LOWER(sl.service_name) NOT LIKE '%balance%'
      ))

    UNION ALL

    SELECT
      'order_service' AS source,
      o.id AS orderId,
      o.user_id AS userId,
      os.service_id AS serviceId,
      os.service_price_id AS servicePriceId,
      COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created) AS currentSaleAt,
      COALESCE(ro.actual_booking_date_start, o.booking_date_start) AS actualSaleAt
    FROM \`order\` o
    JOIN order_service os ON os.order_id = o.id
    LEFT JOIN report_order ro ON ro.order_id = o.id
    LEFT JOIN service s ON s.id = os.service_id
    LEFT JOIN service_price sp ON sp.id = os.service_price_id
    LEFT JOIN service_language sl ON sl.service_id = os.service_id AND sl.language_id = 1
    WHERE o.order_state = 'Completed'
      AND os.total_price > 0
      AND (os.user_service_type = 'combo' OR os.service_group = 'combo' OR s.service_group = 'combo')
      AND (sp.service_price_package_key IS NULL OR (
        LOWER(sp.service_price_package_key) NOT LIKE '%single%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
      ))
      AND (sl.service_name IS NULL OR (
        LOWER(sl.service_name) NOT LIKE '%single%'
        AND LOWER(sl.service_name) NOT LIKE '%refill%'
        AND LOWER(sl.service_name) NOT LIKE '%balance%'
      ))
  ) candidate
  WHERE candidate.currentSaleAt BETWEEN ? AND ?
  ORDER BY candidate.currentSaleAt DESC, candidate.orderId DESC
`;

function summarizeComboRows(rows: SafeAny[]) {
  const currentOrderIds = new Set(rows.map((row) => Number(row.orderId)));
  // The outer SQL already bounds currentSaleAt. When actualSaleAt exists it is the same
  // two-level COALESCE value and therefore necessarily falls inside that SQL range.
  const actualRows = rows.filter((row) => Boolean(row.actualSaleAt));
  const actualOrderIds = new Set(actualRows.map((row) => Number(row.orderId)));
  const serviceBalanceOrderIds = new Set(
    actualRows.filter((row) => Number(row.hasServiceBalance) === 1).map((row) => Number(row.orderId))
  );
  const trackedOrderIds = new Set(
    actualRows.filter((row) => Number(row.hasTrackedOrder) === 1).map((row) => Number(row.orderId))
  );

  return {
    sourceRows: rows.reduce<Record<string, number>>((acc, row) => {
      const source = String(row.source);
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {}),
    currentCandidateRows: rows.length,
    currentDistinctOrders: currentOrderIds.size,
    actualCheckinRows: actualRows.length,
    actualCheckinDistinctOrders: actualOrderIds.size,
    withMatchingServiceBalance: serviceBalanceOrderIds.size,
    withCurrentlyTrackedOrder: trackedOrderIds.size,
    removedDateCreatedFallbackOrders: [...currentOrderIds].filter((id) => !actualOrderIds.has(id)).slice(0, 20),
    missingServiceBalanceOrders: [...actualOrderIds].filter((id) => !serviceBalanceOrderIds.has(id)).slice(0, 20),
    missingServiceBalanceSamples: actualRows
      .filter((row) => Number(row.hasServiceBalance) !== 1)
      .slice(0, 10)
      .map((row) => ({
        source: row.source,
        orderId: Number(row.orderId),
        userId: Number(row.userId),
        serviceId: Number(row.serviceId),
        servicePriceId: Number(row.servicePriceId),
        hasAnyBalance: Number(row.hasAnyBalance),
        hasTrackedOrder: Number(row.hasTrackedOrder),
      })),
    sampleCandidates: rows.slice(0, 5).map((row) => ({
      orderId: Number(row.orderId),
      currentSaleAt: row.currentSaleAt,
      actualSaleAt: row.actualSaleAt,
      hasServiceBalance: Number(row.hasServiceBalance),
      hasTrackedOrder: Number(row.hasTrackedOrder),
    })),
  };
}

function aggregateXoay(rows: SafeAny[]) {
  const byStaff = new Map<
    number,
    { displayName: string; totalBonus: number; totalServices: number; totalPoints: number; orderIds: Set<number> }
  >();

  for (const row of rows) {
    const staffId = Number(row.consultantId);
    if (!staffId) continue;
    const current = byStaff.get(staffId) || {
      displayName: String(row.consultantName || `CC ${staffId}`),
      totalBonus: 0,
      totalServices: 0,
      totalPoints: 0,
      orderIds: new Set<number>(),
    };
    current.totalBonus += Math.round(Number(row.consultantBonus) || 0);
    current.totalServices += 1;
    current.totalPoints = Number(row.pointsAccu) || current.totalPoints;
    if (row.orderId) current.orderIds.add(Number(row.orderId));
    byStaff.set(staffId, current);
  }

  return byStaff;
}

async function run() {
  const [comboRows, stores] = await Promise.all([
    legacy.$queryRawUnsafe<SafeAny[]>(comboCandidateSql, startBound, endBound),
    legacy.$queryRawUnsafe<SafeAny[]>('SELECT id, client_store_key FROM client_store ORDER BY id'),
  ]);
  const recognizedComboCustomerIds = await ComboRecognitionService.getNewLoCaCustomerIds(fastify, dateFrom, dateTo);

  const currentLeaderboard = await CcKpiService.getCcLeaderboard(fastify, { dateFrom, dateTo, storeId });
  const xoayReport = await CcKpiService.getCcXoayReport(fastify, {
    dateFrom,
    dateTo,
    storeId,
    page: 1,
    limit: 100000,
  });
  const xoayByStaff = aggregateXoay(xoayReport.data);
  const leaderboardByStaff = new Map(
    (currentLeaderboard.data || []).map((row: SafeAny) => [Number(row.consultantId), row] as const)
  );

  const staffIds = new Set([...xoayByStaff.keys(), ...leaderboardByStaff.keys()]);
  const ccDiff = [...staffIds]
    .map((staffId) => {
      const xoay = xoayByStaff.get(staffId);
      const leaderboard = leaderboardByStaff.get(staffId);
      const detailBonus = xoay?.totalBonus || 0;
      const leaderboardBonus = Math.round(Number(leaderboard?.totalConsultantBonus) || 0);
      return {
        staffId,
        displayName: xoay?.displayName || leaderboard?.displayName || `CC ${staffId}`,
        detailBonus,
        leaderboardBonus,
        delta: leaderboardBonus - detailBonus,
        detailServices: xoay?.totalServices || 0,
        leaderboardServices: Number(leaderboard?.totalServices) || 0,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const { startStr, endStr } = parseDateRange(dateFrom, dateTo);
  const storeFilter =
    storeId !== 'ALL' && Number.isFinite(Number(storeId)) ? `AND o.client_store_id = ${Number(storeId)}` : '';
  const bonusDateAudit = await legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT
      COUNT(*) AS totalRows,
      SUM(CASE WHEN sb.bonus_type = 'Cash' THEN 1 ELSE 0 END) AS cashRows,
      SUM(CASE WHEN DATE(sb.date_created) <> DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) THEN 1 ELSE 0 END) AS dateMismatchRows,
      COUNT(DISTINCT CASE WHEN sb.bonus_type = 'Cash' THEN sb.order_service_id END) AS servicesWithCash,
      COUNT(DISTINCT CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.order_service_id END) AS servicesWithPoints
    FROM staff_bonus sb
    JOIN \`order\` o ON o.id = sb.order_id
    LEFT JOIN report_order ro ON ro.order_id = o.id
    WHERE o.order_state = 'Completed'
      AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) BETWEEN '${startStr} 00:00:00' AND '${endStr} 23:59:59'
      ${storeFilter}
  `);

  const missingComboRows = comboRows.filter((row) => Boolean(row.actualSaleAt) && Number(row.hasServiceBalance) !== 1);
  const missingUserIds = Array.from(new Set(missingComboRows.map((row) => Number(row.userId)))).filter(Boolean);
  const missingBalanceDetails =
    missingUserIds.length > 0
      ? await legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT
            usb.id,
            usb.user_id AS userId,
            usb.service_id AS serviceId,
            s.parent_service_id AS parentServiceId,
            usb.service_price_id AS servicePriceId,
            usb.service_price_group AS servicePriceGroup,
            usb.normal_count AS normalCount,
            usb.retain_count AS retainCount,
            usb.tracking_key AS trackingKey
          FROM user_service_balance usb
          LEFT JOIN service s ON s.id = usb.service_id
          WHERE usb.user_id IN (${missingUserIds.join(',')})
          ORDER BY usb.user_id, usb.id
        `)
      : [];

  console.log(
    JSON.stringify(
      {
        filters: { dateFrom, dateTo, storeId },
        stores,
        combo: summarizeComboRows(comboRows),
        recognizedComboCustomers: recognizedComboCustomerIds.length,
        missingBalanceDetails,
        cc: {
          currentLeaderboardRows: currentLeaderboard.data?.length || 0,
          detailRows: xoayReport.data.length,
          detailSummaryBonus: xoayReport.summary.totalBonus,
          leaderboardSummaryBonus: (currentLeaderboard.data || []).reduce(
            (sum: number, row: SafeAny) => sum + Math.round(Number(row.totalConsultantBonus) || 0),
            0
          ),
          staffDiff: ccDiff,
          bonusDateAudit: bonusDateAudit[0] || null,
        },
      },
      (_key, value) => (typeof value === 'bigint' ? Number(value) : value),
      2
    )
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([legacy.$disconnect(), crm.$disconnect()]);
  });
