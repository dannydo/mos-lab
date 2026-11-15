'use client';

import React, { useRef } from 'react';

export interface RangePreset {
  label: string;
  range: [number, number];
  subLabel?: string;
  tip?: string;
}

export const DEFAULT_NATURAL_LENGTH_PRESETS: RangePreset[] = [
  { label: '6 – 8', range: [6, 8], subLabel: 'Ngắn' },
  { label: '7 – 9', range: [7, 9] },
  { label: '8 – 10', range: [8, 10], subLabel: 'Chuẩn' },
  { label: '9 – 11', range: [9, 11] },
  { label: '10 – 12', range: [10, 12], subLabel: 'Dài' },
  { label: '11 – 13', range: [11, 13] },
];

export const DEFAULT_NATURAL_THICKNESS_PRESETS: RangePreset[] = [
  { label: '0.05 – 0.07', range: [0.05, 0.07], subLabel: 'Mảnh' },
  { label: '0.07 – 0.10', range: [0.07, 0.10], subLabel: 'Vừa' },
  { label: '0.10 – 0.12', range: [0.10, 0.12], subLabel: 'Khỏe' },
  { label: '0.12 – 0.15', range: [0.12, 0.15], subLabel: 'Cứng' },
];

export const DEFAULT_NATURAL_COUNT_PRESETS: RangePreset[] = [
  { label: '40 – 60', range: [40, 60], subLabel: 'Thưa' },
  { label: '60 – 80', range: [60, 80], subLabel: 'Chuẩn' },
  { label: '80 – 100', range: [80, 100], subLabel: 'Dày' },
  { label: '100 – 120', range: [100, 120], subLabel: 'Rất dày' },
  { label: '120 – 150', range: [120, 150] },
];

export interface DualThumbRangeSliderProps {
  min: number;
  max: number;
  step: number;
  value: [number, number] | null;
  onChange: (val: [number, number]) => void;
  formatValue?: (val: number) => string;
  labelName?: string;
  unitSuffix?: string;
  isMissingAlert?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  isDark?: boolean;
  presets?: RangePreset[];
  showPresetsLabel?: boolean;
}

export function parseLengthRangeOrNull(val?: string | null): [number, number] | null {
  if (!val || !val.trim()) return null;
  const nums = val.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  if (nums.length === 1) {
    const n = Math.max(5, Math.min(15, parseInt(nums[0], 10)));
    return [n, n];
  }
  const n1 = Math.max(5, Math.min(15, parseInt(nums[0], 10)));
  const n2 = Math.max(5, Math.min(15, parseInt(nums[1], 10)));
  return [Math.min(n1, n2), Math.max(n1, n2)];
}

export function parseThicknessRangeOrNull(val?: string | null): [number, number] | null {
  if (!val || !val.trim()) return null;
  const nums = val.match(/\d+\.\d+|\d+/g);
  if (!nums || nums.length === 0) return null;
  if (nums.length === 1) {
    const raw = parseFloat(nums[0]);
    const n = raw < 0.05 ? 0.05 : raw > 0.2 ? 0.2 : Math.round(raw * 100) / 100;
    return [n, n];
  }
  const r1 = parseFloat(nums[0]);
  const r2 = parseFloat(nums[1]);
  const n1 = r1 < 0.05 ? 0.05 : r1 > 0.2 ? 0.2 : Math.round(r1 * 100) / 100;
  const n2 = r2 < 0.05 ? 0.05 : r2 > 0.2 ? 0.2 : Math.round(r2 * 100) / 100;
  return [Math.min(n1, n2), Math.max(n1, n2)];
}

export function parseCountRangeOrNull(val?: string | null): [number, number] | null {
  if (!val || !val.trim()) return null;
  const nums = val.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  if (nums.length === 1) {
    const n = Math.max(40, Math.min(200, parseInt(nums[0], 10)));
    return [n, n];
  }
  const n1 = Math.max(40, Math.min(200, parseInt(nums[0], 10)));
  const n2 = Math.max(40, Math.min(200, parseInt(nums[1], 10)));
  return [Math.min(n1, n2), Math.max(n1, n2)];
}

