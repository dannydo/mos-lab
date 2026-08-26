'use client';

import React from 'react';
import { Input, Segmented, Button, Tooltip } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';

interface CvSearchFilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedBranch: string;
  setSelectedBranch: (b: string) => void;
  statusFilter: string;
  setStatusFilter: (f: string) => void;
}

export const CvSearchFilterBar: React.FC<CvSearchFilterBarProps> = React.memo(
  ({ searchQuery, setSearchQuery, selectedBranch, setSelectedBranch, statusFilter, setStatusFilter }) => {
    return (
      <div
        className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs"
        role="search"
        aria-label="Tìm kiếm và lọc Chuyên viên"
      >
        <Input
          prefix={<SearchOutlined className="text-slate-400 text-xs" />}
          placeholder="Tìm tên Chuyên viên..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          size="small"
          aria-label="Tìm kiếm theo tên chuyên viên"
          className="flex-1 min-w-[150px] text-xs focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
        />
        <Segmented
          size="small"
          value={selectedBranch}
          onChange={(val) => setSelectedBranch(val as string)}
          options={[
            { label: 'ALL', value: 'all' },
            { label: 'DT', value: 'Đề Thám' },
            { label: 'EP', value: 'Estella Place' },
          ]}
          aria-label="Lọc theo Chi nhánh"
          className="text-xs shrink-0 [&_.ant-segmented-item:nth-child(2)]:text-cyan-700 dark:[&_.ant-segmented-item:nth-child(2)]:text-cyan-300 [&_.ant-segmented-item:nth-child(2).ant-segmented-item-selected]:!bg-cyan-500/20 [&_.ant-segmented-item:nth-child(3)]:text-violet-700 dark:[&_.ant-segmented-item:nth-child(3)]:text-violet-300 [&_.ant-segmented-item:nth-child(3).ant-segmented-item-selected]:!bg-violet-500/20"
        />
        {statusFilter !== 'all' && (
          <Tooltip title="Xóa bộ lọc trạng thái hiện tại" placement="top">
            <Button
              size="small"
              type="primary"
              danger
              icon={<ClearOutlined />}
              onClick={() => setStatusFilter('all')}
              aria-label="Xóa bộ lọc trạng thái"
              className="text-[10px] font-bold shrink-0 focus-visible:ring-2 focus-visible:ring-rose-500 rounded"
            >
              Bỏ lọc ✕
            </Button>
          </Tooltip>
        )}
      </div>
    );
  }
);

CvSearchFilterBar.displayName = 'CvSearchFilterBar';
