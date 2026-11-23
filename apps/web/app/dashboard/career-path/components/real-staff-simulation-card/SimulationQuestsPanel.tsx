'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { CheckCircle2, LayoutGrid, SlidersHorizontal, Zap } from 'lucide-react';
import type { BananaTransactionCategory, StaffCareerStatus } from '@mos-lab/shared';
import { formatCareerRoleName } from '../../career-path.constants';
import { WingRoleLabel } from '../IslandGameIcon';
import type { CareerBibleTopic } from '../CareerBibleDrawer';
import { SimulationMobileQuestBadges } from './SimulationMobileQuestBadges';
import { SimulationQuestGateList } from './SimulationQuestGateList';
import type { GateFilter, GateViewMode, QuestMetricsSummary } from './simulationTypesAndHelpers';

interface SimulationQuestsPanelProps {
  status: StaffCareerStatus;
  questMetrics: QuestMetricsSummary;
  isTargetCvPlusPlus: boolean;
  minHappinessConfig: number;
  localOrders: number;
  sliderTipRate: number;
  gateFilter: GateFilter;
  onGateFilterChange: (filter: GateFilter) => void;
  expandedGates: number[];
  onToggleGate: (gateIndex: number) => void;
  onSetGateViewMode: (mode: GateViewMode) => void;
  loadingAction?: boolean;
  onActivateTrial?: () => void;
  onPromote?: () => void;
  onSwitchSpecialist?: () => void;
  onOpenBananaDrawer?: (category: BananaTransactionCategory) => void;
  onOpenBibleTopic?: (topic: CareerBibleTopic) => void;
}

