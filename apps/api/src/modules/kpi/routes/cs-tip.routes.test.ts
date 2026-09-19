import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { registerCsTipRoutes } from './cs-tip.routes.js';

test('registerCsTipRoutes registers GET /kpi/cs-tip route correctly', async () => {
  let registeredPath = '';
  let registeredMethod = '';

  const mockFastify = {
    get: (path: string, _opts: unknown, _handler: unknown) => {
      registeredPath = path;
      registeredMethod = 'GET';
    },
  } as unknown as FastifyInstance;

  await registerCsTipRoutes(mockFastify);

  assert.equal(registeredPath, '/kpi/cs-tip');
  assert.equal(registeredMethod, 'GET');
});

test('CS Tip 3% bonus calculation and response formatting', async () => {
  let routeHandler: (request: SafeAny, reply: SafeAny) => Promise<SafeAny> = async () => {};

  const mockFastify = {
    get: (_path: string, _opts: SafeAny, handler: SafeAny) => {
      routeHandler = handler;
    },
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('GROUP BY cs.client_store_key')) {
            // Store breakdown query
            return [
              {
                storeKey: 'DT',
                storeName: 'Đề Thám',
                totalVisits: 60,
                totalTippedVisits: 25,
                totalCustomerTip: 6000000,
                locaVisits: 40,
                locaCustomerTip: 4500000,
                singleVisits: 20,
                singleCustomerTip: 1500000,
              },
            ];
          }
          if (sql.includes('locaCustomerTip')) {
            // Summary query
            return [
              {
                totalVisits: 100,
                totalTippedVisits: 40,
                totalCustomerTip: 10000000, // 10,000,000 VND
                locaVisits: 60,
                locaTippedVisits: 25,
                locaCustomerTip: 7000000, // 7,000,000 VND
                singleVisits: 40,
                singleTippedVisits: 15,
                singleCustomerTip: 3000000, // 3,000,000 VND
              },
            ];
          }
          if (sql.includes('SELECT COUNT(DISTINCT fo.orderId) AS totalCount')) {
            // Count query
            return [{ totalCount: 1 }];
          }
          // Records query
          return [
            {
              orderId: 99999,
              checkinTime: new Date('2026-09-19T10:00:00Z'),
              customerName: 'Nguyễn Thị A',
              customerPhone: '0901234567',
              storeName: 'Đề Thám',
              storeKey: 'DT',
              isLoCa: 1,
              totalCustomerTip: 100000,
              technicianName: 'Thợ A',
              ccName: 'Tư vấn B',
            },
          ];
        },
      },
    },
    log: {
      error: () => {},
    },
  } as unknown as FastifyInstance;

  await registerCsTipRoutes(mockFastify);

  const mockRequest = {
    query: {
      dateFrom: '2026-09-01',
      dateTo: '2026-09-19',
      storeId: 'ALL',
      customerType: 'ALL',
      tipFilter: 'ALL',
      page: 1,
      limit: 20,
    },
  };

  let sentPayload: SafeAny = null;
  const mockReply = {
    send: (payload: SafeAny) => {
      sentPayload = payload;
      return payload;
    },
  };

  await routeHandler(mockRequest, mockReply);

  assert.ok(sentPayload);
  assert.equal(sentPayload.summary.csBonusRatePercent, 3);

  // Total metrics
  assert.equal(sentPayload.summary.total.totalCustomerTip, 10000000);
  assert.equal(sentPayload.summary.total.csTipBonus, 300000); // 3% of 10,000,000 = 300,000
  assert.equal(sentPayload.summary.total.totalVisits, 100);
  assert.equal(sentPayload.summary.total.tippedVisits, 40);
  assert.equal(sentPayload.summary.total.tipRatePercent, 40);
  assert.equal(sentPayload.summary.total.avgTipPerVisit, 100000);
  assert.equal(sentPayload.summary.total.avgTipPerTippedVisit, 250000);

  // LoCa metrics
  assert.equal(sentPayload.summary.loca.totalCustomerTip, 7000000);
  assert.equal(sentPayload.summary.loca.csTipBonus, 210000); // 3% of 7,000,000 = 210,000
  assert.equal(sentPayload.summary.loca.sharePercent, 70); // 70% of total tip

  // Single metrics
  assert.equal(sentPayload.summary.single.totalCustomerTip, 3000000);
  assert.equal(sentPayload.summary.single.csTipBonus, 90000); // 3% of 3,000,000 = 90,000
  assert.equal(sentPayload.summary.single.sharePercent, 30); // 30% of total tip

  // Store breakdown
  assert.equal(sentPayload.storeBreakdown.length, 1);
  assert.equal(sentPayload.storeBreakdown[0].storeKey, 'DT');
  assert.equal(sentPayload.storeBreakdown[0].totalCustomerTip, 6000000);
  assert.equal(sentPayload.storeBreakdown[0].totalCsTipBonus, 180000); // 3% of 6,000,000 = 180,000

  // Records
  assert.equal(sentPayload.records.length, 1);
  assert.equal(sentPayload.records[0].orderId, 99999);
  assert.equal(sentPayload.records[0].isLoCa, true);
  assert.equal(sentPayload.records[0].customerType, 'LoCa');
  assert.equal(sentPayload.records[0].totalCustomerTip, 100000);
  assert.equal(sentPayload.records[0].csTipBonus, 3000); // 3% of 100,000 = 3,000
});
