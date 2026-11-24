'use client';

import React from 'react';
import { Button, Popconfirm, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Copy, Eye, Loader2, Pencil, Smile, Sparkles, Trash2, Volume2 } from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';
import {
  formatCallUuidPreview,
  formatOmicallDuration,
  getAiStatusDescriptor,
  getCallStatusDescriptor,
  getHappyStatusDescriptor,
  resolveDisplayCallTime,
  type OmicallConfigRow,
  type OmicallLogRow,
} from './omicallPageTypes';

const { Text } = Typography;

export function renderCallStatus(status: string): React.ReactNode {
  const descriptor = getCallStatusDescriptor(status);
  return <StatusTag status={descriptor.status} label={descriptor.label} />;
}

export function renderAIStatus(status: string): React.ReactNode {
  const descriptor = getAiStatusDescriptor(status);
  if (descriptor.isProcessing) {
    return (
      <StatusTag
        status={descriptor.status}
        icon={<AppIcon icon={Loader2} size={12} className="animate-spin" />}
        label={descriptor.label}
      />
    );
  }
  return <StatusTag status={descriptor.status} label={descriptor.label} />;
}

export function renderHappyStatus(status: string): React.ReactNode {
  const descriptor = getHappyStatusDescriptor(status);
  return (
    <StatusTag
      status={descriptor.status}
      label={descriptor.label}
      className={descriptor.emphasized ? 'font-bold' : ''}
    />
  );
}

interface BuildOmicallLogsColumnsOptions {
  playingLogId: number | null;
  reanalyzingLogId: number | null;
  canReviewQa: boolean;
  onCopyUuid: (uuid: string) => void;
  onTogglePlay: (logId: number) => void;
  onReanalyze: (logId: number) => void;
  onOpenQaDrawer: (logId: number) => void;
}

