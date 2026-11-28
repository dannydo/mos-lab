import type {
  BananaTransactionCategory,
  CareerProgressionConfig,
  CvPlusRewardSnapshot,
  CvPlusToCvPlusPlusRequirements,
  CvToCvPlusRequirements,
  StaffCareerStatus,
} from '@mos-lab/shared';
import { calculateComboBonus } from '../../career-path.constants';
import type { CareerBibleTopic } from '../CareerBibleDrawer';

export type SimulationTargetRole = 'CV_PLUS' | 'CV_PLUS_PLUS';
export type GateFilter = 'ALL' | 'UNPASSED' | 'PASSED';
export type GateViewMode = 'simple' | 'expanded';

export interface RealStaffSimulationCardProps {
  status: StaffCareerStatus | null;
  config: CareerProgressionConfig;
  sliderOrders: number;
  setSliderOrders: (val: number) => void;
  sliderCombo: number;
  setSliderCombo: (val: number) => void;
  onActivateTrial?: () => void;
  onPromote?: () => void;
  onDemote?: () => void;
  onSetRole?: (newRole: 'CV' | 'CV_PLUS' | 'CV_PLUS_PLUS') => void;
  onSwitchSpecialist?: () => void;
  loadingAction?: boolean;
  simulationTarget?: SimulationTargetRole;
  onSimulationTargetChange?: (target: SimulationTargetRole) => void;
  onOpenBananaDrawer?: (category: BananaTransactionCategory) => void;
  onExpandStaffSelector?: () => void;
  onOpenBibleTopic?: (topic: CareerBibleTopic) => void;
}

export type ResolvedTargetRequirements = Partial<CvToCvPlusRequirements> & Partial<CvPlusToCvPlusPlusRequirements>;

type EarningsDetails = NonNullable<StaffCareerStatus['earningsSimulation']>['details'] & {
  payrollNetIncome?: number;
};

const DEFAULT_CVL_REQUIREMENTS: CvToCvPlusRequirements = {
  minOrders: 330,
  minConsecutiveMonths: 3,
  minTipRatioAboveShop: 0.05,
  maxFixRate: 0.015,
  minHappinessIndex: 0.7,
  minBananaCount: 20,
  maxDisciplinaryViolations: 0,
  minWeeklyQaAudits: 1,
  minQaAudits: 4,
  requireZeroFailedAudits: true,
  trialDurationDays: 30,
  minSelfComboRate: 0.21,
  allowSelfConsultTrial: true,
  expectedSerumsPerWeek: 1,
  expectedCombosPerMonth: 8,
  serumOriginalPriceBonus: 100000,
  serumDiscountedPriceBonus: 50000,
  comboUnder2mBonus: 50000,
  comboStepPerMillionBonus: 50000,
  comboMinCollectedAmount: 500000,
  comboDebtBonusMode: 'TIER_LADDER',
  comboDebtBonusRate: 0.015,
};

const DEFAULT_CVLL_REQUIREMENTS: CvPlusToCvPlusPlusRequirements = {
  minMonthsInCvPlus: 2,
  minOrders: 350,
  maxFixRate: 0.015,
  minTipRatioAboveShop: 0.15,
  minBananaCount: 25,
  minHappinessIndex: 0.8,
  crossConsultCommissionRate: 0.025,
  maxDisciplinaryViolations: 0,
  minWeeklyQaAudits: 1,
  minQaAudits: 4,
  requireZeroFailedAudits: true,
  trialDurationDays: 30,
  allowSelfConsultTrial: true,
  minSelfComboRate: 0.3,
  expectedSerumsPerWeek: 4,
  expectedCombosPerMonth: 10,
  serumOriginalPriceBonus: 100000,
  serumDiscountedPriceBonus: 50000,
  comboUnder2mBonus: 50000,
  comboStepPerMillionBonus: 50000,
  comboMinCollectedAmount: 500000,
  comboDebtBonusMode: 'TIER_LADDER',
  comboDebtBonusRate: 0.015,
  crossConsultCvShareRate: 0.2,
};

