'use client';

import React from 'react';
import { Popover, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { Clock, Info, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import type {
  BkGame,
  BkGameDetailResponse,
  BkGameScoringRule,
  BkGameTeamBookingDoneBonusSummary,
} from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { formatCountdown, type PodiumEntry } from './bkGameUtils';

export interface BkGameArenaBannerProps {
  activeGame: BkGame;
  gameDetail: BkGameDetailResponse | null;
  scoringRule: BkGameScoringRule;
  secondsRemaining: number;
  hasDoneBonusConfig: boolean;
  totalDoneBonusAmount: number;
  totalDoneBonusBookings: number;
  hasTeamBookingDoneBonus: boolean;
  teamBookingDoneBonusSummary: BkGameTeamBookingDoneBonusSummary | null;
  top1: PodiumEntry | null;
  onOpenDoneBonusDrawer: () => void;
  onOpenTeamBookingDoneDrawer: () => void;
}

interface ArenaBonusStatCardsProps {
  hasDoneBonusConfig: boolean;
  totalDoneBonusAmount: number;
  totalDoneBonusBookings: number;
  hasTeamBookingDoneBonus: boolean;
  teamBookingDoneBonusSummary: BkGameTeamBookingDoneBonusSummary | null;
  onOpenDoneBonusDrawer: () => void;
  onOpenTeamBookingDoneDrawer: () => void;
}

function ArenaBonusStatCards({
  hasDoneBonusConfig,
  totalDoneBonusAmount,
  totalDoneBonusBookings,
  hasTeamBookingDoneBonus,
  teamBookingDoneBonusSummary,
  onOpenDoneBonusDrawer,
  onOpenTeamBookingDoneDrawer,
}: ArenaBonusStatCardsProps) {
  return (
    <>
      {hasDoneBonusConfig && (
        <div className="bg-emerald-950/40 backdrop-blur-sm p-3.5 rounded-xl border border-emerald-500/30">
          <div className="text-xs text-emerald-300 uppercase font-medium flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AppIcon icon={Sparkles} size="sm" className="text-amber-400" />
              <span>Thưởng Bonus/Done</span>
            </span>
            <button
              type="button"
              onClick={onOpenDoneBonusDrawer}
              className="text-[10px] text-emerald-300 hover:text-emerald-100 underline decoration-dotted cursor-pointer"
            >
              Đối soát
            </button>
          </div>
          <div className="text-xl font-bold mt-1 text-emerald-400 tabular-nums">
            {totalDoneBonusAmount.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-xs text-slate-300 mt-0.5">{totalDoneBonusBookings} đơn Done đạt thưởng</div>
        </div>
      )}

      {hasTeamBookingDoneBonus && teamBookingDoneBonusSummary && (
        <div className="bg-amber-950/40 backdrop-blur-sm p-3.5 rounded-xl border border-amber-500/30">
          <div className="text-xs text-amber-300 uppercase font-medium flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AppIcon icon={Trophy} size="sm" className="text-amber-400" />
              <span>Thưởng Mốc BK</span>
            </span>
            <button
              type="button"
              onClick={onOpenTeamBookingDoneDrawer}
              className="text-[10px] text-amber-300 hover:text-amber-100 underline decoration-dotted cursor-pointer"
            >
              Đối soát
            </button>
          </div>
          <div className="text-xl font-bold mt-1 text-amber-300 tabular-nums">
            +{teamBookingDoneBonusSummary.totalBonus.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-xs text-slate-300 mt-0.5 tabular-nums">
            Hôm nay: {teamBookingDoneBonusSummary.todayTeamBookings} BK ·{' '}
            {teamBookingDoneBonusSummary.todayBonusPerDone.toLocaleString('vi-VN')}đ/Done
          </div>
        </div>
      )}
    </>
  );
}

export function BkGameArenaBanner({
  activeGame,
  gameDetail,
  scoringRule,
  secondsRemaining,
  hasDoneBonusConfig,
  totalDoneBonusAmount,
  totalDoneBonusBookings,
  hasTeamBookingDoneBonus,
  teamBookingDoneBonusSummary,
  top1,
  onOpenDoneBonusDrawer,
  onOpenTeamBookingDoneDrawer,
}: BkGameArenaBannerProps) {
  const heroBonusExtraCount = (hasDoneBonusConfig ? 1 : 0) + (hasTeamBookingDoneBonus ? 1 : 0);
  const heroGridColsClass =
    heroBonusExtraCount >= 2 ? 'lg:grid-cols-6' : heroBonusExtraCount === 1 ? 'lg:grid-cols-5' : 'md:grid-cols-4';

  const bonusCardsProps: ArenaBonusStatCardsProps = {
    hasDoneBonusConfig,
    totalDoneBonusAmount,
    totalDoneBonusBookings,
    hasTeamBookingDoneBonus,
    teamBookingDoneBonusSummary,
    onOpenDoneBonusDrawer,
    onOpenTeamBookingDoneDrawer,
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl border border-slate-700/60">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <StatusTag
              status={activeGame.gameType === 'TEAM_KPI' ? 'purple' : 'gold'}
              label={
                activeGame.gameType === 'TEAM_KPI'
                  ? 'Team KPI – Thử Thách Tập Thể'
                  : activeGame.gameType === 'TEAM'
                    ? 'Chia Đội Đối Đầu'
                    : 'Thi Đấu Cá Nhân'
              }
            />
            <StatusTag
              status={activeGame.status === 'ACTIVE' ? 'success' : 'default'}
              label={activeGame.status === 'ACTIVE' ? 'Đang Diễn Ra' : 'Đã Kết Thúc'}
            />
            {activeGame.allowedBookingChannels && activeGame.allowedBookingChannels.length > 0 && (
              <StatusTag status="cyan" label={`Kênh: ${activeGame.allowedBookingChannels.join(', ')}`} />
            )}
          </div>
          <Typography.Title level={3} className="!text-white !mb-1 font-extrabold tracking-tight">
            {activeGame.title}
          </Typography.Title>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Typography.Text className="text-slate-300 text-sm">
              {activeGame.description || `Thi đua đo lường theo chỉ số: ${scoringRule.label}`}
            </Typography.Text>
            <Popover
              trigger="click"
              placement="bottomLeft"
              title={
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                  <AppIcon icon={Sparkles} size="sm" className="text-blue-500" />
                  <span>Công Thức & Quy Tắc Tính Điểm</span>
                </div>
              }
              content={
                <div className="max-w-md space-y-2.5 text-xs py-1" data-testid="bk-game-scoring-popover">
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-between">
                    <span>🎯 {scoringRule.formula}</span>
                    <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {scoringRule.unit}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 !mb-0 leading-relaxed">{scoringRule.description}</p>
                  <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Thời gian game: </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {dayjs(activeGame.startDate).format('DD/MM/YYYY HH:mm')} –{' '}
                        {dayjs(activeGame.endDate).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Nguồn trích xuất: </span>
                      <span className="text-slate-600 dark:text-slate-400">{scoringRule.dataSource}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    💡 <strong>Quy tắc đối soát:</strong> Điểm thi đua trên Đấu trường được tính riêng từ thời điểm bắt
                    đầu đến kết thúc của game ({dayjs(activeGame.startDate).format('DD/MM')} –{' '}
                    {dayjs(activeGame.endDate).format('DD/MM')}), không bị ảnh hưởng bởi bộ lọc thời gian
                    (tháng/tuần/ngày) của Bảng xếp hạng bên dưới.
                  </div>
                </div>
              }
            >
              <button
                type="button"
                aria-label="Xem công thức tính điểm"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-cyan-300 border border-cyan-400/40 transition-all cursor-pointer shadow-sm"
              >
                <AppIcon icon={Info} size="sm" />
                <span>Xem công thức tính điểm</span>
              </button>
            </Popover>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
            <span>
              Thời gian: {dayjs(activeGame.startDate).format('DD/MM/YYYY HH:mm')} –{' '}
              {dayjs(activeGame.endDate).format('DD/MM/YYYY HH:mm')}
            </span>
          </div>
        </div>

        {/* Countdown Box */}
        <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10 text-center min-w-[200px]">
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-medium mb-1 uppercase tracking-wider">
            <AppIcon icon={Clock} size="sm" />
            <span>Thời Gian Còn Lại</span>
          </div>
          <div className="text-2xl font-black tabular-nums tracking-wider text-amber-300">
            {formatCountdown(secondsRemaining)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Live · Tự động cập nhật mỗi 15s</div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {activeGame.gameType === 'TEAM_KPI' && gameDetail?.teamKpiSummary ? (
        <div className={`grid grid-cols-2 ${heroGridColsClass} gap-3 mt-6 pt-6 border-t border-white/10`}>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
            <div className="text-xs text-slate-400 uppercase font-medium flex items-center justify-between">
              <span>Mục Tiêu Hôm Nay</span>
              <span className="text-[10px] text-purple-300">
                {gameDetail.teamKpiSummary.config.timeWindowStart || '08:00'}–
                {gameDetail.teamKpiSummary.config.timeWindowEnd || '17:00'}
              </span>
            </div>
            <div className="text-xl font-bold mt-1 text-white tabular-nums">
              {gameDetail.teamKpiSummary.todayBookings} / {gameDetail.teamKpiSummary.todayTarget} Booking
            </div>
            <div className="text-xs text-purple-300 mt-0.5">
              {gameDetail.teamKpiSummary.todayPassed ? 'Đã đạt chỉ tiêu ngày 🏆' : 'Đang thi đấu'}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
            <div className="text-xs text-slate-400 uppercase font-medium">Quỹ Thưởng Team</div>
            <div
              className={`text-xl font-bold mt-1 tabular-nums ${gameDetail.teamKpiSummary.netReward >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {gameDetail.teamKpiSummary.netReward >= 0 ? '+' : ''}
              {gameDetail.teamKpiSummary.netReward.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Đạt: +{(gameDetail.teamKpiSummary.config.rewardPerDay || 50000).toLocaleString('vi-VN')}đ/ngày
            </div>
          </div>

          <ArenaBonusStatCards {...bonusCardsProps} />

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
            <div className="text-xs text-slate-400 uppercase font-medium">Tỷ Lệ Đạt KPI</div>
            <div className="text-xl font-bold mt-1 text-white tabular-nums">
              {gameDetail.teamKpiSummary.passedDays} / {gameDetail.teamKpiSummary.totalDays} Ngày
            </div>
            <div className="text-xs text-emerald-400 mt-0.5">
              Đạt: {gameDetail.teamKpiSummary.passedDays}d · Phạt: {gameDetail.teamKpiSummary.failedDays}d
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
            <div className="text-xs text-slate-400 uppercase font-medium flex items-center gap-1 text-rose-300">
              <AppIcon icon={ShieldAlert} size="sm" />
              <span>Mức Phạt Không Đạt</span>
            </div>
            <div className="text-sm font-semibold mt-1 text-rose-200 line-clamp-1">
              -{(gameDetail.teamKpiSummary.config.penaltyPerDay || 25000).toLocaleString('vi-VN')} đ/ngày
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Ghi nhận vào quỹ Team</div>
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-2 ${heroGridColsClass} gap-3 mt-6 pt-6 border-t border-white/10`}>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
            <div className="text-xs text-slate-400 uppercase font-medium flex items-center justify-between">
              <span>Mục Tiêu KPI</span>
              <Tooltip title={`Công thức: ${scoringRule.formula}`}>
                <span className="text-[10px] lowercase text-cyan-300/80 cursor-help underline decoration-dotted">
                  {scoringRule.unit}
                </span>
              </Tooltip>
            </div>
            <div className="text-xl font-bold mt-1 text-white tabular-nums">
              {activeGame.targetScore ? `${activeGame.targetScore} điểm` : 'Tự do'}
            </div>
            <div className="text-xs text-emerald-400 mt-0.5">Toàn đội: {gameDetail?.stats.totalScore || 0} điểm</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
            <div className="text-xs text-slate-400 uppercase font-medium">Quỹ Giải Thưởng</div>
            <div className="text-xl font-bold mt-1 text-amber-400 tabular-nums">
              {activeGame.rewardPool.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {activeGame.entryFee > 0 ? `Cược: ${activeGame.entryFee.toLocaleString('vi-VN')}đ` : 'Miễn phí'}
            </div>
          </div>

          <ArenaBonusStatCards {...bonusCardsProps} />

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
            <div className="text-xs text-slate-400 uppercase font-medium">Dẫn Đầu (Top 1)</div>
            <div className="text-xl font-bold mt-1 text-white truncate">{top1?.staffName || 'Chưa có'}</div>
            <div className="text-xs text-amber-300 mt-0.5 tabular-nums">{top1 ? `${top1.score} điểm` : '-'}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
            <div className="text-xs text-slate-400 uppercase font-medium flex items-center gap-1 text-rose-300">
              <AppIcon icon={ShieldAlert} size="sm" />
              <span>Hình Phạt Vui</span>
            </div>
            <div className="text-sm font-semibold mt-1 text-rose-200 line-clamp-1">
              {activeGame.penaltyDescription || 'Chưa thiết lập'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Dành cho người không đạt</div>
          </div>
        </div>
      )}
    </div>
  );
}
