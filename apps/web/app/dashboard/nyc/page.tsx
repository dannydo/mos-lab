'use client';

import '../../suppress-warnings';
import React from 'react';
import dynamic from 'next/dynamic';
import { ResizableHeaderCell } from '../../../components/ResizableHeaderCell';
import { DataTable } from '../../../components/ui';
import { NycHeaderBanner } from './nyc-page-modules/NycHeaderBanner';
import { NycToolbarSection } from './nyc-page-modules/NycToolbarSection';
import { NycTouchpointSettingsModal } from './nyc-page-modules/NycTouchpointSettingsModal';
import { NYC_PAGE_SIZE_OPTIONS } from './nyc-page-modules/nycPageTypes';
import { useNycPageController } from './nyc-page-modules/useNycPageController';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('../../../components/BookingWizardDrawer'), { ssr: false });
const TableConfigDrawer = dynamic(
  () => import('../../../components/TableConfigDrawer').then((m) => m.TableConfigDrawer),
  { ssr: false }
);
const SMSModal = dynamic(() => import('../../../components/sms/SMSModal').then((m) => m.SMSModal), { ssr: false });

export default function NycCampaignPage() {
  const {
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
  } = useNycPageController();

  return (
    <div className="responsive-page responsive-workspace nyc-page">
      <NycHeaderBanner
        themeMode={themeMode}
        currentUser={currentUser}
        tabCounts={tabCounts}
        overallStats={overallStats}
        assignedStaffId={assignedStaffId}
        bookerStaffList={bookerStaffList}
        onAssignedStaffChange={setAssignedStaffId}
        onOpenNewBooking={handleOpenNewBooking}
      />

      <NycToolbarSection
        themeMode={themeMode}
        activeTab={activeTab}
        activeTouchpointKey={activeTouchpointKey}
        tabCounts={tabCounts}
        touchpointCounts={touchpointCounts}
        activeTouchpointsList={activeTouchpointsList}
        searchQuery={searchQuery}
        sortField={sortField}
        onTabChange={handleTabChange}
        onTouchpointChange={setActiveTouchpointKey}
        onSearchChange={setSearchQuery}
        onSortChange={setSortField}
        onOpenTableConfig={openNycConfig}
      />

      <DataTable
        columns={nycConfigColumns}
        dataSource={customers}
        rowKey="id"
        loading={loading}
        className="antd-custom-table"
        onChange={handleTableChange}
        pagination={{
          current: currentPage,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: NYC_PAGE_SIZE_OPTIONS,
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

      {currentUser?.role === 'admin' && (
        <NycTouchpointSettingsModal
          open={settingsModalVisible}
          themeMode={themeMode}
          modalWidth={modalWidth}
          modalHeight={modalHeight}
          selectedConfigTab={selectedConfigTab}
          settingsForm={settingsForm}
          resetConfirmOpen={resetConfirmOpen}
          resettingConfig={resettingConfig}
          onCancel={handleCloseSettingsModal}
          onSave={handleSaveConfig}
          onConfigTabChange={handleConfigTabChange}
          onResizeMouseDown={handleResizeMouseDown}
          onOpenResetConfirm={handleOpenResetConfirm}
          onCancelResetConfirm={handleCancelResetConfirm}
          onConfirmResetDefaults={handleConfirmResetDefaults}
        />
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
        visible={nycConfigVisible}
        onClose={closeNycConfig}
        columns={nycRawConfig}
        onSave={saveNycConfig}
        onReset={resetNycConfig}
      />

      <SMSModal
        open={smsModalVisible}
        onClose={handleCloseSmsModal}
        customer={selectedCustomer}
        onSuccess={fetchCustomerList}
      />

      <style jsx global>{`
        /* Custom styles for Ant Design Table under Dark & Light Mode */
        .dark-theme .antd-custom-table .ant-table {
          background: #111827 !important;
          color: #cbd5e1 !important;
        }
        .light-theme .antd-custom-table .ant-table {
          background: #ffffff !important;
          color: #0f172a !important;
        }
        .dark-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #1e293b !important;
          color: #d4a84b !important;
          border-bottom: 1px solid #334155 !important;
        }
        .light-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #9e7118 !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .antd-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #1f2937 !important;
        }
        .light-theme .antd-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .antd-custom-table .ant-table-row:hover > td {
          background: #1e293b !important;
        }
        .light-theme .antd-custom-table .ant-table-row:hover > td {
          background: #f1f5f9 !important;
        }

        /* Row highlighting - Light Theme */
        .light-theme .row-missed-light > td {
          background-color: #fff1f0 !important;
        }
        .light-theme .row-booked-future-light > td {
          background-color: #f6ffed !important;
        }
        .light-theme .row-hope-light > td {
          background-color: #fffbe6 !important;
        }
        .light-theme .row-missed-light:hover > td {
          background-color: #ffe8e6 !important;
        }
        .light-theme .row-booked-future-light:hover > td {
          background-color: #ebfcdd !important;
        }
        .light-theme .row-hope-light:hover > td {
          background-color: #fffac6 !important;
        }

        /* Row highlighting - Dark Theme */
        .dark-theme .row-missed-dark > td {
          background-color: #2a1215 !important;
        }
        .dark-theme .row-booked-future-dark > td {
          background-color: #162c1b !important;
        }
        .dark-theme .row-hope-dark > td {
          background-color: #2b2111 !important;
        }
        .dark-theme .row-missed-dark:hover > td {
          background-color: #381b1e !important;
        }
        .dark-theme .row-booked-future-dark:hover > td {
          background-color: #1e3a24 !important;
        }
        .dark-theme .row-hope-dark:hover > td {
          background-color: #382c16 !important;
        }

        /* Gold highlights for both light/dark */
        .antd-custom-table .ant-pagination-item-active {
          border-color: #d4a84b !important;
        }
        .antd-custom-table .ant-pagination-item-active a {
          color: #d4a84b !important;
        }

        /* Compact line height & padding */
        .antd-custom-table .ant-table-tbody > tr > td {
          padding: 6px 8px !important;
          line-height: 1.25 !important;
        }
        .antd-custom-table .ant-table-thead > tr > th {
          padding: 8px 8px !important;
          line-height: 1.25 !important;
        }
      `}</style>
    </div>
  );
}
