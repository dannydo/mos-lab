export const CVL_TRAINING_MENTORSHIP_CONFIG_KEY = 'CVL_TRAINING_MENTORSHIP_CONFIG';

export type CvlTrainingMentorshipOutcome = 'ACTIVE' | 'GRADUATED' | 'EXTENDED' | 'RETURNED_TO_CV';

export type CvlTrainingLifecycleStatus = 'OFFICIAL' | 'TRAINING' | 'PENDING_GRADUATION' | 'CV';

export interface CvlTrainingMentorshipPair {
  id: string;
  menteeLegacyStaffId: number;
  menteeDisplayName: string;
  mentorLegacyStaffId: number;
  mentorDisplayName: string;
  mentorRoleGroup?: 'CC' | 'CVL' | 'CVLL';
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
  outcome?: CvlTrainingMentorshipOutcome;
  resolvedAt?: string;
  resolvedBy?: string;
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
  menteeDebtCollectionBonusTotal?: number;
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
  roleGroup: 'CC' | 'CVL' | 'CVLL' | 'CV';
}

export interface CvlMenteeLifecycleSummary {
  crmStaffId?: number;
  status: CvlTrainingLifecycleStatus;
  currentRole?: string;
  activePairId?: string;
  pendingPairId?: string;
  mentorDisplayName?: string;
}

export interface CvlTrainingMentorshipConfigResponse {
  config: CvlTrainingMentorshipConfig;
  staffOptions: {
    ccMentors: CvlTrainingMentorshipStaffOption[];
    cvlMentees: CvlTrainingMentorshipStaffOption[];
  };
  menteeLifecycleByStaffId?: Record<number, CvlMenteeLifecycleSummary>;
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
  menteeDebtCollectionBonusTotal?: number;
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
    menteeDebtCollectionBonusTotal,
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
  const safeDebtBonus = isUnlocked ? Math.max(0, Math.round(menteeDebtCollectionBonusTotal || 0)) : 0;
  const safeSerumBonus = isUnlocked ? Math.max(0, Math.round(menteeSerumBonusTotal || 0)) : 0;
  const menteeTotalAdditionalIncome = safeDeltaHourly + safeDeltaTip + safeComboBonus + safeDebtBonus + safeSerumBonus;

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
    menteeDebtCollectionBonusTotal: safeDebtBonus,
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

/**
 * Kiểm tra ràng buộc 1-kèm-1 nghiêm ngặt:
 * - Mentor không được trùng với Mentee.
 * - Trong các khoảng ngày [startDate, endDate] giao nhau, 1 Mentor chỉ kèm tối đa 1 Mentee
 *   và 1 Mentee chỉ được kèm bởi tối đa 1 Mentor.
 * - Các kỳ không giao nhau (vd Tháng 11 lịch sử vs Tháng 12 mới) được phép dùng cùng Mentor.
 */
export function validateStrictOneToOneMentorshipPairs(pairs: CvlTrainingMentorshipPair[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const activePairs = (pairs || []).filter((p) => p.isActive && p.outcome !== 'RETURNED_TO_CV');

  for (let i = 0; i < activePairs.length; i++) {
    const a = activePairs[i];
    if (!a.mentorLegacyStaffId || !a.menteeLegacyStaffId) {
      errors.push(`Cặp "${a.id}": Thiếu thông tin Mentor hoặc Mentee.`);
      continue;
    }
    if (a.mentorLegacyStaffId === a.menteeLegacyStaffId) {
      errors.push(`${a.mentorDisplayName || `#${a.mentorLegacyStaffId}`}: Mentor và Mentee không được trùng nhau.`);
      continue;
    }
    for (let j = i + 1; j < activePairs.length; j++) {
      const b = activePairs[j];
      if (!isDateRangeOverlapping(a.startDate, a.endDate, b.startDate, b.endDate)) {
        continue;
      }
      if (a.mentorLegacyStaffId === b.mentorLegacyStaffId) {
        errors.push(
          `Mentor ${a.mentorDisplayName || `#${a.mentorLegacyStaffId}`} chỉ được kèm 1 Mentee trong cùng thời gian (trùng ${a.menteeDisplayName} [${a.startDate}..${a.endDate}] và ${b.menteeDisplayName} [${b.startDate}..${b.endDate}]).`
        );
      }
      if (a.menteeLegacyStaffId === b.menteeLegacyStaffId) {
        errors.push(
          `Mentee ${a.menteeDisplayName || `#${a.menteeLegacyStaffId}`} chỉ được gán 1 Mentor trong cùng thời gian (trùng ${a.mentorDisplayName} và ${b.mentorDisplayName}).`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Xác định trạng thái vòng đời CVL (Chính thức / Đang Training / Chờ chốt tốt nghiệp / CV thường).
 */
export function resolveCvlTrainingLifecycleStatus(params: {
  legacyStaffId: number;
  currentRole?: string | null;
  pairs: CvlTrainingMentorshipPair[];
  todayYmd: string;
}): {
  status: CvlTrainingLifecycleStatus;
  activePair?: CvlTrainingMentorshipPair;
  pendingPair?: CvlTrainingMentorshipPair;
} {
  const staffId = Math.floor(Number(params.legacyStaffId || 0));
  const today = String(params.todayYmd || '').slice(0, 10);
  const roleUpper = String(params.currentRole || '').toUpperCase();
  const isOfficialRole =
    roleUpper === 'CV_PLUS' || roleUpper === 'CV_PLUS_PLUS' || roleUpper === 'CVL' || roleUpper === 'CVLL';

  const menteePairs = (params.pairs || [])
    .filter((p) => p.menteeLegacyStaffId === staffId && p.isActive)
    .sort((a, b) => b.endDate.localeCompare(a.endDate));

  const activeTrainingPair = menteePairs.find(
    (p) =>
      (!p.outcome || p.outcome === 'ACTIVE') && today >= p.startDate.slice(0, 10) && today <= p.endDate.slice(0, 10)
  );
  if (activeTrainingPair) {
    return { status: 'TRAINING', activePair: activeTrainingPair };
  }

  const pendingPair = menteePairs.find((p) => (!p.outcome || p.outcome === 'ACTIVE') && today > p.endDate.slice(0, 10));
  if (pendingPair) {
    return { status: 'PENDING_GRADUATION', pendingPair };
  }

  if (isOfficialRole) {
    return { status: 'OFFICIAL' };
  }
  return { status: 'CV' };
}
