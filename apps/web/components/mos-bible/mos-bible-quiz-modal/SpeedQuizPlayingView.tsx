'use client';

import React from 'react';
import { Card, Progress, Typography } from 'antd';
import { Clock, Flame } from 'lucide-react';
import type { MosBibleQuizQuestion } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { QUESTION_TIME_LIMIT_SEC } from './constants';
import type { QuizOptionKey } from './types';

const { Text } = Typography;

export interface SpeedQuizPlayingViewProps {
  question: MosBibleQuizQuestion;
  speedIndex: number;
  totalQuestions: number;
  speedStreak: number;
  speedTimeLeft: number;
  speedSubmitting: boolean;
  onSelectOption: (selectedKey: QuizOptionKey) => void;
}

export function SpeedQuizPlayingView({
  question,
  speedIndex,
  totalQuestions,
  speedStreak,
  speedTimeLeft,
  speedSubmitting,
  onSelectOption,
}: SpeedQuizPlayingViewProps) {
  const progressStrokeColor =
    speedTimeLeft > 5 ? 'rgba(16, 185, 129, 1)' : speedTimeLeft > 2 ? 'rgba(245, 158, 11, 1)' : 'rgba(239, 68, 68, 1)';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <StatusTag
              status="orange"
              label={`Câu ${speedIndex + 1} / ${totalQuestions}`}
              className="font-bold tabular-nums"
            />
            <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-300">
              <AppIcon icon={Flame} size="sm" className="text-orange-500" />
              Chuỗi hiện tại: <strong className="text-orange-600 tabular-nums">{speedStreak}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              {speedStreak < 3 ? (
                <>
                  Mục tiêu 1: Cần <strong className="tabular-nums">{3 - speedStreak} câu</strong> → 1 🍌
                </>
              ) : speedStreak < 5 ? (
                <>
                  Mục tiêu 2: Cần <strong className="tabular-nums">{5 - speedStreak} câu</strong> → 2 🍌
                </>
              ) : (
                <span className="text-emerald-500 font-bold">🎉 Đạt mốc tối đa 2 🍌!</span>
              )}
            </span>
            <div
              className={`inline-flex items-center gap-1 font-bold text-sm tabular-nums px-2 py-0.5 rounded ${
                speedTimeLeft > 5
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                  : speedTimeLeft > 2
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 animate-pulse'
              }`}
            >
              <AppIcon icon={Clock} size="sm" />
              <span>{speedTimeLeft}s</span>
            </div>
          </div>
        </div>

        <Progress
          percent={(speedTimeLeft / QUESTION_TIME_LIMIT_SEC) * 100}
          showInfo={false}
          strokeColor={progressStrokeColor}
          size="small"
          className="m-0"
        />
      </div>

      <Card size="small" className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/40">
        <div className="flex items-center gap-2 mb-2">
          <StatusTag status="gold" label={question.commandmentId} className="text-xs font-semibold" />
          <Text strong className="text-xs text-amber-800 dark:text-amber-300">
            {question.title}
          </Text>
        </div>
        <div className="text-sm font-medium leading-relaxed text-slate-800 dark:text-zinc-200">{question.scenario}</div>
      </Card>

      <div className="grid grid-cols-1 gap-2 pt-1">
        {question.options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSelectOption(opt.key)}
            disabled={speedSubmitting}
            className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all flex items-start gap-3 active:scale-[0.99]"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 shrink-0">
              {opt.key}
            </span>
            <span className="text-xs leading-relaxed text-slate-800 dark:text-zinc-200 pt-0.5">{opt.text}</span>
          </button>
        ))}
      </div>

      <div className="text-center text-[11px] text-slate-400 pt-1">
        ⚡ Chọn đáp án ngay bằng 1 click — Đồng hồ 10 giây đang chạy!
      </div>
    </div>
  );
}
