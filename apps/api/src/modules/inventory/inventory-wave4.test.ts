import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeInventoryForecastQuantity,
  computeStockCheckingMaxCount,
  computeStockNeedQuantity,
  evaluateLegacyInventoryPermissions,
  getEndOfMonthRemindDays,
  INVENTORY_JOB_KEYS,
  resolveMenuKeysForApiPath,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './services/inventory-auth.service.js';
import { closeInventoryPool } from './services/inventory-db.js';
import { executeInventoryJob, getInventoryJobsStatus } from './services/inventory-jobs-runner.service.js';

test('UI-010 Zero-Trust: all Wave 4 /api/inventory/jobs & trigger routes resolve to __ADMIN_ONLY_DEFAULT__', () => {
  const paths = [
    '/api/inventory/jobs',
    '/api/inventory/jobs/report-warehouse/run',
    '/api/inventory/warehouse/orders/auto',
    '/api/inventory/warehouse/items/state-regenerate',
  ];
  for (const p of paths) {
    assert.deepEqual(resolveMenuKeysForApiPath(p), ['__ADMIN_ONLY_DEFAULT__'], `Expected admin-only default for ${p}`);
  }
});

test('Pure legacy formulas match PHP calculations verbatim', () => {
  assert.equal(computeInventoryForecastQuantity(8, 10), 0); // usedRatio 0.8 < 0.9
  assert.ok(Math.abs(computeInventoryForecastQuantity(10, 1) - 10.925) < 1e-6); // end < 2 => +15%
  assert.ok(Math.abs(computeInventoryForecastQuantity(20, 10) - 11.55) < 1e-6); // end >= 2 => +5%

  assert.equal(computeStockCheckingMaxCount(30, 0), 10);
  assert.equal(computeStockCheckingMaxCount(30, 5), 10); // 5/10 = 0.5 < 0.7 => avg
  assert.equal(computeStockCheckingMaxCount(30, 12), 17); // ceil((10 + 24)/2) = 17
  assert.equal(computeStockCheckingMaxCount(0, 8), 8); // avg=0 fallback safely to lastMonthYear

  assert.equal(
    computeStockNeedQuantity({
      minCount: 2,
      maxCount: 20,
      lastMaxCount: 18,
      limitCountStandard: 10,
      currentStock: 10,
      isMainWarehouse: true,
    }),
    11
  );
  assert.equal(
    computeStockNeedQuantity({
      minCount: 0,
      maxCount: 20,
      lastMaxCount: 15,
      limitCountStandard: 10,
      currentStock: 11,
      isMainWarehouse: false,
    }),
    0
  );
  assert.deepEqual(getEndOfMonthRemindDays(30), [20, 25, 28, 29]);
  assert.deepEqual(getEndOfMonthRemindDays(31), [20, 25, 29, 30]);
});

test('Isolated DB dry-run execution across all 7 inventory cron jobs on management_inventory_win', async (t) => {
  if (!process.env.INVENTORY_DATABASE_URL) {
    t.skip('INVENTORY_DATABASE_URL not set in unit test process');
    return;
  }

  const adminCtx: InventoryAuthContext = {
    auth: { id: 1, legacyStaffId: 86, role: 'super_admin', displayName: 'Admin' },
    crmStaffId: 1,
    actorLegacyUserId: 86,
    effectiveUserId: 86,
    effectiveGroupId: 7,
    clientId: 11,
    clientBusinessId: 1,
    clientStoreId: 6,
    allowedStoreIds: [6],
    isClientConsultant: false,
    previewRole: 'admin',
    previewStoreId: null,
    permissions: evaluateLegacyInventoryPermissions(7, null),
  };

  const ccCtx: InventoryAuthContext = {
    ...adminCtx,
    effectiveGroupId: 5,
    effectiveUserId: null,
    isClientConsultant: true,
    previewRole: 'client-consultant',
    permissions: evaluateLegacyInventoryPermissions(5, null),
  };

  assert.equal(hasInventoryPermission(adminCtx, 'edit-order-global'), true);
  assert.equal(hasInventoryPermission(ccCtx, 'edit-order-global'), false);

  try {
    for (const jobKey of INVENTORY_JOB_KEYS) {
      const res = await executeInventoryJob(
        adminCtx,
        jobKey,
        {
          date: '2026-11-30',
          warehouseId: 3,
          dryRun: true,
          forceRun: jobKey === 'process-end-of-month',
        },
        'manual'
      );
      assert.equal(res.jobKey, jobKey);
      assert.equal(res.dryRun, true);
      assert.equal(res.status, 'completed');
      assert.ok(res.durationMs < 10_000, `Expected ${jobKey} dry-run < 10s, got ${res.durationMs}ms`);
    }

    const skippedEom = await executeInventoryJob(
      adminCtx,
      'process-end-of-month',
      { date: '2026-11-30', warehouseId: 3, dryRun: true, forceRun: false, simulateDay: 10 },
      'manual'
    );
    assert.equal(skippedEom.status, 'skipped');

    const chained = await executeInventoryJob(
      adminCtx,
      'report-warehouse-item-state',
      { date: '2026-11-30', warehouseId: 3, dryRun: true, chainDownstream: true },
      'manual'
    );
    assert.equal(chained.chainedResults?.length, 2);
    assert.equal(chained.chainedResults?.[0]?.jobKey, 'report-warehouse-item');
    assert.equal(chained.chainedResults?.[1]?.jobKey, 'report-warehouse');

    const status = getInventoryJobsStatus();
    assert.equal(status.jobs.length, 7);
    assert.ok(status.history.length >= 7);
  } finally {
    await closeInventoryPool();
  }
});
