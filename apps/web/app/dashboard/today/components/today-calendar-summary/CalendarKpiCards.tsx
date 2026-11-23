'use client';

import { Avatar, Col, Row } from 'antd';
import { Calendar, CheckCircle2, FilePlus2, XCircle } from 'lucide-react';
import { StatusTag } from '~/components/ui';
import type { CalendarThemeMode } from './types';

export interface CalendarKpiCardsProps {
  themeMode: CalendarThemeMode;
  totalCreated: number;
  totalScheduled: number;
  totalMissed: number;
  totalDone: number;
  missedRate: number;
  completionRate: number;
}

export function CalendarKpiCards({
  themeMode,
  totalCreated,
  totalScheduled,
  totalMissed,
  totalDone,
  missedRate,
  completionRate,
}: CalendarKpiCardsProps) {
  const isDark = themeMode === 'dark';
  const valueTextClass = isDark ? 'text-slate-100 dark:text-slate-100' : 'text-slate-900 dark:text-slate-100';
  const descTextClass = isDark ? 'text-slate-400 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400';

  return (
    <Row gutter={[16, 16]}>
      {/* KPI 1: CREATED */}
      <Col xs={24} sm={12} lg={6}>
        <div
          className={`rounded-xl px-5 py-4 flex flex-col gap-1.5 shadow-sm relative overflow-hidden border ${
            isDark
              ? 'bg-slate-900 border-blue-900 dark:bg-slate-900 dark:border-blue-900'
              : 'bg-sky-50 border-sky-200 dark:bg-slate-900 dark:border-blue-900'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-sky-600 uppercase">📝 CREATED (ĐÃ TẠO)</span>
            <Avatar size={28} className="bg-sky-600 flex items-center justify-center">
              <FilePlus2 className="w-3.5 h-3.5" />
            </Avatar>
          </div>
          <div className={`text-[28px] font-extrabold leading-tight tabular-nums font-mono ${valueTextClass}`}>
            {totalCreated} <span className={`text-[13px] font-normal ${descTextClass}`}>đơn</span>
          </div>
          <div className={`text-xs ${descTextClass}`}>Đơn hàng được Booker tạo mới trong ngày</div>
        </div>
      </Col>

      {/* KPI 2: SCHEDULED */}
      <Col xs={24} sm={12} lg={6}>
        <div
          className={`rounded-xl px-5 py-4 flex flex-col gap-1.5 shadow-sm relative overflow-hidden border ${
            isDark
              ? 'bg-stone-900 border-amber-900 dark:bg-stone-900 dark:border-amber-900'
              : 'bg-amber-50 border-amber-200 dark:bg-stone-900 dark:border-amber-900'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-amber-500 uppercase">📅 SCHEDULED (ĐÃ HẸN)</span>
            <Avatar size={28} className="bg-amber-500 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </Avatar>
          </div>
          <div className={`text-[28px] font-extrabold leading-tight tabular-nums font-mono ${valueTextClass}`}>
            {totalScheduled} <span className={`text-[13px] font-normal ${descTextClass}`}>lượt</span>
          </div>
          <div className={`text-xs ${descTextClass}`}>Lịch hẹn dự kiến khách đến cửa hàng</div>
        </div>
      </Col>

      {/* KPI 3: MISSED */}
      <Col xs={24} sm={12} lg={6}>
        <div
          className={`rounded-xl px-5 py-4 flex flex-col gap-1.5 shadow-sm relative overflow-hidden border ${
            isDark
              ? 'bg-[rgba(30,27,27,1)] border-red-900 dark:bg-[rgba(30,27,27,1)] dark:border-red-900'
              : 'bg-rose-50 border-rose-200 dark:bg-[rgba(30,27,27,1)] dark:border-red-900'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-rose-500 uppercase">⚠️ MISSED (LỠ HẸN)</span>
            <Avatar size={28} className="bg-rose-500 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </Avatar>
          </div>
          <div className="flex items-baseline gap-2">
            <div className={`text-[28px] font-extrabold leading-tight tabular-nums font-mono ${valueTextClass}`}>
              {totalMissed}
            </div>
            <StatusTag status="error" label={`${missedRate}% missed`} className="font-bold tabular-nums" />
          </div>
          <div className={`text-xs ${descTextClass}`}>Khách không đến hoặc hủy lịch hẹn</div>
        </div>
      </Col>

      {/* KPI 4: DONE */}
      <Col xs={24} sm={12} lg={6}>
        <div
          className={`rounded-xl px-5 py-4 flex flex-col gap-1.5 shadow-sm relative overflow-hidden border ${
            isDark
              ? 'bg-[rgba(6,32,22,1)] border-emerald-900 dark:bg-[rgba(6,32,22,1)] dark:border-emerald-900'
              : 'bg-emerald-50 border-emerald-200 dark:bg-[rgba(6,32,22,1)] dark:border-emerald-900'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-500 uppercase">
              ✅ DONE (HOÀN THÀNH)
            </span>
            <Avatar size={28} className="bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </Avatar>
          </div>
          <div className="flex items-baseline gap-2">
            <div className={`text-[28px] font-extrabold leading-tight tabular-nums font-mono ${valueTextClass}`}>
              {totalDone}
            </div>
            <StatusTag status="success" label={`${completionRate}% done`} className="font-bold tabular-nums" />
          </div>
          <div className={`text-xs ${descTextClass}`}>Khách đã check-in / xong dịch vụ</div>
        </div>
      </Col>
    </Row>
  );
}
