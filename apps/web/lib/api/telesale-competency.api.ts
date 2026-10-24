import {
  type TelesaleCompetencyGlobalConfig,
  type TelesaleCompetencyEvaluation,
  type TelesaleCompetencyMatrixRow,
  type TelesaleTier,
  type TelesalePromotionHistoryItem,
  type TelesaleCompetencyConfigVersion,
  type TelesaleConfigValidationResult,
  type TelesaleConfigPreviewResult,
} from '@mos-lab/shared';
import { api, dedupeApiGet, invalidateApiGetCache, ApiRequestOptions } from './base';

export const telesaleCompetencyApi = {
  telesaleCompetency: {
    // -------------------------------------------------------------
    // Quản Lý Phiên Bản Cấu Hình (MOS-FEAT-142)
    // -------------------------------------------------------------
    listConfigVersions: async (options?: ApiRequestOptions): Promise<TelesaleCompetencyConfigVersion[]> => {
      const res = await dedupeApiGet<{ success: boolean; data: TelesaleCompetencyConfigVersion[] }>(
        '/telesale-competency/config-versions',
        undefined,
        3000,
        options
      );
      return res.data;
    },

    getConfigVersion: async (versionId: string, options?: ApiRequestOptions): Promise<TelesaleCompetencyConfigVersion> => {
      const res = await dedupeApiGet<{ success: boolean; data: TelesaleCompetencyConfigVersion }>(
        `/telesale-competency/config-versions/${versionId}`,
        undefined,
        3000,
        options
      );
      return res.data;
    },

    createDraftVersion: async (
      payload: Partial<TelesaleCompetencyConfigVersion>
    ): Promise<TelesaleCompetencyConfigVersion> => {
      const res = await api.post<{ success: boolean; data: TelesaleCompetencyConfigVersion; message: string }>(
        '/telesale-competency/config-versions',
        payload
      );
      invalidateApiGetCache(['/telesale-competency/config-versions']);
      return res.data.data;
    },

    updateDraftVersion: async (
      versionId: string,
      payload: Partial<TelesaleCompetencyConfigVersion>
    ): Promise<TelesaleCompetencyConfigVersion> => {
      const res = await api.put<{ success: boolean; data: TelesaleCompetencyConfigVersion; message: string }>(
        `/telesale-competency/config-versions/${versionId}`,
        payload
      );
      invalidateApiGetCache(['/telesale-competency/config-versions']);
      return res.data.data;
    },

    deleteDraftVersion: async (versionId: string): Promise<boolean> => {
      await api.delete(`/telesale-competency/config-versions/${versionId}`);
      invalidateApiGetCache(['/telesale-competency/config-versions']);
      return true;
    },

    validateConfigVersion: async (versionId: string): Promise<TelesaleConfigValidationResult> => {
      const res = await api.post<{ success: boolean; data: TelesaleConfigValidationResult }>(
        `/telesale-competency/config-versions/${versionId}/validate`
      );
      return res.data.data;
    },

    publishConfigVersion: async (
      versionId: string,
      effectiveDate: string
    ): Promise<TelesaleCompetencyConfigVersion> => {
      const res = await api.post<{ success: boolean; data: TelesaleCompetencyConfigVersion; message: string }>(
        `/telesale-competency/config-versions/${versionId}/publish`,
        { effectiveDate }
      );
      invalidateApiGetCache(['/telesale-competency/']);
      return res.data.data;
    },

    previewCalculation: async (versionId: string, month?: string): Promise<TelesaleConfigPreviewResult> => {
      const res = await api.post<{ success: boolean; data: TelesaleConfigPreviewResult }>(
        `/telesale-competency/config-versions/${versionId}/preview`,
        { month }
      );
      return res.data.data;
    },

    // -------------------------------------------------------------
    // Các endpoint cũ (Backward Compatibility)
    // -------------------------------------------------------------
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
