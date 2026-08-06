import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import { happyCallService } from './services/happy-call.service.js';
import { ticketService } from './services/ticket.service.js';
import { campaignService } from './services/campaign.service.js';
import { dashboardService } from './services/dashboard.service.js';

export async function csRoutes(fastify: FastifyInstance) {
  // ---------------------------------------------------------
  // Happy Call Endpoints
  // ---------------------------------------------------------

  fastify.get(
    '/cs/happy-calls',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await happyCallService.listTasks(fastify, request.query as any);
        return reply.send({ success: true, ...result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.post(
    '/cs/happy-calls/generate',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await happyCallService.generateDailyTasks(fastify);
        return reply.send({ success: true, ...result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.put(
    '/cs/happy-calls/:id/status',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const { status } = request.body as any;
        const result = await happyCallService.updateStatus(fastify, parseInt(id, 10), status);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.post(
    '/cs/happy-calls/:id/survey',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const result = await happyCallService.submitSurvey(fastify, parseInt(id, 10), request.body as any);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  // ---------------------------------------------------------
  // Ticket Endpoints
  // ---------------------------------------------------------

  // Department Handlers Config
  fastify.get(
    '/cs/tickets/department-handlers',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await ticketService.getDepartmentHandlers(fastify);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.put(
    '/cs/tickets/department-handlers',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await ticketService.updateDepartmentHandlers(fastify, request.body as any);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.get('/cs/tickets', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await ticketService.listTickets(fastify, request.query as any);
      return reply.send({ success: true, ...result });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  fastify.post('/cs/tickets', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const staffId = request.user?.id;
      if (!staffId) return reply.status(401).send({ success: false, message: 'Unauthorized' });

      const result = await ticketService.createTicket(fastify, request.body as any, staffId);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  fastify.put(
    '/cs/tickets/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const result = await ticketService.updateTicket(fastify, parseInt(id, 10), request.body as any);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.post(
    '/cs/tickets/:id/resolve',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const staffId = request.user?.id;
        if (!staffId) return reply.status(401).send({ success: false, message: 'Unauthorized' });

        const result = await ticketService.resolveTicket(fastify, parseInt(id, 10), request.body as any, staffId);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.post(
    '/cs/tickets/subtasks/:id/schedule-inspection',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const staffId = request.user?.id;
        const staffName = request.user?.displayName || (request.user as any)?.name || `Staff #${staffId}`;
        if (!staffId) return reply.status(401).send({ success: false, message: 'Unauthorized' });

        const result = await ticketService.scheduleShopInspection(
          fastify,
          parseInt(id, 10),
          request.body as any,
          staffId,
          staffName
        );
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.post(
    '/cs/tickets/subtasks/:id/resolve',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const staffId = request.user?.id;
        const staffName = request.user?.displayName || (request.user as any)?.name || `Staff #${staffId}`;
        if (!staffId) return reply.status(401).send({ success: false, message: 'Unauthorized' });

        const result = await ticketService.resolveSubtask(
          fastify,
          parseInt(id, 10),
          request.body as any,
          staffId,
          staffName
        );
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.post(
    '/cs/tickets/:id/comments',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const staffId = request.user?.id;
        const staffName = request.user?.displayName || 'System';
        if (!staffId) return reply.status(401).send({ success: false, message: 'Unauthorized' });

        const result = await ticketService.addComment(
          fastify,
          parseInt(id, 10),
          request.body as any,
          staffId,
          staffName
        );
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  // ---------------------------------------------------------
  // Campaign Endpoints
  // ---------------------------------------------------------

  fastify.get('/cs/campaigns', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await campaignService.listCampaigns(fastify, request.query as any);
      return reply.send({ success: true, ...result });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  fastify.post('/cs/campaigns', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const staffId = request.user?.id;
      if (!staffId) return reply.status(401).send({ success: false, message: 'Unauthorized' });

      const result = await campaignService.createCampaign(fastify, request.body as any, staffId);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  fastify.put(
    '/cs/campaigns/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const result = await campaignService.updateCampaign(fastify, parseInt(id, 10), request.body as any);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.post(
    '/cs/campaigns/:id/activate',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const result = await campaignService.activateCampaign(fastify, parseInt(id, 10));
        return reply.send({ success: true, ...result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.get(
    '/cs/campaigns/:id/tasks',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as any;
        const result = await campaignService.getCampaignTasks(fastify, parseInt(id, 10), request.query as any);
        return reply.send({ success: true, ...result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  // ---------------------------------------------------------
  // Dashboard Endpoints
  // ---------------------------------------------------------

  fastify.get(
    '/cs/dashboard/stats',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await dashboardService.getDashboardStats(fastify, request.query as any);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.get(
    '/cs/dashboard/staff-rankings',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await dashboardService.getStaffRankings(fastify, request.query as any);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.get(
    '/cs/dashboard/rating-trends',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await dashboardService.getRatingTrends(fastify, request.query as any);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );

  fastify.get(
    '/cs/dashboard/staff-performance',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await dashboardService.getCsStaffPerformance(fastify, request.query as any);
        return reply.send({ success: true, data: result });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: error.message });
      }
    }
  );
}
