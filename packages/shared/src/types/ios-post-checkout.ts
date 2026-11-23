import { canDirectlySettleCounterPayment } from './auth.js';
import {
  resolveNormalizedPaymentBreakdown,
  type IosBookingItem,
  type IosCartProductItem,
  type IosComboRedemption,
  type IosPaymentBreakdown,
  type IosPaymentMethod,
  type IosSelectedCombo,
  type IosSelectedUnderCombo,
} from './ios-app.js';

export type IosPostCheckoutPaymentMode = 'TOP_UP' | 'VOID_AND_RECOLLECT';
export type IosPostCheckoutAdjustmentStatus = 'APPLIED' | 'PENDING_COUNTER_APPROVAL' | 'REJECTED';

export interface IosCheckoutStaffOption {
  staffId: number;
  name: string;
  tier: 'CVL' | 'CVLL' | 'CC';
  storeId?: number;
  branchCode?: string;
  avatar?: string;
}

export interface IosPostCheckoutSnapshot {
  checkOutStaffId?: number;
  checkOutStaffName?: string;
  checkOutStaffTier?: string;
  selectedComboName?: string | null;
  selectedComboPrice: number;
  selectedUnderComboName?: string | null;
  selectedUnderComboPrice: number;
  selectedUpperComboBalanceId?: number | null;
  selectedUnderComboBalanceId?: number | null;
  skipUpperCombo?: boolean;
  skipUnderCombo?: boolean;
  redeemedUpperComboName?: string | null;
  redeemedUnderComboName?: string | null;
  todaySingleServiceWaived?: boolean;
  cartProductsSummary: string;
  productTotal: number;
  serviceTotal: number;
  subtotal: number;
  vatAmount: number;
  tipAmount: number;
  diamondUsed: number;
  grandTotal: number;
  paymentMethod: IosPaymentMethod;
  paymentBreakdown: IosPaymentBreakdown;
  comboBonusAmount: number;
  serumBonusAmount: number;
  checkOutTipShareAmount: number;
}

export interface IosPostCheckoutPendingDraft {
  draftId: string;
  requestedAt: string;
  requestedByStaffId: number;
  requestedByStaffName: string;
  requestedByStaffTier: string;
  paymentMode: IosPostCheckoutPaymentMode;
  reason?: string;
  targetCheckOutStaffId: number;
  targetCheckOutStaffName: string;
  targetCheckOutStaffTier: string;
  selectedCombo: IosSelectedCombo | null;
  selectedUnderCombo: IosSelectedUnderCombo | null;
  comboRedemption: IosComboRedemption | null;
  selectedUpperComboBalanceId?: number | null;
  selectedUnderComboBalanceId?: number | null;
  skipUpperCombo?: boolean;
  skipUnderCombo?: boolean;
  cartProducts: IosCartProductItem[];
  tipAmount: number;
  diamondUsed: number;
  deltaAmount: number;
  amountToCollectNow: number;
  deltaPaymentMethod: IosPaymentMethod;
  deltaPaymentBreakdown: IosPaymentBreakdown;
  combinedPaymentMethod: IosPaymentMethod;
  combinedPaymentBreakdown: IosPaymentBreakdown;
  transferProofPhoto?: string;
  tipTransferProofPhoto?: string;
  qrSplitTipSeparate?: boolean;
  beforeSnapshot: IosPostCheckoutSnapshot;
  afterSnapshot: IosPostCheckoutSnapshot;
}

export interface IosPostCheckoutAdjustmentEntry {
  adjustmentId: string;
  createdAt: string;
  resolvedAt?: string;
  status: IosPostCheckoutAdjustmentStatus;
  paymentMode: IosPostCheckoutPaymentMode;
  reason?: string;
  rejectionReason?: string;
  requestedByStaffId: number;
  requestedByStaffName: string;
  requestedByStaffTier: string;
  approvedByStaffId?: number;
  approvedByStaffName?: string;
  previousCheckOutStaffId?: number;
  previousCheckOutStaffName?: string;
  newCheckOutStaffId: number;
  newCheckOutStaffName: string;
  newCheckOutStaffTier: string;
  checkOutStaffReplaced: boolean;
  previousPaidTotal: number;
  newGrandTotal: number;
  deltaAmount: number;
  collectedAmount: number;
  deltaPaymentMethod: IosPaymentMethod;
  deltaPaymentBreakdown: IosPaymentBreakdown;
  beforeSnapshot: IosPostCheckoutSnapshot;
  afterSnapshot: IosPostCheckoutSnapshot;
}

