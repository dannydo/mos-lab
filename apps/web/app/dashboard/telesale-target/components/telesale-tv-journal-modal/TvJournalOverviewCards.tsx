'use client';

import React from 'react';
import { Clock, Flame, Sparkles, Volume2 } from 'lucide-react';
import type { TelesaleTvJournalOverview } from '@mos-lab/shared';

interface TvJournalOverviewCardsProps {
  isDark: boolean;
  journalData: TelesaleTvJournalOverview | null;
  latestTimeFormatted: string;
}

interface ExecutionRatioCardProps {
  isDark: boolean;
  title: string;
  icon: React.ReactNode;
  successCount: number;
  errorCount: number;
}

const ExecutionRatioCard: React.FC<ExecutionRatioCardProps> = ({ isDark, title, icon, successCount, errorCount }) => {
  return (
    <div
      className={`rounded-xl p-3 border flex flex-col justify-between transition-colors ${
        isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className={`flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
        <span>{title}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span
          className={`text-xl font-black font-mono tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
        >
          {successCount}
        </span>
        <span className={`text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>/</span>
        <span className={`text-xl font-black font-mono tabular-nums ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
          {errorCount}
        </span>
      </div>
      <div className={`text-[10px] font-mono mt-0.5 tabular-nums ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
        <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-bold`}>
          {successCount} thành công
        </span>{' '}
        · <span className={`${isDark ? 'text-rose-400' : 'text-rose-600'} font-bold`}>{errorCount} lỗi</span>
      </div>
    </div>
  );
};

/** Renders the four overview KPI cards summarizing TV live events, voice TTS, overlays, and latest timestamp. */
export const TvJournalOverviewCards: React.FC<TvJournalOverviewCardsProps> = ({
  isDark,
  journalData,
  latestTimeFormatted,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Card 1: Tổng Live Event */}
      <div
        className={`rounded-xl p-3 border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className={`flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          <span>Tổng Live Events</span>
          <Flame className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div
          className={`text-2xl font-black font-mono tabular-nums mt-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}
        >
          {journalData?.totalEvents ?? 0}
        </div>
        <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Sự kiện trong ngày
        </div>
      </div>

      {/* Card 2: Voice thành công / lỗi */}
      <ExecutionRatioCard
        isDark={isDark}
        title="Loa / Voice TTS"
        icon={<Volume2 className="w-3.5 h-3.5 text-emerald-500" />}
        successCount={journalData?.voiceSuccess ?? 0}
        errorCount={journalData?.voiceError ?? 0}
      />

      {/* Card 3: Overlay thành công / lỗi */}
      <ExecutionRatioCard
        isDark={isDark}
        title="Celebration Overlay"
        icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
        successCount={journalData?.overlaySuccess ?? 0}
        errorCount={journalData?.overlayError ?? 0}
      />

      {/* Card 4: Sự kiện gần nhất */}
      <div
        className={`rounded-xl p-3 border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className={`flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          <span>Sự kiện gần nhất</span>
          <Clock className="w-3.5 h-3.5 text-sky-500" />
        </div>
        <div
          className={`text-lg font-black font-mono tabular-nums mt-1 truncate ${
            isDark ? 'text-sky-300' : 'text-sky-700'
          }`}
        >
          {latestTimeFormatted}
        </div>
        <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Thời điểm phát sinh
        </div>
      </div>
    </div>
  );
};
