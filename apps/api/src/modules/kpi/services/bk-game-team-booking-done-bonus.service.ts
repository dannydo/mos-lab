import { FastifyInstance } from 'fastify';
import {
  BkGameParticipant,
  BkGameTeamBookingDoneBonusConfig,
  BkGameTeamBookingDoneBonusDailyResult,
  BkGameTeamBookingDoneBonusRecord,
  BkGameTeamBookingDoneBonusStaffDay,
  BkGameTeamBookingDoneBonusStaffTotal,
  BkGameTeamBookingDoneBonusSummary,
  BkGameTeamBookingDoneTier,
  BkGameTeamKpiConfig,
  SafeAny,
} from '@mos-lab/shared';
import { ComboRecognitionService } from '../../customers/services/combo-recognition.service.js';

const DAY_NAME_LABELS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function formatIctDateTimeLocal(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const datePart = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const timePart = date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
  return `${datePart} ${timePart}`;
}

function formatIctDateLocal(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function parseChannelsLocal(val?: string | string[] | null): string[] | null {
  if (!val) return null;
  if (Array.isArray(val)) {
    const list = val.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
    return list.length > 0 ? list : null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const list = parsed.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
        return list.length > 0 ? list : null;
      }
    } catch {
      // Fallback to comma-separated string
    }
    const list = trimmed
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    return list.length > 0 ? list : null;
  }
  return null;
}

function buildChannelFilterLocal(allowedChannels?: string[] | null, columnRef = 'o.booking_channels'): string {
  if (!allowedChannels || allowedChannels.length === 0) return '';
  const escaped = allowedChannels
    .map((ch) => `'${ch.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')}'`)
    .filter((c) => c !== "''")
    .join(', ');
  return escaped ? `AND UPPER(${columnRef}) IN (${escaped})` : '';
}

function parseTeamKpiConfigLocal(val?: string | BkGameTeamKpiConfig | null): BkGameTeamKpiConfig | null {
  if (!val) return null;
  if (typeof val === 'object' && val !== null && typeof val.dailyTarget === 'number') {
    return val;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.dailyTarget === 'number') {
        return parsed as BkGameTeamKpiConfig;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeTimeHHmm(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return HH_MM_PATTERN.test(trimmed) ? trimmed : null;
}

export function normalizeTeamBookingDoneTiers(rawTiers: unknown): BkGameTeamBookingDoneTier[] {
  if (!Array.isArray(rawTiers)) return [];

  const byMinBookings = new Map<number, BkGameTeamBookingDoneTier>();
  rawTiers.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const raw = item as Partial<BkGameTeamBookingDoneTier>;
    const minBookings = Math.floor(Number(raw.minBookings));
    const bonusPerDone = Math.round(Number(raw.bonusPerDone));
    if (!Number.isFinite(minBookings) || minBookings < 0) return;
    if (!Number.isFinite(bonusPerDone) || bonusPerDone < 0) return;

    const existing = byMinBookings.get(minBookings);
    if (!existing || bonusPerDone >= existing.bonusPerDone) {
      byMinBookings.set(minBookings, {
        id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `tier-${minBookings}-${index}`,
        minBookings,
        bonusPerDone,
        ...(typeof raw.label === 'string' && raw.label.trim() ? { label: raw.label.trim() } : {}),
      });
    }
  });

  const sorted = Array.from(byMinBookings.values()).sort((a, b) => a.minBookings - b.minBookings);
  return sorted.map((tier, idx) => {
    const next = sorted[idx + 1];
    const autoLabel = next
      ? tier.minBookings === 0 && tier.bonusPerDone === 0
        ? `Dưới ${next.minBookings} Booking`
        : `${tier.minBookings}–${next.minBookings - 1} Booking`
      : `Từ ${tier.minBookings} Booking`;
    return {
      ...tier,
      label: autoLabel,
    };
  });
}

export function parseTeamBookingDoneBonusConfig(
  val?: string | BkGameTeamBookingDoneBonusConfig | null
): BkGameTeamBookingDoneBonusConfig | null {
  if (!val) return null;

  let rawObj: unknown = val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    try {
      rawObj = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) return null;
  const candidate = rawObj as Partial<BkGameTeamBookingDoneBonusConfig>;
  const tiers = normalizeTeamBookingDoneTiers(candidate.tiers);
  if (tiers.length === 0) return null;

  const startHHmm = normalizeTimeHHmm(candidate.timeWindowStart);
  const endHHmm = normalizeTimeHHmm(candidate.timeWindowEnd);
  const validWindow = startHHmm && endHHmm && startHHmm <= endHHmm;

  return {
    enabled: candidate.enabled !== false,
    tiers,
    timeWindowStart: validWindow ? startHHmm : null,
    timeWindowEnd: validWindow ? endHHmm : null,
  };
}

