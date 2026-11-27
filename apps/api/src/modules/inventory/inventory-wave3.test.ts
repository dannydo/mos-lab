import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canTransitionInventoryOrderState,
  evaluateLegacyInventoryPermissions,
  groupInventoryLabelsByItem,
  resolveMenuKeysForApiPath,
} from '@mos-lab/shared';
import { closeInventoryPool } from './services/inventory-db.js';
import type { InventoryAuthContext } from './services/inventory-auth.service.js';
import {
  checkAllOrderItems,
  deleteOrderCascadeForTest,
  saveWarehouseOrder,
  transitionWarehouseOrderState,
} from './services/inventory-order-mutation.service.js';
import { getWarehouseOrderDetail, listWarehouseOrders } from './services/inventory-order-query.service.js';
import { getWarehouseCheckPrintData, getWarehouseReportPrintData } from './services/inventory-print.service.js';

test('UI-010 Zero-Trust: all Wave 3 /api/inventory/* routes resolve to __ADMIN_ONLY_DEFAULT__', () => {
  const paths = [
    '/api/inventory/warehouse/orders',
    '/api/inventory/warehouse/orders/100',
    '/api/inventory/warehouse/orders/merge-preview',
    '/api/inventory/warehouse/orders/100/approve',
    '/api/inventory/warehouse/orders/100/reject',
    '/api/inventory/warehouse/orders/100/assign',
    '/api/inventory/warehouse/orders/100/finish',
    '/api/inventory/warehouse/orders/100/cancel',
    '/api/inventory/warehouse/orders/100/input-all',
    '/api/inventory/warehouse/orders/100/import',
    '/api/inventory/warehouse/items/stocks',
    '/api/inventory/warehouse/items/lookup-scan-code',
    '/api/inventory/print/order/100/labels',
    '/api/inventory/print/items/labels',
    '/api/inventory/print/check/100',
    '/api/inventory/print/warehouse-report',
  ];
  for (const p of paths) {
    assert.deepEqual(resolveMenuKeysForApiPath(p), ['__ADMIN_ONLY_DEFAULT__'], `Expected admin-only default for ${p}`);
  }
});

test('canTransitionInventoryOrderState matches legacy orderStatePosition precedence', () => {
  assert.equal(canTransitionInventoryOrderState('New', 'Approved'), true);
  assert.equal(canTransitionInventoryOrderState('Approved', 'Assigned'), true);
  assert.equal(canTransitionInventoryOrderState('Assigned', 'Imported'), true);
  assert.equal(canTransitionInventoryOrderState('New', 'Rejected'), true);
  assert.equal(canTransitionInventoryOrderState('Imported', 'Cancelled'), false);
  assert.equal(canTransitionInventoryOrderState('Approved', 'New'), false);
  assert.equal(canTransitionInventoryOrderState('New', 'New'), false);
});

test('groupInventoryLabelsByItem breaks rows on item change and mode column limit', () => {
  const sample = [
    { id: 1, item: { inventory_item_id: 10 } },
    { id: 2, item: { inventory_item_id: 10 } },
    { id: 3, item: { inventory_item_id: 10 } },
    { id: 4, item: { inventory_item_id: 20 } },
  ];
  const m0 = groupInventoryLabelsByItem(sample, '102x28');
  assert.equal(m0.length, 3);
  assert.deepEqual(
    m0.map((g) => g.length),
    [2, 1, 1]
  );

  const m1 = groupInventoryLabelsByItem(sample, '102x19');
  assert.equal(m1.length, 2);
  assert.deepEqual(
    m1.map((g) => g.length),
    [3, 1]
  );

  const sixSame = Array.from({ length: 6 }, (_, i) => ({ id: i, item: { inventory_item_id: 99 } }));
  const m2 = groupInventoryLabelsByItem(sixSame, '104x12');
  assert.equal(m2.length, 2);
  assert.deepEqual(
    m2.map((g) => g.length),
    [5, 1]
  );
});

test('Isolated DB integration read + synthetic order lifecycle on management_inventory_win', async (t) => {
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

  let createdOrderId = 0;
  try {
    const ordersList = await listWarehouseOrders(adminCtx, { tab: 'all', page: 1, limit: 5 });
    assert.equal(ordersList.success, true);
    assert.ok(ordersList.data.length > 0);

    const firstId = ordersList.data[0]!.inventory_warehouse_order_id;
    const detailCheck = await getWarehouseOrderDetail(adminCtx, firstId, { mode: 'check' });
    assert.ok(detailCheck.order);

    const ccDetail = await getWarehouseOrderDetail(ccCtx, firstId, { mode: 'print-invoice' });
    assert.equal('total_retail_price' in (ccDetail.order || {}), false);

    const reportPrint = await getWarehouseReportPrintData(adminCtx, {
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30',
    });
    assert.equal(reportPrint.success, true);

    const checkPrint = await getWarehouseCheckPrintData(adminCtx, 1);
    assert.equal(checkPrint.success, true);

    // Create -> Approve -> Input-All -> Finish synthetic external order (skip import physical stock side effect, test transition & cleanup)
    const created = await saveWarehouseOrder(adminCtx, {
      to_inventory_warehouse_id: 3,
      description: '[TEST-WAVE3] Integration Smoke Order',
      is_internal: false,
      inventory_item: [{ inventory_item_id: 1, quantity: 1, retail_price: 10000 }],
    });
    assert.ok(created.order);
    createdOrderId = created.order.inventory_warehouse_order_id;
    assert.equal(created.order.order_state, 'New');
    assert.equal(created.order.total_quantity, 1);

    const approved = await transitionWarehouseOrderState(adminCtx, createdOrderId, 'Approved');
    assert.equal(approved.order?.order_state, 'Assigned');
    assert.ok(approved.order?.inventory_item?.[0]);

    const checkedAll = await checkAllOrderItems(adminCtx, createdOrderId);
    assert.equal(checkedAll.order?.inventory_item?.[0]?.total_quantity_checked, 1);
  } finally {
    if (createdOrderId > 0) {
      await deleteOrderCascadeForTest(createdOrderId);
    }
    await closeInventoryPool();
  }
});
