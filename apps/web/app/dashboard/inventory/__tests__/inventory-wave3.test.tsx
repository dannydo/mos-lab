import { describe, expect, it } from 'vitest';
import { canTransitionInventoryOrderState, groupInventoryLabelsByItem } from '@mos-lab/shared';
import { getSelectedMenuKey, getSidebarGroups } from '../../../../config/sidebar.config';

describe('Wave 3 Inventory Orders, SSE & Print Invariants', () => {
  it('enforces legacy orderStatePosition state transitions cleanly', () => {
    expect(canTransitionInventoryOrderState('New', 'Approved')).toBe(true);
    expect(canTransitionInventoryOrderState('Approved', 'Assigned')).toBe(true);
    expect(canTransitionInventoryOrderState('Assigned', 'Imported')).toBe(true);
    expect(canTransitionInventoryOrderState('New', 'Rejected')).toBe(true);
    expect(canTransitionInventoryOrderState('Imported', 'Cancelled')).toBe(false);
    expect(canTransitionInventoryOrderState('Approved', 'New')).toBe(false);
  });

  it('groups thermal QR labels by item boundary across 102x28, 102x19 and 104x12 modes', () => {
    const rows = [
      { id: 1, item: { inventory_item_id: 100 } },
      { id: 2, item: { inventory_item_id: 100 } },
      { id: 3, item: { inventory_item_id: 100 } },
      { id: 4, item: { inventory_item_id: 200 } },
      { id: 5, item: { inventory_item_id: 200 } },
    ];
    expect(groupInventoryLabelsByItem(rows, '102x28').map((g) => g.length)).toEqual([2, 1, 2]);
    expect(groupInventoryLabelsByItem(rows, '102x19').map((g) => g.length)).toEqual([3, 2]);
    expect(groupInventoryLabelsByItem(rows, '104x12').map((g) => g.length)).toEqual([3, 2]);
  });

  it('matches Wave 3 /dashboard/inventory/orders & /print paths and preserves Zero-Trust Admin-Only sidebar', () => {
    expect(getSelectedMenuKey('/dashboard/inventory/orders')).toBe('inventory-orders');
    expect(getSelectedMenuKey('/dashboard/inventory/orders/42/scan')).toBe('inventory-orders');
    expect(getSelectedMenuKey('/dashboard/inventory/print/warehouse-report')).toBe('inventory-items');

    const adminGroups = getSidebarGroups('admin');
    const adminChildKeys = adminGroups.flatMap((g) =>
      g.items.flatMap((i) => [i.key, ...(i.children?.map((c) => c.key) || [])])
    );
    expect(adminChildKeys).toContain('inventory-orders');

    const ccGroups = getSidebarGroups('client_consultant', [], true, {}, [], false, {
      'inventory-parent': true,
      'inventory-orders': true,
    });
    const ccAllKeys = ccGroups.flatMap((g) =>
      g.items.flatMap((i) => [i.key, ...(i.children?.map((c) => c.key) || [])])
    );
    expect(ccAllKeys).not.toContain('inventory-orders');
  });
});
