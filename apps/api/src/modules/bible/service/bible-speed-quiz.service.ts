import type {
  MosBibleQuizQuestion,
  MosBibleQuizSubmissionResult,
  MosBibleSpeedQuizAnswerItem,
  MosBibleSpeedQuizProfile,
  MosBibleSpeedQuizResult,
} from '@mos-lab/shared';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';
import { EXPANDED_BIBLE_QUIZ_POOL, INITIAL_WEEKLY_QUIZ } from './bible-quiz-pool.js';

const BIBLE_BANANA_VAULT_CONFIG_KEY = 'MOS_BIBLE_BANANA_VAULT';

interface BananaVaultEntry {
  date: string;
  attemptsToday: number;
  purchasedAttemptsToday?: number;
  purchasedRunsAvailable?: number;
  bananasToday: number;
  totalBananas: number;
  streakBest: number;
}

type BananaVaultMap = Record<number, BananaVaultEntry>;

async function readBananaVault(crm: CrmPrismaClient): Promise<BananaVaultMap> {
  const record = await crm.crmConfig.findUnique({
    where: { key: BIBLE_BANANA_VAULT_CONFIG_KEY },
  });
  if (!record?.value) return {};
  try {
    return JSON.parse(record.value) as BananaVaultMap;
  } catch {
    return {};
  }
}

async function writeBananaVault(crm: CrmPrismaClient, vault: BananaVaultMap): Promise<void> {
  await crm.crmConfig.upsert({
    where: { key: BIBLE_BANANA_VAULT_CONFIG_KEY },
    create: {
      key: BIBLE_BANANA_VAULT_CONFIG_KEY,
      value: JSON.stringify(vault),
    },
    update: {
      value: JSON.stringify(vault),
    },
  });
}

/**
 * Return the weekly quiz question set
 */
export function getWeeklyQuiz(): readonly MosBibleQuizQuestion[] {
  return INITIAL_WEEKLY_QUIZ;
}

/**
 * Evaluate a quiz submission
 */
export function evaluateQuizSubmission(
  questionId: string,
  selectedKey: 'A' | 'B' | 'C' | 'D'
): MosBibleQuizSubmissionResult | null {
  const question = EXPANDED_BIBLE_QUIZ_POOL.find((q) => q.id === questionId);
  if (!question) return null;

  const isCorrect = question.correctKey === selectedKey;
  return {
    questionId,
    selectedKey,
    isCorrect,
    correctKey: question.correctKey,
    explanation: question.explanation,
    culturalKey: question.culturalKey,
    earnedPoints: isCorrect ? question.rewardPoints : 0,
  };
}

/**
 * Get today string in Asia/Ho_Chi_Minh timezone (YYYY-MM-DD)
 */
export function getTodayDateStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/**
 * Get Speed Quiz & Banana Vault Profile for a staff member
 */
export async function getSpeedQuizProfile(
  crm: CrmPrismaClient,
  staffId: number,
  todayFn: () => string = getTodayDateStr
): Promise<MosBibleSpeedQuizProfile> {
  const today = todayFn();
  const vault = await readBananaVault(crm);

  const staffData = vault[staffId];
  if (!staffData || staffData.date !== today) {
    // New day or first time
    const totalBananas = staffData?.totalBananas || 0;
    return {
      staffId,
      date: today,
      attemptsToday: 0,
      maxAttemptsPerDay: 3,
      purchasedAttemptsToday: 0,
      maxPurchasedAttemptsPerDay: 3,
      purchasedRunsAvailable: 0,
      bananasToday: 0,
      maxBananasPerDay: 6,
      totalBananas,
      canPlayToday: true,
      canPurchaseAttempt: false,
      streakBest: staffData?.streakBest || 0,
    };
  }

  const attemptsToday = staffData.attemptsToday || 0;
  const purchasedAttemptsToday = staffData.purchasedAttemptsToday || 0;
  const purchasedRunsAvailable = staffData.purchasedRunsAvailable || 0;
  const totalBananas = staffData.totalBananas || 0;

  const canPlayToday = attemptsToday < 3 || purchasedRunsAvailable > 0;
  const canPurchaseAttempt =
    attemptsToday >= 3 && purchasedAttemptsToday < 3 && totalBananas >= 1 && purchasedRunsAvailable === 0;

  return {
    staffId,
    date: today,
    attemptsToday,
    maxAttemptsPerDay: 3,
    purchasedAttemptsToday,
    maxPurchasedAttemptsPerDay: 3,
    purchasedRunsAvailable,
    bananasToday: staffData.bananasToday || 0,
    maxBananasPerDay: 6,
    totalBananas,
    canPlayToday,
    canPurchaseAttempt,
    streakBest: staffData.streakBest || 0,
  };
}