export function resolveTargetRequirements(
  config: CareerProgressionConfig,
  isTargetCvPlusPlus: boolean
): ResolvedTargetRequirements {
  return isTargetCvPlusPlus
    ? config.cvPlusToCvPlusPlus || DEFAULT_CVLL_REQUIREMENTS
    : config.cvToCvPlus || config.cvToCc || DEFAULT_CVL_REQUIREMENTS;
}

export function formatVnd(num?: number | null): string {
  if (!num) return '0đ';
  return `${num.toLocaleString('vi-VN')}đ`;
}

/**
 * Thưởng Vòng Xoay CV (CV Xoay):
 * - Neo chuẩn vào thưởng thực tế tháng trước (actualBonusAmount).
 * - Nếu kéo slider tăng số lượng bộ mi (ordersAdjustmentRatio > 1), cộng thêm delta theo công thức phỏng đoán vòng xoay.
 */
export function calculateProjectedCvXoayBonus(monthlyOrders: number, avgPoints = 35): number {
  if (monthlyOrders <= 0) return 0;
  const factor = avgPoints / 200; // 0.175
  const projected = 1000 * (factor * monthlyOrders * monthlyOrders + (1 - factor) * monthlyOrders);
  return Math.round(projected);
}

export interface QuestMetricsSummary {
  targetOrders: number;
  targetMaxFix: number;
  minTipRatioAboveShop: number;
  minBananaCount: number;
  minHappinessIndex: number;
  minSelfComboRate: number;
  minSelfComboPercent: number;
  staffTipRate: number;
  branchName: string;
  branchShortName: string;
  shopTipRate: number;
  shopBonusPercent: number;
  targetTipRate: number;
  staffTipRatePercent: number;
  shopTipRatePercent: number;
  targetTipRatePercent: number;
  isOrdersPassed: boolean;
  ordersGap: number;
  isFixPassed: boolean;
  isTipPassed: boolean;
  tipGapPercent: number;
  tipExcessPercent: number;
  requiredQaAudits: number;
  totalQaAudits: number;
  isQaPassed: boolean;
  hasFailedQa: boolean;
  qaProgressPercent: number;
  happinessIndex: number;
  isHiPassed: boolean;
  hiPercent: number;
  hiProgressPercent: number;
  bananaCount: number;
  isBananaPassed: boolean;
  bananaProgressPercent: number;
  passedQuestsCount: number;
  xpPercent: number;
  isMasterTech: boolean;
  isSimOrdersPassed: boolean;
  isSimTipPassed: boolean;
  safetyShieldPercent: number;
}

