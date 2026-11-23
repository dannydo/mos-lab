'use client';

import React from 'react';
import { Card } from 'antd';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import type { PilotMaterialSopDocument } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { DEFAULT_EXPERT_REVIEWER, computeVerifiedPercentage, formatVND } from './pilot-material-sop-helpers';

interface PilotMaterialSopSectionProps {
  doc: PilotMaterialSopDocument | null;
}

export function PilotMaterialSopModalTitle({ doc }: PilotMaterialSopSectionProps) {
  return (
    <div className="flex items-center justify-between pr-8 flex-wrap gap-2">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
          <AppIcon icon={FileText} size={20} />
        </div>
        <div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Hạng Mục 3 – Định Mức &amp; Kiểm Soát Vật Tư Tiêu Hao</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
              SOP &amp; Đào tạo KTV
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Chuẩn hóa định mức thuốc uốn, quy chuẩn keo &amp; trục silicon, quy trình khử khuẩn trình CEO phê duyệt
            Scale
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {doc?.overallStatus === 'REVIEWED_BY_EXPERT' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <AppIcon icon={CheckCircle2} size={14} className="text-emerald-600" />
            Đã thẩm định chuyên môn (Cô Giang Đàm)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <AppIcon icon={Clock} size={14} className="text-amber-600" />
            Bản dự thảo · Chờ thẩm định
          </span>
        )}
        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
          {doc?.isPublished ? 'Đã ban hành' : 'Chưa ban hành Scale'}
        </span>
      </div>
    </div>
  );
}

export function PilotMaterialSopStatsBanner({ doc }: PilotMaterialSopSectionProps) {
  const verifiedPct = computeVerifiedPercentage(doc?.summary.verifiedCount, doc?.summary.totalItemsCount);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card
        variant="outlined"
        className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 flex flex-col justify-between"
      >
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Tổng Chi Phí Định Mức / Ca
        </span>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatVND(doc?.summary.totalNormCostPerSession || 0)}
          </span>
          <span className="text-xs text-slate-400">/ca</span>
        </div>
        <span className="text-[10px] text-slate-500 mt-1 block">Tiết kiệm tối ưu từ 4 loại dung dịch chuẩn</span>
      </Card>

      <Card
        variant="outlined"
        className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 flex flex-col justify-between"
      >
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Chuyên Môn Thẩm Định
        </span>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-base font-bold text-slate-800 dark:text-slate-100">
            {doc?.expertReviewer || DEFAULT_EXPERT_REVIEWER}
          </span>
        </div>
        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-1 block">
          Lead Technical &amp; Master Trainer
        </span>
      </Card>

      <Card
        variant="outlined"
        className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 flex flex-col justify-between"
      >
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Tiến Độ Thẩm Định
        </span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
            {doc?.summary.verifiedCount || 0} / {doc?.summary.totalItemsCount || 0}
          </span>
          <span className="text-xs font-semibold tabular-nums text-emerald-600">{verifiedPct}%</span>
        </div>
        <span className="text-[10px] text-slate-500 mt-1 block">
          {doc?.summary.pendingReviewCount || 0} hạng mục đang chờ duyệt
        </span>
      </Card>

      <Card
        variant="outlined"
        className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 flex flex-col justify-between"
      >
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Quy Chế Scale</span>
        <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Trình CEO phê duyệt</div>
        <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium mt-1 block">
          ⚠️ Không tự ý ban hành khi chưa duyệt
        </span>
      </Card>
    </div>
  );
}
