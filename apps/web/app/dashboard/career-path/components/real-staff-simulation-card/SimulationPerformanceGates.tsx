'use client';

import React from 'react';
import { AlertCircle, Bug, CheckCircle2, Eye, HandCoins, XCircle } from 'lucide-react';
import type { StaffCareerStatus } from '@mos-lab/shared';
import { SimulationQuestGateCard } from './SimulationQuestGateCard';
import { type GateFilter, type QuestMetricsSummary, formatVnd } from './simulationTypesAndHelpers';

interface SimulationPerformanceGatesProps {
  status: StaffCareerStatus;
  questMetrics: QuestMetricsSummary;
  localOrders: number;
  sliderTipRate: number;
  gateFilter: GateFilter;
  expandedGates: number[];
  onToggleGate: (gateIndex: number) => void;
}

const shouldShowGate = (gateFilter: GateFilter, isPassed: boolean) =>
  gateFilter === 'ALL' || (gateFilter === 'PASSED' && isPassed) || (gateFilter === 'UNPASSED' && !isPassed);

export const SimulationPerformanceGates: React.FC<SimulationPerformanceGatesProps> = ({
  status,
  questMetrics,
  localOrders,
  sliderTipRate,
  gateFilter,
  expandedGates,
  onToggleGate,
}) => {
  const { metrics } = status;
  const {
    targetOrders,
    targetMaxFix,
    minTipRatioAboveShop,
    staffTipRate,
    branchName,
    branchShortName,
    shopBonusPercent,
    staffTipRatePercent,
    shopTipRatePercent,
    targetTipRatePercent,
    ordersGap,
    isFixPassed,
    isTipPassed,
    tipGapPercent,
    tipExcessPercent,
    isSimOrdersPassed,
    isSimTipPassed,
    safetyShieldPercent,
  } = questMetrics;

  const ordersPercent = Math.min(100, Math.round((localOrders / targetOrders) * 100));
  const simTipPercent = Math.min(100, Math.round((sliderTipRate / targetTipRatePercent) * 100));

  return (
    <>
      {/* Card 1: Số bộ mi / 3 tháng */}
      {shouldShowGate(gateFilter, isSimOrdersPassed) && (
        <SimulationQuestGateCard
          id="gate-card-1"
          isExpanded={expandedGates.includes(1)}
          onToggle={() => onToggleGate(1)}
          containerToneClass={
            isSimOrdersPassed
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-900/80 border-slate-700/60 text-slate-300'
          }
          icon={<Eye className={`w-4 h-4 shrink-0 ${isSimOrdersPassed ? 'text-emerald-400' : 'text-amber-400'}`} />}
          title={`1. ${targetOrders} bộ mi / 3 tháng`}
          statusPill={
            isSimOrdersPassed ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ĐẠT CHUẨN
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> CẦN THÊM
              </span>
            )
          }
          metricDisplay={
            <div className="text-base sm:text-lg font-black text-white tabular-nums">
              {localOrders} <span className="text-xs font-normal text-slate-400">/ {targetOrders} bộ</span>
              {localOrders !== (metrics.ordersCount || 0) && (
                <span className="text-[10px] font-normal text-amber-400 ml-1.5">
                  (Thực tế: {metrics.ordersCount || 0} bộ)
                </span>
              )}
            </div>
          }
          percent={ordersPercent}
          percentClassName={isSimOrdersPassed ? 'text-emerald-400' : 'text-amber-400'}
          progressStatus={isSimOrdersPassed ? 'success' : 'normal'}
          collapsedHint={
            isSimOrdersPassed
              ? '✓ Đã đạt định mức'
              : `⚡ Còn thiếu ${Math.max(0, targetOrders - localOrders)} bộ mi nữa`
          }
          expandedContent={
            <>
              <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div>
                  <div className="text-slate-400">Đã hoàn thành</div>
                  <div className="text-white font-bold text-xs tabular-nums mt-0.5">
                    {metrics.ordersCount || 0} bộ mi
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Định mức 3 tháng</div>
                  <div className="text-amber-400 font-bold text-xs tabular-nums mt-0.5">
                    {targetOrders} bộ mi (~{Math.round(targetOrders / 3)} bộ/tháng)
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>
                  {ordersGap === 0
                    ? '✓ Đã cán mốc tối thiểu 3 tháng hoàn tất'
                    : `⚡ Cần thêm ${ordersGap} bộ mi trong kỳ 3 tháng hoàn tất`}
                </span>
                <span className="tabular-nums font-semibold text-slate-300">Mục tiêu: {targetOrders} bộ</span>
              </div>
            </>
          }
        />
      )}

      {/* Card 2: Fix */}
      {shouldShowGate(gateFilter, isFixPassed) && (
        <SimulationQuestGateCard
          id="gate-card-2"
          isExpanded={expandedGates.includes(2)}
          onToggle={() => onToggleGate(2)}
          containerToneClass={
            isFixPassed
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          }
          icon={<Bug className={`w-4 h-4 shrink-0 ${isFixPassed ? 'text-emerald-400' : 'text-rose-400'}`} />}
          title={`2. Tỷ lệ Fix < ${(targetMaxFix * 100).toFixed(1)}%`}
          statusPill={
            isFixPassed ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> XUẤT SẮC
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> VƯỢT MỨC
              </span>
            )
          }
          metricDisplay={
            <div className="text-base sm:text-lg font-black text-white tabular-nums">
              {((metrics.fixRate || 0) * 100).toFixed(1)}%{' '}
              <span className="text-xs font-normal text-slate-400">(&lt; {(targetMaxFix * 100).toFixed(1)}%)</span>
            </div>
          }
          percent={safetyShieldPercent}
          percentClassName={isFixPassed ? 'text-emerald-400' : 'text-rose-400'}
          progressStatus={isFixPassed ? 'success' : 'exception'}
          collapsedHint={`${metrics.fixCount || 0} ca sửa / ${metrics.ordersCount || 0} bộ mi`}
          expandedContent={
            <>
              <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div>
                  <div className="text-slate-400">Ca bảo hành / sửa</div>
                  <div className="text-white font-bold text-xs tabular-nums mt-0.5">
                    {metrics.fixCount || 0} ca / {metrics.ordersCount || 0} bộ
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Ngưỡng tối đa</div>
                  <div className="text-emerald-400 font-bold text-xs tabular-nums mt-0.5">
                    &lt; {(targetMaxFix * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>
                  {isFixPassed
                    ? '✓ Tay nghề vững vàng, bảo hành trong ngưỡng kiểm soát'
                    : '⚡ Tỷ lệ sửa vượt mức an toàn, cần rà soát kỹ thuật nối mi'}
                </span>
                <span className="tabular-nums font-semibold text-slate-300">{safetyShieldPercent}% an toàn</span>
              </div>
            </>
          }
        />
      )}

      {/* Card 3: Tip > TB Shop */}
      {shouldShowGate(gateFilter, isSimTipPassed) && (
        <SimulationQuestGateCard
          id="gate-card-3"
          isExpanded={expandedGates.includes(3)}
          onToggle={() => onToggleGate(3)}
          containerToneClass={
            isSimTipPassed
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
          }
          icon={<HandCoins className={`w-4 h-4 shrink-0 ${isSimTipPassed ? 'text-emerald-400' : 'text-amber-400'}`} />}
          title={`3. Tip > ${(minTipRatioAboveShop * 100).toFixed(0)}% TB ${branchName}`}
          statusPill={
            isSimTipPassed ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ĐẠT CHUẨN
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> CẦN THÊM
              </span>
            )
          }
          metricDisplay={
            <div className="text-base sm:text-lg font-black text-white tabular-nums">
              {sliderTipRate.toFixed(1)}%{' '}
              <span className="text-xs font-normal text-slate-400">(chuẩn ≥ {targetTipRatePercent}%)</span>
              {Math.abs(sliderTipRate - staffTipRatePercent) > 0.1 && (
                <span className="text-[10px] font-normal text-amber-400 ml-1.5">(Thực tế: {staffTipRatePercent}%)</span>
              )}
            </div>
          }
          percent={simTipPercent}
          percentClassName={isSimTipPassed ? 'text-emerald-400' : 'text-amber-400'}
          progressStatus={isSimTipPassed ? 'success' : 'normal'}
          collapsedHint={
            isSimTipPassed
              ? `✓ Đạt chuẩn (Dự phóng: ${sliderTipRate.toFixed(1)}%)`
              : `⚡ Chưa đạt mốc (Dự phóng: ${sliderTipRate.toFixed(1)}% · Chuẩn: ≥${targetTipRatePercent}%)`
          }
          expandedContent={
            <>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[10px] space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span className="flex items-center gap-1 text-rose-400">
                    💡 TB {branchName} + {Math.round(minTipRatioAboveShop * 100)}% của {branchName}
                  </span>
                  <span className="text-emerald-400 font-extrabold tabular-nums">≥ {targetTipRatePercent}%</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center py-1 border-t border-slate-700/50">
                  <div className="bg-slate-900/60 p-1 rounded-lg">
                    <div className="text-slate-400 text-[9px] truncate">TB {branchShortName}</div>
                    <div className="text-slate-200 font-black tabular-nums">{shopTipRatePercent}%</div>
                  </div>
                  <div className="bg-slate-900/60 p-1 rounded-lg">
                    <div className="text-slate-400 text-[9px] truncate">
                      +{Math.round(minTipRatioAboveShop * 100)}% {branchShortName}
                    </div>
                    <div className="text-amber-400 font-black tabular-nums">+{shopBonusPercent}%</div>
                  </div>
                  <div className="bg-slate-900/60 p-1 rounded-lg border border-emerald-500/30">
                    <div className="text-emerald-400 text-[9px]">Mục tiêu</div>
                    <div className="text-emerald-300 font-black tabular-nums">≥ {targetTipRatePercent}%</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div>
                  <div className="text-slate-400">Ca nhận tip</div>
                  <div className="text-white font-bold text-xs tabular-nums mt-0.5">
                    {metrics.tippedOrdersCount || Math.round((metrics.ordersCount || 0) * (staffTipRate || 0))}/
                    {metrics.ordersCount || 0} ca
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Tổng tiền tip</div>
                  <div className="text-emerald-400 font-bold text-xs tabular-nums mt-0.5">
                    {formatVnd(metrics.totalTip)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>
                  {isTipPassed ? `✓ Vượt chuẩn (+${tipExcessPercent}%)` : `⚡ Thiếu ${tipGapPercent}% để đạt chuẩn`}
                </span>
                <span className="tabular-nums font-semibold text-slate-300">
                  TB {branchName}: {shopTipRatePercent}%
                </span>
              </div>
            </>
          }
        />
      )}
    </>
  );
};
