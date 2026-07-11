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

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
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
        message: `Role "${user.role}" does not have permission to access this resource` 
      });
    }
  };
}
