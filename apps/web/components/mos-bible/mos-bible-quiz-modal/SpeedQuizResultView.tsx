'use client';

import React from 'react';
import { Button, Typography } from 'antd';
import { RotateCcw } from 'lucide-react';
import type { MosBibleSpeedQuizProfile, MosBibleSpeedQuizResult } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { MAX_FREE_ATTEMPTS_PER_DAY, MAX_PURCHASED_ATTEMPTS_PER_DAY } from './constants';
import { BuyAttemptPopconfirm } from './BuyAttemptPopconfirm';

const { Title } = Typography;

export interface SpeedQuizResultViewProps {
  profile: MosBibleSpeedQuizProfile;
  result: MosBibleSpeedQuizResult;
  buyingAttempt: boolean;
  onStartSpeedQuiz: () => void;
  onBuyAttempt: () => void;
  onClose: () => void;
}

export function SpeedQuizResultView({
  profile,
  result,
  buyingAttempt,
  onStartSpeedQuiz,
  onBuyAttempt,
  onClose,
}: SpeedQuizResultViewProps) {
  const canBuyAnotherAttempt =
    profile.attemptsToday >= MAX_FREE_ATTEMPTS_PER_DAY &&
    profile.purchasedAttemptsToday < MAX_PURCHASED_ATTEMPTS_PER_DAY &&
    profile.totalBananas >= 1;

  return (
    <div className="py-4 space-y-4 text-center">
      <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-50 to-orange-50/30 dark:from-amber-950/30 dark:to-zinc-900 border border-amber-200 dark:border-amber-800/60 space-y-3">
        <div className="text-5xl">{result.bananasEarned > 0 ? '🍌🎉' : '⏱️💥'}</div>

        <Title level={4} className="!m-0 text-slate-800 dark:text-zinc-100">
          {result.bananasEarned === 2
            ? 'Đỉnh Cao Tuyệt Đối! Đúng Liên Tục 5/5 Câu!'
            : result.bananasEarned === 1
              ? 'Xuất Sắc! Hoàn Thành Mục Tiêu 3+ Câu!'
              : 'Lượt Chơi Kết Thúc (Sudden Death)'}
        </Title>

        <div className="text-sm text-slate-600 dark:text-zinc-300 max-w-md mx-auto">{result.message}</div>

        <div className="flex justify-center items-center gap-6 pt-3 text-xs">
          <div>
            <div className="text-slate-400">Chuỗi đúng đạt được</div>
            <div className="text-2xl font-bold text-orange-600 tabular-nums">
              {result.streak} <span className="text-sm font-normal">câu</span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-zinc-700" />

          <div>
            <div className="text-slate-400">Chuối nhận được</div>
            <div className="text-2xl font-bold text-amber-600 tabular-nums">+{result.bananasEarned} 🍌</div>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-zinc-700" />

          <div>
            <div className="text-slate-400">Tổng Chuối trong Ví</div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">{result.profile.totalBananas} 🍌</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {profile.canPlayToday ? (
          <Button
            type="primary"
            icon={<AppIcon icon={RotateCcw} size="sm" />}
            onClick={onStartSpeedQuiz}
            className="bg-amber-600 hover:bg-amber-500 font-semibold h-10 px-6"
          >
            {profile.attemptsToday < MAX_FREE_ATTEMPTS_PER_DAY
              ? `Chơi Lượt Free Tiếp Theo (${MAX_FREE_ATTEMPTS_PER_DAY - profile.attemptsToday}/${MAX_FREE_ATTEMPTS_PER_DAY})`
              : 'Vào Trận Lượt Mua Tiếp Theo 🍌'}
          </Button>
        ) : canBuyAnotherAttempt ? (
          <BuyAttemptPopconfirm purchasedAttemptsToday={profile.purchasedAttemptsToday} onConfirm={onBuyAttempt}>
            <Button
              type="primary"
              loading={buyingAttempt}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 font-semibold h-10 px-6"
            >
              Dùng 1 🍌 Mua Lượt ({profile.purchasedAttemptsToday}/{MAX_PURCHASED_ATTEMPTS_PER_DAY})
            </Button>
          </BuyAttemptPopconfirm>
        ) : (
          <Button disabled className="h-10 px-6">
            {profile.purchasedAttemptsToday >= MAX_PURCHASED_ATTEMPTS_PER_DAY
              ? 'Đã Hết Toàn Bộ Lượt Hôm Nay'
              : 'Đã Hoàn Tất 3/3 Lượt Free'}
          </Button>
        )}
        <Button onClick={onClose} className="h-10 px-6">
          Đóng
        </Button>
      </div>
    </div>
  );
}
