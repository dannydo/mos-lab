'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { Customer, isTelesalesRole, Staff, LASH_TOUCHUP_SYSTEM_CONFIG } from '@mos-lab/shared';
import {
  computeLocaDateRange,
  readInitialActiveTab,
  readInitialPageSize,
  readStoredCurrentUser,
  resolveLocaRowClassName,
  updateUrlSearchParams,
} from './use-loca-data/locaStorageHelpers';
import type {
  LocaBookingStatusFilter,
  LocaContactSubTab,
  LocaDatePreset,
  TabConfigs,
  UseLocaDataOptions,
} from './use-loca-data/types';
import { useLocaCustomerActions } from './use-loca-data/useLocaCustomerActions';
import { useLocaCustomersAndStats } from './use-loca-data/useLocaCustomersAndStats';
import { useLocaStaffActivity } from './use-loca-data/useLocaStaffActivity';
import { useLocaTouchpointConfig } from './use-loca-data/useLocaTouchpointConfig';

export type { Touchpoint, TabConfigs, CustomTouchpoint, UseLocaDataOptions } from './use-loca-data/types';
export { DEFAULT_CUSTOM_TOUCHPOINTS, TAB_KEYS } from './use-loca-data/constants';

const DEFAULT_LOCA_CONFIGS: TabConfigs = {
  LOCA_ALL: [
    { key: 'now', label: 'Hôm qua', daysMin: 1, daysMax: 1, color: '#10B981' },
    { key: '17', label: '17 ngày', daysMin: 17, daysMax: 17, color: '#3B82F6' },
    { key: '19', label: '19 ngày', daysMin: 19, daysMax: 19, color: '#6366F1' },
    {
      key: String(LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS),
      label: `${LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS} ngày`,
      daysMin: LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS,
      daysMax: LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS,
      color: '#8B5CF6',
    },
    { key: '23', label: '23 ngày', daysMin: 23, daysMax: 23, color: '#EC4899' },
    {
      key: String(LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS),
      label: `${LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS} ngày`,
      daysMin: LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS,
      daysMax: LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS,
      color: '#F43F5E',
    },
    { key: '30', label: '30 ngày', daysMin: 30, daysMax: 30, color: '#EF4444' },
    { key: '35', label: '35 ngày', daysMin: 35, daysMax: 35, color: '#D97706' },
    { key: '40', label: '40 ngày', daysMin: 40, daysMax: 40, color: '#B45309' },
    { key: '45', label: '45 ngày', daysMin: 45, daysMax: 45, color: '#78350F' },
    { key: '50', label: '50 ngày', daysMin: 50, daysMax: 50, color: '#451A03' },
    { key: '55', label: '55 ngày', daysMin: 55, daysMax: 55, color: '#312E81' },
    { key: '60', label: '60+ ngày', daysMin: 60, daysMax: 60, color: '#1E1B4B' },
  ],
};

