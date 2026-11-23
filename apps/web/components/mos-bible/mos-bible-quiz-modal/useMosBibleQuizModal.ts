'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import type {
  MosBibleQuizQuestion,
  MosBibleQuizSubmissionResult,
  MosBibleSpeedQuizProfile,
  MosBibleSpeedQuizAnswerItem,
  MosBibleSpeedQuizResult,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { DEFAULT_SPEED_QUIZ_PROFILE, QUESTION_TIME_LIMIT_SEC, TIMEOUT_DURATION_MS } from './constants';
import type { QuizOptionKey, QuizTabKey, SpeedQuizState } from './types';

export function useMosBibleQuizModal(open: boolean) {
  const [activeTab, setActiveTab] = useState<QuizTabKey>('SPEED');

  // Banana profile state
  const [profile, setProfile] = useState<MosBibleSpeedQuizProfile>(DEFAULT_SPEED_QUIZ_PROFILE);
  const [buyingAttempt, setBuyingAttempt] = useState(false);

  // Weekly quiz state
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyQuestions, setWeeklyQuestions] = useState<MosBibleQuizQuestion[]>([]);
  const [weeklyIndex, setWeeklyIndex] = useState(0);
  const [weeklySelectedKey, setWeeklySelectedKey] = useState<QuizOptionKey | null>(null);
  const [weeklySubmitting, setWeeklySubmitting] = useState(false);
  const [weeklyResult, setWeeklyResult] = useState<MosBibleQuizSubmissionResult | null>(null);
  const [weeklyEarnedPoints, setWeeklyEarnedPoints] = useState(0);

  // Speed quiz state
  const [speedState, setSpeedState] = useState<SpeedQuizState>('IDLE');
  const [speedLoading, setSpeedLoading] = useState(false);
  const [speedQuestions, setSpeedQuestions] = useState<MosBibleQuizQuestion[]>([]);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedTimeLeft, setSpeedTimeLeft] = useState(QUESTION_TIME_LIMIT_SEC);
  const [speedStreak, setSpeedStreak] = useState(0);
  const [speedAnswers, setSpeedAnswers] = useState<MosBibleSpeedQuizAnswerItem[]>([]);
  const [speedSubmitting, setSpeedSubmitting] = useState(false);
  const [speedRunResult, setSpeedRunResult] = useState<MosBibleSpeedQuizResult | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await apiClient.bible.getSpeedQuizProfile();
      if (res.success && res.data) {
        setProfile(res.data);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const loadWeeklyQuiz = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const res = await apiClient.bible.getWeeklyQuiz();
      if (res.success && Array.isArray(res.data)) {
        setWeeklyQuestions(res.data);
        setWeeklyIndex(0);
        setWeeklySelectedKey(null);
        setWeeklyResult(null);
        setWeeklyEarnedPoints(0);
      }
    } catch {
      message.error('Không thể tải câu hỏi Mini-Quiz. Vui lòng thử lại.');
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      clearTimer();
      setSpeedState('IDLE');
      return;
    }
    loadProfile();
    loadWeeklyQuiz();
  }, [open, clearTimer, loadProfile, loadWeeklyQuiz]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const finishSpeedRun = useCallback(
    async (finalAnswers: MosBibleSpeedQuizAnswerItem[]) => {
      clearTimer();
      setSpeedSubmitting(true);
      try {
        const res = await apiClient.bible.submitSpeedQuizRun({ answers: finalAnswers });
        if (res.success && res.data) {
          setSpeedRunResult(res.data);
          setProfile(res.data.profile);
          setSpeedState('RESULT');
          if (res.data.bananasEarned > 0) {
            message.success(`Chúc mừng! Bạn đã nhận được +${res.data.bananasEarned} Chuối 🍌!`);
          }
        }
      } catch {
        message.error('Lỗi khi nộp kết quả Speed Quiz.');
        setSpeedState('IDLE');
      } finally {
        setSpeedSubmitting(false);
      }
    },
    [clearTimer]
  );

  const handleTimeout = useCallback(() => {
    // Current question timed out -> record as timed out and terminate run (Sudden Death)
    if (speedState !== 'PLAYING') return;
    const currentQ = speedQuestions[speedIndex];
    if (!currentQ) return;

    const finalAnswerItem: MosBibleSpeedQuizAnswerItem = {
      questionId: currentQ.id,
      selectedKey: 'A',
      durationMs: TIMEOUT_DURATION_MS,
    };
    const updatedAnswers = [...speedAnswers, finalAnswerItem];
    setSpeedAnswers(updatedAnswers);
    finishSpeedRun(updatedAnswers);
  }, [speedState, speedQuestions, speedIndex, speedAnswers, finishSpeedRun]);

  useEffect(() => {
    if (speedState !== 'PLAYING') {
      clearTimer();
      return;
    }

    timerRef.current = setInterval(() => {
      setSpeedTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimer();
    };
  }, [speedState, speedIndex, clearTimer, handleTimeout]);

  const launchSpeedQuestionsRound = useCallback(async (emptyMessage: string, errorMessage: string) => {
    setSpeedLoading(true);
    try {
      const qRes = await apiClient.bible.getSpeedQuizQuestions();
      if (qRes.success && Array.isArray(qRes.data) && qRes.data.length > 0) {
        setSpeedQuestions(qRes.data);
        setSpeedIndex(0);
        setSpeedStreak(0);
        setSpeedAnswers([]);
        setSpeedTimeLeft(QUESTION_TIME_LIMIT_SEC);
        setQuestionStartTime(Date.now());
        setSpeedState('PLAYING');
      } else {
        message.error(emptyMessage);
      }
    } catch {
      message.error(errorMessage);
    } finally {
      setSpeedLoading(false);
    }
  }, []);

  const handleBuyAttempt = useCallback(async () => {
    setBuyingAttempt(true);
    try {
      const res = await apiClient.bible.buySpeedQuizAttempt();
      if (res.success && res.data) {
        setProfile(res.data);
        message.success('Đã dùng 1 🍌 mua lượt chơi thành công! Đang vào trận...');
        await launchSpeedQuestionsRound(
          'Không thể bốc câu hỏi Speed Quiz. Vui lòng bấm chơi lại.',
          'Lỗi khi khởi động câu hỏi sau khi mua lượt.'
        );
      } else {
        message.error(res.message || 'Không thể mua lượt chơi.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Lỗi khi dùng Chuối mua lượt chơi.');
    } finally {
      setBuyingAttempt(false);
    }
  }, [launchSpeedQuestionsRound]);

  const handleStartSpeedQuiz = useCallback(async () => {
    if (!profile.canPlayToday) {
      message.warning('Bạn đã hoàn thành tối đa 3 lượt miễn phí hôm nay. Hãy dùng 1 🍌 để mua thêm lượt nhé!');
      return;
    }

    await launchSpeedQuestionsRound(
      'Không thể bốc câu hỏi Speed Quiz. Vui lòng thử lại.',
      'Lỗi khi khởi động Speed Quiz.'
    );
  }, [profile.canPlayToday, launchSpeedQuestionsRound]);

  const handleSelectSpeedOption = useCallback(
    (selectedKey: QuizOptionKey) => {
      if (speedState !== 'PLAYING' || speedSubmitting) return;
      clearTimer();

      const currentQ = speedQuestions[speedIndex];
      if (!currentQ) return;

      const durationMs = Date.now() - questionStartTime;
      const answerItem: MosBibleSpeedQuizAnswerItem = {
        questionId: currentQ.id,
        selectedKey,
        durationMs,
      };
      const updatedAnswers = [...speedAnswers, answerItem];
      setSpeedAnswers(updatedAnswers);

      // Server verifies actual correctness, while client advances optimistically
      if (speedIndex < speedQuestions.length - 1) {
        setSpeedIndex((prev) => prev + 1);
        setSpeedStreak((prev) => prev + 1);
        setSpeedTimeLeft(QUESTION_TIME_LIMIT_SEC);
        setQuestionStartTime(Date.now());
      } else {
        setSpeedStreak((prev) => prev + 1);
        finishSpeedRun(updatedAnswers);
      }
    },
    [
      speedState,
      speedSubmitting,
      clearTimer,
      speedQuestions,
      speedIndex,
      questionStartTime,
      speedAnswers,
      finishSpeedRun,
    ]
  );

  const handleWeeklySubmit = useCallback(async () => {
    const currentQ = weeklyQuestions[weeklyIndex];
    if (!currentQ || !weeklySelectedKey) {
      message.warning('Vui lòng chọn một đáp án.');
      return;
    }
    setWeeklySubmitting(true);
    try {
      const res = await apiClient.bible.submitQuizAnswer(currentQ.id, weeklySelectedKey);
      if (res.success && res.data) {
        setWeeklyResult(res.data);
        if (res.data.isCorrect) {
          setWeeklyEarnedPoints((prev) => prev + res.data.earnedPoints);
        }
      }
    } catch {
      message.error('Lỗi khi nộp câu trả lời.');
    } finally {
      setWeeklySubmitting(false);
    }
  }, [weeklyQuestions, weeklyIndex, weeklySelectedKey]);

  const handleWeeklyNext = useCallback(() => {
    setWeeklySelectedKey(null);
    setWeeklyResult(null);
    if (weeklyIndex < weeklyQuestions.length - 1) {
      setWeeklyIndex((prev) => prev + 1);
    } else {
      message.success(`Hoàn tất Mini-Quiz tuần! Bạn đã nhận tổng cộng +${weeklyEarnedPoints} điểm.`);
      setActiveTab('SPEED');
    }
  }, [weeklyIndex, weeklyQuestions.length, weeklyEarnedPoints]);

  const handleTabChange = useCallback(
    (tabKey: string) => {
      if (speedState === 'PLAYING') {
        clearTimer();
        setSpeedState('IDLE');
      }
      setActiveTab(tabKey as QuizTabKey);
    },
    [speedState, clearTimer]
  );

  const switchToSpeedTab = useCallback(() => {
    setActiveTab('SPEED');
  }, []);

  return {
    activeTab,
    profile,
    buyingAttempt,
    weeklyLoading,
    weeklyQuestions,
    weeklyIndex,
    weeklySelectedKey,
    weeklySubmitting,
    weeklyResult,
    weeklyEarnedPoints,
    currentWeeklyQuestion: weeklyQuestions[weeklyIndex],
    speedState,
    speedLoading,
    speedQuestions,
    speedIndex,
    speedTimeLeft,
    speedStreak,
    speedSubmitting,
    speedRunResult,
    currentSpeedQuestion: speedQuestions[speedIndex],
    setWeeklySelectedKey,
    handleTabChange,
    switchToSpeedTab,
    handleBuyAttempt,
    handleStartSpeedQuiz,
    handleSelectSpeedOption,
    handleWeeklySubmit,
    handleWeeklyNext,
  };
}
