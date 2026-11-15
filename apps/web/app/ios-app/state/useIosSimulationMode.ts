'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { IosBookingItem, IosSimulationAttemptSummary, IosSimulationMenteeOption } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { IosUserRole } from './iosActorProfile';
import {
  clearLocalProgressSnapshot,
  setActiveServicingBookingId,
  setActiveServicingStep,
  setOfflineSyncSimulationNamespace,
} from './offlineSync';

export const IOS_SIM_MODE_SESSION_KEY = 'mos_ios_simulation_mode_active';

export function buildSimBookingMetaPayload(booking?: IosBookingItem | null) {
  if (!booking) return undefined;
  return {
    customerId: booking.customerId,
    customerName: booking.customerName,
    orderNumber: booking.orderNumber,
    serviceName: booking.serviceName,
    servicePrice: booking.servicePrice,
    upgradePrice: booking.upgradePrice || 0,
    isComboLive: Boolean(booking.comboLiveStatus?.isComboLive),
    hasUnderMinkCombo: Boolean(booking.underMinkComboStatus?.hasUnderCombo),
    assignedStaffId: booking.assignedStaffId,
    assignedStaffTier: booking.assignedStaffTier,
    cvRotationPoints: booking.cvRotationPoints,
  };
}

export interface UseIosSimulationModeParams {
  enabled: boolean;
  isSimulationMode: boolean;
  setIsSimulationMode: Dispatch<SetStateAction<boolean>>;
  selectedMenteeStaffId?: number;
  setSelectedMenteeStaffId: Dispatch<SetStateAction<number | undefined>>;
  isReadOnlyMentorView: boolean;
  role: IosUserRole;
  isAdmin: boolean;
  targetDate: string;
  activeBooking: IosBookingItem | undefined;
  setActiveBookingId: (id: number) => void;
  setCurrentStep: (step: number) => void;
  setActiveTab: (tab: string) => void;
  setBookingSegment: (seg: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL') => void;
  setBookings: Dispatch<SetStateAction<IosBookingItem[]>>;
  postAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  refreshDb: (options?: Record<string, any>) => Promise<void>;
}

export function useIosSimulationMode(params: UseIosSimulationModeParams) {
  const {
    enabled,
    isSimulationMode,
    setIsSimulationMode,
    selectedMenteeStaffId,
    setSelectedMenteeStaffId,
    isReadOnlyMentorView,
    role,
    isAdmin,
    targetDate,
    activeBooking,
    setActiveBookingId,
    setCurrentStep,
    setActiveTab,
    setBookingSegment,
    setBookings,
    postAction,
    refreshDb,
  } = params;

  const [menteesList, setMenteesList] = useState<IosSimulationMenteeOption[]>([]);
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState<boolean>(false);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState<boolean>(false);
  const [historyBookingId, setHistoryBookingId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [attemptsByBookingId, setAttemptsByBookingId] = useState<Record<number, IosSimulationAttemptSummary[]>>({});
  const [simActionError, setSimActionError] = useState<string | null>(null);
  const [isSimActionBusy, setIsSimActionBusy] = useState<boolean>(false);

  // Synchronously namespace offline storage whenever simulation mode changes
  setOfflineSyncSimulationNamespace(isSimulationMode);

  useEffect(() => {
    setOfflineSyncSimulationNamespace(isSimulationMode);
    if (typeof window !== 'undefined') {
      try {
        if (isSimulationMode) {
          window.sessionStorage.setItem(IOS_SIM_MODE_SESSION_KEY, '1');
        } else {
          window.sessionStorage.removeItem(IOS_SIM_MODE_SESSION_KEY);
        }
      } catch {
        // ignore storage restrictions
      }
    }
  }, [isSimulationMode]);

  useEffect(() => {
    if (!enabled || !isSimulationMode || (role !== 'CC' && !isAdmin)) {
      setMenteesList([]);
      return;
    }
    let cancelled = false;
    apiClient.ios
      .listSimulationMentees(targetDate)
      .then((res) => {
        if (!cancelled && res?.success && Array.isArray(res.mentees)) {
          setMenteesList(res.mentees);
        }
      })
      .catch(() => {
        if (!cancelled) setMenteesList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, isSimulationMode, role, isAdmin, targetDate]);

  const toggleSimulationMode = useCallback(
    (next?: boolean) => {
      const targetMode = typeof next === 'boolean' ? next : !isSimulationMode;
      setOfflineSyncSimulationNamespace(targetMode);
      setIsSimulationMode(targetMode);
      setSimActionError(null);
      if (!targetMode) {
        setSelectedMenteeStaffId(undefined);
        setIsHistorySheetOpen(false);
      }
      setBookingSegment('INCOMING');
      setActiveTab('booking');
      setCurrentStep(1);
    },
    [isSimulationMode, setActiveTab, setBookingSegment, setCurrentStep, setIsSimulationMode, setSelectedMenteeStaffId]
  );

  const selectMenteeStaffId = useCallback(
    (menteeId?: number) => {
      setSelectedMenteeStaffId(menteeId && menteeId > 0 ? menteeId : undefined);
      setBookingSegment('INCOMING');
      setActiveTab('booking');
      setCurrentStep(1);
    },
    [setActiveTab, setBookingSegment, setCurrentStep, setSelectedMenteeStaffId]
  );

  const loadAttemptsForBooking = useCallback(
    async (bookingId: number) => {
      if (!bookingId || bookingId <= 0) return [];
      setHistoryLoading(true);
      try {
        const res = await apiClient.ios.listSimulationAttempts({
          bookingId,
          ...(selectedMenteeStaffId ? { menteeStaffId: selectedMenteeStaffId } : {}),
        });
        if (res?.success && Array.isArray(res.attempts)) {
          setAttemptsByBookingId((prev) => ({ ...prev, [bookingId]: res.attempts }));
          return res.attempts;
        }
      } catch {
        // ignore network error gracefully
      } finally {
        setHistoryLoading(false);
      }
      return attemptsByBookingId[bookingId] || [];
    },
    [attemptsByBookingId, selectedMenteeStaffId]
  );

  const openHistoryForBooking = useCallback(
    (bookingId: number) => {
      setHistoryBookingId(bookingId);
      setIsHistorySheetOpen(true);
      void loadAttemptsForBooking(bookingId);
    },
    [loadAttemptsForBooking]
  );

  const handleSimRevertConsultation = useCallback(
    async (bookingOrId: IosBookingItem | number) => {
      const targetId = typeof bookingOrId === 'number' ? Number(bookingOrId) : Number(bookingOrId?.id || 0);
      const booking =
        typeof bookingOrId === 'number'
          ? activeBooking && Number(activeBooking.id) === targetId
            ? activeBooking
            : undefined
          : bookingOrId;
      if (!isSimulationMode || isReadOnlyMentorView || !targetId) return;
      setIsSimActionBusy(true);
      setSimActionError(null);
      try {
        const res = await postAction('SIM_REVERT_CONSULTATION', {
          bookingId: targetId,
          simulationMode: true,
          customerId: booking?.customerId,
          simBookingMeta: buildSimBookingMetaPayload(booking),
        });
        if (res?.success) {
          clearLocalProgressSnapshot(targetId);
          setActiveServicingBookingId(null);
          setActiveServicingStep(null);
          const nextAttemptCount = Number(res?.data?.simulationAttemptCount ?? (booking?.simulationAttemptCount || 0));
          setBookings((prev) =>
            prev.map((item) =>
              Number(item.id) === targetId
                ? {
                    ...item,
                    status: 'CHECKED_IN',
                    orderState: 'Check-in',
                    selectedCombo: null,
                    selectedUnderCombo: null,
                    comboRedemption: null,
                    cartProducts: [],
                    promotionId: null,
                    appliedPromotion: null,
                    servicePromotionId: null,
                    servicePromotion: null,
                    comboPromotionId: null,
                    comboPromotion: null,
                    underComboPromotionId: null,
                    underComboPromotion: null,
                    survey: undefined,
                    progress: undefined,
                    billing: undefined,
                    simulationAttemptCount: nextAttemptCount,
                    simulationFastForwardUnlocked: nextAttemptCount >= 1,
                  }
                : item
            )
          );
          setActiveBookingId(targetId);
          setActiveTab('booking');
          setCurrentStep(3);
          void refreshDb();
          if (res?.data?.attemptSnapshot) {
            setAttemptsByBookingId((prev) => {
              const existing = prev[targetId] || [];
              const snap = res.data.attemptSnapshot as IosSimulationAttemptSummary;
              if (existing.some((a) => a.attemptId === snap.attemptId)) return prev;
              return { ...prev, [targetId]: [...existing, snap] };
            });
          }
        } else {
          setSimActionError(res?.data?.error || 'Không thể hoàn tác về bước tư vấn.');
        }
      } finally {
        setIsSimActionBusy(false);
      }
    },
    [
      activeBooking,
      isReadOnlyMentorView,
      isSimulationMode,
      postAction,
      refreshDb,
      setActiveBookingId,
      setActiveTab,
      setBookings,
      setCurrentStep,
    ]
  );

  const handleSimResetToIncoming = useCallback(
    async (bookingOrId: IosBookingItem | number) => {
      const targetId = typeof bookingOrId === 'number' ? Number(bookingOrId) : Number(bookingOrId?.id || 0);
      const booking =
        typeof bookingOrId === 'number'
          ? activeBooking && Number(activeBooking.id) === targetId
            ? activeBooking
            : undefined
          : bookingOrId;
      if (!isSimulationMode || isReadOnlyMentorView || !targetId) return;
      setIsSimActionBusy(true);
      setSimActionError(null);
      try {
        const res = await postAction('SIM_RESET_TO_INCOMING', {
          bookingId: targetId,
          simulationMode: true,
          customerId: booking?.customerId,
          simBookingMeta: buildSimBookingMetaPayload(booking),
        });
        if (res?.success) {
          clearLocalProgressSnapshot(targetId);
          setActiveServicingBookingId(null);
          setActiveServicingStep(null);
          const nextAttemptCount = Number(res?.data?.simulationAttemptCount ?? (booking?.simulationAttemptCount || 0));
          setBookings((prev) =>
            prev.map((item) =>
              Number(item.id) === targetId
                ? {
                    ...item,
                    status: 'INCOMING',
                    orderState: 'Confirmed',
                    selectedCombo: null,
                    selectedUnderCombo: null,
                    comboRedemption: null,
                    cartProducts: [],
                    promotionId: null,
                    appliedPromotion: null,
                    survey: undefined,
                    progress: undefined,
                    billing: undefined,
                    attributes: undefined,
                    simulationAttemptCount: nextAttemptCount,
                    simulationFastForwardUnlocked: nextAttemptCount >= 1,
                  }
                : item
            )
          );
          setActiveBookingId(targetId);
          setBookingSegment('INCOMING');
          setActiveTab('booking');
          setCurrentStep(1);
          void refreshDb();
        } else {
          setSimActionError(res?.data?.error || 'Không thể reset ca về Chờ đón.');
        }
      } finally {
        setIsSimActionBusy(false);
      }
    },
    [
      activeBooking,
      isReadOnlyMentorView,
      isSimulationMode,
      postAction,
      refreshDb,
      setActiveBookingId,
      setActiveTab,
      setBookingSegment,
      setBookings,
      setCurrentStep,
    ]
  );

  const handleSimFastForwardToUpsell = useCallback(
    async (bookingOrId: IosBookingItem | number, extraPayload?: Record<string, any>) => {
      const targetId = typeof bookingOrId === 'number' ? Number(bookingOrId) : Number(bookingOrId?.id || 0);
      const booking =
        typeof bookingOrId === 'number'
          ? activeBooking && Number(activeBooking.id) === targetId
            ? activeBooking
            : undefined
          : bookingOrId;
      if (!isSimulationMode || isReadOnlyMentorView || !targetId) return false;
      setIsSimActionBusy(true);
      setSimActionError(null);
      try {
        const res = await postAction('SIM_FAST_FORWARD_TO_UPSELL', {
          bookingId: targetId,
          simulationMode: true,
          customerId: booking?.customerId,
          simBookingMeta: buildSimBookingMetaPayload(booking),
          ...(extraPayload || {}),
        });
        if (res?.success) {
          const updatedOvr = res?.data?.updatedOverride || {};
          setBookings((prev) =>
            prev.map((item) =>
              Number(item.id) === targetId
                ? {
                    ...item,
                    status: 'SERVICING',
                    orderState: 'Service End',
                    attributes: updatedOvr.attributes || item.attributes,
                    selectedCombo:
                      updatedOvr.selectedCombo !== undefined ? updatedOvr.selectedCombo : item.selectedCombo,
                    selectedUnderCombo:
                      updatedOvr.selectedUnderCombo !== undefined
                        ? updatedOvr.selectedUnderCombo
                        : item.selectedUnderCombo,
                    progress: updatedOvr.progress || item.progress,
                  }
                : item
            )
          );
          setActiveBookingId(targetId);
          setActiveTab('task');
          setCurrentStep(12);
          void refreshDb();
          return true;
        }
        setSimActionError(res?.data?.error || 'Không thể tua nhanh kỹ thuật ở phương án này.');
        return false;
      } finally {
        setIsSimActionBusy(false);
      }
    },
    [
      activeBooking,
      isReadOnlyMentorView,
      isSimulationMode,
      postAction,
      refreshDb,
      setActiveBookingId,
      setActiveTab,
      setBookings,
      setCurrentStep,
    ]
  );

  const handleBookingCreated = useCallback(
    (createdBooking?: IosBookingItem) => {
      setIsCreateBookingOpen(false);
      if (createdBooking) {
        setBookings((prev) => [createdBooking, ...prev.filter((b) => b.id !== createdBooking.id)]);
        setActiveBookingId(createdBooking.id);
      }
      setBookingSegment('INCOMING');
      setActiveTab('booking');
      setCurrentStep(1);
      void refreshDb();
    },
    [refreshDb, setActiveBookingId, setActiveTab, setBookingSegment, setBookings, setCurrentStep]
  );

  return {
    isSimulationMode,
    isReadOnlyMentorView,
    selectedMenteeStaffId,
    menteesList,
    isCreateBookingOpen,
    setIsCreateBookingOpen,
    isHistorySheetOpen,
    setIsHistorySheetOpen,
    historyBookingId,
    historyLoading,
    attemptsByBookingId,
    simActionError,
    setSimActionError,
    isSimActionBusy,
    toggleSimulationMode,
    selectMenteeStaffId,
    loadAttemptsForBooking,
    openHistoryForBooking,
    handleSimRevertConsultation,
    handleSimResetToIncoming,
    handleSimFastForwardToUpsell,
    handleBookingCreated,
  };
}
