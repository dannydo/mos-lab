import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { shouldMaskCustomerPhone, type Staff } from '@mos-lab/shared';
import { CUSTOMER_AVATAR_BG_CLASSES, EXCLUDED_ACTIVITY_STAFF_ROLES } from './activityTabConstants';
import type { LocaActivityViewMode, SelectOptionItem } from './types';

dayjs.extend(isoWeek);

export function formatActivityPeriodLabel(viewMode: LocaActivityViewMode, referenceDate: dayjs.Dayjs): string {
  if (viewMode === 'month') {
    return `Tháng ${referenceDate.format('MM/YYYY')}`;
  }
  if (viewMode === 'week') {
    const start = referenceDate.startOf('isoWeek').format('DD/MM');
    const end = referenceDate.endOf('isoWeek').format('DD/MM/YYYY');
    return `${start} - ${end}`;
  }
  return referenceDate.format('DD/MM/YYYY');
}

export function buildActivityStaffSelectOptions(staffList: Staff[]): SelectOptionItem[] {
  return [
    { value: 'ALL', label: 'Tất cả Nhân sự CS' },
    ...staffList
      .filter((staff) => !EXCLUDED_ACTIVITY_STAFF_ROLES.has((staff.role || '').toLowerCase()))
      .map((staff) => ({
        value: String(staff.id),
        label: staff.displayName || staff.username,
      })),
  ];
}

export function getCustomerAvatarMeta(customerName?: string | null): {
  rawName: string;
  firstLetter: string;
  bgClass: string;
} {
  const rawName = (customerName || 'Khách hàng').trim();
  const firstLetter = rawName.charAt(0).toUpperCase();
  const colorIndex = firstLetter ? firstLetter.charCodeAt(0) % CUSTOMER_AVATAR_BG_CLASSES.length : 0;
  return {
    rawName,
    firstLetter,
    bgClass: CUSTOMER_AVATAR_BG_CLASSES[colorIndex],
  };
}

export function isPhoneMaskedForCurrentUser(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const rawUser = window.localStorage.getItem('mos_user');
    const parsedUser = rawUser ? JSON.parse(rawUser) : {};
    return shouldMaskCustomerPhone(parsedUser?.role);
  } catch {
    return true;
  }
}

export function formatCallDurationLabel(durationSec: number): string {
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  return `${mins}m ${secs}s`;
}

export function formatActiveFilterSummary(actionTypeFilter: string, selectedTouchpointKey?: string): string {
  const actionLabel =
    actionTypeFilter !== 'ALL'
      ? actionTypeFilter === 'CALL'
        ? '📞 Cuộc gọi'
        : actionTypeFilter === 'TOUCHPOINT'
          ? '✅ Điểm chạm'
          : '📅 Đặt lịch'
      : '';

  const touchpointLabel =
    selectedTouchpointKey && selectedTouchpointKey !== 'ALL'
      ? selectedTouchpointKey === '30plus'
        ? 'Chạm 30+'
        : selectedTouchpointKey === '24h'
          ? '24h'
          : `Chạm ${selectedTouchpointKey}`
      : '';

  if (actionLabel && touchpointLabel) {
    return `${actionLabel} + ${touchpointLabel}`;
  }
  return `${actionLabel}${touchpointLabel}`;
}
