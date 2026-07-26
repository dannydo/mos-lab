import { FastifyInstance } from 'fastify';
import { Prisma } from '../../generated/legacy-client/index.js';
import { requireAuth, requireCatalogAdmin } from '../../middlewares/auth.js';

const CATALOG_DEFAULTS = {
  CLIENT_ID: 1,
  CLIENT_BUSINESS_ID: 1,
  DEFAULT_CURRENCY_ID: 2, // VND (currency_id = 2 in legacy DB)
  DEFAULT_LANGUAGE_ID: 1, // Vietnamese
};

// ─── DTO Helper Transformers ────────────────────────────────────────────────

function mapServiceDto(s: any, lang?: any, prices: any[] = []): any {
  return {
    id: s.id,
    clientId: s.client_id,
    clientBusinessId: s.client_business_id,
    parentServiceId: s.parent_service_id,
    serviceKey: s.service_key,
    serviceType: s.service_type,
    serviceGroup: s.service_group,
    durationMinute: s.duration_minute,
    durationMinuteStandard: s.duration_minute_standard,
    imageFilename: s.image_filename,
    imageExtension: s.image_extension,
    remindingIntervalDay: s.remind_interval_day,
    position: s.position,
    isTemporary: Boolean(s.is_temporary),
    isDisabled: Boolean(s.is_disabled),
    dateUpdated: s.date_updated,
    dateCreated: s.date_created,
    serviceName: lang?.service_name || s.service_key,
    serviceShortDescription: lang?.service_short_description,
    serviceDescription: lang?.service_description,
    prices: prices.map((p) => mapComboDto(p)),
  };
}

function mapComboDto(c: any, serviceObj?: any): any {
  let normalCount = c.normal_count || 0;
  let bonusNormalCount = c.bonus_normal_count || 0;

  // Intelligent legacy fallback: If bonus_normal_count is 0 and key matches X+Y (e.g. 7+3), auto-parse buy vs gift
  if (bonusNormalCount === 0 && c.service_price_package_key) {
    const match = c.service_price_package_key.match(/^(\d+)\+(\d+)/);
    if (match) {
      const buy = parseInt(match[1], 10);
      const bonus = parseInt(match[2], 10);
      if (normalCount === buy + bonus) {
        normalCount = buy;
        bonusNormalCount = bonus;
      }
    }
  }

  return {
    id: c.id,
    serviceId: c.service_id,
    currencyId: c.currency_id,
    servicePricePackageKey: c.service_price_package_key,
    servicePriceType: c.service_price_type,
    servicePrice: Math.round(c.service_price || 0),
    normalCount,
    bonusNormalCount,
    retainCount: c.retain_count || 0,
    bonusRetainCount: c.bonus_retain_count || 0,
    perNormalPrice: Math.round(c.per_normal_price || 0),
    perRetainPrice: Math.round(c.per_retain_price || 0),
    expiryAfterDay: c.expiry_after_day,
    position: c.position,
    isSameCount: Boolean(c.is_same_count),
    isNewUserDisabled: Boolean(c.is_old_user_disabled),
    isDisabled: Boolean(c.is_disabled),
    service: serviceObj || null,
  };
}

function mapProductDto(
  p: any,
  lang?: any,
  price?: any,
  stock?: { inStockCount: number; totalStockCount: number }
): any {
  const rawPrice = price?.product_price || 0;
  return {
    id: p.id,
    clientId: p.client_id,
    clientBusinessId: p.client_business_id,
    createdStaffId: p.created_staff_id,
    inventoryItemId: p.inventory_item_id,
    productSku: p.product_sku,
    position: p.position,
    isDisabled: Boolean(p.is_disabled),
    dateUpdated: p.date_updated,
    dateCreated: p.date_created,
    productName: lang?.product_name || p.product_sku,
    productShortDescription: lang?.product_short_description,
    productDescription: lang?.product_description,
    productPrice: Math.round(rawPrice),
    inStockCount: stock?.inStockCount || 0,
    totalStockCount: stock?.totalStockCount || 0,
  };
}

