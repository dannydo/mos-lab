import {
  BkGame,
  BkGameCreateInput,
  BkGameDoneBonusRule,
  BkGameParticipant,
  BkGameTeam,
  BkGameTeamKpiConfig,
  SafeAny,
} from '@mos-lab/shared';
import { normalizeTimeHHmm, parseTeamBookingDoneBonusConfig } from '../bk-game-team-booking-done-bonus.service.js';

export interface LegacyStaffRow {
  staffId: number;
  fullName: string;
  avatar: string | null;
}

export interface BaseBkGameRow {
  id: number;
  title: string;
  description: string | null;
  gameType: string;
  metricType: string;
  allowedBookingChannels: string | null;
  targetScore: number | null;
  startDate: Date;
  endDate: Date;
  status: string;
  entryFee: number;
  rewardPool: number;
  rewardDescription: string | null;
  penaltyDescription: string | null;
  winnerCriteria: string;
  announcedResults: string | null;
  doneBonusConfig: string | null;
  teamKpiConfig: string | null;
  teamBookingDoneBonusConfig: string | null;
  createdByStaffId: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface BaseBkGameParticipantRow {
  id: number;
  gameId: number;
  staffId: number;
  staffName: string;
  avatar: string | null;
  teamId: number | null;
  betAmount: number;
  score: number;
  rank: number | null;
  rewardAmount: number;
  penaltyNote: string | null;
  status: string;
}

/**
 * Formats a Date into Vietnam (ICT, UTC+7) datetime string 'YYYY-MM-DD HH:mm:ss'
 * for querying MySQL columns stored in local Vietnam time.
 */
export function formatIctDateTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  const datePart = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const timePart = date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
  return `${datePart} ${timePart}`;
}

/**
 * Formats a Date into Vietnam (ICT, UTC+7) date string 'YYYY-MM-DD'.
 */
export function formatIctDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/**
 * Parses allowedBookingChannels from either a JSON array string, comma-separated string,
 * or string array into a clean array of uppercase channel codes, or null.
 */
export function parseAllowedBookingChannels(val?: string | string[] | null): string[] | null {
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

/**
 * Parses doneBonusConfig from either a JSON array string or array into BkGameDoneBonusRule[] or null.
 */
export function parseDoneBonusConfig(val?: string | BkGameDoneBonusRule[] | null): BkGameDoneBonusRule[] | null {
  if (!val) return null;
  if (Array.isArray(val)) {
    return val.length > 0 ? val : null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as BkGameDoneBonusRule[];
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Parses teamKpiConfig from either a JSON string or object into BkGameTeamKpiConfig or null.
 */
export function parseTeamKpiConfig(val?: string | BkGameTeamKpiConfig | null): BkGameTeamKpiConfig | null {
  if (!val) return null;
  if (typeof val === 'object' && val !== null) {
    if (typeof (val as BkGameTeamKpiConfig).dailyTarget === 'number') {
      return val as BkGameTeamKpiConfig;
    }
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

/**
 * Builds SQL filter clause for allowed booking channels.
 * Example: AND UPPER(o.booking_channels) IN ('GB')
 */
export function buildBookingChannelFilter(allowedChannels?: string[] | null, columnRef = 'o.booking_channels'): string {
  if (!allowedChannels || allowedChannels.length === 0) {
    return '';
  }
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
  if (!escaped) return '';
  return `AND UPPER(${columnRef}) IN (${escaped})`;
}

export function serializeTeamBookingDoneBonusConfig(
  raw: BkGameCreateInput['teamBookingDoneBonusConfig']
): string | null {
  if (!raw || raw.enabled === false) return null;
  if (raw.timeWindowStart || raw.timeWindowEnd) {
    const start = normalizeTimeHHmm(raw.timeWindowStart);
    const end = normalizeTimeHHmm(raw.timeWindowEnd);
    if (!start || !end || start > end) {
      throw new Error('Khung giờ tính Booking Team không hợp lệ (giờ bắt đầu phải trước giờ kết thúc)');
    }
  }
  const normalized = parseTeamBookingDoneBonusConfig(raw);
  if (!normalized || !normalized.enabled || normalized.tiers.length === 0) return null;
  return JSON.stringify(normalized);
}

export function computeTargetProgressPercent(score: number, targetScore?: number | null): number {
  return targetScore ? Math.min(100, Math.round((score / targetScore) * 100)) : 100;
}

export function mapBkGameParticipantDto(
  p: BaseBkGameParticipantRow,
  extras?: { teamName?: string | null; targetProgressPercent?: number }
): BkGameParticipant {
  const base: BkGameParticipant = {
    id: p.id,
    gameId: p.gameId,
    staffId: p.staffId,
    staffName: p.staffName,
    avatar: p.avatar,
    teamId: p.teamId,
    betAmount: p.betAmount,
    score: p.score,
    rank: p.rank,
    rewardAmount: p.rewardAmount,
    penaltyNote: p.penaltyNote,
    status: p.status as SafeAny,
  };
  if (extras && 'teamName' in extras) {
    base.teamName = extras.teamName;
  }
  if (extras && extras.targetProgressPercent !== undefined) {
    base.targetProgressPercent = extras.targetProgressPercent;
  }
  return base;
}

export function mapBkGameDto(
  game: BaseBkGameRow,
  options: {
    allowedBookingChannels?: string[] | null;
    participants: BkGameParticipant[];
    teams?: BkGameTeam[];
  }
): BkGame {
  const allowedBookingChannels =
    options.allowedBookingChannels !== undefined
      ? options.allowedBookingChannels
      : parseAllowedBookingChannels(game.allowedBookingChannels);

  return {
    id: game.id,
    title: game.title,
    description: game.description,
    gameType: game.gameType as SafeAny,
    metricType: game.metricType as SafeAny,
    allowedBookingChannels,
    targetScore: game.targetScore,
    startDate: game.startDate.toISOString(),
    endDate: game.endDate.toISOString(),
    status: game.status as SafeAny,
    entryFee: game.entryFee,
    rewardPool: game.rewardPool,
    rewardDescription: game.rewardDescription,
    penaltyDescription: game.penaltyDescription,
    winnerCriteria: game.winnerCriteria as SafeAny,
    announcedResults: game.announcedResults,
    doneBonusConfig: parseDoneBonusConfig(game.doneBonusConfig),
    teamKpiConfig: parseTeamKpiConfig(game.teamKpiConfig),
    teamBookingDoneBonusConfig: parseTeamBookingDoneBonusConfig(game.teamBookingDoneBonusConfig),
    createdByStaffId: game.createdByStaffId,
    createdAt: game.createdAt ? game.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: game.updatedAt ? game.updatedAt.toISOString() : new Date().toISOString(),
    participants: options.participants,
    teams: options.teams,
  };
}