export interface CanAdjustDoneBookingPostCheckoutParams {
  status?: string;
  bookingDateYmd?: string;
  todayVnYmd: string;
  actorTier?: string | null;
  isAdmin?: boolean;
  actorStaffId?: number;
  assignedStaffId?: number;
  checkInStaffId?: number;
  checkOutStaffId?: number;
  isReadOnlyMentorView?: boolean;
}

export interface ComputePostCheckoutFinancialDeltaParams {
  previousPaidTotal: number;
  previousPaymentMethod?: IosPaymentMethod;
  previousPaymentBreakdown?: Partial<IosPaymentBreakdown> | null;
  newGrandTotal: number;
  requestedMode?: IosPostCheckoutPaymentMode;
  deltaPaymentMethod?: IosPaymentMethod;
  deltaPaymentBreakdown?: Partial<IosPaymentBreakdown> | null;
  isAlreadySettledCompleted: boolean;
  actorTier?: string | null;
  isAdmin?: boolean;
}

export interface ComputePostCheckoutFinancialDeltaResult {
  effectiveMode: IosPostCheckoutPaymentMode;
  previousPaidTotal: number;
  previousPaymentMethod: IosPaymentMethod;
  previousPaymentBreakdown: IosPaymentBreakdown;
  newGrandTotal: number;
  deltaAmount: number;
  amountToCollectNow: number;
  deltaPaymentMethod: IosPaymentMethod;
  deltaPaymentBreakdown: IosPaymentBreakdown;
  combinedPaymentMethod: IosPaymentMethod;
  combinedPaymentBreakdown: IosPaymentBreakdown;
  canActorApproveCounter: boolean;
  requiresReason: boolean;
  hasCounterCashOrPosNow: boolean;
  requiresCounterApproval: boolean;
}

export function isDoneBookingPendingPostCheckoutAdjustment(
  b?: Pick<IosBookingItem, 'billing' | 'pendingPostCheckoutAdjustment'> | null
): boolean {
  if (!b) return false;
  return b.billing?.settlementStatus === 'PENDING_POST_CHECKOUT_ADJUSTMENT' || Boolean(b.pendingPostCheckoutAdjustment);
}

export function canAdjustDoneBookingPostCheckout(params: CanAdjustDoneBookingPostCheckoutParams): {
  allowed: boolean;
  reason?: string;
} {
  if (params.isReadOnlyMentorView) {
    return { allowed: false, reason: 'Đang ở chế độ chỉ xem, không thể chỉnh sửa đơn hàng.' };
  }
  if (params.status !== 'DONE') {
    return { allowed: false, reason: 'Chỉ hỗ trợ điều chỉnh sau checkout trên đơn đã hoàn tất (DONE).' };
  }

  const normalizedBookingYmd = String(params.bookingDateYmd || '')
    .trim()
    .slice(0, 10);
  const normalizedTodayYmd = String(params.todayVnYmd || '')
    .trim()
    .slice(0, 10);
  if (normalizedBookingYmd && normalizedTodayYmd && normalizedBookingYmd !== normalizedTodayYmd) {
    return {
      allowed: false,
      reason: 'Chỉ cho phép điều chỉnh gói Combo trong cùng ngày phục vụ (trước 23:59).',
    };
  }

  const normalizedTier = String(params.actorTier || '')
    .trim()
    .toUpperCase();
  if (params.isAdmin || normalizedTier === 'CC' || normalizedTier === 'CVLL' || normalizedTier === 'ADMIN') {
    return { allowed: true };
  }

  if (normalizedTier === 'CVL') {
    const actorId = Number(params.actorStaffId || 0);
    const ownsBooking =
      actorId > 0 &&
      (Number(params.assignedStaffId || 0) === actorId ||
        Number(params.checkInStaffId || 0) === actorId ||
        Number(params.checkOutStaffId || 0) === actorId);
    if (ownsBooking) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'CVL chỉ được phép điều chỉnh đơn của chính mình.',
    };
  }

  return { allowed: false, reason: 'Vai trò hiện tại không có quyền điều chỉnh gói Combo sau checkout.' };
}

function resolveCombinedPaymentMethod(newGrandTotal: number, breakdown: IosPaymentBreakdown): IosPaymentMethod {
  if (newGrandTotal <= 0) return 'VIETQR';
  const hasVietqr = breakdown.vietqrAmount > 0;
  const hasPos = breakdown.posAmount > 0;
  const hasCash = breakdown.cashAmount > 0;
  const activeChannels = [hasVietqr, hasPos, hasCash].filter(Boolean).length;
  if (activeChannels > 1) return 'MIXED';
  if (hasCash) return 'CASH';
  if (hasPos) return 'POS';
  return 'VIETQR';
}

