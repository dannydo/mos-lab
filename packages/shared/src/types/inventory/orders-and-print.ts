import type { InventoryCheckState, InventoryItemState, InventoryItemType, InventoryOrderState } from './enums.js';
import type { InventoryRolePreviewKey } from './permissions.js';
import type {
  InventoryItemSummaryDto,
  InventoryWarehouseDto,
  InventoryWarehouseItemDetailDto,
} from './scan-and-check.js';
import type { InventoryLifecycleCounters, InventoryStaffBriefDto } from './reports-and-catalog.js';

export const INVENTORY_ORDER_STATE_POSITION = [
  'New',
  'Approved',
  'Assigned',
  'Cancelled',
  'Rejected',
  'Imported',
] as const satisfies readonly InventoryOrderState[];

export function canTransitionInventoryOrderState(current: InventoryOrderState, target: InventoryOrderState): boolean {
  if (current === target) return false;
  const curIdx = INVENTORY_ORDER_STATE_POSITION.indexOf(current);
  const tgtIdx = INVENTORY_ORDER_STATE_POSITION.indexOf(target);
  if (curIdx === -1 || tgtIdx === -1) return false;
  return curIdx <= tgtIdx;
}

export const INVENTORY_LABEL_PRINT_MODES = ['102x28', '102x19', '104x12'] as const;
export type InventoryLabelPrintMode = (typeof INVENTORY_LABEL_PRINT_MODES)[number];

export function groupInventoryLabelsByItem<T extends { item: { inventory_item_id: number } }>(
  items: T[],
  mode: InventoryLabelPrintMode
): T[][] {
  const limitCol = mode === '102x28' ? 2 : mode === '102x19' ? 3 : 5;
  const pages: T[][] = [];
  let group: T[] = [];
  let lastItemId: number | null = null;

  for (const row of items) {
    const itemId = row.item.inventory_item_id;
    if (lastItemId !== null && itemId !== lastItemId && group.length > 0) {
      pages.push(group);
      group = [];
    }
    lastItemId = itemId;
    group.push(row);
    if (group.length >= limitCol) {
      pages.push(group);
      group = [];
    }
  }
  if (group.length > 0) {
    pages.push(group);
  }
  return pages;
}

export interface InventoryCompanyInfoDto {
  company_name: string;
  company_address: string;
  company_tax_number: string;
}

export interface InventoryOrderActionFlagsDto {
  canEdit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canAssign: boolean;
  canCheck: boolean;
  canCancel: boolean;
  canForward: boolean;
  canOrderMissing: boolean;
}

export interface InventoryOrderItemDto {
  inventory_warehouse_order_item_id: number;
  inventory_warehouse_order_id: number;
  from_inventory_warehouse_id: number | null;
  to_inventory_warehouse_id: number;
  inventory_item_id: number;
  from_inventory_warehouse_item_id: number | null;
  to_inventory_warehouse_item_id: number | null;
  scan_code?: string | null;
  currency_id: number;
  retail_price?: number;
  retail_price_estimated?: number;
  description: string | null;
  date_assigned: string | null;
  date_checked: string | null;
  date_imported: string | null;
  date_created: string;
  total_quantity?: number;
  total_quantity_checked?: number;
  total_quantity_exported?: number;
  total_quantity_imported?: number;
  total_retail_price?: number;
  total_retail_price_exported?: number;
  total_retail_price_imported?: number;
  total_retail_price_estimated?: number;
  from_warehouse?: InventoryWarehouseDto | null;
  to_warehouse?: InventoryWarehouseDto | null;
  from_inventory_warehouse_item?: InventoryWarehouseItemDetailDto | null;
  item: InventoryItemSummaryDto & { is_temporary_brand?: boolean };
  created_staff?: InventoryStaffBriefDto | null;
}

