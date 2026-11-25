'use client';

import React, { useState } from 'react';
import { Badge, Button, DatePicker, Input, Popover, Select, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Phone,
  PhoneCall,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon } from '~/components/ui';
import { OmicallLogsFiltersToolbar } from './OmicallLogsFiltersToolbar';
import type {
  OmicallBranchSummary,
  OmicallDailySummary,
  OmicallDateMode,
  OmicallFilterChip,
  OmicallStaffSummary,
} from './omicallPageTypes';

const { RangePicker } = DatePicker;

export interface OmicallDailyHeaderBarProps {
  isAdmin: boolean;
  canReviewQa: boolean;
  isMobile?: boolean;
  dateMode: OmicallDateMode;
  selectedDate: Dayjs;
  dateRange: [Dayjs, Dayjs];
  summary: OmicallDailySummary;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
  branches: OmicallBranchSummary[];
  staffFilter: string;
  onStaffFilterChange: (value: string) => void;
  staffList: OmicallStaffSummary[];
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
  onlyWithRecording: boolean;
  onOnlyWithRecordingChange: (checked: boolean) => void;
  hasComplaintOnly: boolean;
  onHasComplaintOnlyChange: (checked: boolean) => void;
  activeChips?: OmicallFilterChip[];
  syncingLogs: boolean;
  onSync: () => void;
  onReset: () => void;
  onDateModeChange: (mode: OmicallDateMode) => void;
  onSelectDate: (date: Dayjs) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onDateRangeChange: (dates: [Dayjs, Dayjs]) => void;
  onQuickFilterAll: () => void;
  onQuickFilterAnswered: () => void;
  onQuickFilterHappyApproved: () => void;
  onQuickFilterHappyPending: () => void;
  onQuickFilterComplaints: () => void;
  onQuickFilterMismatch: () => void;
}

