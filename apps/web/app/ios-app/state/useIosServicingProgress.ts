'use client';

import { useCallback, Dispatch, SetStateAction } from 'react';
import { hasCompleteNaturalLashSet, IosSelfChallengeSelection } from '@mos-lab/shared';
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
      const targetStep =
        targetBooking.progress?.currentStep ||
        cached?.currentStep ||
        (await getActiveServicingStepAsync()) ||
        getActiveServicingStep() ||
        6;
      setActiveTab('task');
      setCurrentStep(targetStep);
    },
    [bookings, activeServicingBooking, activeBookingId, setActiveBookingId, setActiveTab, setCurrentStep]
  );

  // Step 6 -> Step 7: CV starts task (Preparation - đồng hồ tự động chạy ngay)
  const handleCvStartTask = useCallback(
    (durationMinutes?: number, selfChallenge?: IosSelfChallengeSelection) => {
      if (!hasCompleteNaturalLashSet(activeBooking)) {
        setCurrentStep(3);
        return;
      }
      const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
      const effectiveDuration =
        durationMinutes || selfChallenge?.committedMinutes || activeBooking.serviceDuration || 60;
      const progressPatch = {
        ...(activeBooking.progress || { elapsedSeconds: 0 }),
        startedAt,
        timerRunning: true,
        currentStep: 7,
        targetDurationMinutes: effectiveDuration,
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
        serviceDuration: effectiveDuration,
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

  // Tự động lưu ảnh ngay khi chụp vào RAM & IndexedDB, sau đó tự động đẩy lên Cloud
  const handleAutoSavePhoto = useCallback(
    async (
      type: 'before' | 'cleaned' | 'after',
      photoUrl: string,
      extraMeta?: { retainLashes?: { left: number; right: number } }
    ) => {
      const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
      const progressPatch: any = {
        ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
        startedAt,
        cloudSyncStatus: 'UPLOADING',
      };
      if (type === 'before') {
        progressPatch.beforePhotoUrl = photoUrl;
        progressPatch.beforePhotoSavedAt = new Date().toISOString();
        progressPatch.currentStep = 7;
      } else if (type === 'cleaned') {
        progressPatch.cleanedPhotoUrl = photoUrl;
        progressPatch.cleanedPhotoSavedAt = new Date().toISOString();
        progressPatch.currentStep = 8;
        if (extraMeta?.retainLashes) {
          progressPatch.retainLashCountLeft = extraMeta.retainLashes.left;
          progressPatch.retainLashCountRight = extraMeta.retainLashes.right;
          progressPatch.retainLashes = extraMeta.retainLashes;
          progressPatch.retainAttributeValues = {
            '17': {
              attribute_option_value: String(extraMeta.retainLashes.left),
              attribute_key: 'extension-lash-count-left',
            },
            '18': {
              attribute_option_value: String(extraMeta.retainLashes.right),
              attribute_key: 'extension-lash-count-right',
            },
          };
        }
      } else if (type === 'after') {
        progressPatch.afterPhotoUrl = photoUrl;
        progressPatch.afterPhotoSavedAt = new Date().toISOString();
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

      const postResult = await postAction('UPDATE_PROGRESS', {
        orderState: `Photo ${type} auto-saved`,
        progress: progressPatch,
      });
      return postResult;
    },
    [activeBooking.id, activeBooking.progress, postAction, updateActiveBooking]
  );

  // Step 7 -> Step 8: Save Before Photo (Mắt mộc) & Chuyển sang Ảnh Vệ Sinh
  const handleSaveBeforePhoto = useCallback(
    (photoUrl: string) => {
      const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
      const progressPatch = {
        ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
        beforePhotoUrl: photoUrl,
        timerRunning: true,
        startedAt,
        currentStep: 8,
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
    [activeBooking.id, activeBooking.progress, postAction, setCurrentStep, updateActiveBooking]
  );

  // Step 8 -> Step 9: Save Cleaned Photo (Vệ sinh nhắm) & Chuyển sang Bấm Giờ Phục Vụ
  const handleSaveCleanedPhoto = useCallback(
    (photoUrl: string, retainLashes?: { left: number; right: number }) => {
      const startedAt = activeBooking.progress?.startedAt || new Date().toISOString();
      const progressPatch: any = {
        ...(activeBooking.progress || { elapsedSeconds: 0, timerRunning: true }),
        cleanedPhotoUrl: photoUrl,
        timerRunning: true,
        startedAt,
        currentStep: 9,
      };
      if (retainLashes) {
        progressPatch.retainLashCountLeft = retainLashes.left;
        progressPatch.retainLashCountRight = retainLashes.right;
        progressPatch.retainLashes = retainLashes;
        progressPatch.retainAttributeValues = {
          '17': {
            attribute_option_value: String(retainLashes.left),
            attribute_key: 'extension-lash-count-left',
          },
          '18': {
            attribute_option_value: String(retainLashes.right),
            attribute_key: 'extension-lash-count-right',
          },
        };
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
    [activeBooking.id, activeBooking.progress, postAction, setCurrentStep, updateActiveBooking]
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
    const startedAt = activeBooking.progress?.startedAt || new Date(Date.now() - 68 * 60000).toISOString();
    const elapsedSeconds = Math.max(
      1,
      Math.floor((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
    );
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds }),
      elapsedSeconds,
      timerRunning: false,
      completedAt,
      currentStep: 10,
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
  }, [activeBooking.id, activeBooking.progress, postAction, setCurrentStep, updateActiveBooking]);

  // Step 10 -> Step 12: Save After Photo & Go to Product Upsell
  const handleSaveAfterPhoto = useCallback(
    (photoUrl: string) => {
      const progressPatch = {
        ...(activeBooking.progress || { elapsedSeconds: 4468, timerRunning: false }),
        afterPhotoUrl: photoUrl,
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
    [activeBooking.id, activeBooking.progress, postAction, setCurrentStep, updateActiveBooking]
  );

  // Step 11/12 -> Step 10: Quay lại màn hình Ảnh After để Chuyên Viên hoặc Khách soi lại hình Before/After
  const handleBackToAfterPhoto = useCallback(() => {
    const progressPatch = {
      ...(activeBooking.progress || { elapsedSeconds: 4468, timerRunning: false }),
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
    void postAction('UPDATE_PROGRESS', { orderState: 'Photo after auto-saved', progress: progressPatch });
  }, [activeBooking.id, activeBooking.progress, postAction, setCurrentStep, updateActiveBooking]);

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
    handleSaveCleanedPhoto,
    handleToggleTimer,
    handleFinishTimer,
    handleSaveAfterPhoto,
    handleBackToAfterPhoto,
    handleCompleteSurvey,
  };
}
