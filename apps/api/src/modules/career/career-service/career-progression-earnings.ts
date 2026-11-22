import {
  calculateComboBonus,
  CareerProgressionConfig,
  CareerRole,
  CvPlusToCvPlusPlusRequirements,
  CvToCvPlusRequirements,
  SafeAny,
  StaffCareerStatus,
} from '@mos-lab/shared';
import type { StaffProgressionLegacyMetrics } from './career-progression-metrics.js';

export interface ProgressionEarningsInput {
  config: CareerProgressionConfig;
  activeReq: CvToCvPlusRequirements | CvPlusToCvPlusPlusRequirements;
  currentRole: CareerRole;
  isCvPlusPlusTarget: boolean;
  minSelfComboRate: number;
  metrics: StaffProgressionLegacyMetrics;
}

/**
 * Mô phỏng thu nhập hiện tại và cấp bậc tiếp theo dựa trên số liệu thực tế của Chuyên Viên.
 */
export function calculateProgressionEarningsSimulation(
  input: ProgressionEarningsInput
): NonNullable<StaffCareerStatus['earningsSimulation']> {
  const { config, activeReq, currentRole, isCvPlusPlusTarget, minSelfComboRate, metrics } = input;
  const {
    ordersCount,
    periodOrders,
    totalTip,
    periodTip,
    shopAvgTip,
    ccBonusCash,
    lastMonthWorkingHours,
    avg90dWorkingHours,
    payrollHourlyRate,
    payrollWorkingHours,
    payrollNetIncome,
    payrollSocialSecurity,
    payrollGrossIncome,
    payrollBonusAmount,
    payrollWageAmount,
    payrollTipAmount,
    payrollAllowanceAmount,
    payrollDate,
    payrollMonthLabel,
  } = metrics;

  const expectedSerumsPerWeek = activeReq.expectedSerumsPerWeek ?? 4;
  const expectedCombosPerMonth = activeReq.expectedCombosPerMonth ?? (isCvPlusPlusTarget ? 10 : 6);
  const crossConsultCommissionRate = (activeReq as SafeAny).crossConsultCommissionRate ?? 0.025;
  const crossConsultTipRate = (activeReq as SafeAny).crossConsultTipRate ?? 0.2;
  const crossConsultCvShareRate = (activeReq as SafeAny).crossConsultCvShareRate ?? 0.2;
  const expectedCrossConsultOrdersPerMonth = (activeReq as SafeAny).expectedCrossConsultOrdersPerMonth ?? 20;
  const expectedCrossConsultCombosPerMonth = (activeReq as SafeAny).expectedCrossConsultCombosPerMonth ?? 4;
  const crossConsultAvgTipPerOrder = shopAvgTip > 15000 ? shopAvgTip : 40000;
  const crossConsultTipAmount = Math.round(
    expectedCrossConsultOrdersPerMonth * crossConsultAvgTipPerOrder * crossConsultTipRate
  );

  // Earnings simulation based on real numbers of the specific CV
  const hourlyWages = config.compensation?.hourlyWages || {
    cv: payrollHourlyRate > 0 ? payrollHourlyRate : 25500,
    cvPlus: (payrollHourlyRate > 0 ? payrollHourlyRate : 25500) + 2000,
    cvPlusPlus: (payrollHourlyRate > 0 ? payrollHourlyRate : 25500) + 4000,
  };

  // Giờ công thực tế: ưu tiên số giờ từ bảng lương staff_payroll, rồi giờ thực tế tháng trước của CV, nếu chưa có ca thì lấy trung bình 90 ngày, fallback 260h
  const actualWorkingHours =
    payrollWorkingHours > 0
      ? payrollWorkingHours
      : lastMonthWorkingHours > 0
        ? lastMonthWorkingHours
        : avg90dWorkingHours > 0
          ? avg90dWorkingHours
          : 260;

  // Tiền tip thực tế CV đã nhận (70%): ưu tiên theo kỳ được chọn, nếu kỳ = 0 thì lấy trung bình 3 tháng (totalTip / 3)
  const actualTipReceived = periodTip > 0 ? periodTip : ordersCount > 0 ? Math.round(totalTip / 3) : 2500000;

  // Tổng tiền tip mà khách hàng thực tế đã cho trên hóa đơn (100% tip khách: actualTipReceived / 7 * 10)
  // Chân Lý Danny: CV nhận 70% Tip (7 phần). Lên CVL ăn trọn 90% Tip (thêm 20% do tự tư vấn không bị trừ cho sảnh/CC = (Tip / 7) * 2).
  const customerTotalTip = Math.round((actualTipReceived / 7) * 10);
  const tipGainFrom70 = Math.round((actualTipReceived / 7) * 2);

  // Số đơn làm trong kỳ: ưu tiên theo kỳ được chọn, nếu không thì lấy trung bình 3 tháng
  const monthlyOrdersCount = periodOrders > 0 ? periodOrders : ordersCount > 0 ? Math.round(ordersCount / 3) : 80;

  // Tệp khách hàng có thể bán combo: 40% số khách (loại trừ khách đang có gói combo live)
  const potentialComboCustomers = Math.max(20, Math.round(monthlyOrdersCount * 0.4));
  // Số gói combo dự kiến bán mỗi tháng: ưu tiên cấu hình của Danny
  const minComboRequired = Math.max(6, Math.round(potentialComboCustomers * minSelfComboRate));
  const predictedComboCount = expectedCombosPerMonth;
  // Giá trung bình combo thực tế tại Wings Lashes (dữ liệu DB: 4.497.831đ ~ 4.5M)
  const avgComboPrice = 4500000;
  const monthlySelfComboRev = predictedComboCount * avgComboPrice;

  // Chỉ tiêu dự kiến: Mỗi tuần bán được dưỡng mi (mặc định 4 cây/tuần)
  const expectedSerumsPerMonth = expectedSerumsPerWeek * 4; // 16 cây / tháng
  // Thưởng tiền tươi dưỡng mi: giá gốc 100K, giảm giá 50K (theo config của Danny)
  const serumOriginalPriceBonus = (activeReq as SafeAny).serumOriginalPriceBonus ?? 100000;
  const serumDiscountedPriceBonus = (activeReq as SafeAny).serumDiscountedPriceBonus ?? 50000;
  const serumDeepDiscountPriceBonus = (activeReq as SafeAny).serumDeepDiscountPriceBonus ?? 10000;
  const serumFreePriceBonus = (activeReq as SafeAny).serumFreePriceBonus ?? 1000;
  const serumCommissionAmount = serumOriginalPriceBonus; // Tính theo giá gốc cho kịch bản chuẩn
  const monthlySerumIncome = expectedSerumsPerMonth * serumCommissionAmount;

  // Hoa hồng combo bậc thang tiền tươi theo cấu hình của Danny (<2M: 50K, <3M: 100K, <4M: 150K, +50K/1M)
  const singleComboBonus = calculateComboBonus(avgComboPrice, activeReq as SafeAny);
  const crossConsultComboAmount = isCvPlusPlusTarget
    ? Math.round(expectedCrossConsultCombosPerMonth * singleComboBonus)
    : 0;
  const crossConsultCvSharedAmount = isCvPlusPlusTarget
    ? Math.round(crossConsultComboAmount * crossConsultCvShareRate)
    : 0;

  let wageCurrent = hourlyWages.cv;
  let wageNext = hourlyWages.cvPlus;
  let tipShareCurrent = actualTipReceived; // Hiện tại nhận 70%
  let tipShareNext = actualTipReceived + tipGainFrom70; // Khi lên CVL nhận 90%
  let comboCommCurrent = 0;
  let comboCommNext = Math.round(predictedComboCount * singleComboBonus); // Tiền tươi theo bậc thang combo

  if (isCvPlusPlusTarget) {
    wageCurrent = currentRole === 'CV_PLUS' ? hourlyWages.cvPlus : hourlyWages.cv;
    wageNext = hourlyWages.cvPlusPlus; // 29.500đ/h
    tipShareCurrent = currentRole === 'CV_PLUS' ? Math.round(customerTotalTip * 0.9) : actualTipReceived;
    tipShareNext = Math.round(customerTotalTip * 0.9 + crossConsultTipAmount); // 90% tip cá nhân + 20% tip khi tư vấn cho CV khác
    comboCommCurrent = currentRole === 'CV_PLUS' ? Math.round(6 * singleComboBonus) : 0;
    // CVLL: combo cá nhân + combo tư vấn chéo hộ CV khác khi FM vắng
    comboCommNext = Math.round(expectedCombosPerMonth * singleComboBonus + crossConsultComboAmount);
  } else if (currentRole === 'CV_PLUS') {
    wageCurrent = hourlyWages.cvPlus;
    wageNext = hourlyWages.cvPlusPlus;
    tipShareCurrent = Math.round(customerTotalTip * 0.9);
    tipShareNext = Math.round(customerTotalTip * 0.9 + 500000); // Cross-consult
    comboCommCurrent = Math.round(predictedComboCount * singleComboBonus);
    comboCommNext = Math.round(predictedComboCount * singleComboBonus + 800000);
  } else if (currentRole === 'CV_PLUS_PLUS') {
    wageCurrent = hourlyWages.cvPlusPlus;
    wageNext = 0;
    tipShareCurrent = Math.round(customerTotalTip * 0.9 + 500000);
    tipShareNext = Math.round(customerTotalTip * 0.2); // FM package tip
  }

  const wageGain = Math.max(0, (wageNext - wageCurrent) * actualWorkingHours);
  const tipGain = Math.max(0, tipShareNext - tipShareCurrent);
  const comboGain = Math.max(0, comboCommNext - comboCommCurrent);

  const cvXoayAllowance = 2500000;
  const fallbackCurrentIncome = wageCurrent * actualWorkingHours + tipShareCurrent + comboCommCurrent + cvXoayAllowance;
  const currentEstimatedIncome =
    currentRole === 'FM'
      ? 8000000 + ccBonusCash + Math.round(totalTip * 0.2) + 2000000
      : currentRole === 'CHO'
        ? 11000000 + 3000000 + 3500000
        : payrollGrossIncome > 0
          ? payrollGrossIncome
          : fallbackCurrentIncome;

  const incomeGain =
    currentRole === 'CV' || isCvPlusPlusTarget
      ? wageGain + tipGain + comboGain + monthlySerumIncome
      : Math.max(0, wageGain + tipGain + comboGain);

  const nextTierEstimatedIncome =
    currentRole === 'CV' || isCvPlusPlusTarget
      ? currentEstimatedIncome + incomeGain
      : currentRole === 'CV_PLUS'
        ? wageNext * actualWorkingHours + tipShareNext + comboCommNext + 3000000
        : currentRole === 'CV_PLUS_PLUS'
          ? 8000000 + 2000000 + Math.round(customerTotalTip * 0.2) + 1500000
          : currentRole === 'FM'
            ? 11000000 + 3000000 + 3500000
            : currentEstimatedIncome * 1.5;

  return {
    currentEstimatedIncome,
    nextTierEstimatedIncome,
    incomeGain,
    details: {
      currentGrossIncome: payrollGrossIncome > 0 ? payrollGrossIncome : currentEstimatedIncome,
      currentNetIncome: payrollNetIncome > 0 ? payrollNetIncome : Math.round(currentEstimatedIncome * 0.9),
      payrollBonusAmount,
      socialSecurityAmount: payrollSocialSecurity,
      payrollWageAmount,
      payrollTipAmount,
      payrollAllowanceAmount,
      payrollWorkingHours,
      payrollHourlyRate,
      payrollDate,
      payrollMonthLabel,
      hourlyWageCurrent: wageCurrent,
      hourlyWageNext: wageNext,
      tipShareCurrent,
      tipShareNext,
      comboCommissionCurrent: comboCommCurrent,
      comboCommissionNext: comboCommNext,
      wageGain,
      tipGain,
      comboGain,
      monthlyEstimatedHours: actualWorkingHours,
      actualWorkingHours,
      monthlyTipAvg: actualTipReceived,
      actualTipReceived,
      customerTotalTip,
      monthlySelfComboRev,
      predictedComboCount,
      potentialComboCustomers,
      avgComboPrice,
      serumCommissionAmount,
      minComboRequired,
      expectedSerumsPerWeek,
      expectedSerumsPerMonth,
      serumCommissionPerItem: serumCommissionAmount,
      monthlySerumIncome,
      expectedCombosPerMonth,
      crossConsultTipRate,
      crossConsultTipAmount,
      expectedCrossConsultOrdersPerMonth,
      crossConsultCommissionRate,
      crossConsultComboAmount,
      expectedCrossConsultCombosPerMonth,
      singleComboBonus,
      serumOriginalPriceBonus,
      serumDiscountedPriceBonus,
      serumDeepDiscountPriceBonus,
      serumFreePriceBonus,
      crossConsultCvShareRate,
      crossConsultCvSharedAmount,
    },
  };
}