export function OmicallDailyHeaderBar({
  isAdmin,
  canReviewQa,
  isMobile = false,
  dateMode,
  selectedDate,
  dateRange,
  summary,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  branchFilter,
  onBranchFilterChange,
  branches,
  staffFilter,
  onStaffFilterChange,
  staffList,
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
  onlyWithRecording,
  onOnlyWithRecordingChange,
  hasComplaintOnly,
  onHasComplaintOnlyChange,
  activeChips = [],
  syncingLogs,
  onSync,
  onReset,
  onDateModeChange,
  onSelectDate,
  onPrevDay,
  onNextDay,
  onToday,
  onDateRangeChange,
  onQuickFilterAll,
  onQuickFilterAnswered,
  onQuickFilterHappyApproved,
  onQuickFilterHappyPending,
  onQuickFilterComplaints,
  onQuickFilterMismatch,
}: OmicallDailyHeaderBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isToday = selectedDate.isSame(dayjs(), 'day');

  const isHappyActive = happyFilter === 'APPROVED';
  const isAnsweredActive = statusFilter === 'ANSWER' && happyFilter === 'ALL' && !hasComplaintOnly;
  const isPendingHappyActive = happyFilter === 'PENDING_APPROVAL';
  const isComplaintActive = hasComplaintOnly;
  const isMismatchActive = ratingSourceFilter === 'STAFF' && ratingLevelFilter === 'AI_MISMATCH';

  const advancedCount = [
    isMobile && branchFilter !== 'ALL',
    isMobile && canReviewQa && staffFilter !== 'ALL',
    happyFilter !== 'ALL',
    aiSatisfactionFilter !== 'ALL',
    ratingSourceFilter !== 'ANY',
    ratingLevelFilter !== 'ALL',
    statusFilter !== 'ALL',
    directionFilter !== 'ALL',
    aiFilter !== 'ALL',
    onlyWithRecording,
    hasComplaintOnly,
  ].filter(Boolean).length;

  const filterPanel = (
    <OmicallLogsFiltersToolbar
      canReviewQa={canReviewQa}
      isMobile={isMobile}
      branchFilter={branchFilter}
      onBranchFilterChange={onBranchFilterChange}
      branches={branches}
      directionFilter={directionFilter}
      onDirectionFilterChange={onDirectionFilterChange}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      happyFilter={happyFilter}
      onHappyFilterChange={onHappyFilterChange}
      aiFilter={aiFilter}
      onAiFilterChange={onAiFilterChange}
      aiSatisfactionFilter={aiSatisfactionFilter}
      onAiSatisfactionFilterChange={onAiSatisfactionFilterChange}
      ratingSourceFilter={ratingSourceFilter}
      onRatingSourceFilterChange={onRatingSourceFilterChange}
      ratingLevelFilter={ratingLevelFilter}
      onRatingLevelFilterChange={onRatingLevelFilterChange}
      staffFilter={staffFilter}
      onStaffFilterChange={onStaffFilterChange}
      onlyWithRecording={onlyWithRecording}
      onOnlyWithRecordingChange={onOnlyWithRecordingChange}
      hasComplaintOnly={hasComplaintOnly}
      onHasComplaintOnlyChange={onHasComplaintOnlyChange}
      staffList={staffList}
      onReset={() => {
        onReset();
        setFiltersOpen(false);
      }}
      onApply={() => setFiltersOpen(false)}
    />
  );

  const filterButton = (
    <Tooltip title={filtersOpen ? '' : 'Bộ lọc nâng cao (Happy Call, AI, Admin/Quản lý/NV)'}>
      <Badge count={advancedCount} size="small" offset={[-2, 2]}>
        <Button
          size="small"
          type={advancedCount > 0 ? 'primary' : 'default'}
          ghost={advancedCount > 0}
          icon={<AppIcon icon={SlidersHorizontal} size={14} />}
          aria-label="Bộ lọc nâng cao"
          onClick={isMobile ? () => setFiltersOpen(true) : undefined}
        />
      </Badge>
    </Tooltip>
  );

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Left: Compact Date Stepper */}
        <div className="flex items-center gap-1">
          {dateMode === 'day' ? (
            <>
              <Tooltip title="Ngày trước">
                <Button
                  size="small"
                  icon={<AppIcon icon={ChevronLeft} size={14} />}
                  onClick={onPrevDay}
                  aria-label="Ngày trước"
                />
              </Tooltip>

              <DatePicker
                size="small"
                value={selectedDate}
                allowClear={false}
                format="DD/MM/YYYY"
                disabledDate={(current) => Boolean(current && current.isAfter(dayjs(), 'day'))}
                onChange={(d) => {
                  if (d) onSelectDate(d);
                }}
                suffixIcon={<AppIcon icon={CalendarDays} size={13} />}
                className="w-[116px]"
              />

              <Tooltip title="Ngày sau">
                <Button
                  size="small"
                  icon={<AppIcon icon={ChevronRight} size={14} />}
                  onClick={onNextDay}
                  disabled={isToday}
                  aria-label="Ngày sau"
                />
              </Tooltip>

              <Tooltip title="Về ngày hôm nay">
                <Button
                  size="small"
                  type={isToday ? 'default' : 'primary'}
                  ghost={!isToday}
                  onClick={onToday}
                  disabled={isToday}
                  className="px-2 text-xs"
                >
                  Hôm nay
                </Button>
              </Tooltip>
            </>
          ) : (
            <RangePicker
              size="small"
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  onDateRangeChange([dates[0], dates[1]]);
                }
              }}
              format="DD/MM"
              className="w-[180px]"
            />
          )}

          <Tooltip title={dateMode === 'day' ? 'Chọn khoảng nhiều ngày' : 'Chuyển về xem từng ngày'}>
            <Button
              size="small"
              type={dateMode === 'range' ? 'primary' : 'default'}
              ghost={dateMode === 'range'}
              icon={<AppIcon icon={CalendarRange} size={14} />}
              aria-label="Chuyển chế độ ngày"
              onClick={() => onDateModeChange(dateMode === 'day' ? 'range' : 'day')}
            />
          </Tooltip>
        </div>

        {/* Center: 6 Compact Icon+Number KPI Pills (Happy Call first as Hero) */}
        <div className="flex max-w-full flex-wrap items-center gap-1.5 py-0.5">
          <Tooltip title={`Đạt Happy Call (${summary.happyCallsApproved}) — bấm để lọc`}>
            <button
              type="button"
              onClick={isHappyActive ? onQuickFilterAll : onQuickFilterHappyApproved}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums transition ${
                isHappyActive
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:border-emerald-500'
              }`}
            >
              <AppIcon icon={Sparkles} size={13} />
              <span>{summary.happyCallsApproved}</span>
              <span className="hidden sm:inline font-semibold">Happy Call</span>
            </button>
          </Tooltip>

          <Tooltip title={`Có bắt máy (${summary.answeredCalls}) — bấm để lọc`}>
            <button
              type="button"
              onClick={isAnsweredActive ? onQuickFilterAll : onQuickFilterAnswered}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition ${
                isAnsweredActive
                  ? 'border-[var(--color-info)] bg-[var(--color-info)]/15 text-[var(--color-info)]'
                  : 'border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] text-[var(--mos-text-primary)] hover:border-[var(--color-info)]'
              }`}
            >
              <AppIcon icon={PhoneCall} size={12} className="text-[var(--color-info)]" />
              <span>{summary.answeredCalls}</span>
            </button>
          </Tooltip>

          <Tooltip title={`Tổng cuộc gọi (${summary.totalCalls}) — bấm để xem tất cả`}>
            <button
              type="button"
              onClick={onQuickFilterAll}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--mos-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--mos-text-primary)]"
            >
              <AppIcon icon={Phone} size={12} />
              <span>{summary.totalCalls}</span>
            </button>
          </Tooltip>

          <Tooltip title={`Chờ duyệt Happy Call (${summary.happyCallsPending}) — bấm để lọc`}>
            <button
              type="button"
              onClick={isPendingHappyActive ? onQuickFilterAll : onQuickFilterHappyPending}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition ${
                isPendingHappyActive
                  ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                  : 'border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] text-[var(--mos-text-secondary)] hover:border-[var(--color-warning)]'
              }`}
            >
              <AppIcon icon={Clock3} size={12} className="text-[var(--color-warning)]" />
              <span>{summary.happyCallsPending}</span>
            </button>
          </Tooltip>

          <Tooltip title={`Phát hiện khiếu nại AI (${summary.complaintCalls}) — bấm để lọc`}>
            <button
              type="button"
              onClick={isComplaintActive ? onQuickFilterAll : onQuickFilterComplaints}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition ${
                isComplaintActive
                  ? 'border-[var(--color-error)] bg-[var(--color-error)]/15 text-[var(--color-error)]'
                  : summary.complaintCalls > 0
                    ? 'border-[var(--color-error)]/40 bg-[var(--color-error)]/10 text-[var(--color-error)]'
                    : 'border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] text-[var(--mos-text-secondary)] hover:border-[var(--color-error)]'
              }`}
            >
              <AppIcon icon={AlertTriangle} size={12} className="text-[var(--color-error)]" />
              <span>{summary.complaintCalls}</span>
            </button>
          </Tooltip>

          <Tooltip
            title={`Nhân viên tự chấm: ${summary.staffSelfRatedCalls} · Lệch ≥2★ với AI: ${summary.mismatchCalls} — bấm để lọc ca lệch`}
          >
            <button
              type="button"
              onClick={isMismatchActive ? onQuickFilterAll : onQuickFilterMismatch}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition ${
                isMismatchActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                  : 'border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] text-[var(--mos-text-secondary)] hover:border-[var(--color-primary)]'
              }`}
            >
              <AppIcon icon={Scale} size={12} className="text-[var(--color-primary)]" />
              <span>{summary.staffSelfRatedCalls}</span>
              {summary.mismatchCalls > 0 && (
                <span className="text-[11px] font-bold text-[var(--color-warning)]">({summary.mismatchCalls}!)</span>
              )}
            </button>
          </Tooltip>
        </div>

        {/* Right: Quick Search, Inline Desktop Selects & Filter Popover/Sheet */}
        <div className="ml-auto flex w-full items-center gap-1.5 md:w-auto">
          <Input
            size="small"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onPressEnter={onSearch}
            allowClear
            prefix={<AppIcon icon={Search} size={13} className="text-[var(--mos-text-secondary)]" />}
            placeholder="SĐT, UUID..."
            className="flex-1 md:w-[135px] md:flex-none"
          />

          <div className="hidden items-center gap-1.5 md:flex">
            <Select
              size="small"
              value={branchFilter}
              onChange={onBranchFilterChange}
              className="w-[130px]"
              showSearch
              filterOption={vietnameseSearchFilter}
              options={[
                { value: 'ALL', label: 'Tất cả CN' },
                ...branches.map((b) => ({ value: b.id.toString(), label: b.name })),
              ]}
            />

            {canReviewQa && (
              <Select
                size="small"
                value={staffFilter}
                onChange={onStaffFilterChange}
                className="w-[140px]"
                showSearch
                filterOption={vietnameseSearchFilter}
                options={[
                  { value: 'ALL', label: 'Tất cả NV' },
                  ...staffList.map((s) => ({ value: s.id.toString(), label: s.displayName })),
                ]}
              />
            )}
          </div>

          {isMobile ? (
            filterButton
          ) : (
            <Popover
              trigger="click"
              placement="bottomRight"
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              content={filterPanel}
            >
              <span className="inline-flex">{filterButton}</span>
            </Popover>
          )}

          {activeChips.length > 0 && (
            <Tooltip title="Xóa toàn bộ bộ lọc">
              <Button
                size="small"
                icon={<AppIcon icon={RotateCcw} size={13} />}
                aria-label="Xóa bộ lọc"
                onClick={onReset}
              />
            </Tooltip>
          )}

          {isAdmin && (
            <Tooltip title="Đồng bộ dữ liệu từ OmiCall">
              <Button
                size="small"
                icon={<AppIcon icon={RefreshCw} size={13} className={syncingLogs ? 'animate-spin' : ''} />}
                loading={syncingLogs}
                aria-label="Đồng bộ OmiCall"
                onClick={onSync}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Removable Active Filter Chips Strip */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--mos-surface-border)] pt-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
            >
              <span>{chip.label}</span>
              <AppIcon icon={X} size={11} />
            </button>
          ))}
        </div>
      )}

      {isMobile && (
        <AdaptiveDrawer
          title="Bộ lọc cuộc gọi OmiCall"
          placement="bottom"
          height="auto"
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          destroyOnHidden
        >
          {filterPanel}
        </AdaptiveDrawer>
      )}
    </div>
  );
}
