import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { payrollLedgerRoutes } from './routes.js';

function createPayrollLedgerRouteApp(role: JwtUserPayload['role'] | null) {
  const app = Fastify();
  const subjectResult = {
    mode: 'SHADOW_READ_ONLY' as const,
    sourcePeriodKey: '2026-08',
    calculationVersion: 'payroll-ledger.v1',
    subjectKey: 'opaque:subject:01',
    lineCount: 1,
    grossAmount: 2_925,
    capAmount: null,
    receivedAmount: 2_925,
    holdAmount: 0,
  };
  app.decorate('prisma', {
    crm: {
      crmStaff: { update: async () => ({}) },
      crmConfig: { findUnique: async () => null },
      crmPayrollPeriod: {
        findUnique: async () => ({
          id: 1,
          periodKey: '2026-08',
          label: 'Tháng 8 đã khóa',
          startDate: new Date('2026-08-01T00:00:00.000Z'),
          endDate: new Date('2026-08-31T00:00:00.000Z'),
          timezone: 'Asia/Ho_Chi_Minh',
          status: 'LOCKED',
          calculationVersion: 'payroll-ledger.v1',
          lockedAt: new Date('2026-09-01T05:00:00.000Z'),
        }),
      },
      crmPayrollSettlement: {
        findFirst: async () => ({
          id: 2,
          version: 1,
          status: 'LOCKED',
          calculatorVersion: 'payroll-ledger.v1',
          sourceCutoffAt: new Date('2026-09-01T05:00:00.000Z'),
          inputHash: 'settlement-input-hash',
          updatedAt: new Date('2026-09-01T05:00:00.000Z'),
        }),
      },
      crmPayrollSettlementSubject: {
        findMany: async () => [
          {
            subjectKey: subjectResult.subjectKey,
            inputJson: JSON.stringify({ policy: 'payroll-ledger.v1' }),
            resultJson: JSON.stringify(subjectResult),
          },
        ],
      },
    },
    legacy: {},
  } as unknown as FastifyInstance['prisma']);
  app.decorateRequest('user', null as unknown as JwtUserPayload);
  app.decorateRequest('jwtVerify', function (this: FastifyRequest) {
    if (!role) return Promise.reject(new Error('missing token'));
    this.user = { id: 1, username: 'payroll-admin', displayName: 'Payroll Admin', role };
    return Promise.resolve();
  });
  return app;
}

test('locked settlement export is restricted to Super Admin and remains read-only', async () => {
  const deniedApp = createPayrollLedgerRouteApp('admin');
  await deniedApp.register(payrollLedgerRoutes);
  assert.equal(
    (await deniedApp.inject({ method: 'GET', url: '/payroll-ledger/settlements/2026-08/locked-export' })).statusCode,
    403
  );
  await deniedApp.close();

  const sourceApp = createPayrollLedgerRouteApp('super_admin');
  await sourceApp.register(payrollLedgerRoutes);
  const response = await sourceApp.inject({ method: 'GET', url: '/payroll-ledger/settlements/2026-08/locked-export' });
  assert.equal(response.statusCode, 200);
  const exportPayload = response.json();
  assert.equal(exportPayload.period.status, 'LOCKED');
  assert.equal(exportPayload.settlement.status, 'LOCKED');
  assert.equal(exportPayload.subjects.length, 1);
  assert.equal(typeof exportPayload.exportHash, 'string');
  await sourceApp.close();
});

test('native CC evidence write boundary is restricted to Super Admin', async () => {
  const app = createPayrollLedgerRouteApp('admin');
  await app.register(payrollLedgerRoutes);
  const response = await app.inject({
    method: 'POST',
    url: '/payroll-ledger/cc-evidence',
    payload: {
      evidenceKey: 'mos:evidence:service:9001:cc-1',
      payrollPeriodId: 1,
      subjectKey: 'staff:cc:1',
      sourceReference: 'mos:completed-service:9001',
      sourceOccurredAt: '2026-09-10T09:00:00.000Z',
      payload: { kind: 'COMPLETED_SERVICE', previousPoints: 0, shareCount: 1 },
    },
  });
  assert.equal(response.statusCode, 403);
  await app.close();
});

test('native CC pilot dashboard is restricted to Super Admin', async () => {
  const app = createPayrollLedgerRouteApp('admin');
  await app.register(payrollLedgerRoutes);
  const response = await app.inject({ method: 'GET', url: '/payroll-ledger/cc-pilot-dashboard' });
  assert.equal(response.statusCode, 403);
  await app.close();
});

test('opening the native CC pilot month is restricted to Super Admin', async () => {
  const app = createPayrollLedgerRouteApp('admin');
  await app.register(payrollLedgerRoutes);
  const response = await app.inject({ method: 'POST', url: '/payroll-ledger/cc-pilot-periods/open-current-month' });
  assert.equal(response.statusCode, 403);
  await app.close();
});

test('native CC evidence remains closed until the production pilot cohort is configured', async () => {
  const app = createPayrollLedgerRouteApp('super_admin');
  await app.register(payrollLedgerRoutes);
  const response = await app.inject({
    method: 'POST',
    url: '/payroll-ledger/cc-evidence',
    payload: {
      evidenceKey: 'mos:evidence:service:9001:pilot',
      payrollPeriodId: 1,
      subjectKey: 'staff:legacy:37790',
      sourceReference: 'mos:completed-service:9001',
      sourceOccurredAt: '2026-09-10T09:00:00.000Z',
      payload: { kind: 'COMPLETED_SERVICE', previousPoints: 0, shareCount: 1 },
    },
  });
  assert.equal(response.statusCode, 409);
  assert.match(response.json().message, /pilot is not configured/);
  await app.close();
});
