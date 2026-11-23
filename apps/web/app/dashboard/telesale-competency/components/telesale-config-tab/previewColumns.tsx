'use client';

import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TelesaleConfigPreviewRow } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { getPreviewStatusMeta, getTierStatus } from './telesaleConfigHelpers';

export const previewCalculationColumns: ColumnsType<TelesaleConfigPreviewRow> = [
  {
    title: 'Nhân sự',
    dataIndex: 'staffName',
    key: 'staffName',
    render: (name: string, r) => (
      <div>
        <div className="font-semibold text-xs text-slate-900 dark:text-zinc-100">{name}</div>
        <StatusTag status={getTierStatus(r.currentTier)} label={r.currentTier} />
      </div>
    ),
  },
  {
    title: 'Điểm hiện tại',
    dataIndex: 'currentScore',
    key: 'currentScore',
    render: (val: number) => <span className="tabular-nums">{val}đ</span>,
  },
  {
    title: 'Điểm mới',
    dataIndex: 'previewScore',
    key: 'previewScore',
    render: (val: number) => (
      <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{val}đ</span>
    ),
  },
  {
    title: 'Chênh lệch',
    dataIndex: 'scoreDiff',
    key: 'scoreDiff',
    render: (diff: number) => (
      <span
        className={`font-bold tabular-nums text-xs ${
          diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500'
        }`}
      >
        {diff > 0 ? `+${diff}` : diff}
      </span>
    ),
  },
  {
    title: 'Trạng thái dự kiến',
    dataIndex: 'previewStatus',
    key: 'previewStatus',
    render: (status: string) => {
      const { statusType, label } = getPreviewStatusMeta(status);
      return <StatusTag status={statusType} label={label} />;
    },
  },
];
