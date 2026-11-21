import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FinancialGoalsService, DEFAULT_FINANCIAL_GOALS_CONFIG } from './financial-goals.service.js';
import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';

describe('FinancialGoalsService', () => {
  it('returns default config when no DB entry exists', async () => {
    const mockFastify = {
      prisma: {
        crm: {
          crmConfig: {
            findUnique: async () => null,
          },
        },
      },
    } as unknown as FastifyInstance;

    const config = await FinancialGoalsService.getConfig(mockFastify, '2026-11');
    assert.equal(config.month, '2026-11');
    assert.equal(config.totalRevenueTarget, 850_000_000);
    assert.equal(config.comboRevenueTarget, 550_000_000);
    assert.equal(config.retailRevenueTarget, 250_000_000);
    assert.equal(config.productRevenueTarget, 50_000_000);
  });

  it('saves and normalizes valid config', async () => {
    let savedData: SafeAny = null;
    const mockFastify = {
      prisma: {
        crm: {
          crmConfig: {
            upsert: async ({ create }: SafeAny) => {
              savedData = create;
              return create;
            },
          },
        },
      },
      cache: {
        invalidatePattern: () => {},
      },
    } as unknown as FastifyInstance;

    const saved = await FinancialGoalsService.saveConfig(
      mockFastify,
      {
        month: '2026-11',
        totalRevenueTarget: 900_000_000,
        comboRevenueTarget: 600_000_000,
        retailRevenueTarget: 250_000_000,
        productRevenueTarget: 50_000_000,
        note: 'KPI test',
      },
      'Danny'
    );

    assert.equal(saved.totalRevenueTarget, 900_000_000);
    assert.equal(saved.updatedBy, 'Danny');
    assert.ok(savedData);
    const parsed = JSON.parse(savedData.value);
    assert.equal(parsed.comboRevenueTarget, 600_000_000);
  });

  it('computes overview correctly with mock orders', async () => {
    const mockOrders = [
      {
        orderId: 1,
        total_price: 1_000_000,
        checkin_time: new Date('2026-11-05T10:00:00+07:00'),
        checkin_date: '2026-11-05',
      },
      {
        orderId: 2,
        total_price: 500_000,
        checkin_time: new Date('2026-11-05T14:00:00+07:00'),
        checkin_date: '2026-11-05',
      },
    ];

    const mockFastify = {
      prisma: {
        crm: {
          crmConfig: {
            findUnique: async () => null,
          },
        },
        legacy: {
          $queryRawUnsafe: async (sql: string) => {
            if (sql.includes('order_service_combo')) {
              // Order 1 has 600k combo
              return [{ order_id: 1, total: 600_000 }];
            }
            if (sql.includes('order_product')) {
              // Order 2 has 100k product
              return [{ order_id: 2, total: 100_000 }];
            }
            return mockOrders;
          },
        },
      },
      cache: {
        invalidatePattern: () => {},
      },
    } as unknown as FastifyInstance;

    const overview = await FinancialGoalsService.getOverview(mockFastify, '2026-11', true);
    assert.equal(overview.month, '2026-11');
    assert.equal(overview.daysInMonth, 30);
    assert.equal(overview.includeVat, true);
    assert.equal(overview.kpiMain.actual, 1_500_000); // 1M + 500k
    assert.equal(overview.kpiSub.combo.actual, 600_000);
    assert.equal(overview.kpiSub.product.actual, 100_000);
    assert.equal(overview.kpiSub.retail.actual, 800_000); // 400k (Order 1) + 400k (Order 2)

    // Check daily breakdown
    const day5 = overview.dailyBreakdown.find((d) => d.date === '2026-11-05');
    assert.ok(day5);
    assert.equal(day5.totalRevenue, 1_500_000);
    assert.equal(day5.orderCount, 2);

    // Test with includeVat = false (Bỏ thuế VAT)
    const overviewWithoutVat = await FinancialGoalsService.getOverview(mockFastify, '2026-11', false);
    assert.equal(overviewWithoutVat.includeVat, false);
    // 1_000_000 / 1.08 = 925926, 500_000 / 1.08 = 462963 => 1_388_889
    assert.equal(overviewWithoutVat.kpiMain.actual, Math.round(1_000_000 / 1.08) + Math.round(500_000 / 1.08));
    assert.equal(overviewWithoutVat.kpiSub.combo.actual, Math.round(600_000 / 1.08));
    assert.equal(overviewWithoutVat.kpiSub.product.actual, Math.round(100_000 / 1.08));
  });

  it('uses OPS-002 actual_booking_date_start SQL cutoff and excludes future-day revenue/cumulative in IN_PROGRESS month', async () => {
    const fixedNow = new Date('2026-11-16T10:05:00Z'); // 17:05 ICT on 2026-11-16
    let capturedOrderSql = '';
    let capturedOrderParams: SafeAny[] = [];

    const mockFastify = {
      prisma: {
        crm: {
          crmConfig: {
            findUnique: async () => null,
          },
        },
        legacy: {
          $queryRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
            if (sql.includes('order_service_combo') || sql.includes('order_product')) {
              return [];
            }
            capturedOrderSql = sql;
            capturedOrderParams = params;
            return [
              // Order #338068 scenario: checked in early on 2026-11-16 (880,000đ -> 814,815đ ex-VAT)
              {
                orderId: 338068,
                total_price: 880_000,
                checkin_time: new Date('2026-11-16T04:34:38Z'),
                checkin_date: '2026-11-16',
              },
              // Anomalous future row that must still be dropped by defense-in-depth guard
              {
                orderId: 999999,
                total_price: 5_000_000,
                checkin_time: new Date('2026-11-18T11:00:00Z'),
                checkin_date: '2026-11-18',
              },
            ];
          },
        },
      },
    } as unknown as FastifyInstance;

    const overview = await FinancialGoalsService.getOverview(mockFastify, '2026-11', false, fixedNow);

    assert.equal(overview.todayDate, '2026-11-16');
    assert.equal(overview.periodStatus, 'IN_PROGRESS');
    assert.equal(overview.workDaysElapsed, 16);
    assert.equal(overview.workDaysRemaining, 14);

    // SQL must follow OPS-002 (actual_booking_date_start primary + booking_date_start fallback, never booking_date_end)
    assert.ok(capturedOrderSql.includes('ro.actual_booking_date_start'));
    assert.ok(capturedOrderSql.includes('o.booking_date_start'));
    assert.ok(!capturedOrderSql.includes('booking_date_end'));
    assert.deepEqual(capturedOrderParams, [
      '2026-11-01 00:00:00',
      '2026-11-16 23:59:59',
      '2026-11-01 00:00:00',
      '2026-11-16 23:59:59',
    ]);

    // Future order 999999 dropped; 338068 included on 2026-11-16
    assert.equal(overview.kpiMain.actual, Math.round(880_000 / 1.08));
    const day16 = overview.dailyBreakdown.find((d) => d.date === '2026-11-16');
    assert.ok(day16);
    assert.equal(day16.isFuture, false);
    assert.equal(day16.totalRevenue, 814_815);
    assert.equal(day16.cumulativeTotal, 814_815);
    assert.equal(day16.orderCount, 1);

    // Days 17..30 must be flagged isFuture=true with zero revenue, cumulativeTotal=0, orderCount=0
    const futureDays = overview.dailyBreakdown.filter((d) => d.date > '2026-11-16');
    assert.equal(futureDays.length, 14);
    for (const fd of futureDays) {
      assert.equal(fd.isFuture, true);
      assert.equal(fd.totalRevenue, 0);
      assert.equal(fd.comboRevenue, 0);
      assert.equal(fd.retailRevenue, 0);
      assert.equal(fd.productRevenue, 0);
      assert.equal(fd.cumulativeTotal, 0);
      assert.equal(fd.orderCount, 0);
    }
  });

  it('skips order queries and marks all days isFuture=true for NOT_STARTED future month', async () => {
    const fixedNow = new Date('2026-11-16T10:05:00Z');
    let legacyQueryCount = 0;

    const mockFastify = {
      prisma: {
        crm: {
          crmConfig: {
            findUnique: async () => null,
          },
        },
        legacy: {
          $queryRawUnsafe: async () => {
            legacyQueryCount += 1;
            return [];
          },
        },
      },
    } as unknown as FastifyInstance;

    const overview = await FinancialGoalsService.getOverview(mockFastify, '2026-12', true, fixedNow);

    assert.equal(legacyQueryCount, 0);
    assert.equal(overview.periodStatus, 'NOT_STARTED');
    assert.equal(overview.todayDate, '2026-11-16');
    assert.equal(overview.kpiMain.actual, 0);
    assert.equal(overview.dailyBreakdown.length, 31);
    assert.ok(overview.dailyBreakdown.every((d) => d.isFuture === true && d.cumulativeTotal === 0 && d.totalRevenue === 0));
  });

  it('queries full month and sets all days isFuture=false for COMPLETED past month', async () => {
    const fixedNow = new Date('2026-11-16T10:05:00Z');
    let capturedParams: SafeAny[] = [];

    const mockFastify = {
      prisma: {
        crm: {
          crmConfig: {
            findUnique: async () => null,
          },
        },
        legacy: {
          $queryRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
            if (!sql.includes('order_service_combo') && !sql.includes('order_product')) {
              capturedParams = params;
            }
            return [];
          },
        },
      },
    } as unknown as FastifyInstance;

    const overview = await FinancialGoalsService.getOverview(mockFastify, '2026-10', true, fixedNow);

    assert.equal(overview.periodStatus, 'COMPLETED');
    assert.deepEqual(capturedParams, [
      '2026-10-01 00:00:00',
      '2026-10-31 23:59:59',
      '2026-10-01 00:00:00',
      '2026-10-31 23:59:59',
    ]);
    assert.equal(overview.dailyBreakdown.length, 31);
    assert.ok(overview.dailyBreakdown.every((d) => d.isFuture === false));
  });
});
