import { FastifyInstance } from 'fastify';
import { requireAuth, requireCatalogAdmin } from '../../../middlewares/auth.js';
import { CATALOG_DEFAULTS, mapComboDto, mapServiceDto } from './catalog-route-helpers.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function registerCatalogCombosRoutes(fastify: FastifyInstance) {
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
}
