'use client';

import { Input, Radio, Typography } from 'antd';
import { Search } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { ASSIGNMENT_ACTION_FILTER_OPTIONS } from './assignment-history-utils';

const { Text } = Typography;

interface AssignmentHistoryToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  filterAction: string;
  onFilterChange: (val: string) => void;
  displayedCount: number;
}

export function AssignmentHistoryToolbar({
  searchQuery,
  onSearchChange,
  filterAction,
  onFilterChange,
  displayedCount,
}: AssignmentHistoryToolbarProps) {
  return (
    <div className="mb-4 rounded-[10px] border border-neutral-200 bg-white px-4 py-3 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-3">
        <Input
          placeholder="Tìm theo tên Booker, người thực hiện, công thức, lý do..."
          prefix={<AppIcon icon={Search} size={14} className="text-neutral-400" />}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          size="middle"
          className="rounded-md"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Radio.Group
            value={filterAction}
            onChange={(e) => onFilterChange(e.target.value)}
            size="small"
            buttonStyle="solid"
            className="flex flex-wrap gap-1"
          >
            {ASSIGNMENT_ACTION_FILTER_OPTIONS.map((option) => (
              <Radio.Button key={option.value} value={option.value}>
                {option.label}
              </Radio.Button>
            ))}
          </Radio.Group>

          <Text type="secondary" className="text-xs">
            Hiển thị: <strong>{displayedCount}</strong> đợt
          </Text>
        </div>
      </div>
    </div>
  );
}
