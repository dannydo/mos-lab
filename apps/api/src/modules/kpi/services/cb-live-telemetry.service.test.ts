import test from 'node:test';
import assert from 'node:assert/strict';
import { CbLiveTelemetryService } from './cb-live-telemetry.service.js';
import type { FastifyInstance } from 'fastify';

test('Dashboard $CB Live Telemetry Target Config Defaults (MOS-FEAT-156)', async () => {
  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => null,
          upsert: async () => ({}),
        },
      },
      legacy: {
        $queryRawUnsafe: async () => [],
      },
    },
  } as unknown as FastifyInstance;

  // Month 11 default targets
  const t11 = await CbLiveTelemetryService.getTargetConfig(mockFastify, '2026-11', 'DE_THAM_ESTELLA');
  assert.equal(t11.configured, true);
  assert.equal(t11.comboSalesTarget, 550_000_000);
  assert.equal(t11.productSalesTarget, 10_000_000);
  assert.equal(t11.totalSalesTarget, 560_000_000);
  assert.equal(t11.dailyPlanPace, 18_666_667); // 560M / 30 days
  assert.equal(t11.greenFunnelDoneTarget, 540);
  assert.equal(t11.packageUsageDoneTarget, 1000);

  // Month 10 unconfigured targets
  const t10 = await CbLiveTelemetryService.getTargetConfig(mockFastify, '2026-10', 'DE_THAM_ESTELLA');
  assert.equal(t10.configured, false);
  assert.equal(t10.comboSalesTarget, 0);
  assert.equal(t10.totalSalesTarget, 0);
  assert.equal(t10.daysInMonth, 31);
});

test('Dashboard $CB Live Telemetry Data Structure & Forecast calculation', async () => {
  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => null,
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('green_visits_count')) {
            return [{ green_visits_count: 270, green_combo_orders_count: 27 }];
          }
          if (sql.includes('combo_sales_net')) {
            return [{ combo_sales_net: 280000000, combo_order_count: 50, combo_item_count: 50 }];
          }
          if (sql.includes('product_sales_net')) {
            return [{ product_sales_net: 5000000, product_order_count: 10, product_item_count: 10 }];
          }
          if (sql.includes('balance_deduction_visits_count')) {
            return [{ balance_deduction_visits_count: 500, unique_pax_count: 400 }];
          }
          return [];
        },
      },
    },
  } as unknown as FastifyInstance;

  const result = await CbLiveTelemetryService.getTelemetry(mockFastify, { month: '2026-11' });

  assert.equal(result.revenue.comboSalesNet, 280000000);
  assert.equal(result.revenue.productSalesNet, 5000000);
  assert.equal(result.revenue.totalSalesNet, 285000000);
  assert.equal(result.greenFunnel.greenVisitsCount, 270);
  assert.equal(result.greenFunnel.closingRatePercent, 10.0);
  assert.equal(result.greenFunnel.status, 'ON_TRACK');
  assert.equal(result.retention.balanceDeductionVisitsCount, 500);
  assert.equal(result.retention.targetVisits, 1000);
  assert.equal(result.daily.length, 30);
  assert.ok(result.forecast);
});
