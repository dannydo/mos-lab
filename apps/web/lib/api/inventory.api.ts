import api, { resolveMediaUrl } from '../api';
import type { ApiRequestOptions } from './base';
import type {
  InventoryAssignRequest,
  InventoryAssignResponse,
  InventoryCheckActionResponse,
  InventoryCheckItemsResponse,
  InventoryCheckScanQuery,
  InventoryCheckScanResponse,
  InventoryItemHistoryResponse,
  InventoryPermissionsResponse,
  InventoryRolePreviewKey,
  InventoryScanRequest,
  InventoryScanResponse,
  InventoryStaffOptionDto,
  InventoryWarehouseDto,
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
  },
};
