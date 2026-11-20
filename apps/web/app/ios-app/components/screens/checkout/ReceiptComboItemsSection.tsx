'use client';

import React from 'react';
import type { ComboTodayUsageMode, IosPromotionOption } from '@mos-lab/shared';
import { Plus, RefreshCw, Sparkles, X } from 'lucide-react';
import type { BookingItem } from '../../../state/mockData';
import type { CheckoutComboSelectionController } from '../../../state/useCheckoutComboSelection';
import { FeatherSvg } from '../../ui-kit/CvFeatherLabels';
import { ReceiptComboExpiryLine } from './ReceiptComboExpiryLine';

function cleanComboTitle(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\(\d+\s*lần\)/gi, '').trim();
}

export interface ReceiptComboItemsSectionProps {
  isDark: boolean;
  booking?: BookingItem;
  selectedCombo: BookingItem['selectedCombo'] | null;
  selectedUnderCombo: BookingItem['selectedUnderCombo'] | null;
  hasBothCombos: boolean;
  comboTotalRevenue: number;
  totalComboBonus: number;
  upperComboBonus?: number;
  underComboBonus?: number;
  isCheckoutStaffCc?: boolean;
  showStaffRewards: boolean;
  isSettled?: boolean;
  comboSelection?: CheckoutComboSelectionController;
  rememberedServicePromo?: IosPromotionOption | null;
}

