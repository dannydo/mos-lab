import { TelesaleTargetConfigDto } from '@mos-lab/shared';

export const TELESALE_CONFIG_KEY_PREFIX = 'TELESALE_TARGET_CONFIG_';

export const DEFAULT_OCTOBER_CONFIG: TelesaleTargetConfigDto = {
  month: '2026-10',
  teamDoneTarget: 450,
  teamBookTarget: 650,
  dailyDoneTarget: 18,
  dailyBookTarget: 25,
  dailyCallPerStaff: 83,
  dailyPickupPerStaff: 25,
  staffTargets: [
    { legacyStaffId: 50670, name: 'Phượng', doneTarget: 150 },
    { legacyStaffId: 52648, name: 'Kiều', doneTarget: 100 },
    { legacyStaffId: 32268, name: 'Điệp', doneTarget: 100 },
    { legacyStaffId: 52598, name: 'Vũ', doneTarget: 100 },
  ],
  stageTargets: {
    '0_30': 200,
    '31_60': 110,
    '61_120': 80,
    gt_120: 60,
  },
};

export interface FallbackStaffTargetItem {
  legacyStaffId: number;
  name: string;
  avatarUrl?: string | null;
}

export interface ActiveTelesaleStaffItem {
  crmStaffId: number;
  legacyStaffId: number;
  name: string;
  avatarUrl: string | null;
}

export type OverviewCacheInvalidator = (month?: string) => void;

export function getTelesaleConfigKey(month: string): string {
  return `${TELESALE_CONFIG_KEY_PREFIX}${month}`;
}

export function parseVietnamDateToIso(rawDate: unknown): string {
  if (!rawDate) return new Date().toISOString();
  if (typeof rawDate === 'string') {
    if (rawDate.includes('+') || rawDate.endsWith('Z')) {
      return new Date(rawDate).toISOString();
    }
    const formatted = rawDate.replace(' ', 'T');
    return new Date(`${formatted}+07:00`).toISOString();
  }
  if (rawDate instanceof Date) {
    const isoWithoutZ = rawDate
      .toISOString()
      .replace(/\.\d{3}Z$/, '')
      .replace(/Z$/, '');
    return new Date(`${isoWithoutZ}+07:00`).toISOString();
  }
  return new Date().toISOString();
}

export function formatVietnamTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}
