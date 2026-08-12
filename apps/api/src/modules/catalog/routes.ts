import { FastifyInstance } from 'fastify';
import { CATALOG_CURRENCY_SYSTEM_CONFIG } from '@mos-lab/shared';
import { Prisma } from '../../generated/legacy-client/index.js';
import { requireAuth, requireCatalogAdmin } from '../../middlewares/auth.js';
import { parseComboDateBounds } from '../customers/services/combo-recognition.service.js';
import { LashBenchmarkService, parseLashSpecs } from './services/lash-benchmark.service.js';
import { BranchService } from './services/branch.service.js';

/*
 * Legacy catalog rows and Fastify request payloads are intentionally dynamic: the
 * legacy schema contains tenant-specific columns and this module performs guarded
 * catalog migrations inside typed Prisma transactions. Keep the boundary explicit
 * until the legacy DTOs are extracted into the shared package.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

const CATALOG_DEFAULTS = {
  CLIENT_ID: 1,
  CLIENT_BUSINESS_ID: 1,
  DEFAULT_CURRENCY_ID: CATALOG_CURRENCY_SYSTEM_CONFIG.CURRENCY_ID_VND,
  DEFAULT_LANGUAGE_ID: CATALOG_CURRENCY_SYSTEM_CONFIG.LANGUAGE_ID_VIETNAMESE,
};

// ─── DTO Helper Transformers ────────────────────────────────────────────────

// Helper: Fetch real extension-lash-count attributes from legacy DB item_attribute_value
async function fetchRealServiceLashCounts(legacyPrisma: any, serviceIds: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (!serviceIds || serviceIds.length === 0) return map;
  try {
    const rows = (await legacyPrisma.$queryRawUnsafe(`
      SELECT s.id as service_id, aol.attribute_option_value as count
      FROM service s
      JOIN item_attribute_value iav ON s.id = iav.item_id AND iav.type = 'service-attribute'
      JOIN attribute a ON iav.attribute_id = a.id AND a.attribute_key = 'extension-lash-count'
      JOIN attribute_option ao ON iav.attribute_option_id = ao.id
      JOIN attribute_option_language aol ON ao.id = aol.attribute_option_id
      WHERE s.id IN (${serviceIds.join(',')})
    `)) as Array<{ service_id: number; count: string }>;
    for (const r of rows) {
      const num = parseInt(r.count, 10);
      if (!isNaN(num) && num > 0) {
        map.set(Number(r.service_id), num);
      }
    }
  } catch {
    // Ignore if table missing or query error
  }
  return map;
}

function mapServiceDto(
  s: any,
  lang?: any,
  prices: any[] = [],
  realAttrMap?: Map<number, number>,
  cvBenchmarkList: any[] = []
): any {
  const isProduct =
    s.service_type === 'Product' || s.service_group === 'Product' || s.service_key === 'any-service-product';
  const { lashStyle, lashCount: parsedLashCount } = isProduct
    ? { lashStyle: null, lashCount: null }
    : parseLashSpecs(s.service_key, lang?.service_name || s.service_key);
  let lashCount = parsedLashCount;

  if (!isProduct) {
    // Source 1: Real DB item_attribute_value
    if (realAttrMap && realAttrMap.has(s.id)) {
      lashCount = realAttrMap.get(s.id)!;
    }
    // Source 2: CV Xoay Speed Model Benchmarks matching
    else if (cvBenchmarkList && cvBenchmarkList.length > 0 && !lashCount) {
      const normType = s.service_type === 'Retain' ? 'Retain' : 'Normal';
      const matchedBm = cvBenchmarkList.find(
        (b: any) =>
          (b.lashStyle === lashStyle ||
            (b.lashStyle === 'Mink' && lashStyle === 'Flawless') ||
            (b.lashStyle === 'Volume 3D' && lashStyle === 'Volume')) &&
          b.serviceType === normType &&
          b.lashCount !== null &&
          Math.abs(b.benchmarkMinutes - s.duration_minute) <= 5
      );
      if (matchedBm) {
        lashCount = matchedBm.lashCount;
      }
    }
  }

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
    lashStyle,
    lashCount,
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

  async function checkServiceLiveCombos(fastify: FastifyInstance, serviceId: number) {
    const sql = `
    SELECT 
      usb.id as balanceId,
      usb.user_id as userId,
      COALESCE(NULLIF(up.full_name, ''), up.username, CONCAT('Khách #', usb.user_id)) as customerName,
      usb.normal_count as normalCount,
      usb.retain_count as retainCount,
      usb.date_expired as dateExpired,
      usb.next_normal_date_expired as nextNormalDateExpired,
      usb.next_retain_date_expired as nextRetainDateExpired,
      COALESCE(sl.service_name, s.service_key, 'Gói Combo') as serviceName,
      sp.service_price_package_key as packageKey,
      sp.service_price as packagePrice
    FROM user_service_balance usb
    JOIN service s ON usb.service_id = s.id
    LEFT JOIN user_profile up ON usb.user_id = up.user_id
    LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
    LEFT JOIN service_price sp ON usb.service_price_id = sp.id
    WHERE usb.service_id = ${Number(serviceId)}
      AND (sp.service_price_type = 'Combo' OR s.service_group = 'combo')
      AND (usb.normal_count > 0 OR usb.retain_count > 0)
      AND (
        usb.date_expired IS NULL 
        OR usb.date_expired >= NOW() 
        OR usb.next_normal_date_expired >= NOW() 
        OR usb.next_retain_date_expired >= NOW()
      )
  `;

    const rows = (await fastify.prisma.legacy.$queryRawUnsafe(sql)) as Record<string, unknown>[];

    const seenBalances = new Set<number>();
    const affectedCombosMap = new Map<
      string,
      {
        comboName: string;
        packagePrice: number;
        ownerCount: number;
        totalNormalBalance: number;
        totalRetainBalance: number;
      }
    >();

    let totalOwners = 0;
    let totalNormalBalance = 0;
    let totalRetainBalance = 0;

    (rows || []).forEach((r: Record<string, unknown>) => {
      const balanceId = Number(r.balanceId);
      if (seenBalances.has(balanceId)) return;
      seenBalances.add(balanceId);

      const normalCount = Math.max(0, Number(r.normalCount || 0));
      const retainCount = Math.max(0, Number(r.retainCount || 0));
      const packagePrice = Math.round(Number(r.packagePrice || 0));
      const comboName = String(r.packageKey || r.serviceName || 'Gói Combo');

      totalOwners++;
      totalNormalBalance += normalCount;
      totalRetainBalance += retainCount;

      const groupKey = `${comboName}_${packagePrice}`;
      if (!affectedCombosMap.has(groupKey)) {
        affectedCombosMap.set(groupKey, {
          comboName,
          packagePrice,
          ownerCount: 0,
          totalNormalBalance: 0,
          totalRetainBalance: 0,
        });
      }

      const item = affectedCombosMap.get(groupKey)!;
      item.ownerCount++;
      item.totalNormalBalance += normalCount;
      item.totalRetainBalance += retainCount;
    });

    return {
      serviceId,
      totalOwners,
      totalNormalBalance,
      totalRetainBalance,
      affectedCombos: Array.from(affectedCombosMap.values()),
    };
  }

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

  // GET /catalog/combo-live - Aggregated active combo balances grouped by combo name
  fastify.get('/catalog/combo-live', { preHandler: [requireAuth] }, async (request, reply) => {
    const { search = '', expiringSoon = 'false' } = request.query as { search?: string; expiringSoon?: string };
    const searchKeyword = search.trim().toLowerCase();
    const filterExpiringSoon = expiringSoon === 'true' || expiringSoon === '1';

    try {
      const sql = `
        SELECT 
          usb.id as balanceId,
          usb.user_id as userId,
          COALESCE(NULLIF(up.full_name, ''), up.username, CONCAT('Khách #', usb.user_id)) as customerName,
          (SELECT uc.phone_number FROM user_contact uc WHERE uc.user_id = usb.user_id AND uc.is_disabled = 0 ORDER BY uc.id DESC LIMIT 1) as customerPhone,
          usb.service_id as serviceId,
          usb.service_price_id as servicePriceId,
          usb.normal_count as normalCount,
          usb.retain_count as retainCount,
          usb.date_expired as dateExpired,
          usb.next_normal_date_expired as nextNormalDateExpired,
          usb.next_retain_date_expired as nextRetainDateExpired,
          usb.date_created as dateCreated,
          COALESCE(sl.service_name, s.service_key, 'Gói Combo') as serviceName,
          sp.service_price_package_key as packageKey,
          sp.service_price as packagePrice,
          sp.expiry_after_day as expiryAfterDay
        FROM user_service_balance usb
        LEFT JOIN user_profile up ON usb.user_id = up.user_id
        LEFT JOIN service s ON usb.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN service_price sp ON usb.service_price_id = sp.id
        WHERE (usb.normal_count > 0 OR usb.retain_count > 0)
          AND (sp.service_price_type = 'Combo' OR s.service_group = 'combo')
          AND (
            usb.date_expired IS NULL 
            OR usb.date_expired >= NOW() 
            OR usb.next_normal_date_expired >= NOW() 
            OR usb.next_retain_date_expired >= NOW()
          )
        ORDER BY COALESCE(sp.service_price_package_key, sl.service_name) ASC, usb.date_expired DESC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(sql);

      const groupedMap = new Map<
        string,
        {
          id: string;
          comboName: string;
          packageKey: string;
          serviceId: number;
          servicePriceId?: number;
          packagePrice: number;
          expiryAfterDay: number;
          owners: any[];
        }
      >();

      const seenBalanceIds = new Set<number>();
      let grandActiveOwners = 0;
      let grandNormalBalance = 0;
      let grandRetainBalance = 0;
      let grandExpiringSoonOwners = 0;

      rows.forEach((r) => {
        const balanceId = Number(r.balanceId);
        if (seenBalanceIds.has(balanceId)) return;
        seenBalanceIds.add(balanceId);
        const userId = Number(r.userId);
        const customerName = String(r.customerName || `Khách #${userId}`);
        const customerPhone = r.customerPhone ? String(r.customerPhone) : undefined;
        const normalCount = Math.max(0, Number(r.normalCount || 0));
        const retainCount = Math.max(0, Number(r.retainCount || 0));
        const packagePrice = Math.round(Number(r.packagePrice || 0));
        const expiryAfterDay = Number(r.expiryAfterDay || 0);

        const expDateRaw = r.dateExpired || r.nextNormalDateExpired || r.nextRetainDateExpired;
        const dateExpired = expDateRaw ? new Date(expDateRaw).toISOString() : null;
        const dateCreated = r.dateCreated ? new Date(r.dateCreated).toISOString() : new Date().toISOString();

        let daysRemaining: number | null = null;
        let isExpiringSoon = false;

        if (expDateRaw) {
          const diffMs = new Date(expDateRaw).getTime() - Date.now();
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (daysRemaining >= 0 && daysRemaining <= 30) {
            isExpiringSoon = true;
          }
        }

        const comboName = r.packageKey || r.serviceName || 'Gói Combo';
        const groupKey = `${comboName}_${packagePrice}`;

        // Apply filters
        if (filterExpiringSoon && !isExpiringSoon) return;

        if (searchKeyword) {
          const matchCombo = comboName.toLowerCase().includes(searchKeyword);
          const matchName = customerName.toLowerCase().includes(searchKeyword);
          const matchPhone = customerPhone ? customerPhone.toLowerCase().includes(searchKeyword) : false;
          const matchUserId = String(userId).includes(searchKeyword);

          if (!matchCombo && !matchName && !matchPhone && !matchUserId) return;
        }

        const ownerItem = {
          balanceId,
          userId,
          customerName,
          customerPhone,
          normalCount,
          retainCount,
          dateExpired,
          dateCreated,
          daysRemaining,
          isExpiringSoon,
        };

        if (!groupedMap.has(groupKey)) {
          groupedMap.set(groupKey, {
            id: groupKey,
            comboName,
            packageKey: r.packageKey || comboName,
            serviceId: Number(r.serviceId),
            servicePriceId: r.servicePriceId ? Number(r.servicePriceId) : undefined,
            packagePrice,
            expiryAfterDay,
            owners: [],
          });
        }

        groupedMap.get(groupKey)!.owners.push(ownerItem);

        grandActiveOwners++;
        grandNormalBalance += normalCount;
        grandRetainBalance += retainCount;
        if (isExpiringSoon) grandExpiringSoonOwners++;
      });

      const data = Array.from(groupedMap.values()).map((g) => {
        const ownerCount = g.owners.length;
        const totalNormalBalance = g.owners.reduce((sum, o) => sum + o.normalCount, 0);
        const totalRetainBalance = g.owners.reduce((sum, o) => sum + o.retainCount, 0);
        const expiringSoonOwnerCount = g.owners.filter((o) => o.isExpiringSoon).length;

        return {
          ...g,
          ownerCount,
          totalNormalBalance,
          totalRetainBalance,
          expiringSoonOwnerCount,
        };
      });

      return {
        success: true,
        meta: {
          totalCombos: data.length,
          totalActiveOwners: grandActiveOwners,
          totalNormalBalance: grandNormalBalance,
          totalRetainBalance: grandRetainBalance,
          totalExpiringSoonOwners: grandExpiringSoonOwners,
        },
        data,
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

  // ─── Catalog Daily/Weekly/Monthly Sales & Leaderboard Stats ────────────────

  fastify.get('/catalog/stats-summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      period?: 'today' | 'week' | 'month' | 'custom';
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      itemType?: 'all' | 'service' | 'combo' | 'product';
    };

    const period = query.period || 'month';
    const itemTypeFilter = query.itemType || 'all';
    const searchFilter = (query.search || '').trim().toLowerCase();

    // Calculate Date Bounds
    const now = new Date();
    let dFrom = query.dateFrom;
    let dTo = query.dateTo;

    if (period === 'today') {
      const yyyymmdd = now.toISOString().slice(0, 10);
      dFrom = yyyymmdd;
      dTo = yyyymmdd;
    } else if (period === 'week') {
      // Rule #22: Monday-First ISO week
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      dFrom = mon.toISOString().slice(0, 10);
      dTo = sun.toISOString().slice(0, 10);
    } else if (period === 'month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      dFrom = `${y}-${m}-01`;
      dTo = `${y}-${m}-${lastDay}`;
    }

    const { startStr, endStr } = parseComboDateBounds(dFrom, dTo);

    try {
      // 1. Single Services Query
      const servicesSql = `
        SELECT 
          s.id as itemId,
          'service' as itemType,
          COALESCE(sl.service_name, s.service_key) as name,
          s.service_group as groupOrKey,
          ROUND(MAX(COALESCE(sp.service_price, 0))) as unitPrice,
          CAST(COUNT(os.id) AS SIGNED) as unitsSold,
          CAST(SUM(COALESCE(sp.service_price, 0)) AS SIGNED) as revenue,
          MAX(s.is_disabled) as isDisabled
        FROM \`order_service\` os
        JOIN \`order\` o ON os.order_id = o.id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        JOIN \`service\` s ON os.service_id = s.id
        LEFT JOIN \`service_language\` sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN \`service_price\` sp ON os.service_price_id = sp.id
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
        GROUP BY s.id, sl.service_name, s.service_key, s.service_group
      `;

      // 2. Combos Query
      const combosSql = `
        SELECT 
          sp.id as itemId,
          'combo' as itemType,
          COALESCE(sp.service_price_package_key, CONCAT('Combo #', sp.id)) as name,
          COALESCE(sl.service_name, s.service_key) as groupOrKey,
          ROUND(COALESCE(sp.service_price, 0)) as unitPrice,
          CAST(COUNT(osc.id) AS SIGNED) as unitsSold,
          CAST(SUM(COALESCE(osc.total_price, sp.service_price, 0)) AS SIGNED) as revenue,
          MAX(sp.is_disabled) as isDisabled
        FROM \`order_service_combo\` osc
        JOIN \`order\` o ON osc.order_id = o.id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        JOIN \`service_price\` sp ON osc.service_price_id = sp.id
        JOIN \`service\` s ON sp.service_id = s.id
        LEFT JOIN \`service_language\` sl ON s.id = sl.service_id AND sl.language_id = 1
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
        GROUP BY sp.id, sp.service_price_package_key, sl.service_name, s.service_key, sp.service_price
      `;

      // 3. Products Query
      const productsSql = `
        SELECT 
          p.id as itemId,
          'product' as itemType,
          COALESCE(pl.product_name, p.product_sku) as name,
          p.product_sku as groupOrKey,
          ROUND(MAX(COALESCE(pp.product_price, 0))) as unitPrice,
          CAST(COUNT(op.id) AS SIGNED) as unitsSold,
          CAST(SUM(COALESCE(op.total_price, pp.product_price, 0)) AS SIGNED) as revenue,
          MAX(p.is_disabled) as isDisabled
        FROM \`order_product\` op
        JOIN \`order\` o ON op.order_id = o.id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        JOIN \`product\` p ON op.product_id = p.id
        LEFT JOIN \`product_language\` pl ON p.id = pl.product_id AND pl.language_id = 1
        LEFT JOIN \`product_price\` pp ON p.id = pp.product_id AND pp.currency_id = 2
        WHERE o.order_state = 'Completed'
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
        GROUP BY p.id, pl.product_name, p.product_sku
      `;

      const [servicesRaw, combosRaw, productsRaw] = await Promise.all([
        itemTypeFilter === 'all' || itemTypeFilter === 'service'
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(servicesSql, startStr, endStr)
          : Promise.resolve([]),
        itemTypeFilter === 'all' || itemTypeFilter === 'combo'
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(combosSql, startStr, endStr)
          : Promise.resolve([]),
        itemTypeFilter === 'all' || itemTypeFilter === 'product'
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(productsSql, startStr, endStr)
          : Promise.resolve([]),
      ]);

      const mapRow = (r: any) => ({
        itemId: Number(r.itemId),
        itemType: r.itemType as 'service' | 'combo' | 'product',
        name: String(r.name || ''),
        groupOrKey: String(r.groupOrKey || ''),
        unitPrice: Math.round(Number(r.unitPrice || 0)),
        unitsSold: Number(r.unitsSold || 0),
        revenue: Math.round(Number(r.revenue || 0)),
        isDisabled: Boolean(r.isDisabled),
      });

      const rawItems = [...servicesRaw.map(mapRow), ...combosRaw.map(mapRow), ...productsRaw.map(mapRow)];

      // Deduplicate by itemType-itemId
      const itemMap = new Map<string, any>();
      for (const item of rawItems) {
        const key = `${item.itemType}-${item.itemId}`;
        if (!itemMap.has(key)) {
          itemMap.set(key, { ...item });
        } else {
          const existing = itemMap.get(key);
          existing.unitsSold += item.unitsSold;
          existing.revenue += item.revenue;
          if (!existing.unitPrice && item.unitPrice) existing.unitPrice = item.unitPrice;
        }
      }

      // Merge active master items with zero sales
      const [activeServicesMaster, activeCombosMaster, activeProductsMaster] = await Promise.all([
        itemTypeFilter === 'all' || itemTypeFilter === 'service'
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
              SELECT 
                s.id as itemId,
                'service' as itemType,
                COALESCE(sl.service_name, s.service_key) as name,
                s.service_group as groupOrKey,
                ROUND(COALESCE(sp.service_price, 0)) as unitPrice,
                0 as unitsSold,
                0 as revenue,
                s.is_disabled as isDisabled
              FROM \`service\` s
              LEFT JOIN \`service_language\` sl ON s.id = sl.service_id AND sl.language_id = 1
              LEFT JOIN \`service_price\` sp ON s.id = sp.service_id AND sp.currency_id = 2
              WHERE s.is_disabled = 0
            `)
          : Promise.resolve([]),
        itemTypeFilter === 'all' || itemTypeFilter === 'combo'
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
              SELECT 
                sp.id as itemId,
                'combo' as itemType,
                COALESCE(sp.service_price_package_key, CONCAT('Combo #', sp.id)) as name,
                COALESCE(sl.service_name, s.service_key) as groupOrKey,
                ROUND(COALESCE(sp.service_price, 0)) as unitPrice,
                0 as unitsSold,
                0 as revenue,
                sp.is_disabled as isDisabled
              FROM \`service_price\` sp
              JOIN \`service\` s ON sp.service_id = s.id
              LEFT JOIN \`service_language\` sl ON s.id = sl.service_id AND sl.language_id = 1
              WHERE sp.is_disabled = 0 AND sp.service_price_type = 'Combo'
            `)
          : Promise.resolve([]),
        itemTypeFilter === 'all' || itemTypeFilter === 'product'
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
              SELECT 
                p.id as itemId,
                'product' as itemType,
                COALESCE(pl.product_name, p.product_sku) as name,
                p.product_sku as groupOrKey,
                ROUND(COALESCE(pp.product_price, 0)) as unitPrice,
                0 as unitsSold,
                0 as revenue,
                p.is_disabled as isDisabled
              FROM \`product\` p
              LEFT JOIN \`product_language\` pl ON p.id = pl.product_id AND pl.language_id = 1
              LEFT JOIN \`product_price\` pp ON p.id = pp.product_id AND pp.currency_id = 2
              WHERE p.is_disabled = 0
            `)
          : Promise.resolve([]),
      ]);

      const activeMasterItems = [
        ...activeServicesMaster.map(mapRow),
        ...activeCombosMaster.map(mapRow),
        ...activeProductsMaster.map(mapRow),
      ];

      for (const item of activeMasterItems) {
        const key = `${item.itemType}-${item.itemId}`;
        if (!itemMap.has(key)) {
          itemMap.set(key, { ...item });
        }
      }

      const allItems = Array.from(itemMap.values());

      // Calculate Stat Totals
      const singleServiceRevenue = servicesRaw.reduce((sum, r) => sum + Math.round(Number(r.revenue || 0)), 0);
      const comboRevenue = combosRaw.reduce((sum, r) => sum + Math.round(Number(r.revenue || 0)), 0);
      const productRevenue = productsRaw.reduce((sum, r) => sum + Math.round(Number(r.revenue || 0)), 0);
      const totalRevenue = singleServiceRevenue + comboRevenue + productRevenue;
      const totalUnitsSold = allItems.reduce((sum, r) => sum + r.unitsSold, 0);

      // Filter by search string if provided
      let filteredItems = allItems;
      if (searchFilter) {
        filteredItems = filteredItems.filter(
          (item) =>
            item.name.toLowerCase().includes(searchFilter) || item.groupOrKey.toLowerCase().includes(searchFilter)
        );
      }

      // Sort by revenue descending, then unitsSold descending, then name ascending
      filteredItems.sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold || a.name.localeCompare(b.name));

      // Assign Rank & Revenue Share
      const leaderboard = filteredItems.map((item, index) => ({
        id: `${item.itemType}-${item.itemId}`,
        ...item,
        rank: index + 1,
        revenueSharePercent: totalRevenue > 0 ? Number(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
      }));

      return {
        success: true,
        data: {
          totalRevenue,
          singleServiceRevenue,
          comboRevenue,
          productRevenue,
          totalOrdersCount: leaderboard.length,
          totalUnitsSold,
          leaderboard,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // ─── Item Customer Order History ────────────────────────────────────────────

  fastify.get('/catalog/item-history', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      itemId: string;
      itemType: 'service' | 'combo' | 'product';
      dateFrom?: string;
      dateTo?: string;
    };

    const itemId = Number(query.itemId);
    const itemType = query.itemType;
    if (!itemId || !itemType) {
      return reply.status(400).send({ success: false, error: 'itemId and itemType are required' });
    }

    const { startStr, endStr } = parseComboDateBounds(query.dateFrom, query.dateTo);

    try {
      let ordersSql = '';

      if (itemType === 'service') {
        ordersSql = `
          SELECT 
            o.id as orderId,
            CONCAT('#', o.id) as orderCode,
            COALESCE(up.full_name, up.username, uc.phone_number, 'Khách hàng') as customerName,
            uc.phone_number as customerPhone,
            COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created) as orderDate,
            'Chuyên viên' as staffName,
            1 as quantity,
            ROUND(COALESCE(sp.service_price, 0)) as amount
          FROM \`order_service\` os
          JOIN \`order\` o ON os.order_id = o.id
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          LEFT JOIN (
            SELECT user_id, MAX(full_name) as full_name, MAX(username) as username
            FROM \`user_profile\`
            GROUP BY user_id
          ) up ON o.user_id = up.user_id
          LEFT JOIN (
            SELECT user_id, MIN(phone_number) as phone_number
            FROM \`user_contact\`
            WHERE is_disabled = 0
            GROUP BY user_id
          ) uc ON o.user_id = uc.user_id
          LEFT JOIN \`service_price\` sp ON os.service_price_id = sp.id
          WHERE os.service_id = ?
            AND o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
          ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        `;
      } else if (itemType === 'combo') {
        ordersSql = `
          SELECT 
            o.id as orderId,
            CONCAT('#', o.id) as orderCode,
            COALESCE(up.full_name, up.username, uc.phone_number, 'Khách hàng') as customerName,
            uc.phone_number as customerPhone,
            COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created) as orderDate,
            'Tư vấn viên' as staffName,
            1 as quantity,
            ROUND(COALESCE(osc.total_price, sp.service_price, 0)) as amount
          FROM \`order_service_combo\` osc
          JOIN \`order\` o ON osc.order_id = o.id
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          LEFT JOIN (
            SELECT user_id, MAX(full_name) as full_name, MAX(username) as username
            FROM \`user_profile\`
            GROUP BY user_id
          ) up ON o.user_id = up.user_id
          LEFT JOIN (
            SELECT user_id, MIN(phone_number) as phone_number
            FROM \`user_contact\`
            WHERE is_disabled = 0
            GROUP BY user_id
          ) uc ON o.user_id = uc.user_id
          LEFT JOIN \`service_price\` sp ON osc.service_price_id = sp.id
          WHERE osc.service_price_id = ?
            AND o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
          ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        `;
      } else {
        ordersSql = `
          SELECT 
            o.id as orderId,
            CONCAT('#', o.id) as orderCode,
            COALESCE(up.full_name, up.username, uc.phone_number, 'Khách hàng') as customerName,
            uc.phone_number as customerPhone,
            COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created) as orderDate,
            'Tư vấn viên' as staffName,
            1 as quantity,
            ROUND(COALESCE(op.total_price, pp.product_price, 0)) as amount
          FROM \`order_product\` op
          JOIN \`order\` o ON op.order_id = o.id
          LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
          LEFT JOIN (
            SELECT user_id, MAX(full_name) as full_name, MAX(username) as username
            FROM \`user_profile\`
            GROUP BY user_id
          ) up ON o.user_id = up.user_id
          LEFT JOIN (
            SELECT user_id, MIN(phone_number) as phone_number
            FROM \`user_contact\`
            WHERE is_disabled = 0
            GROUP BY user_id
          ) uc ON o.user_id = uc.user_id
          LEFT JOIN \`product_price\` pp ON op.product_id = pp.product_id AND pp.currency_id = 2
          WHERE op.product_id = ?
            AND o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
          ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        `;
      }

      const ordersRaw = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(ordersSql, itemId, startStr, endStr);

      const orders = ordersRaw.map((r, index) => ({
        id: `${r.orderId}-${index}`,
        orderId: Number(r.orderId),
        orderCode: String(r.orderCode),
        customerName: String(r.customerName),
        customerPhone: r.customerPhone ? String(r.customerPhone) : undefined,
        orderDate: r.orderDate ? new Date(r.orderDate).toISOString() : new Date().toISOString(),
        staffName: r.staffName ? String(r.staffName) : undefined,
        quantity: Number(r.quantity || 1),
        amount: Math.round(Number(r.amount || 0)),
      }));

      const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
      const totalUnitsSold = orders.reduce((sum, o) => sum + o.quantity, 0);

      // Fetch basic item metadata
      let itemName = 'Mục Catalog';
      let unitPrice = 0;
      let isDisabled = false;

      if (itemType === 'service') {
        const s = await fastify.prisma.legacy.service.findUnique({
          where: { id: itemId },
        });
        if (s) {
          const [langs, prices] = await Promise.all([
            fastify.prisma.legacy.service_language.findMany({
              where: { service_id: itemId, language_id: CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID },
            }),
            fastify.prisma.legacy.service_price.findMany({
              where: { service_id: itemId, currency_id: CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID },
            }),
          ]);
          itemName = langs[0]?.service_name || s.service_key;
          unitPrice = Math.round(prices[0]?.service_price || 0);
          isDisabled = Boolean(s.is_disabled);
        }
      } else if (itemType === 'combo') {
        const sp = await fastify.prisma.legacy.service_price.findUnique({
          where: { id: itemId },
        });
        if (sp) {
          itemName = sp.service_price_package_key || `Combo #${sp.id}`;
          unitPrice = Math.round(sp.service_price || 0);
          isDisabled = Boolean(sp.is_disabled);
        }
      } else {
        const p = await fastify.prisma.legacy.product.findUnique({
          where: { id: itemId },
        });
        if (p) {
          const [langs, prices] = await Promise.all([
            fastify.prisma.legacy.product_language.findMany({
              where: { product_id: itemId, language_id: CATALOG_DEFAULTS.DEFAULT_LANGUAGE_ID },
            }),
            fastify.prisma.legacy.product_price.findMany({
              where: { product_id: itemId, currency_id: CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID },
            }),
          ]);
          itemName = langs[0]?.product_name || p.product_sku;
          unitPrice = Math.round(prices[0]?.product_price || 0);
          isDisabled = Boolean(p.is_disabled);
        }
      }

      return {
        success: true,
        item: {
          itemId,
          itemType,
          name: itemName,
          unitPrice,
          totalRevenue,
          totalUnitsSold,
          isDisabled,
        },
        orders,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Lash Type Benchmark Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/catalog/lash-benchmarks — List all benchmarks
   */
  fastify.get('/catalog/lash-benchmarks', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const benchmarks = await LashBenchmarkService.listBenchmarks(fastify);
      return { success: true, data: benchmarks };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  /**
   * POST /api/catalog/lash-benchmarks/seed — Auto-calculate & seed from Legacy DB
   */
  fastify.post(
    '/catalog/lash-benchmarks/seed',
    { preHandler: [requireAuth, requireCatalogAdmin] },
    async (_request, reply) => {
      try {
        const result = await LashBenchmarkService.seedBenchmarks(fastify);
        return {
          success: true,
          message: `Seed hoàn tất: ${result.inserted} mới, ${result.updated} cập nhật, tổng ${result.total} dòng`,
          data: result,
        };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );

  /**
   * PUT /api/catalog/lash-benchmarks/:id — Admin manual edit
   */
  fastify.put<{
    Params: { id: string };
    Body: { benchmarkMinutes?: number; minMinutes?: number; maxMinutes?: number };
  }>('/catalog/lash-benchmarks/:id', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ success: false, error: 'Invalid ID' });

      const { benchmarkMinutes, minMinutes, maxMinutes } = request.body || {};
      const updateData: Record<string, number> = {};
      if (benchmarkMinutes !== undefined) updateData.benchmarkMinutes = benchmarkMinutes;
      if (minMinutes !== undefined) updateData.minMinutes = minMinutes;
      if (maxMinutes !== undefined) updateData.maxMinutes = maxMinutes;

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({ success: false, error: 'No fields to update' });
      }

      const updated = await LashBenchmarkService.updateBenchmark(fastify, id, updateData);
      return { success: true, data: updated };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Branch Management (Catalog Stores) Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  const branchService = new BranchService(fastify);

  /**
   * GET /api/catalog/branches — List all branches with search, filters, pagination
   */
  fastify.get<{
    Querystring: {
      page?: string;
      pageSize?: string;
      search?: string;
      isActive?: string;
      onlyHidden?: string;
    };
  }>('/catalog/branches', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const page = request.query.page ? parseInt(request.query.page, 10) : 1;
      const pageSize = request.query.pageSize ? parseInt(request.query.pageSize, 10) : 20;
      const search = request.query.search;
      const isActive = request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined;
      const onlyHidden = request.query.onlyHidden === 'true';

      const result = await branchService.listBranches({
        page,
        pageSize,
        search,
        isActive,
        onlyHidden,
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message || 'Internal Server Error' });
    }
  });

  /**
   * GET /api/catalog/branches/stats — Overall branch KPI statistics
   */
  fastify.get('/catalog/branches/stats', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const stats = await branchService.getBranchStats();
      return { success: true, data: stats };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/catalog/branches/:id — Get branch detail + staff list
   */
  fastify.get<{ Params: { id: string } }>(
    '/catalog/branches/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id, 10);
        if (isNaN(id)) return reply.status(400).send({ success: false, error: 'Invalid Branch ID' });

        const branch = await branchService.getBranchById(id);
        if (!branch) return reply.status(404).send({ success: false, error: 'Chi nhánh không tồn tại' });

        return { success: true, data: branch };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );

  /**
   * POST /api/catalog/branches — Create a new branch (Admin & Manager)
   */
  fastify.post<{
    Body: {
      code: string;
      name: string;
      nameEn?: string;
      addressMap?: string;
      addressSms?: string;
      addressWeb?: string;
      addressCity?: string;
      sortOrder?: number;
      isActive?: boolean;
      notes?: string;
    };
  }>('/catalog/branches', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    try {
      const { code, name } = request.body || {};
      if (!code || !code.trim()) {
        return reply.status(400).send({ success: false, error: 'Mã chi nhánh (code) là bắt buộc' });
      }
      if (!name || !name.trim()) {
        return reply.status(400).send({ success: false, error: 'Tên chi nhánh (name) là bắt buộc' });
      }

      const created = await branchService.createBranch(request.body);
      return reply.status(201).send({ success: true, data: created, message: 'Tạo chi nhánh mới thành công' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(400).send({ success: false, error: error.message || 'Lỗi tạo chi nhánh' });
    }
  });

  /**
   * PUT /api/catalog/branches/:id — Update a branch (Admin & Manager)
   */
  fastify.put<{
    Params: { id: string };
    Body: {
      code?: string;
      name?: string;
      nameEn?: string;
      addressMap?: string;
      addressSms?: string;
      addressWeb?: string;
      addressCity?: string;
      sortOrder?: number;
      isActive?: boolean;
      notes?: string;
    };
  }>('/catalog/branches/:id', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ success: false, error: 'Invalid Branch ID' });

      const updated = await branchService.updateBranch(id, request.body);
      return { success: true, data: updated, message: 'Cập nhật chi nhánh thành công' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(400).send({ success: false, error: error.message || 'Lỗi cập nhật chi nhánh' });
    }
  });

  /**
   * PATCH /api/catalog/branches/:id/toggle-active — Toggle active status (Soft delete protection)
   */
  fastify.patch<{ Params: { id: string } }>(
    '/catalog/branches/:id/toggle-active',
    { preHandler: [requireAuth, requireCatalogAdmin] },
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id, 10);
        if (isNaN(id)) return reply.status(400).send({ success: false, error: 'Invalid Branch ID' });

        const updated = await branchService.toggleActiveBranch(id);
        const statusText = updated.isActive ? 'Đã kích hoạt' : 'Đã vô hiệu hóa';
        return { success: true, data: updated, message: `${statusText} chi nhánh '${updated.name}'` };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({ success: false, error: error.message || 'Lỗi chuyển trạng thái chi nhánh' });
      }
    }
  );
}
