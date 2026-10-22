'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  Radio,
  Button,
  Tag,
  Typography,
  Alert,
  Card,
  Spin,
  message,
  theme,
  Progress,
  Tabs,
  Popconfirm,
} from 'antd';
import {
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  Clock,
  Flame,
  ChevronRight,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import type {
  MosBibleQuizQuestion,
  MosBibleQuizSubmissionResult,
  MosBibleSpeedQuizProfile,
  MosBibleSpeedQuizAnswerItem,
  MosBibleSpeedQuizResult,
} from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { AppIcon } from '../ui';

const { Text, Title } = Typography;

export interface MosBibleQuizModalProps {
  open: boolean;
  onClose: () => void;
}

const QUESTION_TIME_LIMIT_SEC = 10;

export function MosBibleQuizModal({ open, onClose }: MosBibleQuizModalProps) {
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState<'WEEKLY' | 'SPEED'>('SPEED');

  // Banana profile state
  const [profile, setProfile] = useState<MosBibleSpeedQuizProfile>({
    staffId: 1,
    date: '',
    attemptsToday: 0,
    maxAttemptsPerDay: 3,
    purchasedAttemptsToday: 0,
    maxPurchasedAttemptsPerDay: 3,
    purchasedRunsAvailable: 0,
    bananasToday: 0,
    maxBananasPerDay: 6,
    totalBananas: 0,
    canPlayToday: true,
    canPurchaseAttempt: false,
    streakBest: 0,
  });
  const [buyingAttempt, setBuyingAttempt] = useState(false);

  // --- WEEKLY QUIZ STATE ---
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyQuestions, setWeeklyQuestions] = useState<MosBibleQuizQuestion[]>([]);
  const [weeklyIndex, setWeeklyIndex] = useState(0);
  const [weeklySelectedKey, setWeeklySelectedKey] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [weeklySubmitting, setWeeklySubmitting] = useState(false);
  const [weeklyResult, setWeeklyResult] = useState<MosBibleQuizSubmissionResult | null>(null);
  const [weeklyEarnedPoints, setWeeklyEarnedPoints] = useState(0);

  // --- SPEED QUIZ STATE ---
  const [speedState, setSpeedState] = useState<'IDLE' | 'PLAYING' | 'RESULT'>('IDLE');
  const [speedLoading, setSpeedLoading] = useState(false);
  const [speedQuestions, setSpeedQuestions] = useState<MosBibleQuizQuestion[]>([]);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedTimeLeft, setSpeedTimeLeft] = useState(QUESTION_TIME_LIMIT_SEC);
  const [speedStreak, setSpeedStreak] = useState(0);
  const [speedAnswers, setSpeedAnswers] = useState<MosBibleSpeedQuizAnswerItem[]>([]);
  const [speedSubmitting, setSpeedSubmitting] = useState(false);
  const [speedRunResult, setSpeedRunResult] = useState<MosBibleSpeedQuizResult | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial data
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
      if (timerRef.current) clearInterval(timerRef.current);
      setSpeedState('IDLE');
      return;
    }
    loadProfile();
    loadWeeklyQuiz();
  }, [open, loadProfile, loadWeeklyQuiz]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- SPEED QUIZ SUDDEN DEATH & TIMER LOGIC ---
  const finishSpeedRun = useCallback(async (finalAnswers: MosBibleSpeedQuizAnswerItem[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
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
  }, []);

  const handleTimeout = useCallback(() => {
    // Current question timed out -> record as timed out and terminate run (Sudden Death)
    if (speedState !== 'PLAYING') return;
    const currentQ = speedQuestions[speedIndex];
    if (!currentQ) return;

    const finalAnswerItem: MosBibleSpeedQuizAnswerItem = {
      questionId: currentQ.id,
      selectedKey: 'A', // placeholder
      durationMs: 12000, // timed out marker
    };
    const updatedAnswers = [...speedAnswers, finalAnswerItem];
    setSpeedAnswers(updatedAnswers);
    finishSpeedRun(updatedAnswers);
  }, [speedState, speedQuestions, speedIndex, speedAnswers, finishSpeedRun]);

  // Timer interval effect
  useEffect(() => {
    if (speedState !== 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSpeedTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [speedState, speedIndex, handleTimeout]);

  // Buy attempt with 1 Banana
  const handleBuyAttempt = async () => {
    setBuyingAttempt(true);
    try {
      const res = await apiClient.bible.buySpeedQuizAttempt();
      if (res.success && res.data) {
        setProfile(res.data);
        message.success('Đã dùng 1 🍌 mua lượt chơi thành công! Đang vào trận...');
        // Auto start the quiz right after purchase!
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
            message.error('Không thể bốc câu hỏi Speed Quiz. Vui lòng bấm chơi lại.');
          }
        } catch {
          message.error('Lỗi khi khởi động câu hỏi sau khi mua lượt.');
        } finally {
          setSpeedLoading(false);
        }
      } else {
        message.error(res.message || 'Không thể mua lượt chơi.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || 'Lỗi khi dùng Chuối mua lượt chơi.');
    } finally {
      setBuyingAttempt(false);
    }
  };

  // Start Speed Quiz
  const handleStartSpeedQuiz = async () => {
    if (!profile.canPlayToday) {
      message.warning('Bạn đã hoàn thành tối đa 3 lượt miễn phí hôm nay. Hãy dùng 1 🍌 để mua thêm lượt nhé!');
      return;
    }

    setSpeedLoading(true);
    try {
      const res = await apiClient.bible.getSpeedQuizQuestions();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setSpeedQuestions(res.data);
        setSpeedIndex(0);
        setSpeedStreak(0);
        setSpeedAnswers([]);
        setSpeedTimeLeft(QUESTION_TIME_LIMIT_SEC);
        setQuestionStartTime(Date.now());
        setSpeedState('PLAYING');
      } else {
        message.error('Không thể bốc câu hỏi Speed Quiz. Vui lòng thử lại.');
      }
    } catch {
      message.error('Lỗi khi khởi động Speed Quiz.');
    } finally {
      setSpeedLoading(false);
    }
  };

  // Speed Quiz: Click option immediately (Fast Reflex)
  const handleSelectSpeedOption = (selectedKey: 'A' | 'B' | 'C' | 'D') => {
    if (speedState !== 'PLAYING' || speedSubmitting) return;
    if (timerRef.current) clearInterval(timerRef.current);

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

    // Note: Actual correct check is verified server-side, but client also advances
    if (speedIndex < speedQuestions.length - 1) {
      setSpeedIndex((prev) => prev + 1);
      setSpeedStreak((prev) => prev + 1);
      setSpeedTimeLeft(QUESTION_TIME_LIMIT_SEC);
      setQuestionStartTime(Date.now());
    } else {
      // Completed all 10 questions!
      setSpeedStreak((prev) => prev + 1);
      finishSpeedRun(updatedAnswers);
    }
  };

  // Weekly Quiz handlers
  const handleWeeklySubmit = async () => {
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
  };

  const handleWeeklyNext = () => {
    setWeeklySelectedKey(null);
    setWeeklyResult(null);
    if (weeklyIndex < weeklyQuestions.length - 1) {
      setWeeklyIndex((prev) => prev + 1);
    } else {
      message.success(`Hoàn tất Mini-Quiz tuần! Bạn đã nhận tổng cộng +${weeklyEarnedPoints} điểm.`);
      setActiveTab('SPEED');
    }
  };

  const currentWeeklyQuestion = weeklyQuestions[weeklyIndex];
  const currentSpeedQuestion = speedQuestions[speedIndex];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={680}
      title={
        <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
              <AppIcon icon={Zap} size="sm" />
            </span>
            <span className="text-base font-semibold">Đấu Trường Kinh Thánh mOS</span>
          </div>

          {/* Banana Vault Pill Badge */}
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-full px-3 py-1">
            <span className="text-base leading-none">🍌</span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">
              {profile.totalBananas} Chuối
            </span>
            <span className="text-[11px] text-slate-400">|</span>
            <span className="text-[11px] text-slate-600 dark:text-zinc-400 tabular-nums">
              Hôm nay: <strong className="text-amber-600">{profile.bananasToday}/6</strong> · Free:{' '}
              <strong className="text-emerald-600">{profile.attemptsToday}/3</strong>
              {profile.purchasedAttemptsToday > 0 && (
                <>
                  {' '}
                  · Mua: <strong className="text-indigo-600">{profile.purchasedAttemptsToday}/3</strong>
                </>
              )}
            </span>
          </div>
        </div>
      }
      footer={null}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => {
          if (speedState === 'PLAYING') {
            if (timerRef.current) clearInterval(timerRef.current);
            setSpeedState('IDLE');
          }
          setActiveTab(k as 'WEEKLY' | 'SPEED');
        }}
        items={[
          {
            key: 'SPEED',
            label: (
              <span className="flex items-center gap-1.5 font-medium">
                <AppIcon icon={Zap} size="sm" className="text-amber-500" />⚡ Speed Quiz Săn Chuối (10s/câu)
              </span>
            ),
          },
          {
            key: 'WEEKLY',
            label: (
              <span className="flex items-center gap-1.5 font-medium">
                <AppIcon icon={Award} size="sm" className="text-emerald-500" />
                Mini-Quiz Tuần
              </span>
            ),
          },
        ]}
      />

      {/* ================= TAB 1: SPEED QUIZ SĂN CHUỐI ================= */}
      {activeTab === 'SPEED' && (
        <div className="pt-2">
          {speedState === 'IDLE' && (
            <div className="space-y-4 py-2">
              <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 dark:from-amber-950/20 dark:via-zinc-900 dark:to-orange-950/10 dark:border-amber-900/40">
                <div className="flex items-start gap-3">
                  <div className="text-3xl p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">🍌</div>
                  <div className="space-y-1">
                    <Title level={5} className="!m-0 text-amber-800 dark:text-amber-300">
                      Săn Chuối Thần Tốc: 10s Mỗi Câu
                    </Title>
                    <Text className="text-xs text-slate-600 dark:text-zinc-400">
                      Rèn luyện phản xạ chớp nhoáng theo Kinh Thánh mOS và 4 Chìa Khóa Văn Hóa Wings (*Vui Vẻ – Ân Cần –
                      Chân Thành – Khoa Học*).
                    </Text>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-slate-100 dark:border-zinc-700">
                    <div className="font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1 mb-1">
                      <AppIcon icon={Clock} size="sm" className="text-blue-500" />
                      10 Giây Mỗi Câu
                    </div>
                    <Text type="secondary" className="text-[11px]">
                      Áp lực thời gian thực tế, đòi hỏi phản xạ tự nhiên.
                    </Text>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-slate-100 dark:border-zinc-700">
                    <div className="font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1 mb-1">
                      <span className="text-sm">💥</span>
                      Luật Sudden Death
                    </div>
                    <Text type="secondary" className="text-[11px]">
                      Sai 1 câu hoặc hết giờ là dừng ngay lượt chơi!
                    </Text>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-slate-100 dark:border-zinc-700">
                    <div className="font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1 mb-1">
                      <span className="text-sm">🍌</span>
                      Thưởng Chuối
                    </div>
                    <Text type="secondary" className="text-[11px]">
                      Đúng 3 câu = <strong>1 🍌</strong>; Đúng 5 câu = <strong>2 🍌</strong>.
                    </Text>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <AppIcon icon={Flame} size="sm" className="text-orange-500" />
                    Kỷ lục chuỗi đúng của bạn:{' '}
                    <strong className="text-orange-600 tabular-nums">{profile.streakBest} câu</strong>
                  </span>
                  <span>
                    Lượt free còn lại:{' '}
                    <strong className="text-emerald-600 tabular-nums">
                      {Math.max(0, 3 - profile.attemptsToday)}/3
                    </strong>
                    {profile.attemptsToday >= 3 && (
                      <span className="ml-2 text-indigo-600 font-semibold tabular-nums">
                        (Đã mua: {profile.purchasedAttemptsToday}/3)
                      </span>
                    )}
                  </span>
                </div>
              </Card>

              <div className="text-center pt-2">
                {profile.canPlayToday ? (
                  <Button
                    type="primary"
                    size="large"
                    icon={<AppIcon icon={Zap} size="sm" />}
                    loading={speedLoading}
                    onClick={handleStartSpeedQuiz}
                    className="bg-amber-600 hover:bg-amber-500 font-semibold px-8 h-11 shadow-md shadow-amber-600/20"
                  >
                    {profile.purchasedRunsAvailable > 0
                      ? 'Vào Trận Lượt Mua Thêm 🍌 (10s/Câu)'
                      : 'Bắt Đầu Săn Chuối 🍌 (10s/Câu)'}
                  </Button>
                ) : profile.attemptsToday >= 3 && profile.purchasedAttemptsToday < 3 ? (
                  profile.totalBananas >= 1 ? (
                    <Popconfirm
                      title="Dùng 1 🍌 mua thêm 1 lượt chơi?"
                      description={`Hôm nay bạn còn ${3 - profile.purchasedAttemptsToday}/3 lượt mua. Trả lời đúng từ 3 câu hoàn vốn 1 🍌, đúng 5 câu lãi 2 🍌!`}
                      okText="Đồng ý mua 🍌"
                      cancelText="Hủy"
                      okButtonProps={{ className: 'bg-amber-600 hover:bg-amber-500' }}
                      onConfirm={handleBuyAttempt}
                    >
                      <Button
                        type="primary"
                        size="large"
                        icon={<span className="text-base mr-1">🍌</span>}
                        loading={buyingAttempt}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 font-semibold px-8 h-11 shadow-md shadow-orange-600/20"
                      >
                        Dùng 1 🍌 Mua Thêm Lượt ({profile.purchasedAttemptsToday}/3)
                      </Button>
                    </Popconfirm>
                  ) : (
                    <div>
                      <Button
                        disabled
                        size="large"
                        icon={<span className="text-base mr-1">🍌</span>}
                        className="h-11 px-8 font-semibold"
                      >
                        Dùng 1 🍌 Mua Thêm Lượt ({profile.purchasedAttemptsToday}/3)
                      </Button>
                      <div className="text-xs text-rose-500 dark:text-rose-400 mt-2 font-medium">
                        Ví của bạn đang có 0 🍌. Cần tối thiểu 1 Chuối để mua thêm lượt chơi!
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    <Button disabled size="large" className="h-11 px-8 font-semibold">
                      Đã Hoàn Tất Cả 6 Lượt Chơi Hôm Nay
                    </Button>
                    <div className="text-xs text-slate-400 mt-2">
                      Đã dùng hết 3 lượt miễn phí và 3 lượt mua hôm nay. Lượt chơi sẽ làm mới vào 00:00 ngày mai!
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {speedState === 'PLAYING' && currentSpeedQuestion && (
            <div className="space-y-4">
              {/* Progress & Live Countdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Tag color="orange" className="m-0 font-bold tabular-nums">
                      Câu {speedIndex + 1} / {speedQuestions.length}
                    </Tag>
                    <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-300">
                      <AppIcon icon={Flame} size="sm" className="text-orange-500" />
                      Chuỗi hiện tại: <strong className="text-orange-600 tabular-nums">{speedStreak}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">
                      {speedStreak < 3 ? (
                        <>
                          Mục tiêu 1: Cần <strong>{3 - speedStreak} câu</strong> $\rightarrow$ 1 🍌
                        </>
                      ) : speedStreak < 5 ? (
                        <>
                          Mục tiêu 2: Cần <strong>{5 - speedStreak} câu</strong> $\rightarrow$ 2 🍌
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
                  strokeColor={speedTimeLeft > 5 ? '#10b981' : speedTimeLeft > 2 ? '#f59e0b' : '#ef4444'}
                  size="small"
                  className="m-0"
                />
              </div>

              {/* Question Scenario */}
              <Card
                size="small"
                className="border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/40"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Tag color="gold" className="m-0 text-xs font-semibold">
                    {currentSpeedQuestion.commandmentId}
                  </Tag>
                  <Text strong className="text-xs text-amber-800 dark:text-amber-300">
                    {currentSpeedQuestion.title}
                  </Text>
                </div>
                <div className="text-sm font-medium leading-relaxed text-slate-800 dark:text-zinc-200">
                  {currentSpeedQuestion.scenario}
                </div>
              </Card>

              {/* Fast-Click Options */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                {currentSpeedQuestion.options.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelectSpeedOption(opt.key)}
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
          )}

          {speedState === 'RESULT' && speedRunResult && (
            <div className="py-4 space-y-4 text-center">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-50 to-orange-50/30 dark:from-amber-950/30 dark:to-zinc-900 border border-amber-200 dark:border-amber-800/60 space-y-3">
                <div className="text-5xl">{speedRunResult.bananasEarned > 0 ? '🍌🎉' : '⏱️💥'}</div>

                <Title level={4} className="!m-0 text-slate-800 dark:text-zinc-100">
                  {speedRunResult.bananasEarned === 2
                    ? 'Đỉnh Cao Tuyệt Đối! Đúng Liên Tục 5/5 Câu!'
                    : speedRunResult.bananasEarned === 1
                      ? 'Xuất Sắc! Hoàn Thành Mục Tiêu 3+ Câu!'
                      : 'Lượt Chơi Kết Thúc (Sudden Death)'}
                </Title>

                <div className="text-sm text-slate-600 dark:text-zinc-300 max-w-md mx-auto">
                  {speedRunResult.message}
                </div>

                <div className="flex justify-center items-center gap-6 pt-3 text-xs">
                  <div>
                    <div className="text-slate-400">Chuỗi đúng đạt được</div>
                    <div className="text-2xl font-bold text-orange-600 tabular-nums">
                      {speedRunResult.streak} <span className="text-sm font-normal">câu</span>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200 dark:bg-zinc-700" />

                  <div>
                    <div className="text-slate-400">Chuối nhận được</div>
                    <div className="text-2xl font-bold text-amber-600 tabular-nums">
                      +{speedRunResult.bananasEarned} 🍌
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200 dark:bg-zinc-700" />

                  <div>
                    <div className="text-slate-400">Tổng Chuối trong Ví</div>
                    <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                      {speedRunResult.profile.totalBananas} 🍌
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {profile.canPlayToday ? (
                  <Button
                    type="primary"
                    icon={<AppIcon icon={RotateCcw} size="sm" />}
                    onClick={handleStartSpeedQuiz}
                    className="bg-amber-600 hover:bg-amber-500 font-semibold h-10 px-6"
                  >
                    {profile.attemptsToday < 3
                      ? `Chơi Lượt Free Tiếp Theo (${3 - profile.attemptsToday}/3)`
                      : 'Vào Trận Lượt Mua Tiếp Theo 🍌'}
                  </Button>
                ) : profile.attemptsToday >= 3 && profile.purchasedAttemptsToday < 3 && profile.totalBananas >= 1 ? (
                  <Popconfirm
                    title="Dùng 1 🍌 mua thêm 1 lượt chơi?"
                    description={`Hôm nay bạn còn ${3 - profile.purchasedAttemptsToday}/3 lượt mua. Trả lời đúng từ 3 câu hoàn vốn 1 🍌, đúng 5 câu lãi 2 🍌!`}
                    okText="Đồng ý mua 🍌"
                    cancelText="Hủy"
                    okButtonProps={{ className: 'bg-amber-600 hover:bg-amber-500' }}
                    onConfirm={handleBuyAttempt}
                  >
                    <Button
                      type="primary"
                      loading={buyingAttempt}
                      className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 font-semibold h-10 px-6"
                    >
                      Dùng 1 🍌 Mua Lượt ({profile.purchasedAttemptsToday}/3)
                    </Button>
                  </Popconfirm>
                ) : (
                  <Button disabled className="h-10 px-6">
                    {profile.purchasedAttemptsToday >= 3 ? 'Đã Hết Toàn Bộ Lượt Hôm Nay' : 'Đã Hoàn Tất 3/3 Lượt Free'}
                  </Button>
                )}
                <Button onClick={onClose} className="h-10 px-6">
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: MINI-QUIZ TUẦN ================= */}
      {activeTab === 'WEEKLY' && (
        <div className="pt-2">
          {weeklyLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Spin size="large" />
              <Text type="secondary">Đang tải câu hỏi tuần từ Kinh Thánh mOS...</Text>
            </div>
          ) : !currentWeeklyQuestion ? (
            <div className="py-8 text-center space-y-3">
              <Text type="secondary">Hiện chưa có câu hỏi Mini-Quiz mới cho tuần này.</Text>
              <div>
                <Button
                  type="primary"
                  icon={<AppIcon icon={Zap} size="sm" />}
                  onClick={() => setActiveTab('SPEED')}
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
                  <Tag color="green" className="m-0 text-xs">
                    {currentWeeklyQuestion.commandmentId}
                  </Tag>
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
                  onChange={(e) => !weeklyResult && setWeeklySelectedKey(e.target.value)}
                  className="w-full space-y-2"
                >
                  {currentWeeklyQuestion.options.map((opt) => (
                    <div
                      key={opt.key}
                      onClick={() => !weeklyResult && setWeeklySelectedKey(opt.key)}
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
                    onClick={handleWeeklySubmit}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    Nộp Câu Trả Lời
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    onClick={handleWeeklyNext}
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
      )}
    </Modal>
  );
}

export default MosBibleQuizModal;
