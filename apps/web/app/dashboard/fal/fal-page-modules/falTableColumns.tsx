'use client';

import React from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Check, ClipboardCheck, Eye, FileText, Share2 } from 'lucide-react';
import { AppIcon, StatusTag, TableIndexHeader, type DataColumnPriority } from '~/components/ui';
import {
  CompactConsultant,
  CompactDateTime,
  CompactOrigin,
  CompactPerson,
  FinancialEligibilityIndicator,
  LogDecisionIndicator,
  RotationIndicator,
} from './FalIndicators';
import { getFalRuleStatus } from './falPageHelpers';
import type { FalCase } from './falPageTypes';

const { Text } = Typography;

export const FAL_COLUMN_PRIORITY: Record<string, DataColumnPriority> = {
  clientName: 'primary',
  falRule: 'primary',
  checkin: 'secondary',
  cvName: 'secondary',
  action: 'primary',
};

interface BuildFalTableColumnsOptions {
  page: number;
  pageSize: number;
  onOpenCustomerDetail: (customerId: number) => void;
  onOpenTrace: (record: FalCase) => void;
  onApproveLog: (record: FalCase, approved: boolean) => void;
  onOpenExplanation: (record: FalCase) => void;
}

export function buildFalTableColumns({
  page,
  pageSize,
  onOpenCustomerDetail,
  onOpenTrace,
  onApproveLog,
  onOpenExplanation,
}: BuildFalTableColumnsOptions): ColumnsType<FalCase> {
  return [
    {
      title: <TableIndexHeader />,
      width: 52,
      align: 'center',
      render: (_value, _record, index) => <span className="tabular-nums">{(page - 1) * pageSize + index + 1}</span>,
    },
    { title: 'Thời gian', width: 104, render: (_, record) => <CompactDateTime value={record.checkin} /> },
    {
      title: 'FAL',
      width: 58,
      dataIndex: 'falRule',
      render: (value: string) => <StatusTag status={getFalRuleStatus(value)} label={value} />,
    },
    {
      title: 'Khách / dịch vụ',
      width: 185,
      render: (_, record) => (
        <CompactPerson
          name={record.clientName}
          avatar={record.clientAvatar}
          secondary={record.serviceName}
          onClick={() => onOpenCustomerDetail(record.clientId)}
        />
      ),
    },
    {
      title: 'Ca gốc',
      width: 170,
      render: (_, record) => (
        <CompactOrigin
          service={record.trace.origin}
          onClick={() => {
            if (record.trace.origin) {
              onOpenTrace(record);
            }
          }}
        />
      ),
    },
    {
      title: 'CC xử lý',
      width: 150,
      render: (_, record) => (
        <CompactConsultant
          inName={record.ccInName}
          outName={record.ccOutName}
          inAvatar={record.ccInAvatar}
          outAvatar={record.ccOutAvatar}
        />
      ),
    },
    {
      title: 'CV xử lý',
      width: 125,
      render: (_, record) => <CompactPerson name={record.cvName} avatar={record.cvAvatar} />,
    },
    {
      title: 'Phút',
      width: 48,
      align: 'center',
      render: (_, record) => <span className="tabular-nums">{record.fal?.totalMinutes ?? '-'}</span>,
    },
    {
      title: (
        <Tooltip title="Tua CV: ↑ tua đầu, ↓ tua cuối. Hover icon để xem điều kiện và trạng thái token.">
          Tua CV
        </Tooltip>
      ),
      width: 68,
      align: 'center',
      render: (_, record) => <RotationIndicator record={record} />,
    },
    {
      title: (
        <Tooltip title="Điểm & thưởng: hover icon để xem ca có được phép ghi điểm, tiền thưởng và Chuối vào staff_bonus hay không.">
          Điểm & thưởng
        </Tooltip>
      ),
      width: 92,
      align: 'center',
      render: (_, record) => <FinancialEligibilityIndicator record={record} />,
    },
    {
      title: <Tooltip title="Trạng thái giải trình Log hoặc trạng thái theo dõi của Fix/Adjust.">Trạng thái</Tooltip>,
      width: 82,
      align: 'center',
      render: (_, record) => <LogDecisionIndicator record={record} />,
    },
    {
      title: 'Giải trình',
      width: 150,
      render: (_, record) =>
        record.falRule === 'Log' ? (
          record.logExplanation?.explanation ? (
            <Tooltip title={record.logExplanation.explanation}>
              <Text className="block truncate text-xs">{record.logExplanation.explanation}</Text>
            </Tooltip>
          ) : (
            <Tooltip title="CC chưa gửi giải trình cho Log này.">
              <span className="fal-status-icon fal-status-pending">
                <AppIcon icon={FileText} size={15} />
              </span>
            </Tooltip>
          )
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Hành động',
      width: 124,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Trace quyền lợi">
            <Button
              aria-label={`Trace FAL #${record.orderServiceId}`}
              size="small"
              icon={<AppIcon icon={Share2} size={14} />}
              className="!border-violet-500/50 !text-violet-600 hover:!border-violet-500 hover:!text-violet-500 dark:!text-violet-300"
              onClick={() => onOpenTrace(record)}
            />
          </Tooltip>
          {record.falRule === 'Log' &&
          record.logExplanation?.decisionStatus === 'PENDING' &&
          record.logExplanation.explanation ? (
            <Tooltip title="Duyệt giải trình">
              <Button
                aria-label={`Duyệt giải trình Log #${record.orderServiceId}`}
                size="small"
                icon={<AppIcon icon={Check} size={14} />}
                onClick={() => onApproveLog(record, true)}
              />
            </Tooltip>
          ) : null}
          {record.falRule === 'Log' ? (
            <Tooltip title="Giải trình Log">
              <Button
                aria-label={`Giải trình Log #${record.orderServiceId}`}
                size="small"
                icon={<AppIcon icon={FileText} size={14} />}
                onClick={() => onOpenExplanation(record)}
              />
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
  ];
}

export function FalMobileRecordCard({
  record,
  onOpenCustomerDetail,
  onOpenTrace,
}: {
  record: FalCase;
  onOpenCustomerDetail: (customerId: number) => void;
  onOpenTrace: (record: FalCase) => void;
}) {
  return (
    <div className="fal-mobile-record">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block truncate">{record.clientName || 'Khách hàng'}</strong>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{record.serviceName || '-'}</span>
        </div>
        <StatusTag status={getFalRuleStatus(record.falRule)} label={record.falRule} className="shrink-0" />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="tabular-nums">{record.checkin ? dayjs(record.checkin).format('HH:mm · DD/MM') : '-'}</span>
        <span>CC: {record.ccOutName || record.ccInName || '-'}</span>
        <span>CV: {record.cvName || '-'}</span>
        <span className="tabular-nums">{record.fal?.totalMinutes ?? '-'} phút</span>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button
          size="small"
          icon={<AppIcon icon={Eye} size={14} />}
          onClick={() => onOpenCustomerDetail(record.clientId)}
        >
          Khách
        </Button>
        <Button
          size="small"
          type="primary"
          icon={<AppIcon icon={ClipboardCheck} size={14} />}
          onClick={() => onOpenTrace(record)}
        >
          Trace
        </Button>
      </div>
    </div>
  );
}
