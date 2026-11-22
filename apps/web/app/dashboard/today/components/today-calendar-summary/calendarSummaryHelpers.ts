import { shouldMaskCustomerPhone } from '@mos-lab/shared';
import type { BookingData, ComingClientData } from '../../hooks/useTodayData';
import { type BookerTeamConfig, DEFAULT_BOOKER_TEAMS } from '../BookerTeamConfigModal';
import { AVATAR_BG_CLASSES, CALENDAR_HOURS } from './calendarSummaryConstants';
import type {
  BookerOptionGroup,
  BookerOptionItem,
  BranchHourlyBreakdown,
  CalendarBranchFilter,
  CalendarSlotItems,
  HourlyCalendarBucket,
  SelectedCalendarSlot,
} from './types';

export function readIsMaskedPhoneRole(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      const user = JSON.parse(stored);
      return shouldMaskCustomerPhone(user?.role);
    }
  } catch {
    return false;
  }
  return false;
}

export function matchesBookerFilter(
  bookerName: string | undefined,
  filter: string | null,
  teamConfig?: BookerTeamConfig
): boolean {
  if (!filter || filter === 'all') return true;
  const name = (bookerName || '').trim().toLowerCase();
  if (!name) return false;

  const currentConfig = teamConfig && Object.keys(teamConfig).length > 0 ? teamConfig : DEFAULT_BOOKER_TEAMS;

  if (filter === 'team:telesales') {
    return (currentConfig.telesales || []).some((n) => n.trim().toLowerCase() === name);
  }
  if (filter === 'team:control_cs') {
    return (currentConfig.control_cs || []).some((n) => n.trim().toLowerCase() === name);
  }
  if (filter === 'team:other') {
    return (currentConfig.other || []).some((n) => n.trim().toLowerCase() === name);
  }

  return name === filter.trim().toLowerCase();
}

export function buildBookerOptions(allBookings: BookingData[], allComingList: ComingClientData[]): BookerOptionItem[] {
  const set = new Set<string>();
  allBookings.forEach((b) => {
    if (b.booker) set.add(b.booker);
  });
  allComingList.forEach((c) => {
    if (c.booker) set.add(c.booker);
  });
  return Array.from(set).map((name) => ({ value: name, label: name }));
}

export function buildGroupedBookerOptions(bookerOptions: BookerOptionItem[]): BookerOptionGroup[] {
  return [
    { value: 'all', label: 'Tất cả Đội Nhóm & Booker' },
    {
      label: '🛡️ Lọc Theo Đội Nhóm',
      options: [
        { value: 'team:telesales', label: '🛡️ Đội Telesales' },
        { value: 'team:control_cs', label: '🎧 Control / CS' },
        { value: 'team:other', label: '🌐 Khác (Web/Direct)' },
      ],
    },
    {
      label: '👤 Lọc Theo Cá Nhân Booker',
      options: bookerOptions,
    },
  ];
}

export function filterCalendarBookings(
  allBookings: BookingData[],
  bookingBranch: CalendarBranchFilter,
  selectedBooker: string | null,
  teamConfig?: BookerTeamConfig
): BookingData[] {
  return (allBookings || []).filter((b) => {
    if (bookingBranch !== 'all') {
      if (bookingBranch === 'detham' && b.branchName !== 'Đề Thám') return false;
      if (bookingBranch === 'estella' && b.branchName !== 'Estella') return false;
    }
    return matchesBookerFilter(b.booker, selectedBooker, teamConfig);
  });
}

export function filterCalendarComingList(
  allComingList: ComingClientData[],
  bookingBranch: CalendarBranchFilter,
  selectedBooker: string | null,
  teamConfig?: BookerTeamConfig
): ComingClientData[] {
  return (allComingList || []).filter((item) => {
    if (bookingBranch !== 'all' && item.branchKey !== bookingBranch) {
      return false;
    }
    return matchesBookerFilter(item.booker, selectedBooker, teamConfig);
  });
}

