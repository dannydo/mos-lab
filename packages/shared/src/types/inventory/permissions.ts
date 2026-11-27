import type { InventoryScanMode } from './enums.js';

export const INVENTORY_PERMISSION_ACTIONS = [
  'view-price',
  'view-scan-code',
  'scan-code-bypass-upload-image',
  'edit-order-global',
  'order-approve',
  'order-approve-global',
  'order-reject',
  'order-reject-global',
  'merge-order',
  'cancel-order',
  'cancel-order-global',
  'order-check',
  'order-check-global',
  'order-assign',
  'order-assign-global',
  'item-state-using',
  'item-state-used',
  'item-state-return',
  'item-state-broken',
  'item-state-assign',
  'item-state',
  'item-state-global',
  'inventory-check-new',
  'inventory-check-using',
  'inventory-check-global',
  'warehouse-check-approve',
  'add-warehouse',
  'add-item',
  'add-item-brand',
  'edit-warehouse',
  'edit-item',
  'edit-item-brand',
] as const;

export type InventoryPermissionAction = (typeof INVENTORY_PERMISSION_ACTIONS)[number];

export interface LegacyInventoryPermissionRule {
  groups: readonly number[];
  users: readonly number[];
}

/**
 * Verbatim port of `WingsLashes/Server/src/api/1/app/config/permissions.json` -> `"inventory"`.
 */
export const LEGACY_INVENTORY_PERMISSION_RULES: Record<InventoryPermissionAction, LegacyInventoryPermissionRule> = {
  'view-price': { groups: [7, 8, 20, 21, 27], users: [] },
  'view-scan-code': { groups: [7, 8, 21, 27], users: [] },
  'scan-code-bypass-upload-image': { groups: [7, 8, 21, 27], users: [] },
  'edit-order-global': { groups: [7, 8, 21, 27], users: [] },
  'order-approve': { groups: [6, 7, 8, 12, 15, 17, 21, 25, 27, 28, 30, 38, 42], users: [] },
  'order-approve-global': { groups: [7, 8, 21, 27], users: [] },
  'order-reject': { groups: [6, 7, 8, 12, 15, 17, 21, 25, 27, 28, 30, 38, 42], users: [] },
  'order-reject-global': { groups: [7, 8, 21, 27], users: [] },
  'merge-order': { groups: [7, 8, 21, 27], users: [] },
  'cancel-order': { groups: [6, 7, 8, 12, 15, 17, 21, 25, 27, 28, 30, 38, 42], users: [] },
  'cancel-order-global': { groups: [7, 8, 21, 27], users: [] },
  'order-check': { groups: [5, 6, 7, 8, 12, 15, 17, 21, 25, 27, 28, 30, 35, 38, 42], users: [] },
  'order-check-global': { groups: [7, 8, 20, 21, 27, 29], users: [] },
  'order-assign': { groups: [5, 6, 7, 8, 12, 15, 17, 21, 25, 27, 28, 30, 38, 42], users: [] },
  'order-assign-global': { groups: [7, 8, 21, 27], users: [] },
  'item-state-using': {
    groups: [5, 6, 7, 8, 12, 15, 16, 17, 18, 20, 21, 25, 27, 28, 29, 30, 37, 38, 42],
    users: [34295, 48026, 37790],
  },
  'item-state-used': {
    groups: [5, 6, 7, 8, 12, 15, 16, 17, 18, 20, 21, 25, 27, 28, 29, 30, 37, 38, 42],
    users: [34295],
  },
  'item-state-return': {
    groups: [5, 6, 7, 8, 12, 15, 16, 17, 18, 20, 21, 25, 27, 28, 29, 30, 37, 38, 42],
    users: [34295],
  },
  'item-state-broken': {
    groups: [5, 6, 7, 8, 12, 15, 16, 17, 18, 20, 21, 25, 27, 28, 29, 30, 37, 38, 42],
    users: [34295],
  },
  'item-state-assign': {
    groups: [5, 6, 7, 8, 12, 15, 16, 17, 18, 20, 21, 25, 27, 28, 29, 30, 35, 37, 38, 42],
    users: [],
  },
  'item-state': {
    groups: [5, 6, 7, 8, 12, 15, 16, 17, 18, 20, 21, 25, 26, 27, 28, 29, 30, 35, 37, 42],
    users: [],
  },
  'item-state-global': { groups: [7, 8, 21, 27], users: [] },
  'inventory-check-new': { groups: [5, 6, 7, 8, 12, 15, 17, 21, 25, 27, 28, 30, 35, 42], users: [34295] },
  'inventory-check-using': { groups: [5, 7, 8, 12, 15, 17, 21, 25, 27, 28, 30, 35, 42], users: [] },
  'inventory-check-global': { groups: [7, 8, 21, 27], users: [] },
  'warehouse-check-approve': { groups: [7, 8, 21, 27], users: [] },
  'add-warehouse': { groups: [7, 8, 21, 27], users: [] },
  'add-item': { groups: [7, 8, 21, 27], users: [] },
  'add-item-brand': { groups: [7, 8, 21, 27], users: [] },
  'edit-warehouse': { groups: [7, 8, 21, 27], users: [] },
  'edit-item': { groups: [7, 8, 21, 27], users: [] },
  'edit-item-brand': { groups: [7, 8, 21, 27], users: [] },
};

