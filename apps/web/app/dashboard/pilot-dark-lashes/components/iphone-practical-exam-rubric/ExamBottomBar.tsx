'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type { ExamRankInfo } from './rubric-config';

interface ExamBottomBarProps {
  totalScore: number;
  rank: ExamRankInfo;
  isSigned: boolean;
  onOpenSignModal: () => void;
}

const RANK_BADGE_CLASSES: Record<ExamRankInfo['color'], string> = {
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30',
};

export function ExamBottomBar({ totalScore, rank, isSigned, onOpenSignModal }: ExamBottomBarProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 shadow-2xl z-50">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
            Tổng Điểm Thực Hành
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{totalScore}</span>
            <span className="text-xs text-slate-400 font-semibold">/ 100đ</span>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-flex items-center justify-center leading-none px-2 py-1 rounded-md text-[10.5px] font-black tracking-wide ${RANK_BADGE_CLASSES[rank.color]}`}
          >
            {rank.label}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{rank.sub}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSignModal}
        className={`w-full py-3.5 px-4 rounded-xl text-xs font-black text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px] ${
          isSigned
            ? 'bg-emerald-600 hover:bg-emerald-500'
            : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600'
        }`}
        data-testid="btn-iphone-sign-cert"
      >
        <AppIcon icon={Award} size={17} />
        <span>{isSigned ? '✅ ĐÃ CẤP CHỨNG CHỈ mOS' : '✅ KÝ DUYỆT & CẤP CHỨNG CHỈ mOS'}</span>
      </button>
    </footer>
  );
}
