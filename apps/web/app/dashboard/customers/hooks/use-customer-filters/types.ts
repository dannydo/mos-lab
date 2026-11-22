import type React from 'react';
import type { Staff } from '@mos-lab/shared';

export type CustomerFilterOptionsRef = React.MutableRefObject<SafeAny>;
export type CustomerFilterTriState = 'yes' | 'no' | 'all';
export type CustomerBirthdayPreset = 'today' | 'this_month' | 'next_month';
export type CustomerForeignFilter = 'all' | 'foreign' | 'local';
export type CustomerCampaignFilterMode = 'ALL' | 'IN' | 'NOT_IN';
export type CustomerFilterSummarySourceType = 'MANUAL' | 'RANDOM';

export interface CustomerFilterCriteria {
  activeTab: string;
  searchQuery: string;
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
  promoUsed: CustomerFilterTriState;
  promoCountMin: number | undefined;
  promoCountMax: number | undefined;
  referralUsed: CustomerFilterTriState;
  referralCountMin: number | undefined;
  referralCountMax: number | undefined;
  assignedStaffId: string;
  assignedDaysMin: number | undefined;
  assignedDaysMax: number | undefined;
  campaignId: number | undefined;
  campaignFilterMode: CustomerCampaignFilterMode;
}

export interface CustomerSavedFilterCriteria extends Omit<CustomerFilterCriteria, 'activeTab' | 'searchQuery'> {
  bucket: string;
}

export interface CustomerFilterSummaryInput {
  activeTab: string;
  daysSinceLastVisitMin: number | undefined;
  daysSinceLastVisitMax: number | undefined;
  assignedStaffId: string;
  assignedDaysMin: number | undefined;
  assignedDaysMax: number | undefined;
  totalSpentMin: number | undefined;
  totalSpentMax: number | undefined;
  serviceIds: number[];
  serviceCategories: string[];
  retainedOnly: boolean;
}

export interface CustomerFilterParamsInput {
  activeTab: string;
  debouncedSearchQuery: string;
  showTrash: boolean;
  sortField: string;
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
  promoUsed: CustomerFilterTriState;
  promoCountMin: number | undefined;
  promoCountMax: number | undefined;
  referralUsed: CustomerFilterTriState;
  referralCountMin: number | undefined;
  referralCountMax: number | undefined;
  assignedStaffId: string;
  assignedDaysMin: number | undefined;
  assignedDaysMax: number | undefined;
  retainedOnly: boolean;
  selectedBatchId: number | undefined;
  filterCustomerIds: string | undefined;
  dobMonth: number | string | undefined;
  birthdayPreset: CustomerBirthdayPreset | undefined;
  ageMin: number | undefined;
  ageMax: number | undefined;
  callStatuses: string[];
  lastCallDaysMin: number | undefined;
  lastCallDaysMax: number | undefined;
  isForeignFilter: CustomerForeignFilter;
  campaignId: number | undefined;
  campaignFilterMode: CustomerCampaignFilterMode;
}

export interface CustomerFilterParams {
  activeTab: string;
  searchQuery: string;
  showTrash: boolean;
  sortField: string;
  daysSinceLastVisitMin: number | undefined;
  daysSinceLastVisitMax: number | undefined;
  totalSpentMin: number | undefined;
  totalSpentMax: number | undefined;
  totalVisitsMin: number | undefined;
  totalVisitsMax: number | undefined;
  serviceIds: string | undefined;
  serviceCategories: string | undefined;
  serviceVisitCountMin: number | undefined;
  serviceVisitCountMax: number | undefined;
  promoUsed: CustomerFilterTriState;
  promoCountMin: number | undefined;
  promoCountMax: number | undefined;
  referralUsed: CustomerFilterTriState;
  referralCountMin: number | undefined;
  referralCountMax: number | undefined;
  assignedStaffId: string;
  assignedDaysMin: number | undefined;
  assignedDaysMax: number | undefined;
  retainedOnly: string | undefined;
  allocationBatchId: number | undefined;
  ids: string | undefined;
  dobMonth: number | string | undefined;
  birthdayPreset: CustomerBirthdayPreset | undefined;
  ageMin: number | undefined;
  ageMax: number | undefined;
  callStatuses: string | undefined;
  lastCallDaysMin: number | undefined;
  lastCallDaysMax: number | undefined;
  isForeign: 'foreign' | 'local' | undefined;
  campaignId: string | undefined;
  campaignFilterMode: CustomerCampaignFilterMode | undefined;
}

