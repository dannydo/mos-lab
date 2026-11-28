import { FastifyInstance, FastifyRequest } from 'fastify';
import {
  getVietnamDateYmd,
  hasCcTeamMembership,
  isAdminOrSuperAdminRole,
  normalizeCvFeatherRole,
  SafeAny,
} from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';
import { CvlTrainingMentorshipService } from '../../kpi/services/cvl-training-mentorship.service.js';

export interface IosAuthContext {
  id?: number;
  legacyStaffId?: number;
  clientStoreId?: number;
  username?: string;
  displayName?: string;
  role?: string;
  teamCodes?: string[];
  careerTier?: 'CVL' | 'CVLL' | 'CC' | 'ADMIN';
  isTrainingMentee?: boolean;
  trainingMentorName?: string;
  mentoringMenteeStaffIds?: number[];
  mentoringMenteeName?: string;
}

export async function resolveIosAuth(
  fastify: FastifyInstance,
  request: FastifyRequest
): Promise<IosAuthContext | null> {
  const authHeader = request.headers.authorization || '';

  if (process.env.NODE_ENV !== 'production') {
    if (!authHeader || authHeader === 'Bearer mock-token-for-dev' || authHeader.trim().length <= 7) {
      return {
        id: 1,
        legacyStaffId: 13783,
        clientStoreId: 6,
        username: 'superadmin_dev',
        displayName: 'Khanh Cao',
        role: 'super_admin',
        careerTier: 'ADMIN',
      };
    }
  }

  if (!authHeader.toLowerCase().startsWith('bearer ') || authHeader.trim().length <= 7) {
    return null;
  }

  try {
    await request.jwtVerify();
    const payload = request.user as SafeAny;
    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, displayName: true, role: true, legacyStaffId: true },
    });

    const rawRole = String(staff?.role || payload.role || '').toLowerCase();
    const legacyStaffId = staff?.legacyStaffId || payload.legacyStaffId || undefined;
    const teamCodes = await TeamService.getActiveTeamCodesForStaff(
      fastify,
      Number(staff?.id || payload.id || 0),
      legacyStaffId
    );
    const todayVn = getVietnamDateYmd();
    const todayTrainingPairs = legacyStaffId
      ? await CvlTrainingMentorshipService.getActivePairsForRange(fastify, todayVn, todayVn).catch(() => [])
      : [];
    const numericLegacyId = Number(legacyStaffId || 0);
    const activeMenteePair =
      numericLegacyId > 0
        ? todayTrainingPairs.find(
            (p) => p.isActive && p.outcome !== 'RETURNED_TO_CV' && p.menteeLegacyStaffId === numericLegacyId
          )
        : undefined;
    const activeMentorPairs =
      numericLegacyId > 0
        ? todayTrainingPairs.filter(
            (p) => p.isActive && p.outcome !== 'RETURNED_TO_CV' && p.mentorLegacyStaffId === numericLegacyId
          )
        : [];

    const careerTier: IosAuthContext['careerTier'] =
      normalizeCvFeatherRole(rawRole) ||
      (isAdminOrSuperAdminRole(rawRole)
        ? 'ADMIN'
        : rawRole === 'cc' || hasCcTeamMembership(teamCodes)
          ? 'CC'
          : activeMenteePair
            ? 'CVL'
            : undefined);

    let clientStoreId: number | undefined;
    if (legacyStaffId) {
      try {
        const legacyProfile = await fastify.prisma.legacy.user_profile.findFirst({
          where: { user_id: Number(legacyStaffId) },
          select: { client_store_id: true },
        });
        if (legacyProfile?.client_store_id) {
          clientStoreId = Number(legacyProfile.client_store_id);
        }
      } catch {
        // Non-blocking fallback when legacy profile lookup is unavailable
      }
    }

    return {
      id: staff?.id || payload.id,
      legacyStaffId,
      clientStoreId,
      username: staff?.username || payload.username,
      displayName: staff?.displayName || payload.displayName,
      role: rawRole,
      teamCodes,
      careerTier,
      ...(activeMenteePair
        ? {
            isTrainingMentee: true,
            trainingMentorName: activeMenteePair.mentorDisplayName,
          }
        : {}),
      ...(activeMentorPairs.length > 0
        ? {
            mentoringMenteeStaffIds: activeMentorPairs.map((p) => p.menteeLegacyStaffId),
            mentoringMenteeName: activeMentorPairs[0]?.menteeDisplayName,
          }
        : {}),
    };
  } catch {
    return null;
  }
}
