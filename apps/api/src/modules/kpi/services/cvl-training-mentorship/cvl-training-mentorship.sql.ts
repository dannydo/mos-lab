import { FastifyInstance } from 'fastify';
import { CvlTrainingMentorshipPair, SafeAny, intersectDateRanges } from '@mos-lab/shared';
import { ISO_DATE_RE } from './cvl-training-mentorship.helpers.js';

/**
 * Xây dựng mệnh đề SQL loại trừ mọi đơn hàng thuộc về Mentee CVL đang trong kỳ Training.
 * Dùng cho tất cả báo cáo của CC (CC Xoay, CC Daily Sales Bonus, CC Tip, CC Paystub)
 * theo Điều răn CC-006: "Tất cả CC check-in/out giúp CVL không nhận được gì hết từ CVL, kể cả bonus vòng xoay."
 */
export function buildExcludeTrainingCvlOrderSql(
  pairs: CvlTrainingMentorshipPair[],
  orderIdExpr: string,
  orderDateExpr: string
): string {
  const active = (pairs || []).filter(
    (p) =>
      p.isActive &&
      Number.isInteger(p.menteeLegacyStaffId) &&
      p.menteeLegacyStaffId > 0 &&
      ISO_DATE_RE.test(p.startDate) &&
      ISO_DATE_RE.test(p.endDate)
  );
  if (active.length === 0) return '';

  const clauses = active.map(
    (p) =>
      `(os_tr.assigned_staff_id = ${p.menteeLegacyStaffId} AND DATE(${orderDateExpr}) BETWEEN '${p.startDate}' AND '${p.endDate}')`
  );

  return ` AND NOT EXISTS (SELECT 1 FROM \`order_service\` os_tr WHERE os_tr.order_id = ${orderIdExpr} AND (${clauses.join(' OR ')}))`;
}

/**
 * Xây dựng mệnh đề SQL kiểm tra một đơn hàng có thuộc kỳ Training của đúng 1 Mentee CVL cụ thể hay không.
 */
export function buildIsMenteeTrainingWindowSql(
  menteePairs: CvlTrainingMentorshipPair[],
  orderDateExpr: string
): string {
  const active = (menteePairs || []).filter(
    (p) => p.isActive && ISO_DATE_RE.test(p.startDate) && ISO_DATE_RE.test(p.endDate)
  );
  if (active.length === 0) return '1 = 0';
  return `(${active.map((p) => `(DATE(${orderDateExpr}) BETWEEN '${p.startDate}' AND '${p.endDate}')`).join(' OR ')})`;
}

/**
 * Ngăn không cho nhân sự khác (kể cả CVL khác) nhận trùng thưởng gói/dưỡng mi trên đơn của một Mentee CVL đang Training.
 */
export function buildExcludeOtherMenteeTrainingOrderSql(
  pairs: CvlTrainingMentorshipPair[],
  currentStaffId: number,
  orderIdExpr: string,
  orderDateExpr: string
): string {
  const safeCurrentId = Math.floor(Number(currentStaffId || 0));
  const others = (pairs || []).filter(
    (p) =>
      p.isActive &&
      Number.isInteger(p.menteeLegacyStaffId) &&
      p.menteeLegacyStaffId > 0 &&
      p.menteeLegacyStaffId !== safeCurrentId &&
      ISO_DATE_RE.test(p.startDate) &&
      ISO_DATE_RE.test(p.endDate)
  );
  if (others.length === 0) return '';
  const clauses = others.map(
    (p) =>
      `(os_oth_tr.assigned_staff_id = ${p.menteeLegacyStaffId} AND DATE(${orderDateExpr}) BETWEEN '${p.startDate}' AND '${p.endDate}')`
  );
  return ` AND NOT EXISTS (SELECT 1 FROM \`order_service\` os_oth_tr WHERE os_oth_tr.order_id = ${orderIdExpr} AND (${clauses.join(' OR ')}))`;
}

/**
 * Biểu thức SQL khớp dòng staff_tip thuộc về Chuyên Viên thực hiện dịch vụ,
 * bao gồm phần Tip Check-in/Check-out (<= 20%) mà CC bấm giùm cho Mentee CVL trong kỳ Training.
 */
