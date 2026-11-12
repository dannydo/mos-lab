'use client';

import React from 'react';

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
}: DualThumbRangeSliderProps) {
  if (value === null) {
    return (
      <div className="flex items-center gap-2 pt-0.5 select-none">
        <span
          className={`text-[10px] font-bold tabular-nums w-8 text-right shrink-0 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}
        >
          {formatValue ? formatValue(min) : min}
        </span>
        <div className="relative flex-1 h-7 flex items-center rounded-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#FFB400] has-[:focus-visible]:ring-offset-1">
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
            <span className="text-[10px] font-bold tracking-tight">Chạm hoặc kéo để đo</span>
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
    <div className="flex items-center gap-2 pt-0.5 select-none">
      <span
        className={`text-[10px] font-bold tabular-nums w-8 text-right shrink-0 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}
      >
        {formatValue ? formatValue(min) : min}
      </span>
      <div className="relative flex-1 h-6 flex items-center">
        {/* Track nền xám */}
        <div className={`absolute left-0 right-0 h-2 rounded-full ${isDark ? 'bg-neutral-800' : 'bg-gray-200'}`} />
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
  );
}
