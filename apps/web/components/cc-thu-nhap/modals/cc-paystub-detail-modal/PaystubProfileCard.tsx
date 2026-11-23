'use client';

import React from 'react';
import type { CcPaystubRecord } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';

export interface PaystubProfileCardProps {
  record: CcPaystubRecord;
  periodLabel: string;
}

export function PaystubProfileCard({ record, periodLabel }: PaystubProfileCardProps) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
            PAYSLIP • MONTH {periodLabel}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">NICKNAME:</span>{' '}
              <strong className="text-sm font-semibold">{record.displayName}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">HỌ TÊN:</span>{' '}
              <strong className="text-sm font-semibold">{record.fullName || record.displayName}</strong>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400">CHỨC VỤ:</span>
              <StatusTag status="purple" label="Tư Vấn Viên (CC)" className="font-semibold text-xs" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400">BỘ PHẬN/ PHÒNG BAN:</span>
              <StatusTag status="processing" label={record.store} className="font-semibold text-xs" />
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">NGÀY NGHỈ PHÉP CÒN LẠI:</span>{' '}
              <strong className="text-amber-600 dark:text-amber-400 font-bold tabular-nums ml-1">
                {record.dayOffAvailable ?? 26}
              </strong>{' '}
              ngày
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-400">Mã NV: #{record.consultantId}</div>
          <div className="mt-1">
            <StatusTag status="success" label="Active" />
          </div>
        </div>
      </div>
    </div>
  );
}
