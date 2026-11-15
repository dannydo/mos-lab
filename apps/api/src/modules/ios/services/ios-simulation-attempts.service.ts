import {
  BookingOverrideRecord,
  CrmConfigStoreAdapter,
  createMysqlConfigStore,
} from './ios-overrides.service.js';
import { computeBookingFinancials } from './ios-bookings-formatters.js';
import {
  calculateActorTipBreakdown,
  IosCartProductItem,
  IosSimulationAttemptSourceAction,
  IosSimulationAttemptSummary,
  IosUpdateSimulationAttemptRequest,
  SafeAny,
} from '@mos-lab/shared';

export const SIM_ATTEMPT_PREFIX = 'IOS_SIM_ATTEMPTS:';

export function getSimAttemptsKey(staffId: number, bookingId: number): string {
  return `${SIM_ATTEMPT_PREFIX}${staffId}:${bookingId}`;
}

export function safeParseArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function resolveBaseStore(baseStore?: CrmConfigStoreAdapter): CrmConfigStoreAdapter {
  return baseStore || createMysqlConfigStore();
}

export async function loadSimulationAttempts(
  staffId: number,
  bookingId: number,
  baseStore?: CrmConfigStoreAdapter
): Promise<IosSimulationAttemptSummary[]> {
  const store = resolveBaseStore(baseStore);
  const raw = await store.getOne(getSimAttemptsKey(staffId, bookingId));
  return safeParseArray<IosSimulationAttemptSummary>(raw).sort(
    (a, b) => Number(a.attemptNumber || 0) - Number(b.attemptNumber || 0)
  );
}

