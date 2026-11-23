import { isDoneBookingPendingPostCheckoutAdjustment } from '../ios-post-checkout.js';
import type { CustomerBookingTab } from './booking-models.js';
import type { IosBookingItem, ServicingSubStatus } from './booking-contracts.js';

export interface FilterBookingsForCvlScopeOptions {
  /**
   * Whether the bookings list is for today in Asia/Ho_Chi_Minh.
   * Only today's unassigned INCOMING bookings whose start time has passed are treated as late.
   * Defaults to `targetDate === todayVn` when both are provided, otherwise `true`.
   */
  isToday?: boolean;
  targetDate?: string;
  todayVn?: string;
  now?: Date;
}

export function parseBookingStartMinutes(b: Pick<IosBookingItem, 'time12h' | 'timeSlot'>): number | null {
  const candidates = [b.time12h, b.timeSlot];
  for (const raw of candidates) {
    if (!raw) continue;
    const match = String(raw)
      .trim()
      .match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
    if (!match) continue;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes >= 60) continue;
    const period = match[3]?.toLowerCase();
    if (period === 'pm' && hours < 12) hours += 12;
    else if (period === 'am' && hours === 12) hours = 0;
    if (hours < 0 || hours > 23) continue;
    return hours * 60 + minutes;
  }
  return null;
}

function getVietnamNowMinutes(now: Date = new Date()): number {
  try {
    const hhmm = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
    const [hhStr, mmStr] = hhmm.split(':');
    const hh = parseInt(hhStr, 10) % 24;
    const mm = parseInt(mmStr, 10);
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
      return hh * 60 + mm;
    }
  } catch {
    // Fallback to local clock when Intl timeZone is unavailable
  }
  return now.getHours() * 60 + now.getMinutes();
}

function isBookingServicing(b: IosBookingItem): boolean {
  return (
    b.status === 'SERVICING' ||
    (b.status === 'CHECKED_IN' && Boolean(b.progress?.startedAt) && !b.progress?.completedAt)
  );
}

function isBookingAssignedToStaff(b: IosBookingItem, activeStaffId: number): boolean {
  return Boolean(
    (b.assignedStaffId && b.assignedStaffId === activeStaffId) ||
    (b.checkInStaffId && b.checkInStaffId === activeStaffId) ||
    (b.checkOutStaffId && b.checkOutStaffId === activeStaffId)
  );
}

/**
 * Strict CVL (Chuyên Viên Tự Chủ) Customer Visibility Filter (Kinh Thánh mOS Điều răn UI-010 v1.4.0):
 * CVL is strictly forbidden from viewing customers assigned to other Chuyên Viên.
 * CVL may ONLY view:
 * 1. Customers booked/assigned/checked-in/checked-out by this CVL.
 * 2. Unassigned lobby queue customers at the head of the queue (Đầu tua):
 *    - ALL unassigned customers in the earliest not-yet-late time slot (2+ customers booked in the same slot
 *      are all shown).
 *    - PLUS every late unassigned INCOMING customer (today, start time < now, not yet arrived). A late customer
 *      automatically opens the next head slot for the CVL, so the CVL is never blocked by a no-show.
 *    - Never any customer beyond the next upcoming slot.
 */
