'use client';

import React from 'react';
import { Input, Select } from 'antd';
import { Search } from 'lucide-react';
import { AppIcon, SectionCard } from '~/components/ui';
import {
  STATUS_FILTER_OPTIONS,
  STORE_TYPE_FILTER_OPTIONS,
  type StatusFilter,
  type StoreTypeFilter,
} from './branchesPageTypes';

interface BranchesFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  storeTypeFilter: StoreTypeFilter;
  onStoreTypeFilterChange: (value: StoreTypeFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  visibleCount: number;
  total: number;
}

export function BranchesFilterToolbar({
  search,
  onSearchChange,
  storeTypeFilter,
  onStoreTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  visibleCount,
  total,
}: BranchesFilterToolbarProps) {
  return (
    <SectionCard className="p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <Input
            placeholder="Tìm kiếm theo mã chi nhánh, tên, địa chỉ, quận huyện..."
            prefix={<AppIcon icon={Search} size="sm" className="text-slate-400" />}
            allowClear
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full md:max-w-md"
          />

          <Select
            value={storeTypeFilter}
            onChange={onStoreTypeFilterChange}
            className="w-44"
            options={STORE_TYPE_FILTER_OPTIONS}
          />

          <Select
            value={statusFilter}
            onChange={onStatusFilterChange}
            className="w-40"
            options={STATUS_FILTER_OPTIONS}
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums self-end md:self-center">
          Hiển thị <span className="font-semibold text-slate-800 dark:text-slate-200">{visibleCount}</span> / {total}{' '}
          chi nhánh
        </div>
      </div>
    </SectionCard>
  );
}
