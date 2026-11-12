import {
  calculateActorTipBreakdown,
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  IosBookingStatus,
  IosCartProductItem,
  IosSettlementStatus,
  maskPhoneNumber,
  resolveEffectiveServiceTotal,
  SafeAny,
} from '@mos-lab/shared';

export function resolveCustomerAvatar(dbAvatar: string | null | undefined, userId?: number): string | undefined {
  if (!dbAvatar) return undefined;
  const trimmed = String(dbAvatar).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com\//, 'https://cdn.wingslashes.com/');
  }
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  if (userId) {
    return `https://cdn.wingslashes.com/uploads/user/avatar/${userId}/thumbnail/${trimmed}`;
  }
  return undefined;
}

export function resolveStaffAvatar(dbAvatar: string | null | undefined): string {
  if (dbAvatar && typeof dbAvatar === 'string' && dbAvatar.trim().startsWith('http')) {
    return dbAvatar.trim();
  }
  return 'https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg';
}

export function formatTime12h(dateStart: Date | string | null): string {
  if (!dateStart) return '09:00 am';
  const start = new Date(dateStart);
  if (Number.isNaN(start.getTime())) return '09:00 am';

  let hours = start.getHours();
  const minutes = start.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours || 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export function formatTimeSlot(dateStart: Date | string | null, durationMinutes: number): string {
  if (!dateStart) return '09:00 - 10:30';
  const start = new Date(dateStart);
  if (Number.isNaN(start.getTime())) return '09:00 - 10:30';

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

export function formatPhoneNumberDots(phone: string | null | undefined, isMasked: boolean = false): string {
  if (!phone) return isMasked ? '**** ******' : '0901.xxx.xxx';
  if (isMasked) {
    return maskPhoneNumber(phone);
  }
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)}.${cleaned.slice(4, 7)}.${cleaned.slice(7)}`;
  }
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 5)}.${cleaned.slice(5, 8)}.${cleaned.slice(8)}`;
  }
  return phone;
}

export function resolveBookingStatusFromState(
  overrideStatus: IosBookingStatus | undefined,
  state: string | null | undefined,
  targetDate: string,
  todayVn: string
): IosBookingStatus {
  if (overrideStatus) {
    return overrideStatus;
  }
  if (state === 'CheckIn' || state === 'Check-in' || state === 'Consultation') {
    return 'CHECKED_IN';
  }
  if (
    [
      'Preparation',
      'ServiceStart',
      'Service Start',
      'Service Cleaned',
      'Service End',
      'Service Completed',
      'In-progress',
    ].includes(String(state || ''))
  ) {
    return 'SERVICING';
  }
  if (['Completed', 'CheckOut', 'Check-out'].includes(String(state || ''))) {
    return 'DONE';
  }
  if (['Cancelled', 'Missed'].includes(String(state || ''))) {
    return 'CANCELLED';
  }
  if (targetDate < todayVn && (state === 'New' || state === 'Confirmed')) {
    return 'DONE';
  }
  return 'INCOMING';
}

