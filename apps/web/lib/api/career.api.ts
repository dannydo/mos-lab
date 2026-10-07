import {
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  type CareerProgressionConfig,
  type StaffCareerStatus,
  type CareerStaffSummary,
  type CareerPeriod,
  type BananaTransactionResponse,
  type CvPlusRewardSnapshot,
  type CvPlusSimulationSummaryResponse,
} from '@mos-lab/shared';
import { api, dedupeApiGet, invalidateApiGetCache, ApiRequestOptions } from './base';

export const careerApi = {
  career: {
    getConfig: async (options?: ApiRequestOptions): Promise<CareerProgressionConfig> => {
      try {
        const res = await dedupeApiGet<{ success: boolean; data: CareerProgressionConfig }>(
          '/career/config',
          undefined,
          10000,
          options
        );
        if (res?.data && res.data.cvToCc) {
          return res.data;
        }
      } catch (_err) {
        // Safe fallback
      }
      return DEFAULT_CAREER_PROGRESSION_CONFIG;
    },
    updateConfig: async (payload: Partial<CareerProgressionConfig>): Promise<CareerProgressionConfig> => {
      const res = await api.put<{ success: boolean; data: CareerProgressionConfig }>('/career/config', payload);
      invalidateApiGetCache(['/career/config']);
      return res.data.data;
    },
    getMyProgression: async (options?: ApiRequestOptions): Promise<StaffCareerStatus> => {
      const res = await dedupeApiGet<{ success: boolean; data: StaffCareerStatus }>(
        '/career/my-progression',
        undefined,
        5000,
        options
      );
      return res.data;
    },
    listStaff: async (
      params?: { role?: string; search?: string; period?: CareerPeriod },
      options?: ApiRequestOptions
    ): Promise<CareerStaffSummary[]> => {
      try {
        const res = await dedupeApiGet<{ success: boolean; data: CareerStaffSummary[] }>(
          '/career/staff-list',
          params,
          5000,
          options
        );
        return res?.data || [];
      } catch (_err) {
        return [];
      }
    },
    syncProd: async (): Promise<{ success: boolean; message: string; timestamp: string }> => {
      const res = await api.post<{ success: boolean; message: string; timestamp: string }>('/career/sync-prod');
      invalidateApiGetCache(['/career/']);
      return res.data;
    },
    getStaffProgression: async (
      staffId: number,
      refresh = false,
      targetRole?: string,
      period?: CareerPeriod,
      options?: ApiRequestOptions
    ): Promise<StaffCareerStatus> => {
      const query: Record<string, string> = {};
      if (refresh) query.refresh = 'true';
      if (targetRole) query.targetRole = targetRole;
      if (period) query.period = period;
      const res = await dedupeApiGet<{ success: boolean; data: StaffCareerStatus }>(
        `/career/staff/${staffId}`,
        Object.keys(query).length > 0 ? query : undefined,
        refresh ? 0 : 5000,
        options
      );
      return res.data;
    },
    activateTrial: async (staffId: number): Promise<StaffCareerStatus> => {
      const res = await api.post<{ success: boolean; data: StaffCareerStatus }>(`/career/staff/${staffId}/trial`);
      invalidateApiGetCache(['/career/']);
      return res.data.data;
    },
    promoteStaff: async (staffId: number, newRole: string, force = true): Promise<StaffCareerStatus> => {
      const res = await api.post<{ success: boolean; data: StaffCareerStatus }>(`/career/staff/${staffId}/promote`, {
        newRole,
        force,
      });
      invalidateApiGetCache(['/career/']);
      return res.data.data;
    },
    setStaffRole: async (staffId: number, role: string, reason?: string): Promise<StaffCareerStatus> => {
      const res = await api.post<{ success: boolean; data: StaffCareerStatus }>(`/career/staff/${staffId}/set-role`, {
        role,
        reason,
      });
      invalidateApiGetCache(['/career/']);
      return res.data.data;
    },
    demoteStaff: async (staffId: number, newRole: string, reason?: string): Promise<StaffCareerStatus> => {
      const res = await api.post<{ success: boolean; data: StaffCareerStatus }>(`/career/staff/${staffId}/demote`, {
        newRole,
        reason,
      });
      invalidateApiGetCache(['/career/']);
      return res.data.data;
    },
    switchToSpecialist: async (staffId: number): Promise<StaffCareerStatus> => {
      const res = await api.post<{ success: boolean; data: StaffCareerStatus }>(
        `/career/staff/${staffId}/specialist-path`
      );
      invalidateApiGetCache(['/career/']);
      return res.data.data;
    },
    getBananaTransactions: async (
      staffId: number,
      params?: { category?: string; timeRange?: string; search?: string; limit?: number },
      options?: ApiRequestOptions
    ): Promise<BananaTransactionResponse> => {
      const res = await dedupeApiGet<{ success: boolean; data: BananaTransactionResponse }>(
        `/career/staff/${staffId}/banana-transactions`,
        params as any,
        3000,
        options
      );
      return res.data;
    },
    getCvPlusRewards: async (
      staffId: number,
      month?: string,
      persist = false,
      options?: ApiRequestOptions
    ): Promise<CvPlusRewardSnapshot> => {
      const params: Record<string, string> = { staffId: String(staffId) };
      if (month) params.month = month;
      if (persist) params.persist = 'true';
      const res = await dedupeApiGet<{ success: boolean; data: CvPlusRewardSnapshot }>(
        '/career/cv-plus-rewards',
        params,
        3000,
        options
      );
      return res.data;
    },
    getCvPlusSimulationSummary: async (
      month?: string,
      options?: ApiRequestOptions
    ): Promise<CvPlusSimulationSummaryResponse> => {
      const params: Record<string, string> = {};
      if (month) params.month = month;
      const res = await dedupeApiGet<{ success: boolean; data: CvPlusSimulationSummaryResponse }>(
        '/career/cv-plus-simulation-summary',
        Object.keys(params).length > 0 ? params : undefined,
        3000,
        options
      );
      return res.data;
    },
  },
};
