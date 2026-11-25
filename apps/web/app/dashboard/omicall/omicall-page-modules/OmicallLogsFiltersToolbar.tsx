'use client';

import React from 'react';
import { Button, Checkbox, Select } from 'antd';
import { RotateCcw, Check } from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import {
  AI_SATISFACTION_FILTER_OPTIONS,
  AI_STATUS_FILTER_OPTIONS,
  CALL_STATUS_FILTER_OPTIONS,
  DIRECTION_FILTER_OPTIONS,
  HAPPY_CALL_FILTER_OPTIONS,
  RATING_LEVEL_OPTIONS,
  RATING_SOURCE_OPTIONS,
  type OmicallBranchSummary,
  type OmicallStaffSummary,
} from './omicallPageTypes';

export interface OmicallLogsFiltersToolbarProps {
  canReviewQa: boolean;
  isMobile?: boolean;
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
  branches: OmicallBranchSummary[];
  directionFilter: string;
  onDirectionFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  happyFilter: string;
  onHappyFilterChange: (value: string) => void;
  aiFilter: string;
  onAiFilterChange: (value: string) => void;
  aiSatisfactionFilter: string;
  onAiSatisfactionFilterChange: (value: string) => void;
  ratingSourceFilter: string;
  onRatingSourceFilterChange: (value: string) => void;
  ratingLevelFilter: string;
  onRatingLevelFilterChange: (value: string) => void;
  staffFilter: string;
  onStaffFilterChange: (value: string) => void;
  onlyWithRecording: boolean;
  onOnlyWithRecordingChange: (checked: boolean) => void;
  hasComplaintOnly: boolean;
  onHasComplaintOnlyChange: (checked: boolean) => void;
  staffList: OmicallStaffSummary[];
  onReset: () => void;
  onApply?: () => void;
}

export function OmicallLogsFiltersToolbar({
  canReviewQa,
  isMobile = false,
  branchFilter,
  onBranchFilterChange,
  branches,
  directionFilter,
  onDirectionFilterChange,
  statusFilter,
  onStatusFilterChange,
  happyFilter,
  onHappyFilterChange,
  aiFilter,
  onAiFilterChange,
  aiSatisfactionFilter,
  onAiSatisfactionFilterChange,
  ratingSourceFilter,
  onRatingSourceFilterChange,
  ratingLevelFilter,
  onRatingLevelFilterChange,
  staffFilter,
  onStaffFilterChange,
  onlyWithRecording,
  onOnlyWithRecordingChange,
  hasComplaintOnly,
  onHasComplaintOnlyChange,
  staffList,
  onReset,
  onApply,
}: OmicallLogsFiltersToolbarProps) {
  return (
    <div className={isMobile ? 'flex flex-col gap-3' : 'w-[420px] flex flex-col gap-3'}>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {isMobile && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[var(--mos-text-secondary)]">Chi nhánh</span>
            <Select
              size="small"
              value={branchFilter}
              onChange={onBranchFilterChange}
              showSearch
              filterOption={vietnameseSearchFilter}
              options={[
                { value: 'ALL', label: 'Tất cả chi nhánh' },
                ...branches.map((branch) => ({ value: branch.id.toString(), label: branch.name })),
              ]}
            />
          </div>
        )}

        {isMobile && canReviewQa && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[var(--mos-text-secondary)]">Nhân viên</span>
            <Select
              size="small"
              value={staffFilter}
              onChange={onStaffFilterChange}
              showSearch
              filterOption={vietnameseSearchFilter}
              options={[
                { value: 'ALL', label: 'Tất cả nhân viên' },
                ...staffList.map((staff) => ({ value: staff.id.toString(), label: staff.displayName })),
              ]}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-[var(--mos-text-secondary)]">Happy Call</span>
          <Select size="small" value={happyFilter} onChange={onHappyFilterChange} options={HAPPY_CALL_FILTER_OPTIONS} />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-[var(--mos-text-secondary)]">Hài lòng (AI)</span>
          <Select
            size="small"
            value={aiSatisfactionFilter}
            onChange={onAiSatisfactionFilterChange}
            options={AI_SATISFACTION_FILTER_OPTIONS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-[var(--mos-text-secondary)]">Nguồn đánh giá</span>
          <Select
            size="small"
            value={ratingSourceFilter}
            onChange={onRatingSourceFilterChange}
            options={RATING_SOURCE_OPTIONS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-[var(--mos-text-secondary)]">Mức đánh giá</span>
          <Select
            size="small"
            value={ratingLevelFilter}
            onChange={onRatingLevelFilterChange}
            options={RATING_LEVEL_OPTIONS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-[var(--mos-text-secondary)]">Kết quả</span>
          <Select
            size="small"
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={CALL_STATUS_FILTER_OPTIONS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-[var(--mos-text-secondary)]">Chiều gọi</span>
          <Select
            size="small"
            value={directionFilter}
            onChange={onDirectionFilterChange}
            options={DIRECTION_FILTER_OPTIONS}
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] font-medium text-[var(--mos-text-secondary)]">Trạng thái phân tích AI</span>
          <Select size="small" value={aiFilter} onChange={onAiFilterChange} options={AI_STATUS_FILTER_OPTIONS} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--mos-surface-border)] pt-2.5">
        <Checkbox checked={onlyWithRecording} onChange={(e) => onOnlyWithRecordingChange(e.target.checked)}>
          <span className="text-xs">Chỉ hiện cuộc có ghi âm</span>
        </Checkbox>
        <Checkbox checked={hasComplaintOnly} onChange={(e) => onHasComplaintOnlyChange(e.target.checked)}>
          <span className="text-xs">Chỉ hiện khiếu nại</span>
        </Checkbox>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--mos-surface-border)] pt-2.5">
        <Button size="small" icon={<AppIcon icon={RotateCcw} size={13} />} onClick={onReset}>
          Đặt lại
        </Button>
        {onApply && (
          <Button type="primary" size="small" icon={<AppIcon icon={Check} size={13} />} onClick={onApply}>
            Xong
          </Button>
        )}
      </div>
    </div>
  );
}
