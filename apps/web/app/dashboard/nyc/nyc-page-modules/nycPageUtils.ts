import type { SafeAny } from '@mos-lab/shared';
import { NYC_SETTINGS_MODAL_DEFAULTS, type NycStaffOption } from './nycPageTypes';

const NYC_SORTABLE_FIELDS: Record<string, string> = {
  daysSinceLastVisit: 'daysSinceLastVisit',
  totalSpent: 'totalSpent',
  name: 'name',
  id: 'id',
};

export function getBookerStaffOptions(staffList: NycStaffOption[]): NycStaffOption[] {
  const seenNames = new Set<string>();
  return (staffList || [])
    .filter((staff) => {
      const role = (staff.role || staff.staff_role || '').toLowerCase();
      return role === 'telesales' || role === 'booker';
    })
    .filter((staff) => {
      const nameKey = (staff.displayName || staff.name || staff.username || '').trim().toLowerCase();
      if (!nameKey || seenNames.has(nameKey)) return false;
      seenNames.add(nameKey);
      return true;
    });
}

export function computeTotalTabCustomers(tabCounts: Record<string, number>): number {
  return Object.values(tabCounts).reduce((sum, val) => sum + val, 0);
}

export function computeBookedRatePercent(totalBookedToday: number, totalCalledToday: number): number {
  if (totalCalledToday <= 0) return 0;
  return Math.round((totalBookedToday / totalCalledToday) * 100);
}

export function resolveNycTableSortField(tableSorter: SafeAny): string | null {
  const sorter = Array.isArray(tableSorter) ? tableSorter[0] : tableSorter;
  if (!sorter?.field || !sorter.order) return null;

  const sortableField = NYC_SORTABLE_FIELDS[String(sorter.field)];
  if (!sortableField) return null;

  return `${sortableField}_${sorter.order === 'ascend' ? 'asc' : 'desc'}`;
}

export function clampNycModalWidth(width: number): number {
  return Math.max(NYC_SETTINGS_MODAL_DEFAULTS.minWidth, Math.min(NYC_SETTINGS_MODAL_DEFAULTS.maxWidth, width));
}

export function clampNycModalHeight(height: number): number {
  return Math.max(NYC_SETTINGS_MODAL_DEFAULTS.minHeight, Math.min(NYC_SETTINGS_MODAL_DEFAULTS.maxHeight, height));
}
