import type {
  SafeAny,
  TelesaleDailyActionOverview,
  TelesaleDailyActionStatus,
  TelesaleDailySnapshotItem,
  TelesaleStaffDailyAction,
  TelesaleStaffTarget,
  TelesaleTargetConfigDto,
} from '@mos-lab/shared';
import type { StaffCandidateSummary } from './overview-data-loader.js';

export function buildStaffTargets(params: {
  allStaffCandidates: StaffCandidateSummary[];
  monthDoneLeaderboard: SafeAny[];
  todayBookingLeaderboard: SafeAny[];
  monthRevenueLeaderboard: SafeAny[];
  monthOrders: SafeAny[];
  todayDoneOrders: SafeAny[];
  todayCheckinOrders: SafeAny[];
  todayBookOrders: SafeAny[];
  comboSoldMap: Map<number, number>;
  comboRevenueMap: Map<number, number>;
  teamDailyBookActual: number;
  pacing: {
    periodStatus: string;
    workDaysTotal: number;
    workDaysRemaining: number;
    expectedProgressRate: number;
  };
  config: TelesaleTargetConfigDto;
  staffAvatarMap: Map<number, string | null>;
  staffNameMap: Map<number, string>;
}): TelesaleStaffTarget[] {
  const {
    allStaffCandidates,
    monthDoneLeaderboard,
    todayBookingLeaderboard,
    monthRevenueLeaderboard,
    monthOrders,
    todayDoneOrders,
    todayCheckinOrders,
    todayBookOrders,
    comboSoldMap,
    comboRevenueMap,
    teamDailyBookActual,
    pacing,
    config,
    staffAvatarMap,
    staffNameMap,
  } = params;

  // 4. Map staffTargets directly from BK Leaderboard results (Single Source of Truth)
  const staffTargets: TelesaleStaffTarget[] = allStaffCandidates.map((st) => {
    const staffMonthDone = monthDoneLeaderboard.find((l) => Number(l.bookerId) === Number(st.legacyStaffId));
    const staffTodayBooking = todayBookingLeaderboard.find((l) => Number(l.bookerId) === Number(st.legacyStaffId));
    const staffMonthRev = monthRevenueLeaderboard.find((l) => Number(l.bookerId) === Number(st.legacyStaffId));

    const rawStaffDone = staffMonthDone?.doneCount || 0;
    const staffBookToday = staffTodayBooking?.totalCreatedBookings || 0;
    const staffCallActualToday = staffTodayBooking?.callCount || 0;
    const staffPickupActualToday = staffTodayBooking?.pickupCount || 0;
    const staffRevenueActual = staffMonthRev?.totalRevenue || 0;

    const staffComboOrders = monthOrders.filter(
      (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 1
    );
    const staffComboLiveDoneActual = staffComboOrders.length;
    const staffComboSoldActual = comboSoldMap.get(Number(st.legacyStaffId)) || 0;
    const staffComboRevenueActual = comboRevenueMap.get(Number(st.legacyStaffId)) || 0;
    // Individual Done KPI is 100% Single Done (Done Khách Lẻ)
    const staffSingleDoneActual = Math.max(0, rawStaffDone - staffComboLiveDoneActual);

    // Today Done: strictly Single Done as primary KPI, Combo Live as secondary
    const staffTodayComboCount = todayDoneOrders.filter(
      (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 1
    ).length;
    const staffSingleDoneToday = todayDoneOrders.filter(
      (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 0
    ).length;

    // Today Check-in: Single Check-in as primary, Combo Live as secondary
    const staffTodayComboCheckinCount = todayCheckinOrders.filter(
      (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 1
    ).length;
    const staffSingleCheckinToday = todayCheckinOrders.filter(
      (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 0
    ).length;

    const staffTodayComboBookCount = todayBookOrders.filter(
      (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 1
    ).length;

    const bookContributionPercent =
      teamDailyBookActual > 0 ? Math.round((staffBookToday / teamDailyBookActual) * 100) : 0;

    // Metrics for individual KPI (Done) - strictly based on staffSingleDoneActual
    let staffExpectedDone: number;
    let staffGapDone: number;
    let staffRemainingDone: number;
    let staffDailyRequiredDone: number;
    let progressStatus: 'NOT_STARTED' | 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'CRITICAL';
    let progressStatusLabel: string;

    if (pacing.periodStatus === 'NOT_STARTED') {
      staffExpectedDone = 0;
      staffGapDone = 0;
      staffRemainingDone = st.doneTarget;
      staffDailyRequiredDone = pacing.workDaysTotal > 0 ? Number((st.doneTarget / pacing.workDaysTotal).toFixed(1)) : 0;
      progressStatus = 'NOT_STARTED';
      progressStatusLabel = 'Chưa bắt đầu';
    } else {
      staffExpectedDone = Math.round(st.doneTarget * pacing.expectedProgressRate);
      staffGapDone = staffSingleDoneActual - staffExpectedDone;
      staffRemainingDone = Math.max(0, st.doneTarget - staffSingleDoneActual);

      if (pacing.periodStatus === 'IN_PROGRESS') {
        staffDailyRequiredDone =
          pacing.workDaysRemaining > 0 ? Number((staffRemainingDone / pacing.workDaysRemaining).toFixed(1)) : 0;
      } else {
        staffDailyRequiredDone = 0;
      }

      if (staffGapDone > 0) {
        progressStatus = 'AHEAD';
        progressStatusLabel = 'Vượt tiến độ';
      } else if (staffGapDone >= -1) {
        progressStatus = 'ON_TRACK';
        progressStatusLabel = 'Đúng tiến độ';
      } else if (staffGapDone <= -5 || (staffExpectedDone > 0 && staffSingleDoneActual / staffExpectedDone < 0.7)) {
        progressStatus = 'CRITICAL';
        progressStatusLabel = 'Báo động';
      } else {
        progressStatus = 'BEHIND';
        progressStatusLabel = 'Chậm tiến độ';
      }
    }

    const resolvedAvatar = staffAvatarMap.get(st.legacyStaffId) || st.avatarUrl || null;
    const resolvedName = staffNameMap.get(st.legacyStaffId) || st.name;

    return {
      legacyStaffId: st.legacyStaffId,
      name: resolvedName,
      avatarUrl: resolvedAvatar,
      doneTarget: st.doneTarget,
      doneActual: staffSingleDoneActual,
      comboLiveDoneActual: staffComboLiveDoneActual,
      comboSoldActual: staffComboSoldActual,
      comboRevenueActual: staffComboRevenueActual,
      retailDoneActual: staffSingleDoneActual,
      doneToday: staffSingleDoneToday,
      retailDoneToday: staffSingleDoneToday,
      checkinToday: staffSingleCheckinToday,
      checkinActual: staffSingleCheckinToday,
      comboLiveCheckinToday: staffTodayComboCheckinCount,
      bookToday: staffBookToday,
      bookContributionPercent,
      comboLiveDoneToday: staffTodayComboCount,
      comboLiveBookToday: staffTodayComboBookCount,
      callTargetDaily: config.dailyCallPerStaff || 83,
      callActualToday: staffCallActualToday,
      pickupTargetDaily: config.dailyPickupPerStaff || 25,
      pickupActualToday: staffPickupActualToday,
      revenueActual: staffRevenueActual,
      expectedDone: staffExpectedDone,
      gapDone: staffGapDone,
      remainingDone: staffRemainingDone,
      dailyRequiredDone: staffDailyRequiredDone,
      progressStatus,
      progressStatusLabel,
    };
  });

  // Mark Top Book staff member with tie-breaker on Check-in/Done
  const maxBookToday = Math.max(0, ...staffTargets.map((s) => s.bookToday || 0));
  const topBookers = staffTargets.filter((s) => maxBookToday > 0 && (s.bookToday || 0) === maxBookToday);
  const maxCheckinAmongTopBookers = Math.max(0, ...topBookers.map((s) => s.checkinToday ?? s.doneToday ?? 0));

  for (const st of staffTargets) {
    const isMaxBook = maxBookToday > 0 && (st.bookToday || 0) === maxBookToday;
    const isMaxCheckin = (st.checkinToday ?? st.doneToday ?? 0) === maxCheckinAmongTopBookers;
    st.isTopBookToday = isMaxBook && isMaxCheckin;
  }

  return staffTargets;
}

export function buildDailyActionOverview(params: {
  config: TelesaleTargetConfigDto;
  allStaffCandidates: StaffCandidateSummary[];
  shiftRows: SafeAny[];
  workingShiftMap: Map<number, boolean>;
  shiftDetailMap: Map<number, { isWorking: boolean; shiftLabel: string }>;
  todayBookingRes: SafeAny;
  staffNameMap: Map<number, string>;
  teamDailyBookActual: number;
}): TelesaleDailyActionOverview {
  const {
    config,
    allStaffCandidates,
    shiftRows,
    workingShiftMap,
    shiftDetailMap,
    todayBookingRes,
    staffNameMap,
    teamDailyBookActual,
  } = params;

  // 7. Ô Hành Động Mỗi Ngày tập trung vào Call và Pickup (MOS-BUG-77)
  const callTargetPerStaff = config.dailyCallPerStaff || 83;
  const pickupTargetPerStaff = config.dailyPickupPerStaff || 25;

  const staffActions: TelesaleStaffDailyAction[] = allStaffCandidates.map((st) => {
    const isWorkingToday = shiftRows.length === 0 ? true : (workingShiftMap.get(st.legacyStaffId) ?? false);
    const staffTodayBooking = todayBookingRes.leaderboard.find((l: SafeAny) => l.bookerId === st.legacyStaffId);
    const callActual = staffTodayBooking?.callCount || 0;
    const pickupActual = staffTodayBooking?.pickupCount || 0;
    const resolvedName = staffNameMap.get(st.legacyStaffId) || st.name;

    if (!isWorkingToday) {
      return {
        legacyStaffId: st.legacyStaffId,
        name: resolvedName,
        isWorkingToday: false,
        callTarget: 0,
        callActual,
        callPercent: 0,
        callGap: 0,
        pickupTarget: 0,
        pickupActual,
        pickupPercent: 0,
        pickupGap: 0,
        overallPercent: 0,
        status: 'OFF' as TelesaleDailyActionStatus,
        statusLabel: 'Nghỉ',
        shiftLabel: '🏖️ Nghỉ ca',
      };
    }

    const shiftInfo = shiftDetailMap.get(st.legacyStaffId);
    const shiftLabel = shiftInfo?.shiftLabel || '☀️ Trực ca';
    const callTarget = callTargetPerStaff;
    const pickupTarget = pickupTargetPerStaff;
    const callPercent = callTarget > 0 ? Number(((callActual / callTarget) * 100).toFixed(1)) : 0;
    const callGap = callActual - callTarget;
    const pickupPercent = pickupTarget > 0 ? Number(((pickupActual / pickupTarget) * 100).toFixed(1)) : 0;
    const pickupGap = pickupActual - pickupTarget;
    const overallPercent = Number(((callPercent + pickupPercent) / 2).toFixed(1));

    let status: TelesaleDailyActionStatus;
    let statusLabel: string;
    if (overallPercent >= 100) {
      status = 'EXCEEDED';
      statusLabel = 'Vượt';
    } else if (overallPercent >= 80) {
      status = 'ACHIEVED';
      statusLabel = 'Đạt';
    } else if (overallPercent >= 50) {
      status = 'BEHIND';
      statusLabel = 'Chậm';
    } else {
      status = 'ALARM';
      statusLabel = 'Báo động';
    }

    return {
      legacyStaffId: st.legacyStaffId,
      name: resolvedName,
      isWorkingToday: true,
      callTarget,
      callActual,
      callPercent,
      callGap,
      pickupTarget,
      pickupActual,
      pickupPercent,
      pickupGap,
      overallPercent,
      status,
      statusLabel,
      shiftLabel,
    };
  });

  const workingStaffList = staffActions.filter((s) => s.isWorkingToday);
  const teamCallTarget = workingStaffList.reduce((sum, s) => sum + s.callTarget, 0);
  const teamCallActual = todayBookingRes.summary.totalCalls;
  const teamCallPercent = teamCallTarget > 0 ? Number(((teamCallActual / teamCallTarget) * 100).toFixed(1)) : 0;
  const teamCallGap = teamCallActual - teamCallTarget;

  const teamPickupTarget = workingStaffList.reduce((sum, s) => sum + s.pickupTarget, 0);
  const teamPickupActual = todayBookingRes.summary.totalPickups;
  const teamPickupPercent = teamPickupTarget > 0 ? Number(((teamPickupActual / teamPickupTarget) * 100).toFixed(1)) : 0;
  const teamPickupGap = teamPickupActual - teamPickupTarget;

  return {
    callTargetPerStaff,
    pickupTargetPerStaff,
    teamCallTarget,
    teamCallActual,
    teamCallPercent,
    teamCallGap,
    teamPickupTarget,
    teamPickupActual,
    teamPickupPercent,
    teamPickupGap,
    staffActions,
    bookTargetPerDay: config.dailyBookTarget,
    totalCallsToday: teamCallActual,
    totalBookingsToday: teamDailyBookActual,
  };
}

export function buildDailySnapshots(params: {
  month: string;
  monthNumStr: string;
  todayStr: string;
  lastDayOfMonth: number;
  config: TelesaleTargetConfigDto;
  dailyBookMap: Map<string, number>;
  dailyCheckinMap: Map<string, number>;
}): TelesaleDailySnapshotItem[] {
  const { month, monthNumStr, todayStr, lastDayOfMonth, config, dailyBookMap, dailyCheckinMap } = params;
  const dailySnapshots: TelesaleDailySnapshotItem[] = [];
  const isCurrentMonth = todayStr.startsWith(month);
  // Loại trừ ngày hôm nay (chỉ lấy các ngày đã qua từ hôm qua trở về trước vì hôm nay đã có ở 2 đồng hồ trên)
  const maxDayNum = isCurrentMonth ? parseInt(todayStr.slice(8, 10), 10) - 1 : lastDayOfMonth;
  const targetDailyBook = config.dailyBookTarget || 25;
  const targetDailyCheckin = config.dailyDoneTarget || 18;

  for (let day = 1; day <= maxDayNum; day++) {
    const dayPad = String(day).padStart(2, '0');
    const dateStr = `${month}-${dayPad}`;

    const bookActual = dailyBookMap.get(dateStr) || 0;
    const checkinActual = dailyCheckinMap.get(dateStr) || 0;

    const bookPercent = targetDailyBook > 0 ? Math.round((bookActual / targetDailyBook) * 100) : 0;
    const checkinPercent = targetDailyCheckin > 0 ? Math.round((checkinActual / targetDailyCheckin) * 100) : 0;

    const getTier = (pct: number): 'rose' | 'amber' | 'emerald' => {
      if (pct < 80) return 'rose';
      if (pct < 100) return 'amber';
      return 'emerald';
    };

    dailySnapshots.push({
      date: dateStr,
      dayDisplay: `${dayPad}/${monthNumStr}`,
      bookActual,
      bookTarget: targetDailyBook,
      bookPercent,
      bookTier: getTier(bookPercent),
      checkinActual,
      checkinTarget: targetDailyCheckin,
      checkinPercent,
      checkinTier: getTier(checkinPercent),
      isToday: false,
    });
  }

  // Sắp xếp mới nhất lên đầu (từ hôm qua lùi dần về ngày 01)
  dailySnapshots.sort((a, b) => b.date.localeCompare(a.date));
  return dailySnapshots;
}
