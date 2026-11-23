'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Heart, ShieldCheck, XCircle } from 'lucide-react';
import type { BananaTransactionCategory, StaffCareerStatus } from '@mos-lab/shared';
import { SimulationQuestGateCard } from './SimulationQuestGateCard';
import type { GateFilter, QuestMetricsSummary } from './simulationTypesAndHelpers';

interface SimulationCultureAndQaGatesProps {
  status: StaffCareerStatus;
  questMetrics: QuestMetricsSummary;
  minHappinessConfig: number;
  gateFilter: GateFilter;
  expandedGates: number[];
  onToggleGate: (gateIndex: number) => void;
  onOpenBananaDrawer?: (category: BananaTransactionCategory) => void;
}

const shouldShowGate = (gateFilter: GateFilter, isPassed: boolean) =>
  gateFilter === 'ALL' || (gateFilter === 'PASSED' && isPassed) || (gateFilter === 'UNPASSED' && !isPassed);

export const SimulationCultureAndQaGates: React.FC<SimulationCultureAndQaGatesProps> = ({
  status,
  questMetrics,
  minHappinessConfig,
  gateFilter,
  expandedGates,
  onToggleGate,
  onOpenBananaDrawer,
}) => {
  const { metrics } = status;
  const {
    minBananaCount,
    requiredQaAudits,
    totalQaAudits,
    isQaPassed,
    hasFailedQa,
    qaProgressPercent,
    isHiPassed,
    hiPercent,
    hiProgressPercent,
    bananaCount,
    isBananaPassed,
    bananaProgressPercent,
  } = questMetrics;

  const qaAudit = metrics.qaAudit;

  return (
    <>
      {/* Card 4: QA/QC Định Kỳ */}
      {shouldShowGate(gateFilter, isQaPassed) && (
        <SimulationQuestGateCard
          id="gate-card-4"
          isExpanded={expandedGates.includes(4)}
          onToggle={() => onToggleGate(4)}
          containerToneClass={
            hasFailedQa
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              : !isQaPassed
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          }
          icon={
            <ShieldCheck
              className={`w-4 h-4 shrink-0 ${
                isQaPassed ? 'text-emerald-400' : hasFailedQa ? 'text-rose-400' : 'text-amber-400'
              }`}
            />
          }
          title={`4. QA/QC ≥ ${requiredQaAudits} lần / tháng`}
          statusPill={
            hasFailedQa ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                <XCircle className="w-3 h-3" /> FAILED
              </span>
            ) : !isQaPassed ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {totalQaAudits === 0 ? 'CHƯA KIỂM ĐỊNH' : 'THIẾU LƯỢT'}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ĐẠT CHUẨN
              </span>
            )
          }
          metricDisplay={
            <div className="text-base sm:text-lg font-black text-white tabular-nums">
              {totalQaAudits}{' '}
              <span className="text-xs font-normal text-slate-400">
                / {requiredQaAudits} lần (chuẩn ≥ {requiredQaAudits}L/tháng)
              </span>
            </div>
          }
          percent={qaProgressPercent}
          percentClassName={isQaPassed ? 'text-emerald-400' : hasFailedQa ? 'text-rose-400' : 'text-amber-400'}
          progressStatus={isQaPassed ? 'success' : hasFailedQa ? 'exception' : 'normal'}
          collapsedHint={
            isQaPassed
              ? '✓ Đạt định kỳ tác phong & phòng mi'
              : totalQaAudits === 0
                ? 'Chưa ghi nhận bài kiểm định (0 lần/tuần)'
                : `Đã kiểm định ${totalQaAudits}/${requiredQaAudits} lần`
          }
          expandedContent={
            <>
              <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div>
                  <div className="text-slate-400">Tác phong 5S</div>
                  <div className="font-bold text-xs mt-0.5">
                    {(qaAudit?.totalAudits || 0) === 0 ? (
                      <span className="text-slate-400">Chưa kiểm định</span>
                    ) : !hasFailedQa ? (
                      <span className="text-emerald-400">✓ Đạt chuẩn 5S</span>
                    ) : (
                      <span className="text-rose-400">Vi phạm</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Vệ sinh phòng mi</div>
                  <div className="font-bold text-xs mt-0.5">
                    {(qaAudit?.totalAudits || 0) === 0 ? (
                      <span className="text-slate-400">Chưa kiểm định</span>
                    ) : !hasFailedQa ? (
                      <span className="text-emerald-400">✓ Sạch sẽ</span>
                    ) : (
                      <span className="text-rose-400">Chưa đạt</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>
                  {hasFailedQa
                    ? 'Bị khóa do có bài FAILED'
                    : isQaPassed
                      ? '✓ Đạt kiểm định định kỳ tác phong & phòng mi'
                      : (qaAudit?.totalAudits || 0) === 0
                        ? 'Hệ thống chưa ghi nhận biên bản QA/QC (Định mức 1 lần/tuần)'
                        : 'Chưa đủ tối thiểu 1 lần/tuần'}
                </span>
                <span className="tabular-nums font-semibold text-slate-300">
                  {(qaAudit?.totalAudits || 0) === 0 ? '0 bài kiểm định' : `${qaAudit?.failedAudits ?? 0} bài Failed`}
                </span>
              </div>
            </>
          }
        />
      )}

      {/* Card 5: Chỉ Số HI (Teamwork) */}
      {shouldShowGate(gateFilter, isHiPassed) && (
        <SimulationQuestGateCard
          id="gate-card-5"
          isExpanded={expandedGates.includes(5)}
          onToggle={() => onToggleGate(5)}
          containerToneClass={
            isHiPassed
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
          }
          icon={
            <Heart
              className={`w-4 h-4 shrink-0 ${
                isHiPassed ? 'text-emerald-400 fill-emerald-400/20' : 'text-amber-400 fill-amber-400/20'
              }`}
            />
          }
          title={`5. Chỉ số HI > ${(minHappinessConfig * 100).toFixed(0)}%`}
          statusPill={
            isHiPassed ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> TIN YÊU
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> CẦN GẮN KẾT
              </span>
            )
          }
          metricDisplay={
            <div className="text-base sm:text-lg font-black text-white tabular-nums">
              {hiPercent}%{' '}
              <span className="text-xs font-normal text-slate-400">
                (chuẩn &gt; {(minHappinessConfig * 100).toFixed(0)}%)
              </span>
            </div>
          }
          percent={hiProgressPercent}
          percentClassName={isHiPassed ? 'text-emerald-400' : 'text-pink-400'}
          progressStatus={isHiPassed ? 'success' : 'normal'}
          collapsedHint={
            metrics.totalHi
              ? `Thả tim: ${metrics.happyCount ?? 0}/${metrics.totalHi} (${hiPercent}%)`
              : `Chỉ số: ${hiPercent}%`
          }
          expandedContent={
            <>
              <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div>
                  <div className="text-slate-400">Teamwork Check-in/out</div>
                  <div className="font-bold text-xs mt-0.5">
                    <span className={isHiPassed ? 'text-emerald-400' : 'text-amber-400'}>
                      {isHiPassed ? '✓ Rất gắn kết' : 'Cần tương trợ'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Đồng đội thả tim</div>
                  <div className="text-pink-400 font-bold text-xs mt-0.5 tabular-nums">
                    {metrics.totalHi
                      ? `${metrics.happyCount ?? 0}/${metrics.totalHi} (${hiPercent}%)`
                      : `${hiPercent}%`}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                {isHiPassed
                  ? '✓ Đồng đội yêu quý, tinh thần tương trợ tuyệt vời khi check-in/out.'
                  : '⚡ Nhân viên đồng đội tự thả tim cho nhau mỗi khi check-in/out ca làm việc để ghi nhận tinh thần tương trợ.'}
              </div>
            </>
          }
        />
      )}

      {/* Card 6: Chuối Yêu Thương */}
      {shouldShowGate(gateFilter, isBananaPassed) && (
        <SimulationQuestGateCard
          id="gate-card-6"
          isExpanded={expandedGates.includes(6)}
          onToggle={() => onToggleGate(6)}
          containerToneClass={
            isBananaPassed
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
          }
          icon={<span className="text-base shrink-0">🍌</span>}
          title={`6. Chuối Yêu Thương ≥ ${minBananaCount}`}
          statusPill={
            isBananaPassed ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ĐẠT CHUẨN
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> CHƯA ĐỦ
              </span>
            )
          }
          metricDisplay={
            <div className="text-base sm:text-lg font-black text-amber-400 tabular-nums">
              {bananaCount} 🍌{' '}
              <span className="text-xs font-normal text-slate-400">(chuẩn ≥ {minBananaCount} Chuối / tháng)</span>
            </div>
          }
          percent={bananaProgressPercent}
          percentClassName={isBananaPassed ? 'text-emerald-400' : 'text-amber-400'}
          progressStatus={isBananaPassed ? 'success' : 'normal'}
          collapsedHint={
            isBananaPassed
              ? `✓ Đạt chuẩn yêu thương (≥ ${minBananaCount} chuối)`
              : `⚡ Thiếu ${Math.max(0, minBananaCount - bananaCount)} chuối (chuẩn ≥ ${minBananaCount} chuối/tháng)`
          }
          expandedContent={
            <>
              <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div>
                  <div className="text-slate-400">Thiên thần khác tặng</div>
                  <div className="text-amber-400 font-bold text-xs mt-0.5 tabular-nums">{bananaCount} Chuối</div>
                </div>
                <div>
                  <div className="text-slate-400">Đồng đội quý mến</div>
                  <div className="font-bold text-xs mt-0.5">
                    <span className={bananaCount >= minBananaCount ? 'text-emerald-400' : 'text-amber-400'}>
                      {bananaCount >= minBananaCount
                        ? `Đạt chuẩn (≥ ${minBananaCount})`
                        : bananaCount >= Math.round(minBananaCount * 0.75)
                          ? 'Đang nỗ lực'
                          : 'Cần gắn kết'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-slate-400 italic">
                * Chỉ đếm chuối từ thiên thần khác tặng lúc check-in (loại trừ tự tặng &amp; checkout).
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span className="truncate">
                  {isBananaPassed
                    ? `✓ Đạt chuẩn ≥ ${minBananaCount} chuối trong tháng hoàn tất`
                    : `⚡ Còn thiếu ${Math.max(0, minBananaCount - bananaCount)} chuối trong tháng hoàn tất`}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-300">1T ≥ {minBananaCount}</span>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBananaDrawer?.('CHECKIN');
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <span>⏰</span>
                  <span>Xem danh sách Chuối Check-in tính điểm</span>
                  <span className="text-[10px] text-emerald-300 font-mono">({bananaCount} chuối) ➔</span>
                </button>
              </div>
            </>
          }
        />
      )}
    </>
  );
};
