'use client';

import React from 'react';
import { Tooltip } from 'antd';
import type { TableColumnType } from 'antd';
import dayjs from 'dayjs';
import type { CcXoayRecord } from '@mos-lab/shared';
import { StatusTag, type StatusType } from '~/components/ui';
import { formatStoreCode } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import { CcXoayBonusCell } from './CcXoayBonusCell';
import type { StaffCapInfo } from './cc-xoay-utils';

function renderCcInOutConsultant(name: string, avatar: string | null | undefined, variant: 'in' | 'out') {
  return (
    <div className={`cc-in-out-row cc-in-out-row-${variant}`}>
      <CcAvatar name={name} src={avatar} size={20} className={variant === 'out' ? 'cc-in-out-avatar-out' : ''} />
      <span className="truncate">{name}</span>
    </div>
  );
}

export function buildCcXoayColumns(staffCapMap: Map<string, StaffCapInfo>): TableColumnType<CcXoayRecord>[] {
  return [
    {
      title: 'Check-in',
      dataIndex: 'checkin',
      key: 'checkin',
      width: 108,
      render: (val: string) => {
        const checkin = dayjs(val);

        if (!checkin.isValid()) {
          return (
            <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400 font-medium">{val || '-'}</span>
          );
        }

        return (
          <span className="flex flex-col tabular-nums text-xs font-medium leading-5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
            <span>{checkin.format('DD/MM/YYYY')}</span>
            <span>{checkin.format('HH:mm')}</span>
          </span>
        );
      },
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 150,
      render: (val: string, record: CcXoayRecord) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-semibold text-xs text-sky-600 dark:text-sky-400">
            {val || 'Khách Vãng Lai'}
          </span>
          <span className="text-[11px] font-medium leading-4 text-slate-500 dark:text-slate-400">
            {formatStoreCode(record.store)}
          </span>
        </span>
      ),
    },
    {
      title: 'Tên Dịch Vụ / Bộ Mi',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 220,
      render: (val: string) => <span className="font-medium text-amber-800 dark:text-amber-400">{val}</span>,
    },
    {
      title: 'CC In/Out',
      key: 'ccInOut',
      width: 176,
      render: (_: unknown, record: CcXoayRecord) => {
        const ccInName = record.ccInName?.trim();
        const ccOutName = record.ccOutName?.trim();
        const isSameConsultant = Boolean(ccInName && ccOutName && ccInName === ccOutName);

        if (isSameConsultant) {
          return (
            <div className="cc-in-out-cell" title="CC In và CC Out là cùng một người">
              {renderCcInOutConsultant(ccInName!, record.ccInAvatar, 'in')}
            </div>
          );
        }

        if (!ccInName && !ccOutName) return <span className="text-slate-500 text-xs">-</span>;

        return (
          <div className="cc-in-out-cell">
            {ccInName ? renderCcInOutConsultant(ccInName, record.ccInAvatar, 'in') : null}
            {ccOutName ? renderCcInOutConsultant(ccOutName, record.ccOutAvatar, 'out') : null}
          </div>
        );
      },
    },
    {
      title: 'Level CC',
      dataIndex: 'consultantLevel',
      key: 'consultantLevel',
      width: 80,
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-slate-600 dark:text-slate-300">{val}</span>
      ),
    },
    {
      title: 'CC Bonus (đ)',
      dataIndex: 'consultantBonus',
      key: 'consultantBonus',
      width: 165,
      align: 'right' as const,
      render: (val: number, record: CcXoayRecord) => (
        <CcXoayBonusCell value={val} record={record} staffCapMap={staffCapMap} />
      ),
    },
    {
      title: '∑ Điểm CC',
      dataIndex: 'pointsAccu',
      key: 'pointsAccu',
      width: 110,
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400 text-xs">
          {val.toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      title: 'Điểm CC',
      dataIndex: 'consultantPoints',
      key: 'consultantPoints',
      width: 90,
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-cyan-600 dark:text-cyan-400 text-xs">+{val} pts</span>
      ),
    },
    {
      title: 'Class',
      dataIndex: 'class',
      key: 'class',
      width: 130,
      render: (val: string, r: CcXoayRecord) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {val} <span className="text-slate-500 text-[10px]">({r.classPts}p)</span>
        </span>
      ),
    },
    {
      title: 'Fan',
      dataIndex: 'fan',
      key: 'fan',
      width: 80,
      render: (val: string, r: CcXoayRecord) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">
          {val} <span className="text-slate-500 text-[10px]">({r.fanPts}p)</span>
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (val: string, r: CcXoayRecord) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {val} <span className="text-slate-500 text-[10px]">({r.typePts}p)</span>
        </span>
      ),
    },
    {
      title: 'Số Sợi',
      dataIndex: 'lashCount',
      key: 'lashCount',
      width: 95,
      align: 'right' as const,
      render: (val: number, r: CcXoayRecord) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-slate-300">
          {val}s <span className="text-slate-500 text-[10px]">({r.lashPts}p)</span>
        </span>
      ),
    },
    {
      title: 'Dáng Mi',
      dataIndex: 'design',
      key: 'design',
      width: 100,
      render: (val: string, r: CcXoayRecord) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {val} <span className="text-slate-500 text-[10px]">({r.designPts}p)</span>
        </span>
      ),
    },
    {
      title: 'Màu Mi',
      dataIndex: 'color',
      key: 'color',
      width: 90,
      render: (val: string, r: CcXoayRecord) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {val} <span className="text-slate-500 text-[10px]">({r.colorPts}p)</span>
        </span>
      ),
    },
    {
      title: 'FAL Rule',
      dataIndex: 'falRule',
      key: 'falRule',
      width: 80,
      render: (val?: string, record?: CcXoayRecord) => {
        if (!val) return <span className="text-xs text-slate-500">-</span>;
        const fal = record?.fal;
        const falStatus: StatusType =
          fal?.compensationMode === 'BLOCKED'
            ? 'default'
            : val === 'Fix'
              ? 'error'
              : val === 'Adjust'
                ? 'warning'
                : 'processing';
        const label = `${val}${fal?.compensationMode === 'BLOCKED' ? ' · Chờ' : ''}`;

        return (
          <Tooltip
            title={
              fal
                ? `${fal.caseRole === 'ORIGIN' ? 'Ca gốc' : 'Ca xử lý'} · ${fal.totalMinutes ?? '?'} phút · ${fal.compensationMode}${fal.decisionStatus ? ` · ${fal.decisionStatus}` : ''}`
                : val
            }
          >
            <span className="inline-flex cursor-help">
              <StatusTag status={falStatus} label={label} className="font-semibold text-[10px] py-0 px-1" />
            </span>
          </Tooltip>
        );
      },
    },
  ];
}
