import type {
  InventoryCheckState,
  InventoryCheckTab,
  InventoryItemState,
  InventoryItemType,
  InventoryScanMode,
  InventoryWarehouseType,
} from './enums.js';
import type { InventoryPermissionAction, InventoryRolePreviewKey } from './permissions.js';

export interface InventoryWarehouseDto {
  inventory_warehouse_id: number;
  parent_inventory_warehouse_id: number | null;
  client_store_id: number | null;
  inventory_warehouse_name: string;
  inventory_warehouse_phone_number: string | null;
  inventory_warehouse_address: string | null;
  inventory_warehouse_type: InventoryWarehouseType;
  is_check_needed: boolean;
  is_disabled: boolean;
  date_created: string;
}

export interface InventoryStaffOptionDto {
  user_id: number;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  user_group_id: number;
  group_name: string | null;
  client_store_id: number | null;
}

export interface InventoryItemSummaryDto {
  inventory_item_id: number;
  inventory_item_name: string;
  inventory_item_code: string;
  inventory_item_type: InventoryItemType;
  inventory_item_unit: string;
  inventory_item_attribute: string | null;
  inventory_item_brand_id: number;
  inventory_item_brand: string;
}

export interface InventoryWarehouseItemDetailDto {
  inventory_warehouse_item_id: number;
  inventory_warehouse_id: number;
  inventory_item_id: number;
  first_inventory_warehouse_order_item_id: number | null;
  order_product_id: number | null;
  scan_code: string;
  currency_id: number;
  retail_price?: number;
  item_state: InventoryItemState;
  assign_note: string | null;
  date_assigned: string | null;
  date_updated: string | null;
  date_created: string;
  warehouse: InventoryWarehouseDto;
  item: InventoryItemSummaryDto;
  created_staff?: { user_id: number; full_name: string; avatar_url: string | null } | null;
  assigned_staff?: { user_id: number; full_name: string; avatar_url: string | null } | null;
}

export interface InventoryPermissionsResponse {
  success: boolean;
  actor: {
    crmStaffId: number;
    legacyUserId: number;
    displayName: string;
    effectiveGroupId: number | null;
    effectiveStoreId: number | null;
    allowedStoreIds: number[];
    isClientConsultant: boolean;
    previewRole: InventoryRolePreviewKey | null;
    previewStoreId: number | null;
  };
  database: {
    name: string;
    isIsolatedTestDb: boolean;
  };
  permissions: Record<InventoryPermissionAction, boolean>;
  visibleScannerModes: InventoryScanMode[];
  visibleCheckStates: ('New' | 'Using')[];
}

