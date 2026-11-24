'use client';

import React from 'react';
import { Button, DatePicker, Segmented } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type { OmicallDailySummary, OmicallDateMode } from './omicallPageTypes';

const { RangePicker } = DatePicker;

export interface OmicallDailyHeaderBarProps {
  dateMode: OmicallDateMode;
  selectedDate: Dayjs;
  dateRange: [Dayjs, Dayjs];
  summary: OmicallDailySummary;
  canReviewQa: boolean;
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
  dateMode,
  selectedDate,
  dateRange,
  summary,
  canReviewQa,
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
  const isToday = selectedDate.isSame(dayjs(), 'day');

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)] p-3.5">
      {/* Row 1: Day / Range navigator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={dateMode}
            onChange={(val) => onDateModeChange(val as OmicallDateMode)}
            options={[
              { label: 'Theo ngày', value: 'day' },
              { label: 'Khoảng ngày', value: 'range' },
            ]}
          />

          {dateMode === 'day' ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button icon={<AppIcon icon={ChevronLeft} size={15} />} onClick={onPrevDay} aria-label="Ngày trước">
                Ngày trước
              </Button>

              <DatePicker
                value={selectedDate}
                allowClear={false}
                format="DD/MM/YYYY"
                disabledDate={(current) => Boolean(current && current.isAfter(dayjs(), 'day'))}
                onChange={(d) => {
                  if (d) onSelectDate(d);
                }}
                suffixIcon={<AppIcon icon={CalendarDays} size={14} />}
                className="w-[140px]"
              />

              <Button type={isToday ? 'primary' : 'default'} onClick={onToday} disabled={isToday}>
                Hôm nay
              </Button>

              <Button
                onClick={onNextDay}
                disabled={isToday}
                aria-label="Ngày sau"
                icon={<AppIcon icon={ChevronRight} size={15} />}
                iconPosition="end"
              >
                Ngày sau
              </Button>
            </div>
          ) : (
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  onDateRangeChange([dates[0], dates[1]]);
                }
              }}
              format="DD/MM/YYYY"
              className="w-full sm:w-[260px]"
            />
          )}
        </div>

        <div className="text-xs font-medium text-[var(--mos-text-secondary)] tabular-nums">
          {dateMode === 'day'
            ? `Đang xem ngày ${selectedDate.format('DD/MM/YYYY')}${isToday ? ' (Hôm nay)' : ''}`
            : `Từ ${dateRange[0].format('DD/MM/YYYY')} đến ${dateRange[1].format('DD/MM/YYYY')}`}
        </div>
      </div>

      {/* Row 2: Clickable daily KPI summary strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={onQuickFilterAll}
          className="cursor-pointer rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] px-3 py-2 text-left transition hover:border-[var(--color-primary)]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--mos-text-secondary)]">
            <AppIcon icon={PhoneCall} size={13} />
            <span>Tổng cuộc gọi</span>
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-[var(--mos-text-primary)]">
            {summary.totalCalls}
          </div>
        </button>

        <button
          type="button"
          onClick={onQuickFilterAnswered}
          className="cursor-pointer rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] px-3 py-2 text-left transition hover:border-[var(--color-primary)]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--mos-text-secondary)]">
            <AppIcon icon={PhoneCall} size={13} className="text-[var(--color-info)]" />
            <span>Có bắt máy</span>
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-[var(--mos-text-primary)]">
            {summary.answeredCalls}
          </div>
        </button>

        <button
          type="button"
          onClick={onQuickFilterHappyApproved}
          className="cursor-pointer rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] px-3 py-2 text-left transition hover:border-[var(--color-success)]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--mos-text-secondary)]">
            <AppIcon icon={CheckCircle2} size={13} className="text-[var(--color-success)]" />
            <span>Đạt Happy Call</span>
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-[var(--color-success)]">
            {summary.happyCallsApproved}
          </div>
        </button>

        <button
          type="button"
          onClick={onQuickFilterHappyPending}
          className="cursor-pointer rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] px-3 py-2 text-left transition hover:border-[var(--color-warning)]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--mos-text-secondary)]">
            <AppIcon icon={Clock3} size={13} className="text-[var(--color-warning)]" />
            <span>Chờ duyệt HC</span>
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-[var(--color-warning)]">
            {summary.happyCallsPending}
          </div>
        </button>

        <button
          type="button"
          onClick={onQuickFilterComplaints}
          className="cursor-pointer rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] px-3 py-2 text-left transition hover:border-[var(--color-error)]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--mos-text-secondary)]">
            <AppIcon icon={AlertTriangle} size={13} className="text-[var(--color-error)]" />
            <span>Khiếu nại (AI)</span>
          </div>
          <div
            className={`mt-0.5 text-lg font-bold tabular-nums ${
              summary.complaintCalls > 0 ? 'text-[var(--color-error)]' : 'text-[var(--mos-text-primary)]'
            }`}
          >
            {summary.complaintCalls}
          </div>
        </button>

        <button
          type="button"
          onClick={onQuickFilterMismatch}
          className="cursor-pointer rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] px-3 py-2 text-left transition hover:border-[var(--color-primary)]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--mos-text-secondary)]">
            <AppIcon icon={Sparkles} size={13} className="text-[var(--color-primary)]" />
            <span>{canReviewQa ? 'NV tự chấm / Lệch AI' : 'Đã tự chấm / Lệch'}</span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5 text-lg font-bold tabular-nums text-[var(--mos-text-primary)]">
            <span>{summary.staffSelfRatedCalls}</span>
            {summary.mismatchCalls > 0 && (
              <span className="text-xs font-semibold text-[var(--color-warning)]">
                ({summary.mismatchCalls} lệch ≥2★)
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
