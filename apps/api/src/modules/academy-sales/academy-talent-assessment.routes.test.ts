import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { academySalesRoutes } from './routes.js';

function createTalentRouteApp(lead: Record<string, unknown> | null, role: JwtUserPayload['role'] = 'telesales') {
  const app = Fastify();
  let ladderConfig: { value: string; updatedAt: Date } | null = null;
  let nextPolicyAuditId = 1;
  const crm = {
    crmConfig: {
      findUnique: async () => ladderConfig,
      upsert: async ({ update }: { update: { value: string } }) => {
        ladderConfig = { value: update.value, updatedAt: new Date('2026-08-22T04:00:00.000Z') };
        return ladderConfig;
      },
    },
    crmStaff: {
      update: async () => ({}),
      findUnique: async () => ({ legacyStaffId: null }),
    },
    crmTeamMember: {
      findMany: async () => [],
      findFirst: async () => ({ id: 1 }),
    },
    crmAcademyLead: { findFirst: async () => lead },
    crmAcademyCourse: {
      findMany: async () => [
        {
          id: 1,
          code: 'combo',
          name: 'Combo Academy',
          nameEn: null,
          listPriceVnd: 20_000_000,
          promoPriceVnd: 20_000_000,
          kitName: null,
          lessonCount: 24,
          lashModelCount: 12,
          sortOrder: 1,
          isActive: true,
        },
      ],
    },
    crmAcademyInstructor: {
      findMany: async () => [
        {
          id: 1,
          code: 'auto',
          staffId: null,
          displayName: 'Tự động phân bổ giảng viên',
          description: 'Phân bổ ngẫu nhiên',
          avatarUrl: null,
          surchargePercent: 0,
          isActive: true,
          sortOrder: 0,
        },
      ],
    },
    crmAcademyTalentPolicyAudit: {
      findFirst: async () => null,
      create: async () => ({ id: nextPolicyAuditId++ }),
    },
  };
  Object.assign(crm, {
    $transaction: async (callback: (transaction: typeof crm) => unknown) => callback(crm),
  });
  app.decorate('prisma', {
    crm,
    legacy: {},
  } as unknown as FastifyInstance['prisma']);
  app.decorateRequest('user', null as unknown as JwtUserPayload);
  app.decorateRequest('jwtVerify', function (this: FastifyRequest) {
    this.user = {
      id: 82,
      username: 'telesales',
      displayName: 'Telesales',
      role,
      email: 'telesales@example.test',
    };
    return Promise.resolve();
  });
  return app;
}

test('Tố Chất routes reject malformed IDs before any persistence work', async () => {
  const app = createTalentRouteApp(null);
  await app.register(academySalesRoutes);
  const result = await app.inject({ method: 'GET', url: '/academy-sales/leads/nope/talent-assessments' });
  assert.equal(result.statusCode, 400);
  assert.match(result.json().message, /Lead ID không hợp lệ/);
  await app.close();
});

test('Tố Chất instructor configuration is limited to Admin and Manager', async () => {
  const telesalesApp = createTalentRouteApp(null);
  await telesalesApp.register(academySalesRoutes);
  const denied = await telesalesApp.inject({ method: 'GET', url: '/academy-sales/talent-instructors/manage' });
  assert.equal(denied.statusCode, 403);
  await telesalesApp.close();

  const managerApp = createTalentRouteApp(null, 'manager');
  await managerApp.register(academySalesRoutes);
  const granted = await managerApp.inject({ method: 'GET', url: '/academy-sales/talent-instructors/manage' });
  assert.equal(granted.statusCode, 200);
  assert.equal(granted.json().data[0].code, 'auto');
  await managerApp.close();
});

