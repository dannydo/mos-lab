'use client';

import React from 'react';
import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Eye, Phone } from 'lucide-react';
import { CALL_RESULT_LABELS } from '@mos-lab/shared';
import CalendarPlusIcon from '~/components/icons/CalendarPlusIcon';
import { CopyPhoneButton, DataTable, StatusTag } from '~/components/ui';
import {
  CAMPAIGN_PAGE_SIZE_OPTIONS,
  getCampaignCustomerKey,
  getCampaignCustomerRowClassName,
} from './campaignDetailUtils';

export interface CampaignCustomerTableSectionProps {
  isAdmin: boolean;
  selectedRowKeys: React.Key[];
  onRowSelectionChange: (keys: React.Key[], rows: any[]) => void;
  columns: ColumnsType<any>;
  tableCustomers: any[];
  loading: boolean;
  currentPage: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize?: number) => void;
  themeMode: 'light' | 'dark';
  onOpenCustomerDetail: (record: any) => void;
  onMakeCall: (phone: string) => void;
  onOpenBooking: (record: any) => void;
}

export function CampaignCustomerTableSection({
  isAdmin,
  selectedRowKeys,
  onRowSelectionChange,
  columns,
  tableCustomers,
  loading,
  currentPage,
  pageSize,
  total,
  onPageChange,
  themeMode,
  onOpenCustomerDetail,
  onMakeCall,
  onOpenBooking,
}: CampaignCustomerTableSectionProps) {
  return (
    <DataTable
      size="small"
      tableLayout="fixed"
      rowSelection={
        isAdmin
          ? {
              preserveSelectedRowKeys: true,
              selectedRowKeys,
              onChange: onRowSelectionChange,
            }
          : undefined
      }
      columns={columns}
      dataSource={tableCustomers}
      rowKey={(record) => getCampaignCustomerKey(record)}
      loading={loading}
      pagination={{
        current: currentPage,
        pageSize,
        total,
        onChange: onPageChange,
        showSizeChanger: true,
        pageSizeOptions: CAMPAIGN_PAGE_SIZE_OPTIONS,
        showTotal: (count) => `Tổng số: ${count} khách hàng`,
      }}
      rowClassName={(record) => getCampaignCustomerRowClassName(record, themeMode)}
      className="antd-custom-table"
      columnPriority={{ customer: 'primary', booker: 'secondary', lastCallResult: 'secondary', actions: 'primary' }}
      mobileRenderer={(record: any) => {
        const customerName = record.customerName || record.name || 'Khách hàng';
        const phone = record.customerPhone || record.phone || record.phones?.[0]?.phone_number;
        const bookerName =
          record.assignedBookerName ||
          record.assignedBooker?.name ||
          record.assignedStaff?.displayName ||
          'Chưa phân bổ';
        const callResult = record.lastCallResult || record.lastCall?.callResult;
        const callResultLabel = callResult
          ? (CALL_RESULT_LABELS as Record<string, string>)[callResult] || callResult
          : null;

        return (
          <div className="space-y-2">
            <button
              type="button"
              className="block w-full text-left font-semibold text-slate-900 dark:text-slate-100"
              onClick={() => onOpenCustomerDetail(record)}
            >
              {customerName}
            </button>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {phone && (
                <span className="inline-flex items-center gap-1">
                  <span className="tabular-nums">{phone}</span>
                  <CopyPhoneButton phone={phone} size="xs" />
                </span>
              )}
              <StatusTag status="cyan" label={bookerName} />
              {callResultLabel && <StatusTag status="default" label={callResultLabel} />}
            </div>
            <div className="flex flex-wrap gap-2">
              {phone && (
                <Button size="small" icon={<Phone className="h-3.5 w-3.5" />} onClick={() => onMakeCall(phone)}>
                  Gọi
                </Button>
              )}
              <Button size="small" icon={<CalendarPlusIcon fontSize={14} />} onClick={() => onOpenBooking(record)}>
                Đặt lịch
              </Button>
              <Button size="small" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => onOpenCustomerDetail(record)}>
                Chi tiết
              </Button>
            </div>
          </div>
        );
      }}
    />
  );
}
