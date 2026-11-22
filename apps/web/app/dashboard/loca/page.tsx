'use client';

import '../../suppress-warnings';
import React from 'react';
import dynamic from 'next/dynamic';
import { Space, Tabs } from 'antd';
import { ResizableHeaderCell } from '../../../components/ResizableHeaderCell';
import { DataTable } from '../../../components/ui';
import { TAB_KEYS } from './hooks/useLocaData';
import { LocaAccessDeniedCard } from './loca-page-modules/LocaAccessDeniedCard';
import { LocaFilterBar } from './loca-page-modules/LocaFilterBar';
import { LocaHeaderSection } from './loca-page-modules/LocaHeaderSection';
import { LocaMetricsCards } from './loca-page-modules/LocaMetricsCards';
import styles from './loca-page-modules/LocaPage.module.css';
import { LocaTouchpointPipeline } from './loca-page-modules/LocaTouchpointPipeline';
import { LocaWorkflowSettingsTab } from './loca-page-modules/LocaWorkflowSettingsTab';
import { LOCA_PAGE_SIZE_OPTIONS } from './loca-page-modules/locaPageTypes';
import { useLocaPageController } from './loca-page-modules/useLocaPageController';

export type { TouchpointPalette } from './loca-page-modules/locaPageTypes';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('../../../components/BookingWizardDrawer'), { ssr: false });
const TableConfigDrawer = dynamic(
  () => import('../../../components/TableConfigDrawer').then((m) => m.TableConfigDrawer),
  { ssr: false }
);
const SMSModal = dynamic(() => import('../../../components/sms/SMSModal').then((m) => m.SMSModal), { ssr: false });
const LocaStaffActivityTab = dynamic(
  () => import('./components/LocaStaffActivityTab').then((m) => m.LocaStaffActivityTab),
  { ssr: false }
);

