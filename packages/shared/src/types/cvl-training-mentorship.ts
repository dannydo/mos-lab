export const CVL_TRAINING_MENTORSHIP_CONFIG_KEY = 'CVL_TRAINING_MENTORSHIP_CONFIG';

export interface CvlTrainingMentorshipPair {
  id: string;
  menteeLegacyStaffId: number;
  menteeDisplayName: string;
  mentorLegacyStaffId: number;
  mentorDisplayName: string;
  storeCode: string;
  /** Inclusive YYYY-MM-DD start date of the training period */
  startDate: string;
  /** Inclusive YYYY-MM-DD end date of the training period */
  endDate: string;
  /** Fixed monthly mentor allowance (default 1,000,000 VND) unlocked when mentee hits minComboRateThreshold */
  fixedAllowanceVnd: number;
  /** Share of mentee's CVL totalAdditionalIncome paid to mentor (default 0.5 = 50%) */
  menteeBonusShareRate: number;
  /** Minimum combo conversion rate on Not Combo Live customers required to unlock mentor reward (default 0.2 = 20.0%) */
  minComboRateThreshold: number;
  isActive: boolean;
  note?: string;
}

export interface CvlTrainingMentorshipConfig {
  pairs: CvlTrainingMentorshipPair[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface CcTrainingMentorshipBreakdown {
  pairId: string;
  menteeLegacyStaffId: number;
  menteeDisplayName: string;
  storeCode: string;
  startDate: string;
  endDate: string;
  actualComboRate: number;
  minComboRateThreshold: number;
  combosSoldCount: number;
  notComboLiveOrders: number;
  comboLiveOrders: number;
  isUnlocked: boolean;
  fixedAllowanceVnd: number;
  menteeBonusShareRate: number;
  menteeDeltaHourlyWage: number;
  menteeDeltaTipBonus: number;
  menteeComboBonusTotal: number;
  menteeSerumBonusTotal: number;
  menteeTotalAdditionalIncome: number;
  mentorFixedEarned: number;
  mentorShareEarned: number;
  mentorTotalBonus: number;
}

export interface CvlTrainingMentorshipStaffOption {
  legacyStaffId: number;
  displayName: string;
  storeCode: string;
  roleGroup: 'CC' | 'CVL';
}

export interface CvlTrainingMentorshipConfigResponse {
  config: CvlTrainingMentorshipConfig;
  staffOptions: {
    ccMentors: CvlTrainingMentorshipStaffOption[];
    cvlMentees: CvlTrainingMentorshipStaffOption[];
  };
}

export const DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG: CvlTrainingMentorshipConfig = {
  pairs: [
    {
      id: 'dt-2026-11-thao-ly',
      menteeLegacyStaffId: 46272,
      menteeDisplayName: 'Thảo Ly',
      mentorLegacyStaffId: 37790,
      mentorDisplayName: 'Diễm Hương',
      storeCode: 'DT',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      fixedAllowanceVnd: 1_000_000,
      menteeBonusShareRate: 0.5,
      minComboRateThreshold: 0.2,
      isActive: true,
      note: 'Kỳ Training CVL Tháng 11/2026 tại Đề Thám',
    },
    {
      id: 'dt-2026-11-khanh-cao',
      menteeLegacyStaffId: 13783,
      menteeDisplayName: 'Khanh Cao',
      mentorLegacyStaffId: 34295,
      mentorDisplayName: 'Thục Nghi',
      storeCode: 'DT',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      fixedAllowanceVnd: 1_000_000,
      menteeBonusShareRate: 0.5,
      minComboRateThreshold: 0.2,
      isActive: true,
      note: 'Kỳ Training CVL Tháng 11/2026 tại Đề Thám',
    },
  ],
};

export interface CalculateMentorTrainingBonusInput {
  pair: CvlTrainingMentorshipPair;
  combosSoldCount: number;
  notComboLiveOrders: number;
  comboLiveOrders: number;
  menteeDeltaHourlyWage: number;
  menteeDeltaTipBonus: number;
  menteeComboBonusTotal: number;
  menteeSerumBonusTotal: number;
}

/**
 * Tính thưởng Mentor CC cuối tháng theo quy chế Đào Tạo Chuyên Viên Tự Chủ (CVL):
 * - Tỷ lệ chốt Combo trên khách Not Combo Live >= minComboRateThreshold (mặc định 20.0%)
 *   (hoặc miễn trừ giống Điều răn CV-002 khi notComboLiveOrders === 0).
 * - Khi đạt chuẩn: Mentor nhận fixedAllowanceVnd (1.000.000đ) + round(menteeBonusShareRate * menteeTotalAdditionalIncome).
 * - Khi không đạt chuẩn (< 20.0%): Mentor nhận 0đ (mất cả 1M cứng lẫn 50%).
 */
export function calculateCcMentorTrainingBonus(
  input: CalculateMentorTrainingBonusInput
): CcTrainingMentorshipBreakdown {
  const {
    pair,
    combosSoldCount,
    notComboLiveOrders,
    comboLiveOrders,
    menteeDeltaHourlyWage,
    menteeDeltaTipBonus,
    menteeComboBonusTotal,
    menteeSerumBonusTotal,
  } = input;

  const threshold = Number.isFinite(pair.minComboRateThreshold) ? pair.minComboRateThreshold : 0.2;
  const fixedAllowance = Math.max(0, Math.round(Number(pair.fixedAllowanceVnd || 0)));
  const shareRate = Number.isFinite(pair.menteeBonusShareRate) ? Math.max(0, pair.menteeBonusShareRate) : 0.5;

  let actualComboRate: number;
  let isUnlocked: boolean;
  if (notComboLiveOrders > 0) {
    actualComboRate = combosSoldCount / notComboLiveOrders;
    // Use 1e-9 epsilon to avoid IEEE-754 floating point drift at exact boundary (e.g. 2/10 = 0.2)
    isUnlocked = actualComboRate + 1e-9 >= threshold;
  } else if (combosSoldCount > 0) {
    actualComboRate = 1.0;
    isUnlocked = true;
  } else {
    actualComboRate = 0;
    isUnlocked = false;
  }

  const safeDeltaHourly = isUnlocked ? Math.max(0, Math.round(menteeDeltaHourlyWage || 0)) : 0;
  const safeDeltaTip = Math.max(0, Math.round(menteeDeltaTipBonus || 0));
  const safeComboBonus = isUnlocked ? Math.max(0, Math.round(menteeComboBonusTotal || 0)) : 0;
  const safeSerumBonus = isUnlocked ? Math.max(0, Math.round(menteeSerumBonusTotal || 0)) : 0;
  const menteeTotalAdditionalIncome = safeDeltaHourly + safeDeltaTip + safeComboBonus + safeSerumBonus;

  const mentorFixedEarned = isUnlocked ? fixedAllowance : 0;
  const mentorShareEarned = isUnlocked ? Math.round(menteeTotalAdditionalIncome * shareRate) : 0;
  const mentorTotalBonus = mentorFixedEarned + mentorShareEarned;

  return {
    pairId: pair.id,
    menteeLegacyStaffId: pair.menteeLegacyStaffId,
    menteeDisplayName: pair.menteeDisplayName,
    storeCode: pair.storeCode,
    startDate: pair.startDate,
    endDate: pair.endDate,
    actualComboRate: Math.round(actualComboRate * 1000) / 1000,
    minComboRateThreshold: threshold,
    combosSoldCount,
    notComboLiveOrders,
    comboLiveOrders,
    isUnlocked,
    fixedAllowanceVnd: fixedAllowance,
    menteeBonusShareRate: shareRate,
    menteeDeltaHourlyWage: safeDeltaHourly,
    menteeDeltaTipBonus: safeDeltaTip,
    menteeComboBonusTotal: safeComboBonus,
    menteeSerumBonusTotal: safeSerumBonus,
    menteeTotalAdditionalIncome,
    mentorFixedEarned,
    mentorShareEarned,
    mentorTotalBonus,
  };
}

/**
 * Kiểm tra khoảng [startA, endA] và [startB, endB] (dạng YYYY-MM-DD) có giao nhau không.
 */
export function isDateRangeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  const sA = startA.slice(0, 10);
  const eA = endA.slice(0, 10);
  const sB = startB.slice(0, 10);
  const eB = endB.slice(0, 10);
  return sA <= eB && sB <= eA;
}

/**
 * Tìm giao của 2 khoảng ngày [startA, endA] và [startB, endB] (YYYY-MM-DD).
 */
export function intersectDateRanges(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): { startDate: string; endDate: string } | null {
  const sA = startA.slice(0, 10);
  const eA = endA.slice(0, 10);
  const sB = startB.slice(0, 10);
  const eB = endB.slice(0, 10);
  const startDate = sA > sB ? sA : sB;
  const endDate = eA < eB ? eA : eB;
  return startDate <= endDate ? { startDate, endDate } : null;
}
