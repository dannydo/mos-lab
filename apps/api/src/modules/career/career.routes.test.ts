import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { careerRoutes } from './career.routes.js';
import { DEFAULT_CAREER_PROGRESSION_CONFIG } from '@mos-lab/shared';

function createTestApp() {
  const app = Fastify();
  app.decorate('prisma', {
    crm: {
      crmConfig: {
        findUnique: async () => null,
        upsert: async ({ create }: any) => ({ key: 'CAREER_PROGRESSION_RULES', value: create.value }),
      },
      crmStaff: {
        findUnique: async ({ where }: any) => ({
          id: where.id,
          username: `staff_${where.id}`,
          displayName: `Thảo My ${where.id}`,
          role: 'technician',
          legacyStaffId: where.id,
          careerProgression: null,
        }),
        findMany: async () => [
          {
            id: 10,
            username: 'staff_dt',
            displayName: 'Phương Nhi',
            role: 'lt',
            legacyStaffId: 49076,
            isActive: true,
            careerProgression: null,
          },
          {
            id: 20,
            username: 'staff_ep',
            displayName: 'HânEmBé',
            role: 'lt',
            legacyStaffId: 47510,
            isActive: true,
            careerProgression: null,
          },
        ],
        update: async ({ data }: any) => ({ id: 1, role: data.role }),
      },
      crmCareerProgression: {
        findUnique: async () => null,
        upsert: async () => ({ id: 1, staffId: 1, status: 'TRIAL_GATE' }),
      },
    },
    legacy: {
      $queryRawUnsafe: async (sql: string) => {
        if (sql.includes('full_set_count') && sql.includes('GROUP BY os.assigned_staff_id')) {
          return [
            {
              assigned_staff_id: 49076,
              full_set_count: 69,
              combo_retain_count: 10,
              single_retain_count: 5,
              service_revenue: 32799726,
            },
            {
              assigned_staff_id: 47510,
              full_set_count: 87,
              combo_retain_count: 29,
              single_retain_count: 7,
              service_revenue: 47916599,
            },
          ];
        }
        if (sql.includes('full_set_count')) {
          return [
            {
              full_set_count: 87,
              combo_retain_count: 29,
              single_retain_count: 7,
              service_revenue: 47916599,
            },
          ];
        }
        if (sql.includes('shift_hours') && sql.includes('GROUP BY sws.user_id')) {
          return [
            { user_id: 49076, shift_hours: 205 },
            { user_id: 47510, shift_hours: 207 },
          ];
        }
        if (sql.includes('shift_hours')) {
          return [{ shift_hours: 207 }];
        }
        if (sql.includes('store_order_count') && sql.includes('GROUP BY os.assigned_staff_id')) {
          return [
            { assigned_staff_id: 49076, client_store_id: 6, store_order_count: 180 },
            { assigned_staff_id: 47510, client_store_id: 16, store_order_count: 260 },
          ];
        }
        if (sql.includes('COUNT(os.id)') || sql.includes('COUNT(DISTINCT os.order_id)') || sql.includes('total_orders'))
          return [{ total_orders: 340 }];
        if (sql.includes('fix_count')) return [{ fix_count: 4 }];
        if (sql.includes('shop_total_tip')) return [{ shop_total_tip: 10000000, shop_orders: 1000 }];
        if (sql.includes('staff_tip')) return [{ staff_tip: 15000000, total_tip: 15000000 }];
        if (sql.includes('banana_count') || sql.includes('Credit')) return [{ banana_count: 5 }];
        return [];
      },
    },
  } as any);

  app.decorateRequest('jwtVerify', async function () {
    const role = (this.headers['x-test-role'] as string) || 'admin';
    const staffId = Number(this.headers['x-test-staff-id'] || 1);
    (this as any).user = {
      id: staffId,
      staffId,
      username: 'test_user',
      displayName: 'Test User',
      role,
    };
  });

  return app;
}

