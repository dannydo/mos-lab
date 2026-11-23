'use client';

import React from 'react';
import { Avatar, Button, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Clock, Eye, Phone, PlayCircle, User } from 'lucide-react';
import { maskPhoneNumber, type LocaStaffActivityLogItem } from '@mos-lab/shared';
import { AppIcon, CopyPhoneButton, TableIndexHeader } from '~/components/ui';
import { LocaActivityActionTag } from './LocaActivityActionTag';
import { formatCallDurationLabel, getCustomerAvatarMeta, isPhoneMaskedForCurrentUser } from './activityTabHelpers';

const { Text } = Typography;

export interface BuildLocaStaffActivityColumnsOptions {
  isDark: boolean;
  currentPage: number;
  pageSize: number;
  playingAudioId: string | null;
  onToggleAudio: (id: string, url?: string | null) => void;
  onOpenCustomerDetail: (customerId: number) => void;
}

export function buildLocaStaffActivityColumns({
  isDark,
  currentPage,
  pageSize,
  playingAudioId,
  onToggleAudio,
  onOpenCustomerDetail,
}: BuildLocaStaffActivityColumnsOptions): ColumnsType<LocaStaffActivityLogItem> {
  return [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 60,
      render: (_: unknown, __: LocaStaffActivityLogItem, index: number) => (
        <Text type="secondary" className="tabular-nums font-mono">
          {(currentPage - 1) * pageSize + index + 1}
        </Text>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 140,
      sorter: (a: LocaStaffActivityLogItem, b: LocaStaffActivityLogItem) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend',
      render: (val: string) => (
        <Text className="tabular-nums font-mono text-xs">{dayjs(val).format('DD/MM/YYYY HH:mm')}</Text>
      ),
    },
    {
      title: 'Nhân viên',
      dataIndex: 'staffName',
      key: 'staffName',
      width: 140,
      sorter: (a: LocaStaffActivityLogItem, b: LocaStaffActivityLogItem) =>
        a.staffName.localeCompare(b.staffName, 'vi'),
      render: (val: string) => (
        <Space size={4}>
          <AppIcon icon={User} size={13} className="text-slate-400" />
          <Text strong>{val}</Text>
        </Space>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 230,
      align: 'left',
      sorter: (a: LocaStaffActivityLogItem, b: LocaStaffActivityLogItem) =>
        a.customerName.localeCompare(b.customerName, 'vi'),
      render: (_: unknown, record: LocaStaffActivityLogItem) => {
        const { firstLetter, bgClass } = getCustomerAvatarMeta(record.customerName);
        const isMaskedRole = record.customerPhone ? isPhoneMaskedForCurrentUser() : true;
        const displayPhone = record.customerPhone
          ? isMaskedRole
            ? maskPhoneNumber(record.customerPhone)
            : record.customerPhone
          : '';

        return (
          <div className="flex items-center gap-2 py-0.5 text-left">
            <Avatar
              src={record.customerAvatar || undefined}
              size={28}
              className={`shrink-0 font-bold shadow-sm border border-slate-700/40 text-xs text-white align-middle ${
                record.customerAvatar ? '' : bgClass
              }`}
            >
              {!record.customerAvatar ? firstLetter : null}
            </Avatar>

            <div className="flex flex-col items-start min-w-0 text-left leading-tight">
              <Button
                type="link"
                size="small"
                className={`p-0 h-auto text-left justify-start font-semibold text-xs hover:underline truncate max-w-[140px] inline-flex items-center ${
                  isDark ? 'text-sky-400' : 'text-sky-600'
                }`}
                onClick={() => onOpenCustomerDetail(record.legacyUserId)}
              >
                {record.customerName}
              </Button>
              {record.customerPhone ? (
                <div className="flex items-center gap-1">
                  <Text
                    type="secondary"
                    className="text-[11px] tabular-nums font-mono flex items-center justify-start gap-1 text-slate-400 text-left"
                  >
                    <AppIcon icon={Phone} size={10} className="text-slate-500" />
                    {displayPhone}
                  </Text>
                  {!isMaskedRole && <CopyPhoneButton phone={record.customerPhone} size="xs" />}
                </div>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Hành động',
      dataIndex: 'actionType',
      key: 'actionType',
      width: 130,
      sorter: (a: LocaStaffActivityLogItem, b: LocaStaffActivityLogItem) => a.actionType.localeCompare(b.actionType),
      render: (val: string) => <LocaActivityActionTag actionType={val} />,
    },
    {
      title: 'Chi tiết tương tác',
      key: 'actionDetail',
      render: (_: unknown, record: LocaStaffActivityLogItem) => (
        <div className="flex flex-col gap-1">
          <Text className="text-sm">{record.actionDetail}</Text>
          {record.durationSec && record.durationSec > 0 ? (
            <Text type="secondary" className="text-xs tabular-nums font-mono flex items-center gap-1">
              <AppIcon icon={Clock} size={12} /> Thời lượng thoại: {formatCallDurationLabel(record.durationSec)}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_: unknown, record: LocaStaffActivityLogItem) => {
        const isPlaying = playingAudioId === record.id;
        return (
          <Space size="small">
            {record.recordingUrl ? (
              <Tooltip title="Nghe ghi âm cuộc gọi">
                <Button
                  type="text"
                  size="small"
                  aria-label="Nghe ghi âm cuộc gọi"
                  aria-pressed={isPlaying}
                  icon={
                    <AppIcon
                      icon={PlayCircle}
                      size={18}
                      className={isPlaying ? 'text-amber-500' : 'text-emerald-500'}
                    />
                  }
                  onClick={() => onToggleAudio(record.id, record.recordingUrl)}
                />
              </Tooltip>
            ) : null}
            <Tooltip title="Xem chi tiết khách hàng">
              <Button
                type="text"
                size="small"
                aria-label="Xem chi tiết khách hàng"
                icon={<AppIcon icon={Eye} size={16} className="text-blue-500" />}
                onClick={() => onOpenCustomerDetail(record.legacyUserId)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];
}
