'use client';

import React from 'react';
import { Card, Button, Typography } from 'antd';
import { Zap, Clock, Flame } from 'lucide-react';
import type { MosBibleSpeedQuizProfile } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { MAX_FREE_ATTEMPTS_PER_DAY, MAX_PURCHASED_ATTEMPTS_PER_DAY } from './constants';
import { BuyAttemptPopconfirm } from './BuyAttemptPopconfirm';

const { Text, Title } = Typography;

export interface SpeedQuizIdleViewProps {
  profile: MosBibleSpeedQuizProfile;
  speedLoading: boolean;
  buyingAttempt: boolean;
  onStartSpeedQuiz: () => void;
  onBuyAttempt: () => void;
}

export function SpeedQuizIdleView({
  profile,
  speedLoading,
  buyingAttempt,
  onStartSpeedQuiz,
  onBuyAttempt,
}: SpeedQuizIdleViewProps) {
  const canPurchaseAttemptNow =
    profile.attemptsToday >= MAX_FREE_ATTEMPTS_PER_DAY &&
    profile.purchasedAttemptsToday < MAX_PURCHASED_ATTEMPTS_PER_DAY;

  return (
    <div className="space-y-4 py-2">
      <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 dark:from-amber-950/20 dark:via-zinc-900 dark:to-orange-950/10 dark:border-amber-900/40">
        <div className="flex items-start gap-3">
          <div className="text-3xl p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">🍌</div>
          <div className="space-y-1">
            <Title level={5} className="!m-0 text-amber-800 dark:text-amber-300">
              Săn Chuối Thần Tốc: 10s Mỗi Câu
            </Title>
            <Text className="text-xs text-slate-600 dark:text-zinc-400">
              Rèn luyện phản xạ chớp nhoáng theo Kinh Thánh mOS và 4 Chìa Khóa Văn Hóa Wings (*Vui Vẻ – Ân Cần – Chân
              Thành – Khoa Học*).
            </Text>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-slate-100 dark:border-zinc-700">
            <div className="font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1 mb-1">
              <AppIcon icon={Clock} size="sm" className="text-blue-500" />
              10 Giây Mỗi Câu
            </div>
            <Text type="secondary" className="text-[11px]">
              Áp lực thời gian thực tế, đòi hỏi phản xạ tự nhiên.
            </Text>
          </div>

          <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-slate-100 dark:border-zinc-700">
            <div className="font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1 mb-1">
              <span className="text-sm">💥</span>
              Luật Sudden Death
            </div>
            <Text type="secondary" className="text-[11px]">
              Sai 1 câu hoặc hết giờ là dừng ngay lượt chơi!
            </Text>
          </div>

          <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-slate-100 dark:border-zinc-700">
            <div className="font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1 mb-1">
              <span className="text-sm">🍌</span>
              Thưởng Chuối
            </div>
            <Text type="secondary" className="text-[11px]">
              Đúng 3 câu = <strong>1 🍌</strong>; Đúng 5 câu = <strong>2 🍌</strong>.
            </Text>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <AppIcon icon={Flame} size="sm" className="text-orange-500" />
            Kỷ lục chuỗi đúng của bạn:{' '}
            <strong className="text-orange-600 tabular-nums">{profile.streakBest} câu</strong>
          </span>
          <span>
            Lượt free còn lại:{' '}
            <strong className="text-emerald-600 tabular-nums">
              {Math.max(0, MAX_FREE_ATTEMPTS_PER_DAY - profile.attemptsToday)}/{MAX_FREE_ATTEMPTS_PER_DAY}
            </strong>
            {profile.attemptsToday >= MAX_FREE_ATTEMPTS_PER_DAY && (
              <span className="ml-2 text-indigo-600 font-semibold tabular-nums">
                (Đã mua: {profile.purchasedAttemptsToday}/{MAX_PURCHASED_ATTEMPTS_PER_DAY})
              </span>
            )}
          </span>
        </div>
      </Card>

      <div className="text-center pt-2">
        {profile.canPlayToday ? (
          <Button
            type="primary"
            size="large"
            icon={<AppIcon icon={Zap} size="sm" />}
            loading={speedLoading}
            onClick={onStartSpeedQuiz}
            className="bg-amber-600 hover:bg-amber-500 font-semibold px-8 h-11 shadow-md shadow-amber-600/20"
          >
            {profile.purchasedRunsAvailable > 0
              ? 'Vào Trận Lượt Mua Thêm 🍌 (10s/Câu)'
              : 'Bắt Đầu Săn Chuối 🍌 (10s/Câu)'}
          </Button>
        ) : canPurchaseAttemptNow ? (
          profile.totalBananas >= 1 ? (
            <BuyAttemptPopconfirm purchasedAttemptsToday={profile.purchasedAttemptsToday} onConfirm={onBuyAttempt}>
              <Button
                type="primary"
                size="large"
                icon={<span className="text-base mr-1">🍌</span>}
                loading={buyingAttempt}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 font-semibold px-8 h-11 shadow-md shadow-orange-600/20"
              >
                Dùng 1 🍌 Mua Thêm Lượt ({profile.purchasedAttemptsToday}/{MAX_PURCHASED_ATTEMPTS_PER_DAY})
              </Button>
            </BuyAttemptPopconfirm>
          ) : (
            <div>
              <Button
                disabled
                size="large"
                icon={<span className="text-base mr-1">🍌</span>}
                className="h-11 px-8 font-semibold"
              >
                Dùng 1 🍌 Mua Thêm Lượt ({profile.purchasedAttemptsToday}/{MAX_PURCHASED_ATTEMPTS_PER_DAY})
              </Button>
              <div className="text-xs text-rose-500 dark:text-rose-400 mt-2 font-medium">
                Ví của bạn đang có 0 🍌. Cần tối thiểu 1 Chuối để mua thêm lượt chơi!
              </div>
            </div>
          )
        ) : (
          <div>
            <Button disabled size="large" className="h-11 px-8 font-semibold">
              Đã Hoàn Tất Cả 6 Lượt Chơi Hôm Nay
            </Button>
            <div className="text-xs text-slate-400 mt-2">
              Đã dùng hết 3 lượt miễn phí và 3 lượt mua hôm nay. Lượt chơi sẽ làm mới vào 00:00 ngày mai!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
