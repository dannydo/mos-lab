import type { ComboDisplayInfo } from './types';

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'] as const;

const VALID_VISIT_STATES = new Set([
  'ServiceCompleted',
  'Completed',
  'CheckOut',
  'CheckIn',
  'ServiceStart',
  'ServiceEnd',
  'ServiceCleaned',
  'Consultation',
]);

export function isCompletedOrValidVisit(orderState: string): boolean {
  return VALID_VISIT_STATES.has(orderState) || orderState !== 'Cancelled';
}

function extractValidTechnicianName(booking: SafeAny): string | null {
  const name = booking.technicianName || booking.checkinStaffName || booking.checkoutStaffName;
  if (name && name !== 'Unknown' && name !== 'Kỹ thuật viên' && name !== 'Chuyên viên') {
    const trimmed = name.trim();
    if (!trimmed.includes('(Đã nghỉ)')) {
      return trimmed;
    }
  }
  return null;
}

function sortBookingsByDateDesc(bookingsList: SafeAny[]): SafeAny[] {
  return [...bookingsList].sort((a, b) => {
    const dateA = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
    const dateB = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
    return dateB - dateA;
  });
}

export function getMostFrequentDay(bookingsList: SafeAny[]): string {
  if (!bookingsList || bookingsList.length === 0) return 'N/A';
  const dayCounts = Array<number>(7).fill(0);

  bookingsList.forEach((b) => {
    if (b.bookingDate) {
      const day = new Date(b.bookingDate).getDay();
      dayCounts[day]++;
    }
  });

  let maxIndex = 0;
  let maxVal = 0;
  dayCounts.forEach((val, idx) => {
    if (val > maxVal) {
      maxVal = val;
      maxIndex = idx;
    }
  });

  return maxVal > 0 ? `${DAY_NAMES[maxIndex]} (${maxVal} lần)` : 'N/A';
}

export function getFavoriteTechnicians(bookingsList: SafeAny[]): string {
  if (!bookingsList || bookingsList.length === 0) return 'Chưa có';
  const techCounts: Record<string, number> = {};

  bookingsList.forEach((b) => {
    if (isCompletedOrValidVisit(b.orderState)) {
      const name = extractValidTechnicianName(b);
      if (name) {
        techCounts[name] = (techCounts[name] || 0) + 1;
      }
    }
  });

  const sortedTechs = Object.entries(techCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (sortedTechs.length === 0) return 'Chưa có';

  const top2 = sortedTechs.slice(0, 2);
  return top2.map((t) => `${t.name} (${t.count} lần)`).join(', ');
}

export function getFavoriteBranch(bookingsList: SafeAny[]): string {
  if (!bookingsList || bookingsList.length === 0) return 'N/A';
  const branchCounts: Record<string, number> = {};

  bookingsList.forEach((b) => {
    if (isCompletedOrValidVisit(b.orderState) && b.branchName) {
      const name = b.branchName.trim();
      branchCounts[name] = (branchCounts[name] || 0) + 1;
    }
  });

  const sortedBranches = Object.entries(branchCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (sortedBranches.length === 0) return 'N/A';
  return `${sortedBranches[0].name} (${sortedBranches[0].count} lần)`;
}

export function getRecentTechnician(bookingsList: SafeAny[]): string {
  if (!bookingsList || bookingsList.length === 0) return 'N/A';

  const sorted = sortBookingsByDateDesc(bookingsList);
  for (const b of sorted) {
    if (isCompletedOrValidVisit(b.orderState)) {
      const name = extractValidTechnicianName(b);
      if (name) return name;
    }
  }
  return 'N/A';
}

export function getFavoriteTimeSlot(bookingsList: SafeAny[]): string {
  if (!bookingsList || bookingsList.length === 0) return 'N/A';
  const hourCounts: Record<number, number> = {};

  bookingsList.forEach((b) => {
    if (isCompletedOrValidVisit(b.orderState) && b.bookingDate) {
      const hour = new Date(b.bookingDate).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });

  const sortedHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
    .sort((a, b) => b.count - a.count);

  if (sortedHours.length === 0) return 'N/A';
  const favoriteHour = sortedHours[0].hour;
  const startStr = favoriteHour < 10 ? `0${favoriteHour}:00` : `${favoriteHour}:00`;
  const endHour = (favoriteHour + 1) % 24;
  const endStr = endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;
  return `${startStr} - ${endStr} (${sortedHours[0].count} lần)`;
}

export function getRecentVisitTime(bookingsList: SafeAny[]): string {
  if (!bookingsList || bookingsList.length === 0) return 'N/A';

  const sorted = sortBookingsByDateDesc(bookingsList);
  for (const b of sorted) {
    if (isCompletedOrValidVisit(b.orderState) && b.bookingDate) {
      const date = new Date(b.bookingDate);
      const dayOfWeek = DAY_NAMES[date.getDay()];
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeStr = `${hours < 10 ? `0${hours}` : hours}:${minutes < 10 ? `0${minutes}` : minutes}`;
      return `${dayOfWeek} lúc ${timeStr}`;
    }
  }
  return 'N/A';
}

export function getComboDisplayInfo(
  serviceName: string,
  _normalCount: number,
  _retainCount: number,
  packageNormalCount?: number,
  packageKey?: string
): ComboDisplayInfo {
  const nameLower = (serviceName || '').toLowerCase();

  let totalNew: number | null = null;
  let totalRefill: number | null = null;

  if (packageKey) {
    const match = packageKey.match(/^(\d+)\+(\d+)/);
    if (match) {
      totalNew = parseInt(match[1], 10);
      totalRefill = parseInt(match[2], 10);
    }
  }

  const total = packageNormalCount && packageNormalCount > 0 ? packageNormalCount : null;
  if (totalNew === null && totalRefill === null) {
    if (nameLower.includes('refill')) {
      totalRefill = total;
      totalNew = 0;
    } else {
      totalNew = total;
      totalRefill = 0;
    }
  }

  if (totalNew === null) totalNew = nameLower.includes('new') ? 10 : 0;
  if (totalRefill === null) totalRefill = nameLower.includes('refill') ? 3 : 0;

  return {
    displayName: `${serviceName} ${packageKey ? `(${packageKey})` : ''}`,
    totalNew,
    totalRefill,
    total,
  };
}
