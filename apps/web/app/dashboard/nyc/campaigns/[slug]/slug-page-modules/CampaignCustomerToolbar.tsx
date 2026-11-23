'use client';

import React from 'react';
import { Button, Select, Tooltip } from 'antd';
import { AlertTriangle, Calendar, CheckCircle2, Crosshair, Filter, Trash2, Users } from 'lucide-react';
import type { CampaignBookingStatusFilter, Staff } from '@mos-lab/shared';
import { CollapsibleSearchField } from '~/components/ui';
import type { BookingStatusIconKey } from './campaignDetailTypes';
import { CAMPAIGN_BOOKING_STATUS_OPTIONS } from './campaignDetailUtils';

function renderBookingStatusIcon(iconKey: BookingStatusIconKey): React.ReactNode {
  switch (iconKey) {
    case 'filter':
      return <Filter className="h-3.5 w-3.5" />;
    case 'calendar':
      return <Calendar className="h-3.5 w-3.5" />;
    case 'check':
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

export interface CampaignCustomerToolbarProps {
  bookingStatusFilter: CampaignBookingStatusFilter;
  onBookingStatusFilterChange: (value: CampaignBookingStatusFilter) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isAdmin: boolean;
  selectedBookerId: string;
  onBookerChange: (value: string) => void;
  bookerStaffList: Staff[];
  onOpenRandomModal: () => void;
  selectedCount: number;
  showSelectedOnly: boolean;
  onToggleShowSelectedOnly: () => void;
  onOpenBatchAllocationModal: () => void;
  onBatchRemoveCustomers: () => void;
}

export function CampaignCustomerToolbar({
  bookingStatusFilter,
  onBookingStatusFilterChange,
  searchQuery,
  onSearchChange,
  isAdmin,
  selectedBookerId,
  onBookerChange,
  bookerStaffList,
  onOpenRandomModal,
  selectedCount,
  showSelectedOnly,
  onToggleShowSelectedOnly,
  onOpenBatchAllocationModal,
  onBatchRemoveCustomers,
}: CampaignCustomerToolbarProps) {
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all duration-300 dark:border-white/10 dark:bg-slate-900">
      <div className="nyc-campaign-customer-toolbar flex items-center gap-2 sm:flex-nowrap">
        <div
          className="campaign-booking-status-filter flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800/80"
          aria-label="Lọc trạng thái lịch hẹn"
        >
          {CAMPAIGN_BOOKING_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={bookingStatusFilter === option.value}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                bookingStatusFilter === option.value
                  ? option.activeClassName
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              onClick={() => onBookingStatusFilterChange(option.value)}
            >
              <span aria-hidden="true">{renderBookingStatusIcon(option.iconKey)}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <CollapsibleSearchField
          behavior="filter"
          placeholder="Tìm theo tên hoặc SĐT..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          size="middle"
          expandedWidth={260}
          expandButtonLabel="Mở tìm kiếm khách hàng"
          className="campaign-customer-search"
          data-ui="campaign-customer-search"
        />

        {isAdmin && (
          <Select
            value={selectedBookerId}
            onChange={(val) => onBookerChange(val)}
            size="middle"
            className="campaign-customer-booker-filter w-40"
            options={[
              { value: 'ALL', label: 'All Bookers' },
              ...bookerStaffList.map((s) => ({ value: String(s.id), label: s.displayName })),
            ]}
          />
        )}

        {isAdmin && (
          <Tooltip title="Chọn ngẫu nhiên khách hàng theo bộ lọc">
            <Button
              size="middle"
              icon={<Crosshair className="h-4 w-4" />}
              onClick={onOpenRandomModal}
              className="campaign-customer-random-action border-amber-600 text-amber-600 hover:border-amber-500 hover:text-amber-500 dark:border-amber-400 dark:text-amber-400 dark:hover:border-amber-300 dark:hover:text-amber-300"
            />
          </Tooltip>
        )}

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onToggleShowSelectedOnly}
            className={`m-0 inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold leading-none tabular-nums transition-colors ${
              showSelectedOnly
                ? 'border-amber-400/60 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {showSelectedOnly ? (
              <>
                <span>🎯 Chỉ hiện {selectedCount} KH được chọn</span>
                <span className="ml-1 opacity-80" title="Bấm để xem tất cả">
                  (Xem tất cả)
                </span>
              </>
            ) : (
              <span>👁️ Xem riêng {selectedCount} KH được chọn</span>
            )}
          </button>
        )}

        {isAdmin && selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <Button
              type="primary"
              size="middle"
              icon={<Users className="h-4 w-4" />}
              onClick={onOpenBatchAllocationModal}
              className="font-bold tabular-nums"
            >
              Phân bổ Booker ({selectedCount})
            </Button>
            <Button
              danger
              type="primary"
              size="middle"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={onBatchRemoveCustomers}
              className="font-bold tabular-nums"
            >
              Xóa khỏi chiến dịch ({selectedCount})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
