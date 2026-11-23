import { FastifyInstance } from 'fastify';
import type { BkGameParticipant, SafeAny } from '@mos-lab/shared';
import { getActiveBkTelesalesIds } from '../bk-salary.service.js';

/**
 * Keeps ACTIVE non-TEAM games aligned with the current live BK_TELESALES roster
 * so newly added Bookers automatically appear in Team-Booking & Done Bonus tracking.
 */
export async function mergeActiveBkTelesalesParticipants(
  fastify: FastifyInstance,
  game: {
    id: number;
    gameType: string;
    status: string;
  },
  participants: BkGameParticipant[]
): Promise<BkGameParticipant[]> {
  if (game.status !== 'ACTIVE' || game.gameType === 'TEAM') {
    return participants;
  }
  const crm = fastify.prisma?.crm;
  if (!crm?.crmTeam && !crm?.crmConfig) {
    return participants;
  }

  let activeStaffIds: number[];
  try {
    activeStaffIds = await getActiveBkTelesalesIds(fastify);
  } catch (err) {
    fastify.log?.warn?.(err, `Failed to load active BK_TELESALES roster for game ${game.id}`);
    return participants;
  }

  const existingIds = new Set(
    participants.map((p) => Number(p.staffId)).filter((id) => Number.isInteger(id) && id > 0)
  );
  const missingIds = activeStaffIds.filter((id) => Number.isInteger(id) && id > 0 && !existingIds.has(id));
  if (missingIds.length === 0) {
    return participants;
  }

  const profileMap = new Map<number, { staffName: string; avatar: string | null }>();
  if (fastify.prisma?.legacy?.$queryRawUnsafe) {
    try {
      const profileRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT
          up.user_id AS staffId,
          up.full_name AS staffName,
          up.avatar AS avatar
        FROM user_profile up
        WHERE up.user_id IN (${missingIds.join(',')})
      `);
      for (const r of profileRows || []) {
        const sid = Number(r.staffId);
        if (sid > 0) {
          profileMap.set(sid, {
            staffName: r.staffName ? String(r.staffName) : `Nhân viên #${sid}`,
            avatar: r.avatar ? String(r.avatar) : null,
          });
        }
      }
    } catch (err) {
      fastify.log?.warn?.(err, `Failed to fetch legacy profiles for added BK_TELESALES staff on game ${game.id}`);
    }
  }

  const addedParticipants: BkGameParticipant[] = missingIds.map((sid) => {
    const profile = profileMap.get(sid);
    return {
      id: 0,
      gameId: game.id,
      staffId: sid,
      staffName: profile?.staffName || `Nhân viên #${sid}`,
      avatar: profile?.avatar || null,
      teamId: null,
      teamName: null,
      betAmount: 0,
      score: 0,
      rank: null,
      rewardAmount: 0,
      penaltyNote: null,
      status: 'ACTIVE',
      targetProgressPercent: 0,
    };
  });

  if (crm.crmBkGameParticipant?.createMany) {
    try {
      await crm.crmBkGameParticipant.createMany({
        data: addedParticipants.map((p) => ({
          gameId: game.id,
          staffId: p.staffId,
          staffName: p.staffName,
          avatar: p.avatar,
          betAmount: 0,
          score: 0,
          status: 'ACTIVE',
        })),
        skipDuplicates: true,
      });
    } catch {
      // Non-fatal: live computation still includes addedParticipants
    }
  }

  return [...participants, ...addedParticipants];
}
