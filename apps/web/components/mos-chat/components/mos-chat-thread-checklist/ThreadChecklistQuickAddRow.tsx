'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Input, Tooltip } from 'antd';

export interface ThreadChecklistQuickAddRowProps {
  isDark: boolean;
  quickTitle: string;
  isAdding: boolean;
  onChangeQuickTitle: (value: string) => void;
  onAdd: () => void;
}

export const ThreadChecklistQuickAddRow: React.FC<ThreadChecklistQuickAddRowProps> = ({
  isDark,
  quickTitle,
  isAdding,
  onChangeQuickTitle,
  onAdd,
}) => {
  return (
    <div className="pt-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Input
        size="small"
        placeholder="Thêm việc cần làm... (Enter để lưu)"
        value={quickTitle}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        onChange={(e) => onChangeQuickTitle(e.target.value)}
        onPressEnter={(e) => {
          if (e.nativeEvent.isComposing || (e as any).keyCode === 229) return;
          e.preventDefault();
          e.stopPropagation();
          onAdd();
        }}
        disabled={isAdding}
        className={`text-xs rounded-lg ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-black/[0.12]'}`}
      />
      <Tooltip title="Thêm mục việc (Enter)">
        <button
          type="button"
          aria-label="Thêm"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          disabled={isAdding || !quickTitle.trim()}
          className="w-7 h-7 rounded-lg inline-flex items-center justify-center bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white cursor-pointer transition-all shrink-0"
        >
          <Plus size={13} />
        </button>
      </Tooltip>
    </div>
  );
};
