import type { FastifyInstance } from 'fastify';
import type {
  AcademyCampaignStatus,
  AddAcademyCampaignLeadsRequest,
  CreateAcademyCampaignRequest,
  ListAcademyCampaignLeadsParams,
  ListAcademyCampaignsParams,
  RemoveAcademyCampaignLeadRequest,
  ToggleAcademyCampaignTouchpointLogRequest,
  UpdateAcademyCampaignRequest,
} from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { AcademyCampaignService } from '../academy-campaign.service.js';
import { AcademySalesService, getAcademyWorkspaceAccess } from '../academy-sales.service.js';
import { actorFrom, parseId, sendError } from './academy-sales-route-helpers.js';

export function registerAcademyCampaignRoutes(fastify: FastifyInstance) {
  fastify.get('/academy-sales/access', { preHandler: [requireAuth] }, async (request, reply) => {
    const access = await getAcademyWorkspaceAccess(fastify, actorFrom(request));
    return reply.send({ data: access });
  });

  fastify.get('/academy-sales/staff', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send({ data: await AcademySalesService.listStaffOptions(fastify, actorFrom(request)) });
    } catch (error) {
      return sendError(fastify, reply, error, 'Academy staff options error');
    }
  });

  // Academy campaigns deliberately live beside Sales Academy rather than under
  // the legacy `/campaigns` module. Their audience is a fixed CRM-native lead
  // snapshot and no legacy promotion/customer tables are involved.
  fastify.get('/academy-sales/campaigns', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send(
        await AcademyCampaignService.listCampaigns(
          fastify,
          actorFrom(request),
          request.query as ListAcademyCampaignsParams
        )
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy campaigns error');
    }
  });

  fastify.post('/academy-sales/campaigns', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const result = await AcademyCampaignService.createCampaign(
        fastify,
        actorFrom(request),
        (request.body || {}) as CreateAcademyCampaignRequest
      );
      return reply.status(201).send(result);
    } catch (error) {
      return sendError(fastify, reply, error, 'Create Academy campaign error');
    }
  });

  // Must remain above dynamic campaign routes so `sidebar` is never parsed as
  // an id/slug. The server returns only links this caller may discover.
  fastify.get('/academy-sales/campaigns/sidebar', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send({ data: await AcademyCampaignService.listSidebarCampaigns(fastify, actorFrom(request)) });
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy campaign sidebar links error');
    }
  });

  // Keep this static route above `:id` for an unambiguous public campaign link.
  fastify.get('/academy-sales/campaigns/slug/:slug', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      return reply.send({ data: await AcademyCampaignService.getCampaignBySlug(fastify, actorFrom(request), slug) });
    } catch (error) {
      return sendError(fastify, reply, error, 'Get Academy campaign by slug error');
    }
  });

  fastify.get('/academy-sales/campaigns/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send({
        data: await AcademyCampaignService.getCampaignById(fastify, actorFrom(request), parseId(id, 'Campaign ID')),
      });
    } catch (error) {
      return sendError(fastify, reply, error, 'Get Academy campaign error');
    }
  });

  fastify.put('/academy-sales/campaigns/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send(
        await AcademyCampaignService.updateCampaign(
          fastify,
          actorFrom(request),
          parseId(id, 'Campaign ID'),
          (request.body || {}) as UpdateAcademyCampaignRequest
        )
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Update Academy campaign error');
    }
  });

  fastify.post('/academy-sales/campaigns/:id/status', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = (request.body || {}) as { status: AcademyCampaignStatus };
      return reply.send(
        await AcademyCampaignService.setCampaignStatus(fastify, actorFrom(request), parseId(id, 'Campaign ID'), status)
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Set Academy campaign status error');
    }
  });

  fastify.post('/academy-sales/campaigns/:id/archive', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send(
        await AcademyCampaignService.archiveCampaign(fastify, actorFrom(request), parseId(id, 'Campaign ID'))
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Archive Academy campaign error');
    }
  });

  fastify.post('/academy-sales/campaigns/:id/clone', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send(
        await AcademyCampaignService.cloneCampaign(fastify, actorFrom(request), parseId(id, 'Campaign ID'))
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Clone Academy campaign error');
    }
  });

  fastify.post('/academy-sales/campaigns/:id/restore', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send(
        await AcademyCampaignService.restoreCampaign(fastify, actorFrom(request), parseId(id, 'Campaign ID'))
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Restore Academy campaign error');
    }
  });

  fastify.delete('/academy-sales/campaigns/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send(
        await AcademyCampaignService.deleteCampaign(fastify, actorFrom(request), parseId(id, 'Campaign ID'))
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Delete Academy campaign error');
    }
  });

  fastify.get('/academy-sales/campaigns/:id/leads', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send(
        await AcademyCampaignService.listCampaignLeads(
          fastify,
          actorFrom(request),
          parseId(id, 'Campaign ID'),
          request.query as ListAcademyCampaignLeadsParams
        )
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy campaign leads error');
    }
  });

  fastify.post('/academy-sales/campaigns/:id/leads', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply
        .status(201)
        .send(
          await AcademyCampaignService.addLeads(
            fastify,
            actorFrom(request),
            parseId(id, 'Campaign ID'),
            (request.body || {}) as AddAcademyCampaignLeadsRequest
          )
        );
    } catch (error) {
      return sendError(fastify, reply, error, 'Add Academy campaign leads error');
    }
  });

  fastify.delete(
    '/academy-sales/campaigns/:id/leads/:leadId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { id, leadId } = request.params as { id: string; leadId: string };
        return reply.send(
          await AcademyCampaignService.removeLead(
            fastify,
            actorFrom(request),
            parseId(id, 'Campaign ID'),
            parseId(leadId, 'Lead ID'),
            (request.body || {}) as RemoveAcademyCampaignLeadRequest
          )
        );
      } catch (error) {
        return sendError(fastify, reply, error, 'Remove Academy campaign lead error');
      }
    }
  );

  fastify.post(
    '/academy-sales/campaigns/:id/leads/:leadId/touchpoints/:touchpointId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { id, leadId, touchpointId } = request.params as { id: string; leadId: string; touchpointId: string };
        return reply.send(
          await AcademyCampaignService.toggleTouchpointLog(
            fastify,
            actorFrom(request),
            parseId(id, 'Campaign ID'),
            parseId(leadId, 'Lead ID'),
            parseId(touchpointId, 'Touchpoint ID'),
            (request.body || {}) as ToggleAcademyCampaignTouchpointLogRequest
          )
        );
      } catch (error) {
        return sendError(fastify, reply, error, 'Toggle Academy campaign touchpoint error');
      }
    }
  );

  fastify.get('/academy-sales/campaigns/:id/stats', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send({
        data: await AcademyCampaignService.getStats(fastify, actorFrom(request), parseId(id, 'Campaign ID')),
      });
    } catch (error) {
      return sendError(fastify, reply, error, 'Get Academy campaign stats error');
    }
  });
}
