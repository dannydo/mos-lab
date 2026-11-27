'use client';

import { resolveActiveBookingComboWallets } from '@mos-lab/shared';
import { BookingItem } from './mockData';
import {
  getLocalProgressSnapshot,
  getActiveServicingBookingId,
  setActiveServicingBookingId,
  setActiveServicingStep,
  clearLocalProgressSnapshot,
  getPendingActions,
} from './offlineSync';

const LOCAL_OPTIMISTIC_MUTATION_TTL_MS = 10_000;
const COMBO_MUTATION_ACTIONS = new Set([
  'SELECT_COMBO_WALLET',
  'SAVE_CONSULTATION',
  'SAVE_CONSULTATION_DRAFT',
  'ADD_UNDER_LASH_ROUND',
  'SAVE_PRE_CHECKOUT_PAYMENT',
  'SAVE_UPSELL',
  'SAVE_UPSELL_AND_CHECKOUT',
  'COMPLETE_ORDER',
  'COMPLETE_CHECKOUT',
]);

function applyResolvedWalletMerge(base: BookingItem, preferLocal: boolean, existing?: BookingItem): BookingItem {
  if (!preferLocal || !existing) return base;
  const selectedUpperComboBalanceId = resolveComboField(
    existing.selectedUpperComboBalanceId,
    base.selectedUpperComboBalanceId,
    true
  );
  const selectedUnderComboBalanceId = resolveComboField(
    existing.selectedUnderComboBalanceId,
    base.selectedUnderComboBalanceId,
    true
  );
  const skipUpperCombo = resolveComboField(existing.skipUpperCombo, base.skipUpperCombo, true);
  const skipUnderCombo = resolveComboField(existing.skipUnderCombo, base.skipUnderCombo, true);
  const resolved = resolveActiveBookingComboWallets({
    comboWallets: base.comboWallets || existing.comboWallets,
    comboLiveStatus: base.comboLiveStatus || existing.comboLiveStatus,
    underMinkComboStatus: base.underMinkComboStatus || existing.underMinkComboStatus,
    selectedUpperComboBalanceId: selectedUpperComboBalanceId ?? null,
    selectedUnderComboBalanceId: selectedUnderComboBalanceId ?? null,
    skipUpperCombo: Boolean(skipUpperCombo),
    skipUnderCombo: Boolean(skipUnderCombo),
    bookedServiceName: base.serviceName,
  });
  return {
    ...base,
    comboLiveStatus: resolved.effectiveComboLiveStatus,
    underMinkComboStatus: resolved.effectiveUnderMinkComboStatus,
    comboWallets: resolved.allWallets.length > 0 ? resolved.allWallets : base.comboWallets,
    selectedUpperComboBalanceId: resolved.selectedUpperComboBalanceId,
    selectedUnderComboBalanceId: resolved.selectedUnderComboBalanceId,
    skipUpperCombo: resolved.skipUpperCombo,
    skipUnderCombo: resolved.skipUnderCombo,
  };
}

function resolveComboField<T>(
  existingVal: T | null | undefined,
  incomingVal: T | null | undefined,
  preferLocal: boolean
): T | null | undefined {
  if (preferLocal) {
    return existingVal !== undefined ? existingVal : incomingVal;
  }
  return incomingVal !== undefined ? incomingVal : existingVal;
}