export function filterBookingsForCvlScope<T extends IosBookingItem>(
  bookings: T[],
  activeStaffId: number,
  options?: FilterBookingsForCvlScopeOptions
): T[] {
  const isToday =
    options?.isToday !== undefined
      ? options.isToday
      : options?.targetDate && options?.todayVn
        ? options.targetDate === options.todayVn
        : true;
  const nowMinutes = getVietnamNowMinutes(options?.now);

  const unassignedCandidates = bookings
    .map((b, index) => {
      const isServicing = isBookingServicing(b);
      const isStaffAssigned = isBookingAssignedToStaff(b, activeStaffId);
      const isUnassignedIncoming =
        !isStaffAssigned &&
        !isServicing &&
        (b.status === 'INCOMING' || b.status === 'CHECKED_IN') &&
        (b.isUnassignedQueue === true || !b.assignedStaffId || b.assignedStaffId === 0);

      if (!isUnassignedIncoming) return null;

      const startMinutes = parseBookingStartMinutes(b);
      const isLate = isToday && b.status === 'INCOMING' && startMinutes !== null && startMinutes < nowMinutes;
      return { index, startMinutes, isLate };
    })
    .filter((item): item is { index: number; startMinutes: number | null; isLate: boolean } => item !== null);

  // Head slot = earliest start time among NOT-late candidates; every candidate in that slot is shown.
  const nonLateCandidates = unassignedCandidates.filter((c) => !c.isLate);
  const nonLateStartMinutes = nonLateCandidates.map((c) => c.startMinutes).filter((m): m is number => m !== null);
  const headSlotMinutes = nonLateStartMinutes.length > 0 ? Math.min(...nonLateStartMinutes) : null;
  // Fallback when no candidate has a parseable start time: show the first one in original order.
  const fallbackHeadIndex =
    headSlotMinutes === null && nonLateCandidates.length > 0 ? nonLateCandidates[0].index : null;

  const includedUnassignedIndexes = new Set<number>();
  for (const c of unassignedCandidates) {
    if (c.isLate) {
      includedUnassignedIndexes.add(c.index);
    } else if (headSlotMinutes !== null) {
      if (c.startMinutes === headSlotMinutes) includedUnassignedIndexes.add(c.index);
    } else if (c.index === fallbackHeadIndex) {
      includedUnassignedIndexes.add(c.index);
    }
  }

  const result: T[] = [];

  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    if (isBookingAssignedToStaff(b, activeStaffId)) {
      result.push({
        ...b,
        status: isBookingServicing(b) ? 'SERVICING' : b.status,
        isNextQueueCustomer: false,
        bookingAccessTag: 'MY_BOOKED_CUSTOMER',
      });
      continue;
    }

    if (includedUnassignedIndexes.has(i)) {
      result.push({
        ...b,
        isUnassignedQueue: true,
        isNextQueueCustomer: true,
        bookingAccessTag: 'NEXT_CUSTOMER',
      });
    }
  }

  return result;
}

export function resolveCustomerBookingTab(
  b: Pick<IosBookingItem, 'id' | 'status' | 'billing' | 'progress'>,
  activeServicingBookingId?: number | null
): CustomerBookingTab {
  if (b.status === 'CANCELLED') return 'CANCEL';

  const isDone =
    b.status === 'DONE' ||
    Boolean(b.billing?.completedAt) ||
    (Boolean(b.progress?.completedAt) && b.status !== 'SERVICING');

  if (isDone) {
    return 'DONE';
  }

  if (b.status === 'CHECKED_IN') {
    return 'SERVICING';
  }

  const isServicing =
    b.status === 'SERVICING' ||
    Boolean(activeServicingBookingId && Number(b.id) === Number(activeServicingBookingId)) ||
    Boolean(b.progress?.startedAt && !b.progress?.completedAt) ||
    Boolean(b.progress?.currentStep && b.progress.currentStep >= 3 && !b.progress?.completedAt);

  if (isServicing) return 'SERVICING';

  return 'INCOMING';
}

export function isDoneBookingPendingCheckout(b: Pick<IosBookingItem, 'orderState' | 'billing'>): boolean {
  const state = String(b.orderState || '').trim();
  const settlement = b.billing?.settlementStatus;
  if (state === 'Completed' || settlement === 'SETTLED_COMPLETED') {
    return false;
  }
  return state === 'CheckOut' || state === 'Check-out' || settlement === 'PENDING_COUNTER_SETTLEMENT';
}

export function sortDoneBookingsWithCheckoutFirst<
  T extends Pick<IosBookingItem, 'orderState' | 'billing' | 'pendingPostCheckoutAdjustment'>,
