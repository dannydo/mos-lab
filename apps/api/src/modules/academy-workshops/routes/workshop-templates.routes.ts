import type { FastifyInstance } from 'fastify';
import type {
  CreateAcademyWorkshopAgendaTemplateRequest,
  ListAcademyWorkshopAgendaTemplatesParams,
  ListAcademyWorkshopDesignTemplatesParams,
  ListAcademyWorkshopEquipmentTemplatesParams,
  ListAcademyWorkshopMenuTemplatesParams,
  ListAcademyWorkshopQuizTemplatesParams,
  UpdateAcademyWorkshopAgendaTemplateRequest,
  UpdateAcademyWorkshopDesignTemplateRequest,
  UpdateAcademyWorkshopEquipmentTemplateRequest,
  UpdateAcademyWorkshopZaloTemplatesRequest,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import { AcademyWorkshopAgendaTemplateService } from '../academy-workshop-agenda-template.service.js';
import { AcademyWorkshopDesignTemplateService } from '../academy-workshop-design-template.service.js';
import { AcademyWorkshopEquipmentTemplateService } from '../academy-workshop-equipment-template.service.js';
import { AcademyWorkshopLiveService } from '../academy-workshop-live.service.js';
import { AcademyWorkshopMenuTemplateService } from '../academy-workshop-menu-template.service.js';
import { AcademyWorkshopService } from '../academy-workshop.service.js';
import { actorFrom, parseWorkshopId, sendWorkshopError } from './workshop-route-helpers.js';

export function registerWorkshopTemplateRoutes(fastify: FastifyInstance) {
  fastify.get('/academy-sales/workshop-agenda-templates', async (request, reply) => {
    try {
      return reply.send(
        await AcademyWorkshopAgendaTemplateService.list(
          fastify,
          actorFrom(request),
          request.query as ListAcademyWorkshopAgendaTemplatesParams
        )
      );
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'List workshop agenda templates');
    }
  });

  fastify.post('/academy-sales/workshop-agenda-templates', async (request, reply) => {
    try {
      const data = await AcademyWorkshopAgendaTemplateService.create(
        fastify,
        actorFrom(request),
        request.body as CreateAcademyWorkshopAgendaTemplateRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo mẫu agenda.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop agenda template');
    }
  });

  fastify.put('/academy-sales/workshop-agenda-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      const data = await AcademyWorkshopAgendaTemplateService.update(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Mẫu agenda'),
        request.body as UpdateAcademyWorkshopAgendaTemplateRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mẫu agenda.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop agenda template');
    }
  });

  fastify.delete('/academy-sales/workshop-agenda-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      await AcademyWorkshopAgendaTemplateService.delete(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Mẫu agenda')
      );
      return reply.send({ success: true, message: 'Đã xóa mẫu agenda.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Delete workshop agenda template');
    }
  });

  fastify.get('/academy-sales/workshop-menu-templates', async (request, reply) => {
    try {
      return reply.send(
        await AcademyWorkshopMenuTemplateService.list(
          fastify,
          actorFrom(request),
          request.query as ListAcademyWorkshopMenuTemplatesParams
        )
      );
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'List workshop menu templates');
    }
  });

  fastify.delete('/academy-sales/workshop-menu-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      await AcademyWorkshopMenuTemplateService.delete(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Mẫu thực đơn')
      );
      return reply.send({ success: true, message: 'Đã xóa mẫu thực đơn.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Delete workshop menu template');
    }
  });

  fastify.get('/academy-sales/workshop-equipment-templates', async (request, reply) => {
    try {
      return reply.send(
        await AcademyWorkshopEquipmentTemplateService.list(
          fastify,
          actorFrom(request),
          request.query as ListAcademyWorkshopEquipmentTemplatesParams
        )
      );
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'List workshop equipment templates');
    }
  });

  fastify.put('/academy-sales/workshop-equipment-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      const data = await AcademyWorkshopEquipmentTemplateService.update(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Mẫu bộ dụng cụ'),
        request.body as UpdateAcademyWorkshopEquipmentTemplateRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mẫu bộ dụng cụ.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop equipment template');
    }
  });

  fastify.delete('/academy-sales/workshop-equipment-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      await AcademyWorkshopEquipmentTemplateService.delete(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Mẫu bộ dụng cụ')
      );
      return reply.send({ success: true, message: 'Đã xóa mẫu bộ dụng cụ.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Delete workshop equipment template');
    }
  });

  fastify.get('/academy-sales/workshop-design-templates', async (request, reply) => {
    try {
      return reply.send(
        await AcademyWorkshopDesignTemplateService.list(
          fastify,
          actorFrom(request),
          request.query as ListAcademyWorkshopDesignTemplatesParams
        )
      );
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'List workshop design templates');
    }
  });

  fastify.put('/academy-sales/workshop-design-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      const data = await AcademyWorkshopDesignTemplateService.update(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Mẫu thiết kế mi'),
        request.body as UpdateAcademyWorkshopDesignTemplateRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mẫu thiết kế mi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop design template');
    }
  });

  fastify.delete('/academy-sales/workshop-design-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      await AcademyWorkshopDesignTemplateService.delete(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Mẫu thiết kế mi')
      );
      return reply.send({ success: true, message: 'Đã xóa mẫu thiết kế mi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Delete workshop design template');
    }
  });

  fastify.get('/academy-sales/workshop-quiz-templates', async (request, reply) => {
    try {
      return reply.send(
        await AcademyWorkshopLiveService.listQuizTemplates(
          fastify,
          actorFrom(request),
          request.query as ListAcademyWorkshopQuizTemplatesParams
        )
      );
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'List workshop quiz templates');
    }
  });

  fastify.post('/academy-sales/workshop-quiz-templates', async (request, reply) => {
    try {
      const data = await AcademyWorkshopLiveService.upsertQuizTemplate(
        fastify,
        actorFrom(request),
        null,
        request.body as UpsertAcademyWorkshopQuizRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo mẫu câu hỏi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop quiz template');
    }
  });

  fastify.put('/academy-sales/workshop-quiz-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      const data = await AcademyWorkshopLiveService.upsertQuizTemplate(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Template ID'),
        request.body as UpsertAcademyWorkshopQuizRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mẫu câu hỏi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop quiz template');
    }
  });

  fastify.delete('/academy-sales/workshop-quiz-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      await AcademyWorkshopLiveService.deleteQuizTemplate(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Template ID')
      );
      return reply.send({ success: true, message: 'Đã xóa mẫu câu hỏi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Delete workshop quiz template');
    }
  });

  fastify.get('/academy-sales/workshop-zalo-templates', async (_request, reply) => {
    try {
      return reply.send(await AcademyWorkshopService.getZaloTemplates(fastify));
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'List workshop zalo templates');
    }
  });

  fastify.put('/academy-sales/workshop-zalo-templates', async (request, reply) => {
    try {
      const body = request.body as UpdateAcademyWorkshopZaloTemplatesRequest;
      const data = await AcademyWorkshopService.saveZaloTemplates(fastify, actorFrom(request), body.templates);
      return reply.send({ success: true, data, message: 'Đã lưu danh sách mẫu kịch bản Zalo.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Save workshop zalo templates');
    }
  });

  fastify.post('/academy-sales/workshop-quiz-templates/:templateId/questions', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      const data = await AcademyWorkshopLiveService.upsertTemplateQuestion(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Template ID'),
        null,
        request.body as UpsertAcademyWorkshopQuestionRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã thêm câu hỏi vào mẫu.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop template question');
    }
  });

  fastify.put('/academy-sales/workshop-quiz-templates/:templateId/questions/:questionId', async (request, reply) => {
    try {
      const { templateId, questionId } = request.params as { templateId: string; questionId: string };
      const data = await AcademyWorkshopLiveService.upsertTemplateQuestion(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Template ID'),
        parseWorkshopId(questionId, 'Question ID'),
        request.body as UpsertAcademyWorkshopQuestionRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật câu hỏi mẫu.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop template question');
    }
  });

  fastify.delete('/academy-sales/workshop-quiz-templates/:templateId/questions/:questionId', async (request, reply) => {
    try {
      const { templateId, questionId } = request.params as { templateId: string; questionId: string };
      const data = await AcademyWorkshopLiveService.deleteTemplateQuestion(
        fastify,
        actorFrom(request),
        parseWorkshopId(templateId, 'Template ID'),
        parseWorkshopId(questionId, 'Question ID')
      );
      return reply.send({ success: true, data, message: 'Đã xóa câu hỏi mẫu.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Delete workshop template question');
    }
  });
}
