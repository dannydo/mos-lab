import type { FastifyInstance } from 'fastify';
import {
  DEFAULT_COMBO_MIN_COLLECTED_AMOUNT,
  calculateComboDebtBonus,
  type ComboDebtBonusMode,
  type CvPlusDebtCollectionDetail,
  type CvlTrainingMentorshipPair,
  type SafeAny,
} from '@mos-lab/shared';
import {
  buildExcludeOtherMenteeTrainingOrderSql,
  buildIsMenteeTrainingWindowSql,
} from '../../kpi/services/cvl-training-mentorship.service.js';
import type { CvRewardCalculationMode } from './career-helpers.js';

export interface ComboDebtConfigSlice {
  comboDebtBonusMode?: ComboDebtBonusMode;
  comboDebtBonusRate?: number;
  comboUnder2mBonus?: number;
  comboStepPerMillionBonus?: number;
  comboMinCollectedAmount?: number;
}

export interface LegacyDebtPaymentRowCheck {
  isCompleted?: number | boolean | null;
  paidAmount?: number | null;
  originalDebtAmount?: number | null;
  orderPaymentDebtAmount?: number | null;
  orderPaymentDiscountAmount?: number | null;
}

/**
 * Phát hiện dòng `user_debt_payment` ảo do lỗi PHP WingsLashes cũ:
 * Khi khách có `user_debt` cũ đi dặm mi có phát sinh thu tiền dịch vụ/VAT/giảm giá (VD đơn #338929 khách Trang 06/11 thu 31K VAT của voucher 390K),
 * PHP cũ tự tạo `user_debt_payment` với `is_completed = 0` trong khi `order_payment.debt_amount >= user_debt.debt_amount`
 * (khoản nợ thực tế không hề giảm).
 */
export function isLegacyPhantomDebtPayment(row: LegacyDebtPaymentRowCheck): boolean {
  if (Number(row.isCompleted || 0) === 1) return false;
  const origDebt = Number(row.originalDebtAmount || 0);
  const opDebt = Number(row.orderPaymentDebtAmount || 0);
  if (origDebt <= 0 || opDebt < origDebt) return false;
  const paid = Number(row.paidAmount || 0);
  const discount = Number(row.orderPaymentDiscountAmount || 0);
  return paid < origDebt || discount > 0;
}

export interface SerumBonusConfigSlice {
  serumOriginalPriceBonus?: number;
  serumDiscountedPriceBonus?: number;
  serumDeepDiscountPriceBonus?: number;
  serumFreePriceBonus?: number;
}

/**
 * Tính thưởng Dưỡng Mi Yeppeum cho 1 dòng `order_product` (Điều răn CV-002):
 * Làm tròn đơn giá về số nguyên VND (`Math.round`) để giá giảm đúng 50% từ legacy float (vd `550000.0000016`)
 * không bị vượt ngưỡng `> 550000` gây nhảy bậc nhầm từ 10K lên 50K.
 */
export function calculateCvlSerumLineBonus(
  totalPrice: number | string | null | undefined,
  quantity: number | string | null | undefined,
  config?: SerumBonusConfigSlice | null
): { qty: number; pricePerUnit: number; lineBonus: number } {
  const qty = Math.max(1, Math.round(Number(quantity) || 1));
  const pricePerUnit = Math.round((Number(totalPrice) || 0) / qty);
  const serumOrigBonus = config?.serumOriginalPriceBonus ?? 100_000;
  const serumDiscBonus = config?.serumDiscountedPriceBonus ?? 50_000;
  const serumDeepDiscBonus = config?.serumDeepDiscountPriceBonus ?? 10_000;
  const serumFreeBonus = config?.serumFreePriceBonus ?? 1_000;

  let itemBonus = serumFreeBonus;
  if (pricePerUnit >= 1_000_000) {
    itemBonus = serumOrigBonus;
  } else if (pricePerUnit > 550_000) {
    itemBonus = serumDiscBonus;
  } else if (pricePerUnit > 0) {
    itemBonus = serumDeepDiscBonus;
  }

  return {
    qty,
    pricePerUnit,
    lineBonus: itemBonus * qty,
  };
}

/**
 * Tính số tiền thực thu trong ca bán gói Combo mới sau khi trừ phần nợ chưa thu (`user_debt.debt_amount`).
 * Cả `osc.total_price` lẫn `user_debt.debt_amount` trong DB legacy đều đã bao gồm VAT 8%.
 */