export function computePostCheckoutFinancialDelta(
  params: ComputePostCheckoutFinancialDeltaParams
): ComputePostCheckoutFinancialDeltaResult {
  const previousPaidTotal = Math.max(0, Math.round(Number(params.previousPaidTotal || 0)));
  const newGrandTotal = Math.max(0, Math.round(Number(params.newGrandTotal || 0)));
  const previousNormalized = resolveNormalizedPaymentBreakdown(
    previousPaidTotal,
    params.previousPaymentMethod,
    params.previousPaymentBreakdown
  );
  const previousBreakdown = previousNormalized.breakdown;

  const requestedMode: IosPostCheckoutPaymentMode =
    params.requestedMode === 'VOID_AND_RECOLLECT' ? 'VOID_AND_RECOLLECT' : 'TOP_UP';
  const effectiveMode: IosPostCheckoutPaymentMode =
    newGrandTotal < previousPaidTotal ? 'VOID_AND_RECOLLECT' : requestedMode;

  const computeBranch = () => {
    if (effectiveMode === 'TOP_UP') {
      const deltaAmount = Math.max(0, Math.round(newGrandTotal - previousPaidTotal));
      const normalizedDelta = resolveNormalizedPaymentBreakdown(
        deltaAmount,
        params.deltaPaymentMethod,
        params.deltaPaymentBreakdown
      );
      const combinedPaymentBreakdown: IosPaymentBreakdown = {
        vietqrAmount: previousBreakdown.vietqrAmount + normalizedDelta.breakdown.vietqrAmount,
        posAmount: previousBreakdown.posAmount + normalizedDelta.breakdown.posAmount,
        cashAmount: previousBreakdown.cashAmount + normalizedDelta.breakdown.cashAmount,
      };
      return {
        deltaAmount,
        amountToCollectNow: deltaAmount,
        deltaPaymentMethod: normalizedDelta.paymentMethod,
        deltaPaymentBreakdown: normalizedDelta.breakdown,
        combinedPaymentMethod: resolveCombinedPaymentMethod(newGrandTotal, combinedPaymentBreakdown),
        combinedPaymentBreakdown,
      };
    }

    const deltaAmount = Math.round(newGrandTotal - previousPaidTotal);
    const amountToCollectNow = newGrandTotal;
    const normalizedDelta = resolveNormalizedPaymentBreakdown(
      amountToCollectNow,
      params.deltaPaymentMethod,
      params.deltaPaymentBreakdown
    );
    return {
      deltaAmount,
      amountToCollectNow,
      deltaPaymentMethod: normalizedDelta.paymentMethod,
      deltaPaymentBreakdown: normalizedDelta.breakdown,
      combinedPaymentMethod: normalizedDelta.paymentMethod,
      combinedPaymentBreakdown: normalizedDelta.breakdown,
    };
  };

  const {
    deltaAmount,
    amountToCollectNow,
    deltaPaymentMethod,
    deltaPaymentBreakdown,
    combinedPaymentMethod,
    combinedPaymentBreakdown,
  } = computeBranch();

  const canActorApproveCounter = Boolean(params.isAdmin || canDirectlySettleCounterPayment(params.actorTier));
  const requiresReason = Boolean(
    params.isAlreadySettledCompleted && (effectiveMode === 'VOID_AND_RECOLLECT' || newGrandTotal < previousPaidTotal)
  );
  const hasCounterCashOrPosNow = deltaPaymentBreakdown.cashAmount > 0 || deltaPaymentBreakdown.posAmount > 0;
  const requiresCounterApproval =
    !canActorApproveCounter &&
    ((params.isAlreadySettledCompleted && effectiveMode === 'VOID_AND_RECOLLECT') ||
      hasCounterCashOrPosNow ||
      (!params.isAlreadySettledCompleted &&
        (combinedPaymentBreakdown.cashAmount > 0 || combinedPaymentBreakdown.posAmount > 0)));

  return {
    effectiveMode,
    previousPaidTotal,
    previousPaymentMethod: previousNormalized.paymentMethod,
    previousPaymentBreakdown: previousBreakdown,
    newGrandTotal,
    deltaAmount,
    amountToCollectNow,
    deltaPaymentMethod,
    deltaPaymentBreakdown,
    combinedPaymentMethod,
    combinedPaymentBreakdown,
    canActorApproveCounter,
    requiresReason,
    hasCounterCashOrPosNow,
    requiresCounterApproval,
  };
}
