'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import type { MosBibleSpeedQuizProfile } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';

export interface QuizModalHeaderProps {
  profile: MosBibleSpeedQuizProfile;
}

export function QuizModalHeader({ profile }: QuizModalHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
          <AppIcon icon={Zap} size="sm" />
        </span>
        <span className="text-base font-semibold">Đấu Trường Kinh Thánh mOS</span>
      </div>

      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-full px-3 py-1">
        <span className="text-base leading-none">🍌</span>
        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">
          {profile.totalBananas} Chuối
        </span>
        <span className="text-[11px] text-slate-400">|</span>
        <span className="text-[11px] text-slate-600 dark:text-zinc-400 tabular-nums">
          Hôm nay: <strong className="text-amber-600">{profile.bananasToday}/6</strong> · Free:{' '}
          <strong className="text-emerald-600">{profile.attemptsToday}/3</strong>
          {profile.purchasedAttemptsToday > 0 && (
            <>
              {' '}
              · Mua: <strong className="text-indigo-600">{profile.purchasedAttemptsToday}/3</strong>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
