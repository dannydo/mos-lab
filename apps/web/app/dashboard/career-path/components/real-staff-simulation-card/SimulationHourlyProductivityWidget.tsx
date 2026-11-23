'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { Gauge, Info, ShieldCheck } from 'lucide-react';
import type { StaffCareerStatus } from '@mos-lab/shared';
import { formatVnd, type QuestMetricsSummary } from './simulationTypesAndHelpers';

interface SimulationHourlyProductivityWidgetProps {
  status: StaffCareerStatus;
  questMetrics: QuestMetricsSummary;
}

export const SimulationHourlyProductivityWidget: React.FC<SimulationHourlyProductivityWidgetProps> = ({
  status,
  questMetrics,
}) => {
  const { metrics } = status;
  const { hiPercent, isFixPassed, minSelfComboPercent } = questMetrics;
  const prod = metrics.productivity;
  const sph = metrics.servicesPerHour ?? prod?.servicesPerHour ?? 0;
  const rph = metrics.revenuePerHour ?? prod?.revenuePerHour ?? 0;
  const workHours = metrics.actualWorkingHours ?? prod?.actualWorkingHours ?? 0;
  const totalSvc = metrics.totalCompletedServices ?? prod?.totalCompletedServices ?? 0;
  const fullSetCount = prod?.fullSetCount ?? 0;
  const comboRetainCount = prod?.comboRetainCount ?? 0;
  const singleRetainCount = prod?.singleRetainCount ?? 0;
  const serviceRevenue = metrics.serviceRevenue ?? prod?.serviceRevenue ?? 0;
  const fixPct = Number(((metrics.fixRate || 0) * 100).toFixed(1));
  const comboPct = Number(((metrics.selfComboRate || 0) * 100).toFixed(1));
  const isZeroFix = fixPct === 0;
  const isCsatPassed = hiPercent >= 70;
  const periodLabelText =
    status.period === 'last_month'
      ? 'Tháng trước'
      : status.period === 'this_month'
        ? 'Tháng này'
        : status.period === 'last_3_months'
          ? '3 tháng trước'
          : '30 ngày qua';

  return (
    <section
      aria-label="Hiệu suất phục vụ trên mỗi giờ công"
      data-testid="career-hourly-productivity-widget"
      className="mt-3.5 rounded-2xl border border-sky-200/80 dark:border-sky-500/25 bg-gradient-to-br from-sky-50/90 via-white to-emerald-50/60 dark:from-slate-900/95 dark:via-slate-900 dark:to-sky-950/30 p-3 sm:p-4 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 flex items-center justify-center shrink-0">
            <Gauge className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white m-0">
                Hiệu Suất Phục Vụ / Giờ Công (SPH &amp; Revenue/Hour)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                {periodLabelText}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
              Công thức Khoa học (MOS-002): SPH = (Full set + Dặm Combo + Dặm lẻ) ÷ Giờ công ca thực tế
            </p>
          </div>
        </div>

        <Tooltip title="Tổng hợp trực tiếp từ ca làm hoàn tất (Normal + Retain) và giờ công ca check-in thực tế, đối soát song hành với Bộ 3 Chất lượng (Fix 0% · HI ≥ 70% · LoCa/Combo).">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-help shrink-0">
            <Info className="w-3 h-3 text-sky-500" />
            <span>Đối soát 3 lớp chất lượng</span>
          </span>
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-3 items-stretch">
        {/* SPH & Revenue/Hour Hero Metrics */}
        <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Card 1: SPH */}
          <div className="rounded-xl p-3 bg-white dark:bg-slate-950/80 border border-sky-200/80 dark:border-sky-500/25 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Services / Hour (SPH)
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  workHours <= 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                    : sph >= 0.45
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : sph >= 0.3
                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}
              >
                {workHours <= 0
                  ? 'Chưa có ca'
                  : sph >= 0.45
                    ? '⚡ Tốc độ cao'
                    : sph >= 0.3
                      ? '✓ Ổn định'
                      : 'Đang tăng tốc'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 tabular-nums font-mono">
                {workHours > 0 ? sph.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">lượt mi / giờ</span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>
                <strong>{totalSvc}</strong> lượt (
                <span className="text-pink-600 dark:text-pink-400 font-semibold">{fullSetCount} Full set</span> +{' '}
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{comboRetainCount} Dặm Combo</span>{' '}
                + <span className="text-amber-600 dark:text-amber-400 font-semibold">{singleRetainCount} Dặm lẻ</span>)
              </span>
              <span className="text-slate-400">÷</span>
              <span>
                <strong>{workHours}</strong>h ca
              </span>
            </div>
          </div>

          {/* Card 2: Revenue/Hour */}
          <div className="rounded-xl p-3 bg-white dark:bg-slate-950/80 border border-emerald-200/80 dark:border-emerald-500/25 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Revenue / Hour
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                Giá trị phục vụ
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                {workHours > 0 ? formatVnd(rph) : '0đ'}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ giờ</span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2 tabular-nums pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>
                Tổng DT dịch vụ:{' '}
                <strong className="text-slate-800 dark:text-slate-100">{formatVnd(serviceRevenue)}</strong>
              </span>
              <span className="text-[10px] text-slate-400 shrink-0">
                {prod?.workingHoursSource === 'PAYROLL' ? 'Nguồn: Bảng lương' : 'Nguồn: Ca check-in'}
              </span>
            </div>
          </div>
        </div>

        {/* Bộ 3 Chỉ Số Đối Soát Chất Lượng (Quality Guardrails) */}
        <div className="lg:col-span-6 rounded-xl p-3 bg-white dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bộ 3 Chỉ Số Đối Soát Chất Lượng (Quality Guardrails)</span>
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            {/* 1. Tốc độ & Năng suất */}
            <div className="p-2 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-500/20">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                1. Tốc độ &amp; Năng suất
              </div>
              <div className="font-black text-sky-700 dark:text-sky-300 tabular-nums mt-0.5">
                {workHours > 0 ? `${sph.toFixed(2)} lượt/h` : '—'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                {workHours > 0 ? `${Math.round(rph / 1000).toLocaleString('vi-VN')}K/giờ` : '0 giờ công'}
              </div>
            </div>

            {/* 2. Tay nghề & Kỹ thuật (Fix Rate = 0%) */}
            <div
              className={`p-2 rounded-lg border ${
                isZeroFix
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-500/25'
                  : isFixPassed
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-500/25'
                    : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-500/25'
              }`}
            >
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">2. Tay nghề (Fix Rate)</div>
              <div
                className={`font-black tabular-nums mt-0.5 ${
                  isZeroFix
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : isFixPassed
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {fixPct}%{' '}
                <span className="text-[10px] font-bold">
                  {isZeroFix ? '· Chuẩn 0%' : isFixPassed ? '· Đạt ≤ 1.5%' : '· Vượt ngưỡng'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                {metrics.fixCount ?? 0} ca sửa / {metrics.periodOrders ?? 0} đơn
              </div>
            </div>

            {/* 3. Hài lòng & Chân thành (CSAT >= 70% & LoCa/Combo) */}
            <div
              className={`p-2 rounded-lg border ${
                isCsatPassed
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-500/25'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-500/25'
              }`}
            >
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">3. Hài lòng &amp; LoCa</div>
              <div
                className={`font-black tabular-nums mt-0.5 ${
                  isCsatPassed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                }`}
              >
                CSAT {hiPercent}%
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                LoCa Combo: <strong>{comboPct}%</strong> (Mục tiêu ≥ {minSelfComboPercent}%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
