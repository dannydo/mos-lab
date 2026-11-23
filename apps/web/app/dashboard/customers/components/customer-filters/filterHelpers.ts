import type { CustomerFiltersProps } from './types';

export function buildCustomerFilterParams(props: {
  daysSinceLastVisitMin: number | undefined;
  daysSinceLastVisitMax: number | undefined;
  totalSpentMin: number | undefined;
  totalSpentMax: number | undefined;
  totalVisitsMin: number | undefined;
  totalVisitsMax: number | undefined;
  serviceIds: number[];
  serviceCategories: string[];
  serviceVisitCountMin: number | undefined;
  serviceVisitCountMax: number | undefined;
  promoUsed: 'yes' | 'no' | 'all';
  promoCountMin: number | undefined;
  promoCountMax: number | undefined;
  referralUsed: 'yes' | 'no' | 'all';
  referralCountMin: number | undefined;
  referralCountMax: number | undefined;
  callStatuses: string[];
  lastCallDaysMin: number | undefined;
  lastCallDaysMax: number | undefined;
  assignedStaffId: string;
  assignedDaysMin: number | undefined;
  assignedDaysMax: number | undefined;
  retainedOnly: boolean | undefined;
  dobMonth: number | string | undefined;
  birthdayPreset: 'today' | 'this_month' | 'next_month' | undefined;
  ageMin: number | undefined;
  ageMax: number | undefined;
  isForeignFilter?: 'all' | 'foreign' | 'local';
  campaignId: number | undefined;
  campaignFilterMode: 'ALL' | 'IN' | 'NOT_IN';
}) {
  return {
    daysSinceLastVisitMin: props.daysSinceLastVisitMin,
    daysSinceLastVisitMax: props.daysSinceLastVisitMax,
    totalSpentMin: props.totalSpentMin,
    totalSpentMax: props.totalSpentMax,
    totalVisitsMin: props.totalVisitsMin,
    totalVisitsMax: props.totalVisitsMax,
    serviceIds: props.serviceIds.length > 0 ? props.serviceIds.join(',') : undefined,
    serviceCategories: props.serviceCategories.length > 0 ? props.serviceCategories.join(',') : undefined,
    serviceVisitCountMin: props.serviceVisitCountMin,
    serviceVisitCountMax: props.serviceVisitCountMax,
    promoUsed: props.promoUsed,
    promoCountMin: props.promoCountMin,
    promoCountMax: props.promoCountMax,
    referralUsed: props.referralUsed,
    referralCountMin: props.referralCountMin,
    referralCountMax: props.referralCountMax,
    callStatuses: props.callStatuses.length > 0 ? props.callStatuses.join(',') : undefined,
    lastCallDaysMin: props.lastCallDaysMin,
    lastCallDaysMax: props.lastCallDaysMax,
    assignedStaffId: props.assignedStaffId,
    assignedDaysMin: props.assignedDaysMin,
    assignedDaysMax: props.assignedDaysMax,
    retainedOnly: props.retainedOnly ? 'true' : undefined,
    dobMonth: props.dobMonth,
    birthdayPreset: props.birthdayPreset,
    ageMin: props.ageMin,
    ageMax: props.ageMax,
    isForeign: props.isForeignFilter && props.isForeignFilter !== 'all' ? props.isForeignFilter : undefined,
    campaignId: props.campaignId,
    campaignFilterMode: props.campaignFilterMode,
  };
}

export function countActiveCustomerFilters(props: {
  daysSinceLastVisitMin: number | undefined;
  daysSinceLastVisitMax: number | undefined;
  totalSpentMin: number | undefined;
  totalSpentMax: number | undefined;
  totalVisitsMin: number | undefined;
  totalVisitsMax: number | undefined;
  serviceIds: number[];
  serviceCategories: string[];
  serviceVisitCountMin: number | undefined;
  serviceVisitCountMax: number | undefined;
  promoUsed: 'yes' | 'no' | 'all';
  promoCountMin: number | undefined;
  promoCountMax: number | undefined;
  referralUsed: 'yes' | 'no' | 'all';
  referralCountMin: number | undefined;
  referralCountMax: number | undefined;
  callStatuses?: string[];
  lastCallDaysMin?: number | undefined;
  lastCallDaysMax?: number | undefined;
  assignedStaffId: string;
  userRole: string | undefined;
  assignedDaysMin: number | undefined;
  assignedDaysMax: number | undefined;
  retainedOnly: boolean | undefined;
  dobMonth: number | string | undefined;
  birthdayPreset: 'today' | 'this_month' | 'next_month' | undefined;
  ageMin: number | undefined;
  ageMax: number | undefined;
  isForeignFilter?: 'all' | 'foreign' | 'local';
  campaignId?: number | undefined;
}): number {
  let count = 0;
  if (props.daysSinceLastVisitMin !== undefined || props.daysSinceLastVisitMax !== undefined) count++;
  if (props.totalSpentMin !== undefined || props.totalSpentMax !== undefined) count++;
  if (props.totalVisitsMin !== undefined || props.totalVisitsMax !== undefined) count++;
  if (
    props.serviceIds.length > 0 ||
    props.serviceCategories.length > 0 ||
    props.serviceVisitCountMin !== undefined ||
    props.serviceVisitCountMax !== undefined
  ) {
    count++;
  }
  if (props.promoUsed !== 'all' || props.promoCountMin !== undefined || props.promoCountMax !== undefined) count++;
  if (props.referralUsed !== 'all' || props.referralCountMin !== undefined || props.referralCountMax !== undefined) {
    count++;
  }
  if (props.callStatuses && props.callStatuses.length > 0) count++;
  if (props.lastCallDaysMin !== undefined || props.lastCallDaysMax !== undefined) count++;
  if (props.assignedStaffId && props.assignedStaffId !== (props.userRole === 'telesales' ? 'me' : 'all')) count++;
  if (props.assignedDaysMin !== undefined || props.assignedDaysMax !== undefined) count++;
  if (props.retainedOnly) count++;
  if (props.dobMonth !== undefined || props.birthdayPreset !== undefined) count++;
  if (props.ageMin !== undefined || props.ageMax !== undefined) count++;
  if (props.isForeignFilter && props.isForeignFilter !== 'all') count++;
  if (props.campaignId !== undefined) count++;
  return count;
}