function resolveDefaultPresets(
  presets?: RangePreset[],
  labelName?: string,
  min?: number,
  max?: number
): RangePreset[] | undefined {
  if (presets) return presets;
  if (labelName === 'Dài' || (min === 5 && max === 15)) {
    return DEFAULT_NATURAL_LENGTH_PRESETS;
  }
  if (labelName === 'Dày' || (min === 0.05 && max === 0.2)) {
    return DEFAULT_NATURAL_THICKNESS_PRESETS;
  }
  if (labelName === 'Số sợi' || (min === 40 && max === 200)) {
    return DEFAULT_NATURAL_COUNT_PRESETS;
  }
  return undefined;
}

export function DualThumbRangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  formatValue,
  labelName = 'Giá trị',
  unitSuffix = '',
  isMissingAlert = false,
  inputRef,
  isDark,
  presets: explicitPresets,
  showPresetsLabel = true,
}: DualThumbRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activePresets = resolveDefaultPresets(explicitPresets, labelName, min, max);

  const calculateSteppedValue = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return min;
    const rect = track.getBoundingClientRect();
    if (!rect || rect.width <= 0) return min;
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + fraction * (max - min);
    const stepped = Math.round((raw - min) / step) * step + min;
    const clamped = Math.max(min, Math.min(max, stepped));
    const precision = step < 1 ? Math.max(0, Math.round(-Math.log10(step))) : 0;
    return parseFloat(clamped.toFixed(precision));
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target && target.tagName === 'INPUT') {
      return;
    }
    const clickedVal = calculateSteppedValue(e.clientX);

    if (value === null) {
      onChange([clickedVal, clickedVal]);
      return;
    }

    const [valMin, valMax] = value;
    if (clickedVal < valMin) {
      onChange([clickedVal, valMax]);
    } else if (clickedVal > valMax) {
      onChange([valMin, clickedVal]);
    } else {
      const distToMin = Math.abs(clickedVal - valMin);
      const distToMax = Math.abs(clickedVal - valMax);
      if (distToMin <= distToMax) {
        onChange([clickedVal, valMax]);
      } else {
        onChange([valMin, clickedVal]);
      }
    }
  };

  const renderPresets = () => {
    if (!activePresets || activePresets.length === 0) return null;
    return (
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5 select-none">
        {showPresetsLabel && (
          <span
            className={`text-[9.5px] font-bold shrink-0 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}
          >
            Ấn chọn range:
          </span>
        )}
        <div className="flex items-center gap-1 flex-wrap">
          {activePresets.map((preset) => {
            const isMatch =
              value !== null &&
              value[0] === preset.range[0] &&
              value[1] === preset.range[1];
            return (
              <button
                key={`${preset.range[0]}-${preset.range[1]}`}
                type="button"
                onClick={() => onChange(preset.range)}
                aria-pressed={isMatch}
                aria-label={`Chọn khoảng ${labelName} ${preset.label}${unitSuffix ? ` ${unitSuffix}` : ''}`}
                className={`h-6 px-2 rounded-md text-[10px] font-black tabular-nums transition-all cursor-pointer inline-flex items-center justify-center gap-1 select-none active:scale-95 leading-none ${
                  isMatch
                    ? 'bg-[#FFB400] text-black shadow-xs ring-1 ring-amber-400 border border-amber-400'
                    : isDark
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                }`}
              >
                <span>{preset.label}</span>
                {preset.subLabel && (
                  <span
                    className={`text-[8.5px] font-bold ${
                      isMatch ? 'text-black/75' : isDark ? 'text-neutral-400' : 'text-gray-500'
                    }`}
                  >
                    {preset.subLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (value === null) {
    return (
      <div className="space-y-1.5 pt-0.5 select-none">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold tabular-nums w-8 text-right shrink-0 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}
          >
            {formatValue ? formatValue(min) : min}
          </span>
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            className="relative flex-1 h-7 flex items-center rounded-lg cursor-pointer select-none touch-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#FFB400] has-[:focus-visible]:ring-offset-1"
          >
            <div
              className={`w-full h-6 rounded-lg border border-dashed flex items-center justify-center pointer-events-none transition-colors ${
                isMissingAlert
                  ? isDark
                    ? 'border-rose-500/80 bg-rose-950/30 text-rose-300'
                    : 'border-rose-400 bg-rose-50 text-rose-700'
                  : isDark
                    ? 'border-neutral-700 bg-neutral-900/70 text-neutral-400'
                    : 'border-gray-300 bg-gray-50 text-gray-500'
              }`}
            >
              <span className="text-[10px] font-bold tracking-tight">Chạm hoặc ấn chọn range dưới đây</span>
            </div>
            <input
              ref={inputRef}
              type="range"
              min={min}
              max={max}
              step={step}
              value={min}
              aria-label={`${labelName} tối thiểu`}
              aria-valuetext="Chưa đo"
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v)) onChange([v, v]);
              }}
              onPointerUp={(e) => {
                const v = parseFloat(e.currentTarget.value);
                if (!Number.isNaN(v)) onChange([v, v]);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange([min, min]);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            />
          </div>
          <span
            className={`text-[10px] font-bold tabular-nums w-8 shrink-0 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}
          >
            {formatValue ? formatValue(max) : max}
          </span>
        </div>
        {renderPresets()}
      </div>
    );
  }

  const [valMin, valMax] = value;
  const minPct = Math.max(0, Math.min(100, ((valMin - min) / (max - min)) * 100));
  const maxPct = Math.max(0, Math.min(100, ((valMax - min) / (max - min)) * 100));
  const formattedMin = `${formatValue ? formatValue(valMin) : valMin}${unitSuffix}`;
  const formattedMax = `${formatValue ? formatValue(valMax) : valMax}${unitSuffix}`;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (v > valMax) {
      onChange([v, v]);
    } else {
      onChange([v, valMax]);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (v < valMin) {
      onChange([v, v]);
    } else {
      onChange([valMin, v]);
    }
  };

  // Đổi z-index linh hoạt khi 2 thumb trùng nhau
  const isMinHigher = valMin > min + (max - min) * 0.5;

  return (
    <div className="space-y-1.5 pt-0.5 select-none">
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] font-bold tabular-nums w-8 text-right shrink-0 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}
        >
          {formatValue ? formatValue(min) : min}
        </span>
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          className="relative flex-1 h-6 flex items-center cursor-pointer select-none touch-none"
        >
          {/* Track nền xám */}
          <div
            className={`absolute left-0 right-0 h-2 rounded-full pointer-events-none ${
              isDark ? 'bg-neutral-800' : 'bg-gray-200'
            }`}
          />
          {/* Dải vàng highlight giữa min và max */}
          <div
            className="absolute h-2 bg-[#FFB400] rounded-full pointer-events-none"
            style={{
              left: `${minPct}%`,
              width: `${Math.max(0, maxPct - minPct)}%`,
            }}
          />
          {/* Input Min Thumb */}
          <input
            ref={inputRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={valMin}
            onChange={handleMinChange}
            aria-label={`${labelName} tối thiểu`}
            aria-valuetext={formattedMin}
            className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none focus:outline-none focus-visible:outline-2 focus-visible:outline-[#FFB400] focus-visible:outline-offset-4 cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#FFB400] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:cursor-grabbing [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#FFB400] [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
            style={{ zIndex: isMinHigher ? 25 : 20 }}
          />
          {/* Input Max Thumb */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={valMax}
            onChange={handleMaxChange}
            aria-label={`${labelName} tối đa`}
            aria-valuetext={formattedMax}
            className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none focus:outline-none focus-visible:outline-2 focus-visible:outline-[#FFB400] focus-visible:outline-offset-4 cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#FFB400] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:cursor-grabbing [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#FFB400] [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
            style={{ zIndex: isMinHigher ? 20 : 25 }}
          />
        </div>
        <span
          className={`text-[10px] font-bold tabular-nums w-8 shrink-0 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}
        >
          {formatValue ? formatValue(max) : max}
        </span>
      </div>
      {renderPresets()}
    </div>
  );
}
