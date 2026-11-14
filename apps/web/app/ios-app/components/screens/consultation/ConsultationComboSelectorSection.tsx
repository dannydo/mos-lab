'use client';

import React from 'react';
import { Sparkles, ChevronRight, Zap, AlertTriangle, CalendarClock } from 'lucide-react';
import {
  formatExpiryDateDdMmYyyy,
  type ComboPurchaseExpiryResult,
  type ComboTodayUsageMode,
  type MatchedComboPackageOption,
} from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';
import { FeatherSvg } from '../../ui-kit/CvFeatherLabels';
import { calculateCvComboTierBonus } from '../../../state/useIosBillingCheckout';

interface ConsultationComboSelectorSectionProps {
  isDark: boolean;
  isComboLive: boolean;
  hasUnderMinkCombo?: boolean;
  comboLiveStatus?: BookingItem['comboLiveStatus'];
  onOpenWalletModal?: () => void;
  upperTodayUsageMode?: ComboTodayUsageMode;
  setUpperTodayUsageMode?: (mode: ComboTodayUsageMode) => void;
  underTodayUsageMode?: ComboTodayUsageMode;
  setUnderTodayUsageMode?: (mode: ComboTodayUsageMode) => void;
  selectedUpperExpiry?: ComboPurchaseExpiryResult | null;
  selectedUnderExpiry?: ComboPurchaseExpiryResult | null;
  totalUpgradeAmount: number;
  comboPurchaseTotal: number;
  selectedNewComboPkg: MatchedComboPackageOption | null;
  setSelectedNewComboPkg: (pkg: MatchedComboPackageOption | null) => void;
  selectedUnderComboPkg: MatchedComboPackageOption | null;
  setSelectedUnderComboPkg: (pkg: MatchedComboPackageOption | null) => void;
  showStaffRewards: boolean;
  setShowStaffRewards: (show: boolean) => void;
  handleOpenComboModal: (target: 'upper' | 'under') => void;
  handleSubmit: () => void;
}

