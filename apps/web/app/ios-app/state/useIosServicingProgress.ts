'use client';

import { useCallback, Dispatch, SetStateAction } from 'react';
import {
  bookingRequiresUnderLashRound,
  hasCompleteNaturalLashSet,
  IosSelfChallengeSelection,
  resolveActiveServicingRound,
  splitUpperAndUnderTargetDuration,
} from '@mos-lab/shared';
import { BookingItem } from './mockData';
import {
  saveLocalProgressSnapshot,
  getLocalProgressSnapshot,
  getLocalProgressSnapshotAsync,
  setActiveServicingBookingId,
  getActiveServicingStep,
  getActiveServicingStepAsync,
  setActiveServicingStep,
} from './offlineSync';

export interface UseIosServicingProgressParams {
  bookings: BookingItem[];
  activeBooking: BookingItem;
  activeBookingId: number;
  setActiveBookingId: Dispatch<SetStateAction<number>>;
  activeServicingBooking: BookingItem | null;
  updateActiveBooking: (updater: (prev: BookingItem) => BookingItem) => void;
  postAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setActiveTab: Dispatch<SetStateAction<string>>;
}

export function useIosServicingProgress({
  bookings,
  activeBooking,
  activeBookingId,
  setActiveBookingId,
  activeServicingBooking,
  updateActiveBooking,
  postAction,
  setCurrentStep,
  setActiveTab,
}: UseIosServicingProgressParams) {
  const handleResumeServicing = useCallback(
    async (bookingId?: number) => {
      const targetId =
        bookingId !== undefined
          ? Number(bookingId)
          : activeServicingBooking?.id
            ? Number(activeServicingBooking.id)
            : Number(activeBookingId);
      const targetBooking = bookings.find((b) => Number(b.id) === targetId);
      if (!targetBooking) return;
      setActiveBookingId(targetBooking.id);
      if (!hasCompleteNaturalLashSet(targetBooking) && !targetBooking.progress?.startedAt) {
        setActiveTab('booking');
        setCurrentStep(3);
        return;
      }
      const cached =
        (await getLocalProgressSnapshotAsync(targetBooking.id)) || getLocalProgressSnapshot(targetBooking.id);
      const activeRound = resolveActiveServicingRound(targetBooking);
      const roundInferredStep =
        activeRound === 'UNDER'
          ? targetBooking.progress?.underAfterPhotoUrl
            ? 10
            : targetBooking.progress?.underCleanedPhotoUrl
              ? 9
              : targetBooking.progress?.underBeforePhotoUrl
                ? 8
                : 7
          : undefined;
      const targetStep =
        targetBooking.progress?.currentStep ||
        cached?.currentStep ||
        roundInferredStep ||
        (await getActiveServicingStepAsync()) ||
        getActiveServicingStep() ||
        6;
      setActiveTab('task');
      setCurrentStep(targetStep);
    },
    [bookings, activeServicingBooking, activeBookingId, setActiveBookingId, setActiveTab, setCurrentStep]
  );

  // Step 6 -> Step 7: CV starts task (Preparation - cam kết 1 lần, tự tách thời gian Vòng 1 & Vòng 2)
  const handleCvStartTask = useCallback(
    (durationMinutes?: number, selfChallenge?: IosSelfChallengeSelection) => {
      if (!hasCompleteNaturalLashSet(activeBooking)) {
        setCurrentStep(3);
        return;
      }
      const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
      const effectiveDuration =
        durationMinutes || selfChallenge?.committedMinutes || activeBooking.serviceDuration || 60;
      const hasUnder = bookingRequiresUnderLashRound(activeBooking);
      const roundSplit = splitUpperAndUnderTargetDuration(
        effectiveDuration,
        hasUnder,
        activeBooking.attributes?.underMinkServiceType
      );
      const progressPatch = {
        ...(activeBooking.progress || { elapsedSeconds: 0 }),
        startedAt,
        upperStartedAt: activeBooking.progress?.upperStartedAt || startedAt,
        activeServiceRound: 'UPPER' as const,
        upperCompleted: false,
        timerRunning: true,
        currentStep: 7,
        targetDurationMinutes: roundSplit.totalMinutes,
        upperTargetDurationMinutes: roundSplit.upperMinutes,
        underTargetDurationMinutes: roundSplit.underMinutes,
        ...(selfChallenge
          ? {
              selfChallengeTier: selfChallenge.tierKey,
              selfChallengeLabel: selfChallenge.tierLabel,
              selfChallengeBaselineMinutes: selfChallenge.baselineMinutes,
              selfChallengeSampleCount: selfChallenge.sampleCount,
              selfChallengeSlowerReason: selfChallenge.slowerReason || undefined,
            }
          : {}),
      };
      updateActiveBooking((prev) => ({
        ...prev,
        status: 'SERVICING',
        serviceDuration: roundSplit.totalMinutes,
        progress: progressPatch,
      }));
      setActiveServicingBookingId(activeBooking.id);
      saveLocalProgressSnapshot(activeBooking.id, {
        ...progressPatch,
        bookingId: activeBooking.id,
        startedAt,
        status: 'SERVICING',
      });
      void postAction('UPDATE_PROGRESS', { orderState: 'Preparation', progress: progressPatch });
      setCurrentStep(7);
    },
    [activeBooking, postAction, setCurrentStep, updateActiveBooking]
  );

  // Tự động lưu ảnh theo vòng hiện tại (Mi Trên / Mi Dưới) vào RAM, IndexedDB & Cloud
  const handleAutoSavePhoto = useCallback(
    async (
      type: 'before' | 'cleaned' | 'after',
      photoUrl: string,
      extraMeta?: { retainLashes?: { left: number; right: number } }
    ) => {
      const nowIso = new Date().toISOString();
      const hasUnder = bookingRequiresUnderLashRound(activeBooking);
      const activeRound = resolveActiveServicingRound(activeBooking);
      const isUnderRound = hasUnder && activeRound === 'UNDER';
      const startedAt = activeBooking.progress?.startedAt || nowIso;
      const progressPatch: any = {
        ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
        startedAt,
        activeServiceRound: activeRound,
        cloudSyncStatus: 'UPLOADING',
      };
      if (type === 'before') {
        if (isUnderRound) {
          progressPatch.underBeforePhotoUrl = photoUrl;
          progressPatch.underBeforePhotoSavedAt = nowIso;
        } else {
          progressPatch.beforePhotoUrl = photoUrl;
          progressPatch.beforePhotoSavedAt = nowIso;
        }
        progressPatch.currentStep = 7;
      } else if (type === 'cleaned') {
        if (isUnderRound) {
          progressPatch.underCleanedPhotoUrl = photoUrl;
          progressPatch.underCleanedPhotoSavedAt = nowIso;
        } else {
          progressPatch.cleanedPhotoUrl = photoUrl;
          progressPatch.cleanedPhotoSavedAt = nowIso;
        }
        progressPatch.currentStep = 8;
        if (extraMeta?.retainLashes) {
          const retainAttrs = {
            '17': {
              attribute_option_value: String(extraMeta.retainLashes.left),
              attribute_key: 'extension-lash-count-left',
            },
            '18': {
              attribute_option_value: String(extraMeta.retainLashes.right),
              attribute_key: 'extension-lash-count-right',
            },
          };
          if (isUnderRound) {
            progressPatch.underRetainLashCountLeft = extraMeta.retainLashes.left;
            progressPatch.underRetainLashCountRight = extraMeta.retainLashes.right;
            progressPatch.underRetainLashes = extraMeta.retainLashes;
            progressPatch.underRetainAttributeValues = retainAttrs;
          } else {
            progressPatch.retainLashCountLeft = extraMeta.retainLashes.left;
            progressPatch.retainLashCountRight = extraMeta.retainLashes.right;
            progressPatch.retainLashes = extraMeta.retainLashes;
            progressPatch.retainAttributeValues = retainAttrs;
          }
        }
      } else if (type === 'after') {
        if (isUnderRound) {
          progressPatch.underAfterPhotoUrl = photoUrl;
          progressPatch.underAfterPhotoSavedAt = nowIso;
        } else {
          progressPatch.afterPhotoUrl = photoUrl;
          progressPatch.afterPhotoSavedAt = nowIso;
        }
        progressPatch.currentStep = 10;
      }

      updateActiveBooking((prev) => ({
        ...prev,
        status: 'SERVICING',
        progress: progressPatch,
      }));
      setActiveServicingBookingId(activeBooking.id);
      saveLocalProgressSnapshot(activeBooking.id, {
        ...progressPatch,
        bookingId: activeBooking.id,
        status: 'SERVICING',
      });

      const autoOrderState = hasUnder
        ? `Photo ${isUnderRound ? 'under' : 'upper'}_${type} auto-saved`
        : `Photo ${type} auto-saved`;
      const postResult = await postAction('UPDATE_PROGRESS', {
        orderState: autoOrderState,
        progress: progressPatch,
      });
      return postResult;
    },
    [activeBooking, postAction, updateActiveBooking]
  );

  // Step 7 -> Step 8: Save Before Photo & Chuyển sang Ảnh Vệ Sinh
  const handleSaveBeforePhoto = useCallback(
    (photoUrl: string) => {
      const nowIso = new Date().toISOString();
      const activeRound = resolveActiveServicingRound(activeBooking);
      const isUnderRound = activeRound === 'UNDER';
      const roundStartedAt = isUnderRound
        ? activeBooking.progress?.underStartedAt || nowIso
        : activeBooking.progress?.upperStartedAt || activeBooking.progress?.startedAt || nowIso;
      const progressPatch: any = {
        ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
        activeServiceRound: activeRound,
        timerRunning: true,
        startedAt: roundStartedAt,
        currentStep: 8,
        ...(isUnderRound
          ? {
              underBeforePhotoUrl: photoUrl,
              underStartedAt: roundStartedAt,
              elapsedSeconds: 0,
            }
          : {
              beforePhotoUrl: photoUrl,
              upperStartedAt: roundStartedAt,
            }),
      };
      updateActiveBooking((prev) => ({
        ...prev,
        status: 'SERVICING',
        progress: progressPatch,
      }));
      setActiveServicingBookingId(activeBooking.id);
      saveLocalProgressSnapshot(activeBooking.id, {
        ...progressPatch,
        bookingId: activeBooking.id,
        status: 'SERVICING',
      });
      void postAction('UPDATE_PROGRESS', { orderState: 'Service Start', progress: progressPatch });
      setCurrentStep(8);
    },
    [activeBooking, postAction, setCurrentStep, updateActiveBooking]
  );

  const handleBackFromBeforePhoto = useCallback(() => {
    if (bookingRequiresUnderLashRound(activeBooking) && resolveActiveServicingRound(activeBooking) === 'UNDER') {
      const progressPatch: any = {
        ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: false }),
        activeServiceRound: 'UPPER' as const,
        currentStep: 10,
      };
      updateActiveBooking((prev) => ({
        ...prev,
        progress: progressPatch,
      }));
      saveLocalProgressSnapshot(activeBooking.id, {
        ...progressPatch,
        bookingId: activeBooking.id,
        status: 'SERVICING',
      });
      setCurrentStep(10);
      return;
    }
    setCurrentStep(6);
  }, [activeBooking, setCurrentStep, updateActiveBooking]);

  // Step 8 -> Step 9: Save Cleaned Photo (Vệ sinh nhắm) & Chuyển sang Bấm Giờ Phục Vụ
  const handleSaveCleanedPhoto = useCallback(
    (photoUrl: string, retainLashes?: { left: number; right: number }) => {
      const nowIso = new Date().toISOString();
      const activeRound = resolveActiveServicingRound(activeBooking);
      const isUnderRound = activeRound === 'UNDER';
      const roundStartedAt = isUnderRound
        ? activeBooking.progress?.underStartedAt || activeBooking.progress?.startedAt || nowIso
        : activeBooking.progress?.upperStartedAt || activeBooking.progress?.startedAt || nowIso;
      const progressPatch: any = {
        ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
        activeServiceRound: activeRound,
        timerRunning: true,
        startedAt: roundStartedAt,
        currentStep: 9,
        ...(isUnderRound
          ? { underCleanedPhotoUrl: photoUrl, underStartedAt: roundStartedAt }
          : { cleanedPhotoUrl: photoUrl, upperStartedAt: roundStartedAt }),
      };
      if (retainLashes) {
        const retainAttrs = {
          '17': {
            attribute_option_value: String(retainLashes.left),
            attribute_key: 'extension-lash-count-left',
          },
          '18': {
            attribute_option_value: String(retainLashes.right),
            attribute_key: 'extension-lash-count-right',
          },
        };
        if (isUnderRound) {
          progressPatch.underRetainLashCountLeft = retainLashes.left;
          progressPatch.underRetainLashCountRight = retainLashes.right;
          progressPatch.underRetainLashes = retainLashes;
          progressPatch.underRetainAttributeValues = retainAttrs;
        } else {
          progressPatch.retainLashCountLeft = retainLashes.left;
          progressPatch.retainLashCountRight = retainLashes.right;
          progressPatch.retainLashes = retainLashes;
          progressPatch.retainAttributeValues = retainAttrs;
        }
      }
      updateActiveBooking((prev) => ({
        ...prev,
        status: 'SERVICING',
        progress: progressPatch,
      }));
      setActiveServicingBookingId(activeBooking.id);
      saveLocalProgressSnapshot(activeBooking.id, {
        ...progressPatch,
        bookingId: activeBooking.id,
        status: 'SERVICING',
      });
      void postAction('UPDATE_PROGRESS', { orderState: 'Service Cleaned', progress: progressPatch });
      setCurrentStep(9);
    },
    [activeBooking, postAction, setCurrentStep, updateActiveBooking]
  );

  // Step 9: Timer controls
  const handleToggleTimer = useCallback(() => {
    updateActiveBooking((prev) => ({
      ...prev,
      progress: {
        ...(prev.progress || { elapsedSeconds: 0, timerRunning: false }),
        timerRunning: !prev.progress?.timerRunning,
      },
    }));
  }, [updateActiveBooking]);

  const handleFinishTimer = useCallback(() => {
    const completedAt = new Date().toISOString();
    const activeRound = resolveActiveServicingRound(activeBooking);
    const isUnderRound = activeRound === 'UNDER';
    const roundStartedAt =
      (isUnderRound ? activeBooking.progress?.underStartedAt : activeBooking.progress?.upperStartedAt) ||
      activeBooking.progress?.startedAt ||
      new Date(Date.now() - 45 * 60000).toISOString();
    const elapsedSeconds = Math.max(
      1,
      Math.floor((new Date(completedAt).getTime() - new Date(roundStartedAt).getTime()) / 1000)
    );
    const progressPatch: any = {
      ...(activeBooking.progress || { elapsedSeconds }),
      activeServiceRound: activeRound,
      elapsedSeconds,
      timerRunning: false,
      completedAt,
      currentStep: 10,
      ...(isUnderRound
        ? { underCompletedAt: completedAt, underElapsedSeconds: elapsedSeconds }
        : { upperCompletedAt: completedAt, upperElapsedSeconds: elapsedSeconds }),
    };
    updateActiveBooking((prev) => ({
      ...prev,
      status: 'SERVICING',
      progress: progressPatch,
    }));
    saveLocalProgressSnapshot(activeBooking.id, {
      ...progressPatch,
      bookingId: activeBooking.id,
      completedAt,
      status: 'SERVICING',
    });
    void postAction('UPDATE_PROGRESS', { orderState: 'Service End', progress: progressPatch });
    setCurrentStep(10);
  }, [activeBooking, postAction, setCurrentStep, updateActiveBooking]);

  // Step 10 -> Step 7 (Vòng 2 Mi Dưới) hoặc Step 12 (Upsell)
  const handleSaveAfterPhoto = useCallback(
    (photoUrl: string) => {
      const nowIso = new Date().toISOString();
      const hasUnder = bookingRequiresUnderLashRound(activeBooking);
      const activeRound = resolveActiveServicingRound(activeBooking);
      if (hasUnder && activeRound === 'UPPER') {
        const progressPatch: any = {
          ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: false }),
          afterPhotoUrl: photoUrl,
          afterPhotoSavedAt: activeBooking.progress?.afterPhotoSavedAt || nowIso,
          upperCompleted: true,
          activeServiceRound: 'UNDER' as const,
          timerRunning: false,
          elapsedSeconds: 0,
          currentStep: 7,
        };
        updateActiveBooking((prev) => ({
          ...prev,
          status: 'SERVICING',
          progress: progressPatch,
        }));
        saveLocalProgressSnapshot(activeBooking.id, {
          ...progressPatch,
          bookingId: activeBooking.id,
          status: 'SERVICING',
        });
        void postAction('NEXT_SERVICE_ROUND', { orderState: 'Preparation', progress: progressPatch });
        setCurrentStep(7);
        return;
      }

      const isUnderRound = activeRound === 'UNDER';
      const progressPatch: any = {
        ...(activeBooking.progress || { elapsedSeconds: 4468, timerRunning: false }),
        activeServiceRound: activeRound,
        ...(isUnderRound
          ? {
              underAfterPhotoUrl: photoUrl,
              underAfterPhotoSavedAt: activeBooking.progress?.underAfterPhotoSavedAt || nowIso,
            }
          : {
              afterPhotoUrl: photoUrl,
              afterPhotoSavedAt: activeBooking.progress?.afterPhotoSavedAt || nowIso,
            }),
        currentStep: 12,
      };
      updateActiveBooking((prev) => ({
        ...prev,
        status: 'SERVICING',
        progress: progressPatch,
      }));
      saveLocalProgressSnapshot(activeBooking.id, {
        ...progressPatch,
        bookingId: activeBooking.id,
        status: 'SERVICING',
      });
      void postAction('UPDATE_PROGRESS', { orderState: 'Service Completed', progress: progressPatch });
      setCurrentStep(12);
    },
    [activeBooking, postAction, setCurrentStep, updateActiveBooking]
  );

  // Step 11/12 -> Step 10: Quay lại màn hình Ảnh After để Chuyên Viên hoặc Khách soi lại hình Before/After
  const handleBackToAfterPhoto = useCallback(() => {
    const hasUnder = bookingRequiresUnderLashRound(activeBooking);
    const activeRound = resolveActiveServicingRound(activeBooking);
    const progressPatch: any = {
      ...(activeBooking.progress || { elapsedSeconds: 4468, timerRunning: false }),
      activeServiceRound: activeRound,
      currentStep: 10,
    };
    updateActiveBooking((prev) => ({
      ...prev,
      progress: progressPatch,
    }));
    saveLocalProgressSnapshot(activeBooking.id, {
      ...progressPatch,
      bookingId: activeBooking.id,
      status: 'SERVICING',
    });
    setActiveServicingStep(10);
    setCurrentStep(10);
    void postAction('UPDATE_PROGRESS', {
      orderState: hasUnder
        ? `Photo ${activeRound === 'UNDER' ? 'under' : 'upper'}_after auto-saved`
        : 'Photo after auto-saved',
      progress: progressPatch,
    });
  }, [activeBooking, postAction, setCurrentStep, updateActiveBooking]);

  // Step 11: Complete Survey -> Giữ nguyên quyền điều khiển của CVL / CVLL để tự bán Dưỡng mi / Combo & Tự Checkout
  const handleCompleteSurvey = useCallback(
    (survey: { rating: number; emotion: 'happy' | 'satisfied' | 'neutral' | 'unhappy'; feedbackNote?: string }) => {
      updateActiveBooking((prev) => ({
        ...prev,
        survey,
        progress: {
          ...(prev.progress || { elapsedSeconds: 4468, timerRunning: false }),
          currentStep: 12,
        },
      }));
      saveLocalProgressSnapshot(activeBooking.id, {
        survey,
        currentStep: 12,
        bookingId: activeBooking.id,
        status: 'SERVICING',
      });
      void postAction('COMPLETE_SURVEY', { survey });
      setCurrentStep(12);
    },
    [activeBooking.id, postAction, setCurrentStep, updateActiveBooking]
  );

  return {
    handleResumeServicing,
    handleCvStartTask,
    handleAutoSavePhoto,
    handleSaveBeforePhoto,
    handleBackFromBeforePhoto,
    handleSaveCleanedPhoto,
    handleToggleTimer,
    handleFinishTimer,
    handleSaveAfterPhoto,
    handleBackToAfterPhoto,
    handleCompleteSurvey,
  };
}
