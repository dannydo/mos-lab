import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { telesaleCompetencyRoutes } from './telesale-competency.routes.js';
import { DEFAULT_TELESALE_COMPETENCY_CONFIG } from '@mos-lab/shared';

function createTestApp() {
  const app = Fastify();
  app.decorate('prisma', {
    crm: {
      crmConfig: {
        findUnique: async () => null,
        upsert: async ({ create }: any) => ({ key: create.key, value: create.value }),
      },
      crmStaff: {
        findMany: async () => [
          { id: 101, legacyStaffId: 50670, displayName: 'Phượng', avatarUrl: null, isActive: true, role: 'telesales' },
          { id: 102, legacyStaffId: 52648, displayName: 'Kiều', avatarUrl: null, isActive: true, role: 'telesales' },
        ],
        findUnique: async ({ where }: any) => ({
          id: where.id,
          legacyStaffId: 50670,
          displayName: 'Phượng',
          avatarUrl: null,
          isActive: true,
          role: 'super_admin',
        }),
        update: async () => ({ id: 1 }),
      },
    },
    legacy: {
      $queryRawUnsafe: async () => [],
    },
  } as any);

  app.decorateRequest('jwtVerify', async function () {
    const role = (this.headers['x-test-role'] as string) || 'admin';
    const staffId = Number(this.headers['x-test-staff-id'] || 1);
    (this as any).user = {
      id: staffId,
      staffId,
      username: 'test_user',
      name: 'Danny Do',
      role,
    };
  });

  app.register(telesaleCompetencyRoutes, { prefix: '/api' });
  return app;
}

test('GET /api/telesale-competency/config returns default config when unconfigured', async () => {
  const app = createTestApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/telesale-competency/config',
    headers: { authorization: 'Bearer test' },
  });

  assert.equal(res.statusCode, 200);
  const json = res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.tiers.FRESHER.passingScore, 70);
  assert.equal(json.data.tiers.JUNIOR.passingScore, 75);
});

test('GET /api/telesale-competency/matrix returns staff matrix list', async () => {
  const app = createTestApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/telesale-competency/matrix?month=2026-10',
    headers: { authorization: 'Bearer test' },
  });

  assert.equal(res.statusCode, 200);
  const json = res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.data));
});

test('GET /api/telesale-competency/evaluation returns staff evaluation details', async () => {
  const app = createTestApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/telesale-competency/evaluation?staffId=101&month=2026-10',
    headers: { authorization: 'Bearer test' },
  });

  assert.equal(res.statusCode, 200);
  const json = res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.staffId, 101);
  assert.ok(json.data.pillarA);
  assert.ok(json.data.pillarB);
  assert.ok(json.data.pillarC);
  assert.ok(json.data.pillarD);
  assert.ok(json.data.totalScore >= 0);
});

test('POST /api/telesale-competency/evaluation saves manager evaluation', async () => {
  const app = createTestApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/telesale-competency/evaluation',
    headers: { authorization: 'Bearer test' },
    payload: {
      staffId: 101,
      month: '2026-10',
      pillarB: {
        skills: {
          KN01: { score: 5, notes: 'Giao tiếp tốt' },
          KN02: { score: 4 },
        },
      },
      pillarC: {
        managerQualityScore: 19,
        notes: 'Chất lượng cuộc gọi tốt',
      },
      pillarD: {
        managerAttitudeScore: 15,
        mandatoryEvidenceUrl: 'https://wings.com/evidence1.png',
        evidenceNotes: 'Tuân thủ nội quy',
      },
    },
  });

  assert.equal(res.statusCode, 200);
  const json = res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.staffId, 101);
});

test('POST /api/telesale-competency/action promotes staff', async () => {
  const app = createTestApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/telesale-competency/action',
    headers: { authorization: 'Bearer test', 'x-test-role': 'super_admin' },
    payload: {
      staffId: 101,
      action: 'PROMOTED',
      toTier: 'MID_LEVEL',
      reason: 'Đạt thành tích vượt trội 3 tháng liên tiếp',
    },
  });

  assert.equal(res.statusCode, 200);
  const json = res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.newTier, 'MID_LEVEL');
});
