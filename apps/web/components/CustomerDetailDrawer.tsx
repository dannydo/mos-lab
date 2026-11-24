'use client';

import React from 'react';
import { AdaptiveDrawer } from './ui';
import { CustomerDetailBody } from './customer-detail-drawer/CustomerDetailBody';
import { CustomerDetailHeader } from './customer-detail-drawer/CustomerDetailHeader';
import { CustomerDetailModals } from './customer-detail-drawer/CustomerDetailModals';
import type { CustomerDetailDrawerProps } from './customer-detail-drawer/types';
import { useCustomerDetailDrawerState } from './customer-detail-drawer/useCustomerDetailDrawerState';

export type { CustomerDetailDrawerProps } from './customer-detail-drawer/types';

const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  open,
  customerId,
  onClose,
  onDeleteSuccess,
  onUpdate,
  zIndex = 2000,
}) => {
  const state = useCustomerDetailDrawerState({
    open,
    customerId,
    onClose,
    onDeleteSuccess,
    onUpdate,
  });

  const {
    themeMode,
    responsiveTier,
    isCompactTier,
    drawerWidth,
    isDragging,
    handleMouseDown,
    customer,
    isMaskedRole,
    canMakeCall,
    isManagerOrAdmin,
    restoreLoading,
    deleteLoading,
    legacyProfileUrl,
    makeCall,
    handleRestoreCustomer,
    handleDeleteCustomer,
    handleOpenEditModal,
    setIsNoteModalOpen,
    setBookingWizardOpen,
    loading,
    forbiddenError,
    data,
    stats,
    comboBalances,
    bookings,
    notes,
    calls,
    activeBookings,
    tabDataMap,
    counts,
    activeTabKey,
    currentUser,
    unpinLoading,
    setCurrentCustomerId,
    setIsGemModalOpen,
    setIsTipModalOpen,
    setIsRevenueModalOpen,
    setIsComboModalOpen,
    loadDetailedData,
    handleToggleForeign,
    refreshAllDetails,
    handleUnpinNote,
    handlePinToggle,
    handleTabChange,
    fetchTabData,
    handleCancelBooking,
    handleRescheduleRequest,
    getFavoriteBranch,
    getFavoriteTechnicians,
    getRecentTechnician,
    getMostFrequentDay,
    getFavoriteTimeSlot,
    getRecentVisitTime,
    getComboDisplayInfo,
    detailData,
    editForm,
    rescheduleModalVisible,
    selectedBookingForReschedule,
    setRescheduleModalVisible,
    setSelectedBookingForReschedule,
    rescheduleAlert,
    closeRescheduleAlert,
    isGemModalOpen,
    gemModalWidth,
    handleGemModalDragStart,
    isTipModalOpen,
    tipModalWidth,
    handleTipModalDragStart,
    isRevenueModalOpen,
    revenueModalWidth,
    handleRevenueModalDragStart,
    isComboModalOpen,
    modalWidth,
    handleModalDragStart,
    isEditModalOpen,
    setIsEditModalOpen,
    handleSaveEdit,
    saveLoading,
    isNoteModalOpen,
    bookingWizardOpen,
  } = state;

  const canViewOmicallQa = ['admin', 'super_admin', 'manager', 'qa', 'qc', 'qa_qc'].includes(
    String(currentUser?.role || '').toLowerCase()
  );

  return (
    <AdaptiveDrawer
      intent="detail"
      className="customer-detail-overlay"
      zIndex={zIndex}
      maskClosable={!isNoteModalOpen && !isEditModalOpen && !rescheduleModalVisible && !bookingWizardOpen}
      title={
        customer && (
          <CustomerDetailHeader
            customer={customer}
            themeMode={themeMode}
            isCompactTier={isCompactTier}
            isMaskedRole={isMaskedRole}
            canMakeCall={canMakeCall}
            isManagerOrAdmin={isManagerOrAdmin}
            canViewOmicallQa={canViewOmicallQa}
            restoreLoading={restoreLoading}
            deleteLoading={deleteLoading}
            legacyProfileUrl={legacyProfileUrl}
            onClose={onClose}
            makeCall={makeCall}
            onRestoreCustomer={handleRestoreCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onOpenEditModal={handleOpenEditModal}
            onOpenNoteModal={() => setIsNoteModalOpen(true)}
            onOpenBookingWizard={() => setBookingWizardOpen(true)}
          />
        )
      }
      placement="right"
      width={isCompactTier ? undefined : responsiveTier === 'desktop' ? drawerWidth : 'min(88vw, 1280px)'}
      open={open}
      onClose={onClose}
      styles={{
        body: {
          background: themeMode === 'dark' ? '#0f172a' : '#f9fafb',
          padding: isCompactTier ? '16px 12px 32px' : '24px',
        },
        header: {
          background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
          paddingTop: isCompactTier ? 'max(14px, env(safe-area-inset-top, 0px))' : undefined,
        },
      }}
    >
      {/* Drag handle for resizable drawer */}
      {!isCompactTier && (
        <div
          onMouseDown={handleMouseDown}
          className={`absolute inset-y-0 left-0 z-[1000] w-1.5 cursor-ew-resize transition-colors duration-200 ${
            isDragging ? 'border-l-2 border-amber-500 bg-amber-500' : 'bg-transparent hover:bg-amber-500/30'
          }`}
        />
      )}

      <CustomerDetailBody
        loading={loading}
        forbiddenError={forbiddenError}
        themeMode={themeMode}
        data={data}
        customer={customer}
        stats={stats}
        comboBalances={comboBalances}
        bookings={bookings}
        notes={notes}
        calls={calls}
        activeBookings={activeBookings}
        tabDataMap={tabDataMap}
        counts={counts}
        activeTabKey={activeTabKey}
        currentUser={currentUser}
        isManagerOrAdmin={isManagerOrAdmin}
        unpinLoading={unpinLoading}
        onClose={onClose}
        onSelectCustomerId={setCurrentCustomerId}
        onOpenGemModal={() => setIsGemModalOpen(true)}
        onOpenTipModal={() => setIsTipModalOpen(true)}
        onOpenRevenueModal={() => setIsRevenueModalOpen(true)}
        onOpenComboModal={() => setIsComboModalOpen(true)}
        onLoadDetailedData={loadDetailedData}
        onToggleForeign={handleToggleForeign}
        onRefreshAllDetails={refreshAllDetails}
        onUnpinNote={handleUnpinNote}
        onPinToggle={handlePinToggle}
        onTabChange={handleTabChange}
        onFetchTabData={fetchTabData}
        onCancelBooking={handleCancelBooking}
        onRequestReschedule={handleRescheduleRequest}
        getFavoriteBranch={getFavoriteBranch}
        getFavoriteTechnicians={getFavoriteTechnicians}
        getRecentTechnician={getRecentTechnician}
        getMostFrequentDay={getMostFrequentDay}
        getFavoriteTimeSlot={getFavoriteTimeSlot}
        getRecentVisitTime={getRecentVisitTime}
        getComboDisplayInfo={getComboDisplayInfo}
      />

      <CustomerDetailModals
        themeMode={themeMode}
        customer={customer}
        detailData={detailData}
        comboBalances={comboBalances}
        editForm={editForm}
        rescheduleModalVisible={rescheduleModalVisible}
        selectedBookingForReschedule={selectedBookingForReschedule}
        onCloseRescheduleModal={() => {
          setRescheduleModalVisible(false);
          setSelectedBookingForReschedule(null);
        }}
        rescheduleAlert={rescheduleAlert}
        onCloseRescheduleAlert={closeRescheduleAlert}
        isGemModalOpen={isGemModalOpen}
        onCloseGemModal={() => setIsGemModalOpen(false)}
        gemModalWidth={gemModalWidth}
        handleGemModalDragStart={handleGemModalDragStart}
        isTipModalOpen={isTipModalOpen}
        onCloseTipModal={() => setIsTipModalOpen(false)}
        tipModalWidth={tipModalWidth}
        handleTipModalDragStart={handleTipModalDragStart}
        isRevenueModalOpen={isRevenueModalOpen}
        onCloseRevenueModal={() => setIsRevenueModalOpen(false)}
        revenueModalWidth={revenueModalWidth}
        handleRevenueModalDragStart={handleRevenueModalDragStart}
        isComboModalOpen={isComboModalOpen}
        onCloseComboModal={() => setIsComboModalOpen(false)}
        modalWidth={modalWidth}
        handleModalDragStart={handleModalDragStart}
        isEditModalOpen={isEditModalOpen}
        onCloseEditModal={() => setIsEditModalOpen(false)}
        onSaveEdit={handleSaveEdit}
        saveLoading={saveLoading}
        isNoteModalOpen={isNoteModalOpen}
        onCloseNoteModal={() => setIsNoteModalOpen(false)}
        bookingWizardOpen={bookingWizardOpen}
        onCloseBookingWizard={() => setBookingWizardOpen(false)}
        onRefreshAllDetails={refreshAllDetails}
      />
    </AdaptiveDrawer>
  );
};

export default CustomerDetailDrawer;
