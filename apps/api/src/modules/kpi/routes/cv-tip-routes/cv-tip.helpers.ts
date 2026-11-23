import { FastifyInstance } from 'fastify';
import { TIP_SYSTEM_CONFIG } from '@mos-lab/shared';
import { TeamService } from '../../../teams/team.service.js';

export const CV_TIP_DEFAULT_PAGE_SIZE = 20;
export const CV_TIP_MAX_PAGE_SIZE = 3000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_ACTIVE_CV_IDS = [47510, 48026, 46092, 37790, 34295, 51659];

export const emptyCvTipSummary = {
  totalVisits: 0,
  tippedVisits: 0,
  nonTippedVisits: 0,
  tipRatePercent: 0,
  totalCustomerTip: 0,
  totalCvTipBonus: 0,
};

export async function getActiveCvIds(fastify: FastifyInstance): Promise<number[]> {
  const ids = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');
  return ids.length > 0 ? ids : DEFAULT_ACTIVE_CV_IDS;
}

export function normalizeDatePart(value: string | undefined, fallback: string): string {
  const datePart = value?.includes('T') ? value.split('T')[0] : value;
  return datePart && ISO_DATE_PATTERN.test(datePart) ? datePart : fallback;
}

export function resolveTipDateRange(dateFrom?: string, dateTo?: string): { startPart: string; endPart: string } {
  const startPart = normalizeDatePart(
    dateFrom,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')
  );
  const endPart = normalizeDatePart(dateTo, new Date().toLocaleDateString('en-CA'));
  return { startPart, endPart };
}

/**
 * Keep actual check-in as the primary source while preserving the legacy booking
 * fallback. Splitting the two cases lets MariaDB use its date indexes instead of
 * applying COALESCE to every report_order row.
 */
export function buildActualCheckinOrdersCte(): string {
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
    )
  `;
}

export function actualCheckinQueryParams(startPart: string, endPart: string): string[] {
  const start = `${startPart} 00:00:00`;
  const end = `${endPart} 23:59:59`;
  return [start, end, start, end];
}

export function buildStaffTipSubquery(tipMatchSql: string, staffFilterSql = ''): string {
  return `
    SELECT
      svc_st.order_id,
      svc_st.assigned_staff_id,
      SUM(svc_st.svc_tip_amount) AS tip_amount,
      ROUND(SUM(svc_st.svc_tip_amount) * 100 / NULLIF(SUM(svc_st.svc_customer_tip), 0)) AS tip_percentage,
      SUM(svc_st.svc_customer_tip) AS customer_tip_100
    FROM (
      SELECT
        os_sub.orderId AS order_id,
        os_sub.assigned_staff_id,
        COALESCE(st_raw.order_service_id, 0) AS order_service_id,
        SUM(st_raw.tip_amount) AS svc_tip_amount,
        MAX(
          CASE
            WHEN st_raw.tip_percentage > 0 THEN ROUND(st_raw.tip_amount * 100 / st_raw.tip_percentage)
            ELSE st_raw.tip_amount
          END
        ) AS svc_customer_tip
      FROM (
        SELECT DISTINCT fo_i.orderId, fo_i.checkinTime, os_i.assigned_staff_id
        FROM filtered_orders fo_i
        JOIN order_service os_i ON os_i.order_id = fo_i.orderId
        ${staffFilterSql}
      ) os_sub
      JOIN staff_tip st_raw
        ON st_raw.order_id = os_sub.orderId
       AND ${tipMatchSql}
      GROUP BY os_sub.orderId, os_sub.assigned_staff_id, COALESCE(st_raw.order_service_id, 0)
    ) svc_st
    GROUP BY svc_st.order_id, svc_st.assigned_staff_id
  `;
}

export function resolveTipStatus(totalCustomerTip: number): 'Tipped' | 'Small Change' | 'No Tip' {
  if (totalCustomerTip >= TIP_SYSTEM_CONFIG.MIN_VALID_CUSTOMER_TIP_AMOUNT) {
    return 'Tipped';
  }
  if (totalCustomerTip > 0) {
    return 'Small Change';
  }
  return 'No Tip';
}
