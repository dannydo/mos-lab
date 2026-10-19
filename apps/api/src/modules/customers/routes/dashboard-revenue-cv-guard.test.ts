import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { registerDashboardRoutes } from './dashboard.routes.js';
import { SafeAny } from '@mos-lab/shared';

test('CV roles are forbidden from accessing dashboard revenue endpoints', async () => {
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

    await registerDashboardRoutes(app);

    // 1. Check /dashboard/today/revenue-hourly
    const hourlyRes = await app.inject({
      method: 'GET',
      url: '/dashboard/today/revenue-hourly?dateFrom=2026-10-19&dateTo=2026-10-19',
    });
    assert.equal(hourlyRes.statusCode, 403, `Expected 403 for role ${role} on revenue-hourly`);
    const hourlyJson = JSON.parse(hourlyRes.body);
    assert.equal(hourlyJson.error, 'Forbidden');
    assert.equal(hourlyJson.message, 'Tài khoản Chuyên Viên không có quyền truy cập dữ liệu doanh thu tổng quan.');

    // 2. Check /dashboard/today/revenue-detail
    const detailRes = await app.inject({
      method: 'GET',
      url: '/dashboard/today/revenue-detail?dateFrom=2026-10-19&dateTo=2026-10-19',
    });
    assert.equal(detailRes.statusCode, 403, `Expected 403 for role ${role} on revenue-detail`);
    const detailJson = JSON.parse(detailRes.body);
    assert.equal(detailJson.error, 'Forbidden');
    assert.equal(detailJson.message, 'Tài khoản Chuyên Viên không có quyền truy cập dữ liệu doanh thu tổng quan.');

    await app.close();
  }
});
