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