/**
 * Buy an additional Speed Quiz attempt using 1 Banana
 */
export async function buySpeedQuizAttempt(
  crm: CrmPrismaClient,
  staffId: number,
  todayFn: () => string = getTodayDateStr
): Promise<{ success: boolean; profile?: MosBibleSpeedQuizProfile; error?: string }> {
  const today = todayFn();
  const profile = await getSpeedQuizProfile(crm, staffId, todayFn);

  if (profile.attemptsToday < 3) {
    return {
      success: false,
      error: 'Bạn vẫn còn lượt chơi miễn phí trong ngày, chưa cần dùng Chuối để mua thêm lượt.',
    };
  }

  if (profile.purchasedAttemptsToday >= 3) {
    return {
      success: false,
      error: 'Bạn đã đạt giới hạn mua tối đa 3 lượt chơi trong ngày hôm nay.',
    };
  }

  if (profile.totalBananas < 1) {
    return {
      success: false,
      error: 'Ví của bạn không đủ Chuối để mua thêm lượt (cần tối thiểu 1 🍌).',
    };
  }

  if (profile.purchasedRunsAvailable > 0) {
    return {
      success: false,
      error: 'Bạn đang có lượt mua chưa chơi. Hãy hoàn tất lượt này trước khi mua tiếp nhé!',
    };
  }

  const vault = await readBananaVault(crm);

  const staffData = vault[staffId] || {
    date: today,
    attemptsToday: profile.attemptsToday,
    purchasedAttemptsToday: 0,
    purchasedRunsAvailable: 0,
    bananasToday: profile.bananasToday,
    totalBananas: profile.totalBananas,
    streakBest: profile.streakBest,
  };

  staffData.date = today;
  staffData.totalBananas = Math.max(0, staffData.totalBananas - 1);
  staffData.purchasedAttemptsToday = (staffData.purchasedAttemptsToday || 0) + 1;
  staffData.purchasedRunsAvailable = (staffData.purchasedRunsAvailable || 0) + 1;

  vault[staffId] = staffData;

  await writeBananaVault(crm, vault);

  const updatedProfile = await getSpeedQuizProfile(crm, staffId, todayFn);
  return { success: true, profile: updatedProfile };
}

/**
 * Get random questions for a Speed Quiz run (Default 5 questions per run)
 */
