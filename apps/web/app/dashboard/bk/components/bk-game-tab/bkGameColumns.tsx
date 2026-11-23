'use client';

import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import BkAvatar from '../BkAvatar';
import {
  METRIC_LABEL,
  type GameMetric,
  type RankedGameEntry,
  type StaffDoneBonusStat,
  type StaffTeamBookingDoneStat,
} from './bkGameUtils';

export interface BuildBkGameLeaderboardColumnsParams {
  metric: GameMetric;
  hasDoneBonusConfig: boolean;
  hasTeamBookingDoneBonus: boolean;
  staffDoneBonusMap: Map<number, StaffDoneBonusStat>;
  staffTeamBookingDoneBonusMap: Map<number, StaffTeamBookingDoneStat>;
  onOpenDoneBonusDrawer: (staffId: number) => void;
  onOpenTeamBookingDoneDrawer: (staffId: number, rewardDate: string | null) => void;
}

export function buildBkGameLeaderboardColumns({
  metric,
  hasDoneBonusConfig,
  hasTeamBookingDoneBonus,
  staffDoneBonusMap,
  staffTeamBookingDoneBonusMap,
  onOpenDoneBonusDrawer,
  onOpenTeamBookingDoneDrawer,
}: BuildBkGameLeaderboardColumnsParams): ColumnsType<RankedGameEntry> {
  const baseColumns: ColumnsType<RankedGameEntry> = [
    {
      title: '#',
      dataIndex: 'gameRank',
      key: 'rank',
      width: 64,
      render: (value: number) => <span className="tabular-nums font-semibold">{value}</span>,
    },
    {
      title: 'Telesales',
      dataIndex: 'displayName',
      key: 'staff',
      render: (name: string, record: RankedGameEntry) => (
        <div className="flex min-w-0 items-center gap-2">
          <BkAvatar name={name || 'Booker'} src={record.avatar} size={32} />
          <span className="truncate font-medium">{name || 'Chưa có tên'}</span>
        </div>
      ),
    },
    {
      title: METRIC_LABEL[metric],
      dataIndex: 'gameScore',
      key: 'score',
      align: 'right',
      render: (value: number) => <span className="tabular-nums font-semibold">{value}</span>,
    },
    {
      title: 'Gọi',
      dataIndex: 'callCount',
      key: 'calls',
      align: 'right',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Nghe máy',
      dataIndex: 'pickupCount',
      key: 'pickups',
      align: 'right',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Booking',
      dataIndex: 'totalCreatedBookings',
      key: 'bookings',
      align: 'right',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Done',
      dataIndex: 'doneBookings',
      key: 'done',
      align: 'right',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
  ];

  const doneBonusColumns: ColumnsType<RankedGameEntry> = hasDoneBonusConfig
    ? [
        {
          title: 'Done Thưởng',
          key: 'doneBonusCount',
          align: 'right',
          render: (_: unknown, record: RankedGameEntry) => {
            const stat = staffDoneBonusMap.get(record.bookerId) || { doneCount: 0, totalBonus: 0 };
            return (
              <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {stat.doneCount}
              </span>
            );
          },
        },
        {
          title: 'Thưởng Bonus/Done',
          key: 'totalDoneBonus',
          align: 'right',
          render: (_: unknown, record: RankedGameEntry) => {
            const stat = staffDoneBonusMap.get(record.bookerId) || { doneCount: 0, totalBonus: 0 };
            return (
              <button
                type="button"
                onClick={() => onOpenDoneBonusDrawer(record.bookerId)}
                className="inline-flex items-center gap-1 font-bold text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer tabular-nums"
                title="Bấm để xem đối soát chi tiết đơn thưởng"
              >
                <span>+{stat.totalBonus.toLocaleString('vi-VN')} đ</span>
              </button>
            );
          },
        },
      ]
    : [];

  const teamBookingDoneColumns: ColumnsType<RankedGameEntry> = hasTeamBookingDoneBonus
    ? [
        {
          title: 'Done Lẻ (Mốc BK)',
          key: 'teamBookingDoneCount',
          align: 'right',
          render: (_: unknown, record: RankedGameEntry) => {
            const stat = staffTeamBookingDoneBonusMap.get(record.bookerId) || {
              singleDoneCount: 0,
              totalBonus: 0,
            };
            return (
              <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                {stat.singleDoneCount}
              </span>
            );
          },
        },
        {
          title: 'Thưởng Mốc BK',
          key: 'totalTeamBookingDoneBonus',
          align: 'right',
          render: (_: unknown, record: RankedGameEntry) => {
            const stat = staffTeamBookingDoneBonusMap.get(record.bookerId) || {
              singleDoneCount: 0,
              totalBonus: 0,
            };
            return (
              <button
                type="button"
                onClick={() => onOpenTeamBookingDoneDrawer(record.bookerId, null)}
                className="inline-flex items-center gap-1 font-bold text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer tabular-nums"
                title="Bấm để xem chi tiết đơn Done khách lẻ được thưởng theo mốc Booking Team"
              >
                <span>+{stat.totalBonus.toLocaleString('vi-VN')} đ</span>
              </button>
            );
          },
        },
      ]
    : [];

  return [...baseColumns, ...doneBonusColumns, ...teamBookingDoneColumns];
}
