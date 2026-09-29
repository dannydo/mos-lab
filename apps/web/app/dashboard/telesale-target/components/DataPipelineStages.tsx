'use client';

import React from 'react';
import { Progress, Button } from 'antd';
import { CheckCircle2, Heart, Gift, Bell, Phone } from 'lucide-react';
import { TelesalePipelineStage, TelesalePipelineStageKey } from '@mos-lab/shared';

interface DataPipelineStagesProps {
  stages: TelesalePipelineStage[];
  onSelectStage: (stage: TelesalePipelineStage) => void;
}

export const DataPipelineStages: React.FC<DataPipelineStagesProps> = ({ stages, onSelectStage }) => {
  const getStageHeaderBg = (key: TelesalePipelineStageKey) => {
    switch (key) {
      case '0_30':
        return 'from-emerald-950/40 to-zinc-950 border-emerald-500/30 hover:border-emerald-400';
      case '31_60':
        return 'from-blue-950/40 to-zinc-950 border-blue-500/30 hover:border-blue-400';
      case '61_120':
        return 'from-amber-950/40 to-zinc-950 border-amber-500/30 hover:border-amber-400';
      case 'gt_120':
        return 'from-purple-950/50 to-zinc-950 border-pink-500/40 hover:border-pink-400';
    }
  };

  const getStageIcon = (key: TelesalePipelineStageKey) => {
    switch (key) {
      case '0_30':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case '31_60':
        return <Heart className="w-5 h-5 text-blue-400" />;
      case '61_120':
        return <Gift className="w-5 h-5 text-amber-400" />;
      case 'gt_120':
        return <Bell className="w-5 h-5 text-pink-400" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-950 border border-amber-500/30 p-5 shadow-2xl backdrop-blur-md">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">
            Kế Hoạch Khai Thác Data Theo Chu Kỳ
          </span>
          <p className="text-zinc-400 text-xs mt-0.5">
            4 Phễu chăm sóc khách hàng &amp; Chỉ tiêu Done từng nhóm (Nhấn vào thẻ để mở Pool khách và gọi OmiCall)
          </p>
        </div>
        <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
          Quy trình chuẩn Wings Lashes
        </span>
      </div>

      {/* 4 Stage Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const percent = Math.min(100, Math.round((stage.doneActual / (stage.doneTarget || 1)) * 100));

          return (
            <div
              key={stage.key}
              onClick={() => onSelectStage(stage)}
              className={`cursor-pointer rounded-xl bg-gradient-to-b ${getStageHeaderBg(
                stage.key
              )} border p-4 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl group relative overflow-hidden`}
            >
              {/* Top Accent Icon & Badges */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStageIcon(stage.key)}
                    <div>
                      <div className="font-mono text-xs font-bold text-zinc-300">{stage.label}</div>
                      <div className="text-xs font-black uppercase text-amber-300 tracking-wide">{stage.subLabel}</div>
                    </div>
                  </div>
                  {stage.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-black rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      {stage.badge}
                    </span>
                  )}
                </div>

                {/* Target & Done Realtime Metric */}
                <div className="my-3 bg-black/40 border border-zinc-800/80 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span>Mục tiêu Done:</span>
                    <span className="font-bold text-amber-400 font-mono">{stage.doneTarget} Done</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black font-mono text-zinc-100 tabular-nums">
                        {stage.doneActual}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">/ {stage.doneTarget} Done</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-emerald-400">{percent}%</span>
                  </div>
                  <Progress percent={percent} size="small" showInfo={false} className="mt-1.5" />
                  <div className="text-[11px] text-zinc-400 mt-1 flex justify-between font-mono">
                    <span>Data trong pool:</span>
                    <span className="text-zinc-200 font-semibold">{stage.totalAssignedCount} KH</span>
                  </div>
                </div>

                {/* Summary points / Checklist */}
                <div className="space-y-1.5 my-2">
                  {stage.itemsSummary.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-zinc-300 leading-snug">
                      <span className="text-amber-400 text-[10px] mt-0.5">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Action / Note */}
              <div className="mt-3 pt-3 border-t border-zinc-800/60">
                <p className="text-[11px] text-zinc-400 italic mb-2.5 line-clamp-2">{stage.actionNote}</p>
                <Button
                  size="small"
                  type="primary"
                  block
                  icon={<Phone className="w-3.5 h-3.5" />}
                  className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs rounded-lg group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400 transition-all flex items-center justify-center"
                >
                  Mở Pool Khách &amp; Gọi
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
