import type { Dayjs } from 'dayjs';
import type {
  BkBookingLeaderboardEntry,
  BkGameDetailResponse,
  BkGameParticipant,
  BkGameTeamBookingDoneBonusSummary,
} from '@mos-lab/shared';

export type GameMetric = 'calls' | 'pickups' | 'bookings' | 'done';

export interface BkGameTabProps {
  dateRange: [Dayjs, Dayjs];
  comparisonMode: 'month' | 'week' | 'day';
}

export interface RankedGameEntry extends BkBookingLeaderboardEntry {
  gameRank: number;
  gameScore: number;
}

export interface StaffDoneBonusStat {
  doneCount: number;
  totalBonus: number;
}

export interface StaffTeamBookingDoneStat {
  singleDoneCount: number;
  totalBonus: number;
}

export interface PodiumEntry {
  staffName: string;
  score: number;
  avatar?: string | null;
  targetProgressPercent?: number;
}

export const METRIC_OPTIONS: { label: string; value: GameMetric }[] = [
  { label: 'Cuộc gọi', value: 'calls' },
  { label: 'Khách nghe máy', value: 'pickups' },
  { label: 'Booking', value: 'bookings' },
  { label: 'Done', value: 'done' },
];

export const METRIC_LABEL: Record<GameMetric, string> = {
  calls: 'Cuộc gọi',
  pickups: 'Khách nghe máy',
  bookings: 'Booking tạo mới',
  done: 'Done',
};

export function metricValue(entry: BkBookingLeaderboardEntry, metric: GameMetric): number {
  if (metric === 'calls') return entry.callCount;
  if (metric === 'pickups') return entry.pickupCount;
  if (metric === 'bookings') return entry.totalCreatedBookings;
  return entry.doneBookings;
}

export function formatCountdown(totalSec: number): string {
  if (totalSec <= 0) return 'ĐÃ HẾT GIỜ';
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) {
    return `${days} ngày ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

export function rankLeaderboardEntries(
  leaderboard: BkBookingLeaderboardEntry[],
  metric: GameMetric
): RankedGameEntry[] {
  return [...leaderboard]
    .sort(
      (left, right) =>
        metricValue(right, metric) - metricValue(left, metric) || left.displayName.localeCompare(right.displayName)
    )
    .map((entry, index) => ({ ...entry, gameRank: index + 1, gameScore: metricValue(entry, metric) }));
}

export function buildStaffDoneBonusMap(gameDetail: BkGameDetailResponse | null): Map<number, StaffDoneBonusStat> {
  const map = new Map<number, StaffDoneBonusStat>();
  if (gameDetail?.doneBonusesSummary?.staffBonuses) {
    gameDetail.doneBonusesSummary.staffBonuses.forEach((s) => {
      map.set(s.staffId, { doneCount: s.doneCount, totalBonus: s.totalBonus });
    });
  }
  if (gameDetail?.leaderboard) {
    gameDetail.leaderboard.forEach((p) => {
      if (p.staffId && !map.has(p.staffId)) {
        map.set(p.staffId, {
          doneCount: p.doneBookingsCount || 0,
          totalBonus: p.totalDoneBonus || 0,
        });
      }
    });
  }
  return map;
}

export function buildStaffTeamBookingDoneBonusMap(
  teamBookingDoneBonusSummary: BkGameTeamBookingDoneBonusSummary | null,
  gameDetail: BkGameDetailResponse | null
): Map<number, StaffTeamBookingDoneStat> {
  const map = new Map<number, StaffTeamBookingDoneStat>();
  if (teamBookingDoneBonusSummary?.staffTotals) {
    teamBookingDoneBonusSummary.staffTotals.forEach((s) => {
      map.set(s.staffId, { singleDoneCount: s.singleDoneCount, totalBonus: s.totalBonus });
    });
  }
  if (gameDetail?.leaderboard) {
    gameDetail.leaderboard.forEach((p) => {
      if (p.staffId && !map.has(p.staffId)) {
        map.set(p.staffId, {
          singleDoneCount: p.teamBookingDoneCount || 0,
          totalBonus: p.totalTeamBookingDoneBonus || 0,
        });
      }
    });
  }
  return map;
}

export function resolvePodiumEntries(
  gameLeaderboard: BkGameParticipant[],
  rankedEntries: RankedGameEntry[]
): { top1: PodiumEntry | null; top2: PodiumEntry | null; top3: PodiumEntry | null } {
  const defaultTargets = [100, 90, 80] as const;
  const pick = (index: 0 | 1 | 2): PodiumEntry | null => {
    const fromGame = gameLeaderboard[index];
    if (fromGame) return fromGame;
    const fromRanked = rankedEntries[index];
    if (!fromRanked) return null;
    return {
      staffName: fromRanked.displayName,
      score: fromRanked.gameScore,
      avatar: fromRanked.avatar,
      targetProgressPercent: defaultTargets[index],
    };
  };
  return { top1: pick(0), top2: pick(1), top3: pick(2) };
}
