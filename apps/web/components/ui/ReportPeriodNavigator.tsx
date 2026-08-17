'use client';

import React, { useState } from 'react';
import { Button, DatePicker, Drawer, Space, Tooltip } from 'antd';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Dayjs } from 'dayjs';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';

export type ReportPeriodMode = 'month' | 'week' | 'day';

export interface ReportPeriodNavigatorProps {
  mode: ReportPeriodMode;
  value: Dayjs;
  label: string;
  onModeChange: (mode: ReportPeriodMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onValueChange?: (value: Dayjs) => void;
  /** Opt in when the report legitimately supports an arbitrary date range. */
  rangeValue?: [Dayjs, Dayjs];
  onRangeChange?: (range: [Dayjs, Dayjs]) => void;
  className?: string;
}

interface ReportPeriodNavigatorIconProps {
  icon: LucideIcon;
  className?: string;
}

const REPORT_PERIOD_MODES: ReadonlyArray<{ mode: ReportPeriodMode; label: string; icon: LucideIcon }> = [
  { mode: 'month', label: 'Theo Tháng', icon: CalendarDays },
  { mode: 'week', label: 'Theo Tuần', icon: CalendarRange },
  { mode: 'day', label: 'Theo Ngày', icon: Calendar },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  index,
  label: `Thg ${String(index + 1).padStart(2, '0')}`,
}));

/** Keeps every glyph in this atomic control in one Lucide optical box. */
function ReportPeriodNavigatorIcon({ icon: Icon, className = '' }: ReportPeriodNavigatorIconProps) {
  return (
    <span aria-hidden className={`report-period-navigator-icon ${className}`.trim()}>
      <Icon />
    </span>
  );
}

