import type { FastifyInstance } from 'fastify';
import type {
  CloneAcademyWorkshopRequest,
  CreateAcademyWorkshopMenuItemRequest,
  CreateAcademyWorkshopPublicMediaUploadRequest,
  CreateAcademyWorkshopRequest,
  ListAcademyWorkshopsParams,
  SaveAcademyWorkshopMenuTemplateRequest,
  SetAcademyWorkshopAgendaResourceRequest,
  UpdateAcademyWorkshopMenuItemRequest,
  UpdateAcademyWorkshopRequest,
} from '@mos-lab/shared';
import { AcademySalesService } from '../../academy-sales/academy-sales.service.js';
import { AcademyTalentAssessmentService } from '../../academy-sales/academy-talent-assessment.service.js';
import { AcademyWorkshopService } from '../academy-workshop.service.js';
import { actorFrom, parseWorkshopId, sendWorkshopError } from './workshop-route-helpers.js';

export function registerWorkshopCoreAndMenuRoutes(fastify: FastifyInstance) {
  fastify.get('/academy-sales/workshops', async (request, reply) => {
    try {
      return reply.send(
        await AcademyWorkshopService.list(fastify, actorFrom(request), request.query as ListAcademyWorkshopsParams)
      );
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'List workshops');
    }
  });

  fastify.post('/academy-sales/workshops', async (request, reply) => {
    try {
      const data = await AcademyWorkshopService.create(
        fastify,
        actorFrom(request),
        request.body as CreateAcademyWorkshopRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo workshop.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop');
    }
  });

  fastify.get('/academy-sales/workshops/resources', async (request, reply) => {
    try {
      const [staff, instructors] = await Promise.all([
        AcademySalesService.listStaffOptions(fastify, actorFrom(request)),
        AcademyTalentAssessmentService.listInstructors(fastify),
      ]);
      return reply.send({ data: { staff, instructors: instructors.data } });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Workshop resources');
    }
  });

  fastify.get('/academy-sales/workshops/slug/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      return reply.send({ data: await AcademyWorkshopService.getBySlug(fastify, actorFrom(request), slug) });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Get workshop slug');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      return reply.send({
        data: await AcademyWorkshopService.getById(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID')
        ),
      });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Get workshop');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/clone-preview', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.getClonePreview(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID')
      );
      return reply.send({ success: true, data });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Get workshop clone preview');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/clone', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.clone(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        (request.body || {}) as CloneAcademyWorkshopRequest
      );
      return reply.send({ success: true, data, message: 'Đã nhân bản workshop thành công.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Clone workshop');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.update(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as UpdateAcademyWorkshopRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật workshop.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/hero-image/upload', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.uploadHeroImage(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopPublicMediaUploadRequest
      );
      return reply.send({ data });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Upload workshop hero image');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quiz-images/upload', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.uploadQuizImage(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopPublicMediaUploadRequest
      );
      return reply.send({ data });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Upload workshop quiz image');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/menu-items', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.createMenuItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopMenuItemRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã thêm món vào thực đơn.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop menu item');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/menu-templates', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.saveMenuAsTemplate(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as SaveAcademyWorkshopMenuTemplateRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã lưu mẫu thực đơn.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Save workshop menu template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/menu-templates/:templateId/refresh', async (request, reply) => {
    try {
      const { workshopId, templateId } = request.params as { workshopId: string; templateId: string };
      const data = await AcademyWorkshopService.refreshMenuTemplateFromWorkshop(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(templateId, 'Mẫu thực đơn')
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật nội dung mẫu từ workshop hiện tại.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Refresh workshop menu template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/menu-templates/:templateId/apply', async (request, reply) => {
    try {
      const { workshopId, templateId } = request.params as { workshopId: string; templateId: string };
      const data = await AcademyWorkshopService.applyMenuTemplate(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(templateId, 'Mẫu thực đơn')
      );
      return reply.send({ success: true, data, message: 'Đã áp dụng mẫu thực đơn.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Apply workshop menu template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/menu-items/upload-image', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.uploadMenuImage(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopPublicMediaUploadRequest
      );
      return reply.send({ data });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Upload workshop menu image');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/menu-service', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.setMenuAgendaItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as SetAcademyWorkshopAgendaResourceRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mốc phục vụ thực đơn.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Set workshop menu service agenda item');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/equipment-service', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.setEquipmentAgendaItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as SetAcademyWorkshopAgendaResourceRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mốc sử dụng dụng cụ.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Set workshop equipment service agenda item');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/design-service', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.setDesignAgendaItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as SetAcademyWorkshopAgendaResourceRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mốc thực hành mẫu mi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Set workshop design service agenda item');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/menu-items/:menuItemId', async (request, reply) => {
    try {
      const { workshopId, menuItemId } = request.params as { workshopId: string; menuItemId: string };
      const data = await AcademyWorkshopService.updateMenuItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(menuItemId, 'Món ăn'),
        request.body as UpdateAcademyWorkshopMenuItemRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật món ăn.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop menu item');
    }
  });

  fastify.delete('/academy-sales/workshops/:workshopId/menu-items/:menuItemId', async (request, reply) => {
    try {
      const { workshopId, menuItemId } = request.params as { workshopId: string; menuItemId: string };
      await AcademyWorkshopService.deleteMenuItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(menuItemId, 'Món ăn')
      );
      return reply.send({ success: true, message: 'Đã xóa món ăn.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Delete workshop menu item');
    }
  });
}
