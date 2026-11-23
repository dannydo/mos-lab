import type {
  CustomerFilterCriteria,
  CustomerFilterParams,
  CustomerFilterParamsInput,
  CustomerFilterSummaryInput,
  CustomerFilterSummarySourceType,
  CustomerSavedFilterCriteria,
} from './types';

/** Normalizes mixed array/CSV service ID inputs into deduplicated positive integer IDs. */
export const toServiceIds = (value: unknown): number[] => {
  const rawValues = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return Array.from(new Set(rawValues.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
};

/** Normalizes mixed array/CSV service category keys into trimmed lowercase strings. */
export const toServiceCategories = (value: unknown): string[] => {
  const rawValues = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return Array.from(
    new Set(
      rawValues
        .map(String)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
};

/** Resolves default assigned staff scope based on user role. */
export const getDefaultAssignedStaffId = (role?: string | null): string => (role === 'telesales' ? 'me' : 'all');

const formatDayRangePart = (label: string, min: number | undefined, max: number | undefined): string | null => {
  if (max !== undefined) {
    return min !== undefined ? `${label}: ${min}-${max} ngày` : `${label}: <= ${max} ngày`;
  }
  if (min !== undefined) {
    return `${label}: >= ${min} ngày`;
  }
  return null;
};

/** Serializes active filter state into the criteria snapshot passed to allocation/export consumers. */
export const buildCurrentFilterCriteria = (input: CustomerFilterCriteria): CustomerFilterCriteria => ({
  activeTab: input.activeTab,
  searchQuery: input.searchQuery,
  daysSinceLastVisitMin: input.daysSinceLastVisitMin,
  daysSinceLastVisitMax: input.daysSinceLastVisitMax,
  totalSpentMin: input.totalSpentMin,
  totalSpentMax: input.totalSpentMax,
  totalVisitsMin: input.totalVisitsMin,
  totalVisitsMax: input.totalVisitsMax,
  serviceIds: input.serviceIds,
  serviceCategories: input.serviceCategories,
  serviceVisitCountMin: input.serviceVisitCountMin,
  serviceVisitCountMax: input.serviceVisitCountMax,
  promoUsed: input.promoUsed,
  promoCountMin: input.promoCountMin,
  promoCountMax: input.promoCountMax,
  referralUsed: input.referralUsed,
  referralCountMin: input.referralCountMin,
  referralCountMax: input.referralCountMax,
  assignedStaffId: input.assignedStaffId,
  assignedDaysMin: input.assignedDaysMin,
  assignedDaysMax: input.assignedDaysMax,
  retainedOnly: input.retainedOnly,
  dobMonth: input.dobMonth,
  birthdayPreset: input.birthdayPreset,
  ageMin: input.ageMin,
  ageMax: input.ageMax,
  callStatuses: input.callStatuses,
  lastCallDaysMin: input.lastCallDaysMin,
  lastCallDaysMax: input.lastCallDaysMax,
  isForeignFilter: input.isForeignFilter,
  campaignId: input.campaignId,
  campaignFilterMode: input.campaignFilterMode,
});

/** Serializes active filter state into the saved-filter payload expected by the backend API. */
export const buildSavedFilterCriteria = (
  input: Omit<CustomerFilterCriteria, 'searchQuery'>
): CustomerSavedFilterCriteria => ({
  bucket: input.activeTab,
  daysSinceLastVisitMin: input.daysSinceLastVisitMin,
  daysSinceLastVisitMax: input.daysSinceLastVisitMax,
  totalSpentMin: input.totalSpentMin,
  totalSpentMax: input.totalSpentMax,
  totalVisitsMin: input.totalVisitsMin,
  totalVisitsMax: input.totalVisitsMax,
  serviceIds: input.serviceIds,
  serviceCategories: input.serviceCategories,
  serviceVisitCountMin: input.serviceVisitCountMin,
  serviceVisitCountMax: input.serviceVisitCountMax,
  promoUsed: input.promoUsed,
  promoCountMin: input.promoCountMin,
  promoCountMax: input.promoCountMax,
  referralUsed: input.referralUsed,
  referralCountMin: input.referralCountMin,
  referralCountMax: input.referralCountMax,
  assignedStaffId: input.assignedStaffId,
  assignedDaysMin: input.assignedDaysMin,
  assignedDaysMax: input.assignedDaysMax,
  retainedOnly: input.retainedOnly,
  dobMonth: input.dobMonth,
  birthdayPreset: input.birthdayPreset,
  ageMin: input.ageMin,
  ageMax: input.ageMax,
  callStatuses: input.callStatuses,
  lastCallDaysMin: input.lastCallDaysMin,
  lastCallDaysMax: input.lastCallDaysMax,
  isForeignFilter: input.isForeignFilter,
  campaignId: input.campaignId,
  campaignFilterMode: input.campaignFilterMode,
});

/** Formats a human-readable Vietnamese summary of active customer segmentation filters. */
export const buildCustomerFilterSummary = (
  input: CustomerFilterSummaryInput,
  sourceType: CustomerFilterSummarySourceType,
  count: number
): string => {
  const parts: string[] = [];
  if (sourceType === 'RANDOM') {
    parts.push(`🎲 Ngẫu nhiên ${count} KH`);
  } else {
    parts.push(`Chọn thủ công ${count} KH`);
  }

  if (input.activeTab && input.activeTab !== 'ALL') {
    parts.push(`Nhóm: ${input.activeTab}`);
  }

  const visitRange = formatDayRangePart('Chưa tới', input.daysSinceLastVisitMin, input.daysSinceLastVisitMax);
  if (visitRange) {
    parts.push(visitRange);
  }

  if (input.assignedStaffId === 'unassigned') {
    parts.push('Chưa phân bổ');
  } else if (input.assignedStaffId !== 'all') {
    parts.push('Đã phân bổ');
  }

  const assignedRange = formatDayRangePart('Phân bổ', input.assignedDaysMin, input.assignedDaysMax);
  if (assignedRange) {
    parts.push(assignedRange);
  }

  if (input.retainedOnly) {
    parts.push('📌 Chỉ Data đã giữ');
  }

  if (input.totalSpentMin !== undefined || input.totalSpentMax !== undefined) {
    parts.push('Chi tiêu');
  }

  if (input.serviceIds.length > 0 || input.serviceCategories.length > 0) {
    parts.push(`Dịch vụ: ${input.serviceIds.length + input.serviceCategories.length} lựa chọn`);
  }

  return parts.join(' | ');
};

/** Maps raw filter state into the structured API query parameter object. */
export const buildCustomerFilterParams = (input: CustomerFilterParamsInput): CustomerFilterParams => ({
  activeTab: input.activeTab,
  searchQuery: input.debouncedSearchQuery,
  showTrash: input.showTrash,
  sortField: input.sortField,
  daysSinceLastVisitMin: input.daysSinceLastVisitMin,
  daysSinceLastVisitMax: input.daysSinceLastVisitMax,
  totalSpentMin: input.totalSpentMin,
  totalSpentMax: input.totalSpentMax,
  totalVisitsMin: input.totalVisitsMin,
  totalVisitsMax: input.totalVisitsMax,
  serviceIds: input.serviceIds.length > 0 ? input.serviceIds.join(',') : undefined,
  serviceCategories: input.serviceCategories.length > 0 ? input.serviceCategories.join(',') : undefined,
  serviceVisitCountMin: input.serviceVisitCountMin,
  serviceVisitCountMax: input.serviceVisitCountMax,
  promoUsed: input.promoUsed,
  promoCountMin: input.promoCountMin,
  promoCountMax: input.promoCountMax,
  referralUsed: input.referralUsed,
  referralCountMin: input.referralCountMin,
  referralCountMax: input.referralCountMax,
  assignedStaffId: input.assignedStaffId,
  assignedDaysMin: input.assignedDaysMin,
  assignedDaysMax: input.assignedDaysMax,
  retainedOnly: input.retainedOnly ? 'true' : undefined,
  allocationBatchId: input.activeTab === 'ALLOCATION' ? input.selectedBatchId : undefined,
  ids: input.filterCustomerIds,
  dobMonth: input.dobMonth,
  birthdayPreset: input.birthdayPreset,
  ageMin: input.ageMin,
  ageMax: input.ageMax,
  callStatuses: input.callStatuses.length > 0 ? input.callStatuses.join(',') : undefined,
  lastCallDaysMin: input.lastCallDaysMin,
  lastCallDaysMax: input.lastCallDaysMax,
  isForeign: input.isForeignFilter !== 'all' ? input.isForeignFilter : undefined,
  campaignId: input.campaignId ? input.campaignId.toString() : undefined,
  campaignFilterMode: input.campaignId && input.campaignFilterMode !== 'ALL' ? input.campaignFilterMode : undefined,
});
