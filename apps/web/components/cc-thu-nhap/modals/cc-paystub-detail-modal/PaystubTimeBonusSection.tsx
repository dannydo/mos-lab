'use client';

import React from 'react';
import type { CcPaystubRecord } from '@mos-lab/shared';
import type { FormatHoursToHoursMinutesFn } from './types';
import { formatRoundedVnd, getTimeBonusTotal } from './paystubHelpers';

export interface PaystubTimeBonusSectionProps {
  record: CcPaystubRecord;
  formatHoursToHoursMinutes: FormatHoursToHoursMinutesFn;
}

export function PaystubTimeBonusSection({ record, formatHoursToHoursMinutes }: PaystubTimeBonusSectionProps) {
  const hourlyRateFormatted = `${(record.hourlyRate || 25000).toLocaleString('vi-VN')}đ`;

  return (
    <>
      <tr className="bg-amber-500/10 dark:bg-amber-950/25 border-y border-amber-500/30">
        <td
          colSpan={4}
          className="py-2 px-3 text-left font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider text-[11px]"
        >
          ⚡ II. Thưởng & Phụ cấp theo thời gian (Bonus thời gian)
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-mono font-semibold">
          9
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
          Thưởng đi làm ngày off tuần (+1x = Tổng x2)
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {(record.offDaysWorked || 0) > 0
            ? `${formatHoursToHoursMinutes(record.offDaysWorkHours || 0)} x ${hourlyRateFormatted} x 1 (Đã ăn 1x ở Mục 4, thêm 1x ở đây)`
            : '0h làm ngày off tuần (Nghỉ tuần theo lịch)'}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
          {(record.offDaysWorked || 0) > 0 || (record.offDaysWorkWage || 0) > 0
            ? `+${formatRoundedVnd(record.offDaysWorkWage)}`
            : '0đ'}
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-mono font-semibold">
          10
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
          Thưởng đi làm ngày Lễ 2/9 (x3 phụ cấp)
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px] text-amber-700 dark:text-amber-400">
          {record.holidayWorkedHours && record.holidayWorkedHours > 0
            ? `Đi làm ngày nào cộng ngày đó: ${record.holidayWorkedDays || 2} ngày đi làm (${record.holidayWorkedHours}h làm x ${hourlyRateFormatted} x 3 = +${formatRoundedVnd(record.holidayPremiumPay)} - HR đi riêng)`
            : '0h làm việc ngày lễ (Không đi làm không có tiền)'}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">
          {record.holidayPremiumPay && record.holidayPremiumPay > 0
            ? `+${formatRoundedVnd(record.holidayPremiumPay)} (Đi riêng)`
            : '0đ'}
        </td>
      </tr>

      <tr className="bg-amber-500/15 dark:bg-amber-950/40 font-bold border-y-2 border-amber-500/30">
        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-300">
          11
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-amber-900 dark:text-amber-200 font-bold">
          Tổng Thưởng theo thời gian
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 text-[11px] font-normal">
          (11) = (9) Thưởng off tuần + (10) Thưởng ngày lễ
        </td>
        <td className="py-2 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-300 text-sm">
          +{formatRoundedVnd(getTimeBonusTotal(record))}
        </td>
      </tr>
    </>
  );
}
