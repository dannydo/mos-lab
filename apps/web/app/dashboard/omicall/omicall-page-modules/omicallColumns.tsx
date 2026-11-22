'use client';

import React from 'react';
import { Button, Popconfirm, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Copy, Eye, Loader2, Pencil, Smile, Trash2 } from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';
import {
  formatCallUuidPreview,
  formatOmicallDuration,
  getAiStatusDescriptor,
  getCallStatusDescriptor,
  getHappyStatusDescriptor,
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
  onCopyUuid: (uuid: string) => void;
  onOpenQaDrawer: (logId: number) => void;
}

export function buildOmicallLogsColumns({
  onCopyUuid,
  onOpenQaDrawer,
}: BuildOmicallLogsColumnsOptions): ColumnsType<OmicallLogRow> {
  return [
    {
      title: 'Call UUID / Mã cuộc gọi',
      dataIndex: 'callUuid',
      key: 'callUuid',
      width: 220,
      render: (uuid: string) => (
        <Space>
          <Tooltip title={uuid}>
            <Text className="font-mono font-medium tabular-nums">{formatCallUuidPreview(uuid)}</Text>
          </Tooltip>
          <Button
            icon={<AppIcon icon={Copy} size={14} />}
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
      width: 170,
      render: (val: string) => <span className="tabular-nums">{new Date(val).toLocaleString('vi-VN')}</span>,
    },
    {
      title: 'Nhân viên',
      dataIndex: ['staff', 'displayName'],
      key: 'staffName',
      render: (val: string, record: OmicallLogRow) => <strong>{val || `Staff ID: ${record.staffId}`}</strong>,
    },
    {
      title: 'Khách hàng',
      dataIndex: 'destinationNumber',
      key: 'destinationNumber',
      render: (val: string) => <span className="font-medium tabular-nums text-[var(--color-primary)]">{val}</span>,
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      render: (val: number) => <span className="tabular-nums">{formatOmicallDuration(val)}</span>,
    },
    {
      title: 'Kết quả',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderCallStatus(status),
    },
    {
      title: 'Trạng thái AI',
      dataIndex: 'analysisStatus',
      key: 'analysisStatus',
      render: (status: string) => renderAIStatus(status),
    },
    {
      title: 'Tiếng cười (AI)',
      dataIndex: 'laughCount',
      key: 'laughCount',
      align: 'center' as const,
      render: (val: number) =>
        val > 0 ? (
          <StatusTag
            status="purple"
            icon={<AppIcon icon={Smile} size={13} />}
            label={<span className="tabular-nums">{val}</span>}
            className="font-bold"
          />
        ) : (
          <span className="tabular-nums">0</span>
        ),
    },
    {
      title: 'Happy Call',
      dataIndex: 'happyCallStatus',
      key: 'happyCallStatus',
      render: (status: string) => renderHappyStatus(status),
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'center' as const,
      render: (_: unknown, record: OmicallLogRow) => (
        <Button
          type="primary"
          icon={<AppIcon icon={Eye} size={14} />}
          size="small"
          onClick={() => onOpenQaDrawer(record.id)}
          className="font-medium"
        >
          Chi tiết & QA
        </Button>
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
        <StatusTag status={val === 'admin' ? 'error' : 'processing'} label={val.toUpperCase()} />
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
