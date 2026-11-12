'use client';

import React from 'react';
import { BookingItem } from '../../../state/mockData';
import { ComboSessionBadge } from '../../ui-kit/ComboSessionBadge';
import {
  formatComboName,
  parseUnderMinkCountFibers,
  parseUnderMinkLengthMm,
  resolveQuickCheckInComboPreset,
  stepUnderMinkCount,
  stepUnderMinkLength,
  UNDER_MINK_PREP_SPEC,
} from '../LashMaterialConstraintMatrix';
import { Check, Sparkles, RotateCw, Zap, AlertTriangle } from 'lucide-react';

type QuickCheckInPreset = ReturnType<typeof resolveQuickCheckInComboPreset>;

interface QuickCheckInComboCardProps {
  booking: BookingItem;
  isComboLive: boolean;
  remainingSessions: number;
  preset: QuickCheckInPreset;
  quickServiceType: 'Normal' | 'Retain';
  quickHasUnderMink: boolean;
  setQuickHasUnderMink: React.Dispatch<React.SetStateAction<boolean>>;
  quickUnderServiceType: 'Normal' | 'Retain';
  setQuickUnderServiceType: React.Dispatch<React.SetStateAction<'Normal' | 'Retain'>>;
  quickUnderCurl: string;
  setQuickUnderCurl: React.Dispatch<React.SetStateAction<string>>;
  quickUnderLength: string;
  setQuickUnderLength: React.Dispatch<React.SetStateAction<string>>;
  quickUnderCount: string;
  setQuickUnderCount: React.Dispatch<React.SetStateAction<string>>;
  isOverridden: boolean;
  overrideReason: string;
  onResetOverride: () => void;
  onRequestServiceTypeChange: (targetType: 'Normal' | 'Retain') => void;
}

