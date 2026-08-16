'use client';

import React, { useState } from 'react';
import { Button, DatePicker, Space, Tooltip } from 'antd';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
              onClick={() => setPickerOpen(true)}
            >
              <ReportPeriodNavigatorIcon icon={Calendar} className="report-period-navigator-picker-icon" />
              <span className="report-period-navigator-picker-label">{pickerLabel}</span>
              <ReportPeriodNavigatorIcon icon={ChevronDown} className="report-period-navigator-picker-disclosure" />
            </Button>
            {usesRangePicker ? (
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
