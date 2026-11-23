'use client';

import React from 'react';
import { Card, Input } from 'antd';
import { QUICK_EXAMINER_TAGS } from './rubric-config';

interface ExaminerNotesCardProps {
  examinerNotes: string;
  onChangeNotes: (notes: string) => void;
  onQuickTagClick: (tag: string) => void;
}

export function ExaminerNotesCard({ examinerNotes, onChangeNotes, onQuickTagClick }: ExaminerNotesCardProps) {
  return (
    <Card
      variant="outlined"
      className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
    >
      <div className="space-y-2">
        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
          Góp Ý &amp; Nhận Xét Của CEO Danny Đỗ:
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_EXAMINER_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onQuickTagClick(tag)}
              className="text-[10.5px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              + {tag}
            </button>
          ))}
        </div>

        <Input.TextArea
          rows={2}
          value={examinerNotes}
          onChange={(e) => onChangeNotes(e.target.value)}
          placeholder="Nhập nhận xét chi tiết..."
          className="text-xs rounded-xl"
          data-testid="input-iphone-notes"
        />
      </div>
    </Card>
  );
}
