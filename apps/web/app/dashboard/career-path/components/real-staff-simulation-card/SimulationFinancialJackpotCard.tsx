'use client';

import React from 'react';
import { Tooltip } from 'antd';
import type { StaffCareerStatus } from '@mos-lab/shared';
import { formatCareerRoleName } from '../../career-path.constants';
import { WingRoleLabel } from '../IslandGameIcon';
import type { CareerBibleTopic } from '../CareerBibleDrawer';
import { SimulationWhatIfSliders } from './SimulationWhatIfSliders';
import { type FinancialSimulationSummary, type QuestMetricsSummary, formatVnd } from './simulationTypesAndHelpers';

interface SimulationFinancialJackpotCardProps {
  status: StaffCareerStatus;
  questMetrics: QuestMetricsSummary;
  financialSummary: FinancialSimulationSummary;
  localCombo: number;
  localOrders: number;
  sliderSerums: number;
  sliderTipRate: number;
  onComboChange: (val: number) => void;
  onSerumsChange: (val: number) => void;
  onOrdersChange: (val: number) => void;
  onTipRateChange: (val: number) => void;
  comboTooltipFormatter: (val?: number) => string;
  serumsTooltipFormatter: (val?: number) => string;
  ordersTooltipFormatter: (val?: number) => string;
  tipTooltipFormatter: (val?: number) => string;
  onResetSliders: () => void;
  onOpenBibleTopic?: (topic: CareerBibleTopic) => void;
}

