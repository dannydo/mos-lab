'use client';

import React, { useMemo } from 'react';
import {
  computeCvSelfChallengePlan,
  IosSelfChallengeOption,
  IosSelfChallengePlan,
  IosSelfChallengeTierKey,
  isSelfChallengeSlowerThanAverage,
  validateSelfChallengeSlowerReason,
} from '@mos-lab/shared';
import { useTheme } from '../../../../../context/ThemeContext';
import { BookingItem } from '../../../state/mockData';
import { StaffMonthlyStats } from '../../../state/useIosAppState';
import { AlertCircle, CheckCircle2, Flame, Minus, Plus } from 'lucide-react';

interface SelfChallengeDurationCardProps {
  booking: BookingItem;
  staffStats?: StaffMonthlyStats | null;
  suggestedDurationMin: number;
  plan?: IosSelfChallengePlan;
  selectedTier: IosSelfChallengeTierKey | null;
  selectedDurationMin: number | null;
  slowerReason?: string;
  showTimeRequiredWarning: boolean;
  showReasonRequiredWarning?: boolean;
  estimatedFinishTime: string;
  timeSectionRef?: React.RefObject<HTMLDivElement | null>;
  slowerReasonInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onSelectOption: (option: IosSelfChallengeOption, plan: IosSelfChallengePlan) => void;
  onAdjustMinutes: (deltaMinutes: number) => void;
  onChangeSlowerReason?: (value: string) => void;
}

