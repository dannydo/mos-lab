import {
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  type CareerProgressionConfig,
  type StaffCareerStatus,
  type CareerStaffSummary,
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
      params?: { role?: string; search?: string },
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
      options?: ApiRequestOptions
    ): Promise<StaffCareerStatus> => {
      const query = refresh ? { refresh: 'true' } : undefined;
      const res = await dedupeApiGet<{ success: boolean; data: StaffCareerStatus }>(
        `/career/staff/${staffId}`,
        query,
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
    promoteStaff: async (staffId: number, newRole: string): Promise<StaffCareerStatus> => {
      const res = await api.post<{ success: boolean; data: StaffCareerStatus }>(`/career/staff/${staffId}/promote`, {
        newRole,
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
  },
};
