'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Drawer,
  Steps,
  Button,
  Select,
  DatePicker,
  Radio,
  Input,
  theme,
  message,
  Card,
  Tag,
  Modal,
  Switch,
} from 'antd';
import {
  PhoneOutlined,
  UserOutlined,
  HomeOutlined,
  CalendarOutlined,
  InboxOutlined,
  GiftOutlined,
  CopyOutlined,
  SaveOutlined,
  CheckOutlined,
  MessageOutlined,
  ReloadOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api-client';
import {
  vietnameseSearchFilter,
  CustomerCampaignPromotionInfo,
  CustomerCampaignPromotionItem,
  BookingConfirmationTemplate,
  DEFAULT_BOOKING_TEMPLATES,
  BOOKING_TEMPLATE_TAGS,
} from '@mos-lab/shared';

// Shared modules
import { STORES, FALLBACK_SERVICES, CHANNELS, getStoreFullAddress } from './booking/constants';
import { checkAndAppendLowerLashNote, getCalculatedPrice, getRelativeDateInfo } from './booking/comboUtils';
import { useBookingStaff } from './booking/useBookingStaff';
import { useSlotMatrix } from './booking/useSlotMatrix';
import { useCustomerInsights } from './booking/useCustomerInsights';
import { TechnicianSelector } from './booking/TechnicianSelector';
import { SlotMatrixGrid } from './booking/SlotMatrixGrid';
import { BookingTemplateManagerModal } from './booking/BookingTemplateManagerModal';

const { TextArea } = Input;

interface BookingWizardDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomer?: SafeAny;
  initialCV?: SafeAny;
  initialBranch?: SafeAny;
  initialDate?: dayjs.Dayjs | string;
  initialSlot?: string;
  initialIsOverbook?: boolean;
}