export function ReceiptComboItemsSection({
  isDark,
  booking,
  selectedCombo,
  selectedUnderCombo,
  hasBothCombos,
  comboTotalRevenue,
  totalComboBonus,
  upperComboBonus = 0,
  underComboBonus = 0,
  isCheckoutStaffCc = false,
  showStaffRewards,
  isSettled = false,
  comboSelection,
  rememberedServicePromo,
}: ReceiptComboItemsSectionProps) {
  const canEditCombo = Boolean(!isSettled && comboSelection);
  const currentUpperMode: ComboTodayUsageMode =
    selectedCombo?.todayUsageMode ||
    comboSelection?.upperTodayUsageMode ||
    (selectedCombo?.todaySingleServiceWaived === false ? 'RETAIL_OR_VOUCHER' : 'USE_NEW_COMBO');
  const currentUnderMode: ComboTodayUsageMode =
    selectedUnderCombo?.todayUsageMode ||
    comboSelection?.underTodayUsageMode ||
    (selectedUnderCombo?.todaySingleServiceWaived ? 'USE_NEW_COMBO' : 'RETAIL_OR_VOUCHER');
  const isExistingUpperLive = Boolean(comboSelection?.isExistingUpperComboLive);
  const hasPromoContext = Boolean(rememberedServicePromo || booking?.servicePromotion || booking?.appliedPromotion);

  return (
    <>
      {!selectedCombo && !selectedUnderCombo && canEditCombo && comboSelection && (
        <div
          className={`px-3.5 py-2.5 flex items-center justify-between gap-2 ${
            isDark ? 'bg-amber-950/15' : 'bg-amber-50/40'
          }`}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                data-testid="checkout-add-combo-btn"
                onClick={comboSelection.openUpperComboModal}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11.5px] font-black transition-all cursor-pointer active:scale-95 ${
                  isDark
                    ? 'bg-amber-400/15 border-amber-400/40 text-amber-300 hover:bg-amber-400/25'
                    : 'bg-amber-400 border-amber-500/40 text-black hover:bg-amber-300 shadow-2xs'
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Chọn / Mua gói Combo</span>
              </button>
              <button
                type="button"
                data-testid="checkout-add-under-combo-btn"
                onClick={comboSelection.openUnderComboModal}
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${
                  isDark
                    ? 'bg-purple-950/40 border-purple-700/50 text-purple-300 hover:bg-purple-900/50'
                    : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
                }`}
              >
                <Plus className="w-3 h-3 shrink-0" />
                <span>Gói Mi Dưới</span>
              </button>
            </div>
            {hasPromoContext && (
              <p className={`text-[10.5px] font-semibold ${isDark ? 'text-amber-300/90' : 'text-amber-800'}`}>
                Gợi ý: Trả lẻ hưởng ưu đãi · Mua gói giữ trọn buổi (+21N HSD)
              </p>
            )}
          </div>
        </div>
      )}

      {selectedCombo && (
        <div
          data-testid="checkout-selected-upper-combo-row"
          className={`p-3.5 space-y-2 ${isDark ? 'bg-amber-950/20' : 'bg-amber-50/30'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] font-black text-[var(--mos-text)] tracking-tight">
                  {cleanComboTitle(selectedCombo.name)}
                </span>
                {canEditCombo && comboSelection && (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      data-testid="checkout-change-upper-combo-btn"
                      onClick={comboSelection.openUpperComboModal}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[10px] font-bold cursor-pointer active:scale-95 ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-amber-300 hover:bg-neutral-700'
                          : 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                      <span>Đổi gói</span>
                    </button>
                    <button
                      type="button"
                      data-testid="checkout-remove-upper-combo-btn"
                      aria-label="Xóa gói Combo Mi Trên"
                      onClick={comboSelection.handleRemoveUpperCombo}
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md border cursor-pointer active:scale-95 ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-rose-400'
                          : 'bg-white border-neutral-200 text-neutral-500 hover:text-rose-600'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--mos-text-muted)] font-medium">
                <span className="tabular-nums">
                  {selectedCombo.sessions || selectedCombo.remainingAfterToday?.totalRemaining || 10} buổi
                </span>
                {showStaffRewards &&
                  !isCheckoutStaffCc &&
                  !hasBothCombos &&
                  (upperComboBonus || totalComboBonus) > 0 && (
                    <>
                      <span className={isDark ? 'text-neutral-600' : 'text-neutral-300'}>•</span>
                      <span
                        className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold inline-flex items-center gap-0.5 tabular-nums`}
                      >
                        Thưởng gói: +{Math.round((upperComboBonus || totalComboBonus) / 1000)}
                        <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                      </span>
                    </>
                  )}
              </div>
              <ReceiptComboExpiryLine
                dateExpired={selectedCombo.dateExpired}
                dateExpiredDisplay={selectedCombo.dateExpiredDisplay}
                expiryFormulaSummary={selectedCombo.expiryFormulaSummary}
                revivedExpiredSessions={selectedCombo.revivedExpiredSessions}
                isDark={isDark}
                variant="combo"
                showFormula
              />
            </div>
            <span className="text-[13px] text-[var(--mos-text)] font-black tabular-nums whitespace-nowrap shrink-0">
              {selectedCombo.price.toLocaleString('vi-VN')}đ
            </span>
          </div>

          {canEditCombo && comboSelection && (
            <div className="space-y-1.5 pt-0.5">
              <div
                data-testid="checkout-upper-combo-usage-mode"
                className={`p-1 rounded-xl grid ${isExistingUpperLive ? 'grid-cols-3' : 'grid-cols-2'} gap-1 border ${
                  isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-amber-200/80'
                }`}
              >
                {isExistingUpperLive && (
                  <button
                    type="button"
                    data-testid="checkout-combo-mode-use-old"
                    onClick={() => comboSelection.handleChangeUpperUsageMode('USE_OLD_COMBO')}
                    className={`py-1.5 px-2 rounded-lg text-[10.5px] font-extrabold leading-tight text-center transition-all cursor-pointer tabular-nums ${
                      currentUpperMode === 'USE_OLD_COMBO'
                        ? 'bg-[#FFB400] text-black shadow-2xs'
                        : isDark
                          ? 'text-neutral-400 hover:text-neutral-200'
                          : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Trừ gói cũ (0đ)
                  </button>
                )}
                <button
                  type="button"
                  data-testid="checkout-combo-mode-retail"
                  onClick={() => comboSelection.handleChangeUpperUsageMode('RETAIL_OR_VOUCHER')}
                  className={`py-1.5 px-2 rounded-lg text-[10.5px] font-extrabold leading-tight text-center transition-all cursor-pointer tabular-nums ${
                    currentUpperMode === 'RETAIL_OR_VOUCHER'
                      ? isDark
                        ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/50 shadow-2xs'
                        : 'bg-indigo-600 text-white shadow-2xs'
                      : isDark
                        ? 'text-neutral-400 hover:text-neutral-200'
                        : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {rememberedServicePromo ? 'Trả lẻ hưởng ưu đãi (+21N)' : 'Trả lẻ ca này (+21N)'}
                </button>
                <button
                  type="button"
                  data-testid="checkout-combo-mode-use-new"
                  onClick={() => comboSelection.handleChangeUpperUsageMode('USE_NEW_COMBO')}
                  className={`py-1.5 px-2 rounded-lg text-[10.5px] font-extrabold leading-tight text-center transition-all cursor-pointer tabular-nums ${
                    currentUpperMode === 'USE_NEW_COMBO'
                      ? isDark
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-2xs'
                        : 'bg-emerald-600 text-white shadow-2xs'
                      : isDark
                        ? 'text-neutral-400 hover:text-neutral-200'
                        : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <span>Trừ Buổi 1 gói mới (0đ)</span>
                  {rememberedServicePromo && (
                    <span className="block text-[9px] font-semibold opacity-85">(Bỏ mã ưu đãi ca này)</span>
                  )}
                </button>
              </div>
              {!selectedUnderCombo && (
                <div>
                  <button
                    type="button"
                    data-testid="checkout-add-under-combo-btn"
                    onClick={comboSelection.openUnderComboModal}
                    className={`inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer ${
                      isDark ? 'text-purple-300 hover:text-purple-200' : 'text-purple-700 hover:text-purple-900'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Mua kèm gói Mi Dưới</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedUnderCombo && (
        <div
          data-testid="checkout-selected-under-combo-row"
          className={`p-3.5 space-y-2 ${isDark ? 'bg-purple-950/20' : 'bg-purple-50/30'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] font-black text-[var(--mos-text)] tracking-tight">
                  {cleanComboTitle(selectedUnderCombo.name)}
                </span>
                {canEditCombo && comboSelection && (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      data-testid="checkout-change-under-combo-btn"
                      onClick={comboSelection.openUnderComboModal}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[10px] font-bold cursor-pointer active:scale-95 ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-purple-300 hover:bg-neutral-700'
                          : 'bg-white border-purple-300 text-purple-800 hover:bg-purple-50'
                      }`}
                    >
                      <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                      <span>Đổi gói</span>
                    </button>
                    <button
                      type="button"
                      data-testid="checkout-remove-under-combo-btn"
                      aria-label="Xóa gói Combo Mi Dưới"
                      onClick={comboSelection.handleRemoveUnderCombo}
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md border cursor-pointer active:scale-95 ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-rose-400'
                          : 'bg-white border-neutral-200 text-neutral-500 hover:text-rose-600'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--mos-text-muted)] font-medium">
                <span className="tabular-nums">{selectedUnderCombo.sessions || 10} buổi (Mi Dưới)</span>
                {showStaffRewards &&
                  !isCheckoutStaffCc &&
                  !hasBothCombos &&
                  (underComboBonus || totalComboBonus) > 0 && (
                    <>
                      <span className={isDark ? 'text-neutral-600' : 'text-neutral-300'}>•</span>
                      <span
                        className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold inline-flex items-center gap-0.5 tabular-nums`}
                      >
                        Thưởng gói: +{Math.round((underComboBonus || totalComboBonus) / 1000)}
                        <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                      </span>
                    </>
                  )}
              </div>
              <ReceiptComboExpiryLine
                dateExpired={selectedUnderCombo.dateExpired}
                dateExpiredDisplay={selectedUnderCombo.dateExpiredDisplay}
                expiryFormulaSummary={selectedUnderCombo.expiryFormulaSummary}
                revivedExpiredSessions={selectedUnderCombo.revivedExpiredSessions}
                isDark={isDark}
                variant="under"
                showFormula
              />
            </div>
            <span className="text-[13px] text-[var(--mos-text)] font-black tabular-nums whitespace-nowrap shrink-0">
              {selectedUnderCombo.price.toLocaleString('vi-VN')}đ
            </span>
          </div>

          {canEditCombo && comboSelection && (
            <div className="space-y-1.5">
              {booking?.attributes?.hasUnderMink && (
                <div
                  data-testid="checkout-under-combo-usage-mode"
                  className={`p-1 rounded-xl grid grid-cols-2 gap-1 border ${
                    isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-purple-200/80'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => comboSelection.handleChangeUnderUsageMode('RETAIL_OR_VOUCHER')}
                    className={`py-1 px-2 rounded-lg text-[10px] font-bold text-center cursor-pointer tabular-nums ${
                      currentUnderMode === 'RETAIL_OR_VOUCHER'
                        ? 'bg-purple-600 text-white'
                        : isDark
                          ? 'text-neutral-400'
                          : 'text-neutral-600'
                    }`}
                  >
                    Trả lẻ Mi Dưới (+21N)
                  </button>
                  <button
                    type="button"
                    onClick={() => comboSelection.handleChangeUnderUsageMode('USE_NEW_COMBO')}
                    className={`py-1 px-2 rounded-lg text-[10px] font-bold text-center cursor-pointer tabular-nums ${
                      currentUnderMode === 'USE_NEW_COMBO'
                        ? 'bg-emerald-600 text-white'
                        : isDark
                          ? 'text-neutral-400'
                          : 'text-neutral-600'
                    }`}
                  >
                    Trừ gói Mi Dưới (0đ)
                  </button>
                </div>
              )}
              {!selectedCombo && (
                <div>
                  <button
                    type="button"
                    data-testid="checkout-add-combo-btn"
                    onClick={comboSelection.openUpperComboModal}
                    className={`inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer ${
                      isDark ? 'text-amber-300 hover:text-amber-200' : 'text-amber-700 hover:text-amber-900'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Mua kèm gói Mi Trên</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasBothCombos && showStaffRewards && !isCheckoutStaffCc && (
        <div
          className={`px-3.5 py-2.5 flex items-center justify-between text-[11.5px] border-t ${
            isDark
              ? 'bg-gradient-to-r from-amber-950/40 to-purple-950/40 text-amber-200 border-amber-900/40'
              : 'bg-gradient-to-r from-amber-50 to-purple-50 text-amber-950 border-amber-200/70'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-bold truncate">
              Thưởng gộp 2 gói mua cùng lúc ({comboTotalRevenue.toLocaleString('vi-VN')}đ):
            </span>
          </div>
          <span
            className={`${
              isDark
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            } font-black tabular-nums border px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0 text-[12px]`}
          >
            +{Math.round(totalComboBonus / 1000)}
            <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
          </span>
        </div>
      )}
    </>
  );
}
