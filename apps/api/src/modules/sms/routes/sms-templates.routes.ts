import type { FastifyInstance } from 'fastify';
import {
  DEFAULT_BOOKING_TEMPLATES,
  type BookingConfirmationTemplate,
  type SaveSmsTemplateInput,
  type SmsTemplate,
} from '@mos-lab/shared';
import { requireAuth, requireRole } from '../../../middlewares/auth.js';

const DEFAULT_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'tpl_reminder_17',
    title: 'Reminder 17 - Single',
    content:
      'Chao {ten_khach}, chuong trinh uu dai dam mi tai tiemsalon sap het han ({han_dung}). Chi vui long dat lich truoc qua hotline {sdt_cua_hang}.',
    category: 'REMINDER',
    isSystem: true,
  },
  {
    id: 'tpl_combo_hsd',
    title: 'Reminder HSD Combo',
    content:
      'Chao {ten_khach}, goi combo {ten_combo} cua chi sap het han vao ngay {han_dung}. Chi con {so_ngay_dam} de su dung, vui long lien he hotline {sdt_cua_hang} de duoc ho tro.',
    category: 'REMINDER',
    isSystem: true,
  },
  {
    id: 'tpl_aftercare',
    title: 'Chăm sóc sau nối mi',
    content:
      'Chao {ten_khach}, kiem tra lai bo mi sau khi noi nhe! Chi can ho tro them lien he hotline {sdt_cua_hang}.',
    category: 'AFTERCARE',
    isSystem: true,
  },
];

