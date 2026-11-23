import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { BookingPromotionOptionsResponse, SafeAny, UpdateBookingRequest } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { notifyBookingMutation, toBookingCustomerId } from '../../../lib/booking-events';
import { clearSessionDraft, readSessionDraft, writeSessionDraft } from '../../../lib/note-draft-storage';
import { STORES, isStaffOffOnDate } from '../constants';
import { checkAndAppendLowerLashNote } from '../comboUtils';
import { useBookingStaff } from '../useBookingStaff';
import { useSlotMatrix } from '../useSlotMatrix';
import { useCustomerInsights } from '../useCustomerInsights';
import {
  OffDayStaffInfo,
  extractInitialSlotTime,
  findNextWorkingDate,
  getBookingServiceInfo,
  resolveInitialStore,
} from './rescheduleUtils';
import { useRescheduleTemplates } from './useRescheduleTemplates';

interface UseRescheduleBookingFormParams {
  open: boolean;
  booking: SafeAny;
  onClose: () => void;
  onSuccess: () => void;
}

export function useRescheduleBookingForm({ open, booking, onClose, onSuccess }: UseRescheduleBookingFormParams) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedCN, setSelectedCN] = useState<SafeAny>(null);
  const [selectedCV, setSelectedCV] = useState<SafeAny>(null);
  const [bookingNote, setBookingNoteState] = useState('');
  const initializedBookingKeyRef = useRef<string | null>(null);
  const rescheduleDraftKey = booking?.id ? `mos_reschedule_note_draft:${booking.id}` : null;

  const setBookingNote = useCallback(
    (nextNote: string) => {
      setBookingNoteState(nextNote);
      if (rescheduleDraftKey) {
        if (nextNote.trim().length > 0) {
          writeSessionDraft<string>(rescheduleDraftKey, nextNote);
        } else {
          clearSessionDraft(rescheduleDraftKey);
        }
      }
    },
    [rescheduleDraftKey]
  );

  const [services, setServices] = useState<SafeAny[]>([]);
  const [selectedService, setSelectedService] = useState<SafeAny>(null);

  const [promotionOptions, setPromotionOptions] = useState<BookingPromotionOptionsResponse | null>(null);
  const [selectedPromotionSelection, setSelectedPromotionSelection] = useState<string | undefined>(undefined);

  const selectedCustomer = booking?.customerId ? { id: booking.customerId } : null;
  const { favoriteTechs, comboBalances, suggestedServices, suggestedBranch, customerLastVisit } = useCustomerInsights(
    selectedCustomer,
    selectedCN,
    setSelectedCN
  );

  const { staffList, loadingStaff, fetchStaff, getFavoriteKTVs, setStaffList, setLoadingStaff } = useBookingStaff(
    null,
    favoriteTechs
  );

  const {
    bookingDate,
    setBookingDate,
    selectedSlot,
    setSelectedSlot,
    slotMatrix,
    loadingSlots,
    fetchSlots,
    getCategorizedSlots,
  } = useSlotMatrix(selectedCN, selectedCV);

  const { morning, afternoon, night } = getCategorizedSlots();

  const [isLateSlotModalOpen, setIsLateSlotModalOpen] = useState<boolean>(false);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);

  const [isOffDayWarningOpen, setIsOffDayWarningOpen] = useState<boolean>(
    () => !!(booking && (booking.isOffDayDrop || booking.technicianOffDays?.includes('2')))
  );
  const [offDayStaffInfo, setOffDayStaffInfo] = useState<OffDayStaffInfo | null>(null);

  const templates = useRescheduleTemplates({
    open,
    booking,
    selectedCN,
    selectedSlot,
    bookingDate,
    selectedCV,
    selectedCustomer,
    customerLastVisit,
    offDayStaffInfo,
  });

  const checkAndHandleOffDay = useCallback(
    (cvItem: SafeAny, targetDate: dayjs.Dayjs) => {
      if (!cvItem || !targetDate) return false;
      const isOff = isStaffOffOnDate(cvItem, targetDate);
      if (isOff || (booking && booking.isOffDayDrop)) {
        const nextDate = findNextWorkingDate(cvItem, targetDate);
        const staffNameStr = cvItem.displayName || cvItem.name || cvItem.technicianName || 'Trancy';
        const dateStr = targetDate.format('DD/MM/YYYY');
        const nextDateStr = nextDate.format('DD/MM/YYYY');

        message.warning({
          content: `⚠️ CẢNH BÁO LỊCH NGHỈ TUẦN: CV ${staffNameStr} nghỉ tuần ngày ${dateStr}. Tiệm đã gợi ý dời sang ngày ${nextDateStr} (${staffNameStr} đi làm lại).`,
          duration: 8,
        });

        setOffDayStaffInfo({
          staffName: staffNameStr,
          dateStr,
          nextWorkingDate: nextDate,
        });
        setIsOffDayWarningOpen(true);
        return true;
      }
      return false;
    },
    [booking]
  );

  const fetchServices = useCallback(
    async (targetId: SafeAny, targetName: SafeAny) => {
      try {
        const list = (await apiClient.customers.getServices()) || [];

        let matched = null;
        if (targetId !== null && targetId !== undefined) {
          matched = list.find((s: SafeAny) => Number(s.id) === Number(targetId));
        }
        if (!matched && targetName) {
          const cleanTarget = String(targetName).trim().toLowerCase();
          matched = list.find((s: SafeAny) => s.name.trim().toLowerCase() === cleanTarget);
        }

        if (matched) {
          setSelectedService(matched);
          setServices((prev) => (prev.some((s) => s.id === matched.id) ? prev : [matched, ...list]));
        } else if (targetName) {
          const customService = {
            id: `unresolved:${String(targetName)}`,
            name: targetName,
            price: booking?.servicePrice || booking?.price || 0,
            duration: 90,
          };
          setSelectedService(customService);
          setServices([customService, ...list.filter((s: SafeAny) => s.id !== customService.id)]);
        } else if (list.length > 0) {
          setServices(list);
        }
      } catch (err) {
        console.error('[Reschedule] Failed to fetch services:', err);
      }
    },
    [booking]
  );

  const lifecycleActionsRef = useRef({
    checkAndHandleOffDay,
    fetchServices,
    setBookingDate,
    setSelectedSlot,
    setStaffList,
    setLoadingStaff,
    fetchBookingTemplates: templates.fetchBookingTemplates,
    autoSelectTemplate: templates.autoSelectTemplate,
    fetchSlots,
    fetchStaff,
  });

  useEffect(() => {
    lifecycleActionsRef.current = {
      checkAndHandleOffDay,
      fetchServices,
      setBookingDate,
      setSelectedSlot,
      setStaffList,
      setLoadingStaff,
      fetchBookingTemplates: templates.fetchBookingTemplates,
      autoSelectTemplate: templates.autoSelectTemplate,
      fetchSlots,
      fetchStaff,
    };
  });

  // Initialize fields on open (only once per open session / booking id so parent re-renders never overwrite edits)
  useEffect(() => {
    if (!open || !booking) {
      initializedBookingKeyRef.current = null;
      return;
    }

    const sessionBookingKey = `${booking.id ?? 'unknown'}`;
    if (initializedBookingKeyRef.current === sessionBookingKey) {
      return;
    }
    initializedBookingKeyRef.current = sessionBookingKey;

    const actions = lifecycleActionsRef.current;
    setIsLateSlotModalOpen(false);

    const targetDateStr = booking.targetBookingDate || booking.target_booking_date;
    const rawDate =
      targetDateStr || booking.bookingDate || booking.bookingDateStart || booking.booking_date_start || booking.date;
    const bDate = rawDate ? dayjs(rawDate) : dayjs();

    const initialCV = booking.technicianId
      ? {
          id: booking.technicianId,
          displayName: booking.technicianName || 'Chuyên viên',
          offDays: booking.technicianOffDays || ['2'],
        }
      : null;
    setSelectedCV(initialCV);

    if (booking.isOffDayDrop || (initialCV && isStaffOffOnDate(initialCV, bDate))) {
      setOffDayStaffInfo({
        staffName: initialCV?.displayName || booking.technicianName || 'Trancy',
        dateStr: bDate.format('DD/MM/YYYY'),
        nextWorkingDate: initialCV ? findNextWorkingDate(initialCV, bDate) : bDate.clone().add(1, 'day'),
      });
      setIsOffDayWarningOpen(true);
    } else {
      setIsOffDayWarningOpen(false);
    }

    // Synchronously set initial service so UI never shows empty placeholder
    const { id: srvId, name: srvName } = getBookingServiceInfo(booking);
    if (srvName || srvId !== null) {
      const initialSrv = {
        id: srvId !== null && srvId !== undefined ? Number(srvId) : `unresolved:${String(srvName)}`,
        name: srvName || 'Dịch vụ đã chọn',
        price: booking.servicePrice || booking.price || 0,
        duration: 90,
      };
      setSelectedService(initialSrv);
      setServices([initialSrv]);
    } else {
      setSelectedService(null);
      setServices([]);
    }

    void actions.fetchServices(srvId, srvName);
    setSelectedCN(resolveInitialStore(booking));
    actions.setBookingDate(bDate);
    const savedNoteDraft = readSessionDraft<string>(booking?.id ? `mos_reschedule_note_draft:${booking.id}` : null);
    setBookingNoteState(savedNoteDraft !== null ? savedNoteDraft : booking.bookingNote || booking.note || '');
    actions.setSelectedSlot(extractInitialSlotTime(booking, rawDate, bDate));

    const dateStr = bDate.format('YYYY-MM-DD');
    actions.setLoadingStaff(true);
    apiClient.customers
      .getStaff({ date: dateStr })
      .then((staff) => {
        const list = staff || [];
        actions.setStaffList(list);
        if (booking.technicianId) {
          const found = list.find((s: SafeAny) => Number(s.id) === Number(booking.technicianId));
          const cvToUse = found
            ? {
                ...found,
                offDays:
                  booking.technicianOffDays &&
                  Array.isArray(booking.technicianOffDays) &&
                  booking.technicianOffDays.length > 0
                    ? booking.technicianOffDays
                    : found.offDays && Array.isArray(found.offDays) && found.offDays.length > 0
                      ? found.offDays
                      : ['2'],
              }
            : {
                id: booking.technicianId,
                displayName: booking.technicianName || 'Trancy',
                offDays: booking.technicianOffDays || ['2'],
              };
          setSelectedCV(cvToUse);

          if (isStaffOffOnDate(cvToUse, bDate) || booking.isOffDayDrop) {
            actions.checkAndHandleOffDay(cvToUse, bDate);
          }
        }
      })
      .catch((err) => console.error('[Reschedule] Fetch staff failed:', err))
      .finally(() => actions.setLoadingStaff(false));

    if (booking.id) {
      apiClient.customers
        .getBookingPromotionOptions(Number(booking.id))
        .then((promotionData) => {
          setPromotionOptions(promotionData);
          if (promotionData?.mode === 'CUSTOM_CAMPAIGN' && promotionData.selectedCampaignPromotionId) {
            setSelectedPromotionSelection(`CUSTOM_CAMPAIGN:${promotionData.selectedCampaignPromotionId}`);
          } else if (promotionData?.selectedPromotionId) {
            setSelectedPromotionSelection(`STANDARD:${promotionData.selectedPromotionId}`);
          } else {
            setSelectedPromotionSelection(undefined);
          }
        })
        .catch(() => setPromotionOptions(null));
    }

    actions.fetchBookingTemplates().then((tpls) => {
      actions.autoSelectTemplate(tpls);
    });
  }, [open, booking]);

  // Fetch slot matrix when dependencies change
  useEffect(() => {
    if (open && selectedCN) {
      void lifecycleActionsRef.current.fetchSlots();
    }
  }, [selectedCN, bookingDate, selectedCV, open]);

  // Re-fetch staff directory when booking date changes
  useEffect(() => {
    if (open && bookingDate) {
      void lifecycleActionsRef.current.fetchStaff(bookingDate.format('YYYY-MM-DD'));
    }
  }, [bookingDate, open]);

  const handleSelectSlot = useCallback(
    (slot: string | null) => {
      if (!slot) {
        setSelectedSlot(null);
        return;
      }
      if (slot === '20:00' && selectedSlot !== '20:00' && pendingSlot !== '20:00') {
        setPendingSlot(slot);
        setIsLateSlotModalOpen(true);
        return;
      }
      setSelectedSlot(slot);
    },
    [selectedSlot, pendingSlot, setSelectedSlot]
  );

  const selectCVOption = useCallback(
    (cv: SafeAny) => {
      setSelectedCV(cv);
      if (cv && cv.notes) {
        const matchedStore = STORES.find((s) => s.name === cv.notes) || STORES[0];
        setSelectedCN(matchedStore);
      }
      const rawTargetDate = booking?.targetBookingDate || booking?.target_booking_date || booking?.bookingDateStart;
      const targetDateToCheck = rawTargetDate ? dayjs(rawTargetDate) : bookingDate;

      if (cv && (isStaffOffOnDate(cv, targetDateToCheck) || (booking && booking.isOffDayDrop))) {
        checkAndHandleOffDay(cv, targetDateToCheck);
      } else {
        setIsOffDayWarningOpen(false);
      }
    },
    [booking, bookingDate, checkAndHandleOffDay]
  );

  const handleReschedule = useCallback(async () => {
    if (!selectedCN) {
      message.error('Vui lòng chọn chi nhánh');
      return;
    }
    if (!selectedSlot) {
      message.error('Vui lòng chọn khung giờ hẹn');
      return;
    }

    setSubmitting(true);
    try {
      const parsedServiceId = Number(selectedService?.id);

      const promotionSelection = typeof selectedPromotionSelection === 'string' ? selectedPromotionSelection : null;
      const selectedPromotionId = promotionSelection?.startsWith('STANDARD:')
        ? Number(promotionSelection.replace('STANDARD:', ''))
        : null;
      const selectedCampaignPromotionId = promotionSelection?.startsWith('CUSTOM_CAMPAIGN:')
        ? Number(promotionSelection.replace('CUSTOM_CAMPAIGN:', ''))
        : null;

      const hasPromotionSelection = promotionOptions !== null;
      const promotionFields = hasPromotionSelection
        ? { promotionId: selectedPromotionId, campaignPromotionId: selectedCampaignPromotionId }
        : {
            ...(selectedPromotionId ? { promotionId: selectedPromotionId } : {}),
            ...(selectedCampaignPromotionId ? { campaignPromotionId: selectedCampaignPromotionId } : {}),
          };

      const payload: UpdateBookingRequest = {
        storeId: selectedCN.id,
        technicianId: selectedCV?.id || null,
        bookingDate: bookingDate.format('YYYY-MM-DD'),
        bookingTime: selectedSlot,
        bookingNote: checkAndAppendLowerLashNote(bookingNote, comboBalances),
        ...(Number.isInteger(parsedServiceId) && parsedServiceId >= 0 ? { serviceId: parsedServiceId } : {}),
        ...promotionFields,
        reasonCategory: 'Đổi lịch & Cập nhật thông tin đơn hàng',
        reasonNote: 'Cập nhật từ mOS CRM',
      };

      await apiClient.customers.updateBooking(booking.id, payload);
      clearSessionDraft(rescheduleDraftKey);
      message.success('Đổi lịch và cập nhật lịch hẹn thành công!');
      notifyBookingMutation(
        {
          action: 'rescheduled',
          customerId: toBookingCustomerId(booking?.customerId || booking?.customer?.id),
        },
        { refreshCallLog: true }
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error('[Reschedule] Submit failed:', err);
      const apiError = (err as SafeAny).response;
      const errorMessage = apiError?.data?.message || 'Có lỗi xảy ra khi đổi lịch và cập nhật.';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedCN,
    selectedSlot,
    selectedService,
    selectedPromotionSelection,
    promotionOptions,
    selectedCV,
    bookingDate,
    bookingNote,
    comboBalances,
    booking,
    rescheduleDraftKey,
    onSuccess,
    onClose,
  ]);

  const favoriteKTVs = getFavoriteKTVs();
  const visiblePromotionOptions = (promotionOptions?.promotions || []).filter(
    (promotion) =>
      promotion.promotionType !== 'FIXED_FINAL_PRICE' ||
      Boolean(selectedService?.id && (promotion.eligibleServiceIds || []).includes(Number(selectedService.id)))
  );

  return {
    submitting,
    submitError,
    setSubmitError,
    selectedCN,
    setSelectedCN,
    selectedCV,
    setSelectedCV,
    bookingNote,
    setBookingNote,
    services,
    selectedService,
    setSelectedService,
    selectedPromotionSelection,
    setSelectedPromotionSelection,
    visiblePromotionOptions,
    favoriteTechs,
    suggestedServices,
    suggestedBranch,
    staffList,
    loadingStaff,
    favoriteKTVs,
    bookingDate,
    setBookingDate,
    selectedSlot,
    setSelectedSlot,
    slotMatrix,
    loadingSlots,
    morning,
    afternoon,
    night,
    isLateSlotModalOpen,
    setIsLateSlotModalOpen,
    pendingSlot,
    setPendingSlot,
    isOffDayWarningOpen,
    setIsOffDayWarningOpen,
    offDayStaffInfo,
    checkAndHandleOffDay,
    handleSelectSlot,
    selectCVOption,
    handleReschedule,
    templates,
  };
}
