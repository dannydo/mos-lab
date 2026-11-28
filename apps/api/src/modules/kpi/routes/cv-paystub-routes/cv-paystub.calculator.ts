import {
  CvPaystubRecord,
  CvPaystubResponse,
  CvPlusPaystubBreakdown,
  SafeAny,
  getVietnamDateYmd,
  resolveCvlTrainingLifecycleStatus,
} from '@mos-lab/shared';
import {
  CvPaystubIndexedData,
  buildSocialSecurityBreakdown,
  calculateSeniorityMonths,
  parseTrackingData,
  resolveSeniorityBonusPercent,
} from './cv-paystub.helpers.js';

function buildSingleCvPaystubRecord(staff: SafeAny, endPart: string, indexed: CvPaystubIndexedData): CvPaystubRecord {
  const staffId = Number(staff.userId);
  const hourlyRate = indexed.hourlyRateMap.get(staffId) || 21500;
  const userFilteredDays = indexed.reportDaysByStaff.get(staffId) || [];

  let totalWorkHours = 0;
  let regularHours = 0;
  let regularHourlyWage = 0;
  let offDaysWorkHours = 0;
  let offDaysWorked = 0;
  const activeDays = userFilteredDays.length;

  const userOffDayDates = indexed.userOffDayWorkDatesMap.get(staffId) || new Set<string>();
  const holidayWorkedDates = indexed.holidayWorkedDateMap.get(staffId) || new Set<string>();

  const sp = indexed.staffPayrollMap.get(staffId);
  const trackingData = parseTrackingData(sp?.tracking_key);
  const expectedWorkDays = Number(sp?.total_working_day_expected || 26);

  userFilteredDays.forEach((r) => {
    const dayHours = Number(r.working_minute || 0) / 60;
    totalWorkHours += dayHours;
    regularHours += dayHours;
    regularHourlyWage += Math.round(dayHours * hourlyRate);
    const isOffDayWork = userOffDayDates.has(r.dateStr) && !holidayWorkedDates.has(r.dateStr);
    if (isOffDayWork) {
      offDaysWorked += 1;
      offDaysWorkHours += dayHours;
    }
  });

  totalWorkHours = Math.round(totalWorkHours * 100) / 100;
  regularHours = Math.round(regularHours * 100) / 100;
  offDaysWorkHours = Math.round(offDaysWorkHours * 100) / 100;
  const legacyOffWeekExtra = indexed.legacyOffWeekExtraMap.get(staffId);
  const isPayrollCompleted = sp?.date_completed != null;
  const offDaysWorkWage =
    isPayrollCompleted &&
    sp?.total_overtime_daytime_off_week_amount != null &&
    Number(sp.total_overtime_daytime_off_week_amount) > 0
      ? Math.round(Number(sp.total_overtime_daytime_off_week_amount))
      : legacyOffWeekExtra != null
        ? legacyOffWeekExtra
        : Math.round(offDaysWorkHours * hourlyRate); // Thêm 1 lần đơn giá giờ (+1x)
  const hourlyWage =
    isPayrollCompleted && sp?.total_wage_amount != null
      ? Math.round(Number(sp.total_wage_amount))
      : Math.round(totalWorkHours * hourlyRate);

  const xoayData = indexed.cvXoayMap.get(staffId) || { bonus: 0, serviceCount: 0 };
  const cvXoayBonus = xoayData.bonus;
  const serviceCount = xoayData.serviceCount;

  const tipData = indexed.cvTipMap.get(staffId) || { totalTip: 0, baseTechTip: 0, consultDeltaTip: 0 };
  let cvTipBonus = tipData.totalTip;

  // Calculate Seniority anchored to the end date of the payroll period (endPart)
  const legacyJoinedAt = staff.date_created ? new Date(staff.date_created) : new Date();
  const crmInfo = indexed.crmStaffMap.get(staffId);
  const joinedAt = crmInfo?.joinedAt || legacyJoinedAt;
  const offset = crmInfo?.seniorityOffset || 0;
  const seniorityMonths = calculateSeniorityMonths(joinedAt, offset, endPart);

  // Apply Seniority Bonus percentage on CV Xoay Bonus
  const appliedBonusPercent = resolveSeniorityBonusPercent(seniorityMonths, indexed.sortedSeniorityBonusRules);
  // Seniority Bonus is calculated directly from CV Xoay Bonus and applied percentage
  const seniorityBonus = Math.round((cvXoayBonus * appliedBonusPercent) / 100);

  const totalPoints = indexed.techPointsMap.get(staffId) || 0;
  const techLevel = Math.floor(totalPoints / 100) + 1;
  const holiday = indexed.holidayBreakdownMap.get(staffId)!;

  const parkingAllowance = Math.min(200000, Math.round((200000 / (expectedWorkDays || 26)) * (activeDays || 0)));
  // Month-off leave pay (honor approved staff_payroll amount or calculate by scheduled shift hours: 9h for regular shift, 11h for full shift)
  const monthOffList = indexed.monthOffLeavesMap.get(staffId) || [];
  const offMonthDays =
    sp?.total_day_off_month != null && Number(sp.total_day_off_month) > 0
      ? Number(sp.total_day_off_month)
      : monthOffList.reduce((sum, item) => sum + item.workingDayCount, 0);
  const offMonthWage =
    sp?.total_off_month_amount != null && Number(sp.total_off_month_amount) > 0
      ? Math.round(Number(sp.total_off_month_amount))
      : monthOffList.reduce((sum, item) => {
          const hours = item.shiftHours || 9;
          return sum + Math.round(item.workingDayCount * hours * hourlyRate);
        }, 0);

  // Other allowances (Phụ cấp khác) from mOS additions and legacy staff_payroll_extra
  const extraDetails = indexed.extraSupportDetailsMap.get(staffId) || [];
  const otherAllowances = indexed.extraSupportMap.get(staffId) || 0;

  // Holiday paid leave pay (nghỉ lễ 2/9 tách riêng dòng độc lập per HR decision, chỉ cộng vào phiếu lương nếu legacy staff_payroll có ghi nhận)
  const holidayPaidLeavePay = Number(sp?.total_off_public_holiday_amount || 0);
  const holidayPaystubAdjustment = holidayPaidLeavePay;

  // Quyền lợi Chuyên Viên Tự Chủ (CVL) theo Điều răn CV-002 & CAREER_PROGRESSION_RULES
  const cvPlusSnapshot = indexed.cvPlusRewardMap.get(staffId);
  let cvPlusBreakdown: CvPlusPaystubBreakdown | null = null;
  let isCvPlus = false;

  if (cvPlusSnapshot) {
    isCvPlus = true;
    const cvReq = indexed.cvToCvPlusConfig;
    const targetComboRate = cvReq.minSelfComboRate ?? 0.2;
    const isUnlocked = cvPlusSnapshot.isTargetHit;
    const targetWage = cvReq.hourlyWage || 27500;
    const wageDiffPerHour = Math.max(0, targetWage - hourlyRate);
    const deltaHourlyWage = isUnlocked ? Math.round(regularHours * wageDiffPerHour) : 0;
    // Tip thực nhận từ sổ staff_tip: tách phần 70% kỹ thuật cơ sở và phần +10%/+20% tư vấn/checkout thực tế (tránh nhân trùng 2/7 lên dòng 90%)
    cvTipBonus = tipData.baseTechTip;
    const deltaTipBonus = tipData.consultDeltaTip;
    const comboBonusTotal = isUnlocked ? cvPlusSnapshot.comboBonusTotal : 0;
    const debtCollectionBonusTotal = isUnlocked ? cvPlusSnapshot.debtCollectionBonusTotal || 0 : 0;
    const serumBonusTotal = isUnlocked ? cvPlusSnapshot.productBonusTotal : 0;
    const totalAdditionalIncome =
      deltaHourlyWage + deltaTipBonus + comboBonusTotal + debtCollectionBonusTotal + serumBonusTotal;

    cvPlusBreakdown = {
      isCvPlus: true,
      targetComboRate,
      actualComboRate: cvPlusSnapshot.selfComboRate,
      comboLiveOrders: cvPlusSnapshot.comboLiveOrders,
      notComboLiveOrders: cvPlusSnapshot.notComboLiveOrders,
      combosSoldCount: cvPlusSnapshot.comboSoldCount,
      isUnlocked,
      deltaHourlyWage,
      deltaTipBonus,
      comboBonusTotal,
      debtCollectionBonusTotal,
      debtCollectionCount: cvPlusSnapshot.debtCollectionCount || 0,
      debtCollectedAmount: cvPlusSnapshot.debtCollectedAmount || 0,
      serumBonusTotal,
      serumsSoldCount: cvPlusSnapshot.serumsSoldCount || 0,
      totalAdditionalIncome,
      comboDetails: (cvPlusSnapshot.comboDetails ?? []).map((detail) => ({
        orderId: detail.orderId,
        orderCode: detail.orderCode ?? '',
        orderDate: detail.orderDate,
        customerName: detail.customerName,
        comboName: detail.comboName ?? '',
        price: detail.price,
        grossPrice: detail.grossPrice,
        unpaidDebtAmount: detail.unpaidDebtAmount,
        bonus: detail.bonus,
        comboCount: detail.comboCount,
        comboItems: detail.comboItems,
        shareFactor: detail.shareFactor,
        consultRole: detail.consultRole,
      })),
      debtCollectionDetails: cvPlusSnapshot.debtCollectionDetails ?? [],
    };
  }

  const trainingMentorshipDetails = indexed.mentorBreakdownsByStaff.get(staffId) || [];
  const trainingMentorshipBonus = trainingMentorshipDetails.reduce((sum, item) => sum + item.mentorTotalBonus, 0);

  const hasMentorshipHistory = (indexed.allTrainingPairs || []).some((p) => p.menteeLegacyStaffId === staffId);
  const officialRole = indexed.officialCvlRoleMap.get(staffId);
  const lifecycle =
    isCvPlus || hasMentorshipHistory
      ? resolveCvlTrainingLifecycleStatus({
          legacyStaffId: staffId,
          currentRole: officialRole,
          pairs: indexed.allTrainingPairs || [],
          todayYmd: getVietnamDateYmd(),
        })
      : null;
  const activeOrPendingPair = lifecycle?.activePair || lifecycle?.pendingPair;
  const cvlTrainingStatus =
    lifecycle &&
    (lifecycle.status === 'TRAINING' || lifecycle.status === 'PENDING_GRADUATION' || lifecycle.status === 'OFFICIAL')
      ? lifecycle.status
      : null;

  const effectiveHourlyRate =
    isCvPlus && cvPlusBreakdown?.isUnlocked ? indexed.cvToCvPlusConfig.hourlyWage || 27500 : hourlyRate;
  const effectiveHourlyWage = hourlyWage + (cvPlusBreakdown?.deltaHourlyWage || 0);
  const effectiveCvTipBonus = cvTipBonus + (cvPlusBreakdown?.deltaTipBonus || 0);

  const totalIncome = Math.round(
    effectiveHourlyWage +
      offDaysWorkWage +
      cvXoayBonus +
      effectiveCvTipBonus +
      seniorityBonus +
      otherAllowances +
      holidayPaystubAdjustment +
      parkingAllowance +
      offMonthWage +
      trainingMentorshipBonus +
      (cvPlusBreakdown
        ? cvPlusBreakdown.comboBonusTotal +
          (cvPlusBreakdown.debtCollectionBonusTotal || 0) +
          cvPlusBreakdown.serumBonusTotal
        : 0)
  );

  // Social Security deduction (10.5% for employee)
  const ssInfo = indexed.socialSecurityMap.get(staffId) || { rate: 0, amount: 0 };
  const socialSecurityRate = ssInfo.rate;
  const socialSecurityAmount = ssInfo.amount;
  const netIncome = Math.round(totalIncome - socialSecurityAmount);

  const totalTimeBonus = Math.round((offDaysWorkWage || 0) + (holiday.holidayPremiumPay || 0));

  const expectedWorkHours = Number(sp?.total_working_hour_expected || expectedWorkDays * 9);
  const weeklyOffDays = Number(sp?.total_day_off_week || 4);
  const weeklyOffWorkedDays = offDaysWorked || 0;
  const weeklyOffPay = Number(sp?.total_off_week_amount || 0);
  const fullTimeWage = Number(sp?.total_overtime_daytime_amount || 0);
  const holidayOffDays = holiday.holidayPaidLeaveDays || Number(sp?.total_day_off_public_holiday || 0);
  const holidayPay = holidayPaidLeavePay;
  const overLeaveDays = Number(sp?.total_day_off_punish || 0);
  const overLeaveDeduction = Math.round(Number(sp?.total_off_punish_amount || 0));
  const unpaidLeaveDays =
    sp?.total_day_off_program != null && Number(sp.total_day_off_program) > 0
      ? Number(sp.total_day_off_program)
      : Math.max(0, expectedWorkDays - activeDays - offMonthDays - holidayOffDays);
  const totalBaseWage = Math.round(
    hourlyWage + fullTimeWage + weeklyOffPay + offMonthWage + holidayPay - overLeaveDeduction
  );
  const previousMonthAddition = Math.round(Number(sp?.total_extra_last_month_amount || 0));
  const penalties = Math.round(
    Number(sp?.total_extra_punish_amount || 0) + Number(sp?.total_punish_credit_balance_amount || 0)
  );
  const welfareFund = Math.round(Number(sp?.total_welfare_fund_amount || 0));
  const advancePayment = Math.round(Number(sp?.total_extra_advance_amount || 0));
  const dayOffAvailable = Number(sp?.day_off_available != null ? sp.day_off_available : 26);
  const congratulationMessage =
    sp?.staff_payroll_level?.message_congratulation ||
    'Chúc mừng bạn đã thành Đùi Gà ngon ngon. Tháng sau biến hình Thiên Thần nhé!';

  const ssBreakdown = buildSocialSecurityBreakdown(socialSecurityAmount, socialSecurityRate, trackingData);

  return {
    staffId,
    staffName: String(staff.fullName || ''),
    fullName: String(staff.fullName || ''),
    avatar: String(staff.avatar || '') || null,
    store: String(staff.store || 'PXL'),
    totalWorkHours,
    regularHours,
    regularHourlyWage,
    hourlyRate: effectiveHourlyRate,
    hourlyWage: effectiveHourlyWage,
    cvXoayBonus,
    cvTipBonus: effectiveCvTipBonus,
    totalIncome,
    isCvPlus,
    cvPlusBreakdown,
    trainingMentorshipBonus,
    trainingMentorshipDetails: trainingMentorshipDetails.length > 0 ? trainingMentorshipDetails : undefined,
    cvlTrainingStatus,
    cvlTrainingMentorName: activeOrPendingPair?.mentorDisplayName || null,
    cvlTrainingPairId: activeOrPendingPair?.id || null,
    serviceCount,
    seniorityMonths,
    seniorityBonus,
    seniorityBonusPercent: appliedBonusPercent,
    techLevel,
    activeDays,
    offDaysWorked,
    offDaysWorkHours,
    offDaysWorkWage,
    totalTimeBonus,
    socialSecurityRate,
    socialSecurityAmount,
    parkingAllowance,
    netIncome,
    offMonthDays,
    offMonthWage,
    offMonthLeaveDetails: monthOffList,
    ...holiday,
    holidayPaystubAdjustment,
    expectedWorkHours,
    expectedWorkDays,
    fullTimeWage,
    weeklyOffDays,
    weeklyOffWorkedDays,
    weeklyOffPay,
    holidayOffDays,
    holidayPay,
    overLeaveDays,
    overLeaveDeduction,
    unpaidLeaveDays,
    totalBaseWage,
    parkingCalculation: `200.000đ / ${expectedWorkDays} * ${activeDays}`,
    otherAllowances,
    otherAllowancesDetails: extraDetails,
    previousMonthAddition,
    penalties,
    welfareFund,
    advancePayment,
    socialSecurityBreakdown: ssBreakdown,
    guaranteedIncome: 0,
    dayOffAvailable,
    congratulationMessage,
  };
}

