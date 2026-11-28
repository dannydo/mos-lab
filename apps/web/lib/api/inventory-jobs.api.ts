import api from '../api';
import type { ApiRequestOptions } from './base';
import type {
  InventoryAutoOrderRequest,
  InventoryJobKey,
  InventoryJobRunRequest,
  InventoryJobRunResultDto,
  InventoryJobsStatusResponse,
  InventoryRegenerateStateRequest,
  InventoryRolePreviewKey,
} from '@mos-lab/shared';

export const inventoryJobsApi = {
  async getJobsStatus(
    params?: { previewRole?: InventoryRolePreviewKey; previewStoreId?: number | null },
    options?: ApiRequestOptions
  ): Promise<InventoryJobsStatusResponse> {
    const res = await api.get<InventoryJobsStatusResponse>('/inventory/jobs', {
      params,
      signal: options?.signal,
      priority: options?.priority,
      timeout: options?.timeout,
    });
    return res.data;
  },

  async runJob(
    jobKey: InventoryJobKey,
    payload: InventoryJobRunRequest,
    options?: ApiRequestOptions
  ): Promise<{ success: boolean; result: InventoryJobRunResultDto }> {
    const res = await api.post<{ success: boolean; result: InventoryJobRunResultDto }>(
      `/inventory/jobs/${jobKey}/run`,
      payload,
      {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout ?? 90_000,
      }
    );
    return res.data;
  },

  async triggerAutoOrder(
    payload: InventoryAutoOrderRequest,
    options?: ApiRequestOptions
  ): Promise<{ success: boolean; result: InventoryJobRunResultDto }> {
    const res = await api.post<{ success: boolean; result: InventoryJobRunResultDto }>(
      '/inventory/warehouse/orders/auto',
      payload,
      {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout ?? 90_000,
      }
    );
    return res.data;
  },

  async regenerateStateReport(
    payload: InventoryRegenerateStateRequest,
    options?: ApiRequestOptions
  ): Promise<{ success: boolean; result: InventoryJobRunResultDto }> {
    const res = await api.post<{ success: boolean; result: InventoryJobRunResultDto }>(
      '/inventory/warehouse/items/state-regenerate',
      payload,
      {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout ?? 90_000,
      }
    );
    return res.data;
  },
};
