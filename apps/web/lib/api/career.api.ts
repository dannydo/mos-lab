import type { CareerProgressionConfig, StaffCareerStatus } from '@mos-lab/shared';
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
      return {
        version: '2026.1',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Fallback Init',
        cvToCc: {
          minOrders: 300,
          minTipRatioAboveShop: 0.0,
          maxFixRate: 0.02,
          minHappinessIndex: 0.7,
          trialDurationDays: 30,
          minSelfComboRate: 0.2,
          allowSelfConsultTrial: true,
        },
        ccToFm: {
          minMonthsInRole: 6,
          minAvgLevel: 10,
          minShopComboRate: 0.25,
          minOpsExamScore: 90,
          minInventoryAuditScore: 95,
        },
        fmToCho: {
          minTargetHitMonths: 3,
          maxInventoryLossRate: 0.005,
          minFacilityScore: 95,
          minStaffEnpsScore: 80,
          maxChoPerShop: 1,
        },
        choToBoss: {
          minProfitableMonths: 12,
          minNetProfitMargin: 0.15,
          minCustomerNps: 85,
          minStaffEnps: 80,
          requiredSuccessors: {
            fmCount: 1,
            choCount: 1,
          },
        },
        rewardRates: {
          bananaPerFALShort: 15,
          bananaPerFALCcShort: 5,
          ccBonusRatePerLevel: 65,
          tipShareCvRatio: 0.8,
          tipShareCcRatio: 0.2,
          fmMonthlyBananaGrant: 500,
        },
      };
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
