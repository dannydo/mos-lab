import { FastifyInstance } from 'fastify';
import {
  BkGame,
  BkGameCreateInput,
  BkGameFinalizeInput,
  BkGameParticipant,
  BkGameUpdateInput,
  SafeAny,
} from '@mos-lab/shared';
import { getActiveBkTelesalesIds } from '../bk-salary.service.js';
import { BkGameTeamBookingDoneBonusService } from '../bk-game-team-booking-done-bonus.service.js';
import { LegacyStaffRow, mapBkGameParticipantDto, serializeTeamBookingDoneBonusConfig } from './bk-game-helpers.js';
import { getGameDetail } from './bk-game-queries.js';

async function resolveParticipantProfiles(
  fastify: FastifyInstance,
  participantStaffIds: number[]
): Promise<Map<number, LegacyStaffRow>> {
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

  return staffMap;
}

function buildWinnersMap(
  leaderboard: BkGameParticipant[],
  game: BkGame,
  input?: BkGameFinalizeInput
): Map<number, number> {
  const rewardPool = game.rewardPool || 0;
  const winnersMap = new Map<number, number>();

  if (input?.winners && input.winners.length > 0) {
    for (const w of input.winners) {
      if (w.participantId) {
        winnersMap.set(w.participantId, w.rewardAmount);
      }
    }
    return winnersMap;
  }

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

  return winnersMap;
}

/**
 * Creates a new Telesales Game (individual or team battle).
 */
export async function createGame(
  fastify: FastifyInstance,
  input: BkGameCreateInput,
  creatorStaffId: number
): Promise<BkGame> {
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

  const staffMap = await resolveParticipantProfiles(fastify, participantStaffIds);

  const entryFee = input.entryFee || 0;
  const baseRewardPool = input.rewardPool || 0;
  const totalRewardPool = baseRewardPool + entryFee * participantStaffIds.length;
  const serializedTeamBookingDoneBonusConfig = serializeTeamBookingDoneBonusConfig(input.teamBookingDoneBonusConfig);

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
        doneBonusConfig:
          input.doneBonusConfig && input.doneBonusConfig.length > 0 ? JSON.stringify(input.doneBonusConfig) : null,
        teamKpiConfig: input.teamKpiConfig ? JSON.stringify(input.teamKpiConfig) : null,
        teamBookingDoneBonusConfig: serializedTeamBookingDoneBonusConfig,
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

  const detail = await getGameDetail(fastify, createdGame.id);
  return detail!.game;
}

/**
 * Updates an existing Telesales game's settings (channels, target, descriptions, etc.).
 */
export async function updateGame(fastify: FastifyInstance, gameId: number, input: BkGameUpdateInput): Promise<BkGame> {
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
  if (input.doneBonusConfig !== undefined) {
    data.doneBonusConfig =
      input.doneBonusConfig && input.doneBonusConfig.length > 0 ? JSON.stringify(input.doneBonusConfig) : null;
  }
  if (input.teamKpiConfig !== undefined) {
    data.teamKpiConfig = input.teamKpiConfig ? JSON.stringify(input.teamKpiConfig) : null;
  }
  if (input.teamBookingDoneBonusConfig !== undefined) {
    data.teamBookingDoneBonusConfig = serializeTeamBookingDoneBonusConfig(input.teamBookingDoneBonusConfig);
  }

  await fastify.prisma.crm.crmBkGame.update({
    where: { id: gameId },
    data,
  });

  if (input.teamBookingDoneBonusConfig !== undefined && existing.status === 'COMPLETED') {
    const updatedRow = await fastify.prisma.crm.crmBkGame.findUnique({
      where: { id: gameId },
      include: { participants: true },
    });
    if (updatedRow) {
      await BkGameTeamBookingDoneBonusService.syncAndComputeSummary(
        fastify,
        updatedRow,
        updatedRow.participants.map((p) => mapBkGameParticipantDto(p)),
        { forceSync: true }
      ).catch(() => {});
    }
  }

  const detail = await getGameDetail(fastify, gameId);
  return detail!.game;
}

/**
 * Finalizes game, calculates winners, distributes reward pool, and records fun penalty notes.
 */
export async function finalizeGame(
  fastify: FastifyInstance,
  gameId: number,
  input?: BkGameFinalizeInput
): Promise<BkGame> {
  const detail = await getGameDetail(fastify, gameId);
  if (!detail) {
    throw new Error(`Game với ID ${gameId} không tồn tại`);
  }

  const { game, leaderboard, teams } = detail;
  const penaltyDesc = game.penaltyDescription || 'Nhận hình phạt vui từ đội thắng';
  const winnersMap = buildWinnersMap(leaderboard, game, input);

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

  const finalizedDetail = await getGameDetail(fastify, gameId);
  return finalizedDetail!.game;
}

/**
 * Cancels a game.
 */
export async function cancelGame(fastify: FastifyInstance, gameId: number): Promise<boolean> {
  await fastify.prisma.crm.crmBkGame.update({
    where: { id: gameId },
    data: { status: 'CANCELLED' },
  });
  return true;
}
