'use client';

import React from 'react';
import { Progress, Button, theme } from 'antd';
import { CheckCircle2, Heart, Gift, Bell, Phone } from 'lucide-react';
import { TelesalePipelineStage, TelesalePipelineStageKey } from '@mos-lab/shared';
import { getKpiColorClasses, getKpiProgressStroke } from '../utils/kpi-color-utils';

interface DataPipelineStagesProps {
  stages: TelesalePipelineStage[];
  onSelectStage: (stage: TelesalePipelineStage) => void;
}

export const DataPipelineStages: React.FC<DataPipelineStagesProps> = ({ stages, onSelectStage }) => {
  const { token } = theme.useToken();

  const getStageIcon = (key: TelesalePipelineStageKey) => {
    switch (key) {
      case '0_30':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case '31_60':
        return <Heart className="w-4 h-4 text-blue-400" />;
      case '61_120':
        return <Gift className="w-4 h-4 text-amber-400" />;
      case 'gt_120':
        return <Bell className="w-4 h-4 text-pink-400" />;
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-950/20 via-zinc-950/90 to-zinc-950 border border-amber-500/30 p-3.5 glass-card shadow-2xl backdrop-blur-md h-full flex flex-col justify-between">
      {/* 1. Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-amber-300 text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
            🔄 4 PHỄU DATA PIPELINE KHÁCH HÀNG
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">Khai thác data chu kỳ chuẩn Wings Lashes</span>
        </div>

        {/* 2. 4 Stage Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 my-1">
          {stages.map((stage) => {
            const percent = Math.round((stage.doneActual / (stage.doneTarget || 1)) * 100);
            const isOver100 = percent > 100;
            const comboLiveActual = stage.comboLiveDoneActual || 0;
            const kpiColors = getKpiColorClasses(percent);
            const progressStroke = getKpiProgressStroke(percent, token);

            return (
              <div
                key={stage.key}
                onClick={() => onSelectStage(stage)}
                className={`cursor-pointer rounded-2xl bg-black/50 border border-zinc-800/90 hover:border-amber-400/60 p-2.5 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl group relative overflow-hidden ${
                  isOver100 ? 'border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]' : ''
                }`}
              >
                <div>
                  {/* Top Header & Tag */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      {getStageIcon(stage.key)}
                      <div className="truncate">
                        <div className="font-mono text-[11px] font-bold text-zinc-200 truncate">{stage.label}</div>
                        <div className="text-[9px] font-black uppercase text-amber-300 tracking-wide truncate">
                          {stage.subLabel}
                        </div>
                      </div>
                    </div>
                    <span className={`px-1.5 py-0.2 text-[8px] font-bold rounded shrink-0 ${kpiColors.badgeClass}`}>
                      {kpiColors.badgeLabel}
                    </span>
                  </div>

                  {/* Target & Done Realtime Metric */}
                  <div className="my-1.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2 font-mono">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                      <span className="font-semibold text-zinc-300">Khách Lẻ (KPI):</span>
                      <span className="font-bold text-amber-400">{stage.doneTarget} Done</span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-zinc-100 tabular-nums">{stage.doneActual}</span>
                        <span className="text-[10px] text-zinc-500 font-normal">/ {stage.doneTarget}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold tabular-nums ${kpiColors.textClass} ${
                          isOver100 ? 'animate-pulse font-black' : ''
                        }`}
                      >
                        {isOver100 ? `🔥 ${percent}%` : `${percent}%`}
                      </span>
                    </div>

                    <Progress
                      percent={Math.min(100, percent)}
                      strokeColor={progressStroke}
                      size="small"
                      showInfo={false}
                      className="mt-1"
                    />

                    {/* Sub Row: Combo Live Tracking & Pool count */}
                    <div className="mt-1.5 pt-1 border-t border-zinc-800/80 flex items-center justify-between text-[9px]">
                      <span className="text-purple-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Combo:{' '}
                        <strong>{comboLiveActual}</strong>
                      </span>
                      <span className="text-zinc-400">
                        Pool: <strong className="text-zinc-200">{stage.totalAssignedCount} KH</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-2 pt-1 border-t border-zinc-800/60">
                  <Button
                    size="small"
                    type="primary"
                    block
                    icon={<Phone className="w-3 h-3" />}
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-[10px] h-6 rounded-lg group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400 transition-all flex items-center justify-center gap-1"
                  >
                    Mở Pool Khách &amp; Gọi
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Footer Banner */}
      <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <span>Hot Leads ưu tiên: Voucher 100K &amp; Sinh nhật Tháng 10</span>
        <span>Nhấn vào thẻ để mở Drawer danh sách khách hàng và gọi OmiCall</span>
      </div>
    </section>
  );
};
