import type { CashAccount, CashFlowEntry, CashFlowEntryListQuery, CashFlowForecastResponse } from '@mos-lab/shared';
import { api } from './base';

export const cashFlowApi = {
  cashFlow: {
    getForecast: async (params?: {
      startDate?: string;
      endDate?: string;
      storeId?: number | string;
      accountId?: number | string;
    }): Promise<{ success: boolean; data: CashFlowForecastResponse }> => {
      const response = await api.get('/cash-flow/forecast', { params });
      return response.data;
    },

    listEntries: async (
      params?: CashFlowEntryListQuery
    ): Promise<{
      success: boolean;
      data: {
        items: CashFlowEntry[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }> => {
      const response = await api.get('/cash-flow/entries', { params });
      return response.data;
    },

    createEntry: async (data: Partial<CashFlowEntry>): Promise<{ success: boolean; data: CashFlowEntry }> => {
      const response = await api.post('/cash-flow/entries', data);
      return response.data;
    },

    updateEntry: async (
      id: number,
      data: Partial<CashFlowEntry>
    ): Promise<{ success: boolean; data: CashFlowEntry }> => {
      const response = await api.put(`/cash-flow/entries/${id}`, data);
      return response.data;
    },

    deleteEntry: async (id: number): Promise<{ success: boolean; message: string }> => {
      const response = await api.delete(`/cash-flow/entries/${id}`);
      return response.data;
    },

    listAccounts: async (): Promise<{ success: boolean; data: CashAccount[] }> => {
      const response = await api.get('/cash-flow/accounts');
      return response.data;
    },

    updateAccount: async (
      id: number,
      data: {
        initialBalance?: number;
        currentBalance?: number;
        minSafetyThreshold?: number;
        notes?: string;
      }
    ): Promise<{ success: boolean; data: CashAccount }> => {
      const response = await api.put(`/cash-flow/accounts/${id}`, data);
      return response.data;
    },

    exportCsv: async (params?: { startDate?: string; endDate?: string; storeId?: number | string }): Promise<Blob> => {
      const response = await api.get('/cash-flow/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    },
  },
};
