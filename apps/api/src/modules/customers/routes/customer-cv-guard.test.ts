import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { registerCustomerListRoutes } from './customer-list.routes.js';
import { registerCustomerStatsRoutes } from './customer-stats.routes.js';
import { SafeAny } from '@mos-lab/shared';

test('CV roles are forbidden from accessing customer list and customer stats endpoints', async () => {
  const cvRoles = ['cv', 'lt', 'technician', 'ktv'];

  for (const role of cvRoles) {
    const app = Fastify();

    app.decorateRequest('user', null as SafeAny);
    app.decorateRequest('jwtVerify', async function () {
      (this as SafeAny).user = { id: 20, username: 'test_cv', role, displayName: 'Test CV' };
    });

    const mockPrisma = {
      crm: {
        crmConfig: { findUnique: async () => null },
        crmStaff: {
          findUnique: async () => ({ id: 20, role, isActive: true }),
          findMany: async () => [],
          update: async () => ({}),
        },
      },
      legacy: {
        $queryRawUnsafe: async () => [],
      },
    };
    app.decorate('prisma', mockPrisma as SafeAny);
    app.decorate('cache', {
      get: () => null,
      set: () => {},
    } as SafeAny);

    await registerCustomerListRoutes(app);
    await registerCustomerStatsRoutes(app);

    // 1. Check GET /customers
    const listRes = await app.inject({
      method: 'GET',
      url: '/customers?bucket=COMBO_LIVE',
    });
    assert.equal(listRes.statusCode, 403, `Expected 403 for role ${role} on /customers`);
    const listJson = JSON.parse(listRes.body);
    assert.equal(listJson.error, 'Forbidden');
    assert.equal(listJson.message, 'Tài khoản Chuyên Viên không có quyền truy cập danh sách khách hàng CRM.');

    // 2. Check GET /customers/stats
    const statsRes = await app.inject({
      method: 'GET',
      url: '/customers/stats?bucket=COMBO_LIVE',
    });
    assert.equal(statsRes.statusCode, 403, `Expected 403 for role ${role} on /customers/stats`);
    const statsJson = JSON.parse(statsRes.body);
    assert.equal(statsJson.error, 'Forbidden');
    assert.equal(statsJson.message, 'Tài khoản Chuyên Viên không có quyền truy cập thống kê khách hàng CRM.');

    await app.close();
  }
});
