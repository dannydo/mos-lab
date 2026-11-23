'use client';

import React, { useMemo } from 'react';
import { Alert, Card, Collapse } from 'antd';
import { Building2 } from 'lucide-react';
import type { QaAuditResult, QaChecklistTemplate, QaSeverity } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { AuditChecklistItemRow } from './AuditChecklistItemRow';
import type { ItemResultState } from './types';

interface AuditChecklistSectionListProps {
  themeMode: string;
  loadingTemplate: boolean;
  template: QaChecklistTemplate | null;
  activeAccordionKeys: string[];
  onAccordionChange: (keys: string[]) => void;
  itemStates: Record<string, ItemResultState>;
  onItemResultChange: (itemId: string, newResult: QaAuditResult) => void;
  onItemNoteChange: (itemId: string, noteText: string) => void;
  onItemPhotoChange: (itemId: string, photoUrl: string) => void;
  onItemSeverityChange: (itemId: string, severity: QaSeverity) => void;
}

export const AuditChecklistSectionList: React.FC<AuditChecklistSectionListProps> = ({
  themeMode,
  loadingTemplate,
  template,
  activeAccordionKeys,
  onAccordionChange,
  itemStates,
  onItemResultChange,
  onItemNoteChange,
  onItemPhotoChange,
  onItemSeverityChange,
}) => {
  const collapseItems = useMemo(() => {
    if (!template) return [];

    return template.sections.map((sec) => {
      const secPassed = sec.items.filter((i) => itemStates[i.id]?.result === 'PASS').length;
      const secFailed = sec.items.filter((i) => itemStates[i.id]?.result === 'FAIL').length;

      return {
        key: sec.id,
        className: `border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden shadow-xs transition-all ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800/60' : 'bg-white border-slate-200/60'
        }`,
        label: (
          <div className="flex items-center justify-between w-full pr-4 select-none">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <AppIcon icon={Building2} size={13} className="text-purple-500" />
                {sec.title}
              </span>
              <StatusTag
                status="default"
                label={`${sec.items.length} tiêu chuẩn`}
                className="text-[11px] rounded-full px-2 tabular-nums"
              />
            </div>

            <div className="flex items-center gap-2">
              <StatusTag
                status="success"
                label={`${secPassed}/${sec.items.length} Đạt`}
                className="text-[11px] tabular-nums"
              />
              {secFailed > 0 && (
                <StatusTag
                  status="error"
                  label={`${secFailed} Không Đạt`}
                  className="text-[11px] font-bold animate-pulse tabular-nums"
                />
              )}
            </div>
          </div>
        ),
        children: (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sec.items.map((itm) => {
              const st = itemStates[itm.id] || { result: 'PASS' };
              return (
                <AuditChecklistItemRow
                  key={itm.id}
                  item={itm}
                  state={st}
                  onResultChange={onItemResultChange}
                  onNoteChange={onItemNoteChange}
                  onPhotoChange={onItemPhotoChange}
                  onSeverityChange={onItemSeverityChange}
                />
              );
            })}
          </div>
        ),
      };
    });
  }, [template, itemStates, themeMode, onItemResultChange, onItemNoteChange, onItemPhotoChange, onItemSeverityChange]);

  if (loadingTemplate) {
    return (
      <Card className="text-center py-12">
        <div className="text-slate-500 text-sm">Đang tải bộ tiêu chuẩn kiểm tra...</div>
      </Card>
    );
  }

  if (!template) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Chưa có mẫu kiểm tra cho chi nhánh này"
        description="Bấm 'Quản Lý Tiêu Chí' ở trên để nạp tiêu chuẩn mới."
      />
    );
  }

  return (
    <Collapse
      activeKey={activeAccordionKeys}
      onChange={(keys) => onAccordionChange(typeof keys === 'string' ? [keys] : keys)}
      className="custom-qa-accordion border-0 bg-transparent space-y-3"
      expandIconPosition="end"
      items={collapseItems}
    />
  );
};