test('only Admin can persist global ladder bubbles and the configured reward drives new previews', async () => {
  const managerApp = createTalentRouteApp({ id: 41, ownerStaffId: 82 }, 'manager');
  await managerApp.register(academySalesRoutes);
  const managerDenied = await managerApp.inject({
    method: 'PUT',
    url: '/academy-sales/talent-ladder',
    payload: { tiers: [] },
  });
  assert.equal(managerDenied.statusCode, 403);
  await managerApp.close();

  const app = createTalentRouteApp({ id: 41, ownerStaffId: 82 }, 'admin');
  await app.register(academySalesRoutes);
  const defaults = await app.inject({ method: 'GET', url: '/academy-sales/talent-ladder' });
  assert.equal(defaults.statusCode, 200);
  assert.equal(defaults.json().data.tiers[0].bubbleHeightPercent, 20);

  const tiers = defaults.json().data.tiers.map((tier: Record<string, unknown>) => ({
    key: tier.key,
    title: tier.key === 'level4' ? 'Điểm sáng' : tier.title,
    strands: tier.strands,
    scholarshipPercent: tier.key === 'level4' ? 14 : tier.scholarshipPercent,
    sampleRewardPercent: tier.key === 'level4' ? 12 : tier.sampleRewardPercent,
    kitRewardPercent: tier.key === 'level4' ? 8 : tier.kitRewardPercent,
    bubbleHeightPercent: tier.key === 'level1' ? 56 : tier.bubbleHeightPercent,
  }));
  const saved = await app.inject({ method: 'PUT', url: '/academy-sales/talent-ladder', payload: { tiers } });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().data.tiers[0].bubbleHeightPercent, 56);

  const preview = await app.inject({
    method: 'POST',
    url: '/academy-sales/leads/41/talent-assessments/preview',
    payload: { strands5Min: 12, selectedCourseIds: [1] },
  });
  assert.equal(preview.statusCode, 200);
  assert.equal(preview.json().data.result.scholarshipPercent, 14);
  assert.match(preview.json().data.result.rankLabel, /Điểm sáng/);
  assert.equal(preview.json().data.sampleRewardPercent, 12);
  assert.equal(preview.json().data.kitRewardPercent, 8);
  await app.close();
});

test('Tố Chất routes enforce the existing Academy owner scope before listing sessions', async () => {
  const app = createTalentRouteApp(null);
  await app.register(academySalesRoutes);
  const result = await app.inject({ method: 'GET', url: '/academy-sales/leads/41/talent-assessments' });
  assert.equal(result.statusCode, 404);
  assert.match(result.json().message, /không có quyền truy cập/);
  await app.close();
});

test('Tố Chất routes validate 0–4 eye and hand scores before opening a session', async () => {
  const app = createTalentRouteApp({ id: 41, ownerStaffId: 82 });
  await app.register(academySalesRoutes);
  const result = await app.inject({
    method: 'POST',
    url: '/academy-sales/leads/41/talent-assessments',
    payload: { eyeScore: 5 },
  });
  assert.equal(result.statusCode, 400);
  assert.match(result.json().message, /Điểm kiểm tra mắt/);
  await app.close();
});

test('Tố Chất preview calculates a 12-strand clean draft on the server before it is saved', async () => {
  const app = createTalentRouteApp({ id: 41, ownerStaffId: 82 });
  await app.register(academySalesRoutes);
  const result = await app.inject({
    method: 'POST',
    url: '/academy-sales/leads/41/talent-assessments/preview',
    payload: {
      eyeScore: 0,
      handScore: 0,
      strands5Min: 12,
      errorRoot: 0,
      errorSkin: 0,
      errorStickies: 0,
      errorDirection: 0,
      selectedCourseIds: [1],
    },
  });
  assert.equal(result.statusCode, 200);
  const quote = result.json().data;
  assert.equal(quote.result.qualified, true);
  assert.equal(quote.result.tier.key, 'level4');
  assert.equal(quote.result.scholarshipPercent, 10);
  assert.equal(quote.effectiveScholarshipPercent, 10);
  assert.equal(quote.courses[0].finalPriceVnd, 18_000_000);
  await app.close();
});

test('Tố Chất preview keeps the server-side unqualified cutoff for excessive errors', async () => {
  const app = createTalentRouteApp({ id: 41, ownerStaffId: 82 });
  await app.register(academySalesRoutes);
  const result = await app.inject({
    method: 'POST',
    url: '/academy-sales/leads/41/talent-assessments/preview',
    payload: {
      strands5Min: 12,
      errorRoot: 3,
      errorSkin: 3,
    },
  });
  assert.equal(result.statusCode, 200);
  const quote = result.json().data;
  assert.equal(quote.result.qualified, false);
  assert.equal(quote.result.scholarshipPercent, 0);
  assert.equal(quote.effectiveScholarshipPercent, 0);
  await app.close();
});