export function buildOmicallLogsColumns({
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
      title: 'Mã cuộc gọi',
      dataIndex: 'callUuid',
      key: 'callUuid',
      width: 170,
      render: (uuid: string) => (
        <Space size={4}>
          <Tooltip title={uuid}>
            <Text className="font-mono text-xs font-medium tabular-nums">{formatCallUuidPreview(uuid)}</Text>
          </Tooltip>
          <Button
            icon={<AppIcon icon={Copy} size={13} />}
            type="text"
            size="small"
            aria-label="Sao chép Call UUID"
            onClick={() => onCopyUuid(uuid)}
            className="text-[var(--mos-text-secondary)]"
          />
        </Space>
      ),
    },
    {
      title: 'Thời gian gọi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 155,
      render: (_: string, record: OmicallLogRow) => (
        <span className="text-xs tabular-nums">{new Date(resolveDisplayCallTime(record)).toLocaleString('vi-VN')}</span>
      ),
    },
    {
      title: 'Nhân viên / Chi nhánh',
      dataIndex: 'staffName',
      key: 'staffName',
      width: 170,
      render: (_: unknown, record: OmicallLogRow) => {
        const display = record.staffName || record.staff?.displayName;
        return (
          <div className="flex flex-col gap-0.5">
            {display ? (
              <strong className="text-xs">{display}</strong>
            ) : record.staffId ? (
              <span className="text-xs text-[var(--mos-text-secondary)]">Staff #{record.staffId}</span>
            ) : (
              <span className="text-xs text-[var(--mos-text-secondary)]">Chưa gán</span>
            )}
            {record.storeName && (
              <span className="text-[11px] font-medium text-[var(--color-info)]">{record.storeName}</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Khách hàng / Chiều gọi',
      dataIndex: 'destinationNumber',
      key: 'customerPhone',
      width: 195,
      render: (_: string, record: OmicallLogRow) => {
        const isInbound = String(record.direction || '').toLowerCase() === 'inbound';
        const phone = isInbound ? record.sourceNumber || record.destinationNumber : record.destinationNumber;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <StatusTag
                status={isInbound ? 'processing' : 'default'}
                label={isInbound ? 'Gọi đến' : 'Gọi đi'}
                className="text-[10px]"
              />
              <span className="font-medium text-xs tabular-nums text-[var(--color-primary)]">
                {phone || 'Không rõ SĐT'}
              </span>
            </div>
            {record.customerName && (
              <span className="text-[11px] text-[var(--mos-text-secondary)]">{record.customerName}</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Đàm thoại',
      dataIndex: 'duration',
      key: 'duration',
      width: 105,
      render: (duration: number, record: OmicallLogRow) => {
        const talkSec = record.billSec && record.billSec > 0 ? record.billSec : duration;
        return (
          <Tooltip title={`Đàm thoại: ${talkSec}s · Tổng thời lượng: ${duration || 0}s`}>
            <span className="font-mono text-xs tabular-nums">{formatOmicallDuration(talkSec)}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Kết quả',
      dataIndex: 'status',
      key: 'status',
      width: 105,
      render: (status: string) => renderCallStatus(status),
    },
    {
      title: 'Ghi âm (Nghe ngay)',
      key: 'recordingUrl',
      width: 220,
      render: (_: unknown, record: OmicallLogRow) => {
        if (!record.recordingUrl) {
          return <span className="text-xs text-[var(--mos-text-secondary)]">Chưa có ghi âm</span>;
        }
        if (playingLogId === record.id) {
          return (
            <div className="flex flex-col gap-1">
              <audio controls autoPlay src={record.recordingUrl} className="h-8 w-48 outline-none" />
              <Button
                size="small"
                type="link"
                className="h-auto p-0 text-left text-[11px]"
                onClick={() => onTogglePlay(record.id)}
              >
                Đóng trình phát
              </Button>
            </div>
          );
        }
        return (
          <Button size="small" icon={<AppIcon icon={Volume2} size={13} />} onClick={() => onTogglePlay(record.id)}>
            Nghe ghi âm
          </Button>
        );
      },
    },
    {
      title: 'Phân tích AI & Happy Call',
      key: 'analysisAndHappy',
      width: 215,
      render: (_: unknown, record: OmicallLogRow) => {
        if (record.aiLockedUntilSelfRated) {
          return (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1">
                {renderAIStatus(record.analysisStatus)}
                <StatusTag status="warning" label="🔒 Chờ NV tự chấm" />
              </div>
              <span className="text-[11px] text-[var(--mos-text-secondary)]">
                Tự đánh giá để mở khóa Happy Call &amp; AI Coaching
              </span>
            </div>
          );
        }

        const tags = Array.isArray(record.qaTags) ? record.qaTags : [];
        return (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1">
              {renderAIStatus(record.analysisStatus)}
              {record.analysisStatus === 'DONE' && renderHappyStatus(record.happyCallStatus)}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              {record.laughCount > 0 ? (
                <StatusTag
                  status="purple"
                  icon={<AppIcon icon={Smile} size={11} />}
                  label={<span className="tabular-nums">{record.laughCount}</span>}
                />
              ) : null}
              {tags.slice(0, 3).map((tag) => (
                <StatusTag
                  key={tag}
                  status={tag.toLowerCase().includes('khiếu nại') ? 'error' : 'default'}
                  label={tag}
                />
              ))}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Hài lòng (4 nguồn)',
      key: 'satisfactionSources',
      width: 195,
      render: (_: unknown, record: OmicallLogRow) => {
        const ai = record.aiLockedUntilSelfRated ? null : (record.customerSatisfactionScore ?? null);
        const nv = record.staffSelfSatisfactionScore ?? null;
        const ql = record.managerSatisfactionScore ?? null;
        const ad = record.adminSatisfactionScore ?? null;
        const hasMismatch = ai !== null && nv !== null && Math.abs(ai - nv) >= 2;

        if (record.aiLockedUntilSelfRated) {
          return <StatusTag status="warning" label="🔒 Tự đánh giá để xem" />;
        }

        const hasAny = ai !== null || nv !== null || ql !== null || ad !== null;
        if (!hasAny) {
          return <span className="text-xs text-[var(--mos-text-secondary)]">Chưa có đánh giá</span>;
        }

        return (
          <div className="flex flex-wrap items-center gap-1 text-[11px] tabular-nums">
            {ai !== null && (
              <Tooltip title="Đánh giá từ AI (Gemini)">
                <span>
                  <StatusTag status={ai >= 4 ? 'success' : ai === 3 ? 'default' : 'error'} label={`AI ${ai}★`} />
                </span>
              </Tooltip>
            )}
            {nv !== null && (
              <Tooltip title={record.staffSelfNote ? `NV tự chấm: ${record.staffSelfNote}` : 'Nhân viên tự đánh giá'}>
                <span>
                  <StatusTag status={hasMismatch ? 'warning' : 'processing'} label={`NV ${nv}★`} />
                </span>
              </Tooltip>
            )}
            {ql !== null && (
              <Tooltip
                title={record.managerReviewedByName ? `Quản lý/QA: ${record.managerReviewedByName}` : 'Quản lý/QA'}
              >
                <span>
                  <StatusTag status="purple" label={`QL ${ql}★`} />
                </span>
              </Tooltip>
            )}
            {ad !== null && (
              <Tooltip title={record.adminReviewedByName ? `Admin: ${record.adminReviewedByName}` : 'Admin đánh giá'}>
                <span>
                  <StatusTag status="orange" label={`AD ${ad}★`} />
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'center' as const,
      width: 210,
      render: (_: unknown, record: OmicallLogRow) => (
        <Space size={6}>
          {canReviewQa && record.recordingUrl && (
            <Button
              size="small"
              icon={<AppIcon icon={Sparkles} size={13} />}
              loading={reanalyzingLogId === record.id}
              onClick={() => onReanalyze(record.id)}
            >
              AI
            </Button>
          )}
          <Button
            type="primary"
            icon={<AppIcon icon={Eye} size={14} />}
            size="small"
            onClick={() => onOpenQaDrawer(record.id)}
            className="font-medium"
          >
            {record.aiLockedUntilSelfRated ? 'Tự đánh giá' : 'Chi tiết & QA'}
          </Button>
        </Space>
      ),
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
