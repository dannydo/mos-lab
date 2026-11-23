import type { FastifyInstance } from 'fastify';
import type {
  CreateAcademyTalentAssessmentRequest,
  ListAcademyTalentPaymentManagementParams,
  PreviewAcademyTalentAssessmentQuoteRequest,
  RecordAcademyTalentPaymentRequest,
  UpdateAcademyTalentAssessmentRequest,
  UpdateAcademyTalentLadderConfigurationRequest,
  UpsertAcademyTalentInstructorRequest,
} from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { AcademySalesError, canAccessAcademySales } from '../academy-sales.service.js';
import { AcademyTalentAssessmentService } from '../academy-talent-assessment.service.js';
import { AcademyTalentLadderConfigurationService } from '../academy-talent-ladder-configuration.service.js';
import {
  actorFrom,
  broadcastTalentAssessmentUpdate,
  parseId,
  requireAcademyPaymentConfirmation,
  requireAcademyRestrictedSettings,
  sendError,
} from './academy-sales-route-helpers.js';

export function registerAcademyTalentRoutes(fastify: FastifyInstance) {
  // Instructor prices are Academy-native configuration, not browser constants.
  // The workshop needs the active list before an operator picks a course.
  fastify.get('/academy-sales/talent-instructors/manage', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      requireAcademyRestrictedSettings(actorFrom(request));
      return reply.send(await AcademyTalentAssessmentService.listInstructorConfigurations(fastify));
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy instructor configurations error');
    }
  });

  fastify.post('/academy-sales/talent-instructors', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      requireAcademyRestrictedSettings(actorFrom(request));
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
      requireAcademyRestrictedSettings(actorFrom(request));
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
      if (!canAccessAcademySales(actorFrom(request))) {
        throw new AcademySalesError('Bạn không có quyền xem cấu hình Academy.', 403);
      }
      return reply.send(await AcademyTalentAssessmentService.listInstructors(fastify));
    } catch (error) {
      return sendError(fastify, reply, error, 'List Academy talent instructors error');
    }
  });

  fastify.get('/academy-sales/talent-ladder', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      if (!canAccessAcademySales(actorFrom(request))) {
        throw new AcademySalesError('Bạn không có quyền xem cấu hình Academy.', 403);
      }
      return reply.send({ data: await AcademyTalentLadderConfigurationService.get(fastify) });
    } catch (error) {
      return sendError(fastify, reply, error, 'Get Academy talent ladder configuration error');
    }
  });

  fastify.put('/academy-sales/talent-ladder', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const actor = actorFrom(request);
      requireAcademyRestrictedSettings(actor);
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
}