>(bookings: T[]): T[] {
  return [...bookings].sort((a, b) => {
    const aPending = isDoneBookingPendingCheckout(a) || isDoneBookingPendingPostCheckoutAdjustment(a) ? 0 : 1;
    const bPending = isDoneBookingPendingCheckout(b) || isDoneBookingPendingPostCheckoutAdjustment(b) ? 0 : 1;
    return aPending - bPending;
  });
}

export function resolveServicingSubStatus(
  b: Pick<IosBookingItem, 'status' | 'billing' | 'progress'>,
  theme: 'light' | 'dark' = 'dark'
): ServicingSubStatus {
  const step = b.progress?.currentStep ?? (b.status === 'CHECKED_IN' ? 3 : 6);
  const pick = (lightColorClass: string, darkColorClass: string) =>
    theme === 'light' ? lightColorClass : darkColorClass;

  if (step >= 12 || Boolean(b.billing?.completedAt)) {
    const lightColorClass = 'bg-emerald-50 text-emerald-700 border-emerald-300';
    const darkColorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    return {
      key: 'CHECKOUT',
      label: 'Checkout',
      colorClass: pick(lightColorClass, darkColorClass),
      lightColorClass,
      darkColorClass,
      targetStep: 12,
    };
  }
  if (step >= 10) {
    const lightColorClass = 'bg-purple-50 text-purple-700 border-purple-300';
    const darkColorClass = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return {
      key: 'SURVEY',
      label: 'Survey',
      colorClass: pick(lightColorClass, darkColorClass),
      lightColorClass,
      darkColorClass,
      targetStep: 10,
    };
  }
  if (step >= 9 || b.progress?.timerRunning || (b.progress?.elapsedSeconds && b.progress.elapsedSeconds > 0)) {
    const lightColorClass = 'bg-amber-50 text-amber-800 border-amber-300';
    const darkColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return {
      key: 'LASHING',
      label: 'Lashing',
      colorClass: pick(lightColorClass, darkColorClass),
      lightColorClass,
      darkColorClass,
      targetStep: 9,
    };
  }
  if (step >= 7) {
    const lightColorClass = 'bg-cyan-50 text-cyan-700 border-cyan-300';
    const darkColorClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    return {
      key: 'CLEANING',
      label: 'Cleaning',
      colorClass: pick(lightColorClass, darkColorClass),
      lightColorClass,
      darkColorClass,
      targetStep: 8,
    };
  }
  const lightColorClass = 'bg-blue-50 text-blue-700 border-blue-300';
  const darkColorClass = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  return {
    key: 'CHECKIN',
    label: 'Check-in',
    colorClass: pick(lightColorClass, darkColorClass),
    lightColorClass,
    darkColorClass,
    targetStep: 3,
  };
}

export function resolveIosCustomerTypeIcon(note: string, visits: number, isNew: number): string {
  const lowerNote = (note || '').toLowerCase();
  if (
    lowerNote.includes('[50%]') ||
    lowerNote.includes('wake up') ||
    lowerNote.includes('dính') ||
    lowerNote.includes('welcome') ||
    lowerNote.includes('uudai') ||
    lowerNote.includes('ưu đãi') ||
    lowerNote.includes('discount')
  ) {
    return '🙃';
  }
  if (isNew === 1 || visits <= 1) return '☕';
  return '🔄';
}

export function resolveIosHasDiscountTag(note: string, comboRequired: number, promotionId: unknown): boolean {
  const lowerNote = (note || '').toLowerCase();
  return (
    lowerNote.includes('[50%]') ||
    lowerNote.includes('uu dai') ||
    lowerNote.includes('ưu đãi') ||
    Boolean(promotionId) ||
    comboRequired === 1
  );
}

export type IosPaymentMethod = 'CASH' | 'POS' | 'VIETQR' | 'MIXED';

export interface IosPaymentBreakdown {
  vietqrAmount: number;
  posAmount: number;
  cashAmount: number;
}

