import { api, ApiRequestOptions } from './base';
import type {
  WingsGardenActionRequest,
  WingsGardenActionResponse,
  WingsGardenLegacyQrLookup,
  WingsGardenPreviewRole,
  WingsGardenStateResponse,
  WingsGardenWarehouseId,
} from '@mos-lab/shared';

export const wingsGardenApi = {
  wingsGarden: {
    async getState(
      params: { warehouseId: WingsGardenWarehouseId; previewRole?: WingsGardenPreviewRole },
      options?: ApiRequestOptions
    ): Promise<WingsGardenStateResponse> {
      const res = await api.get<WingsGardenStateResponse>('/wings-garden/state', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async lookupQr(
      params: { code: string; warehouseId: WingsGardenWarehouseId },
      options?: ApiRequestOptions
    ): Promise<{ success: boolean; lookup: WingsGardenLegacyQrLookup; error?: string }> {
      const res = await api.get<{ success: boolean; lookup: WingsGardenLegacyQrLookup; error?: string }>(
        '/wings-garden/qr/lookup',
        {
          params,
          signal: options?.signal,
          priority: options?.priority,
          timeout: options?.timeout,
        }
      );
      return res.data;
    },

    async executeAction(
      payload: WingsGardenActionRequest,
      options?: ApiRequestOptions
    ): Promise<WingsGardenActionResponse> {
      const res = await api.post<WingsGardenActionResponse>('/wings-garden/actions', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },
  },
};
