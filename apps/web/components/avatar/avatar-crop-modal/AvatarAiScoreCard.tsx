'use client';

import React from 'react';
import { Progress } from 'antd';
import { AlertTriangle, CheckCircle2, Layout as LayoutIcon, Loader2, Smile, Sparkles, Sun } from 'lucide-react';
import type { AiScoreState } from './avatarCropModalTypes';

export interface AvatarAiScoreCardProps {
  isDark: boolean;
  aiScoreState: AiScoreState;
}

interface ScoreMetricItemProps {
  isDark: boolean;
  label: string;
  value: number;
  icon: React.ReactNode;
  fromColor: string;
  toColor: string;
}

const ScoreMetricItem: React.FC<ScoreMetricItemProps> = ({ isDark, label, value, icon, fromColor, toColor }) => (
  <div
    className={`rounded-lg p-2 border shadow-xs ${
      isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-200/80'
    }`}
  >
    <div className="flex items-center justify-between text-[10px] mb-1">
      <span className={`flex items-center gap-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        {icon} {label}
      </span>
      <span className={`font-mono tabular-nums font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
        {value}/10
      </span>
    </div>
    <Progress
      percent={Math.min(100, Math.max(0, value * 10))}
      size={['100%', 6]}
      showInfo={false}
      strokeColor={{ from: fromColor, to: toColor }}
      trailColor={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgb(241, 245, 249)'}
      className="m-0 leading-none"
    />
  </div>
);

export const AvatarAiScoreCard: React.FC<AvatarAiScoreCardProps> = ({ isDark, aiScoreState }) => {
  const scoreData = aiScoreState.data;
  const metrics = scoreData?.metrics;

  return (
    <div
      className={`mt-4 rounded-2xl p-3.5 relative overflow-hidden backdrop-blur-md border shadow-md ${
        isDark
          ? 'bg-white/[0.04] border-white/[0.1]'
          : 'bg-gradient-to-br from-amber-50/90 via-white to-purple-50/50 border-amber-200/80'
      }`}
    >
      {/* Ambient Aurora Gradient */}
      <div
        className={`absolute -top-12 -right-12 w-28 h-28 blur-2xl pointer-events-none ${
          isDark
            ? 'bg-gradient-to-br from-amber-500/20 to-purple-500/20'
            : 'bg-gradient-to-br from-amber-400/20 to-purple-400/20'
        }`}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className={isDark ? 'text-amber-400 animate-pulse' : 'text-amber-600 animate-pulse'} />
          <span className={`text-xs font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            MAI Coach
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              isDark
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : 'bg-purple-100 text-purple-800 border-purple-200 shadow-xs'
            }`}
          >
            Gemini Vision
          </span>
        </div>
        {aiScoreState.status === 'analyzing' && (
          <div
            className={`flex items-center gap-1.5 text-[11px] font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}
          >
            <Loader2 size={14} className="animate-spin" />
            Đang quét thần thái...
          </div>
        )}
      </div>

      {/* Score Content */}
      {aiScoreState.status === 'scored' && scoreData && (
        <div className="mt-2.5 space-y-2.5">
          {scoreData.isHumanPortrait ? (
            <>
              {/* Badge and Total Score */}
              <div
                className={`flex items-center justify-between rounded-xl p-2.5 border ${
                  isDark ? 'bg-black/30 border-white/5' : 'bg-white border-slate-200/80 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <div>
                    <div className={`text-[12px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {scoreData.badge || 'Nụ Cười Tỏa Sáng'}
                    </div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {scoreData.verdict}
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span
                    className={`text-xl font-black font-mono tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
                  >
                    {scoreData.totalScore}
                  </span>
                  <span
                    className={`text-[10px] font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                  >
                    /10
                  </span>
                </div>
              </div>

              {/* 3 Metric Bars */}
              {metrics && (
                <div className="grid grid-cols-3 gap-2">
                  <ScoreMetricItem
                    isDark={isDark}
                    label="Nụ cười"
                    value={metrics.smile}
                    icon={<Smile size={11} className="text-pink-500" />}
                    fromColor="rgb(236, 72, 153)"
                    toColor="rgb(251, 113, 133)"
                  />
                  <ScoreMetricItem
                    isDark={isDark}
                    label="Ánh sáng"
                    value={metrics.lighting}
                    icon={<Sun size={11} className="text-amber-500" />}
                    fromColor="rgb(245, 158, 11)"
                    toColor="rgb(250, 204, 21)"
                  />
                  <ScoreMetricItem
                    isDark={isDark}
                    label="Bố cục"
                    value={metrics.composition}
                    icon={<LayoutIcon size={11} className="text-sky-500" />}
                    fromColor="rgb(14, 165, 233)"
                    toColor="rgb(34, 211, 238)"
                  />
                </div>
              )}

              {/* AI Feedback advice */}
              {scoreData.feedback && (
                <p
                  className={`text-[11px] leading-snug italic rounded-xl p-2.5 border ${
                    isDark
                      ? 'bg-amber-500/[0.07] border-amber-500/20 text-slate-300'
                      : 'bg-amber-50 border-amber-300/80 text-amber-950 font-medium'
                  }`}
                >
                  💡 &ldquo;{scoreData.feedback}&rdquo;
                </p>
              )}
            </>
          ) : (
            <div
              className={`rounded-xl p-3 flex items-start gap-2.5 border ${
                isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'
              }`}
            >
              <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <div className={`text-xs font-bold ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>
                  Không nhận diện thấy chân dung
                </div>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {scoreData.feedback ||
                    'Hãy chọn một tấm ảnh có khuôn mặt và nụ cười của bạn để tỏa sáng trên hệ thống nhé!'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {aiScoreState.status === 'error' && (
        <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {aiScoreState.errorMessage}
        </p>
      )}
    </div>
  );
};
