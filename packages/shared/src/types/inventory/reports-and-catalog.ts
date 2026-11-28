import type { InventoryCheckState, InventoryItemState, InventoryItemType, InventoryWarehouseType } from './enums.js';
import type { InventoryRolePreviewKey } from './permissions.js';
import type {
  InventoryItemSummaryDto,
  InventoryWarehouseDto,
  InventoryWarehouseItemDetailDto,
} from './scan-and-check.js';

export type InventoryLifecycleMode =
  'start' | 'input' | 'new' | 'using' | 'used' | 'lost' | 'broken' | 'output' | 'end';

export interface InventoryLifecycleCounters {
  total_quantity_start: number;
  total_quantity_input: number;
  total_quantity_input_main: number;
  total_quantity_input_other: number;
  total_quantity_input_supplier: number;
  total_quantity_new: number;
  total_quantity_using: number;
  total_quantity_used: number;
  total_quantity_lost: number;
  total_quantity_broken: number;
  total_quantity_output: number;
  total_quantity_output_main: number;
  total_quantity_output_other: number;
  total_quantity_output_supplier: number;
  total_quantity_output_return: number;
  total_quantity_output_destroy: number;
  total_quantity_end: number;
  total_retail_price_start?: number;
  total_retail_price_input?: number;
  total_retail_price_input_main?: number;
  total_retail_price_input_other?: number;
  total_retail_price_input_supplier?: number;
  total_retail_price_new?: number;
  total_retail_price_using?: number;
  total_retail_price_used?: number;
  total_retail_price_lost?: number;
  total_retail_price_broken?: number;
  total_retail_price_output?: number;
  total_retail_price_output_main?: number;
  total_retail_price_output_other?: number;
  total_retail_price_output_supplier?: number;
  total_retail_price_output_return?: number;
  total_retail_price_output_destroy?: number;
  total_retail_price_end?: number;
}

export function isInventoryLifecycleEndValid(
  row: Pick<
    InventoryLifecycleCounters,
    | 'total_quantity_start'
    | 'total_quantity_input'
    | 'total_quantity_used'
    | 'total_quantity_lost'
    | 'total_quantity_broken'
    | 'total_quantity_output'
    | 'total_quantity_end'
  >
): boolean {
  const start = Number(row.total_quantity_start || 0) + Number(row.total_quantity_input || 0);
  const used =
    Number(row.total_quantity_used || 0) +
    Number(row.total_quantity_lost || 0) +
    Number(row.total_quantity_broken || 0) +
    Number(row.total_quantity_output || 0);
  return start - used === Number(row.total_quantity_end || 0);
}

export interface InventoryLifecycleRowDto extends InventoryLifecycleCounters {
  inventory_warehouse_id: number;
  inventory_item_id: number;
  last_retail_price?: number;
  forecast_month: number;
  warehouse: InventoryWarehouseDto;
  item: InventoryItemSummaryDto;
}

export interface InventoryLifecycleResponse {
  success: boolean;
  data: InventoryLifecycleRowDto[];
  summary: InventoryLifecycleCounters;
  page: { total: number; page: number; limit: number };
}

export interface InventoryWarehouseItemsListResponse {
  success: boolean;
  data: InventoryWarehouseItemDetailDto[];
  page: { total: number; page: number; limit: number };
}

export interface InventoryItemLimitRowDto {
  inventory_warehouse_item_limit_id: number | null;
  inventory_warehouse_id: number | null;
  inventory_item_id: number;
  item_state: 'New' | 'Using';
  min_count: number | null;
  max_count: number | null;
  last_max_count: number | null;
  limit_count_standard: number | null;
  item: InventoryItemSummaryDto;
  warehouse: InventoryWarehouseDto | null;
}

export interface InventoryItemLimitsResponse {
  success: boolean;
  data: InventoryItemLimitRowDto[];
  page: { total: number; page: number; limit: number };
}