export function getSpeedQuizQuestions(count = 5): readonly MosBibleQuizQuestion[] {
  const shuffled = [...EXPANDED_BIBLE_QUIZ_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Submit a Speed Quiz run and evaluate streak / bananas
 * Rule: 3 continuous correct = 1 Banana, 5 continuous correct = 2 Bananas
 */
export async function submitSpeedQuizRun(
  crm: CrmPrismaClient,
  staffId: number,
  answers: MosBibleSpeedQuizAnswerItem[],
  todayFn: () => string = getTodayDateStr
): Promise<{ success: boolean; data?: MosBibleSpeedQuizResult; error?: string }> {
  const profile = await getSpeedQuizProfile(crm, staffId, todayFn);

  const isFreeRun = profile.attemptsToday < 3;
  const isPurchasedRun = !isFreeRun && profile.purchasedRunsAvailable > 0;

  if (!isFreeRun && !isPurchasedRun) {
    if (profile.purchasedAttemptsToday >= 3) {
      return {
        success: false,
        error: 'Bạn đã hoàn tất tối đa 3 lượt miễn phí và 3 lượt mua trong ngày hôm nay. Hẹn gặp lại vào ngày mai nhé!',
      };
    }
    return {
      success: false,
      error: 'Bạn đã hoàn tất tối đa 3 lượt miễn phí hôm nay. Bạn có thể dùng 1 🍌 để mua thêm lượt chơi!',
    };
  }

  let currentStreak = 0;
  let correctCount = 0;

  for (const answer of answers) {
    const q = EXPANDED_BIBLE_QUIZ_POOL.find((item) => item.id === answer.questionId);
    if (!q) continue;

    // Allow 10s + 2s network/render grace period (12000ms)
    const inTime = answer.durationMs <= 12000;
    const isCorrect = q.correctKey === answer.selectedKey;

    if (isCorrect && inTime) {
      currentStreak += 1;
      correctCount += 1;
    } else {
      // Sudden death! Streak terminates
      break;
    }
  }

  const bananasEarned = currentStreak >= 5 ? 2 : currentStreak >= 3 ? 1 : 0;
  const actualBananasAwarded = isFreeRun
    ? Math.min(bananasEarned, Math.max(0, 6 - profile.bananasToday))
    : bananasEarned;

  const today = todayFn();
  const vault = await readBananaVault(crm);

  const staffData = vault[staffId] || {
    date: today,
    attemptsToday: 0,
    purchasedAttemptsToday: 0,
    purchasedRunsAvailable: 0,
    bananasToday: 0,
    totalBananas: 0,
    streakBest: 0,
  };

  staffData.date = today;
  if (isFreeRun) {
    staffData.attemptsToday = (staffData.attemptsToday || 0) + 1;
  } else {
    staffData.purchasedRunsAvailable = Math.max(0, (staffData.purchasedRunsAvailable || 1) - 1);
  }

  staffData.bananasToday = (staffData.bananasToday || 0) + actualBananasAwarded;
  staffData.totalBananas = (staffData.totalBananas || 0) + actualBananasAwarded;
  staffData.streakBest = Math.max(staffData.streakBest || 0, currentStreak);

  vault[staffId] = staffData;

  await writeBananaVault(crm, vault);

  const updatedProfile = await getSpeedQuizProfile(crm, staffId, todayFn);

  let message: string;
  if (isPurchasedRun) {
    if (currentStreak >= 5) {
      message = '🏆 Đỉnh cao tuyệt đối! Bạn đúng liên tục 5 câu, nhận trọn vẹn 2 🍌 (Lãi ròng +1 Chuối)!';
    } else if (currentStreak >= 3) {
      message = `🍌 Rất tốt! Bạn đạt chuỗi ${currentStreak} câu đúng, nhận 1 🍌 (Hoàn vốn 1 Chuối đã mua)!`;
    } else {
      message = `Tiếc quá! Chuỗi đúng ${currentStreak} câu (chưa đạt mốc 3 câu). Bạn không nhận được Chuối cho lượt mua này. Hãy cố gắng lần sau nhé!`;
    }
  } else {
    if (currentStreak >= 5) {
      message = `🏆 Đỉnh cao tuyệt đối! Bạn đã trả lời đúng liên tục 5 câu hỏi và rinh trọn vẹn +${actualBananasAwarded} Chuối 🍌!`;
    } else if (currentStreak >= 3) {
      message = `🍌 Xuất sắc! Bạn đã vượt mốc 3 câu đúng liên tục và nhận được +${actualBananasAwarded} Chuối 🍌!`;
    } else {
      message = `Cố gắng hơn ở lượt sau nhé! Bạn đạt chuỗi ${currentStreak} câu đúng (cần từ 3 câu liên tục để nhận 1 Chuối 🍌).`;
    }
  }

  return {
    success: true,
    data: {
      streak: currentStreak,
      correctCount,
      totalAnswered: answers.length,
      bananasEarned: actualBananasAwarded,
      profile: updatedProfile,
      message,
    },
  };
}
