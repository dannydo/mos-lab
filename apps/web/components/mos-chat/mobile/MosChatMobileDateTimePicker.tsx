'use client';

import React, { useRef, useMemo } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useTheme } from '../../../context/ThemeContext';

export interface DeadlinePresetOption {
  id: string;
  label: string;
  getDate: () => dayjs.Dayjs | null;
}

export const DEFAULT_MOBILE_DEADLINE_PRESETS: DeadlinePresetOption[] = [
  {
    id: 'today-1730',
    label: '17:30 hôm nay',
    getDate: () => {
      const now = dayjs();
      let target = now.hour(17).minute(30).second(0);
      if (target.isBefore(now)) target = target.add(1, 'day');
      return target;
    },
  },
  {
    id: 'today-2200',
    label: '22:00 hôm nay',
    getDate: () => {
      const now = dayjs();
      let target = now.hour(22).minute(0).second(0);
      if (target.isBefore(now)) target = target.add(1, 'day');
      return target;
    },
  },
  {
    id: 'tomorrow-1200',
    label: '12:00 trưa mai',
    getDate: () => dayjs().add(1, 'day').hour(12).minute(0).second(0),
  },
  {
    id: 'tomorrow-1730',
    label: '17:30 chiều mai',
    getDate: () => dayjs().add(1, 'day').hour(17).minute(30).second(0),
  },
  {
    id: 'in-2-days',
    label: 'Trong 2 ngày',
    getDate: () => dayjs().add(2, 'day').hour(17).minute(30).second(0),
  },
];

export interface MosChatMobileDateTimePickerProps {
  value: string | null | dayjs.Dayjs;
  onChange: (isoString: string | null) => void;
  placeholder?: string;
  presets?: DeadlinePresetOption[];
  className?: string;
  disabled?: boolean;
}

export const MosChatMobileDateTimePicker: React.FC<MosChatMobileDateTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Hoặc chọn ngày giờ cụ thể',
  presets = DEFAULT_MOBILE_DEADLINE_PRESETS,
  className = '',
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  let isDark = true;
  try {
    const theme = useTheme();
    if (theme?.themeMode) isDark = theme.themeMode === 'dark';
  } catch {
    isDark = true;
  }

  // Parse current value
  const parsedDayjs = useMemo(() => {
    if (!value) return null;
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }, [value]);

  // Format display text
  const displayText = useMemo(() => {
    if (!parsedDayjs) return '';
    return parsedDayjs.format('HH:mm · DD/MM/YYYY');
  }, [parsedDayjs]);

  // Format value for input[type="datetime-local"] (YYYY-MM-DDTHH:mm)
  const inputValue = useMemo(() => {
    if (!parsedDayjs) return '';
    return parsedDayjs.format('YYYY-MM-DDTHH:mm');
  }, [parsedDayjs]);

  // Check which preset is active
  const activePresetId = useMemo(() => {
    if (!parsedDayjs) return null;
    for (const p of presets) {
      const target = p.getDate();
      if (!target) continue;
      // Match within 1 minute
      if (Math.abs(target.diff(parsedDayjs, 'minute')) < 1) {
        return p.id;
      }
    }
    return null;
  }, [parsedDayjs, presets]);

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onChange(null);
      return;
    }
    const d = dayjs(val);
    if (d.isValid()) {
      onChange(d.toISOString());
    }
  };

  const handleSelectPreset = (p: DeadlinePresetOption) => {
    if (disabled) return;
    const d = p.getDate();
    onChange(d ? d.toISOString() : null);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleContainerClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      try {
        if (typeof inputRef.current.showPicker === 'function') {
          inputRef.current.showPicker();
        } else {
          inputRef.current.focus();
        }
      } catch {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Quick Presets Grid */}
      {presets.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {presets.map((p) => {
            const isActive = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectPreset(p)}
                className={`px-2.5 py-1.5 text-xs rounded-xl border font-medium transition-all active:scale-95 text-center truncate ${
                  isActive
                    ? 'border-amber-400/80 bg-amber-500/20 text-amber-300 font-semibold shadow-sm'
                    : isDark
                      ? 'border-slate-700/80 bg-slate-800/90 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Touch-Friendly Custom DateTime Picker Box */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleContainerClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleContainerClick();
          }
        }}
        className={`relative flex items-center justify-between px-3 py-2 rounded-xl border transition-colors cursor-pointer select-none ${
          parsedDayjs
            ? isDark
              ? 'border-amber-500/50 bg-slate-900/90 ring-1 ring-amber-500/30'
              : 'border-amber-500/60 bg-amber-50/50 ring-1 ring-amber-500/20'
            : isDark
              ? 'border-slate-700/80 bg-slate-900/80 hover:border-slate-600'
              : 'border-slate-300 bg-white hover:border-slate-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Native Touch Layer (Invokes native iOS wheel or Android picker) */}
        <input
          ref={inputRef}
          type="datetime-local"
          aria-label={placeholder}
          disabled={disabled}
          value={inputValue}
          onChange={handleNativeChange}
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer pointer-events-auto"
        />

        {/* Display Content */}
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <Calendar
            className={`w-4 h-4 shrink-0 ${
              parsedDayjs ? 'text-amber-400' : isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          />
          {parsedDayjs ? (
            <span
              className={`text-sm font-semibold tabular-nums truncate ${
                isDark ? 'text-amber-300' : 'text-amber-800'
              }`}
            >
              {displayText}
            </span>
          ) : (
            <span className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {placeholder}
            </span>
          )}
        </div>

        {/* Action button on right */}
        <div className="flex items-center gap-1.5 shrink-0 z-20">
          {parsedDayjs ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Xóa hạn chót"
              className={`p-1 rounded-full transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          )}
        </div>
      </div>
    </div>
  );
};
