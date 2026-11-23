'use client';

import React from 'react';
import { Progress } from 'antd';
import { ChevronDown } from 'lucide-react';

interface SimulationQuestGateCardProps {
  id: string;
  isExpanded: boolean;
  onToggle: () => void;
  containerToneClass: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  statusPill: React.ReactNode;
  metricDisplay: React.ReactNode;
  percent: number;
  percentClassName: string;
  progressStatus: 'success' | 'normal' | 'exception';
  collapsedHint: React.ReactNode;
  expandedContent: React.ReactNode;
}

export const SimulationQuestGateCard: React.FC<SimulationQuestGateCardProps> = ({
  id,
  isExpanded,
  onToggle,
  containerToneClass,
  icon,
  title,
  statusPill,
  metricDisplay,
  percent,
  percentClassName,
  progressStatus,
  collapsedHint,
  expandedContent,
}) => (
  <div
    id={id}
    className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${containerToneClass}`}
  >
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggle();
      }}
      className="p-3 sm:p-3.5 cursor-pointer select-none active:scale-[0.99] transition-transform flex flex-col gap-1.5"
    >
      {/* Header row: Title + Status Badge + Chevron */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {statusPill}
          <div
            className={`p-1 rounded-lg bg-white/5 transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-rose-400' : 'text-slate-400'
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Metric row */}
      <div className="flex items-baseline justify-between gap-2 mt-0.5">
        {metricDisplay}
        <span className={`text-[11px] font-bold tabular-nums ${percentClassName}`}>{percent}%</span>
      </div>

      {/* Progress bar */}
      <Progress percent={percent} size="small" showInfo={false} status={progressStatus} className="m-0 mt-0.5" />

      {/* Collapsed quick hint */}
      {!isExpanded && (
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
          <span className="truncate">{collapsedHint}</span>
          <span className="text-rose-400/80 hover:text-rose-300 text-[10px] font-semibold shrink-0">Chi tiết ▾</span>
        </div>
      )}
    </div>

    {/* Expanded details */}
    {isExpanded && (
      <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 border-t border-white/10 text-[11px] space-y-2 pt-2.5">
        {expandedContent}
      </div>
    )}
  </div>
);
