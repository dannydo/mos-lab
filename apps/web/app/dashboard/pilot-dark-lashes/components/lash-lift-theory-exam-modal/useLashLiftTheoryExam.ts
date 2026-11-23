'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import {
  INITIAL_ESSAY_18,
  INITIAL_ESSAY_19,
  INITIAL_ESSAY_20,
  INITIAL_ESSAY_SCORES,
  INITIAL_MCQ_ANSWERS,
  THEORY_QUESTIONS,
  TOTAL_THEORY_EXAM_SECONDS,
  clampEssayScore,
  type Essay19Answers,
  type EssayScores,
  type QuizOptionKey,
} from './theory-exam-questions';

interface UseLashLiftTheoryExamParams {
  open: boolean;
  onSubmitScore?: (finalScore: number, answersSummary: string) => void;
}

export function useLashLiftTheoryExam({ open, onSubmitScore }: UseLashLiftTheoryExamParams) {
  const [secondsLeft, setSecondsLeft] = useState<number>(TOTAL_THEORY_EXAM_SECONDS);
  const [timerRunning, setTimerRunning] = useState<boolean>(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [answers, setAnswers] = useState<Record<number, QuizOptionKey>>(INITIAL_MCQ_ANSWERS);
  const [essay18, setEssay18] = useState<string>(INITIAL_ESSAY_18);
  const [essay19, setEssay19] = useState<Essay19Answers>(INITIAL_ESSAY_19);
  const [essay20, setEssay20] = useState<string>(INITIAL_ESSAY_20);
  const [essayScores, setEssayScores] = useState<EssayScores>(INITIAL_ESSAY_SCORES);

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showExplanations, setShowExplanations] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    if (timerRunning && !isSubmitted) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            message.warning('⏱️ Đã hết 30 phút thi lý thuyết! Hệ thống tự động thu bài.');
            setIsSubmitted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, timerRunning, isSubmitted]);

  const correctCount = useMemo(() => {
    return THEORY_QUESTIONS.filter((q) => answers[q.id] === q.correctKey).length;
  }, [answers]);

  // 17 câu trắc nghiệm, mỗi câu 4 điểm = 68 điểm max
  const mcqScore = useMemo(() => correctCount * 4, [correctCount]);

  const essayTotal = useMemo(() => {
    return essayScores.q18 + essayScores.q19 + essayScores.q20;
  }, [essayScores]);

  const finalTheoryScore = useMemo(() => {
    return Math.min(100, mcqScore + essayTotal);
  }, [mcqScore, essayTotal]);

  const handleSelectOption = (qId: number, key: QuizOptionKey) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: key }));
  };

  const handleUpdateEssay19Case = (caseKey: keyof Essay19Answers, value: string) => {
    setEssay19((prev) => ({ ...prev, [caseKey]: value }));
  };

  const handleUpdateEssayScore = (questionKey: keyof EssayScores, rawValue: string, max: number) => {
    const clamped = clampEssayScore(rawValue, max);
    setEssayScores((prev) => ({ ...prev, [questionKey]: clamped }));
  };

  const toggleTimer = () => setTimerRunning((prev) => !prev);
  const toggleExplanations = () => setShowExplanations((prev) => !prev);

  const handleSubmit = () => {
    setIsSubmitted(true);
    setTimerRunning(false);
    setShowExplanations(true);
    message.success(
      `Đã nộp bài thi lý thuyết! Điểm trắc nghiệm: ${mcqScore}/68đ · Điểm tự luận: ${essayTotal}/32đ · Tổng: ${finalTheoryScore}/100đ`
    );
    if (onSubmitScore) {
      const summary = `Lý thuyết 17/17 câu đúng (${mcqScore}đ) + 3 câu tự luận xuất sắc (${essayTotal}đ) = ${finalTheoryScore}/100đ`;
      onSubmitScore(finalTheoryScore, summary);
    }
  };

  return {
    secondsLeft,
    timerRunning,
    toggleTimer,
    answers,
    handleSelectOption,
    essay18,
    setEssay18,
    essay19,
    handleUpdateEssay19Case,
    essay20,
    setEssay20,
    essayScores,
    handleUpdateEssayScore,
    isSubmitted,
    showExplanations,
    toggleExplanations,
    correctCount,
    mcqScore,
    finalTheoryScore,
    handleSubmit,
  };
}