export interface ResolvedTeamBookingDoneTier {
  matchedMinBookings: number | null;
  bonusPerDone: number;
  tierLabel: string;
  nextTierMinBookings: number | null;
  nextTierBonusPerDone: number | null;
  bookingsToNextTier: number | null;
}

export function resolveTeamBookingDoneTier(
  teamBookings: number,
  rawTiers: BkGameTeamBookingDoneTier[]
): ResolvedTeamBookingDoneTier {
  const tiers = normalizeTeamBookingDoneTiers(rawTiers);
  if (tiers.length === 0) {
    return {
      matchedMinBookings: null,
      bonusPerDone: 0,
      tierLabel: 'Chưa cấu hình mốc',
      nextTierMinBookings: null,
      nextTierBonusPerDone: null,
      bookingsToNextTier: null,
    };
  }

  const safeBookings = Math.max(0, Math.floor(Number(teamBookings) || 0));
  if (safeBookings < tiers[0].minBookings) {
    const first = tiers[0];
    return {
      matchedMinBookings: null,
      bonusPerDone: 0,
      tierLabel: `Dưới ${first.minBookings} Booking`,
      nextTierMinBookings: first.minBookings,
      nextTierBonusPerDone: first.bonusPerDone,
      bookingsToNextTier: first.minBookings - safeBookings,
    };
  }

  let matchedIndex = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (safeBookings >= tiers[i].minBookings) {
      matchedIndex = i;
    }
  }

  const matched = tiers[matchedIndex];
  const next = tiers[matchedIndex + 1] || null;
  const tierLabel = next
    ? matched.minBookings === 0 && matched.bonusPerDone === 0
      ? `Dưới ${next.minBookings} Booking`
      : `${matched.minBookings}–${next.minBookings - 1} Booking`
    : `Từ ${matched.minBookings} Booking`;

  return {
    matchedMinBookings: matched.minBookings,
    bonusPerDone: matched.bonusPerDone,
    tierLabel,
    nextTierMinBookings: next ? next.minBookings : null,
    nextTierBonusPerDone: next ? next.bonusPerDone : null,
    bookingsToNextTier: next ? Math.max(0, next.minBookings - safeBookings) : null,
  };
}

export function buildIctDateList(startDateStr: string, endDateStr: string, maxDays = 120): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
    return [];
  }
  if (startDateStr > endDateStr) return [];

  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  const dates: string[] = [];
  while (cur.getTime() <= end.getTime() && dates.length < maxDays) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export function formatVietnameseDateLabel(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const dObj = new Date(`${dateStr}T00:00:00+07:00`);
  const dayOfWeek = DAY_NAME_LABELS[dObj.getDay()] || '';
  const [, month, day] = dateStr.split('-');
  return `${dayOfWeek}, ${day}/${month}`;
}

export function resolveEffectiveDailyTimeWindow(
  config: BkGameTeamBookingDoneBonusConfig,
  gameType: string,
  teamKpiConfig?: BkGameTeamKpiConfig | null
): { start: string; end: string } | null {
  const customStart = normalizeTimeHHmm(config.timeWindowStart);
  const customEnd = normalizeTimeHHmm(config.timeWindowEnd);
  if (customStart && customEnd && customStart <= customEnd) {
    return { start: customStart, end: customEnd };
  }

  if (gameType === 'TEAM_KPI' && teamKpiConfig) {
    const kpiStart = normalizeTimeHHmm(teamKpiConfig.timeWindowStart);
    const kpiEnd = normalizeTimeHHmm(teamKpiConfig.timeWindowEnd);
    if (kpiStart && kpiEnd && kpiStart <= kpiEnd) {
      return { start: kpiStart, end: kpiEnd };
    }
  }

  return null;
}

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
      (a, b) => b.totalBonus - a.totalBonus || b.singleDoneCount - a.singleDoneCount || a.staffName.localeCompare(b.staffName)
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
    .sort((a, b) => b.totalBonus - a.totalBonus || b.singleDoneCount - a.singleDoneCount || a.staffName.localeCompare(b.staffName));

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