export function computeBookingFinancials(params: {
  servicePrice: number;
  upgradePrice: number;
  serviceName?: string;
  isComboLive: boolean;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  hasUnderMinkCombo?: boolean;
  selectedCombo: SafeAny;
  selectedUnderCombo: SafeAny;
  comboRedemption: SafeAny;
  cartProducts: IosCartProductItem[];
  overrideBilling: SafeAny;
  assignedStaffId: number;
  checkInStaffId?: number;
  checkOutStaffId?: number;
  activeStaffId: number;
  dbOrderState?: string | null;
  isTrainingCvlOrder?: boolean;
}) {
  const {
    servicePrice,
    upgradePrice,
    serviceName,
    isComboLive,
    hasUnderMink,
    underMinkServiceType,
    hasUnderMinkCombo,
    selectedCombo,
    selectedUnderCombo,
    comboRedemption,
    cartProducts,
    overrideBilling,
    assignedStaffId,
    checkInStaffId,
    checkOutStaffId,
    activeStaffId,
    dbOrderState,
    isTrainingCvlOrder,
  } = params;

  const productTotal = cartProducts.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 1), 0);
  const comboTotal =
    (selectedCombo ? Number(selectedCombo.price || 0) : 0) +
    (selectedUnderCombo ? Number(selectedUnderCombo.price || 0) : 0);

  const normalizedSelectedCombo = selectedCombo ? { todaySingleServiceWaived: true, ...selectedCombo } : null;
  const normalizedSelectedUnderCombo = selectedUnderCombo
    ? { todaySingleServiceWaived: true, ...selectedUnderCombo }
    : null;

  const effectiveServiceTotal = resolveEffectiveServiceTotal({
    servicePrice,
    upgradePrice,
    serviceName,
    isComboLive,
    hasUnderMink,
    underMinkServiceType,
    hasUnderMinkCombo,
    selectedCombo: normalizedSelectedCombo,
    selectedUnderCombo: normalizedSelectedUnderCombo,
    comboRedemption,
  });

  const subtotal = effectiveServiceTotal + comboTotal + productTotal;
  const vatRate = 0.08;
  const vatAmount = Math.round(subtotal * vatRate);
  const diamondUsed = Number(overrideBilling?.diamondUsed ?? 0);
  const diamondDiscountAmount = Number(overrideBilling?.diamondDiscountAmount ?? diamondUsed * 1000);
  const tipAmount = Number(overrideBilling?.tipAmount ?? 0);

  const dualCombo = calculateDualComboTierBonus(
    Number(selectedCombo?.price || 0),
    Number(selectedUnderCombo?.price || 0)
  );
  const comboBonus = dualCombo.totalBonus;
  const serumBonus = cartProducts.reduce(
    (sum, p) => sum + calculateCvSerumTierBonus(Number(p.price || 0), Number(p.quantity || 1)),
    0
  );

  const effectiveCheckInId = checkInStaffId || assignedStaffId;
  const effectiveCheckOutId = checkOutStaffId || assignedStaffId;
  const targetStaffId = activeStaffId || assignedStaffId;

  const tipBreakdown = calculateActorTipBreakdown(
    {
      assignedStaffId,
      checkInStaffId: effectiveCheckInId,
      checkOutStaffId: effectiveCheckOutId,
      isTrainingCvlOrder: Boolean(isTrainingCvlOrder),
    },
    { staffId: targetStaffId },
    tipAmount
  );

  const rawSettlement = overrideBilling?.settlementStatus as IosSettlementStatus | undefined;
  const settlementStatus: IosSettlementStatus | undefined =
    dbOrderState === 'Completed' ? 'SETTLED_COMPLETED' : rawSettlement;

  return {
    cvRewardBreakdown: {
      techTipPercent: 70,
      checkInTipPercent: 10,
      checkOutTipPercent: 10,
      cvTotalTipPercent: tipBreakdown.actorEarnedPercent,
      comboBonusAmount: comboBonus,
      serumBonusAmount: serumBonus,
      totalOrderBonusForCheckoutStaff: comboBonus + serumBonus,
    },
    billing: {
      subtotal,
      vatRate,
      vatAmount,
      diamondUsed,
      diamondDiscountAmount,
      serviceTotal: effectiveServiceTotal,
      comboTotal,
      productTotal,
      paymentMethod: (overrideBilling?.paymentMethod || 'VIETQR') as 'CASH' | 'POS' | 'VIETQR',
      settlementStatus,
      bankTransferRef: overrideBilling?.bankTransferRef,
      posTransactionId: overrideBilling?.posTransactionId,
      legacySyncedAt: overrideBilling?.legacySyncedAt,
      tipAmount,
      tipCvShare: tipBreakdown.techShareAmount,
      tipCheckInShare: tipBreakdown.checkInShareAmount,
      tipCheckOutShare: tipBreakdown.checkOutShareAmount,
      tipCcShare: tipBreakdown.fundShareAmount,
      transferProofPhoto: overrideBilling?.transferProofPhoto,
      zaloConsent: overrideBilling?.zaloConsent,
      completedAt: overrideBilling?.completedAt,
      grandTotal: Math.max(0, subtotal + vatAmount + tipAmount - diamondDiscountAmount),
    },
  };
}
