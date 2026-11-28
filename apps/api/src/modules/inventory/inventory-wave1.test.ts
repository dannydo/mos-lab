import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import {
  evaluateLegacyInventoryPermissions,
  getVisibleMobileCheckStates,
  getVisibleMobileScannerModes,
  INVENTORY_PERMISSION_ACTIONS,
  resolveMenuKeysForApiPath,
} from '@mos-lab/shared';
import { resolveLostStateForMerge, shouldAutoCompleteUsingCheck } from './services/inventory-check.service.js';
import { closeInventoryPool, getInventoryDbMeta, queryInventory } from './services/inventory-db.js';
import { normalizeScanCodeInput, normalizeScanMode } from './services/inventory-scan.service.js';
import { isValidMainItemState, validateInventoryStateTransition } from './services/inventory-state.service.js';

test('UI-010 Zero-Trust: all /api/inventory/* routes resolve to __ADMIN_ONLY_DEFAULT__', () => {
  assert.deepEqual(resolveMenuKeysForApiPath('/api/inventory/me/permissions'), ['__ADMIN_ONLY_DEFAULT__']);
  assert.deepEqual(resolveMenuKeysForApiPath('/api/inventory/scan/code'), ['__ADMIN_ONLY_DEFAULT__']);
  assert.deepEqual(resolveMenuKeysForApiPath('/api/inventory/warehouse/check/scan'), ['__ADMIN_ONLY_DEFAULT__']);
  assert.deepEqual(resolveMenuKeysForApiPath('/api/inventory/warehouse/check/finish'), ['__ADMIN_ONLY_DEFAULT__']);
});

test('Legacy 32-permission matrix & mobile UI role visibility match permissions.json', () => {
  assert.equal(INVENTORY_PERMISSION_ACTIONS.length, 32);

  // Admin (group 7) has all 32 permissions
  const adminPerms = evaluateLegacyInventoryPermissions(7, null);
  for (const action of INVENTORY_PERMISSION_ACTIONS) {
    assert.equal(adminPerms[action], true, `Admin must have ${action}`);
  }
  assert.deepEqual(getVisibleMobileCheckStates(adminPerms, false), ['New', 'Using']);
  assert.equal(getVisibleMobileScannerModes(adminPerms, false).includes('output-assign'), true);

  // Inventory Manager (group 21) has all global & scan permissions
  const invMgrPerms = evaluateLegacyInventoryPermissions(21, null);
  assert.equal(invMgrPerms['view-price'], true);
  assert.equal(invMgrPerms['scan-code-bypass-upload-image'], true);
  assert.equal(invMgrPerms['item-state-global'], true);

  // Branch Manager (group 6) has inventory-check-new but NOT inventory-check-using or global price/bypass
  const bmPerms = evaluateLegacyInventoryPermissions(6, null);
  assert.equal(bmPerms['inventory-check-new'], true);
  assert.equal(bmPerms['inventory-check-using'], false);
  assert.equal(bmPerms['view-price'], false);
  assert.equal(bmPerms['scan-code-bypass-upload-image'], false);
  assert.deepEqual(getVisibleMobileCheckStates(bmPerms, false), ['New']);

  // Client Consultant (group 5) sees ONLY ['Using'] on check and hides Input/Output/Order on scanner
  const ccPerms = evaluateLegacyInventoryPermissions(5, null);
  assert.equal(ccPerms['inventory-check-using'], true);
  assert.equal(ccPerms['item-state-using'], true);
  assert.equal(ccPerms['view-price'], false);
  assert.equal(ccPerms['item-state-global'], false);
  assert.deepEqual(getVisibleMobileCheckStates(ccPerms, true), ['Using']);
  const ccModes = getVisibleMobileScannerModes(ccPerms, true);
  assert.equal(ccModes.includes('input-check'), false);
  assert.equal(ccModes.includes('output-assign'), false);
  assert.equal(ccModes.includes('order-add'), false);
  assert.equal(ccModes.includes('inventory-check'), true);
});

