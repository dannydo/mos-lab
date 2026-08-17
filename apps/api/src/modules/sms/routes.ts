import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { CustomerAccessService } from '../customers/services/customer-access.service.js';
import {
  SmsTemplate,
  SaveSmsTemplateInput,
  SendSmsRequest,
  BookingConfirmationTemplate,
  DEFAULT_BOOKING_TEMPLATES,
} from '@mos-lab/shared';

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

export async function smsRoutes(fastify: FastifyInstance) {
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

  // GET /api/sms/history/:customerId
  fastify.get('/sms/history/:customerId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    const legacyUserId = parseInt(customerId, 10);

    if (isNaN(legacyUserId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    if (!(await CustomerAccessService.canTelesalesAccessCustomer(fastify, request.user, legacyUserId))) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Telesales chỉ được xem khách hàng đã được phân bổ cho mình.',
      });
    }

    try {
      // 1. Get phone numbers associated with this customer
      const contacts = await fastify.prisma.legacy.user_contact.findMany({
        where: { user_id: legacyUserId, is_disabled: false },
        select: { phone_number: true },
      });

      const phoneNumbers = contacts.map((c) => c.phone_number).filter(Boolean);

      // 2. Query user_sms records matching to_user_id OR to_phone_number
      const smsRecords = await fastify.prisma.legacy.user_sms.findMany({
        where: {
          OR: [
            { to_user_id: legacyUserId },
            ...(phoneNumbers.length > 0 ? [{ to_phone_number: { in: phoneNumbers } }] : []),
          ],
        },
        orderBy: { date_created: 'desc' },
      });

      // 3. Fetch staff names for created_staff_id
      const staffIds = Array.from(
        new Set(smsRecords.map((s) => s.created_staff_id).filter((id): id is number => id !== null))
      );

      const staffList =
        staffIds.length > 0
          ? await fastify.prisma.crm.crmStaff.findMany({
              where: { id: { in: staffIds } },
              select: { id: true, displayName: true },
            })
          : [];

      const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));

      // 4. Map response
      const history = smsRecords.map((item) => ({
        id: item.id,
        toPhoneNumber: item.to_phone_number,
        body: item.body,
        templateId: item.template_id ? String(item.template_id) : item.title || null,
        createdStaffId: item.created_staff_id,
        createdStaffName: item.created_staff_id ? staffMap.get(item.created_staff_id) || 'Nhân viên' : 'Hệ thống',
        dateCreated: item.date_created
          ? typeof item.date_created.toISOString === 'function'
            ? item.date_created.toISOString()
            : new Date(item.date_created).toISOString()
          : new Date().toISOString(),
      }));

      return history;
    } catch (error) {
      fastify.log.error(error as Error, 'Get SMS history error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve SMS history',
      });
    }
  });

  // GET /api/sms/user-url/:customerId
  fastify.get('/sms/user-url/:customerId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    const legacyUserId = Number(customerId);
    if (isNaN(legacyUserId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customerId' });
    }

    if (!(await CustomerAccessService.canTelesalesAccessCustomer(fastify, request.user, legacyUserId))) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Telesales chỉ được xem khách hàng đã được phân bổ cho mình.',
      });
    }

    try {
      const profile = await fastify.prisma.legacy.user_profile.findFirst({
        where: { user_id: legacyUserId },
        select: { client_id: true, client_business_id: true },
      });
      const clientId = profile?.client_id || 11;
      const clientBusinessId = profile?.client_business_id || 1;

      const bookingUrl = await getOrCreateCustomerUserUrl(fastify, legacyUserId, clientId, clientBusinessId);

      return { bookingUrl };
    } catch (error) {
      fastify.log.error(error as Error, 'Get customer user_url error:');
      return { bookingUrl: 'https://s.wingslashes.com/Urc5SCIJ' };
    }
  });

  // POST /api/sms/send
  fastify.post(
    '/sms/send',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['legacyUserId', 'toPhoneNumber', 'body'],
          properties: {
            legacyUserId: { type: 'integer' },
            toPhoneNumber: { type: 'string' },
            body: { type: 'string' },
            templateId: { type: ['string', 'number'] },
            planId: { type: 'integer' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as { id: number; role?: string };
      const { legacyUserId, toPhoneNumber, body, templateId, planId } = request.body as SendSmsRequest;

      if (legacyUserId === undefined || legacyUserId === null || !toPhoneNumber || !body || !body.trim()) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'legacyUserId, toPhoneNumber, and non-empty body are required',
        });
      }

      if (!(await CustomerAccessService.canTelesalesAccessCustomer(fastify, user, Number(legacyUserId)))) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Telesales chỉ được thao tác trên khách hàng đã được phân bổ cho mình.',
        });
      }

      try {
        const numericTemplateId =
          templateId !== undefined && templateId !== null && !isNaN(Number(templateId)) ? Number(templateId) : null;
        const stringTitle = typeof templateId === 'string' && templateId.trim() !== '' ? templateId.trim() : null;

        // Fetch client_id from user_profile or fallback to valid client_id (11)
        const profile = await fastify.prisma.legacy.user_profile.findFirst({
          where: { user_id: Number(legacyUserId) },
          select: { client_id: true, client_business_id: true },
        });
        const clientId = profile?.client_id || 11;
        const clientBusinessId = profile?.client_business_id || 1;

        // Auto-replace {url_dat_lich} tag if present
        let finalBody = body.trim();
        if (finalBody.includes('{url_dat_lich}')) {
          const bookingUrl = await getOrCreateCustomerUserUrl(
            fastify,
            Number(legacyUserId),
            clientId,
            clientBusinessId
          );
          finalBody = finalBody.replace(/\{url_dat_lich\}/g, bookingUrl);
        }

        // 1. Save record to user_sms in legacy DB
        const smsRecord = await fastify.prisma.legacy.user_sms.create({
          data: {
            client_id: clientId,
            client_business_id: clientBusinessId,
            created_staff_id: user?.id || null,
            from_phone_number: 'WINGS',
            to_phone_number: toPhoneNumber.trim(),
            to_user_id: Number(legacyUserId),
            body: finalBody,
            template_id: numericTemplateId,
            title: stringTitle,
            post_param: '{}',
            ip_address: '127.0.0.1',
            date_created: new Date(),
          },
        });

        // 2. Create call log with callType = 'SMS' in crm_call_logs (with compensating rollback)
        let callLog;
        try {
          callLog = await fastify.prisma.crm.crmCallLog.create({
            data: {
              planId: planId ? Number(planId) : null,
              legacyUserId: Number(legacyUserId),
              staffId: user?.id || 1,
              callType: 'SMS',
              callResult: 'ANSWERED',
              note: finalBody,
              outcome: null,
            },
          });
        } catch (callLogErr) {
          await fastify.prisma.legacy.user_sms
            .delete({
              where: { id: smsRecord.id },
            })
            .catch(() => {});
          throw callLogErr;
        }

        // 3. Update daily plan status if planId is provided
        if (planId) {
          await fastify.prisma.crm.crmDailyPlan
            .update({
              where: { id: Number(planId) },
              data: { status: 'CALLED' },
            })
            .catch(() => {});
        }

        return {
          success: true,
          smsId: smsRecord.id,
          callLogId: callLog.id,
          message: 'Gửi SMS thành công',
        };
      } catch (error) {
        fastify.log.error(error as Error, 'Send SMS error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to send SMS',
        });
      }
    }
  );
}

function generateRandomAlphaNumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getOrCreateCustomerUserUrl(
  fastify: FastifyInstance,
  legacyUserId: number,
  clientId = 11,
  clientBusinessId = 1
): Promise<string> {
  if (!legacyUserId) return 'https://s.wingslashes.com/Urc5SCIJ';

  try {
    const userIdBigInt = BigInt(legacyUserId);
    // 1. Check existing user_url specifically for booking / profile / referrer links
    const existing = await fastify.prisma.legacy.user_url.findFirst({
      where: {
        OR: [{ referrer_user_id: userIdBigInt }, { assigned_user_id: userIdBigInt }],
        user_url_type: { in: ['booking_easy', 'user_profile', 'referrer'] },
        is_disabled: 0,
      },
      orderBy: { id: 'desc' },
      select: { shorten_url: true, user_url_key: true },
    });

    if (existing) {
      if (existing.shorten_url && existing.shorten_url.trim() !== '') {
        return existing.shorten_url;
      }
      if (existing.user_url_key && existing.user_url_key.trim() !== '') {
        return `https://s.wingslashes.com/${existing.user_url_key}`;
      }
    }

    // 2. Generate new key if no existing url
    let key = generateRandomAlphaNumeric(8);
    let collision = await fastify.prisma.legacy.user_url.findFirst({
      where: { user_url_key: key },
    });
    while (collision) {
      key = generateRandomAlphaNumeric(8);
      collision = await fastify.prisma.legacy.user_url.findFirst({
        where: { user_url_key: key },
      });
    }

    const shortenUrl = `https://s.wingslashes.com/${key}`;

    await fastify.prisma.legacy.user_url.create({
      data: {
        client_id: BigInt(clientId),
        client_business_id: BigInt(clientBusinessId),
        referrer_user_id: userIdBigInt,
        user_url_type: 'booking_easy',
        user_url_key: key,
        shorten_url: shortenUrl,
        limit_use_count: 0,
        limit_order_count: 0,
        is_disabled: 0,
        date_created: new Date(),
      },
    });

    return shortenUrl;
  } catch {
    return 'https://s.wingslashes.com/Urc5SCIJ';
  }
}
