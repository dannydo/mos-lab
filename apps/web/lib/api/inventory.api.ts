import api, { resolveMediaUrl } from '../api';
import type { ApiRequestOptions } from './base';
import { inventoryJobsApi } from './inventory-jobs.api';
import { inventoryOrdersApi } from './inventory-orders.api';
import type {
  InventoryAssignRequest,
  InventoryAssignResponse,
  InventoryCatalogBrandsResponse,
  InventoryCatalogItemsResponse,
  InventoryCheckActionResponse,
  InventoryCheckItemsResponse,
  InventoryChecksListResponse,
  InventoryCheckScanQuery,
  InventoryCheckScanResponse,
  InventoryCheckState,
  InventoryItemHistoryResponse,
  InventoryItemLimitsResponse,
  InventoryItemLimitUpdateRequest,
  InventoryItemState,
  InventoryItemType,
  InventoryLifecycleMode,
  InventoryLifecycleResponse,
  InventoryPermissionsResponse,
  InventoryRolePreviewKey,
  InventorySaveBrandRequest,
  InventorySaveItemRequest,
  InventorySaveWarehouseRequest,
  InventoryScanLogsResponse,
  InventoryScanRequest,
  InventoryScanResponse,
  InventoryStaffOptionDto,
  InventoryStoreOptionDto,
  InventoryWarehouseDto,
  InventoryWarehouseItemsListResponse,
} from '@mos-lab/shared';

