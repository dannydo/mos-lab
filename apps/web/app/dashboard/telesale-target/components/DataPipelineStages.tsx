'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import { CheckCircle2, Heart, Gift, Bell, Phone } from 'lucide-react';
import { TelesalePipelineStage, TelesalePipelineStageKey } from '@mos-lab/shared';
import { getKpiColorClasses, getKpiProgressStroke } from '../utils/kpi-color-utils';
import { useTheme } from '../../../../context/ThemeContext';

interface DataPipelineStagesProps {
  stages: TelesalePipelineStage[];
  onSelectStage: (stage: TelesalePipelineStage) => void;
}

const getStagePromoConfig = (key: TelesalePipelineStageKey, isDark: boolean) => {
  switch (key) {
    case '0_30':
      return {
        badgeText: 'Chu kỳ',
        badgeStyle: isDark
          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
          : 'bg-emerald-100 text-emerald-800 border-emerald-300',
        promoText: 'BH kiểu Úc · Giữ giá',
        promoStyle: isDark
          ? 'bg-zinc-950/80 border-zinc-800 text-emerald-300/90'
          : 'bg-emerald-50/80 border-emerald-200 text-emerald-800',
        promoIcon: '🛡️',
        titleColor: isDark ? 'text-emerald-400/90' : 'text-emerald-700',
      };
    case '31_60':
      return {
        badgeText: 'Miss You',
        badgeStyle: isDark
          ? 'bg-blue-950/60 text-blue-400 border-blue-500/30'
          : 'bg-blue-100 text-blue-800 border-blue-300',
        promoText: 'Không giảm · Kịch bản tự nhiên',
        promoStyle: isDark
          ? 'bg-zinc-950/80 border-zinc-800 text-blue-300/90'
          : 'bg-blue-50/80 border-blue-200 text-blue-800',
        promoIcon: '💬',
        titleColor: isDark ? 'text-blue-400/90' : 'text-blue-700',
      };
    case '61_120':
      return {
        badgeText: '30% OFF',
        badgeStyle: isDark
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
          : 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
        promoText: 'Ưu đãi 30% mời quay lại',
        promoStyle: isDark
          ? 'bg-amber-950/30 border-amber-500/30 text-amber-300 font-bold'
          : 'bg-amber-50/80 border-amber-200 text-amber-800 font-bold',
        promoIcon: '🎁',
        titleColor: isDark ? 'text-amber-400/90' : 'text-amber-700',
      };
    case 'gt_120':
    default:
      return {
        badgeText: '50% OFF',
        badgeStyle: isDark
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
          : 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        promoText: 'Ưu đãi 50% "Cua Lại Vợ Bầu"',
        promoStyle: isDark
          ? 'bg-rose-950/30 border-rose-500/30 text-rose-300 font-bold'
          : 'bg-rose-50/80 border-rose-200 text-rose-800 font-bold',
        promoIcon: '🔥',
        titleColor: isDark ? 'text-purple-400/90' : 'text-purple-700',
      };
  }
};

export const DataPipelineStages: React.FC<DataPipelineStagesProps> = ({ stages, onSelectStage }) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const { token } = theme.useToken();

  const getStageIcon = (key: TelesalePipelineStageKey) => {
    switch (key) {
      case '0_30':
        return <CheckCircle2 className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />;
      case '31_60':
        return <Heart className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />;
      case '61_120':
        return <Gift className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />;
      case 'gt_120':
        return <Bell className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />;
    }
  };

  return (
    <section
      className={`relative overflow-hidden rounded-3xl ${
        isDark
          ? 'bg-gradient-to-b from-zinc-900/60 via-zinc-950/90 to-zinc-950 border-zinc-800/90 glass-card shadow-2xl'
          : 'bg-white border-slate-200/90 shadow-sm'
      } border p-3.5 backdrop-blur-md h-full flex flex-col justify-between`}
    >
      {/* 1. Top Header */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`${
            isDark ? 'text-zinc-300' : 'text-slate-800'
          } text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5`}
        >
          🎯 4 PHỄU DATA PIPELINE{' '}
          <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} font-normal text-[10px]`}>
            (NGUỒN DATA CHO KPI THÁNG)
          </span>
        </span>
        <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'} font-mono`}>Chu kỳ Wings</span>
      </div>

      {/* 2. 2x2 Muted Grid */}
      <div className="grid grid-cols-2 gap-2 my-auto">
        {stages.map((stage) => {
          const percent = Math.round((stage.doneActual / (stage.doneTarget || 1)) * 100);
          const isOver100 = percent > 100;
          const comboLiveActual = stage.comboLiveDoneActual || 0;
          const kpiColors = getKpiColorClasses(percent, false, isDark);
          const progressStroke = getKpiProgressStroke(percent, token);
          const promo = getStagePromoConfig(stage.key, isDark);

          return (
            <div
              key={stage.key}
              onClick={() => onSelectStage(stage)}
              className={`cursor-pointer rounded-2xl ${
                isDark
                  ? 'bg-zinc-950/60 border-zinc-800/90 hover:border-zinc-700'
                  : 'bg-slate-50/70 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md'
              } border p-2.5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg group`}
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
                  <span
                    className={`text-lg font-black font-mono ${
                      isDark ? 'text-zinc-100' : 'text-slate-900'
                    } tabular-nums`}
                  >
                    {stage.doneActual}
                  </span>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    / {stage.doneTarget} Done
                  </span>
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
                <div
                  className={`flex justify-between text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}
                >
                  <span>
                    Combo:{' '}
                    <strong className={isDark ? 'text-purple-300/90' : 'text-purple-700'}>{comboLiveActual}</strong>
                  </span>
                  <span>
                    Pool:{' '}
                    <strong className={isDark ? 'text-zinc-200' : 'text-slate-800'}>
                      {stage.totalAssignedCount} KH
                    </strong>
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
                className={`w-full py-1.5 rounded-lg ${
                  isDark
                    ? 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 border-zinc-800 hover:border-amber-500/30'
                    : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-amber-700 border-slate-200 hover:border-amber-400/50'
                } border text-[10px] font-mono font-medium transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs mt-1.5`}
              >
                <Phone className={`w-3 h-3 ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`} />
                <span>Mở Pool &amp; Gọi</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Footer with Voucher & Birthday Priority */}
      <div
        className={`pt-1.5 border-t ${
          isDark ? 'border-zinc-800/70 text-zinc-400' : 'border-slate-200 text-slate-500'
        } text-[10px] font-mono flex items-center justify-between`}
      >
        <span className={`${isDark ? 'text-amber-300/90' : 'text-amber-700'} flex items-center gap-1.5`}>
          <span>🎁</span> <strong>Ưu tiên Hot Leads:</strong> Voucher 100K &amp; Sinh nhật Tháng 10
        </span>
        <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>100% Khách Hàng Chu Kỳ</span>
      </div>
    </section>
  );
};
