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

    const overview = await FinancialGoalsService.getOverview(mockFastify, '2026-11');
    assert.equal(overview.month, '2026-11');
    assert.equal(overview.daysInMonth, 30);
    assert.equal(overview.kpiMain.actual, 1_500_000); // 1M + 500k
    assert.equal(overview.kpiSub.combo.actual, 600_000);
    assert.equal(overview.kpiSub.product.actual, 100_000);
    assert.equal(overview.kpiSub.retail.actual, 800_000); // 400k (Order 1) + 400k (Order 2)

    // Check daily breakdown
    const day5 = overview.dailyBreakdown.find((d) => d.date === '2026-11-05');
    assert.ok(day5);
    assert.equal(day5.totalRevenue, 1_500_000);
    assert.equal(day5.orderCount, 2);
  });
});
