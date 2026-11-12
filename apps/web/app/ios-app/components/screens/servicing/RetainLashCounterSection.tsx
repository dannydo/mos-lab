'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface RetainLashCounterSectionProps {
  isDark: boolean;
  leftLashCount: string;
  rightLashCount: string;
  setLeftLashCount: React.Dispatch<React.SetStateAction<string>>;
  setRightLashCount: React.Dispatch<React.SetStateAction<string>>;
  setValidationError: React.Dispatch<React.SetStateAction<string | null>>;
  dailyShedRate: number;
  daysSinceLastVisit: number;
  validationError: string | null;
}

export function RetainLashCounterSection({
  isDark,
  leftLashCount,
  rightLashCount,
  setLeftLashCount,
  setRightLashCount,
  setValidationError,
  dailyShedRate,
  daysSinceLastVisit,
  validationError,
}: RetainLashCounterSectionProps) {
  return (
    <div
      className={`${
        isDark
          ? 'bg-[#1C1C1E] border-amber-500/40 ring-1 ring-amber-500/20'
          : 'bg-gradient-to-b from-amber-50/70 to-white border-amber-200'
      } rounded-2xl p-4 shadow-sm border space-y-3.5`}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <div
          className={`text-[12.5px] font-black ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase tracking-tight`}
        >
          Số Lượng Sợi mi Còn lại
        </div>
      </div>

      {/* Ẩn triệt để spin button mặc định để căn giữa số */}
      <style>{`
        input.no-spin-buttons::-webkit-outer-spin-button,
        input.no-spin-buttons::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
          display: none !important;
        }
        input.no-spin-buttons {
          -moz-appearance: textfield !important;
          appearance: textfield !important;
        }
      `}</style>

      {/* 2 Khung Mắt Trái & Mắt Phải */}
      <div className="grid grid-cols-2 gap-3">
        {/* Mắt Trái (Left Eye - #17 extension-lash-count-left) */}
        <div
          className={`${
            isDark
              ? 'bg-neutral-900/90 border-neutral-700/80 focus-within:border-amber-400'
              : 'bg-white border-neutral-200 focus-within:border-amber-500'
          } rounded-xl p-3 border transition-colors space-y-2 shadow-2xs`}
        >
          <div className="flex items-center justify-center">
            <span
              className={`text-[11.5px] font-black ${isDark ? 'text-neutral-200' : 'text-neutral-800'} text-center`}
            >
              Mắt trái
            </span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => {
                setLeftLashCount((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)));
                setValidationError(null);
              }}
              className={`w-8 h-8 rounded-lg ${
                isDark
                  ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              } font-black text-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer`}
              aria-label="Giảm 1"
              title="Giảm 1"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <div className="flex-1 flex items-center justify-center">
              <input
                type="number"
                min="0"
                max="250"
                inputMode="numeric"
                placeholder="—"
                value={leftLashCount}
                onChange={(e) => {
                  setLeftLashCount(e.target.value);
                  setValidationError(null);
                }}
                style={{ MozAppearance: 'textfield' }}
                className={`no-spin-buttons [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-16 text-center font-black text-2xl tabular-nums bg-transparent ${
                  isDark ? 'text-amber-400' : 'text-amber-600'
                } focus:outline-none`}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLeftLashCount((prev) => String(Math.min(250, (parseInt(prev, 10) || 0) + 1)));
                setValidationError(null);
              }}
              className={`w-8 h-8 rounded-lg ${
                isDark
                  ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              } font-black text-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer`}
              aria-label="Tăng 1"
              title="Tăng 1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick Chips */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            {['0', '20', '40', '60'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setLeftLashCount(val);
                  setValidationError(null);
                }}
                className={`flex-1 py-1 rounded text-[10.5px] font-bold tabular-nums transition-colors cursor-pointer ${
                  leftLashCount === val
                    ? 'bg-amber-400 text-black font-black shadow-xs'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Mắt Phải (Right Eye - #18 extension-lash-count-right) */}
        <div
          className={`${
            isDark
              ? 'bg-neutral-900/90 border-neutral-700/80 focus-within:border-amber-400'
              : 'bg-white border-neutral-200 focus-within:border-amber-500'
          } rounded-xl p-3 border transition-colors space-y-2 shadow-2xs`}
        >
          <div className="flex items-center justify-center">
            <span
              className={`text-[11.5px] font-black ${isDark ? 'text-neutral-200' : 'text-neutral-800'} text-center`}
            >
              Mắt phải
            </span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => {
                setRightLashCount((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)));
                setValidationError(null);
              }}
              className={`w-8 h-8 rounded-lg ${
                isDark
                  ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              } font-black text-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer`}
              aria-label="Giảm 1"
              title="Giảm 1"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <div className="flex-1 flex items-center justify-center">
              <input
                type="number"
                min="0"
                max="250"
                inputMode="numeric"
                placeholder="—"
                value={rightLashCount}
                onChange={(e) => {
                  setRightLashCount(e.target.value);
                  setValidationError(null);
                }}
                style={{ MozAppearance: 'textfield' }}
                className={`no-spin-buttons [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-16 text-center font-black text-2xl tabular-nums bg-transparent ${
                  isDark ? 'text-amber-400' : 'text-amber-600'
                } focus:outline-none`}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setRightLashCount((prev) => String(Math.min(250, (parseInt(prev, 10) || 0) + 1)));
                setValidationError(null);
              }}
              className={`w-8 h-8 rounded-lg ${
                isDark
                  ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              } font-black text-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer`}
              aria-label="Tăng 1"
              title="Tăng 1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick Chips */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            {['0', '20', '40', '60'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setRightLashCount(val);
                  setValidationError(null);
                }}
                className={`flex-1 py-1 rounded text-[10.5px] font-bold tabular-nums transition-colors cursor-pointer ${
                  rightLashCount === val
                    ? 'bg-amber-400 text-black font-black shadow-xs'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Badge hoặc Báo bắt buộc chọn */}
      {leftLashCount !== '' && rightLashCount !== '' ? (
        <div
          className={`p-2.5 rounded-xl ${
            isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-neutral-200'
          } border flex items-center justify-between text-[11.5px]`}
        >
          <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>
            Tổng mi còn lại:{' '}
            <strong className="text-amber-400 tabular-nums">
              {(parseInt(leftLashCount, 10) || 0) + (parseInt(rightLashCount, 10) || 0)} sợi
            </strong>
          </span>
          <span
            className={`text-[11px] font-bold tabular-nums flex items-center gap-1 ${
              dailyShedRate > 12
                ? isDark
                  ? 'text-amber-400'
                  : 'text-amber-600'
                : isDark
                  ? 'text-emerald-400'
                  : 'text-emerald-600'
            }`}
          >
            <span>Rụng ~{dailyShedRate} sợi/ngày</span>
            <span className={`text-[9.5px] font-normal opacity-70 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              ({daysSinceLastVisit}N)
            </span>
          </span>
        </div>
      ) : (
        <div
          className={`p-2.5 rounded-xl ${
            isDark
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          } border flex items-center justify-center text-[11.5px] font-bold gap-1.5`}
        >
          <span>⚠️</span>
          <span>Bắt buộc chọn hoặc nhập số lượng mi còn lại của cả 2 mắt</span>
        </div>
      )}

      {validationError && (
        <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
