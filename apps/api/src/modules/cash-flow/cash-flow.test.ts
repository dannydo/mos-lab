import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { cashFlowRoutes } from './routes.js';
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
      role: 'super_admin',
      displayName: 'Danny Do',
    };
    (req as SafeAny).jwtVerify = async () => {};
  });

  const defaultMockCrm = {
    crmStaff: {
      findUnique: async () => ({ id: 1, role: 'admin', isActive: true, displayName: 'Danny Do' }),
      update: async () => ({}),
    },
    crmCashAccount: {
      findMany: async () => [
        {
          id: 1,
          code: 'CASH_MAIN',
          name: 'Quỹ tiền mặt',
          accountType: 'CASH',
          initialBalance: 50000000,
          currentBalance: 50000000,
          minSafetyThreshold: 20000000,
          isActive: true,
          storeId: null,
          accountNumber: null,
          bankName: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      findUnique: async () => null,
      update: async (args: SafeAny) => ({
        id: args.where.id,
        code: 'CASH_MAIN',
        name: 'Quỹ tiền mặt',
        accountType: 'CASH',
        initialBalance: args.data.initialBalance ?? 50000000,
        currentBalance: args.data.currentBalance ?? 50000000,
        minSafetyThreshold: args.data.minSafetyThreshold ?? 20000000,
        isActive: true,
        storeId: null,
        accountNumber: null,
        bankName: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      ...(mockCrmOverrides.crmCashAccount || {}),
    },
    crmCashFlowEntry: {
      findMany: async () => [
        {
          id: 1,
          flowType: 'OUTFLOW',
          category: 'RENT',
          title: 'Tiền thuê nhà Đề Thám',
          description: null,
          amount: 40000000,
          hasVat: true,
          vatRate: 10,
          vatAmount: 4000000,
          totalAmount: 44000000,
          priority: 'CRITICAL',
          status: 'APPROVED',
          expectedDate: new Date(),
          dueDate: null,
          actualDate: null,
          accountId: 1,
          storeId: null,
          paymentMethod: 'BANK_TRANSFER',
          isRecurring: true,
          recurringInterval: 'MONTHLY',
          recurringEndDate: null,
          sourceRef: null,
          createdByStaffId: 1,
          createdByName: 'Danny Do',
          approvedByStaffId: 1,
          approvedByName: 'Danny Do',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      count: async () => 1,
      create: async (args: SafeAny) => ({
        id: 2,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: async (args: SafeAny) => ({
        id: args.where.id,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findUnique: async () => ({
        id: 1,
        flowType: 'OUTFLOW',
        category: 'RENT',
        title: 'Tiền thuê nhà',
        amount: 40000000,
        hasVat: true,
        vatRate: 10,
        vatAmount: 4000000,
        totalAmount: 44000000,
        priority: 'CRITICAL',
        status: 'PENDING',
        expectedDate: new Date(),
        actualDate: null,
      }),
      ...(mockCrmOverrides.crmCashFlowEntry || {}),
    },
    crmCashFlowAudit: {
      create: async () => ({ id: 1 }),
    },
  };

  const defaultMockLegacy = {
    order: {
      findMany: async () => [],
    },
  };

  app.decorate('prisma', { crm: defaultMockCrm, legacy: defaultMockLegacy } as SafeAny);

  return app;
}

test('GET /api/cash-flow/forecast returns calculated summary and timeline', async () => {
  const app = createMockApp();
  await app.register(cashFlowRoutes, { prefix: '/api' });

  const res = await app.inject({
    method: 'GET',
    url: '/api/cash-flow/forecast',
    headers: AUTH_HEADERS,
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.success, true);
  assert.ok(body.data.summary);
  assert.ok(Array.isArray(body.data.timeline));
  assert.equal(body.data.summary.openingBalance, 50000000);
  assert.equal(body.data.summary.totalVatOutflow, 4000000);
  assert.equal(body.data.summary.criticalOutflowPending, 44000000);
});

test('POST /api/cash-flow/entries accurately computes VAT and priority', async () => {
  const app = createMockApp();
  await app.register(cashFlowRoutes, { prefix: '/api' });

  // Test with VAT 8%
  const res = await app.inject({
    method: 'POST',
    url: '/api/cash-flow/entries',
    headers: AUTH_HEADERS,
    payload: {
      flowType: 'OUTFLOW',
      category: 'SUPPLIER_MATERIAL',
      title: 'Nhập keo mi Nhật',
      amount: 10000000,
      hasVat: true,
      vatRate: 8,
      priority: 'HIGH',
      expectedDate: '2026-10-25',
    },
  });

  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.amount, 10000000);
  assert.equal(body.data.hasVat, true);
  assert.equal(body.data.vatRate, 8);
  assert.equal(body.data.vatAmount, 800000);
  assert.equal(body.data.totalAmount, 10800000);
  assert.equal(body.data.priority, 'HIGH');
});

test('POST /api/cash-flow/entries with hasVat=false sets vatAmount to 0', async () => {
  const app = createMockApp();
  await app.register(cashFlowRoutes, { prefix: '/api' });

  const res = await app.inject({
    method: 'POST',
    url: '/api/cash-flow/entries',
    headers: AUTH_HEADERS,
    payload: {
      flowType: 'OUTFLOW',
      category: 'SALARY',
      title: 'Lương nhân sự',
      amount: 50000000,
      hasVat: false,
      priority: 'CRITICAL',
      expectedDate: '2026-10-25',
    },
  });

  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.vatAmount, 0);
  assert.equal(body.data.totalAmount, 50000000);
  assert.equal(body.data.priority, 'CRITICAL');
});
