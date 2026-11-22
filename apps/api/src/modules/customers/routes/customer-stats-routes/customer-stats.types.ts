import { BucketType } from '@mos-lab/shared';

export interface CustomerStatsUser {
  id: number;
  role: string;
}

export interface CustomerStatsQuery {
  bucket?: BucketType | 'ALL' | 'NOT_COMBO_LIVE' | 'NEW_LOCA';
  search?: string;
  ids?: string;
  daysSinceLastVisitMin?: string;
  daysSinceLastVisitMax?: string;
  totalSpentMin?: string;
  totalSpentMax?: string;
  totalVisitsMin?: string;
  totalVisitsMax?: string;
  serviceIds?: string;
  serviceVisitCountMin?: string;
  serviceVisitCountMax?: string;
  promoUsed?: 'yes' | 'no' | 'all';
  promoCountMin?: string;
  promoCountMax?: string;
  referralUsed?: 'yes' | 'no' | 'all';
  referralCountMin?: string;
  referralCountMax?: string;
  assignedStaffId?: string;
  assignedDaysMin?: string;
  assignedDaysMax?: string;
  trash?: string;
  hsd30?: string;
  lsd1?: string;
  hasProduct?: string;
  contacted?: string;
  contactType?: string;
  hasCallback?: string;
  hasFutureBooking?: string;
  dateFrom?: string;
  dateTo?: string;
  retainedOnly?: string;
  allocationBatchId?: string;
  dobMonth?: string;
  birthdayPreset?: 'today' | 'this_month' | 'next_month';
  ageMin?: string;
  ageMax?: string;
  callStatuses?: string;
  lastCallDaysMin?: string;
  lastCallDaysMax?: string;
  isForeign?: 'all' | 'foreign' | 'local' | string | boolean;
  campaignId?: string;
  campaignFilterMode?: 'ALL' | 'IN' | 'NOT_IN' | 'all' | 'in' | 'not_in' | string;
}

export interface CustomerStatsResult {
  total: number;
  comboLive: number;
  comboDead: number;
  single: number;
  comboElsa: number;
  notComboLive: number;
  hsd30: number;
  lsd1: number;
}

export interface CampaignStatsResult {
  tabs: Record<string, number>;
  touchpoints: Record<string, number>;
}

export interface CustomerStatsLiveUsbInfo {
  normalTotal: number;
  expiryDaysDiff: number | null;
}

export interface TouchpointConfigItem {
  key: string;
  daysMin?: number;
  daysMax?: number;
}

export const createEmptyCustomerStats = (): CustomerStatsResult => ({
  total: 0,
  comboLive: 0,
  comboDead: 0,
  single: 0,
  comboElsa: 0,
  notComboLive: 0,
  hsd30: 0,
  lsd1: 0,
});

export const DEFAULT_LOCA_TOUCHPOINTS: readonly TouchpointConfigItem[] = [
  { key: 'now', daysMin: 1, daysMax: 1 },
  { key: '17', daysMin: 17, daysMax: 17 },
  { key: '19', daysMin: 19, daysMax: 19 },
  { key: '21', daysMin: 21, daysMax: 21 },
  { key: '23', daysMin: 23, daysMax: 23 },
  { key: '25', daysMin: 25, daysMax: 25 },
  { key: '30', daysMin: 30, daysMax: 30 },
  { key: '35', daysMin: 35, daysMax: 35 },
  { key: '40', daysMin: 40, daysMax: 40 },
  { key: '45', daysMin: 45, daysMax: 45 },
  { key: '50', daysMin: 50, daysMax: 50 },
  { key: '55', daysMin: 55, daysMax: 55 },
  { key: '60', daysMin: 60, daysMax: 60 },
];

export const DEFAULT_NYC_TOUCHPOINTS_CONFIG: Readonly<Record<string, readonly TouchpointConfigItem[]>> = {
  NYC_30: [
    { key: 'now', daysMin: 0, daysMax: 1 },
    { key: '3', daysMin: 2, daysMax: 3 },
    { key: '7', daysMin: 14, daysMax: 14 },
    { key: '17', daysMin: 19, daysMax: 19 },
    { key: '21', daysMin: 21, daysMax: 21 },
  ],
  NYC_60: [
    { key: '35', daysMin: 31, daysMax: 35 },
    { key: '45', daysMin: 41, daysMax: 45 },
    { key: '55', daysMin: 51, daysMax: 55 },
  ],
  NYC_90: [
    { key: '70', daysMin: 65, daysMax: 70 },
    { key: '80', daysMin: 75, daysMax: 80 },
  ],
  NYC_180: [
    { key: '100', daysMin: 95, daysMax: 100 },
    { key: '150', daysMin: 145, daysMax: 150 },
  ],
  NYC_365: [
    { key: '200', daysMin: 195, daysMax: 200 },
    { key: '300', daysMin: 295, daysMax: 300 },
  ],
  NYC_365plus: [
    { key: '400', daysMin: 395, daysMax: 400 },
    { key: '500', daysMin: 495, daysMax: 500 },
  ],
};
