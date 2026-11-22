'use client';

import React from 'react';
import { Space } from 'antd';
import { Maximize2, Minimize2, RefreshCw, Settings } from 'lucide-react';
import { IconButton, SearchField } from '~/components/ui';

interface CcXoayTableHeaderProps {
  searchText: string;
  onSearchChange: (nextValue: string) => void;
  isCompact: boolean;
  onToggleCompact: () => void;
  onRefresh?: () => void;
  onOpenConfig: () => void;
}

export function CcXoayTableHeader({
  searchText,
  onSearchChange,
  isCompact,
  onToggleCompact,
  onRefresh,
  onOpenConfig,
}: CcXoayTableHeaderProps) {
  return (
    <div className="flex flex-wrap justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-base m-0 text-slate-900 dark:text-slate-100">Bảng Dữ Liệu Báo Cáo CC Xoay</h3>
      </div>

      <Space wrap>
        <SearchField
          aria-label="Tìm kiếm khách hàng, dịch vụ, CC"
          placeholder="Tìm khách hàng, dịch vụ, CC..."
          behavior="filter"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full sm:w-[220px]"
          allowClear
        />
        <IconButton
          label={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}
          icon={isCompact ? Maximize2 : Minimize2}
          onClick={onToggleCompact}
          className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
        />
        {onRefresh ? <IconButton label="Làm mới dữ liệu" icon={RefreshCw} onClick={onRefresh} /> : null}
        <IconButton label="Cấu hình cột" icon={Settings} onClick={onOpenConfig} />
      </Space>
    </div>
  );
}