export function computeQuestMetricsSummary(params: {
  status: StaffCareerStatus;
  targetReq: ResolvedTargetRequirements;
  isTargetCvPlusPlus: boolean;
  localOrders: number;
  sliderTipRate: number;
}): QuestMetricsSummary {
  const { status, targetReq, isTargetCvPlusPlus, localOrders, sliderTipRate } = params;
  const metrics = status.metrics;

  const targetOrders = targetReq.minOrders ?? (isTargetCvPlusPlus ? 350 : 330);
  const targetMaxFix = targetReq.maxFixRate ?? 0.015;
  const minTipRatioAboveShop = targetReq.minTipRatioAboveShop ?? (isTargetCvPlusPlus ? 0.15 : 0.05);
  const minBananaCount = targetReq.minBananaCount ?? (isTargetCvPlusPlus ? 25 : 20);
  const minHappinessIndex = targetReq.minHappinessIndex ?? (isTargetCvPlusPlus ? 0.8 : 0.7);
  const minSelfComboRate = targetReq.minSelfComboRate ?? (isTargetCvPlusPlus ? 0.3 : 0.21);
  const minSelfComboPercent = Math.round(minSelfComboRate * 100);

  const staffTipRate =
    metrics.staffTipRate ??
    (metrics.ordersCount
      ? Math.min(0.65, Math.max(0.2, ((metrics.totalTip || 0) / (metrics.ordersCount * 38000)) * 0.45))
      : 0.314);
  const branchName = metrics.branchName || 'Chi Nhánh';
  const branchShortName = metrics.branchCode || metrics.branchName || 'CN';
  const shopTipRate = metrics.shopTipRate ?? 0.45;
  const shopBonusPercent = Number((shopTipRate * minTipRatioAboveShop * 100).toFixed(1));
  const targetTipRate = Number((shopTipRate * (1 + minTipRatioAboveShop)).toFixed(3));

  const staffTipRatePercent = Number((staffTipRate * 100).toFixed(1));
  const shopTipRatePercent = Number((shopTipRate * 100).toFixed(1));
  const targetTipRatePercent = Number((targetTipRate * 100).toFixed(1));

  // 1. Số ca làm / 3 tháng
  const isOrdersPassed = (metrics.ordersCount || 0) >= targetOrders;
  const ordersGap = Math.max(0, targetOrders - (metrics.ordersCount || 0));

  // 2. Tỷ lệ fix
  const isFixPassed = (metrics.fixRate || 0) <= targetMaxFix;

  // 3. Tỷ lệ tip
  const isTipPassed = staffTipRate >= targetTipRate || (metrics.tipRatioAboveShop || 0) >= minTipRatioAboveShop;
  const tipGapPercent = Math.max(0, Number((targetTipRatePercent - staffTipRatePercent).toFixed(1)));
  const tipExcessPercent = Math.max(0, Number((staffTipRatePercent - targetTipRatePercent).toFixed(1)));

  // 4. QA/QC tối thiểu 4 lần trong tháng hoàn tất gần nhất (1 lần/tuần)
  const qaAudit = metrics.qaAudit;
  const requiredQaAudits =
    targetReq.minQaAudits ?? (targetReq.minWeeklyQaAudits ? Math.round(targetReq.minWeeklyQaAudits * 4) : 4);
  const totalQaAudits = qaAudit?.totalAudits ?? 0;
  const isQaPassed =
    requiredQaAudits === 0 ||
    Boolean(qaAudit?.isPassed ?? (totalQaAudits >= requiredQaAudits && !qaAudit?.hasFailedAudit));
  const hasFailedQa = Boolean(qaAudit?.hasFailedAudit);
  const qaProgressPercent =
    requiredQaAudits === 0
      ? 100
      : isQaPassed
        ? 100
        : Math.min(100, Math.round((totalQaAudits / (requiredQaAudits || 4)) * 100));

  // 5. HI (Happiness Index)
  const happinessIndex = metrics.happinessIndex ?? 0;
  const isHiPassed = happinessIndex >= minHappinessIndex;
  const hiPercent = Math.round(happinessIndex * 100);
  const hiProgressPercent = Math.min(100, Math.round((happinessIndex / minHappinessIndex) * 100));

  // 6. Chuối Yêu Thương
  const bananaCount = metrics.bananaCount ?? 0;
  const isBananaPassed = bananaCount >= minBananaCount;
  const bananaProgressPercent = Math.min(100, Math.round((bananaCount / minBananaCount) * 100));

  // Gamified Quest XP Progress (Tổng 6 ải hoàn thành thực tế)
  const passedQuestsCount =
    Number(isOrdersPassed) +
    Number(isFixPassed) +
    Number(isTipPassed) +
    Number(isQaPassed) +
    Number(isHiPassed) +
    Number(isBananaPassed);
  const xpPercent = Math.round((passedQuestsCount / 6) * 100);
  const isMasterTech = isOrdersPassed && isFixPassed && isTipPassed && isQaPassed && !status.qualifiedQuests.allPassed;

  // What-If Dynamic Simulation across active interactive sliders
  const isSimOrdersPassed = localOrders >= targetOrders;
  const isSimTipPassed =
    sliderTipRate / 100 >= targetTipRate ||
    (targetTipRate > 0 && sliderTipRate / 100 >= shopTipRate * (1 + minTipRatioAboveShop));

  const safetyShieldPercent = Math.max(0, Math.min(100, Math.round((1 - (metrics.fixRate || 0)) * 100)));

  return {
    targetOrders,
    targetMaxFix,
    minTipRatioAboveShop,
    minBananaCount,
    minHappinessIndex,
    minSelfComboRate,
    minSelfComboPercent,
    staffTipRate,
    branchName,
    branchShortName,
    shopTipRate,
    shopBonusPercent,
    targetTipRate,
    staffTipRatePercent,
    shopTipRatePercent,
    targetTipRatePercent,
    isOrdersPassed,
    ordersGap,
    isFixPassed,
    isTipPassed,
    tipGapPercent,
    tipExcessPercent,
    requiredQaAudits,
    totalQaAudits,
    isQaPassed,
    hasFailedQa,
    qaProgressPercent,
    happinessIndex,
    isHiPassed,
    hiPercent,
    hiProgressPercent,
    bananaCount,
    isBananaPassed,
    bananaProgressPercent,
    passedQuestsCount,
    xpPercent,
    isMasterTech,
    isSimOrdersPassed,
    isSimTipPassed,
    safetyShieldPercent,
  };
}

