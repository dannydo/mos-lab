'use client';

import React from 'react';
import { Select, Typography } from 'antd';
import { SearchField } from '~/components/ui';
import {
  AUDIT_SERVICE_FILTER_OPTIONS,
  AUDIT_STATUS_FILTER_OPTIONS,
  type AppointmentsAuditServiceFilter,
  type AppointmentsAuditStatusFilter,
} from './appointmentsAuditTypes';

const { Text } = Typography;

export interface AuditFilterBarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  statusFilter: AppointmentsAuditStatusFilter;
  onStatusFilterChange: (value: AppointmentsAuditStatusFilter) => void;
  serviceFilter: AppointmentsAuditServiceFilter;
  onServiceFilterChange: (value: AppointmentsAuditServiceFilter) => void;
  filteredCount: number;
  totalCount: number;
}

export function AuditFilterBar({
  searchText,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  serviceFilter,
  onServiceFilterChange,
  filteredCount,
  totalCount,
}: AuditFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          behavior="filter"
          placeholder="Tìm kiếm tên, số điện thoại khách hàng..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:w-[280px]"
          allowClear
        />
        <Select<AppointmentsAuditStatusFilter>
          value={statusFilter}
          onChange={onStatusFilterChange}
          className="w-[190px]"
          options={[...AUDIT_STATUS_FILTER_OPTIONS]}
        />
        <Select<AppointmentsAuditServiceFilter>
          value={serviceFilter}
          onChange={onServiceFilterChange}
          className="w-[190px]"
          options={[...AUDIT_SERVICE_FILTER_OPTIONS]}
        />
      </div>

      <Text type="secondary" className="tabular-nums">
        Hiển thị <strong>{filteredCount}</strong> / {totalCount} khách hàng
      </Text>
    </div>
  );
}
