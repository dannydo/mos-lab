import { api, ApiRequestOptions } from './base';
import type {
  IosBookingListQuery,
  IosBookingListResponse,
  IosBookingActionPayload,
  IosBookingActionResponse,
  IosPrintReceiptPayload,
  IosPrintReceiptResponse,
  IosPromotionOption,
  IosAdminComboExpiryActionPayload,
  IosAdminComboExpiryActionResponse,
  IosScanProductRequest,
  IosScanProductResponse,
} from '@mos-lab/shared';

export interface IosPromotionsResponse {
  success: boolean;
  canViewGlobalPromotions?: boolean;
  count?: number;
  promotions: IosPromotionOption[];
  error?: string;
}

export const iosApi = {
  ios: {
    async getPromotions(
      params?: { role?: string; keyword?: string },
      options?: ApiRequestOptions
    ): Promise<IosPromotionsResponse> {
      const res = await api.get<IosPromotionsResponse>('/ios/promotions', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async getBookings(params?: IosBookingListQuery, options?: ApiRequestOptions): Promise<IosBookingListResponse> {
      const normalizedParams: Record<string, unknown> = { ...(params ?? {}) };
      if (typeof params?.demo === 'boolean') {
        normalizedParams.demo = params.demo ? '1' : undefined;
      }
      const res = await api.get<IosBookingListResponse>('/ios/bookings', {
        params: normalizedParams,
        signal: options?.signal,
        isPolling: options?.isPolling,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async executeBookingAction(
      payload: IosBookingActionPayload,
      options?: ApiRequestOptions
    ): Promise<IosBookingActionResponse> {
      const res = await api.post<IosBookingActionResponse>('/ios/bookings', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async printReceipt(payload: IosPrintReceiptPayload, options?: ApiRequestOptions): Promise<IosPrintReceiptResponse> {
      const res = await api.post<IosPrintReceiptResponse>('/ios/print-receipt', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout ?? 8000,
      });
      return res.data;
    },

    async scanProduct(payload: IosScanProductRequest, options?: ApiRequestOptions): Promise<IosScanProductResponse> {
      const res = await api.post<IosScanProductResponse>('/ios/products/scan', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout ?? 10000,
      });
      return res.data;
    },

    async updateComboBalanceExpiry(
      payload: IosAdminComboExpiryActionPayload,
      options?: ApiRequestOptions
    ): Promise<IosAdminComboExpiryActionResponse> {
      const res = await api.post<IosAdminComboExpiryActionResponse>('/ios/combo-balances/expiry', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },
  },
};
