import { CcPaystubRecord, CcPaystubResponse, SafeAny, calculateWheelBonusCap } from '@mos-lab/shared';
import { CcPaystubIndexedData, buildSocialSecurityBreakdown, parseTrackingData } from './cc-paystub.helpers.js';

function buildSingleCcPaystubRecord(
  s: SafeAny,
  indexed: CcPaystubIndexedData,
  minigameBaseMap: Map<number, number>
): CcPaystubRecord {
  const uid = Number(s.userId);

  // Exact rate from DB staff_payroll or default 25k
  const rate = indexed.hourlyRatesMap.get(uid) || 25000;

  // Settled payroll info from Legacy staff_payroll if available (only if finalized/completed)
  const sp = indexed.staffPayrollMap.get(uid);
  const isPayrollCompleted = sp?.date_completed != null;
  const settledHours =
    isPayrollCompleted && sp?.total_working_hour != null && Number(sp.total_working_hour) > 0
      ? Number(sp.total_working_hour)
      : null;
  const settledWage =
    isPayrollCompleted && sp?.total_wage_amount != null && Number(sp.total_wage_amount) > 0
      ? Number(sp.total_wage_amount)
      : null;

  const userFilteredDays = indexed.reportDaysByStaff.get(uid) || [];
  const userOffDayDates = indexed.userOffDayWorkDatesMap.get(uid) || new Set<string>();
  const holidayWorkedDates = indexed.holidayWorkedDateMap.get(uid) || new Set<string>();

  let offDaysWorkHours = 0;
  let offDaysWorked = 0;
  userFilteredDays.forEach((r) => {
    const dayHours = Number(r.working_minute || 0) / 60;
    const isOffDayWork = userOffDayDates.has(r.dateStr) && !holidayWorkedDates.has(r.dateStr);
    if (isOffDayWork) {
      offDaysWorked += 1;
      offDaysWorkHours += dayHours;
    }
  });
  offDaysWorkHours = Math.round(offDaysWorkHours * 100) / 100;

  const legacyOffWeekExtra = indexed.legacyOffWeekExtraMap.get(uid);
  const offDaysWorkWage =
    sp?.total_overtime_daytime_off_week_amount != null && Number(sp.total_overtime_daytime_off_week_amount) > 0
      ? Math.round(Number(sp.total_overtime_daytime_off_week_amount))
      : legacyOffWeekExtra != null
        ? legacyOffWeekExtra
        : Math.round(offDaysWorkHours * rate);

  // Exact work hours from staff_working_shift / settled payroll
  let totalWorkHours: number;
  const shiftData = indexed.shiftHoursMap.get(uid);
  if (settledHours != null) {
    totalWorkHours = Math.round(settledHours * 100) / 100;
  } else if (shiftData && shiftData.hours > 0) {
    totalWorkHours = Math.round(shiftData.hours * 100) / 100;
  } else {
    const days = indexed.workDaysMap.get(uid) || 0;
    totalWorkHours = days * 8;
  }

  const hourlyWage = settledWage != null ? Math.round(settledWage) : Math.round(totalWorkHours * rate);

  const xoayInfo = indexed.xoayMap.get(uid) || { count: 0, bonus: 0 };
  const dailyBonusInfo = indexed.staffDailyBonusTotals.get(uid) || {
    bonus: 0,
    comboQty: 0,
    productQty: 0,
    greenVisits: 0,
  };
  const greenVisits = dailyBonusInfo.greenVisits || 0;
  const greenComboConversionRate =
    greenVisits > 0 ? Math.min(100, Math.round((dailyBonusInfo.comboQty / greenVisits) * 100)) : 0;

  const capResult = calculateWheelBonusCap(dailyBonusInfo.bonus, xoayInfo.bonus);
  const ccXoayBonus = capResult.effectiveWheelBonus;
  const ccXoayHoldBonus = Math.max(0, capResult.rawWheelBonus - ccXoayBonus);

  const rawMinigameBonus = minigameBaseMap.get(uid) || 0;
  const minigameBonus = rawMinigameBonus;

  const ccTipInfo = indexed.ccTipMap.get(uid) || { bonus: 0, count: 0 };
  const ccTipBonus = ccTipInfo.bonus;
  const holiday = indexed.holidayBreakdownMap.get(uid)!;

  // Month-off leave pay
  const monthOffList = indexed.monthOffLeavesMap.get(uid) || [];
  const offMonthDays =
    sp?.total_day_off_month != null && Number(sp.total_day_off_month) > 0
      ? Number(sp.total_day_off_month)
      : monthOffList.reduce((sum, item) => sum + item.workingDayCount, 0);
  const offMonthWage =
    sp?.total_off_month_amount != null && Number(sp.total_off_month_amount) > 0
      ? Math.round(Number(sp.total_off_month_amount))
      : monthOffList.reduce((sum, item) => {
          const hours = item.shiftHours || 9;
          return sum + Math.round(item.workingDayCount * hours * rate);
        }, 0);

  const expectedWorkDays = Number(sp?.total_working_day_expected || 26);
  const expectedWorkHours = Number(sp?.total_working_hour_expected || expectedWorkDays * 8);
  const weeklyOffDays = Number(sp?.total_day_off_week || 4);
  const activeDays = userFilteredDays.length > 0 ? userFilteredDays.length : indexed.workDaysMap.get(uid) || 0;

  const parkingAllowance = Math.min(200000, Math.round((200000 / (expectedWorkDays || 26)) * (activeDays || 0)));
  const parkingCalculation = `200.000đ / ${expectedWorkDays || 26} * ${activeDays || 0}`;

  const otherAllowancesDetails = indexed.extraSupportDetailsMap.get(uid) || [];
  const otherAllowances = indexed.extraSupportMap.get(uid) || 0;
  const trainingMentorshipDetails = indexed.mentorBreakdownsByCc.get(uid) || [];
  const trainingMentorshipBonus = trainingMentorshipDetails.reduce((sum, item) => sum + item.mentorTotalBonus, 0);

  const totalTimeBonus = Math.round((offDaysWorkWage || 0) + (holiday.holidayPremiumPay || 0));

  const totalIncome = Math.round(
    hourlyWage +
      offDaysWorkWage +
      offMonthWage +
      ccXoayBonus +
      dailyBonusInfo.bonus +
      minigameBonus +
      ccTipBonus +
      otherAllowances +
      parkingAllowance +
      holiday.holidayPaystubAdjustment +
      trainingMentorshipBonus
  );

  const trackingData = parseTrackingData(sp?.tracking_key);

  const socialSecurityRate = Number(sp?.social_security_rate || 0);
  const socialSecurityAmount = Math.round(Number(sp?.total_social_security_amount || 0));
  const netIncome = Math.round(totalIncome - socialSecurityAmount);

  const ssBreakdown = buildSocialSecurityBreakdown(socialSecurityAmount, socialSecurityRate, trackingData);

  const penalties = Math.round(
    Number(sp?.total_extra_punish_amount || 0) + Number(sp?.total_punish_credit_balance_amount || 0)
  );
  const dayOffAvailable = Number(sp?.day_off_available != null ? sp.day_off_available : 26);
  const congratulationMessage =
    'Chúc mừng bạn đã hoàn thành xuất sắc ca làm việc! Tiếp tục bùng nổ doanh số và chăm sóc khách hàng chu đáo nhé! 🌟';

  return {
    consultantId: uid,
    displayName: s.fullName,
    fullName: s.fullName,
    avatar: String(s.avatar || '') || null,
    store: s.store,
    hourlyWage,
    totalWorkHours,
    hourlyRate: rate,
    rawCcXoayBonus: capResult.rawWheelBonus,
    ccXoayHoldBonus,
    ccXoayBonus,
    checkinCount: xoayInfo.count,
    comboProductBonus: dailyBonusInfo.bonus,
    comboCount: dailyBonusInfo.comboQty,
    greenVisits,
    greenComboConversionRate,
    productCount: dailyBonusInfo.productQty,
    minigameBonus,
    rawMinigameBonus: capResult.rawWheelBonus,
    monthlyDailyBonus: capResult.monthlyDailyBonus,
    maxWheelBonusAllowed: capResult.maxWheelBonusAllowed,
    wheelCapPercent: capResult.wheelCapPercent,
    capStatus: capResult.capStatus,
    ccTipBonus,
    tippedVisitsCount: ccTipInfo.count,
    extraSupport: otherAllowances,
    extraSupportNote: otherAllowancesDetails.map((d) => d.description).join('; '),
    trainingMentorshipBonus,
    trainingMentorshipDetails: trainingMentorshipDetails.length > 0 ? trainingMentorshipDetails : undefined,
    ...holiday,
    totalIncome,

    // Chi tiết chuẩn cấu trúc giống CV
    expectedWorkDays,
    expectedWorkHours,
    weeklyOffDays,
    activeDays,
    offDaysWorked,
    offDaysWorkHours,
    offDaysWorkWage,
    totalTimeBonus,
    offMonthDays,
    offMonthWage,
    offMonthLeaveDetails: monthOffList,
    parkingAllowance,
    parkingCalculation,
    otherAllowances,
    otherAllowancesDetails,
    penalties,
    socialSecurityRate,
    socialSecurityAmount,
    socialSecurityBreakdown: ssBreakdown,
    netIncome,
    congratulationMessage,
    dayOffAvailable,
  };
}

