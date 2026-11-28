import {
  filterBookingsForCvlScope,
  IosBookingItem,
  IosBookingStatus,
  IosSegmentCounts,
  maskPhoneNumber,
} from '@mos-lab/shared';

export { computeBookingFinancials } from './formatters/booking-financials.helper.js';
export {
  buildCanonicalServiceNameFromSpecs,
  buildDefaultLiveOrderAttributes,
  hydrateSavedNaturalLashAttributes,
  normalizeLashMaterialLabel,
  resolveCanonicalBookedServicePrice,
  stripNewLashLabel,
} from './formatters/booking-attributes.helper.js';

export function resolveCustomerAvatar(dbAvatar: string | null | undefined, userId?: number): string | undefined {
  if (!dbAvatar) return undefined;
  const trimmed = String(dbAvatar).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com\//, 'https://cdn.wingslashes.com/');
  }
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  if (userId) {
    return `https://cdn.wingslashes.com/uploads/user/avatar/${userId}/thumbnail/${trimmed}`;
  }
  return undefined;
}

export function resolveStaffAvatar(dbAvatar: string | null | undefined): string | undefined {
  if (!dbAvatar || typeof dbAvatar !== 'string') return undefined;
  const trimmed = dbAvatar.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com\//, 'https://cdn.wingslashes.com/');
  }
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  return undefined;
}

export function formatTime12h(dateStart: Date | string | null): string {
  if (!dateStart) return '09:00 am';
  const start = new Date(dateStart);
  if (Number.isNaN(start.getTime())) return '09:00 am';

  let hours = start.getHours();
  const minutes = start.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours || 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export function formatTimeSlot(dateStart: Date | string | null, durationMinutes: number): string {
  if (!dateStart) return '09:00 - 10:30';
  const start = new Date(dateStart);
  if (Number.isNaN(start.getTime())) return '09:00 - 10:30';

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

export function formatPhoneNumberDots(phone: string | null | undefined, isMasked: boolean = false): string {
  if (!phone) return isMasked ? '**** ******' : '0901.xxx.xxx';
  if (isMasked) {
    return maskPhoneNumber(phone);
  }
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)}.${cleaned.slice(4, 7)}.${cleaned.slice(7)}`;
  }
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 5)}.${cleaned.slice(5, 8)}.${cleaned.slice(8)}`;
  }
  return phone;
}

export function resolveBookingStatusFromState(
  overrideStatus: IosBookingStatus | undefined,
  state: string | null | undefined,
  targetDate: string,
  todayVn: string
): IosBookingStatus {
  if (overrideStatus) {
    return overrideStatus;
  }
  if (state === 'Parking' || state === 'CheckIn' || state === 'Check-in' || state === 'Consultation') {
    return 'CHECKED_IN';
  }
  if (
    [
      'Preparation',
      'ServiceStart',
      'Service Start',
      'ServiceCleaned',
      'Service Cleaned',
      'ServiceEnd',
      'Service End',
      'ServiceCompleted',
      'Service Completed',
      'In-progress',
    ].includes(String(state || ''))
  ) {
    return 'SERVICING';
  }
  if (['Completed', 'CheckOut', 'Check-out'].includes(String(state || ''))) {
    return 'DONE';
  }
  if (['Cancelled', 'Missed'].includes(String(state || ''))) {
    return 'CANCELLED';
  }
  if (targetDate < todayVn && (state === 'New' || state === 'Confirmed')) {
    return 'DONE';
  }
  return 'INCOMING';
}

export function applyIosScopeAndCounts(
  allBookings: IosBookingItem[],
  params: {
    effectiveRole: string;
    scope: string;
    activeStaffId: number;
    storeId?: number;
    targetDate?: string;
    todayVn?: string;
    menteeStaffIds?: number[];
  }
): { effectiveList: IosBookingItem[]; counts: IosSegmentCounts } {
  const { effectiveRole, scope, activeStaffId, storeId, targetDate, todayVn, menteeStaffIds } = params;
  const shouldApplyCvlPrivacyScope =
    effectiveRole === 'CVL' || (effectiveRole !== 'CC' && effectiveRole !== 'STORE' && scope === 'MY_CUSTOMERS');
  const branchFiltered =
    storeId && storeId > 0 && (effectiveRole === 'CVL' || shouldApplyCvlPrivacyScope)
      ? allBookings.filter((b) => !b.storeId || Number(b.storeId) === Number(storeId))
      : allBookings;
  const effectiveList = shouldApplyCvlPrivacyScope
    ? filterBookingsForCvlScope(branchFiltered, activeStaffId, { targetDate, todayVn, menteeStaffIds })
    : branchFiltered;

  const counts: IosSegmentCounts = {
    incoming: effectiveList.filter((b) => b.status === 'INCOMING').length,
    servicing: effectiveList.filter((b) => b.status === 'SERVICING' || b.status === 'CHECKED_IN').length,
    done: effectiveList.filter((b) => b.status === 'DONE').length,
    cancel: effectiveList.filter((b) => b.status === 'CANCELLED').length,
  };

  return { effectiveList, counts };
}
