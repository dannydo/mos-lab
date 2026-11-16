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
  IosCustomerHistoryResponse,
  IosScanProductRequest,
  IosScanProductResponse,
  IosCustomerLookupCandidate,
  IosBookingServiceCatalogItem,
  IosCreateBookingRequest,
  IosCreateBookingResponse,
  IosSimulationMenteeOption,
  IosSimulationAttemptSummary,
  IosUpdateSimulationAttemptRequest,
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
      if (typeof params?.sim === 'boolean') {
        normalizedParams.sim = params.sim ? '1' : undefined;
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

    async lookupCustomers(
      query: string,
      options?: ApiRequestOptions
    ): Promise<{
      success: boolean;
      customers: IosCustomerLookupCandidate[];
    }> {
      const res = await api.get<{ success: boolean; customers: IosCustomerLookupCandidate[] }>(
        '/ios/customers/lookup',
        {
          params: { q: query },
          signal: options?.signal,
          priority: options?.priority,
          timeout: options?.timeout,
        }
      );
      return res.data;
    },

    async getServiceCatalog(options?: ApiRequestOptions): Promise<{
      success: boolean;
      services: IosBookingServiceCatalogItem[];
    }> {
      const res = await api.get<{ success: boolean; services: IosBookingServiceCatalogItem[] }>(
        '/ios/services/catalog',
        {
          signal: options?.signal,
          priority: options?.priority,
          timeout: options?.timeout,
        }
      );
      return res.data;
    },

    async createBooking(
      payload: IosCreateBookingRequest,
      options?: ApiRequestOptions
    ): Promise<IosCreateBookingResponse> {
      const res = await api.post<IosCreateBookingResponse>('/ios/bookings/create', payload, {
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async listSimulationMentees(
      date?: string,
      options?: ApiRequestOptions
    ): Promise<{
      success: boolean;
      mentees: IosSimulationMenteeOption[];
    }> {
      const res = await api.get<{ success: boolean; mentees: IosSimulationMenteeOption[] }>('/ios/simulation/mentees', {
        params: date ? { date } : undefined,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },

    async listSimulationAttempts(
      params: { bookingId: number; menteeStaffId?: number },
      options?: ApiRequestOptions
    ): Promise<{
      success: boolean;
      attempts: IosSimulationAttemptSummary[];
    }> {
      const res = await api.get<{ success: boolean; attempts: IosSimulationAttemptSummary[] }>(
        '/ios/simulation/attempts',
        {
          params,
          signal: options?.signal,
          priority: options?.priority,
          timeout: options?.timeout,
        }
      );
      return res.data;
    },

    async updateSimulationAttempt(
      attemptId: string,
      payload: IosUpdateSimulationAttemptRequest,
      options?: ApiRequestOptions
    ): Promise<{
      success: boolean;
      attempt: IosSimulationAttemptSummary;
    }> {
      const res = await api.patch<{ success: boolean; attempt: IosSimulationAttemptSummary }>(
        `/ios/simulation/attempts/${encodeURIComponent(attemptId)}`,
        payload,
        {
          signal: options?.signal,
          priority: options?.priority,
          timeout: options?.timeout,
        }
      );
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

    async getCustomerHistory(
      customerId: number,
      params?: { bookingId?: number; sim?: boolean },
      options?: ApiRequestOptions
    ): Promise<IosCustomerHistoryResponse> {
      const res = await api.get<IosCustomerHistoryResponse>(`/ios/customers/${customerId}/history`, {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data;
    },
  },
};
