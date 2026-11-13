import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CustomerServiceFilterCatalogService,
  resolveFixedFinalPriceScope,
} from './customer-service-filter-catalog.service.js';

test('returns the active VND single price with the shared customer service filter options', async () => {
  let capturedSql = '';
  const fastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          capturedSql = sql;
          return [
            {
              id: 12,
              name: 'Classic 60',
              serviceKey: 'classic-60',
              serviceType: 'Normal',
              serviceGroup: 'LashesTop',
              singlePrice: 399000.4,
            },
          ];
        },
      },
    },
  };

  const result = await CustomerServiceFilterCatalogService.getOptions(fastify as never);

  assert.deepEqual(result.services, [
    {
      id: 12,
      name: 'Classic 60',
      serviceType: 'Normal',
      serviceGroup: 'LashesTop',
      singlePrice: 399000,
    },
  ]);
  assert.match(capturedSql, /service_price sp/);
  assert.match(capturedSql, /sp\.currency_id = 2/);
  assert.match(capturedSql, /sp\.service_price_package_key = 'single'/);
});

test('expands a HyperLight category to eligible single lash services only', () => {
  const scope = resolveFixedFinalPriceScope(
    {
      services: [
        { id: 31, name: 'HyperLight 390', serviceType: 'Normal', serviceGroup: 'LashesTop', singlePrice: 390000 },
        { id: 32, name: 'HyperLight Dặm', serviceType: 'Refill', serviceGroup: 'LashesTop', singlePrice: 250000 },
        { id: 33, name: 'Classic 490', serviceType: 'Normal', serviceGroup: 'LashesTop', singlePrice: 490000 },
      ],
      categories: [{ key: 'hyperlight', label: 'HyperLight', serviceIds: [31, 32] }],
    },
    [33],
    ['hyperlight']
  );

  assert.deepEqual(scope, {
    serviceIds: [33, 31],
    invalidServiceIds: [],
    invalidCategoryKeys: [],
    emptyCategoryKeys: [],
  });
});

test('resolves Lash Lift category properly from catalog options', async () => {
  const fastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async () => [
          {
            id: 999,
            name: 'LASH LIFT (Uốn mi)',
            serviceKey: 'lash-lift',
            serviceType: 'Normal',
            serviceGroup: 'LashLift',
            singlePrice: 990000,
          },
        ],
      },
    },
  };

  const result = await CustomerServiceFilterCatalogService.getOptions(fastify as never);
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0].id, 999);
  assert.equal(result.services[0].name, 'LASH LIFT (Uốn mi)');
  assert.equal(result.services[0].singlePrice, 990000);
  assert.equal(result.services[0].serviceGroup, 'LashLift');

  const liftCategory = result.categories.find((c) => c.key === 'lash-lift');
  assert.ok(liftCategory, 'lash-lift category should be present');
  assert.deepEqual(liftCategory?.serviceIds, [999]);
});

test('maps OLD-prefixed pre-price-increase services to their lash family categories', async () => {
  const fastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async () => [
          {
            id: 2,
            name: 'OLD Classic 390',
            serviceKey: 'classic-390',
            serviceType: 'Normal',
            serviceGroup: 'LashesTop',
            singlePrice: 390000,
          },
          {
            id: 25,
            name: 'OLD Mink 790',
            serviceKey: 'mink-790',
            serviceType: 'Normal',
            serviceGroup: 'LashesTop',
            singlePrice: 790000,
          },
          {
            id: 31,
            name: 'OLD Under Mink 390',
            serviceKey: 'under-mink-390',
            serviceType: 'Normal',
            serviceGroup: 'LashesUnder',
            singlePrice: 390000,
          },
          {
            id: 46,
            name: 'Classic 440',
            serviceKey: 'new-classic-440',
            serviceType: 'Normal',
            serviceGroup: 'LashesTop',
            singlePrice: 440000,
          },
        ],
      },
    },
  };

  const result = await CustomerServiceFilterCatalogService.getOptions(fastify as never);
  assert.deepEqual(result.categories.find((c) => c.key === 'classic')?.serviceIds, [2, 46]);
  assert.deepEqual(result.categories.find((c) => c.key === 'mink')?.serviceIds, [25]);
  assert.deepEqual(result.categories.find((c) => c.key === 'under-mink')?.serviceIds, [31]);
});
