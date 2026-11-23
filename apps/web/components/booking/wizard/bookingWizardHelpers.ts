import dayjs from 'dayjs';
import type { BookingConfirmationTemplate, CustomerCampaignPromotionItem } from '@mos-lab/shared';
import { STORES, getStoreFullAddress } from '../constants';
import { checkAndAppendLowerLashNote } from '../comboUtils';

export const HARDCODED_OFF_DATES: Record<string, string[]> = {
  'cẩm tiên': ['2026-07-26', '2026-07-27'],
  'cam tien': ['2026-07-26', '2026-07-27'],
};

export const getFixedPriceScopeLabel = (promotion: CustomerCampaignPromotionItem): string => {
  const categoryLabels = promotion.eligibleServiceCategoryLabels || [];
  if (categoryLabels.length > 0) return categoryLabels.join(', ');

  const serviceCount = (promotion.eligibleServiceIds || []).length;
  return serviceCount === 1 ? '1 dịch vụ mi đã cấu hình' : `${serviceCount} dịch vụ mi đã cấu hình`;
};

export const getDayOfWeekNoAccent = (date: SafeAny): string => {
  if (!date) return 'Chu Nhat';
  const d = typeof date.format === 'function' ? date : dayjs(date);
  const dayNum = d.day();
  const map: Record<number, string> = {
    0: 'Chu Nhat',
    1: 'Thu Hai',
    2: 'Thu Ba',
    3: 'Thu Tu',
    4: 'Thu Nam',
    5: 'Thu Sau',
    6: 'Thu Bay',
  };
  return map[dayNum] || 'Chu Nhat';
};

export const getCycleDays = (targetDate: SafeAny, customer: SafeAny, fallbackLastVisit?: string | null): number => {
  const lastVisit =
    customer?.lastVisit || customer?.last_order_booking || customer?.lastOrderBooking || fallbackLastVisit;
  if (!lastVisit) return 0;
  const tDate = typeof targetDate?.format === 'function' ? targetDate : dayjs(targetDate);
  const lDate = dayjs(lastVisit);
  if (!tDate.isValid() || !lDate.isValid()) return 0;
  const diff = tDate.diff(lDate, 'day');
  return diff > 0 ? diff : 0;
};

export const resolveInitialStore = (branchInput: SafeAny) => {
  if (!branchInput) return STORES[0];
  if (typeof branchInput === 'object' && branchInput.id) {
    return STORES.find((s) => Number(s.id) === Number(branchInput.id)) || branchInput;
  }
  const rawStr = String(branchInput).trim().toLowerCase();
  if (rawStr === '6' || rawStr.includes('đề thám') || rawStr.includes('de tham')) {
    return STORES.find((s) => s.id === 6) || STORES[1] || STORES[0];
  }
  if (rawStr === '16' || rawStr.includes('estella')) {
    return STORES.find((s) => s.id === 16) || STORES[0];
  }
  return STORES.find((s) => s.name.toLowerCase().includes(rawStr)) || STORES[0];
};

export const normalizeInitialBookingCustomer = (initialCustomer: SafeAny) => ({
  ...initialCustomer,
  id: initialCustomer.legacyUserId || initialCustomer.customerId || initialCustomer.id,
  name:
    initialCustomer.name ||
    initialCustomer.customerName ||
    initialCustomer.user_name ||
    `Khách hàng #${initialCustomer.id}`,
  phone: initialCustomer.phone || initialCustomer.customerPhone || initialCustomer.user_phone || '',
});

export const isCvDateDisabled = (current: dayjs.Dayjs, cv: SafeAny, staffList: SafeAny[]): boolean => {
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
};

export interface EvaluateBookingTemplateInput {
  templateContent: string;
  isNewLead: boolean;
  leadName: string;
  selectedCustomer: SafeAny;
  selectedCN: SafeAny;
  selectedSlot: string | null;
  rawBookingDate: SafeAny;
  selectedCV: SafeAny;
  customerLastVisit?: string | null;
}

export const evaluateBookingConfirmationTemplate = ({
  templateContent,
  isNewLead,
  leadName,
  selectedCustomer,
  selectedCN,
  selectedSlot,
  rawBookingDate,
  selectedCV,
  customerLastVisit,
}: EvaluateBookingTemplateInput): string => {
  if (!templateContent) return '';
  const customerName = isNewLead ? leadName : selectedCustomer?.name || selectedCustomer?.customerName || 'Khách hàng';
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
};

export const pickDefaultBookingTemplate = (
  templatesList: BookingConfirmationTemplate[],
  selectedSlot: string | null,
  selectedCV: SafeAny
): BookingConfirmationTemplate | undefined => {
  const isLateSlot = selectedSlot && (selectedSlot.includes('20:00') || selectedSlot === '20:00');
  const hasTech = selectedCV !== null && selectedCV !== undefined;

  let target: BookingConfirmationTemplate | undefined;
  if (isLateSlot && hasTech) {
    target = templatesList.find((t) => t.type === 'has_tech_late_slot' || t.id === 'tpl_booking_has_tech_late_slot');
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

  return target;
};

export interface BuildBookingPayloadInput {
  selectedCN: SafeAny;
  selectedService: SafeAny;
  selectedSlot: string | null;
  selectedCustomer: SafeAny;
  isNewLead: boolean;
  leadName: string;
  leadPhone: string;
  selectedCV: SafeAny;
  rawBookingDate: dayjs.Dayjs;
  bookingChannel: string;
  bookingNote: string;
  comboBalances: SafeAny[];
  selectedPromotion: SafeAny;
  selectedCampaignPromotion: CustomerCampaignPromotionItem | null;
  referralPhone: string;
  isForeignCustomer: boolean;
}

export function buildValidatedBookingPayload(
  input: BuildBookingPayloadInput
): { error: string } | { payload: Record<string, unknown> } {
  const {
    selectedCN,
    selectedService,
    selectedSlot,
    selectedCustomer,
    isNewLead,
    leadName,
    leadPhone,
    selectedCV,
    rawBookingDate,
    bookingChannel,
    bookingNote,
    comboBalances,
    selectedPromotion,
    selectedCampaignPromotion,
    referralPhone,
    isForeignCustomer,
  } = input;

  if (!selectedCN) return { error: 'Vui lòng chọn chi nhánh' };
  if (!selectedService) return { error: 'Vui lòng chọn dịch vụ' };
  if (!selectedSlot) return { error: 'Vui lòng chọn khung giờ trống' };
  if (!selectedCustomer && !isNewLead) return { error: 'Vui lòng chọn khách hàng' };

  if (isNewLead) {
    const cleanName = leadName.trim();
    const cleanPhone = leadPhone.trim();

    if (/^\+?[0-9\s\-()]{8,}$/.test(cleanName)) {
      return { error: 'Tên khách hàng không được là số điện thoại. Vui lòng kiểm tra lại!' };
    }
    if (/[a-zA-Z\u00C0-\u1EF9]/.test(cleanPhone)) {
      return { error: 'Số điện thoại không hợp lệ (không được chứa chữ cái). Vui lòng kiểm tra lại!' };
    }
    const digitCount = cleanPhone.replace(/[^0-9]/g, '').length;
    if (digitCount < 8 || digitCount > 15) {
      return { error: 'Số điện thoại phải từ 8 đến 15 chữ số.' };
    }
  }

  return {
    payload: {
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
      campaignPromotionId: selectedCampaignPromotion ? selectedCampaignPromotion.id : null,
      referralPhone: referralPhone ? referralPhone.trim() : null,
      isForeign: isForeignCustomer,
    },
  };
}
