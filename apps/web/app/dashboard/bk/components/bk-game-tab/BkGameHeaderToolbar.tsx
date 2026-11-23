'use client';

import React from 'react';
import { Alert, Button, Select, Typography } from 'antd';
import { Edit3, Plus, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import type { BkGame } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';

export interface BkGameHeaderToolbarProps {
  activeGame: BkGame | undefined;
  comparisonMode: 'month' | 'week' | 'day';
  games: BkGame[];
  selectedGameId: number | null;
  onSelectGameId: (id: number) => void;
  hasDoneBonusConfig: boolean;
  hasTeamBookingDoneBonus: boolean;
  loading: boolean;
  gameLoading: boolean;
  onOpenCreateModal: () => void;
  onOpenEditModal: () => void;
  onOpenDoneBonusDrawer: () => void;
  onOpenTeamBookingDoneDrawer: () => void;
  onRefresh: () => void;
}

export function BkGameHeaderToolbar({
  activeGame,
  comparisonMode,
  games,
  selectedGameId,
  onSelectGameId,
  hasDoneBonusConfig,
  hasTeamBookingDoneBonus,
  loading,
  gameLoading,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenDoneBonusDrawer,
  onOpenTeamBookingDoneDrawer,
  onRefresh,
}: BkGameHeaderToolbarProps) {
  return (
    <>
      {/* Informational Alert if no active campaign is running */}
      {!activeGame && (
        <Alert
          showIcon
          type="info"
          message="Game BK · bảng thi đua trực tiếp"
          description="Điểm được lấy từ BK Leaderboard chuẩn trong kỳ đang chọn. Manager có thể bấm 'Tạo Game Mới' để thiết lập mục tiêu, cược, chia đội và hình phạt vui."
        />
      )}

      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
        <div>
          <Typography.Title level={4} className="!mb-0 flex items-center gap-2">
            <AppIcon icon={Trophy} size="md" className="text-amber-500" />
            <span>Game BK</span>
          </Typography.Title>
          <Typography.Text type="secondary" className="text-xs">
            Thi đua theo {comparisonMode === 'day' ? 'ngày' : comparisonMode === 'week' ? 'tuần' : 'tháng'} · tự làm mới
            mỗi 15 giây
          </Typography.Text>
        </div>

        <div className="flex items-center gap-2">
          {games.length > 0 && (
            <Select
              value={selectedGameId}
              onChange={onSelectGameId}
              className="min-w-[240px]"
              options={games.map((g) => ({
                value: g.id,
                label: (
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{g.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {g.allowedBookingChannels && g.allowedBookingChannels.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold">
                          🎯 Kênh: {g.allowedBookingChannels.join(', ')}
                        </span>
                      )}
                      <StatusTag
                        status={g.status === 'ACTIVE' ? 'success' : g.status === 'COMPLETED' ? 'default' : 'warning'}
                        label={g.status === 'ACTIVE' ? 'Đang chạy' : g.status === 'COMPLETED' ? 'Đã chốt' : 'Nháp'}
                      />
                    </div>
                  </div>
                ),
              }))}
            />
          )}

          <Button
            type="primary"
            icon={<AppIcon icon={Plus} size="sm" />}
            onClick={onOpenCreateModal}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 font-medium"
          >
            Tạo Game Mới
          </Button>

          {activeGame && (
            <Button icon={<AppIcon icon={Edit3} size="sm" />} onClick={onOpenEditModal} className="font-medium">
              Chỉnh sửa Game
            </Button>
          )}

          {activeGame && hasDoneBonusConfig && (
            <Button
              icon={<AppIcon icon={Sparkles} size="sm" className="text-amber-500" />}
              onClick={onOpenDoneBonusDrawer}
              className="font-medium !text-emerald-700 dark:!text-emerald-300 !border-emerald-300 dark:!border-emerald-700 hover:!bg-emerald-50 dark:hover:!bg-emerald-950/30"
            >
              Chi Tiết Bonus/Done
            </Button>
          )}

          {activeGame && hasTeamBookingDoneBonus && (
            <Button
              icon={<AppIcon icon={Trophy} size="sm" className="text-amber-500" />}
              onClick={onOpenTeamBookingDoneDrawer}
              className="font-medium !text-amber-700 dark:!text-amber-300 !border-amber-300 dark:!border-amber-700 hover:!bg-amber-50 dark:hover:!bg-amber-950/30"
            >
              Chi Tiết Thưởng Mốc BK
            </Button>
          )}

          <Button
            icon={<AppIcon icon={RefreshCw} size="action" />}
            onClick={onRefresh}
            loading={loading || gameLoading}
          >
            Làm mới
          </Button>
        </div>
      </div>
    </>
  );
}