export interface CustomerFilterStateCore {
  filterParams: CustomerFilterParams;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  selectedBatchId: number | undefined;
  setSelectedBatchId: React.Dispatch<React.SetStateAction<number | undefined>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showTrash: boolean;
  setShowTrash: React.Dispatch<React.SetStateAction<boolean>>;
  sortField: string;
  setSortField: React.Dispatch<React.SetStateAction<string>>;
  daysSinceLastVisitMin: number | undefined;
  setDaysSinceLastVisitMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  daysSinceLastVisitMax: number | undefined;
  setDaysSinceLastVisitMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  totalSpentMin: number | undefined;
  setTotalSpentMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  totalSpentMax: number | undefined;
  setTotalSpentMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  totalVisitsMin: number | undefined;
  setTotalVisitsMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  totalVisitsMax: number | undefined;
  setTotalVisitsMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  serviceIds: number[];
  setServiceIds: React.Dispatch<React.SetStateAction<number[]>>;
  serviceCategories: string[];
  setServiceCategories: React.Dispatch<React.SetStateAction<string[]>>;
  serviceVisitCountMin: number | undefined;
  setServiceVisitCountMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  serviceVisitCountMax: number | undefined;
  setServiceVisitCountMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  promoUsed: CustomerFilterTriState;
  setPromoUsed: React.Dispatch<React.SetStateAction<CustomerFilterTriState>>;
  promoCountMin: number | undefined;
  setPromoCountMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  promoCountMax: number | undefined;
  setPromoCountMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  referralUsed: CustomerFilterTriState;
  setReferralUsed: React.Dispatch<React.SetStateAction<CustomerFilterTriState>>;
  referralCountMin: number | undefined;
  setReferralCountMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  referralCountMax: number | undefined;
  setReferralCountMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  assignedStaffId: string;
  setAssignedStaffId: React.Dispatch<React.SetStateAction<string>>;
  assignedDaysMin: number | undefined;
  setAssignedDaysMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  assignedDaysMax: number | undefined;
  setAssignedDaysMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  callStatuses: string[];
  setCallStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  lastCallDaysMin: number | undefined;
  setLastCallDaysMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  lastCallDaysMax: number | undefined;
  setLastCallDaysMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  retainedOnly: boolean;
  setRetainedOnly: React.Dispatch<React.SetStateAction<boolean>>;
  filterCustomerIds: string | undefined;
  setFilterCustomerIds: React.Dispatch<React.SetStateAction<string | undefined>>;
  dobMonth: number | string | undefined;
  setDobMonth: React.Dispatch<React.SetStateAction<number | string | undefined>>;
  birthdayPreset: CustomerBirthdayPreset | undefined;
  setBirthdayPreset: React.Dispatch<React.SetStateAction<CustomerBirthdayPreset | undefined>>;
  ageMin: number | undefined;
  setAgeMin: React.Dispatch<React.SetStateAction<number | undefined>>;
  ageMax: number | undefined;
  setAgeMax: React.Dispatch<React.SetStateAction<number | undefined>>;
  isForeignFilter: CustomerForeignFilter;
  setIsForeignFilter: React.Dispatch<React.SetStateAction<CustomerForeignFilter>>;
  campaignId: number | undefined;
  setCampaignId: React.Dispatch<React.SetStateAction<number | undefined>>;
  campaignFilterMode: CustomerCampaignFilterMode;
  setCampaignFilterMode: React.Dispatch<React.SetStateAction<CustomerCampaignFilterMode>>;
  handleSearch: (val: string) => void;
  getCurrentFilterCriteria: () => CustomerFilterCriteria;
  buildFilterSummary: (sourceType: CustomerFilterSummarySourceType, count: number) => string;
  exitBatchMode: () => void;
  applyCommonCriteria: (criteria: SafeAny, fallbackAssignedStaffId: string) => void;
  resetFilterFields: () => void;
}

export interface UseSavedCustomerFiltersParams {
  currentUser: Staff | null;
  optionsRef: CustomerFilterOptionsRef;
  filterState: CustomerFilterStateCore;
}
