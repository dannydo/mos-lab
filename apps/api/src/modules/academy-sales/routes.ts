import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  type CreateAcademyActivityRequest,
  type CreateAcademyCampaignRequest,
  type CreateAcademyFollowUpRequest,
  type CreateAcademyLeadRequest,
  type CreateAcademyTalentAssessmentRequest,
  type PreviewAcademyTalentAssessmentQuoteRequest,
  type RecordAcademyTalentPaymentRequest,
  type AddAcademyCampaignLeadsRequest,
  type AcademyCampaignStatus,
  type ListAcademyLeadCalendarParams,
  type ListAcademyTalentPaymentManagementParams,
  type ListAcademyCampaignLeadsParams,
  type ListAcademyCampaignsParams,
  type ListAcademyFollowUpsParams,
  type ListAcademyLeadsParams,
  type RemoveAcademyCampaignLeadRequest,
  type UpdateAcademyFollowUpRequest,
  type UpdateAcademyCampaignRequest,
  type UpdateAcademyLeadRequest,
  type UpdateAcademyTalentAssessmentRequest,
  type UpdateAcademyTalentLadderConfigurationRequest,
  type RecordAcademyNoShowRequest,
  type ToggleAcademyCampaignTouchpointLogRequest,
  type UpsertAcademyCourseRequest,
  type UpsertAcademyTalentInstructorRequest,
  type UpsertAcademyPlaybookRequest,
  isAdminOrSuperAdminRole,
} from '@mos-lab/shared';
import { requireAuth } from '../../middlewares/auth.js';
import {
  AcademySalesError,
  AcademySalesService,
  canAccessAcademySales,
  getAcademyWorkspaceAccess,
  type AcademyActor,
} from './academy-sales.service.js';
import { AcademyCampaignService } from './academy-campaign.service.js';
import { AcademyImportService } from './academy-import.service.js';
import { PancakeAcademySyncService, PancakeSyncConfigurationError } from './pancake-sync.service.js';
import { AcademyTalentAssessmentService } from './academy-talent-assessment.service.js';
import { AcademyTalentLadderConfigurationService } from './academy-talent-ladder-configuration.service.js';
import { broadcastAcademyTalentAssessmentState } from '../academy-workshops/academy-workshop-live.service.js';

function actorFrom(request: FastifyRequest): AcademyActor {
  const user = request.user;
  return {
    id: user.id,
    role: user.role,
    displayName: user.displayName,
    email: user.email,
    academyAccess: (request as FastifyRequest & { academyAccess?: boolean }).academyAccess,
  };
}

async function requireAcademyWorkspaceAccess(request: FastifyRequest, reply: FastifyReply) {
  // The access probe is deliberately available to every authenticated user so
  // the sidebar and route shell can fail closed without guessing from a role.
  const requestPath = request.url.split('?')[0].replace(/^\/api/, '');
  if (requestPath === '/academy-sales/access') return;

  await requireAuth(request, reply);
  if (reply.sent) return;

  const access = await getAcademyWorkspaceAccess(request.server, actorFrom(request));
  if (!access.canAccess) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Chỉ Admin hoặc thành viên đang hoạt động của đội Academy được truy cập khu vực này.',
    });
  }
  (request as FastifyRequest & { academyAccess?: boolean }).academyAccess = true;
}

function parseId(value: string, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AcademySalesError(`${label} không hợp lệ.`);
  return id;
}

async function broadcastTalentAssessmentUpdate(fastify: FastifyInstance, assessmentId: number) {
  try {
    await broadcastAcademyTalentAssessmentState(fastify, assessmentId);
  } catch (cause) {
    // The assessment transaction has already committed. Do not turn a
    // transient WebSocket snapshot failure into a false save failure that the
    // operator may retry and duplicate.
    fastify.log.warn({ cause, assessmentId }, 'Academy Workshop talent realtime broadcast failed');
  }
}

function sendError(fastify: FastifyInstance, reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof AcademySalesError) {
    return reply.status(error.statusCode).send({ error: error.name, message: error.message });
  }
  fastify.log.error(error, context);
  return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xử lý yêu cầu Sales Academy.' });
}

function requireAcademyAdmin(actor: AcademyActor) {
  if (!isAdminOrSuperAdminRole(actor.role) && actor.role !== 'manager') {
    throw new AcademySalesError('Chỉ Admin hoặc Quản lý được chạy import và đồng bộ nguồn.', 403);
  }
}

