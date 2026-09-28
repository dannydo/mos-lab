import type { CareerProgressionConfig } from '@mos-lab/shared';

export const FALLBACK_CAREER_PROGRESSION_CONFIG: CareerProgressionConfig = {
  version: '2026.1',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Init',
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