export type InventoryRolePreviewKey = 'admin' | 'inventory-manager' | 'branch-manager' | 'client-consultant';

export interface InventoryRolePreviewPreset {
  key: InventoryRolePreviewKey;
  legacyGroupId: number;
  label: string;
  shortLabel: string;
  isStoreScoped: boolean;
}

export const INVENTORY_ROLE_PREVIEW_PRESETS: Record<InventoryRolePreviewKey, InventoryRolePreviewPreset> = {
  admin: {
    key: 'admin',
    legacyGroupId: 7,
    label: 'Admin (Global)',
    shortLabel: 'Admin',
    isStoreScoped: false,
  },
  'inventory-manager': {
    key: 'inventory-manager',
    legacyGroupId: 21,
    label: 'Quản Lý Kho (Global)',
    shortLabel: 'QL Kho',
    isStoreScoped: false,
  },
  'branch-manager': {
    key: 'branch-manager',
    legacyGroupId: 6,
    label: 'Branch Manager (Store)',
    shortLabel: 'BM',
    isStoreScoped: true,
  },
  'client-consultant': {
    key: 'client-consultant',
    legacyGroupId: 5,
    label: 'CC / Tư Vấn (Using only)',
    shortLabel: 'CC',
    isStoreScoped: true,
  },
};

export function evaluateLegacyInventoryPermissions(
  legacyGroupId: number | null,
  legacyUserId: number | null
): Record<InventoryPermissionAction, boolean> {
  const result = {} as Record<InventoryPermissionAction, boolean>;
  for (const action of INVENTORY_PERMISSION_ACTIONS) {
    const rule = LEGACY_INVENTORY_PERMISSION_RULES[action];
    const hasGroup = legacyGroupId != null && rule.groups.includes(legacyGroupId);
    const hasUser = legacyUserId != null && rule.users.includes(legacyUserId);
    result[action] = Boolean(hasGroup || hasUser);
  }
  return result;
}

/**
 * Matches legacy `InventoryScannerVC.swift` + `MoreVC.swift` tab visibility rules.
 * `client-consultant` (group 5) sees Check + Item State / Using / Used / Return / Broken / Assign,
 * while Input / Output / Order are hidden unless explicitly allowed.
 */
export function getVisibleMobileScannerModes(
  perms: Record<InventoryPermissionAction, boolean>,
  isClientConsultant: boolean
): InventoryScanMode[] {
  const modes: InventoryScanMode[] = [];

  if (perms['item-state'] || perms['item-state-global']) {
    modes.push('item-state');
  }
  if (perms['inventory-check-new'] || perms['inventory-check-using'] || perms['inventory-check-global']) {
    modes.push('inventory-check');
  }
  if (perms['item-state-using'] || perms['item-state-global']) {
    modes.push('item-using');
  }
  if (perms['item-state-used'] || perms['item-state-global']) {
    modes.push('item-used');
  }
  if (perms['item-state-return'] || perms['item-state-global']) {
    modes.push('item-return');
  }
  if (perms['item-state-broken'] || perms['item-state-global']) {
    modes.push('item-broken');
  }
  if (perms['item-state-assign'] || perms['item-state-global']) {
    modes.push('item-assign-staff');
  }
  if (!isClientConsultant) {
    if (perms['order-check'] || perms['order-check-global']) {
      modes.push('input-check');
    }
    if (perms['order-assign'] || perms['order-assign-global']) {
      modes.push('output-assign');
    }
    if (perms['edit-order-global'] || perms['order-approve']) {
      modes.push('order-add');
    }
  }

  return modes.length > 0 ? modes : ['item-state'];
}

/**
 * Matches legacy `InventoryWarehouseCheckScanVC.swift` Tier-1 tabs (`NEW`, `USING`):
 * - `client-consultant` sees ONLY `['Using']` (legacy forces `USING` on check screen).
 * - Branch Manager (group 6) without `inventory-check-using` sees `['New']`.
 * - Admin / Inventory Manager sees `['New', 'Using']`.
 */
export function getVisibleMobileCheckStates(
  perms: Record<InventoryPermissionAction, boolean>,
  isClientConsultant: boolean
): ('New' | 'Using')[] {
  if (isClientConsultant) {
    return ['Using'];
  }
  const states: ('New' | 'Using')[] = [];
  if (perms['inventory-check-global'] || perms['inventory-check-new']) {
    states.push('New');
  }
  if (perms['inventory-check-global'] || perms['inventory-check-using']) {
    states.push('Using');
  }
  return states.length > 0 ? states : ['Using'];
}