export function mergeServerBookingsWithLocalState(
  prev: BookingItem[],
  serverBookings: BookingItem[],
  selectedDateOffset: number,
  expectedStoreId?: number
): BookingItem[] {
  const prevMap = new Map(prev.map((p) => [p.id, p]));
  const pendingComboBookingIds = new Set(
    getPendingActions()
      .filter((a) => COMBO_MUTATION_ACTIONS.has(a.action))
      .map((a) => Number(a.bookingId))
  );
  const nowMs = Date.now();

  const mergedIncoming: BookingItem[] = serverBookings.map((incoming: BookingItem): BookingItem => {
    const existing = prevMap.get(incoming.id);
    const localSnap = getLocalProgressSnapshot(incoming.id);
    const hasFreshLocalComboMutation = Boolean(
      existing?._localComboUpdatedAt && nowMs - existing._localComboUpdatedAt < LOCAL_OPTIMISTIC_MUTATION_TTL_MS
    );
    const preferLocalComboAndPricing = hasFreshLocalComboMutation || pendingComboBookingIds.has(Number(incoming.id));

    // 1. Nếu server xác nhận khách hàng này là INCOMING (chưa phục vụ hoặc đã hoàn tác về Chờ đón):
    // Xóa bỏ snapshot rác ở local để triệt tiêu Zombie Servicing Session
    if (incoming.status === 'INCOMING') {
      clearLocalProgressSnapshot(incoming.id);
      const currentActiveServicingId = getActiveServicingBookingId();
      if (currentActiveServicingId && Number(currentActiveServicingId) === Number(incoming.id)) {
        setActiveServicingBookingId(null);
        setActiveServicingStep(null);
      }
      return applyResolvedWalletMerge(
        {
          ...incoming,
          customerDateOfBirth: incoming.customerDateOfBirth ?? existing?.customerDateOfBirth,
          status: 'INCOMING',
          progress: undefined,
          selectedCombo: resolveComboField(existing?.selectedCombo, incoming.selectedCombo, preferLocalComboAndPricing),
          selectedUnderCombo: resolveComboField(
            existing?.selectedUnderCombo,
            incoming.selectedUnderCombo,
            preferLocalComboAndPricing
          ),
          comboRedemption: resolveComboField(
            existing?.comboRedemption,
            incoming.comboRedemption,
            preferLocalComboAndPricing
          ),
          selectedUpperComboBalanceId: resolveComboField(
            existing?.selectedUpperComboBalanceId,
            incoming.selectedUpperComboBalanceId,
            preferLocalComboAndPricing
          ),
          selectedUnderComboBalanceId: resolveComboField(
            existing?.selectedUnderComboBalanceId,
            incoming.selectedUnderComboBalanceId,
            preferLocalComboAndPricing
          ),
          skipUpperCombo: Boolean(
            resolveComboField(existing?.skipUpperCombo, incoming.skipUpperCombo, preferLocalComboAndPricing)
          ),
          skipUnderCombo: Boolean(
            resolveComboField(existing?.skipUnderCombo, incoming.skipUnderCombo, preferLocalComboAndPricing)
          ),
          _localComboUpdatedAt: hasFreshLocalComboMutation ? existing?._localComboUpdatedAt : undefined,
        },
        preferLocalComboAndPricing,
        existing
      );
    }

    if (incoming.status === 'CANCELLED') {
      clearLocalProgressSnapshot(incoming.id);
      const currentActiveServicingId = getActiveServicingBookingId();
      if (currentActiveServicingId && Number(currentActiveServicingId) === Number(incoming.id)) {
        setActiveServicingBookingId(null);
        setActiveServicingStep(null);
      }
      return {
        ...incoming,
        status: 'CANCELLED',
        progress: undefined,
      };
    }

    const mergedAttributes: BookingItem['attributes'] =
      incoming.attributes || existing?.attributes
        ? ((preferLocalComboAndPricing
            ? { ...(incoming.attributes || {}), ...(existing?.attributes || {}) }
            : { ...(existing?.attributes || {}), ...(incoming.attributes || {}) }) as BookingItem['attributes'])
        : undefined;

    // 2. Khách hàng đã hoàn thành (DONE) hoặc có billing.completedAt: BẮT BUỘC nằm ở tab ĐÃ XONG (DONE)
    const isCompletedDone =
      incoming.status === 'DONE' ||
      existing?.status === 'DONE' ||
      Boolean(incoming.billing?.completedAt) ||
      Boolean(existing?.billing?.completedAt) ||
      (Boolean(incoming.progress?.completedAt) && incoming.status !== 'SERVICING') ||
      (Boolean(existing?.progress?.completedAt) && existing?.status !== 'SERVICING');

    if (isCompletedDone) {
      clearLocalProgressSnapshot(incoming.id);
      const currentActiveServicingId = getActiveServicingBookingId();
      if (currentActiveServicingId && Number(currentActiveServicingId) === Number(incoming.id)) {
        setActiveServicingBookingId(null);
        setActiveServicingStep(null);
      }
      return {
        ...incoming,
        customerDateOfBirth: incoming.customerDateOfBirth ?? existing?.customerDateOfBirth,
        status: 'DONE',
        serviceName:
          existing?.serviceName && !existing.serviceName.toLowerCase().includes('any')
            ? existing.serviceName
            : incoming.serviceName,
        servicePrice: existing?.servicePrice || incoming.servicePrice,
        serviceType: existing?.serviceType || incoming.serviceType,
        attributes: mergedAttributes,
        selectedCombo: existing?.selectedCombo || incoming.selectedCombo,
        selectedUnderCombo: existing?.selectedUnderCombo || incoming.selectedUnderCombo,
        comboRedemption: existing?.comboRedemption || incoming.comboRedemption,
        selectedUpperComboBalanceId: resolveComboField(
          existing?.selectedUpperComboBalanceId,
          incoming.selectedUpperComboBalanceId,
          preferLocalComboAndPricing
        ),
        selectedUnderComboBalanceId: resolveComboField(
          existing?.selectedUnderComboBalanceId,
          incoming.selectedUnderComboBalanceId,
          preferLocalComboAndPricing
        ),
        skipUpperCombo: Boolean(
          resolveComboField(existing?.skipUpperCombo, incoming.skipUpperCombo, preferLocalComboAndPricing)
        ),
        skipUnderCombo: Boolean(
          resolveComboField(existing?.skipUnderCombo, incoming.skipUnderCombo, preferLocalComboAndPricing)
        ),
        cartProducts: existing?.cartProducts || incoming.cartProducts,
        billing: existing?.billing || incoming.billing,
        survey: existing?.survey || incoming.survey,
        checkInStaffId: existing?.checkInStaffId || incoming.checkInStaffId,
        checkInStaffName: existing?.checkInStaffName || incoming.checkInStaffName,
        checkOutStaffId: existing?.checkOutStaffId || incoming.checkOutStaffId,
        checkOutStaffName: existing?.checkOutStaffName || incoming.checkOutStaffName,
        progress: {
          elapsedSeconds: incoming.progress?.elapsedSeconds ?? existing?.progress?.elapsedSeconds ?? 0,
          ...(incoming.progress || {}),
          ...(existing?.progress || {}),
          completedAt: incoming.progress?.completedAt || existing?.progress?.completedAt || new Date().toISOString(),
          timerRunning: false,
          currentStep: 1,
        },
      };
    }

    const isServicing =
      incoming.status === 'SERVICING' ||
      Boolean(incoming.progress?.startedAt && !incoming.progress?.completedAt) ||
      existing?.status === 'SERVICING' ||
      localSnap?.status === 'SERVICING' ||
      Boolean(localSnap?.startedAt && !localSnap?.completedAt) ||
      Boolean(existing?.progress?.startedAt && !existing?.progress?.completedAt);

    if (existing) {
      const resolvedServiceName = preferLocalComboAndPricing
        ? existing.serviceName && !existing.serviceName.toLowerCase().includes('any')
          ? existing.serviceName
          : incoming.serviceName
        : incoming.serviceName && !incoming.serviceName.toLowerCase().includes('any')
          ? incoming.serviceName
          : existing.serviceName || incoming.serviceName;

      const resolvedNonServicingStatus =
        incoming.status === 'CHECKED_IN' || existing.status === 'INCOMING'
          ? incoming.status
          : existing.status || incoming.status;

      return applyResolvedWalletMerge(
        {
          ...incoming,
          customerDateOfBirth: incoming.customerDateOfBirth ?? existing.customerDateOfBirth,
          serviceName: resolvedServiceName,
          servicePrice: preferLocalComboAndPricing
            ? existing.servicePrice || incoming.servicePrice
            : incoming.servicePrice || existing.servicePrice,
          serviceType: preferLocalComboAndPricing
            ? existing.serviceType || incoming.serviceType
            : incoming.serviceType || existing.serviceType,
          upgradePrice: preferLocalComboAndPricing
            ? (existing.upgradePrice ?? incoming.upgradePrice)
            : (incoming.upgradePrice ?? existing.upgradePrice),
          attributes: mergedAttributes,
          cvRotationPoints: preferLocalComboAndPricing
            ? (existing.cvRotationPoints ?? incoming.cvRotationPoints)
            : (incoming.cvRotationPoints ?? existing.cvRotationPoints),
          cvRotationBreakdown: preferLocalComboAndPricing
            ? (existing.cvRotationBreakdown ?? incoming.cvRotationBreakdown)
            : (incoming.cvRotationBreakdown ?? existing.cvRotationBreakdown),
          status: isServicing ? 'SERVICING' : resolvedNonServicingStatus,
          progress: isServicing
            ? {
                elapsedSeconds: incoming.progress?.elapsedSeconds ?? existing.progress?.elapsedSeconds ?? 0,
                timerRunning: incoming.progress?.timerRunning ?? existing.progress?.timerRunning ?? false,
                ...(incoming.progress || {}),
                ...(localSnap || {}),
                ...(existing.progress || {}),
              }
            : undefined,
          selectedCombo: resolveComboField(existing.selectedCombo, incoming.selectedCombo, preferLocalComboAndPricing),
          selectedUnderCombo: resolveComboField(
            existing.selectedUnderCombo,
            incoming.selectedUnderCombo,
            preferLocalComboAndPricing
          ),
          comboRedemption: resolveComboField(
            existing.comboRedemption,
            incoming.comboRedemption,
            preferLocalComboAndPricing
          ),
          selectedUpperComboBalanceId: resolveComboField(
            existing.selectedUpperComboBalanceId,
            incoming.selectedUpperComboBalanceId,
            preferLocalComboAndPricing
          ),
          selectedUnderComboBalanceId: resolveComboField(
            existing.selectedUnderComboBalanceId,
            incoming.selectedUnderComboBalanceId,
            preferLocalComboAndPricing
          ),
          skipUpperCombo: Boolean(
            resolveComboField(existing.skipUpperCombo, incoming.skipUpperCombo, preferLocalComboAndPricing)
          ),
          skipUnderCombo: Boolean(
            resolveComboField(existing.skipUnderCombo, incoming.skipUnderCombo, preferLocalComboAndPricing)
          ),
          _localComboUpdatedAt: hasFreshLocalComboMutation ? existing._localComboUpdatedAt : undefined,
          cartProducts:
            preferLocalComboAndPricing && existing.cartProducts
              ? existing.cartProducts
              : incoming.cartProducts && incoming.cartProducts.length > 0
                ? incoming.cartProducts
                : existing.cartProducts || incoming.cartProducts,
          billing: preferLocalComboAndPricing
            ? existing.billing || incoming.billing
            : incoming.billing || existing.billing,
          survey: existing.survey || incoming.survey,
          checkInStaffId:
            (!preferLocalComboAndPricing && incoming.checkInStaffId) ||
            existing.checkInStaffId ||
            incoming.checkInStaffId,
          checkInStaffName:
            (!preferLocalComboAndPricing && incoming.checkInStaffName) ||
            existing.checkInStaffName ||
            incoming.checkInStaffName,
          checkInStaffTier:
            (!preferLocalComboAndPricing && incoming.checkInStaffTier) ||
            existing.checkInStaffTier ||
            incoming.checkInStaffTier,
          assignedStaffId:
            !preferLocalComboAndPricing && incoming.assignedStaffId && incoming.assignedStaffId > 0
              ? incoming.assignedStaffId
              : existing.assignedStaffId || incoming.assignedStaffId,
          assignedStaffName:
            !preferLocalComboAndPricing &&
            incoming.assignedStaffId &&
            incoming.assignedStaffId > 0 &&
            incoming.assignedStaffName
              ? incoming.assignedStaffName
              : existing.assignedStaffName || incoming.assignedStaffName,
        },
        preferLocalComboAndPricing,
        existing
      );
    }
    if (localSnap || isServicing) {
      return {
        ...incoming,
        status: isServicing ? 'SERVICING' : incoming.status,
        progress: isServicing
          ? {
              elapsedSeconds: incoming.progress?.elapsedSeconds ?? 0,
              timerRunning: incoming.progress?.timerRunning ?? false,
              ...(incoming.progress || {}),
              ...(localSnap || {}),
            }
          : undefined,
      };
    }
    return incoming;
  });

  // Chỉ bảo toàn ca đang SERVICING khi đang xem ngày hôm nay (selectedDateOffset === 0)
  // và BẮT BUỘC phải khớp đúng chi nhánh (targetStoreId) để triệt tiêu lỗi lọt khách Đề Thám sang Estella Place
  const targetStoreId = expectedStoreId ?? serverBookings[0]?.storeId;
  const incomingIds = new Set(mergedIncoming.map((b) => b.id));
  const preservedServicing =
    selectedDateOffset === 0
      ? prev.filter(
          (b: BookingItem) =>
            !incomingIds.has(b.id) &&
            (!targetStoreId || !b.storeId || Number(b.storeId) === Number(targetStoreId)) &&
            b.status !== 'DONE' &&
            b.status !== 'CANCELLED' &&
            !b.progress?.completedAt &&
            !b.billing?.completedAt &&
            (b.status === 'SERVICING' ||
              (b.status !== 'INCOMING' && Boolean(b.progress?.startedAt) && !b.progress?.completedAt))
        )
      : [];

  return [...mergedIncoming, ...preservedServicing];
}
