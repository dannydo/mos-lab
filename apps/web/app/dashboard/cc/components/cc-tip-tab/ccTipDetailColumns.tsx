'use client';

import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { CcTipRecord } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { formatStoreCode } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import { formatSignedTipVnd, formatTipVnd } from './cc-tip-utils';

function renderCcInOutConsultant(name: string, avatar: string | null | undefined, variant: 'in' | 'out') {
  return (
    <div className={`cc-in-out-row cc-in-out-row-${variant}`}>
      <CcAvatar name={name} src={avatar} size={20} className={variant === 'out' ? 'cc-in-out-avatar-out' : ''} />
      <span className="truncate">{name}</span>
    </div>
  );
}

export function buildCcTipDetailColumns(): ColumnsType<CcTipRecord> {
  return [
    {
      title: 'Check-in',
      dataIndex: 'checkinTime',
      key: 'checkinTime',
      width: 108,
      render: (val: string) => {
        const checkin = dayjs(val);

        if (!checkin.isValid()) {
          return (
            <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400 font-medium">{val || '-'}</span>
          );
        }

        return (
          <span className="flex flex-col tabular-nums text-xs font-medium leading-5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
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
      width: 155,
      render: (val: string, record: CcTipRecord) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-semibold text-xs text-sky-700 dark:text-sky-400">
            {val || 'Khách Vãng Lai'}
          </span>
          <span className="text-[11px] font-medium leading-4 text-slate-500 dark:text-slate-400">
            {formatStoreCode(record.store)}
          </span>
        </span>
      ),
    },
    {
      title: 'Tên Dịch Vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 185,
      render: (val: string) => <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">{val}</span>,
    },
    {
      title: 'CC In/Out',
      key: 'ccInOut',
      width: 176,
      render: (_: unknown, record: CcTipRecord) => {
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
      title: '∑ Tip',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right' as const,
      width: 125,
      render: (val: number, record: CcTipRecord) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="tabular-nums font-semibold text-sky-700 dark:text-sky-400 text-xs">
            {val > 0 ? formatTipVnd(val) : '0 đ'}
          </span>
          {record.tipStatus === 'Small Change' && (
            <StatusTag status="orange" label="Tiền lẻ < 20K" className="text-[10px] py-0.5 px-1.5" />
          )}
          {record.tipStatus === 'Tipped' && (
            <StatusTag status="success" label="Tip ≥ 20K" className="text-[10px] py-0.5 px-1.5" />
          )}
        </div>
      ),
    },
    {
      title: '% CC Nhận',
      dataIndex: 'ccTipPercentage',
      key: 'ccTipPercentage',
      align: 'center' as const,
      width: 90,
      render: (val: number) => (
        <StatusTag
          status={val > 0 ? 'cyan' : 'default'}
          label={`${val}%`}
          className="font-bold tabular-nums text-xs py-0.5 px-1.5"
        />
      ),
    },
    {
      title: 'Thành Tiền',
      dataIndex: 'ccTipAmount',
      key: 'ccTipAmount',
      width: 115,
      align: 'right' as const,
      render: (val: number) => (
        <span
          className={`tabular-nums font-bold text-xs ${
            val > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'
          }`}
        >
          {formatSignedTipVnd(val)}
        </span>
      ),
    },
  ];
}
