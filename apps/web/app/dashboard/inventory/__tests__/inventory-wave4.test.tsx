import { describe, expect, it } from 'vitest';
import {
  computeInventoryForecastQuantity,
  computeStockCheckingMaxCount,
  computeStockNeedQuantity,
  getEndOfMonthRemindDays,
  INVENTORY_JOB_DEFINITIONS,
} from '@mos-lab/shared';
import { getSelectedMenuKey, getSidebarGroups } from '../../../../config/sidebar.config';

describe('Wave 4 Inventory Cron Jobs & Admin Control Panel Invariants', () => {
  it('exposes all 7 legacy PHP inventory cron job definitions', () => {
    expect(INVENTORY_JOB_DEFINITIONS).toHaveLength(7);
    const scripts = INVENTORY_JOB_DEFINITIONS.map((j) => j.legacyScript);
    expect(scripts).toContain('generate-report-inventory-warehouse-item-state.php');
    expect(scripts).toContain('process-inventory-stock-checking.php');
    expect(scripts).toContain('push-inventory-warehouse-order.php');
  });

  it('computes pure legacy forecast, maxCount, stockNeed and EOM remind days deterministically', () => {
    expect(computeInventoryForecastQuantity(8, 10)).toBe(0);
    expect(computeInventoryForecastQuantity(10, 1)).toBeCloseTo(10.925, 5);
    expect(computeStockCheckingMaxCount(30, 12)).toBe(17);
    expect(
      computeStockNeedQuantity({
        minCount: 1,
        maxCount: 25,
        lastMaxCount: 20,
        limitCountStandard: 10,
        currentStock: 5,
        isMainWarehouse: true,
      })
    ).toBe(22);
    expect(getEndOfMonthRemindDays(30)).toEqual([20, 25, 28, 29]);
  });

  it('matches /dashboard/inventory/jobs and preserves UI-010 Zero-Trust Admin-Only sidebar', () => {
    expect(getSelectedMenuKey('/dashboard/inventory/jobs')).toBe('inventory-jobs');

    const adminGroups = getSidebarGroups('admin');
    const adminKeys = adminGroups.flatMap((g) =>
      g.items.flatMap((i) => [i.key, ...(i.children?.map((c) => c.key) || [])])
    );
    expect(adminKeys).toContain('inventory-jobs');

    const ccGroups = getSidebarGroups('client_consultant', [], true, {}, [], false, {
      'inventory-parent': true,
      'inventory-jobs': true,
    });
    const ccKeys = ccGroups.flatMap((g) => g.items.flatMap((i) => [i.key, ...(i.children?.map((c) => c.key) || [])]));
    expect(ccKeys).not.toContain('inventory-jobs');
  });
});