export interface InventoryScanRequest {
  scan_code: string;
  type: InventoryScanMode | string;
  inventory_warehouse_check_id?: number | null;
  inventory_warehouse_order_id?: number | null;
  image?: string | null;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export interface InventoryScanResponse {
  success: boolean;
  scan_code_id: number;
  inventory_item: {
    id?: number;
    is_valid: '0' | '1';
    message?: string;
    inventory_warehouse_item_id?: number;
    inventory_warehouse_id?: number;
    inventory_item_id?: number;
    first_inventory_warehouse_order_item_id?: number | null;
    item_state?: InventoryItemState;
    assign_note?: string | null;
    assigned_staff?: { user_id: number; full_name: string; avatar_url: string | null } | null;
    warehouse?: InventoryWarehouseDto;
    item?: InventoryItemSummaryDto;
  };
}

export interface InventoryAssignRequest {
  inventory_warehouse_item_id: number;
  assigned_staff_id?: number | null;
  assign_note: string;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export interface InventoryAssignResponse {
  success: boolean;
  inventory_item: {
    id: number;
    message: string;
    item?: InventoryWarehouseItemDetailDto;
  };
}

export interface InventoryCheckSkuRowDto {
  inventory_warehouse_id: number;
  inventory_warehouse_item_id: number;
  inventory_item_id: number;
  first_inventory_warehouse_order_item_id: number | null;
  min_count: number | null;
  max_count: number | null;
  total_quantity: number;
  total_quantity_checked: number;
  total_retail_price?: number;
  total_retail_price_checked?: number;
  item: InventoryItemSummaryDto;
}

export interface InventoryCheckSummaryDto {
  total_quantity: number;
  total_quantity_checked: number;
  total_retail_price?: number;
  total_retail_price_checked?: number;
}

export interface InventoryCheckScanResponse {
  success: boolean;
  inventory_check: {
    inventory_warehouse_check_id: number;
    inventory_warehouse_id: number;
    item_state: 'New' | 'Using';
    check_state: InventoryCheckState;
    total_quantity: number;
    total_quantity_checked: number;
    total_quantity_using: number;
    total_quantity_lost: number;
    description: string | null;
    date_updated: string | null;
    date_created: string;
    inventory_warehouse: InventoryWarehouseDto;
    inventory_item: InventoryCheckSkuRowDto[];
    inventory_item_summary: InventoryCheckSummaryDto;
  };
}

export interface InventoryCheckPhysicalItemDto {
  inventory_warehouse_id: number;
  inventory_warehouse_item_id: number;
  inventory_item_id: number;
  first_inventory_warehouse_order_item_id: number | null;
  item_state: InventoryItemState;
  inventory_warehouse_check_item_id: number | null;
  total_quantity: number;
  total_quantity_checked: number;
  warehouse: InventoryWarehouseDto;
  item: InventoryItemSummaryDto;
}

export interface InventoryCheckItemsResponse {
  success: boolean;
  inventory_check: {
    data: InventoryCheckPhysicalItemDto[];
    page: {
      total: number;
      page: number;
      limit: number;
    };
  };
}

export interface InventoryCheckActionResponse {
  success: boolean;
  message: string;
  inventory_check: InventoryCheckScanResponse['inventory_check'];
}

export type InventoryItemHistoryEntryDto =
  | {
      kind: 'order';
      inventory_warehouse_order_item_id: number;
      inventory_warehouse_order_id: number;
      from_warehouse: { inventory_warehouse_id: number; inventory_warehouse_name: string } | null;
      to_warehouse: { inventory_warehouse_id: number; inventory_warehouse_name: string };
      created_staff: { user_id: number; full_name: string; avatar_url: string | null } | null;
      date_imported: string;
    }
  | {
      kind: 'state';
      inventory_warehouse_item_state_id: number;
      item_state: InventoryItemState;
      created_staff: { user_id: number; full_name: string; avatar_url: string | null } | null;
      date_created: string;
    }
  | {
      kind: 'assign';
      inventory_warehouse_item_assign_id: number;
      assign_note: string | null;
      assigned_staff: { user_id: number; full_name: string; avatar_url: string | null } | null;
      created_staff: { user_id: number; full_name: string; avatar_url: string | null } | null;
      date_created: string;
    }
  | {
      kind: 'check';
      inventory_warehouse_check_item_id: number;
      inventory_warehouse_check_id: number;
      is_available: number;
      is_lost: number;
      is_checked: number;
      warehouse: { inventory_warehouse_id: number; inventory_warehouse_name: string };
      created_staff: { user_id: number; full_name: string; avatar_url: string | null } | null;
      date_created: string;
    };

export interface InventoryItemHistoryResponse {
  success: boolean;
  item: InventoryWarehouseItemDetailDto | null;
  history: InventoryItemHistoryEntryDto[];
}

export interface InventoryCheckScanQuery {
  warehouseId: number;
  itemState: 'New' | 'Using';
  tab?: InventoryCheckTab;
  keyword?: string;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export interface InventorySseEventPayload {
  type: 'check-update' | 'output-assign' | 'order-add';
  timestamp: string;
  payload: Record<string, unknown>;
}