export async function loadSimulationAttemptCountsBatch(
  staffId: number,
  bookingIds: number[],
  baseStore?: CrmConfigStoreAdapter
): Promise<Map<number, { count: number; latestAttemptId?: string }>> {
  const store = resolveBaseStore(baseStore);
  const result = new Map<number, { count: number; latestAttemptId?: string }>();
  const uniqueIds = Array.from(new Set(bookingIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return result;

  const keys = uniqueIds.map((id) => getSimAttemptsKey(staffId, id));
  const rawMap = await store.getMany(keys);
  for (const id of uniqueIds) {
    const list = safeParseArray<IosSimulationAttemptSummary>(rawMap.get(getSimAttemptsKey(staffId, id)));
    if (list.length > 0) {
      result.set(id, {
        count: list.length,
        latestAttemptId: list[list.length - 1]?.attemptId,
      });
    }
  }
  return result;
}

export async function appendSimulationAttempt(
  staffId: number,
  bookingId: number,
  draft: Omit<IosSimulationAttemptSummary, 'attemptNumber'>,
  baseStore?: CrmConfigStoreAdapter
): Promise<IosSimulationAttemptSummary> {
  const store = resolveBaseStore(baseStore);
  const key = getSimAttemptsKey(staffId, bookingId);
  const existing = await loadSimulationAttempts(staffId, bookingId, store);

  // Deduplicate rapid repeated saves for the exact same completed timestamp
  const matchingExisting = existing.find(
    (entry) =>
      entry.attemptId === draft.attemptId ||
      (draft.sourceAction !== 'COMPLETE_ORDER' &&
        entry.sourceAction === 'COMPLETE_ORDER' &&
        Math.abs(new Date(draft.createdAt).getTime() - new Date(entry.createdAt).getTime()) < 5000 &&
        Number(entry.grandTotal) === Number(draft.grandTotal) &&
        (entry.selectedComboName || '') === (draft.selectedComboName || ''))
  );
  if (matchingExisting) {
    return matchingExisting;
  }

  const saved: IosSimulationAttemptSummary = {
    ...draft,
    attemptNumber: existing.length + 1,
  };
  const next = [...existing, saved];
  await store.upsert(key, JSON.stringify(next));
  return saved;
}

export async function updateSimulationAttempt(
  staffId: number,
  bookingId: number,
  attemptId: string,
  updates: IosUpdateSimulationAttemptRequest,
  baseStore?: CrmConfigStoreAdapter
): Promise<IosSimulationAttemptSummary> {
  const store = resolveBaseStore(baseStore);
  const key = getSimAttemptsKey(staffId, bookingId);
  const existing = await loadSimulationAttempts(staffId, bookingId, store);
  const index = existing.findIndex((a) => a.attemptId === attemptId);
  if (index === -1) {
    const error = new Error(`Kịch bản mô phỏng #${attemptId} không tồn tại.`);
    (error as SafeAny).statusCode = 404;
    throw error;
  }

  const current = existing[index];
  const notes = typeof updates.notes === 'string' ? updates.notes.trim() : current.notes;
  const selectedStyle = updates.selectedStyle !== undefined ? updates.selectedStyle : current.selectedStyle;
  const selectedComboName =
    updates.selectedComboName !== undefined ? updates.selectedComboName : current.selectedComboName;
  const selectedComboPrice = Number.isFinite(updates.selectedComboPrice)
    ? Math.max(0, Number(updates.selectedComboPrice))
    : current.selectedComboPrice || 0;

  const selectedUnderComboName =
    updates.selectedUnderComboName !== undefined ? updates.selectedUnderComboName : current.selectedUnderComboName;
  const selectedUnderComboPrice = Number.isFinite(updates.selectedUnderComboPrice)
    ? Math.max(0, Number(updates.selectedUnderComboPrice))
    : current.selectedUnderComboPrice || 0;

  const upsellProducts = Array.isArray(updates.upsellProducts)
    ? updates.upsellProducts.map((p) => ({
        productName: String(p.productName || '').trim(),
        quantity: Math.max(1, Number(p.quantity) || 1),
        totalPrice: Math.max(0, Number(p.totalPrice) || 0),
      }))
    : current.upsellProducts || [];

  const upsellTotal = upsellProducts.reduce((sum, p) => sum + p.totalPrice, 0);

  const promotionName = updates.promotionName !== undefined ? updates.promotionName : current.promotionName;
  const promotionDiscountAmount = Number.isFinite(updates.promotionDiscountAmount)
    ? Math.max(0, Number(updates.promotionDiscountAmount))
    : current.promotionDiscountAmount || 0;

  const tipAmount = Number.isFinite(updates.tipAmount)
    ? Math.max(0, Number(updates.tipAmount))
    : current.tipAmount || 0;

  const servicePrice = Number(current.servicePrice) || 0;
  const grandTotal = Math.max(
    0,
    servicePrice + selectedComboPrice + selectedUnderComboPrice + upsellTotal - promotionDiscountAmount + tipAmount
  );

  const comboBonusAmount =
    selectedComboPrice > 0 ? (selectedComboPrice >= 1_000_000 ? 50_000 : 30_000) : 0;
  const serumBonusAmount = upsellProducts.some((p) => /serum/i.test(p.productName)) ? 20_000 : 0;
  const tipActorShare = Math.round(tipAmount * 0.8);
  const totalEstimatedReward = Math.round(servicePrice * 0.1 + comboBonusAmount + serumBonusAmount + tipActorShare);

  const updated: IosSimulationAttemptSummary = {
    ...current,
    notes,
    selectedStyle,
    selectedComboName,
    selectedComboPrice,
    selectedUnderComboName,
    selectedUnderComboPrice,
    upsellProducts,
    upsellTotal,
    promotionName,
    promotionDiscountAmount,
    grandTotal,
    tipAmount,
    tipActorShare,
    comboBonusAmount,
    serumBonusAmount,
    totalEstimatedReward,
  };

  const next = [...existing];
  next[index] = updated;
  await store.upsert(key, JSON.stringify(next));
  return updated;
}

export function hasAttemptWorthySimulationWork(override: BookingOverrideRecord): boolean {
  return Boolean(
    override.selectedCombo ||
      override.selectedUnderCombo ||
      override.comboRedemption ||
      (Array.isArray(override.cartProducts) && override.cartProducts.length > 0) ||
      override.billing ||
      override.attributes?.style ||
      override.status === 'DONE'
  );
}

export function buildSimulationAttemptSnapshot(params: {
  sourceAction: IosSimulationAttemptSourceAction;
  bookingId: number;
  actorStaffId: number;
  actorStaffName: string;
  override: BookingOverrideRecord;
  meta: {
    customerId: number;
    customerName: string;
    orderNumber: string;
    serviceName: string;
    servicePrice: number;
    upgradePrice?: number;
    isComboLive?: boolean;
    hasUnderMinkCombo?: boolean;
    assignedStaffId?: number;
    assignedStaffTier?: string;
    cvRotationPoints?: number;
  };
}): Omit<IosSimulationAttemptSummary, 'attemptNumber'> {
  const { sourceAction, bookingId, actorStaffId, actorStaffName, override, meta } = params;
  const cartProducts: IosCartProductItem[] = Array.isArray(override.cartProducts) ? override.cartProducts : [];
  const selectedCombo = override.selectedCombo || null;
  const selectedUnderCombo = override.selectedUnderCombo || null;

  const financials = computeBookingFinancials({
    servicePrice: meta.servicePrice,
    upgradePrice: Number(meta.upgradePrice || 0),
    serviceName: meta.serviceName,
    isComboLive: Boolean(meta.isComboLive),
    hasUnderMink: Boolean(override.attributes?.hasUnderMink),
    underMinkServiceType: override.attributes?.underMinkServiceType,
    hasUnderMinkCombo: meta.hasUnderMinkCombo,
    selectedCombo,
    selectedUnderCombo,
    comboRedemption: override.comboRedemption || null,
    cartProducts,
    overrideBilling: override.billing || {},
    assignedStaffId: meta.assignedStaffId || actorStaffId,
    checkInStaffId: Number(override.checkInStaffId || actorStaffId),
    checkOutStaffId: Number(override.checkOutStaffId || actorStaffId),
    activeStaffId: actorStaffId,
    dbOrderState: override.orderState || 'Completed',
    promotionId: override.promotionId ?? null,
    appliedPromotion: override.appliedPromotion ?? null,
    servicePromotion: override.servicePromotion ?? null,
    comboPromotion: override.comboPromotion ?? null,
    underComboPromotion: override.underComboPromotion ?? null,
  });

  const tipAmount = Number(financials.billing.tipAmount || 0);
  const tipBreakdown = calculateActorTipBreakdown(
    {
      assignedStaffId: meta.assignedStaffId || actorStaffId,
      checkInStaffId: Number(override.checkInStaffId || actorStaffId),
      checkOutStaffId: Number(override.checkOutStaffId || actorStaffId),
    },
    { staffId: actorStaffId },
    tipAmount
  );

  const upsellProducts = cartProducts.map((item) => {
    const qty = Math.max(1, Number(item.quantity || 1));
    return {
      productName: item.productName,
      quantity: qty,
      totalPrice: Number(item.price || 0) * qty,
    };
  });
  const upsellTotal = upsellProducts.reduce((sum, p) => sum + p.totalPrice, 0);
  const comboBonusAmount = Number(financials.cvRewardBreakdown.comboBonusAmount || 0);
  const serumBonusAmount = Number(financials.cvRewardBreakdown.serumBonusAmount || 0);
  const cvRotationPoints =
    meta.cvRotationPoints ??
    Number(
      (
        1 +
        (selectedCombo ? 1 : 0) +
        (selectedUnderCombo ? 1 : 0) +
        (override.attributes?.hasUnderMink ? 0.5 : 0)
      ).toFixed(1)
    );

  const createdAt = String(override.completedAt || new Date().toISOString());
  return {
    attemptId: `sim_att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    bookingId,
    orderNumber: meta.orderNumber,
    customerId: meta.customerId,
    customerName: meta.customerName,
    staffId: actorStaffId,
    staffName: actorStaffName,
    createdAt,
    sourceAction,
    statusAtSnapshot: (override.status || 'CHECKED_IN') as IosSimulationAttemptSummary['statusAtSnapshot'],
    serviceName: meta.serviceName,
    servicePrice: meta.servicePrice,
    selectedStyle: override.attributes?.style,
    selectedComboName: selectedCombo?.name || null,
    selectedComboPrice: Number(selectedCombo?.price || 0),
    selectedUnderComboName: selectedUnderCombo?.name || null,
    selectedUnderComboPrice: Number(selectedUnderCombo?.price || 0),
    upsellProducts,
    upsellTotal,
    promotionName: financials.billing.promotionName || null,
    promotionDiscountAmount: Number(financials.billing.promotionDiscountAmount || 0),
    grandTotal: Number(financials.billing.grandTotal || 0),
    tipAmount,
    tipActorShare: Number(tipBreakdown.actorEarnedAmount || 0),
    comboBonusAmount,
    serumBonusAmount,
    cvRotationPoints,
    totalEstimatedReward: comboBonusAmount + serumBonusAmount + Number(tipBreakdown.actorEarnedAmount || 0),
    elapsedSeconds: Number(override.progress?.elapsedSeconds || 0),
    notes: override.notes ? String(override.notes) : undefined,
  };
}
