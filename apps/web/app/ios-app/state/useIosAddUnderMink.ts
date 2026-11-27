'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import {
  buildAddUnderLashRoundFields,
  isPureUnderLashServiceName,
  resolveActiveBookingComboWallets,
  type IosBookingItem,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { ActiveActorProfile } from './iosActorProfile';
import type { BookingItem } from './mockData';
import { saveLocalProgressSnapshot, setActiveServicingBookingId } from './offlineSync';
import { IOS_STEPS } from './iosStepRegistry';

export type AddUnderMinkMode = 'ADD_TO_CURRENT_ORDER' | 'CREATE_NEW_BOOKING';

export interface AddUnderMinkModalState {
  isOpen: boolean;
  mode: AddUnderMinkMode;
  pendingAfterPhotoUrl?: string | null;
}

export interface UseIosAddUnderMinkParams {
  activeBooking: BookingItem;
  activeBookingId: number;
  actor: ActiveActorProfile;
  effectiveStoreId: number;
  targetDateStr: string;
  isSimulationMode: boolean;
  setBookings: Dispatch<SetStateAction<BookingItem[]>>;
  setActiveBookingId: Dispatch<SetStateAction<number>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setActiveTab: Dispatch<SetStateAction<string>>;
  setBookingSegment: Dispatch<SetStateAction<'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'>>;
  postAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  refreshDb: () => Promise<void>;
}

