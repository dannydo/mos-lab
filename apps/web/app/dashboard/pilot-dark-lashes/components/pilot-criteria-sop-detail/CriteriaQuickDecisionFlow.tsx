'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';

interface QuickFlowGate {
  step: number;
  threshold: string;
  title: string;
  rule: string;
}

const QUICK_FLOW_GATES: QuickFlowGate[] = [
  {
    step: 1,
    threshold: '≥ 8.0mm',
    title: 'Độ dài mi',
    rule: 'Dưới 8mm ➔ Dừng, từ chối an toàn',
  },
  {
    step: 2,
    threshold: 'Sợi khỏe',
    title: 'Độ dày & Biểu bì',
    rule: 'Mất lõi, xơ mủn ➔ FAIL ngay',
  },
  {
    step: 3,
    threshold: 'Kín cung',
    title: 'Mật độ mi',
    rule: 'Trống hốc > 2.5mm ➔ Tư vấn nối mi',
  },
  {
    step: 4,
    threshold: '> 6 tuần',
    title: 'Tình trạng mi',
    rule: 'Viêm bờ mi / cháy sun ➔ Không làm',
  },
  {
    step: 5,
    threshold: 'Thoát mí 90°',
    title: 'Khả năng tạo form',
    rule: 'Mí đè gập ➔ Không uốn được',
  },
];

/** 30-second 5-gate PASS/FAIL quick decision flow for consultation staff. */
export function CriteriaQuickDecisionFlow() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-500/5 via-emerald-500/5 to-transparent space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
            Sơ Đồ Ra Quyết Định Nhanh Trong 30 Giây
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
            Quy Trình 5 Cửa Kiểm Soát PASS/FAIL (Đạt 5/5 Mới Được Uốn)
          </h2>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Áp dụng trực tiếp tại Bàn tư vấn khách hàng</span>
      </div>

      {/* 5 Bước kiểm soát tuần tự */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
        {QUICK_FLOW_GATES.map((gate) => (
          <div
            key={gate.step}
            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 relative"
          >
            <div className="flex items-center justify-between">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center tabular-nums">
                {gate.step}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{gate.threshold}</span>
            </div>
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{gate.title}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-tight">{gate.rule}</p>
          </div>
        ))}
      </div>

      {/* Nguyên tắc cốt lõi & Hướng ra quyết định */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <AppIcon icon={CheckCircle2} size={16} className="text-emerald-500 shrink-0" />
          <span className="text-slate-700 dark:text-slate-300">
            <strong>Nguyên tắc vàng:</strong> Chỉ cần vi phạm <strong>1 trong 5 tiêu chí</strong> ➔ Dừng lại ngay, bảo
            vệ sức khỏe mắt khách hàng và uy tín của Wings.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            PASS: Vào SOP 7 bước
          </span>
          <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
            FAIL: Từ chối an toàn
          </span>
          <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            CHUYỂN: Nối mi Hyper
          </span>
        </div>
      </div>
    </div>
  );
}
