import {
  BkGameParticipant,
  BkGameTeamBookingDoneBonusConfig,
  BkGameTeamBookingDoneBonusDailyResult,
  BkGameTeamBookingDoneBonusRecord,
  BkGameTeamBookingDoneBonusStaffDay,
  BkGameTeamBookingDoneBonusStaffTotal,
  BkGameTeamBookingDoneBonusSummary,
} from '@mos-lab/shared';
import { formatVietnameseDateLabel, resolveTeamBookingDoneTier } from './team-bonus-config.js';

export interface CompletedOrderCandidate {
  orderId: number;
  orderKey: string | null;
  staffId: number;
  customerName: string | null;
  completedAt: Date | string;
  completedDate: string;
}

export interface QualifiedTeamBookingDoneLedgerItem {
  orderId: number;
  orderKey: string | null;
  staffId: number;
  customerName: string | null;
  rewardDate: string;
  teamBookings: number;
  tierLabel: string;
  bonusPerDone: number;
  bonusAmount: number;
  orderCompletedAt: Date;
}

export function aggregateTeamBookingDoneBonusData(params: {
  gameId: number;
  config: BkGameTeamBookingDoneBonusConfig;
  effectiveWindow: { start: string; end: string } | null;
  dailyList: string[];
  todayStr: string;
  dailyTeamBookingsMap: Map<string, number>;
  completedOrders: CompletedOrderCandidate[];
  comboLiveMap: Map<number, boolean>;
  participants: BkGameParticipant[];
  frozenRecords?: BkGameTeamBookingDoneBonusRecord[];
}): {
  summary: BkGameTeamBookingDoneBonusSummary;
  qualifiedLedgerItems: QualifiedTeamBookingDoneLedgerItem[];
} {
  const {
    gameId,
    config,
    effectiveWindow,
    dailyList,
    todayStr,
    dailyTeamBookingsMap,
    completedOrders,
    comboLiveMap,
    participants,
    frozenRecords,
  } = params;

  const isFrozenMode = Array.isArray(frozenRecords) && frozenRecords.length > 0;
  const frozenByOrderId = new Map<number, BkGameTeamBookingDoneBonusRecord>();
  if (isFrozenMode) {
    for (const r of frozenRecords) {
      frozenByOrderId.set(r.orderId, r);
    }
  }

  // Deduplicate orders across the entire game ("Mỗi Done hợp lệ chỉ được thưởng một lần trong Game")
  const seenOrderIds = new Set<number>();
  const singleDoneByDayStaff = new Map<string, Map<number, number>>();
  const comboDoneByDayStaff = new Map<string, Map<number, number>>();
  const qualifiedLedgerItems: QualifiedTeamBookingDoneLedgerItem[] = [];
  const computedRecords: BkGameTeamBookingDoneBonusRecord[] = [];

  for (const ord of completedOrders) {
    const orderId = Number(ord.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0 || seenOrderIds.has(orderId)) continue;
    seenOrderIds.add(orderId);

    const dStr = ord.completedDate;
    if (!dailyList.includes(dStr)) continue;

    const staffId = Number(ord.staffId);
    const isCombo = comboLiveMap.get(orderId) === true;
    if (isCombo) {
      const dayComboMap = comboDoneByDayStaff.get(dStr) || new Map<number, number>();
      dayComboMap.set(staffId, (dayComboMap.get(staffId) || 0) + 1);
      comboDoneByDayStaff.set(dStr, dayComboMap);
      continue;
    }

    const daySingleMap = singleDoneByDayStaff.get(dStr) || new Map<number, number>();
    daySingleMap.set(staffId, (daySingleMap.get(staffId) || 0) + 1);
    singleDoneByDayStaff.set(dStr, daySingleMap);

    const teamBookings = dailyTeamBookingsMap.get(dStr) || 0;
    const resolvedTier = resolveTeamBookingDoneTier(teamBookings, config.tiers);

    const frozen = frozenByOrderId.get(orderId);
    const effectiveBonusPerDone = frozen ? frozen.bonusPerDone : resolvedTier.bonusPerDone;
    const effectiveBonusAmount = frozen ? frozen.bonusAmount : resolvedTier.bonusPerDone;
    const effectiveTierLabel = frozen ? frozen.tierLabel : resolvedTier.tierLabel;
    const effectiveTeamBookings = frozen ? frozen.teamBookings : teamBookings;
    const effectiveRewardDate = frozen ? frozen.rewardDate : dStr;

    const completedAtDate = ord.completedAt instanceof Date ? ord.completedAt : new Date(ord.completedAt);

    if (effectiveBonusAmount > 0) {
      qualifiedLedgerItems.push({
        orderId,
        orderKey: ord.orderKey || `#${orderId}`,
        staffId,
        customerName: ord.customerName || 'Khách hàng',
        rewardDate: effectiveRewardDate,
        teamBookings: effectiveTeamBookings,
        tierLabel: effectiveTierLabel,
        bonusPerDone: effectiveBonusPerDone,
        bonusAmount: effectiveBonusAmount,
        orderCompletedAt: completedAtDate,
      });

      const participant = participants.find((p) => p.staffId === staffId);
      computedRecords.push({
        id: frozen?.id ?? orderId,
        gameId,
        orderId,
        orderKey: ord.orderKey || `#${orderId}`,
        staffId,
        staffName: participant?.staffName || frozen?.staffName || `Nhân viên #${staffId}`,
        customerName: ord.customerName || frozen?.customerName || 'Khách hàng',
        rewardDate: effectiveRewardDate,
        teamBookings: effectiveTeamBookings,
        tierLabel: effectiveTierLabel,
        bonusPerDone: effectiveBonusPerDone,
        bonusAmount: effectiveBonusAmount,
        orderCompletedAt: !isNaN(completedAtDate.getTime()) ? completedAtDate.toISOString() : null,
        createdAt: frozen?.createdAt || new Date().toISOString(),
      });
    }
  }

  // If frozen records exist for orders that might have fallen outside live query (edge protection),
  // ensure any unvisited frozen records are still counted in totals/records.
  if (isFrozenMode) {
    for (const r of frozenRecords) {
      if (!seenOrderIds.has(r.orderId)) {
        seenOrderIds.add(r.orderId);
        computedRecords.push(r);
        if (dailyList.includes(r.rewardDate)) {
          const daySingleMap = singleDoneByDayStaff.get(r.rewardDate) || new Map<number, number>();
          daySingleMap.set(r.staffId, (daySingleMap.get(r.staffId) || 0) + 1);
          singleDoneByDayStaff.set(r.rewardDate, daySingleMap);
        }
      }
    }
  }

  const staffTotalMap = new Map<number, { singleDoneCount: number; totalBonus: number }>();
  for (const p of participants) {
    staffTotalMap.set(p.staffId, { singleDoneCount: 0, totalBonus: 0 });
  }

  let totalSingleDone = 0;
  let totalComboDoneExcluded = 0;
  let totalBonus = 0;

  const dailyResults: BkGameTeamBookingDoneBonusDailyResult[] = dailyList.map((dStr) => {
    const teamBookings = dailyTeamBookingsMap.get(dStr) || 0;
    const tier = resolveTeamBookingDoneTier(teamBookings, config.tiers);
    const daySingleMap = singleDoneByDayStaff.get(dStr) || new Map<number, number>();
    const dayComboMap = comboDoneByDayStaff.get(dStr) || new Map<number, number>();

    let daySingleDone = 0;
    let dayComboExcluded = 0;
    let dayTotalBonus = 0;

    const staffBreakdown: BkGameTeamBookingDoneBonusStaffDay[] = participants.map((p) => {
      const sCount = daySingleMap.get(p.staffId) || 0;
      const cCount = dayComboMap.get(p.staffId) || 0;

      // If frozen records exist for this day + staff, sum frozen amounts; otherwise sCount * tier.bonusPerDone
      let staffDayBonus = sCount * tier.bonusPerDone;
      if (isFrozenMode) {
        staffDayBonus = computedRecords
          .filter((r) => r.rewardDate === dStr && r.staffId === p.staffId)
          .reduce((sum, r) => sum + r.bonusAmount, 0);
      }

      daySingleDone += sCount;
      dayComboExcluded += cCount;
      dayTotalBonus += staffDayBonus;

      const curTotal = staffTotalMap.get(p.staffId) || { singleDoneCount: 0, totalBonus: 0 };
      curTotal.singleDoneCount += sCount;
      curTotal.totalBonus += staffDayBonus;
      staffTotalMap.set(p.staffId, curTotal);

      return {
        staffId: p.staffId,
        staffName: p.staffName,
        avatar: p.avatar,
        singleDoneCount: sCount,
        comboDoneExcludedCount: cCount,
        bonusPerDone: tier.bonusPerDone,
        totalBonus: staffDayBonus,
      };
    });

    staffBreakdown.sort(
      (a, b) =>
        b.totalBonus - a.totalBonus || b.singleDoneCount - a.singleDoneCount || a.staffName.localeCompare(b.staffName)
    );

    totalSingleDone += daySingleDone;
    totalComboDoneExcluded += dayComboExcluded;
    totalBonus += dayTotalBonus;

    return {
      date: dStr,
      dateLabel: formatVietnameseDateLabel(dStr),
      teamBookings,
      tierLabel: tier.tierLabel,
      matchedMinBookings: tier.matchedMinBookings,
      bonusPerDone: tier.bonusPerDone,
      totalSingleDone: daySingleDone,
      totalComboDoneExcluded: dayComboExcluded,
      totalDayBonus: dayTotalBonus,
      isToday: dStr === todayStr,
      isFuture: dStr > todayStr,
      staffBreakdown,
    };
  });

  const staffTotals: BkGameTeamBookingDoneBonusStaffTotal[] = participants
    .map((p) => {
      const stat = staffTotalMap.get(p.staffId) || { singleDoneCount: 0, totalBonus: 0 };
      return {
        staffId: p.staffId,
        staffName: p.staffName,
        avatar: p.avatar,
        singleDoneCount: stat.singleDoneCount,
        totalBonus: stat.totalBonus,
      };
    })
    .sort(
      (a, b) =>
        b.totalBonus - a.totalBonus || b.singleDoneCount - a.singleDoneCount || a.staffName.localeCompare(b.staffName)
    );

  const todayResult = dailyResults.find((r) => r.isToday);
  const fallbackTier = resolveTeamBookingDoneTier(0, config.tiers);
  const todayTier = todayResult ? resolveTeamBookingDoneTier(todayResult.teamBookings, config.tiers) : fallbackTier;

  return {
    summary: {
      config,
      effectiveTimeWindow: effectiveWindow ? `${effectiveWindow.start} - ${effectiveWindow.end}` : null,
      todayDate: todayStr,
      todayTeamBookings: todayResult ? todayResult.teamBookings : 0,
      todayTierLabel: todayResult ? todayResult.tierLabel : fallbackTier.tierLabel,
      todayBonusPerDone: todayResult ? todayResult.bonusPerDone : 0,
      todaySingleDone: todayResult ? todayResult.totalSingleDone : 0,
      todayTotalBonus: todayResult ? todayResult.totalDayBonus : 0,
      nextTierMinBookings: todayTier.nextTierMinBookings,
      nextTierBonusPerDone: todayTier.nextTierBonusPerDone,
      bookingsToNextTier: todayTier.bookingsToNextTier,
      totalSingleDone,
      totalComboDoneExcluded,
      totalBonus,
      staffTotals,
      dailyResults,
      records: computedRecords,
    },
    qualifiedLedgerItems,
  };
}
