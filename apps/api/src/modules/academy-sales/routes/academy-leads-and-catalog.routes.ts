import type { FastifyInstance } from 'fastify';
import type {
  CreateAcademyActivityRequest,
  CreateAcademyFollowUpRequest,
  CreateAcademyLeadRequest,
  ListAcademyFollowUpsParams,
  ListAcademyLeadCalendarParams,
  ListAcademyLeadsParams,
  RecordAcademyNoShowRequest,
  UpdateAcademyFollowUpRequest,
  UpdateAcademyLeadRequest,
  UpsertAcademyCourseRequest,
  UpsertAcademyPlaybookRequest,
} from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { AcademyImportService } from '../academy-import.service.js';
import { AcademySalesService } from '../academy-sales.service.js';
import { PancakeAcademySyncService, PancakeSyncConfigurationError } from '../pancake-sync.service.js';
import { actorFrom, parseId, requireAcademyAdmin, sendError } from './academy-sales-route-helpers.js';

export function registerAcademyLeadAndCatalogRoutes(fastify: FastifyInstance) {
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
