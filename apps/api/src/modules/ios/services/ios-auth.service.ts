import { FastifyInstance, FastifyRequest } from 'fastify';
import { isAdminOrSuperAdminRole, normalizeCvFeatherRole, SafeAny } from '@mos-lab/shared';

export interface IosAuthContext {
  id?: number;
  legacyStaffId?: number;
  username?: string;
  displayName?: string;
  role?: string;
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
    const careerTier = normalizeCvFeatherRole(rawRole) || (isAdminOrSuperAdminRole(rawRole) ? 'ADMIN' : 'CVL');

    return {
      id: staff?.id || payload.id,
      legacyStaffId: staff?.legacyStaffId || payload.legacyStaffId || undefined,
      username: staff?.username || payload.username,
      displayName: staff?.displayName || payload.displayName,
      role: rawRole,
      careerTier,
    };
  } catch {
    return null;
  }
}
