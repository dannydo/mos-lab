'use client';

import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { isYeppeumSerumProduct, YEPPEUM_PRODUCT_ID } from '@mos-lab/shared';
import type { IosBookingItem, IosSimulationAttemptSummary, IosUpdateSimulationAttemptRequest } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { clearLocalProgressSnapshot, setActiveServicingBookingId, setActiveServicingStep } from '../offlineSync';

function buildRestoredAttemptBookingItem(item: IosBookingItem, attempt: IosSimulationAttemptSummary): IosBookingItem {
  const restoredAttributes: IosBookingItem['attributes'] = attempt.selectedStyle
    ? {
        curl: '',
        length: '',
        thickness: '',
        ...(item.attributes ?? {}),
        style: attempt.selectedStyle,
      }
    : item.attributes;

  return {
    ...item,
    status: 'CHECKED_IN',
    orderState: 'Check-in',
    attributes: restoredAttributes,
    selectedCombo: attempt.selectedComboName
      ? {
          id: 'restored-combo',
          name: attempt.selectedComboName,
          price: attempt.selectedComboPrice,
          bonus: attempt.comboBonusAmount || (attempt.selectedComboPrice >= 1_000_000 ? 50_000 : 30_000),
          sessions: 5,
        }
      : null,
    selectedUnderCombo: attempt.selectedUnderComboName
      ? {
          id: 'restored-under-combo',
          name: attempt.selectedUnderComboName,
          price: attempt.selectedUnderComboPrice,
          bonus: 20_000,
          sessions: 5,
        }
      : null,
    cartProducts: (attempt.upsellProducts || []).map((p, idx) => {
      const qty = Math.max(1, Number(p.quantity) || 1);
      const unitPrice = Number.isFinite(p.unitPrice)
        ? Math.max(0, Number(p.unitPrice))
        : Math.round(p.totalPrice / qty);
      const productId =
        Number(p.productId) > 0
          ? Number(p.productId)
          : isYeppeumSerumProduct({ productName: p.productName })
            ? YEPPEUM_PRODUCT_ID
            : idx + 1;
      return {
        productId,
        productName: p.productName,
        price: unitPrice,
        quantity: qty,
        totalPrice: p.totalPrice,
      };
    }),
    appliedPromotion: attempt.promotionName
      ? ({
          promotionId: 9999,
          promotionKey: 'restored-promo',
          name: attempt.promotionName,
          discountAmount: attempt.promotionDiscountAmount,
          promotionType: 'AMOUNT',
          promotionApply: 'ORDER',
          discountPercentage: 0,
          exactlyAmount: 0,
          maxUsage: 9999,
          usedCount: 0,
          isOldUserDisabled: false,
          isAutoApplied: false,
        } as any)
      : null,
    billing: item.billing
      ? {
          ...item.billing,
          totalAmount: Math.max(0, attempt.grandTotal - attempt.tipAmount),
          grandTotal: attempt.grandTotal,
          tipAmount: attempt.tipAmount,
          serviceTotal: attempt.servicePrice,
          comboTotal: attempt.selectedComboPrice,
          productTotal: attempt.upsellTotal,
        }
      : ({
          totalAmount: Math.max(0, attempt.grandTotal - attempt.tipAmount),
          subtotal: Math.max(0, attempt.grandTotal - attempt.tipAmount),
          grandTotal: attempt.grandTotal,
          tipAmount: attempt.tipAmount,
          serviceTotal: attempt.servicePrice,
          comboTotal: attempt.selectedComboPrice,
          productTotal: attempt.upsellTotal,
          tipCvShare: Math.round(attempt.tipAmount * 0.8),
          tipCcShare: Math.round(attempt.tipAmount * 0.2),
          paymentMethod: 'VIETQR',
        } as any),
    simulationAttemptCount: Math.max(item.simulationAttemptCount || 0, attempt.attemptNumber || 1),
    simulationFastForwardUnlocked: true,
  };
}

export interface UseIosSimulationAttemptsParams {
  isSimulationMode: boolean;
  isReadOnlyMentorView: boolean;
  selectedMenteeStaffId?: number;
  setActiveBookingId: (id: number) => void;
  setActiveTab: (tab: string) => void;
  setCurrentStep: (step: number) => void;
  setBookings: Dispatch<SetStateAction<IosBookingItem[]>>;
  postAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  refreshDb: (options?: Record<string, any>) => Promise<void>;
  setSimActionError: Dispatch<SetStateAction<string | null>>;
  setIsSimActionBusy: Dispatch<SetStateAction<boolean>>;
}

