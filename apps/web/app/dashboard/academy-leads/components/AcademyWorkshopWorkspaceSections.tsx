'use client';

import React from 'react';
import { Button } from 'antd';
import { ExternalLink, Play, RefreshCw, Trophy, Users } from 'lucide-react';
import type {
  AcademyInstructorBonus,
  AcademyWorkshopAgendaItem,
  AcademyWorkshopDetail,
  AcademyWorkshopReward,
  AcademyWorkshopSummary,
} from '@mos-lab/shared';
import { AppIcon, DataSection, IconText, MetricGrid, StatePanel, StatusTag } from '../../../../components/ui';
import AcademyWorkshopSharedQrButton from './AcademyWorkshopSharedQrButton';

export function AcademyWorkshopHeaderActions({
  workshop,
  loading,
  onRefresh,
  onOpenLive,
}: {
  workshop: AcademyWorkshopDetail;
  loading: boolean;
  onRefresh: () => void;
  onOpenLive: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button loading={loading} onClick={onRefresh}>
        <IconText icon={<AppIcon icon={RefreshCw} />}>Làm mới</IconText>
      </Button>
      <AcademyWorkshopSharedQrButton workshopName={workshop.name} joinUrl={workshop.sharedJoinUrl} />
      <Button onClick={() => window.open(`/academy/workshops/display/${workshop.displayCode}`, '_blank')}>
        <IconText icon={<AppIcon icon={ExternalLink} />}>Leaderboard</IconText>
      </Button>
      <Button type="primary" onClick={onOpenLive}>
        <IconText icon={<AppIcon icon={Play} />}>Live Control</IconText>
      </Button>
    </div>
  );
}

export function AcademyWorkshopMetrics({ summary }: { summary: AcademyWorkshopSummary }) {
  const conversion = summary.total ? Math.round((summary.tuitionPaid / summary.total) * 100) : 0;
  return (
    <MetricGrid
      items={[
        { key: 'roster', title: 'Roster', value: summary.total, format: 'number', icon: <AppIcon icon={Users} /> },
        { key: 'confirmed', title: 'Xác nhận đến', value: summary.confirmed, format: 'number' },
        { key: 'checkedin', title: 'Check-in', value: summary.checkedIn, format: 'number' },
        {
          key: 'conversion',
          title: 'Conversion học phí',
          value: conversion,
          format: 'percent',
          icon: <AppIcon icon={Trophy} />,
        },
      ]}
    />
  );
}

export function AcademyWorkshopAgendaSnapshot({ agenda }: { agenda: AcademyWorkshopAgendaItem[] }) {
  return (
    <DataSection title="Agenda snapshot">
      <div className="space-y-3">
        {agenda.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <div className="font-semibold">
                {item.sortOrder}. {item.title}
              </div>
              <div className="mt-1 text-xs opacity-60">
                {item.kind} · <span className="tabular-nums">{Math.round(item.plannedDurationSeconds / 60)} phút</span>
              </div>
            </div>
            <StatusTag
              status={
                item.status === 'COMPLETED'
                  ? 'success'
                  : item.status === 'RUNNING'
                    ? 'processing'
                    : item.status === 'PAUSED'
                      ? 'warning'
                      : 'default'
              }
              label={item.status}
            />
          </div>
        ))}
      </div>
    </DataSection>
  );
}

export function AcademyWorkshopSettlement({
  rewards,
  bonuses,
  onFulfillReward,
  onPayBonus,
}: {
  rewards: AcademyWorkshopReward[];
  bonuses: AcademyInstructorBonus[];
  onFulfillReward: (rewardId: number) => void;
  onPayBonus: (bonusId: number) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <DataSection title="Phần thưởng game">
        <div className="space-y-2">
          {rewards.length ? (
            rewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <strong>{reward.label}</strong>
                  <div className="text-xs opacity-60">
                    Participant #{reward.participantId} · {reward.sourceType}
                  </div>
                </div>
                {reward.status === 'PROMISED' ? (
                  <Button size="small" onClick={() => onFulfillReward(reward.id)}>
                    Đã trao
                  </Button>
                ) : (
                  <StatusTag status={reward.status === 'FULFILLED' ? 'success' : 'default'} label={reward.status} />
                )}
              </div>
            ))
          ) : (
            <StatePanel kind="empty" title="Chưa có phần thưởng được hứa" surface={false} />
          )}
        </div>
      </DataSection>
      <DataSection title="Thưởng giáo viên">
        <div className="space-y-2">
          {bonuses.length ? (
            bonuses.map((bonus) => (
              <div key={bonus.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <strong>{bonus.instructor.displayName}</strong>
                  <div className="text-xs opacity-60">
                    {bonus.courseName} ·{' '}
                    <span className="tabular-nums">{bonus.amountVnd.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
                {bonus.status === 'EARNED' ? (
                  <Button size="small" onClick={() => onPayBonus(bonus.id)}>
                    Đã chi
                  </Button>
                ) : (
                  <StatusTag
                    status={
                      bonus.status === 'MISSING_CONFIG' ? 'orange' : bonus.status === 'PAID' ? 'success' : 'default'
                    }
                    label={bonus.status}
                  />
                )}
              </div>
            ))
          ) : (
            <StatePanel kind="empty" title="Chưa phát sinh thưởng giáo viên" surface={false} />
          )}
        </div>
      </DataSection>
    </div>
  );
}