export function buildCvTipStaffMatchSql(
  pairs: CvlTrainingMentorshipPair[],
  tipAlias: string,
  assignedStaffExpr: string,
  orderDateExpr: string
): string {
  const active = (pairs || []).filter(
    (p) =>
      p.isActive &&
      Number.isInteger(p.menteeLegacyStaffId) &&
      p.menteeLegacyStaffId > 0 &&
      ISO_DATE_RE.test(p.startDate) &&
      ISO_DATE_RE.test(p.endDate)
  );
  if (active.length === 0) {
    return `${tipAlias}.user_id = ${assignedStaffExpr}`;
  }
  const trainingClauses = active.map(
    (p) =>
      `(${assignedStaffExpr} = ${p.menteeLegacyStaffId} AND DATE(${orderDateExpr}) BETWEEN '${p.startDate}' AND '${p.endDate}')`
  );
  return `(
    ${tipAlias}.user_id = ${assignedStaffExpr}
    OR (
      ${tipAlias}.user_id <> ${assignedStaffExpr}
      AND COALESCE(${tipAlias}.tip_percentage, 0) > 0
      AND COALESCE(${tipAlias}.tip_percentage, 0) <= 20
      AND COALESCE(${tipAlias}.is_academy, 0) = 0
      AND (${trainingClauses.join(' OR ')})
    )
  )`;
}

export function findMatchingTrainingPairForOrderImpl(
  pairs: CvlTrainingMentorshipPair[],
  assignedStaffId: number | undefined | null,
  orderDate: string
): CvlTrainingMentorshipPair | null {
  const staffId = Number(assignedStaffId || 0);
  if (!staffId) return null;
  const d = String(orderDate || '').slice(0, 10);
  if (!ISO_DATE_RE.test(d)) return null;
  return (
    pairs.find((p) => p.isActive && p.menteeLegacyStaffId === staffId && d >= p.startDate && d <= p.endDate) || null
  );
}

/**
 * Tính phần Tip tư vấn/checkout (+10% / +20%) mà CC đứng tên bấm giùm trên đơn của Mentee CVL
 * trong kỳ Training để cộng hoàn trả vào consultDeltaTip của Mentee CVL (không ghi đè bảng staff_tip gốc).
 */
export async function queryTransferredCcTipsByMenteeImpl(
  fastify: FastifyInstance,
  pairs: CvlTrainingMentorshipPair[],
  rangeStartDate: string,
  rangeEndDate: string
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (!pairs || pairs.length === 0) return result;

  const effectiveWindows: Array<{ menteeId: number; startDate: string; endDate: string }> = [];
  for (const pair of pairs) {
    if (!pair.isActive) continue;
    const window = intersectDateRanges(pair.startDate, pair.endDate, rangeStartDate, rangeEndDate);
    if (window) {
      effectiveWindows.push({
        menteeId: pair.menteeLegacyStaffId,
        startDate: window.startDate,
        endDate: window.endDate,
      });
    }
  }
  if (effectiveWindows.length === 0) return result;

  const menteeIds = Array.from(new Set(effectiveWindows.map((w) => w.menteeId)));
  const clauses = effectiveWindows.map(
    (w) =>
      `(os_p.assigned_staff_id = ${w.menteeId} AND COALESCE(ro.date, DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))) BETWEEN '${w.startDate}' AND '${w.endDate}')`
  );

  const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT
      os_p.assigned_staff_id AS mentee_id,
      COALESCE(SUM(st.tip_amount), 0) AS transferred_tip
    FROM (
      SELECT DISTINCT os.order_id, os.assigned_staff_id
      FROM \`order_service\` os
      WHERE os.assigned_staff_id IN (${menteeIds.join(',')})
        AND NOT EXISTS (
          SELECT 1 FROM \`order_service\` os2
          WHERE os2.order_id = os.order_id
            AND os2.assigned_staff_id IS NOT NULL
            AND os2.assigned_staff_id > 0
            AND os2.assigned_staff_id < os.assigned_staff_id
        )
    ) os_p
    JOIN \`order\` o ON o.id = os_p.order_id
    LEFT JOIN \`report_order\` ro ON ro.order_id = o.id
    JOIN \`staff_tip\` st ON st.order_id = o.id
    WHERE o.order_state = 'Completed'
      AND st.user_id <> os_p.assigned_staff_id
      AND COALESCE(st.tip_percentage, 0) > 0
      AND COALESCE(st.tip_percentage, 0) <= 20
      AND COALESCE(st.is_academy, 0) = 0
      AND (${clauses.join(' OR ')})
    GROUP BY os_p.assigned_staff_id
  `);

  for (const row of rows) {
    const id = Number(row.mentee_id || 0);
    const amt = Math.round(Number(row.transferred_tip || 0));
    if (id > 0 && amt > 0) {
      result.set(id, (result.get(id) || 0) + amt);
    }
  }
  return result;
}
