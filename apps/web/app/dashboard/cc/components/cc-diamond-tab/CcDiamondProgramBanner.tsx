'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import { Filter, RefreshCw, Trophy } from 'lucide-react';
import { AppIcon, IconButton, SearchField, StatusTag } from '~/components/ui';
import { DIAMOND_REWARD_TIERS } from './cc-diamond-utils';

interface CcDiamondProgramBannerProps {
  searchText: string;
  onSearchChange: (nextValue: string) => void;
  onRefresh: () => void;
  loading: boolean;
  isMobile: boolean;
  hasData: boolean;
  isConsultantFiltered: boolean;
  selectedConsultant: string;
  visibleRecordCount: number;
  totalRecordCount: number;
  rewardRecipientCount: number;
  periodLabel?: string;
  onClearConsultant?: () => void;
}

export function CcDiamondProgramBanner({
  searchText,
  onSearchChange,
  onRefresh,
  loading,
  isMobile,
  hasData,
  isConsultantFiltered,
  selectedConsultant,
  visibleRecordCount,
  totalRecordCount,
  rewardRecipientCount,
  periodLabel,
  onClearConsultant,
}: CcDiamondProgramBannerProps) {
  return (
    <div className="diamond-program-panel diamond-program-panel-expanded">
      <div className="diamond-program-heading">
        <div className="flex min-w-0 items-center gap-3">
          <div className="diamond-program-icon" aria-hidden="true">
            <AppIcon icon={Trophy} size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">Thưởng Kim Cương</span>
              <Tooltip title="Số khách giới thiệu phải chiếm tối thiểu 3% tổng lượt khách phục vụ trong kỳ để được nhận thưởng.">
                <span className="inline-flex cursor-help">
                  <StatusTag status="gold" label="Tỷ lệ tối thiểu 3%" className="diamond-program-threshold" />
                </span>
              </Tooltip>
            </div>
            <p className="diamond-program-description">Thưởng theo số khách giới thiệu mới trong kỳ.</p>
          </div>
        </div>

        <div className="diamond-tier-grid" aria-label="Các mốc thưởng Kim Cương">
          {DIAMOND_REWARD_TIERS.map((tier) => (
            <div className={`diamond-tier ${tier.featured ? 'diamond-tier-featured' : ''}`} key={tier.label}>
              <span>{tier.label}</span>
              <strong className="tabular-nums">{tier.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="diamond-table-toolbar">
        <SearchField
          aria-label="Tìm kiếm tư vấn viên Kim Cương"
          placeholder="Tìm tư vấn viên..."
          behavior="filter"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="diamond-table-search"
          allowClear
        />
        <IconButton
          label="Làm mới dữ liệu Kim Cương"
          icon={RefreshCw}
          onClick={onRefresh}
          loading={loading}
          iconClassName={loading ? 'animate-spin' : undefined}
        />
      </div>

      {isMobile && hasData ? (
        <div
          className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
          role="status"
        >
          <AppIcon
            icon={Filter}
            size={13}
            className={isConsultantFiltered ? 'shrink-0 text-amber-500' : 'shrink-0 text-slate-400'}
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold tabular-nums text-slate-700 dark:text-slate-100">
              Hiển thị {visibleRecordCount}/{totalRecordCount} CC
            </div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {isConsultantFiltered
                ? `Đang lọc: ${selectedConsultant}`
                : rewardRecipientCount > 0
                  ? `${rewardRecipientCount} CC nhận thưởng trong kỳ`
                  : `Kỳ ${periodLabel || 'đang chọn'} chưa có CC đạt mốc thưởng`}
            </div>
          </div>
          {isConsultantFiltered && onClearConsultant ? (
            <Button
              type="link"
              size="small"
              className="h-auto shrink-0 px-1 text-xs font-semibold"
              onClick={onClearConsultant}
            >
              Xem tất cả
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
