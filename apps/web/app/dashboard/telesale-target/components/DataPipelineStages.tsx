'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import { CheckCircle2, Heart, Gift, Bell, Phone } from 'lucide-react';
import { TelesalePipelineStage, TelesalePipelineStageKey } from '@mos-lab/shared';
import { getKpiColorClasses, getKpiProgressStroke } from '../utils/kpi-color-utils';

interface DataPipelineStagesProps {
  stages: TelesalePipelineStage[];
  onSelectStage: (stage: TelesalePipelineStage) => void;
}

const STAGE_PROMO_CONFIG: Record<
  TelesalePipelineStageKey,
  {
    badgeText: string;
    badgeStyle: string;
    promoText: string;
    promoStyle: string;
    promoIcon: string;
    titleColor: string;
  }
> = {
  '0_30': {
    badgeText: 'Chu kỳ',
    badgeStyle: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30',
    promoText: 'BH kiểu Úc · Giữ giá',
    promoStyle: 'bg-zinc-950/80 border-zinc-800 text-emerald-300/90',
    promoIcon: '🛡️',
    titleColor: 'text-emerald-400/90',
  },
  '31_60': {
    badgeText: 'Miss You',
    badgeStyle: 'bg-blue-950/60 text-blue-400 border-blue-500/30',
    promoText: 'Không giảm · Kịch bản tự nhiên',
    promoStyle: 'bg-zinc-950/80 border-zinc-800 text-blue-300/90',
    promoIcon: '💬',
    titleColor: 'text-blue-400/90',
  },
  '61_120': {
    badgeText: '30% OFF',
    badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold',
    promoText: 'Ưu đãi 30% mời quay lại',
    promoStyle: 'bg-amber-950/30 border-amber-500/30 text-amber-300 font-bold',
    promoIcon: '🎁',
    titleColor: 'text-amber-400/90',
  },
  gt_120: {
    badgeText: '50% OFF',
    badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold',
    promoText: 'Ưu đãi 50% "Cua Lại Vợ Bầu"',
    promoStyle: 'bg-rose-950/30 border-rose-500/30 text-rose-300 font-bold',
    promoIcon: '🔥',
    titleColor: 'text-purple-400/90',
  },
};

export const DataPipelineStages: React.FC<DataPipelineStagesProps> = ({ stages, onSelectStage }) => {
  const { token } = theme.useToken();

  const getStageIcon = (key: TelesalePipelineStageKey) => {
    switch (key) {
      case '0_30':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case '31_60':
        return <Heart className="w-3.5 h-3.5 text-blue-400" />;
      case '61_120':
        return <Gift className="w-3.5 h-3.5 text-amber-400" />;
      case 'gt_120':
        return <Bell className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/60 via-zinc-950/90 to-zinc-950 border border-zinc-800/90 p-3.5 glass-card shadow-2xl backdrop-blur-md h-full flex flex-col justify-between">
      {/* 1. Top Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
          🎯 4 PHỄU DATA PIPELINE{' '}
          <span className="text-zinc-500 font-normal text-[10px]">(NGUỒN DATA CHO KPI THÁNG)</span>
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">Chu kỳ Wings</span>
      </div>

      {/* 2. 2x2 Muted Grid */}
      <div className="grid grid-cols-2 gap-2 my-auto">
        {stages.map((stage) => {
          const percent = Math.round((stage.doneActual / (stage.doneTarget || 1)) * 100);
          const isOver100 = percent > 100;
          const comboLiveActual = stage.comboLiveDoneActual || 0;
          const kpiColors = getKpiColorClasses(percent);
          const progressStroke = getKpiProgressStroke(percent, token);
          const promo = STAGE_PROMO_CONFIG[stage.key] || {
            badgeText: stage.subLabel,
            badgeStyle: 'bg-zinc-800 text-zinc-300',
            promoText: stage.description,
            promoStyle: 'bg-zinc-950 border-zinc-800 text-zinc-300',
            promoIcon: '🎁',
            titleColor: 'text-zinc-200',
          };

          return (
            <div
              key={stage.key}
              onClick={() => onSelectStage(stage)}
              className="cursor-pointer rounded-2xl bg-zinc-950/60 border border-zinc-800/90 hover:border-zinc-700 p-2.5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg group"
            >
              <div>
                {/* Header & Badges */}
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`font-mono font-bold text-[11px] flex items-center gap-1 ${promo.titleColor}`}>
                    {getStageIcon(stage.key)}
                    <span>{stage.label}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-mono border ${promo.badgeStyle}`}>
                      {promo.badgeText}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${kpiColors.badgeClass}`}>
                      {kpiColors.badgeLabel}
                    </span>
                  </div>
                </div>

                {/* Numbers & Progress */}
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-black font-mono text-zinc-100 tabular-nums">{stage.doneActual}</span>
                  <span className="text-[10px] font-mono text-zinc-500">/ {stage.doneTarget} Done</span>
                  <span className={`text-[9px] font-mono font-bold ml-auto tabular-nums ${kpiColors.textClass}`}>
                    {isOver100 ? `🔥 ${percent}%` : `${percent}%`}
                  </span>
                </div>

                <div className="w-full my-1">
                  <Progress
                    percent={Math.min(100, percent)}
                    strokeColor={progressStroke}
                    size="small"
                    showInfo={false}
                    className="!m-0"
                  />
                </div>

                {/* Combo & Pool count */}
                <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                  <span>
                    Combo: <strong className="text-purple-300/90">{comboLiveActual}</strong>
                  </span>
                  <span>
                    Pool: <strong className="text-zinc-200">{stage.totalAssignedCount} KH</strong>
                  </span>
                </div>

                {/* Khuyến Mãi / Chính Sách Card */}
                <div
                  className={`mt-1.5 px-2 py-1 rounded border flex items-center justify-between text-[9px] font-mono ${promo.promoStyle}`}
                >
                  <span className="flex items-center gap-1 truncate">
                    <span>{promo.promoIcon}</span> Khuyến mãi:
                  </span>
                  <span className="truncate ml-1 font-semibold">{promo.promoText}</span>
                </div>
              </div>

              {/* Muted Soft Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStage(stage);
                }}
                className="w-full py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 border border-zinc-800 hover:border-amber-500/30 text-[10px] font-mono font-medium transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm mt-1.5"
              >
                <Phone className="w-3 h-3 text-amber-400/80" />
                <span>Mở Pool &amp; Gọi</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Footer with Voucher & Birthday Priority */}
      <div className="pt-1.5 border-t border-zinc-800/70 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
        <span className="text-amber-300/90 flex items-center gap-1.5">
          <span>🎁</span> <strong>Ưu tiên Hot Leads:</strong> Voucher 100K &amp; Sinh nhật Tháng 10
        </span>
        <span className="text-zinc-500">100% Khách Hàng Chu Kỳ</span>
      </div>
    </section>
  );
};