export class BkGameTeamBookingDoneBonusService {
  static async syncAndComputeSummary(
    fastify: FastifyInstance,
    game: {
      id: number;
      gameType: string;
      status: string;
      startDate: Date;
      endDate: Date;
      allowedBookingChannels?: string | null;
      teamKpiConfig?: string | null;
      teamBookingDoneBonusConfig?: string | null;
    },
    participants: BkGameParticipant[],
    options: { forceSync?: boolean } = {}
  ): Promise<BkGameTeamBookingDoneBonusSummary | null> {
    const config = parseTeamBookingDoneBonusConfig(game.teamBookingDoneBonusConfig);
    if (!config || !config.enabled || config.tiers.length === 0) {
      return null;
    }

    const staffIds = Array.from(
      new Set(participants.map((p) => Number(p.staffId)).filter((id) => Number.isInteger(id) && id > 0))
    );
    if (staffIds.length === 0) {
      return null;
    }

    const startDateStr = formatIctDateLocal(game.startDate);
    const endDateStr = formatIctDateLocal(game.endDate);
    const todayStr = formatIctDateLocal(new Date());
    const dailyList = buildIctDateList(startDateStr, endDateStr, 120);
    if (dailyList.length === 0) {
      return null;
    }

    const startIctDateTime = formatIctDateTimeLocal(game.startDate);
    const endIctDateTime = formatIctDateTimeLocal(game.endDate);
    const allowedChannels = parseChannelsLocal(game.allowedBookingChannels);
    const channelFilter = buildChannelFilterLocal(allowedChannels, 'o.booking_channels');
    const teamKpiConfig = parseTeamKpiConfigLocal(game.teamKpiConfig);
    const effectiveWindow = resolveEffectiveDailyTimeWindow(config, game.gameType, teamKpiConfig);

    const timeWindowFilter = effectiveWindow
      ? `AND TIME(o.date_created) >= '${effectiveWindow.start}:00' AND TIME(o.date_created) <= '${effectiveWindow.end}:59'`
      : '';

    const ledgerModel = fastify.prisma?.crm?.crmBkGameTeamBookingDoneBonus;
    const isCompletedGame = game.status === 'COMPLETED';
    const shouldSyncLedger = Boolean(ledgerModel) && (!isCompletedGame || options.forceSync === true);

    let frozenRecords: BkGameTeamBookingDoneBonusRecord[] | undefined;
    if (isCompletedGame && !options.forceSync && ledgerModel) {
      const existingFrozen = await ledgerModel.findMany({
        where: { gameId: game.id },
        orderBy: [{ orderCompletedAt: 'desc' }, { id: 'desc' }],
      });
      if (existingFrozen.length > 0) {
        frozenRecords = existingFrozen.map((r) => {
          const p = participants.find((x) => x.staffId === r.staffId);
          return {
            id: r.id,
            gameId: r.gameId,
            orderId: r.orderId,
            orderKey: r.orderKey,
            staffId: r.staffId,
            staffName: p?.staffName || `Nhân viên #${r.staffId}`,
            customerName: r.customerName,
            rewardDate: r.rewardDate,
            teamBookings: r.teamBookings,
            tierLabel: r.tierLabel,
            bonusPerDone: r.bonusPerDone,
            bonusAmount: r.bonusAmount,
            orderCompletedAt: r.orderCompletedAt ? r.orderCompletedAt.toISOString() : null,
            createdAt: r.createdAt.toISOString(),
          };
        });
      }
    }

    let bookingRows: SafeAny[] = [];
    let completedOrderRows: SafeAny[] = [];

    try {
      [bookingRows, completedOrderRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT
            DATE_FORMAT(o.date_created, '%Y-%m-%d') AS bookingDate,
            COUNT(DISTINCT o.id) AS teamBookings
          FROM \`order\` o
          WHERE o.created_staff_id IN (${staffIds.join(',')})
            AND o.date_created >= '${startIctDateTime}'
            AND o.date_created <= '${endIctDateTime}'
            ${timeWindowFilter}
            AND o.order_state != 'Cancelled'
            ${channelFilter}
          GROUP BY DATE_FORMAT(o.date_created, '%Y-%m-%d')
        `),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT
            o.id AS orderId,
            o.order_key AS orderKey,
            o.created_staff_id AS staffId,
            COALESCE(up_c.full_name, 'Khách hàng') AS customerName,
            COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created) AS completedAt,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created), '%Y-%m-%d') AS completedDate
          FROM \`order\` o
          LEFT JOIN \`report_order\` ro ON ro.order_id = o.id
          LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
          WHERE o.created_staff_id IN (${staffIds.join(',')})
            AND o.order_state = 'Completed'
            AND (
              (ro.actual_booking_date_start >= '${startIctDateTime}' AND ro.actual_booking_date_start <= '${endIctDateTime}')
              OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${startIctDateTime}' AND o.booking_date_start <= '${endIctDateTime}')
              OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start IS NULL AND o.date_created >= '${startIctDateTime}' AND o.date_created <= '${endIctDateTime}')
            )
            ${channelFilter}
          ORDER BY completedAt DESC, o.id DESC
        `),
      ]);
    } catch (err) {
      fastify.log?.warn?.(err, `Could not query legacy orders for team-booking done bonus on game ${game.id}`);
      bookingRows = [];
      completedOrderRows = [];
    }

    const dailyTeamBookingsMap = new Map<string, number>();
    for (const r of bookingRows || []) {
      const d = String(r.bookingDate || '');
      if (d) {
        dailyTeamBookingsMap.set(d, Number(r.teamBookings || 0));
      }
    }

    const uniqueOrdersMap = new Map<number, CompletedOrderCandidate>();
    for (const r of completedOrderRows || []) {
      const oid = Number(r.orderId);
      if (!Number.isInteger(oid) || oid <= 0 || uniqueOrdersMap.has(oid)) continue;
      uniqueOrdersMap.set(oid, {
        orderId: oid,
        orderKey: r.orderKey ? String(r.orderKey) : `#${oid}`,
        staffId: Number(r.staffId),
        customerName: r.customerName ? String(r.customerName) : 'Khách hàng',
        completedAt: r.completedAt,
        completedDate: String(r.completedDate || ''),
      });
    }

    const completedOrders = Array.from(uniqueOrdersMap.values());
    const orderIds = completedOrders.map((o) => o.orderId);
    const comboLiveMap =
      orderIds.length > 0
        ? await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(fastify, orderIds)
        : new Map<number, boolean>();

    const { summary, qualifiedLedgerItems } = aggregateTeamBookingDoneBonusData({
      gameId: game.id,
      config,
      effectiveWindow,
      dailyList,
      todayStr,
      dailyTeamBookingsMap,
      completedOrders,
      comboLiveMap,
      participants,
      frozenRecords,
    });

    if (shouldSyncLedger && ledgerModel) {
      const existingRows = await ledgerModel.findMany({
        where: { gameId: game.id },
      });
      const existingByOrderId = new Map(existingRows.map((row) => [row.orderId, row]));
      const qualifiedOrderIds = new Set(qualifiedLedgerItems.map((item) => item.orderId));

      const staleIds = existingRows.filter((row) => !qualifiedOrderIds.has(row.orderId)).map((row) => row.id);
      if (staleIds.length > 0) {
        await ledgerModel.deleteMany({
          where: { id: { in: staleIds } },
        });
      }

      for (const item of qualifiedLedgerItems) {
        const existing = existingByOrderId.get(item.orderId);
        if (
          existing &&
          existing.staffId === item.staffId &&
          existing.rewardDate === item.rewardDate &&
          existing.teamBookings === item.teamBookings &&
          existing.tierLabel === item.tierLabel &&
          existing.bonusPerDone === item.bonusPerDone &&
          existing.bonusAmount === item.bonusAmount
        ) {
          continue;
        }
        try {
          await ledgerModel.upsert({
            where: {
              gameId_orderId: {
                gameId: game.id,
                orderId: item.orderId,
              },
            },
            create: {
              gameId: game.id,
              orderId: item.orderId,
              orderKey: item.orderKey,
              staffId: item.staffId,
              customerName: item.customerName,
              rewardDate: item.rewardDate,
              teamBookings: item.teamBookings,
              tierLabel: item.tierLabel,
              bonusPerDone: item.bonusPerDone,
              bonusAmount: item.bonusAmount,
              orderCompletedAt: !isNaN(item.orderCompletedAt.getTime()) ? item.orderCompletedAt : null,
            },
            update: {
              orderKey: item.orderKey,
              staffId: item.staffId,
              customerName: item.customerName,
              rewardDate: item.rewardDate,
              teamBookings: item.teamBookings,
              tierLabel: item.tierLabel,
              bonusPerDone: item.bonusPerDone,
              bonusAmount: item.bonusAmount,
              orderCompletedAt: !isNaN(item.orderCompletedAt.getTime()) ? item.orderCompletedAt : null,
            },
          });
        } catch {
          // Unique key protection under concurrent sync
        }
      }

      const persistedRows = await ledgerModel.findMany({
        where: { gameId: game.id },
        orderBy: [{ orderCompletedAt: 'desc' }, { id: 'desc' }],
      });
      summary.records = persistedRows.map((r) => {
        const p = participants.find((x) => x.staffId === r.staffId);
        return {
          id: r.id,
          gameId: r.gameId,
          orderId: r.orderId,
          orderKey: r.orderKey,
          staffId: r.staffId,
          staffName: p?.staffName || `Nhân viên #${r.staffId}`,
          customerName: r.customerName,
          rewardDate: r.rewardDate,
          teamBookings: r.teamBookings,
          tierLabel: r.tierLabel,
          bonusPerDone: r.bonusPerDone,
          bonusAmount: r.bonusAmount,
          orderCompletedAt: r.orderCompletedAt ? r.orderCompletedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
        };
      });
    }

    return summary;
  }
}
