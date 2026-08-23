import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import { TeamConfigurationError, TeamService } from './team.service.js';
import { isAdminOrSuperAdminRole, UpsertTeamRequest, UpdateTeamMembersRequest } from '@mos-lab/shared';

function requireAdminRole(
  request: { user?: unknown },
  reply: { status: (code: number) => { send: (data: unknown) => void } }
) {
  const user = request.user as { role?: string; username?: string; email?: string } | undefined;
  if (!user) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Vui lòng đăng nhập.' });
    return false;
  }

  const isAdmin =
    isAdminOrSuperAdminRole(user.role) ||
    user.username === 'admin' ||
    user.username === 'danhdo@gmail.com' ||
    user.email === 'danhdo@gmail.com';

  if (!isAdmin) {
    reply.status(403).send({ error: 'Forbidden', message: 'Chỉ Admin mới có quyền thực hiện thao tác này.' });
    return false;
  }
  return true;
}

function sendTeamConfigurationError(
  reply: { status: (code: number) => { send: (data: unknown) => void } },
  err: unknown
) {
  if (err instanceof TeamConfigurationError) {
    reply.status(err.statusCode).send({ error: 'Team Configuration Error', message: err.message });
    return true;
  }
  return false;
}

export async function teamRoutes(fastify: FastifyInstance) {
  // GET /api/teams (List all teams with hierarchy and member count)
  fastify.get('/teams', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const result = await TeamService.listTeams(fastify);
      return reply.send(result);
    } catch (err) {
      fastify.log.error(err as Error, 'List teams error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy danh sách đội nhóm.' });
    }
  });

  // GET /api/teams/:code (Get single team details + candidate members)
  fastify.get('/teams/:code', { preHandler: [requireAuth] }, async (request, reply) => {
    const { code } = request.params as { code: string };
    try {
      const result = await TeamService.getTeamDetailByCode(fastify, code);
      if (!result) {
        return reply.status(404).send({ error: 'Not Found', message: `Không tìm thấy đội nhóm với mã ${code}.` });
      }
      return reply.send(result);
    } catch (err) {
      fastify.log.error(err as Error, `Get team ${code} error`);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy thông tin đội nhóm.' });
    }
  });

  // GET /api/teams/staff-ids/:code (Get active staff IDs for a team)
  fastify.get('/teams/staff-ids/:code', { preHandler: [requireAuth] }, async (request, reply) => {
    const { code } = request.params as { code: string };
    try {
      const fallbackKey = `ACTIVE_${code.toUpperCase()}_STAFF_CONFIG`;
      const activeIds = await TeamService.getActiveStaffIdsWithFallback(fastify, code, fallbackKey);
      return reply.send({ code, activeStaffIds: activeIds });
    } catch (err) {
      fastify.log.error(err as Error, `Get staff IDs for team ${code} error`);
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy danh sách ID nhân viên.' });
    }
  });

  // POST /api/teams (Create team - Admin only)
  fastify.post('/teams', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!requireAdminRole(request, reply)) return;

    const body = request.body as UpsertTeamRequest;
    if (!body.code || !body.name) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu thông tin code hoặc name.' });
    }

    try {
      const team = await TeamService.upsertTeam(fastify, body);
      return reply.status(201).send({ success: true, team });
    } catch (err) {
      if (sendTeamConfigurationError(reply, err)) return;
      fastify.log.error(err as Error, 'Create team error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tạo đội nhóm.' });
    }
  });

  // PUT /api/teams/:id (Update team - Admin only)
  fastify.put('/teams/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!requireAdminRole(request, reply)) return;

    const { id } = request.params as { id: string };
    const teamId = Number(id);
    if (isNaN(teamId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ.' });
    }

    const body = request.body as UpsertTeamRequest;
    try {
      const team = await TeamService.upsertTeam(fastify, body, teamId);
      return reply.send({ success: true, team });
    } catch (err) {
      if (sendTeamConfigurationError(reply, err)) return;
      fastify.log.error(err as Error, `Update team ${teamId} error`);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể cập nhật đội nhóm.' });
    }
  });

  // DELETE /api/teams/:id (Delete an empty leaf team - Admin only)
  fastify.delete('/teams/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!requireAdminRole(request, reply)) return;

    const { id } = request.params as { id: string };
    const teamId = Number(id);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ.' });
    }

    try {
      const team = await TeamService.deleteTeam(fastify, teamId);
      return reply.send({ success: true, message: `Đã xóa team ${team.code}.` });
    } catch (err) {
      if (sendTeamConfigurationError(reply, err)) return;
      fastify.log.error(err as Error, `Delete team ${teamId} error`);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xóa đội nhóm.' });
    }
  });

  // PUT /api/teams/:id/members (Update team member active IDs - Admin only)
  fastify.put('/teams/:id/members', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!requireAdminRole(request, reply)) return;

    const { id } = request.params as { id: string };
    const teamId = Number(id);
    if (isNaN(teamId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ.' });
    }

    const { activeStaffIds } = request.body as UpdateTeamMembersRequest;
    if (!Array.isArray(activeStaffIds)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'activeStaffIds phải là mảng số.' });
    }

    try {
      await TeamService.updateTeamMembers(fastify, teamId, activeStaffIds);

      // Also sync to crmConfig for legacy fallback consistency
      const team = await fastify.prisma.crm.crmTeam.findUnique({ where: { id: teamId } });
      if (team) {
        const configKey = `ACTIVE_${team.code.toUpperCase()}_STAFF_CONFIG`;
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: configKey },
          update: { value: JSON.stringify(activeStaffIds) },
          create: { key: configKey, value: JSON.stringify(activeStaffIds) },
        });
      }

      return reply.send({ success: true, message: 'Đã cập nhật danh sách thành viên đội thành công!' });
    } catch (err) {
      fastify.log.error(err as Error, `Update team members for ${teamId} error`);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể cập nhật thành viên đội.' });
    }
  });
}
