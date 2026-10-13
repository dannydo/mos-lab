import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { registerCustomerMetaRoutes } from './customer-meta.routes.js';
import { SafeAny } from '@mos-lab/shared';

test('GET /customers/services returns active services including LASH LIFT with 990.000 VND', async () => {
  const app = Fastify();

  // Mock authentication decorator
  app.decorateRequest('user', null as SafeAny);
  app.addHook('onRequest', async (req) => {
    (req as SafeAny).user = { id: 2, username: 'test_manager', role: 'manager', displayName: 'Test Manager' };
    (req as SafeAny).jwtVerify = async () => {};
  });

  const mockLegacy = {
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes('FROM service s')) {
        return [
          {
            id: 201,
            name: 'Ivylight 3L 770',
            price: 770000,
            duration: 54,
          },
          {
            id: 237,
            name: 'LASH LIFT (Uốn mi)',
            price: 990000,
            duration: 60,
          },
        ];
      }
      return [];
    },
  };

  const mockCrm = {
    crmConfig: {
      findUnique: async () => null,
      upsert: async () => ({}),
      update: async () => ({}),
    },
    crmStaff: {
      findUnique: async () => ({ role: 'manager', isActive: true }),
      findMany: async () => [],
      update: async () => ({}),
    },
  };

  app.decorate('prisma', { legacy: mockLegacy, crm: mockCrm } as SafeAny);

  await registerCustomerMetaRoutes(app);

  const res = await app.inject({
    method: 'GET',
    url: '/customers/services',
    headers: {
      authorization: 'Bearer mock_token',
    },
  });

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(Array.isArray(data));
  assert.equal(data[0].id, 0); // Any Lashes / Any Services fallback

  const lift = data.find((s: SafeAny) => s.name === 'LASH LIFT (Uốn mi)');
  assert.ok(lift, 'LASH LIFT should be in returned services');
  assert.equal(lift.price, 990000);
  assert.equal(lift.duration, 60);
});

test('GET /customers/services falls back gracefully to find lash-lift if missing from default query', async () => {
  const app = Fastify();

  app.decorateRequest('user', null as SafeAny);
  app.addHook('onRequest', async (req) => {
    (req as SafeAny).user = { id: 2, username: 'test_manager', role: 'manager', displayName: 'Test Manager' };
    (req as SafeAny).jwtVerify = async () => {};
  });

  const mockLegacy = {
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes("WHERE s.service_key = 'lash-lift'")) {
        return [
          {
            id: 999,
            name: 'LASH LIFT (Uốn mi)',
            price: 990000,
            duration: 60,
          },
        ];
      }
      if (sql.includes('FROM service s')) {
        return [
          {
            id: 201,
            name: 'Ivylight 3L 770',
            price: 770000,
            duration: 54,
          },
        ];
      }
      return [];
    },
  };

  const mockCrm = {
    crmConfig: {
      findUnique: async () => null,
    },
    crmStaff: {
      findUnique: async () => ({ role: 'manager', isActive: true }),
      findMany: async () => [],
      update: async () => ({}),
    },
  };

  app.decorate('prisma', { legacy: mockLegacy, crm: mockCrm } as SafeAny);

  await registerCustomerMetaRoutes(app);

  const res = await app.inject({
    method: 'GET',
    url: '/customers/services',
    headers: {
      authorization: 'Bearer mock_token',
    },
  });

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  const lift = data.find((s: SafeAny) => s.name === 'LASH LIFT (Uốn mi)');
  assert.ok(lift, 'LASH LIFT should be found via fallback query');
  assert.equal(lift.price, 990000);
});
