import type { MosBibleSpeedQuizProfile } from '@mos-lab/shared';

export const QUESTION_TIME_LIMIT_SEC = 10;
export const TIMEOUT_DURATION_MS = 12000;
export const MAX_FREE_ATTEMPTS_PER_DAY = 3;
export const MAX_PURCHASED_ATTEMPTS_PER_DAY = 3;

export const DEFAULT_SPEED_QUIZ_PROFILE: MosBibleSpeedQuizProfile = {
  staffId: 1,
  date: '',
  attemptsToday: 0,
  maxAttemptsPerDay: MAX_FREE_ATTEMPTS_PER_DAY,
  purchasedAttemptsToday: 0,
  maxPurchasedAttemptsPerDay: MAX_PURCHASED_ATTEMPTS_PER_DAY,
  purchasedRunsAvailable: 0,
  bananasToday: 0,
  maxBananasPerDay: 6,
  totalBananas: 0,
  canPlayToday: true,
  canPurchaseAttempt: false,
  streakBest: 0,
};
