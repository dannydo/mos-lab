import { FastifyInstance } from 'fastify';
import { Prisma } from '../../../generated/legacy-client/index.js';
import { requireAuth, requireCatalogAdmin } from '../../../middlewares/auth.js';
import { CATALOG_DEFAULTS, mapProductDto } from './catalog-route-helpers.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function registerCatalogProductsRoutes(fastify: FastifyInstance) {
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
