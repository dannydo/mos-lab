import type { AcademyWorkshopFeeStatus, AcademyWorkshopRewardRule } from './workshop-entities.types.js';

export function getAcademyWorkshopQuizProgress<T extends { id: number }>(
  questions: readonly T[],
  activeQuestionId: number | null
) {
  const activeIndex =
    activeQuestionId === null ? -1 : questions.findIndex((question) => question.id === activeQuestionId);
  const nextQuestion = activeIndex >= 0 ? questions[activeIndex + 1] || null : null;

  return {
    activeIndex,
    currentQuestionNumber: activeIndex >= 0 ? activeIndex + 1 : 0,
    totalQuestions: questions.length,
    hasNextQuestion: nextQuestion !== null,
    isLastQuestion: activeIndex >= 0 && nextQuestion === null,
    nextQuestion,
  };
}

export function calculateAcademyWorkshopFeeStatus(
  feeVnd: number,
  totalPaidVnd: number,
  waived: boolean
): AcademyWorkshopFeeStatus {
  const fee = Math.max(0, Math.round(Number(feeVnd) || 0));
  const paid = Math.max(0, Math.round(Number(totalPaidVnd) || 0));
  if (fee === 0) return 'FREE';
  if (waived) return 'WAIVED';
  if (paid <= 0) return 'UNPAID';
  return paid >= fee ? 'PAID' : 'PARTIAL';
}

export function resolveAcademyWorkshopParticipantTargetFee(
  workshopFeeVnd: number,
  appliedFeeVnd?: number | null,
  discountVnd?: number
): number {
  const base = Math.max(0, Math.round(Number(workshopFeeVnd) || 0));
  if (appliedFeeVnd !== null && appliedFeeVnd !== undefined) {
    return Math.max(0, Math.round(Number(appliedFeeVnd)));
  }
  const discount = Math.max(0, Math.round(Number(discountVnd) || 0));
  return Math.max(0, base - discount);
}

export function calculateAcademyWorkshopQuestionScore(
  durationMs: number,
  elapsedMs: number,
  isCorrect: boolean
): number {
  if (!isCorrect) return 0;
  const duration = Math.max(1, Math.round(Number(durationMs) || 0));
  const elapsed = Math.max(0, Math.round(Number(elapsedMs) || 0));
  if (elapsed > duration) return 0;
  const remainingRatio = Math.max(0, Math.min(1, (duration - elapsed) / duration));
  return Math.max(500, Math.min(1000, 500 + Math.round(500 * remainingRatio)));
}

export function calculateAcademyWorkshopAgendaRemainingSeconds(
  plannedDurationSeconds: number,
  startedAt: string | Date | null,
  pausedAt: string | Date | null,
  pausedSeconds: number,
  now: string | Date = new Date()
): number {
  if (!startedAt) return Math.max(0, Math.round(Number(plannedDurationSeconds) || 0));
  const startMs = new Date(startedAt).getTime();
  const effectiveNowMs = pausedAt ? new Date(pausedAt).getTime() : new Date(now).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(effectiveNowMs)) return 0;
  const elapsedSeconds = Math.max(0, Math.floor((effectiveNowMs - startMs) / 1000) - Math.max(0, pausedSeconds));
  return Math.round(Number(plannedDurationSeconds) || 0) - elapsedSeconds;
}

export function selectAcademyWorkshopRewardParticipantIds(
  rule: AcademyWorkshopRewardRule,
  answers: Array<{ participantId: number; isCorrect: boolean; responseTimeMs: number }>,
  fastestCount = 1,
  maxResponseTimeMs = Number.POSITIVE_INFINITY
): number[] {
  if (rule === 'NONE') return [];
  const correct = answers
    .filter((answer) => answer.isCorrect && answer.responseTimeMs <= maxResponseTimeMs)
    .sort((left, right) => left.responseTimeMs - right.responseTimeMs || left.participantId - right.participantId);
  const uniqueCorrect = Array.from(
    correct
      .reduce((rows, answer) => {
        if (!rows.has(answer.participantId)) rows.set(answer.participantId, answer);
        return rows;
      }, new Map<number, (typeof correct)[number]>())
      .values()
  );
  const selected =
    rule === 'ALL_CORRECT' ? uniqueCorrect : uniqueCorrect.slice(0, Math.max(1, Math.round(fastestCount)));
  return selected.map((answer) => answer.participantId);
}

export function sortAcademyWorkshopTalentLeaderboard<
  T extends {
    qualified: boolean;
    strands5Min: number;
    totalErrors: number;
    eyeScore: number;
    handScore: number;
    completedAt: string;
  },
>(rows: readonly T[]): T[] {
  return [...rows].sort(
    (left, right) =>
      Number(right.qualified) - Number(left.qualified) ||
      right.strands5Min - left.strands5Min ||
      left.totalErrors - right.totalErrors ||
      right.eyeScore + right.handScore - (left.eyeScore + left.handScore) ||
      new Date(left.completedAt).getTime() - new Date(right.completedAt).getTime()
  );
}
