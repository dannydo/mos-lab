'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Form, message, theme } from 'antd';
import { canAccessLoca, type Customer, type SafeAny } from '@mos-lab/shared';
import { useOmiCall } from '~/context/OmiCallContext';
import { useTheme } from '~/context/ThemeContext';
import { useTableConfig } from '~/hooks/useTableConfig';
import { formatDuration, formatVND } from '~/lib/format-utils';
import { getLocaColumns, getNewLocaColumns } from '../components/LocaColumns';
import { useLocaData } from '../hooks/useLocaData';
import { LOCA_CANONICAL_COLUMN_TITLES, LOCA_STORAGE_KEYS } from './locaPageTypes';
import { resolveLocaTableSortField } from './locaPageUtils';

export function useLocaPageController() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [settingsForm] = Form.useForm();
  const { makeCall } = useOmiCall();

  const [smsModalVisible, setSmsModalVisible] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resettingConfig, setResettingConfig] = useState(false);

  const closeLocaConfigRef = useRef<() => void>(() => {});

  const {
    currentUser,
    activeTab,
    activeTouchpointKey,
    contactSubTab,
    searchQuery,
    sortField,
    assignedStaffId,
    configs,
    customers,
    loading,
    total,
    currentPage,
    pageSize,
    tabCounts,
    touchpointCounts,
    overallStats,
    staffList,
    detailModalVisible,
    bookingWizardVisible,
    bookingInitialCustomer,
    selectedCustomer,
    dailyPlanList,
    addingIds,
    datePreset,
    selectedDate,
    bookingStatusFilter,
    customTouchpoints,
    selectedActivityStaffId,
    activityViewMode,
    activityReferenceDate,
    activitySearchQuery,
    activityActionTypeFilter,
    activityTouchpointKey,
    activityPage,
    activityPageSize,
    staffActivityStats,
    staffActivityLogs,
    staffActivityTotal,
    staffActivityLoading,
    setActiveTab,
    setActiveTouchpointKey,
    updateCustomTouchpoint,
    setContactSubTab,
    setSearchQuery,
    setSortField,
    setAssignedStaffId,
    setSelectedActivityStaffId,
    setActivityViewMode,
    setActivityReferenceDate,
    handleNavigateActivityDate,
    setActivitySearchQuery,
    setActivityActionTypeFilter,
    setActivityTouchpointKey,
    setActivityPage,
    setActivityPageSize,
    setBookingStatusFilter,
    setCurrentPage,
    setPageSize,
    setDatePreset,
    setSelectedDate,
    setDetailModalVisible,
    setBookingWizardVisible,
    setBookingInitialCustomer,
    setSelectedCustomer,
    fetchCustomerList,
    fetchOverallStats,
    handlePrevDate,
    handleNextDate,
    handleAddToPlan,
    handleOpenDetailModal,
    handleSaveConfig,
    resetConfigDefaults,
    handleToggleTouchpoint,
    getRowClassName,
  } = useLocaData({
    settingsForm,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
    onWarning: (msg) => message.warning(msg),
    onCloseDrawer: () => closeLocaConfigRef.current(),
  });

  const isLocaAllowed = canAccessLoca(currentUser?.role);

  const handleOpenSmsModal = useCallback(
    (customer: Customer) => {
      setSelectedCustomer(customer);
      setSmsModalVisible(true);
    },
    [setSelectedCustomer]
  );

  const handleCloseSmsModal = useCallback(() => {
    setSmsModalVisible(false);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailModalVisible(false);
  }, [setDetailModalVisible]);

  const handleDetailDeleteSuccess = useCallback(() => {
    setDetailModalVisible(false);
    fetchCustomerList();
    fetchOverallStats();
  }, [fetchCustomerList, fetchOverallStats, setDetailModalVisible]);

  const handleBookingWizardClose = useCallback(() => {
    setBookingWizardVisible(false);
  }, [setBookingWizardVisible]);

  const handleBookingWizardSuccess = useCallback(() => {
    setBookingWizardVisible(false);
    fetchCustomerList();
    fetchOverallStats();
  }, [fetchCustomerList, fetchOverallStats, setBookingWizardVisible]);

  const handleOpenNewBooking = useCallback(() => {
    setBookingInitialCustomer(null);
    setBookingWizardVisible(true);
  }, [setBookingInitialCustomer, setBookingWizardVisible]);

  const handleOpenBookingForCustomer = useCallback(
    (customer: Customer) => {
      setBookingInitialCustomer(customer);
      setBookingWizardVisible(true);
    },
    [setBookingInitialCustomer, setBookingWizardVisible]
  );

  const handleOpenCustomerDetailById = useCallback(
    (customerId: number) => {
      setSelectedCustomer({ id: customerId } as SafeAny);
      setDetailModalVisible(true);
    },
    [setDetailModalVisible, setSelectedCustomer]
  );

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTab(key);
      setActiveTouchpointKey('ALL');
    },
    [setActiveTab, setActiveTouchpointKey]
  );

  const handleOpenResetConfirm = useCallback(() => {
    setResetConfirmOpen(true);
  }, []);

  const handleCancelResetConfirm = useCallback(() => {
    setResetConfirmOpen(false);
  }, []);

  const handleConfirmResetDefaults = useCallback(async () => {
    setResettingConfig(true);
    try {
      await resetConfigDefaults();
      message.success('Đã khôi phục cài đặt mặc định thành công.');
      setResetConfirmOpen(false);
    } catch {
      message.error('Khôi phục thất bại.');
    } finally {
      setResettingConfig(false);
    }
  }, [resetConfigDefaults]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeTouchpointKey, contactSubTab, searchQuery, sortField, assignedStaffId, setCurrentPage]);

  const handleTableChange = useCallback(
    (_pagination: SafeAny, _filters: SafeAny, tableSorter: SafeAny) => {
      const nextSortField = resolveLocaTableSortField(tableSorter);
      if (nextSortField) {
        setSortField(nextSortField);
      }
    },
    [setSortField]
  );

  const handlePaginationChange = useCallback(
    (page: number, size: number) => {
      setCurrentPage(page);
      if (size !== pageSize) {
        setPageSize(size);
        localStorage.setItem(LOCA_STORAGE_KEYS.pageSize, size.toString());
      }
    },
    [pageSize, setCurrentPage, setPageSize]
  );

  const handleActivityPageChange = useCallback(
    (page: number, size: number) => {
      if (size !== activityPageSize) {
        setActivityPageSize(size);
      } else {
        setActivityPage(page);
      }
    },
    [activityPageSize, setActivityPage, setActivityPageSize]
  );

  const columns = getLocaColumns({
    themeMode,
    token,
    handleOpenDetailModal,
    formatVND,
    formatDuration,
    dailyPlanList,
    handleAddToPlan,
    makeCall,
    handleOpenSmsModal,
    handleOpenBookingWizard: handleOpenBookingForCustomer,
    handleToggleTouchpoint,
    touchpointConfigs: configs['LOCA_ALL'],
    addingIds,
    sortField,
    currentPage,
    pageSize,
  });

  const newLocaColumns = getNewLocaColumns({
    themeMode,
    token,
    handleOpenDetailModal,
    formatVND,
    formatDuration,
    dailyPlanList,
    handleAddToPlan,
    makeCall,
    handleOpenSmsModal,
    addingIds,
    sortField,
    currentPage,
    pageSize,
  });

  const {
    columns: locaConfigColumns,
    rawConfig: locaRawConfig,
    configVisible: locaConfigVisible,
    openConfig: openLocaConfig,
    closeConfig: closeLocaConfig,
    saveConfig: saveLocaConfig,
    resetConfig: resetLocaConfig,
  } = useTableConfig('loca_campaign_table', columns, { canonicalTitles: LOCA_CANONICAL_COLUMN_TITLES });

  useEffect(() => {
    closeLocaConfigRef.current = closeLocaConfig;
  }, [closeLocaConfig]);

  const activeTouchpointsList = configs['LOCA_ALL'] || [];

  useEffect(() => {
    if (locaConfigVisible) {
      const currentConfigs = configs['LOCA_ALL'] || [];
      settingsForm.setFieldsValue({ touchpoints: currentConfigs });
    }
  }, [locaConfigVisible, configs, settingsForm]);

  return {
    themeMode,
    settingsForm,
    currentUser,
    isLocaAllowed,
    activeTab,
    activeTouchpointKey,
    contactSubTab,
    searchQuery,
    assignedStaffId,
    customers,
    loading,
    total,
    currentPage,
    pageSize,
    tabCounts,
    touchpointCounts,
    overallStats,
    staffList,
    detailModalVisible,
    bookingWizardVisible,
    bookingInitialCustomer,
    selectedCustomer,
    datePreset,
    selectedDate,
    bookingStatusFilter,
    customTouchpoints,
    activeTouchpointsList,
    selectedActivityStaffId,
    activityViewMode,
    activityReferenceDate,
    activitySearchQuery,
    activityActionTypeFilter,
    activityTouchpointKey,
    activityPage,
    activityPageSize,
    staffActivityStats,
    staffActivityLogs,
    staffActivityTotal,
    staffActivityLoading,
    smsModalVisible,
    resetConfirmOpen,
    resettingConfig,
    newLocaColumns,
    locaConfigColumns,
    locaRawConfig,
    locaConfigVisible,
    setActiveTouchpointKey,
    updateCustomTouchpoint,
    setContactSubTab,
    setSearchQuery,
    setAssignedStaffId,
    setSelectedActivityStaffId,
    setActivityViewMode,
    setActivityReferenceDate,
    handleNavigateActivityDate,
    setActivitySearchQuery,
    setActivityActionTypeFilter,
    setActivityTouchpointKey,
    setBookingStatusFilter,
    setDatePreset,
    setSelectedDate,
    fetchCustomerList,
    handlePrevDate,
    handleNextDate,
    handleTabChange,
    handleTableChange,
    handlePaginationChange,
    handleActivityPageChange,
    handleOpenNewBooking,
    handleOpenCustomerDetailById,
    handleDetailClose,
    handleDetailDeleteSuccess,
    handleBookingWizardClose,
    handleBookingWizardSuccess,
    handleCloseSmsModal,
    handleSaveConfig,
    handleOpenResetConfirm,
    handleCancelResetConfirm,
    handleConfirmResetDefaults,
    openLocaConfig,
    closeLocaConfig,
    saveLocaConfig,
    resetLocaConfig,
    getRowClassName,
  };
}
