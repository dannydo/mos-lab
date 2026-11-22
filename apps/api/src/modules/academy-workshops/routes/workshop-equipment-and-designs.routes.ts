import type { FastifyInstance } from 'fastify';
import type {
  CreateAcademyWorkshopDesignItemImageRequest,
  CreateAcademyWorkshopDesignItemRequest,
  CreateAcademyWorkshopEquipmentPackageImageRequest,
  CreateAcademyWorkshopEquipmentPackageRequest,
  CreateAcademyWorkshopPublicMediaUploadRequest,
  SaveAcademyWorkshopDesignTemplateRequest,
  SaveAcademyWorkshopEquipmentTemplateRequest,
  UpdateAcademyWorkshopDesignItemImageRequest,
  UpdateAcademyWorkshopDesignItemRequest,
  UpdateAcademyWorkshopEquipmentPackageImageRequest,
  UpdateAcademyWorkshopEquipmentPackageRequest,
} from '@mos-lab/shared';
import { AcademyWorkshopService } from '../academy-workshop.service.js';
import { actorFrom, parseWorkshopId, sendWorkshopError } from './workshop-route-helpers.js';

export function registerWorkshopEquipmentAndDesignRoutes(fastify: FastifyInstance) {
  fastify.post('/academy-sales/workshops/:workshopId/equipment-packages', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.createEquipmentPackage(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopEquipmentPackageRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã thêm bộ dụng cụ.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop equipment package');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/equipment-templates', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.saveEquipmentAsTemplate(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as SaveAcademyWorkshopEquipmentTemplateRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã lưu mẫu bộ dụng cụ.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Save workshop equipment template');
    }
  });

  fastify.post(
    '/academy-sales/workshops/:workshopId/equipment-templates/:templateId/refresh',
    async (request, reply) => {
      try {
        const { workshopId, templateId } = request.params as { workshopId: string; templateId: string };
        const data = await AcademyWorkshopService.refreshEquipmentTemplateFromWorkshop(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(templateId, 'Mẫu bộ dụng cụ')
        );
        return reply.send({ success: true, data, message: 'Đã cập nhật nội dung mẫu từ workshop hiện tại.' });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Refresh workshop equipment template');
      }
    }
  );

  fastify.post('/academy-sales/workshops/:workshopId/equipment-templates/:templateId/apply', async (request, reply) => {
    try {
      const { workshopId, templateId } = request.params as { workshopId: string; templateId: string };
      const data = await AcademyWorkshopService.applyEquipmentTemplate(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(templateId, 'Mẫu bộ dụng cụ')
      );
      return reply.send({ success: true, data, message: 'Đã áp dụng mẫu bộ dụng cụ.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Apply workshop equipment template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/equipment-images/upload', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.uploadEquipmentImage(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopPublicMediaUploadRequest
      );
      return reply.send({ data });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Upload workshop equipment image');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/equipment-packages/:equipmentPackageId', async (request, reply) => {
    try {
      const { workshopId, equipmentPackageId } = request.params as {
        workshopId: string;
        equipmentPackageId: string;
      };
      const data = await AcademyWorkshopService.updateEquipmentPackage(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(equipmentPackageId, 'Bộ dụng cụ'),
        request.body as UpdateAcademyWorkshopEquipmentPackageRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật bộ dụng cụ.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop equipment package');
    }
  });

  fastify.delete(
    '/academy-sales/workshops/:workshopId/equipment-packages/:equipmentPackageId',
    async (request, reply) => {
      try {
        const { workshopId, equipmentPackageId } = request.params as {
          workshopId: string;
          equipmentPackageId: string;
        };
        await AcademyWorkshopService.deleteEquipmentPackage(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(equipmentPackageId, 'Bộ dụng cụ')
        );
        return reply.send({ success: true, message: 'Đã xóa bộ dụng cụ.' });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Delete workshop equipment package');
      }
    }
  );

  fastify.post(
    '/academy-sales/workshops/:workshopId/equipment-packages/:equipmentPackageId/images',
    async (request, reply) => {
      try {
        const { workshopId, equipmentPackageId } = request.params as {
          workshopId: string;
          equipmentPackageId: string;
        };
        const data = await AcademyWorkshopService.createEquipmentPackageImage(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(equipmentPackageId, 'Bộ dụng cụ'),
          request.body as CreateAcademyWorkshopEquipmentPackageImageRequest
        );
        return reply.status(201).send({ success: true, data, message: 'Đã thêm ảnh bộ dụng cụ.' });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Create workshop equipment package image');
      }
    }
  );

  fastify.put(
    '/academy-sales/workshops/:workshopId/equipment-packages/:equipmentPackageId/images/:imageId',
    async (request, reply) => {
      try {
        const { workshopId, equipmentPackageId, imageId } = request.params as {
          workshopId: string;
          equipmentPackageId: string;
          imageId: string;
        };
        const data = await AcademyWorkshopService.updateEquipmentPackageImage(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(equipmentPackageId, 'Bộ dụng cụ'),
          parseWorkshopId(imageId, 'Ảnh'),
          request.body as UpdateAcademyWorkshopEquipmentPackageImageRequest
        );
        return reply.send({ success: true, data, message: 'Đã cập nhật ảnh bộ dụng cụ.' });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Update workshop equipment package image');
      }
    }
  );

  fastify.delete(
    '/academy-sales/workshops/:workshopId/equipment-packages/:equipmentPackageId/images/:imageId',
    async (request, reply) => {
      try {
        const { workshopId, equipmentPackageId, imageId } = request.params as {
          workshopId: string;
          equipmentPackageId: string;
          imageId: string;
        };
        await AcademyWorkshopService.deleteEquipmentPackageImage(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(equipmentPackageId, 'Bộ dụng cụ'),
          parseWorkshopId(imageId, 'Ảnh')
        );
        return reply.send({ success: true, message: 'Đã xóa ảnh bộ dụng cụ.' });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Delete workshop equipment package image');
      }
    }
  );

  fastify.post('/academy-sales/workshops/:workshopId/designs', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.createDesignItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopDesignItemRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã thêm mẫu thiết kế mi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop design item');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/design-templates', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.saveDesignAsTemplate(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as SaveAcademyWorkshopDesignTemplateRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã lưu mẫu thiết kế mi thành bộ sưu tập.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Save workshop design template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/design-templates/:templateId/refresh', async (request, reply) => {
    try {
      const { workshopId, templateId } = request.params as { workshopId: string; templateId: string };
      const data = await AcademyWorkshopService.refreshDesignTemplateFromWorkshop(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(templateId, 'Mẫu thiết kế mi')
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật nội dung mẫu từ workshop hiện tại.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Refresh workshop design template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/design-templates/:templateId/apply', async (request, reply) => {
    try {
      const { workshopId, templateId } = request.params as { workshopId: string; templateId: string };
      const data = await AcademyWorkshopService.applyDesignTemplate(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(templateId, 'Mẫu thiết kế mi')
      );
      return reply.send({ success: true, data, message: 'Đã áp dụng mẫu thiết kế mi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Apply workshop design template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/design-images/upload', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.uploadDesignImage(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopPublicMediaUploadRequest
      );
      return reply.send({ data });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Upload workshop design image');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/designs/:designId', async (request, reply) => {
    try {
      const { workshopId, designId } = request.params as {
        workshopId: string;
        designId: string;
      };
      const data = await AcademyWorkshopService.updateDesignItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(designId, 'Mẫu thiết kế mi'),
        request.body as UpdateAcademyWorkshopDesignItemRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mẫu thiết kế mi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop design item');
    }
  });

  fastify.delete('/academy-sales/workshops/:workshopId/designs/:designId', async (request, reply) => {
    try {
      const { workshopId, designId } = request.params as {
        workshopId: string;
        designId: string;
      };
      await AcademyWorkshopService.deleteDesignItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(designId, 'Mẫu thiết kế mi')
      );
      return reply.send({ success: true, message: 'Đã xóa mẫu thiết kế mi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Delete workshop design item');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/designs/:designId/images', async (request, reply) => {
    try {
      const { workshopId, designId } = request.params as {
        workshopId: string;
        designId: string;
      };
      const data = await AcademyWorkshopService.createDesignItemImage(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(designId, 'Mẫu thiết kế mi'),
        request.body as CreateAcademyWorkshopDesignItemImageRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã thêm ảnh mẫu thiết kế mi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop design item image');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/designs/:designId/images/:imageId', async (request, reply) => {
    try {
      const { workshopId, designId, imageId } = request.params as {
        workshopId: string;
        designId: string;
        imageId: string;
      };
      const data = await AcademyWorkshopService.updateDesignItemImage(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(designId, 'Mẫu thiết kế mi'),
        parseWorkshopId(imageId, 'Ảnh'),
        request.body as UpdateAcademyWorkshopDesignItemImageRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật ảnh mẫu thiết kế mi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop design item image');
    }
  });

  fastify.delete('/academy-sales/workshops/:workshopId/designs/:designId/images/:imageId', async (request, reply) => {
    try {
      const { workshopId, designId, imageId } = request.params as {
        workshopId: string;
        designId: string;
        imageId: string;
      };
      await AcademyWorkshopService.deleteDesignItemImage(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(designId, 'Mẫu thiết kế mi'),
        parseWorkshopId(imageId, 'Ảnh')
      );
      return reply.send({ success: true, message: 'Đã xóa ảnh mẫu thiết kế mi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Delete workshop design item image');
    }
  });
}