export const inventoryApi = {
  inventory: {
    async getPermissions(
      params?: { previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
      options?: ApiRequestOptions
    ): Promise<InventoryPermissionsResponse> {
      const res = await api.get<InventoryPermissionsResponse>('/inventory/me/permissions', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async getWarehouses(
      params?: {
        isInternalWarehouse?: boolean;
        scopedByStore?: boolean;
        includeDisabled?: boolean;
        keyword?: string;
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; warehouses: InventoryWarehouseDto[] }> {
      const res = await api.get<{ success: boolean; warehouses: InventoryWarehouseDto[] }>('/inventory/warehouses', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async getOnboardStaff(
      params?: { keyword?: string; previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; staff: InventoryStaffOptionDto[] }> {
      const res = await api.get<{ success: boolean; staff: InventoryStaffOptionDto[] }>('/inventory/staff/onboard', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async scanCode(payload: InventoryScanRequest, options?: ApiRequestOptions): Promise<InventoryScanResponse> {
      const res = await api.post<InventoryScanResponse>('/inventory/scan/code', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async assignItem(payload: InventoryAssignRequest, options?: ApiRequestOptions): Promise<InventoryAssignResponse> {
      const res = await api.post<InventoryAssignResponse>('/inventory/warehouse/item/assign', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async getCheckScan(
      params: InventoryCheckScanQuery,
      options?: ApiRequestOptions
    ): Promise<InventoryCheckScanResponse> {
      const res = await api.get<InventoryCheckScanResponse>('/inventory/warehouse/check/scan', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async getCheckItems(
      params: {
        checkId: number;
        inventoryItemId: number;
        keyword?: string;
        page?: number;
        limit?: number;
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<InventoryCheckItemsResponse> {
      const res = await api.get<InventoryCheckItemsResponse>('/inventory/warehouse/check/items', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async finishCheck(
      payload: {
        checkId?: number;
        warehouseId?: number;
        itemState?: 'New' | 'Using';
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<InventoryCheckActionResponse> {
      const res = await api.post<InventoryCheckActionResponse>('/inventory/warehouse/check/finish', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async resetCheck(
      payload: {
        checkId?: number;
        warehouseId?: number;
        itemState?: 'New' | 'Using';
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<InventoryCheckActionResponse> {
      const res = await api.post<InventoryCheckActionResponse>('/inventory/warehouse/check/reset', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async getItemHistory(
      warehouseItemId: number,
      params?: { previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
      options?: ApiRequestOptions
    ): Promise<InventoryItemHistoryResponse> {
      const res = await api.get<InventoryItemHistoryResponse>(`/inventory/warehouse/item/${warehouseItemId}/history`, {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    getScanMediaUrl(scanCodeId: number): string {
      return resolveMediaUrl(`/api/inventory/media/scan/${scanCodeId}`);
    },

    async getLifecycle(
      params?: {
        inventoryItemType?: InventoryItemType;
        warehouseIds?: number[];
        dateFrom?: string;
        dateTo?: string;
        forecastMonth?: string;
        keyword?: string;
        page?: number;
        limit?: number;
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<InventoryLifecycleResponse> {
      const res = await api.get<InventoryLifecycleResponse>('/inventory/warehouse/items/lifecycle', {
        params: {
          ...params,
          warehouseIds: params?.warehouseIds?.length ? params.warehouseIds.join(',') : undefined,
        },
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async getWarehouseItems(
      params?: {
        itemMode?: InventoryLifecycleMode;
        warehouseIds?: number[];
        inventoryItemId?: number;
        inventoryItemType?: InventoryItemType;
        itemState?: InventoryItemState;
        isAssignedStaff?: boolean;
        keyword?: string;
        dateFrom?: string;
        dateTo?: string;
        page?: number;
        limit?: number;
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<InventoryWarehouseItemsListResponse> {
      const res = await api.get<InventoryWarehouseItemsListResponse>('/inventory/warehouse/items', {
        params: {
          ...params,
          warehouseIds: params?.warehouseIds?.length ? params.warehouseIds.join(',') : undefined,
        },
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async getLimits(
      params?: {
        warehouseId?: number;
        itemState?: 'New' | 'Using';
        inventoryItemType?: InventoryItemType;
        keyword?: string;
        page?: number;
        limit?: number;
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<InventoryItemLimitsResponse> {
      const res = await api.get<InventoryItemLimitsResponse>('/inventory/warehouse/limits', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async saveLimit(
      payload: InventoryItemLimitUpdateRequest,
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; inventory_warehouse_item_limit_id: number }> {
      const res = await api.post<{ success: boolean; inventory_warehouse_item_limit_id: number }>(
        '/inventory/warehouse/limits',
        payload,
        {
          signal: options?.signal,
          priority: options?.priority,
          timeout: options?.timeout,
        }
      );
      return res.data;
    },

    async getChecks(
      params?: {
        warehouseId?: number;
        itemState?: 'New' | 'Using';
        checkState?: InventoryCheckState;
        page?: number;
        limit?: number;
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<InventoryChecksListResponse> {
      const res = await api.get<InventoryChecksListResponse>('/inventory/warehouse/checks', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async completeCheck(
      checkId: number,
      payload?: { previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; check_state: InventoryCheckState }> {
      const res = await api.post<{ success: boolean; check_state: InventoryCheckState }>(
        `/inventory/warehouse/check/${checkId}/complete`,
        payload || {},
        {
          signal: options?.signal,
          priority: options?.priority,
          timeout: options?.timeout,
        }
      );
      return res.data;
    },

    async cancelCheck(
      checkId: number,
      payload?: { previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; check_state: InventoryCheckState }> {
      const res = await api.post<{ success: boolean; check_state: InventoryCheckState }>(
        `/inventory/warehouse/check/${checkId}/cancel`,
        payload || {},
        {
          signal: options?.signal,
          priority: options?.priority,
          timeout: options?.timeout,
        }
      );
      return res.data;
    },

    async getScanLogs(
      params?: {
        dateFrom?: string;
        dateTo?: string;
        method?: 'Camera' | 'Keyboard' | string;
        clientStoreId?: number;
        isValid?: boolean;
        keyword?: string;
        page?: number;
        limit?: number;
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<InventoryScanLogsResponse> {
      const res = await api.get<InventoryScanLogsResponse>('/inventory/scan-logs', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async getCatalogItems(
      params?: {
        inventoryItemType?: InventoryItemType;
        keyword?: string;
        includeDisabled?: boolean;
        page?: number;
        limit?: number;
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<InventoryCatalogItemsResponse> {
      const res = await api.get<InventoryCatalogItemsResponse>('/inventory/catalog/items', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async saveCatalogItem(
      payload: InventorySaveItemRequest,
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; inventory_item_id: number }> {
      const res = await api.post<{ success: boolean; inventory_item_id: number }>('/inventory/catalog/items', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async getCatalogBrands(
      params?: {
        keyword?: string;
        page?: number;
        limit?: number;
        previewRole?: InventoryRolePreviewKey;
        previewStoreId?: number | null;
      },
      options?: ApiRequestOptions
    ): Promise<InventoryCatalogBrandsResponse> {
      const res = await api.get<InventoryCatalogBrandsResponse>('/inventory/catalog/brands', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async saveCatalogBrand(
      payload: InventorySaveBrandRequest,
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; inventory_item_brand_id: number }> {
      const res = await api.post<{ success: boolean; inventory_item_brand_id: number }>(
        '/inventory/catalog/brands',
        payload,
        {
          signal: options?.signal,
          priority: options?.priority,
          timeout: options?.timeout,
        }
      );
      return res.data;
    },

    async saveCatalogWarehouse(
      payload: InventorySaveWarehouseRequest,
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; warehouse: InventoryWarehouseDto }> {
      const res = await api.post<{ success: boolean; warehouse: InventoryWarehouseDto }>(
        '/inventory/catalog/warehouses',
        payload,
        {
          signal: options?.signal,
          priority: options?.priority,
          timeout: options?.timeout,
        }
      );
      return res.data;
    },

    async getStores(
      params?: { previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; stores: InventoryStoreOptionDto[] }> {
      const res = await api.get<{ success: boolean; stores: InventoryStoreOptionDto[] }>('/inventory/stores', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    ...inventoryOrdersApi,
    ...inventoryJobsApi,
  },
};
