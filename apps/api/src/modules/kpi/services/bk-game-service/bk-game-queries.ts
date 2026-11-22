import { FastifyInstance } from 'fastify';
import {
  BK_GAME_SCORING_RULES,
  BkGame,
  BkGameDetailResponse,
  BkGameListResponse,
  BkGameMetricType,
  BkGameParticipant,
  BkGameTeam,
  BkGameTeamBookingDoneBonusSummary,
  BkGameTeamKpiSummary,
  SafeAny,
} from '@mos-lab/shared';
import {
  BkGameTeamBookingDoneBonusService,
  mergeActiveBkTelesalesParticipants,
  parseTeamBookingDoneBonusConfig,
} from '../bk-game-team-booking-done-bonus.service.js';
import {
  buildBookingChannelFilter,
  computeTargetProgressPercent,
  mapBkGameDto,
  mapBkGameParticipantDto,
  parseAllowedBookingChannels,
} from './bk-game-helpers.js';
import { fetchAndBuildDoneBonusesSummary } from './bk-game-done-bonus.js';
import { computeTeamKpiSummary } from './bk-game-team-kpi.js';
import { computeLiveParticipantScores } from './bk-game-live-scores.js';

/**
 * Retrieves all Telesales games, optionally filtered by status.
 */
export async function getGames(fastify: FastifyInstance, statusFilter?: string): Promise<BkGameListResponse> {
  const whereClause: SafeAny = {};
  if (statusFilter && statusFilter !== 'ALL') {
    whereClause.status = statusFilter;
  }

  const games = await fastify.prisma.crm.crmBkGame.findMany({
    where: whereClause,
    include: {
      participants: true,
      teams: {
        include: {
          participants: true,
        },
      },
    },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
  });

  const mappedGames: BkGame[] = games.map((g) =>
    mapBkGameDto(g, {
      participants: g.participants.map((p) => mapBkGameParticipantDto(p)),
      teams: g.teams.map((t) => ({
        id: t.id,
        gameId: t.gameId,
        teamName: t.teamName,
        color: t.color,
        score: t.score,
        rank: t.rank,
      })),
    })
  );

  return {
    games: mappedGames,
    total: mappedGames.length,
  };
}

/**
 * Retrieves single game with real-time computed scores & ranks.
 */
