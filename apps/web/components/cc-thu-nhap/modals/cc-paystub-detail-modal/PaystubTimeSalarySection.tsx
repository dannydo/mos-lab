'use client';

import React from 'react';
import type { CcPaystubRecord } from '@mos-lab/shared';
import type { FormatHoursToHoursMinutesFn } from './types';
import {
  formatOffMonthLeaveDetails,
  formatRoundedVnd,
  getHolidayRowAmount,
  getHolidayRowFormula,
  getHolidayRowTitle,
  getStandardTimeAndLeaveTotal,
} from './paystubHelpers';

export interface PaystubTimeSalarySectionProps {
  record: CcPaystubRecord;
  formatHoursToHoursMinutes: FormatHoursToHoursMinutesFn;
}

export function PaystubTimeSalarySection({ record, formatHoursToHoursMinutes }: PaystubTimeSalarySectionProps) {
  const hourlyRateFormatted = `${(record.hourlyRate || 25000).toLocaleString('vi-VN')}đ`;

  return (
    <>
      <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
        <td
          colSpan={4}
          className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
        >
          🕒 I. Lương theo thời gian & Ca làm việc
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          1
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Giờ làm việc chuẩn trong tháng</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {record.expectedWorkDays || 26} ngày x 8h/ngày
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{record.expectedWorkHours || 208}</td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          2
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">Giờ làm việc thực tế</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-normal">
          {formatHoursToHoursMinutes(record.totalWorkHours)}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
          {Number(record.totalWorkHours || 0).toFixed(1)}
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          3
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Đơn giá giờ</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          —
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{hourlyRateFormatted}</td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          4
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Lương theo giờ làm</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          (4) = (2) x (3)
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{formatRoundedVnd(record.hourlyWage)}</td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          5
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Off tuần theo lịch</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          Nghỉ tuần theo lịch
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{record.weeklyOffDays || 4}</td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          6
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Off tháng (phép năm là 12 ngày)</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          Nghỉ phép tháng được duyệt
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{record.offMonthDays || 0}</td>
      </tr>

      <tr
        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${
          record.offMonthWage && record.offMonthWage > 0 ? 'bg-emerald-500/10 dark:bg-emerald-950/20' : ''
        }`}
      >
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono" />
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium pl-6 text-emerald-800 dark:text-emerald-300">
          ↳ Cộng tiền ngày nghỉ phép
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 text-[11px]">
          {formatOffMonthLeaveDetails(record)}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
          +{formatRoundedVnd(record.offMonthWage)}
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          7
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
          {getHolidayRowTitle(record)}
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {getHolidayRowFormula(record)}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
          +{formatRoundedVnd(getHolidayRowAmount(record))}
        </td>
      </tr>

      <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-y-2 border-slate-300 dark:border-slate-700">
        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-slate-700 dark:text-slate-300">
          8
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold">
          Tổng lương thời gian & Ngày nghỉ tiêu chuẩn
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-normal">
          (8) = (4) Lương giờ + (6.1) Phép năm + (7) Nghỉ lễ x1
        </td>
        <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200 text-sm">
          +{formatRoundedVnd(getStandardTimeAndLeaveTotal(record))}
        </td>
      </tr>
    </>
  );
}