export function useIosAddUnderMink({
  activeBooking,
  activeBookingId,
  actor,
  effectiveStoreId,
  targetDateStr,
  isSimulationMode,
  setBookings,
  setActiveBookingId,
  setCurrentStep,
  setActiveTab,
  setBookingSegment,
  postAction,
  refreshDb,
}: UseIosAddUnderMinkParams) {
  const [addUnderMinkModal, setAddUnderMinkModal] = useState<AddUnderMinkModalState>({
    isOpen: false,
    mode: 'ADD_TO_CURRENT_ORDER',
    pendingAfterPhotoUrl: null,
  });

  const openAddUnderMinkModal = useCallback(
    (options?: { mode?: AddUnderMinkMode; pendingAfterPhotoUrl?: string | null }) => {
      const isSettled =
        activeBooking?.billing?.settlementStatus === 'SETTLED_COMPLETED' ||
        activeBooking?.orderState === 'Completed';
      const defaultMode: AddUnderMinkMode =
        isSettled || isPureUnderLashServiceName(activeBooking?.serviceName)
          ? 'CREATE_NEW_BOOKING'
          : 'ADD_TO_CURRENT_ORDER';
      setAddUnderMinkModal({
        isOpen: true,
        mode: options?.mode || defaultMode,
        pendingAfterPhotoUrl: options?.pendingAfterPhotoUrl ?? null,
      });
    },
    [activeBooking?.billing?.settlementStatus, activeBooking?.orderState, activeBooking?.serviceName]
  );

  const closeAddUnderMinkModal = useCallback(() => {
    setAddUnderMinkModal((prev) => ({ ...prev, isOpen: false, pendingAfterPhotoUrl: null }));
  }, []);

  const handleAddUnderLashRound = useCallback(
    async (params: {
      underMinkServiceType: 'Normal' | 'Retain';
      underMinkCurl: 'B' | 'C';
      underMinkLength: string;
      underMinkCount: string;
      selectedUnderComboBalanceId?: number | null;
      skipUnderCombo?: boolean;
      afterPhotoUrl?: string | null;
    }) => {
      const targetId = activeBooking?.id || activeBookingId;
      if (!targetId) return;
      const nowIso = new Date().toISOString();
      const effectiveAfterPhoto =
        params.afterPhotoUrl || addUnderMinkModal.pendingAfterPhotoUrl || activeBooking?.progress?.afterPhotoUrl;

      const resolvedWallets = resolveActiveBookingComboWallets({
        comboWallets: activeBooking.comboWallets,
        comboLiveStatus: activeBooking.comboLiveStatus,
        underMinkComboStatus: activeBooking.underMinkComboStatus,
        selectedUpperComboBalanceId: activeBooking.selectedUpperComboBalanceId ?? null,
        selectedUnderComboBalanceId:
          params.selectedUnderComboBalanceId !== undefined
            ? params.selectedUnderComboBalanceId
            : (activeBooking.selectedUnderComboBalanceId ?? null),
        skipUpperCombo: Boolean(activeBooking.skipUpperCombo),
        skipUnderCombo:
          params.skipUnderCombo !== undefined ? Boolean(params.skipUnderCombo) : Boolean(activeBooking.skipUnderCombo),
        bookedServiceName: activeBooking.serviceName,
      });

      const roundFields = buildAddUnderLashRoundFields({
        currentServiceName: activeBooking.serviceName,
        currentServicePrice: activeBooking.servicePrice,
        currentUpgradePrice: activeBooking.upgradePrice,
        currentServiceDuration: activeBooking.serviceDuration,
        currentCvRotationPoints: activeBooking.cvRotationPoints,
        alreadyHasUnderMink: Boolean(activeBooking.attributes?.hasUnderMink),
        previousUnderMinkServiceType: activeBooking.attributes?.underMinkServiceType,
        isComboLive: resolvedWallets.isRedeemingUpperToday,
        hasUnderMinkCombo: resolvedWallets.isRedeemingUnderToday,
        underMinkServiceType: params.underMinkServiceType,
        underMinkCurl: params.underMinkCurl,
        underMinkLength: params.underMinkLength,
        underMinkCount: params.underMinkCount,
        upperTargetDurationMinutes:
          activeBooking.progress?.upperTargetDurationMinutes || activeBooking.progress?.targetDurationMinutes,
      });

      const nextProgress: BookingItem['progress'] = {
        ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: false }),
        ...(effectiveAfterPhoto
          ? {
              afterPhotoUrl: effectiveAfterPhoto,
              afterPhotoSavedAt: activeBooking.progress?.afterPhotoSavedAt || nowIso,
            }
          : {}),
        upperCompleted: true,
        upperCompletedAt: activeBooking.progress?.upperCompletedAt || activeBooking.progress?.completedAt || nowIso,
        activeServiceRound: 'UNDER',
        timerRunning: false,
        elapsedSeconds: 0,
        underElapsedSeconds: 0,
        underStartedAt: undefined,
        underCompletedAt: undefined,
        underBeforePhotoUrl: undefined,
        underCleanedPhotoUrl: undefined,
        underAfterPhotoUrl: undefined,
        completedAt: undefined,
        upperTargetDurationMinutes: roundFields.upperTargetDurationMinutes,
        underTargetDurationMinutes: roundFields.underTargetDurationMinutes,
        targetDurationMinutes: roundFields.totalDurationMinutes,
        currentStep: IOS_STEPS.LASH_BEFORE,
      };

      setBookings((prev) =>
        prev.map((b) => {
          if (Number(b.id) !== Number(targetId)) return b;
          const nextBilling = b.billing
            ? {
                ...b.billing,
                completedAt: undefined,
                settlementStatus: undefined,
              }
            : undefined;
          return {
            ...b,
            status: 'SERVICING',
            orderState: 'Preparation',
            serviceName: roundFields.serviceName,
            servicePrice: roundFields.servicePrice,
            upgradePrice: roundFields.upgradePrice,
            serviceDuration: roundFields.totalDurationMinutes,
            ...(roundFields.cvRotationPoints !== undefined ? { cvRotationPoints: roundFields.cvRotationPoints } : {}),
            selectedUnderComboBalanceId: resolvedWallets.selectedUnderComboBalanceId,
            skipUnderCombo: resolvedWallets.skipUnderCombo,
            underMinkComboStatus: resolvedWallets.effectiveUnderMinkComboStatus,
            comboWallets: resolvedWallets.allWallets.length > 0 ? resolvedWallets.allWallets : b.comboWallets,
            _localComboUpdatedAt: Date.now(),
            attributes: {
              ...(b.attributes || { style: 'Natural', curl: 'C', length: '10-12 mm', thickness: '0.07 mm' }),
              ...roundFields.underAttributes,
            },
            ...(nextBilling ? { billing: nextBilling } : {}),
            progress: nextProgress,
          };
        })
      );

      setActiveServicingBookingId(targetId);
      saveLocalProgressSnapshot(targetId, {
        ...nextProgress,
        bookingId: targetId,
        status: 'SERVICING',
      });

      closeAddUnderMinkModal();
      setBookingSegment('SERVICING');
      setActiveTab('task');
      setCurrentStep(IOS_STEPS.LASH_BEFORE);

      void postAction('ADD_UNDER_LASH_ROUND', {
        bookingId: targetId,
        customerId: activeBooking.customerId,
        underMinkServiceType: params.underMinkServiceType,
        underMinkCurl: params.underMinkCurl,
        underMinkLength: params.underMinkLength,
        underMinkCount: params.underMinkCount,
        selectedUnderComboBalanceId: resolvedWallets.selectedUnderComboBalanceId,
        skipUnderCombo: resolvedWallets.skipUnderCombo,
        hasUnderMinkCombo: resolvedWallets.isRedeemingUnderToday,
        currentServiceName: activeBooking.serviceName,
        currentServicePrice: activeBooking.servicePrice,
        currentUpgradePrice: activeBooking.upgradePrice,
        currentServiceDuration: activeBooking.serviceDuration,
        currentCvRotationPoints: activeBooking.cvRotationPoints,
        ...(effectiveAfterPhoto ? { afterPhotoUrl: effectiveAfterPhoto } : {}),
      });
    },
    [
      activeBooking,
      activeBookingId,
      addUnderMinkModal.pendingAfterPhotoUrl,
      closeAddUnderMinkModal,
      postAction,
      setActiveTab,
      setBookingSegment,
      setBookings,
      setCurrentStep,
    ]
  );

  const handleBookNewUnderLashSession = useCallback(
    async (params: {
      underMinkServiceType: 'Normal' | 'Retain';
      underMinkCurl: 'B' | 'C';
      underMinkLength: string;
      underMinkCount: string;
      timeSlot: string;
      bookingNote?: string;
    }) => {
      const isRetain = params.underMinkServiceType === 'Retain';
      const customerId = Number(activeBooking?.customerId || 0);
      const isSyntheticCustomer = !customerId || customerId >= 900_000_000;
      const baseAttrs = activeBooking?.attributes;
      const underAttributes: NonNullable<IosBookingItem['attributes']> = {
        style: 'Natural',
        curl: params.underMinkCurl,
        length: params.underMinkLength,
        thickness: '0.10 mm',
        material: 'Under Mink',
        count: params.underMinkCount,
        hasUnderMink: true,
        underMinkServiceType: params.underMinkServiceType,
        underMinkCurl: params.underMinkCurl,
        underMinkThickness: '0.10 mm',
        underMinkLength: params.underMinkLength,
        underMinkCount: params.underMinkCount,
        ...(baseAttrs?.naturalLashLength ? { naturalLashLength: baseAttrs.naturalLashLength } : {}),
        ...(baseAttrs?.naturalLashThickness ? { naturalLashThickness: baseAttrs.naturalLashThickness } : {}),
        ...(baseAttrs?.naturalLashCount ? { naturalLashCount: baseAttrs.naturalLashCount } : {}),
        ...(baseAttrs?.naturalLashDensity ? { naturalLashDensity: baseAttrs.naturalLashDensity } : {}),
        ...(baseAttrs?.lashTrail ? { lashTrail: baseAttrs.lashTrail } : {}),
        ...(baseAttrs?.eyeShape ? { eyeShape: baseAttrs.eyeShape } : {}),
        ...(baseAttrs?.lashHealth ? { lashHealth: baseAttrs.lashHealth } : {}),
        ...(baseAttrs?.medicalProblem ? { medicalProblem: baseAttrs.medicalProblem } : {}),
        ...(baseAttrs?.isNewClientDiagnosticDone ? { isNewClientDiagnosticDone: true } : {}),
      };

      const res = await apiClient.ios.createBooking({
        simulationMode: isSimulationMode,
        storeId: activeBooking?.storeId || effectiveStoreId,
        date: activeBooking?.bookingDateYmd || targetDateStr,
        timeSlot: params.timeSlot,
        customerMode: isSyntheticCustomer ? 'NEW' : 'EXISTING',
        ...(isSyntheticCustomer
          ? {
              customerName: activeBooking?.customerName || 'Khách hàng',
              customerPhone: activeBooking?.customerPhone,
            }
          : {
              existingCustomerId: customerId,
              customerName: activeBooking?.customerName,
            }),
        serviceId: isRetain ? 128 : 127,
        serviceName: isRetain ? 'Dặm Mi Dưới 250K' : 'Flawless Under Mink 390K',
        servicePrice: isRetain ? 250000 : 390000,
        serviceDuration: isRetain ? 20 : 25,
        serviceType: params.underMinkServiceType,
        attributes: underAttributes,
        assignedStaffId: actor.staffId,
        bookingNote:
          params.bookingNote?.trim() ||
          `Book thêm Mi Dưới sau ca #${activeBooking?.orderNumber || activeBooking?.id || ''}`.trim(),
      });

      if (!res?.success || !res.booking) {
        throw new Error(res?.error || 'Không thể tạo ca Mi Dưới mới. Vui lòng thử lại.');
      }

      const created = res.booking as BookingItem;
      setBookings((prev) => [created, ...prev.filter((item) => Number(item.id) !== Number(created.id))]);
      setActiveBookingId(created.id);
      closeAddUnderMinkModal();
      setBookingSegment('INCOMING');
      setActiveTab('booking');
      setCurrentStep(IOS_STEPS.CHECK_IN);
      void refreshDb();
    },
    [
      activeBooking,
      actor.staffId,
      closeAddUnderMinkModal,
      effectiveStoreId,
      isSimulationMode,
      refreshDb,
      setActiveBookingId,
      setActiveTab,
      setBookingSegment,
      setBookings,
      setCurrentStep,
      targetDateStr,
    ]
  );

  return {
    addUnderMinkModal,
    openAddUnderMinkModal,
    closeAddUnderMinkModal,
    handleAddUnderLashRound,
    handleBookNewUnderLashSession,
  };
}