export interface NormalizedPaymentBreakdownResult {
  paymentMethod: IosPaymentMethod;
  breakdown: IosPaymentBreakdown;
  hasVietqr: boolean;
  hasPos: boolean;
  hasCash: boolean;
  isMixed: boolean;
  isPureVietqrOrZero: boolean;
}

export function resolveNormalizedPaymentBreakdown(
  grandTotal: number,
  paymentMethod?: string | null,
  paymentBreakdown?: Partial<IosPaymentBreakdown> | null
): NormalizedPaymentBreakdownResult {
  const safeTotal = Math.max(0, Math.round(Number(grandTotal || 0)));
  const rawMethod = String(paymentMethod || 'VIETQR').toUpperCase();
  const normalizePart = (v: unknown) => Math.max(0, Math.round(Number(v || 0)));

  if (safeTotal === 0) {
    return {
      paymentMethod: rawMethod === 'CASH' ? 'CASH' : rawMethod === 'POS' ? 'POS' : 'VIETQR',
      breakdown: { vietqrAmount: 0, posAmount: 0, cashAmount: 0 },
      hasVietqr: false,
      hasPos: false,
      hasCash: false,
      isMixed: false,
      isPureVietqrOrZero: true,
    };
  }

  let vietqrAmount = normalizePart(paymentBreakdown?.vietqrAmount);
  let posAmount = normalizePart(paymentBreakdown?.posAmount);
  let cashAmount = normalizePart(paymentBreakdown?.cashAmount);
  const breakdownSum = vietqrAmount + posAmount + cashAmount;

  if (breakdownSum <= 0) {
    if (rawMethod === 'CASH') {
      cashAmount = safeTotal;
    } else if (rawMethod === 'POS') {
      posAmount = safeTotal;
    } else {
      vietqrAmount = safeTotal;
    }
  } else if (breakdownSum !== safeTotal) {
    const ratio = safeTotal / breakdownSum;
    vietqrAmount = Math.round(vietqrAmount * ratio);
    posAmount = Math.round(posAmount * ratio);
    cashAmount = Math.round(cashAmount * ratio);
    const diff = safeTotal - (vietqrAmount + posAmount + cashAmount);
    if (diff !== 0) {
      if (cashAmount > 0) cashAmount = Math.max(0, cashAmount + diff);
      else if (posAmount > 0) posAmount = Math.max(0, posAmount + diff);
      else vietqrAmount = Math.max(0, vietqrAmount + diff);
    }
  }

  const hasVietqr = vietqrAmount > 0;
  const hasPos = posAmount > 0;
  const hasCash = cashAmount > 0;
  const activeCount = [hasVietqr, hasPos, hasCash].filter(Boolean).length;
  const isMixed = activeCount > 1;
  const resolvedMethod: IosPaymentMethod = isMixed ? 'MIXED' : hasCash ? 'CASH' : hasPos ? 'POS' : 'VIETQR';

  return {
    paymentMethod: resolvedMethod,
    breakdown: { vietqrAmount, posAmount, cashAmount },
    hasVietqr,
    hasPos,
    hasCash,
    isMixed,
    isPureVietqrOrZero: !hasCash && !hasPos,
  };
}

