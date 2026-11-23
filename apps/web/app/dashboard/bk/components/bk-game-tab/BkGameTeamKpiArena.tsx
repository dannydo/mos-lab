'use client';

import React from 'react';
import { Button, Progress, Typography } from 'antd';
import { Calendar, CheckCircle2, Users } from 'lucide-react';
import type { BkGame, BkGameDetailResponse, BkGameTeamKpiSummary } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import BkAvatar from '../BkAvatar';

export interface BkGameTeamKpiArenaProps {
  activeGame: BkGame;
  gameDetail: BkGameDetailResponse;
  teamKpiSummary: BkGameTeamKpiSummary;
  onOpenFinalizeModal: () => void;
}

export function BkGameTeamKpiArena({
  activeGame,
  gameDetail,
  teamKpiSummary,
  onOpenFinalizeModal,
}: BkGameTeamKpiArenaProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* DAILY KPI TRACKER & CALENDAR BREAKDOWN (Col 7) */}
      <div className="lg:col-span-7 flex flex-col">
        <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <AppIcon icon={Calendar} size="md" />
                </div>
                <div>
                  <Typography.Title level={5} className="!mb-0 font-bold tracking-tight">
                    Tiến Độ KPI Theo Ngày
                  </Typography.Title>
                  <Typography.Text type="secondary" className="text-xs">
                    Mục tiêu: {teamKpiSummary.config.dailyTarget} booking/ngày (
                    {teamKpiSummary.config.timeWindowStart || '08:00'}–{teamKpiSummary.config.timeWindowEnd || '17:00'})
                  </Typography.Text>
                </div>
              </div>
              <StatusTag
                status={teamKpiSummary.todayPassed ? 'success' : 'processing'}
                label={teamKpiSummary.todayPassed ? 'HÔM NAY ĐẠT' : 'ĐANG THI ĐẤU'}
              />
            </div>

            {/* Daily Results List / Cards */}
            <div className="space-y-2.5 mt-4 max-h-[360px] overflow-y-auto pr-1">
              {teamKpiSummary.dailyResults.map((day) => {
                const pct = day.target > 0 ? Math.min(100, Math.round((day.actual / day.target) * 100)) : 0;
                return (
                  <div
                    key={day.date}
                    className={`p-3 rounded-xl border transition-all ${
                      day.isToday
                        ? 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-400/30'
                        : day.isPassed
                          ? 'border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10'
                          : day.isFuture
                            ? 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/20 opacity-70'
                            : 'border-rose-200/80 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{day.dateLabel}</span>
                        {day.isToday && (
                          <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded-full">
                            Hôm nay
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {day.isFuture ? (
                          <span className="text-slate-400 text-[11px]">Sắp diễn ra</span>
                        ) : day.isPassed ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                            +{(day.rewardAmount || teamKpiSummary.config.rewardPerDay || 50000).toLocaleString('vi-VN')}{' '}
                            đ
                          </span>
                        ) : day.isToday ? (
                          <span className="text-purple-600 dark:text-purple-400 font-medium text-[11px]">
                            Chờ chốt ngày
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                            -
                            {(day.penaltyAmount || teamKpiSummary.config.penaltyPerDay || 25000).toLocaleString(
                              'vi-VN'
                            )}{' '}
                            đ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress & Target numbers */}
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>
                        Tiến độ:{' '}
                        <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{day.actual}</strong> /{' '}
                        {day.target} Booking
                      </span>
                      <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
                    </div>
                    <Progress
                      percent={pct}
                      strokeColor={
                        day.isPassed
                          ? 'var(--ant-color-success)'
                          : day.isToday
                            ? 'var(--ant-color-primary)'
                            : day.isFuture
                              ? 'var(--ant-color-text-quaternary)'
                              : 'var(--ant-color-error)'
                      }
                      size="small"
                      showInfo={false}
                      className="!m-0"
                    />

                    {/* Top Contributors of the day */}
                    {day.contributors && day.contributors.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Đóng góp:</span>
                        <div className="flex items-center gap-2 truncate max-w-[70%]">
                          {day.contributors.slice(0, 3).map((c) => (
                            <span key={c.staffId} className="text-slate-700 dark:text-slate-300 truncate">
                              {c.staffName}:{' '}
                              <strong className="text-purple-600 dark:text-purple-400 tabular-nums">{c.count}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer info */}
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Khung giờ tính KPI:{' '}
              <strong>
                {teamKpiSummary.config.timeWindowStart || '08:00'} - {teamKpiSummary.config.timeWindowEnd || '17:00'}
              </strong>
            </span>
            <span>Tính theo thời điểm tạo booking (không tính đơn Hủy)</span>
          </div>
        </div>
      </div>

      {/* TEAM CONTRIBUTORS & REWARD FUND PANEL (Col 5) */}
      <div className="lg:col-span-5 flex flex-col">
        <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AppIcon icon={Users} size="md" className="text-purple-500" />
                <Typography.Title level={5} className="!mb-0 font-bold">
                  Đóng Góp Thành Viên
                </Typography.Title>
              </div>
              <StatusTag
                status={teamKpiSummary.netReward >= 0 ? 'success' : 'error'}
                label={`${teamKpiSummary.netReward >= 0 ? '+' : ''}${teamKpiSummary.netReward.toLocaleString('vi-VN')} đ`}
              />
            </div>

            {/* Reward Fund Box */}
            <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 mb-3">
              <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                <span>Tổng quỹ ròng của Team:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {teamKpiSummary.passedDays} ngày đạt · {teamKpiSummary.failedDays} ngày phạt
                </span>
              </div>
              <div
                className={`text-2xl font-black tabular-nums ${teamKpiSummary.netReward >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
              >
                {teamKpiSummary.netReward >= 0 ? '+' : ''}
                {teamKpiSummary.netReward.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Thưởng/phạt ghi nhận một lần cho toàn Team, không phân bổ cá nhân.
              </div>
            </div>

            {/* Top Contributors List */}
            <div className="space-y-2 mt-3">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bảng xếp hạng đóng góp cá nhân:
              </div>
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                {gameDetail.leaderboard && gameDetail.leaderboard.length > 0 ? (
                  [...gameDetail.leaderboard]
                    .sort((a, b) => b.score - a.score)
                    .map((p, idx) => {
                      const totalScore = gameDetail.stats.totalScore || 1;
                      const contributionPct = totalScore > 0 ? Math.round((p.score / totalScore) * 100) : 0;
                      return (
                        <div
                          key={p.staffId}
                          className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span
                              className={`w-5 text-center font-bold text-xs ${idx === 0 ? 'text-amber-500 font-black' : 'text-slate-400'}`}
                            >
                              #{idx + 1}
                            </span>
                            <BkAvatar name={p.staffName} src={p.avatar} size={28} />
                            <div className="truncate">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {p.staffName}
                              </div>
                              <div className="text-[10px] text-slate-400">Đóng góp {contributionPct}%</div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                              {p.score} booking
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-xs text-slate-400 italic py-4 text-center">Chưa có thành viên tham gia</div>
                )}
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
      </div>
    </div>
  );
}
