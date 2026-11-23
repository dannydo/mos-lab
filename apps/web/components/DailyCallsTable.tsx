'use client';

import React, { useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { DailyCallEntry } from '@mos-lab/shared';
import { ResizableHeaderCell } from './ResizableHeaderCell';
import { DataTable } from './ui';
import { DailyCallsMobileCard } from './daily-calls-table/DailyCallsMobileCard';
import { DailyCallsToolbar } from './daily-calls-table/DailyCallsToolbar';
import {
  DAILY_CALLS_COLUMN_PRIORITY,
  DAILY_CALLS_PAGE_SIZE_OPTIONS,
} from './daily-calls-table/dailyCallsTableConstants';
import type { DailyCallsScope, DailyCallsTableProps } from './daily-calls-table/dailyCallsTableTypes';
import { useDailyCallsTable } from './daily-calls-table/useDailyCallsTable';

export type { DailyCallsScope, DailyCallsTableProps };

const CustomerDetailDrawer = dynamic(() => import('./CustomerDetailDrawer'), { ssr: false });
const TableConfigDrawer = dynamic(() => import('./TableConfigDrawer').then((m) => m.TableConfigDrawer), { ssr: false });
const QAPlayerDrawer = dynamic(() => import('./QAPlayerDrawer').then((m) => m.QAPlayerDrawer), { ssr: false });

export default function DailyCallsTable({ initialScope = 'all', isDrawerMode = false }: DailyCallsTableProps) {
  const {
    selectedDate,
    scope,
    loading,
    data,
    visibleData,
    isAdmin,
    staffList,
    selectedStaffId,
    pageSize,
    currentPage,
    isReady,
    configLoading,
    configuredColumns,
    rawConfig,
    configVisible,
    selectedCustomerId,
    customerDrawerOpen,
    qaDrawerOpen,
    selectedOmicallLogId,
    makeCall,
    openCustomerDetail,
    closeCustomerDrawer,
    closeQADrawer,
    openConfig,
    closeConfig,
    saveConfig,
    resetConfig,
    handlePrevDay,
    handleNextDay,
    handleToday,
    handleDateChange,
    handleScopeChange,
    handleStaffChange,
    handlePageChange,
    refreshCurrentCalls,
  } = useDailyCallsTable({ initialScope, isDrawerMode });

  const renderMobileCall = useCallback(
    (record: DailyCallEntry) => (
      <DailyCallsMobileCard record={record} onOpenCustomer={openCustomerDetail} onMakeCall={makeCall} />
    ),
    [openCustomerDetail, makeCall]
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <DailyCallsToolbar
        selectedDate={selectedDate}
        scope={scope}
        isAdmin={isAdmin}
        staffList={staffList}
        selectedStaffId={selectedStaffId}
        loading={loading}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
        onDateChange={handleDateChange}
        onScopeChange={handleScopeChange}
        onStaffChange={handleStaffChange}
        onOpenConfig={openConfig}
        onRefresh={refreshCurrentCalls}
      />

      {/* Table Section */}
      <div className="antd-custom-table w-full">
        <DataTable<DailyCallEntry>
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
          }}
          columns={configuredColumns}
          dataSource={visibleData}
          rowKey="id"
          loading={loading || configLoading || !isReady}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: data.length,
            showSizeChanger: true,
            pageSizeOptions: DAILY_CALLS_PAGE_SIZE_OPTIONS,
            onChange: handlePageChange,
            showTotal: (total) => `Tổng cộng ${total} cuộc gọi`,
          }}
          bordered
          scroll={{ x: 'max-content' }}
          className="daily-calls-custom-table"
          columnPriority={DAILY_CALLS_COLUMN_PRIORITY}
          mobileRenderer={renderMobileCall}
          mobileRecordKey={(record) => record.id}
          mobileEmptyDescription="Chưa có cuộc gọi trong ngày được chọn"
        />
      </div>

      {/* Table configuration Drawer */}
      <TableConfigDrawer
        visible={configVisible}
        onClose={closeConfig}
        columns={rawConfig}
        onSave={saveConfig}
        onReset={resetConfig}
      />

      {/* Customer details drawer */}
      <CustomerDetailDrawer open={customerDrawerOpen} customerId={selectedCustomerId} onClose={closeCustomerDrawer} />

      {/* QA Player Drawer */}
      <QAPlayerDrawer
        open={qaDrawerOpen}
        omicallLogId={selectedOmicallLogId}
        onClose={closeQADrawer}
        onVerifySuccess={refreshCurrentCalls}
      />

      <style jsx global>{`
        /* Overrides specific to daily calls table inside Dark & Light Theme */
        .dark-theme .daily-calls-custom-table .ant-table {
          background: #111827 !important;
          color: #cbd5e1 !important;
        }
        .light-theme .daily-calls-custom-table .ant-table {
          background: #ffffff !important;
          color: #0f172a !important;
        }
        .dark-theme .daily-calls-custom-table .ant-table-thead > tr > th {
          background: #1e293b !important;
          color: #d4a84b !important;
          border-bottom: 1px solid #334155 !important;
        }
        .light-theme .daily-calls-custom-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #9e7118 !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .daily-calls-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #1f2937 !important;
        }
        .light-theme .daily-calls-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .daily-calls-custom-table .ant-table-row:hover > td {
          background: #1e293b !important;
        }
        .light-theme .daily-calls-custom-table .ant-table-row:hover > td {
          background: #f1f5f9 !important;
        }

        /* Padding adjustments for desktop view */
        .daily-calls-custom-table .ant-table-tbody > tr > td {
          padding: 8px 12px !important;
          line-height: 1.3 !important;
        }
        .daily-calls-custom-table .ant-table-thead > tr > th {
          padding: 10px 12px !important;
          line-height: 1.3 !important;
        }
      `}</style>
    </div>
  );
}
