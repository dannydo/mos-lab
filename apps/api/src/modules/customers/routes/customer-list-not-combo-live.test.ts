import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { registerCustomerListRoutes } from './customer-list.routes.js';

function createCustomerListTestApp(options?: {
  assignedIds?: number[];
  spentMatchedIds?: number[];
  liveBalanceIds?: number[];
  elsaIds?: number[];
  pageIds?: number[];
  countTotal?: number;
}) {
  const legacyQueries: Array<{ sql: string; params: unknown[] }> = [];
  const crmQueries: Array<{ sql: string; params: unknown[] }> = [];

  const assignedIds = options?.assignedIds ?? [101];
  const spentMatchedIds = options?.spentMatchedIds ?? [101, 102, 103, 104];
  const liveBalanceIds = options?.liveBalanceIds ?? [104];
  const elsaIds = options?.elsaIds ?? [];
  const pageIds = options?.pageIds ?? [103, 102];
  const countTotal = options?.countTotal ?? pageIds.length;

  const app = Fastify();
  app.decorateRequest('user', null as SafeAny);
  app.decorateRequest('jwtVerify', async function () {
    (this as SafeAny).user = { id: 1, username: 'admin', role: 'admin', displayName: 'Admin' };
  });

  const mockPrisma = {
    crm: {
      crmConfig: { findUnique: async () => null },
      crmStaff: {
        findUnique: async () => ({ id: 1, role: 'admin', isActive: true }),
        findMany: async () => [],
      },
      crmCustomerAssignment: {
        findMany: async (args: SafeAny) => {
          if (args?.where?.legacyUserId) return [];
          return assignedIds.map((legacyUserId) => ({ legacyUserId }));
        },
      },
      crmAssignmentHistory: { findMany: async () => [] },
      crmAllocationBatchItem: { findMany: async () => [] },
      crmCallLog: { findMany: async () => [] },
      crmDailyPlan: { findMany: async () => [] },
      crmCustomerElsaReservation: { findMany: async () => [] },
      crmLocaTouchpoint: { findMany: async () => [] },
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        crmQueries.push({ sql, params });
        if (/FROM crm_customer_elsa_reservations/i.test(sql)) {
          return elsaIds.map((legacy_user_id) => ({ legacy_user_id }));
        }
        return [];
      },
    },
    legacy: {
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        legacyQueries.push({ sql, params });
        if (/FROM `order`[\s\S]*HAVING/i.test(sql)) {
          return spentMatchedIds.map((user_id) => ({ user_id }));
        }
        if (/SELECT DISTINCT user_id\s+FROM user_service_balance/i.test(sql)) {
          return liveBalanceIds.map((user_id) => ({ user_id }));
        }
        if (/SELECT COUNT\(\*\) as total FROM/i.test(sql)) {
          return [{ total: countTotal }];
        }
        if (/^\s*SELECT u\.id\s+FROM user u/i.test(sql)) {
          return pageIds.map((id) => ({ id }));
        }
        if (/FROM user u\s+LEFT JOIN user_profile up ON u\.id = up\.user_id\s+WHERE u\.id IN/i.test(sql)) {
          return [...pageIds].reverse().map((id) => ({
            id,
            name: `Customer ${id}`,
            avatar: null,
            isForeign: 0,
            isForeignOverridden: 0,
            phone: `0900000${id}`,
            email: null,
            gender: 'F',
            dob: null,
            age: null,
            lastVisit: null,
            daysSinceLastVisit: 180,
            totalSpent: 0,
            totalVisits: 0,
            totalPromotionsUsed: 0,
            totalReferrals: 0,
            bucket: 'SINGLE',
            normalCount: 0,
            retainCount: 0,
            expiryDate: null,
          }));
        }
        if (/o\.user_id as userId,[\s\S]*totalSpent/i.test(sql)) {
          return pageIds.map((id) => ({
            userId: id,
            totalSpent: id === 103 ? 8_000_000 : 5_000_000,
            totalVisits: 2,
            totalPromotionsUsed: 0,
            lastVisitAt: new Date('2026-03-01T00:00:00Z'),
            daysSinceLastVisit: 250,
          }));
        }
        return [];
      },
    },
  };

  app.decorate('prisma', mockPrisma as SafeAny);
  app.decorate('cache', { get: () => null, set: () => {} } as SafeAny);

  return { app, legacyQueries, crmQueries };
}

