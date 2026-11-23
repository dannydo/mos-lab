import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { registerCustomerListRoutes } from './customer-list.routes.js';

function createCustomerFilterTestApp() {
  const legacyQueries: Array<{ sql: string; params: unknown[] }> = [];

  const app = Fastify();
  app.decorateRequest('user', null as SafeAny);
  app.decorateRequest('jwtVerify', async function () {
    (this as SafeAny).user = { id: 1, username: 'admin', role: 'admin', displayName: 'Admin' };
  });

  const mockPrisma: SafeAny = {
    crm: {
      crmConfig: { findUnique: async () => null },
      crmStaff: {
        findFirst: async () => ({ id: 1, role: 'admin', isActive: true }),
        findUnique: async () => ({ id: 1, role: 'admin', isActive: true }),
        findMany: async () => [],
      },
      crmCustomerAssignment: {
        findMany: async () => [],
      },
      crmAllocationBatchItem: {
        findMany: async () => [],
      },
      crmCampaignCustomer: {
        findMany: async () => [],
      },
      crmCallLog: {
        findMany: async () => [],
      },
      crmDailyPlan: {
        findMany: async () => [],
      },
      crmCustomerElsaReservation: {
        findMany: async () => [],
      },
      crmLocaTouchpoint: {
        findMany: async () => [],
      },
      crmAllocationLedgerEvent: {
        create: async () => ({ id: 1 }),
      },
      crmAssignmentHistory: {
        createMany: async () => ({ count: 0 }),
        findMany: async () => [],
      },
      $transaction: async (cb: (tx: SafeAny) => Promise<unknown>) => cb(mockPrisma.crm),
      $queryRawUnsafe: async () => [],
    },
    legacy: {
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        legacyQueries.push({ sql, params });
        if (/ORDER BY RAND\(\)/i.test(sql)) {
          return [{ id: 501 }, { id: 502 }];
        }
        if (/SELECT COUNT\(\*\) as total FROM/i.test(sql)) {
          return [{ total: 1 }];
        }
        if (/^\s*SELECT u\.id\s+FROM user u/i.test(sql)) {
          return [{ id: 501 }];
        }
        if (/FROM user u\s+LEFT JOIN user_profile up ON u\.id = up\.user_id\s+WHERE u\.id IN/i.test(sql)) {
          return [
            {
              id: 501,
              name: 'Foreign Customer',
              avatar: null,
              isForeign: 1,
              isForeignOverridden: 1,
              phone: '+14155551234',
              email: null,
              gender: 'F',
              dob: '1995-05-10',
              age: 31,
              lastVisit: null,
              daysSinceLastVisit: 45,
              totalSpent: 0,
              totalVisits: 0,
              totalPromotionsUsed: 0,
              totalReferrals: 0,
              bucket: 'SINGLE',
              normalCount: 0,
              retainCount: 0,
              expiryDate: null,
            },
          ];
        }
        return [];
      },
    },
  };

  app.decorate('prisma', mockPrisma as SafeAny);
  app.decorate('cache', { get: () => null, set: () => {} } as SafeAny);

  return { app, legacyQueries };
}

test('GET /customers applies isForeign and birthday/age SQL predicates across full dataset', async () => {
  const { app, legacyQueries } = createCustomerFilterTestApp();
  await registerCustomerListRoutes(app);

  const res = await app.inject({
    method: 'GET',
    url: '/customers?isForeign=foreign&dobMonth=5&ageMin=25&ageMax=35&page=1&limit=20',
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.pagination.total, 1);
  assert.equal(body.data[0].id, 501);
  assert.equal(body.data[0].isForeign, true);

  const pageIdQuery = legacyQueries.find((q) => /^\s*SELECT u\.id\s+FROM user u/i.test(q.sql));
  const countQuery = legacyQueries.find((q) => /SELECT COUNT\(\*\) as total FROM/i.test(q.sql));
  assert.ok(pageIdQuery && countQuery);
  assert.match(pageIdQuery.sql, /up\.is_foreign = 1/);
  assert.match(pageIdQuery.sql, /MONTH\(u\.date_of_birth\) = \?/);
  assert.match(pageIdQuery.sql, /YEAR\(u\.date_of_birth\) <= YEAR\(CURDATE\(\)\) - 10/);
  assert.deepEqual(countQuery.params, [5, 25, 35]);
});

test('GET /customers/random-ids forwards isForeign, birthday/age, and call log filters to SQL', async () => {
  const { app, legacyQueries } = createCustomerFilterTestApp();
  await registerCustomerListRoutes(app);

  const res = await app.inject({
    method: 'GET',
    url: '/customers/random-ids?isForeign=local&dobMonth=8&ageMin=20&ageMax=40&callStatuses=NO_ANSWER,NOT_CALLED&lastCallDaysMin=3&limit=10',
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.deepEqual(body.ids, [501, 502]);

  const randQuery = legacyQueries.find((q) => /ORDER BY RAND\(\)/i.test(q.sql));
  assert.ok(randQuery, 'Expected ORDER BY RAND() query');
  assert.match(randQuery.sql, /COALESCE\(up\.is_foreign, 0\) = 0/);
  assert.match(randQuery.sql, /MONTH\(u\.date_of_birth\) = \?/);
  assert.match(randQuery.sql, /ccl_latest\.call_result IN \(\?\)/);
  assert.match(randQuery.sql, /NOT EXISTS \(\s*SELECT 1 FROM mos_lab\.crm_call_logs ccl_all/);
  assert.match(randQuery.sql, /DATEDIFF\(NOW\(\), ccl_latest\.created_at\) >= \?/);
  assert.deepEqual(randQuery.params, [8, 20, 40, 'NO_ANSWER', 3, 10]);
});
