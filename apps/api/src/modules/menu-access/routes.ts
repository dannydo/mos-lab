import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { UpdateMenuAccessPolicyRequest } from '@mos-lab/shared';
import { requireAuth, requireSuperAdmin } from '../../middlewares/auth.js';
import { MenuAccessError, MenuAccessService, type MenuAccessActor } from './menu-access.service.js';

function actorFrom(request: FastifyRequest): MenuAccessActor {
  return {
    id: request.user.id,
    role: request.user.role,
    username: request.user.username,
    email: request.user.email,
  };
}

function sendError(fastify: FastifyInstance, reply: FastifyReply, error: unknown, context: string): void {
  if (error instanceof MenuAccessError) {
    reply.status(error.statusCode).send({ error: error.name, message: error.message });
    return;
  }
  fastify.log.error(error, context);
  reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xử lý cấu hình quyền menu.' });
}

export async function menuAccessRoutes(fastify: FastifyInstance) {
  // Every signed-in user can resolve their own menu. This only controls
  // visibility; routes and APIs still perform their own authorization checks.
  fastify.get('/menu-access/sidebar', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send(await MenuAccessService.getSidebarVisibility(fastify, actorFrom(request)));
    } catch (error) {
      sendError(fastify, reply, error, 'Resolve sidebar menu visibility error');
    }
  });

  fastify.get(
    '/menu-access/configuration',
    { preHandler: [requireAuth, requireSuperAdmin] },
    async (_request, reply) => {
      try {
        return reply.send(await MenuAccessService.getConfiguration(fastify));
      } catch (error) {
        sendError(fastify, reply, error, 'Get menu access configuration error');
      }
    }
  );

  fastify.put(
    '/menu-access/policies/:menuKey',
    { preHandler: [requireAuth, requireSuperAdmin] },
    async (request, reply) => {
      const { menuKey } = request.params as { menuKey: string };
      try {
        const policy = await MenuAccessService.updatePolicy(
          fastify,
          actorFrom(request),
          menuKey,
          request.body as UpdateMenuAccessPolicyRequest
        );
        return reply.send({ success: true, policy });
      } catch (error) {
        sendError(fastify, reply, error, `Update menu access policy ${menuKey} error`);
      }
    }
  );
}
