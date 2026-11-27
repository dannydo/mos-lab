import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateLegacyInventoryPermissions,
  isInventoryLifecycleEndValid,
  resolveMenuKeysForApiPath,
} from '@mos-lab/shared';
import { listWarehouseChecks, listWarehouseItemLimits, listScanLogs } from './services/inventory-admin-ops.service.js';
import { generateItemCodeFromName, listCatalogBrands, listCatalogItems } from './services/inventory-catalog.service.js';
import { closeInventoryPool } from './services/inventory-db.js';
import { getWarehouseItemLifecycle, getWarehouseItemsDrilldown } from './services/inventory-lifecycle.service.js';
import type { InventoryAuthContext } from './services/inventory-auth.service.js';

test('UI-010 Zero-Trust: all Wave 2 /api/inventory/* routes resolve to __ADMIN_ONLY_DEFAULT__', () => {
  const paths = [
    '/api/inventory/warehouse/items/lifecycle',
    '/api/inventory/warehouse/items',
    '/api/inventory/warehouse/limits',
    '/api/inventory/warehouse/checks',
    '/api/inventory/warehouse/check/6062/complete',
    '/api/inventory/warehouse/check/6062/cancel',
    '/api/inventory/scan-logs',
    '/api/inventory/catalog/items',
    '/api/inventory/catalog/brands',
    '/api/inventory/catalog/warehouses',
    '/api/inventory/stores',
  ];
  for (const p of paths) {
    assert.deepEqual(resolveMenuKeysForApiPath(p), ['__ADMIN_ONLY_DEFAULT__'], `Expected admin-only default for ${p}`);
  }
});

test('isInventoryLifecycleEndValid detects balanced vs discrepant inventory counts', () => {
  assert.equal(
    isInventoryLifecycleEndValid({
      total_quantity_start: 10,
      total_quantity_input: 5,
      total_quantity_used: 3,
      total_quantity_lost: 1,
      total_quantity_broken: 1,
      total_quantity_output: 2,
      total_quantity_end: 8,
    }),
    true
  );

  assert.equal(
    isInventoryLifecycleEndValid({
      total_quantity_start: 10,
      total_quantity_input: 5,
      total_quantity_used: 3,
      total_quantity_lost: 1,
      total_quantity_broken: 1,
      total_quantity_output: 2,
      total_quantity_end: 7,
    }),
    false
  );
});

test('generateItemCodeFromName extracts uppercase acronym cleanly', () => {
  assert.equal(generateItemCodeFromName('Glue Wings SH'), 'GWS');
  assert.equal(generateItemCodeFromName('Cotton Bud'), 'CB');
  assert.equal(generateItemCodeFromName('   '), 'ITEM');
});

test('Isolated DB integration read checks for Wave 2 against management_inventory_win', async (t) => {
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
    clientId: 1,
    clientBusinessId: 1,
    clientStoreId: 6,
    allowedStoreIds: [6],
    isClientConsultant: false,
    previewRole: 'admin',
    previewStoreId: null,
    permissions: evaluateLegacyInventoryPermissions(7, null),
  };

  try {
    const lifecycle = await getWarehouseItemLifecycle(adminCtx, {
      warehouseIds: [3],
      inventoryItemType: 'Material',
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30',
      forecastMonth: 1,
      page: 1,
      limit: 10,
    });
    assert.equal(lifecycle.success, true);

    const limits = await listWarehouseItemLimits(adminCtx, {
      warehouseId: 3,
      itemState: 'New',
      page: 1,
      limit: 10,
    });
    assert.equal(limits.success, true);
    assert.ok(limits.data.length > 0);

    const assigned = await getWarehouseItemsDrilldown(adminCtx, {
      warehouseIds: [3],
      isAssignedStaff: true,
      page: 1,
      limit: 10,
    });
    assert.equal(assigned.success, true);

    const checks = await listWarehouseChecks(adminCtx, { warehouseId: 3, page: 1, limit: 10 });
    assert.equal(checks.success, true);
    assert.ok(checks.data.length > 0);

    const scanLogs = await listScanLogs(adminCtx, { page: 1, limit: 10 });
    assert.equal(scanLogs.success, true);
    assert.ok(scanLogs.data.length > 0);

    const items = await listCatalogItems(adminCtx, { page: 1, limit: 10 });
    assert.equal(items.success, true);
    assert.ok(items.data.length > 0);

    const brands = await listCatalogBrands(adminCtx, { page: 1, limit: 10 });
    assert.equal(brands.success, true);
    assert.ok(brands.data.length > 0);
  } finally {
    await closeInventoryPool();
  }
});
