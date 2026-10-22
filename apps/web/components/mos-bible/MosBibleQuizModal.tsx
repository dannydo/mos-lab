'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Radio, Button, Tag, Typography, Alert, Card, Spin, message, theme } from 'antd';
import { Award, CheckCircle2, XCircle, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import type { MosBibleQuizQuestion, MosBibleQuizSubmissionResult } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { AppIcon } from '../ui';

const { Text, Title } = Typography;

export interface MosBibleQuizModalProps {
  open: boolean;
  onClose: () => void;
}

export function MosBibleQuizModal({ open, onClose }: MosBibleQuizModalProps) {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<MosBibleQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MosBibleQuizSubmissionResult | null>(null);
  const [totalEarnedPoints, setTotalEarnedPoints] = useState(0);

  useEffect(() => {
    if (!open) return;
    const loadQuiz = async () => {
      setLoading(true);
      try {
        const res = await apiClient.bible.getWeeklyQuiz();
        if (res.success && Array.isArray(res.data)) {
          setQuestions(res.data);
          setCurrentIndex(0);
          setSelectedKey(null);
          setResult(null);
          setTotalEarnedPoints(0);
        }
      } catch {
        message.error('Không thể tải câu hỏi Mini-Quiz. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [open]);

  const currentQuestion = questions[currentIndex];

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !selectedKey) {
      message.warning('Vui lòng chọn một đáp án trước khi nộp.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.bible.submitQuizAnswer(currentQuestion.id, selectedKey);
      if (res.success && res.data) {
        setResult(res.data);
        if (res.data.isCorrect) {
          setTotalEarnedPoints((prev) => prev + res.data.earnedPoints);
        }
      }
    } catch {
      message.error('Lỗi khi nộp câu trả lời. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setSelectedKey(null);
    setResult(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      message.success(`Hoàn tất Mini-Quiz tuần! Bạn đã tích lũy tổng cộng +${totalEarnedPoints} điểm Minigame.`);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={640}
      title={
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600">
              <AppIcon icon={Award} size="sm" />
            </span>
            <span className="text-base font-semibold">Mini-Quiz Văn Hóa Tuần</span>
          </div>
          <Tag color="purple" className="m-0 font-medium">
            👑 Lead by Example · Core Team
          </Tag>
        </div>
      }
      footer={null}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <Spin size="large" />
          <Text type="secondary">Đang tải câu hỏi tuần từ Kinh Thánh mOS...</Text>
        </div>
      ) : !currentQuestion ? (
        <div className="py-8 text-center">
          <Text type="secondary">Hiện chưa có câu hỏi Mini-Quiz mới cho tuần này.</Text>
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          {/* Progress & Badge */}
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-zinc-800">
            <span>
              Câu hỏi <strong className="text-amber-600 tabular-nums">{currentIndex + 1}</strong> / {questions.length}
            </span>
            <div className="flex items-center gap-1.5">
              <AppIcon icon={Sparkles} size="sm" className="text-amber-500" />
              <span>Điểm thưởng tích lũy: </span>
              <strong className="text-emerald-600 tabular-nums">+{totalEarnedPoints} pts</strong>
            </div>
          </div>

          {/* Scenario Card */}
          <Card
            size="small"
            className="border-amber-200/50 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/40"
          >
            <div className="flex items-center gap-2 mb-2">
              <Tag color="gold" className="m-0 text-xs">
                {currentQuestion.commandmentId}
              </Tag>
              <Text strong className="text-xs text-amber-800 dark:text-amber-300">
                {currentQuestion.title}
              </Text>
            </div>
            <div className="text-sm font-medium leading-relaxed text-slate-800 dark:text-zinc-200">
              {currentQuestion.scenario}
            </div>
          </Card>

          {/* Options */}
          <div className="space-y-2 pt-1">
            <Radio.Group
              value={selectedKey}
              onChange={(e) => !result && setSelectedKey(e.target.value)}
              className="w-full space-y-2"
              disabled={Boolean(result)}
            >
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedKey === opt.key;
                const isCorrect = result && result.correctKey === opt.key;
                const isWrong = result && !result.isCorrect && selectedKey === opt.key;

                let borderStyle = 'border-slate-200 dark:border-zinc-800';
                let bgStyle = 'bg-white dark:bg-zinc-900';

                if (isCorrect) {
                  borderStyle = 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30';
                } else if (isWrong) {
                  borderStyle = 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30';
                } else if (isSelected) {
                  borderStyle = 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20';
                }

                return (
                  <label
                    key={opt.key}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${borderStyle} ${bgStyle}`}
                  >
                    <Radio value={opt.key} className="mt-0.5" />
                    <div className="flex-1 text-xs sm:text-sm leading-snug">
                      <strong className="mr-1 text-slate-700 dark:text-zinc-300">{opt.key}.</strong>
                      <span>{opt.text}</span>
                    </div>
                  </label>
                );
              })}
            </Radio.Group>
          </div>

          {/* Result & Explanation */}
          {result && (
            <Alert
              type={result.isCorrect ? 'success' : 'error'}
              showIcon
              icon={<AppIcon icon={result.isCorrect ? CheckCircle2 : XCircle} />}
              message={
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs sm:text-sm">
                    {result.isCorrect ? 'Chúc mừng bạn đã trả lời đúng!' : 'Chưa chính xác'}
                  </span>
                  <Tag color="cyan" className="m-0 text-[11px]">
                    Chìa Khóa: {result.culturalKey}
                  </Tag>
                </div>
              }
              description={
                <div className="mt-1 text-xs leading-relaxed space-y-1">
                  <div>{result.explanation}</div>
                  {result.isCorrect && (
                    <div className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                      +10 Điểm Thưởng Minigame đã được ghi nhận vào thành tích cá nhân!
                    </div>
                  )}
                </div>
              }
              className="text-xs"
            />
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end gap-2">
            {!result ? (
              <Button
                type="primary"
                loading={submitting}
                disabled={!selectedKey}
                onClick={handleSubmitAnswer}
                className="bg-amber-600 hover:bg-amber-500"
              >
                Nộp Câu Trả Lời
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleNextQuestion}
                icon={<AppIcon icon={ChevronRight} size="sm" />}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {currentIndex < questions.length - 1 ? 'Câu Tiếp Theo' : 'Hoàn Tất Mini-Quiz'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
export default MosBibleQuizModal;
