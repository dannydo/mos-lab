'use client';

import React from 'react';
import { Button } from 'antd';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import { CriteriaChecklistCard } from './CriteriaChecklistCard';
import type { PreviewPhotoState } from './pilot-criteria-sop.types';
import { SOP_CRITERIA_LIST } from './sop-criteria-catalog';

interface CriteriaChecklistSectionProps {
  expandedCriteria: number[];
  expandedDeepDives: number[];
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onToggleCriterion: (id: number) => void;
  onToggleDeepDive: (id: number) => void;
  onPreviewPhoto: (photo: PreviewPhotoState) => void;
}

export function CriteriaChecklistSection({
  expandedCriteria,
  expandedDeepDives,
  onExpandAll,
  onCollapseAll,
  onToggleCriterion,
  onToggleDeepDive,
  onPreviewPhoto,
}: CriteriaChecklistSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Khung Thẩm Định Kỹ Thuật Chi Tiết
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
            Checklist 5 Tiêu Chí Đánh Giá Chuyên Môn (Do Cô Giang Đàm Xây Dựng)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="small"
            onClick={onExpandAll}
            className="text-xs rounded-lg"
            data-testid="expand-all-criteria-button"
          >
            <AppIcon icon={ChevronDown} size={13} />
            <span>Mở rộng tất cả</span>
          </Button>
          <Button
            size="small"
            onClick={onCollapseAll}
            className="text-xs rounded-lg"
            data-testid="collapse-all-criteria-button"
          >
            <AppIcon icon={ChevronUp} size={13} />
            <span>Thu gọn tất cả</span>
          </Button>
        </div>
      </div>

      {/* 5 Tiêu chí Collapsible Accordion */}
      <div className="grid grid-cols-1 gap-3.5">
        {SOP_CRITERIA_LIST.map((crit) => (
          <CriteriaChecklistCard
            key={crit.id}
            criterion={crit}
            isExpanded={expandedCriteria.includes(crit.id)}
            isDeepDiveOpen={expandedDeepDives.includes(crit.id)}
            onToggleExpand={onToggleCriterion}
            onToggleDeepDive={onToggleDeepDive}
            onPreviewPhoto={onPreviewPhoto}
          />
        ))}
      </div>
    </div>
  );
}
