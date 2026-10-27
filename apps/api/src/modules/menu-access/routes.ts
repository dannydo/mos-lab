import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { UpdateMenuAccessPolicyRequest, UpdateRoleGroupMatrixRequest } from '@mos-lab/shared';
import { requireAuth, requireSuperAdmin } from '../../middlewares/auth.js';
import { MenuAccessError, MenuAccessService, type MenuAccessActor } from './menu-access.service.js';

function actorFrom(request: FastifyRequest): MenuAccessActor {
  return {
    id: request.user.id,
    role: request.user.role,
    username: request.user.username,
    displayName: request.user.displayName,
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
  // Every signed-in user can resolve their own menu.
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

  fastify.put(
    '/menu-access/role-groups/:roleGroupId',
    { preHandler: [requireAuth, requireSuperAdmin] },
    async (request, reply) => {
      const { roleGroupId } = request.params as { roleGroupId: string };
      const body = request.body as UpdateRoleGroupMatrixRequest;
      try {
        const configuration = await MenuAccessService.updateRoleGroupMatrix(
          fastify,
          actorFrom(request),
          Number(roleGroupId),
          Array.isArray(body?.allowedMenuKeys) ? body.allowedMenuKeys : []
        );
        return reply.send({ success: true, configuration });
      } catch (error) {
        sendError(fastify, reply, error, `Update role group matrix ${roleGroupId} error`);
      }
    }
  );

  fastify.get('/menu-access/inspect', { preHandler: [requireAuth, requireSuperAdmin] }, async (request, reply) => {
    const query = request.query as { staffId?: string; roleGroupId?: string; at?: string };
    try {
      const result = await MenuAccessService.inspectPermissions(fastify, {
        staffId: query.staffId ? Number(query.staffId) : undefined,
        roleGroupId: query.roleGroupId ? Number(query.roleGroupId) : undefined,
        at: query.at,
      });
      return reply.send(result);
    } catch (error) {
      sendError(fastify, reply, error, 'Inspect permissions error');
    }
  });
}
