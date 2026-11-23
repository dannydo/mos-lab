'use client';

import React from 'react';
import { Check, Sparkles, XCircle } from 'lucide-react';
import type { QuizOptionKey, QuizQuestion } from './theory-exam-questions';

interface TheoryMcqSectionProps {
  questions: QuizQuestion[];
  answers: Record<number, QuizOptionKey>;
  isSubmitted: boolean;
  showExplanations: boolean;
  onSelectOption: (qId: number, key: QuizOptionKey) => void;
}

function getCardToneClass(isSubmitted: boolean, isCorrect: boolean): string {
  if (!isSubmitted) {
    return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300';
  }
  return isCorrect ? 'bg-emerald-500/[0.04] border-emerald-500/30' : 'bg-rose-500/[0.04] border-rose-500/30';
}

function getOptionButtonToneClass(
  isTheCorrectOne: boolean,
  isSelected: boolean,
  isSubmitted: boolean,
  isCorrect: boolean
): string {
  if (isTheCorrectOne) {
    return 'bg-emerald-500/15 border-emerald-500/50 text-emerald-900 dark:text-emerald-200 font-semibold';
  }
  if (isSelected) {
    return isSubmitted && !isCorrect
      ? 'bg-rose-500/15 border-rose-500/50 text-rose-900 dark:text-rose-200 font-semibold'
      : 'bg-blue-500/15 border-blue-500/50 text-blue-900 dark:text-blue-200 font-semibold';
  }
  return 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100';
}

function getOptionBadgeToneClass(
  isTheCorrectOne: boolean,
  isSelected: boolean,
  isSubmitted: boolean,
  isCorrect: boolean
): string {
  if (isTheCorrectOne) return 'bg-emerald-500 text-white';
  if (isSelected) return isSubmitted && !isCorrect ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white';
  return 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
}

export function TheoryMcqSection({
  questions,
  answers,
  isSubmitted,
  showExplanations,
  onSelectOption,
}: TheoryMcqSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">
          Phần I. Trắc Nghiệm (17 Câu · 68 Điểm)
        </span>
        <span className="text-[11px] text-slate-400">Chọn 1 đáp án đúng nhất (4đ/câu)</span>
      </div>

      {questions.map((q) => {
        const chosen = answers[q.id];
        const isCorrect = chosen === q.correctKey;

        return (
          <div
            key={q.id}
            className={`p-3 rounded-xl border transition-all ${getCardToneClass(isSubmitted, isCorrect)}`}
            data-testid={`quiz-question-${q.id}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                <span className="text-blue-600 dark:text-blue-400 font-black mr-1">Câu {q.id}.</span>
                {q.question}
              </span>
              {isSubmitted && (
                <span
                  className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                    isCorrect
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {isCorrect ? (
                    <>
                      <Check size={11} /> +4đ
                    </>
                  ) : (
                    <>
                      <XCircle size={11} /> 0đ
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {q.options.map((opt) => {
                const isSelected = chosen === opt.key;
                const isTheCorrectOne = isSubmitted && opt.key === q.correctKey;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onSelectOption(q.id, opt.key)}
                    disabled={isSubmitted}
                    className={`text-left p-2 rounded-lg border text-[11.5px] flex items-center gap-2 transition-all cursor-pointer ${getOptionButtonToneClass(
                      isTheCorrectOne,
                      isSelected,
                      isSubmitted,
                      isCorrect
                    )}`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${getOptionBadgeToneClass(
                        isTheCorrectOne,
                        isSelected,
                        isSubmitted,
                        isCorrect
                      )}`}
                    >
                      {opt.key}
                    </span>
                    <span className="flex-1 leading-snug">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {showExplanations && (
              <div className="mt-2 p-2 rounded-lg bg-blue-500/[0.07] border border-blue-500/20 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-1.5">
                <Sparkles size={13} className="text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Lời giải Wings SOP:</strong> {q.explanation}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
