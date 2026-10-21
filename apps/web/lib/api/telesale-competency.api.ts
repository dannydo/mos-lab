import {
  type TelesaleCompetencyGlobalConfig,
  type TelesaleCompetencyEvaluation,
  type TelesaleCompetencyMatrixRow,
  type TelesaleTier,
  type TelesalePromotionHistoryItem,
} from '@mos-lab/shared';
import { api, dedupeApiGet, invalidateApiGetCache, ApiRequestOptions } from './base';

export const telesaleCompetencyApi = {
  telesaleCompetency: {
    getConfig: async (options?: ApiRequestOptions): Promise<TelesaleCompetencyGlobalConfig> => {
      const res = await dedupeApiGet<{ success: boolean; data: TelesaleCompetencyGlobalConfig }>(
        '/telesale-competency/config',
        undefined,
        10000,
        options
      );
      return res.data;
    },
    updateConfig: async (
      payload: Partial<TelesaleCompetencyGlobalConfig>
    ): Promise<TelesaleCompetencyGlobalConfig> => {
      const res = await api.put<{ success: boolean; data: TelesaleCompetencyGlobalConfig }>(
        '/telesale-competency/config',
        payload
      );
      invalidateApiGetCache(['/telesale-competency/']);
      return res.data.data;
    },
    getTeamMatrix: async (
      month?: string,
      options?: ApiRequestOptions
    ): Promise<TelesaleCompetencyMatrixRow[]> => {
      const params = month ? { month } : undefined;
      const res = await dedupeApiGet<{ success: boolean; data: TelesaleCompetencyMatrixRow[] }>(
        '/telesale-competency/matrix',
        params,
        3000,
        options
      );
      return res.data;
    },
    getEvaluation: async (
      staffId: number,
      month?: string,
      options?: ApiRequestOptions
    ): Promise<TelesaleCompetencyEvaluation> => {
      const params: Record<string, string> = { staffId: String(staffId) };
      if (month) params.month = month;
      const res = await dedupeApiGet<{ success: boolean; data: TelesaleCompetencyEvaluation }>(
        '/telesale-competency/evaluation',
        params,
        2000,
        options
      );
      return res.data;
    },
    saveEvaluation: async (payload: {
      staffId: number;
      month: string;
      pillarB: any;
      pillarC: any;
      pillarD: any;
    }): Promise<TelesaleCompetencyEvaluation> => {
      const res = await api.post<{ success: boolean; data: TelesaleCompetencyEvaluation }>(
        '/telesale-competency/evaluation',
        payload
      );
      invalidateApiGetCache(['/telesale-competency/']);
      return res.data.data;
    },
    executeAction: async (payload: {
      staffId: number;
      action: 'PROMOTED' | 'DEMOTED' | 'RETAINED';
      toTier: TelesaleTier;
      reason?: string;
      effectiveMonth?: string;
    }): Promise<{ success: boolean; newTier: TelesaleTier; message: string }> => {
      const res = await api.post<{ success: boolean; data: any; message: string }>(
        '/telesale-competency/action',
        payload
      );
      invalidateApiGetCache(['/telesale-competency/']);
      return res.data.data;
    },
    getPromotionHistory: async (
      staffId: number,
      options?: ApiRequestOptions
    ): Promise<TelesalePromotionHistoryItem[]> => {
      const res = await dedupeApiGet<{ success: boolean; data: TelesalePromotionHistoryItem[] }>(
        '/telesale-competency/history',
        { staffId: String(staffId) },
        5000,
        options
      );
      return res.data;
    },
  },
};
