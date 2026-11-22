'use client';

import React from 'react';
import { Send } from 'lucide-react';

interface TheoryExamFooterProps {
  correctCount: number;
  totalQuestions: number;
  mcqScore: number;
  finalTheoryScore: number;
  isSubmitted: boolean;
  showExplanations: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onToggleExplanations: () => void;
}

export function TheoryExamFooter({
  correctCount,
  totalQuestions,
  mcqScore,
  finalTheoryScore,
  isSubmitted,
  showExplanations,
  onClose,
  onSubmit,
  onToggleExplanations,
}: TheoryExamFooterProps) {
  return (
    <div className="flex items-center justify-between w-full pt-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">
          Đúng:{' '}
          <strong className="text-emerald-600 font-bold tabular-nums">
            {correctCount}/{totalQuestions}
          </strong>{' '}
          câu trắc nghiệm ({mcqScore}đ)
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-xs text-slate-500">
          Tổng điểm: <strong className="text-amber-600 font-bold tabular-nums text-sm">{finalTheoryScore}/100đ</strong>{' '}
          ({finalTheoryScore >= 80 ? 'ĐẠT' : 'CHƯA ĐẠT'})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          Đóng
        </button>
        {!isSubmitted ? (
          <button
            type="button"
            onClick={onSubmit}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            data-testid="btn-submit-theory-exam"
          >
            <Send size={13} />
            <span>Nộp Bài Thi</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleExplanations}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all cursor-pointer"
          >
            {showExplanations ? 'Ẩn Lời Giải' : 'Xem Lời Giải'}
          </button>
        )}
      </div>
    </div>
  );
}
