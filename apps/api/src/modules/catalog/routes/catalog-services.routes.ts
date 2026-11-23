import { FastifyInstance } from 'fastify';
import { requireAuth, requireCatalogAdmin } from '../../../middlewares/auth.js';
import {
  CATALOG_DEFAULTS,
  checkServiceLiveCombos,
  fetchRealServiceLashCounts,
  mapServiceDto,
} from './catalog-route-helpers.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function registerCatalogServicesRoutes(fastify: FastifyInstance) {
  // ==========================================
  // METADATA
  // ==========================================

  fastify.get('/catalog/groups', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      // Active Master Service Groups: LashesTop, LashesUnder, Product (Sauna is deprecated)
      const validMasterGroups = ['LashesTop', 'LashesUnder', 'Product'];
      return { success: true, data: validMasterGroups };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.get('/catalog/types', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      // Master Catalog Services consist of Normal (Nối mới), Retain (Dặm mi), Removal (Tháo mi), and Product (Giỏ hàng/Sản phẩm)
      const validMasterTypes = ['Normal', 'Retain', 'Removal', 'Product'];
      return { success: true, data: validMasterTypes };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // ==========================================
  // SERVICES
  // ==========================================

  fastify.get('/catalog/services', { preHandler: [requireAuth] }, async (request, reply) => {
    const { page = 1, pageSize = 20, search, group, isDisabled } = request.query as any;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = {};
    if (group) {
      if (group === 'Lashes') {
        where.service_group = { in: ['LashesTop', 'LashesUnder', 'Lashes'] };
      } else {
        where.service_group = group;
      }
    }
    if (isDisabled !== undefined) where.is_disabled = isDisabled === 'true';

    try {
      if (search) {
        const matchingLangs = await fastify.prisma.legacy.service_language.findMany({
          where: { service_name: { contains: search } },
          select: { service_id: true },
        });
        where.id = { in: matchingLangs.map((l: any) => l.service_id) };
      }

      const total = await fastify.prisma.legacy.service.count({ where });
      const services = await fastify.prisma.legacy.service.findMany({
        where,
        skip,
        take,
        orderBy: { position: 'asc' },
      });

      const serviceIds = services.map((s: any) => s.id);
      const [langs, prices, realAttrMap, cvBenchmarks] = await Promise.all([
        fastify.prisma.legacy.service_language.findMany({
          where: { service_id: { in: serviceIds } },
        }),
        fastify.prisma.legacy.service_price.findMany({
          where: { service_id: { in: serviceIds }, is_disabled: false },
        }),
        fetchRealServiceLashCounts(fastify.prisma.legacy, serviceIds),
        fastify.prisma.crm.crmLashTypeBenchmark.findMany().catch(() => []),
      ]);

      const data = services.map((s: any) => {
        const lang = langs.find((l: any) => l.service_id === s.id);
        const priceList = prices.filter((p: any) => p.service_id === s.id);
        return mapServiceDto(s, lang, priceList, realAttrMap, cvBenchmarks);
      });

      return {
        success: true,
        data,
        meta: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize)),
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.get('/catalog/services/select', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const services = await fastify.prisma.legacy.service.findMany({
        where: { is_disabled: false },
        orderBy: { position: 'asc' },
      });
      const serviceIds = services.map((s: any) => s.id);

      const [langs, prices, realAttrMap, cvBenchmarks] = await Promise.all([
        fastify.prisma.legacy.service_language.findMany({
          where: { service_id: { in: serviceIds } },
        }),
        fastify.prisma.legacy.service_price.findMany({
          where: { service_id: { in: serviceIds }, is_disabled: false },
        }),
        fetchRealServiceLashCounts(fastify.prisma.legacy, serviceIds),
        fastify.prisma.crm.crmLashTypeBenchmark.findMany().catch(() => []),
      ]);

      const data = services.map((s: any) => {
        const lang = langs.find((l: any) => l.service_id === s.id);
        const priceList = prices.filter((p: any) => p.service_id === s.id);
        return mapServiceDto(s, lang, priceList, realAttrMap, cvBenchmarks);
      });
      return { success: true, data };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.get('/catalog/services/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const service = await fastify.prisma.legacy.service.findUnique({
        where: { id: Number(id) },
      });
      if (!service) return reply.status(404).send({ success: false, error: 'Not Found' });

      const [langs, prices, realAttrMap, cvBenchmarks] = await Promise.all([
        fastify.prisma.legacy.service_language.findMany({
          where: { service_id: service.id },
        }),
        fastify.prisma.legacy.service_price.findMany({
          where: { service_id: service.id },
        }),
        fetchRealServiceLashCounts(fastify.prisma.legacy, [service.id]),
        fastify.prisma.crm.crmLashTypeBenchmark.findMany().catch(() => []),
      ]);

      const lang = langs.find((l: any) => l.language_id === CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID) || langs[0];
      return { success: true, data: mapServiceDto(service, lang, prices, realAttrMap, cvBenchmarks) };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.post('/catalog/services', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    const {
      serviceKey,
      serviceType,
      serviceGroup,
      durationMinute,
      durationMinuteStandard,
      remindingIntervalDay,
      parentServiceId,
      isTemporary,
      isDisabled,
      serviceName,
      serviceShortDescription,
      serviceDescription,
      servicePrice,
      servicePriceType,
      servicePricePackageKey,
    } = request.body as any;

    try {
      const result = await fastify.prisma.legacy.$transaction(async (tx: any) => {
        const service = await tx.service.create({
          data: {
            client_id: CATALOG_DEFAULTS.CLIENT_ID,
            client_business_id: CATALOG_DEFAULTS.CLIENT_BUSINESS_ID,
            service_key: serviceKey,
            service_type: serviceType,
            service_group: serviceGroup,
            duration_minute: durationMinute,
            duration_minute_standard: durationMinuteStandard || durationMinute,
            remind_interval_day: remindingIntervalDay || 0,
            last_day_required: 0,
            parent_service_id: parentServiceId || null,
            is_temporary: isTemporary || false,
            is_disabled: isDisabled || false,
            position: 0,
            date_created: new Date(),
            profile_attribute_set_id: 0,
            customer_survey_set_id: 0,
            staff_survey_set_id: 0,
          },
        });

        const lang = await tx.service_language.create({
          data: {
            service_id: service.id,
            language_id: CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID,
            service_name: serviceName,
            service_short_description: serviceShortDescription || null,
            service_description: serviceDescription || null,
          },
        });

        let priceObj = null;
        if (servicePrice !== undefined) {
          priceObj = await tx.service_price.create({
            data: {
              service_id: service.id,
              currency_id: CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID,
              service_price_package_key: servicePricePackageKey || 'single',
              service_price_type: servicePriceType || 'Single',
              service_price: servicePrice,
              normal_count: 1,
              retain_count: 0,
              per_normal_price: servicePrice,
              per_retain_price: 0,
              expiry_after_day: 0,
              bonus_active_day: 0,
              position: 0,
              is_same_count: false,
              is_new_user_disabled: false,
              is_disabled: false,
            },
          });
        }

        return mapServiceDto(service, lang, priceObj ? [priceObj] : []);
      });

      return { success: true, data: result };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.get('/catalog/services/:id/live-combo-check', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const check = await checkServiceLiveCombos(fastify, Number(id));
      return { success: true, data: check };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.put('/catalog/services/:id', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const {
      serviceKey,
      serviceType,
      serviceGroup,
      durationMinute,
      durationMinuteStandard,
      remindingIntervalDay,
      parentServiceId,
      isTemporary,
      isDisabled,
      position,
      serviceName,
      serviceShortDescription,
      serviceDescription,
      servicePrice,
      confirm,
    } = request.body as any;

    if (isDisabled === true && !confirm) {
      const check = await checkServiceLiveCombos(fastify, Number(id));
      if (check.totalOwners > 0) {
        return reply.status(409).send({
          success: false,
          code: 'LIVE_COMBOS_DETECTED',
          message: `Dịch vụ hiện có ${check.totalOwners} khách hàng đang giữ gói Combo Live còn hạn!`,
          data: check,
        });
      }
    }

    try {
      const result = await fastify.prisma.legacy.$transaction(async (tx: any) => {
        const dbData: any = {};
        if (serviceKey !== undefined) dbData.service_key = serviceKey;
        if (serviceType !== undefined) dbData.service_type = serviceType;
        if (serviceGroup !== undefined) dbData.service_group = serviceGroup;
        if (durationMinute !== undefined) dbData.duration_minute = durationMinute;
        if (durationMinuteStandard !== undefined) dbData.duration_minute_standard = durationMinuteStandard;
        if (remindingIntervalDay !== undefined) dbData.remind_interval_day = remindingIntervalDay;
        if (parentServiceId !== undefined) dbData.parent_service_id = parentServiceId;
        if (isTemporary !== undefined) dbData.is_temporary = isTemporary;
        if (isDisabled !== undefined) dbData.is_disabled = isDisabled;
        if (position !== undefined) dbData.position = position;
        dbData.date_updated = new Date();

        const service = await tx.service.update({
          where: { id: Number(id) },
          data: dbData,
        });

        if (serviceName !== undefined || serviceShortDescription !== undefined || serviceDescription !== undefined) {
          const lang = await tx.service_language.findFirst({
            where: { service_id: Number(id) },
          });
          if (lang) {
            await tx.service_language.update({
              where: { id: lang.id },
              data: {
                service_name: serviceName !== undefined ? serviceName : lang.service_name,
                service_short_description:
                  serviceShortDescription !== undefined ? serviceShortDescription : lang.service_short_description,
                service_description: serviceDescription !== undefined ? serviceDescription : lang.service_description,
              },
            });
          } else {
            await tx.service_language.create({
              data: {
                service_id: Number(id),
                language_id: CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID,
                service_name: serviceName || '',
                service_short_description: serviceShortDescription || null,
                service_description: serviceDescription || null,
              },
            });
          }
        }

        if (servicePrice !== undefined) {
          const mainPrice = await tx.service_price.findFirst({
            where: { service_id: Number(id) },
            orderBy: { id: 'asc' },
          });
          if (mainPrice) {
            await tx.service_price.update({
              where: { id: mainPrice.id },
              data: { service_price: servicePrice, per_normal_price: servicePrice },
            });
          } else {
            await tx.service_price.create({
              data: {
                client_id: CATALOG_DEFAULTS.CLIENT_ID,
                client_business_id: CATALOG_DEFAULTS.CLIENT_BUSINESS_ID,
                service_id: Number(id),
                currency_id: CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID,
                service_price_package_key: 'single',
                service_price_type: 'Single',
                service_price: servicePrice,
                normal_count: 1,
                retain_count: 0,
                per_normal_price: servicePrice,
                per_retain_price: 0,
                position: 0,
                is_same_count: false,
                is_new_user_disabled: false,
                is_disabled: false,
              },
            });
          }
        }

        const langs = await tx.service_language.findMany({ where: { service_id: Number(id) } });
        const prices = await tx.service_price.findMany({ where: { service_id: Number(id) } });
        const lang = langs.find((l: any) => l.language_id === CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID) || langs[0];

        return mapServiceDto(service, lang, prices);
      });

      return { success: true, data: result };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.patch('/catalog/services/:id', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    if (body.isDisabled === true && !body.confirm) {
      const check = await checkServiceLiveCombos(fastify, Number(id));
      if (check.totalOwners > 0) {
        return reply.status(409).send({
          success: false,
          code: 'LIVE_COMBOS_DETECTED',
          message: `Dịch vụ hiện có ${check.totalOwners} khách hàng đang giữ gói Combo Live còn hạn!`,
          data: check,
        });
      }
    }

    try {
      const dbData: any = {};
      if (body.serviceKey !== undefined) dbData.service_key = body.serviceKey;
      if (body.serviceType !== undefined) dbData.service_type = body.serviceType;
      if (body.serviceGroup !== undefined) dbData.service_group = body.serviceGroup;
      if (body.durationMinute !== undefined) dbData.duration_minute = body.durationMinute;
      if (body.isDisabled !== undefined) dbData.is_disabled = body.isDisabled;
      if (body.position !== undefined) dbData.position = body.position;
      dbData.date_updated = new Date();

      const service = await fastify.prisma.legacy.service.update({
        where: { id: Number(id) },
        data: dbData,
      });

      const langs = await fastify.prisma.legacy.service_language.findMany({ where: { service_id: Number(id) } });
      const prices = await fastify.prisma.legacy.service_price.findMany({ where: { service_id: Number(id) } });
      const lang = langs.find((l: any) => l.language_id === CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID) || langs[0];

      return { success: true, data: mapServiceDto(service, lang, prices) };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.delete(
    '/catalog/services/:id',
    { preHandler: [requireAuth, requireCatalogAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { confirm } = (request.body as any) || {};

      if (!confirm) {
        const check = await checkServiceLiveCombos(fastify, Number(id));
        if (check.totalOwners > 0) {
          return reply.status(409).send({
            success: false,
            code: 'LIVE_COMBOS_DETECTED',
            message: `Dịch vụ hiện có ${check.totalOwners} khách hàng đang giữ gói Combo Live còn hạn!`,
            data: check,
          });
        }
      }

      try {
        const result = await fastify.prisma.legacy.$transaction(async (tx: any) => {
          const service = await tx.service.update({
            where: { id: Number(id) },
            data: { is_disabled: true, date_updated: new Date() },
          });
          await tx.service_price.updateMany({
            where: { service_id: Number(id) },
            data: { is_disabled: true },
          });
          return service;
        });
        return { success: true, data: result };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );

  fastify.post(
    '/catalog/services/:id/restore',
    { preHandler: [requireAuth, requireCatalogAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const data = await fastify.prisma.legacy.service.update({
          where: { id: Number(id) },
          data: { is_disabled: false, date_updated: new Date() },
        });
        return { success: true, data: mapServiceDto(data) };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );

  fastify.post(
    '/catalog/services/reorder',
    { preHandler: [requireAuth, requireCatalogAdmin] },
    async (request, reply) => {
      const { orders } = request.body as { orders: { id: number; position: number }[] };
      try {
        await fastify.prisma.legacy.$transaction(
          orders.map((item) =>
            fastify.prisma.legacy.service.update({
              where: { id: item.id },
              data: { position: item.position, date_updated: new Date() },
            })
          )
        );
        return { success: true, data: true };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );

  fastify.post(
    '/catalog/services/bulk-status',
    { preHandler: [requireAuth, requireCatalogAdmin] },
    async (request, reply) => {
      const { ids, isDisabled } = request.body as { ids: number[]; isDisabled: boolean };
      try {
        const data = await fastify.prisma.legacy.service.updateMany({
          where: { id: { in: ids } },
          data: { is_disabled: isDisabled, date_updated: new Date() },
        });
        return { success: true, data };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );
}
