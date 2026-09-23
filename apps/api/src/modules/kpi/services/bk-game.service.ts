import { FastifyInstance } from 'fastify';
import {
  BkGame,
  BkGameCreateInput,
  BkGameUpdateInput,
  BkGameDetailResponse,
  BkGameFinalizeInput,
  BkGameListResponse,
  BkGameParticipant,
  BkGameTeam,
  BkGameMetricType,
  BK_GAME_SCORING_RULES,
  SafeAny,
} from '@mos-lab/shared';
import { getActiveBkTelesalesIds, getBkCallMetricsByLegacyStaffIds } from './bk-salary.service.js';

interface LegacyStaffRow {
  staffId: number;
  fullName: string;
  avatar: string | null;
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
    const list = trimmed.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
    return list.length > 0 ? list : null;
  }
  return null;
}

/**
 * Builds SQL filter clause for allowed booking channels.
 * Example: AND UPPER(o.booking_channels) IN ('GB')
 */
export function buildBookingChannelFilter(
  allowedChannels?: string[] | null,
  columnRef = 'o.booking_channels'
): string {
  if (!allowedChannels || allowedChannels.length === 0) {
    return '';
  }
  const escaped = allowedChannels
    .map((ch) => `'${ch.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')}'`)
    .filter((c) => c !== "''")
    .join(', ');
  if (!escaped) return '';
  return `AND UPPER(${columnRef}) IN (${escaped})`;
}

