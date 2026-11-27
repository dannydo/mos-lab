export const INVENTORY_WAREHOUSE_TYPES = ['Main', 'Other', 'Supplier', 'Return', 'Destroy'] as const;
export type InventoryWarehouseType = (typeof INVENTORY_WAREHOUSE_TYPES)[number];

export const INVENTORY_ITEM_TYPES = [
  'Material',
  'Support',
  'Housewares',
  'Stationery',
  'Uniform',
  'Product',
  'Assets',
] as const;
export type InventoryItemType = (typeof INVENTORY_ITEM_TYPES)[number];

/** 6 checkable item types for Inventory Check (excludes Assets identically to legacy PHP). */
export const INVENTORY_CHECKABLE_ITEM_TYPES = [
  'Material',
  'Support',
  'Housewares',
  'Stationery',
  'Uniform',
  'Product',
] as const;
export type InventoryCheckableItemType = (typeof INVENTORY_CHECKABLE_ITEM_TYPES)[number];

export const INVENTORY_ITEM_STATES = ['New', 'Testing', 'Using', 'Lost-Temporary', 'Used', 'Lost', 'Broken'] as const;
export type InventoryItemState = (typeof INVENTORY_ITEM_STATES)[number];

export const INVENTORY_ITEM_STATE_POSITION = ['New', 'Using', 'Lost-Temporary', 'Used', 'Lost', 'Broken'] as const;

export const INVENTORY_ITEM_AVAILABLE_STATES = ['New', 'Testing', 'Using', 'Lost-Temporary'] as const;

export const INVENTORY_ITEM_UNAVAILABLE_STATES = ['Used', 'Lost', 'Lost-Temporary', 'Broken'] as const;

export const INVENTORY_ITEM_PERMANENT_UNAVAILABLE_STATES = ['Used', 'Lost', 'Broken'] as const;

export const INVENTORY_CHECK_STATES = ['New', 'Checked', 'Completed', 'Cancelled'] as const;
export type InventoryCheckState = (typeof INVENTORY_CHECK_STATES)[number];

export const INVENTORY_CHECK_TABS = ['Check', 'Missing', 'Lost-Temporary'] as const;
export type InventoryCheckTab = (typeof INVENTORY_CHECK_TABS)[number];

export const INVENTORY_ORDER_STATES = ['New', 'Approved', 'Rejected', 'Assigned', 'Imported', 'Cancelled'] as const;
export type InventoryOrderState = (typeof INVENTORY_ORDER_STATES)[number];

export const INVENTORY_SCAN_MODES = [
  'item-state',
  'item-testing',
  'item-using',
  'item-used',
  'item-lost',
  'item-return',
  'item-broken',
  'item-assign-staff',
  'inventory-check',
  'input-check',
  'output-assign',
  'order-add',
] as const;
export type InventoryScanMode = (typeof INVENTORY_SCAN_MODES)[number];

export const INVENTORY_SCAN_MODE_ALIASES: Record<string, InventoryScanMode> = {
  state: 'item-state',
  testing: 'item-testing',
  using: 'item-using',
  used: 'item-used',
  lost: 'item-lost',
  return: 'item-return',
  broken: 'item-broken',
};

export interface InventoryScanTabConfig {
  mode: InventoryScanMode;
  label: string;
  requiresWarehouseOrderId?: boolean;
}

export const INVENTORY_SCAN_MODE_LABELS: Record<InventoryScanMode, string> = {
  'item-state': 'State',
  'item-testing': 'Testing',
  'item-using': 'Using',
  'item-used': 'Used',
  'item-lost': 'Lost',
  'item-return': 'Return',
  'item-broken': 'Broken',
  'item-assign-staff': 'Assign',
  'inventory-check': 'Check',
  'input-check': 'Input',
  'output-assign': 'Output',
  'order-add': 'Order',
};
