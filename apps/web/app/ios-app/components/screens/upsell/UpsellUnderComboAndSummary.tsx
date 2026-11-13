'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  MatchedComboPackageOption,
  calculateComboRedemptionAccounting,
  type ComboPurchaseExpiryResult,
} from '@mos-lab/shared';
import { BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';
import { FeatherSvg } from '../../ui-kit/CvFeatherLabels';
import { WingsUnifiedComboCard, type ComboExpiryPreviewItem } from '../../ui-kit/WingsUnifiedComboCard';

type RedemptionAccountingResult = ReturnType<typeof calculateComboRedemptionAccounting>;
type SerumTierItem = (typeof SERUM_TIERS_CVL)[number];

export interface UpsellUnderComboAndSummaryProps {
  isDark: boolean;
  booking?: BookingItem;
  customerName: string;
  isExistingComboLive: boolean;
  showNewComboSection: boolean;
  underLashPackages: MatchedComboPackageOption[];
  selectedUnderComboId: string;
  onSetSelectedUnderComboId: React.Dispatch<React.SetStateAction<string>>;
  selectedUnderComboPkg: MatchedComboPackageOption | null;
  selectedNewComboPkg: MatchedComboPackageOption | null;
  deductTodayIntoCombo: boolean;
  underExpiryPreviewMap?: Record<string, ComboExpiryPreviewItem>;
  selectedUpperExpiry?: ComboPurchaseExpiryResult | null;
  selectedUnderExpiry?: ComboPurchaseExpiryResult | null;
  servicePrice: number;
  effectiveServiceChargeToday: number;
  redemptionAccounting: RedemptionAccountingResult | null;
  newComboTotal: number;
  underComboTotal: number;
  totalComboPrice: number;
  totalComboBonus: number;
  hasBothCombos: boolean;
  upperComboStandaloneBonus: number;
  underComboStandaloneBonus: number;
  yeppeumCount: number;
  selectedSerumTier: SerumTierItem;
  serumTotal: number;
  serumBonus: number;
  subtotal: number;
  showStaffRewards: boolean;
  onOpenLockedWelcomeModal: () => void;
  onConfirmCheckout: () => void;
}

export function UpsellUnderComboAndSummary({
  isDark,
  booking,
  customerName,
  isExistingComboLive,
  showNewComboSection,
  underLashPackages,
  selectedUnderComboId,
  onSetSelectedUnderComboId,
  selectedUnderComboPkg,
  selectedNewComboPkg,
  deductTodayIntoCombo,
  underExpiryPreviewMap,
  selectedUpperExpiry,
  selectedUnderExpiry,
  servicePrice,
  effectiveServiceChargeToday,
  redemptionAccounting,
  newComboTotal,
  underComboTotal,
  totalComboPrice,
  totalComboBonus,
  hasBothCombos,
  upperComboStandaloneBonus,
  underComboStandaloneBonus,
  yeppeumCount,
  selectedSerumTier,
  serumTotal,
  serumBonus,
  subtotal,
  showStaffRewards,
  onOpenLockedWelcomeModal,
  onConfirmCheckout,
}: UpsellUnderComboAndSummaryProps) {
  return (
    <>
      {/* Section 2B: MUA THÊM GÓI COMBO MI DƯỚI */}
      {(!isExistingComboLive || showNewComboSection) && (
        <div>
          <div
            className={`text-[11px] font-extrabold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between`}
          >
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB400]" />
              <span>2B. MUA THÊM GÓI ❖ MI DƯỚI (MUA CÙNG LÚC)</span>
            </span>
          </div>

          <div
            className={`${isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-neutral-200'} rounded-2xl p-3 shadow-sm border space-y-2.5`}
          >
            {/* Không lấy combo mi dưới pill */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSetSelectedUnderComboId('NONE')}
                className={`py-1.5 px-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  selectedUnderComboId === 'NONE'
                    ? isDark
                      ? 'bg-[#1C1C1E] text-white border-neutral-700 shadow-xs'
                      : 'bg-neutral-800 text-white border-neutral-800 shadow-xs'
                    : isDark
                      ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      : 'bg-[#F9F9FB] border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                Không lấy Mi Dưới
              </button>
              {selectedUnderComboPkg && (
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  Đã chọn gói mi dưới
                </span>
              )}
            </div>

            {/* Unified Combo Card cho Mi Dưới */}
            {underLashPackages.length > 0 && (
              <WingsUnifiedComboCard
                packages={underLashPackages}
                customerName={customerName}
                customerPhone={booking?.customerPhone}
                customerAvatar={booking?.customerAvatar}
                selectedPackageId={selectedUnderComboId !== 'NONE' ? selectedUnderComboId : null}
                dimmed={selectedUnderComboId === 'NONE'}
                showStaffRewards={showStaffRewards}
                expiryPreviewByPkgId={underExpiryPreviewMap}
                onSelectPackage={(pkg) => {
                  onSetSelectedUnderComboId((prev) => (prev === pkg.id ? 'NONE' : pkg.id));
                }}
                onSelectLocked={onOpenLockedWelcomeModal}
              />
            )}

            {/* Combined 2-Combo Bonus Tier Banner (Khi khách chọn cả 2 gói) */}
            {hasBothCombos && showStaffRewards && (
              <div
                className={`mt-2 p-2.5 rounded-xl border ${
                  isDark
                    ? 'bg-gradient-to-r from-amber-950/40 via-emerald-950/40 to-purple-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-gradient-to-r from-amber-50 via-emerald-50 to-purple-50 border-emerald-300 text-emerald-900'
                } flex items-center justify-between shadow-2xs`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[12px] font-black flex items-center gap-1.5 flex-wrap">
                      <span>Thưởng Combo (Gom 2 gói · {totalComboPrice.toLocaleString('vi-VN')}đ):</span>
                    </div>
                    <p className={`text-[10.5px] ${isDark ? 'text-neutral-300' : 'text-neutral-600'} mt-0.5`}>
                      Gom doanh số đạt bậc {Math.floor(totalComboPrice / 1000000)}M (Thưởng vượt trội thay vì tính lẻ)
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pl-2">
                  <span
                    className={`inline-flex items-center gap-0.5 font-black text-[12.5px] px-2.5 py-1 rounded-lg border tabular-nums ${
                      isDark
                        ? 'bg-emerald-900/60 border-emerald-500/50 text-emerald-300'
                        : 'bg-white border-emerald-300 text-emerald-800'
                    }`}
                  >
                    +{Math.round(totalComboBonus / 1000)}
                    <FeatherSvg className="w-3 h-3 text-amber-500" />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 3: Summary card */}
      <div
        className={`${isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-neutral-100'} rounded-2xl p-3.5 shadow-sm border space-y-2`}
      >
        {/* Row 1: Dịch vụ hôm nay */}
        <div className="flex items-center justify-between text-[12.5px]">
          <span className={`${isDark ? 'text-neutral-400' : 'text-gray-500'} font-medium`}>Dịch vụ hôm nay:</span>
          {isExistingComboLive && redemptionAccounting ? (
            <span className={`${isDark ? 'text-sky-400' : 'text-sky-700'} font-bold tabular-nums`}>
              {effectiveServiceChargeToday > 0
                ? `+${effectiveServiceChargeToday.toLocaleString('vi-VN')}đ (Phụ thu)`
                : '0đ (Trừ gói)'}
            </span>
          ) : effectiveServiceChargeToday === 0 && (selectedNewComboPkg || selectedUnderComboPkg) ? (
            <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold tabular-nums`}>
              0đ{' '}
              <span className={`text-[11px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                (Trừ vào gói)
              </span>
            </span>
          ) : effectiveServiceChargeToday < servicePrice ? (
            <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold tabular-nums`}>
              {effectiveServiceChargeToday.toLocaleString('vi-VN')}đ{' '}
              <span className={`text-[11px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                (Đã trừ gói 1 phần)
              </span>
            </span>
          ) : selectedNewComboPkg && !deductTodayIntoCombo ? (
            <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold tabular-nums`}>
              {effectiveServiceChargeToday.toLocaleString('vi-VN')}đ{' '}
              <span className="text-[11px] font-semibold text-indigo-400">(Trả lẻ)</span>
            </span>
          ) : (
            <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold tabular-nums`}>
              {effectiveServiceChargeToday.toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>

        {/* Row 2: Gói Combo đã chọn */}
        {selectedNewComboPkg && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className={`${isDark ? 'text-neutral-300' : 'text-gray-700'} font-medium`}>
                Gói {selectedNewComboPkg.shortRuleLabel || selectedNewComboPkg.ruleName}:
              </span>
              <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold tabular-nums`}>
                {newComboTotal.toLocaleString('vi-VN')}đ
              </span>
            </div>
            {selectedUpperExpiry && (
              <div className={`text-[10.5px] font-bold tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                HSD: {selectedUpperExpiry.dateExpiredDisplay}
                {selectedUpperExpiry.revivedExpiredSessions > 0 &&
                  ` · Cứu ${selectedUpperExpiry.revivedExpiredSessions} buổi cũ`}
              </div>
            )}
          </div>
        )}

        {/* Row 2B: Gói Mi Dưới nếu có */}
        {selectedUnderComboPkg && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className={`${isDark ? 'text-neutral-300' : 'text-gray-700'} font-medium`}>
                Gói Mi Dưới ({selectedUnderComboPkg.shortRuleLabel || selectedUnderComboPkg.ruleName}):
              </span>
              <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold tabular-nums`}>
                {underComboTotal.toLocaleString('vi-VN')}đ
              </span>
            </div>
            {selectedUnderExpiry && (
              <div className={`text-[10.5px] font-bold tabular-nums ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>
                HSD Mi Dưới: {selectedUnderExpiry.dateExpiredDisplay}
              </div>
            )}
          </div>
        )}

        {/* Row 2C: Dưỡng mi nếu có */}
        {yeppeumCount > 0 && (
          <div className="flex items-center justify-between text-[12.5px]">
            <span className={`${isDark ? 'text-neutral-300' : 'text-gray-700'} font-medium`}>
              Dưỡng mi Yeppeum{yeppeumCount > 1 ? ` (x${yeppeumCount})` : ''}:
            </span>
            {selectedSerumTier.id === 'serum-free' ? (
              <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold tabular-nums`}>
                0đ{' '}
                <span className={`text-[11px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  (Tặng kèm)
                </span>
              </span>
            ) : (
              <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold tabular-nums`}>
                {serumTotal.toLocaleString('vi-VN')}đ
              </span>
            )}
          </div>
        )}

        {/* Row 3: Tổng tạm tính */}
        <div
          className={`pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'} flex items-center justify-between`}
        >
          <span className={`text-[14px] font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Tổng thanh toán:
          </span>
          <span className="text-[18px] font-black text-[#FF9500] tabular-nums">
            {subtotal.toLocaleString('vi-VN')}đ
          </span>
        </div>

        {/* Row 4: Thưởng chốt đơn (Ẩn theo mặc định, chỉ hiện khi CV bật toggle từ Header) */}
        {showStaffRewards && (
          <div
            className={`mt-1.5 rounded-xl border ${isDark ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'} p-2.5 space-y-1.5 text-[12px]`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`${isDark ? 'text-emerald-300' : 'text-emerald-800'} font-bold flex items-center gap-1.5`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Thưởng chốt đơn:
              </span>
              <span
                className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-black tabular-nums text-[13px] inline-flex items-center gap-0.5`}
              >
                +{Math.round((totalComboBonus + serumBonus) / 1000)}
                <FeatherSvg className="w-3 h-3 text-amber-500" />
              </span>
            </div>

            {/* Chi tiết từng phần thưởng khi mở toggle */}
            {(totalComboBonus > 0 || serumBonus > 0) && (
              <div
                className={`pt-1 border-t ${isDark ? 'border-emerald-800/40 text-neutral-300' : 'border-emerald-200 text-emerald-900'} space-y-0.5 text-[11px] font-medium`}
              >
                {hasBothCombos ? (
                  <div className="flex justify-between items-center">
                    <span>• Thưởng chốt Combo (Gom 2 gói · {totalComboPrice.toLocaleString('vi-VN')}đ):</span>
                    <span className="font-bold tabular-nums text-amber-400 inline-flex items-center gap-0.5">
                      +{Math.round(totalComboBonus / 1000)}
                      <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                    </span>
                  </div>
                ) : (
                  <>
                    {upperComboStandaloneBonus > 0 && (
                      <div className="flex justify-between items-center">
                        <span>• Gói Combo mi trên:</span>
                        <span className="font-bold tabular-nums text-amber-400 inline-flex items-center gap-0.5">
                          +{Math.round(upperComboStandaloneBonus / 1000)}
                          <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                        </span>
                      </div>
                    )}
                    {underComboStandaloneBonus > 0 && (
                      <div className="flex justify-between items-center">
                        <span>• Gói Combo mi dưới:</span>
                        <span className="font-bold tabular-nums text-amber-400 inline-flex items-center gap-0.5">
                          +{Math.round(underComboStandaloneBonus / 1000)}
                          <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                        </span>
                      </div>
                    )}
                  </>
                )}
                {serumBonus > 0 && (
                  <div className="flex justify-between items-center">
                    <span>• Dưỡng mi Yeppeum:</span>
                    <span className="font-bold tabular-nums text-amber-400 inline-flex items-center gap-0.5">
                      +{Math.round(serumBonus / 1000)}
                      <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-1">
        <button
          onClick={onConfirmCheckout}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-black text-[15px] shadow-md active:scale-98 transition-transform text-center tracking-wide"
        >
          CHỐT ĐƠN & THANH TOÁN
        </button>
      </div>
    </>
  );
}
