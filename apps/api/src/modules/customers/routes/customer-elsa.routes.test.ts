import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { registerCustomerElsaRoutes } from './customer-elsa.routes.js';
import { SafeAny } from '@mos-lab/shared';

const AUTH_HEADERS = {
  authorization: 'Bearer mock_token',
};

function createMockApp(mockCrmOverrides: SafeAny = {}) {
  const app = Fastify();

  app.decorateRequest('user', null as SafeAny);
  app.addHook('onRequest', async (req) => {
    (req as SafeAny).user = {
      id: 1,
      username: 'danny',
      role: 'admin',
      displayName: 'Danny Do',
    };
    (req as SafeAny).jwtVerify = async () => {};
  });

  const defaultMockCrm = {
    crmStaff: {
      findUnique: async () => ({ id: 1, role: 'admin', isActive: true }),
      findFirst: async () => ({ id: 1, role: 'admin', isActive: true }),
      findMany: async () => [],
      update: async () => ({}),
      ...(mockCrmOverrides.crmStaff || {}),
    },
    crmCustomerElsaReservation: {
      findFirst: async () => null,
      findMany: async () => [],
      updateMany: async () => ({ count: 0 }),
      create: async (args: SafeAny) => ({ id: 1, ...args.data }),
      update: async (args: SafeAny) => ({ id: args.where.id, ...args.data }),
      ...(mockCrmOverrides.crmCustomerElsaReservation || {}),
    },
  };

  const defaultMockLegacy = {
    $queryRawUnsafe: async () => [],
  };

  app.decorate('prisma', { crm: defaultMockCrm, legacy: defaultMockLegacy } as SafeAny);

  return app;
}

test('POST /customers/:id/elsa-reservation validates required fields', async () => {
  const app = createMockApp();
  await registerCustomerElsaRoutes(app);

  // Missing reason
  const res1 = await app.inject({
    method: 'POST',
    url: '/customers/21677/elsa-reservation',
    headers: AUTH_HEADERS,
    payload: {
      reminderDate: '2026-11-01',
    },
  });
  assert.equal(res1.statusCode, 400);

  // Missing reminderDate
  const res2 = await app.inject({
    method: 'POST',
    url: '/customers/21677/elsa-reservation',
    headers: AUTH_HEADERS,
    payload: {
      reason: 'Bảo lưu đi công tác',
    },
  });
  assert.equal(res2.statusCode, 400);
});

test('POST /customers/:id/elsa-reservation successfully creates active reservation and deactivates prior ones', async () => {
  let deactivatedCount = 0;
  let createdData: SafeAny = null;

  const app = createMockApp({
    crmCustomerElsaReservation: {
      updateMany: async () => {
        deactivatedCount += 1;
        return { count: 1 };
      },
      create: async (args: SafeAny) => {
        createdData = args.data;
        return {
          id: 10,
          legacyUserId: args.data.legacyUserId,
          status: 'ACTIVE',
          reservationType: args.data.reservationType,
          reason: args.data.reason,
          startDate: new Date(),
          endDate: args.data.endDate,
          reminderDate: args.data.reminderDate,
          reminderNote: args.data.reminderNote,
          isReminderDismissed: false,
          createdByStaffId: args.data.createdByStaffId,
          createdByStaffName: args.data.createdByStaffName,
          releasedAt: null,
          releasedByStaffId: null,
          releasedByStaffName: null,
          releaseNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
  });

  await registerCustomerElsaRoutes(app);

  const res = await app.inject({
    method: 'POST',
    url: '/customers/21677/elsa-reservation',
    headers: AUTH_HEADERS,
    payload: {
      reason: 'Bảo lưu diện PXL đặc biệt',
      reservationType: 'INDEFINITE',
      reminderDate: '2026-12-01',
      reminderNote: 'Gọi thăm hỏi cô Giáng Hương',
    },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(deactivatedCount, 1);
  assert.ok(createdData);
  assert.equal(createdData.legacyUserId, 21677);
  assert.equal(createdData.reservationType, 'INDEFINITE');
  assert.equal(createdData.reason, 'Bảo lưu diện PXL đặc biệt');

  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.data.legacyUserId, 21677);
  assert.equal(body.data.status, 'ACTIVE');
});

test('POST /customers/:id/elsa-reservation/release releases an active reservation', async () => {
  let updatedData: SafeAny = null;

  const app = createMockApp({
    crmCustomerElsaReservation: {
      findFirst: async (args: SafeAny) => {
        if (args.where.legacyUserId === 21677 && args.where.status === 'ACTIVE') {
          return {
            id: 10,
            legacyUserId: 21677,
            status: 'ACTIVE',
            reason: 'Bảo lưu PXL',
            startDate: new Date(),
            endDate: null,
            reminderDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return null;
      },
      updateMany: async (args: SafeAny) => {
        updatedData = args.data;
        return { count: 1 };
      },
    },
  });

  await registerCustomerElsaRoutes(app);

  const res = await app.inject({
    method: 'POST',
    url: '/customers/21677/elsa-reservation/release',
    headers: AUTH_HEADERS,
    payload: {
      releaseNote: 'Khách quay lại làm mi, rã đông combo',
    },
  });

  assert.equal(res.statusCode, 200);
  assert.ok(updatedData);
  assert.equal(updatedData.status, 'RELEASED');
  assert.equal(updatedData.releaseNote, 'Khách quay lại làm mi, rã đông combo');

  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
});

test('GET /customers/:id/elsa-reservation returns active reservation or null', async () => {
  const app = createMockApp({
    crmCustomerElsaReservation: {
      findFirst: async (args: SafeAny) => {
        if (args.where.legacyUserId === 21677) {
          return {
            id: 10,
            legacyUserId: 21677,
            status: 'ACTIVE',
            reason: 'Bảo lưu PXL',
            reservationType: 'INDEFINITE',
            startDate: new Date('2026-10-01'),
            endDate: null,
            reminderDate: new Date('2026-11-01'),
            isReminderDismissed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return null;
      },
    },
  });

  await registerCustomerElsaRoutes(app);

  const resFound = await app.inject({
    method: 'GET',
    url: '/customers/21677/elsa-reservation',
    headers: AUTH_HEADERS,
  });
  assert.equal(resFound.statusCode, 200);
  const bodyFound = JSON.parse(resFound.body);
  assert.equal(bodyFound.success, true);
  assert.equal(bodyFound.data.active.id, 10);

  const resNotFound = await app.inject({
    method: 'GET',
    url: '/customers/99999/elsa-reservation',
    headers: AUTH_HEADERS,
  });
  assert.equal(resNotFound.statusCode, 200);
  const bodyNotFound = JSON.parse(resNotFound.body);
  assert.equal(bodyNotFound.success, true);
  assert.equal(bodyNotFound.data.active, null);
});
