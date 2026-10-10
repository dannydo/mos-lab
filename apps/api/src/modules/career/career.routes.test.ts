import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { careerRoutes } from './career.routes.js';
import { CareerProgressionService } from './career.service.js';
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
          careerProgression: null,
        }),
        update: async ({ data }: any) => ({ id: 1, role: data.role }),
      },
      crmCareerProgression: {
        findUnique: async () => null,
        upsert: async () => ({ id: 1, staffId: 1, status: 'TRIAL_GATE' }),
      },
    },
    legacy: {
      $queryRawUnsafe: async (sql: string) => {
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

test('PUT /career/config blocks non-admin and allows admin to update config', async () => {
  const app = createTestApp();
  await app.register(careerRoutes);

  // 1. Technician should be blocked with 403 Forbidden
  const blockedRes = await app.inject({
    method: 'PUT',
    url: '/career/config',
    headers: { 'x-test-role': 'technician' },
    payload: { cvToCc: { minOrders: 280 } },
  });
  assert.equal(blockedRes.statusCode, 403);

  // 2. Admin should succeed with 200 OK
  const allowedRes = await app.inject({
    method: 'PUT',
    url: '/career/config',
    headers: { 'x-test-role': 'admin' },
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

test('POST /career/staff/:id/trial rejects if QA/QC audit is not passed', async () => {
  const app = createTestApp();
  await app.register(careerRoutes);

  const res = await app.inject({
    method: 'POST',
    url: '/career/staff/10/trial',
    headers: { 'x-test-role': 'admin' },
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
    headers: { 'x-test-role': 'admin' },
    payload: { newRole: 'CV_PLUS' },
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.success, false);
  assert.match(body.message, /QA\/QC/);
});