export type ClearSingleFilterHandlers = Pick<
  CustomerFiltersProps,
  | 'currentUser'
  | 'serviceIds'
  | 'serviceCategories'
  | 'setCampaignId'
  | 'setCampaignFilterMode'
  | 'setDaysSinceLastVisitMin'
  | 'setDaysSinceLastVisitMax'
  | 'setTotalSpentMin'
  | 'setTotalSpentMax'
  | 'setTotalVisitsMin'
  | 'setTotalVisitsMax'
  | 'setServiceIds'
  | 'setServiceCategories'
  | 'setServiceVisitCountMin'
  | 'setServiceVisitCountMax'
  | 'setPromoUsed'
  | 'setPromoCountMin'
  | 'setPromoCountMax'
  | 'setReferralUsed'
  | 'setReferralCountMin'
  | 'setReferralCountMax'
  | 'setAssignedStaffId'
  | 'setAssignedDaysMin'
  | 'setAssignedDaysMax'
  | 'setRetainedOnly'
  | 'setDobMonth'
  | 'setBirthdayPreset'
  | 'setAgeMin'
  | 'setAgeMax'
  | 'setIsForeignFilter'
  | 'setCallStatuses'
  | 'setLastCallDaysMin'
  | 'setLastCallDaysMax'
  | 'setActiveFilterId'
>;

export function clearSingleCustomerFilter(key: string, handlers: ClearSingleFilterHandlers): void {
  switch (key) {
    case 'campaignId':
      handlers.setCampaignId?.(undefined);
      handlers.setCampaignFilterMode?.('ALL');
      break;
    case 'daysSinceLastVisitMin':
      handlers.setDaysSinceLastVisitMin(undefined);
      break;
    case 'daysSinceLastVisitMax':
      handlers.setDaysSinceLastVisitMax(undefined);
      break;
    case 'totalSpentMin':
      handlers.setTotalSpentMin(undefined);
      break;
    case 'totalSpentMax':
      handlers.setTotalSpentMax(undefined);
      break;
    case 'totalVisitsMin':
      handlers.setTotalVisitsMin(undefined);
      break;
    case 'totalVisitsMax':
      handlers.setTotalVisitsMax(undefined);
      break;
    case 'serviceIds':
      handlers.setServiceIds([]);
      if (handlers.serviceCategories.length === 0) {
        handlers.setServiceVisitCountMin(undefined);
        handlers.setServiceVisitCountMax(undefined);
      }
      break;
    case 'serviceCategories':
      handlers.setServiceCategories([]);
      if (handlers.serviceIds.length === 0) {
        handlers.setServiceVisitCountMin(undefined);
        handlers.setServiceVisitCountMax(undefined);
      }
      break;
    case 'serviceUsage':
      handlers.setServiceVisitCountMin(undefined);
      handlers.setServiceVisitCountMax(undefined);
      break;
    case 'serviceVisitCountMin':
      handlers.setServiceVisitCountMin(undefined);
      break;
    case 'serviceVisitCountMax':
      handlers.setServiceVisitCountMax(undefined);
      break;
    case 'promoUsed':
      handlers.setPromoUsed('all');
      break;
    case 'promoCountMin':
      handlers.setPromoCountMin(undefined);
      break;
    case 'promoCountMax':
      handlers.setPromoCountMax(undefined);
      break;
    case 'referralUsed':
      handlers.setReferralUsed('all');
      break;
    case 'referralCountMin':
      handlers.setReferralCountMin(undefined);
      break;
    case 'referralCountMax':
      handlers.setReferralCountMax(undefined);
      break;
    case 'assignedStaffId':
      handlers.setAssignedStaffId(handlers.currentUser?.role === 'telesales' ? 'me' : 'all');
      break;
    case 'assignedDaysMin':
      handlers.setAssignedDaysMin?.(undefined);
      break;
    case 'assignedDaysMax':
      handlers.setAssignedDaysMax?.(undefined);
      break;
    case 'retainedOnly':
      handlers.setRetainedOnly?.(false);
      break;
    case 'dobMonth':
      handlers.setDobMonth?.(undefined);
      break;
    case 'birthdayPreset':
      handlers.setBirthdayPreset?.(undefined);
      break;
    case 'ageMin':
      handlers.setAgeMin?.(undefined);
      break;
    case 'ageMax':
      handlers.setAgeMax?.(undefined);
      break;
    case 'isForeign':
      handlers.setIsForeignFilter?.('all');
      break;
    case 'callStatuses':
      handlers.setCallStatuses?.([]);
      break;
    case 'lastCallDaysMin':
      handlers.setLastCallDaysMin?.(undefined);
      break;
    case 'lastCallDaysMax':
      handlers.setLastCallDaysMax?.(undefined);
      break;
  }
  handlers.setActiveFilterId(null);
}

export function formatVndInput(value: SafeAny): string {
  return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function parseVndInput(value: SafeAny): number {
  return value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0;
}
