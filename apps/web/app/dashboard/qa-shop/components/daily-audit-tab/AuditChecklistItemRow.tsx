'use client';

import React from 'react';
import { Alert, Input, Select } from 'antd';
import { Camera, TriangleAlert } from 'lucide-react';
import type { QaAuditResult, QaChecklistItem, QaSeverity } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { ItemStatusToggle } from './ItemStatusToggle';
import { SeverityDotIndicator } from './SeverityDotIndicator';
import { SEVERITY_SELECT_OPTIONS, type ItemResultState } from './types';

interface AuditChecklistItemRowProps {
  item: QaChecklistItem;
  state: ItemResultState;
  onResultChange: (itemId: string, newResult: QaAuditResult) => void;
  onNoteChange: (itemId: string, noteText: string) => void;
  onPhotoChange: (itemId: string, photoUrl: string) => void;
  onSeverityChange: (itemId: string, severity: QaSeverity) => void;
}

export const AuditChecklistItemRow: React.FC<AuditChecklistItemRowProps> = ({
  item,
  state,
  onResultChange,
  onNoteChange,
  onPhotoChange,
  onSeverityChange,
}) => {
  const isFail = state.result === 'FAIL';

  return (
    <div
      className={`p-4 transition-colors ${
        isFail ? 'bg-rose-50/40 dark:bg-rose-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusTag status="processing" label={item.code} className="font-mono font-semibold text-[11px]" />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.title}</span>
            <SeverityDotIndicator severity={item.isCritical ? 'CRITICAL' : 'MEDIUM'} />
            <span className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums font-medium">
              Trọng số: {item.weight}đ
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.standardRequirement}</p>
        </div>

        <ItemStatusToggle itemId={item.id} itemTitle={item.title} value={state.result} onChange={onResultChange} />
      </div>

      {isFail && (
        <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-900/60 space-y-3 animate-fadeIn">
          <Alert
            type="error"
            showIcon
            icon={<AppIcon icon={TriangleAlert} size={14} />}
            message={
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Tự động phát hành Ticket Sự Cố cho Quản Lý Shop</span>
                <span className="text-[11px] text-rose-500 tabular-nums">Hạn khắc phục: 2 ngày</span>
              </div>
            }
            className="py-1 px-3 text-xs"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Lý do không đạt / Ghi chú vi phạm:
              </label>
              <Input.TextArea
                rows={2}
                value={state.note || ''}
                onChange={(e) => onNoteChange(item.id, e.target.value)}
                placeholder="Mô tả chi tiết vi phạm tại cửa hàng..."
                className="text-xs border-rose-200 dark:border-rose-900/60 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Mức độ nghiêm trọng:
              </label>
              <Select
                value={state.severity || 'MEDIUM'}
                onChange={(val) => onSeverityChange(item.id, val as QaSeverity)}
                className="w-full text-xs"
                options={SEVERITY_SELECT_OPTIONS}
              />

              <div className="mt-2">
                <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Ảnh bằng chứng {item.requirePhotoOnFail && <span className="text-rose-500">*</span>}:
                </label>
                <Input
                  size="small"
                  prefix={<AppIcon icon={Camera} size={13} className="text-slate-400" />}
                  value={state.photoUrl || ''}
                  onChange={(e) => onPhotoChange(item.id, e.target.value)}
                  placeholder="Dán URL ảnh hoặc chụp bằng camera..."
                  className="text-xs border-rose-200 dark:border-rose-900/60 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
