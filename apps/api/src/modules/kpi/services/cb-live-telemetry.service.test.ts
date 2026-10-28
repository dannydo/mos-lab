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

test('Dashboard $CB Live Telemetry Mutually Exclusive Attribution & Forecast (MOS-FEAT-156)', async () => {
  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => null,
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('source_group') && sql.includes('GROUP BY source_group')) {
            if (sql.includes('combo_net')) {
              return [
                { source_group: 'VONG_XANH', order_count: 47, item_count: 51, combo_net: 159776000 },
                { source_group: 'DUNG_GOI_NGOAI_VX', order_count: 55, item_count: 57, combo_net: 301123000 },
                { source_group: 'LE_KHAC', order_count: 3, item_count: 3, combo_net: 11950000 },
              ];
            }
            return [
              { source_group: 'VONG_XANH', done_visits_count: 478 },
              { source_group: 'DUNG_GOI_NGOAI_VX', done_visits_count: 794 },
              { source_group: 'LE_KHAC', done_visits_count: 50 },
            ];
          }
          if (sql.includes('total_package_usage_done')) {
            return [{ total_package_usage_done: 850, unique_pax_count: 720 }];
          }
          if (sql.includes('total_done_count')) {
            return [{ total_done_count: 1322, all_unique_pax_count: 720 }];
          }
          if (sql.includes('combo_sales_net')) {
            return [{ combo_sales_net: 472849000, combo_order_count: 105, combo_item_count: 111 }];
          }
          if (sql.includes('product_sales_net')) {
            return [{ product_sales_net: 7638889, product_order_count: 8, product_item_count: 8 }];
          }
          return [];
        },
      },
    },
  } as unknown as FastifyInstance;

  const result = await CbLiveTelemetryService.getTelemetry(mockFastify, { month: '2026-10' });

  // 1. Revenue
  assert.equal(result.revenue.comboSalesNet, 472849000);
  assert.equal(result.revenue.productSalesNet, 7638889);
  assert.equal(result.revenue.totalSalesNet, 480487889);
  assert.equal(result.revenue.comboOrderCount, 105);
  assert.equal(result.revenue.comboAov, 4503324);

  // 2. Attribution Reconciliation (100% matched)
  assert.equal(result.attribution.vongXanh.comboOrderCount, 47);
  assert.equal(result.attribution.vongXanh.comboSalesNet, 159776000);
  assert.equal(result.attribution.dungGoiNgoaiVx.comboOrderCount, 55);
  assert.equal(result.attribution.dungGoiNgoaiVx.comboSalesNet, 301123000);
  assert.equal(result.attribution.leKhac.comboOrderCount, 3);
  assert.equal(result.attribution.leKhac.comboSalesNet, 11950000);
  assert.equal(result.attribution.totalComboOrderCount, 105);
  assert.equal(result.attribution.totalComboSalesNet, 472849000);
  assert.equal(result.attribution.reconciliationStatus, 'MATCHED');

  // 3. Green Funnel
  assert.equal(result.greenFunnel.greenVisitsCount, 478);
  assert.equal(result.greenFunnel.greenComboOrdersCount, 47);
  assert.equal(result.greenFunnel.closingRatePercent, 9.8); // 47 / 478 = 9.8%

  // 4. Retention (Two distinct metrics per Guideline 2.2)
  assert.equal(result.retention.balanceDeductionVisitsCount, 850); // Total package usage done (target 1000)
  assert.equal(result.retention.packageUsageNonGreenVisitsCount, 794); // Non-green done (baseline 900)
  assert.equal(result.retention.repurchaseOrdersCount, 55); // Repeat package orders from non-green
  assert.equal(result.retention.repurchaseComboSalesNet, 301123000);

  // 5. Daily & Forecast
  assert.equal(result.daily.length, 31);
  assert.ok(result.forecast);
  assert.ok(result.meta.periodState);
});
