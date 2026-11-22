import { FastifyInstance } from 'fastify';
import {
  CvOtherAllowanceItem,
  CvPlusRewardSnapshot,
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  SafeAny,
} from '@mos-lab/shared';
import { CareerProgressionService } from '../../../career/career.service.js';
import {
  CvPaystubIndexedData,
  CvPaystubRawSources,
  CvTipSummary,
  CvXoaySummary,
  DEFAULT_SENIORITY_BONUS_RULES,
  MonthOffLeaveItem,
  SeniorityBonusRule,
  SocialSecurityInfo,
  computeBatchOffDayWorkDates,
} from './cv-paystub.helpers.js';

export async function indexPaystubSources(
  fastify: FastifyInstance,
  validStaffIds: number[],
  startPart: string,
  endPart: string,
  sources: CvPaystubRawSources
): Promise<CvPaystubIndexedData> {
  // Fetch crm_staff to get joinedAt and seniorityOffset
  const crmStaffMap = new Map<number, { joinedAt: Date; seniorityOffset: number }>();
  sources.crmStaffs.forEach((s) => {
    if (s.legacyStaffId) {
      crmStaffMap.set(s.legacyStaffId, {
        joinedAt: s.joinedAt || new Date(),
        seniorityOffset: s.seniorityOffset || 0,
      });
    }
  });

  // Load Seniority Bonus Config
  let seniorityBonusConfig: SeniorityBonusRule[] = [...DEFAULT_SENIORITY_BONUS_RULES];
  try {
    if (sources.seniorityConfigRecord?.value) {
      const parsed = JSON.parse(sources.seniorityConfigRecord.value);
      if (Array.isArray(parsed)) {
        seniorityBonusConfig = parsed;
      }
    }
  } catch {
    fastify.log.warn('Could not parse CV_SENIORITY_BONUS_CONFIG, using default list.');
  }
  const sortedSeniorityBonusRules = [...seniorityBonusConfig].sort((a, b) => b.minMonths - a.minMonths);

  const extraSupportDetailsMap = new Map<number, CvOtherAllowanceItem[]>();
  const extraSupportMap = new Map<number, number>();

  // 1. Phụ cấp linh hoạt do mOS quản lý (cho phép thêm bớt trực tiếp, có thể âm hoặc dương)
  sources.mosAllowances.forEach((a) => {
    const uid = a.staffId;
    const list = extraSupportDetailsMap.get(uid) || [];
    list.push({
      id: a.id,
      description: a.title,
      amount: a.amount,
      note: a.note || null,
      source: 'mos',
      createdAt: a.createdAt.toISOString(),
    });
    extraSupportDetailsMap.set(uid, list);
    extraSupportMap.set(uid, (extraSupportMap.get(uid) || 0) + a.amount);
  });

  const legacyOffWeekExtraMap = new Map<number, number>();

  // 2. Phụ cấp lịch sử từ legacy staff_payroll_extra (nếu có)
  sources.extraSupportRows.forEach((r: SafeAny) => {
    const uid = Number(r.user_id);
    const desc = String(r.description || '').trim();
    const amt = Math.round(Number(r.amount || 0));
    // Skip seniority bonus entries that are dynamically handled
    if (/thâm niên|seniority/i.test(desc)) return;
    // Track off-week overtime entries separately to avoid duplicate counting with offDaysWorkWage
    if (/off tuần|làm off/i.test(desc)) {
      legacyOffWeekExtraMap.set(uid, (legacyOffWeekExtraMap.get(uid) || 0) + amt);
      return;
    }
    extraSupportMap.set(uid, (extraSupportMap.get(uid) || 0) + amt);
    const list = extraSupportDetailsMap.get(uid) || [];
    list.push({
      id: `legacy-${uid}-${list.length}`,
      description: desc || 'Phụ cấp khác',
      amount: amt,
      source: 'legacy',
    });
    extraSupportDetailsMap.set(uid, list);
  });

  const techPointsMap = new Map<number, number>();
  sources.techPointsRows.forEach((r: SafeAny) => {
    techPointsMap.set(Number(r.staff_id), Number(r.total_points || 0));
  });

  const hourlyRateMap = new Map<number, number>();
  const socialSecurityMap = new Map<number, SocialSecurityInfo>();
  const staffPayrollMap = new Map<number, SafeAny>();

  sources.contractRatesRows.forEach((r: SafeAny) => {
    const uid = Number(r.user_id);
    hourlyRateMap.set(uid, Number(r.working_hour_rate || 21500));
    socialSecurityMap.set(uid, {
      rate: Number(r.social_security_rate || 0),
      amount: 0,
    });
  });

  sources.periodPayrollRows.forEach((r: SafeAny) => {
    const uid = Number(r.user_id);
    staffPayrollMap.set(uid, r);
    if (r.working_hour_rate) {
      hourlyRateMap.set(uid, Number(r.working_hour_rate));
    }
    socialSecurityMap.set(uid, {
      rate: Number(r.social_security_rate || 0),
      amount: Number(r.total_social_security_amount || 0),
    });
  });

  const staffDayOffMap = new Map<number, Set<number>>();
  sources.staffOffDayBatchMap.forEach((info, uid) => {
    staffDayOffMap.set(uid, new Set(info.weeklyOffDays));
  });

  const userOffDayWorkDatesMap = computeBatchOffDayWorkDates(sources.reportStaffRows, staffDayOffMap);

  const cvXoayMap = new Map<number, CvXoaySummary>();
  sources.cvXoayBonusRows.forEach((r: SafeAny) => {
    cvXoayMap.set(Number(r.staff_id), {
      bonus: Math.round(Number(r.total_bonus || 0)),
      serviceCount: Number(r.service_count || 0),
    });
  });

  const cvTipMap = new Map<number, CvTipSummary>();
  sources.cvTipBonusRows.forEach((r: SafeAny) => {
    const totalTip = Math.round(Number(r.total_cv_tip || 0));
    const baseTechTip = Math.min(totalTip, Math.round(Number(r.base_tech_tip ?? r.total_cv_tip ?? 0)));
    const consultDeltaTip = Math.max(0, totalTip - baseTechTip);
    cvTipMap.set(Number(r.staff_id), { totalTip, baseTechTip, consultDeltaTip });
  });
  // Cộng hoàn trả phần Tip tư vấn/checkout (+10%/+20%) mà CC bấm giùm cho Mentee CVL trong kỳ Training (Điều răn CC-006)
  for (const [menteeId, transferredTip] of sources.transferredTrainingTipMap.entries()) {
    if (transferredTip <= 0) continue;
    const current = cvTipMap.get(menteeId) || { totalTip: 0, baseTechTip: 0, consultDeltaTip: 0 };
    cvTipMap.set(menteeId, {
      totalTip: current.totalTip + transferredTip,
      baseTechTip: current.baseTechTip,
      consultDeltaTip: current.consultDeltaTip + transferredTip,
    });
  }

  const monthOffLeavesMap = new Map<number, MonthOffLeaveItem[]>();
  sources.monthOffLeavesRows.forEach((r: SafeAny) => {
    const uid = Number(r.staff_id);
    const list = monthOffLeavesMap.get(uid) || [];
    list.push({
      date: String(r.dateStr),
      workingDayCount: Number(r.working_day_count || 1),
      shiftHours: Number(r.shift_hours || 9),
      note: r.note ? String(r.note) : null,
    });
    monthOffLeavesMap.set(uid, list);
  });

  // reportStaffRows already contains the requested range plus the week boundaries used
  // for off-day detection. Group the requested rows once instead of scanning it per CV.
  const reportDaysByStaff = new Map<number, SafeAny[]>();
  sources.reportStaffRows.forEach((row: SafeAny) => {
    if (row.dateStr >= startPart && row.dateStr <= endPart) {
      const staffId = Number(row.staff_id);
      const days = reportDaysByStaff.get(staffId) || [];
      days.push(row);
      reportDaysByStaff.set(staffId, days);
    }
  });

  let careerRules = DEFAULT_CAREER_PROGRESSION_CONFIG;
  try {
    if (sources.careerConfigRecord?.value) {
      careerRules = JSON.parse(sources.careerConfigRecord.value);
    }
  } catch {
    careerRules = DEFAULT_CAREER_PROGRESSION_CONFIG;
  }
  const cvToCvPlusConfig = careerRules.cvToCvPlus || DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCvPlus;

  const cvPlusStaffMap = new Map<number, SafeAny>();
  (sources.cvPlusProgressions || []).forEach((p: SafeAny) => {
    if (p.staff?.legacyStaffId) {
      cvPlusStaffMap.set(p.staff.legacyStaffId, p);
    }
  });
  const validStaffSet = new Set(validStaffIds);
  for (const pair of sources.activeTrainingPairs) {
    if (validStaffSet.has(pair.menteeLegacyStaffId) && !cvPlusStaffMap.has(pair.menteeLegacyStaffId)) {
      cvPlusStaffMap.set(pair.menteeLegacyStaffId, {
        staffId: pair.menteeLegacyStaffId,
        staff: { legacyStaffId: pair.menteeLegacyStaffId },
      });
    }
  }

  // Pre-calculate CVL reward snapshots for all active CVL staff (chế độ kỳ lương thực tế ACTUAL_PAYROLL)
  const cvPlusRewardMap = new Map<number, CvPlusRewardSnapshot>();
  await Promise.all(
    Array.from(cvPlusStaffMap.entries()).map(async ([legacyStaffId, progression]) => {
      try {
        const snapshot = await CareerProgressionService.calculateCvPlusRewardsForStaff(
          fastify,
          progression.staffId,
          { startStr: `${startPart} 00:00:00`, endStr: `${endPart} 23:59:59` },
          false,
          { mode: 'ACTUAL_PAYROLL' }
        );
        cvPlusRewardMap.set(legacyStaffId, snapshot);
      } catch (err) {
        fastify.log.warn({ err, legacyStaffId }, 'Error calculating cvPlus rewards');
      }
    })
  );

  return {
    crmStaffMap,
    sortedSeniorityBonusRules,
    extraSupportDetailsMap,
    extraSupportMap,
    legacyOffWeekExtraMap,
    techPointsMap,
    hourlyRateMap,
    socialSecurityMap,
    staffPayrollMap,
    userOffDayWorkDatesMap,
    cvXoayMap,
    cvTipMap,
    monthOffLeavesMap,
    reportDaysByStaff,
    holidayBreakdownMap: sources.holidayBreakdownMap,
    holidayWorkedDateMap: sources.holidayWorkedDateMap,
    cvToCvPlusConfig,
    cvPlusRewardMap,
  };
}
