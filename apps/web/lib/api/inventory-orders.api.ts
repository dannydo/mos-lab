import api, { resolveApiBaseUrl } from '../api';
import { safeStorage } from '../safe-storage';
import type { ApiRequestOptions } from './base';
import type {
  InventoryCheckPrintResponse,
  InventoryItemStockMapResponse,
  InventoryItemType,
  InventoryOrderActionPayload,
  InventoryOrderDetailResponse,
  InventoryOrderItemsListResponse,
  InventoryOrderLookupStockRequest,
  InventoryOrdersListResponse,
  InventoryPrintLabelsResponse,
  InventoryRolePreviewKey,
  InventorySaveOrderRequest,
  InventoryWarehouseReportPrintResponse,
} from '@mos-lab/shared';

export const inventoryOrdersApi = {
  async getOrders(
    params?: {
      tab?: 'pending' | 'completed' | 'all';
      warehouseIds?: number[];
      dateFrom?: string;
      dateTo?: string;
      keyword?: string;
      page?: number;
      limit?: number;
      previewRole?: InventoryRolePreviewKey;
      previewStoreId?: number | null;
    },
    options?: ApiRequestOptions
  ): Promise<InventoryOrdersListResponse> {
    const res = await api.get<InventoryOrdersListResponse>('/inventory/warehouse/orders', {
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

  async getMergeOrdersPreview(
    orderIds: number[],
    params?: { previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
    options?: ApiRequestOptions
  ): Promise<InventoryOrderDetailResponse> {
    const res = await api.get<InventoryOrderDetailResponse>('/inventory/warehouse/orders/merge-preview', {
      params: { orderIds: orderIds.join(','), ...params },
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async getOrderDetail(
    orderId: number,
    params?: {
      mode?: 'assign' | 'check' | 'edit' | 'forward' | 'missing' | 'print-invoice';
      keyword?: string;
      previewRole?: InventoryRolePreviewKey;
      previewStoreId?: number | null;
    },
    options?: ApiRequestOptions
  ): Promise<InventoryOrderDetailResponse> {
    const res = await api.get<InventoryOrderDetailResponse>(`/inventory/warehouse/orders/${orderId}`, {
      params,
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async getOrderPhysicalItems(
    orderId: number,
    params?: {
      inventoryItemId?: number;
      keyword?: string;
      page?: number;
      limit?: number;
      previewRole?: InventoryRolePreviewKey;
      previewStoreId?: number | null;
    },
    options?: ApiRequestOptions
  ): Promise<InventoryOrderItemsListResponse> {
    const res = await api.get<InventoryOrderItemsListResponse>(`/inventory/warehouse/orders/${orderId}/items`, {
      params,
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async saveOrder(
    payload: InventorySaveOrderRequest,
    options?: ApiRequestOptions
  ): Promise<InventoryOrderDetailResponse> {
    const res = await api.post<InventoryOrderDetailResponse>('/inventory/warehouse/orders', payload, {
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async approveOrder(
    orderId: number,
    payload?: InventoryOrderActionPayload,
    options?: ApiRequestOptions
  ): Promise<InventoryOrderDetailResponse> {
    const res = await api.post<InventoryOrderDetailResponse>(
      `/inventory/warehouse/orders/${orderId}/approve`,
      payload || {},
      { signal: options?.signal, priority: options?.priority, timeout: options?.timeout }
    );
    return res.data;
  },

  async rejectOrder(
    orderId: number,
    payload: InventoryOrderActionPayload & { reject_reason: string },
    options?: ApiRequestOptions
  ): Promise<InventoryOrderDetailResponse> {
    const res = await api.post<InventoryOrderDetailResponse>(`/inventory/warehouse/orders/${orderId}/reject`, payload, {
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async assignOrder(
    orderId: number,
    payload?: InventoryOrderActionPayload,
    options?: ApiRequestOptions
  ): Promise<InventoryOrderDetailResponse> {
    const res = await api.post<InventoryOrderDetailResponse>(
      `/inventory/warehouse/orders/${orderId}/assign`,
      payload || {},
      { signal: options?.signal, priority: options?.priority, timeout: options?.timeout }
    );
    return res.data;
  },

  async finishOrder(
    orderId: number,
    payload?: InventoryOrderActionPayload,
    options?: ApiRequestOptions
  ): Promise<InventoryOrderDetailResponse> {
    const res = await api.post<InventoryOrderDetailResponse>(
      `/inventory/warehouse/orders/${orderId}/finish`,
      payload || {},
      { signal: options?.signal, priority: options?.priority, timeout: options?.timeout }
    );
    return res.data;
  },

  async cancelOrder(
    orderId: number,
    payload?: InventoryOrderActionPayload,
    options?: ApiRequestOptions
  ): Promise<InventoryOrderDetailResponse> {
    const res = await api.post<InventoryOrderDetailResponse>(
      `/inventory/warehouse/orders/${orderId}/cancel`,
      payload || {},
      { signal: options?.signal, priority: options?.priority, timeout: options?.timeout }
    );
    return res.data;
  },

  async selectActiveOrder(
    orderId: number,
    payload?: InventoryOrderActionPayload,
    options?: ApiRequestOptions
  ): Promise<{ success: boolean; selected_order_id: number }> {
    const res = await api.post<{ success: boolean; selected_order_id: number }>(
      `/inventory/warehouse/orders/${orderId}/select`,
      payload || {},
      { signal: options?.signal, priority: options?.priority, timeout: options?.timeout }
    );
    return res.data;
  },

  async checkAllOrderItems(
    orderId: number,
    payload?: InventoryOrderActionPayload,
    options?: ApiRequestOptions
  ): Promise<InventoryOrderDetailResponse> {
    const res = await api.post<InventoryOrderDetailResponse>(
      `/inventory/warehouse/orders/${orderId}/input-all`,
      payload || {},
      { signal: options?.signal, priority: options?.priority, timeout: options?.timeout }
    );
    return res.data;
  },

  async importOrderItems(
    orderId: number,
    payload?: InventoryOrderActionPayload,
    options?: ApiRequestOptions
  ): Promise<InventoryOrderDetailResponse> {
    const res = await api.post<InventoryOrderDetailResponse>(
      `/inventory/warehouse/orders/${orderId}/import`,
      payload || {},
      { signal: options?.signal, priority: options?.priority, timeout: options?.timeout }
    );
    return res.data;
  },

  async deleteOrderItem(
    payload: {
      inventory_warehouse_order_item_id?: number;
      inventory_warehouse_order_id?: number;
      inventory_item_id?: number;
      previewRole?: InventoryRolePreviewKey;
      previewStoreId?: number | null;
    },
    options?: ApiRequestOptions
  ): Promise<{ success: boolean }> {
    const res = await api.post<{ success: boolean }>('/inventory/warehouse/orders/item/delete', payload, {
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async addOrderItemQuantity(
    payload: {
      inventory_warehouse_order_item_id: number;
      quantity: number;
      previewRole?: InventoryRolePreviewKey;
      previewStoreId?: number | null;
    },
    options?: ApiRequestOptions
  ): Promise<{ success: boolean; quantity: number; retail_price: number }> {
    const res = await api.post<{ success: boolean; quantity: number; retail_price: number }>(
      '/inventory/warehouse/orders/item/add-quantity',
      payload,
      { signal: options?.signal, priority: options?.priority, timeout: options?.timeout }
    );
    return res.data;
  },

  async getWarehouseItemStocks(
    payload: InventoryOrderLookupStockRequest,
    options?: ApiRequestOptions
  ): Promise<InventoryItemStockMapResponse> {
    const res = await api.post<InventoryItemStockMapResponse>('/inventory/warehouse/items/stocks', payload, {
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async lookupScanCodeByLotId(
    firstOrderItemId: number,
    params?: { previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
    options?: ApiRequestOptions
  ): Promise<{ success: boolean; scan_code: string | null }> {
    const res = await api.get<{ success: boolean; scan_code: string | null }>(
      '/inventory/warehouse/items/lookup-scan-code',
      {
        params: { firstOrderItemId, ...params },
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      }
    );
    return res.data;
  },

  async getOrderPrintLabels(
    orderId: number,
    params?: { itemId?: number; previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
    options?: ApiRequestOptions
  ): Promise<InventoryPrintLabelsResponse> {
    const res = await api.get<InventoryPrintLabelsResponse>(`/inventory/print/order/${orderId}/labels`, {
      params,
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async getItemPrintLabels(
    ids: number[],
    params?: { previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
    options?: ApiRequestOptions
  ): Promise<InventoryPrintLabelsResponse> {
    const res = await api.get<InventoryPrintLabelsResponse>('/inventory/print/items/labels', {
      params: { ids: ids.join(','), ...params },
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async getCheckPrintData(
    checkId: number,
    params?: { isLost?: boolean; previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
    options?: ApiRequestOptions
  ): Promise<InventoryCheckPrintResponse> {
    const res = await api.get<InventoryCheckPrintResponse>(`/inventory/print/check/${checkId}`, {
      params: { ...params, isLost: params?.isLost ? '1' : undefined },
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async getWarehouseReportPrint(
    params?: {
      warehouseId?: number;
      inventoryItemType?: InventoryItemType;
      dateFrom?: string;
      dateTo?: string;
      keyword?: string;
      previewRole?: InventoryRolePreviewKey;
      previewStoreId?: number | null;
    },
    options?: ApiRequestOptions
  ): Promise<InventoryWarehouseReportPrintResponse> {
    const res = await api.get<InventoryWarehouseReportPrintResponse>('/inventory/print/warehouse-report', {
      params,
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  getSseEventsUrl(params?: { previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null }): string {
    const base = resolveApiBaseUrl();
    const qs = new URLSearchParams();
    if (typeof window !== 'undefined') {
      const token = safeStorage.getItem('mos_token');
      if (token) qs.set('token', token);
    }
    if (params?.previewRole) qs.set('previewRole', params.previewRole);
    if (params?.previewStoreId) qs.set('previewStoreId', String(params.previewStoreId));
    const qStr = qs.toString();
    return `${base}/inventory/events${qStr ? `?${qStr}` : ''}`;
  },
};