export function ConsultationComboSelectorSection({
  isDark,
  isComboLive,
  hasUnderMinkCombo = false,
  comboLiveStatus,
  onOpenWalletModal,
  upperTodayUsageMode = 'USE_NEW_COMBO',
  setUpperTodayUsageMode,
  underTodayUsageMode = 'USE_NEW_COMBO',
  setUnderTodayUsageMode,
  selectedUpperExpiry,
  selectedUnderExpiry,
  totalUpgradeAmount,
  comboPurchaseTotal,
  selectedNewComboPkg,
  setSelectedNewComboPkg,
  selectedUnderComboPkg,
  setSelectedUnderComboPkg,
  showStaffRewards,
  setShowStaffRewards,
  handleOpenComboModal,
  handleSubmit,
}: ConsultationComboSelectorSectionProps) {
  const isOldUpperExpired = Boolean(comboLiveStatus?.isExpired && (comboLiveStatus?.remainingSessions || 0) > 0);
  const expiredDateLabel = formatExpiryDateDdMmYyyy(comboLiveStatus?.dateExpired);

  return (
    <>
      {/* CẢNH BÁO GÓI CŨ HẾT HẠN & CỨU BUỔI KHI MUA NỐI TIẾP */}
      {isOldUpperExpired && (
        <div
          className={`rounded-2xl p-3 border-2 space-y-2 transition-colors ${
            isDark ? 'bg-rose-950/35 border-rose-600/80 text-rose-100' : 'bg-rose-50/90 border-rose-400 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center justify-center gap-1 leading-none py-1 px-2.5 rounded-full bg-rose-600 text-white text-[10.5px] font-black uppercase tracking-wide tabular-nums">
              <AlertTriangle className="w-3 h-3 shrink-0 stroke-[2.5]" />
              <span>HẾT HẠN {expiredDateLabel}</span>
            </span>
            {onOpenWalletModal && (
              <button
                type="button"
                onClick={onOpenWalletModal}
                className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-neutral-900 border-rose-500/50 text-rose-200 hover:bg-neutral-800'
                    : 'bg-white border-rose-300 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Chi tiết Combo
              </button>
            )}
          </div>
          <div
            className={`text-[11.5px] font-semibold leading-snug tabular-nums ${isDark ? 'text-rose-200/95' : 'text-rose-900'}`}
          >
            Đang khóa trừ 0đ (<strong>{comboLiveStatus?.remainingSessions}</strong> buổi tồn: ✦
            {comboLiveStatus?.normalRemaining ?? 0} · ↻{comboLiveStatus?.retainRemaining ?? 0}). Mua gói mới hôm nay sẽ{' '}
            <strong>cứu toàn bộ buổi tồn</strong> (+1T/Mới · +25N/Dặm).
          </div>
        </div>
      )}

      {/* NÚT MUA THÊM GÓI COMBO — iOS Inset Grouped Cell */}
      {!selectedNewComboPkg && !selectedUnderComboPkg && (
        <div className={`pt-2 border-t border-[var(--mos-surface-border)]`}>
          <button
            type="button"
            onClick={() => handleOpenComboModal('upper')}
            className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer active:scale-98 shadow-2xs group ${
              isDark
                ? 'bg-[#18181A] border-neutral-800 hover:border-amber-400/50'
                : 'bg-white border-neutral-200/90 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-amber-950/60 border-amber-800/80' : 'bg-amber-50 border-amber-200/80'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className={`text-[13px] font-black ${isDark ? 'text-white' : 'text-neutral-800'}`}>+ Combo</span>
            </div>
            <div
              className={`flex items-center gap-1 text-[12px] font-bold transition-colors ${
                isDark ? 'text-neutral-400 group-hover:text-amber-300' : 'text-neutral-400 group-hover:text-amber-700'
              }`}
            >
              <span>Chọn gói</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* KHỐI COMBO ĐÃ CHỌN — iOS Inset Grouped Card */}
      {(selectedNewComboPkg || selectedUnderComboPkg) && (
        <div
          className={`rounded-2xl shadow-2xs overflow-hidden border ${
            isDark ? 'bg-[#18181A] border-neutral-800' : 'bg-white border-neutral-200/90'
          }`}
        >
          {/* Card Header */}
          <div
            className={`px-3.5 py-2.5 border-b flex items-center justify-between ${
              isDark ? 'bg-[#141416] border-neutral-800' : 'bg-neutral-50/80 border-neutral-150'
            }`}
          >
            <span className="text-[10.5px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Combo Đã Chọn</span>
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-full tabular-nums border ${
                  isDark
                    ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}
              >
                +{comboPurchaseTotal.toLocaleString('vi-VN')}đ
              </span>
              <button
                type="button"
                onClick={() => handleOpenComboModal('upper')}
                className={`text-[11px] font-bold flex items-center gap-0.5 cursor-pointer active:opacity-75 transition-opacity ${
                  isDark ? 'text-[#FFB400] hover:text-amber-300' : 'text-amber-600 hover:text-amber-800'
                }`}
              >
                <span>Đổi</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Items List */}
          <div className={`divide-y text-[12px] ${isDark ? 'divide-neutral-800' : 'divide-neutral-100'}`}>
            {selectedNewComboPkg && (
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-extrabold text-[13px] tracking-tight truncate ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    Combo {selectedNewComboPkg.ruleName}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 font-variant-numeric tabular-nums">
                    <span className={`font-black text-[13px] text-[var(--mos-text)]`}>
                      {selectedNewComboPkg.comboPrice.toLocaleString('vi-VN')}đ
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedNewComboPkg(null)}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-neutral-800 hover:bg-rose-950 text-neutral-400 hover:text-rose-400'
                          : 'bg-neutral-100 hover:bg-rose-100 text-neutral-400 hover:text-rose-600'
                      }`}
                      title="Bỏ chọn gói Mi Trên"
                      aria-label="Xóa gói Mi Trên"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className={`text-[12px] font-bold truncate ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  {selectedNewComboPkg.categoryName}{' '}
                  {selectedNewComboPkg.volume !== 'under' ? selectedNewComboPkg.volume : 'Mi Dưới 390'}
                </div>

                <div
                  className={`text-[10.5px] font-semibold tabular-nums ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}
                >
                  ✦ {selectedNewComboPkg.comboNewCount + selectedNewComboPkg.bonusNewCount} Mới · ↻{' '}
                  {selectedNewComboPkg.comboRefillCount + selectedNewComboPkg.bonusRefillCount} Dặm (
                  {selectedNewComboPkg.totalSessions} buổi)
                </div>

                {setUpperTodayUsageMode && (
                  <div className="pt-1.5 space-y-1.5">
                    <div
                      className={`grid ${isComboLive ? 'grid-cols-3' : 'grid-cols-2'} gap-1 p-1 rounded-xl border ${
                        isDark ? 'bg-[#121214] border-neutral-800' : 'bg-neutral-100/80 border-neutral-200/80'
                      }`}
                    >
                      {isComboLive ? (
                        <>
                          {(
                            [
                              { mode: 'USE_OLD_COMBO' as const, label: 'Trừ gói cũ (+1T)' },
                              { mode: 'USE_NEW_COMBO' as const, label: 'Trừ gói mới' },
                              { mode: 'RETAIL_OR_VOUCHER' as const, label: 'Đi lẻ (+1T+21N)' },
                            ] as const
                          ).map((opt) => {
                            const active = upperTodayUsageMode === opt.mode;
                            return (
                              <button
                                key={opt.mode}
                                type="button"
                                onClick={() => setUpperTodayUsageMode(opt.mode)}
                                className={`py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold leading-tight text-center transition-all cursor-pointer tabular-nums ${
                                  active
                                    ? 'bg-[#FFB400] text-black shadow-2xs'
                                    : isDark
                                      ? 'text-neutral-400 hover:text-neutral-200'
                                      : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          {(
                            [
                              { mode: 'USE_NEW_COMBO' as const, label: 'Trừ vào gói (0đ)' },
                              { mode: 'RETAIL_OR_VOUCHER' as const, label: 'Đi lẻ / Voucher (+21N)' },
                            ] as const
                          ).map((opt) => {
                            const active = upperTodayUsageMode === opt.mode;
                            return (
                              <button
                                key={opt.mode}
                                type="button"
                                onClick={() => setUpperTodayUsageMode(opt.mode)}
                                className={`py-1.5 px-2 rounded-lg text-[10.5px] font-extrabold leading-tight text-center transition-all cursor-pointer tabular-nums ${
                                  active
                                    ? 'bg-[#FFB400] text-black shadow-2xs'
                                    : isDark
                                      ? 'text-neutral-400 hover:text-neutral-200'
                                      : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>

                    {selectedUpperExpiry && (
                      <div
                        className={`rounded-xl px-2.5 py-2 border text-[11px] space-y-0.5 tabular-nums ${
                          selectedUpperExpiry.revivedExpiredSessions > 0
                            ? isDark
                              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : isDark
                              ? 'bg-neutral-900/90 border-neutral-800 text-neutral-200'
                              : 'bg-amber-50/60 border-amber-200/80 text-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 font-extrabold">
                            <CalendarClock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>HSD mới: {selectedUpperExpiry.dateExpiredDisplay}</span>
                          </span>
                          <span className="text-[10px] font-black text-amber-500">
                            Combo Mi Trên: {selectedUpperExpiry.combinedTotalAfterToday} buổi
                          </span>
                        </div>
                        <div
                          className={`text-[10px] font-medium leading-snug ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}
                        >
                          {selectedUpperExpiry.formulaSummaryVi}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedUnderComboPkg && (
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-extrabold text-[13px] tracking-tight truncate ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    Combo {selectedUnderComboPkg.ruleName} · Mi Dưới
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 font-variant-numeric tabular-nums">
                    <span className={`font-black text-[13px] text-[var(--mos-text)]`}>
                      {selectedUnderComboPkg.comboPrice.toLocaleString('vi-VN')}đ
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedUnderComboPkg(null)}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-neutral-800 hover:bg-rose-950 text-neutral-400 hover:text-rose-400'
                          : 'bg-neutral-100 hover:bg-rose-100 text-neutral-400 hover:text-rose-600'
                      }`}
                      title="Bỏ chọn gói Mi Dưới"
                      aria-label="Xóa gói Mi Dưới"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className={`text-[12px] font-bold truncate ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  {selectedUnderComboPkg.categoryName} · Mi Dưới 390
                </div>

                <div
                  className={`text-[10.5px] font-semibold tabular-nums ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}
                >
                  ✦ {selectedUnderComboPkg.comboNewCount + selectedUnderComboPkg.bonusNewCount} Mới · ↻{' '}
                  {selectedUnderComboPkg.comboRefillCount + selectedUnderComboPkg.bonusRefillCount} Dặm (
                  {selectedUnderComboPkg.totalSessions} buổi)
                </div>

                {setUnderTodayUsageMode && (
                  <div className="pt-1.5 space-y-1.5">
                    <div
                      className={`grid ${hasUnderMinkCombo ? 'grid-cols-3' : 'grid-cols-2'} gap-1 p-1 rounded-xl border ${
                        isDark ? 'bg-[#121214] border-neutral-800' : 'bg-neutral-100/80 border-neutral-200/80'
                      }`}
                    >
                      {(hasUnderMinkCombo
                        ? [
                            { mode: 'USE_OLD_COMBO' as const, label: 'Trừ gói cũ (+1T)' },
                            { mode: 'USE_NEW_COMBO' as const, label: 'Trừ gói mới' },
                            { mode: 'RETAIL_OR_VOUCHER' as const, label: 'Đi lẻ (+1T+21N)' },
                          ]
                        : [
                            { mode: 'USE_NEW_COMBO' as const, label: 'Trừ vào gói (0đ)' },
                            { mode: 'RETAIL_OR_VOUCHER' as const, label: 'Đi lẻ / Voucher (+21N)' },
                          ]
                      ).map((opt) => {
                        const active = underTodayUsageMode === opt.mode;
                        return (
                          <button
                            key={opt.mode}
                            type="button"
                            onClick={() => setUnderTodayUsageMode(opt.mode)}
                            className={`py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold leading-tight text-center transition-all cursor-pointer tabular-nums ${
                              active
                                ? 'bg-purple-500 text-white shadow-2xs'
                                : isDark
                                  ? 'text-neutral-400 hover:text-neutral-200'
                                  : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {selectedUnderExpiry && (
                      <div
                        className={`rounded-xl px-2.5 py-1.5 border text-[10.5px] space-y-0.5 tabular-nums ${
                          isDark
                            ? 'bg-neutral-900/90 border-neutral-800 text-neutral-200'
                            : 'bg-purple-50/60 border-purple-200/80 text-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 font-extrabold">
                          <span>HSD Mi Dưới: {selectedUnderExpiry.dateExpiredDisplay}</span>
                          <span className="text-[10px] text-purple-400">
                            Combo Mi Dưới: {selectedUnderExpiry.combinedTotalAfterToday} buổi
                          </span>
                        </div>
                        <div
                          className={`text-[10px] font-medium leading-snug ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}
                        >
                          {selectedUnderExpiry.formulaSummaryVi}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Row: Thưởng Chuyên Viên (Chỉ hiển thị khi bật Con mắt trên Header) */}
            {showStaffRewards &&
              calculateCvComboTierBonus(
                (selectedNewComboPkg?.comboPrice || 0) + (selectedUnderComboPkg?.comboPrice || 0)
              ) > 0 && (
                <div
                  className={`px-3 py-2 flex items-center justify-between text-[11px] ${
                    isDark ? 'bg-[#141416] text-neutral-400' : 'bg-neutral-50/50 text-neutral-500'
                  }`}
                >
                  <span className="font-medium">Thưởng chuyên viên:</span>
                  <span
                    className={`inline-flex items-center gap-0.5 font-black px-2 py-0.5 rounded-full tabular-nums border ${
                      isDark
                        ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    +
                    {Math.round(
                      calculateCvComboTierBonus(
                        (selectedNewComboPkg?.comboPrice || 0) + (selectedUnderComboPkg?.comboPrice || 0)
                      ) / 1000
                    )}
                    <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                  </span>
                </div>
              )}
          </div>
        </div>
      )}

      {isComboLive && (
        <button
          type="button"
          onClick={handleSubmit}
          className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-[12px] flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer ${
            totalUpgradeAmount > 0 || comboPurchaseTotal > 0
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {comboPurchaseTotal > 0 ? (
            <>
              <Sparkles className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Nhận Ca & Mua Combo (+{(totalUpgradeAmount + comboPurchaseTotal).toLocaleString('vi-VN')} đ)</span>
            </>
          ) : totalUpgradeAmount > 0 ? (
            <>
              <Sparkles className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Nhận Ca & Nâng Cấp (+{totalUpgradeAmount.toLocaleString('vi-VN')} đ)</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Nhận Ca (Trừ 1 suất combo · 0đ)</span>
            </>
          )}
        </button>
      )}

      {!isComboLive && comboPurchaseTotal > 0 && (
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-2.5 px-3 rounded-xl font-extrabold text-[12px] flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black shadow-amber-900/30"
        >
          <Sparkles className="w-3.5 h-3.5 fill-current shrink-0" />
          <span>Nhận Ca & Mua Combo (+{comboPurchaseTotal.toLocaleString('vi-VN')} đ)</span>
        </button>
      )}
    </>
  );
}