export default function LocaCampaignPage() {
  const {
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
  } = useLocaPageController();

  if (currentUser && !isLocaAllowed) {
    return <LocaAccessDeniedCard />;
  }

  const isDark = themeMode === 'dark';

  return (
    <div className={`responsive-page responsive-workspace loca-page ${styles.locaPage}`}>
      <LocaHeaderSection
        themeMode={themeMode}
        currentUser={currentUser}
        assignedStaffId={assignedStaffId}
        staffList={staffList}
        onAssignedStaffChange={setAssignedStaffId}
        onOpenNewBooking={handleOpenNewBooking}
      />

      <LocaMetricsCards themeMode={themeMode} overallStats={overallStats} tabCounts={tabCounts} />

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="card"
        destroyOnHidden
        className="mb-4"
        items={TAB_KEYS.map((tab) => {
          const tabCount = tabCounts[tab.id] || 0;
          const isActive = activeTab === tab.id;
          return {
            key: tab.id,
            label: (
              <Space>
                <span>{tab.name}</span>
                {tabCount > 0 && (
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold leading-none tabular-nums ${
                      isActive
                        ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)]'
                        : isDark
                          ? 'bg-neutral-700 text-white'
                          : 'bg-neutral-300 text-neutral-700'
                    }`}
                  >
                    {tabCount > 9999 ? '9999+' : tabCount}
                  </span>
                )}
              </Space>
            ),
          };
        })}
      />

      {activeTab === 'STAFF_ACTIVITY' ? (
        <LocaStaffActivityTab
          staffList={staffList}
          selectedStaffId={selectedActivityStaffId}
          onSelectStaff={setSelectedActivityStaffId}
          viewMode={activityViewMode}
          onViewModeChange={setActivityViewMode}
          referenceDate={activityReferenceDate}
          onNavigateDate={handleNavigateActivityDate}
          onReferenceDateChange={setActivityReferenceDate}
          searchQuery={activitySearchQuery}
          onSearchChange={setActivitySearchQuery}
          actionTypeFilter={activityActionTypeFilter}
          onActionTypeChange={setActivityActionTypeFilter}
          selectedTouchpointKey={activityTouchpointKey}
          onTouchpointKeyChange={setActivityTouchpointKey}
          stats={staffActivityStats}
          logs={staffActivityLogs}
          loading={staffActivityLoading}
          total={staffActivityTotal}
          currentPage={activityPage}
          pageSize={activityPageSize}
          onPageChange={handleActivityPageChange}
          onOpenCustomerDetail={handleOpenCustomerDetailById}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4">
            {activeTab === 'LOCA_ALL' && (
              <LocaTouchpointPipeline
                themeMode={themeMode}
                activeTouchpointKey={activeTouchpointKey}
                activeTouchpointsList={activeTouchpointsList}
                customTouchpoints={customTouchpoints}
                tabCounts={tabCounts}
                touchpointCounts={touchpointCounts}
                onSelectTouchpoint={setActiveTouchpointKey}
                onUpdateCustomTouchpoint={updateCustomTouchpoint}
              />
            )}

            <LocaFilterBar
              themeMode={themeMode}
              activeTab={activeTab}
              contactSubTab={contactSubTab}
              datePreset={datePreset}
              selectedDate={selectedDate}
              bookingStatusFilter={bookingStatusFilter}
              searchQuery={searchQuery}
              onContactSubTabChange={setContactSubTab}
              onDatePresetChange={setDatePreset}
              onSelectedDateChange={setSelectedDate}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onBookingStatusFilterChange={setBookingStatusFilter}
              onSearchChange={setSearchQuery}
              onOpenTableConfig={openLocaConfig}
            />
          </div>

          <DataTable
            size="small"
            columns={activeTab === 'NEW_LOCA' ? newLocaColumns : locaConfigColumns}
            dataSource={customers}
            rowKey="id"
            loading={loading}
            className="antd-custom-table loca-customer-table"
            scroll={{ x: 'max-content' }}
            onChange={handleTableChange}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: LOCA_PAGE_SIZE_OPTIONS,
              onChange: handlePaginationChange,
              showTotal: (totalCount) => `Tổng số: ${totalCount} khách hàng`,
            }}
            rowClassName={(record) => getRowClassName(record, themeMode)}
            components={{
              header: {
                cell: ResizableHeaderCell,
              },
            }}
            stickyPrimaryColumn
          />
        </>
      )}

      {detailModalVisible && selectedCustomer && (
        <CustomerDetailDrawer
          open={detailModalVisible}
          customerId={selectedCustomer.id}
          onClose={handleDetailClose}
          onDeleteSuccess={handleDetailDeleteSuccess}
          onUpdate={fetchCustomerList}
        />
      )}

      {bookingWizardVisible && (
        <BookingWizardDrawer
          open={bookingWizardVisible}
          onClose={handleBookingWizardClose}
          onSuccess={handleBookingWizardSuccess}
          initialCustomer={bookingInitialCustomer}
        />
      )}

      <TableConfigDrawer
        visible={locaConfigVisible}
        columns={locaRawConfig}
        onClose={closeLocaConfig}
        onSave={saveLocaConfig}
        onReset={resetLocaConfig}
        extraTabTitle="Quy Trình & Nghiệp Vụ"
        extraTabContent={
          <LocaWorkflowSettingsTab
            themeMode={themeMode}
            settingsForm={settingsForm}
            resetConfirmOpen={resetConfirmOpen}
            resettingConfig={resettingConfig}
            onSaveConfig={handleSaveConfig}
            onOpenResetConfirm={handleOpenResetConfirm}
            onCancelResetConfirm={handleCancelResetConfirm}
            onConfirmResetDefaults={handleConfirmResetDefaults}
          />
        }
      />

      <SMSModal
        open={smsModalVisible}
        onClose={handleCloseSmsModal}
        customer={selectedCustomer}
        onSuccess={fetchCustomerList}
      />
    </div>
  );
}
