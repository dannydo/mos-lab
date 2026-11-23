'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, message, theme } from 'antd';
import type { Customer, SafeAny } from '@mos-lab/shared';
import { useOmiCall } from '~/context/OmiCallContext';
import { useTheme } from '~/context/ThemeContext';
import { useTableConfig } from '~/hooks/useTableConfig';
import { formatDuration, formatVND } from '~/lib/format-utils';
import { getNycColumns } from '../components/NycColumns';
import { useNycData } from '../hooks/useNycData';
import { NYC_CANONICAL_COLUMN_TITLES, NYC_SETTINGS_MODAL_DEFAULTS, NYC_STORAGE_KEYS } from './nycPageTypes';
import {
  clampNycModalHeight,
  clampNycModalWidth,
  getBookerStaffOptions,
  resolveNycTableSortField,
} from './nycPageUtils';

export function useNycPageController() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [settingsForm] = Form.useForm();
  const { makeCall } = useOmiCall();

  const [modalWidth, setModalWidth] = useState<number>(NYC_SETTINGS_MODAL_DEFAULTS.width);
  const [modalHeight, setModalHeight] = useState<number>(NYC_SETTINGS_MODAL_DEFAULTS.height);
  const [smsModalVisible, setSmsModalVisible] = useState<boolean>(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const [resettingConfig, setResettingConfig] = useState<boolean>(false);

  const {
    currentUser,
    activeTab,
    activeTouchpointKey,
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
    settingsModalVisible,
    detailModalVisible,
    bookingWizardVisible,
    bookingInitialCustomer,
    selectedConfigTab,
    selectedCustomer,
    dailyPlanList,
    addingIds,
    setActiveTab,
    setActiveTouchpointKey,
    setSearchQuery,
    setSortField,
    setAssignedStaffId,
    setCurrentPage,
    setPageSize,
    setSettingsModalVisible,
    setDetailModalVisible,
    setBookingWizardVisible,
    setBookingInitialCustomer,
    setSelectedCustomer,
    fetchCustomerList,
    fetchOverallStats,
    handleAddToPlan,
    handleOpenDetailModal,
    handleConfigTabChange,
    handleSaveConfig,
    resetConfigDefaults,
    getRowClassName,
  } = useNycData({
    settingsForm,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
    onWarning: (msg) => message.warning(msg),
  });

  const bookerStaffList = useMemo(() => getBookerStaffOptions(staffList), [staffList]);

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
  }, [setDetailModalVisible, fetchCustomerList, fetchOverallStats]);

  const handleBookingWizardClose = useCallback(() => {
    setBookingWizardVisible(false);
  }, [setBookingWizardVisible]);

  const handleBookingWizardSuccess = useCallback(() => {
    setBookingWizardVisible(false);
    fetchCustomerList();
    fetchOverallStats();
  }, [setBookingWizardVisible, fetchCustomerList, fetchOverallStats]);

  const handleOpenNewBooking = useCallback(() => {
    setBookingInitialCustomer(null);
    setBookingWizardVisible(true);
  }, [setBookingInitialCustomer, setBookingWizardVisible]);

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTab(key);
      setActiveTouchpointKey('ALL');
    },
    [setActiveTab, setActiveTouchpointKey]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedWidth = localStorage.getItem(NYC_STORAGE_KEYS.modalWidth);
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10);
      if (!Number.isNaN(parsedWidth)) setModalWidth(parsedWidth);
    }

    const savedHeight = localStorage.getItem(NYC_STORAGE_KEYS.modalHeight);
    if (savedHeight) {
      const parsedHeight = parseInt(savedHeight, 10);
      if (!Number.isNaN(parsedHeight)) setModalHeight(parsedHeight);
    }
  }, []);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const handleEl = e.currentTarget as HTMLElement;
      const modalEl = (handleEl.closest('.ant-modal') || handleEl.closest('.ant-modal-content')) as HTMLElement | null;
      const listEl = document.getElementById('nyc-touchpoints-list');

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = modalEl ? modalEl.offsetWidth : modalWidth;
      const startHeight = listEl ? listEl.offsetHeight + 180 : modalHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        const newWidth = clampNycModalWidth(startWidth + deltaX);
        const newHeight = clampNycModalHeight(startHeight + deltaY);

        if (modalEl) {
          modalEl.style.width = `${newWidth}px`;
          modalEl.style.maxWidth = '95vw';
        }
        if (listEl) {
          listEl.style.height = `${newHeight - 180}px`;
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        const finalWidth = clampNycModalWidth(startWidth + (upEvent.clientX - startX));
        const finalHeight = clampNycModalHeight(startHeight + (upEvent.clientY - startY));

        setModalWidth(finalWidth);
        setModalHeight(finalHeight);

        localStorage.setItem(NYC_STORAGE_KEYS.modalWidth, finalWidth.toString());
        localStorage.setItem(NYC_STORAGE_KEYS.modalHeight, finalHeight.toString());
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [modalHeight, modalWidth]
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

  const handleCloseSettingsModal = useCallback(() => {
    setSettingsModalVisible(false);
  }, [setSettingsModalVisible]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeTouchpointKey, searchQuery, sortField, assignedStaffId, setCurrentPage]);

  const handleTableChange = useCallback(
    (_pagination: SafeAny, _filters: SafeAny, tableSorter: SafeAny) => {
      const nextSortField = resolveNycTableSortField(tableSorter);
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
        localStorage.setItem(NYC_STORAGE_KEYS.pageSize, size.toString());
      }
    },
    [pageSize, setCurrentPage, setPageSize]
  );

  const columns = getNycColumns({
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
    columns: nycConfigColumns,
    rawConfig: nycRawConfig,
    configVisible: nycConfigVisible,
    openConfig: openNycConfig,
    closeConfig: closeNycConfig,
    saveConfig: saveNycConfig,
    resetConfig: resetNycConfig,
  } = useTableConfig('nyc_campaign_table', columns, { canonicalTitles: NYC_CANONICAL_COLUMN_TITLES });

  const activeTouchpointsList = configs[activeTab] || [];

  return {
    themeMode,
    settingsForm,
    modalWidth,
    modalHeight,
    currentUser,
    activeTab,
    activeTouchpointKey,
    searchQuery,
    sortField,
    assignedStaffId,
    customers,
    loading,
    total,
    currentPage,
    pageSize,
    tabCounts,
    touchpointCounts,
    overallStats,
    bookerStaffList,
    activeTouchpointsList,
    settingsModalVisible,
    detailModalVisible,
    bookingWizardVisible,
    bookingInitialCustomer,
    selectedConfigTab,
    selectedCustomer,
    smsModalVisible,
    resetConfirmOpen,
    resettingConfig,
    nycConfigColumns,
    nycRawConfig,
    nycConfigVisible,
    setActiveTouchpointKey,
    setSearchQuery,
    setSortField,
    setAssignedStaffId,
    fetchCustomerList,
    handleTabChange,
    handleTableChange,
    handlePaginationChange,
    handleOpenNewBooking,
    handleDetailClose,
    handleDetailDeleteSuccess,
    handleBookingWizardClose,
    handleBookingWizardSuccess,
    handleCloseSmsModal,
    handleResizeMouseDown,
    handleConfigTabChange,
    handleSaveConfig,
    handleCloseSettingsModal,
    handleOpenResetConfirm,
    handleCancelResetConfirm,
    handleConfirmResetDefaults,
    openNycConfig,
    closeNycConfig,
    saveNycConfig,
    resetNycConfig,
    getRowClassName,
  };
}