export interface InventoryOrderDto {
  inventory_warehouse_order_id: number;
  parent_inventory_warehouse_order_id: number | null;
  from_inventory_warehouse_id: number | null;
  to_inventory_warehouse_id: number;
  total_quantity: number;
  total_quantity_exported: number;
  total_quantity_imported: number;
  total_retail_price?: number;
  total_retail_price_exported?: number;
  total_retail_price_imported?: number;
  total_retail_price_estimated?: number;
  description: string;
  reject_reason: string | null;
  order_state: InventoryOrderState;
  is_internal: boolean;
  date_approved: string | null;
  date_assigned: string | null;
  date_imported: string | null;
  date_updated: string | null;
  date_created: string;
  created_staff: InventoryStaffBriefDto | null;
  approved_staff: InventoryStaffBriefDto | null;
  assigned_staff: InventoryStaffBriefDto | null;
  imported_staff: InventoryStaffBriefDto | null;
  from_inventory_warehouse: InventoryWarehouseDto | null;
  to_inventory_warehouse: InventoryWarehouseDto;
  actions: InventoryOrderActionFlagsDto;
  inventory_item?: InventoryOrderItemDto[];
}

export interface InventoryOrdersListResponse {
  success: boolean;
  data: InventoryOrderDto[];
  page: { total: number; page: number; limit: number };
}

export interface InventoryOrderDetailResponse {
  success: boolean;
  order: InventoryOrderDto | null;
  selected_order_id?: number | null;
  company?: InventoryCompanyInfoDto;
}

export interface InventoryOrderItemsListResponse {
  success: boolean;
  data: InventoryOrderItemDto[];
  page: { total: number; page: number; limit: number };
}

export interface InventorySaveOrderLineInput {
  from_inventory_warehouse_item_id?: number | null;
  from_inventory_warehouse_id?: number | null;
  inventory_item_id: number;
  quantity: number;
  retail_price?: number;
  retail_price_estimated?: number;
  description?: string | null;
}

export interface InventorySaveOrderRequest {
  inventory_warehouse_order_id?: number;
  from_inventory_warehouse_id?: number | null;
  to_inventory_warehouse_id: number;
  description: string;
  is_internal?: boolean;
  is_forward_mode?: boolean;
  is_missing_item_mode?: boolean;
  inventory_item: InventorySaveOrderLineInput[];
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export interface InventoryItemStockMapResponse {
  success: boolean;
  stocks: Record<number, number>;
}

export interface InventoryPrintLabelItemDto {
  inventory_warehouse_order_item_id?: number;
  inventory_warehouse_item_id?: number;
  first_inventory_warehouse_order_item_id: number | null;
  scan_code: string;
  date_created: string;
  item: InventoryItemSummaryDto & { is_temporary_brand: boolean };
}

export interface InventoryPrintLabelsResponse {
  success: boolean;
  order?: InventoryOrderDto | null;
  items: InventoryPrintLabelItemDto[];
}

export interface InventoryCheckPrintItemDto {
  inventory_item_id: number;
  total_quantity: number;
  total_quantity_checked: number;
  total_retail_price?: number;
  total_retail_price_checked?: number;
  item: InventoryItemSummaryDto;
}

export interface InventoryCheckPrintResponse {
  success: boolean;
  company: InventoryCompanyInfoDto;
  check: {
    inventory_warehouse_check_id: number;
    inventory_warehouse_id: number;
    item_state: 'New' | 'Using';
    check_state: InventoryCheckState;
    total_quantity: number;
    total_quantity_checked: number;
    total_retail_price?: number;
    total_retail_price_checked?: number;
    date_updated: string | null;
    date_created: string;
    warehouse: InventoryWarehouseDto;
    checked_staff: (InventoryStaffBriefDto & { user_group_name: string | null }) | null;
  } | null;
  items: InventoryCheckPrintItemDto[];
}

export interface InventoryWarehouseReportRowDto extends InventoryLifecycleCounters {
  warehouse: InventoryWarehouseDto;
}

export interface InventoryWarehouseReportPrintResponse {
  success: boolean;
  company: InventoryCompanyInfoDto;
  selectedWarehouse: InventoryWarehouseDto | null;
  itemType: InventoryItemType | 'ALL';
  items: InventoryWarehouseReportRowDto[];
  summary: InventoryLifecycleCounters;
  page: { total: number; page: number; limit: number };
}

export interface InventoryOrderActionPayload {
  reject_reason?: string;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export interface InventoryOrderLookupStockRequest {
  inventory_warehouse_id: number;
  inventory_item_ids: number[];
  item_state?: InventoryItemState;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}