export function registerSmsTemplateRoutes(fastify: FastifyInstance): void {
  // GET /api/sms/templates
  fastify.get('/sms/templates', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'SMS_TEMPLATES_CONFIG' },
      });

      let templates: SmsTemplate[] = DEFAULT_SMS_TEMPLATES;
      if (config && config.value) {
        try {
          const parsed = JSON.parse(config.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            templates = parsed;
          }
        } catch {
          // Fallback to default
        }
      }

      return templates;
    } catch (error) {
      fastify.log.error(error as Error, 'Get SMS templates error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve SMS templates',
      });
    }
  });

  // POST /api/sms/templates (Admin only)
  fastify.post(
    '/sms/templates',
    {
      preHandler: [requireAuth, requireRole(['admin'])],
      schema: {
        body: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            category: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const input = request.body as SaveSmsTemplateInput;

      try {
        const config = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: 'SMS_TEMPLATES_CONFIG' },
        });

        let templates: SmsTemplate[] = DEFAULT_SMS_TEMPLATES;
        if (config && config.value) {
          try {
            const parsed = JSON.parse(config.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              templates = parsed;
            }
          } catch {
            // Fallback
          }
        }

        const templateId = input.id || `tpl_${Date.now()}`;
        const existingIdx = templates.findIndex((t) => t.id === templateId);

        const newTemplate: SmsTemplate = {
          id: templateId,
          title: input.title,
          content: input.content,
          category: input.category || 'GENERAL',
          isSystem: false,
          updatedAt: new Date().toISOString(),
          createdAt: existingIdx >= 0 ? templates[existingIdx].createdAt : new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          templates[existingIdx] = newTemplate;
        } else {
          templates.push(newTemplate);
        }

        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'SMS_TEMPLATES_CONFIG' },
          update: { value: JSON.stringify(templates) },
          create: { key: 'SMS_TEMPLATES_CONFIG', value: JSON.stringify(templates) },
        });

        return { success: true, template: newTemplate, templates };
      } catch (error) {
        fastify.log.error(error as Error, 'Save SMS template error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to save SMS template',
        });
      }
    }
  );

  // DELETE /api/sms/templates/:id (Admin only)
  fastify.delete(
    '/sms/templates/:id',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const isBuiltInSystemTemplate = id.startsWith('tpl_system_') || DEFAULT_SMS_TEMPLATES.some((t) => t.id === id);

      if (isBuiltInSystemTemplate) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Cannot delete built-in system template',
        });
      }

      try {
        const config = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: 'SMS_TEMPLATES_CONFIG' },
        });

        let templates: SmsTemplate[] = DEFAULT_SMS_TEMPLATES;
        if (config && config.value) {
          try {
            const parsed = JSON.parse(config.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              templates = parsed;
            }
          } catch {
            // Fallback
          }
        }

        const targetTpl = templates.find((t) => t.id === id);
        if (targetTpl?.isSystem) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Cannot delete built-in system template',
          });
        }

        templates = templates.filter((t) => t.id !== id);

        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'SMS_TEMPLATES_CONFIG' },
          update: { value: JSON.stringify(templates) },
          create: { key: 'SMS_TEMPLATES_CONFIG', value: JSON.stringify(templates) },
        });

        return { success: true, templates };
      } catch (error) {
        fastify.log.error(error as Error, 'Delete SMS template error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete SMS template',
        });
      }
    }
  );

  // GET /api/sms/booking-templates
  fastify.get('/sms/booking-templates', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKING_TEMPLATES_CONFIG' },
      });

      let templates: BookingConfirmationTemplate[] = DEFAULT_BOOKING_TEMPLATES;
      if (config && config.value) {
        try {
          const parsed = JSON.parse(config.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            templates = parsed;
          }
        } catch {
          // Fallback
        }
      }

      return templates;
    } catch (error) {
      fastify.log.error(error as Error, 'Get booking templates error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve booking templates',
      });
    }
  });

  // POST /api/sms/booking-templates
  fastify.post('/sms/booking-templates', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = request.body as BookingConfirmationTemplate;
    if (!input || !input.id || !input.content) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Template ID and content are required',
      });
    }

    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKING_TEMPLATES_CONFIG' },
      });

      let templates: BookingConfirmationTemplate[] = DEFAULT_BOOKING_TEMPLATES;
      if (config && config.value) {
        try {
          const parsed = JSON.parse(config.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            templates = parsed;
          }
        } catch {
          // Fallback
        }
      }

      const existingIdx = templates.findIndex((t) => t.id === input.id);
      const updatedTemplate: BookingConfirmationTemplate = {
        id: input.id || `tpl_booking_${Date.now()}`,
        type: input.type || 'no_tech',
        title: input.title || 'Mẫu đặt lịch',
        content: input.content,
        isDefault: input.isDefault ?? false,
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        templates[existingIdx] = updatedTemplate;
      } else {
        templates.push(updatedTemplate);
      }

      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'BOOKING_TEMPLATES_CONFIG' },
        update: { value: JSON.stringify(templates) },
        create: { key: 'BOOKING_TEMPLATES_CONFIG', value: JSON.stringify(templates) },
      });

      return { success: true, template: updatedTemplate, templates };
    } catch (error) {
      fastify.log.error(error as Error, 'Save booking template error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to save booking template',
      });
    }
  });

  // DELETE /api/sms/booking-templates/:id
  fastify.delete('/sms/booking-templates/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!id) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Template ID is required' });
    }

    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKING_TEMPLATES_CONFIG' },
      });

      let templates: BookingConfirmationTemplate[] = DEFAULT_BOOKING_TEMPLATES;
      if (config && config.value) {
        try {
          const parsed = JSON.parse(config.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            templates = parsed;
          }
        } catch {
          // Fallback
        }
      }

      templates = templates.filter((t) => t.id !== id);

      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'BOOKING_TEMPLATES_CONFIG' },
        update: { value: JSON.stringify(templates) },
        create: { key: 'BOOKING_TEMPLATES_CONFIG', value: JSON.stringify(templates) },
      });

      return { success: true, templates };
    } catch (error) {
      fastify.log.error(error as Error, 'Delete booking template error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete booking template',
      });
    }
  });

  // POST /api/sms/booking-templates/reset
  fastify.post('/sms/booking-templates/reset', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const templates = DEFAULT_BOOKING_TEMPLATES;
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'BOOKING_TEMPLATES_CONFIG' },
        update: { value: JSON.stringify(templates) },
        create: { key: 'BOOKING_TEMPLATES_CONFIG', value: JSON.stringify(templates) },
      });

      return { success: true, templates };
    } catch (error) {
      fastify.log.error(error as Error, 'Reset booking templates error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to reset booking templates',
      });
    }
  });
}