export function buildCvPaystubResponse(
  filteredStaffProfiles: SafeAny[],
  endPart: string,
  indexed: CvPaystubIndexedData
): CvPaystubResponse {
  let grandTotalHourlyWage = 0;
  let grandTotalCvXoayBonus = 0;
  let grandTotalCvTipBonus = 0;
  let grandTotalSeniorityBonus = 0;
  let grandTotalHolidayBasePay = 0;
  let grandTotalHolidayPremiumPay = 0;
  let grandTotalHolidayPayrollAddition = 0;
  let grandTotalTimeBonus = 0;
  let grandTotalParkingAllowance = 0;
  let grandTotalOffMonthWage = 0;
  let grandTotalIncome = 0;
  let grandTotalSocialSecurityAmount = 0;
  let grandTotalNetIncome = 0;
  let grandTotalTrainingMentorshipBonus = 0;

  const records: CvPaystubRecord[] = filteredStaffProfiles.map((staff) => {
    const record = buildSingleCvPaystubRecord(staff, endPart, indexed);

    grandTotalHourlyWage += record.hourlyWage;
    grandTotalCvXoayBonus += record.cvXoayBonus;
    grandTotalCvTipBonus += record.cvTipBonus;
    grandTotalSeniorityBonus += record.seniorityBonus || 0;
    grandTotalHolidayBasePay += record.holidayBasePay;
    grandTotalHolidayPremiumPay += record.holidayPremiumPay;
    grandTotalHolidayPayrollAddition += record.holidayPay || 0;
    grandTotalTimeBonus += record.totalTimeBonus || 0;
    grandTotalParkingAllowance += record.parkingAllowance || 0;
    grandTotalOffMonthWage += record.offMonthWage || 0;
    grandTotalIncome += record.totalIncome;
    grandTotalSocialSecurityAmount += record.socialSecurityAmount || 0;
    grandTotalNetIncome += record.netIncome || 0;
    grandTotalTrainingMentorshipBonus += record.trainingMentorshipBonus || 0;

    return record;
  });

  // Sort by total income descending
  records.sort((a, b) => b.totalIncome - a.totalIncome);

  return {
    data: records,
    total: records.length,
    summary: {
      totalHourlyWage: grandTotalHourlyWage,
      totalCvXoayBonus: grandTotalCvXoayBonus,
      totalCvTipBonus: grandTotalCvTipBonus,
      totalSeniorityBonus: grandTotalSeniorityBonus,
      totalHolidayBasePay: grandTotalHolidayBasePay,
      totalHolidayPremiumPay: grandTotalHolidayPremiumPay,
      totalHolidayPayrollAddition: grandTotalHolidayPayrollAddition,
      totalTimeBonus: grandTotalTimeBonus,
      totalParkingAllowance: grandTotalParkingAllowance,
      totalOffMonthWage: grandTotalOffMonthWage,
      grandTotalIncome,
      totalSocialSecurityAmount: grandTotalSocialSecurityAmount,
      grandTotalNetIncome,
      totalTrainingMentorshipBonus: grandTotalTrainingMentorshipBonus,
    },
  };
}
