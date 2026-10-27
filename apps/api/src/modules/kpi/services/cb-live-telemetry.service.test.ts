import assert from 'node:assert/strict';
import test from 'node:test';
import { CbLiveTelemetryService } from './cb-live-telemetry.service.js';
import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';

test('CbLiveTelemetryService correctly aggregates CB live telemetry pipeline metrics', async () => {
  const mockQueryRawUnsafe = async (query: string): Promise<SafeAny[]> => {
    if (query.includes('combo_sale_required')) {
      return [
        {
          green_visits_count: 500,
          green_combo_orders_count: 60,
        },
      ];
    }
    if (query.includes('repurchase_orders_count')) {
      return [
        {
          repurchase_orders_count: 75,
        },
      ];
    }
    if (query.includes('balance_deduction_visits_count')) {
      return [
        {
          balance_deduction_visits_count: 800,
          unique_pax_count: 650,
        },
      ];
    }
    if (query.includes('order_service_combo')) {
      return [
        {
          combo_sales_net: 450000000,
          combo_item_count: 100,
          combo_order_count: 90,
        },
      ];
    }
    if (query.includes('order_product')) {
      return [
        {
          product_sales_net: 15000000,
          product_item_count: 15,
          product_order_count: 12,
        },
      ];
    }
    return [];
  };

  const mockFastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: mockQueryRawUnsafe,
      },
    },
  } as unknown as FastifyInstance;

  const res = await CbLiveTelemetryService.getTelemetry(mockFastify, {
    month: '2026-11',
  });

  // 1. Revenue
  assert.equal(res.revenue.comboSalesNet, 450000000);
  assert.equal(res.revenue.productSalesNet, 15000000);
  assert.equal(res.revenue.totalSalesNet, 465000000);
  assert.equal(res.revenue.comboOrderCount, 90);
  assert.equal(res.revenue.comboAov, 5000000);

  // 2. Green Funnel
  assert.equal(res.greenFunnel.greenVisitsCount, 500);
  assert.equal(res.greenFunnel.greenVisitsTarget, 540);
  assert.equal(res.greenFunnel.greenComboOrdersCount, 60);
  assert.equal(res.greenFunnel.closingRatePercent, 12.0);
  assert.equal(res.greenFunnel.benchmarkRatePercent, 10.0);
  assert.equal(res.greenFunnel.status, 'EXCEEDING');
  assert.equal(res.greenFunnel.progressPercent, 92.6);

  // 3. Retention
  assert.equal(res.retention.balanceDeductionVisitsCount, 800);
  assert.equal(res.retention.targetVisits, 1000);
  assert.equal(res.retention.uniquePaxCount, 650);
  assert.equal(res.retention.repurchaseOrdersCount, 75);
  assert.equal(res.retention.progressPercent, 80.0);

  // Meta
  assert.equal(res.meta.month, '2026-11');
  assert.equal(res.meta.dateFrom, '2026-11-01');
  assert.equal(res.meta.dateTo, '2026-11-30');
});
