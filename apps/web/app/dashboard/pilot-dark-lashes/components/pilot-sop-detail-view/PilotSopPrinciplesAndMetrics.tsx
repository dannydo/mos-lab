'use client';

import React from 'react';
import { Card } from 'antd';
import { Award, Clock, FileCheck2, Layers, ShieldCheck, Timer, type LucideIcon } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';

interface CorePrincipleItem {
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconBoxClassName: string;
}

const CORE_PRINCIPLES: CorePrincipleItem[] = [
  {
    label: 'Nguyên tắc 1',
    title: 'Trình tự 7 bước bất biến',
    description: 'Giữ nguyên tên, cấu trúc và thứ tự 7 bước đã được Cô Giang Đàm phê duyệt.',
    icon: FileCheck2,
    iconBoxClassName: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    label: 'Nguyên tắc 2',
    title: 'Phân định thời gian',
    description: 'Tách biệt thời gian chuẩn kỹ thuật với thời gian thực tế; không lấy 1 ca làm định mức.',
    icon: Timer,
    iconBoxClassName: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'Nguyên tắc 3',
    title: 'Minh chứng & Căn cứ',
    description: 'Thông số chưa được đo kiểm thức tế đánh dấu rõ ràng “Chờ Cô Giang Đàm xác nhận”.',
    icon: ShieldCheck,
    iconBoxClassName: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    label: 'Nguyên tắc 4',
    title: 'Dự thảo không tự ban hành',
    description: 'Trình bản dự thảo để PO và Cô Giang Đàm thẩm duyệt; không tự ý áp dụng chính thức.',
    icon: Award,
    iconBoxClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

interface PilotSopPrinciplesAndMetricsProps {
  totalTargetMinutes: number;
  totalEmpiricalAvgSeconds: number;
  stepsWithStats: number;
  totalSessions: number;
}

export function PilotSopPrinciplesAndMetrics({
  totalTargetMinutes,
  totalEmpiricalAvgSeconds,
  stepsWithStats,
  totalSessions,
}: PilotSopPrinciplesAndMetricsProps) {
  return (
    <>
      {/* 2. CORE PRINCIPLES & GUIDELINES (4 NGUYÊN TẮC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {CORE_PRINCIPLES.map((item) => (
          <Card
            key={item.label}
            size="small"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.iconBoxClassName}`}>
                <AppIcon icon={item.icon} size={14} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {item.label}
                </span>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">{item.title}</h4>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                  {item.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 3. BENCHMARK COMPARISON SUMMARY METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thời gian tiêu chuẩn</span>
            <AppIcon icon={Timer} size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {totalTargetMinutes}
            </span>
            <span className="text-xs text-slate-500 font-medium">phút (7 bước)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Định mức kỹ thuật khuyến nghị</span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thời gian thực tế TB</span>
            <AppIcon icon={Clock} size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totalEmpiricalAvgSeconds > 0 ? Math.round(totalEmpiricalAvgSeconds / 60) : '--'}
            </span>
            <span className="text-xs text-slate-500 font-medium">phút / ca</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {stepsWithStats > 0 ? `Đo đạc từ ${stepsWithStats}/7 bước ca hoàn thành` : 'Đang đồng bộ số liệu'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng ca Pilot lưu trữ</span>
            <AppIcon icon={Layers} size={16} className="text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">
              {totalSessions}
            </span>
            <span className="text-xs text-slate-500 font-medium">ca dịch vụ</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Nguồn minh chứng đối chiếu</span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tiêu chuẩn kiểm soát QC</span>
            <AppIcon icon={ShieldCheck} size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
              100%
            </span>
            <span className="text-xs text-slate-500 font-medium">nghiệm thu</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Checklist an toàn &amp; CSAT 5 sao</span>
        </div>
      </div>
    </>
  );
}
