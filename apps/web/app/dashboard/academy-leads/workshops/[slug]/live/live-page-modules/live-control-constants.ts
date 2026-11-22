import {
  getAcademyWorkshopQuizProgress,
  type AcademyWorkshopAgendaStatus,
  type AcademyWorkshopLiveState,
  type UpsertAcademyWorkshopQuestionRequest,
} from '@mos-lab/shared';
import { isWorkshopQuestionExpired, workshopRemainingMs } from '~/lib/academy-workshop-live';

export type AgendaCommandAction = 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'SKIP';

export interface LiveControlTimers {
  questionRemaining: number;
  agendaRemaining: number;
  questionDuration: number;
  questionProgress: number;
  questionExpired: boolean;
  quizProgress: ReturnType<typeof getAcademyWorkshopQuizProgress>;
}

export function cleanAgendaTitle(title: string): string {
  return String(title || '')
    .replace(/^\d+[\.\)]\s*/, '')
    .trim();
}

export const AGENDA_STATUS_LABELS: Record<AcademyWorkshopAgendaStatus, string> = {
  PENDING: 'Chưa bắt đầu',
  RUNNING: 'Đang chạy',
  PAUSED: 'Đang tạm dừng',
  COMPLETED: 'Đã hoàn thành',
  SKIPPED: 'Đã bỏ qua',
};

export const SAMPLE_QUIZ_QUESTIONS = [
  {
    type: 'SINGLE_CHOICE',
    prompt: 'Điều quan trọng nhất để giữ fan mi đẹp là gì?',
    durationSeconds: 20,
    sortOrder: 1,
    rewardRule: 'FASTEST_N',
    fastestCount: 1,
    rewardLabel: 'Quà trả lời nhanh nhất',
    rewardQuantity: 1,
    options: [
      { label: 'Tách mi chuẩn', isCorrect: true },
      { label: 'Dùng thật nhiều keo', isCorrect: false },
      { label: 'Nối càng nhanh càng tốt', isCorrect: false },
      { label: 'Bỏ qua vệ sinh mi', isCorrect: false },
    ],
  },
  {
    type: 'TRUE_FALSE',
    prompt: 'Tốc độ tốt luôn phải đi cùng độ chính xác.',
    durationSeconds: 15,
    sortOrder: 2,
    rewardRule: 'ALL_CORRECT',
    rewardLabel: 'Sticker Academy',
    rewardQuantity: 1,
    options: [
      { label: 'Đúng', isCorrect: true },
      { label: 'Sai', isCorrect: false },
    ],
  },
  {
    type: 'SINGLE_CHOICE',
    prompt: 'Một workshop tốt kết thúc bằng điều gì?',
    durationSeconds: 20,
    sortOrder: 3,
    rewardRule: 'NONE',
    options: [
      { label: 'Một lộ trình hành động rõ ràng', isCorrect: true },
      { label: 'Thêm thật nhiều lý thuyết', isCorrect: false },
      { label: 'Không cần follow-up', isCorrect: false },
    ],
  },
] satisfies UpsertAcademyWorkshopQuestionRequest[];

export function computeLiveControlTimers(state: AcademyWorkshopLiveState, receivedAt: number): LiveControlTimers {
  const questionRemaining = state.activeQuiz?.questionClosesAt
    ? Math.ceil(workshopRemainingMs(state.activeQuiz.questionClosesAt, state.serverNow, receivedAt) / 1000)
    : 0;
  const agendaRemaining = state.activeAgendaItem
    ? state.activeAgendaItem.remainingSeconds -
      (state.activeAgendaItem.status === 'RUNNING' ? Math.floor((Date.now() - receivedAt) / 1000) : 0)
    : 0;
  const questionDuration = state.activeQuestion?.durationSeconds || 1;
  const questionProgress = Math.max(0, Math.min(100, (questionRemaining / questionDuration) * 100));
  const questionExpired = isWorkshopQuestionExpired(state.activeQuiz?.status, questionRemaining);
  const quizProgress = getAcademyWorkshopQuizProgress(
    state.activeQuiz?.questions || [],
    state.activeQuiz?.activeQuestionId ?? null
  );

  return {
    questionRemaining,
    agendaRemaining,
    questionDuration,
    questionProgress,
    questionExpired,
    quizProgress,
  };
}
