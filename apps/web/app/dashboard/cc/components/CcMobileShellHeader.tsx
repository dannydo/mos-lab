'use client';

import React, { useState } from 'react';
import { Button, DatePicker, Dropdown } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { AdaptiveDrawer, AppIcon } from '~/components/ui';

export interface CcMobileTabOption {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface CcMobileShellHeaderProps {
  viewMode: 'month' | 'week' | 'day';
  referenceDate: Dayjs;
  periodLabel: string;
  includeVat: boolean;
  activeTab: string;
  tabs: ReadonlyArray<CcMobileTabOption>;
  onViewModeChange: (mode: 'month' | 'week' | 'day') => void;
  onNavigate: (direction: number) => void;
  onValueChange: (date: Dayjs) => void;
  onIncludeVatChange: (checked: boolean) => void;
  onTabChange: (key: string) => void;
  onOpenBonusConfig: () => void;
  onOpenTeamManagement: () => void;
}

const MODE_SEGMENTS: ReadonlyArray<{ mode: 'day' | 'week' | 'month'; label: string }> = [
  { mode: 'day', label: 'Ngày' },
  { mode: 'week', label: 'Tuần' },
  { mode: 'month', label: 'Tháng' },
];

const MONTHS = Array.from({ length: 12 }, (_, idx) => ({
  index: idx,
  label: `Thg ${String(idx + 1).padStart(2, '0')}`,
}));

export const CcMobileShellHeader: React.FC<CcMobileShellHeaderProps> = ({
  viewMode,
  referenceDate,
  periodLabel,
  includeVat,
  activeTab,
  tabs,
  onViewModeChange,
  onNavigate,
  onValueChange,
  onIncludeVatChange,
  onTabChange,
  onOpenBonusConfig,
  onOpenTeamManagement,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => referenceDate.year());

  const openPeriodSheet = () => {
    setPickerYear(referenceDate.year());
    setPickerOpen(true);
  };

  return (
    <div className="cc-mobile-apple-header space-y-2.5">
      {/* Row 1: Compact iOS Navigation Bar */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="m-0 text-[20px] font-bold tracking-tight text-slate-900 dark:text-slate-50">Báo cáo CC</h1>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={includeVat}
            aria-label="Công tắc VAT 8%"
            onClick={() => onIncludeVatChange(!includeVat)}
            className={`h-8 px-2.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              includeVat
                ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 border-slate-200/80 text-slate-600 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                includeVat ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'
              }`}
              aria-hidden
            />
            <span>VAT 8%</span>
          </button>

          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'bonus', label: 'Cấu hình thưởng CC' },
                { key: 'team', label: 'Quản lý nhân sự CC' },
              ],
              onClick: ({ key }) => {
                if (key === 'bonus') onOpenBonusConfig();
                if (key === 'team') onOpenTeamManagement();
              },
            }}
          >
            <button
              type="button"
              data-ui="cc-settings-trigger"
              aria-label="Cấu hình CC"
              className="w-8 h-8 rounded-full border border-slate-200/80 bg-slate-100 text-slate-700 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-amber-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              <AppIcon icon={SlidersHorizontal} size={14} aria-hidden />
            </button>
          </Dropdown>
        </div>
      </div>

      {/* Row 2: Apple Segmented Control + Inline Period Stepper */}
      <div className="space-y-1.5">
        <div
          role="radiogroup"
          aria-label="Chế độ xem kỳ báo cáo"
          className="grid grid-cols-3 p-0.5 rounded-xl bg-slate-200/80 dark:bg-white/[0.07]"
        >
          {MODE_SEGMENTS.map((seg) => {
            const active = viewMode === seg.mode;
            return (
              <button
                key={seg.mode}
                type="button"
                role="radio"
                aria-checked={active}
                data-period-mode={seg.mode}
                onClick={() => onViewModeChange(seg.mode)}
                className={`h-7 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-white/[0.16] dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between h-9 px-1 rounded-xl bg-slate-100/95 border border-slate-200/80 dark:bg-white/[0.045] dark:border-white/[0.08]">
          <button
            type="button"
            aria-label="Kỳ trước"
            onClick={() => onNavigate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 cursor-pointer"
          >
            <AppIcon icon={ChevronLeft} size={16} aria-hidden />
          </button>

          <button
            type="button"
            aria-label={`Chọn khoảng thời gian ${periodLabel}`}
            onClick={openPeriodSheet}
            className="flex-1 min-w-0 h-8 px-2 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums truncate cursor-pointer"
          >
            <span className="truncate">{periodLabel}</span>
            <AppIcon icon={ChevronDown} size={13} className="opacity-55 shrink-0" aria-hidden />
          </button>

          <button
            type="button"
            aria-label="Kỳ sau"
            onClick={() => onNavigate(1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 cursor-pointer"
          >
            <AppIcon icon={ChevronRight} size={16} aria-hidden />
          </button>
        </div>
      </div>

      {/* Row 3: Horizontal Scrollable Apple Pill Tabs */}
      <div
        role="tablist"
        aria-label="Phân mục báo cáo CC"
        className="flex items-center gap-1.5 overflow-x-auto py-0.5 -mx-0.5 px-0.5 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.key)}
              className={`snap-start shrink-0 h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border ${
                active
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs dark:bg-amber-400 dark:border-amber-400 dark:text-slate-950'
                  : 'bg-slate-100/90 border-slate-200/70 text-slate-600 dark:bg-white/[0.05] dark:border-white/[0.08] dark:text-slate-300'
              }`}
            >
              <span className="inline-flex items-center text-[13px]" aria-hidden>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Apple Bottom Sheet for Period Picking */}
      <AdaptiveDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        placement="bottom"
        height="auto"
        title={
          viewMode === 'month' ? 'Chọn tháng báo cáo' : viewMode === 'week' ? 'Chọn tuần báo cáo' : 'Chọn ngày báo cáo'
        }
      >
        {viewMode === 'month' ? (
          <div className="space-y-3 pb-2">
            <div className="flex items-center justify-between">
              <Button
                size="small"
                aria-label="Năm trước"
                icon={<AppIcon icon={ChevronLeft} size={14} />}
                onClick={() => setPickerYear((y) => y - 1)}
              />
              <span className="text-sm font-bold tabular-nums">{pickerYear}</span>
              <Button
                size="small"
                aria-label="Năm sau"
                icon={<AppIcon icon={ChevronRight} size={14} />}
                onClick={() => setPickerYear((y) => y + 1)}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((m) => {
                const selected = referenceDate.year() === pickerYear && referenceDate.month() === m.index;
                return (
                  <Button
                    key={m.index}
                    type={selected ? 'primary' : 'default'}
                    onClick={() => {
                      onValueChange(referenceDate.year(pickerYear).month(m.index));
                      setPickerOpen(false);
                    }}
                  >
                    {m.label}
                  </Button>
                );
              })}
            </div>
            <Button
              block
              onClick={() => {
                onValueChange(dayjs());
                setPickerOpen(false);
              }}
            >
              Tháng này
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            <DatePicker
              value={referenceDate}
              picker={viewMode === 'week' ? 'week' : 'date'}
              className="w-full"
              size="large"
              onChange={(nextDate) => {
                if (nextDate) {
                  onValueChange(nextDate);
                  setPickerOpen(false);
                }
              }}
            />
            <Button
              block
              type="primary"
              onClick={() => {
                onValueChange(dayjs());
                setPickerOpen(false);
              }}
            >
              {viewMode === 'week' ? 'Tuần này' : 'Hôm nay'}
            </Button>
          </div>
        )}
      </AdaptiveDrawer>
    </div>
  );
};