test('GET /customers with NOT_COMBO_LIVE + unassigned + spent + daysSinceLastVisit + callStatuses + totalSpent_desc scopes cleanly without giant NOT IN lists or outer order_counts join', async () => {
  const { app, legacyQueries, crmQueries } = createCustomerListTestApp();
  await registerCustomerListRoutes(app);

  const res = await app.inject({
    method: 'GET',
    url: '/customers?bucket=NOT_COMBO_LIVE&assignedStaffId=unassigned&daysSinceLastVisitMin=121&daysSinceLastVisitMax=720&totalSpentMin=4000000&callStatuses=BOOKED,AGREED,BUSY,NO_ANSWER,CALLBACK,REJECTED,CONSIDERING,NOT_CALLED&sort=totalSpent_desc&page=1&limit=20',
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.pagination.total, 2);
  assert.deepEqual(
    body.data.map((c: { id: number; totalSpent: number }) => ({ id: c.id, totalSpent: c.totalSpent })),
    [
      { id: 103, totalSpent: 8_000_000 },
      { id: 102, totalSpent: 5_000_000 },
    ]
  );

  // Spend filter runs before NOT_COMBO_LIVE balance/elsa queries, so both receive only unassigned spenders (102,103,104).
  const usbQuery = legacyQueries.find((q) => /SELECT DISTINCT user_id\s+FROM user_service_balance/i.test(q.sql));
  assert.ok(usbQuery, 'Expected scoped user_service_balance query');
  assert.match(usbQuery.sql, /AND user_id IN \(102,103,104\)/);

  const elsaQuery = crmQueries.find((q) => /FROM crm_customer_elsa_reservations/i.test(q.sql));
  assert.ok(elsaQuery, 'Expected scoped crm_customer_elsa_reservations query');
  assert.match(elsaQuery.sql, /AND legacy_user_id IN \(102,103,104\)/);

  // Inner page-ID and count queries filter strictly by allowed IDs (102,103) without giant NOT IN lists or outer order_counts scans.
  const pageIdQuery = legacyQueries.find((q) => /^\s*SELECT u\.id\s+FROM user u/i.test(q.sql));
  const countQuery = legacyQueries.find((q) => /SELECT COUNT\(\*\) as total FROM/i.test(q.sql));
  assert.ok(pageIdQuery && countQuery);

  assert.match(pageIdQuery.sql, /u\.id IN \(102,103\)/);
  assert.doesNotMatch(pageIdQuery.sql, /u\.id NOT IN/);
  assert.doesNotMatch(countQuery.sql, /u\.id NOT IN/);
  assert.match(pageIdQuery.sql, /LEFT JOIN \([\s\S]*AND user_id IN \(102,103\)/);
  assert.doesNotMatch(countQuery.sql, /as order_counts/);

  const outerHydrateQuery = legacyQueries.find((q) =>
    /FROM user u\s+LEFT JOIN user_profile up ON u\.id = up\.user_id\s+WHERE u\.id IN/i.test(q.sql)
  );
  assert.ok(outerHydrateQuery, 'Expected lightweight PK-scoped outer hydrate query');
  assert.doesNotMatch(outerHydrateQuery.sql, /order_counts/);

  await app.close();
});

test('GET /customers with NOT_COMBO_LIVE and no positive ID filter uses indexed NOT EXISTS instead of enumerating live combo IDs', async () => {
  const { app, legacyQueries, crmQueries } = createCustomerListTestApp({
    assignedIds: [999],
    pageIds: [201],
    countTotal: 1,
  });
  await registerCustomerListRoutes(app);

  const res = await app.inject({
    method: 'GET',
    url: '/customers?bucket=NOT_COMBO_LIVE&daysSinceLastVisitMin=121&daysSinceLastVisitMax=720&page=1&limit=20',
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.pagination.total, 1);
  assert.equal(body.data.length, 1);

  assert.equal(
    legacyQueries.some((q) => /SELECT DISTINCT user_id\s+FROM user_service_balance/i.test(q.sql)),
    false
  );
  assert.equal(
    crmQueries.some((q) => /FROM crm_customer_elsa_reservations/i.test(q.sql)),
    false
  );

  const pageIdQuery = legacyQueries.find((q) => /^\s*SELECT u\.id\s+FROM user u/i.test(q.sql));
  assert.ok(pageIdQuery);
  assert.match(pageIdQuery.sql, /NOT EXISTS \(\s*SELECT 1 FROM user_service_balance usb_live/);
  assert.match(pageIdQuery.sql, /NOT EXISTS \(\s*SELECT 1 FROM mos_lab\.crm_customer_elsa_reservations elsa_res/);

  await app.close();
});
