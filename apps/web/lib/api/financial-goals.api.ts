import { FinancialGoalsConfigDto, FinancialGoalsOverview } from '@mos-lab/shared';
import { api } from './base';

export const financialGoalsApi = {
  financialGoals: {
    getOverview: async (month?: string): Promise<FinancialGoalsOverview> => {
      const response = await api.get<{ success: boolean; data: FinancialGoalsOverview }>('/kpi/financial-goals', {
        params: { month },
      });
      return response.data.data;
    },
    getMonths: async (): Promise<string[]> => {
      const response = await api.get<{ success: boolean; months: string[] }>('/kpi/financial-goals/months');
      return response.data.months;
    },
    getConfig: async (month: string): Promise<FinancialGoalsConfigDto> => {
      const response = await api.get<{ success: boolean; config: FinancialGoalsConfigDto }>(
        '/kpi/financial-goals/config',
        {
          params: { month },
        }
      );
      return response.data.config;
    },
    saveConfig: async (
      data: FinancialGoalsConfigDto
    ): Promise<{ success: boolean; config: FinancialGoalsConfigDto }> => {
      const response = await api.post<{ success: boolean; config: FinancialGoalsConfigDto }>(
        '/kpi/financial-goals/config',
        data
      );
      return response.data;
    },
  },
};
