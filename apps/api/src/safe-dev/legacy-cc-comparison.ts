import { calculateWheelBonusCap, type LegacyCcComparisonResponse } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { buildCashTipCurrencyPredicate, CcKpiService } from '../modules/kpi/services/cc-kpi.service.js';

export const LEGACY_COMPARISON_PERIODS = [
  { periodKey: '2026-08', dateFrom: '2026-08-01', dateTo: '2026-08-31' },
  { periodKey: '2026-09', dateFrom: '2026-09-01', dateTo: '2026-09-30' },
] as const;

export type LegacyCcComparisonSubject = { legacyStaffId: number; displayName: string };
const DEFAULT_SUBJECT: LegacyCcComparisonSubject = { legacyStaffId: 37790, displayName: 'Diễm Hương' };

/**
 * Reads existing Legacy results only for a purpose-limited local comparison.
 * It intentionally neither creates mOS evidence nor stages a settlement: the
 * Legacy data is useful for parity review, but is not an immutable mOS source.
 */
export async function getLegacyCcComparison(
  fastify: FastifyInstance,
  subject: LegacyCcComparisonSubject = DEFAULT_SUBJECT
): Promise<LegacyCcComparisonResponse> {
  const months = await Promise.all(
    LEGACY_COMPARISON_PERIODS.map(async ({ periodKey, dateFrom, dateTo }) => {
      const [xoay, daily, tipRows] = await Promise.all([
        CcKpiService.getCcXoayReport(fastify, {
          dateFrom,
          dateTo,
          consultantId: String(subject.legacyStaffId),
          limit: 100_000,
        }),
        CcKpiService.getCcDailySalesBonus(fastify, {
          dateFrom,
          dateTo,
          consultantId: String(subject.legacyStaffId),
        }),
        fastify.prisma.legacy.$queryRawUnsafe<
          Array<{
            cashTipVnd: number | null;
            cashTipRows: number;
            tipPercentages: string | null;
            handoff10Vnd: number | null;
            fullFlow20Vnd: number | null;
            ruleMismatchVnd: number | null;
            handoff10Rows: number;
            fullFlow20Rows: number;
            ruleMismatchRows: number;
          }>
        >(`
          SELECT
            -- Legacy CC payslips already store the CC's credited share in
            -- tip_amount. 10% is one end of the visit; 20% is both ends.
            COALESCE(SUM(CASE
              WHEN (
                st.tip_percentage = 20
                AND EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id)
              ) OR (
                st.tip_percentage = 10
                AND (
                  (EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                   AND NOT EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))
                  OR
                  (NOT EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                   AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))
                )
              )
              THEN st.tip_amount ELSE 0 END), 0) AS cashTipVnd,
            COUNT(CASE WHEN (
              st.tip_percentage = 20
              AND EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
              AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id)
            ) OR (
              st.tip_percentage = 10
              AND (
                (EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                 AND NOT EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))
                OR
                (NOT EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                 AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))
              )
            ) THEN 1 END) AS cashTipRows,
            GROUP_CONCAT(DISTINCT st.tip_percentage ORDER BY st.tip_percentage) AS tipPercentages
            ,COALESCE(SUM(CASE WHEN st.tip_percentage = 10
              AND ((EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                    AND NOT EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))
                OR (NOT EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                    AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id)))
              THEN st.tip_amount ELSE 0 END), 0) AS handoff10Vnd
            ,COALESCE(SUM(CASE WHEN st.tip_percentage = 20
              AND EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
              AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id)
              THEN st.tip_amount ELSE 0 END), 0) AS fullFlow20Vnd
            ,COALESCE(SUM(CASE WHEN NOT (
              (st.tip_percentage = 20
               AND EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
               AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))
              OR
              (st.tip_percentage = 10
               AND ((EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                     AND NOT EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))
                 OR (NOT EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                     AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))))
            ) THEN st.tip_amount ELSE 0 END), 0) AS ruleMismatchVnd
            ,COUNT(CASE WHEN st.tip_percentage = 10
              AND ((EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                    AND NOT EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))
                OR (NOT EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                    AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))) THEN 1 END) AS handoff10Rows
            ,COUNT(CASE WHEN st.tip_percentage = 20
              AND EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
              AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id) THEN 1 END) AS fullFlow20Rows
            ,COUNT(CASE WHEN NOT (
              (st.tip_percentage = 20
               AND EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
               AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))
              OR
              (st.tip_percentage = 10
               AND ((EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                     AND NOT EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))
                 OR (NOT EXISTS (SELECT 1 FROM order_service osi WHERE osi.order_id = o.id AND osi.check_in_staff_id = st.user_id)
                     AND EXISTS (SELECT 1 FROM order_service oso WHERE oso.order_id = o.id AND oso.check_out_staff_id = st.user_id))))
            ) THEN 1 END) AS ruleMismatchRows
          FROM staff_tip st
          JOIN \`order\` o ON o.id = st.order_id
          WHERE st.user_id = ${subject.legacyStaffId}
            AND o.order_state = 'Completed'
            AND ${buildCashTipCurrencyPredicate('st')}
            AND (
              EXISTS (
                SELECT 1
                FROM report_order ro
                WHERE ro.order_id = o.id
                  AND ro.actual_booking_date_start >= '${dateFrom} 00:00:00'
                  AND ro.actual_booking_date_start <= '${dateTo} 23:59:59'
              )
              OR (
                NOT EXISTS (SELECT 1 FROM report_order ro WHERE ro.order_id = o.id)
                AND o.booking_date_start >= '${dateFrom} 00:00:00'
                AND o.booking_date_start <= '${dateTo} 23:59:59'
              )
            )
        `),
      ]);

      const xoayRows = xoay.data.filter((row) => Number(row.consultantId) === subject.legacyStaffId);
      const rawXoayVnd = Math.round(xoayRows.reduce((total, row) => total + Number(row.consultantBonus || 0), 0));
      const dailyRows = daily.data.filter((row) => Number(row.user_id) === subject.legacyStaffId);
      const dailyBonusVnd = Math.round(dailyRows.reduce((total, row) => total + Number(row.daily_bonus || 0), 0));
      const cap = calculateWheelBonusCap(dailyBonusVnd, rawXoayVnd);
      const tip = tipRows[0] || { cashTipVnd: 0, cashTipRows: 0 };
      const cashTipVnd = Math.round(Number(tip.cashTipVnd || 0));
      const cashTipPercentages = String(tip.tipPercentages || '')
        .split(',')
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));

      return {
        periodKey,
        status: 'COMPARISON_ONLY' as const,
        rawXoayVnd,
        dailyBonusVnd,
        maxXoayAllowedVnd: cap.maxWheelBonusAllowed,
        heldXoayVnd: Math.max(0, cap.rawWheelBonus - cap.effectiveWheelBonus),
        effectiveXoayVnd: cap.effectiveWheelBonus,
        cashTipVnd,
        cashTipPercentages,
        cashTipBreakdown: {
          handoff10Vnd: Math.round(Number(tip.handoff10Vnd || 0)),
          fullFlow20Vnd: Math.round(Number(tip.fullFlow20Vnd || 0)),
          ruleMismatchVnd: Math.round(Number(tip.ruleMismatchVnd || 0)),
          handoff10Rows: Number(tip.handoff10Rows || 0),
          fullFlow20Rows: Number(tip.fullFlow20Rows || 0),
          ruleMismatchRows: Number(tip.ruleMismatchRows || 0),
        },
        componentTotalVnd: cap.effectiveWheelBonus + dailyBonusVnd + cashTipVnd,
        evidenceCounts: {
          xoayLedgerRows: xoayRows.reduce((total, row) => total + Number(row.cashBonusRows || 0), 0),
          dailyCloses: dailyRows.length,
          cashTipRows: Number(tip.cashTipRows || 0),
        },
      };
    })
  );

  return {
    mode: 'LOCAL_READ_ONLY',
    source: 'WINGS_LEGACY',
    staff: { displayName: subject.displayName, legacyStaffId: subject.legacyStaffId },
    months,
  };
}
