'use client';

import React from 'react';
import { Button, Progress, Typography } from 'antd';
import { CheckCircle2, ShieldAlert, Swords, Trophy } from 'lucide-react';
import type { BkGame, BkGameDetailResponse } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import BkAvatar from '../BkAvatar';
import type { PodiumEntry } from './bkGameUtils';

export interface BkGamePodiumArenaProps {
  activeGame: BkGame;
  gameDetail: BkGameDetailResponse | null;
  hasTeamBookingDoneBonus: boolean;
  top1: PodiumEntry | null;
  top2: PodiumEntry | null;
  top3: PodiumEntry | null;
  onOpenFinalizeModal: () => void;
}

export function BkGamePodiumArena({
  activeGame,
  gameDetail,
  hasTeamBookingDoneBonus,
  top1,
  top2,
  top3,
  onOpenFinalizeModal,
}: BkGamePodiumArenaProps) {
  const battleTeams =
    activeGame.gameType === 'TEAM' && gameDetail?.teams && gameDetail.teams.length >= 2 ? gameDetail.teams : null;
  const isTeamBattle = Boolean(battleTeams);
  const scoreUnitLabel = activeGame.metricType === 'BOOKINGS' ? 'Booking' : 'Điểm';
  const team1 = battleTeams?.[0];
  const team2 = battleTeams?.[1];
  const teamTotalScore = team1 && team2 ? team1.score + team2.score : 0;
  const team1Percent = team1 && team2 && teamTotalScore > 0 ? Math.round((team1.score / teamTotalScore) * 100) : 50;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* TOP 3 PODIUM */}
      <div
        className={
          isTeamBattle
            ? 'lg:col-span-7 flex flex-col'
            : hasTeamBookingDoneBonus
              ? 'lg:col-span-12 flex flex-col'
              : 'lg:col-span-8 flex flex-col'
        }
      >
        <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AppIcon icon={Trophy} size="md" />
              </div>
              <div>
                <Typography.Title level={5} className="!mb-0 font-bold tracking-tight">
                  Top 3 Bảng Xếp Hạng
                </Typography.Title>
                <Typography.Text type="secondary" className="text-xs">
                  Bục vinh danh những cá nhân xuất sắc nhất
                </Typography.Text>
              </div>
            </div>
            <StatusTag status="gold" label="PODIUM" />
          </div>

          {/* Olympic 3-Step Podium Pedestal */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-6 pb-2 px-1 max-w-lg mx-auto w-full">
            {/* Rank 2 Silver (Left) */}
            <div className="flex flex-col items-center text-center">
              {top2 ? (
                <>
                  <div className="relative mb-2">
                    <div className="relative inline-block rounded-full ring-2 ring-slate-400 dark:ring-slate-500 p-0.5 shadow-sm">
                      <BkAvatar name={top2.staffName} src={top2.avatar} size={46} />
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-white dark:ring-slate-900">
                      #2
                    </span>
                  </div>
                  <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate max-w-[100px] mb-0.5">
                    {top2.staffName}
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                    {top2.score} {scoreUnitLabel}
                  </div>
                  {/* Silver Pedestal Step */}
                  <div className="w-full mt-3 h-24 rounded-t-xl bg-gradient-to-t from-slate-200/90 to-slate-100/60 dark:from-slate-800 dark:to-slate-700/50 border-t-2 border-slate-300 dark:border-slate-500 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-2xl font-black text-slate-400 dark:text-slate-500">2</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                      Á Quân
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 italic py-8">Chưa có</div>
              )}
            </div>

            {/* Rank 1 Gold (Center - Elevated & Glowing) */}
            <div className="flex flex-col items-center text-center -mt-6">
              {top1 ? (
                <>
                  <div className="relative mb-2">
                    <div className="text-amber-500 mb-0.5 flex justify-center animate-bounce">
                      <AppIcon icon={Trophy} size="md" />
                    </div>
                    <div className="relative inline-block rounded-full ring-4 ring-amber-400 dark:ring-amber-500 shadow-md shadow-amber-500/20 p-0.5 scale-105">
                      <BkAvatar name={top1.staffName} src={top1.avatar} size={56} />
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-xs font-black px-1.5 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow">
                      #1
                    </span>
                  </div>
                  <div className="font-bold text-sm sm:text-base text-amber-600 dark:text-amber-400 truncate max-w-[120px] mb-0.5">
                    {top1.staffName}
                  </div>
                  <div className="text-xs sm:text-sm font-black text-amber-500 tabular-nums">
                    {top1.score} {scoreUnitLabel}
                  </div>
                  {/* Gold Pedestal Step */}
                  <div className="w-full mt-3 h-32 rounded-t-xl bg-gradient-to-t from-amber-500/30 via-amber-400/20 to-amber-300/30 dark:from-amber-600/40 dark:via-amber-500/20 dark:to-amber-400/30 border-t-4 border-amber-400 flex flex-col items-center justify-center shadow-md shadow-amber-500/10">
                    <span className="text-3xl font-black text-amber-500 dark:text-amber-400">1</span>
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400">
                      Quán Quân
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 italic py-8">Chưa có</div>
              )}
            </div>

            {/* Rank 3 Bronze (Right) */}
            <div className="flex flex-col items-center text-center">
              {top3 ? (
                <>
                  <div className="relative mb-2">
                    <div className="relative inline-block rounded-full ring-2 ring-amber-700/60 dark:ring-amber-600/60 p-0.5 shadow-sm">
                      <BkAvatar name={top3.staffName} src={top3.avatar} size={42} />
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-amber-800 text-amber-100 text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-white dark:ring-slate-900">
                      #3
                    </span>
                  </div>
                  <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate max-w-[100px] mb-0.5">
                    {top3.staffName}
                  </div>
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-500 tabular-nums">
                    {top3.score} {scoreUnitLabel}
                  </div>
                  {/* Bronze Pedestal Step */}
                  <div className="w-full mt-3 h-20 rounded-t-xl bg-gradient-to-t from-amber-900/20 to-amber-800/10 dark:from-amber-950 dark:to-amber-900/40 border-t-2 border-amber-700 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-2xl font-black text-amber-700 dark:text-amber-600">3</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-500">
                      Hạng Ba
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 italic py-8">Chưa có</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SIDE PANEL: TEAM BATTLE OR CHALLENGE OVERVIEW */}
      {(isTeamBattle || !hasTeamBookingDoneBonus) && (
        <div className={isTeamBattle ? 'lg:col-span-5 flex flex-col' : 'lg:col-span-4 flex flex-col'}>
          {team1 && team2 ? (
            <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AppIcon icon={Swords} size="md" className="text-rose-500" />
                    <Typography.Title level={5} className="!mb-0 font-bold">
                      Đối Đầu Đồng Đội
                    </Typography.Title>
                  </div>
                  <StatusTag status="error" label="LIVE BATTLE" />
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20">
                    <div className="font-bold text-sm text-blue-600 dark:text-blue-400 truncate">{team1.teamName}</div>
                    <div className="text-xl font-black tabular-nums text-blue-600 dark:text-blue-400 mt-1">
                      {team1.score} <span className="text-xs font-normal">điểm</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{team1.participants?.length || 0} thành viên</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
                    <div className="font-bold text-sm text-rose-600 dark:text-rose-400 truncate">{team2.teamName}</div>
                    <div className="text-xl font-black tabular-nums text-rose-600 dark:text-rose-400 mt-1">
                      {team2.score} <span className="text-xs font-normal">điểm</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{team2.participants?.length || 0} thành viên</div>
                  </div>
                </div>

                {/* Battle Progress Bar */}
                <div className="mt-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-blue-600">
                        {team1.teamName} ({team1Percent}%)
                      </span>
                      <span className="text-rose-600">
                        {team2.teamName} ({100 - team1Percent}%)
                      </span>
                    </div>
                    <Progress
                      percent={team1Percent}
                      strokeColor="var(--ant-color-primary)"
                      trailColor="var(--ant-color-error)"
                      showInfo={false}
                      className="!m-0"
                    />
                  </div>
                </div>
              </div>

              {activeGame.status === 'ACTIVE' && (
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <Button
                    type="primary"
                    icon={<AppIcon icon={CheckCircle2} size="sm" />}
                    onClick={onOpenFinalizeModal}
                    className="w-full !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 font-semibold"
                  >
                    Chốt & Công Bố Kết Quả Đội Thắng
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Typography.Title level={5} className="!mb-0 font-bold">
                    Tiến Độ & Thưởng Phạt
                  </Typography.Title>
                  <StatusTag status="gold" label={`${activeGame.rewardPool.toLocaleString('vi-VN')} đ`} />
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Mục tiêu toàn đội:</span>
                      <span className="font-bold tabular-nums">
                        {gameDetail?.stats.totalScore || 0} / {activeGame.targetScore || 50}
                      </span>
                    </div>
                    <Progress
                      percent={Math.min(
                        100,
                        Math.round(((gameDetail?.stats.totalScore || 0) / (activeGame.targetScore || 50)) * 100)
                      )}
                      strokeColor="var(--ant-color-primary)"
                      size="small"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 mb-1">
                      <AppIcon icon={ShieldAlert} size="sm" />
                      <span>Hình Phạt Vui Áp Dụng:</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 font-medium">
                      {activeGame.penaltyDescription || 'Bao trà sữa / bánh tráng cả team'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs">
                    <div className="font-bold text-amber-700 dark:text-amber-400 mb-0.5">Cơ Cấu Giải Thưởng:</div>
                    <div className="text-slate-600 dark:text-slate-300">
                      {activeGame.rewardDescription || 'Quán quân nhận toàn bộ quỹ cược + thưởng cty'}
                    </div>
                  </div>
                </div>
              </div>

              {activeGame.status === 'ACTIVE' && (
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <Button
                    type="primary"
                    icon={<AppIcon icon={CheckCircle2} size="sm" />}
                    onClick={onOpenFinalizeModal}
                    className="w-full !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 font-semibold"
                  >
                    Chốt & Công Bố Kết Quả
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
