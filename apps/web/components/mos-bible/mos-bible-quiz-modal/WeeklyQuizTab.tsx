'use client';

import React from 'react';
import { Radio, Button, Typography, Alert, Card } from 'antd';
import { CheckCircle2, XCircle, Sparkles, Zap, ChevronRight } from 'lucide-react';
import type { MosBibleQuizQuestion, MosBibleQuizSubmissionResult } from '@mos-lab/shared';
import { AppIcon, StatePanel, StatusTag } from '~/components/ui';
import type { QuizOptionKey } from './types';

const { Text } = Typography;

export interface WeeklyQuizTabProps {
  weeklyLoading: boolean;
  weeklyQuestions: MosBibleQuizQuestion[];
  currentWeeklyQuestion: MosBibleQuizQuestion | undefined;
  weeklyIndex: number;
  weeklySelectedKey: QuizOptionKey | null;
  weeklySubmitting: boolean;
  weeklyResult: MosBibleQuizSubmissionResult | null;
  weeklyEarnedPoints: number;
  onSelectKey: (key: QuizOptionKey) => void;
  onSubmit: () => void;
  onNext: () => void;
  onSwitchToSpeed: () => void;
}

export function WeeklyQuizTab({
  weeklyLoading,
  weeklyQuestions,
  currentWeeklyQuestion,
  weeklyIndex,
  weeklySelectedKey,
  weeklySubmitting,
  weeklyResult,
  weeklyEarnedPoints,
  onSelectKey,
  onSubmit,
  onNext,
  onSwitchToSpeed,
}: WeeklyQuizTabProps) {
  return (
    <div className="pt-2">
      {weeklyLoading ? (
        <StatePanel kind="loading" surface={false} minHeight={180} title="Đang tải câu hỏi tuần từ Kinh Thánh mOS..." />
      ) : !currentWeeklyQuestion ? (
        <div className="py-8 text-center space-y-3">
          <Text type="secondary">Hiện chưa có câu hỏi Mini-Quiz mới cho tuần này.</Text>
          <div>
            <Button
              type="primary"
              icon={<AppIcon icon={Zap} size="sm" />}
              onClick={onSwitchToSpeed}
              className="bg-amber-600 hover:bg-amber-500"
            >
              Chuyển sang Speed Quiz Săn Chuối 🍌
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-zinc-800">
            <span>
              Câu hỏi <strong className="text-amber-600 tabular-nums">{weeklyIndex + 1}</strong> /{' '}
              {weeklyQuestions.length}
            </span>
            <div className="flex items-center gap-1.5">
              <AppIcon icon={Sparkles} size="sm" className="text-amber-500" />
              <span>Điểm thưởng tích lũy: </span>
              <strong className="text-emerald-600 tabular-nums">+{weeklyEarnedPoints} pts</strong>
            </div>
          </div>

          <Card
            size="small"
            className="border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/40"
          >
            <div className="flex items-center gap-2 mb-2">
              <StatusTag status="success" label={currentWeeklyQuestion.commandmentId} className="text-xs" />
              <Text strong className="text-xs text-emerald-800 dark:text-emerald-300">
                {currentWeeklyQuestion.title}
              </Text>
            </div>
            <div className="text-sm font-medium leading-relaxed text-slate-800 dark:text-zinc-200">
              {currentWeeklyQuestion.scenario}
            </div>
          </Card>

          <div className="space-y-2 pt-1">
            <Radio.Group
              value={weeklySelectedKey}
              onChange={(e) => !weeklyResult && onSelectKey(e.target.value as QuizOptionKey)}
              className="w-full space-y-2"
            >
              {currentWeeklyQuestion.options.map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => !weeklyResult && onSelectKey(opt.key)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                    weeklySelectedKey === opt.key
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-600'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <Radio value={opt.key} className="mt-0.5" />
                  <div className="text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
                    <strong className="mr-1 text-slate-900 dark:text-zinc-100">{opt.key}.</strong>
                    {opt.text}
                  </div>
                </div>
              ))}
            </Radio.Group>
          </div>

          {weeklyResult && (
            <Alert
              type={weeklyResult.isCorrect ? 'success' : 'warning'}
              showIcon
              icon={
                weeklyResult.isCorrect ? (
                  <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-600" />
                ) : (
                  <AppIcon icon={XCircle} size="sm" className="text-amber-600" />
                )
              }
              message={
                <div className="text-xs font-semibold">
                  {weeklyResult.isCorrect
                    ? `Chính xác! (+${weeklyResult.earnedPoints} pts Minigame)`
                    : `Chưa chính xác (Đáp án đúng: ${weeklyResult.correctKey})`}
                </div>
              }
              description={
                <div className="text-xs leading-relaxed mt-1 text-slate-600 dark:text-zinc-400">
                  {weeklyResult.explanation}
                </div>
              }
              className="mt-2"
            />
          )}

          <div className="flex justify-end pt-2">
            {!weeklyResult ? (
              <Button
                type="primary"
                loading={weeklySubmitting}
                disabled={!weeklySelectedKey}
                onClick={onSubmit}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Nộp Câu Trả Lời
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={onNext}
                icon={<AppIcon icon={ChevronRight} size="sm" />}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {weeklyIndex < weeklyQuestions.length - 1 ? 'Câu Tiếp Theo' : 'Hoàn Tất Mini-Quiz'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
