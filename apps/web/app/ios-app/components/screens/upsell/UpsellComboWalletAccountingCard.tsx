'use client';

import React from 'react';
import { Sparkles, CheckCircle2, Wallet, ChevronUp, CalendarClock } from 'lucide-react';
import {
  MatchedComboPackageOption,
  calculateComboPurchaseAccounting,
  type ComboPurchaseExpiryResult,
  type ComboTodayUsageMode,
} from '@mos-lab/shared';
import { FeatherSvg } from '../../ui-kit/CvFeatherLabels';

type PurchaseAccountingResult = ReturnType<typeof calculateComboPurchaseAccounting>;

export interface UpsellComboWalletAccountingCardProps {
  isDark: boolean;
  isExistingComboLive: boolean;
  selectedNewComboPkg: MatchedComboPackageOption | null;
  purchaseAccounting: PurchaseAccountingResult | null;
  deductTodayIntoCombo: boolean;
  onSetDeductTodayIntoCombo: (deduct: boolean) => void;
  upperTodayUsageMode?: ComboTodayUsageMode;
  onSetUpperTodayUsageMode?: (mode: ComboTodayUsageMode) => void;
  selectedUpperExpiry?: ComboPurchaseExpiryResult | null;
  servicePrice: number;
  showStaffRewards: boolean;
  actorName: string;
  onCollapseNewComboSection: () => void;
}

