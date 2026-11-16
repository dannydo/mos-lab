import { FastifyInstance, FastifyRequest } from 'fastify';
import { hasCcTeamMembership, isAdminOrSuperAdminRole, normalizeCvFeatherRole, SafeAny } from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';

export interface IosAuthContext {
  id?: number;
  legacyStaffId?: number;
  clientStoreId?: number;
  username?: string;
  displayName?: string;
  role?: string;
  teamCodes?: string[];
  careerTier?: 'CVL' | 'CVLL' | 'CC' | 'ADMIN';
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
    const careerTier: IosAuthContext['careerTier'] =
      normalizeCvFeatherRole(rawRole) ||
      (isAdminOrSuperAdminRole(rawRole) ? 'ADMIN' : rawRole === 'cc' || hasCcTeamMembership(teamCodes) ? 'CC' : 'CVL');

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
    };
  } catch {
    return null;
  }
}