export interface FinancialSimulationSummary {
  actualNetIncome: number;
  actualGrossIncome?: number;
  actualWorkingHours: number;
  actualHourlyRate: number;
  actualWageAmount: number;
  actualBonusAmount: number;
  actualTipAmount: number;
  actualAllowanceAmount: number;
  actualMonthLabel: string;
  isWhatIfModified: boolean;
  simOrdersPerMonth: number;
  simTippedVisits: number;
  hourlyWageNext: number;
  wageCvPlus: number;
  simulatedCvXoay: number;
  bonusGain: number;
  tipCvPlus: number;
  serumOrigBonus: number;
  monthlySerumBonus: number;
  simulatedComboCount: number;
  isComboTargetHit: boolean;
  comboGain: number;
  effectiveWageGain: number;
  effectiveSerumGain: number;
  effectiveTipGain: number;
  lostBonusAmount: number;
  currentIncome: number;
  totalSimulatedGain: number;
  simulatedNextTierIncome: number;
  incomeIncreasePercent: number;
}

export function computeFinancialSimulation(params: {
  status: StaffCareerStatus;
  config: CareerProgressionConfig;
  targetReq: ResolvedTargetRequirements;
  questMetrics: QuestMetricsSummary;
  isTargetCvPlusPlus: boolean;
  defaultSerums: number;
  sliderSerums: number;
  sliderTipRate: number;
  localOrders: number;
  localCombo: number;
  cvlSnapshot: CvPlusRewardSnapshot | null;
}): FinancialSimulationSummary {
  const {
    status,
    config,
    targetReq,
    questMetrics,
    isTargetCvPlusPlus,
    defaultSerums,
    sliderSerums,
    sliderTipRate,
    localOrders,
    localCombo,
    cvlSnapshot,
  } = params;

  const metrics = status.metrics;
  const earnings = status.earningsSimulation;
  const details = earnings?.details as EarningsDetails | undefined;

  // 1. Dữ liệu thực tế tháng trước từ bảng lương staff_payroll của nhân sự (Baseline Chân Lý)
  const actualNetIncome =
    details?.currentNetIncome ||
    details?.payrollNetIncome ||
    (details?.currentGrossIncome ? Math.round(details.currentGrossIncome * 0.95) : 0);
  const actualWorkingHours = details?.payrollWorkingHours || details?.actualWorkingHours || 260;
  const actualHourlyRate = details?.payrollHourlyRate || details?.hourlyWageCurrent || 25500;
  const actualWageAmount = details?.payrollWageAmount || Math.round(actualWorkingHours * actualHourlyRate);
  const actualBonusAmount = details?.payrollBonusAmount || 0;
  const actualTipAmount = details?.payrollTipAmount || details?.actualTipReceived || 0;
  const actualAllowanceAmount =
    details?.payrollAllowanceAmount ??
    (actualNetIncome > 0 ? Math.max(0, actualNetIncome - (actualWageAmount + actualBonusAmount + actualTipAmount)) : 0);
  const actualMonthLabel = details?.payrollMonthLabel || 'tháng trước';

  // 2. Định mức gốc của nhân sự & Slider What-If
  const origOrders = metrics.ordersCount || 300;
  const origCombo = Math.round((metrics.selfComboRate || 0.25) * 100);
  const origSerums = defaultSerums;
  const origTipRate = questMetrics.staffTipRatePercent;

  const isOrdersChanged = Math.abs(localOrders - origOrders) > 0.01;
  const isComboChanged = Math.abs(localCombo - origCombo) > 0.01;
  const isSerumsChanged = Math.abs(sliderSerums - origSerums) > 0.01;
  const isTipRateChanged = Math.abs(sliderTipRate - origTipRate) > 0.01;

  const isWhatIfModified = isOrdersChanged || isComboChanged || isSerumsChanged || isTipRateChanged;

  // Quy đổi sản lượng mi mô phỏng sang 1 tháng (Slider 3 là định mức 3 tháng)
  const simOrdersPerMonth = Math.max(1, localOrders / 3);
  const baselineOrdersPerMonth = Math.max(1, origOrders / 3);
  const ordersAdjustmentRatio =
    isOrdersChanged && baselineOrdersPerMonth > 0 ? simOrdersPerMonth / baselineOrdersPerMonth : 1.0;

  // 3. Thưởng Vòng Xoay CV
  const baseCvXoayProjected = calculateProjectedCvXoayBonus(baselineOrdersPerMonth, 35);
  const sliderCvXoayProjected = calculateProjectedCvXoayBonus(simOrdersPerMonth, 35);
  const deltaCvXoayBonus = Math.max(0, sliderCvXoayProjected - baseCvXoayProjected);
  const simulatedCvXoay =
    actualBonusAmount > 0 ? Math.round(actualBonusAmount + deltaCvXoayBonus) : sliderCvXoayProjected;
  const bonusGain = actualBonusAmount > 0 ? deltaCvXoayBonus : 0;

  // 4. Giờ làm việc & Lương giờ ca làm
  const hourlyWageNext = targetReq.hourlyWage || details?.hourlyWageNext || (isTargetCvPlusPlus ? 29500 : 27500);
  const hourlyWageCurrent = details?.hourlyWageCurrent || config.compensation?.hourlyWages?.cv || 25500;

  const simWorkingHours =
    actualWorkingHours > 0
      ? isOrdersChanged
        ? Math.round(actualWorkingHours * ordersAdjustmentRatio)
        : actualWorkingHours
      : Math.round(simOrdersPerMonth * 2.4);

  const wageCvCurrent =
    actualWageAmount > 0
      ? isOrdersChanged
        ? Math.round(simWorkingHours * actualHourlyRate)
        : actualWageAmount
      : Math.round(simWorkingHours * hourlyWageCurrent);
  const wageCvPlus = Math.round(simWorkingHours * hourlyWageNext);
  const wageGain = Math.max(0, wageCvPlus - wageCvCurrent);

  // 5. Tiền TIP khách trao tặng (Ăn trọn 90% TIP, neo vào Tiền Tip thực nhận tháng trước):
  // Chân Lý Danny: CV hiện tại nhận 70% Tip (7 phần).
  // Khi thăng cấp lên CVL, chuyên viên được ăn trọn 90% Tip (nhận thêm đúng 20% do tự tư vấn không bị trừ cho sảnh/CC).
  // Số tiền nhận thêm = (Tip_70% / 7) * 2 (+2 phần).
  // Tổng tiền Tip sau thăng cấp (90%) = Tip_70% + (Tip_70% / 7) * 2 = Tip_70% * 9 / 7.
  const baseTipGain = actualTipAmount > 0 ? Math.round((actualTipAmount / 7) * 2) : 0;
  const base90Tip = actualTipAmount + baseTipGain;

  const baseTipRateVal = questMetrics.staffTipRate > 0 ? questMetrics.staffTipRate : 0.45;
  const tipRateAdjustmentRatio = isTipRateChanged && baseTipRateVal > 0 ? sliderTipRate / 100 / baseTipRateVal : 1.0;
  const totalTipAdjustment = ordersAdjustmentRatio * tipRateAdjustmentRatio;
  const simTipRatio = Math.max(0, Math.min(1, sliderTipRate / 100));
  const simTippedVisits = simOrdersPerMonth * simTipRatio;

  let tipCvCurrent = 0;
  let tipCvPlus = 0;
  let tipGain = 0;

  if (actualTipAmount > 0) {
    if (Math.abs(totalTipAdjustment - 1.0) < 0.001) {
      tipCvCurrent = actualTipAmount;
      tipCvPlus = base90Tip;
      tipGain = baseTipGain;
    } else {
      tipCvCurrent = Math.round(actualTipAmount * totalTipAdjustment);
      tipCvPlus = Math.round(base90Tip * totalTipAdjustment);
      tipGain = Math.max(0, tipCvPlus - actualTipAmount);
    }
  } else {
    const avgCustomerTip = metrics.staffAvgTip || metrics.shopAvgTip || 40000;
    const safeAvgCustomerTip = Math.max(30000, Math.min(80000, avgCustomerTip));
    const simTotalCustomerTip = Math.round(simTippedVisits * safeAvgCustomerTip);
    tipCvCurrent = Math.round(simTotalCustomerTip * 0.7);
    tipCvPlus = Math.round(simTotalCustomerTip * 0.9);
    tipGain = Math.max(0, tipCvPlus - tipCvCurrent);
  }

  // 6. Cấu hình tiền tươi dưỡng mi & combo bậc thang
  const serumOrigBonus = targetReq.serumOriginalPriceBonus ?? 100000;
  const weeklySerumBonus = sliderSerums * serumOrigBonus;
  const monthlySerumBonus = weeklySerumBonus * 4;

  const avgComboPrice = details?.avgComboPrice || 4500000;
  const singleComboBonus = calculateComboBonus(avgComboPrice, targetReq);

  const actualNotComboRatio =
    cvlSnapshot && cvlSnapshot.totalOrders > 0
      ? Math.max(0.2, Math.min(0.8, cvlSnapshot.notComboLiveOrders / cvlSnapshot.totalOrders))
      : 0.4;
  const notComboLiveCustomers = Math.max(10, Math.round(simOrdersPerMonth * actualNotComboRatio));

  const simulatedComboPct = localCombo;
  const simulatedComboCount = Math.round(notComboLiveCustomers * (localCombo / 100));

  const { minSelfComboPercent } = questMetrics;
  const isComboTargetHit = simulatedComboPct >= minSelfComboPercent;
  const isPenaltyActive = !isComboTargetHit;

  const simulatedPersonalComboBonus = isPenaltyActive ? 0 : simulatedComboCount * singleComboBonus;
  const baseComboCommission = details?.comboCommissionCurrent || 0;
  const comboGain = isPenaltyActive ? 0 : Math.max(0, simulatedPersonalComboBonus - baseComboCommission);

  const effectiveWageGain = isPenaltyActive ? 0 : wageGain;
  const effectiveSerumGain = isPenaltyActive ? 0 : monthlySerumBonus;
  const effectiveTipGain = tipGain;

  const lostBonusAmount = isPenaltyActive
    ? wageGain + Math.round(notComboLiveCustomers * (minSelfComboPercent / 100) * singleComboBonus) + monthlySerumBonus
    : 0;

  // 7. Tổng thu nhập cơ sở
  const currentIncome = actualNetIncome > 0 ? actualNetIncome : wageCvCurrent + simulatedCvXoay + tipCvCurrent;
  const totalSimulatedGain = effectiveWageGain + effectiveTipGain + comboGain + effectiveSerumGain + bonusGain;
  const simulatedNextTierIncome = currentIncome + totalSimulatedGain;
  const incomeIncreasePercent = currentIncome > 0 ? Math.round((totalSimulatedGain / currentIncome) * 100) : 33;

  return {
    actualNetIncome,
    actualGrossIncome: details?.currentGrossIncome,
    actualWorkingHours,
    actualHourlyRate,
    actualWageAmount,
    actualBonusAmount,
    actualTipAmount,
    actualAllowanceAmount,
    actualMonthLabel,
    isWhatIfModified,
    simOrdersPerMonth,
    simTippedVisits,
    hourlyWageNext,
    wageCvPlus,
    simulatedCvXoay,
    bonusGain,
    tipCvPlus,
    serumOrigBonus,
    monthlySerumBonus,
    simulatedComboCount,
    isComboTargetHit,
    comboGain,
    effectiveWageGain,
    effectiveSerumGain,
    effectiveTipGain,
    lostBonusAmount,
    currentIncome,
    totalSimulatedGain,
    simulatedNextTierIncome,
    incomeIncreasePercent,
  };
}
