'use client';

import React from 'react';
import { Button } from 'antd';
import { BadgeCheck, ExternalLink, LogIn, Play, RefreshCw, Trophy, Users } from 'lucide-react';
import type {
  AcademyInstructorBonus,
  AcademyStaffOption,
  AcademyWorkshopAgendaItem,
  AcademyWorkshopDetail,
  AcademyWorkshopReward,
  AcademyWorkshopSummary,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AppIcon,
  DataSection,
  IconButton,
  IconText,
  MetricGrid,
  StatePanel,
  StatusTag,
} from '../../../../components/ui';
import AcademyWorkshopEditButton from './AcademyWorkshopEditButton';
import AcademyWorkshopSharedQrButton from './AcademyWorkshopSharedQrButton';

export function AcademyWorkshopHeaderActions({
  workshop,
  staffOptions,
  canEdit,
  loading,
  onRefresh,
  onOpenLive,
  onUpdated,
}: {
  workshop: AcademyWorkshopDetail;
  staffOptions: AcademyStaffOption[];
  canEdit: boolean;
  loading: boolean;
  onRefresh: () => void;
  onOpenLive: () => void;
  onUpdated: (updated: AcademyWorkshopDetail) => void;
}) {
  return (
    <div className="academy-workshop-header-actions">
      <IconButton label="Làm mới dữ liệu" icon={RefreshCw} loading={loading} onClick={onRefresh} />
      <AcademyWorkshopEditButton
        workshop={workshop}
        staffOptions={staffOptions}
        canEdit={canEdit}
        iconOnly
        onUpdated={onUpdated}
      />
      {workshop.registrationUrl ? (
        <AcademyWorkshopSharedQrButton
          workshopName={workshop.name}
          joinUrl={workshop.registrationUrl}
          label="Link đăng ký"
          purpose="registration"
          registrationOpen={workshop.registrationOpen}
          onRegistrationOpenChange={
            canEdit
              ? async (registrationOpen) => {
                  onUpdated(await apiClient.academySales.workshops.update(workshop.id, { registrationOpen }));
                }
              : undefined
          }
          iconOnly
        />
      ) : null}
      <IconButton
        label="Mở Leaderboard"
        icon={ExternalLink}
        onClick={() => window.open(`/academy/workshops/display/${workshop.displayCode}`, '_blank')}
      />
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
      className="academy-workshop-metric-grid"
      items={[
        { key: 'roster', title: 'Roster', value: summary.total, format: 'number', icon: <AppIcon icon={Users} /> },
        {
          key: 'confirmed',
          title: 'Xác nhận',
          value: summary.confirmed,
          format: 'number',
          icon: <AppIcon icon={BadgeCheck} />,
        },
        {
          key: 'checkedin',
          title: 'Check-in',
          value: summary.checkedIn,
          format: 'number',
          icon: <AppIcon icon={LogIn} />,
        },
        {
          key: 'conversion',
          title: 'Chốt học phí',
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
    <div className="academy-workshop-settlement grid gap-4 xl:grid-cols-2">
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