/** Ladder rewards alter future tuition quotes, so this is deliberately admin-only. */
function requireAcademyLadderAdmin(actor: AcademyActor) {
  if (!isAdminOrSuperAdminRole(actor.role)) {
    throw new AcademySalesError('Chỉ Admin được cập nhật bậc thang học bổng Academy.', 403);
  }
}

/** Bank-transfer confirmations are accounting actions, not normal lead edits. */
function requireAcademyPaymentConfirmation(actor: AcademyActor) {
  if (!isAdminOrSuperAdminRole(actor.role) && actor.role !== 'manager') {
    throw new AcademySalesError('Chỉ Admin hoặc Quản lý được xác nhận tiền Academy đã nhận.', 403);
  }
}

export async function academySalesRoutes(fastify: FastifyInstance) {
  // This plugin owns the complete /academy-sales surface. Guarding it here
  // means a copied URL or a raw API call cannot bypass the sidebar decision.
  fastify.addHook('preHandler', requireAcademyWorkspaceAccess);

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

  fastify.get('/academy-sales/leads', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.query as ListAcademyLeadsParams;
      return reply.send(await AcademySalesService.listLeads(fastify, actorFrom(request), params));
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy leads error');
    }
  });

  fastify.get('/academy-sales/calendar', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send(
        await AcademySalesService.listCalendarEvents(
          fastify,
          actorFrom(request),
          request.query as ListAcademyLeadCalendarParams
        )
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy test calendar error');
    }
  });

  fastify.post('/academy-sales/leads', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const lead = await AcademySalesService.createLead(
        fastify,
        actorFrom(request),
        request.body as CreateAcademyLeadRequest
      );
      return reply.status(201).send({ success: true, data: lead, message: 'Đã tạo lead Academy.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Create Academy lead error');
    }
  });

  // Instructor prices are Academy-native configuration, not browser constants.
  // The workshop needs the active list before an operator picks a course.
  fastify.get('/academy-sales/talent-instructors/manage', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      requireAcademyAdmin(actorFrom(request));
      return reply.send(await AcademyTalentAssessmentService.listInstructorConfigurations(fastify));
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy instructor configurations error');
    }
  });

  fastify.post('/academy-sales/talent-instructors', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      requireAcademyAdmin(actorFrom(request));
      return reply
        .status(201)
        .send(
          await AcademyTalentAssessmentService.createInstructor(
            fastify,
            (request.body || {}) as UpsertAcademyTalentInstructorRequest
          )
        );
    } catch (error) {
      return sendError(fastify, reply, error, 'Create Academy instructor error');
    }
  });

  fastify.put('/academy-sales/talent-instructors/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      requireAcademyAdmin(actorFrom(request));
      const { id } = request.params as { id: string };
      return reply.send(
        await AcademyTalentAssessmentService.updateInstructor(
          fastify,
          parseId(id, 'Giảng viên ID'),
          (request.body || {}) as UpsertAcademyTalentInstructorRequest
        )
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Update Academy instructor error');
    }
  });

  fastify.get('/academy-sales/talent-instructors', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      if (!canAccessAcademySales(actorFrom(request)))
        throw new AcademySalesError('Bạn không có quyền xem cấu hình Academy.', 403);
      return reply.send(await AcademyTalentAssessmentService.listInstructors(fastify));
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy talent instructors error');
    }
  });

  fastify.get('/academy-sales/talent-ladder', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      if (!canAccessAcademySales(actorFrom(request)))
        throw new AcademySalesError('Bạn không có quyền xem cấu hình Academy.', 403);
      return reply.send({ data: await AcademyTalentLadderConfigurationService.get(fastify) });
    } catch (error) {
      return sendError(fastify, reply, error, 'Get Academy talent ladder configuration error');
    }
  });

  fastify.put('/academy-sales/talent-ladder', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const actor = actorFrom(request);
      requireAcademyLadderAdmin(actor);
      const data = await AcademyTalentLadderConfigurationService.update(
        fastify,
        actor,
        (request.body || {}) as UpdateAcademyTalentLadderConfigurationRequest
      );
      return reply.send({ success: true, data, message: 'Đã lưu cấu hình bậc thang học bổng Academy.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Update Academy talent ladder configuration error');
    }
  });

  // The workshop paths deliberately precede the generic `leads/:id` route so
  // the talent flow stays an explicit CRM-native subresource.
  fastify.get('/academy-sales/leads/:id/talent-assessments', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send(
        await AcademyTalentAssessmentService.listForLead(fastify, actorFrom(request), parseId(id, 'Lead ID'))
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy talent assessments error');
    }
  });

  // Non-persistent server preview: the score/reward card must update while a
  // evaluator is dragging the workshop controls, before the draft is saved.
  fastify.post(
    '/academy-sales/leads/:id/talent-assessments/preview',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return reply.send(
          await AcademyTalentAssessmentService.previewQuote(
            fastify,
            actorFrom(request),
            parseId(id, 'Lead ID'),
            (request.body || {}) as PreviewAcademyTalentAssessmentQuoteRequest
          )
        );
      } catch (error) {
        return sendError(fastify, reply, error, 'Preview Academy talent assessment quote error');
      }
    }
  );

  fastify.post('/academy-sales/leads/:id/talent-assessments', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await AcademyTalentAssessmentService.create(
        fastify,
        actorFrom(request),
        parseId(id, 'Lead ID'),
        (request.body || {}) as CreateAcademyTalentAssessmentRequest
      );
      await broadcastTalentAssessmentUpdate(fastify, result.data.id);
      return reply.status(201).send(result);
    } catch (error) {
      return sendError(fastify, reply, error, 'Create Academy talent assessment error');
    }
  });

  fastify.put('/academy-sales/talent-assessments/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await AcademyTalentAssessmentService.update(
        fastify,
        actorFrom(request),
        parseId(id, 'Phiên Tố Chất ID'),
        (request.body || {}) as UpdateAcademyTalentAssessmentRequest
      );
      await broadcastTalentAssessmentUpdate(fastify, result.data.id);
      return reply.send(result);
    } catch (error) {
      return sendError(fastify, reply, error, 'Update Academy talent assessment error');
    }
  });

  fastify.post('/academy-sales/talent-assessments/:id/print', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send(
        await AcademyTalentAssessmentService.printInvoice(fastify, actorFrom(request), parseId(id, 'Phiên Tố Chất ID'))
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Print Academy talent invoice error');
    }
  });

  fastify.post(
    '/academy-sales/talent-assessments/:id/payments',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        requireAcademyPaymentConfirmation(actorFrom(request));
        const { id } = request.params as { id: string };
        return reply.send(
          await AcademyTalentAssessmentService.recordPayment(
            fastify,
            actorFrom(request),
            parseId(id, 'Phiên Tố Chất ID'),
            (request.body || {}) as RecordAcademyTalentPaymentRequest
          )
        );
      } catch (error) {
        return sendError(fastify, reply, error, 'Record Academy talent payment error');
      }
    }
  );

  fastify.get('/academy-sales/talent-payments', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send(
        await AcademyTalentAssessmentService.listPaymentManagement(
          fastify,
          actorFrom(request),
          request.query as ListAcademyTalentPaymentManagementParams
        )
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy tuition payments error');
    }
  });

  fastify.get('/academy-sales/talent-payments/:id/trace', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send(
        await AcademyTalentAssessmentService.getPaymentTrace(
          fastify,
          actorFrom(request),
          parseId(id, 'Phiếu học phí ID')
        )
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Get Academy tuition payment trace error');
    }
  });

  fastify.get('/academy-sales/leads/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.send({
        data: await AcademySalesService.getLead(fastify, actorFrom(request), parseId(id, 'Lead ID')),
      });
    } catch (error) {
      return sendError(fastify, reply, error, 'Get Academy lead error');
    }
  });

  fastify.put('/academy-sales/leads/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const lead = await AcademySalesService.updateLead(
        fastify,
        actorFrom(request),
        parseId(id, 'Lead ID'),
        request.body as UpdateAcademyLeadRequest
      );
      return reply.send({ success: true, data: lead, message: 'Đã cập nhật lead Academy.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Update Academy lead error');
    }
  });

  fastify.post('/academy-sales/leads/:id/activities', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const activity = await AcademySalesService.addActivity(
        fastify,
        actorFrom(request),
        parseId(id, 'Lead ID'),
        request.body as CreateAcademyActivityRequest
      );
      return reply.status(201).send({ success: true, data: activity, message: 'Đã ghi nhận hoạt động.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Create Academy activity error');
    }
  });

  fastify.post('/academy-sales/leads/:id/no-show', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const lead = await AcademySalesService.recordNoShow(
        fastify,
        actorFrom(request),
        parseId(id, 'Lead ID'),
        (request.body || {}) as RecordAcademyNoShowRequest
      );
      return reply.send({ success: true, data: lead, message: 'Đã ghi nhận không đến lịch test.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Record Academy no-show error');
    }
  });

  fastify.get('/academy-sales/follow-ups', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send(
        await AcademySalesService.listFollowUps(
          fastify,
          actorFrom(request),
          request.query as ListAcademyFollowUpsParams
        )
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy follow-ups error');
    }
  });

  fastify.post('/academy-sales/follow-ups', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const task = await AcademySalesService.createFollowUp(
        fastify,
        actorFrom(request),
        request.body as CreateAcademyFollowUpRequest
      );
      return reply.status(201).send({ success: true, data: task, message: 'Đã tạo follow-up task.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Create Academy follow-up error');
    }
  });

  fastify.put('/academy-sales/follow-ups/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const task = await AcademySalesService.updateFollowUp(
        fastify,
        actorFrom(request),
        parseId(id, 'Follow-up ID'),
        request.body as UpdateAcademyFollowUpRequest
      );
      return reply.send({ success: true, data: task, message: 'Đã cập nhật follow-up task.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Update Academy follow-up error');
    }
  });

  fastify.get('/academy-sales/playbooks', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send({ data: await AcademySalesService.listPlaybooks(fastify, actorFrom(request)) });
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy playbooks error');
    }
  });

  fastify.post('/academy-sales/playbooks', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const playbook = await AcademySalesService.upsertPlaybook(
        fastify,
        actorFrom(request),
        request.body as UpsertAcademyPlaybookRequest
      );
      return reply.status(201).send({ success: true, data: playbook, message: 'Đã tạo playbook.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Create Academy playbook error');
    }
  });

  fastify.put('/academy-sales/playbooks/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const playbook = await AcademySalesService.upsertPlaybook(
        fastify,
        actorFrom(request),
        request.body as UpsertAcademyPlaybookRequest,
        parseId(id, 'Playbook ID')
      );
      return reply.send({ success: true, data: playbook, message: 'Đã cập nhật playbook.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Update Academy playbook error');
    }
  });

  fastify.get('/academy-sales/courses', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send({ data: await AcademySalesService.listCourses(fastify, actorFrom(request)) });
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy courses error');
    }
  });

  fastify.post('/academy-sales/courses', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const course = await AcademySalesService.upsertCourse(
        fastify,
        actorFrom(request),
        request.body as UpsertAcademyCourseRequest
      );
      return reply.status(201).send({ success: true, data: course, message: 'Đã tạo khóa học.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Create Academy course error');
    }
  });

  fastify.put('/academy-sales/courses/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const course = await AcademySalesService.upsertCourse(
        fastify,
        actorFrom(request),
        request.body as UpsertAcademyCourseRequest,
        parseId(id, 'Khóa học ID')
      );
      return reply.send({ success: true, data: course, message: 'Đã cập nhật khóa học.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Update Academy course error');
    }
  });

  fastify.post('/academy-sales/import/supabase', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const actor = actorFrom(request);
      requireAcademyAdmin(actor);
      const body = (request.body || {}) as { dryRun?: boolean };
      const report = await AcademyImportService.run(fastify, { dryRun: body.dryRun !== false });
      return reply.send({
        success: true,
        data: report,
        message: report.dryRun ? 'Đã hoàn tất dry-run import.' : 'Đã hoàn tất import.',
      });
    } catch (error) {
      return sendError(fastify, reply, error, 'Import Academy Supabase error');
    }
  });

  fastify.post('/academy-sales/sync/pancake', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      requireAcademyAdmin(actorFrom(request));
      const report = await PancakeAcademySyncService.sync(fastify);
      return reply.send({ success: true, data: report, message: 'Đã hoàn tất đồng bộ Pancake Academy.' });
    } catch (error) {
      if (error instanceof PancakeSyncConfigurationError) {
        return reply.status(422).send({ error: error.name, message: error.message });
      }
      return sendError(fastify, reply, error, 'Sync Pancake Academy error');
    }
  });
}