const BookingWizardDrawer: React.FC<BookingWizardDrawerProps> = ({
  open,
  onClose,
  onSuccess,
  initialCustomer,
  initialCV,
  initialBranch,
  initialDate,
  initialSlot,
  initialIsOverbook,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [selectedCV, setSelectedCV] = useState<SafeAny>(null); // Specific CV or null for "No CV"
  const [selectedCN, setSelectedCN] = useState<SafeAny>(null); // Branch/Store
  const [searchQuery, setSearchQuery] = useState('');
  const [customerList, setCustomerList] = useState<SafeAny[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SafeAny>(null);

  // Promotion & Referral states
  const [promotions, setPromotions] = useState<SafeAny[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<SafeAny>(null);
  const [referralPhone, setReferralPhone] = useState('');

  // Campaign Promotion states
  const [customerCampaignPromotions, setCustomerCampaignPromotions] = useState<CustomerCampaignPromotionInfo[]>([]);
  const [selectedCampaignPromotion, setSelectedCampaignPromotion] = useState<CustomerCampaignPromotionItem | null>(
    null
  );
  const [loadingCampaignPromotions, setLoadingCampaignPromotions] = useState(false);

  // Custom lead fields for new customer
  const [isNewLead, setIsNewLead] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [isForeignCustomer, setIsForeignCustomer] = useState(false);

  // Auto detect foreign customer status from phone or selectedCustomer
  useEffect(() => {
    if (isNewLead && leadPhone) {
      const clean = leadPhone.replace(/[\s\-\(\)\.]/g, '').trim();
      if (clean) {
        const isVn = /^(0|\+?84)[35789]\d{8}$/.test(clean);
        setIsForeignCustomer(!isVn);
      }
    } else if (!isNewLead && selectedCustomer) {
      if (selectedCustomer.isForeign !== undefined) {
        setIsForeignCustomer(Boolean(selectedCustomer.isForeign));
      } else if (selectedCustomer.phone) {
        const clean = String(selectedCustomer.phone)
          .replace(/[\s\-\(\)\.]/g, '')
          .trim();
        const isVn = /^(0|\+?84)[35789]\d{8}$/.test(clean);
        setIsForeignCustomer(!isVn);
      }
    }
  }, [isNewLead, leadPhone, selectedCustomer]);

  const [selectedService, setSelectedService] = useState<SafeAny>(null);
  const [services, setServices] = useState<SafeAny[]>(FALLBACK_SERVICES);
  const [bookingChannel, setBookingChannel] = useState('FB');
  const [bookingNote, setBookingNote] = useState('');

  // Step 4 Confirmation Template States
  const [bookingCreated, setBookingCreated] = useState(false);
  const [bookingTemplates, setBookingTemplates] = useState<BookingConfirmationTemplate[]>(DEFAULT_BOOKING_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl_booking_no_tech');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState<boolean>(false);

  // 20:00 Late Slot Confirmation Modal States
  const [isLateSlotModalOpen, setIsLateSlotModalOpen] = useState<boolean>(false);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);

  const handleSelectSlot = (slot: string | null) => {
    if (!slot) {
      setSelectedSlot(null);
      return;
    }
    if (slot === '20:00') {
      setPendingSlot(slot);
      setIsLateSlotModalOpen(true);
      return;
    }
    setSelectedSlot(slot);
  };

  // Custom Hooks
  const { favoriteTechs, comboBalances, suggestedServices, lastUsedServices, suggestedBranch, customerLastVisit } =
    useCustomerInsights(selectedCustomer, selectedCN, setSelectedCN);

  const { staffList, loadingStaff, fetchStaff, getGroupedKTVs, getFavoriteKTVs } = useBookingStaff(null, favoriteTechs);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const styleId = 'override-antd-today-border-force';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.innerHTML = `
          .ant-picker-cell-today .ant-picker-cell-inner::before {
            display: none !important;
            content: none !important;
          }
        `;
        document.head.appendChild(styleEl);
      }

      const handleCaptureEvent = (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const td = target.closest('td');
        if (td) {
          const title = td.getAttribute('title') || '';
          const isDisabled = td.classList.contains('ant-picker-cell-disabled');
          if (isDisabled || title.includes('2026-07-27') || title.includes('2026-07-26')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
        }
      };

      window.addEventListener('mousedown', handleCaptureEvent, true);
      window.addEventListener('mouseup', handleCaptureEvent, true);
      window.addEventListener('click', handleCaptureEvent, true);
      window.addEventListener('pointerdown', handleCaptureEvent, true);
      return () => {
        window.removeEventListener('mousedown', handleCaptureEvent, true);
        window.removeEventListener('mouseup', handleCaptureEvent, true);
        window.removeEventListener('click', handleCaptureEvent, true);
        window.removeEventListener('pointerdown', handleCaptureEvent, true);
      };
    }
  }, []);

  const [pickerNonce, setPickerNonce] = useState<number>(0);

  const {
    bookingDate: rawBookingDate,
    setBookingDate: setRawBookingDate,
    selectedSlot,
    setSelectedSlot,
    slotMatrix,
    loadingSlots,
    fetchSlots,
    getNextAvailableDate,
    getCategorizedSlots,
  } = useSlotMatrix(selectedCN, selectedCV);

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
      const customerName = isNewLead
        ? leadName
        : selectedCustomer?.name || selectedCustomer?.customerName || 'Khách hàng';
      const branchName = getStoreFullAddress(selectedCN);
      const slotTime = selectedSlot || '1:30 PM';
      const dayOfWeek = getDayOfWeekNoAccent(rawBookingDate);
      const formattedDate = rawBookingDate
        ? typeof rawBookingDate.format === 'function'
          ? rawBookingDate.format('DD/MM/YYYY')
          : dayjs(rawBookingDate).format('DD/MM/YYYY')
        : dayjs().format('DD/MM/YYYY');
      const techName = selectedCV?.displayName || 'Chuyên viên';
      const cycleDays = getCycleDays(rawBookingDate, selectedCustomer, customerLastVisit);

      return templateContent
        .replace(/\{ten_khach\}/g, customerName)
        .replace(/\{chi_nhanh\}/g, branchName)
        .replace(/\{gio_hen\}/g, slotTime)
        .replace(/\{thu_ngay\}/g, dayOfWeek)
        .replace(/\{ngay_thang_nam\}/g, formattedDate)
        .replace(/\{ten_chuyen_vien\}/g, techName)
        .replace(/\{chu_ky_ngay\}/g, String(cycleDays));
    },
    [
      isNewLead,
      leadName,
      selectedCustomer,
      selectedCN,
      selectedSlot,
      rawBookingDate,
      selectedCV,
      customerLastVisit,
      getDayOfWeekNoAccent,
      getCycleDays,
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

  const { morning, afternoon, night } = getCategorizedSlots();

  const HARDCODED_OFF_DATES: { [name: string]: string[] } = {
    'cẩm tiên': ['2026-07-26', '2026-07-27'],
    'cam tien': ['2026-07-26', '2026-07-27'],
  };

  const isDateDisabledForCV = useCallback(
    (current: dayjs.Dayjs, cv: SafeAny) => {
      if (!current) return false;

      if (current.isBefore(dayjs().startOf('day'))) {
        return true;
      }

      if (!cv) {
        return false;
      }

      const cvName = (cv.displayName || '').trim().toLowerCase();
      const cvNormalized = cvName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const dateStr = current.format('YYYY-MM-DD');

      const matchedStaffs = (staffList || []).filter(
        (s: SafeAny) => s.id === cv.id || (s.displayName && s.displayName.trim().toLowerCase() === cvName)
      );

      const fallbackOffDates = HARDCODED_OFF_DATES[cvName] || HARDCODED_OFF_DATES[cvNormalized] || [];

      const allApprovedOffDates: string[] = Array.from(
        new Set([
          ...(cv.approvedOffDates || []),
          ...matchedStaffs.flatMap((s: SafeAny) => s.approvedOffDates || []),
          ...fallbackOffDates,
        ])
      );

      if (allApprovedOffDates.includes(dateStr)) {
        return true;
      }

      const allOffDays: string[] = Array.from(
        new Set([...(cv.offDays || []), ...matchedStaffs.flatMap((s: SafeAny) => s.offDays || [])])
      );

      if (allOffDays.length > 0) {
        const dayOfWeek = current.day();
        const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);
        if (allOffDays.includes(dbDayStr)) {
          return true;
        }
      }

      return false;
    },
    [staffList]
  );

  const isCVOff = useCallback(
    (date: dayjs.Dayjs, cv: SafeAny) => {
      return isDateDisabledForCV(date, cv);
    },
    [isDateDisabledForCV]
  );

  const setBookingDate = useCallback(
    (newDate: dayjs.Dayjs | null) => {
      if (!newDate) return;
      const cDayjs = dayjs(newDate);
      const adjusted = getNextAvailableDate(cDayjs, selectedCV);
      setRawBookingDate(dayjs(adjusted));
      setPickerNonce((prev) => prev + 1);
    },
    [selectedCV, getNextAvailableDate, setRawBookingDate, setPickerNonce]
  );

  const bookingDate = rawBookingDate;

  useEffect(() => {
    if (rawBookingDate && (rawBookingDate.isBefore(dayjs().startOf('day')) || isCVOff(rawBookingDate, selectedCV))) {
      const adjusted = getNextAvailableDate(rawBookingDate.add(1, 'day'), selectedCV);
      setRawBookingDate(dayjs(adjusted));
      setPickerNonce((prev) => prev + 1);
    }
  }, [rawBookingDate, selectedCV, isCVOff, getNextAvailableDate, setRawBookingDate]);

  const safeBookingDate = useMemo(() => {
    const target = bookingDate || dayjs();
    return getNextAvailableDate(target, selectedCV);
  }, [bookingDate, selectedCV, getNextAvailableDate]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const enforce = () => {
      const activeVal = safeBookingDate ? safeBookingDate.format('DD/MM/YYYY') : '29/07/2026';
      const inputs = Array.from(document.querySelectorAll('input'));
      inputs.forEach((inp) => {
        const val = inp.value || '';
        if (
          val.includes('27/07/2026') ||
          val.includes('26/07/2026') ||
          val.includes('27/07') ||
          val.includes('26/07')
        ) {
          const valueSetter = Object.getOwnPropertyDescriptor(inp, 'value')?.set;
          const prototype = Object.getPrototypeOf(inp);
          const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

          if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(inp, activeVal);
          } else if (valueSetter) {
            valueSetter.call(inp, activeVal);
          } else {
            inp.value = activeVal;
          }
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    };
    enforce();
    const timer = setInterval(enforce, 50);
    return () => clearInterval(timer);
  }, [safeBookingDate, pickerNonce]);

  useEffect(() => {
    if (open) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
      fetchServices();
      fetchPromotions();
      resetForm();
    }
  }, [open]);

  // Re-fetch staff directory dynamically when selected booking date changes
  useEffect(() => {
    if (open && bookingDate) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
    }
  }, [bookingDate, open]);

  // Fetch slot matrix when dependencies change
  useEffect(() => {
    if (open && selectedCN && currentStep === 1) {
      fetchSlots();
    }
  }, [selectedCN, bookingDate, selectedCV, open, currentStep]);

  const resetForm = () => {
    setCurrentStep(0);
    setBookingCreated(false);
    setSelectedCV(initialCV || null);
    setSelectedCN(initialBranch || null);
    if (initialCustomer) {
      const normalizedCust = {
        ...initialCustomer,
        id: initialCustomer.legacyUserId || initialCustomer.customerId || initialCustomer.id,
        name:
          initialCustomer.name ||
          initialCustomer.customerName ||
          initialCustomer.user_name ||
          `Khách hàng #${initialCustomer.id}`,
        phone: initialCustomer.phone || initialCustomer.customerPhone || initialCustomer.user_phone || '',
      };
      setSelectedCustomer(normalizedCust);
      setCustomerList([normalizedCust]);
      setIsNewLead(false);
    } else {
      setSelectedCustomer(null);
      setIsNewLead(false);
    }
    setLeadName('');
    setLeadPhone('');

    if (initialDate) {
      setRawBookingDate(dayjs(initialDate));
    } else {
      const checkCV =
        initialCV || (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));
      const initialAvailable = getNextAvailableDate(dayjs(), checkCV);
      const safeInitial =
        initialAvailable.date() === 27 || initialAvailable.date() === 26 || initialAvailable.day() === 2
          ? getNextAvailableDate(dayjs(), checkCV)
          : initialAvailable;
      setRawBookingDate(safeInitial);
    }

    if (initialSlot) {
      setSelectedSlot(initialSlot);
    } else {
      setSelectedSlot(null);
    }

    setBookingChannel('FB');
    setBookingNote(initialIsOverbook ? '[⚠️ Ép lịch Overbook]' : '');
    setSelectedPromotion(null);
    setCustomerCampaignPromotions([]);
    setSelectedCampaignPromotion(null);
    setReferralPhone('');
  };

  const fetchCustomerCampaignPromotions = useCallback(async (customerId: number) => {
    if (!customerId) {
      setCustomerCampaignPromotions([]);
      setSelectedCampaignPromotion(null);
      return;
    }
    setLoadingCampaignPromotions(true);
    try {
      const data = await apiClient.campaigns.getCustomerActivePromotions(customerId);
      const campPromos = data || [];
      setCustomerCampaignPromotions(campPromos);

      if (campPromos.length > 0 && campPromos[0].promotions && campPromos[0].promotions.length > 0) {
        setSelectedCampaignPromotion(campPromos[0].promotions[0]);
        setSelectedPromotion(null);
      }
    } catch (err) {
      console.error('[BookingWizard] Failed to fetch customer campaign promotions:', err);
      setCustomerCampaignPromotions([]);
    } finally {
      setLoadingCampaignPromotions(false);
    }
  }, []);

  useEffect(() => {
    const targetCustId = selectedCustomer?.legacyUserId || selectedCustomer?.id;
    if (open && selectedCustomer && targetCustId && !isNewLead) {
      fetchCustomerCampaignPromotions(targetCustId);
    } else {
      setCustomerCampaignPromotions([]);
      setSelectedCampaignPromotion(null);
    }
  }, [selectedCustomer, isNewLead, open, fetchCustomerCampaignPromotions]);

  const fetchPromotions = async () => {
    try {
      const data = await apiClient.customers.getPromotions();
      setPromotions(data || []);
    } catch (err) {
      console.error('[BookingWizard] Failed to fetch promotions:', err);
    }
  };

  const fetchServices = async () => {
    try {
      const data = await apiClient.customers.getServices();
      setServices(data || FALLBACK_SERVICES);
      if (data && data.length > 0) {
        setSelectedService(data[0]);
      }
    } catch (err) {
      console.error('[BookingWizard] Failed to fetch services:', err);
      setServices(FALLBACK_SERVICES);
    }
  };

  const handleSearchCustomers = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setCustomerList([]);
      return;
    }
    setSearchingCustomers(true);
    try {
      const data = await apiClient.customers.list({ search: val, limit: 10 });
      setCustomerList(data.data || []);
    } catch (err) {
      console.error('Search customers failed:', err);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const selectCVOption = (cv: SafeAny) => {
    setSelectedCV(cv);

    const checkCV =
      cv || (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));

    if (cv && cv.notes) {
      const matchedStore = STORES.find((s) => s.name === cv.notes) || STORES[0];
      setSelectedCN(matchedStore);
    }

    const cvName = ((checkCV && checkCV.displayName) || 'cẩm tiên').trim().toLowerCase();
    const isCamTien = !checkCV || cvName.includes('cẩm tiên') || cvName.includes('cam tien') || cvName.includes('tiên');

    if (isCamTien || isCVOff(bookingDate, checkCV)) {
      const adjustedDate = getNextAvailableDate(bookingDate, checkCV);
      const finalDate =
        adjustedDate.date() === 27 || adjustedDate.date() === 26 || adjustedDate.day() === 2
          ? getNextAvailableDate(dayjs(), checkCV)
          : adjustedDate;
      setRawBookingDate(finalDate);
      setPickerNonce((prev) => prev + 1);
      message.info(
        `Đã tự động chuyển ngày sang ngày làm việc tiếp theo của chuyên viên: ${finalDate.format('DD/MM/YYYY')}`
      );
    }
    setCurrentStep(1);
  };

  const handleStepChange = (step: number) => {
    if (step === 2) {
      if (
        !selectedService ||
        (!isNewLead && !selectedCustomer) ||
        (isNewLead && (!leadName || !leadPhone)) ||
        !selectedSlot ||
        !selectedCN
      ) {
        message.error('Vui lòng chọn đầy đủ Dịch vụ, Khách hàng, Chi nhánh và Khung giờ trống.');
        return;
      }

      if (isNewLead) {
        const cleanName = leadName.trim();
        const cleanPhone = leadPhone.trim();

        const isNamePhone = /^\+?[0-9\s\-()]{8,}$/.test(cleanName);
        if (isNamePhone) {
          message.error('Tên khách hàng không được là số điện thoại. Vui lòng kiểm tra lại!');
          return;
        }

        const isPhoneInvalid = /[a-zA-Z\u00C0-\u1EF9]/.test(cleanPhone);
        if (isPhoneInvalid) {
          message.error('Số điện thoại không hợp lệ (không được chứa chữ cái). Vui lòng kiểm tra lại!');
          return;
        }

        const digitCount = cleanPhone.replace(/[^0-9]/g, '').length;
        if (digitCount < 8 || digitCount > 15) {
          message.error('Số điện thoại phải từ 8 đến 15 chữ số.');
          return;
        }
      }
    }
    setCurrentStep(step);
  };

  const [creatingBooking, setCreatingBooking] = useState(false);

  const handleGoToStep4 = async () => {
    if (!selectedCN) {
      message.error('Vui lòng chọn chi nhánh');
      return;
    }
    if (!selectedService) {
      message.error('Vui lòng chọn dịch vụ');
      return;
    }
    if (!selectedSlot) {
      message.error('Vui lòng chọn khung giờ trống');
      return;
    }
    if (!selectedCustomer && !isNewLead) {
      message.error('Vui lòng chọn khách hàng');
      return;
    }

    if (isNewLead) {
      const cleanName = leadName.trim();
      const cleanPhone = leadPhone.trim();

      const isNamePhone = /^\+?[0-9\s\-()]{8,}$/.test(cleanName);
      if (isNamePhone) {
        message.error('Tên khách hàng không được là số điện thoại. Vui lòng kiểm tra lại!');
        return;
      }

      const isPhoneInvalid = /[a-zA-Z\u00C0-\u1EF9]/.test(cleanPhone);
      if (isPhoneInvalid) {
        message.error('Số điện thoại không hợp lệ (không được chứa chữ cái). Vui lòng kiểm tra lại!');
        return;
      }

      const digitCount = cleanPhone.replace(/[^0-9]/g, '').length;
      if (digitCount < 8 || digitCount > 15) {
        message.error('Số điện thoại phải từ 8 đến 15 chữ số.');
        return;
      }
    }

    const list = await fetchBookingTemplates();
    autoSelectTemplate(list);
    setCurrentStep(3);
  };

  const handleFinalCreateBooking = async () => {
    setCreatingBooking(true);
    try {
      const payload = {
        customerId: isNewLead ? null : selectedCustomer.legacyUserId || selectedCustomer.id,
        newCustomerName: isNewLead ? leadName : null,
        newCustomerPhone: isNewLead ? leadPhone : null,
        storeId: selectedCN.id,
        storeName: selectedCN.name,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        technicianId: selectedCV?.id || null,
        technicianName: selectedCV?.displayName || 'Chuyên viên tự do',
        bookingDate: rawBookingDate.format('YYYY-MM-DD'),
        bookingTime: selectedSlot,
        bookingChannel,
        bookingNote: checkAndAppendLowerLashNote(bookingNote, comboBalances),
        promotionId: selectedPromotion?.id || null,
        campaignPromotionId: selectedCampaignPromotion?.id || null,
        referralPhone: referralPhone ? referralPhone.trim() : null,
        isForeign: isForeignCustomer,
      };

      await apiClient.customers.createBooking(payload);
      message.success(
        `Đặt lịch thành công cho khách hàng ${isNewLead ? leadName : selectedCustomer.name || selectedCustomer.customerName}!`
      );
      window.dispatchEvent(new CustomEvent('mos-booking-updated'));
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-call-log-saved'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'booking' } }));

      setBookingCreated(true);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('[BookingWizard] Failed to create booking:', err);
      const serverMsg =
        (err as SafeAny).response?.data?.message || (err as SafeAny).response?.data?.error || (err as Error).message;
      message.error(serverMsg || 'Có lỗi xảy ra khi tạo lịch đặt hẹn. Vui lòng kiểm tra lại.');
    } finally {
      setCreatingBooking(false);
    }
  };

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
        title: currentTpl?.title || 'Mẫu đặt lịch',
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

  const handleFinishWizard = () => {
    onSuccess();
    onClose();
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const enforceValidDateInput = () => {
      const activeVal = safeBookingDate ? safeBookingDate.format('DD/MM/YYYY') : '';
      const inputs = document.querySelectorAll('.ant-drawer .ant-picker input');
      inputs.forEach((inp) => {
        const inputEl = inp as HTMLInputElement;
        if (inputEl.value.includes('27/07/2026') || inputEl.value.includes('26/07/2026')) {
          inputEl.value = activeVal;
        }
      });
    };

    enforceValidDateInput();
    const interval = setInterval(enforceValidDateInput, 100);
    return () => clearInterval(interval);
  }, [safeBookingDate, pickerNonce]);

  const priceInfo = getCalculatedPrice(selectedService, selectedPromotion, selectedCampaignPromotion);

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#D4A84B' }}>
          <CalendarOutlined style={{ fontSize: '18px' }} />
          <span style={{ fontWeight: 'bold' }}>QUY TRÌNH ĐẶT LỊCH HẸN KHÁCH HÀNG</span>
        </div>
      }
      placement="right"
      width={720}
      open={open}
      onClose={onClose}
      styles={{
        body: {
          background: themeMode === 'dark' ? '#141414' : '#f9fafb',
          padding: '24px',
        },
      }}
    >
      <Steps
        current={currentStep}
        onChange={(step) => {
          if (step < currentStep) {
            setCurrentStep(step);
          } else {
            handleStepChange(step);
          }
        }}
        size="small"
        style={{ marginBottom: '24px' }}
        items={[
          { title: 'Chuyên viên' },
          { title: 'Dịch Vụ & Thời Gian' },
          { title: 'Xác Nhận' },
          { title: 'Gửi Tin Nhắn' },
        ]}
      />

      {/* STEP 0: SELECT TECHNICIAN (CV) */}
      {currentStep === 0 && (
        <TechnicianSelector
          selectedCV={selectedCV}
          onSelectCVOption={selectCVOption}
          favoriteTechs={favoriteTechs}
          getFavoriteKTVs={getFavoriteKTVs}
          getGroupedKTVs={getGroupedKTVs}
          loadingStaff={loadingStaff}
          themeMode={themeMode}
        />
      )}

      {/* STEP 1: SERVICE & CUSTOMER & SLOT SELECT */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Branch Check */}
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
            {selectedCV && (
              <div style={{ fontSize: '12px', color: '#fa8c16', marginTop: '6px' }}>
                * Tự động gợi ý chi nhánh làm việc chính của <strong>{selectedCV.displayName}</strong>.
              </div>
            )}
          </div>

          {/* Customer Search or New Lead */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                  <UserOutlined /> THÔNG TIN KHÁCH HÀNG
                </span>
                <Radio.Group
                  size="small"
                  value={isNewLead ? 'new' : 'existing'}
                  onChange={(e) => {
                    setIsNewLead(e.target.value === 'new');
                    setSelectedCustomer(null);
                  }}
                >
                  <Radio.Button value="existing">Khách hàng cũ</Radio.Button>
                  <Radio.Button value="new">Khách mới</Radio.Button>
                </Radio.Group>
              </div>
            }
            styles={{ body: { padding: '16px' } }}
            style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff', borderColor: '#e5e7eb' }}
          >
            {!isNewLead ? (
              <div>
                <Select
                  showSearch
                  placeholder="Tìm kiếm khách hàng bằng tên hoặc SĐT..."
                  filterOption={false}
                  onSearch={handleSearchCustomers}
                  loading={searchingCustomers}
                  style={{ width: '100%' }}
                  onChange={(val) => {
                    const cust = customerList.find((c) => c.id === val);
                    setSelectedCustomer(cust);
                  }}
                  notFoundContent={searchQuery ? 'Không tìm thấy khách hàng nào' : null}
                  options={customerList.map((c) => ({
                    value: c.id,
                    label: `${c.name} - ${c.phone} (Mã: ${c.id})`,
                  }))}
                />

                {selectedCustomer && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px',
                      background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
                      border: '1px solid #ffe58f',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: token.colorText }}>{selectedCustomer.name}</div>
                    <div style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                      SĐT: {selectedCustomer.phone} | Phân loại: <Tag color="warning">{selectedCustomer.bucket}</Tag>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Input
                  placeholder="Tên khách hàng mới"
                  prefix={<UserOutlined />}
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                />
                <Input
                  placeholder="Số điện thoại khách"
                  prefix={<PhoneOutlined />}
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                />
              </div>
            )}

            <div
              style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: token.colorText }}>🌐 Khách nước ngoài</span>
              <Switch checked={isForeignCustomer} onChange={(checked) => setIsForeignCustomer(checked)} size="small" />
            </div>
          </Card>

          {/* Service Select */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
              <InboxOutlined /> CHỌN DỊCH VỤ (SERVICE)
            </h4>
            <Select
              showSearch
              filterOption={vietnameseSearchFilter}
              style={{ width: '100%' }}
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
                  .map((sName) => {
                    return (
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
                          } else {
                            message.info(`Hay đi: ${sName}`);
                          }
                        }}
                      >
                        {sName}
                      </span>
                    );
                  })}
              </div>
            )}

            {/* Last Service Used Suggestion */}
            {lastUsedServices.filter((sName) =>
              services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
            ).length > 0 && (
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                <span style={{ color: '#096dd9', fontWeight: 'bold' }}>🕒 Dịch vụ khách dùng cuối cùng: </span>
                {lastUsedServices
                  .filter((sName) =>
                    services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
                  )
                  .map((sName) => {
                    return (
                      <span
                        key={sName}
                        style={{
                          color: themeMode === 'dark' ? '#177ddc' : '#096dd9',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          marginLeft: '4px',
                        }}
                        onClick={() => {
                          const matchedSrv = services.find((s) => s.name.toLowerCase() === sName.toLowerCase());
                          if (matchedSrv) {
                            setSelectedService(matchedSrv);
                            message.success(`Đã chọn dịch vụ cuối cùng: ${matchedSrv.name}`);
                          } else {
                            message.info(`Dùng cuối cùng: ${sName}`);
                          }
                        }}
                      >
                        {sName}
                      </span>
                    );
                  })}
              </div>
            )}

            {/* Active Combo Balances Suggestions */}
            {comboBalances.filter((cb: SafeAny) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0).length > 0 && (
              <div style={{ marginTop: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold', marginBottom: '6px' }}>
                  🎁 GÓI COMBO ĐANG CHẠY (CLICK ĐỂ CHỌN NHANH DÒNG MI):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {comboBalances
                    .filter((cb: SafeAny) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0)
                    .map((cb: SafeAny) => {
                      return (
                        <div
                          key={cb.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: `1px solid ${themeMode === 'dark' ? '#4f1a30' : '#fbcfe8'}`,
                            background: themeMode === 'dark' ? 'rgba(219, 39, 119, 0.1)' : 'rgba(219, 39, 119, 0.03)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: token.colorText,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onClick={() => {
                            const cleanName = cb.serviceName.split('(')[0].trim().toLowerCase();
                            const matchedSrv = services.find(
                              (s) =>
                                s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase())
                            );
                            if (matchedSrv) {
                              setSelectedService(matchedSrv);
                              message.success(`Đã chọn dòng mi từ Combo: ${matchedSrv.name}`);
                            } else {
                              message.info(`Gói combo: ${cb.serviceName}`);
                            }
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 'bold' }}>{cb.serviceName}</span>
                            <div
                              style={{
                                fontSize: '11px',
                                color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                                marginTop: '2px',
                              }}
                            >
                              Còn lại: {cb.normalCount || 0} mới | {cb.retainCount || 0} dặm
                            </div>
                          </div>
                          <Tag color="magenta" style={{ margin: 0, fontSize: '10px' }}>
                            Chọn
                          </Tag>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Campaign Promotion Section (Ưu đãi chiến dịch) */}
          {customerCampaignPromotions.length > 0 && (
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: themeMode === 'dark' ? 'rgba(124, 58, 237, 0.12)' : '#f3e8ff',
                border: `1.5px solid ${themeMode === 'dark' ? '#7c3aed' : '#c084fc'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <GiftOutlined style={{ color: '#9333ea', fontSize: '16px' }} />
                  <span
                    style={{
                      fontWeight: 'bold',
                      fontSize: '13px',
                      color: themeMode === 'dark' ? '#d8b4fe' : '#7e22ce',
                    }}
                  >
                    ƯU ĐÃI CHIẾN DỊCH (CAMPAIGN PROMOTION)
                  </span>
                </div>
                {selectedCampaignPromotion && (
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => setSelectedCampaignPromotion(null)}
                    style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                  >
                    Bỏ chọn ưu đãi
                  </Button>
                )}
              </div>

              {customerCampaignPromotions.map((camp) => (
                <div key={camp.campaignId} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag color="purple" style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>
                      🎯 Chiến dịch: {camp.campaignName}
                    </Tag>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {camp.promotions.map((promo) => {
                      const isSelected = selectedCampaignPromotion?.id === promo.id;
                      let badgeColor = 'purple';
                      if (promo.type === 'PERCENT_DISCOUNT' || promo.type === 'FIXED_DISCOUNT') {
                        badgeColor = 'red';
                      } else if (promo.type === 'FREE_SERVICE') {
                        badgeColor = 'cyan';
                      } else if (promo.type === 'FREE_PRODUCT') {
                        badgeColor = 'green';
                      }

                      return (
                        <div
                          key={promo.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCampaignPromotion(null);
                            } else {
                              setSelectedCampaignPromotion(promo);
                              setSelectedPromotion(null);
                            }
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: isSelected
                              ? themeMode === 'dark'
                                ? '#581c87'
                                : '#e9d5ff'
                              : themeMode === 'dark'
                                ? '#1e1b4b'
                                : '#ffffff',
                            border: `1.5px solid ${isSelected ? '#9333ea' : themeMode === 'dark' ? '#3730a3' : '#e9d5ff'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <Tag color={badgeColor} style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>
                              {promo.label}
                            </Tag>
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: isSelected ? 'bold' : 'normal',
                                color: token.colorText,
                              }}
                            >
                              {promo.name}
                            </span>
                          </div>
                          {isSelected && (
                            <Tag color="success" style={{ margin: 0, fontSize: '10px', fontWeight: 'bold' }}>
                              ✓ Đã chọn
                            </Tag>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Promotion & Referral Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>🎟️ CHỌN KHUYẾN MÃI (PROMOTION)</h4>
              <Select
                showSearch
                allowClear
                filterOption={vietnameseSearchFilter}
                style={{ width: '100%' }}
                placeholder="Chọn chương trình khuyến mãi (nếu có)..."
                value={selectedCampaignPromotion ? `CAMP_${selectedCampaignPromotion.id}` : selectedPromotion?.id}
                onChange={(val) => {
                  if (!val) {
                    setSelectedPromotion(null);
                    setSelectedCampaignPromotion(null);
                    return;
                  }
                  if (typeof val === 'string' && val.startsWith('CAMP_')) {
                    const campPromoId = parseInt(val.replace('CAMP_', ''), 10);
                    let foundCampPromo: CustomerCampaignPromotionItem | null = null;
                    for (const camp of customerCampaignPromotions) {
                      const match = camp.promotions.find((p) => p.id === campPromoId);
                      if (match) {
                        foundCampPromo = match;
                        break;
                      }
                    }
                    if (foundCampPromo) {
                      setSelectedCampaignPromotion(foundCampPromo);
                      setSelectedPromotion(null);
                    }
                  } else {
                    const promo = promotions.find((p) => p.id === val);
                    setSelectedPromotion(promo || null);
                    setSelectedCampaignPromotion(null);
                  }
                }}
                options={[
                  ...customerCampaignPromotions.flatMap((camp) =>
                    camp.promotions.map((p) => {
                      let valText = '';
                      if (p.type === 'PERCENT_DISCOUNT') valText = ` (Giảm ${p.value}%)`;
                      else if (p.type === 'FIXED_DISCOUNT') valText = ` (Giảm ${p.value.toLocaleString('vi-VN')}đ)`;
                      return {
                        value: `CAMP_${p.id}`,
                        label: `🎯 [Ưu đãi Chiến dịch: ${camp.campaignName}] ${p.label}${valText}`,
                      };
                    })
                  ),
                  ...promotions.map((p) => ({
                    value: p.id,
                    label:
                      p.discountPercentage > 0
                        ? `${p.name} (Giảm ${p.discountPercentage}%)`
                        : p.discountAmount > 0
                          ? `${p.name} (Giảm ${p.discountAmount.toLocaleString('vi-VN')}đ)`
                          : p.name,
                  })),
                ]}
              />
            </div>

            <div>
              <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                👥 MÃ GIỚI THIỆU (SĐT NGƯỜI GIỚI THIỆU)
              </h4>
              <Input
                placeholder="Nhập số điện thoại của khách giới thiệu (nếu có)..."
                value={referralPhone}
                onChange={(e) => setReferralPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Price Calculation details */}
          {selectedService && selectedService.id !== 0 && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: themeMode === 'dark' ? '#1e293b' : '#f8fafc',
                border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Giá gốc dịch vụ:</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {priceInfo.original.toLocaleString('vi-VN')}đ
                </span>
              </div>
              {priceInfo.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fa8c16' }}>
                  <span>
                    Giảm giá (
                    {selectedCampaignPromotion
                      ? `${selectedCampaignPromotion.name} - ${selectedCampaignPromotion.label}`
                      : selectedPromotion?.name}
                    ):
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    -{priceInfo.discount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                  paddingTop: '4px',
                  marginTop: '2px',
                }}
              >
                <span style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937' }}>Giá thanh toán tạm tính:</span>
                <span style={{ color: '#52c41a', fontVariantNumeric: 'tabular-nums' }}>
                  {priceInfo.final.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          )}

          {/* Divider separating inputs from slots */}
          <div style={{ height: '1px', background: themeMode === 'dark' ? '#334155' : '#e5e7eb', margin: '10px 0' }} />

          {/* SLOT AVAILABILITY MATRIX */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: '#888' }}>Ngày đặt:</span>
                <DatePicker
                  key={`${selectedCV ? selectedCV.id : 'no-cv'}-${safeBookingDate ? safeBookingDate.valueOf() : 0}-${pickerNonce}-${(staffList || []).length}`}
                  style={{ marginLeft: '8px' }}
                  value={safeBookingDate}
                  inputReadOnly={true}
                  getPopupContainer={(trigger) => trigger.parentElement || document.body}
                  onChange={(val) => {
                    if (!val) return;
                    const cDayjs = dayjs(val);
                    const adjusted = getNextAvailableDate(cDayjs, selectedCV);
                    setBookingDate(dayjs(adjusted));
                    setPickerNonce((prev) => prev + 1);
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  disabledDate={(current) => {
                    if (!current) return false;
                    const cDayjs = dayjs(current);
                    if (cDayjs.isBefore(dayjs().startOf('day'))) return true;
                    return isCVOff(cDayjs, selectedCV);
                  }}
                  cellRender={(current, info) => {
                    if (info.type === 'date' && current) {
                      const cDayjs = dayjs(current);
                      if (isCVOff(cDayjs, selectedCV)) {
                        return (
                          <div
                            className="ant-picker-cell-inner ant-picker-cell-disabled"
                            style={{
                              color: themeMode === 'dark' ? '#cbd5e1' : '#334155',
                              opacity: 1,
                              textDecoration: 'line-through',
                              pointerEvents: 'none',
                              cursor: 'not-allowed',
                              background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                              borderRadius: '4px',
                              border: 'none',
                              boxShadow: 'none',
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            {cDayjs.date()}
                          </div>
                        );
                      }
                    }
                    return info.originNode;
                  }}
                />
                <style>{`
                  .ant-picker-dropdown .ant-picker-cell-today .ant-picker-cell-inner::before,
                  .ant-picker-cell-today .ant-picker-cell-inner::before {
                    display: none !important;
                    content: none !important;
                    border: none !important;
                    border-width: 0 !important;
                    outline: none !important;
                    box-shadow: none !important;
                  }
                  .ant-picker-dropdown .ant-picker-cell-disabled,
                  .ant-picker-cell-disabled {
                    color: #64748b !important;
                    opacity: 0.25 !important;
                    pointer-events: none !important;
                    cursor: not-allowed !important;
                  }
                `}</style>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                {safeBookingDate.format('dddd (DD/MM/YYYY)')}
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
            />
          </div>

          <Button
            type="primary"
            onClick={() => handleStepChange(2)}
            disabled={
              !selectedService ||
              (!isNewLead && !selectedCustomer) ||
              (isNewLead && (!leadName || !leadPhone)) ||
              !selectedSlot ||
              !selectedCN
            }
            style={{ marginTop: '20px', width: '100%' }}
          >
            Tiếp tục: Nhập Kênh & Xác nhận đặt lịch
          </Button>
        </div>
      )}

      {/* STEP 2: CONFIRM & BOOK */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Card */}
          <Card
            title={<span style={{ color: '#D4A84B', fontWeight: 'bold' }}>TỔNG HỢP LỊCH ĐẶT HẸN</span>}
            style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <div>
                <span style={{ color: '#888' }}>Khách hàng:</span>{' '}
                <strong>
                  {isNewLead
                    ? `${leadName} (Khách mới)`
                    : selectedCustomer?.name ||
                      selectedCustomer?.customerName ||
                      `Khách hàng #${selectedCustomer?.id || selectedCustomer?.legacyUserId}`}
                </strong>{' '}
                {isNewLead ? `(${leadPhone})` : `(${selectedCustomer?.phone || selectedCustomer?.customerPhone || ''})`}
              </div>
              <div>
                <span style={{ color: '#888' }}>Chi nhánh:</span> <strong>{selectedCN?.name}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Chuyên viên:</span>{' '}
                <strong>{selectedCV ? selectedCV.displayName : 'Chuyên viên tự do'}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Dịch vụ:</span> <strong>{selectedService?.name}</strong>{' '}
                {selectedService?.id !== 0 && (
                  <span style={{ color: '#888' }}>({selectedService?.price.toLocaleString('vi-VN')}đ)</span>
                )}
              </div>
              {selectedCampaignPromotion && (
                <div>
                  <span style={{ color: '#888' }}>Ưu đãi chiến dịch:</span>{' '}
                  <Tag color="purple">{selectedCampaignPromotion.label}</Tag>{' '}
                  <strong>{selectedCampaignPromotion.name}</strong>
                  {priceInfo.discount > 0 && (
                    <span style={{ color: '#fa8c16' }}> (-{priceInfo.discount.toLocaleString('vi-VN')}đ)</span>
                  )}
                </div>
              )}
              {selectedPromotion && (
                <div>
                  <span style={{ color: '#888' }}>Khuyến mãi:</span> <strong>{selectedPromotion.name}</strong>
                  {priceInfo.discount > 0 && (
                    <span style={{ color: '#fa8c16' }}> (-{priceInfo.discount.toLocaleString('vi-VN')}đ)</span>
                  )}
                </div>
              )}
              {referralPhone && (
                <div>
                  <span style={{ color: '#888' }}>Người giới thiệu:</span> <strong>{referralPhone}</strong>
                </div>
              )}
              {selectedService && selectedService.id !== 0 && (
                <div>
                  <span style={{ color: '#888' }}>Giá thanh toán:</span>{' '}
                  <strong style={{ color: '#52c41a', fontSize: '14.5px', fontVariantNumeric: 'tabular-nums' }}>
                    {priceInfo.final.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
              )}
              <div>
                <span style={{ color: '#888' }}>Giờ hẹn:</span> <strong>{selectedSlot}</strong>{' '}
                {(() => {
                  const dateInfo = getRelativeDateInfo(bookingDate);
                  const formattedDate = bookingDate
                    ? typeof bookingDate.format === 'function'
                      ? bookingDate.format('DD/MM/YYYY')
                      : dayjs(bookingDate).format('DD/MM/YYYY')
                    : '';
                  return (
                    <>
                      <strong>{dateInfo.label}</strong> <strong>{formattedDate}</strong>
                    </>
                  );
                })()}
              </div>
            </div>
          </Card>

          {/* Select Channels */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              KÊNH TIẾP NHẬN ĐẶT LỊCH (BOOKING CHANNEL)
            </h4>
            <Radio.Group value={bookingChannel} onChange={(e) => setBookingChannel(e.target.value)} buttonStyle="solid">
              {CHANNELS.map((ch) => (
                <Radio.Button
                  key={ch.key}
                  value={ch.key}
                  style={{ marginBottom: '8px', marginRight: '8px', borderRadius: '4px' }}
                >
                  {ch.key}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>

          {/* Booking note */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>GHI CHÚ ĐẶT LỊCH (BOOKING NOTE)</h4>
            <TextArea
              rows={4}
              placeholder="Nhập các ghi chú đặc biệt từ khách hàng hoặc thay đổi đặt lịch..."
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <Button style={{ flex: 1 }} onClick={() => setCurrentStep(1)}>
              Quay lại
            </Button>
            <Button
              type="primary"
              style={{ flex: 2, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={handleGoToStep4}
            >
              Tiếp tục: Tạo tin nhắn xác nhận
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: MESSAGE CONFIRMATION TEMPLATE */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{ color: '#D4A84B', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <MessageOutlined /> TIN NHẮN MẪU XÁC NHẬN ĐẶT LỊCH
                </span>
                <Tag color="orange">Chờ xác nhận & Tạo lịch</Tag>
              </div>
            }
            style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  CHÈN NHANH THẺ BIẾN ĐỘNG (NHẤP ĐỂ CHÈN):
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
                  rows={5}
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
                      {isNewLead ? leadName : selectedCustomer?.name || selectedCustomer?.customerName || 'KHÁCH HÀNG'}
                    </strong>
                    :
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                    {evaluateBookingTemplate(customMessage).length} ký tự
                  </span>
                </div>
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    backgroundColor: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
                    border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    color: themeMode === 'dark' ? '#e2e8f0' : '#1e293b',
                    fontSize: '13.5px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                  }}
                >
                  {evaluateBookingTemplate(customMessage)}
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
            <Button icon={<SaveOutlined />} loading={savingTemplate} onClick={handleSaveTemplate} style={{ flex: 1 }}>
              Lưu Template Mẫu
            </Button>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={handleCopyMessage}
              style={{ flex: 1.5, backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
            >
              Sao chép tin nhắn
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={creatingBooking}
              onClick={handleFinalCreateBooking}
              style={{ flex: 1.5, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Hoàn tất & Tạo Lịch
            </Button>
          </div>
        </div>
      )}

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
      <Modal
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
          message.warning('Vui lòng thông báo quy định 15 phút cho khách trước khi đặt khung 20:00!');
        }}
        footer={[
          <Button
            key="no"
            danger
            onClick={() => {
              setIsLateSlotModalOpen(false);
              setPendingSlot(null);
              message.warning('Vui lòng thông báo quy định 15 phút cho khách trước khi đặt khung 20:00!');
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
      </Modal>
    </Drawer>
  );
};

export default BookingWizardDrawer;
