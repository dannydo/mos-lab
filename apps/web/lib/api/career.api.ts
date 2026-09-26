import type { CareerProgressionConfig, StaffCareerStatus } from '@mos-lab/shared';
import { api, dedupeApiGet, invalidateApiGetCache, ApiRequestOptions } from './base';

export const careerApi = {
  career: {
    getConfig: async (options?: ApiRequestOptions): Promise<CareerProgressionConfig> => {
      const res = await dedupeApiGet<{ success: boolean; data: CareerProgressionConfig }>(
        '/career/config',
        undefined,
        10000,
        options
      );
      return res.data;
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
    getStaffProgression: async (staffId: number, options?: ApiRequestOptions): Promise<StaffCareerStatus> => {
      const res = await dedupeApiGet<{ success: boolean; data: StaffCareerStatus }>(
        `/career/staff/${staffId}`,
        undefined,
        5000,
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