export const SimulationQuestsPanel: React.FC<SimulationQuestsPanelProps> = ({
  status,
  questMetrics,
  isTargetCvPlusPlus,
  minHappinessConfig,
  localOrders,
  sliderTipRate,
  gateFilter,
  onGateFilterChange,
  expandedGates,
  onToggleGate,
  onSetGateViewMode,
  loadingAction,
  onActivateTrial,
  onPromote,
  onSwitchSpecialist,
  onOpenBananaDrawer,
  onOpenBibleTopic,
}) => {
  const { passedQuestsCount, xpPercent, isMasterTech, isQaPassed, hasFailedQa } = questMetrics;
  const currentRoleLabel = formatCareerRoleName(status.currentRole);
  const targetRoleLabel = formatCareerRoleName(status.targetRole);

  return (
    <div className="xl:col-span-5 space-y-4">
      {/* HERO GAMIFIED LEVEL XP PROGRESS BAR & 6-QUEST CHECKPOINTS */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/95 dark:bg-slate-950 border border-slate-800 shadow-md relative overflow-hidden text-white">
        {/* Subtle decorative ambient glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Level Target & Remaining Info */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100 inline-flex items-center gap-1.5 flex-wrap">
                  <span>Tiến Trình Thăng Cấp:</span>
                  <WingRoleLabel text={currentRoleLabel} />
                  <span className="text-pink-400">➔</span>
                  <WingRoleLabel text={targetRoleLabel} />
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tabular-nums bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  {passedQuestsCount}/6 ải ({xpPercent}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                {passedQuestsCount === 6 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Xuất sắc vượt qua toàn bộ 6 ải! Sẵn sàng duyệt thăng hạng.
                  </span>
                ) : (
                  <span>
                    Còn thiếu <strong className="text-amber-400 font-bold">{6 - passedQuestsCount} ải</strong> để nhận
                    danh hiệu{' '}
                    <strong className="text-white font-bold inline-flex items-center">
                      <WingRoleLabel text={targetRoleLabel} />
                    </strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {/* Quick Filter chips: All, Unpassed, Passed */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => onGateFilterChange('ALL')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 ${
                  gateFilter === 'ALL' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Tất cả</span>
                <span className="text-[9px] px-1 rounded-full bg-white/10 tabular-nums">6</span>
              </button>
              <button
                type="button"
                onClick={() => onGateFilterChange('UNPASSED')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 ${
                  gateFilter === 'UNPASSED'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>⚡ Cần vượt</span>
                <span className="text-[9px] px-1 rounded-full bg-amber-400/20 text-amber-300 tabular-nums">
                  {6 - passedQuestsCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onGateFilterChange('PASSED')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 ${
                  gateFilter === 'PASSED'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>✓ Đã đạt</span>
                <span className="text-[9px] px-1 rounded-full bg-emerald-400/20 text-emerald-300 tabular-nums">
                  {passedQuestsCount}
                </span>
              </button>
            </div>

            {/* Toggle all simple vs expanded (Desktop only: Mobile uses 6 Large Badges) */}
            <div className="hidden md:inline-flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => onSetGateViewMode('simple')}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  expandedGates.length === 0
                    ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Thu gọn</span>
              </button>
              <button
                type="button"
                onClick={() => onSetGateViewMode('expanded')}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  expandedGates.length > 0
                    ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Chi tiết 6 ải</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6-Segment XP Bar */}
        <div className="relative z-10 pt-3 pb-3">
          <div className="grid grid-cols-6 gap-1.5 h-2.5 rounded-full bg-slate-800/80 p-0.5 border border-white/10">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isPassed = idx < passedQuestsCount;
              return (
                <div
                  key={idx}
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPassed
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                      : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* MOBILE LƯỚI 6 HUY HIỆU TRÒN LỚN (3x2) */}
        <SimulationMobileQuestBadges
          status={status}
          questMetrics={questMetrics}
          localOrders={localOrders}
          onOpenBibleTopic={onOpenBibleTopic}
        />

        {/* 6 QUESTS PROGRESSION CARDS (DETAILED LIST) */}
        <SimulationQuestGateList
          status={status}
          questMetrics={questMetrics}
          isTargetCvPlusPlus={isTargetCvPlusPlus}
          minHappinessConfig={minHappinessConfig}
          localOrders={localOrders}
          sliderTipRate={sliderTipRate}
          gateFilter={gateFilter}
          expandedGates={expandedGates}
          onToggleGate={onToggleGate}
          onOpenBananaDrawer={onOpenBananaDrawer}
        />

        {/* INTEGRATED ACTION FOOTER (Desktop only: mobile uses Sticky Bottom Bar) */}
        <div className="hidden md:flex relative z-10 pt-3.5 border-t border-slate-800 items-center justify-between gap-4 flex-wrap mt-4">
          <div>
            <div className="text-xs sm:text-sm font-black text-white inline-flex items-center gap-1.5 flex-wrap">
              <span>{status.staffName}:</span>
              <WingRoleLabel text={currentRoleLabel} />
              <span className="text-pink-400">➔</span>
              <WingRoleLabel text={targetRoleLabel} />
            </div>
            <div className="text-[10px] text-amber-400 font-mono mt-0.5">
              {status.qualifiedQuests.allPassed ? (
                <span className="inline-flex items-center gap-1 flex-wrap">
                  <span>🎉 Đã đạt toàn bộ 6 ải! Sẵn sàng duyệt thăng cấp lên</span>
                  <WingRoleLabel text={targetRoleLabel} />
                  <span>.</span>
                </span>
              ) : isMasterTech ? (
                '⭐ Đề xuất nhánh Master Tech: Đạt 4/4 tiêu chí kỹ thuật tay nghề.'
              ) : (
                `Đã đạt ${passedQuestsCount}/6 ải cốt lõi · Cần hoàn thành các ải còn lại để mở khóa duyệt thăng cấp.`
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status.status !== 'TRIAL_GATE' && !status.qualifiedQuests.allPassed && onActivateTrial && (
              <Tooltip
                title={
                  !isQaPassed
                    ? hasFailedQa
                      ? 'Không thể mở ải: Chuyên Viên có bài kiểm tra QA/QC tác phong hoặc phòng mi bị FAILED'
                      : 'Không thể mở ải: Chuyên Viên phải mời QA/QC kiểm tra định kỳ ít nhất 1 lần/tuần'
                    : undefined
                }
              >
                <span>
                  <button
                    type="button"
                    onClick={onActivateTrial}
                    disabled={loadingAction || !isQaPassed}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Mở Ải Trùm Cuối (30 Ngày)
                  </button>
                </span>
              </Tooltip>
            )}

            {status.qualifiedQuests.allPassed &&
              (onPromote ? (
                <button
                  type="button"
                  onClick={onPromote}
                  disabled={loadingAction}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-pink-500 via-rose-500 to-emerald-500 text-white shadow-md shadow-pink-500/25 hover:opacity-95 transition-all cursor-pointer animate-pulse inline-flex items-center gap-1.5"
                >
                  <span>🎉 Duyệt Thăng Hạng</span>
                  <WingRoleLabel text={targetRoleLabel} />
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50">
                  Chờ Super Admin (Danny) duyệt
                </span>
              ))}

            {isMasterTech && onSwitchSpecialist && (
              <button
                type="button"
                onClick={onSwitchSpecialist}
                disabled={loadingAction}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
              >
                ⭐ Chuyển Nhánh Master Tech
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