export function SelfChallengeDurationCard({
  booking,
  staffStats,
  suggestedDurationMin,
  plan: providedPlan,
  selectedTier,
  selectedDurationMin,
  slowerReason,
  showTimeRequiredWarning,
  showReasonRequiredWarning = false,
  estimatedFinishTime,
  timeSectionRef,
  slowerReasonInputRef,
  onSelectOption,
  onAdjustMinutes,
  onChangeSlowerReason,
}: SelfChallengeDurationCardProps) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  const plan = useMemo(
    () =>
      providedPlan ||
      computeCvSelfChallengePlan({
        booking,
        historyProfile: booking.cvSelfSpeedHistory || staffStats?.cvSelfSpeedHistory,
        fallbackSuggestedMinutes: suggestedDurationMin,
      }),
    [providedPlan, booking, staffStats?.cvSelfSpeedHistory, suggestedDurationMin]
  );

  const activeOption = selectedTier ? plan.options.find((opt) => opt.key === selectedTier) || null : null;
  const fineTuneDelta = activeOption && selectedDurationMin !== null ? selectedDurationMin - activeOption.minutes : 0;
  const requiresSlowerReason = isSelfChallengeSlowerThanAverage(selectedDurationMin, plan.baselineMinutes);
  const reasonCheck = validateSelfChallengeSlowerReason(slowerReason);
  const isSelectionReady = selectedDurationMin !== null && (!requiresSlowerReason || reasonCheck.valid);
  const hasBlockingWarning =
    (showTimeRequiredWarning && !selectedDurationMin) ||
    (showReasonRequiredWarning && requiresSlowerReason && !reasonCheck.valid);

  return (
    <div
      ref={timeSectionRef}
      className={`rounded-2xl p-3.5 space-y-2.5 transition-all bg-[var(--mos-surface-raised)] ${
        isSelectionReady
          ? 'border border-emerald-500/50 shadow-md'
          : hasBlockingWarning
            ? 'border-2 border-rose-500/80 shadow-lg shadow-rose-500/20 animate-pulse'
            : requiresSlowerReason
              ? 'border border-amber-500/60 shadow-md'
              : 'border border-[var(--mos-surface-border)] shadow-md'
      }`}
    >
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Flame className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <span
              className={`text-[11.5px] font-black uppercase tracking-tight truncate ${
                isDark ? 'text-amber-400' : 'text-amber-700'
              }`}
            >
              Vượt Lên Chính Mình
            </span>
          </div>
          <span
            className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border leading-none shrink-0 tabular-nums ${
              isSelectionReady
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : hasBlockingWarning
                  ? isDark
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 animate-pulse'
                    : 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : requiresSlowerReason
                    ? isDark
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] border-[var(--mos-surface-border)]'
            }`}
          >
            {isSelectionReady
              ? `Đã chọn: ${selectedDurationMin}p`
              : requiresSlowerReason
                ? 'Cần điền lý do'
                : 'Bắt buộc chọn'}
          </span>
        </div>

        <p className="text-[10.5px] text-[var(--mos-text-muted)] font-medium leading-snug tabular-nums">
          {plan.sampleCount > 0 ? (
            <>
              <span className="text-[var(--mos-text)] font-semibold">{plan.matchedSetLabel}</span>
              {' · '}
              {plan.sampleCount} lần gần nhất:{' '}
              <span className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                {plan.recentSampleDurations.map((d) => `${d}p`).join(', ')}
              </span>
            </>
          ) : (
            <>
              <span className="text-[var(--mos-text)] font-semibold">{plan.matchedSetLabel}</span>
              {' · '}Dự đoán theo tốc độ cá nhân
            </>
          )}
        </p>
      </div>

      {/* Hàng 1: 4 options trên 1 hàng, hiển thị số phút + +/-X% */}
      <div data-testid="self-challenge-options-row" className="grid grid-cols-4 gap-2 pt-0.5">
        {plan.options.map((opt) => {
          const isSelected = selectedTier === opt.key;
          const isAvgTier = opt.key === 'AVG_RECENT';
          const isFastTier = opt.key === 'FASTER_5' || opt.key === 'FASTER_10';
          const percentText = opt.deltaPercent > 0 ? `+${opt.deltaPercent}%` : `${opt.deltaPercent}%`;
          return (
            <button
              key={opt.key}
              type="button"
              data-tier={opt.key}
              onClick={() => onSelectOption(opt, plan)}
              aria-pressed={isSelected}
              className={`rounded-xl px-1.5 py-2 transition-all active:scale-[0.98] cursor-pointer border flex flex-col items-center justify-center gap-0.5 tabular-nums ${
                isSelected
                  ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] border-[var(--mos-accent)] shadow-md ring-2 ring-[var(--mos-accent)]/40'
                  : isAvgTier
                    ? isDark
                      ? 'bg-[var(--mos-surface)] text-[var(--mos-text)] border-amber-500/60 hover:border-amber-400'
                      : 'bg-amber-50/90 text-amber-950 border-amber-400 hover:border-amber-500'
                    : isFastTier
                      ? isDark
                        ? 'bg-[var(--mos-surface)] text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                        : 'bg-emerald-50/80 text-emerald-700 border-emerald-300 hover:border-emerald-400'
                      : 'bg-[var(--mos-surface)] text-[var(--mos-text)] border-[var(--mos-surface-border)] hover:border-[var(--mos-surface-border-strong)]'
              }`}
            >
              <span className="text-[15.5px] font-black leading-none tabular-nums">{opt.minutes}p</span>
              <span
                className={`text-[10px] font-extrabold leading-none tabular-nums ${
                  isSelected
                    ? 'text-[var(--mos-accent-contrast)] opacity-80'
                    : isAvgTier
                      ? isDark
                        ? 'text-amber-300'
                        : 'text-amber-700'
                      : isFastTier
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-700'
                        : 'text-[var(--mos-text-muted)]'
                }`}
              >
                {percentText}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hàng 2 (hiện sau khi nhấn chọn 1 trong 4 options): Stepper +/- 5 phút căn giữa */}
      {selectedTier !== null && selectedDurationMin !== null && (
        <div
          data-testid="self-challenge-stepper-row"
          className="pt-1.5 flex flex-col items-center justify-center gap-1"
        >
          <div className="inline-flex items-center justify-center rounded-xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => onAdjustMinutes(-5)}
              disabled={selectedDurationMin <= 20}
              aria-label="Giảm 5 phút"
              title="Giảm 5 phút"
              className="px-3 py-1.5 text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] disabled:opacity-35 disabled:cursor-not-allowed transition-colors active:scale-95 text-[11.5px] font-extrabold cursor-pointer flex items-center gap-1"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>5p</span>
            </button>
            <div className="px-4 py-1.5 flex items-center justify-center gap-1.5 border-x border-[var(--mos-surface-border)] min-w-[92px]">
              <span className="text-[13px] font-black text-[var(--mos-accent)] tabular-nums">
                {selectedDurationMin} phút
              </span>
              {fineTuneDelta !== 0 && (
                <span className="text-[10px] font-bold text-[var(--mos-text-muted)] tabular-nums">
                  ({fineTuneDelta > 0 ? `+${fineTuneDelta}` : fineTuneDelta}p)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onAdjustMinutes(5)}
              disabled={selectedDurationMin >= 180}
              aria-label="Tăng 5 phút"
              title="Tăng 5 phút"
              className="px-3 py-1.5 text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] disabled:opacity-35 disabled:cursor-not-allowed transition-colors active:scale-95 text-[11.5px] font-extrabold cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>5p</span>
            </button>
          </div>
          <span className="text-[10px] text-[var(--mos-text-muted)] font-medium text-center">
            Tinh chỉnh ±5 phút quanh mốc đã chọn
          </span>
        </div>
      )}

      {/* Hàng 3 (bắt buộc khi chọn chậm hơn mức TB cá nhân): Lý do thực tế */}
      {requiresSlowerReason && (
        <div
          data-testid="self-challenge-slower-reason-section"
          className={`pt-2 border-t space-y-1.5 ${
            showReasonRequiredWarning && !reasonCheck.valid
              ? 'border-rose-500/40'
              : 'border-[var(--mos-surface-border)]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[10.5px] font-extrabold flex items-center gap-1 ${
                isDark ? 'text-amber-300' : 'text-amber-700'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Lý do cần thêm thời gian · Bắt buộc</span>
            </span>
          </div>
          <p className="text-[10px] text-[var(--mos-text-muted)] leading-snug">
            Chia sẻ khó khăn thực tế để hệ thống hỗ trợ bạn tốt hơn (so với TB{' '}
            <span className="text-[var(--mos-text)] font-bold tabular-nums">{plan.baselineMinutes}p</span>).
          </p>
          <textarea
            ref={slowerReasonInputRef}
            value={slowerReason || ''}
            onChange={(e) => onChangeSlowerReason?.(e.target.value)}
            rows={2}
            maxLength={300}
            aria-label="Lý do chọn chậm hơn trung bình"
            placeholder="VD: Mi cũ tiệm ngoài keo dày cần vệ sinh kỹ, mắt khách nhạy cảm dễ chảy nước mắt..."
            className={`w-full rounded-xl px-2.5 py-2 text-[11.5px] bg-[var(--mos-surface)] text-[var(--mos-text)] placeholder:text-[var(--mos-text-muted)] border outline-none transition-colors resize-none ${
              reasonCheck.valid
                ? 'border-emerald-500/50 focus:border-emerald-400'
                : showReasonRequiredWarning
                  ? 'border-rose-500/80 focus:border-rose-400'
                  : 'border-[var(--mos-surface-border)] focus:border-[var(--mos-accent)]'
            }`}
          />
          {reasonCheck.valid ? (
            <div
              className={`text-[10px] font-bold flex items-center gap-1 ${
                isDark ? 'text-emerald-400' : 'text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>Đã ghi nhận lý do hợp lý</span>
            </div>
          ) : (slowerReason && slowerReason.trim().length > 0) || showReasonRequiredWarning ? (
            <div className={`text-[10px] font-bold leading-snug ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
              {reasonCheck.error}
            </div>
          ) : (
            <div className="text-[10px] text-[var(--mos-text-muted)]">Điền cụ thể tối thiểu 3 từ rõ nghĩa</div>
          )}
        </div>
      )}

      {/* Footer: Estimated Finish Time Banner */}
      <div className="pt-1.5 flex items-center justify-between text-[11px] border-t border-[var(--mos-surface-border)]">
        <span className="text-[var(--mos-text-muted)]">Dự kiến xong lúc:</span>
        <span className="font-extrabold tabular-nums">
          {selectedDurationMin ? (
            <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{estimatedFinishTime} (Cam kết)</span>
          ) : (
            <span className="text-[var(--mos-text-muted)] font-semibold">—</span>
          )}
        </span>
      </div>
    </div>
  );
}