export function useIosSimulationAttempts({
  isSimulationMode,
  isReadOnlyMentorView,
  selectedMenteeStaffId,
  setActiveBookingId,
  setActiveTab,
  setCurrentStep,
  setBookings,
  postAction,
  refreshDb,
  setSimActionError,
  setIsSimActionBusy,
}: UseIosSimulationAttemptsParams) {
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState<boolean>(false);
  const [historyBookingId, setHistoryBookingId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [attemptsByBookingId, setAttemptsByBookingId] = useState<Record<number, IosSimulationAttemptSummary[]>>({});

  const loadAttemptsForBooking = useCallback(
    async (bookingId: number) => {
      if (!bookingId || bookingId <= 0) return [];
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const res = await apiClient.ios.listSimulationAttempts({
          bookingId,
          ...(selectedMenteeStaffId ? { menteeStaffId: selectedMenteeStaffId } : {}),
        });
        if (res?.success && Array.isArray(res.attempts)) {
          setAttemptsByBookingId((prev) => ({ ...prev, [bookingId]: res.attempts }));
          return res.attempts;
        }
        setHistoryError((res as any)?.error || 'Không thể tải danh sách phương án mô phỏng.');
      } catch {
        setHistoryError('Kết nối máy chủ bị gián đoạn khi tải kịch bản mô phỏng.');
      } finally {
        setHistoryLoading(false);
      }
      return attemptsByBookingId[bookingId] || [];
    },
    [attemptsByBookingId, selectedMenteeStaffId]
  );

  const upsertAttemptInCache = useCallback((bookingId: number, attempt: IosSimulationAttemptSummary | undefined) => {
    if (!bookingId || !attempt?.attemptId) return;
    setAttemptsByBookingId((prev) => {
      const currentList = prev[bookingId] || [];
      const existingIdx = currentList.findIndex((item) => item.attemptId === attempt.attemptId);
      const nextList =
        existingIdx >= 0
          ? currentList.map((item, idx) => (idx === existingIdx ? attempt : item))
          : [...currentList, attempt];
      return {
        ...prev,
        [bookingId]: nextList.sort((a, b) => Number(a.attemptNumber || 0) - Number(b.attemptNumber || 0)),
      };
    });
  }, []);

  const openHistoryForBooking = useCallback(
    (bookingId: number) => {
      setHistoryBookingId(bookingId);
      setIsHistorySheetOpen(true);
      void loadAttemptsForBooking(bookingId);
    },
    [loadAttemptsForBooking]
  );

  const handleUpdateSimulationAttempt = useCallback(
    async (attemptId: string, updates: IosUpdateSimulationAttemptRequest) => {
      setIsSimActionBusy(true);
      setSimActionError(null);
      const targetBookingId = Number(updates.bookingId || historyBookingId || 0);
      try {
        const res = await apiClient.ios.updateSimulationAttempt(attemptId, {
          ...updates,
          bookingId: targetBookingId,
          ...(selectedMenteeStaffId ? { menteeStaffId: selectedMenteeStaffId } : {}),
        });
        if (res?.success && res.attempt) {
          const updated = res.attempt;
          setAttemptsByBookingId((prev) => {
            const existing = prev[targetBookingId] || [];
            const idx = existing.findIndex((a) => a.attemptId === attemptId || a.attemptId === updated.attemptId);
            const nextList = idx >= 0 ? existing.map((a, i) => (i === idx ? updated : a)) : [...existing, updated];
            return {
              ...prev,
              [targetBookingId]: nextList.sort((a, b) => Number(a.attemptNumber || 0) - Number(b.attemptNumber || 0)),
            };
          });
        } else {
          throw new Error('Cập nhật kịch bản không thành công.');
        }
      } catch (err: any) {
        setSimActionError(err?.message || 'Lỗi khi cập nhật kịch bản.');
        throw err;
      } finally {
        setIsSimActionBusy(false);
      }
    },
    [historyBookingId, selectedMenteeStaffId, setIsSimActionBusy, setSimActionError]
  );

  const handleApplyAttemptToWorkspace = useCallback(
    async (bookingId: number, attempt: IosSimulationAttemptSummary) => {
      if (!isSimulationMode || isReadOnlyMentorView || !bookingId) return;
      setIsSimActionBusy(true);
      setSimActionError(null);
      try {
        const res = await postAction('SIM_APPLY_ATTEMPT', {
          bookingId,
          attemptId: attempt.attemptId,
          simulationMode: true,
        });
        if (res?.success) {
          clearLocalProgressSnapshot(bookingId);
          setActiveServicingBookingId(null);
          setActiveServicingStep(null);
          setBookings((prev) =>
            prev.map((item) => (Number(item.id) === bookingId ? buildRestoredAttemptBookingItem(item, attempt) : item))
          );
          setActiveBookingId(bookingId);
          setActiveTab('booking');
          setCurrentStep(3);
          void refreshDb();
        } else {
          setSimActionError(res?.data?.error || 'Không thể nạp kịch bản vào bàn làm việc.');
        }
      } finally {
        setIsSimActionBusy(false);
      }
    },
    [
      isReadOnlyMentorView,
      isSimulationMode,
      postAction,
      refreshDb,
      setActiveBookingId,
      setActiveTab,
      setBookings,
      setCurrentStep,
      setIsSimActionBusy,
      setSimActionError,
    ]
  );

  return {
    isHistorySheetOpen,
    setIsHistorySheetOpen,
    historyBookingId,
    historyLoading,
    historyError,
    attemptsByBookingId,
    setAttemptsByBookingId,
    loadAttemptsForBooking,
    upsertAttemptInCache,
    openHistoryForBooking,
    handleUpdateSimulationAttempt,
    handleApplyAttemptToWorkspace,
  };
}