export const SimulationFinancialJackpotCard: React.FC<SimulationFinancialJackpotCardProps> = ({
  status,
  questMetrics,
  financialSummary,
  localCombo,
  localOrders,
  sliderSerums,
  sliderTipRate,
  onComboChange,
  onSerumsChange,
  onOrdersChange,
  onTipRateChange,
  comboTooltipFormatter,
  serumsTooltipFormatter,
  ordersTooltipFormatter,
  tipTooltipFormatter,
  onResetSliders,
  onOpenBibleTopic,
}) => {
  const { minSelfComboPercent } = questMetrics;
  const {
    actualNetIncome,
    actualGrossIncome,
    actualWorkingHours,
    actualHourlyRate,
    actualWageAmount,
    actualBonusAmount,
    actualTipAmount,
    actualAllowanceAmount,
    actualMonthLabel,
    simOrdersPerMonth,
    hourlyWageNext,
    wageCvPlus,
    simulatedCvXoay,
    bonusGain,
    tipCvPlus,
    monthlySerumBonus,
    simulatedComboCount,
    isComboTargetHit,
    comboGain,
    effectiveWageGain,
    effectiveSerumGain,
    effectiveTipGain,
    lostBonusAmount,
    currentIncome,
    totalSimulatedGain,
    simulatedNextTierIncome,
    incomeIncreasePercent,
  } = financialSummary;

  const targetRoleLabel = formatCareerRoleName(status.targetRole);

  return (
    <div className="xl:col-span-7 space-y-4">
      {/* THE FINANCIAL SUPER-NOVA JACKPOT CARD: TÂM ĐIỂM QUYỀN LỢI TÀI CHÍNH CVL */}
      <div className="rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 bg-gradient-to-br from-amber-950/90 via-slate-900 to-emerald-950/80 border-2 border-amber-500/80 shadow-2xl shadow-amber-500/20 relative overflow-hidden space-y-3 sm:space-y-4 text-white">
        {/* Ambient Golden & Emerald Glows */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* DESKTOP HERO FINANCIAL JACKPOT BANNER (>= md) */}
        <div className="hidden md:block space-y-4">
          {/* Top Header & Slogan */}
          <div className="flex items-center justify-between gap-3 flex-wrap relative z-10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md">
                <span>🔥</span> TÂM ĐIỂM QUYỀN LỢI TÀI CHÍNH
              </span>
              <span className="text-xs font-bold text-amber-300 inline-flex items-center gap-1">
                <span>Thăng Cấp Lên</span>
                <WingRoleLabel text={targetRoleLabel} />
              </span>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1">
              <span>💰</span> TIỀN TƯƠI RÓT VÀO VÍ
            </span>
          </div>

          {/* THE BIG HERO NUMBER DISPLAY */}
          <div className="p-4 rounded-2xl bg-slate-950/85 border border-amber-500/40 flex items-center justify-between gap-4 flex-wrap relative z-10">
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <span>💵</span>{' '}
                {isComboTargetHit
                  ? 'THU NHẬP RÒNG TĂNG THÊM MỖI THÁNG:'
                  : 'THU NHẬP TĂNG THÊM TẠM TÍNH (BỊ KHÓA THƯỞNG):'}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                {isComboTargetHit ? (
                  <span className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-400 tabular-nums drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                    +{formatVnd(totalSimulatedGain)}
                  </span>
                ) : (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl lg:text-3xl font-black text-emerald-400 tabular-nums">
                      +{formatVnd(effectiveTipGain)}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Bảo lưu 90% Tip (70+20)
                    </span>
                    <span className="text-xs font-bold text-rose-400 line-through">
                      +{formatVnd(lostBonusAmount)} thưởng
                    </span>
                  </div>
                )}
                <span className="text-xs font-bold text-slate-400 uppercase">/ Tháng</span>
              </div>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                {isComboTargetHit ? (
                  <>
                    <span>🚀</span>
                    <span>
                      Tương đương{' '}
                      <strong className="text-white text-sm font-black tabular-nums">
                        +{formatVnd(totalSimulatedGain * 12)} / Năm
                      </strong>{' '}
                      (Đủ sắm xe tay ga hoặc 7 chỉ vàng 9999!)
                    </span>
                  </>
                ) : (
                  <span className="text-rose-300">
                    ⚠️ Bị khóa +{formatVnd(lostBonusAmount)} tiền thưởng combo và lương tăng do chưa đạt tối thiểu{' '}
                    {minSelfComboPercent}% combo!
                  </span>
                )}
              </div>
            </div>

            {/* High-converting Catchphrase Badge */}
            <div className="max-w-xs text-right hidden sm:block">
              <div
                className={`p-2.5 rounded-xl border text-[11px] font-semibold leading-relaxed ${
                  isComboTargetHit
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                {isComboTargetHit ? (
                  <span>
                    “Cùng một ca làm, cùng lượng khách phục vụ — Nhưng đút túi thêm cả chỉ vàng mỗi tháng!{' '}
                    <strong className="text-amber-300 font-black inline-flex items-center gap-1 flex-wrap justify-end">
                      <span>Chỉ có người thù ghét tiền mới không muốn lên</span>
                      <WingRoleLabel text={targetRoleLabel} />
                      <span>!</span>
                    </strong>
                    ”
                  </span>
                ) : (
                  <span>
                    “⚠️ <strong className="text-rose-300 font-black">Quy tắc 2 Tháng Liền:</strong>{' '}
                    <span className="inline-flex items-center gap-1">
                      <WingRoleLabel text={targetRoleLabel} />
                    </span>{' '}
                    bán không được vẫn nhận 90% Tip, nhưng không nhận thêm thưởng nào khác. Nếu 2 tháng liền không đạt{' '}
                    {minSelfComboPercent}% combo thì quay lại CV!”
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BỘ 4 CẦN GẠT WHAT-IF TRỰC TIẾP (UNIFIED WHAT-IF COCKPIT) */}
        <SimulationWhatIfSliders
          actualOrdersCount={status.metrics.ordersCount || 0}
          questMetrics={questMetrics}
          financialSummary={financialSummary}
          localCombo={localCombo}
          localOrders={localOrders}
          sliderSerums={sliderSerums}
          sliderTipRate={sliderTipRate}
          onComboChange={onComboChange}
          onSerumsChange={onSerumsChange}
          onOrdersChange={onOrdersChange}
          onTipRateChange={onTipRateChange}
          comboTooltipFormatter={comboTooltipFormatter}
          serumsTooltipFormatter={serumsTooltipFormatter}
          ordersTooltipFormatter={ordersTooltipFormatter}
          tipTooltipFormatter={tipTooltipFormatter}
          onResetSliders={onResetSliders}
          onOpenBibleTopic={onOpenBibleTopic}
        />

        {/* HEAD-TO-HEAD BEFORE VS AFTER COMPARISON */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10 text-xs">
          {/* BEFORE: CV (Hiện Tại) */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 opacity-85">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-400 flex items-center gap-1.5 text-xs">
                <span>🛑</span> CV (Hiện Tại)
              </span>
              <Tooltip
                title={
                  <div className="text-[11px] text-slate-300 leading-relaxed space-y-1 p-0.5 max-w-xs">
                    <div className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                      <span>🛑</span> Cấp bậc CV (Hiện Tại)
                    </div>
                    <div>• Lương giờ thực tế: {formatVnd(actualHourlyRate)} / giờ.</div>
                    <div>• Thưởng thực tế: Thưởng vòng xoay + năng suất.</div>
                    <div>• Tỷ lệ Tip: Nhận 70% Tip do khách cho.</div>
                    <div>• Quyền tư vấn: Chưa có quyền độc quyền chốt combo.</div>
                    {actualMonthLabel && (
                      <div className="text-emerald-300 pt-1">• Dữ liệu thực tế từ Bảng lương {actualMonthLabel}.</div>
                    )}
                  </div>
                }
                placement="topRight"
              >
                <button
                  type="button"
                  className="w-5 h-5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white inline-flex items-center justify-center text-[10px] font-mono font-bold border border-slate-700/80 cursor-help transition-all hover:scale-110 active:scale-95 shadow-xs shrink-0"
                  aria-label="Xem quy tắc CV"
                >
                  i
                </button>
              </Tooltip>
            </div>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                Thực Lãnh Tháng Trước
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Bảng lương {actualMonthLabel}</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li className="flex justify-between">
                <span className="text-slate-400">• Lương giờ ({formatVnd(actualHourlyRate)}/h):</span>
                <strong className="text-slate-200 tabular-nums">
                  {formatVnd(actualWageAmount)}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">(~{actualWorkingHours}h)</span>
                </strong>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">• Thưởng Vòng Xoay &amp; Năng suất:</span>
                <strong className="text-amber-400 tabular-nums">{formatVnd(actualBonusAmount)}</strong>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">• Tiền Tip nhận (70%):</span>
                <strong className="text-slate-200 tabular-nums">{formatVnd(actualTipAmount)}</strong>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">• Quyền chốt Combo:</span>
                <strong className="text-rose-400 inline-flex items-center gap-1">
                  <span>Không có (phụ thuộc CC,</span>
                  <WingRoleLabel text="CVLL" />
                  <span>)</span>
                </strong>
              </li>
              {actualAllowanceAmount !== 0 && (
                <li className="flex justify-between text-[10.5px]">
                  <span className="text-slate-400">• Phụ cấp &amp; Nghỉ tuần (trừ BHXH):</span>
                  <strong
                    className={
                      actualAllowanceAmount > 0 ? 'text-emerald-400 tabular-nums' : 'text-slate-400 tabular-nums'
                    }
                  >
                    {actualAllowanceAmount > 0
                      ? `+${formatVnd(actualAllowanceAmount)}`
                      : formatVnd(actualAllowanceAmount)}
                  </strong>
                </li>
              )}
            </ul>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-300 font-bold block">Tổng thực lãnh tháng trước:</span>
                <span className="text-[10px] text-slate-400 font-normal">(Đã chốt chuyển khoản)</span>
              </div>
              <div className="text-right">
                <strong className="text-white text-base font-black tabular-nums">
                  {formatVnd(actualNetIncome || currentIncome)}
                </strong>
                {actualGrossIncome && actualGrossIncome !== (actualNetIncome || currentIncome) ? (
                  <div className="text-[10px] text-slate-400 font-normal tabular-nums">
                    ({formatVnd(actualGrossIncome)} thu nhập gộp)
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* AFTER: Sau Thăng Cấp */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-950 to-emerald-950/50 border-2 border-emerald-500/80 shadow-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-emerald-300 flex items-center gap-1.5 text-xs">
                <span>👑</span> <WingRoleLabel text={targetRoleLabel} /> (Sau Thăng Cấp)
              </span>
              <Tooltip
                title={
                  <div className="text-[11px] text-slate-300 leading-relaxed space-y-1 p-0.5 max-w-xs">
                    <div className="text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                      <span>👑</span> Đặc quyền <WingRoleLabel text={targetRoleLabel} />
                    </div>
                    <div>• Ăn trọn 90% TIP (70% mi + 20% tư vấn).</div>
                    <div>• Độc quyền tự chốt Combo Not Live nhận thưởng bậc thang.</div>
                    <div>• Tăng lương giờ lên 27.500đ / giờ (+2.000đ/h).</div>
                    <div>• Thưởng Dưỡng mi Yeppeum: 100k/cây giá gốc (50k KM).</div>
                  </div>
                }
                placement="topRight"
              >
                <button
                  type="button"
                  className="w-5 h-5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white inline-flex items-center justify-center text-[10px] font-mono font-bold border border-slate-700/80 cursor-help transition-all hover:scale-110 active:scale-95 shadow-xs shrink-0"
                  aria-label="Xem đặc quyền"
                >
                  i
                </button>
              </Tooltip>
            </div>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-emerald-500/30">
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                Đặc Quyền
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black uppercase shadow-xs">
                {isComboTargetHit ? `+${incomeIncreasePercent}% THU NHẬP` : '+90% TIP'}
              </span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-200">
              <li className="flex justify-between">
                <span className="text-emerald-300/90">• Lương giờ ({formatVnd(hourlyWageNext)}/h):</span>
                <div className="text-right">
                  <strong className="text-emerald-300 font-bold tabular-nums">{formatVnd(wageCvPlus)}</strong>
                  {isComboTargetHit && effectiveWageGain > 0 ? (
                    <span className="text-[10px] text-emerald-400 font-normal pl-1">
                      (+{formatVnd(effectiveWageGain)})
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-400 font-normal pl-1">(Khóa)</span>
                  )}
                </div>
              </li>
              <li className="flex justify-between">
                <span className="text-emerald-300/90">• Thưởng Vòng Xoay CV:</span>
                <div className="text-right">
                  <strong className="text-amber-300 font-bold tabular-nums">
                    {formatVnd(simulatedCvXoay)}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">
                      (~{Math.round(simOrdersPerMonth)} ca)
                    </span>
                  </strong>
                  {bonusGain > 0 && (
                    <span className="text-[10px] text-emerald-400 font-normal pl-1">(+{formatVnd(bonusGain)})</span>
                  )}
                </div>
              </li>
              <li className="flex justify-between items-start">
                <div>
                  <span className="text-emerald-300/90 block">• Ăn trọn 90% TIP (70+20):</span>
                  {actualTipAmount > 0 && (
                    <span className="text-[9.5px] text-emerald-400/90 font-mono block">
                      ({formatVnd(actualTipAmount)} / 7 × 2 = +{formatVnd(effectiveTipGain)})
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <strong className="text-emerald-300 font-bold tabular-nums">{formatVnd(tipCvPlus)}</strong>
                  <span className="text-[10px] text-emerald-400 font-normal pl-1">
                    (+{formatVnd(effectiveTipGain)})
                  </span>
                </div>
              </li>
              <li className="flex justify-between">
                <span className="text-emerald-300/90">• Độc quyền Combo &amp; Dưỡng mi:</span>
                {isComboTargetHit ? (
                  <div className="text-right">
                    <strong className="text-emerald-300 font-bold tabular-nums">
                      +{formatVnd(comboGain + effectiveSerumGain)} / thg
                    </strong>
                    <div className="text-[9.5px] text-slate-400 font-normal">
                      (~{simulatedComboCount} combo + {sliderSerums * 4} cây)
                    </div>
                  </div>
                ) : (
                  <span className="text-rose-400 font-bold">0đ (Khóa do &lt;{minSelfComboPercent}%)</span>
                )}
              </li>
            </ul>
            <div className="pt-2 border-t border-emerald-500/30 flex justify-between items-center text-xs">
              <div>
                <span className="text-emerald-300 font-bold block">Tổng thu nhập thực nhận:</span>
                <span className="text-[10px] text-emerald-400 font-medium">
                  (Tăng thêm +{formatVnd(totalSimulatedGain)} / thg)
                </span>
              </div>
              <strong className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-emerald-300 text-base font-black tabular-nums">
                ~{formatVnd(simulatedNextTierIncome)} / thg
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
