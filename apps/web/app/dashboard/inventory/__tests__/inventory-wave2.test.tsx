import { describe, expect, it } from 'vitest';
import { isInventoryLifecycleEndValid } from '@mos-lab/shared';
import { getSelectedMenuKey, getSidebarGroups } from '../../../../config/sidebar.config';

describe('Wave 2 Inventory Admin Dashboard Invariants', () => {
  it('validates lifecycle closing balance equation identically to legacy ReportInventoryWarehouse', () => {
    expect(
      isInventoryLifecycleEndValid({
        total_quantity_start: 10,
        total_quantity_input: 5,
        total_quantity_used: 3,
        total_quantity_lost: 1,
        total_quantity_broken: 0,
        total_quantity_output: 2,
        total_quantity_end: 9,
      })
    ).toBe(true);

    expect(
      isInventoryLifecycleEndValid({
        total_quantity_start: 10,
        total_quantity_input: 5,
        total_quantity_used: 3,
        total_quantity_lost: 1,
        total_quantity_broken: 0,
        total_quantity_output: 2,
        total_quantity_end: 8,
      })
    ).toBe(false);
  });

  it('matches all 6 Wave 2 /dashboard/inventory/* subpaths cleanly', () => {
    expect(getSelectedMenuKey('/dashboard/inventory/items')).toBe('inventory-items');
    expect(getSelectedMenuKey('/dashboard/inventory/limits')).toBe('inventory-limits');
    expect(getSelectedMenuKey('/dashboard/inventory/assign')).toBe('inventory-assign');
    expect(getSelectedMenuKey('/dashboard/inventory/assets')).toBe('inventory-assets');
    expect(getSelectedMenuKey('/dashboard/inventory/scan-logs')).toBe('inventory-scan-logs');
    expect(getSelectedMenuKey('/dashboard/inventory/catalog')).toBe('inventory-catalog');
  });

  it('enforces Zero-Trust Admin-Only sidebar isolation even with menuVisibility overrides', () => {
    const adminGroups = getSidebarGroups('admin');
    const adminKeys = adminGroups.flatMap((g) => g.items.map((i) => i.key));
    expect(adminKeys).toContain('inventory-parent');

    const ccGroups = getSidebarGroups('client_consultant', [], true, {}, [], false, {
      'inventory-parent': true,
      'inventory-items': true,
      'inventory-limits': true,
      'inventory-assign': true,
      'inventory-assets': true,
      'inventory-scan-logs': true,
      'inventory-catalog': true,
    });
    const ccAllKeys = ccGroups.flatMap((g) =>
      g.items.flatMap((i) => [i.key, ...(i.children?.map((c) => c.key) || [])])
    );
    expect(ccAllKeys).not.toContain('inventory-parent');
    expect(ccAllKeys).not.toContain('inventory-items');
    expect(ccAllKeys).not.toContain('inventory-catalog');
  });
});
