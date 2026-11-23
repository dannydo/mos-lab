'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Input } from 'antd';
import { AdaptiveModal } from '~/components/ui';
import { getStaffAvatarBgClass, getStaffInitials } from '../mos-chat-task-inline-checklist/checklistHelpers';
import type { ThreadChecklistAiSuggestion } from './threadChecklistTypes';

export interface ThreadChecklistAiExtractModalProps {
  open: boolean;
  isDark: boolean;
  suggestions: ThreadChecklistAiSuggestion[];
  onClose: () => void;
  onApply: () => void;
  onToggleSuggestion: (index: number, selected: boolean) => void;
  onUpdateSuggestionTitle: (index: number, title: string) => void;
}

export const ThreadChecklistAiExtractModal: React.FC<ThreadChecklistAiExtractModalProps> = ({
  open,
  isDark,
  suggestions,
  onClose,
  onApply,
  onToggleSuggestion,
  onUpdateSuggestionTitle,
}) => {
  const selectedCount = suggestions.filter((s) => s.selected).length;

  return (
    <AdaptiveModal
      intent="confirm"
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      title={
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Sparkles size={16} />
          <span>AI Trích xuất Checklist từ Luồng Thảo Luận</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={onApply}
      okText={`Áp dụng vào Checklist (${selectedCount} việc)`}
      cancelText="Hủy"
      width={520}
      destroyOnHidden
    >
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        AI đã phân tích báo cáo công việc và luồng thảo luận (tự động lọc bỏ các câu chat trao đổi thường), gắn nhãn
        mảng và hạn chót:
      </p>

      <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
        {suggestions.map((sug, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60"
          >
            <input
              type="checkbox"
              checked={sug.selected}
              onChange={(e) => onToggleSuggestion(idx, e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-amber-500"
            />
            <Input
              size="small"
              value={sug.title}
              onChange={(e) => onUpdateSuggestionTitle(idx, e.target.value)}
              className="text-xs flex-1"
            />
            {sug.assigneeName && (
              <span
                className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[8.5px] font-bold text-white shrink-0 ${getStaffAvatarBgClass(
                  sug.assigneeName
                )}`}
                title={sug.assigneeName}
              >
                {getStaffInitials(sug.assigneeName)}
              </span>
            )}
          </div>
        ))}
      </div>
    </AdaptiveModal>
  );
};
