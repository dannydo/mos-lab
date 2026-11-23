import type { FastifyInstance } from 'fastify';
import type { SendSmsRequest } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { CustomerAccessService } from '../../customers/services/customer-access.service.js';

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

export function registerSmsMessagingRoutes(fastify: FastifyInstance): void {
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

      // 2. Query user_sms records matching to_user_id and to_phone_number in parallel
      // Avoids slow OR condition full-table scans when one branch lacks an index or optimizer rejects index-merge.
      const queryPromises = [
        fastify.prisma.legacy.user_sms.findMany({
          where: { to_user_id: legacyUserId },
          orderBy: { date_created: 'desc' },
        }),
      ];

      if (phoneNumbers.length > 0) {
        queryPromises.push(
          fastify.prisma.legacy.user_sms.findMany({
            where: { to_phone_number: { in: phoneNumbers } },
            orderBy: { date_created: 'desc' },
          })
        );
      }

      const queryResults = await Promise.all(queryPromises);
      const seenSmsIds = new Set<number>();
      const smsRecords = queryResults
        .flat()
        .filter((record) => {
          if (seenSmsIds.has(record.id)) return false;
          seenSmsIds.add(record.id);
          return true;
        })
        .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());

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
            templateId: { anyOf: [{ type: 'string' }, { type: 'number' }] },
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
