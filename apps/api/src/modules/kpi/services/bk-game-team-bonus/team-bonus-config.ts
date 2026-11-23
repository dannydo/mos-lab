import { BkGameTeamBookingDoneBonusConfig, BkGameTeamBookingDoneTier, BkGameTeamKpiConfig } from '@mos-lab/shared';

const DAY_NAME_LABELS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function formatIctDateLocal(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function parseChannelsLocal(val?: string | string[] | null): string[] | null {
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

export function buildChannelFilterLocal(allowedChannels?: string[] | null, columnRef = 'o.booking_channels'): string {
  if (!allowedChannels || allowedChannels.length === 0) return '';
  const escaped = allowedChannels
    .map(
      (ch) =>
        `'${ch
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_-]/g, '')}'`
    )
    .filter((c) => c !== "''")
    .join(', ');
  return escaped ? `AND UPPER(${columnRef}) IN (${escaped})` : '';
}

export function parseTeamKpiConfigLocal(val?: string | BkGameTeamKpiConfig | null): BkGameTeamKpiConfig | null {
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
