import dayjs from 'dayjs';
import { BookingConfirmationTemplate, SafeAny } from '@mos-lab/shared';
import { STORES, getStoreFullAddress, isStaffOffOnDate } from '../constants';

export interface OffDayStaffInfo {
  staffName: string;
  dateStr: string;
  nextWorkingDate?: dayjs.Dayjs;
}

const WEEKDAY_NO_ACCENT: Record<number, string> = {
  0: 'Chu Nhat',
  1: 'Thu Hai',
  2: 'Thu Ba',
  3: 'Thu Tu',
  4: 'Thu Nam',
  5: 'Thu Sau',
  6: 'Thu Bay',
};

export function findNextWorkingDate(cvItem: SafeAny, targetDate: dayjs.Dayjs): dayjs.Dayjs {
  let nextDate = targetDate.clone().add(1, 'day');
  for (let i = 0; i < 7; i++) {
    if (!isStaffOffOnDate(cvItem, nextDate)) break;
    nextDate = nextDate.add(1, 'day');
  }
  return nextDate;
}

export function getDayOfWeekNoAccent(date: SafeAny): string {
  if (!date) return 'Chu Nhat';
  const d = typeof date.format === 'function' ? date : dayjs(date);
  return WEEKDAY_NO_ACCENT[d.day()] || 'Chu Nhat';
}

export function getCycleDays(targetDate: SafeAny, customer: SafeAny, fallbackLastVisit?: string | null): number {
  const lastVisit =
    customer?.lastVisit || customer?.last_order_booking || customer?.lastOrderBooking || fallbackLastVisit;
  if (!lastVisit) return 0;
  const tDate = typeof targetDate?.format === 'function' ? targetDate : dayjs(targetDate);
  const lDate = dayjs(lastVisit);
  if (!tDate.isValid() || !lDate.isValid()) return 0;
  const diff = tDate.diff(lDate, 'day');
  return diff > 0 ? diff : 0;
}

export function evaluateBookingTemplateText(params: {
  templateContent: string;
  booking: SafeAny;
  selectedCN: SafeAny;
  selectedSlot: string | null;
  bookingDate: dayjs.Dayjs;
  selectedCV: SafeAny;
  selectedCustomer: SafeAny;
  customerLastVisit?: string | null;
  offDayStaffInfo: OffDayStaffInfo | null;
}): string {
  const {
    templateContent,
    booking,
    selectedCN,
    selectedSlot,
    bookingDate,
    selectedCV,
    selectedCustomer,
    customerLastVisit,
    offDayStaffInfo,
  } = params;
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
}

export function pickAutoBookingTemplate(
  templatesList: BookingConfirmationTemplate[],
  selectedSlot: string | null,
  selectedCV: SafeAny
): BookingConfirmationTemplate | undefined {
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
}

export function getBookingServiceInfo(bookingObj: SafeAny): { id: number | null; name: SafeAny } {
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
}

export function resolveInitialStore(booking: SafeAny) {
  const branchLower = String(booking.branchName || booking.storeName || '').toLowerCase();
  return (
    STORES.find(
      (s) =>
        (booking.storeId && Number(booking.storeId) === s.id) ||
        s.name === booking.branchName ||
        booking.branchName?.includes(s.name) ||
        (s.id === 6 && (branchLower.includes('đề thám') || branchLower.includes('de tham'))) ||
        (s.id === 16 && branchLower.includes('estella'))
    ) || STORES[0]
  );
}

export function extractInitialSlotTime(booking: SafeAny, rawDate: SafeAny, bDate: dayjs.Dayjs): string | null {
  const targetTimeStr = booking.targetBookingTime || booking.target_booking_time;
  let rawTime =
    targetTimeStr ||
    booking.bookingTime ||
    booking.time ||
    (rawDate && String(rawDate).includes(' ') ? String(rawDate).split(' ')[1] : null);

  if (!rawTime && rawDate && String(rawDate).includes(':') && bDate.isValid()) {
    const formattedTime = bDate.format('HH:mm');
    if (formattedTime !== '00:00') {
      rawTime = formattedTime;
    }
  }

  if (rawTime && rawTime.includes(':')) {
    const parts = rawTime.split(':');
    rawTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return rawTime || null;
}