export function useLocaData(options?: UseLocaDataOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Current User initialized synchronously from localStorage
  const [currentUser] = useState<Staff | null>(readStoredCurrentUser);

  // Main UI States
  const [activeTab, setActiveTab] = useState<string>(readInitialActiveTab);
  const [contactSubTab, setContactSubTab] = useState<LocaContactSubTab>('ALL');

  // Date Navigation States for New LoCa
  const [datePreset, setDatePreset] = useState<LocaDatePreset>('today');
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('daysSinceLastVisit');
  const [assignedStaffId, setAssignedStaffId] = useState<string | number>('ALL');
  const [bookingStatusFilter, setBookingStatusFilterState] = useState<LocaBookingStatusFilter>('ALL');

  // The API enforces this boundary too. Keeping the client state aligned
  // prevents stale browser state from asking the LoCa workspace for a wider
  // customer scope after a role change.
  useEffect(() => {
    if (isTelesalesRole(currentUser?.role)) {
      setAssignedStaffId('me');
    }
  }, [currentUser?.role]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(readInitialPageSize);

  // Modals / Drawers Controls
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [bookingWizardVisible, setBookingWizardVisible] = useState(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const dateRange = useMemo(() => computeLocaDateRange(datePreset, selectedDate), [datePreset, selectedDate]);

  const handlePrevDate = useCallback(() => {
    if (datePreset === 'month') setSelectedDate((d) => d.subtract(1, 'month'));
    else if (datePreset === 'week') setSelectedDate((d) => d.subtract(1, 'week'));
    else setSelectedDate((d) => d.subtract(1, 'day'));
  }, [datePreset]);

  const handleNextDate = useCallback(() => {
    if (datePreset === 'month') setSelectedDate((d) => d.add(1, 'month'));
    else if (datePreset === 'week') setSelectedDate((d) => d.add(1, 'week'));
    else setSelectedDate((d) => d.add(1, 'day'));
  }, [datePreset]);

  const touchpointConfig = useLocaTouchpointConfig({
    defaultConfigs: DEFAULT_LOCA_CONFIGS,
    optionsRef,
  });

  const staffActivity = useLocaStaffActivity(activeTab);

  const customersAndStats = useLocaCustomersAndStats({
    currentUser,
    activeTab,
    activeTouchpointKey: touchpointConfig.activeTouchpointKey,
    contactSubTab,
    searchQuery,
    sortField,
    assignedStaffId,
    bookingStatusFilter,
    currentPage,
    pageSize,
    dateRange,
    configs: touchpointConfig.configs,
    setConfigs: touchpointConfig.setConfigs,
    defaultConfigs: DEFAULT_LOCA_CONFIGS,
    customTouchpoints: touchpointConfig.customTouchpoints,
    customTouchpointsKey: touchpointConfig.customTouchpointsKey,
    optionsRef,
  });

  const customerActions = useLocaCustomerActions({
    currentUser,
    optionsRef,
    setCustomers: customersAndStats.setCustomers,
    setDailyPlanList: customersAndStats.setDailyPlanList,
    fetchCustomerList: customersAndStats.fetchCustomerList,
    fetchOverallStats: customersAndStats.fetchOverallStats,
  });

  const handleOpenDetailModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailModalVisible(true);
  };

  const changeActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activeTab', tab);
      updateUrlSearchParams({ tab });
    }
  }, []);

  const setBookingStatusFilter = useCallback((val: LocaBookingStatusFilter) => {
    setBookingStatusFilterState(val);
    setCurrentPage(1);
  }, []);

  return {
    // states
    currentUser,
    activeTab,
    activeTouchpointKey: touchpointConfig.activeTouchpointKey,
    contactSubTab,
    searchQuery,
    sortField,
    assignedStaffId,
    currentPage,
    pageSize,
    customers: customersAndStats.customers,
    total: customersAndStats.total,
    loading: customersAndStats.loading,
    tabCounts: customersAndStats.tabCounts,
    touchpointCounts: customersAndStats.touchpointCounts,
    overallStats: customersAndStats.overallStats,
    staffList: customersAndStats.staffList,
    configs: touchpointConfig.configs,
    settingsModalVisible: touchpointConfig.settingsModalVisible,
    detailModalVisible,
    bookingWizardVisible,
    bookingInitialCustomer,
    selectedCustomer,
    dailyPlanList: customersAndStats.dailyPlanList,
    addingIds: customerActions.addingIds,
    datePreset,
    selectedDate,
    customTouchpoints: touchpointConfig.customTouchpoints,
    bookingStatusFilter,
    // Staff Activity Report States
    selectedActivityStaffId: staffActivity.selectedActivityStaffId,
    activityViewMode: staffActivity.activityViewMode,
    activityReferenceDate: staffActivity.activityReferenceDate,
    activitySearchQuery: staffActivity.activitySearchQuery,
    activityActionTypeFilter: staffActivity.activityActionTypeFilter,
    activityTouchpointKey: staffActivity.activityTouchpointKey,
    activityPage: staffActivity.activityPage,
    activityPageSize: staffActivity.activityPageSize,
    staffActivityStats: staffActivity.staffActivityStats,
    staffActivityLogs: staffActivity.staffActivityLogs,
    staffActivityTotal: staffActivity.staffActivityTotal,
    staffActivityLoading: staffActivity.staffActivityLoading,
    // setters
    setActiveTab: changeActiveTab,
    setActiveTouchpointKey: touchpointConfig.setActiveTouchpointKey,
    updateCustomTouchpoint: touchpointConfig.updateCustomTouchpoint,
    setContactSubTab,
    setSearchQuery,
    setSortField,
    setAssignedStaffId,
    setSelectedActivityStaffId: staffActivity.setSelectedActivityStaffId,
    setActivityViewMode: staffActivity.setActivityViewMode,
    setActivityReferenceDate: staffActivity.setActivityReferenceDate,
    handleNavigateActivityDate: staffActivity.handleNavigateActivityDate,
    setActivitySearchQuery: staffActivity.setActivitySearchQuery,
    setActivityActionTypeFilter: staffActivity.setActivityActionTypeFilter,
    setActivityTouchpointKey: staffActivity.setActivityTouchpointKey,
    setActivityPage: staffActivity.setActivityPage,
    setActivityPageSize: staffActivity.setActivityPageSize,
    fetchStaffActivityData: staffActivity.fetchStaffActivityData,
    setBookingStatusFilter,
    setCurrentPage,
    setPageSize,
    setDatePreset,
    setSelectedDate,
    setSettingsModalVisible: touchpointConfig.setSettingsModalVisible,
    setDetailModalVisible,
    setBookingWizardVisible,
    setBookingInitialCustomer,
    setSelectedCustomer,
    // handlers
    fetchCustomerList: customersAndStats.fetchCustomerList,
    fetchOverallStats: customersAndStats.fetchOverallStats,
    handlePrevDate,
    handleNextDate,
    handleAddToPlan: customerActions.handleAddToPlan,
    handleOpenDetailModal,
    handleOpenSettings: touchpointConfig.handleOpenSettings,
    handleSaveConfig: touchpointConfig.handleSaveConfig,
    resetConfigDefaults: touchpointConfig.resetConfigDefaults,
    handleAssignTelesales: customerActions.handleAssignTelesales,
    handleToggleTouchpoint: customerActions.handleToggleTouchpoint,
    getRowClassName: resolveLocaRowClassName,
  };
}
