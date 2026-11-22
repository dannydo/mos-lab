import { CvOtherAllowanceItem, SafeAny } from '@mos-lab/shared';
import { summarizeCcLedgerXoayForPaystub } from '../../services/cc-kpi.service.js';
import {
  CcDailyBonusTotal,
  CcMonthOffLeaveItem,
  CcPaystubIndexedData,
  CcPaystubRawSources,
  CcShiftHoursSummary,
  CcTipSummary,
  computeBatchOffDayWorkDates,
} from './cc-paystub.helpers.js';

export function indexCcPaystubSources(
  validStaffIds: number[],
  startPart: string,
  endPart: string,
  sources: CcPaystubRawSources
): CcPaystubIndexedData {
  const extraSupportDetailsMap = new Map<number, CvOtherAllowanceItem[]>();
  const extraSupportMap = new Map<number, number>();

  // 1. Phụ cấp linh hoạt do mOS quản lý
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

  // 2. Phụ cấp lịch sử từ legacy staff_payroll_extra
  sources.extraSupportRows.forEach((r: SafeAny) => {
    const uid = Number(r.user_id);
    const desc = String(r.description || '').trim();
    const amt = Math.round(Number(r.amount || 0));
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

  const ccTipMap = new Map<number, CcTipSummary>();
  sources.ccTipRows.forEach((r) =>
    ccTipMap.set(Number(r.staff_id), {
      bonus: Math.round(Number(r.cc_tip_bonus || 0)),
      count: Number(r.tipped_visits_count || 0),
    })
  );

  const hourlyRatesMap = new Map<number, number>();
  sources.contractRatesRows.forEach((r) => {
    hourlyRatesMap.set(Number(r.user_id), Number(r.working_hour_rate || 25000));
  });

  const staffPayrollMap = new Map<number, SafeAny>();
  sources.periodPayrollRows.forEach((r) => {
    const uid = Number(r.user_id);
    staffPayrollMap.set(uid, r);
    if (r.working_hour_rate) {
      hourlyRatesMap.set(uid, Number(r.working_hour_rate));
    }
  });

  const shiftHoursMap = new Map<number, CcShiftHoursSummary>();
  sources.shiftsRows.forEach((r) =>
    shiftHoursMap.set(Number(r.staff_id), {
      days: Number(r.active_days || 0),
      hours: Number(r.total_work_hours || 0),
    })
  );

  const workDaysMap = new Map<number, number>();
  sources.workDaysRows.forEach((r) => workDaysMap.set(Number(r.staff_id), Number(r.active_days || 0)));

  const staffDayOffMap = new Map<number, Set<number>>();
  sources.staffOffDayBatchMap.forEach((info, uid) => {
    staffDayOffMap.set(uid, new Set(info.weeklyOffDays));
  });

  const userOffDayWorkDatesMap = computeBatchOffDayWorkDates(sources.reportStaffRows, staffDayOffMap);

  const monthOffLeavesMap = new Map<number, CcMonthOffLeaveItem[]>();
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

  const reportDaysByStaff = new Map<number, SafeAny[]>();
  sources.reportStaffRows.forEach((row: SafeAny) => {
    if (row.dateStr >= startPart && row.dateStr <= endPart) {
      const staffId = Number(row.staff_id);
      const days = reportDaysByStaff.get(staffId) || [];
      days.push(row);
      reportDaysByStaff.set(staffId, days);
    }
  });

  const xoayMap = summarizeCcLedgerXoayForPaystub(sources.xoayReportResult?.data || []);

  // Compute Daily Sales Bonus per staff from CcKpiService (Single Source of Truth)
  const staffDailyBonusTotals = new Map<number, CcDailyBonusTotal>();
  validStaffIds.forEach((id) => staffDailyBonusTotals.set(id, { bonus: 0, comboQty: 0, productQty: 0 }));

  if (sources.dailySalesResult && Array.isArray(sources.dailySalesResult.data)) {
    sources.dailySalesResult.data.forEach((r: SafeAny) => {
      const uid = Number(r.user_id);
      if (staffDailyBonusTotals.has(uid)) {
        const item = staffDailyBonusTotals.get(uid)!;
        item.bonus += Math.round(Number(r.daily_bonus || 0));
        item.comboQty += Number(r.combo_count || 0);
        item.productQty += Number(r.product_count || 0);
      }
    });
  }

  return {
    extraSupportDetailsMap,
    extraSupportMap,
    legacyOffWeekExtraMap,
    ccTipMap,
    hourlyRatesMap,
    staffPayrollMap,
    shiftHoursMap,
    workDaysMap,
    userOffDayWorkDatesMap,
    monthOffLeavesMap,
    reportDaysByStaff,
    xoayMap,
    staffDailyBonusTotals,
    holidayBreakdownMap: sources.holidayBreakdownMap,
    holidayWorkedDateMap: sources.holidayWorkedDateMap,
    mentorBreakdownsByCc: sources.mentorBreakdownsByCc,
  };
}
