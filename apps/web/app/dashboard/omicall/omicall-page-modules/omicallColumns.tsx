'use client';

import React from 'react';
import { Button, Popconfirm, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  Copy,
  Eye,
  Lock,
  MapPin,
  Pencil,
  PhoneIncoming,
  PhoneOutgoing,
  Play,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';
import { isAnsweredOrRecordedCall, OmicallFourSourceBadges, OmicallHappyCallCell } from './OmicallRatingChips';
import {
  formatOmicallDuration,
  resolveDisplayCallTime,
  type OmicallConfigRow,
  type OmicallDateMode,
  type OmicallLogRow,
} from './omicallPageTypes';

const { Text } = Typography;

interface BuildOmicallLogsColumnsOptions {
  dateMode: OmicallDateMode;
  playingLogId: number | null;
  reanalyzingLogId: number | null;
  canReviewQa: boolean;
  onCopyUuid: (uuid: string) => void;
  onTogglePlay: (logId: number) => void;
  onReanalyze: (logId: number) => void;
  onOpenQaDrawer: (logId: number) => void;
}

export function buildOmicallLogsColumns({
  dateMode,
  playingLogId,
  reanalyzingLogId,
  canReviewQa,
  onCopyUuid,
  onTogglePlay,
  onReanalyze,
  onOpenQaDrawer,
}: BuildOmicallLogsColumnsOptions): ColumnsType<OmicallLogRow> {
  return [
    {
      title: 'Giờ',
      dataIndex: 'createdAt',
      key: 'time',
      width: 90,
      render: (_: string, record: OmicallLogRow) => {
        const dt = dayjs(resolveDisplayCallTime(record));
        const timeLabel = dateMode === 'day' ? dt.format('HH:mm') : dt.format('DD/MM HH:mm');
        return (
          <Tooltip title={`${dt.format('HH:mm:ss DD/MM/YYYY')} · UUID: ${record.callUuid}`}>
            <div className="group inline-flex items-center gap-1 text-xs tabular-nums text-[var(--mos-text-secondary)]">
              <span className="font-medium text-[var(--mos-text-primary)]">{timeLabel}</span>
              <button
                type="button"
                aria-label="Sao chép Call UUID"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyUuid(record.callUuid);
                }}
                className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 text-[var(--mos-text-secondary)] hover:text-[var(--color-primary)]"
              >
                <AppIcon icon={Copy} size={11} />
              </button>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Khách hàng',
      dataIndex: 'destinationNumber',
      key: 'customer',
      width: 205,
      render: (_: string, record: OmicallLogRow) => {
        const isInbound = String(record.direction || '').toLowerCase() === 'inbound';
        const phone = isInbound ? record.sourceNumber || record.destinationNumber : record.destinationNumber;
        const answered = isAnsweredOrRecordedCall(record);
        return (
          <div className="flex items-start gap-2">
            <Tooltip title={isInbound ? 'Cuộc gọi đến (Inbound)' : 'Cuộc gọi đi (Outbound)'}>
              <span
                className={`mt-0.5 inline-flex shrink-0 ${
                  answered ? 'text-emerald-500' : 'text-[var(--mos-text-secondary)]'
                }`}
              >
                <AppIcon icon={isInbound ? PhoneIncoming : PhoneOutgoing} size={14} />
              </span>
            </Tooltip>
            <div className="min-w-0 flex flex-col">
              {record.customerName ? (
                <>
                  <span className="truncate text-xs font-semibold text-[var(--mos-text-primary)]">
                    {record.customerName}
                  </span>
                  <span className="text-[11px] tabular-nums text-[var(--mos-text-secondary)]">{phone || '—'}</span>
                </>
              ) : (
                <span className="text-xs font-medium tabular-nums text-[var(--mos-text-primary)]">
                  {phone || 'Không rõ SĐT'}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Nhân viên',
      dataIndex: 'staffName',
      key: 'staff',
      width: 155,
      render: (_: unknown, record: OmicallLogRow) => {
        const display = record.staffName || record.staff?.displayName;
        if (!display && !record.storeName) {
          return <span className="text-xs text-[var(--mos-text-secondary)]">—</span>;
        }
        return (
          <div className="flex flex-col">
            <span className="truncate text-xs font-medium text-[var(--mos-text-primary)]">
              {display || (record.staffId ? `Staff #${record.staffId}` : '—')}
            </span>
            {record.storeName && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--mos-text-secondary)]">
                <AppIcon icon={MapPin} size={10} />
                <span className="truncate">{record.storeName}</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Ghi âm',
      key: 'audio',
      width: 150,
      render: (_: unknown, record: OmicallLogRow) => {
        const talkSec = record.billSec && record.billSec > 0 ? record.billSec : record.duration;
        const durationLabel = formatOmicallDuration(talkSec);

        if (record.recordingUrl) {
          const isPlaying = playingLogId === record.id;
          return (
            <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
              <div className="inline-flex items-center gap-2">
                <Tooltip title={isPlaying ? 'Đóng trình phát' : 'Nghe ghi âm ngay'}>
                  <Button
                    size="small"
                    type={isPlaying ? 'primary' : 'default'}
                    shape="circle"
                    icon={<AppIcon icon={isPlaying ? Square : Play} size={11} />}
                    aria-label={isPlaying ? 'Dừng phát' : 'Nghe ghi âm'}
                    onClick={() => onTogglePlay(record.id)}
                  />
                </Tooltip>
                <span className="font-mono text-xs font-medium tabular-nums text-[var(--mos-text-primary)]">
                  {durationLabel}
                </span>
              </div>
              {isPlaying && <audio controls autoPlay src={record.recordingUrl} className="h-7 w-44 outline-none" />}
            </div>
          );
        }

        const statusLabel =
          record.status === 'ANSWER'
            ? 'Đã bắt máy (chưa có ghi âm)'
            : record.status === 'BUSY'
              ? 'Máy bận'
              : record.status === 'CANCEL'
                ? 'Đã hủy'
                : 'Không bắt máy';

        return (
          <Tooltip title={statusLabel}>
            <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-[var(--mos-text-secondary)]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  record.status === 'ANSWER'
                    ? 'bg-emerald-500'
                    : record.status === 'BUSY'
                      ? 'bg-amber-500'
                      : record.status === 'CANCEL'
                        ? 'bg-red-500'
                        : 'bg-zinc-500/60'
                }`}
              />
              <span className="font-mono">{durationLabel}</span>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Happy Call & AI',
      key: 'happyCall',
      width: 220,
      render: (_: unknown, record: OmicallLogRow) => <OmicallHappyCallCell record={record} />,
    },
    {
      title: 'Đánh giá',
      key: 'ratings',
      width: 205,
      render: (_: unknown, record: OmicallLogRow) => {
        const answered = isAnsweredOrRecordedCall(record);
        return (
          <div className="flex items-center justify-between gap-2">
            <OmicallFourSourceBadges record={record} />
            <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {canReviewQa && record.recordingUrl && (
                <Tooltip title="Phân tích lại bằng AI">
                  <Button
                    size="small"
                    type="text"
                    icon={<AppIcon icon={Sparkles} size={13} />}
                    loading={reanalyzingLogId === record.id}
                    aria-label="Phân tích lại AI"
                    onClick={() => onReanalyze(record.id)}
                  />
                </Tooltip>
              )}
              <Tooltip
                title={record.aiLockedUntilSelfRated ? 'Tự đánh giá để mở khóa AI' : 'Mở chi tiết & thẩm định QA'}
              >
                <Button
                  size="small"
                  type={record.aiLockedUntilSelfRated ? 'primary' : answered ? 'default' : 'text'}
                  className={
                    answered && !record.aiLockedUntilSelfRated
                      ? 'border-[var(--color-primary)]/50 text-[var(--color-primary)] hover:border-[var(--color-primary)]'
                      : undefined
                  }
                  icon={
                    <AppIcon
                      icon={record.aiLockedUntilSelfRated ? Lock : Eye}
                      size={13}
                      className={answered && !record.aiLockedUntilSelfRated ? 'text-[var(--color-primary)]' : undefined}
                    />
                  }
                  aria-label="Xem chi tiết cuộc gọi"
                  onClick={() => onOpenQaDrawer(record.id)}
                />
              </Tooltip>
            </div>
          </div>
        );
      },
    },
  ];
}

interface BuildOmicallConfigsColumnsOptions {
  onOpenConfigModal: (staff: OmicallConfigRow) => void;
  onDeleteConfig: (staffId: number, displayName: string) => void;
}

export function buildOmicallConfigsColumns({
  onOpenConfigModal,
  onDeleteConfig,
}: BuildOmicallConfigsColumnsOptions): ColumnsType<OmicallConfigRow> {
  return [
    {
      title: 'Nhân viên (CRM Staff)',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (val: string, record: OmicallConfigRow) => (
        <div>
          <div className="font-bold">{val}</div>
          <Text type="secondary" className="text-xs">
            {record.username}
          </Text>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (val: string) => (
        <StatusTag
          status={val === 'admin' || val === 'super_admin' ? 'error' : 'processing'}
          label={String(val || '').toUpperCase()}
        />
      ),
    },
    {
      title: 'Số máy lẻ (OmiCall Extension)',
      dataIndex: 'extension',
      key: 'extension',
      render: (val: string | null) =>
        val ? (
          <StatusTag status="success" label={val} className="px-2 py-1 text-sm font-bold tabular-nums" />
        ) : (
          <StatusTag status="default" label="Chưa cấu hình" className="text-[var(--mos-text-secondary)]" />
        ),
    },
    {
      title: 'Caller ID / Hotline',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (val: string | null) =>
        val ? (
          <span className="tabular-nums">{val}</span>
        ) : (
          <Text type="secondary" className="text-[13px] italic">
            Không có
          </Text>
        ),
    },
    {
      title: 'Mật khẩu SIP WebRTC',
      dataIndex: 'hasSipPassword',
      key: 'hasSipPassword',
      render: (val: boolean, record: OmicallConfigRow) =>
        record.extension ? (
          val ? (
            <StatusTag status="processing" label="● Đã cấu hình" />
          ) : (
            <StatusTag status="warning" label="● Chưa cấu hình" />
          )
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 220,
      render: (_: unknown, record: OmicallConfigRow) => (
        <Space size="middle">
          <Button icon={<AppIcon icon={Pencil} size={14} />} size="small" onClick={() => onOpenConfigModal(record)}>
            Cấu hình
          </Button>
          {record.extension && (
            <Popconfirm
              title={`Bạn có chắc chắn muốn gỡ máy lẻ của ${record.displayName}?`}
              onConfirm={() => onDeleteConfig(record.staffId, record.displayName)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button icon={<AppIcon icon={Trash2} size={14} />} size="small" danger>
                Gỡ gán
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];
}
