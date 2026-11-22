'use client';

import React from 'react';
import { Button, Card, Input } from 'antd';
import { CheckCircle2, Clock, Layers, Save, Sparkles } from 'lucide-react';
import type { SopPrepCriterionData } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { SOP_PREP_AUTHOR_NAME } from './sop-prep-category1-helpers';

interface SopPrepCriterionFormCardProps {
  criterion: SopPrepCriterionData;
  knowledgeText: string;
  practicalText: string;
  groundsText: string;
  saving: boolean;
  onKnowledgeChange: (value: string) => void;
  onPracticalChange: (value: string) => void;
  onGroundsChange: (value: string) => void;
  onSaveCriterion: () => void;
}

export function SopPrepCriterionFormCard({
  criterion,
  knowledgeText,
  practicalText,
  groundsText,
  saving,
  onKnowledgeChange,
  onPracticalChange,
  onGroundsChange,
  onSaveCriterion,
}: SopPrepCriterionFormCardProps) {
  return (
    <Card
      variant="outlined"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm tabular-nums">
            {criterion.order}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
              Tiêu chí {criterion.order}: {criterion.name}
            </h3>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hạng mục 1 · Kiểm tra &amp; Đánh giá tình trạng mi thật
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <AppIcon icon={Clock} size={12} className="mr-1.5" />
            {criterion.statusLabel || 'Bản nháp – Chưa kiểm chứng'}
          </span>
          <Button
            type="primary"
            icon={<AppIcon icon={Save} size={14} />}
            loading={saving}
            onClick={onSaveCriterion}
            className="rounded-xl font-medium text-xs h-8 bg-indigo-600 hover:bg-indigo-700 border-none shadow-sm flex items-center"
            data-testid="sop-prep-save-criterion-btn"
          >
            Lưu bản nháp tiêu chí này
          </Button>
        </div>
      </div>

      {/* Form Fields: A, B, C */}
      <div className="space-y-4 pt-4">
        {/* Field A: Kiến thức chuyên môn */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AppIcon icon={Sparkles} size={15} className="text-indigo-500" />
              <span>A. Kiến thức chuyên môn (Lý thuyết, giải phẫu nang mi, chu kỳ sinh học)</span>
            </label>
            <span className="text-[11px] text-slate-400">Do {SOP_PREP_AUTHOR_NAME} nhập</span>
          </div>
          <Input.TextArea
            rows={4}
            value={knowledgeText}
            onChange={(e) => onKnowledgeChange(e.target.value)}
            placeholder="Nhập kiến thức chuyên môn, cơ sở sinh học và lý thuyết thẩm định cho tiêu chí này..."
            className="rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200"
            data-testid="sop-prep-field-knowledge"
          />
        </div>

        {/* Field B: Phương pháp thực hành */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AppIcon icon={Layers} size={15} className="text-emerald-500" />
              <span>B. Phương pháp thực hành (Quy trình thao tác, dụng cụ đo đạc &amp; kiểm tra thực tế)</span>
            </label>
            <span className="text-[11px] text-slate-400">Từng bước thực hiện</span>
          </div>
          <Input.TextArea
            rows={5}
            value={practicalText}
            onChange={(e) => onPracticalChange(e.target.value)}
            placeholder="Ghi rõ các bước thực hành, dụng cụ chuyên dụng (cữ đo mi, kính lúp, que gạt) và vị trí kiểm tra..."
            className="rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200"
            data-testid="sop-prep-field-practical"
          />
        </div>

        {/* Field C: Căn cứ đánh giá */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AppIcon icon={CheckCircle2} size={15} className="text-blue-500" />
              <span>C. Căn cứ đánh giá (Tiêu chuẩn Đạt/Không đạt &amp; Ngưỡng thẩm định lâm sàng)</span>
            </label>
            <span className="text-[11px] text-slate-400">Quy chuẩn PASS / FAIL</span>
          </div>
          <Input.TextArea
            rows={4}
            value={groundsText}
            onChange={(e) => onGroundsChange(e.target.value)}
            placeholder="Mô tả cụ thể căn cứ đánh giá: ngưỡng định lượng Đạt (PASS) và tiêu chí Không Đạt (FAIL)..."
            className="rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200"
            data-testid="sop-prep-field-grounds"
          />
        </div>
      </div>
    </Card>
  );
}