export class BkGameService {
  /**
   * Retrieves all Telesales games, optionally filtered by status.
   */
  static async getGames(fastify: FastifyInstance, statusFilter?: string): Promise<BkGameListResponse> {
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

    const mappedGames: BkGame[] = games.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      gameType: g.gameType as SafeAny,
      metricType: g.metricType as SafeAny,
      allowedBookingChannels: parseAllowedBookingChannels(g.allowedBookingChannels),
      targetScore: g.targetScore,
      startDate: g.startDate.toISOString(),
      endDate: g.endDate.toISOString(),
      status: g.status as SafeAny,
      entryFee: g.entryFee,
      rewardPool: g.rewardPool,
      rewardDescription: g.rewardDescription,
      penaltyDescription: g.penaltyDescription,
      winnerCriteria: g.winnerCriteria as SafeAny,
      announcedResults: g.announcedResults,
      createdByStaffId: g.createdByStaffId,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
      participants: g.participants.map((p) => ({
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
      })),
      teams: g.teams.map((t) => ({
        id: t.id,
        gameId: t.gameId,
        teamName: t.teamName,
        color: t.color,
        score: t.score,
        rank: t.rank,
      })),
    }));

    return {
      games: mappedGames,
      total: mappedGames.length,
    };
  }

  /**
   * Retrieves single game with real-time computed scores & ranks.
   */
  static async getGameDetail(fastify: FastifyInstance, gameId: number): Promise<BkGameDetailResponse | null> {
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

    let participants: BkGameParticipant[] = game.participants.map((p) => ({
      id: p.id,
      gameId: p.gameId,
      staffId: p.staffId,
      staffName: p.staffName,
      avatar: p.avatar,
      teamId: p.teamId,
      teamName: game.teams.find((t) => t.id === p.teamId)?.teamName || null,
      betAmount: p.betAmount,
      score: p.score,
      rank: p.rank,
      rewardAmount: p.rewardAmount,
      penaltyNote: p.penaltyNote,
      status: p.status as SafeAny,
      targetProgressPercent: game.targetScore ? Math.min(100, Math.round((p.score / game.targetScore) * 100)) : 100,
    }));

    const allowedChannels = parseAllowedBookingChannels(game.allowedBookingChannels);
    const channelFilter = buildBookingChannelFilter(allowedChannels, 'o.booking_channels');

    // If game is ACTIVE, compute live scores from the database
    if (game.status === 'ACTIVE' && participants.length > 0) {
      const staffIds = participants.map((p) => p.staffId);
      const startIctDateTime = formatIctDateTime(game.startDate);
      const endIctDateTime = formatIctDateTime(game.endDate);
      const startDateStr = formatIctDate(game.startDate);
      const endDateStr = formatIctDate(game.endDate);

      const scoreMap = new Map<number, number>();

      if (game.metricType === 'BOOKINGS') {
        const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            o.created_staff_id AS staffId,
            COUNT(DISTINCT o.id) AS metricCount
          FROM \`order\` o
          WHERE o.created_staff_id IN (${staffIds.join(',')})
            AND o.date_created >= '${startIctDateTime}'
            AND o.date_created <= '${endIctDateTime}'
            AND o.order_state != 'Cancelled'
            ${channelFilter}
          GROUP BY o.created_staff_id
        `);
        for (const r of rows) {
          scoreMap.set(Number(r.staffId), Number(r.metricCount || 0));
        }
      } else if (game.metricType === 'DONE') {
        const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            o.created_staff_id AS staffId,
            COUNT(DISTINCT o.id) AS metricCount
          FROM \`order\` o
          WHERE o.created_staff_id IN (${staffIds.join(',')})
            AND o.booking_date_start >= '${startIctDateTime}'
            AND o.booking_date_start <= '${endIctDateTime}'
            AND o.order_state = 'Completed'
            ${channelFilter}
          GROUP BY o.created_staff_id
        `);
        for (const r of rows) {
          scoreMap.set(Number(r.staffId), Number(r.metricCount || 0));
        }
      } else if (game.metricType === 'CALLS' || game.metricType === 'PICKUPS') {
        const callMetrics = await getBkCallMetricsByLegacyStaffIds(fastify, startDateStr, endDateStr, staffIds);
        for (const staffId of staffIds) {
          const metric = callMetrics.get(staffId);
          const count = game.metricType === 'CALLS' ? metric?.callCount || 0 : metric?.pickupCount || 0;
          scoreMap.set(staffId, count);
        }
      } else {
        // COMPOSITE: 10 pts per booking + 1 pt per call
        const bookingRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            o.created_staff_id AS staffId,
            COUNT(DISTINCT o.id) AS metricCount
          FROM \`order\` o
          WHERE o.created_staff_id IN (${staffIds.join(',')})
            AND o.date_created >= '${startIctDateTime}'
            AND o.date_created <= '${endIctDateTime}'
            AND o.order_state != 'Cancelled'
            ${channelFilter}
          GROUP BY o.created_staff_id
        `);
        const callMetrics = await getBkCallMetricsByLegacyStaffIds(fastify, startDateStr, endDateStr, staffIds);
        for (const staffId of staffIds) {
          const bookingRow = bookingRows.find((r) => Number(r.staffId) === staffId);
          const bCount = Number(bookingRow?.metricCount || 0);
          const cCount = callMetrics.get(staffId)?.callCount || 0;
          scoreMap.set(staffId, bCount * 10 + cCount);
        }
      }

      participants = participants.map((p) => {
        const liveScore = scoreMap.get(p.staffId) || 0;
        const progress = game.targetScore ? Math.min(100, Math.round((liveScore / game.targetScore) * 100)) : 100;
        return {
          ...p,
          score: liveScore,
          targetProgressPercent: progress,
        };
      });
    }

    // Rank participants
    participants.sort((a, b) => b.score - a.score || a.staffName.localeCompare(b.staffName));
    participants = participants.map((p, index) => ({
      ...p,
      rank: index + 1,
    }));

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

    const mappedGame: BkGame = {
      id: game.id,
      title: game.title,
      description: game.description,
      gameType: game.gameType as SafeAny,
      metricType: game.metricType as SafeAny,
      allowedBookingChannels: allowedChannels,
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
      createdByStaffId: game.createdByStaffId,
      createdAt: game.createdAt ? game.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: game.updatedAt ? game.updatedAt.toISOString() : new Date().toISOString(),
      participants,
      teams,
    };

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

  /**
   * Creates a new Telesales Game (individual or team battle).
   */
  static async createGame(fastify: FastifyInstance, input: BkGameCreateInput, creatorStaffId: number): Promise<BkGame> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Thời gian bắt đầu hoặc kết thúc không hợp lệ');
    }

    if (startDate >= endDate) {
      throw new Error('Thời gian bắt đầu phải trước thời gian kết thúc');
    }

    // Determine participant staff IDs
    let participantStaffIds = input.participantIds || [];
    if (participantStaffIds.length === 0 && input.gameType !== 'TEAM') {
      participantStaffIds = await getActiveBkTelesalesIds(fastify);
    } else if (input.gameType === 'TEAM' && input.teams && input.teams.length > 0) {
      participantStaffIds = input.teams.flatMap((t) => t.staffIds);
    }

    if (participantStaffIds.length === 0) {
      throw new Error('Cần chọn ít nhất một nhân viên tham gia game');
    }

    // Fetch staff profiles from legacy DB
    const staffRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyStaffRow[]>(`
      SELECT 
        u.id AS staffId,
        COALESCE(up.full_name, CONCAT('BK #', u.id)) AS fullName,
        up.avatar AS avatar
      FROM \`user\` u
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE u.id IN (${participantStaffIds.join(',')})
    `);

    const staffMap = new Map<number, LegacyStaffRow>();
    for (const row of staffRows) {
      staffMap.set(Number(row.staffId), row);
    }

    // Resolve any participant IDs not found in legacy user table from crmStaff
    const missingStaffIds = participantStaffIds.filter((sid) => !staffMap.has(sid));
    if (missingStaffIds.length > 0) {
      const crmProfiles = await fastify.prisma.crm.crmStaff.findMany({
        where: {
          OR: [{ id: { in: missingStaffIds } }, { legacyStaffId: { in: missingStaffIds } }],
        },
        select: { id: true, legacyStaffId: true, displayName: true, avatarUrl: true },
      });
      for (const cp of crmProfiles) {
        const legacyId = cp.legacyStaffId ? Number(cp.legacyStaffId) : null;
        const matchingId = missingStaffIds.includes(cp.id)
          ? cp.id
          : legacyId && missingStaffIds.includes(legacyId)
            ? legacyId
            : null;
        if (matchingId && !staffMap.has(matchingId)) {
          staffMap.set(matchingId, {
            staffId: matchingId,
            fullName: cp.displayName,
            avatar: cp.avatarUrl,
          });
        }
      }
    }

    const entryFee = input.entryFee || 0;
    const baseRewardPool = input.rewardPool || 0;
    const totalRewardPool = baseRewardPool + entryFee * participantStaffIds.length;

    const createdGame = await fastify.prisma.crm.$transaction(async (tx) => {
      const g = await tx.crmBkGame.create({
        data: {
          title: input.title,
          description: input.description,
          gameType: input.gameType,
          metricType: input.metricType,
          allowedBookingChannels:
            input.allowedBookingChannels && input.allowedBookingChannels.length > 0
              ? JSON.stringify(input.allowedBookingChannels)
              : null,
          targetScore: input.targetScore,
          startDate,
          endDate,
          status: 'ACTIVE',
          entryFee,
          rewardPool: totalRewardPool,
          rewardDescription: input.rewardDescription,
          penaltyDescription: input.penaltyDescription,
          winnerCriteria: input.winnerCriteria || 'TOP_1',
          createdByStaffId: creatorStaffId,
        },
      });

      if (input.gameType === 'TEAM' && input.teams && input.teams.length > 0) {
        for (const t of input.teams) {
          const createdTeam = await tx.crmBkGameTeam.create({
            data: {
              gameId: g.id,
              teamName: t.teamName,
              color: t.color || '#10b981',
              score: 0,
            },
          });

          for (const sid of t.staffIds) {
            const profile = staffMap.get(sid);
            await tx.crmBkGameParticipant.create({
              data: {
                gameId: g.id,
                staffId: sid,
                staffName: profile?.fullName || `Nhân viên #${sid}`,
                avatar: profile?.avatar || null,
                teamId: createdTeam.id,
                betAmount: entryFee,
                score: 0,
                status: 'ACTIVE',
              },
            });
          }
        }
      } else {
        for (const sid of participantStaffIds) {
          const profile = staffMap.get(sid);
          await tx.crmBkGameParticipant.create({
            data: {
              gameId: g.id,
              staffId: sid,
              staffName: profile?.fullName || `Nhân viên #${sid}`,
              avatar: profile?.avatar || null,
              betAmount: entryFee,
              score: 0,
              status: 'ACTIVE',
            },
          });
        }
      }

      return g;
    });

    const detail = await this.getGameDetail(fastify, createdGame.id);
    return detail!.game;
  }

  /**
   * Updates an existing Telesales game's settings (channels, target, descriptions, etc.).
   */
  static async updateGame(fastify: FastifyInstance, gameId: number, input: BkGameUpdateInput): Promise<BkGame> {
    const existing = await fastify.prisma.crm.crmBkGame.findUnique({
      where: { id: gameId },
    });
    if (!existing) {
      throw new Error(`Game với ID ${gameId} không tồn tại`);
    }

    const data: Record<string, SafeAny> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.targetScore !== undefined) data.targetScore = input.targetScore;
    if (input.rewardPool !== undefined) data.rewardPool = input.rewardPool;
    if (input.rewardDescription !== undefined) data.rewardDescription = input.rewardDescription;
    if (input.penaltyDescription !== undefined) data.penaltyDescription = input.penaltyDescription;
    if (input.status !== undefined) data.status = input.status;
    if (input.allowedBookingChannels !== undefined) {
      data.allowedBookingChannels =
        input.allowedBookingChannels && input.allowedBookingChannels.length > 0
          ? JSON.stringify(input.allowedBookingChannels)
          : null;
    }

    await fastify.prisma.crm.crmBkGame.update({
      where: { id: gameId },
      data,
    });

    const detail = await this.getGameDetail(fastify, gameId);
    return detail!.game;
  }

  /**
   * Finalizes game, calculates winners, distributes reward pool, and records fun penalty notes.
   */
  static async finalizeGame(fastify: FastifyInstance, gameId: number, input?: BkGameFinalizeInput): Promise<BkGame> {
    const detail = await this.getGameDetail(fastify, gameId);
    if (!detail) {
      throw new Error(`Game với ID ${gameId} không tồn tại`);
    }

    const { game, leaderboard, teams } = detail;
    const rewardPool = game.rewardPool || 0;
    const penaltyDesc = game.penaltyDescription || 'Nhận hình phạt vui từ đội thắng';

    const winnersMap = new Map<number, number>();
    if (input?.winners && input.winners.length > 0) {
      for (const w of input.winners) {
        if (w.participantId) {
          winnersMap.set(w.participantId, w.rewardAmount);
        }
      }
    } else {
      // Default auto-distribution
      if (game.winnerCriteria === 'TOP_1') {
        const top1 = leaderboard[0];
        if (top1) {
          winnersMap.set(top1.id, rewardPool);
        }
      } else if (game.winnerCriteria === 'TOP_3') {
        const [first, second, third] = leaderboard;
        if (first) winnersMap.set(first.id, Math.round(rewardPool * 0.6));
        if (second) winnersMap.set(second.id, Math.round(rewardPool * 0.3));
        if (third) winnersMap.set(third.id, Math.round(rewardPool * 0.1));
      } else if (game.winnerCriteria === 'REACH_TARGET' && game.targetScore) {
        const qualified = leaderboard.filter((p) => p.score >= (game.targetScore || 0));
        if (qualified.length > 0) {
          const splitReward = Math.floor(rewardPool / qualified.length);
          for (const q of qualified) {
            winnersMap.set(q.id, splitReward);
          }
        }
      }
    }

    await fastify.prisma.crm.$transaction(async (tx) => {
      for (const p of leaderboard) {
        const isWinner = winnersMap.has(p.id);
        const rewardAmount = winnersMap.get(p.id) || 0;
        const penaltyNote = isWinner ? null : penaltyDesc;

        await tx.crmBkGameParticipant.update({
          where: { id: p.id },
          data: {
            score: p.score,
            rank: p.rank,
            rewardAmount,
            penaltyNote,
            status: isWinner ? 'WON' : 'LOST',
          },
        });
      }

      if (teams && teams.length > 0) {
        for (const t of teams) {
          await tx.crmBkGameTeam.update({
            where: { id: t.id },
            data: {
              score: t.score,
              rank: t.rank,
            },
          });
        }
      }

      const snapshot = {
        finalizedAt: new Date().toISOString(),
        totalScore: detail.stats.totalScore,
        winners: Array.from(winnersMap.entries()).map(([pid, amt]) => {
          const p = leaderboard.find((x) => x.id === pid);
          return {
            participantId: pid,
            staffName: p?.staffName,
            rewardAmount: amt,
          };
        }),
      };

      await tx.crmBkGame.update({
        where: { id: gameId },
        data: {
          status: 'COMPLETED',
          announcedResults: JSON.stringify(snapshot),
        },
      });
    });

    const finalizedDetail = await this.getGameDetail(fastify, gameId);
    return finalizedDetail!.game;
  }

  /**
   * Cancels a game.
   */
  static async cancelGame(fastify: FastifyInstance, gameId: number): Promise<boolean> {
    await fastify.prisma.crm.crmBkGame.update({
      where: { id: gameId },
      data: { status: 'CANCELLED' },
    });
    return true;
  }
}
