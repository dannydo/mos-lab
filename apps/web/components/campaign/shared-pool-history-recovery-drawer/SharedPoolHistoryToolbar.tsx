'use client';

import React from 'react';
import { Button, Input, Select } from 'antd';
import { Filter, Search, ShieldCheck } from 'lucide-react';
import { ACTION_FILTER_OPTIONS } from './sharedPoolHistoryTypes';

export interface SharedPoolHistoryToolbarProps {
  total: number;
  actionFilter: string;
  searchQuery: string;
  onActionFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
}

export const SharedPoolHistoryToolbar: React.FC<SharedPoolHistoryToolbarProps> = ({
  total,
  actionFilter,
  searchQuery,
  onActionFilterChange,
  onSearchQueryChange,
  onSearch,
}) => (
  <>
    {/* Safety Guarantees Notice */}
    <div className="mb-4 p-3 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
        <ShieldCheck size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
        <span>
          <strong>Nguyên tắc an toàn mOS:</strong> Nhật ký lưu trữ bất biến (Append-only). Mỗi lần hoàn tác tạo thêm 1
          log mới, bắt buộc có lý do và ghi nhận danh tính Quản lý.
        </span>
      </div>
      <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
        Tổng cộng: <strong>{total}</strong> thao tác
      </span>
    </div>

    {/* Filter Bar */}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Filter size={12} /> Lọc thao tác:
        </span>
        <Select
          size="small"
          value={actionFilter}
          onChange={onActionFilterChange}
          className="w-full sm:w-[190px]"
          options={[...ACTION_FILTER_OPTIONS]}
        />
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Input
          size="small"
          placeholder="Tìm theo Tên KH, SĐT, Mã KH hoặc Tên NV..."
          prefix={<Search size={13} className="text-slate-400" />}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onPressEnter={onSearch}
          allowClear
          className="w-full sm:w-[280px]"
        />
        <Button size="small" type="primary" onClick={onSearch}>
          Tìm
        </Button>
      </div>
    </div>
  </>
);