/** Shared period control for operational reports: mode, previous/next and date selection. */
export function ReportPeriodNavigator({
  mode,
  value,
  label,
  onModeChange,
  onPrevious,
  onNext,
  onValueChange,
  rangeValue,
  onRangeChange,
  className = '',
}: ReportPeriodNavigatorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const responsiveTier = useResponsiveTier();
  const usesRangePicker = Boolean(rangeValue && onRangeChange);
  const usesMobileMonthSheet = responsiveTier === 'mobile' && mode === 'month' && !usesRangePicker;
  const [mobilePickerYear, setMobilePickerYear] = useState(() => value.year());
  const displayLabel = mode === 'month' ? label.replace(/^Tháng\s+/i, '') : label;
  const pickerLabel =
    responsiveTier === 'mobile'
      ? mode === 'day'
        ? value.format('DD/MM')
        : mode === 'week'
          ? (label.match(/^Tuần\s+\d+/i)?.[0] ?? displayLabel)
          : displayLabel
      : displayLabel;

  const handleModeKeyDown = (event: React.KeyboardEvent<HTMLElement>, modeIndex: number) => {
    const lastIndex = REPORT_PERIOD_MODES.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      nextIndex = (modeIndex + 1) % REPORT_PERIOD_MODES.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      nextIndex = (modeIndex + lastIndex) % REPORT_PERIOD_MODES.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextMode = REPORT_PERIOD_MODES[nextIndex];
    const modeGroup = event.currentTarget.closest<HTMLElement>('[role="radiogroup"]');
    onModeChange(nextMode.mode);
    requestAnimationFrame(() => {
      modeGroup?.querySelector<HTMLButtonElement>(`[data-period-mode="${nextMode.mode}"]`)?.focus();
    });
  };

  const openPicker = () => {
    if (usesMobileMonthSheet) setMobilePickerYear(value.year());
    setPickerOpen(true);
  };

  const handleMobileMonthSelect = (month: number) => {
    onValueChange?.(value.year(mobilePickerYear).month(month));
    setPickerOpen(false);
  };

  return (
    <div className={`report-period-navigator ${className}`}>
      <div className="report-period-navigator-control" role="group" aria-label="Điều hướng kỳ báo cáo">
        <Space.Compact className="report-period-navigator-mode" role="radiogroup" aria-label="Chế độ xem kỳ báo cáo">
          {REPORT_PERIOD_MODES.map((periodMode, modeIndex) => (
            <Tooltip title={periodMode.label} key={periodMode.mode}>
              <Button
                type={mode === periodMode.mode ? 'primary' : 'default'}
                aria-label={periodMode.label}
                aria-checked={mode === periodMode.mode}
                data-period-mode={periodMode.mode}
                onClick={() => onModeChange(periodMode.mode)}
                onKeyDown={(event) => handleModeKeyDown(event, modeIndex)}
                role="radio"
              >
                <ReportPeriodNavigatorIcon icon={periodMode.icon} className="report-period-navigator-mode-icon" />
                <span className="report-period-navigator-mode-label">{periodMode.label.replace(/^Theo\s+/i, '')}</span>
              </Button>
            </Tooltip>
          ))}
        </Space.Compact>

        <Space.Compact
          className="report-period-navigator-mobile-mode"
          role="radiogroup"
          aria-label="Chế độ xem kỳ báo cáo"
        >
          {REPORT_PERIOD_MODES.map((periodMode, modeIndex) => (
            <Tooltip title={periodMode.label} key={`mobile-${periodMode.mode}`}>
              <Button
                type={mode === periodMode.mode ? 'primary' : 'default'}
                aria-label={periodMode.label}
                aria-checked={mode === periodMode.mode}
                data-period-mode={periodMode.mode}
                icon={<ReportPeriodNavigatorIcon icon={periodMode.icon} />}
                onClick={() => onModeChange(periodMode.mode)}
                onKeyDown={(event) => handleModeKeyDown(event, modeIndex)}
                role="radio"
              />
            </Tooltip>
          ))}
        </Space.Compact>

        <span className="report-period-navigator-divider" aria-hidden="true" />

        <Space.Compact className="report-period-navigator-date">
          <Tooltip title="Kỳ trước">
            <Button
              aria-label="Kỳ trước"
              icon={<ReportPeriodNavigatorIcon icon={ChevronLeft} />}
              onClick={onPrevious}
            />
          </Tooltip>
          <div className="report-period-navigator-picker">
            <Button
              aria-label={`Chọn khoảng thời gian ${label}`}
              className="report-period-navigator-label"
              onClick={openPicker}
            >
              <ReportPeriodNavigatorIcon icon={Calendar} className="report-period-navigator-picker-icon" />
              <span className="report-period-navigator-picker-label">{pickerLabel}</span>
              <ReportPeriodNavigatorIcon icon={ChevronDown} className="report-period-navigator-picker-disclosure" />
            </Button>
            {usesMobileMonthSheet ? (
              <Drawer
                className="report-period-mobile-month-sheet"
                closeIcon={<ReportPeriodNavigatorIcon icon={X} />}
                extra={
                  <div className="report-period-mobile-month-year-control" aria-label="Điều hướng năm">
                    <Button
                      aria-label="Năm trước"
                      icon={<ReportPeriodNavigatorIcon icon={ChevronLeft} />}
                      onClick={() => setMobilePickerYear((year) => year - 1)}
                    />
                    <span aria-live="polite">{mobilePickerYear}</span>
                    <Button
                      aria-label="Năm sau"
                      icon={<ReportPeriodNavigatorIcon icon={ChevronRight} />}
                      onClick={() => setMobilePickerYear((year) => year + 1)}
                    />
                  </div>
                }
                height={352}
                onClose={() => setPickerOpen(false)}
                open={pickerOpen}
                placement="bottom"
                title="Chọn tháng"
              >
                <div
                  className="report-period-mobile-month-grid"
                  role="group"
                  aria-label={`Các tháng năm ${mobilePickerYear}`}
                >
                  {MONTH_OPTIONS.map((month) => {
                    const isSelected = value.year() === mobilePickerYear && value.month() === month.index;

                    return (
                      <Button
                        aria-label={`Tháng ${String(month.index + 1).padStart(2, '0')} năm ${mobilePickerYear}`}
                        aria-pressed={isSelected}
                        className="report-period-mobile-month-option"
                        disabled={!onValueChange}
                        key={month.index}
                        onClick={() => handleMobileMonthSelect(month.index)}
                        type={isSelected ? 'primary' : 'default'}
                      >
                        {month.label}
                      </Button>
                    );
                  })}
                </div>
              </Drawer>
            ) : usesRangePicker ? (
              <DatePicker.RangePicker
                value={rangeValue}
                format="DD/MM/YYYY"
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onChange={(dates) => {
                  if (dates?.[0] && dates[1]) {
                    onRangeChange?.([dates[0], dates[1]]);
                    setPickerOpen(false);
                  }
                }}
                className="report-period-navigator-hidden-picker"
              />
            ) : (
              <DatePicker
                value={value}
                picker={mode === 'month' ? 'month' : mode === 'week' ? 'week' : 'date'}
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onChange={(nextValue) => {
                  if (nextValue) {
                    onValueChange?.(nextValue);
                    setPickerOpen(false);
                  }
                }}
                className="report-period-navigator-hidden-picker"
              />
            )}
          </div>
          <Tooltip title="Kỳ sau">
            <Button aria-label="Kỳ sau" icon={<ReportPeriodNavigatorIcon icon={ChevronRight} />} onClick={onNext} />
          </Tooltip>
        </Space.Compact>
      </div>
    </div>
  );
}

export default React.memo(ReportPeriodNavigator);