test('Item state transition rules & Main warehouse restriction match legacy PHP', () => {
  // Forbidden transitions
  assert.equal(validateInventoryStateTransition('New', 'New'), false);
  assert.equal(validateInventoryStateTransition('New', 'Used'), false);
  assert.equal(validateInventoryStateTransition('Lost', 'Using'), false);

  // Allowed transitions
  assert.equal(validateInventoryStateTransition('New', 'Using'), true);
  assert.equal(validateInventoryStateTransition('Using', 'New'), true);
  assert.equal(validateInventoryStateTransition('Lost-Temporary', 'Using'), true);
  assert.equal(validateInventoryStateTransition('Lost-Temporary', 'Lost'), true);
  assert.equal(validateInventoryStateTransition('Using', 'Used'), true);
  assert.equal(validateInventoryStateTransition('New', 'Testing'), true);
  assert.equal(validateInventoryStateTransition('Testing', 'Using'), true);

  // Main warehouse restriction
  assert.equal(isValidMainItemState('Main', 'New'), true);
  assert.equal(isValidMainItemState('Main', 'Lost-Temporary'), true);
  assert.equal(isValidMainItemState('Main', 'Lost'), true);
  assert.equal(isValidMainItemState('Main', 'Broken'), true);
  assert.equal(isValidMainItemState('Main', 'Using'), false);
  assert.equal(isValidMainItemState('Main', 'Used'), false);
  assert.equal(isValidMainItemState('Other', 'Using'), true);
});

test('5-day End-of-Month check rule matches date("t") - 5 <= date("d")', () => {
  // April has 30 days -> 30 - 5 = 25 (days 25..30 are last 5 days)
  const midMonth = new Date(2026, 3, 10);
  const endMonth = new Date(2026, 3, 27);

  assert.equal(shouldAutoCompleteUsingCheck(midMonth, 'Using'), true);
  assert.equal(shouldAutoCompleteUsingCheck(midMonth, 'New'), false);
  assert.equal(shouldAutoCompleteUsingCheck(endMonth, 'Using'), false);
  assert.equal(shouldAutoCompleteUsingCheck(endMonth, 'New'), false);

  assert.equal(resolveLostStateForMerge(midMonth, 'New'), 'Lost');
  assert.equal(resolveLostStateForMerge(endMonth, 'New'), 'Lost');
  assert.equal(resolveLostStateForMerge(midMonth, 'Using'), 'Lost-Temporary');
  assert.equal(resolveLostStateForMerge(endMonth, 'Using'), 'Lost');
});

test('Scan code URL normalization and short mode aliases', () => {
  assert.equal(normalizeScanCodeInput('https://wingslashes.com/qr/YZMv4r6iruIAv5xM'), 'YZMv4r6iruIAv5xM');
  assert.equal(normalizeScanCodeInput('  YZMv4r6iruIAv5xM  '), 'YZMv4r6iruIAv5xM');
  assert.equal(normalizeScanMode('state'), 'item-state');
  assert.equal(normalizeScanMode('using'), 'item-using');
  assert.equal(normalizeScanMode('used'), 'item-used');
  assert.equal(normalizeScanMode('inventory-check'), 'inventory-check');
});

test('Isolated DB integration read check against management_inventory_win (when configured)', async (t) => {
  if (!process.env.INVENTORY_DATABASE_URL) {
    t.skip('INVENTORY_DATABASE_URL not set in unit test process');
    return;
  }

  try {
    const meta = getInventoryDbMeta();
    assert.equal(meta.name, 'management_inventory_win');
    assert.equal(meta.isIsolatedTestDb, true);

    const rows = await queryInventory<Array<RowDataPacket & { id: number; inventory_warehouse_name: string }>>(
      `SELECT id, inventory_warehouse_name FROM inventory_warehouse WHERE id = 3 LIMIT 1`
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].inventory_warehouse_name, 'De Tham');
  } finally {
    await closeInventoryPool();
  }
});
