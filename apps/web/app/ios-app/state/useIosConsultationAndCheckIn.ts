'use client';

import { useCallback, Dispatch, SetStateAction, MutableRefObject } from 'react';
import { hasCompleteNaturalLashAttributes, resolveEffectiveServiceTotal } from '@mos-lab/shared';
import { BookingItem } from './mockData';
import type { IosUserRole, ActiveActorProfile } from './iosActorProfile';
import { saveLocalProgressSnapshot, setActiveServicingBookingId } from './offlineSync';

export interface UseIosConsultationAndCheckInParams {
  role: IosUserRole;
  actor: ActiveActorProfile;
  bookings: BookingItem[];
  setBookings: Dispatch<SetStateAction<BookingItem[]>>;
  activeBooking: BookingItem;
  activeBookingId: number;
  setActiveBookingId: Dispatch<SetStateAction<number>>;
  activeBookingIdRef: MutableRefObject<number>;
  updateActiveBooking: (updater: (prev: BookingItem) => BookingItem) => void;
  postAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setBookingSegment: Dispatch<SetStateAction<'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL'>>;
  consultationReturnStep: number | null;
  setConsultationReturnStep: Dispatch<SetStateAction<number | null>>;
}

export function useIosConsultationAndCheckIn({
  role,
  actor,
  bookings,
  setBookings,
  activeBooking,
  activeBookingId,
  setActiveBookingId,
  activeBookingIdRef,
  updateActiveBooking,
  postAction,
  setCurrentStep,
  setBookingSegment,
  consultationReturnStep,
  setConsultationReturnStep,
}: UseIosConsultationAndCheckInParams) {
  // Cập nhật ảnh đại diện khách hàng (đồng bộ tức thì client & server)
  const handleUpdateCustomerAvatar = useCallback(
    async (avatarUrl: string, targetBookingId?: number) => {
      const targetId = targetBookingId !== undefined ? Number(targetBookingId) : activeBookingId;
      const targetBooking = bookings.find((b) => Number(b.id) === targetId);
      const customerId = targetBooking?.customerId;

      // 1. Phản hồi thị giác tức thì (0ms) trên client
      setBookings((prev) =>
        prev.map((b) => {
          if (Number(b.id) === targetId || (customerId && Number(b.customerId) === Number(customerId))) {
            return {
              ...b,
              customerAvatar: avatarUrl || undefined,
            };
          }
          return b;
        })
      );

      // 2. Gửi action đồng bộ lên server
      try {
        await postAction('UPDATE_CUSTOMER_AVATAR', {
          bookingId: targetId,
          customerId,
          customerAvatar: avatarUrl,
        });
      } catch (err) {
        console.warn('[useIosConsultationAndCheckIn] Failed to sync customer avatar:', err);
      }
    },
    [activeBookingId, bookings, postAction, setBookings]
  );

  // Step 2: Check-in action (Ai bấm Check-in nhận 10% Tip Check-in)
  const handleCheckIn = useCallback(
    (targetBookingId?: number) => {
      const targetId = targetBookingId !== undefined ? Number(targetBookingId) : activeBookingId;
      setActiveBookingId(targetId);
      activeBookingIdRef.current = targetId;

      setBookings((prev) =>
        prev.map((b) => {
          if (Number(b.id) === targetId) {
            const shouldAutoAssignToActor = role === 'CVL';
            return {
              ...b,
              status: 'CHECKED_IN',
              checkInStaffId: actor.staffId,
              checkInStaffName: actor.name,
              checkInStaffTier: actor.tier,
              checkInStaffAvatar: actor.avatar,
              assignedStaffId: b.assignedStaffId || (shouldAutoAssignToActor ? actor.staffId : 0),
              assignedStaffName:
                b.assignedStaffName && b.assignedStaffName !== 'Chờ phân công (Đầu tua)'
                  ? b.assignedStaffName
                  : shouldAutoAssignToActor
                    ? actor.name
                    : b.assignedStaffName || 'Chờ phân công (Đầu tua)',
              assignedStaffAvatar: b.assignedStaffAvatar || (shouldAutoAssignToActor ? actor.avatar : undefined),
              isUnassignedQueue: shouldAutoAssignToActor ? false : b.isUnassignedQueue,
              isNextQueueCustomer: shouldAutoAssignToActor ? false : b.isNextQueueCustomer,
              progress: {
                ...(b.progress || { elapsedSeconds: 0, timerRunning: false }),
                currentStep: 3,
              },
            };
          }
          return b;
        })
      );
      setBookingSegment('SERVICING');
      void postAction('CHECK_IN', { bookingId: targetId });
      setCurrentStep(3); // Go to Consultation Matrix + Combo Selection
    },
    [
      activeBookingId,
      activeBookingIdRef,
      actor,
      postAction,
      role,
      setActiveBookingId,
      setBookingSegment,
      setBookings,
      setCurrentStep,
    ]
  );

  // Step 3: Save Consultation & Optional Combo Upsell
  const handleSaveConsultation = useCallback(
    (
      attributes: {
        style: string;
        curl: string;
        length: string;
        thickness: string;
        material?: string;
        color?: string;
        volume?: string;
        count?: string;
        hasUnderMink?: boolean;
        underMinkServiceType?: 'Normal' | 'Retain';
        underMinkCurl?: string;
        underMinkThickness?: string;
        underMinkLength?: string;
        underMinkCount?: string;
        isOverridden?: boolean;
        overrideReason?: string;
        eyeShape?: string;
        naturalLashLength?: string;
        naturalLashThickness?: string;
        naturalLashDensity?: string;
        naturalLashCount?: string;
        isNewClientDiagnosticDone?: boolean;
        lashHealth?: string;
        lashTrail?: string;
        medicalProblem?: string;
        notes?: string;
      },
      selectedCombo?: BookingItem['selectedCombo'] | null,
      skuPricing?: {
        skuName?: string;
        skuPrice?: number;
        upgradePrice?: number;
        cvPoints?: number;
        cvBreakdown?: string;
        serviceType?: string;
      } | null,
      targetBookingId?: number,
      selectedUnderCombo?: BookingItem['selectedUnderCombo'] | null,
      assignmentMode?: 'SELF_SERVICE' | 'ASSIGN_OTHER'
    ) => {
      const targetId = targetBookingId !== undefined ? Number(targetBookingId) : activeBookingId;
      setActiveBookingId(targetId);
      activeBookingIdRef.current = targetId;

      const targetBooking = bookings.find((b) => Number(b.id) === targetId) || activeBooking;
      const targetCustomerId = Number(targetBooking?.customerId || 0);
      const mergedAttributes = {
        ...(targetBooking?.attributes || {}),
        ...attributes,
        isNewClientDiagnosticDone: true,
      };
      const hasFull7 = hasCompleteNaturalLashAttributes(mergedAttributes);
      const isSelfAssignedCv =
        role === 'CVL' ||
        (role === 'CVLL' &&
          (assignmentMode
            ? assignmentMode === 'SELF_SERVICE'
            : !targetBooking.assignedStaffId || targetBooking.assignedStaffId === actor.staffId));

      if (isSelfAssignedCv) {
        setActiveServicingBookingId(targetId);
        saveLocalProgressSnapshot(targetId, {
          currentStep: 6,
          status: 'SERVICING',
          bookingId: targetId,
        });
      }

      setBookings((prev) =>
        prev.map((b) => {
          if (Number(b.id) !== targetId) {
            if (
              hasFull7 &&
              targetCustomerId > 0 &&
              Number(b.customerId) === targetCustomerId &&
              !hasCompleteNaturalLashAttributes(b.attributes)
            ) {
              return {
                ...b,
                attributes: {
                  ...(b.attributes || { style: 'Natural', curl: 'C', length: '10-12 mm', thickness: '0.07 mm' }),
                  naturalLashLength: mergedAttributes.naturalLashLength,
                  naturalLashThickness: mergedAttributes.naturalLashThickness,
                  naturalLashCount: mergedAttributes.naturalLashCount,
                  naturalLashDensity: mergedAttributes.naturalLashDensity,
                  lashTrail: mergedAttributes.lashTrail,
                  eyeShape: mergedAttributes.eyeShape,
                  lashHealth: mergedAttributes.lashHealth,
                  medicalProblem: mergedAttributes.medicalProblem,
                  isNewClientDiagnosticDone: true,
                },
              };
            }
            return b;
          }
          const nextCombo = selectedCombo !== undefined ? selectedCombo : b.selectedCombo || null;
          const nextUnderCombo = selectedUnderCombo !== undefined ? selectedUnderCombo : b.selectedUnderCombo || null;
          const nextServiceName =
            skuPricing?.skuName ||
            (b.serviceName && !b.serviceName.toLowerCase().includes('any') ? b.serviceName : 'New Hyperlight 550');
          const nextServicePrice = skuPricing?.skuPrice || b.servicePrice;
          const nextUpgradePrice = skuPricing?.upgradePrice ?? b.upgradePrice ?? 0;
          const originalBookedServiceName =
            b.originalBookedServiceName && !b.originalBookedServiceName.toLowerCase().includes('any')
              ? b.originalBookedServiceName
              : nextServiceName;
          const originalBookedServicePrice = b.originalBookedServicePrice || b.servicePrice;

          const isClientComboLive = Boolean(b.comboLiveStatus?.isComboLive);
          const hasUnderMinkComboActive = Boolean(
            b.underMinkComboStatus?.hasUnderCombo && (b.underMinkComboStatus?.remainingSessions ?? 0) > 0
          );
          const comboPrice = (nextCombo ? nextCombo.price : 0) + (nextUnderCombo ? nextUnderCombo.price : 0);
          const effectiveServiceTotal = resolveEffectiveServiceTotal({
            servicePrice: nextServicePrice,
            upgradePrice: nextUpgradePrice,
            serviceName: nextServiceName,
            isComboLive: isClientComboLive,
            hasUnderMink: attributes.hasUnderMink,
            underMinkServiceType: attributes.underMinkServiceType,
            hasUnderMinkCombo: hasUnderMinkComboActive,
            selectedCombo: nextCombo,
            selectedUnderCombo: nextUnderCombo,
            comboRedemption: b.comboRedemption,
          });
          const productTotal = (b.cartProducts || []).reduce((s, p) => s + p.price * p.quantity, 0);
          const subtotal = effectiveServiceTotal + comboPrice + productTotal;
          const vatRate = 0.08;
          const vatAmount = Math.round(subtotal * vatRate);
          const tipAmount = b.billing?.tipAmount ?? 0;
          const grandTotal = subtotal + vatAmount + tipAmount;

          const nextAssignedStaffId = isSelfAssignedCv
            ? b.assignedStaffId || actor.staffId
            : b.assignedStaffId && b.assignedStaffId !== actor.staffId
              ? b.assignedStaffId
              : 0;
          const nextAssignedStaffName = isSelfAssignedCv
            ? b.assignedStaffName && b.assignedStaffName !== 'Chờ phân công (Đầu tua)'
              ? b.assignedStaffName
              : actor.name
            : b.assignedStaffName && b.assignedStaffName !== actor.name
              ? b.assignedStaffName
              : 'Chờ phân công (Đầu tua)';

          return {
            ...b,
            attributes: mergedAttributes,
            serviceType: skuPricing?.serviceType || b.serviceType || 'Normal',
            serviceName: nextServiceName,
            servicePrice: nextServicePrice,
            originalBookedServiceName,
            originalBookedServicePrice,
            upgradePrice: nextUpgradePrice,
            cvRotationPoints: skuPricing?.cvPoints ?? b.cvRotationPoints,
            cvRotationBreakdown: skuPricing?.cvBreakdown ?? b.cvRotationBreakdown,
            selectedCombo: nextCombo,
            selectedUnderCombo: nextUnderCombo,
            _localComboUpdatedAt: Date.now(),
            checkInStaffId: b.checkInStaffId || actor.staffId,
            checkInStaffName: b.checkInStaffName || actor.name,
            checkInStaffTier: b.checkInStaffTier || actor.tier,
            checkInStaffAvatar: b.checkInStaffAvatar || actor.avatar,
            assignedStaffId: nextAssignedStaffId,
            assignedStaffName: nextAssignedStaffName,
            assignedStaffAvatar: isSelfAssignedCv ? b.assignedStaffAvatar || actor.avatar : b.assignedStaffAvatar,
            isUnassignedQueue: !isSelfAssignedCv && nextAssignedStaffId === 0,
            isNextQueueCustomer: !isSelfAssignedCv && nextAssignedStaffId === 0,
            status: isSelfAssignedCv ? 'SERVICING' : 'CHECKED_IN',
            billing: {
              subtotal,
              vatRate,
              vatAmount,
              serviceTotal: effectiveServiceTotal,
              comboTotal: comboPrice,
              productTotal,
              paymentMethod: b.billing?.paymentMethod || 'VIETQR',
              tipAmount,
              tipCvShare: Math.round(tipAmount * 0.7),
              tipCheckInShare: Math.round(tipAmount * 0.1),
              tipCheckOutShare: Math.round(tipAmount * 0.1),
              tipCcShare: Math.round(tipAmount * 0.2),
              grandTotal,
            },
          };
        })
      );

      void postAction('SAVE_CONSULTATION', {
        bookingId: targetId,
        customerId: targetCustomerId || undefined,
        customerVisits: targetBooking?.customerVisits,
        attributes: mergedAttributes,
        selectedCombo: selectedCombo !== undefined ? selectedCombo : targetBooking.selectedCombo || null,
        selectedUnderCombo:
          selectedUnderCombo !== undefined ? selectedUnderCombo : targetBooking.selectedUnderCombo || null,
        skuPricing,
        assignmentMode: isSelfAssignedCv ? 'SELF_SERVICE' : 'ASSIGN_OTHER',
        nextStatus: isSelfAssignedCv ? 'SERVICING' : 'CHECKED_IN',
      });

      if (consultationReturnStep) {
        const nextStep = consultationReturnStep;
        setConsultationReturnStep(null);
        setCurrentStep(nextStep);
        return;
      }

      if (isSelfAssignedCv) {
        // CVL hoặc CVLL tự nhận làm mi -> vào thẳng màn hình Nhận ca / Chụp ảnh tiến trình mi, không cần qua CC chia ca
        setBookingSegment('SERVICING');
        setCurrentStep(6);
      } else {
        // CVLL tư vấn chéo hộ Chuyên Viên khác hoặc CC -> sang bước xác nhận Chuyên Viên làm mi (Step 4)
        setCurrentStep(4);
      }
    },
    [
      activeBooking,
      activeBookingId,
      activeBookingIdRef,
      actor,
      bookings,
      consultationReturnStep,
      postAction,
      role,
      setActiveBookingId,
      setBookingSegment,
      setBookings,
      setConsultationReturnStep,
      setCurrentStep,
    ]
  );

  // Tự động lưu bản nháp tư vấn mỗi khi thao tác (không nhảy step)
  const handleAutoSaveConsultationDraft = useCallback(
    async (
      attributes: Record<string, any>,
      selectedCombo?: BookingItem['selectedCombo'] | null,
      skuPricing?: Record<string, any> | null,
      targetBookingId?: number,
      selectedUnderCombo?: BookingItem['selectedUnderCombo'] | null,
      notes?: string
    ) => {
      const targetId = targetBookingId !== undefined ? Number(targetBookingId) : activeBookingId;
      const targetBooking = bookings.find((b) => Number(b.id) === targetId);

      // 1. Cập nhật state bookings tức thì trên client
      setBookings((prev) =>
        prev.map((b) => {
          if (Number(b.id) === targetId) {
            return {
              ...b,
              attributes: { ...(b.attributes || {}), ...attributes } as BookingItem['attributes'],
              customerNote: notes !== undefined ? notes : b.customerNote,
              serviceName: skuPricing?.skuName || b.serviceName,
              servicePrice: skuPricing?.skuPrice ?? b.servicePrice,
              serviceType: skuPricing?.serviceType || b.serviceType,
              selectedCombo: selectedCombo !== undefined ? selectedCombo : b.selectedCombo,
              selectedUnderCombo: selectedUnderCombo !== undefined ? selectedUnderCombo : b.selectedUnderCombo,
              _localComboUpdatedAt: Date.now(),
            };
          }
          return b;
        })
      );

      // 2. Gửi action draft lên server
      try {
        await postAction('SAVE_CONSULTATION_DRAFT', {
          bookingId: targetId,
          customerId: targetBooking?.customerId,
          attributes,
          notes,
          selectedCombo,
          selectedUnderCombo,
          skuPricing,
        });
      } catch (err) {
        console.warn('[useIosConsultationAndCheckIn] Failed to autosave consultation draft:', err);
      }
    },
    [activeBookingId, bookings, postAction, setBookings]
  );

  // Step 4: Assign Staff & Bed
  const handleAssignStaff = useCallback(
    (staffId: number, staffName: string, bed: string) => {
      updateActiveBooking((prev) => ({
        ...prev,
        assignedStaffId: staffId,
        assignedStaffName: staffName,
        assignedBed: bed,
        status: 'SERVICING',
      }));
      void postAction('ASSIGN_STAFF', {
        assignedStaffId: staffId,
        assignedStaffName: staffName,
        assignedBed: bed,
      });
      setBookingSegment('SERVICING');
      setCurrentStep(5);
    },
    [postAction, setBookingSegment, setCurrentStep, updateActiveBooking]
  );

  // Step 5 -> Step 6: Handover to CV
  const handleTransferToCv = useCallback(() => {
    setCurrentStep(6);
  }, [setCurrentStep]);

  return {
    handleUpdateCustomerAvatar,
    handleCheckIn,
    handleSaveConsultation,
    handleAutoSaveConsultationDraft,
    handleAssignStaff,
    handleTransferToCv,
  };
}