export function computeCalendarSummaryTotals(filteredBookings: BookingData[], filteredComingList: ComingClientData[]) {
  const totalCreated = filteredBookings.length;
  const totalScheduled = filteredComingList.length;
  const totalDone = filteredComingList.filter((c) => ['completed', 'serving', 'arrived'].includes(c.status)).length;
  const totalMissed = filteredComingList.filter((c) => c.status === 'late').length;
  const completionRate = totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0;
  const missedRate = totalScheduled > 0 ? Math.round((totalMissed / totalScheduled) * 100) : 0;

  return {
    totalCreated,
    totalScheduled,
    totalDone,
    totalMissed,
    completionRate,
    missedRate,
  };
}

export function buildHourlyCalendarData(
  filteredBookings: BookingData[],
  filteredComingList: ComingClientData[]
): HourlyCalendarBucket[] {
  return CALENDAR_HOURS.map((hour) => {
    const hNum = parseInt(hour.split(':')[0], 10);

    const createdItems = filteredBookings.filter((b) => {
      if (!b.createdTime) return false;
      const timePart = b.createdTime.split(' ')[0];
      const itemHour = parseInt(timePart.split(':')[0], 10);
      return itemHour === hNum;
    });

    const scheduledItems = filteredComingList.filter((c) => {
      if (!c.time) return false;
      const itemHour = parseInt(c.time.split(':')[0], 10);
      return itemHour === hNum;
    });

    const missedItems = scheduledItems.filter((c) => c.status === 'late');
    const doneItems = scheduledItems.filter((c) => ['completed', 'serving', 'arrived'].includes(c.status));

    const branchBreakdown: Record<string, BranchHourlyBreakdown> = {
      detham: { created: 0, scheduled: 0, missed: 0, done: 0 },
      estella: { created: 0, scheduled: 0, missed: 0, done: 0 },
    };

    createdItems.forEach((b) => {
      const key = b.branchName === 'Estella' ? 'estella' : 'detham';
      if (branchBreakdown[key]) branchBreakdown[key].created++;
    });

    scheduledItems.forEach((c) => {
      const key = c.branchKey || 'detham';
      if (branchBreakdown[key]) {
        branchBreakdown[key].scheduled++;
        if (c.status === 'late') branchBreakdown[key].missed++;
        if (['completed', 'serving', 'arrived'].includes(c.status)) branchBreakdown[key].done++;
      }
    });

    return {
      hour,
      hNum,
      created: createdItems.length,
      scheduled: scheduledItems.length,
      missed: missedItems.length,
      done: doneItems.length,
      createdItems,
      scheduledItems,
      missedItems,
      doneItems,
      branchBreakdown,
    };
  });
}

export function computeMaxHourlyValue(hourlyData: HourlyCalendarBucket[]): number {
  let max = 1;
  hourlyData.forEach((d) => {
    const highest = Math.max(d.created, d.scheduled, d.missed, d.done);
    if (highest > max) max = highest;
  });
  return max;
}

export function computeModalSlotItems(
  selectedSlot: SelectedCalendarSlot | null,
  hourlyData: HourlyCalendarBucket[]
): CalendarSlotItems {
  if (!selectedSlot) return { created: [], scheduled: [], missed: [], done: [] };

  const targetHourData = hourlyData.find((d) => d.hour === selectedSlot.hour);
  if (!targetHourData) return { created: [], scheduled: [], missed: [], done: [] };

  let created = targetHourData.createdItems;
  let scheduled = targetHourData.scheduledItems;
  let missed = targetHourData.missedItems;
  let done = targetHourData.doneItems;

  if (selectedSlot.branchKey) {
    created = created.filter((b) => {
      if (selectedSlot.branchKey === 'detham') return b.branchName === 'Đề Thám';
      if (selectedSlot.branchKey === 'estella') return b.branchName === 'Estella';
      return true;
    });
    scheduled = scheduled.filter((c) => c.branchKey === selectedSlot.branchKey);
    missed = missed.filter((c) => c.branchKey === selectedSlot.branchKey);
    done = done.filter((c) => c.branchKey === selectedSlot.branchKey);
  }

  return { created, scheduled, missed, done };
}

export function getCustomerAvatarBgClass(seed?: string): string {
  const input = seed || 'K';
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return AVATAR_BG_CLASSES[hash % AVATAR_BG_CLASSES.length];
}
