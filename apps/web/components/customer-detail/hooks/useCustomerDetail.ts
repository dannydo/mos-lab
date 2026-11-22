'use client';

import { useRef, useState } from 'react';
import {
  getComboDisplayInfo,
  getFavoriteBranch,
  getFavoriteTechnicians,
  getFavoriteTimeSlot,
  getMostFrequentDay,
  getRecentTechnician,
  getRecentVisitTime,
  isCompletedOrValidVisit,
} from './use-customer-detail/customerDetailHelpers';
import type { UseCustomerDetailProps } from './use-customer-detail/types';
import { useCustomerDataAndTabs } from './use-customer-detail/useCustomerDataAndTabs';
import { useCustomerMutations } from './use-customer-detail/useCustomerMutations';
import { useResizableCustomerPanels } from './use-customer-detail/useResizableCustomerPanels';

export type {
  ComboDisplayInfo,
  CustomerCounts,
  CustomerTabDataEntry,
  CustomerTabDataMap,
  DragStartInfo,
  ResizeDirection,
  UseCustomerDetailProps,
} from './use-customer-detail/types';
export {
  getComboDisplayInfo,
  getFavoriteBranch,
  getFavoriteTechnicians,
  getFavoriteTimeSlot,
  getMostFrequentDay,
  getRecentTechnician,
  getRecentVisitTime,
  isCompletedOrValidVisit,
};

export function useCustomerDetail(options: UseCustomerDetailProps) {
  const { open, customerId, editForm } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<SafeAny>(null);
  const [isGemModalOpen, setIsGemModalOpen] = useState(false);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [bookingWizardOpen, setBookingWizardOpen] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);

  const dataState = useCustomerDataAndTabs({ open, customerId, optionsRef });
  const panelState = useResizableCustomerPanels();
  const mutationState = useCustomerMutations({
    customerId,
    customer: dataState.customer,
    editForm,
    optionsRef,
    refreshAllDetails: dataState.refreshAllDetails,
  });

  return {
    // tab states & caching
    activeTab: dataState.activeTab,
    tabDataMap: dataState.tabDataMap,
    handleTabChange: dataState.handleTabChange,
    fetchTabData: dataState.fetchTabData,
    counts: dataState.counts,
    // states
    loading: dataState.loading,
    data: dataState.data,
    detailData: dataState.detailData,
    rescheduleModalVisible,
    selectedBookingForReschedule,
    isGemModalOpen,
    isComboModalOpen,
    bookingWizardOpen,
    deleteLoading: mutationState.deleteLoading,
    isEditModalOpen: mutationState.isEditModalOpen,
    editForm,
    saveLoading: mutationState.saveLoading,
    restoreLoading: mutationState.restoreLoading,
    forbiddenError: dataState.forbiddenError,
    drawerWidth: panelState.drawerWidth,
    isDragging: panelState.isDragging,
    modalWidth: panelState.modalWidth,
    gemModalWidth: panelState.gemModalWidth,
    isTipModalOpen,
    tipModalWidth: panelState.tipModalWidth,
    isRevenueModalOpen,
    revenueModalWidth: panelState.revenueModalWidth,
    // data items
    customer: dataState.customer,
    stats: dataState.stats,
    comboBalances: dataState.comboBalances,
    bookings: dataState.bookings,
    notes: dataState.notes,
    calls: dataState.calls,
    // handlers
    setRescheduleModalVisible,
    setSelectedBookingForReschedule,
    setIsGemModalOpen,
    setIsComboModalOpen,
    setBookingWizardOpen,
    setIsEditModalOpen: mutationState.setIsEditModalOpen,
    setIsTipModalOpen,
    setIsRevenueModalOpen,
    fetchDetails: dataState.fetchDetails,
    loadDetailedData: dataState.loadDetailedData,
    refetchTabData: dataState.refetchTabData,
    refreshBookingHistory: dataState.refreshBookingHistory,
    refreshAllDetails: dataState.refreshAllDetails,
    handleMouseDown: panelState.handleMouseDown,
    handleModalDragStart: panelState.handleModalDragStart,
    handleGemModalDragStart: panelState.handleGemModalDragStart,
    handleTipModalDragStart: panelState.handleTipModalDragStart,
    handleRevenueModalDragStart: panelState.handleRevenueModalDragStart,
    handleOpenEditModal: mutationState.handleOpenEditModal,
    handleSaveEdit: mutationState.handleSaveEdit,
    handleToggleForeign: mutationState.handleToggleForeign,
    handleDeleteCustomer: mutationState.handleDeleteCustomer,
    handleRestoreCustomer: mutationState.handleRestoreCustomer,
    handleCancelBooking: mutationState.handleCancelBooking,
    handleUnpinNote: mutationState.handleUnpinNote,
    handlePinToggle: mutationState.handlePinToggle,
    unpinLoading: mutationState.unpinLoading,
    // helpers
    getMostFrequentDay,
    getFavoriteTechnicians,
    getComboDisplayInfo,
    getFavoriteBranch,
    getRecentTechnician,
    getFavoriteTimeSlot,
    getRecentVisitTime,
  };
}