export function buildCcPaystubResponse(
  filteredStaffProfiles: SafeAny[],
  indexed: CcPaystubIndexedData
): CcPaystubResponse {
  // Minigame chưa có — set 0 cho tất cả CC.
  const minigameBaseMap = new Map<number, number>();

  let summaryHourly = 0;
  let summaryXoay = 0;
  let summaryComboProd = 0;
  let summaryMinigame = 0;
  let summaryCcTip = 0;
  let summaryExtraSupport = 0;
  let summaryHolidayBase = 0;
  let summaryHolidayPremium = 0;
  let summaryHolidayAddition = 0;
  let summaryTimeBonus = 0;
  let summaryParkingAllowance = 0;
  let summaryOffMonthWage = 0;
  let summaryTrainingMentorship = 0;
  let summaryTotalIncome = 0;
  let summarySocialSecurity = 0;
  let summaryNetIncome = 0;

  const records: CcPaystubRecord[] = filteredStaffProfiles.map((s) => {
    const record = buildSingleCcPaystubRecord(s, indexed, minigameBaseMap);

    summaryHourly += record.hourlyWage;
    summaryXoay += record.ccXoayBonus;
    summaryComboProd += record.comboProductBonus;
    summaryMinigame += record.minigameBonus;
    summaryCcTip += record.ccTipBonus;
    summaryExtraSupport += record.extraSupport || 0;
    summaryHolidayBase += record.holidayBasePay;
    summaryHolidayPremium += record.holidayPremiumPay;
    summaryHolidayAddition += record.holidayPayrollAddition;
    summaryTimeBonus += record.totalTimeBonus || 0;
    summaryParkingAllowance += record.parkingAllowance || 0;
    summaryOffMonthWage += record.offMonthWage || 0;
    summaryTrainingMentorship += record.trainingMentorshipBonus || 0;
    summaryTotalIncome += record.totalIncome;
    summarySocialSecurity += record.socialSecurityAmount || 0;
    summaryNetIncome += record.netIncome || 0;

    return record;
  });

  // Sort by total income descending
  records.sort((a, b) => b.totalIncome - a.totalIncome);

  return {
    data: records,
    total: records.length,
    summary: {
      totalHourlyWage: summaryHourly,
      totalCcXoayBonus: summaryXoay,
      totalComboProductBonus: summaryComboProd,
      totalMinigameBonus: summaryMinigame,
      totalCcTipBonus: summaryCcTip,
      totalExtraSupport: summaryExtraSupport,
      totalHolidayBasePay: summaryHolidayBase,
      totalHolidayPremiumPay: summaryHolidayPremium,
      totalHolidayPayrollAddition: summaryHolidayAddition,
      totalTimeBonus: summaryTimeBonus,
      totalParkingAllowance: summaryParkingAllowance,
      totalOffMonthWage: summaryOffMonthWage,
      totalTrainingMentorshipBonus: summaryTrainingMentorship,
      grandTotalIncome: summaryTotalIncome,
      totalSocialSecurityAmount: summarySocialSecurity,
      grandTotalNetIncome: summaryNetIncome,
    },
  };
}