export async function catalogRoutes(fastify: FastifyInstance) {
  // ==========================================
  // METADATA
  // ==========================================

  fastify.get('/catalog/groups', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const groups = await fastify.prisma.legacy.service.findMany({
        select: { service_group: true },
        distinct: ['service_group'],
      });
      return { success: true, data: groups.map((g: any) => g.service_group).filter(Boolean) };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.get('/catalog/types', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const types = await fastify.prisma.legacy.service.findMany({
        select: { service_type: true },
        distinct: ['service_type'],
      });
      return { success: true, data: types.map((t: any) => t.service_type).filter(Boolean) };
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
    if (group) where.service_group = group;
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
      const [langs, prices] = await Promise.all([
        fastify.prisma.legacy.service_language.findMany({
          where: { service_id: { in: serviceIds } },
        }),
        fastify.prisma.legacy.service_price.findMany({
          where: { service_id: { in: serviceIds }, is_disabled: false },
        }),
      ]);

      const data = services.map((s: any) => {
        const lang = langs.find((l: any) => l.service_id === s.id);
        const priceList = prices.filter((p: any) => p.service_id === s.id);
        return mapServiceDto(s, lang, priceList);
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

      const [langs, prices] = await Promise.all([
        fastify.prisma.legacy.service_language.findMany({
          where: { service_id: { in: serviceIds } },
        }),
        fastify.prisma.legacy.service_price.findMany({
          where: { service_id: { in: serviceIds }, is_disabled: false },
        }),
      ]);

      const data = services.map((s: any) => {
        const lang = langs.find((l: any) => l.service_id === s.id);
        const priceList = prices.filter((p: any) => p.service_id === s.id);
        return mapServiceDto(s, lang, priceList);
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

      const [langs, prices] = await Promise.all([
        fastify.prisma.legacy.service_language.findMany({
          where: { service_id: service.id },
        }),
        fastify.prisma.legacy.service_price.findMany({
          where: { service_id: service.id },
        }),
      ]);

      const lang = langs.find((l: any) => l.language_id === CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID) || langs[0];
      return { success: true, data: mapServiceDto(service, lang, prices) };
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
    } = request.body as any;

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
            where: { service_id: Number(id), language_id: CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID },
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
          }
        }

        if (servicePrice !== undefined) {
          const mainPrice = await tx.service_price.findFirst({
            where: { service_id: Number(id), is_disabled: false },
          });
          if (mainPrice) {
            await tx.service_price.update({
              where: { id: mainPrice.id },
              data: { service_price: servicePrice, per_normal_price: servicePrice },
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

  // ==========================================
  // COMBOS
  // ==========================================

  fastify.get('/catalog/combos', { preHandler: [requireAuth] }, async (request, reply) => {
    const { page = 1, pageSize = 20 } = request.query as any;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const where: any = { service_price_type: 'Combo' };

    try {
      const total = await fastify.prisma.legacy.service_price.count({ where });
      const combos = await fastify.prisma.legacy.service_price.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
      });

      const serviceIds = combos.map((c: any) => c.service_id);
      const [services, langs] = await Promise.all([
        fastify.prisma.legacy.service.findMany({ where: { id: { in: serviceIds } } }),
        fastify.prisma.legacy.service_language.findMany({ where: { service_id: { in: serviceIds } } }),
      ]);

      const data = combos.map((c: any) => {
        const s = services.find((sv: any) => sv.id === c.service_id);
        const l = langs.find((ln: any) => ln.service_id === c.service_id);
        const serviceObj = s ? mapServiceDto(s, l) : null;
        return mapComboDto(c, serviceObj);
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

  fastify.get('/catalog/combos/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const combo = await fastify.prisma.legacy.service_price.findUnique({
        where: { id: Number(id) },
      });
      if (!combo) return reply.status(404).send({ success: false, error: 'Not Found' });

      const service = await fastify.prisma.legacy.service.findUnique({ where: { id: combo.service_id } });
      const langs = await fastify.prisma.legacy.service_language.findMany({ where: { service_id: combo.service_id } });
      const lang = langs.find((l: any) => l.language_id === CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID) || langs[0];

      return {
        success: true,
        data: mapComboDto(combo, service ? mapServiceDto(service, lang) : null),
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.post('/catalog/combos', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    const {
      serviceId,
      servicePricePackageKey,
      servicePriceType,
      servicePrice,
      normalCount,
      bonusNormalCount,
      retainCount,
      bonusRetainCount,
      perNormalPrice,
      perRetainPrice,
      expiryAfterDay,
      bonusActiveDay,
      isSameCount,
      isNewUserDisabled,
      isDisabled,
    } = request.body as any;

    if (servicePricePackageKey) {
      const lowerKey = servicePricePackageKey.toLowerCase();
      if (lowerKey.includes('single') || lowerKey.includes('refill') || lowerKey.includes('balance')) {
        return reply.status(400).send({
          success: false,
          error: "servicePricePackageKey must NOT contain 'single', 'refill', or 'balance'",
        });
      }
    }

    try {
      const data = await fastify.prisma.legacy.service_price.create({
        data: {
          service_id: serviceId,
          currency_id: CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID,
          service_price_package_key: servicePricePackageKey,
          service_price_type: servicePriceType,
          service_price_group: 'lashes',
          service_price: servicePrice,
          include_service_ids: '',
          exclude_service_ids: '',
          normal_count: normalCount,
          retain_count: retainCount,
          bonus_normal_count: bonusNormalCount || 0,
          bonus_retain_count: bonusRetainCount || 0,
          per_normal_price: perNormalPrice,
          per_retain_price: perRetainPrice,
          normal_last_day_required: 0,
          retain_last_day_required: 0,
          expiry_after_day: expiryAfterDay,
          limit_share_count: 0,
          position: 0,
          is_contract_required: false,
          is_same_count: isSameCount || false,
          is_old_user_disabled: isNewUserDisabled || false,
          is_disabled: isDisabled || false,
        },
      });
      return { success: true, data: mapComboDto(data) };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.put('/catalog/combos/:id', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updateData = request.body as any;

    if (updateData.servicePricePackageKey) {
      const lowerKey = updateData.servicePricePackageKey.toLowerCase();
      if (lowerKey.includes('single') || lowerKey.includes('refill') || lowerKey.includes('balance')) {
        return reply.status(400).send({
          success: false,
          error: "servicePricePackageKey must NOT contain 'single', 'refill', or 'balance'",
        });
      }
    }

    try {
      const dbData: any = {};
      if (updateData.servicePricePackageKey !== undefined)
        dbData.service_price_package_key = updateData.servicePricePackageKey;
      if (updateData.servicePriceType !== undefined) dbData.service_price_type = updateData.servicePriceType;
      if (updateData.servicePrice !== undefined) dbData.service_price = updateData.servicePrice;
      if (updateData.normalCount !== undefined) dbData.normal_count = updateData.normalCount;
      if (updateData.bonusNormalCount !== undefined) dbData.bonus_normal_count = updateData.bonusNormalCount;
      if (updateData.retainCount !== undefined) dbData.retain_count = updateData.retainCount;
      if (updateData.bonusRetainCount !== undefined) dbData.bonus_retain_count = updateData.bonusRetainCount;
      if (updateData.perNormalPrice !== undefined) dbData.per_normal_price = updateData.perNormalPrice;
      if (updateData.perRetainPrice !== undefined) dbData.per_retain_price = updateData.perRetainPrice;
      if (updateData.expiryAfterDay !== undefined) dbData.expiry_after_day = updateData.expiryAfterDay;
      if (updateData.isSameCount !== undefined) dbData.is_same_count = updateData.isSameCount;
      if (updateData.isNewUserDisabled !== undefined) dbData.is_old_user_disabled = updateData.isNewUserDisabled;
      if (updateData.isDisabled !== undefined) dbData.is_disabled = updateData.isDisabled;

      const data = await fastify.prisma.legacy.service_price.update({
        where: { id: Number(id) },
        data: dbData,
      });
      return { success: true, data: mapComboDto(data) };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.delete('/catalog/combos/:id', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const data = await fastify.prisma.legacy.service_price.update({
        where: { id: Number(id) },
        data: { is_disabled: true },
      });
      return { success: true, data: mapComboDto(data) };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // ==========================================
  // PRODUCTS
  // ==========================================

  fastify.get('/catalog/products', { preHandler: [requireAuth] }, async (request, reply) => {
    const { page = 1, pageSize = 20, search } = request.query as any;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const where: any = {};

    try {
      if (search) {
        const matchingLangs = await fastify.prisma.legacy.product_language.findMany({
          where: { product_name: { contains: search } },
          select: { product_id: true },
        });
        where.id = { in: matchingLangs.map((l: any) => l.product_id) };
      }

      const total = await fastify.prisma.legacy.product.count({ where });
      const products = await fastify.prisma.legacy.product.findMany({
        where,
        skip,
        take,
        orderBy: { position: 'asc' },
      });

      const productIds = products.map((p: any) => p.id);
      const inventoryItemIds = products.map((p: any) => p.inventory_item_id).filter(Boolean);

      const [langs, prices, stockCounts] = await Promise.all([
        fastify.prisma.legacy.product_language.findMany({ where: { product_id: { in: productIds } } }),
        fastify.prisma.legacy.product_price.findMany({
          where: { product_id: { in: productIds }, currency_id: CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID },
        }),
        inventoryItemIds.length > 0
          ? fastify.prisma.legacy.$queryRaw`
              SELECT inventory_item_id as inventoryItemId,
                     SUM(CASE WHEN item_state = 'New' THEN 1 ELSE 0 END) as inStockCount,
                     COUNT(*) as totalStockCount
              FROM inventory_warehouse_item
              WHERE inventory_item_id IN (${Prisma.join(inventoryItemIds)})
              GROUP BY inventory_item_id
            `
          : Promise.resolve([]),
      ]);

      const stockMap = new Map<number, { inStockCount: number; totalStockCount: number }>();
      (stockCounts as any[]).forEach((s: any) => {
        stockMap.set(Number(s.inventoryItemId), {
          inStockCount: Number(s.inStockCount || 0),
          totalStockCount: Number(s.totalStockCount || 0),
        });
      });

      const data = products.map((p: any) => {
        const lang = langs.find((l: any) => l.product_id === p.id);
        const price = prices.find((pr: any) => pr.product_id === p.id);
        const stock = stockMap.get(p.inventory_item_id);
        return mapProductDto(p, lang, price, stock);
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

  fastify.get('/catalog/products/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const product = await fastify.prisma.legacy.product.findUnique({ where: { id: Number(id) } });
      if (!product) return reply.status(404).send({ success: false, error: 'Not Found' });

      const [langs, prices] = await Promise.all([
        fastify.prisma.legacy.product_language.findMany({ where: { product_id: product.id } }),
        fastify.prisma.legacy.product_price.findMany({ where: { product_id: product.id } }),
      ]);

      const lang = langs.find((l: any) => l.language_id === CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID) || langs[0];
      const price = prices.find((pr: any) => pr.currency_id === CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID) || prices[0];

      return { success: true, data: mapProductDto(product, lang, price) };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.post('/catalog/products', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    const {
      productSku,
      inventoryItemId,
      isDisabled,
      productName,
      productShortDescription,
      productDescription,
      productPrice,
    } = request.body as any;

    try {
      const result = await fastify.prisma.legacy.$transaction(async (tx: any) => {
        const product = await tx.product.create({
          data: {
            client_id: CATALOG_DEFAULTS.CLIENT_ID,
            client_business_id: CATALOG_DEFAULTS.CLIENT_BUSINESS_ID,
            created_staff_id: null,
            inventory_item_id: inventoryItemId || 0,
            product_sku: productSku,
            position: 0,
            is_disabled: isDisabled || false,
            date_created: new Date(),
          },
        });

        const lang = await tx.product_language.create({
          data: {
            product_id: product.id,
            language_id: CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID,
            product_name: productName,
            product_short_description: productShortDescription || null,
            product_description: productDescription || null,
          },
        });

        let price = null;
        if (productPrice !== undefined) {
          price = await tx.product_price.create({
            data: {
              product_id: product.id,
              currency_id: CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID,
              product_price: productPrice,
            },
          });
        }

        return mapProductDto(product, lang, price);
      });

      return { success: true, data: result };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.put('/catalog/products/:id', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const {
      productSku,
      inventoryItemId,
      position,
      productName,
      productShortDescription,
      productDescription,
      productPrice,
      isDisabled,
    } = request.body as any;

    try {
      const result = await fastify.prisma.legacy.$transaction(async (tx: any) => {
        const dbData: any = {};
        if (productSku !== undefined) dbData.product_sku = productSku;
        if (inventoryItemId !== undefined) dbData.inventory_item_id = inventoryItemId;
        if (position !== undefined) dbData.position = position;
        if (isDisabled !== undefined) dbData.is_disabled = isDisabled;
        dbData.date_updated = new Date();

        const product = await tx.product.update({
          where: { id: Number(id) },
          data: dbData,
        });

        if (productName !== undefined || productShortDescription !== undefined || productDescription !== undefined) {
          const lang = await tx.product_language.findFirst({
            where: { product_id: Number(id), language_id: CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID },
          });
          if (lang) {
            await tx.product_language.update({
              where: { id: lang.id },
              data: {
                product_name: productName !== undefined ? productName : lang.product_name,
                product_short_description:
                  productShortDescription !== undefined ? productShortDescription : lang.product_short_description,
                product_description: productDescription !== undefined ? productDescription : lang.product_description,
              },
            });
          }
        }

        if (productPrice !== undefined) {
          const priceObj = await tx.product_price.findFirst({
            where: { product_id: Number(id), currency_id: CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID },
          });
          if (priceObj) {
            await tx.product_price.update({
              where: { id: priceObj.id },
              data: { product_price: productPrice },
            });
          } else {
            await tx.product_price.create({
              data: {
                product_id: Number(id),
                currency_id: CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID,
                product_price: productPrice,
              },
            });
          }
        }

        const langs = await tx.product_language.findMany({ where: { product_id: Number(id) } });
        const prices = await tx.product_price.findMany({ where: { product_id: Number(id) } });
        const lang = langs.find((l: any) => l.language_id === CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID) || langs[0];
        const price = prices.find((pr: any) => pr.currency_id === CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID) || prices[0];

        return mapProductDto(product, lang, price);
      });

      return { success: true, data: result };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  fastify.delete(
    '/catalog/products/:id',
    { preHandler: [requireAuth, requireCatalogAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const data = await fastify.prisma.legacy.product.update({
          where: { id: Number(id) },
          data: { is_disabled: true, date_updated: new Date() },
        });
        return { success: true, data: mapProductDto(data) };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );
}
