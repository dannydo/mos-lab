'use client';

import { BookingItem } from './mockData';
import {
  getLocalProgressSnapshot,
  getActiveServicingBookingId,
  setActiveServicingBookingId,
  setActiveServicingStep,
  clearLocalProgressSnapshot,
} from './offlineSync';

export function mergeServerBookingsWithLocalState(
  prev: BookingItem[],
  serverBookings: BookingItem[],
  selectedDateOffset: number
): BookingItem[] {
  const prevMap = new Map(prev.map((p) => [p.id, p]));
  const mergedIncoming: BookingItem[] = serverBookings.map((incoming: BookingItem): BookingItem => {
    const existing = prevMap.get(incoming.id);
    const localSnap = getLocalProgressSnapshot(incoming.id);

    // 1. Nếu server xác nhận khách hàng này là INCOMING (chưa phục vụ hoặc đã hoàn tác về Chờ đón):
    // Xóa bỏ snapshot rác ở local để triệt tiêu Zombie Servicing Session
    if (incoming.status === 'INCOMING') {
      clearLocalProgressSnapshot(incoming.id);
      const currentActiveServicingId = getActiveServicingBookingId();
      if (currentActiveServicingId && Number(currentActiveServicingId) === Number(incoming.id)) {
        setActiveServicingBookingId(null);
        setActiveServicingStep(null);
      }
      return {
        ...incoming,
        status: 'INCOMING',
        progress: undefined,
        selectedCombo: existing?.selectedCombo || incoming.selectedCombo,
        selectedUnderCombo: existing?.selectedUnderCombo || incoming.selectedUnderCombo,
        comboRedemption: existing?.comboRedemption || incoming.comboRedemption,
      };
    }

    const mergedAttributes: BookingItem['attributes'] =
      incoming.attributes || existing?.attributes
        ? ({ ...(incoming.attributes || {}), ...(existing?.attributes || {}) } as BookingItem['attributes'])
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
      return {
        ...incoming,
        serviceName:
          existing.serviceName && !existing.serviceName.toLowerCase().includes('any')
            ? existing.serviceName
            : incoming.serviceName,
        servicePrice: existing.servicePrice || incoming.servicePrice,
        serviceType: existing.serviceType || incoming.serviceType,
        attributes: mergedAttributes,
        cvRotationPoints: existing.cvRotationPoints ?? incoming.cvRotationPoints,
        cvRotationBreakdown: existing.cvRotationBreakdown ?? incoming.cvRotationBreakdown,
        status: isServicing ? 'SERVICING' : existing.status || incoming.status,
        progress: isServicing
          ? {
              elapsedSeconds: incoming.progress?.elapsedSeconds ?? existing.progress?.elapsedSeconds ?? 0,
              timerRunning: incoming.progress?.timerRunning ?? existing.progress?.timerRunning ?? false,
              ...(incoming.progress || {}),
              ...(localSnap || {}),
              ...(existing.progress || {}),
            }
          : undefined,
        selectedCombo: existing.selectedCombo !== undefined ? existing.selectedCombo : incoming.selectedCombo,
        selectedUnderCombo:
          existing.selectedUnderCombo !== undefined ? existing.selectedUnderCombo : incoming.selectedUnderCombo,
        comboRedemption: existing.comboRedemption !== undefined ? existing.comboRedemption : incoming.comboRedemption,
        cartProducts: existing.cartProducts || incoming.cartProducts,
        billing: existing.billing || incoming.billing,
        survey: existing.survey || incoming.survey,
        checkInStaffId: existing.checkInStaffId || incoming.checkInStaffId,
        checkInStaffName: existing.checkInStaffName || incoming.checkInStaffName,
        checkInStaffTier: existing.checkInStaffTier || incoming.checkInStaffTier,
        assignedStaffId: existing.assignedStaffId || incoming.assignedStaffId,
        assignedStaffName: existing.assignedStaffName || incoming.assignedStaffName,
      };
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
  const incomingIds = new Set(mergedIncoming.map((b) => b.id));
  const preservedServicing =
    selectedDateOffset === 0
      ? prev.filter(
          (b: BookingItem) =>
            !incomingIds.has(b.id) &&
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
