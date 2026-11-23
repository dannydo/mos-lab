'use client';

import React from 'react';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { canManageCustomerAllocation, type Customer } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { ResizableHeaderCell } from '../../../../components/ResizableHeaderCell';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';
import { useTableConfig } from '../../../../hooks/useTableConfig';
import { DataTable } from '../../../../components/ui';
import { CustomerTableMobileCard } from './customer-table/CustomerTableMobileCard';
import { buildCustomerTableColumns } from './customer-table/customer-table-columns';
import {
  CUSTOMER_COLUMN_PRIORITY,
  getCustomerRowClassName,
  resolveCustomerTableSortField,
} from './customer-table/customer-table-utils';

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  total: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  sortField?: string;
  onSortChange?: (sortField: string) => void;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
  currentUser: SafeAny;
  openDetailModal: (customer: Customer) => void;
  sentinelRef?: SafeAny;
  dailyPlanList?: number[];
  addingIds?: number[];
  handleAddToPlan?: (customerId: number) => void;
  handleOpenSmsModal?: (customer: Customer) => void;
}

const CustomerTable = React.memo(
  React.forwardRef<{ openConfig: () => void }, CustomerTableProps>(function CustomerTable(
    {
      customers,
      loading,
      total,
      currentPage,
      setCurrentPage,
      pageSize,
      setPageSize,
      sortField,
      onSortChange,
      selectedRowKeys,
      setSelectedRowKeys,
      currentUser,
      openDetailModal,
      dailyPlanList = [],
      addingIds = [],
      handleAddToPlan,
      handleOpenSmsModal,
    },
    ref
  ) {
    const { themeMode } = useTheme();
    const { makeCall, canAccessOmiCall, isAdmin, adminOmiCallEnabled } = useOmiCall();
    const canMakeCall = canAccessOmiCall && (!isAdmin || adminOmiCallEnabled);
    const isManagerOrAdmin = canManageCustomerAllocation(currentUser?.role);

    const columns: ColumnsType<Customer> = React.useMemo<ColumnsType<Customer>>(
      () =>
        buildCustomerTableColumns({
          currentPage,
          pageSize,
          sortField,
          canMakeCall,
          makeCall,
          openDetailModal,
          dailyPlanList,
          addingIds,
          handleAddToPlan,
          handleOpenSmsModal,
        }),
      [
        canMakeCall,
        makeCall,
        openDetailModal,
        currentPage,
        pageSize,
        sortField,
        dailyPlanList,
        addingIds,
        handleAddToPlan,
        handleOpenSmsModal,
      ]
    );

    const staticColumns: ColumnsType<Customer> = React.useMemo<ColumnsType<Customer>>(() => {
      return columns.filter((col) => col.key !== 'assignedStaff' || isManagerOrAdmin);
    }, [columns, isManagerOrAdmin]);

    const {
      loading: configLoading,
      columns: mergedColumns,
      rawConfig,
      configVisible,
      openConfig,
      closeConfig,
      saveConfig,
      resetConfig,
    } = useTableConfig('customer_table', staticColumns);

    React.useImperativeHandle(ref, () => ({
      openConfig,
    }));

    const getSelectionCheckboxProps = React.useCallback(
      (record: Customer) =>
        ({
          // Ant Design forwards this DOM attribute, but its CheckboxProps type
          // omits ARIA attributes. Keep the input name specific to the record.
          'aria-label': `Chọn ${record.name}`,
        }) as unknown as ReturnType<NonNullable<NonNullable<TableProps<Customer>['rowSelection']>['getCheckboxProps']>>,
      []
    );

    const handleTableChange = React.useCallback<NonNullable<TableProps<Customer>['onChange']>>(
      (_pagination, _filters, tableSorter) => {
        if (!onSortChange) return;
        const nextSortField = resolveCustomerTableSortField(tableSorter);
        if (nextSortField && nextSortField !== sortField) {
          onSortChange(nextSortField);
        }
      },
      [onSortChange, sortField]
    );

    return (
      <>
        <DataTable
          dataSource={customers}
          columns={mergedColumns}
          rowKey="id"
          rowClassName={(record) => getCustomerRowClassName(record, themeMode)}
          size="small"
          loading={loading || configLoading}
          onChange={handleTableChange}
          rowSelection={
            isManagerOrAdmin
              ? {
                  selectedRowKeys,
                  onChange: (newSelectedRowKeys) => {
                    setSelectedRowKeys(newSelectedRowKeys);
                  },
                  columnTitle: <span className="sr-only">Chọn khách hàng</span>,
                  getCheckboxProps: getSelectionCheckboxProps,
                  preserveSelectedRowKeys: true,
                }
              : undefined
          }
          columnPriority={{ ...CUSTOMER_COLUMN_PRIORITY }}
          mobileRecordKey={(record) => record.id}
          mobileEmptyDescription="Không tìm thấy khách hàng phù hợp"
          mobileRenderer={(record) => (
            <CustomerTableMobileCard
              record={record}
              isManagerOrAdmin={isManagerOrAdmin}
              selectedRowKeys={selectedRowKeys}
              onChangeSelectedRowKeys={setSelectedRowKeys}
              openDetailModal={openDetailModal}
              canMakeCall={canMakeCall}
              makeCall={makeCall}
              dailyPlanList={dailyPlanList}
              addingIds={addingIds}
              handleAddToPlan={handleAddToPlan}
            />
          )}
          stickyPrimaryColumn
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, size) => {
              setCurrentPage(page);
              if (size !== pageSize) {
                setPageSize(size);
                localStorage.setItem('mos_customers_pageSize', size.toString());
              }
              window.scrollTo({ top: 200, behavior: 'smooth' });
            },
            showTotal: (totalCount) => `Tổng số: ${totalCount} khách hàng`,
          }}
          scroll={{ x: 'max-content', y: 650 }}
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
          }}
          className="customer-data-table"
        />

        <TableConfigDrawer
          visible={configVisible}
          onClose={closeConfig}
          columns={rawConfig}
          onSave={saveConfig}
          onReset={resetConfig}
        />
      </>
    );
  })
);

export default CustomerTable;
