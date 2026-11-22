'use client';

import React from 'react';
import { BookOpen, HelpCircle } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import { TECHNICAL_GLOSSARY_7_STEPS } from './pilot-sop-detail-helpers';

export function PilotSopGlossarySection() {
  return (
    <div
      className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-3 transition-all shadow-xs"
      data-testid="sop-glossary-section"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AppIcon icon={BookOpen} size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
              Từ Điển Thuật Ngữ Kỹ Thuật (Diễn Giải Dễ Hiểu Cho Mọi Người)
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Giúp người chưa có chuyên môn hoặc học viên mới dễ dàng nắm bắt nguyên lý uốn mi an toàn
            </span>
          </div>
        </div>
        <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30">
          10 thuật ngữ cốt lõi
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {TECHNICAL_GLOSSARY_7_STEPS.map((item) => (
          <div
            key={item.term}
            className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 space-y-1.5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AppIcon icon={HelpCircle} size={13} className="text-amber-500 shrink-0" />
                <span>{item.term}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 whitespace-nowrap">
                  {item.badge}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-300 m-0 leading-relaxed">{item.simpleExplain}</p>
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Áp dụng tại:</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">{item.contextStep}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
