import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Staff } from '@mos-lab/shared';
import { useDebounce } from '../../../../../hooks/useDebounce';
import {
  buildCurrentFilterCriteria,
  buildCustomerFilterParams,
  buildCustomerFilterSummary,
  getDefaultAssignedStaffId,
  toServiceCategories,
  toServiceIds,
} from './filterHelpers';
import type {
  CustomerBirthdayPreset,
  CustomerCampaignFilterMode,
  CustomerFilterOptionsRef,
  CustomerFilterStateCore,
  CustomerFilterSummarySourceType,
  CustomerFilterTriState,
  CustomerForeignFilter,
} from './types';
import { clearBatchAndTabUrlParams, parseInitialBatchId, readInitialActiveTab, syncFilterUrlParams } from './urlSync';

/** Manages customer segmentation filter state, URL/role synchronization, and API param derivation. */
export const useCustomerFilterState = (
  currentUser: Staff | null,
  optionsRef: CustomerFilterOptionsRef,
  onFiltersReset?: () => void
): CustomerFilterStateCore => {
  const searchParams = useSearchParams();
  const scopeParam = searchParams?.get('assignedStaffId');
  const tabParam = searchParams?.get('tab');
  const batchIdParam = searchParams?.get('batchId');

  const [activeTab, setActiveTab] = useState<string>(() => readInitialActiveTab(tabParam));
  const [selectedBatchId, setSelectedBatchId] = useState<number | undefined>(() => parseInitialBatchId(batchIdParam));
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showTrash, setShowTrash] = useState(false);
  const [sortField, setSortField] = useState('id_desc');

  // Dynamic filters state
  const [daysSinceLastVisitMin, setDaysSinceLastVisitMin] = useState<number | undefined>(undefined);
  const [daysSinceLastVisitMax, setDaysSinceLastVisitMax] = useState<number | undefined>(undefined);
  const [totalSpentMin, setTotalSpentMin] = useState<number | undefined>(undefined);
  const [totalSpentMax, setTotalSpentMax] = useState<number | undefined>(undefined);
  const [totalVisitsMin, setTotalVisitsMin] = useState<number | undefined>(undefined);
  const [totalVisitsMax, setTotalVisitsMax] = useState<number | undefined>(undefined);
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [serviceVisitCountMin, setServiceVisitCountMin] = useState<number | undefined>(undefined);
  const [serviceVisitCountMax, setServiceVisitCountMax] = useState<number | undefined>(undefined);

  const [promoUsed, setPromoUsed] = useState<CustomerFilterTriState>('all');
  const [promoCountMin, setPromoCountMin] = useState<number | undefined>(undefined);
  const [promoCountMax, setPromoCountMax] = useState<number | undefined>(undefined);
  const [referralUsed, setReferralUsed] = useState<CustomerFilterTriState>('all');
  const [referralCountMin, setReferralCountMin] = useState<number | undefined>(undefined);
  const [referralCountMax, setReferralCountMax] = useState<number | undefined>(undefined);

  const [retainedOnly, setRetainedOnly] = useState<boolean>(false);
  const [filterCustomerIds, setFilterCustomerIds] = useState<string | undefined>(undefined);

  const [assignedStaffId, setAssignedStaffId] = useState<string>(
    () => scopeParam || getDefaultAssignedStaffId(currentUser?.role)
  );
  const [assignedDaysMin, setAssignedDaysMin] = useState<number | undefined>(undefined);
  const [assignedDaysMax, setAssignedDaysMax] = useState<number | undefined>(undefined);

  // Birthday & Age filters state
  const [dobMonth, setDobMonth] = useState<number | string | undefined>(undefined);
  const [birthdayPreset, setBirthdayPreset] = useState<CustomerBirthdayPreset | undefined>(undefined);
  const [ageMin, setAgeMin] = useState<number | undefined>(undefined);
  const [ageMax, setAgeMax] = useState<number | undefined>(undefined);

  // Call status & last call date filters state
  const [callStatuses, setCallStatuses] = useState<string[]>([]);
  const [lastCallDaysMin, setLastCallDaysMin] = useState<number | undefined>(undefined);
  const [lastCallDaysMax, setLastCallDaysMax] = useState<number | undefined>(undefined);

  // Foreign customer filter state ('all' | 'foreign' | 'local')
  const [isForeignFilter, setIsForeignFilter] = useState<CustomerForeignFilter>('all');

  // Campaign filter state
  const [campaignId, setCampaignId] = useState<number | undefined>(undefined);
  const [campaignFilterMode, setCampaignFilterMode] = useState<CustomerCampaignFilterMode>('ALL');

  const prevScopeRef = useRef<string | null | undefined>(scopeParam);
  const prevUserRoleRef = useRef<string | undefined>(currentUser?.role);

  // Keep assignedStaffId in sync with searchParams scopeParam & currentUser role changes
  useEffect(() => {
    const scopeChanged = prevScopeRef.current !== scopeParam;
    const roleChanged = prevUserRoleRef.current !== currentUser?.role;

    if (scopeChanged || roleChanged) {
      prevScopeRef.current = scopeParam;
      prevUserRoleRef.current = currentUser?.role;

      if (scopeParam) {
        setAssignedStaffId(scopeParam);
      } else if (currentUser?.role === 'telesales') {
        setAssignedStaffId('me');
        // A telesales queue must surface newly accepted allocations first.
        // Do not override an explicit operational sort selected after login.
        setSortField((currentSort) => (currentSort === 'id_desc' ? 'assignedAt_desc' : currentSort));
      }
    }
  }, [currentUser?.role, scopeParam]);

  // Keep URL parameters synced with activeTab and selectedBatchId for F5 persistence
  useEffect(() => {
    syncFilterUrlParams(activeTab, selectedBatchId);
  }, [activeTab, selectedBatchId]);

  const handleSearch = useCallback((val: string) => {
    setSearchQuery(val);
  }, []);

  const applyCommonCriteria = useCallback((criteria: SafeAny, fallbackAssignedStaffId: string) => {
    setDaysSinceLastVisitMin(criteria.daysSinceLastVisitMin);
    setDaysSinceLastVisitMax(criteria.daysSinceLastVisitMax);
    setTotalSpentMin(criteria.totalSpentMin);
    setTotalSpentMax(criteria.totalSpentMax);
    setTotalVisitsMin(criteria.totalVisitsMin);
    setTotalVisitsMax(criteria.totalVisitsMax);
    setServiceIds(toServiceIds(criteria.serviceIds));
    setServiceCategories(toServiceCategories(criteria.serviceCategories));
    setServiceVisitCountMin(criteria.serviceVisitCountMin);
    setServiceVisitCountMax(criteria.serviceVisitCountMax);
    setPromoUsed(criteria.promoUsed || 'all');
    setPromoCountMin(criteria.promoCountMin);
    setPromoCountMax(criteria.promoCountMax);
    setReferralUsed(criteria.referralUsed || 'all');
    setReferralCountMin(criteria.referralCountMin);
    setReferralCountMax(criteria.referralCountMax);
    setAssignedStaffId(criteria.assignedStaffId || fallbackAssignedStaffId);
    setAssignedDaysMin(criteria.assignedDaysMin);
    setAssignedDaysMax(criteria.assignedDaysMax);
    setRetainedOnly(Boolean(criteria.retainedOnly && criteria.retainedOnly !== 'false'));
    setDobMonth(criteria.dobMonth);
    setBirthdayPreset(criteria.birthdayPreset);
    setAgeMin(criteria.ageMin);
    setAgeMax(criteria.ageMax);
    setCallStatuses(
      Array.isArray(criteria.callStatuses)
        ? criteria.callStatuses
        : typeof criteria.callStatuses === 'string' && criteria.callStatuses.trim() !== ''
          ? criteria.callStatuses.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []
    );
    setLastCallDaysMin(criteria.lastCallDaysMin);
    setLastCallDaysMax(criteria.lastCallDaysMax);
    const foreignVal = criteria.isForeignFilter ?? criteria.isForeign;
    setIsForeignFilter(foreignVal === 'foreign' || foreignVal === 'local' ? foreignVal : 'all');
    if (criteria.campaignId !== undefined) {
      setCampaignId(criteria.campaignId);
      setCampaignFilterMode(criteria.campaignFilterMode || 'IN');
    } else {
      setCampaignId(undefined);
      setCampaignFilterMode('ALL');
    }
  }, []);

  const getCurrentFilterCriteria = useCallback(
    () =>
      buildCurrentFilterCriteria({
        activeTab,
        searchQuery,
        daysSinceLastVisitMin,
        daysSinceLastVisitMax,
        totalSpentMin,
        totalSpentMax,
        totalVisitsMin,
        totalVisitsMax,
        serviceIds,
        serviceCategories,
        serviceVisitCountMin,
        serviceVisitCountMax,
        promoUsed,
        promoCountMin,
        promoCountMax,
        referralUsed,
        referralCountMin,
        referralCountMax,
        assignedStaffId,
        assignedDaysMin,
        assignedDaysMax,
        retainedOnly,
        dobMonth,
        birthdayPreset,
        ageMin,
        ageMax,
        callStatuses,
        lastCallDaysMin,
        lastCallDaysMax,
        isForeignFilter,
        campaignId,
        campaignFilterMode,
      }),
    [
      activeTab,
      searchQuery,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      serviceIds,
      serviceCategories,
      serviceVisitCountMin,
      serviceVisitCountMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
      retainedOnly,
      dobMonth,
      birthdayPreset,
      ageMin,
      ageMax,
      callStatuses,
      lastCallDaysMin,
      lastCallDaysMax,
      isForeignFilter,
      campaignId,
      campaignFilterMode,
    ]
  );

  const buildFilterSummary = useCallback(
    (sourceType: CustomerFilterSummarySourceType, count: number) =>
      buildCustomerFilterSummary(
        {
          activeTab,
          daysSinceLastVisitMin,
          daysSinceLastVisitMax,
          assignedStaffId,
          assignedDaysMin,
          assignedDaysMax,
          totalSpentMin,
          totalSpentMax,
          serviceIds,
          serviceCategories,
          retainedOnly,
        },
        sourceType,
        count
      ),
    [
      activeTab,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
      totalSpentMin,
      totalSpentMax,
      serviceIds,
      serviceCategories,
      retainedOnly,
    ]
  );

  const exitBatchMode = useCallback(() => {
    setSelectedBatchId(undefined);
    setActiveTab('ALL');
    clearBatchAndTabUrlParams();
  }, []);

  const resetFilterFields = useCallback(() => {
    setActiveTab('ALL');
    setSelectedBatchId(undefined);
    clearBatchAndTabUrlParams();
    setDaysSinceLastVisitMin(undefined);
    setDaysSinceLastVisitMax(undefined);
    setTotalSpentMin(undefined);
    setTotalSpentMax(undefined);
    setTotalVisitsMin(undefined);
    setTotalVisitsMax(undefined);
    setServiceIds([]);
    setServiceCategories([]);
    setServiceVisitCountMin(undefined);
    setServiceVisitCountMax(undefined);
    setPromoUsed('all');
    setPromoCountMin(undefined);
    setPromoCountMax(undefined);
    setReferralUsed('all');
    setReferralCountMin(undefined);
    setReferralCountMax(undefined);
    setAssignedStaffId(getDefaultAssignedStaffId(currentUser?.role));
    setAssignedDaysMin(undefined);
    setAssignedDaysMax(undefined);
    setDobMonth(undefined);
    setBirthdayPreset(undefined);
    setAgeMin(undefined);
    setAgeMax(undefined);
    setCallStatuses([]);
    setLastCallDaysMin(undefined);
    setLastCallDaysMax(undefined);
    setIsForeignFilter('all');
    setRetainedOnly(false);
    setFilterCustomerIds(undefined);
    setCampaignId(undefined);
    setCampaignFilterMode('ALL');

    if (onFiltersReset) {
      onFiltersReset();
    }
    optionsRef.current?.onInfo?.('Đã xóa tất cả bộ lọc');
  }, [currentUser, onFiltersReset, optionsRef]);

  // Compute structured filters object for easy mapping to API params
  const filterParams = useMemo(
    () =>
      buildCustomerFilterParams({
        activeTab,
        debouncedSearchQuery,
        showTrash,
        sortField,
        daysSinceLastVisitMin,
        daysSinceLastVisitMax,
        totalSpentMin,
        totalSpentMax,
        totalVisitsMin,
        totalVisitsMax,
        serviceIds,
        serviceCategories,
        serviceVisitCountMin,
        serviceVisitCountMax,
        promoUsed,
        promoCountMin,
        promoCountMax,
        referralUsed,
        referralCountMin,
        referralCountMax,
        assignedStaffId,
        assignedDaysMin,
        assignedDaysMax,
        retainedOnly,
        selectedBatchId,
        filterCustomerIds,
        dobMonth,
        birthdayPreset,
        ageMin,
        ageMax,
        callStatuses,
        lastCallDaysMin,
        lastCallDaysMax,
        isForeignFilter,
        campaignId,
        campaignFilterMode,
      }),
    [
      activeTab,
      debouncedSearchQuery,
      showTrash,
      sortField,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      serviceIds,
      serviceCategories,
      serviceVisitCountMin,
      serviceVisitCountMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
      retainedOnly,
      selectedBatchId,
      filterCustomerIds,
      dobMonth,
      birthdayPreset,
      ageMin,
      ageMax,
      callStatuses,
      lastCallDaysMin,
      lastCallDaysMax,
      isForeignFilter,
      campaignId,
      campaignFilterMode,
    ]
  );

  return {
    filterParams,
    activeTab,
    setActiveTab,
    selectedBatchId,
    setSelectedBatchId,
    searchQuery,
    setSearchQuery,
    showTrash,
    setShowTrash,
    sortField,
    setSortField,
    daysSinceLastVisitMin,
    setDaysSinceLastVisitMin,
    daysSinceLastVisitMax,
    setDaysSinceLastVisitMax,
    totalSpentMin,
    setTotalSpentMin,
    totalSpentMax,
    setTotalSpentMax,
    totalVisitsMin,
    setTotalVisitsMin,
    totalVisitsMax,
    setTotalVisitsMax,
    serviceIds,
    setServiceIds,
    serviceCategories,
    setServiceCategories,
    serviceVisitCountMin,
    setServiceVisitCountMin,
    serviceVisitCountMax,
    setServiceVisitCountMax,
    promoUsed,
    setPromoUsed,
    promoCountMin,
    setPromoCountMin,
    promoCountMax,
    setPromoCountMax,
    referralUsed,
    setReferralUsed,
    referralCountMin,
    setReferralCountMin,
    referralCountMax,
    setReferralCountMax,
    assignedStaffId,
    setAssignedStaffId,
    assignedDaysMin,
    setAssignedDaysMin,
    assignedDaysMax,
    setAssignedDaysMax,
    callStatuses,
    setCallStatuses,
    lastCallDaysMin,
    setLastCallDaysMin,
    lastCallDaysMax,
    setLastCallDaysMax,
    retainedOnly,
    setRetainedOnly,
    filterCustomerIds,
    setFilterCustomerIds,
    dobMonth,
    setDobMonth,
    birthdayPreset,
    setBirthdayPreset,
    ageMin,
    setAgeMin,
    ageMax,
    setAgeMax,
    isForeignFilter,
    setIsForeignFilter,
    campaignId,
    setCampaignId,
    campaignFilterMode,
    setCampaignFilterMode,
    handleSearch,
    getCurrentFilterCriteria,
    buildFilterSummary,
    exitBatchMode,
    applyCommonCriteria,
    resetFilterFields,
  };
};
