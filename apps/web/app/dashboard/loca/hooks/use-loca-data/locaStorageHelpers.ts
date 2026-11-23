import type dayjs from 'dayjs';
import type { Customer, Staff } from '@mos-lab/shared';
import { DEFAULT_CUSTOM_TOUCHPOINTS, TAB_KEYS } from './constants';
import type { CustomTouchpoint, LocaDatePreset } from './types';

export function readStoredCurrentUser(): Staff | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('mos_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse user from localStorage', e);
    return null;
  }
}

export function readInitialActiveTab(): string {
  if (typeof window === 'undefined') return 'LOCA_ALL';
  const urlParams = new URLSearchParams(window.location.search);
  const urlTab = urlParams.get('tab') || urlParams.get('activeTab');
  const savedTab = urlTab || localStorage.getItem('mos_loca_activeTab');
  if (savedTab && TAB_KEYS.some((t) => t.id === savedTab)) {
    return savedTab;
  }
  return 'LOCA_ALL';
}

function parseCustomTouchpointParam(str: string | null, defMin: number, defMax: number, key: string): CustomTouchpoint {
  if (!str) return { key, daysMin: defMin, daysMax: defMax };
  const parts = str.split('-').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { key, daysMin: parts[0], daysMax: parts[1] };
  }
  return { key, daysMin: defMin, daysMax: defMax };
}

export function readInitialCustomTouchpoints(): CustomTouchpoint[] {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_TOUCHPOINTS;
  const urlParams = new URLSearchParams(window.location.search);
  const urlCtp0 = urlParams.get('ctp0');
  const urlCtp1 = urlParams.get('ctp1');
  const urlCtp2 = urlParams.get('ctp2');
  if (urlCtp0 || urlCtp1 || urlCtp2) {
    return [
      parseCustomTouchpointParam(urlCtp0, 31, 35, 'CUSTOM_0'),
      parseCustomTouchpointParam(urlCtp1, 36, 40, 'CUSTOM_1'),
      parseCustomTouchpointParam(urlCtp2, 41, 45, 'CUSTOM_2'),
    ];
  }
  const saved = localStorage.getItem('mos_loca_custom_touchpoints');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse custom touchpoints:', e);
    }
  }
  return DEFAULT_CUSTOM_TOUCHPOINTS;
}

export function readInitialActiveTouchpointKey(): string {
  if (typeof window === 'undefined') return 'ALL';
  const urlParams = new URLSearchParams(window.location.search);
  const urlTp = urlParams.get('touchpoint') || urlParams.get('activeTouchpointKey');
  const savedTp = urlTp || localStorage.getItem('mos_loca_activeTouchpointKey');
  return savedTp || 'ALL';
}

export function readInitialPageSize(): number {
  if (typeof window === 'undefined') return 20;
  const savedPageSize = localStorage.getItem('mos_loca_pageSize');
  if (savedPageSize) return Number(savedPageSize);
  return 20;
}

export function readUrlOrStorageString(urlParamKeys: string[], storageKey: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const urlParams = new URLSearchParams(window.location.search);
  for (const paramKey of urlParamKeys) {
    const urlValue = urlParams.get(paramKey);
    if (urlValue) return urlValue;
  }
  const savedValue = localStorage.getItem(storageKey);
  return savedValue || fallback;
}

export function readUrlOrStorageNumber(urlParamKey: string, storageKey: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const urlParams = new URLSearchParams(window.location.search);
  const urlValue = urlParams.get(urlParamKey);
  const savedValue = urlValue || localStorage.getItem(storageKey);
  if (savedValue && !isNaN(Number(savedValue))) {
    return Number(savedValue);
  }
  return fallback;
}

export function updateUrlSearchParams(updates: Record<string, string | null>): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  }
  window.history.replaceState(null, '', url.pathname + url.search);
}

export function computeLocaDateRange(
  datePreset: LocaDatePreset,
  selectedDate: dayjs.Dayjs
): { dateFrom: string; dateTo: string } {
  if (datePreset === 'month') {
    return {
      dateFrom: selectedDate.startOf('month').format('YYYY-MM-DD 00:00:00'),
      dateTo: selectedDate.endOf('month').format('YYYY-MM-DD 23:59:59'),
    };
  }
  if (datePreset === 'week') {
    return {
      dateFrom: selectedDate.startOf('isoWeek').format('YYYY-MM-DD 00:00:00'),
      dateTo: selectedDate.endOf('isoWeek').format('YYYY-MM-DD 23:59:59'),
    };
  }
  return {
    dateFrom: selectedDate.format('YYYY-MM-DD 00:00:00'),
    dateTo: selectedDate.format('YYYY-MM-DD 23:59:59'),
  };
}

export function resolveLocaRowClassName(record: Customer, themeMode: string): string {
  const hasCallback = record.callbackDate
    ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
    : false;
  if (hasCallback) {
    return themeMode === 'dark' ? 'row-hope-dark' : 'row-hope-light';
  }

  const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
  if (isBookingInFuture) {
    const state = record.lastBookingState;
    const isBooked = state === 'New' || state === 'Confirmed';
    if (isBooked) {
      return themeMode === 'dark' ? 'row-booked-future-dark' : 'row-booked-future-light';
    }
  }

  return '';
}
