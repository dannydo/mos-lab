import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@mos-lab/shared';

// Interface for JWT payload
export interface JwtUserPayload {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
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

export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Ensure auth ran first and populated request.user
    const user = request.user as JwtUserPayload | undefined;

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (!allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Role "${user.role}" does not have permission to access this resource`,
      });
    }
  };
}