test('GET /career/config returns default dynamic config successfully', async () => {
  const app = createTestApp();
  await app.register(careerRoutes);

  const res = await app.inject({
    method: 'GET',
    url: '/career/config',
    headers: { 'x-test-role': 'technician' },
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.data.version, DEFAULT_CAREER_PROGRESSION_CONFIG.version);
  assert.equal(body.data.cvToCc.minOrders, DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCc.minOrders);
});

test('PUT /career/config blocks non-super-admin and allows super_admin to update config', async () => {
  const app = createTestApp();
  await app.register(careerRoutes);

  // 1. Technician should be blocked with 403 Forbidden
  const technicianRes = await app.inject({
    method: 'PUT',
    url: '/career/config',
    headers: { 'x-test-role': 'technician' },
    payload: { cvToCc: { minOrders: 280 } },
  });
  assert.equal(technicianRes.statusCode, 403);

  // 2. Ordinary Admin should also be blocked with 403 Forbidden (Only Super Admin / Danny can edit)
  const adminRes = await app.inject({
    method: 'PUT',
    url: '/career/config',
    headers: { 'x-test-role': 'admin' },
    payload: { cvToCc: { minOrders: 280 } },
  });
  assert.equal(adminRes.statusCode, 403);

  // 3. Super Admin should succeed with 200 OK
  const allowedRes = await app.inject({
    method: 'PUT',
    url: '/career/config',
    headers: { 'x-test-role': 'super_admin' },
    payload: {
      cvToCc: {
        ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCc,
        minOrders: 280,
      },
    },
  });
  assert.equal(allowedRes.statusCode, 200);
  const body = JSON.parse(allowedRes.body);
  assert.equal(body.success, true);
  assert.equal(body.data.cvToCc.minOrders, 280);
});

test('GET /career/my-progression calculates technician metrics against dynamic config', async () => {
  const app = createTestApp();
  await app.register(careerRoutes);

  const res = await app.inject({
    method: 'GET',
    url: '/career/my-progression',
    headers: { 'x-test-role': 'technician', 'x-test-staff-id': '10' },
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.data.staffId, 10);
  assert.equal(body.data.currentRole, 'CV');
  assert.equal(body.data.targetRole, 'CV_PLUS');
  assert.equal(body.data.metrics.ordersCount, 340);
  assert.ok(body.data.metrics.qaAudit);
  assert.equal(body.data.metrics.qaAudit.isPassed, false);
  assert.equal(body.data.metrics.qaAudit.weeklyAuditRate, 0);
  assert.equal(body.data.metrics.qaAudit.totalAudits, 0);
  assert.equal(body.data.qualifiedQuests.qaAuditCompleted, false);
  assert.equal(body.data.qualifiedQuests.foundationCompleted, false);
});

test('POST /career/staff/:id/promote rejects non-Super Admin with 403', async () => {
  const app = createTestApp();
  await app.register(careerRoutes);

  const res = await app.inject({
    method: 'POST',
    url: '/career/staff/10/promote',
    headers: { 'x-test-role': 'admin' },
    payload: { newRole: 'CV_PLUS' },
  });

  assert.equal(res.statusCode, 403);
});

test('POST /career/staff/:id/trial rejects if QA/QC audit is not passed', async () => {
  const app = createTestApp();
  await app.register(careerRoutes);

  const res = await app.inject({
    method: 'POST',
    url: '/career/staff/10/trial',
    headers: { 'x-test-role': 'super_admin' },
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
  assert.match(body.message, /QA\/QC/);
});

test('POST /career/staff/:id/promote requires QA/QC audit to be passed', async () => {
  const app = createTestApp();
  await app.register(careerRoutes);

  const res = await app.inject({
    method: 'POST',
    url: '/career/staff/10/promote',
    headers: { 'x-test-role': 'super_admin' },
    payload: { newRole: 'CV_PLUS' },
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
  assert.match(body.message, /QA\/QC/);
});

test('GET /career/staff/:id allows CV to view another staff career status without 403', async () => {
  const app = createTestApp();
  await app.register(careerRoutes);

  // Authenticated as technician staff #1, viewing staff #99
  const res = await app.inject({
    method: 'GET',
    url: '/career/staff/99',
    headers: { 'x-test-role': 'technician', 'x-test-staff-id': '1' },
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.data.staffId, 99);
  assert.equal(body.data.metrics.servicesPerHour, 0.59);
  assert.equal(body.data.metrics.productivity?.totalCompletedServices, 123);
  assert.equal(body.data.metrics.productivity?.actualWorkingHours, 207);
});

test('GET /career/staff-list supports branch filter (ALL, DE_THAM, ESTELLA) and returns SPH & Revenue/Hour', async () => {
  const app = createTestApp();
  await app.register(careerRoutes);

  const allRes = await app.inject({
    method: 'GET',
    url: '/career/staff-list?branch=ALL',
    headers: { 'x-test-role': 'admin' },
  });
  assert.equal(allRes.statusCode, 200);
  const allBody = JSON.parse(allRes.body);
  assert.equal(allBody.data.length, 2);
  const han = allBody.data.find((s: any) => s.id === 20);
  assert.equal(han.storeId, 16);
  assert.equal(han.branchCode, 'EP');
  assert.equal(han.servicesPerHour, 0.59);
  assert.equal(han.revenuePerHour, Math.round(47916599 / 207));
  assert.equal(han.fullSetCount, 87);
  assert.equal(han.comboRetainCount, 29);
  assert.equal(han.singleRetainCount, 7);

  const dtRes = await app.inject({
    method: 'GET',
    url: '/career/staff-list?branch=DE_THAM',
    headers: { 'x-test-role': 'admin' },
  });
  assert.equal(dtRes.statusCode, 200);
  const dtBody = JSON.parse(dtRes.body);
  assert.equal(dtBody.data.length, 1);
  assert.equal(dtBody.data[0].id, 10);
  assert.equal(dtBody.data[0].branchCode, 'DT');

  const epRes = await app.inject({
    method: 'GET',
    url: '/career/staff-list?branch=ESTELLA',
    headers: { 'x-test-role': 'admin' },
  });
  assert.equal(epRes.statusCode, 200);
  const epBody = JSON.parse(epRes.body);
  assert.equal(epBody.data.length, 1);
  assert.equal(epBody.data[0].id, 20);
  assert.equal(epBody.data[0].branchCode, 'EP');
});
