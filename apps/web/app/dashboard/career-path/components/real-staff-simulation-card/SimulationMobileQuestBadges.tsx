'use client';

import React from 'react';
import { Bug, Eye, HandCoins, Heart, ShieldCheck } from 'lucide-react';
import type { StaffCareerStatus } from '@mos-lab/shared';
import type { CareerBibleTopic } from '../CareerBibleDrawer';
import type { QuestMetricsSummary } from './simulationTypesAndHelpers';

interface SimulationMobileQuestBadgesProps {
  status: StaffCareerStatus;
  questMetrics: QuestMetricsSummary;
  localOrders: number;
  onOpenBibleTopic?: (topic: CareerBibleTopic) => void;
}

interface MobileQuestBadgeItem {
  testId: string;
  topic: CareerBibleTopic;
  isPassed: boolean;
  iconBoxClass: string;
  icon: React.ReactNode;
  valueText: string;
  subText: string;
  unpassedContainerClass?: string;
}

export const SimulationMobileQuestBadges: React.FC<SimulationMobileQuestBadgesProps> = ({
  status,
  questMetrics,
  localOrders,
  onOpenBibleTopic,
}) => {
  const { metrics } = status;
  const {
    targetOrders,
    targetMaxFix,
    minTipRatioAboveShop,
    minBananaCount,
    minHappinessIndex,
    staffTipRatePercent,
    targetTipRatePercent,
    requiredQaAudits,
    totalQaAudits,
    isQaPassed,
    bananaCount,
    isBananaPassed,
    happinessIndex,
    isHiPassed,
    isFixPassed,
    isSimOrdersPassed,
    isSimTipPassed,
    passedQuestsCount,
  } = questMetrics;

  const badgeItems: MobileQuestBadgeItem[] = [
    {
      testId: 'badge-quest-orders',
      topic: 'ORDERS',
      isPassed: isSimOrdersPassed,
      iconBoxClass: isSimOrdersPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-amber-400',
      icon: <Eye className="w-5 h-5" />,
      valueText: `${localOrders}/${targetOrders}`,
      subText: isSimOrdersPassed ? `✓ ${targetOrders} Mi` : `Thiếu ${Math.max(0, targetOrders - localOrders)}`,
      unpassedContainerClass: 'bg-slate-900/90 border-slate-800 text-slate-300',
    },
    {
      testId: 'badge-quest-fix',
      topic: 'FIX',
      isPassed: isFixPassed,
      iconBoxClass: isFixPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400',
      icon: <Bug className="w-5 h-5" />,
      valueText: `${((metrics.fixRate || 0) * 100).toFixed(1)}%`,
      subText: isFixPassed
        ? `✓ Fix ≤ ${(targetMaxFix * 100).toFixed(1)}%`
        : `✕ Quá ${(targetMaxFix * 100).toFixed(1)}%`,
      unpassedContainerClass: 'bg-rose-500/10 border-rose-500/40 text-rose-300',
    },
    {
      testId: 'badge-quest-tip',
      topic: 'TIP_RATIO',
      isPassed: isSimTipPassed,
      iconBoxClass: isSimTipPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400',
      icon: <HandCoins className="w-5 h-5" />,
      valueText: `${staffTipRatePercent}%`,
      subText: isSimTipPassed ? `✓ Tip +${Math.round(minTipRatioAboveShop * 100)}%` : `Cần ${targetTipRatePercent}%`,
    },
    {
      testId: 'badge-quest-qa',
      topic: 'QA',
      isPassed: isQaPassed,
      iconBoxClass: isQaPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400',
      icon: <ShieldCheck className="w-5 h-5" />,
      valueText: `${totalQaAudits}/${requiredQaAudits} bài`,
      subText: isQaPassed ? `✓ ${requiredQaAudits} Lần QA` : 'Thiếu bài',
    },
    {
      testId: 'badge-quest-banana',
      topic: 'BANANA',
      isPassed: isBananaPassed,
      iconBoxClass: isBananaPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-amber-400',
      icon: <span className="text-xl">🍌</span>,
      valueText: `${bananaCount}/${minBananaCount}`,
      subText: isBananaPassed ? `✓ ${minBananaCount} Chuối` : `Thiếu ${Math.max(0, minBananaCount - bananaCount)}`,
    },
    {
      testId: 'badge-quest-hi',
      topic: 'HI',
      isPassed: isHiPassed,
      iconBoxClass: isHiPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400',
      icon: <Heart className="w-5 h-5 fill-current/20" />,
      valueText: `${Math.round((happinessIndex || 0) * 100)}%`,
      subText: isHiPassed ? `✓ HI ≥ ${Math.round(minHappinessIndex * 100)}%` : 'Thiếu HI',
    },
  ];

  return (
    <div className="md:hidden space-y-2 my-3">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
        <span className="flex items-center gap-1.5 text-slate-200">
          <span>🛡️ 6 Ải Thăng Cấp</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 font-bold border border-pink-500/25 tabular-nums">
            {passedQuestsCount}/6 đạt
          </span>
        </span>
        <span className="text-[10px] text-pink-400 font-medium">Chạm xem Kinh Thánh 📖</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {badgeItems.map((item) => (
          <button
            key={item.testId}
            type="button"
            data-testid={item.testId}
            onClick={() => onOpenBibleTopic?.(item.topic)}
            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer relative ${
              item.isPassed
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : item.unpassedContainerClass || 'bg-amber-500/10 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-1 ${item.iconBoxClass}`}>
              {item.icon}
            </div>
            <div className="text-[11px] font-black tabular-nums text-white">{item.valueText}</div>
            <div className="text-[9px] font-bold text-slate-400 truncate max-w-full">{item.subText}</div>
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/10 text-slate-400 flex items-center justify-center text-[9px] font-bold">
              i
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
