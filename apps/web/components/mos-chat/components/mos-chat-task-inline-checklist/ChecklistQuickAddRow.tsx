'use client';

import React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Input, Tooltip } from 'antd';

export interface ChecklistQuickAddRowProps {
  isDark: boolean;
  quickTitle: string;
  isAdding: boolean;
  onChangeQuickTitle: (value: string) => void;
  onAdd: () => void;
}

export const ChecklistQuickAddRow: React.FC<ChecklistQuickAddRowProps> = ({
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
        placeholder="Thêm đầu việc mới (nhấn Enter)..."
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
        className={`text-xs rounded-md ${
          isDark ? 'bg-slate-900/60 border-white/[0.12]' : 'bg-white border-black/[0.12]'
        }`}
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
          className="w-6 h-6 rounded-md inline-flex items-center justify-center bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white cursor-pointer transition-all shrink-0 shadow-sm"
        >
          {isAdding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />}
        </button>
      </Tooltip>
    </div>
  );
};