export async function getGameDetail(fastify: FastifyInstance, gameId: number): Promise<BkGameDetailResponse | null> {
  const game = await fastify.prisma.crm.crmBkGame.findUnique({
    where: { id: gameId },
    include: {
      participants: true,
      teams: {
        include: {
          participants: true,
        },
      },
    },
  });

  if (!game) {
    return null;
  }

  const now = new Date();
  const isExpired = now > game.endDate;
  const timeRemainingSeconds = Math.max(0, Math.floor((game.endDate.getTime() - now.getTime()) / 1000));

  let participants: BkGameParticipant[] = game.participants.map((p) =>
    mapBkGameParticipantDto(p, {
      teamName: game.teams.find((t) => t.id === p.teamId)?.teamName || null,
      targetProgressPercent: computeTargetProgressPercent(p.score, game.targetScore),
    })
  );

  const allowedChannels = parseAllowedBookingChannels(game.allowedBookingChannels);
  const channelFilter = buildBookingChannelFilter(allowedChannels, 'o.booking_channels');

  const hasTeamBookingDoneBonus = Boolean(parseTeamBookingDoneBonusConfig(game.teamBookingDoneBonusConfig)?.enabled);
  if (game.status === 'ACTIVE' && game.gameType !== 'TEAM' && hasTeamBookingDoneBonus) {
    participants = await mergeActiveBkTelesalesParticipants(fastify, game, participants);
  }

  // If game is ACTIVE, compute live scores from the database
  if (game.status === 'ACTIVE' && participants.length > 0) {
    participants = await computeLiveParticipantScores(fastify, game, participants, channelFilter);
  }

  // Sync and fetch done bonuses
  const { doneBonuses, doneBonusesSummary, staffBonusMap } = await fetchAndBuildDoneBonusesSummary(
    fastify,
    gameId,
    participants
  );

  // Attach done bonus stats to participants
  participants = participants.map((p) => {
    const bonusStat = staffBonusMap.get(p.staffId) || { doneCount: 0, totalBonus: 0 };
    return {
      ...p,
      doneBookingsCount: bonusStat.doneCount,
      totalDoneBonus: bonusStat.totalBonus,
    };
  });

  let teamKpiSummary: BkGameTeamKpiSummary | null = null;
  if (game.gameType === 'TEAM_KPI') {
    teamKpiSummary = await computeTeamKpiSummary(fastify, game, participants);
    if (teamKpiSummary) {
      const staffContributionMap = new Map<number, number>();
      for (const day of teamKpiSummary.dailyResults) {
        for (const c of day.contributors || []) {
          staffContributionMap.set(c.staffId, (staffContributionMap.get(c.staffId) || 0) + c.count);
        }
      }
      participants = participants.map((p) => {
        const liveScore = staffContributionMap.get(p.staffId) || 0;
        return {
          ...p,
          score: liveScore,
          targetProgressPercent: computeTargetProgressPercent(liveScore, game.targetScore),
        };
      });
    }
  }

  // Rank participants
  participants.sort((a, b) => b.score - a.score || a.staffName.localeCompare(b.staffName));
  participants = participants.map((p, index) => ({
    ...p,
    rank: index + 1,
  }));

  // Compute and sync Team-Booking Done Bonus for Retail customers (MOS-BUG-247)
  let teamBookingDoneBonusSummary: BkGameTeamBookingDoneBonusSummary | null = null;
  try {
    teamBookingDoneBonusSummary = await BkGameTeamBookingDoneBonusService.syncAndComputeSummary(
      fastify,
      game,
      participants
    );
    if (teamBookingDoneBonusSummary) {
      const staffTeamBkBonusMap = new Map(teamBookingDoneBonusSummary.staffTotals.map((s) => [s.staffId, s]));
      participants = participants.map((p) => {
        const stat = staffTeamBkBonusMap.get(p.staffId);
        return {
          ...p,
          teamBookingDoneCount: stat ? stat.singleDoneCount : 0,
          totalTeamBookingDoneBonus: stat ? stat.totalBonus : 0,
        };
      });
    }
  } catch (tbErr) {
    fastify.log.warn(tbErr, `Could not compute team booking done bonus for game ${gameId}`);
  }

  // If TEAM game, compute team scores
  let teams: BkGameTeam[] | undefined;
  if (game.teams && game.teams.length > 0) {
    teams = game.teams.map((t) => {
      const teamMembers = participants.filter((p) => p.teamId === t.id);
      const teamScore = teamMembers.reduce((sum, m) => sum + m.score, 0);
      return {
        id: t.id,
        gameId: t.gameId,
        teamName: t.teamName,
        color: t.color,
        score: teamScore,
        rank: null,
        participants: teamMembers,
      };
    });

    teams.sort((a, b) => b.score - a.score || a.teamName.localeCompare(b.teamName));
    teams = teams.map((t, index) => ({ ...t, rank: index + 1 }));
  }

  const totalScore = participants.reduce((sum, p) => sum + p.score, 0);
  const leaderScore = participants[0]?.score || 0;

  const mappedGame = mapBkGameDto(game, {
    allowedBookingChannels: allowedChannels,
    participants,
    teams,
  });

  const metricType = game.metricType as BkGameMetricType;
  const baseRule = BK_GAME_SCORING_RULES[metricType] || BK_GAME_SCORING_RULES.BOOKINGS;
  let scoringRule = baseRule;
  if (allowedChannels && allowedChannels.length > 0) {
    const channelLabel = allowedChannels.join(', ');
    scoringRule = {
      ...baseRule,
      formula: `${baseRule.formula} (Chỉ tính kênh: ${channelLabel})`,
      description: `${baseRule.description} Chỉ ghi nhận các booking thuộc kênh tiếp nhận đặt lịch: ${channelLabel}.`,
    };
  }

  return {
    game: mappedGame,
    leaderboard: participants,
    teams,
    doneBonuses,
    doneBonusesSummary,
    teamKpiSummary,
    teamBookingDoneBonusSummary,
    stats: {
      totalParticipants: participants.length,
      totalTeams: teams ? teams.length : 0,
      totalScore,
      leaderScore,
      timeRemainingSeconds,
      isExpired,
    },
    scoringRule,
  };
}
