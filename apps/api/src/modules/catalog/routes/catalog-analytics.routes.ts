import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { parseComboDateBounds } from '../../customers/services/combo-recognition.service.js';
import { CATALOG_DEFAULTS } from './catalog-route-helpers.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function registerCatalogAnalyticsRoutes(fastify: FastifyInstance) {
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
          AND (
            (ro.actual_booking_date_start >= ? AND ro.actual_booking_date_start <= ?)
            OR (
              ro.actual_booking_date_start IS NULL
              AND o.booking_date_start >= ? AND o.booking_date_start <= ?
            )
          )
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
          AND (
            (ro.actual_booking_date_start >= ? AND ro.actual_booking_date_start <= ?)
            OR (
              ro.actual_booking_date_start IS NULL
              AND o.booking_date_start >= ? AND o.booking_date_start <= ?
            )
          )
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
          AND (
            (ro.actual_booking_date_start >= ? AND ro.actual_booking_date_start <= ?)
            OR (
              ro.actual_booking_date_start IS NULL
              AND o.booking_date_start >= ? AND o.booking_date_start <= ?
            )
          )
        GROUP BY p.id, pl.product_name, p.product_sku
      `;

      const [servicesRaw, combosRaw, productsRaw] = await Promise.all([
        itemTypeFilter === 'all' || itemTypeFilter === 'service'
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(servicesSql, startStr, endStr, startStr, endStr)
          : Promise.resolve([]),
        itemTypeFilter === 'all' || itemTypeFilter === 'combo'
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(combosSql, startStr, endStr, startStr, endStr)
          : Promise.resolve([]),
        itemTypeFilter === 'all' || itemTypeFilter === 'product'
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(productsSql, startStr, endStr, startStr, endStr)
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
}
