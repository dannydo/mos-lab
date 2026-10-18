'use client';
// Mandatory Customer Phone Number Display Enforced

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Select, Input, theme, message, Card, Tag } from 'antd';
import {
  HomeOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  CopyOutlined,
  SaveOutlined,
  CheckOutlined,
  SettingOutlined,
  UserOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api-client';
import {
  vietnameseSearchFilter,
  BookingConfirmationTemplate,
  DEFAULT_BOOKING_TEMPLATES,
  BOOKING_TEMPLATE_TAGS,
  BookingPromotionOptionsResponse,
  SafeAny,
  UpdateBookingRequest,
} from '@mos-lab/shared';
import { CvDatePicker } from './booking/CvDatePicker';

// Shared modules
import { STORES, getStoreFullAddress, isStaffOffOnDate, formatOrGenerateCustomerPhone } from './booking/constants';
import { checkAndAppendLowerLashNote, getRelativeDateInfo } from './booking/comboUtils';
import { useBookingStaff } from './booking/useBookingStaff';
import { useSlotMatrix } from './booking/useSlotMatrix';
import { useCustomerInsights } from './booking/useCustomerInsights';
import { SlotMatrixGrid } from './booking/SlotMatrixGrid';
import { BookingTemplateManagerModal } from './booking/BookingTemplateManagerModal';
import { AdaptiveDrawer, AdaptiveModal } from './ui/AdaptiveOverlay';
import { CopyPhoneButton } from './ui';
import CalendarRescheduleIcon from './icons/CalendarRescheduleIcon';
import { useResponsiveTier } from '../hooks/useResponsiveTier';
import { notifyBookingMutation, toBookingCustomerId } from '../lib/booking-events';

const { TextArea } = Input;

interface RescheduleBookingModalProps {
  open: boolean;
  booking: SafeAny; // Contains id, bookingDate, bookingTime, branchName, technicianName, technicianId, bookingNote
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleBookingModal: React.FC<RescheduleBookingModalProps> = ({
  open,
  booking,
  onClose,
  onSuccess,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const responsiveTier = useResponsiveTier();
  const isCompact = responsiveTier === 'mobile' || responsiveTier === 'tablet';

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form Fields State
  const [selectedCN, setSelectedCN] = useState<SafeAny>(null); // Branch/Store
  const [selectedCV, setSelectedCV] = useState<SafeAny>(null); // Technician/CV
  const [bookingNote, setBookingNote] = useState('');

  // Dropdown data options
  const [services, setServices] = useState<SafeAny[]>([]);
  const [selectedService, setSelectedService] = useState<SafeAny>(null);

  // Promotion options
  const [promotionOptions, setPromotionOptions] = useState<BookingPromotionOptionsResponse | null>(null);
  const [selectedPromotionSelection, setSelectedPromotionSelection] = useState<string | undefined>(undefined);

  // Toggle for optional SMS message section
  const [showTemplateSection, setShowTemplateSection] = useState<boolean>(false);

  // Re-use Customer details hook (simulating a selected customer)
  const selectedCustomer = booking?.customerId ? { id: booking.customerId } : null;
  const { favoriteTechs, comboBalances, suggestedServices, suggestedBranch, customerLastVisit } = useCustomerInsights(
    selectedCustomer,
    selectedCN,
    setSelectedCN
  );

  // Re-use Booking Staff hook
  const { staffList, loadingStaff, fetchStaff, getFavoriteKTVs, setStaffList, setLoadingStaff } =
    useBookingStaff(null, favoriteTechs);

  // Re-use Slot Matrix hook
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

  // 20:00 Late Slot Policy Confirmation Modal States
  const [isLateSlotModalOpen, setIsLateSlotModalOpen] = useState<boolean>(false);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);

  // Off-day Warning Modal States
  const [isOffDayWarningOpen, setIsOffDayWarningOpen] = useState<boolean>(
    () => !!(booking && (booking.isOffDayDrop || booking.technicianOffDays?.includes('2')))
  );
  const [offDayStaffInfo, setOffDayStaffInfo] = useState<{
    staffName: string;
    dateStr: string;
    nextWorkingDate?: dayjs.Dayjs;
  } | null>(null);

  const checkAndHandleOffDay = useCallback(
    (cvItem: SafeAny, targetDate: dayjs.Dayjs) => {
      if (!cvItem || !targetDate) return false;
      const isOff = isStaffOffOnDate(cvItem, targetDate);
      if (isOff || (booking && booking.isOffDayDrop)) {
        let nextDate = targetDate.clone().add(1, 'day');
        for (let i = 0; i < 7; i++) {
          if (!isStaffOffOnDate(cvItem, nextDate)) break;
          nextDate = nextDate.add(1, 'day');
        }

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

  // Message Template States
  const [bookingTemplates, setBookingTemplates] = useState<BookingConfirmationTemplate[]>(DEFAULT_BOOKING_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl_booking_no_tech');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState<boolean>(false);

  // Helper for Vietnamese Day of Week without accent
  const getDayOfWeekNoAccent = useCallback((date: SafeAny): string => {
    if (!date) return 'Chu Nhat';
    const d = typeof date.format === 'function' ? date : dayjs(date);
    const dayNum = d.day();
    const map: { [key: number]: string } = {
      0: 'Chu Nhat',
      1: 'Thu Hai',
      2: 'Thu Ba',
      3: 'Thu Tu',
      4: 'Thu Nam',
      5: 'Thu Sau',
      6: 'Thu Bay',
    };
    return map[dayNum] || 'Chu Nhat';
  }, []);

  // Helper for Cycle Days ({chu_ky_ngay})
  const getCycleDays = useCallback(
    (targetDate: SafeAny, customer: SafeAny, fallbackLastVisit?: string | null): number => {
      const lastVisit =
        customer?.lastVisit || customer?.last_order_booking || customer?.lastOrderBooking || fallbackLastVisit;
      if (!lastVisit) return 0;
      const tDate = typeof targetDate?.format === 'function' ? targetDate : dayjs(targetDate);
      const lDate = dayjs(lastVisit);
      if (!tDate.isValid() || !lDate.isValid()) return 0;
      const diff = tDate.diff(lDate, 'day');
      return diff > 0 ? diff : 0;
    },
    []
  );

  // Helper to evaluate tags in template
  const evaluateBookingTemplate = useCallback(
    (templateContent: string): string => {
      if (!templateContent) return '';
      const customerName = booking?.customerName || booking?.customer?.name || 'Khách hàng';
      const branchName = getStoreFullAddress(selectedCN);
      const slotTime = selectedSlot || '1:30 PM';
      const dayOfWeek = getDayOfWeekNoAccent(bookingDate);
      const formattedDate = bookingDate
        ? typeof bookingDate.format === 'function'
          ? bookingDate.format('DD/MM/YYYY')
          : dayjs(bookingDate).format('DD/MM/YYYY')
        : dayjs().format('DD/MM/YYYY');
      const techName = selectedCV?.displayName || 'Chuyên viên';
      const cycleDays = getCycleDays(bookingDate, selectedCustomer, customerLastVisit);

      let evaluated = templateContent
        .replace(/\{ten_khach\}/g, customerName)
        .replace(/\{chi_nhanh\}/g, branchName)
        .replace(/\{gio_hen\}/g, slotTime)
        .replace(/\{thu_ngay\}/g, dayOfWeek)
        .replace(/\{ngay_thang_nam\}/g, formattedDate)
        .replace(/\{ten_chuyen_vien\}/g, techName)
        .replace(/\{chu_ky_ngay\}/g, String(cycleDays));

      if (offDayStaffInfo?.staffName && offDayStaffInfo?.dateStr) {
        evaluated += `\n\n(Lưu ý: CV ${offDayStaffInfo.staffName} có lịch nghỉ tuần vào ngày ${offDayStaffInfo.dateStr}, tiệm đã sắp xếp Chuyên viên hỗ trợ phục vụ chị chu đáo nhất ạ)`;
      }

      return evaluated;
    },
    [
      booking,
      selectedCN,
      selectedSlot,
      bookingDate,
      selectedCV,
      selectedCustomer,
      customerLastVisit,
      getDayOfWeekNoAccent,
      getCycleDays,
      offDayStaffInfo,
    ]
  );

  // Helper to auto select template based on priority rule: 20:00 slot > Has Tech > No Tech
  const autoSelectTemplate = useCallback(
    (templatesList: BookingConfirmationTemplate[]) => {
      const isLateSlot = selectedSlot && (selectedSlot.includes('20:00') || selectedSlot === '20:00');
      const hasTech = selectedCV !== null && selectedCV !== undefined;

      let target: BookingConfirmationTemplate | undefined;
      if (isLateSlot && hasTech) {
        target = templatesList.find(
          (t) => t.type === 'has_tech_late_slot' || t.id === 'tpl_booking_has_tech_late_slot'
        );
      } else if (isLateSlot) {
        target = templatesList.find((t) => t.type === 'late_slot' || t.id === 'tpl_booking_late_slot');
      } else if (hasTech) {
        target = templatesList.find((t) => t.type === 'has_tech' || t.id === 'tpl_booking_has_tech');
      } else {
        target = templatesList.find((t) => t.type === 'no_tech' || t.id === 'tpl_booking_no_tech');
      }

      if (!target && templatesList.length > 0) {
        target = templatesList[0];
      }

      if (target) {
        setSelectedTemplateId(target.id);
        setCustomMessage(target.content);
      }
    },
    [selectedSlot, selectedCV]
  );

  // Fetch templates from API
  const fetchBookingTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const list = await apiClient.sms.getBookingTemplates();
      if (Array.isArray(list) && list.length > 0) {
        setBookingTemplates(list);
        return list;
      }
    } catch (err) {
      console.error('Failed to fetch booking templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
    return DEFAULT_BOOKING_TEMPLATES;
  }, []);

  const handleCopyMessage = () => {
    const text = evaluateBookingTemplate(customMessage);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      message.success('Đã sao chép tin nhắn xác nhận vào bộ nhớ tạm!');
    } else {
      message.error('Trình duyệt không hỗ trợ tự động sao chép.');
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplateId || !customMessage.trim()) return;
    setSavingTemplate(true);
    try {
      const currentTpl = bookingTemplates.find((t) => t.id === selectedTemplateId);
      const res = await apiClient.sms.saveBookingTemplate({
        id: selectedTemplateId,
        type: currentTpl?.type || 'no_tech',
        title: currentTpl?.title || 'Mẫu dời lịch',
        content: customMessage,
        isDefault: true,
      });
      if (res.success && res.templates) {
        setBookingTemplates(res.templates);
        message.success('Đã lưu mẫu tin nhắn thành công vào CSDL hệ thống!');
      }
    } catch (err) {
      console.error('Failed to save template:', err);
      message.error('Không thể lưu mẫu tin nhắn.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSelectSlot = (slot: string | null) => {
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
  };

  // Extract existing service ID or Name helper from booking object
  const getBookingServiceInfo = (bookingObj: SafeAny) => {
    if (!bookingObj) return { id: null, name: null };
    const name =
      bookingObj.serviceName ||
      bookingObj.service_name ||
      bookingObj.packageName ||
      bookingObj.package_name ||
      (typeof bookingObj.service === 'string' ? bookingObj.service : bookingObj.service?.name) ||
      (Array.isArray(bookingObj.services) && bookingObj.services.length > 0
        ? typeof bookingObj.services[0] === 'string'
          ? bookingObj.services[0]
          : bookingObj.services[0]?.name || bookingObj.services[0]?.serviceName
        : null) ||
      null;
    const rawId = bookingObj.serviceId ?? bookingObj.service_id ?? null;
    const isVirtualAnyLashes = typeof name === 'string' && /\bany\s*[-/]?\s*lashes\b/i.test(name);
    const id = rawId ?? (isVirtualAnyLashes ? 0 : null);
    return { id, name };
  };

  // Load Services & preserve existing booking service
  const fetchServices = async (targetId: SafeAny, targetName: SafeAny) => {
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
  };

  // Initialize fields on open
  useEffect(() => {
    if (open && booking) {
      setIsLateSlotModalOpen(false);

      const targetDateStr = booking.targetBookingDate || booking.target_booking_date;
      const targetTimeStr = booking.targetBookingTime || booking.target_booking_time;

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
        let nextDate = bDate.clone().add(1, 'day');
        for (let i = 0; i < 7; i++) {
          if (!initialCV || !isStaffOffOnDate(initialCV, nextDate)) break;
          nextDate = nextDate.add(1, 'day');
        }
        setOffDayStaffInfo({
          staffName: initialCV?.displayName || booking.technicianName || 'Trancy',
          dateStr: bDate.format('DD/MM/YYYY'),
          nextWorkingDate: nextDate,
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

      fetchServices(srvId, srvName);

      // Map branch name to store object
      const matchedStore =
        STORES.find((s) => s.name === booking.branchName || booking.branchName?.includes(s.name)) || STORES[0];
      setSelectedCN(matchedStore);

      // Set date & note & slot
      setBookingDate(bDate);
      setBookingNote(booking.bookingNote || booking.note || '');

      let rawTime =
        targetTimeStr ||
        booking.bookingTime ||
        booking.time ||
        (rawDate && String(rawDate).includes(' ') ? String(rawDate).split(' ')[1] : null);

      if (rawTime && rawTime.includes(':')) {
        const parts = rawTime.split(':');
        rawTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
      setSelectedSlot(rawTime || null);

      // Fetch staff directory
      const dateStr = bDate.format('YYYY-MM-DD');

      setLoadingStaff(true);
      apiClient.customers
        .getStaff({ date: dateStr })
        .then((staff) => {
          const list = staff || [];
          setStaffList(list);
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
              checkAndHandleOffDay(cvToUse, bDate);
            }
          }
        })
        .catch((err) => console.error('[Reschedule] Fetch staff failed:', err))
        .finally(() => setLoadingStaff(false));

      // Fetch promotions for parity with update modal
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

      // Fetch templates
      fetchBookingTemplates().then((tpls) => {
        autoSelectTemplate(tpls);
      });
    }
  }, [open, booking]);

  // Fetch slot matrix when dependencies change
  useEffect(() => {
    if (open && selectedCN) {
      fetchSlots();
    }
  }, [selectedCN, bookingDate, selectedCV, open]);

  // Re-fetch staff directory when booking date changes
  useEffect(() => {
    if (open && bookingDate) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
    }
  }, [bookingDate, open]);

  // Update template message when slot or staff changes
  useEffect(() => {
    if (open && bookingTemplates.length > 0) {
      autoSelectTemplate(bookingTemplates);
    }
  }, [selectedSlot, selectedCV, open, bookingTemplates, autoSelectTemplate]);

  const selectCVOption = (cv: SafeAny) => {
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
  };

  const handleReschedule = async () => {
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

      const payload: UpdateBookingRequest = {
        storeId: selectedCN.id,
        technicianId: selectedCV?.id || null,
        bookingDate: bookingDate.format('YYYY-MM-DD'),
        bookingTime: selectedSlot,
        bookingNote: checkAndAppendLowerLashNote(bookingNote, comboBalances),
        ...(Number.isInteger(parsedServiceId) && parsedServiceId >= 0 ? { serviceId: parsedServiceId } : {}),
        ...(selectedPromotionId ? { promotionId: selectedPromotionId } : {}),
        ...(selectedCampaignPromotionId ? { campaignPromotionId: selectedCampaignPromotionId } : {}),
        reasonCategory: 'Đổi lịch & Cập nhật thông tin đơn hàng',
        reasonNote: 'Cập nhật từ mOS CRM',
      };

      await apiClient.customers.updateBooking(booking.id, payload);
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
  };

  const favoriteKTVs = getFavoriteKTVs();
  const visiblePromotionOptions = (promotionOptions?.promotions || []).filter(
    (promotion) =>
      promotion.promotionType !== 'FIXED_FINAL_PRICE' ||
      Boolean(selectedService?.id && (promotion.eligibleServiceIds || []).includes(Number(selectedService.id)))
  );

  return (
    <AdaptiveDrawer
      intent="form"
      className="booking-reschedule-overlay"
      width={isCompact ? '100%' : 720}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#D4A84B' }}>
          <CalendarRescheduleIcon fontSize={18} />
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>ĐỔI LỊCH & CẬP NHẬT LỊCH HẸN</span>
          {booking?.orderKey && (
            <Tag color="gold" style={{ fontWeight: 600, margin: 0 }} className="tabular-nums">
              #{booking.orderKey}
            </Tag>
          )}
          <span
            id="off-day-modal-debug-tag"
            data-is-open={String(isOffDayWarningOpen)}
            data-staff={offDayStaffInfo?.staffName}
          />
        </div>
      }
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{
        body: {
          padding: isCompact ? '16px' : '20px 24px',
          background: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
        },
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <Button onClick={onClose}>
            Đóng
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyMessage}
              style={{ color: '#D4A84B', borderColor: '#D4A84B' }}
            >
              Sao chép tin nhắn
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={submitting}
              onClick={handleReschedule}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 'bold' }}
            >
              Hoàn tất & Lưu
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Customer Information (Read-only Card) */}
        <Card
          size="small"
          style={{
            backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
            borderColor: themeMode === 'dark' ? '#334155' : '#e2e8f0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: token.colorText }} className="flex items-center gap-1.5">
              <span style={{ color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>Khách hàng:</span>
              <strong style={{ fontSize: '14px' }}>{booking?.customerName || 'Khách hàng'}</strong>
              <span>-</span>
              <span style={{ fontWeight: 600 }}>{formatOrGenerateCustomerPhone(booking)}</span>
              <CopyPhoneButton phone={formatOrGenerateCustomerPhone(booking)} size="xs" />
            </div>
            {bookingDate && (
              <div style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                Lịch hiện tại: <strong className="tabular-nums">{bookingDate.format('DD/MM/YYYY')} {selectedSlot || ''}</strong> ({selectedCN?.name || booking?.branchName || ''})
              </div>
            )}
          </div>
        </Card>

        {/* Interactive Off-Day Warning Banner */}
        {isOffDayWarningOpen && (
          <div
            id="off-day-warning-banner"
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              backgroundColor: themeMode === 'dark' ? 'rgba(250, 84, 28, 0.15)' : '#fff2e8',
              border: `1px solid ${themeMode === 'dark' ? '#ff7a45' : '#ffbb96'}`,
              color: themeMode === 'dark' ? '#ff7a45' : '#d4380d',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
                marginBottom: '6px',
                color: '#fa541c',
              }}
            >
              <ExclamationCircleOutlined style={{ fontSize: '16px' }} />
              <span>⚠️ CẢNH BÁO LỊCH NGHỈ TUẦN CHUYÊN VIÊN</span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px', lineHeight: '1.5' }}>
              Lịch hẹn dời sang ngày <strong>{offDayStaffInfo?.dateStr || bookingDate.format('DD/MM/YYYY')}</strong> trùng với ngày nghỉ tuần
              (<code>Off</code>) của{' '}
              <strong style={{ color: '#fa541c' }}>
                {offDayStaffInfo?.staffName || selectedCV?.displayName || 'Chuyên viên'}
              </strong>
              .
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <Button
                size="small"
                onClick={() => {
                  const targetNext = offDayStaffInfo?.nextWorkingDate || bookingDate.clone().add(1, 'day');
                  setBookingDate(targetNext);
                  message.info(
                    `Đã đổi lịch sang ngày ${targetNext.format('DD/MM/YYYY')} (${
                      offDayStaffInfo?.staffName || selectedCV?.displayName || 'Chuyên viên'
                    } đi làm)`
                  );
                  setIsOffDayWarningOpen(false);
                }}
              >
                Dời sang ngày{' '}
                {offDayStaffInfo?.nextWorkingDate && dayjs.isDayjs(offDayStaffInfo.nextWorkingDate)
                  ? offDayStaffInfo.nextWorkingDate.format('DD/MM')
                  : bookingDate.clone().add(1, 'day').format('DD/MM')}{' '}
                ({offDayStaffInfo?.staffName || selectedCV?.displayName || 'Chuyên viên'} đi làm)
              </Button>
              <Button
                size="small"
                type="primary"
                style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B' }}
                onClick={() => {
                  setSelectedCV(null);
                  setIsOffDayWarningOpen(false);
                  message.info(
                    `Đã chuyển đơn sang Chuyên viên Tự Do do CV ${
                      offDayStaffInfo?.staffName || selectedCV?.displayName || 'Chuyên viên'
                    } nghỉ tuần`
                  );
                }}
              >
                Chuyển thành CV Tự Do
              </Button>
            </div>
          </div>
        )}

        {/* SECTION 1: CHI NHÁNH & CHUYÊN VIÊN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Store selection */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
              <HomeOutlined /> CHI NHÁNH ĐẶT LỊCH (CN)
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {STORES.map((s) => {
                const isSelected = selectedCN?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedCN(s)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      background: isSelected ? '#D4A84B' : themeMode === 'dark' ? '#1e293b' : '#f3f4f6',
                      border: `1px solid ${isSelected ? '#D4A84B' : themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                      color: isSelected ? '#fff' : themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{s.name}</span>
                    {suggestedBranch?.id === s.id && (
                      <Tag
                        color={isSelected ? 'magenta' : 'orange'}
                        style={{
                          marginLeft: '6px',
                          marginRight: 0,
                          fontSize: '10px',
                          padding: '0 6px',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                        }}
                      >
                        💖 Hay đi
                      </Tag>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technician Selection */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
              <UserOutlined /> CHUYÊN VIÊN THỰC HIỆN (CV)
            </h4>
            <Select
              showSearch
              filterOption={vietnameseSearchFilter}
              style={{ width: '100%' }}
              loading={loadingStaff}
              placeholder="Chọn chuyên viên (hoặc Chuyên viên tự do)..."
              value={selectedCV ? selectedCV.id : 0}
              onChange={(val) => {
                if (!val || val === 0) {
                  setSelectedCV(null);
                  setIsOffDayWarningOpen(false);
                } else {
                  const found = (staffList || []).find((s: SafeAny) => Number(s.id) === Number(val));
                  if (found) {
                    selectCVOption(found);
                  }
                }
              }}
              options={[
                {
                  value: 0,
                  label: '✨ Không chỉ định chuyên viên (Chuyên viên Tự Do)',
                },
                ...(staffList || []).map((st: SafeAny) => {
                  const isFav = favoriteTechs.some(
                    (ft) => ft.toLowerCase() === (st.displayName || st.name || '').toLowerCase()
                  );
                  const isOff = isStaffOffOnDate(st, bookingDate);
                  return {
                    value: st.id,
                    label: `${st.displayName || st.name}${st.notes ? ` (${st.notes})` : ''}${isOff ? ' ⚠️ [Nghỉ ngày này]' : ''}${isFav ? ' 💖 [Hay đi]' : ''}`,
                  };
                }),
              ]}
            />

            {/* Favorite Stylist Suggestion Chips */}
            {favoriteKTVs.length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ color: '#D4A84B', fontWeight: 'bold' }}>💖 Chuyên viên khách hay đi:</span>
                {favoriteKTVs.map((ktv: SafeAny) => (
                  <Tag
                    key={ktv.id}
                    color={selectedCV?.id === ktv.id ? 'gold' : 'default'}
                    style={{ cursor: 'pointer', margin: 0 }}
                    onClick={() => selectCVOption(ktv)}
                  >
                    {ktv.displayName || ktv.name}
                  </Tag>
                ))}
              </div>
            )}
            {selectedCV && (
              <div style={{ fontSize: '12px', color: '#fa8c16', marginTop: '4px' }}>
                * Đang chỉ định <strong>{selectedCV.displayName || selectedCV.name}</strong>.
              </div>
            )}
          </div>

          {/* Service Selector */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
              <InboxOutlined /> DỊCH VỤ (SERVICE)
            </h4>
            <Select
              showSearch
              filterOption={vietnameseSearchFilter}
              style={{ width: '100%' }}
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
              placeholder="Chọn hoặc tìm dịch vụ..."
              value={selectedService?.id}
              onChange={(val) => {
                const srv = services.find((s) => s.id === val);
                setSelectedService(srv);
              }}
              options={services.map((s) => ({
                value: s.id,
                label:
                  s.id === 0
                    ? `${s.name} (${s.duration} phút)`
                    : `${s.name} - ${s.price.toLocaleString('vi-VN')}đ (${s.duration} phút)`,
              }))}
            />

            {/* Favorite Service Suggestion */}
            {suggestedServices.filter((sName) =>
              services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
            ).length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '12px' }}>
                <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>⭐ Dòng mi khách hay đi nhất: </span>
                {suggestedServices
                  .filter((sName) =>
                    services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
                  )
                  .map((sName) => (
                    <span
                      key={sName}
                      style={{
                        color: themeMode === 'dark' ? '#ffa940' : '#d87a16',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginLeft: '4px',
                      }}
                      onClick={() => {
                        const matchedSrv = services.find((s) => s.name.toLowerCase() === sName.toLowerCase());
                        if (matchedSrv) {
                          setSelectedService(matchedSrv);
                          message.success(`Đã chọn dòng mi hay dùng: ${matchedSrv.name}`);
                        }
                      }}
                    >
                      {sName}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Promotion Options (if applicable) */}
          {visiblePromotionOptions.length > 0 && (
            <div>
              <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
                <GiftOutlined /> CHƯƠNG TRÌNH KHUYẾN MÃI
              </h4>
              <Select
                placeholder="Chọn chương trình khuyến mãi (hoặc để trống)..."
                allowClear
                style={{ width: '100%' }}
                value={selectedPromotionSelection}
                onChange={(val) => setSelectedPromotionSelection(val)}
                options={visiblePromotionOptions.map((promotion) => ({
                  value: `${promotion.source}:${promotion.id}`,
                  label: promotion.label || promotion.name,
                }))}
              />
            </div>
          )}

          <div style={{ height: '1px', background: themeMode === 'dark' ? '#334155' : '#e5e7eb', margin: '4px 0' }} />

          {/* Date & Slot select matrix */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>Ngày đặt:</span>
                <CvDatePicker
                  key={`${selectedCV ? selectedCV.id : 'no-cv'}-${(staffList || []).length}`}
                  style={{ marginLeft: '8px' }}
                  value={bookingDate}
                  onChange={(val) => {
                    if (val) {
                      setBookingDate(val);
                      if (selectedCV && isStaffOffOnDate(selectedCV, val)) {
                        checkAndHandleOffDay(selectedCV, val);
                      }
                    }
                  }}
                  selectedCV={selectedCV}
                  staffList={staffList}
                  themeMode={themeMode}
                />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                {bookingDate.format('dddd (DD/MM/YYYY)')}
              </div>
            </div>

            <SlotMatrixGrid
              slotMatrix={slotMatrix}
              loadingSlots={loadingSlots}
              selectedSlot={selectedSlot}
              setSelectedSlot={handleSelectSlot}
              selectedCN={selectedCN}
              morning={morning}
              afternoon={afternoon}
              night={night}
              themeMode={themeMode}
              selectedCV={selectedCV}
            />
          </div>

          {/* Booking Note Section */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
              GHI CHÚ ĐẶT LỊCH (BOOKING NOTE / LƯU Ý KHÁCH HÀNG)
            </h4>
            <TextArea
              rows={3}
              placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt từ khách hàng (dáng mi, yêu cầu chuyên viên, tình trạng mắt...)..."
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
              style={{
                borderRadius: '8px',
                backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                color: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
                borderColor: themeMode === 'dark' ? '#334155' : '#cbd5e1',
              }}
            />
          </div>

          {/* Collapsible Message Template Section (Optional / Non-blocking) */}
          <div
            style={{
              borderRadius: '8px',
              border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
              overflow: 'hidden',
              backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
            }}
          >
            <div
              onClick={() => setShowTemplateSection(!showTemplateSection)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: themeMode === 'dark' ? '#1e293b' : '#f8fafc',
                borderBottom: showTemplateSection ? `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px', color: '#D4A84B' }}>
                <MessageOutlined />
                <span>MẪU TIN NHẮN XÁC NHẬN GỬI KHÁCH (TÙY CHỌN XEM / SAO CHÉP)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                  {showTemplateSection ? '▲ Thu gọn' : '▼ Mở rộng'}
                </span>
              </div>
            </div>

            {showTemplateSection && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Template selector */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '12.5px',
                        fontWeight: '600',
                        color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                      }}
                    >
                      MẪU TIN NHẮN HỆ THỐNG:
                    </label>
                    <Button
                      type="link"
                      size="small"
                      icon={<SettingOutlined />}
                      onClick={() => setIsManagerModalOpen(true)}
                      style={{ color: '#D4A84B', padding: 0 }}
                    >
                      ⚙️ Quản lý Mẫu
                    </Button>
                  </div>
                  <Select
                    style={{ width: '100%' }}
                    getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                    value={selectedTemplateId}
                    loading={loadingTemplates}
                    onChange={(val) => {
                      setSelectedTemplateId(val);
                      const chosen = bookingTemplates.find((t) => t.id === val);
                      if (chosen) setCustomMessage(chosen.content);
                    }}
                    options={bookingTemplates.map((t) => ({
                      label: t.title,
                      value: t.id,
                    }))}
                  />
                </div>

                {/* Variable Insert Tags */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                      marginBottom: '8px',
                    }}
                  >
                    CHÈN NHANH THẺ BIẾN ĐỘNG:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {BOOKING_TEMPLATE_TAGS.map((tagDef) => (
                      <Button
                        key={tagDef.tag}
                        size="small"
                        type="dashed"
                        onClick={() => setCustomMessage((prev) => prev + tagDef.tag)}
                        style={{
                          fontSize: '12px',
                          borderColor: themeMode === 'dark' ? '#334155' : '#cbd5e1',
                          color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
                        }}
                      >
                        + {tagDef.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Editable Custom Content */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                    }}
                  >
                    NỘI DUNG MẪU TÙY CHỈNH:
                  </label>
                  <TextArea
                    rows={4}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
                      color: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
                    }}
                  />
                </div>

                {/* Live Preview Box */}
                <div>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: '600',
                      color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      XEM TRƯỚC TIN NHẮN SẼ GỬI CHO{' '}
                      <strong style={{ color: '#D4A84B' }}>
                        {booking?.customerName || booking?.customer?.name || 'KHÁCH HÀNG'}
                      </strong>
                      :
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {evaluateBookingTemplate(customMessage).length} ký tự
                    </span>
                  </div>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
                      border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                      color: themeMode === 'dark' ? '#e2e8f0' : '#1e293b',
                      fontSize: '13px',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6',
                    }}
                  >
                    {evaluateBookingTemplate(customMessage)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button icon={<SaveOutlined />} loading={savingTemplate} onClick={handleSaveTemplate} size="small">
                    Lưu Template Mẫu
                  </Button>
                  <Button
                    type="primary"
                    icon={<CopyOutlined />}
                    onClick={handleCopyMessage}
                    size="small"
                    style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
                  >
                    Sao chép tin nhắn này
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Template Manager Modal */}
      <BookingTemplateManagerModal
        open={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        templates={bookingTemplates}
        onTemplatesUpdated={(newList) => {
          setBookingTemplates(newList);
          autoSelectTemplate(newList);
        }}
      />

      {/* 20:00 Late Slot Policy Confirmation Modal */}
      <AdaptiveModal
        intent="confirm"
        className="booking-late-slot-confirmation"
        open={isLateSlotModalOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fa8c16', fontSize: '15px' }}>
            <ExclamationCircleOutlined style={{ fontSize: '18px' }} />
            <span>⚠️ XÁC NHẬN THÔNG BÁO QUY ĐỊNH 20:15</span>
          </div>
        }
        onCancel={() => {
          setIsLateSlotModalOpen(false);
          setPendingSlot(null);
          message.warning('Vui lòng thông báo quy định 15 phút cho khách trước khi dời sang khung 20:00!');
        }}
        footer={[
          <Button
            key="no"
            danger
            onClick={() => {
              setIsLateSlotModalOpen(false);
              setPendingSlot(null);
              message.warning('Vui lòng thông báo quy định 15 phút cho khách trước khi dời sang khung 20:00!');
            }}
          >
            Chưa thông báo (Hủy chọn)
          </Button>,
          <Button
            key="yes"
            type="primary"
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            onClick={() => {
              if (pendingSlot) {
                setSelectedSlot(pendingSlot);
              }
              setIsLateSlotModalOpen(false);
              setPendingSlot(null);
              message.success('Đã xác nhận thông báo quy định 20:15 với khách!');
            }}
          >
            Đã thông báo với khách
          </Button>,
        ]}
      >
        <div
          style={{
            padding: '12px 4px',
            fontSize: '14px',
            lineHeight: '1.6',
            color: themeMode === 'dark' ? '#e2e8f0' : '#1e293b',
          }}
        >
          <p>
            Vì <strong>20:00</strong> là khung chốt ca cuối ngày, tiệm em chỉ giữ lịch và chờ khách tối đa 15 phút (đến{' '}
            <strong>20:15</strong>) để đảm bảo đủ thời gian làm mi đẹp nhất.
          </p>
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: themeMode === 'dark' ? 'rgba(250, 140, 22, 0.15)' : '#fffbe6',
              border: `1px solid ${themeMode === 'dark' ? '#d97706' : '#ffe58f'}`,
              color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
              fontWeight: '600',
            }}
          >
            Bạn đã thông báo quy định 20:15 này cho khách hàng chưa?
          </div>
        </div>
      </AdaptiveModal>

      <AdaptiveModal
        intent="confirm"
        className="booking-reschedule-error"
        open={Boolean(submitError)}
        zIndex={1500}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4d4f', fontSize: '16px' }}>
            <ExclamationCircleOutlined style={{ fontSize: '19px' }} />
            <span>Không thể dời lịch</span>
          </div>
        }
        onCancel={() => setSubmitError(null)}
        footer={
          <Button type="primary" danger onClick={() => setSubmitError(null)}>
            Đã hiểu
          </Button>
        }
      >
        <div
          style={{
            padding: '8px 0',
            color: themeMode === 'dark' ? '#e2e8f0' : '#1e293b',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
        >
          {submitError}
        </div>
      </AdaptiveModal>
    </AdaptiveDrawer>
  );
};

export default RescheduleBookingModal;