export function formatIosPaymentMethodLabel(params: {
  grandTotal: number;
  diamondUsed?: number;
  paymentMethod?: string | null;
  paymentBreakdown?: Partial<IosPaymentBreakdown> | null;
  isPendingCounter?: boolean;
}): string {
  const { grandTotal, diamondUsed = 0, paymentMethod, paymentBreakdown, isPendingCounter = false } = params;
  if (grandTotal === 0 && diamondUsed > 0) {
    return '💎 100% Ví Kim Cương';
  }
  const normalized = resolveNormalizedPaymentBreakdown(grandTotal, paymentMethod, paymentBreakdown);
  if (normalized.isMixed) {
    const parts: string[] = [];
    if (normalized.breakdown.vietqrAmount > 0) {
      parts.push(`QR ${normalized.breakdown.vietqrAmount.toLocaleString('vi-VN')}đ`);
    }
    if (normalized.breakdown.posAmount > 0) {
      parts.push(`POS ${normalized.breakdown.posAmount.toLocaleString('vi-VN')}đ`);
    }
    if (normalized.breakdown.cashAmount > 0) {
      parts.push(`Tiền mặt ${normalized.breakdown.cashAmount.toLocaleString('vi-VN')}đ`);
    }
    return `Kết hợp: ${parts.join(' + ')}`;
  }
  if (normalized.paymentMethod === 'POS') return 'Thẻ ngân hàng (POS)';
  if (normalized.paymentMethod === 'CASH') return 'Tiền mặt (Cash)';
  if (isPendingCounter) return 'Chờ Quầy thu Tiền mặt / POS';
  return 'Chuyển khoản QR (Bank)';
}

export interface IosPreCheckoutPaymentSummary {
  preCheckoutServicePaidAmount: number;
  preCheckoutTipAmount: number;
  preCheckoutTotalPaid: number;
  preCheckoutBreakdown: IosPaymentBreakdown;
  remainingDue: number;
  overpaidAmount: number;
  hasPreCheckoutPayment: boolean;
  isFullyPrepaid: boolean;
}

export function computePreCheckoutPaymentSummary(params: {
  grandTotal: number;
  billing?: Pick<
    NonNullable<IosBookingItem['billing']>,
    'preCheckoutServicePaidAmount' | 'preCheckoutTipAmount' | 'preCheckoutPaymentMethod' | 'preCheckoutPaymentBreakdown'
  > | null;
}): IosPreCheckoutPaymentSummary {
  const safeGrandTotal = Math.max(0, Math.round(Number(params.grandTotal || 0)));
  const billing = params.billing;
  const preCheckoutServicePaidAmount = Math.max(0, Math.round(Number(billing?.preCheckoutServicePaidAmount || 0)));
  const preCheckoutTipAmount = Math.max(0, Math.round(Number(billing?.preCheckoutTipAmount || 0)));
  const preCheckoutTotalPaid = preCheckoutServicePaidAmount + preCheckoutTipAmount;
  const preCheckoutBreakdown = resolveNormalizedPaymentBreakdown(
    preCheckoutTotalPaid,
    billing?.preCheckoutPaymentMethod || 'VIETQR',
    billing?.preCheckoutPaymentBreakdown
  ).breakdown;
  const remainingDue = Math.max(0, safeGrandTotal - preCheckoutTotalPaid);
  const overpaidAmount = Math.max(0, preCheckoutTotalPaid - safeGrandTotal);
  return {
    preCheckoutServicePaidAmount,
    preCheckoutTipAmount,
    preCheckoutTotalPaid,
    preCheckoutBreakdown,
    remainingDue,
    overpaidAmount,
    hasPreCheckoutPayment: preCheckoutTotalPaid > 0,
    isFullyPrepaid: preCheckoutTotalPaid > 0 && remainingDue === 0 && overpaidAmount === 0,
  };
}

export function combinePaymentBreakdowns(
  grandTotal: number,
  first?: Partial<IosPaymentBreakdown> | null,
  second?: Partial<IosPaymentBreakdown> | null
): NormalizedPaymentBreakdownResult {
  const merged: IosPaymentBreakdown = {
    vietqrAmount:
      Math.max(0, Math.round(Number(first?.vietqrAmount || 0))) +
      Math.max(0, Math.round(Number(second?.vietqrAmount || 0))),
    posAmount:
      Math.max(0, Math.round(Number(first?.posAmount || 0))) + Math.max(0, Math.round(Number(second?.posAmount || 0))),
    cashAmount:
      Math.max(0, Math.round(Number(first?.cashAmount || 0))) +
      Math.max(0, Math.round(Number(second?.cashAmount || 0))),
  };
  return resolveNormalizedPaymentBreakdown(grandTotal, undefined, merged);
}