export function computeCashCollectedComboAmount(
  grossPrice: number,
  unpaidDebtAmount: number
): { actualCollected: number; deductedDebt: number } {
  const safeGross = Math.max(0, Math.round(Number(grossPrice || 0)));
  const safeDebt = Math.min(safeGross, Math.max(0, Math.round(Number(unpaidDebtAmount || 0))));
  return {
    actualCollected: Math.max(0, safeGross - safeDebt),
    deductedDebt: safeDebt,
  };
}

export interface QueryCvlDebtCollectionParams {
  fastify: FastifyInstance;
  targetLegacyStaffId: number;
  startStr: string;
  endStr: string;
  endOp: '<=' | '<';
  mode: CvRewardCalculationMode;
  cvReq: ComboDebtConfigSlice;
  allActiveTrainingPairs: CvlTrainingMentorshipPair[];
  menteeTrainingPairs: CvlTrainingMentorshipPair[];
}

export interface CvlDebtCollectionSummary {
  debtCollectionDetails: CvPlusDebtCollectionDetail[];
  debtCollectionCount: number;
  debtCollectedAmount: number;
  rawDebtCollectionBonusTotal: number;
}

/**
 * Truy vấn các ca thu nợ gói Combo (`user_debt_payment`) do CVL/CVLL thực hiện trong kỳ.
 * Lưu ý legacy: `user_debt_payment.is_completed` chỉ = 1 khi trả hết toàn bộ khoản nợ;
 * các ca thu nợ một phần trên đơn đã `Completed` có `is_completed = 0`, nên cần xét
 * `(o.order_state = 'Completed' OR (udp.order_id IS NULL AND udp.is_completed = 1))`.
 */