export function UpsellComboWalletAccountingCard({
  isDark,
  isExistingComboLive,
  selectedNewComboPkg,
  purchaseAccounting,
  deductTodayIntoCombo,
  onSetDeductTodayIntoCombo,
  upperTodayUsageMode = isExistingComboLive
    ? 'USE_OLD_COMBO'
    : deductTodayIntoCombo
      ? 'USE_NEW_COMBO'
      : 'RETAIL_OR_VOUCHER',
  onSetUpperTodayUsageMode,
  selectedUpperExpiry,
  servicePrice,
  showStaffRewards,
  actorName,
  onCollapseNewComboSection,
}: UpsellComboWalletAccountingCardProps) {
  return (
    <>
      {/* Live Deduction & Wallet Status Card when a New Combo is selected */}
      {selectedNewComboPkg &&
        (isExistingComboLive ? (
          <div
            className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-500/30' : 'bg-amber-50/80 border-amber-300'} border rounded-xl space-y-2 text-[12px]`}
          >
            <div
              className={`flex items-center justify-between font-extrabold ${isDark ? 'text-amber-300' : 'text-amber-950'}`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Hạch toán Gói ❖ Mua Thêm:
              </span>
              <span className={`tabular-nums text-[13.5px] font-black ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                {selectedNewComboPkg.comboPrice.toLocaleString('vi-VN')} đ
              </span>
            </div>
            {onSetUpperTodayUsageMode && (
              <div
                className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${
                  isDark ? 'bg-neutral-900 border-amber-500/30' : 'bg-white border-amber-200'
                }`}
              >
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
                      onClick={() => onSetUpperTodayUsageMode(opt.mode)}
                      className={`py-1.5 px-1.5 rounded-lg text-[10.5px] font-extrabold leading-tight text-center transition-all cursor-pointer tabular-nums ${
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
              </div>
            )}
            <div
              className={`p-2.5 ${isDark ? 'bg-neutral-900/90 border-amber-500/30 text-neutral-200' : 'bg-white border-amber-200 text-gray-700'} rounded-lg border text-[11px] space-y-1.5`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className={`${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>Buổi làm hôm nay:</span>
                <strong className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold text-right`}>
                  {upperTodayUsageMode === 'USE_NEW_COMBO'
                    ? '✓ Trừ vào Gói mới (0đ)'
                    : upperTodayUsageMode === 'RETAIL_OR_VOUCHER'
                      ? 'Thanh toán lẻ / Voucher (+1T +21N)'
                      : '✓ Trừ vào Gói cũ (+1T mua sớm)'}
                </strong>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className={`${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Tổng Combo Mi Trên sau hôm nay:
                </span>
                <span className={`font-extrabold ${isDark ? 'text-indigo-300' : 'text-indigo-900'} tabular-nums`}>
                  {selectedUpperExpiry
                    ? `✦ ${selectedUpperExpiry.combinedNormalAfterToday} · ↻ ${selectedUpperExpiry.combinedRetainAfterToday} (${selectedUpperExpiry.combinedTotalAfterToday} buổi)`
                    : `✦ ${selectedNewComboPkg.comboNewCount + selectedNewComboPkg.bonusNewCount} · ↻ ${selectedNewComboPkg.comboRefillCount + selectedNewComboPkg.bonusRefillCount} (Đủ ${selectedNewComboPkg.totalSessions} buổi)`}
                </span>
              </div>
              {selectedUpperExpiry && (
                <div
                  className={`pt-1.5 border-t ${isDark ? 'border-neutral-800' : 'border-amber-100'} space-y-0.5 tabular-nums`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Hạn sử dụng mới:</span>
                    </span>
                    <span className={`font-black text-[12px] ${isDark ? 'text-amber-300' : 'text-amber-950'}`}>
                      {selectedUpperExpiry.dateExpiredDisplay}
                    </span>
                  </div>
                  <div className={`text-[10px] font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {selectedUpperExpiry.formulaSummaryVi}
                  </div>
                </div>
              )}
              {showStaffRewards && (
                <div
                  className={`flex justify-between items-center pt-1 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}
                >
                  <span className={`${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Thưởng chốt cho {actorName}:
                  </span>
                  <strong
                    className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-black tabular-nums inline-flex items-center gap-0.5`}
                  >
                    +{Math.round(selectedNewComboPkg.cvBonus / 1000)}
                    <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                  </strong>
                </div>
              )}
            </div>
          </div>
        ) : purchaseAccounting ? (
          (() => {
            const bonusRemainingRetailValue = deductTodayIntoCombo
              ? purchaseAccounting.remainingWalletAfterToday.bonusNew * (selectedNewComboPkg.newUnitPrice || 0) +
                purchaseAccounting.remainingWalletAfterToday.bonusRefill * (selectedNewComboPkg.refillUnitPrice || 0)
              : selectedNewComboPkg.bonusNewCount * (selectedNewComboPkg.newUnitPrice || 0) +
                selectedNewComboPkg.bonusRefillCount * (selectedNewComboPkg.refillUnitPrice || 0);

            const revivedSessions = selectedUpperExpiry?.revivedExpiredSessions || 0;
            const walletRemainingDisplay =
              revivedSessions > 0 && selectedUpperExpiry
                ? selectedUpperExpiry.combinedTotalAfterToday
                : deductTodayIntoCombo
                  ? purchaseAccounting.remainingWalletAfterToday.totalRemaining
                  : selectedNewComboPkg.totalSessions;
            const totalPooledSessionsDisplay = selectedNewComboPkg.totalSessions + revivedSessions;
            const paidRemainingDisplay = deductTodayIntoCombo
              ? purchaseAccounting.remainingWalletAfterToday.totalPaidRemaining
              : selectedNewComboPkg.comboNewCount + selectedNewComboPkg.comboRefillCount;
            const paidNewDisplay = deductTodayIntoCombo
              ? purchaseAccounting.remainingWalletAfterToday.paidNew
              : selectedNewComboPkg.comboNewCount;
            const paidRefillDisplay = deductTodayIntoCombo
              ? purchaseAccounting.remainingWalletAfterToday.paidRefill
              : selectedNewComboPkg.comboRefillCount;
            const bonusRemainingDisplay = deductTodayIntoCombo
              ? purchaseAccounting.remainingWalletAfterToday.totalBonusRemaining
              : selectedNewComboPkg.bonusNewCount + selectedNewComboPkg.bonusRefillCount;

            return (
              <div
                className={`rounded-2xl p-3 ${isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] border-[#CBD5E1]'} border shadow-sm space-y-2.5`}
              >
                {/* Segmented Switch: Trừ vào gói vs Trả lẻ ca này */}
                <div className="space-y-1.5">
                  <div
                    className={`${isDark ? 'bg-neutral-800' : 'bg-slate-200/90'} p-1 rounded-xl grid grid-cols-2 gap-1 text-[11px] font-bold`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSetDeductTodayIntoCombo(true);
                        onSetUpperTodayUsageMode?.('USE_NEW_COMBO');
                      }}
                      className={`py-2 px-2.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                        deductTodayIntoCombo
                          ? isDark
                            ? 'bg-neutral-900 text-emerald-400 shadow-xs font-black'
                            : 'bg-white text-emerald-800 shadow-xs font-black'
                          : isDark
                            ? 'text-neutral-400 hover:text-neutral-200 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 font-semibold'
                      }`}
                    >
                      {deductTodayIntoCombo && <span>✓</span>}
                      <span>Trừ vào gói (0đ hôm nay)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSetDeductTodayIntoCombo(false);
                        onSetUpperTodayUsageMode?.('RETAIL_OR_VOUCHER');
                      }}
                      className={`py-2 px-2.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                        !deductTodayIntoCombo
                          ? isDark
                            ? 'bg-neutral-900 text-indigo-400 shadow-xs font-black'
                            : 'bg-white text-indigo-900 shadow-xs font-black'
                          : isDark
                            ? 'text-neutral-400 hover:text-neutral-200 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 font-semibold'
                      }`}
                    >
                      {!deductTodayIntoCombo && <span>✓</span>}
                      <span>Đi lẻ / Voucher (+21N)</span>
                    </button>
                  </div>
                </div>

                {/* Card Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        deductTodayIntoCombo
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600'
                          : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-600'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-[11px] font-black ${isDark ? 'text-neutral-200' : 'text-slate-800'} uppercase tracking-wide leading-tight`}
                      >
                        {deductTodayIntoCombo
                          ? 'Đặc quyền trừ buổi hôm nay vào gói'
                          : 'Thanh toán lẻ riêng & Giữ nguyên gói'}
                      </div>
                      <div
                        className={`text-[9.5px] ${isDark ? 'text-neutral-400' : 'text-slate-500'} font-medium leading-tight`}
                      >
                        {deductTodayIntoCombo
                          ? `Gói ${selectedNewComboPkg.shortRuleLabel || selectedNewComboPkg.ruleName} · Buổi hôm nay tính làm Lượt 1`
                          : `Gói ${selectedNewComboPkg.shortRuleLabel || selectedNewComboPkg.ruleName} · Giữ nguyên ${selectedNewComboPkg.totalSessions} buổi cho lần sau`}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black tabular-nums shadow-xs flex-shrink-0 ${
                      deductTodayIntoCombo
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500'
                        : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400'
                    }`}
                  >
                    <span>{deductTodayIntoCombo ? 'Miễn thu lẻ' : 'Thu lẻ riêng'}</span>
                    <span className="font-extrabold">{servicePrice.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                {/* 2-Column Split Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Box 1: Buổi hôm nay */}
                  <div
                    className={`${isDark ? 'bg-black/60 border-neutral-800' : 'bg-white/95 border-slate-200/80'} rounded-xl p-2.5 border shadow-2xs flex flex-col justify-between space-y-2`}
                  >
                    <div>
                      <div
                        className={`text-[9.5px] font-extrabold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-slate-500'} flex items-center gap-1`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{deductTodayIntoCombo ? 'Buổi hôm nay (Lượt 1)' : 'Buổi hôm nay (Ca lẻ)'}</span>
                      </div>
                      <div
                        className={`mt-1 text-[12.5px] font-black ${isDark ? 'text-white' : 'text-slate-900'} leading-tight`}
                      >
                        {deductTodayIntoCombo ? 'Trừ vào 1 Buổi Nối Mới' : 'Thanh toán lẻ riêng ca này'}
                      </div>
                      <div
                        className={`text-[9.5px] ${isDark ? 'text-neutral-400' : 'text-slate-500'} mt-0.5 leading-snug`}
                      >
                        {deductTodayIntoCombo
                          ? 'Không tính tiền lẻ ca này, trừ thẳng vào lượt đầu của gói mới mua.'
                          : 'Khách trả riêng tiền dịch vụ hôm nay, không trừ vào bất kỳ buổi nào của gói.'}
                      </div>
                    </div>
                    <div
                      className={`pt-1.5 border-t ${isDark ? 'border-neutral-800' : 'border-slate-100'} flex items-center justify-between text-[10px]`}
                    >
                      <span className={`${isDark ? 'text-neutral-400' : 'text-slate-500'} font-medium`}>
                        Thu lẻ ca này:
                      </span>
                      <span
                        className={`font-black text-[11px] tabular-nums ${
                          deductTodayIntoCombo ? 'text-emerald-500' : isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {deductTodayIntoCombo ? '0đ' : `${servicePrice.toLocaleString('vi-VN')}đ`}
                      </span>
                    </div>
                  </div>

                  {/* Box 2: Combo Mi Trên còn lại */}
                  <div
                    className={`${isDark ? 'bg-black/60 border-neutral-800' : 'bg-white/95 border-slate-200/80'} rounded-xl p-2.5 border shadow-2xs flex flex-col justify-between space-y-2`}
                  >
                    <div>
                      <div
                        className={`text-[9.5px] font-extrabold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-slate-500'} flex items-center gap-1`}
                      >
                        <Wallet className="w-3 h-3 text-indigo-400" />
                        <span>{deductTodayIntoCombo ? 'Combo Mi Trên sau ca này' : 'Combo Mi Trên cho lần sau'}</span>
                      </div>
                      <div
                        className={`mt-1 flex items-baseline gap-1 ${isDark ? 'text-white' : 'text-slate-900'} leading-tight`}
                      >
                        <span
                          className={`text-[15px] font-black tabular-nums ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}
                        >
                          {walletRemainingDisplay}
                        </span>
                        <span className={`text-[11px] font-bold ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                          /{totalPooledSessionsDisplay} buổi
                        </span>
                      </div>
                      <div
                        className={`text-[9.5px] ${isDark ? 'text-neutral-300' : 'text-slate-600'} mt-0.5 leading-snug space-y-0.5`}
                      >
                        <div>
                          • <strong>{paidRemainingDisplay}</strong> buổi mua (
                          {paidNewDisplay > 0 ? `${paidNewDisplay} New + ` : ''}
                          {paidRefillDisplay} Refill)
                        </div>
                        {bonusRemainingDisplay > 0 && (
                          <div className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold`}>
                            • <strong>{bonusRemainingDisplay}</strong> buổi tặng{' '}
                            <span
                              className={`text-[9px] font-extrabold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}
                            >
                              (Trị giá {bonusRemainingRetailValue.toLocaleString('vi-VN')}đ)
                            </span>
                          </div>
                        )}
                        {revivedSessions > 0 && selectedUpperExpiry && (
                          <div className={`${isDark ? 'text-amber-300' : 'text-amber-800'} font-extrabold`}>
                            • Cứu <strong>{revivedSessions}</strong> buổi gói cũ (✦
                            {selectedUpperExpiry.revivedNormalSessions} · ↻{selectedUpperExpiry.revivedRetainSessions})
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`pt-1.5 border-t ${isDark ? 'border-neutral-800' : 'border-slate-100'} space-y-0.5 text-[10px]`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`${isDark ? 'text-neutral-400' : 'text-slate-500'} font-medium`}>
                          HSD mới:
                        </span>
                        <span className={`font-black ${isDark ? 'text-amber-300' : 'text-amber-800'} tabular-nums`}>
                          {selectedUpperExpiry
                            ? selectedUpperExpiry.dateExpiredDisplay
                            : selectedNewComboPkg.validityMonths
                              ? `${selectedNewComboPkg.validityMonths} tháng`
                              : '36 tháng'}
                        </span>
                      </div>
                      {selectedUpperExpiry && (
                        <div className={`text-[9px] leading-snug ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>
                          {selectedUpperExpiry.formulaSummaryVi}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Value / Savings Footer Strip */}
                <div
                  className={`${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 border-amber-500/20'} rounded-xl px-2.5 py-1.5 border flex items-center justify-between text-[10px]`}
                >
                  <div
                    className={`flex items-center gap-1.5 ${isDark ? 'text-neutral-300' : 'text-slate-600'} font-medium`}
                  >
                    {deductTodayIntoCombo ? (
                      <>
                        <span>
                          Giá lẻ:{' '}
                          <strong
                            className={`line-through ${isDark ? 'text-neutral-500' : 'text-slate-400'} tabular-nums`}
                          >
                            {selectedNewComboPkg.retailTotal.toLocaleString('vi-VN')}đ
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Giá gói:{' '}
                          <strong className={`${isDark ? 'text-white' : 'text-slate-900'} tabular-nums`}>
                            {selectedNewComboPkg.comboPrice.toLocaleString('vi-VN')}đ
                          </strong>
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          Lẻ ca này: <strong>{servicePrice.toLocaleString('vi-VN')}đ</strong>
                        </span>
                        <span>+</span>
                        <span>
                          Gói: <strong>{selectedNewComboPkg.comboPrice.toLocaleString('vi-VN')}đ</strong>
                        </span>
                      </>
                    )}
                  </div>
                  <div className={`font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'} tabular-nums`}>
                    {deductTodayIntoCombo
                      ? `Tiết kiệm ${selectedNewComboPkg.savingsAmount.toLocaleString('vi-VN')}đ`
                      : `Tổng ${(servicePrice + selectedNewComboPkg.comboPrice).toLocaleString('vi-VN')}đ`}
                  </div>
                </div>
              </div>
            );
          })()
        ) : null)}

      {isExistingComboLive && (
        <button
          type="button"
          onClick={onCollapseNewComboSection}
          className={`w-full py-2.5 rounded-xl border ${isDark ? 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300' : 'border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-neutral-700'} font-bold text-xs flex items-center justify-center gap-1 active:scale-98 transition-all cursor-pointer`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span>Thu gọn phần mua thêm combo (Chỉ trừ gói cũ hôm nay)</span>
        </button>
      )}
    </>
  );
}