export interface InventoryItemLimitUpdateRequest {
  inventory_warehouse_item_limit_id?: number | null;
  inventory_warehouse_id: number;
  inventory_item_id: number;
  item_state: 'New' | 'Using';
  min_count: number;
  max_count: number;
  limit_count_standard: number;
  is_disabled?: boolean;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export interface InventoryStaffBriefDto {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
}

export interface InventoryCheckRecordDto {
  inventory_warehouse_check_id: number;
  inventory_warehouse_id: number;
  item_state: 'New' | 'Using';
  check_state: InventoryCheckState;
  total_quantity: number;
  total_quantity_checked: number;
  total_quantity_using: number;
  total_quantity_lost: number;
  total_retail_price?: number;
  total_retail_price_checked?: number;
  description: string | null;
  date_created: string;
  date_checked: string | null;
  date_completed: string | null;
  date_cancelled: string | null;
  warehouse: InventoryWarehouseDto;
  created_staff: InventoryStaffBriefDto | null;
  checked_staff: InventoryStaffBriefDto | null;
  completed_staff: InventoryStaffBriefDto | null;
  cancelled_staff: InventoryStaffBriefDto | null;
}

export interface InventoryChecksListResponse {
  success: boolean;
  data: InventoryCheckRecordDto[];
  page: { total: number; page: number; limit: number };
}

export interface InventoryScanLogRowDto {
  user_scan_code_id: number;
  method: string;
  type: string;
  item_id: number | null;
  scan_code: string;
  is_valid: boolean;
  date_created: string;
  has_image: boolean;
  image_url: string | null;
  user: { user_id: number; full_name: string } | null;
  client_store: { client_store_id: number; store_name: string } | null;
}

export interface InventoryScanLogsResponse {
  success: boolean;
  data: InventoryScanLogRowDto[];
  page: { total: number; page: number; limit: number };
}

export interface InventoryBrandDto {
  inventory_item_brand_id: number;
  inventory_item_brand: string;
  is_temporary: boolean;
  position: number;
  date_created: string;
}

export interface InventoryCatalogItemDto {
  inventory_item_id: number;
  inventory_item_code: string;
  inventory_item_type: InventoryItemType;
  inventory_item_unit: string;
  inventory_item_name: string;
  inventory_item_attribute: string | null;
  inventory_item_description: string | null;
  inventory_item_brand_id: number;
  inventory_item_brand: string;
  is_used_ignored: boolean;
  is_disabled: boolean;
  date_created: string;
}

export interface InventoryCatalogItemsResponse {
  success: boolean;
  data: InventoryCatalogItemDto[];
  page: { total: number; page: number; limit: number };
}

export interface InventoryCatalogBrandsResponse {
  success: boolean;
  data: InventoryBrandDto[];
  page: { total: number; page: number; limit: number };
}

export interface InventoryStoreOptionDto {
  client_store_id: number;
  store_name: string;
}

export interface InventorySaveItemRequest {
  inventory_item_id?: number;
  inventory_item_name: string;
  inventory_item_code?: string;
  inventory_item_type: InventoryItemType;
  inventory_item_unit: string;
  inventory_item_brand_id: number;
  inventory_item_attribute?: string | null;
  inventory_item_description?: string | null;
  is_used_ignored?: boolean;
  is_disabled?: boolean;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export interface InventorySaveBrandRequest {
  inventory_item_brand_id?: number;
  inventory_item_brand: string;
  is_temporary?: boolean;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export interface InventorySaveWarehouseRequest {
  inventory_warehouse_id?: number;
  client_store_id?: number | null;
  inventory_warehouse_name: string;
  inventory_warehouse_phone_number?: string | null;
  inventory_warehouse_address?: string | null;
  inventory_warehouse_type: InventoryWarehouseType;
  is_check_needed?: boolean;
  is_disabled?: boolean;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export type InventoryAssetStateFilter =
  'ALL' | Extract<InventoryItemState, 'New' | 'Using' | 'Used' | 'Lost' | 'Broken'>;
