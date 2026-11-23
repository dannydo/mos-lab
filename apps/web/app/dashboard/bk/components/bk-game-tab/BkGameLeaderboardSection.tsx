'use client';

import React, { useMemo } from 'react';
import { Button, Segmented } from 'antd';
import dayjs from 'dayjs';
import { CheckCircle2, Edit3 } from 'lucide-react';
import type { BkGame, BkGameScoringRule } from '@mos-lab/shared';
import { AppIcon, DataSection, DataTable, MetricGrid, StatePanel } from '~/components/ui';
import { buildBkGameLeaderboardColumns } from './bkGameColumns';
import {
  METRIC_LABEL,
  METRIC_OPTIONS,
  type GameMetric,
  type RankedGameEntry,
  type StaffDoneBonusStat,
  type StaffTeamBookingDoneStat,
} from './bkGameUtils';

export interface BkGameLeaderboardSectionProps {
  metric: GameMetric;
  onChangeMetric: (next: GameMetric) => void;
  rankedEntries: RankedGameEntry[];
  totalScore: number;
  leaderScore: number;
  activeGame: BkGame | undefined;
  scoringRule: BkGameScoringRule;
  loading: boolean;
  error: string | null;
  hasDoneBonusConfig: boolean;
  hasTeamBookingDoneBonus: boolean;
  staffDoneBonusMap: Map<number, StaffDoneBonusStat>;
  staffTeamBookingDoneBonusMap: Map<number, StaffTeamBookingDoneStat>;
  onRetryLoad: () => void;
  onOpenEditModal: () => void;
  onOpenFinalizeModal: () => void;
  onOpenDoneBonusDrawer: (staffId: number) => void;
  onOpenTeamBookingDoneDrawer: (staffId: number, rewardDate: string | null) => void;
}

export function BkGameLeaderboardSection({
  metric,
  onChangeMetric,
  rankedEntries,
  totalScore,
  leaderScore,
  activeGame,
  scoringRule,
  loading,
  error,
  hasDoneBonusConfig,
  hasTeamBookingDoneBonus,
  staffDoneBonusMap,
  staffTeamBookingDoneBonusMap,
  onRetryLoad,
  onOpenEditModal,
  onOpenFinalizeModal,
  onOpenDoneBonusDrawer,
  onOpenTeamBookingDoneDrawer,
}: BkGameLeaderboardSectionProps) {
  const columns = useMemo(
    () =>
      buildBkGameLeaderboardColumns({
        metric,
        hasDoneBonusConfig,
        hasTeamBookingDoneBonus,
        staffDoneBonusMap,
        staffTeamBookingDoneBonusMap,
        onOpenDoneBonusDrawer,
        onOpenTeamBookingDoneDrawer,
      }),
    [
      metric,
      hasDoneBonusConfig,
      hasTeamBookingDoneBonus,
      staffDoneBonusMap,
      staffTeamBookingDoneBonusMap,
      onOpenDoneBonusDrawer,
      onOpenTeamBookingDoneDrawer,
    ]
  );

  return (
    <>
      <Segmented<GameMetric>
        aria-label="Chỉ số xếp hạng Game BK"
        options={METRIC_OPTIONS}
        value={metric}
        onChange={onChangeMetric}
      />

      <MetricGrid
        items={[
          { key: 'participants', title: 'Người tham gia', value: rankedEntries.length, format: 'number' },
          { key: 'total', title: `Tổng ${METRIC_LABEL[metric]}`, value: totalScore, format: 'number' },
          { key: 'leader', title: `Dẫn đầu ${METRIC_LABEL[metric]}`, value: leaderScore, format: 'number' },
        ]}
      />

      <DataSection
        title={`Bảng xếp hạng · ${METRIC_LABEL[metric]}`}
        extra={
          activeGame && (
            <div className="flex items-center gap-2">
              <Button icon={<AppIcon icon={Edit3} size="sm" />} onClick={onOpenEditModal}>
                Chỉnh sửa Game
              </Button>
              {activeGame.status === 'ACTIVE' && (
                <Button
                  type="primary"
                  icon={<AppIcon icon={CheckCircle2} size="sm" />}
                  onClick={onOpenFinalizeModal}
                  className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
                >
                  Chốt & Công Bố Kết Quả
                </Button>
              )}
            </div>
          )
        }
      >
        {activeGame && (
          <div
            data-testid="bk-game-table-disclaimer"
            className="mb-3 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
          >
            <span className="text-slate-600 dark:text-slate-400">
              🏆 <strong>Đang hiển thị theo Game:</strong> Bảng xếp hạng bên dưới được lọc trực tiếp theo thời gian diễn
              ra của game <strong>{activeGame.title}</strong> từ{' '}
              <strong>{dayjs(activeGame.startDate).format('DD/MM/YYYY HH:mm')}</strong> đến{' '}
              <strong>{dayjs(activeGame.endDate).format('DD/MM/YYYY HH:mm')}</strong> theo công thức:{' '}
              <em>{scoringRule.formula}</em>.
              {activeGame.allowedBookingChannels && activeGame.allowedBookingChannels.length > 0 && (
                <span>
                  {' '}
                  · 🎯 <strong>Chỉ ghi nhận kênh:</strong>{' '}
                  <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-semibold">
                    {activeGame.allowedBookingChannels.join(', ')}
                  </code>
                </span>
              )}
              {activeGame.gameType === 'TEAM_KPI' && (
                <span>
                  {' '}
                  · ⏰ <strong>Khung giờ tính KPI:</strong>{' '}
                  <code className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-mono font-semibold">
                    {activeGame.teamKpiConfig?.timeWindowStart || '08:00'}–
                    {activeGame.teamKpiConfig?.timeWindowEnd || '17:00'}
                  </code>
                </span>
              )}
            </span>
          </div>
        )}

        {error ? (
          <StatePanel
            kind="error"
            title="Không tải được Game BK"
            description={error}
            extra={<Button onClick={onRetryLoad}>Thử lại</Button>}
          />
        ) : !loading && rankedEntries.length === 0 ? (
          <StatePanel
            kind="empty"
            title="Chưa có dữ liệu thi đua"
            description="Không có hoạt động BK trong khoảng thời gian đang chọn."
          />
        ) : (
          <DataTable
            rowKey="bookerId"
            loading={loading}
            dataSource={rankedEntries}
            pagination={false}
            columnPriority={{
              rank: 'secondary',
              staff: 'primary',
              score: 'primary',
              calls: 'secondary',
              pickups: 'secondary',
              bookings: 'secondary',
              done: 'secondary',
              doneBonusCount: 'secondary',
              totalDoneBonus: 'primary',
              teamBookingDoneCount: 'secondary',
              totalTeamBookingDoneBonus: 'primary',
            }}
            columns={columns}
          />
        )}
      </DataSection>
    </>
  );
}
