'use client';

import React, { useState } from 'react';
import { Button, Typography, message } from 'antd';
import { Trophy, Award, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { BkGameDetailResponse, BkGameParticipant } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon, DataTable, StatusTag } from '~/components/ui';
import { apiClient } from '~/lib/api-client';

interface BkGameFinalizeModalProps {
  open: boolean;
  onClose: () => void;
  gameDetail: BkGameDetailResponse;
  onSuccess: () => void;
}

export default function BkGameFinalizeModal({ open, onClose, gameDetail, onSuccess }: BkGameFinalizeModalProps) {
  const [loading, setLoading] = useState(false);
  const { game, leaderboard } = gameDetail;

  const handleFinalize = async () => {
    setLoading(true);
    try {
      await apiClient.bk.finalizeGame(game.id);
      message.success('Đã chốt kết quả và công bố giải thưởng thành công!');
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi chốt kết quả. Vui lòng thử lại.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => {
        if (rank === 1) return <StatusTag status="gold" label="#1 Vàng" />;
        if (rank === 2) return <StatusTag status="default" label="#2 Bạc" />;
        if (rank === 3) return <StatusTag status="orange" label="#3 Đồng" />;
        return <span className="text-slate-400">#{rank}</span>;
      },
    },
    {
      title: 'Nhân sự',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: 'Điểm số',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{score}</span>
      ),
    },
    {
      title: 'Giải thưởng / Hình phạt vui',
      key: 'outcome',
      render: (_: unknown, record: BkGameParticipant) => {
        if (record.rank === 1) {
          return (
            <div className="flex items-center gap-1.5 text-amber-500 font-medium">
              <AppIcon icon={Trophy} size="sm" />
              <span>Quán Quân · Nhận quỹ thưởng {game.rewardPool.toLocaleString('vi-VN')} đ</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <AppIcon icon={ShieldAlert} size="sm" className="text-rose-400" />
            <span>{game.penaltyDescription || 'Nhận hình phạt vui từ đội thắng'}</span>
          </div>
        );
      },
    },
  ];

  return (
    <AdaptiveModal
      intent="confirm"
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Award} size="md" className="text-amber-500" />
          <span className="font-semibold text-base">Tổng Kết & Công Bố Kết Quả Game BK</span>
        </div>
      }
      footer={null}
      width={700}
      destroyOnHidden
    >
      <div className="mt-4 space-y-4">
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Typography.Title level={5} className="!mb-1 text-amber-600 dark:text-amber-400">
            {game.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-xs">
            Tổng quỹ giải thưởng: <strong>{game.rewardPool.toLocaleString('vi-VN')} đ</strong> · Hình phạt vui:{' '}
            <strong>{game.penaltyDescription || 'Chưa thiết lập'}</strong>
          </Typography.Text>
        </div>

        <DataTable dataSource={leaderboard} columns={columns} rowKey="id" pagination={false} size="small" />

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={onClose} disabled={loading}>
            Đóng
          </Button>
          <Button
            type="primary"
            onClick={handleFinalize}
            loading={loading}
            icon={<AppIcon icon={CheckCircle2} size="sm" />}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
          >
            Chốt & Công Bố Giải Thưởng
          </Button>
        </div>
      </div>
    </AdaptiveModal>
  );
}
