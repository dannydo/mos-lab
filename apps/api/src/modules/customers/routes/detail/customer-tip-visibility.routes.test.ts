import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import type { SafeAny } from '@mos-lab/shared';
import { registerCustomerDetailedRoute } from './customer-detailed.routes.js';
import { registerCustomerSummaryRoute } from './customer-summary.routes.js';

function createCustomerDetailMockApp(actor: { id: number; role: string }) {
  const app = Fastify();

  app.decorateRequest('user', null as SafeAny);
  app.addHook('onRequest', async (req) => {
    (req as SafeAny).user = {
      id: actor.id,
      username: `${actor.role}_user`,
      role: actor.role,
      displayName: `${actor.role.toUpperCase()} User`,
    };
    (req as SafeAny).jwtVerify = async () => {};
  });

  const mockCrm = {
    crmStaff: {
      findUnique: async () => ({ id: actor.id, role: actor.role, isActive: true, legacyStaffId: 0 }),
      findMany: async () => [],
    },
    crmTeamMember: {
      findFirst: async () => null,
      findMany: async () => [],
    },
    crmConfig: {
      findUnique: async () => null,
    },
    crmCustomerAssignment: {
      findFirst: async () =>
        actor.role === 'telesales' ? { id: 1, legacyUserId: 33732, staffId: actor.id, staff: { displayName: 'Booker A' } } : null,
    },
    crmCustomerElsaReservation: {
      findFirst: async () => null,
    },
    crmCampaignCustomer: {
      findUnique: async () => null,
      findMany: async () => [],
    },
    crmCallLog: {
      count: async () => 0,
      findMany: async () => [],
    },
    crmAllocationLedgerEvent: {
      count: async () => 0,
    },
    crmBookingLog: {
      groupBy: async () => [],
    },
  };

  const mockLegacy = {
    user_contact: {
      findMany: async () => [{ id: 1, phone_number: '0933936746', is_disabled: 0 }],
    },
    order_service: {
      findMany: async () => [{ order_id: 8001, assigned_staff_id: 14001, check_in_staff_id: null, check_out_staff_id: 38 }],
    },
    user_note: {
      findMany: async () => [],
    },
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes('SELECT id FROM `user` WHERE id = ?')) return [{ id: 33732 }];
      if (sql.includes('FROM user u') && sql.includes('AS bucket') || sql.includes('as bucket')) {
        return [
          {
            id: 33732,
            name: 'Thanh',
            avatar: null,
            isDeleted: 0,
            is_foreign: 0,
            is_foreign_overridden: 0,
            phone: '0933936746',
            email: null,
            gender: 'Female',
            dob: null,
            lastVisit: new Date('2026-10-07T07:00:00.000Z'),
            daysSinceLastVisit: 40,
            bucket: 'SINGLE',
            normalCount: 0,
            retainCount: 0,
            expiryDate: null,
          },
        ];
      }
      if (sql.includes('FROM `order` o') && sql.includes("o.order_state = 'Completed'")) {
        return [
          {
            id: 8001,
            orderKey: 'ORD-8001',
            bookingDate: new Date('2026-10-07T07:00:00.000Z'),
            totalPrice: 770000,
            technicianId: 14001,
            createdStaffId: 6,
          },
        ];
      }
      if (sql.includes('FROM `order_payment`')) {
        if (sql.includes('SUM(tip_amount)')) {
          return [{ totalTips: 100000, tipCount: 1 }];
        }
        return [
          {
            orderId: 8001,
            tipAmount: 100000,
            paidCredit: 0,
            paidCash: 0,
            paidCard: 770000,
            paidBank: 0,
            debt: 0,
          },
        ];
      }
      if (sql.includes('SELECT user_id as userId, full_name as fullName')) {
        return [
          { userId: 14001, fullName: 'Minh Anh', isDisabled: 0, isLeaved: 0, avatar: null },
          { userId: 38, fullName: 'Quang Khải', isDisabled: 0, isLeaved: 0, avatar: null },
        ];
      }
      if (sql.includes('SELECT COUNT(*) as cnt')) return [{ cnt: 1 }];
      return [];
    },
  };

  app.decorate('prisma', { crm: mockCrm, legacy: mockLegacy } as SafeAny);
  return app;
}

test('MOS-FEAT-267: FM, CHO, Admin, and SuperAdmin receive customer tip history & FM can open summary without BK_CS', async () => {
  for (const role of ['fm', 'cho', 'admin', 'super_admin']) {
    const app = createCustomerDetailMockApp({ id: 77, role });
    await registerCustomerSummaryRoute(app);
    await registerCustomerDetailedRoute(app);

    const summaryRes = await app.inject({
      method: 'GET',
      url: '/customers/33732/summary',
      headers: { authorization: 'Bearer mock' },
    });
    assert.equal(summaryRes.statusCode, 200, `${role} should read /customers/:id/summary`);
    const summaryBody = summaryRes.json();
    assert.equal(summaryBody.permissions?.canViewTipHistory, true);
    assert.equal(summaryBody.stats.totalTips, 100000);
    assert.equal(summaryBody.stats.tipRate, 100);
    assert.equal(summaryBody.stats.avgTip, 100000);

    const detailedRes = await app.inject({
      method: 'GET',
      url: '/customers/33732/detailed',
      headers: { authorization: 'Bearer mock' },
    });
    assert.equal(detailedRes.statusCode, 200, `${role} should read /customers/:id/detailed`);
    const detailedBody = detailedRes.json();
    assert.equal(detailedBody.permissions?.canViewTipHistory, true);
    assert.equal(detailedBody.stats.totalTips, 100000);
    assert.equal(detailedBody.tipTransactions.length, 1);
    assert.equal(detailedBody.tipTransactions[0].tipAmount, 100000);
    assert.equal(detailedBody.revenueTransactions[0].tipAmount, 100000);
  }
});

test('MOS-FEAT-267: Telesales, Manager, and Control have customer tip history completely redacted on summary and detailed APIs', async () => {
  for (const role of ['telesales', 'manager', 'control']) {
    const app = createCustomerDetailMockApp({ id: 88, role });
    await registerCustomerSummaryRoute(app);
    await registerCustomerDetailedRoute(app);

    const summaryRes = await app.inject({
      method: 'GET',
      url: '/customers/33732/summary',
      headers: { authorization: 'Bearer mock' },
    });
    assert.equal(summaryRes.statusCode, 200, `${role} summary status`);
    const summaryBody = summaryRes.json();
    assert.equal(summaryBody.permissions?.canViewTipHistory, false);
    assert.equal(summaryBody.stats.totalTips, 0);
    assert.equal(summaryBody.stats.tipRate, 0);
    assert.equal(summaryBody.stats.avgTip, 0);

    const detailedRes = await app.inject({
      method: 'GET',
      url: '/customers/33732/detailed',
      headers: { authorization: 'Bearer mock' },
    });
    assert.equal(detailedRes.statusCode, 200, `${role} detailed status`);
    const detailedBody = detailedRes.json();
    assert.equal(detailedBody.permissions?.canViewTipHistory, false);
    assert.equal(detailedBody.stats.totalTips, 0);
    assert.equal(detailedBody.stats.tipRate, 0);
    assert.equal(detailedBody.stats.avgTip, 0);
    assert.deepEqual(detailedBody.tipTransactions, []);
    assert.equal(detailedBody.revenueTransactions.length, 1);
    assert.equal(detailedBody.revenueTransactions[0].tipAmount, 0);
  }
});
