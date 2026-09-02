import { FastifyRequest, FastifyReply } from 'fastify';
import { isAdminOrSuperAdminRole, isCanonicalSuperAdminIdentity, isSuperAdminRole, UserRole } from '@mos-lab/shared';

// Interface for JWT payload
export interface JwtUserPayload {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  email?: string;
  /** Present only on a short-lived session issued through account switching. */
  impersonatorId?: number;
  impersonatorUsername?: string;
  impersonationAuditId?: number;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUserPayload;
    user: JwtUserPayload;
  }
}

const throttleCache = new Map<number, number>();

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();

    // Asynchronously update lastActiveAt once per minute
    const user = request.user;
    if (user && user.id) {
      // A newly promoted Danny Do session may still carry an older Admin JWT.
      // Resolve the canonical account's current persisted role before guards run
      // so a browser refresh is sufficient; no forced logout is required.
      if (!isSuperAdminRole(user.role) && isCanonicalSuperAdminIdentity(user)) {
        const currentStaff = await request.server.prisma.crm.crmStaff.findUnique({
          where: { id: user.id },
          select: { role: true, isActive: true },
        });
        if (!currentStaff?.isActive) {
          return reply.status(401).send({ error: 'Unauthorized', message: 'User not found or inactive' });
        }
        if (isSuperAdminRole(currentStaff.role)) {
          user.role = 'super_admin';
        }
      }

      const now = Date.now();
      const lastUpdated = throttleCache.get(user.id) || 0;
      if (now - lastUpdated > 60000) {
        // 60 seconds throttle
        throttleCache.set(user.id, now);

        /**
         * DATABASE SCHEMA REFERENCE:
         * We update the CrmStaff model's lastActiveAt field (apps/api/prisma/crm.prisma)
         */
        request.server.prisma.crm.crmStaff
          .update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
          })
          .catch((err) => {
            request.log.error('Failed to update lastActiveAt in middleware:', err);
          });
      }
    }
  } catch (err: SafeAny) {
    request.log.error('JWT verification failed:', (err as SafeAny).message, err.stack);
    reply.status(401).send({ error: 'Unauthorized', message: 'Token is missing or invalid' });
  }
}

export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Ensure auth ran first and populated request.user
    const user = request.user as JwtUserPayload | undefined;

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const isAllowed =
      rolesArray.includes(user.role) || (rolesArray.includes('admin') && isAdminOrSuperAdminRole(user.role));

    if (!isAllowed) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Role "${user.role}" does not have permission to access this resource`,
      });
    }
  };
}

/** Use for controls which ordinary Admins must not access. */
export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtUserPayload | undefined;

  if (!user) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }

  if (!isSuperAdminRole(user.role)) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Chỉ Super Admin mới có quyền truy cập khu vực này.',
    });
  }
}

export async function requireCatalogAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtUserPayload | undefined;

  if (!user) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }

  const isAuthorized =
    isAdminOrSuperAdminRole(user.role) ||
    user.username?.toLowerCase() === 'admin' ||
    user.username?.toLowerCase() === 'danhdo@gmail.com' ||
    user.email?.toLowerCase() === 'danhdo@gmail.com';

  if (!isAuthorized) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Chỉ có tài khoản Admin mới có quyền thêm, sửa, xóa Catalog',
    });
  }
}

export async function requireCampaignAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtUserPayload | undefined;

  if (!user) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }

  if (!canManageCampaign(user)) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Chỉ có tài khoản Admin / Quản lý mới có quyền quản lý Chiến dịch',
    });
  }
}

/**
 * Campaign managers retain access to archived records so they can audit,
 * restore, or reopen them. All other authenticated staff receive the
 * employee-facing campaign surface, where archived campaigns are hidden.
 */
export function canManageCampaign(user: Pick<JwtUserPayload, 'role' | 'username' | 'email'>): boolean {
  return (
    isAdminOrSuperAdminRole(user.role) ||
    user.role === 'manager' ||
    user.role === 'oc' ||
    user.role === 'ls' ||
    user.username?.toLowerCase() === 'admin' ||
    user.username?.toLowerCase() === 'danhdo@gmail.com' ||
    user.email?.toLowerCase() === 'danhdo@gmail.com'
  );
}
