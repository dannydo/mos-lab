'use client';

import React from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import { BookingItem } from '../../../state/mockData';
import { ComboSessionBadge } from '../../ui-kit/ComboSessionBadge';
import { ComboExpiryStatusBadge } from '../../ui-kit/ComboExpiryStatusBadge';
import {
  formatComboName,
  parseUnderMinkCountFibers,
  parseUnderMinkLengthMm,
  resolveQuickCheckInComboPreset,
  stepUnderMinkCount,
  stepUnderMinkLength,
  UNDER_MINK_PREP_SPEC,
} from '../LashMaterialConstraintMatrix';
import { Check, Sparkles, RotateCw, Zap, AlertTriangle, Lock, Wallet } from 'lucide-react';

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
  onOpenWalletModal?: () => void;
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
  onOpenWalletModal,
}: QuickCheckInComboCardProps) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  if (!isComboLive) {
    if (booking?.comboLiveStatus?.isExpired) {
      const expNormal = booking.comboLiveStatus.normalRemaining ?? 0;
      const expRetain = booking.comboLiveStatus.retainRemaining ?? 0;
      const expTotal = booking.comboLiveStatus.remainingSessions ?? expNormal + expRetain;

      return (
        <div
          className={`rounded-2xl p-3.5 shadow-sm border-2 space-y-2.5 ${
            isDark ? 'border-rose-500/80 bg-[#221316] text-white' : 'border-rose-400 bg-rose-50 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white inline-flex items-center justify-center shrink-0">
                <Lock className="w-3 h-3 stroke-[2.5]" />
              </span>
              <span className={`text-[12.5px] font-black truncate ${isDark ? 'text-rose-200' : 'text-rose-800'}`}>
                {formatComboName(booking.comboLiveStatus.comboName) || 'Gói Combo Đã Hết Hạn'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
              <ComboSessionBadge
                normalRemaining={expNormal}
                retainRemaining={expRetain}
                remainingSessions={expTotal}
                comboName={booking.comboLiveStatus.comboName}
                size="xs"
              />
              {onOpenWalletModal && (
                <button
                  type="button"
                  onClick={onOpenWalletModal}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-extrabold leading-none cursor-pointer ${
                    isDark
                      ? 'bg-rose-950/90 hover:bg-rose-900 border-rose-400/50 text-rose-200'
                      : 'bg-white hover:bg-rose-100 border-rose-300 text-rose-700'
                  }`}
                >
                  <Wallet className="w-3 h-3 shrink-0" />
                  <span>Chi tiết Combo</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <ComboExpiryStatusBadge status={booking.comboLiveStatus} onClick={onOpenWalletModal} />
            <span className={`text-[10.5px] font-bold ${isDark ? 'text-rose-200/90' : 'text-rose-700'}`}>
              Đã khóa trừ 0đ · Check-in đi lẻ / Voucher
            </span>
          </div>

          <div
            className={`rounded-xl border px-2.5 py-2 text-[11px] leading-relaxed ${
              isDark ? 'bg-black/35 border-rose-500/35 text-rose-100' : 'bg-white/80 border-rose-200 text-rose-900'
            }`}
          >
            Mua thêm gói Combo mới hôm nay sẽ <strong>cứu toàn bộ {expTotal} buổi tồn</strong> cộng dồn thời hạn từ hôm
            nay: <strong className={isDark ? 'text-amber-300' : 'text-amber-700'}>Nối mới +1 tháng/buổi</strong> ·{' '}
            <strong className={isDark ? 'text-emerald-300' : 'text-emerald-700'}>Dặm +25 ngày/buổi</strong>.
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl p-3 shadow-sm border border-amber-500/40 bg-[var(--mos-surface)] text-[var(--mos-text)] flex items-center justify-between">
        <span
          className={`text-[11.5px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
            isDark ? 'text-amber-400' : 'text-amber-700'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          Khách Lẻ
        </span>
        <span
          className={`border text-[10.5px] font-black px-2.5 py-0.5 rounded-full ${
            isDark
              ? 'bg-amber-400/20 text-amber-400 border-amber-400/30'
              : 'bg-amber-50 text-amber-700 border-amber-300'
          }`}
        >
          ≤ 21N: Giá Dặm
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3 shadow-sm border border-emerald-500/40 bg-[var(--mos-surface)] space-y-2 text-[var(--mos-text)]">
      {/* Header gọn: Icon Zap + Tên gói + Badge Ngày ghé cuối & Tổng lượt */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center shrink-0">
            <Zap className="w-3 h-3 fill-current" />
          </span>
          <span className="text-[12.5px] font-black text-[var(--mos-text)] truncate">
            {formatComboName(booking?.comboLiveStatus?.comboName) || 'Gói ❖ Live'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 tabular-nums">
          {preset.daysSinceLastVisit !== null && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                preset.isWithinRetainWindow
                  ? isDark
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : isDark
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
            >
              {preset.daysSinceLastVisit} ngày
            </span>
          )}
          <button
            type="button"
            onClick={onOpenWalletModal}
            className="inline-flex items-center cursor-pointer active:scale-95 transition-transform"
            title="Bấm để xem Chi tiết Gói Combo & Hạn sử dụng"
          >
            <ComboSessionBadge
              normalRemaining={preset.normalRemaining}
              retainRemaining={preset.retainRemaining}
              remainingSessions={remainingSessions}
              comboName={booking?.comboLiveStatus?.comboName}
              size="xs"
            />
          </button>
        </div>
      </div>

      {/* Hàng HSD + Tốc độ đi trung bình (Avg: X.X ngày/buổi) + Nút mở Chi tiết Combo */}
      {booking?.comboLiveStatus && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <ComboExpiryStatusBadge status={booking.comboLiveStatus} showPace onClick={onOpenWalletModal} />
          {onOpenWalletModal && (
            <button
              type="button"
              onClick={onOpenWalletModal}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--mos-surface-raised)] hover:bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text)] text-[10px] font-bold leading-none cursor-pointer"
            >
              <Wallet className={`w-3 h-3 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <span>Chi tiết Combo</span>
            </button>
          )}
        </div>
      )}

      {/* Khối Thông số Mi Trên + Mi Dưới tối giản */}
      <div className="bg-[var(--mos-surface-raised)] rounded-xl p-2.5 border border-[var(--mos-surface-border)] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12.5px] font-black text-[var(--mos-text)] truncate">
                {preset.materialShortLabel} · {preset.volume} · {preset.count}
              </span>
              {preset.lastVisitDate && (
                <span className="text-[10px] text-[var(--mos-text-muted)] font-medium tabular-nums shrink-0">
                  ({preset.lastVisitDate.slice(0, 5)})
                </span>
              )}
            </div>
            <div className="text-[11px] font-semibold text-[var(--mos-text-muted)] truncate mt-0.5 tabular-nums">
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
                : 'bg-[var(--mos-surface)] border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] hover:border-purple-400'
            }`}
          >
            {quickHasUnderMink && <Check className="w-3 h-3 stroke-[3]" />}
            <span>+Mi dưới</span>
          </button>
        </div>

        {/* 1 Dòng Ngang Mi Dưới */}
        {quickHasUnderMink && (
          <div className="pt-2 border-t border-[var(--mos-surface-border)] flex items-center justify-between gap-1 text-[10px] tabular-nums whitespace-nowrap">
            <div className="flex items-center gap-1">
              {/* Độ cong */}
              <div className="inline-flex items-center bg-[var(--mos-surface)] p-0.5 rounded-lg border border-[var(--mos-surface-border)]">
                {UNDER_MINK_PREP_SPEC.allowedCurls.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setQuickUnderCurl(c)}
                    className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                      quickUnderCurl === c
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Độ dài */}
              <div className="inline-flex items-center bg-[var(--mos-surface)] p-0.5 rounded-lg border border-[var(--mos-surface-border)] tabular-nums">
                <button
                  type="button"
                  onClick={() => setQuickUnderLength((prev) => stepUnderMinkLength(prev, -1))}
                  disabled={parseUnderMinkLengthMm(quickUnderLength) <= UNDER_MINK_PREP_SPEC.minLengthMm}
                  className="w-5 h-5 rounded-md font-black text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
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
                  className="w-5 h-5 rounded-md font-black text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Số lượng */}
              <div className="inline-flex items-center bg-[var(--mos-surface)] p-0.5 rounded-lg border border-[var(--mos-surface-border)] tabular-nums">
                <button
                  type="button"
                  onClick={() => setQuickUnderCount((prev) => stepUnderMinkCount(prev, -10))}
                  disabled={parseUnderMinkCountFibers(quickUnderCount) <= UNDER_MINK_PREP_SPEC.minCountFibers}
                  className="w-5 h-5 rounded-md font-black text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
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
                  className="w-5 h-5 rounded-md font-black text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Chọn ĐỘC LẬP Mi Dưới */}
            <div className="inline-flex items-center bg-[var(--mos-surface)] p-0.5 rounded-lg border border-purple-500/50 shrink-0">
              <button
                type="button"
                onClick={() => setQuickUnderServiceType('Normal')}
                className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                  quickUnderServiceType === 'Normal'
                    ? 'bg-[#FFB400] text-black shadow-xs'
                    : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]'
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
                    : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]'
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
        <div
          className={`px-2.5 py-1 rounded-lg border flex items-center justify-between gap-2 text-[10px] font-semibold ${
            isDark
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
              : 'bg-rose-50 border-rose-300 text-rose-700'
          }`}
        >
          <span className="truncate flex items-center gap-1">
            <AlertTriangle className={`w-3 h-3 shrink-0 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
            <span>{overrideReason}</span>
          </span>
          <button
            type="button"
            onClick={onResetOverride}
            className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 cursor-pointer ${
              isDark
                ? 'bg-rose-900 text-rose-200 border-rose-700'
                : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-100'
            }`}
          >
            Hoàn tác ↺
          </button>
        </div>
      )}

      {/* Banner Ca Nối Mới Combo: Trừ 1 suất Mới · Nhân viên bắt buộc gỡ sạch 100% mi cũ */}
      {isComboLive && quickServiceType === 'Normal' && (
        <div
          className={`px-2.5 py-1.5 rounded-xl border flex items-start gap-2 text-[10.5px] font-bold ${
            isDark
              ? 'bg-amber-950/50 border-amber-500/60 text-amber-200'
              : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className="leading-snug">
            Trừ 1 suất Nối Mới Combo · Nhân viên bắt buộc gỡ toàn bộ mi cũ & nối mới 100%
          </span>
        </div>
      )}

      {/* 2 Nút chọn chế độ tối giản: ✨ Mới (X) | 🔄 Dặm (Y) */}
      <div className="bg-[var(--mos-surface-raised)] p-1 rounded-xl grid grid-cols-2 gap-1 border border-[var(--mos-surface-border)]">
        <button
          type="button"
          onClick={() => onRequestServiceTypeChange('Normal')}
          className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums ${
            quickServiceType === 'Normal'
              ? 'bg-[#FFB400] text-black shadow-xs'
              : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>{isComboLive ? preset.normalRemaining : 'Mới'}</span>
        </button>

        <button
          type="button"
          onClick={() => onRequestServiceTypeChange('Retain')}
          className={`py-1.5 px-2 rounded-lg font-bold text-[11.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer tabular-nums ${
            quickServiceType === 'Retain'
              ? 'bg-[#34C759] text-white shadow-xs'
              : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5 shrink-0" />
          <span>{isComboLive ? preset.retainRemaining : 'Dặm'}</span>
        </button>
      </div>
    </div>
  );
}
