'use client';

import React from 'react';
import type { CcPaystubRecord } from '@mos-lab/shared';
import {
  formatRoundedVnd,
  getEmployeeSocialSecurityItems,
  getEmployerSocialSecurityItems,
  getNetIncomeAmount,
} from './paystubHelpers';

export interface PaystubTotalsSectionProps {
  record: CcPaystubRecord;
}

export function PaystubTotalsSection({ record }: PaystubTotalsSectionProps) {
  const employerItems = getEmployerSocialSecurityItems(record);
  const employeeItems = getEmployeeSocialSecurityItems(record);
  const hasSocialSecurity = Boolean(record.socialSecurityAmount && record.socialSecurityAmount > 0);

  return (
    <>
      <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
        <td
          colSpan={4}
          className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
        >
          💰 V. Tổng thu nhập & Thực lãnh (Net)
        </td>
      </tr>

      <tr className="bg-blue-500/10 dark:bg-blue-950/20 font-bold border-y-2 border-blue-500/30">
        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-blue-700 dark:text-blue-400">
          ∑
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-900 dark:text-blue-200 font-bold">
          Tổng thu nhập thực tế trong tháng (Gross)
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-400 text-[11px] font-normal">
          Lương thời gian + Thưởng thời gian (off tuần) + Thưởng CC (Xoay, Combo/SP, Tips, Kim Cương, Đào tạo CVL) + Gửi
          xe + Phụ cấp khác
        </td>
        <td className="py-2 px-3 text-right tabular-nums font-bold text-blue-700 dark:text-blue-300 text-sm">
          {formatRoundedVnd(record.totalIncome)}
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold bg-rose-500/5 dark:bg-rose-950/10">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-mono">
          21
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-700 dark:text-rose-300 font-bold">
          Khấu trừ BHXH (10.5% NLĐ)
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 text-[11px] font-normal">
          Khấu trừ người lao động đóng (10.5%)
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400">
          -{formatRoundedVnd(record.socialSecurityAmount)}
        </td>
      </tr>

      {hasSocialSecurity ? (
        <>
          <tr className="bg-slate-50/60 dark:bg-slate-900/60 text-[11px]">
            <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400" />
            <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 pl-6 text-slate-600 dark:text-slate-300 font-medium">
              ↳ Wings (Công ty đóng 21.5%)
            </td>
            <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400 text-[10px]">
              Lương cơ sở 5.400.000đ
            </td>
            <td className="py-1 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300 font-semibold">
              {formatRoundedVnd(record.socialSecurityBreakdown?.employer?.totalAmount || 1161000)}
            </td>
          </tr>
          {employerItems.map((item) => (
            <tr
              key={`employer-${item.label}`}
              className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400"
            >
              <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800" />
              <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">{item.label}</td>
              <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
              <td className="py-0.5 px-3 text-right tabular-nums">{formatRoundedVnd(item.amount)}</td>
            </tr>
          ))}

          <tr className="bg-slate-50/60 dark:bg-slate-900/60 text-[11px]">
            <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400" />
            <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 pl-6 text-rose-700 dark:text-rose-300 font-medium">
              ↳ {record.displayName} (NLĐ đóng 10.5%)
            </td>
            <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-500/80 text-[10px]">
              Trừ trực tiếp vào lương
            </td>
            <td className="py-1 px-3 text-right tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
              -{formatRoundedVnd(record.socialSecurityAmount || 567000)}
            </td>
          </tr>
          {employeeItems.map((item) => (
            <tr
              key={`employee-${item.label}`}
              className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400"
            >
              <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800" />
              <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">{item.label}</td>
              <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
              <td className="py-0.5 px-3 text-right tabular-nums">-{formatRoundedVnd(item.amount)}</td>
            </tr>
          ))}
        </>
      ) : null}

      <tr className="bg-emerald-500/15 dark:bg-emerald-950/30 font-extrabold border-y-2 border-emerald-500/40">
        <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-emerald-800 dark:text-emerald-300 text-base">
          💰
        </td>
        <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-900 dark:text-emerald-200 font-extrabold text-sm uppercase tracking-wide">
          Lương thực lãnh trong tháng (Net)
        </td>
        <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 text-xs font-normal">
          Tổng thu nhập (Gross) - Khấu trừ BHXH (10.5%)
        </td>
        <td className="py-3 px-3 text-right tabular-nums font-black text-emerald-600 dark:text-emerald-400 text-lg">
          {formatRoundedVnd(getNetIncomeAmount(record))}
        </td>
      </tr>
    </>
  );
}
