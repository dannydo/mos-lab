'use client';

import React from 'react';
import { Slider, Tooltip } from 'antd';
import { Eye, HandCoins, Info } from 'lucide-react';
import type { CareerBibleTopic } from '../CareerBibleDrawer';
import { type FinancialSimulationSummary, type QuestMetricsSummary, formatVnd } from './simulationTypesAndHelpers';

interface WhatIfInfoButtonProps {
  tooltipTitle: string;
  testId: string;
  ariaLabel: string;
  onClick: () => void;
}

const WhatIfInfoButton: React.FC<WhatIfInfoButtonProps> = ({ tooltipTitle, testId, ariaLabel, onClick }) => (
  <Tooltip title={tooltipTitle} placement="topRight">
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white inline-flex items-center justify-center border border-slate-700/80 cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-xs shrink-0"
      aria-label={ariaLabel}
    >
      <Info className="w-3.5 h-3.5" />
    </button>
  </Tooltip>
);

interface SimulationWhatIfSlidersProps {
  actualOrdersCount: number;
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

export const SimulationWhatIfSliders: React.FC<SimulationWhatIfSlidersProps> = ({
  actualOrdersCount,
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
  const {
    targetOrders,
    minSelfComboPercent,
    staffTipRatePercent,
    targetTipRatePercent,
    isSimOrdersPassed,
    isSimTipPassed,
  } = questMetrics;

  const {
    isWhatIfModified,
    isComboTargetHit,
    simulatedComboCount,
    monthlySerumBonus,
    serumOrigBonus,
    simOrdersPerMonth,
    simTippedVisits,
  } = financialSummary;

  return (
    <div className="space-y-2.5 relative z-10">
      <div
        className={`flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-amber-500/20 ${
          !isWhatIfModified ? 'hidden md:flex' : ''
        }`}
      >
        <div className="hidden md:flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-300">
            Bộ 4 Cần Gạt What-If Trực Tiếp
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            (Kéo thử nghiệm để ải thăng cấp và tiền thưởng nhảy số tức thì)
          </span>
        </div>
        <button
          type="button"
          onClick={onResetSliders}
          className="text-[10px] text-amber-300 hover:text-white font-bold px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center gap-1 ml-auto"
          title="Đặt lại tất cả 4 chỉ số về số liệu thực tế của chuyên viên"
        >
          <span>↺</span>
          <span>Đặt lại thực tế</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* CẦN GẠT 1: BÁN COMBO */}
        <div
          className={`p-3 rounded-2xl bg-slate-950/90 border shadow-lg space-y-2 transition-colors duration-150 ${
            isComboTargetHit ? 'border-emerald-500/70 shadow-emerald-500/5' : 'border-rose-500/80 shadow-rose-500/10'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm shrink-0">💎</span>
              <span className="text-xs font-bold text-white tracking-wide truncate">1. Bán Combo Nối Mi</span>
            </div>
            <WhatIfInfoButton
              tooltipTitle="Nhấn để xem trích lục Kinh Thánh mOS về quy chế Bán Combo & Chế tài 21%"
              testId="info-btn-combo"
              ariaLabel="Xem quy tắc Kinh Thánh Bán Combo"
              onClick={() => onOpenBibleTopic?.('COMBO')}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                isComboTargetHit
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
              }`}
            >
              Bắt buộc ≥ {minSelfComboPercent}%
            </span>
            <div className="text-right">
              <span
                className={`text-base font-black font-mono tabular-nums ${
                  isComboTargetHit ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {localCombo}%
              </span>
              <span className="text-[10px] text-slate-400 pl-1 font-normal">(~{simulatedComboCount} combo)</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <Slider
              min={0}
              max={60}
              step={1}
              value={localCombo}
              onChange={onComboChange}
              tooltip={{ formatter: comboTooltipFormatter }}
              className="my-1"
            />
            <div className="flex justify-between text-[9px] font-semibold text-slate-400">
              <span className="text-rose-400 font-bold">0%</span>
              <span className="text-amber-300 font-bold">{minSelfComboPercent}% (Bắt buộc)</span>
              <span className="text-emerald-400 font-bold">40%</span>
              <span className="text-slate-400 font-bold">60%</span>
            </div>
          </div>

          <div className="text-[10px] font-bold flex items-center justify-between pt-1 border-t border-slate-800/80">
            {isComboTargetHit ? (
              <>
                <span className="text-emerald-400 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs" />
                  <span>✓ Đạt chuẩn (≥ {minSelfComboPercent}%)</span>
                </span>
                <span className="text-slate-400 font-normal text-[9.5px]">Mở khóa trọn bộ thưởng</span>
              </>
            ) : (
              <>
                <span className="text-rose-400 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  <span>✕ Thiếu {Math.max(0, minSelfComboPercent - localCombo)}%</span>
                </span>
                <span className="text-rose-400/80 font-normal text-[9.5px]">Bảo lưu 90% Tip · Cắt thưởng</span>
              </>
            )}
          </div>
        </div>

        {/* CẦN GẠT 2: BÁN DƯỠNG MI YEPPEUM (KHUYẾN KHÍCH) */}
        <div
          className={`p-3 rounded-2xl bg-slate-950/90 border shadow-lg space-y-2 transition-colors duration-150 ${
            isComboTargetHit ? 'border-teal-500/70 shadow-teal-500/5' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm shrink-0">🌿</span>
              <span className="text-xs font-bold text-white tracking-wide truncate">2. Dưỡng Mi Yeppeum</span>
            </div>
            <WhatIfInfoButton
              tooltipTitle="Nhấn để xem trích lục Kinh Thánh mOS về Dưỡng mi Yeppeum"
              testId="info-btn-serum"
              ariaLabel="Xem quy tắc Dưỡng Mi Yeppeum"
              onClick={() => onOpenBibleTopic?.('SERUM')}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 bg-teal-500/15 text-teal-300 border-teal-500/30">
              Khuyến khích
            </span>
            <div className="text-right">
              <span className="text-base font-black font-mono tabular-nums text-teal-300">{sliderSerums} cây/tuần</span>
              <span
                className={`text-[10px] pl-1 font-bold ${
                  isComboTargetHit ? 'text-emerald-400' : 'text-slate-500 line-through'
                }`}
              >
                ({monthlySerumBonus > 0 ? `+${formatVnd(monthlySerumBonus)}/thg` : '0đ'})
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <Slider
              min={0}
              max={10}
              step={1}
              value={sliderSerums}
              onChange={onSerumsChange}
              tooltip={{ formatter: serumsTooltipFormatter }}
              className="my-1"
            />
            <div className="flex justify-between text-[9px] font-semibold text-slate-400">
              <span className="font-bold">0</span>
              <span className="text-teal-300 font-bold">1 cây (Chuẩn)</span>
              <span className="text-teal-400 font-bold">2</span>
              <span className="text-emerald-400 font-bold">4</span>
              <span className="text-slate-400 font-bold">10 cây</span>
            </div>
          </div>

          <div className="text-[10px] font-bold flex items-center justify-between pt-1 border-t border-slate-800/80">
            {isComboTargetHit ? (
              <>
                <span className="text-teal-300 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>✓ +{formatVnd(monthlySerumBonus)}/thg</span>
                </span>
                <span className="text-slate-400 font-normal text-[9.5px]">{formatVnd(serumOrigBonus)}/cây</span>
              </>
            ) : (
              <>
                <span className="text-rose-400/90 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>✕ Tạm khóa (Cần ≥ {minSelfComboPercent}%)</span>
                </span>
                <span className="text-slate-500 line-through font-normal text-[9.5px]">
                  +{formatVnd(monthlySerumBonus)}/thg
                </span>
              </>
            )}
          </div>
        </div>

        {/* CẦN GẠT 3: SẢN LƯỢNG MI MÔ PHỎNG */}
        <div
          className={`p-3 rounded-2xl bg-slate-950/90 border shadow-lg space-y-2 transition-colors duration-150 ${
            isSimOrdersPassed ? 'border-emerald-500/70 shadow-emerald-500/5' : 'border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-white tracking-wide truncate">3. Sản lượng mi</span>
            </div>
            <WhatIfInfoButton
              tooltipTitle={`Nhấn để xem trích lục Kinh Thánh mOS về định mức ${targetOrders} bộ mi`}
              testId="info-btn-orders"
              ariaLabel="Xem quy tắc sản lượng mi"
              onClick={() => onOpenBibleTopic?.('ORDERS')}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                isSimOrdersPassed
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {isSimOrdersPassed ? '✓ Đạt định mức' : `Thiếu ${Math.max(0, targetOrders - localOrders)}`}
            </span>
            <div className="text-right">
              <span className="text-base font-black font-mono tabular-nums text-emerald-400">{localOrders} bộ</span>
              <span className="text-[10px] text-slate-400 pl-1 font-normal">
                (~{Math.round(simOrdersPerMonth)} ca/tháng)
              </span>
              {localOrders !== actualOrdersCount && (
                <span className="text-[9px] text-amber-400 pl-1 font-normal block sm:inline">
                  (Thực: {actualOrdersCount})
                </span>
              )}
            </div>
          </div>

          <div className="space-y-0.5">
            <Slider
              min={100}
              max={500}
              step={5}
              value={localOrders}
              onChange={onOrdersChange}
              tooltip={{ formatter: ordersTooltipFormatter }}
              className="my-1"
            />
            <div className="flex justify-between text-[9px] font-semibold text-slate-400">
              <span>100</span>
              <span className={`font-bold ${isSimOrdersPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {targetOrders} bộ (Chuẩn)
              </span>
              <span>500 bộ</span>
            </div>
          </div>

          <div className="text-[10px] font-bold flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span
              className={`inline-flex items-center gap-1.5 ${isSimOrdersPassed ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSimOrdersPassed ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>
                {isSimOrdersPassed ? '✓ Đạt chuẩn Ải 1' : `⚡ Thiếu ${Math.max(0, targetOrders - localOrders)} bộ`}
              </span>
            </span>
            <span className="text-slate-400 font-normal text-[9.5px]">Định mức 3 tháng</span>
          </div>
        </div>

        {/* CẦN GẠT 4: TỶ LỆ TIP DỰ PHÓNG */}
        <div
          className={`p-3 rounded-2xl bg-slate-950/90 border shadow-lg space-y-2 transition-colors duration-150 ${
            isSimTipPassed ? 'border-indigo-500/70 shadow-indigo-500/5' : 'border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <HandCoins className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-white tracking-wide truncate">4. Tỷ lệ Tip</span>
            </div>
            <WhatIfInfoButton
              tooltipTitle="Nhấn để xem trích lục Kinh Thánh mOS về quy chế Tip 90%"
              testId="info-btn-tip"
              ariaLabel="Xem quy tắc tỷ lệ tip"
              onClick={() => onOpenBibleTopic?.('TIP')}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                isSimTipPassed
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {isSimTipPassed ? '✓ Đạt chuẩn' : '⚡ Chưa đạt'}
            </span>
            <div className="text-right">
              <span className="text-base font-black font-mono tabular-nums text-indigo-400">
                {sliderTipRate.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 pl-1 font-normal">
                (~{Math.round(simTippedVisits)} ca tip)
              </span>
              {Math.abs(sliderTipRate - staffTipRatePercent) > 0.1 && (
                <span className="text-[9px] text-amber-400 pl-1 font-normal block sm:inline">
                  (Thực: {staffTipRatePercent}%)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-0.5">
            <Slider
              min={10}
              max={90}
              step={0.5}
              value={sliderTipRate}
              onChange={(val) => onTipRateChange(Number(val.toFixed(1)))}
              tooltip={{ formatter: tipTooltipFormatter }}
              className="my-1"
            />
            <div className="flex justify-between text-[9px] font-semibold text-slate-400">
              <span>10%</span>
              <span className={`font-bold ${isSimTipPassed ? 'text-indigo-400' : 'text-amber-400'}`}>
                ≥{targetTipRatePercent}% (Chuẩn)
              </span>
              <span>90%</span>
            </div>
          </div>

          <div className="text-[10px] font-bold flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span
              className={`inline-flex items-center gap-1.5 ${isSimTipPassed ? 'text-indigo-400' : 'text-amber-400'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSimTipPassed ? 'bg-indigo-400' : 'bg-amber-400'}`} />
              <span>{isSimTipPassed ? '✓ Đạt chuẩn Ải 3' : '⚡ Chưa đạt mốc chi nhánh'}</span>
            </span>
            <span className="text-slate-400 font-normal text-[9.5px]">Bảo lưu 90% Tip</span>
          </div>
        </div>
      </div>
    </div>
  );
};
