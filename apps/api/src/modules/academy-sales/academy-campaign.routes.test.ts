import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { academySalesRoutes } from './routes.js';

test('GET campaign list gives active Academy members manager scope, not roles alone', async (t) => {
  const app = Fastify();
  t.after(() => app.close());
  const academyMemberIds = new Set([191, 192, 193]);
  let campaignReads = 0;
  const rosterlessCampaign = {
    id: 91,
    name: 'Quản lý nội bộ Academy',
    slug: 'noi-bo-academy',
    description: null,
    startDate: null,
    endDate: null,
    status: 'ACTIVE',
    assignedStaffIds: null,
    audienceFilterJson: null,
    audienceSummary: null,
    createdByStaffId: 1,
    deletedAt: null,
    createdAt: new Date('2026-08-19T00:00:00.000Z'),
    updatedAt: new Date('2026-08-19T00:00:00.000Z'),
    createdBy: { id: 1, displayName: 'Manager', username: 'manager', email: null },
    touchpoints: [],
    _count: { leads: 0, touchpoints: 0 },
  };

  app.decorate('prisma', {
    crm: {
      crmStaff: {
        update: async () => ({}),
        findUnique: async () => ({ legacyStaffId: null, role: 'admin', isActive: true }),
      },
      crmTeamMember: {
        findFirst: async ({
          where,
        }: {
          where: {
            isActive?: boolean;
            OR?: { crmStaffId?: number }[];
            team?: { isActive?: boolean; department?: { code?: string; isActive?: boolean } };
          };
        }) =>
          where.isActive === true &&
          where.team?.isActive === true &&
          where.team.department?.code === 'ACADEMY' &&
          where.team.department.isActive === true &&
          where.OR?.some((member) => academyMemberIds.has(member.crmStaffId ?? 0))
            ? { id: 1 }
            : null,
      },
      crmAcademyCampaign: {
        findMany: async () => {
          campaignReads += 1;
          return [rosterlessCampaign];
        },
      },
    },
    legacy: {},
  } as unknown as FastifyInstance['prisma']);
  app.decorateRequest('user', null as unknown as JwtUserPayload);
  app.decorateRequest('jwtVerify', function (this: FastifyRequest) {
    const testRole = String(this.headers['x-test-role'] || 'telesales');
    const role = testRole === 'manager' || testRole === 'non-member-manager' ? 'manager' : 'telesales';
    const actorIds: Record<string, number> = {
      manager: 191,
      telesales: 192,
      marketing: 193,
      'non-member-manager': 194,
      'non-member-telesales': 195,
    };
    this.user = {
      id: actorIds[testRole] ?? 0,
      username: testRole,
      displayName: testRole,
      role,
      email: `${role}@example.test`,
    };
    return Promise.resolve();
  });
  await app.register(academySalesRoutes);

  for (const role of ['manager', 'marketing', 'telesales']) {
    const response = await app.inject({
      method: 'GET',
      url: '/academy-sales/campaigns',
      headers: { 'x-test-role': role },
    });
    assert.equal(response.statusCode, 200, `${role} Academy member can access campaigns`);
    assert.equal(response.json().total, 1, `${role} Academy member can manage a rosterless campaign`);
    assert.equal(response.json().data[0].id, rosterlessCampaign.id);
  }

  for (const role of ['non-member-manager', 'non-member-telesales']) {
    const response = await app.inject({
      method: 'GET',
      url: '/academy-sales/campaigns',
      headers: { 'x-test-role': role },
    });
    assert.equal(response.statusCode, 403, `${role} cannot gain access from role alone`);
    assert.match(response.json().message, /Department Academy/);
  }
  assert.equal(campaignReads, 3, 'denied actors must not query campaign data');
});

test('GET campaign sidebar only exposes pinned Academy links to admins or assigned staff', async () => {
  const app = Fastify();
  const pinnedCampaign = {
    id: 92,
    name: 'Khai giảng Academy',
    slug: 'khai-giang-academy',
    description: null,
    startDate: null,
    endDate: null,
    status: 'ACTIVE',
    showInSidebar: true,
    assignedStaffIds: JSON.stringify([192]),
    audienceFilterJson: null,
    audienceSummary: null,
    createdByStaffId: 1,
    deletedAt: null,
    createdAt: new Date('2026-08-19T00:00:00.000Z'),
    updatedAt: new Date('2026-08-19T00:00:00.000Z'),
    createdBy: { id: 1, displayName: 'Admin', username: 'admin', email: null },
    _count: { leads: 4, touchpoints: 5 },
  };

  app.decorate('prisma', {
    crm: {
      crmStaff: {
        update: async () => ({}),
        findUnique: async () => ({ legacyStaffId: null, role: 'admin', isActive: true }),
      },
      crmTeamMember: {
        findFirst: async ({ where }: { where: { crmStaffId?: number } }) =>
          where.crmStaffId === 192 ? { id: 1 } : null,
      },
      crmAcademyCampaign: { findMany: async () => [pinnedCampaign] },
    },
    legacy: {},
  } as unknown as FastifyInstance['prisma']);
  app.decorateRequest('user', null as unknown as JwtUserPayload);
  app.decorateRequest('jwtVerify', function (this: FastifyRequest) {
    const testUser = String(this.headers['x-test-user'] || 'outsider');
    const isAdmin = testUser === 'admin';
    this.user = {
      id: isAdmin ? 1 : testUser === 'assigned' ? 192 : 193,
      username: testUser,
      displayName: testUser,
      role: isAdmin ? 'admin' : 'telesales',
      email: `${testUser}@example.test`,
    };
    return Promise.resolve();
  });
  await app.register(academySalesRoutes);

  const admin = await app.inject({
    method: 'GET',
    url: '/academy-sales/campaigns/sidebar',
    headers: { 'x-test-user': 'admin' },
  });
  assert.equal(admin.statusCode, 200);
  assert.equal(admin.json().data.length, 1);

  const assigned = await app.inject({
    method: 'GET',
    url: '/academy-sales/campaigns/sidebar',
    headers: { 'x-test-user': 'assigned' },
  });
  assert.equal(assigned.statusCode, 200);
  assert.equal(assigned.json().data.length, 1);

  const outsider = await app.inject({
    method: 'GET',
    url: '/academy-sales/campaigns/sidebar',
    headers: { 'x-test-user': 'outsider' },
  });
  assert.equal(outsider.statusCode, 403);
  assert.match(outsider.json().message, /Department Academy/);

  await app.close();
});