export async function queryCvlDebtCollectionDetails(
  params: QueryCvlDebtCollectionParams
): Promise<CvlDebtCollectionSummary> {
  const {
    fastify,
    targetLegacyStaffId,
    startStr,
    endStr,
    endOp,
    mode,
    cvReq,
    allActiveTrainingPairs,
    menteeTrainingPairs,
  } = params;

  const safeStaffId = Math.floor(Number(targetLegacyStaffId || 0));
  if (safeStaffId <= 0) {
    return {
      debtCollectionDetails: [],
      debtCollectionCount: 0,
      debtCollectedAmount: 0,
      rawDebtCollectionBonusTotal: 0,
    };
  }

  const dateAnchorExpr = 'COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created)';

  const orderAttributionClauses: string[] = [];
  const attributionParams: number[] = [];

  if (mode === 'ACTUAL_PAYROLL') {
    orderAttributionClauses.push(
      '(os.check_out_staff_id = ? OR ((os.check_out_staff_id IS NULL OR os.check_out_staff_id = 0) AND COALESCE(NULLIF(udp.created_staff_id, 0), os.assigned_staff_id) = ?))'
    );
    attributionParams.push(safeStaffId, safeStaffId);
    if (menteeTrainingPairs.length > 0) {
      orderAttributionClauses.push(
        `(os.assigned_staff_id = ${safeStaffId} AND ${buildIsMenteeTrainingWindowSql(menteeTrainingPairs, dateAnchorExpr)})`
      );
    }
  } else {
    orderAttributionClauses.push(
      '(os.check_out_staff_id = ? OR os.assigned_staff_id = ? OR ((os.check_out_staff_id IS NULL OR os.check_out_staff_id = 0) AND udp.created_staff_id = ?))'
    );
    attributionParams.push(safeStaffId, safeStaffId, safeStaffId);
  }

  const excludeOtherMenteeSql =
    mode === 'ACTUAL_PAYROLL'
      ? buildExcludeOtherMenteeTrainingOrderSql(allActiveTrainingPairs, safeStaffId, 'udp.order_id', dateAnchorExpr)
      : '';

  const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `
      SELECT
        udp.id AS udp_id,
        udp.user_debt_id,
        COALESCE(udp.order_id, 0) AS pay_order_id,
        COALESCE(ud.order_id, 0) AS orig_order_id,
        udp.paid_amount,
        udp.is_completed,
        COALESCE(ud.debt_amount, 0) AS orig_debt_amount,
        MAX(COALESCE(op.debt_amount, 0)) AS max_op_debt_amount,
        MAX(COALESCE(op.discount_amount, 0)) AS max_op_discount_amount,
        ${dateAnchorExpr} AS collected_at,
        o.order_key AS order_code,
        up_cust.full_name AS customer_name,
        (
          SELECT COALESCE(sl.service_name, s.service_key)
          FROM \`order_service_combo\` orig_osc
          LEFT JOIN \`service\` s ON s.id = orig_osc.service_id
          LEFT JOIN \`service_language\` sl ON sl.service_id = orig_osc.service_id AND sl.language_id = 1
          WHERE orig_osc.order_id = ud.order_id
          ORDER BY orig_osc.total_price DESC, orig_osc.id ASC
          LIMIT 1
        ) AS combo_name
      FROM \`user_debt_payment\` udp
      JOIN \`user_debt\` ud ON ud.id = udp.user_debt_id
      LEFT JOIN \`order\` o ON o.id = udp.order_id
      LEFT JOIN \`report_order\` ro ON ro.order_id = o.id
      LEFT JOIN \`order_payment\` op ON op.order_id = udp.order_id
      LEFT JOIN \`order_service\` os ON os.order_id = udp.order_id
      LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = ud.user_id
      WHERE udp.paid_amount > 0
        AND COALESCE(udp.is_cancelled, 0) = 0
        AND ud.date_cancelled IS NULL
        AND (o.order_state = 'Completed' OR (udp.order_id IS NULL AND udp.is_completed = 1))
        AND ${dateAnchorExpr} >= ?
        AND ${dateAnchorExpr} ${endOp} ?
        AND (
          (udp.order_id IS NOT NULL AND (${orderAttributionClauses.join(' OR ')}))
          OR (udp.order_id IS NULL AND udp.created_staff_id = ?)
        )
        ${excludeOtherMenteeSql}
      GROUP BY udp.id
      ORDER BY ${dateAnchorExpr} ASC, udp.id ASC
    `,
    startStr,
    endStr,
    ...attributionParams,
    safeStaffId
  );

  // Loại các dòng thu nợ ảo do bug legacy (nợ không giảm) và áp dụng mức thực thu tối thiểu (mặc định 500K)
  const minCollected =
    cvReq.comboMinCollectedAmount !== undefined && Number.isFinite(cvReq.comboMinCollectedAmount)
      ? Math.max(0, Math.round(Number(cvReq.comboMinCollectedAmount)))
      : DEFAULT_COMBO_MIN_COLLECTED_AMOUNT;

  // Nếu 1 đơn phát sinh nhiều dòng thanh toán nợ cùng lúc, cộng gộp tổng tiền theo order_id trước khi tính bậc thang
  const groupedByOrder = new Map<number, SafeAny[]>();
  for (const r of rows) {
    if (
      isLegacyPhantomDebtPayment({
        isCompleted: r.is_completed,
        paidAmount: Number(r.paid_amount || 0),
        originalDebtAmount: Number(r.orig_debt_amount || 0),
        orderPaymentDebtAmount: Number(r.max_op_debt_amount || 0),
        orderPaymentDiscountAmount: Number(r.max_op_discount_amount || 0),
      })
    ) {
      continue;
    }
    const payOrderId = Number(r.pay_order_id || 0);
    const groupKey = payOrderId > 0 ? payOrderId : -Number(r.udp_id);
    const list = groupedByOrder.get(groupKey) || [];
    list.push(r);
    groupedByOrder.set(groupKey, list);
  }

  const debtCollectionDetails: CvPlusDebtCollectionDetail[] = [];
  for (const group of groupedByOrder.values()) {
    const first = group[0];
    const collectedAmount = Math.round(
      group.reduce((sum, item) => sum + Math.max(0, Number(item.paid_amount || 0)), 0)
    );
    if (collectedAmount <= 0 || collectedAmount < minCollected) continue;

    const bonus = calculateComboDebtBonus(collectedAmount, cvReq);
    const payOrderId = Number(first.pay_order_id || 0);
    const origOrderId = Number(first.orig_order_id || 0);

    debtCollectionDetails.push({
      debtPaymentId: Number(first.udp_id),
      userDebtId: Number(first.user_debt_id),
      orderId: payOrderId > 0 ? payOrderId : origOrderId,
      origOrderId: origOrderId > 0 ? origOrderId : undefined,
      orderCode: first.order_code ? String(first.order_code) : payOrderId > 0 ? String(payOrderId) : undefined,
      orderDate: String(first.collected_at),
      customerName: first.customer_name ? String(first.customer_name) : undefined,
      comboName: first.combo_name ? String(first.combo_name) : 'Thu nợ gói Combo',
      collectedAmount,
      bonus,
    });
  }

  const debtCollectionCount = debtCollectionDetails.length;
  const debtCollectedAmount = debtCollectionDetails.reduce((sum, d) => sum + d.collectedAmount, 0);
  const rawDebtCollectionBonusTotal = debtCollectionDetails.reduce((sum, d) => sum + d.bonus, 0);

  return {
    debtCollectionDetails,
    debtCollectionCount,
    debtCollectedAmount,
    rawDebtCollectionBonusTotal,
  };
}