export function QuickCheckInComboCard({
  booking,
  isComboLive,
  remainingSessions,
  preset,
  quickServiceType,
  quickHasUnderMink,
  setQuickHasUnderMink,
  quickUnderServiceType,
  setQuickUnderServiceType,
  quickUnderCurl,
  setQuickUnderCurl,
  quickUnderLength,
  setQuickUnderLength,
  quickUnderCount,
  setQuickUnderCount,
  isOverridden,
  overrideReason,
  onResetOverride,
  onRequestServiceTypeChange,
}: QuickCheckInComboCardProps) {
  if (!isComboLive) {
    return (
      <div className="rounded-2xl p-3 shadow-sm border border-amber-500/40 bg-[#1C1C1E] text-white flex items-center justify-between">
        <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Khách Lẻ
        </span>
        <span className="bg-amber-400/20 text-amber-400 border border-amber-400/30 text-[10.5px] font-black px-2.5 py-0.5 rounded-full">
          ≤ 21N: Giá Dặm
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3 shadow-sm border border-emerald-500/40 bg-[#1C1C1E] space-y-2 text-white">
      {/* Header gọn: Icon Zap + Tên gói + Badge Ngày ghé cuối & Tổng lượt */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center shrink-0">
            <Zap className="w-3 h-3 fill-current" />
          </span>
          <span className="text-[12.5px] font-black text-white truncate">
            {formatComboName(booking?.comboLiveStatus?.comboName) || 'Gói ❖ Live'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 tabular-nums">
          {preset.daysSinceLastVisit !== null && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                preset.isWithinRetainWindow
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {preset.daysSinceLastVisit} ngày
            </span>
          )}
          <ComboSessionBadge
            normalRemaining={preset.normalRemaining}
            retainRemaining={preset.retainRemaining}
            remainingSessions={remainingSessions}
            comboName={booking?.comboLiveStatus?.comboName}
            size="xs"
          />
        </div>
      </div>

      {/* Khối Thông số Mi Trên + Mi Dưới tối giản */}
      <div className="bg-[#2C2C2E] rounded-xl p-2.5 border border-neutral-700/80 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12.5px] font-black text-white truncate">
                {preset.materialShortLabel} · {preset.volume} · {preset.count}
              </span>
              {preset.lastVisitDate && (
                <span className="text-[10px] text-neutral-400 font-medium tabular-nums shrink-0">
                  ({preset.lastVisitDate.slice(0, 5)})
                </span>
              )}
            </div>
            <div className="text-[11px] font-semibold text-neutral-300 truncate mt-0.5 tabular-nums">
              {preset.style.replace(/sexy\s*\/?\s*cat|cat\s*\/?\s*sexy/gi, 'Natural')} ·{' '}
              {preset.curl.replace(/^Cong\s+/i, '')} · {preset.thickness.replace(/\s*mm/gi, '').replace(/\s+/g, '')} ·{' '}
              {preset.length.replace(/\s*mm/gi, '').replace(/\s+/g, '')}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setQuickHasUnderMink((prev) => !prev)}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
              quickHasUnderMink
                ? 'bg-purple-600 border-purple-500 text-white shadow-xs'
                : 'bg-[#1C1C1E] border-neutral-700 text-neutral-300 hover:border-purple-400'
            }`}
          >
            {quickHasUnderMink && <Check className="w-3 h-3 stroke-[3]" />}
            <span>+Mi dưới</span>
          </button>
        </div>

        {/* 1 Dòng Ngang Mi Dưới */}
        {quickHasUnderMink && (
          <div className="pt-2 border-t border-neutral-700/70 flex items-center justify-between gap-1 text-[10px] tabular-nums whitespace-nowrap">
            <div className="flex items-center gap-1">
              {/* Độ cong */}
              <div className="inline-flex items-center bg-[#1C1C1E] p-0.5 rounded-lg border border-neutral-700">
                {UNDER_MINK_PREP_SPEC.allowedCurls.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setQuickUnderCurl(c)}
                    className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                      quickUnderCurl === c ? 'bg-purple-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Độ dài */}
              <div className="inline-flex items-center bg-[#1C1C1E] p-0.5 rounded-lg border border-neutral-700 tabular-nums">
                <button
                  type="button"
                  onClick={() => setQuickUnderLength((prev) => stepUnderMinkLength(prev, -1))}
                  disabled={parseUnderMinkLengthMm(quickUnderLength) <= UNDER_MINK_PREP_SPEC.minLengthMm}
                  className="w-5 h-5 rounded-md font-black text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                >
                  −
                </button>
                <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[20px] text-center shadow-xs">
                  {parseUnderMinkLengthMm(quickUnderLength)}
                </span>
                <button
                  type="button"
                  onClick={() => setQuickUnderLength((prev) => stepUnderMinkLength(prev, 1))}
                  disabled={parseUnderMinkLengthMm(quickUnderLength) >= UNDER_MINK_PREP_SPEC.maxLengthMm}
                  className="w-5 h-5 rounded-md font-black text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Số lượng */}
              <div className="inline-flex items-center bg-[#1C1C1E] p-0.5 rounded-lg border border-neutral-700 tabular-nums">
                <button
                  type="button"
                  onClick={() => setQuickUnderCount((prev) => stepUnderMinkCount(prev, -10))}
                  disabled={parseUnderMinkCountFibers(quickUnderCount) <= UNDER_MINK_PREP_SPEC.minCountFibers}
                  className="w-5 h-5 rounded-md font-black text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                >
                  −
                </button>
                <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[22px] text-center shadow-xs">
                  {parseUnderMinkCountFibers(quickUnderCount)}
                </span>
                <button
                  type="button"
                  onClick={() => setQuickUnderCount((prev) => stepUnderMinkCount(prev, 10))}
                  disabled={parseUnderMinkCountFibers(quickUnderCount) >= UNDER_MINK_PREP_SPEC.maxCountFibers}
                  className="w-5 h-5 rounded-md font-black text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Chọn ĐỘC LẬP Mi Dưới */}
            <div className="inline-flex items-center bg-[#1C1C1E] p-0.5 rounded-lg border border-purple-500/50 shrink-0">
              <button
                type="button"
                onClick={() => setQuickUnderServiceType('Normal')}
                className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                  quickUnderServiceType === 'Normal'
                    ? 'bg-[#FFB400] text-black shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {preset.hasUnderMinkCombo ? `Mới (${preset.underComboNormalRemaining})` : 'Mới'}
              </button>
              <button
                type="button"
                onClick={() => setQuickUnderServiceType('Retain')}
                className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                  quickUnderServiceType === 'Retain'
                    ? 'bg-[#34C759] text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {preset.hasUnderMinkCombo ? `Dặm (${preset.underComboRetainRemaining})` : 'Dặm'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Banner Override nếu có */}
      {isOverridden && (
        <div className="px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-500/50 flex items-center justify-between gap-2 text-[10px] text-rose-300 font-semibold">
          <span className="truncate flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>{overrideReason}</span>
          </span>
          <button
            type="button"
            onClick={onResetOverride}
            className="px-1.5 py-0.5 rounded bg-rose-900 text-rose-200 border border-rose-700 text-[9px] font-bold shrink-0 cursor-pointer"
          >
            Hoàn tác ↺
          </button>
        </div>
      )}

      {/* Banner Ca Nối Mới Combo: Trừ 1 suất Mới · Nhân viên bắt buộc gỡ sạch 100% mi cũ */}
      {isComboLive && quickServiceType === 'Normal' && (
        <div className="px-2.5 py-1.5 rounded-xl bg-amber-950/50 border border-amber-500/60 flex items-start gap-2 text-[10.5px] text-amber-200 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span className="leading-snug">
            Trừ 1 suất Nối Mới Combo · Nhân viên bắt buộc gỡ toàn bộ mi cũ & nối mới 100%
          </span>
        </div>
      )}

      {/* 2 Nút chọn chế độ tối giản: ✨ Mới (X) | 🔄 Dặm (Y) */}
      <div className="bg-[#2C2C2E] p-1 rounded-xl grid grid-cols-2 gap-1 border border-neutral-700/60">
        <button
          type="button"
          onClick={() => onRequestServiceTypeChange('Normal')}
          className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums ${
            quickServiceType === 'Normal' ? 'bg-[#FFB400] text-black shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>{isComboLive ? preset.normalRemaining : 'Mới'}</span>
        </button>

        <button
          type="button"
          onClick={() => onRequestServiceTypeChange('Retain')}
          className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums ${
            quickServiceType === 'Retain' ? 'bg-[#34C759] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5 shrink-0" />
          <span>{isComboLive ? preset.retainRemaining : 'Dặm'}</span>
        </button>
      </div>
    </div>
  );
}
