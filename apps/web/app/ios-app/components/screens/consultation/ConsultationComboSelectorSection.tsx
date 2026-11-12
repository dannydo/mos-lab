'use client';

import React from 'react';
import { Sparkles, ChevronRight, Eye, EyeOff, Zap } from 'lucide-react';
import type { MatchedComboPackageOption } from '@mos-lab/shared';
import { FeatherSvg } from '../../ui-kit/CvFeatherLabels';
import { calculateCvComboTierBonus } from '../../../state/useIosBillingCheckout';

interface ConsultationComboSelectorSectionProps {
  isDark: boolean;
  isComboLive: boolean;
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
  return (
    <>
      {/* NÚT MUA THÊM GÓI COMBO — iOS Inset Grouped Cell */}
      {!selectedNewComboPkg && !selectedUnderComboPkg && (
        <div className={`pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`}>
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
                    <span className={`font-black text-[13px] ${isDark ? 'text-white' : 'text-neutral-900'}`}>
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
                    <span className={`font-black text-[13px] ${isDark ? 'text-white' : 'text-neutral-900'}`}>
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
              </div>
            )}

            {/* Bottom Row: Thưởng Chuyên Viên */}
            {calculateCvComboTierBonus(
              (selectedNewComboPkg?.comboPrice || 0) + (selectedUnderComboPkg?.comboPrice || 0)
            ) > 0 &&
              (showStaffRewards ? (
                <div
                  className={`px-3 py-2 flex items-center justify-between text-[11px] ${
                    isDark ? 'bg-[#141416] text-neutral-400' : 'bg-neutral-50/50 text-neutral-500'
                  }`}
                >
                  <span className="font-medium">Thưởng chuyên viên:</span>
                  <div className="flex items-center gap-1.5">
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
                    <button
                      type="button"
                      onClick={() => setShowStaffRewards(false)}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-200 cursor-pointer"
                      title="Ẩn thưởng"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`px-3 py-1 flex items-center justify-end text-[10.5px] ${
                    isDark ? 'bg-[#141416]' : 'bg-neutral-50/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setShowStaffRewards(true)}
                    className={`inline-flex items-center gap-1 text-[10.5px] font-bold ${
                      isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-600'
                    } transition-colors cursor-pointer select-none`}
                  >
                    <Eye className="w-3 h-3 text-neutral-400" />
                    <span className="inline-flex items-center gap-1">
                      <span>Xem</span>
                      <FeatherSvg className="w-3 h-3 text-amber-500" />
                    </span>
                  </button>
                </div>
              ))}
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
