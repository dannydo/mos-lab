'use client';

import React from 'react';
import { Button } from 'antd';
import { ArrowLeft, Clock, Image as ImageIcon, Layers, Save, ShieldCheck, UserCheck } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { SOP_PREP_AUTHOR_NAME } from './sop-prep-category1-helpers';

interface SopPrepOverviewHeaderProps {
  lastUpdatedAt?: string;
  totalEvidenceCount: number;
  saving: boolean;
  onBack: () => void;
  onSaveAll: () => void;
}

export function SopPrepOverviewHeader({
  lastUpdatedAt,
  totalEvidenceCount,
  saving,
  onBack,
  onSaveAll,
}: SopPrepOverviewHeaderProps) {
  const formattedUpdatedDate = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleDateString('vi-VN') : 'Mới khởi tạo';

  return (
    <>
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            icon={<AppIcon icon={ArrowLeft} size={15} />}
            onClick={onBack}
            className="rounded-xl flex items-center font-medium text-xs sm:text-sm h-8"
            data-testid="sop-prep-back-btn"
          >
            Quay lại danh mục
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Hạng mục 1 – Kiểm tra &amp; Đánh giá tình trạng mi thật
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <AppIcon icon={Clock} size={12} className="mr-1" />
                Bản nháp – Chưa kiểm chứng
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>
                Người phụ trách: <strong>{SOP_PREP_AUTHOR_NAME}</strong>
              </span>
              <span>•</span>
              <span className="tabular-nums">Cập nhật: {formattedUpdatedDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            type="primary"
            icon={<AppIcon icon={Save} size={15} />}
            loading={saving}
            onClick={onSaveAll}
            className="rounded-xl font-medium text-xs sm:text-sm h-8 bg-indigo-600 hover:bg-indigo-700 border-none shadow-sm flex items-center"
            data-testid="sop-prep-save-all-btn"
          >
            Lưu toàn bộ bản nháp
          </Button>
        </div>
      </div>

      {/* Overview Cards & Invariant Principles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <AppIcon icon={Layers} size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tiêu chí chuyên môn</div>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">5 / 5 Tiêu chí</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <AppIcon icon={ImageIcon} size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tổng tệp minh chứng</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totalEvidenceCount} tệp đính kèm
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <AppIcon icon={UserCheck} size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Người nhập liệu</div>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100">{SOP_PREP_AUTHOR_NAME}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <AppIcon icon={ShieldCheck} size={20} />
          </div>
          <div>
            <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">Bảo toàn dữ liệu</div>
            <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-snug">
              Lưu độc lập, không có AI can thiệp
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
