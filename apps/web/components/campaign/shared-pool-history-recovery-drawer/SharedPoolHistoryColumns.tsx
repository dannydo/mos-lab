'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { AlertTriangle, Undo2, User } from 'lucide-react';
import type { CampaignSharedPoolDetailedLog } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { formatRelativeTime } from '~/lib/date-utils';
import { SharedPoolActionBadge, SharedPoolStatusBadge } from './SharedPoolBadges';

interface CreateSharedPoolHistoryColumnsParams {
  isAdmin: boolean;
  onOpenRecovery: (record: CampaignSharedPoolDetailedLog) => void;
}

export function createSharedPoolHistoryColumns({
  isAdmin,
  onOpenRecovery,
}: CreateSharedPoolHistoryColumnsParams): ColumnsType<CampaignSharedPoolDetailedLog> {
  return [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 145,
      render: (val: string) => {
        const d = dayjs(val);
        const relText = formatRelativeTime(d);
        return (
          <Tooltip title={relText || d.format('DD/MM/YYYY HH:mm')}>
            <div className="text-xs">
              <div className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {d.format('DD/MM/YYYY')}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-400 font-mono tabular-nums">
                {d.format('HH:mm:ss')}
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 200,
      render: (_: unknown, record: CampaignSharedPoolDetailedLog) => {
        if (!record.legacyUserId && !record.campaignCustomerId) {
          return <span className="text-xs text-slate-400 dark:text-slate-400">Toàn chiến dịch / Hệ thống</span>;
        }
        return (
          <div className="text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1 truncate">
              <User size={11} className="text-purple-500 shrink-0" />
              <span className="truncate">{record.customerName || `KH #${record.legacyUserId}`}</span>
            </div>
            {record.customerPhone && (
              <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">{record.customerPhone}</div>
            )}
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono tabular-nums">
                #{record.legacyUserId}
              </span>
              {record.currentPoolStatus && (
                <Tooltip title="Trạng thái thực tế hiện tại của khách hàng">
                  <span className="inline-flex">
                    <SharedPoolStatusBadge status={record.currentPoolStatus} />
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Nhân viên thao tác',
      key: 'staff',
      width: 150,
      render: (_: unknown, record: CampaignSharedPoolDetailedLog) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {record.staffName || (record.staffId ? `NV #${record.staffId}` : 'Hệ thống tự động')}
          </span>
          {record.staffId && (
            <div className="text-[10px] text-slate-400 dark:text-slate-400 font-mono tabular-nums">
              ID: #{record.staffId}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Loại thao tác',
      key: 'action',
      width: 170,
      render: (_: unknown, record: CampaignSharedPoolDetailedLog) => (
        <SharedPoolActionBadge action={record.action} actionLabel={record.actionLabel} />
      ),
    },
    {
      title: 'Chuyển đổi trạng thái',
      key: 'statusTransition',
      width: 190,
      render: (_: unknown, record: CampaignSharedPoolDetailedLog) => {
        if (!record.previousPoolStatus && !record.nextPoolStatus) {
          return <span className="text-xs text-slate-400 dark:text-slate-400">—</span>;
        }
        return (
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <SharedPoolStatusBadge status={record.previousPoolStatus} />
            <span className="text-slate-400 dark:text-slate-500 font-bold">→</span>
            <SharedPoolStatusBadge status={record.nextPoolStatus} />
          </div>
        );
      },
    },
    {
      title: 'Kết quả / Ghi chú',
      key: 'note',
      render: (_: unknown, record: CampaignSharedPoolDetailedLog) => (
        <div className="text-xs space-y-1">
          {record.result && <div className="font-semibold text-slate-800 dark:text-slate-200">{record.result}</div>}
          {record.note && (
            <div className="text-slate-600 dark:text-slate-400 bg-black/5 dark:bg-white/5 p-1.5 rounded-md text-[11px] leading-relaxed">
              {record.note}
            </div>
          )}
          {record.isDrifted && (
            <Tooltip title={`Dữ liệu đã thay đổi sau log này. Hiện tại là "${record.currentPoolStatus}".`}>
              <span className="inline-flex">
                <StatusTag
                  status="warning"
                  icon={<AlertTriangle size={11} />}
                  label="Đã đổi trạng thái sau đó"
                  className="m-0 text-[10px]"
                />
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Khôi phục',
      key: 'actionButton',
      width: 110,
      fixed: 'right' as const,
      render: (_: unknown, record: CampaignSharedPoolDetailedLog) => {
        if (!isAdmin || !record.canRestore) return null;
        return (
          <Button
            size="small"
            icon={<Undo2 size={12} />}
            onClick={() => onOpenRecovery(record)}
            className="inline-flex items-center justify-center gap-1 text-xs font-semibold hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400"
          >
            Khôi phục
          </Button>
        );
      },
    },
  ];
}
