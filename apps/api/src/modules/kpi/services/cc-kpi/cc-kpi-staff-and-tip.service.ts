import { FastifyInstance } from 'fastify';
import { CC_GAMIFICATION_SYSTEM_CONFIG, SafeAny } from '@mos-lab/shared';
import { TeamService } from '../../../teams/team.service.js';
import { buildExcludeTrainingCvlOrderSql, CvlTrainingMentorshipService } from '../cvl-training-mentorship.service.js';
import { CcKpiFilters, buildCashTipCurrencyPredicate, parseDateRange } from './cc-kpi-helpers.js';

/**
 * Helper: Get configured active CC staff IDs from crmConfig (ACTIVE_CC_STAFF_CONFIG)
 */
export async function getActiveCcStaffIds(fastify: FastifyInstance): Promise<number[]> {
  const ids = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CC', 'ACTIVE_CC_STAFF_CONFIG');
  if (ids.length > 0) return ids;

  // Ultimate fallback: query legacy DB for Client Consultant staff
  try {
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT DISTINCT up.user_id
        FROM \`user_profile\` up
        LEFT JOIN \`user_group\` ug ON ug.id = up.user_group_id
        LEFT JOIN \`user_group_language\` ugl ON ugl.user_group_id = ug.id AND ugl.language_id = 1
        WHERE up.provider = 'Staff' AND up.is_disabled = 0 
          AND (
            up.user_group_id = 5 
            OR ugl.user_group_name LIKE '%Client Consultant%' 
            OR ugl.user_group_name LIKE '%Tư vấn viên%'
            OR up.user_id IN (SELECT DISTINCT user_id FROM \`staff_payroll_client_consultant\`)
          )
      `);
    if (rows && rows.length > 0) {
      return rows.map((r) => Number(r.user_id)).filter((id) => !isNaN(id) && id > 0);
    }
  } catch (err) {
    fastify.log.error(err as Error, 'Error querying Client Consultant staff roles from legacy DB');
  }

  // Default fallback list of active CC staff IDs
  return [...CC_GAMIFICATION_SYSTEM_CONFIG.FALLBACK_ACTIVE_CC_STAFF_IDS];
}

/**
 * 4. GET CC Tip Report Data (20% Tip share with 50/50 split when CC In != CC Out)
 */
export async function getCcTipReport(fastify: FastifyInstance, filters: CcKpiFilters) {
  const { dateFrom, dateTo, storeId } = filters;
  const activeCcIds = await getActiveCcStaffIds(fastify);

  const { startStr: startDateStr, endStr: endDateStr } = parseDateRange(dateFrom, dateTo);
  const activeTrainingPairs = await CvlTrainingMentorshipService.getActivePairsForRange(
    fastify,
    startDateStr,
    endDateStr
  );
  const excludeTrainingTipSql = buildExcludeTrainingCvlOrderSql(
    activeTrainingPairs,
    'o.id',
    'COALESCE(ro.actual_booking_date_start, o.booking_date_start)'
  );
  const startStr = `${startDateStr} 00:00:00`;
  const endStr = `${endDateStr} 23:59:59`;

  let activeCcFilter = '';
  if (activeCcIds && activeCcIds.length > 0) {
    activeCcFilter = ` AND st.user_id IN (${activeCcIds.join(',')})`;
  }

  let storeFilterClause = '';
  if (storeId && storeId !== 'ALL') {
    const numericStoreId = parseInt(storeId, 10);
    if (!isNaN(numericStoreId)) {
      storeFilterClause = ` AND o.client_store_id = ${numericStoreId}`;
    }
  }

  const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        st.user_id as staffId,
        up.full_name as displayName,
        up.avatar as avatar,
        COUNT(DISTINCT st.order_id) as tipOrderCount,
        SUM(st.tip_amount) as totalTipAmount,
        SUM(st.tip_amount * (st.tip_percentage / 100)) as totalCcTipBonus
      FROM \`staff_tip\` st
      JOIN \`order\` o ON st.order_id = o.id
      LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
      JOIN \`user_profile\` up ON up.user_id = st.user_id
      WHERE o.order_state = 'Completed'
        AND st.date_created_only >= DATE('${startStr}') - INTERVAL 2 DAY
        AND st.date_created_only <= DATE('${endStr}') + INTERVAL 2 DAY
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startStr}'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endStr}'
        AND ${buildCashTipCurrencyPredicate()}
        ${activeCcFilter}
        ${storeFilterClause}
        ${excludeTrainingTipSql}
      GROUP BY st.user_id, up.full_name, up.avatar
      ORDER BY totalCcTipBonus DESC
    `);

  const result = rows.map((r, index) => ({
    rank: index + 1,
    staffId: Number(r.staffId),
    displayName: String(r.displayName || `CC ${r.staffId}`),
    avatar: r.avatar ? String(r.avatar) : null,
    tipOrderCount: Number(r.tipOrderCount || 0),
    totalTipAmount: Math.round(Number(r.totalTipAmount || 0)),
    totalCcTipBonus: Math.round(Number(r.totalCcTipBonus || 0)),
  }));

  const totalTipBonusSum = result.reduce((sum, r) => sum + r.totalCcTipBonus, 0);

  return {
    data: result,
    total: result.length,
    summary: {
      totalTipBonusSum,
    },
  };
}
