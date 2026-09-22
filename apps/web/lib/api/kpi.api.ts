import type {
  BkBookingDetailsParams,
  BkBookingLeaderboardResponse,
  BkBookingResponse,
  BkConfigResponse,
  BkDoneDetailsParams,
  BkDoneLeaderboardResponse,
  BkDoneResponse,
  BkPaystubResponse,
  BkRevenueLeaderboardResponse,
  BkRevenueResponse,
  BkSalaryConfig,
  BkTipLeaderboardResponse,
  BkTipResponse,
  BkWorkLogResponse,
  BkGame,
  BkGameCreateInput,
  BkGameDetailResponse,
  BkGameFinalizeInput,
  BkGameListResponse,
  CcConfigResponse,
  CcDiamondDetailsResponse,
  CcDiamondResponse,
  CcLeaderboardResponse,
  CcPaystubResponse,
  CcQueryParams,
  CcTipLeaderboardResponse,
  CcTipQueryParams,
  CcTipResponse,
  CcWorkLogDetailResponse,
  CcXoayReportResponse,
  CsTipQueryParams,
  CsTipResponse,
  CvConfigResponse,
  CvPaystubResponse,
  CvSpeedDetail,
  CvSpeedMatrix,
  CvSpeedMonthlyTrend,
  CvSpeedPrediction,
  CvSpeedProfile,
  CvSpeedRanking,
  CvSpeedSeedResult,
  CvSpeedSeedStatus,
  CvSpeedStyles,
  CvTipCustomerHistoryResponse,
  CvTipLeaderboardResponse,
  CvTipResponse,
  CvWorkLogDetailResponse,
  CvXoayReportResponse,
  DailySalesBonusConfig,
  DailySalesBonusConsultantResponse,
  DailySalesBonusQueryParams,
  DailySalesBonusTransaction,
  DailySalesBonusTransactionsQueryParams,
  KPISummary,
  LeaderboardEntry,
  PackageAuditListParams,
  PackageAuditListResponse,
  ReviewPackageAuditParams,
  SalaryConfig,
  TrendsResponse,
} from '@mos-lab/shared';

import { api } from './base';

export const kpiApi = {
  kpi: {
    getSummary: async (params: {
      startDate: string;
      endDate: string;
      staffId?: string;
      role?: string;
    }): Promise<KPISummary> => {
      const response = await api.get('/kpi/summary', { params });
      return response.data;
    },
    getTrends: async (params: {
      startDate: string;
      endDate: string;
      staffId?: string;
      role?: string;
    }): Promise<TrendsResponse> => {
      const response = await api.get('/kpi/trends', { params });
      return response.data;
    },
    getLeaderboard: async (params: {
      date_from?: string;
      date_to?: string;
      startDate?: string;
      endDate?: string;
      role?: string;
      staffIds?: string;
    }): Promise<LeaderboardEntry[]> => {
      const response = await api.get('/kpi/leaderboard', { params });
      return response.data;
    },
    getSalaryConfig: async (): Promise<SalaryConfig> => {
      const response = await api.get('/kpi/salary-config');
      return response.data;
    },
    updateSalaryConfig: async (config: SalaryConfig): Promise<{ success: boolean; message: string }> => {
      const response = await api.post('/kpi/salary-config', config);
      return response.data;
    },
    getPackageAudits: async (params?: PackageAuditListParams): Promise<PackageAuditListResponse> => {
      const response = await api.get('/kpi/package-audit/list', { params });
      return response.data;
    },
    reviewPackageAudit: async (
      data: ReviewPackageAuditParams
    ): Promise<{ success: boolean; message: string; reviewStatus: string }> => {
      const response = await api.post('/kpi/package-audit/review', data);
      return response.data;
    },
    getBookerAppointments: async (params: Record<string, unknown>): Promise<unknown> => {
      const response = await api.get('/kpi/booker-appointments', { params });
      return response.data;
    },
    getStaffLevels: async (): Promise<unknown> => {
      const response = await api.get('/kpi/staff-levels');
      return response.data;
    },
    updateStaffLevels: async (data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.post('/kpi/staff-levels', data);
      return response.data;
    },
    getCcXoayReport: async (params?: CcQueryParams): Promise<CcXoayReportResponse> => {
      const response = await api.get('/kpi/cc-xoay', { params });
      return response.data;
    },
    getCcLeaderboard: async (params?: CcQueryParams): Promise<CcLeaderboardResponse> => {
      const response = await api.get('/kpi/cc-leaderboard', { params });
      return response.data;
    },
    getCcConfig: async (): Promise<CcConfigResponse> => {
      const response = await api.get('/kpi/cc-config');
      return response.data;
    },
    updateCcConfig: async (activeCcIds: number[]): Promise<{ success: boolean; message: string }> => {
      const response = await api.post('/kpi/cc-config', { activeCcIds });
      return response.data;
    },
    getCcPaystub: async (params?: CcQueryParams): Promise<CcPaystubResponse> => {
      const response = await api.get('/kpi/cc-paystub', { params });
      return response.data;
    },
    getCcWorkLogs: async (params: {
      consultantId?: number;
      userId?: number;
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    }): Promise<CcWorkLogDetailResponse> => {
      const response = await api.get('/kpi/cc-work-logs', { params });
      return response.data;
    },
    getCcTipLeaderboard: async (params?: CcQueryParams): Promise<CcTipLeaderboardResponse> => {
      const response = await api.get('/kpi/cc-tip/leaderboard', { params });
      return response.data;
    },
    getCcTipRecords: async (params?: CcTipQueryParams): Promise<CcTipResponse> => {
      const response = await api.get('/kpi/cc-tip/records', { params });
      return response.data;
    },
    getCcDiamondData: async (params?: {
      month?: string;
      date_from?: string;
      date_to?: string;
      comparisonMode?: 'month' | 'week' | 'day';
    }): Promise<CcDiamondResponse> => {
      const response = await api.get('/kpi/export-diamond', { params: { ...params, format: 'json' } });
      return response.data;
    },
    getCcDiamondDetails: async (params: {
      ccId: number;
      month?: string;
      date_from?: string;
      date_to?: string;
    }): Promise<CcDiamondDetailsResponse> => {
      const response = await api.get('/kpi/export-diamond/details', { params });
      return response.data;
    },
    getCvXoayReport: async (params?: Record<string, unknown>): Promise<CvXoayReportResponse> => {
      const response = await api.get('/kpi/cv-xoay', { params });
      return response.data;
    },
    getCvTipLeaderboard: async (params?: Record<string, unknown>): Promise<CvTipLeaderboardResponse> => {
      const response = await api.get('/kpi/cv-tip/leaderboard', { params });
      return response.data;
    },
    getCvTipRecords: async (params?: Record<string, unknown>): Promise<CvTipResponse> => {
      const response = await api.get('/kpi/cv-tip/records', { params });
      return response.data;
    },
    getCvTipCustomerHistory: async (params: {
      clientId: number;
      limit?: number;
    }): Promise<CvTipCustomerHistoryResponse> => {
      const response = await api.get('/kpi/cv-tip/customer-history', { params });
      return response.data;
    },
    getCvPaystub: async (params?: Record<string, unknown>): Promise<CvPaystubResponse> => {
      const response = await api.get('/kpi/cv-paystub', { params });
      return response.data;
    },
    getCvWorkLogs: async (params: {
      staffId: number;
      dateFrom?: string;
      dateTo?: string;
    }): Promise<CvWorkLogDetailResponse> => {
      const response = await api.get('/kpi/cv-paystub/work-logs', { params });
      return response.data;
    },
    getCvConfig: async (): Promise<CvConfigResponse> => {
      const response = await api.get('/kpi/cv-config');
      return response.data;
    },
    updateCvConfig: async (activeCvIds: number[]): Promise<{ success: boolean; activeCvIds: number[] }> => {
      const response = await api.post('/kpi/cv-config', { activeCvIds });
      return response.data;
    },
    getCvSeniorityConfig: async (): Promise<{ minMonths: number; bonusPercent: number }[]> => {
      const response = await api.get('/kpi/cv-seniority-config');
      return response.data;
    },
    updateCvSeniorityConfig: async (
      rules: { minMonths: number; bonusPercent: number }[]
    ): Promise<{ success: boolean; rules: { minMonths: number; bonusPercent: number }[] }> => {
      const response = await api.post('/kpi/cv-seniority-config', { rules });
      return response.data;
    },
    cvSpeed: {
      getProfiles: async (params?: {
        staffId?: number;
        lashStyle?: string;
        serviceMode?: string;
        speedRating?: string;
      }): Promise<CvSpeedProfile[]> => {
        const response = await api.get('/kpi/cv-speed/profiles', { params });
        return response.data;
      },
      getMatrix: async (params?: { lashStyle?: string; serviceMode?: string }): Promise<CvSpeedMatrix> => {
        const response = await api.get('/kpi/cv-speed/matrix', { params });
        return response.data;
      },
      getRanking: async (params?: {
        lashStyle?: string;
        serviceMode?: string;
        lashCount?: number;
      }): Promise<CvSpeedRanking[]> => {
        const response = await api.get('/kpi/cv-speed/ranking', { params });
        return response.data;
      },
      getTrend: async (
        staffId: number,
        params?: { lashStyle?: string; serviceMode?: string }
      ): Promise<CvSpeedMonthlyTrend[]> => {
        const response = await api.get(`/kpi/cv-speed/trend/${staffId}`, { params });
        return response.data;
      },
      getDetail: async (
        staffId: number,
        params?: { dateFrom?: string; dateTo?: string; limit?: number }
      ): Promise<CvSpeedDetail> => {
        const response = await api.get(`/kpi/cv-speed/detail/${staffId}`, { params });
        return response.data;
      },
      predict: async (params: {
        staffId: number;
        lashStyle: string;
        serviceMode: string;
        lashCount: number;
      }): Promise<CvSpeedPrediction> => {
        const response = await api.get('/kpi/cv-speed/predict', { params });
        return response.data;
      },
      seed: async (): Promise<CvSpeedSeedResult> => {
        const response = await api.post('/kpi/cv-speed/seed');
        return response.data;
      },
      getSeedStatus: async (): Promise<CvSpeedSeedStatus> => {
        const response = await api.get('/kpi/cv-speed/seed/status');
        return response.data;
      },
      getStyles: async (): Promise<CvSpeedStyles> => {
        const response = await api.get('/kpi/cv-speed/styles');
        return response.data;
      },
    },
  },
  gamification: {
    getDailySalesBonusConsultants: async (
      params: DailySalesBonusQueryParams
    ): Promise<DailySalesBonusConsultantResponse> => {
      const response = await api.get('/gamification/daily-sales-bonus/consultant', { params });
      return response.data;
    },
    getDailySalesBonusConfig: async (): Promise<DailySalesBonusConfig> => {
      const response = await api.get('/gamification/daily-sales-bonus/config');
      return response.data;
    },
    saveDailySalesBonusConfig: async (data: DailySalesBonusConfig): Promise<{ success: boolean; message: string }> => {
      const response = await api.post('/gamification/daily-sales-bonus/config', data);
      return response.data;
    },
    getDailySalesBonusTransactions: async (
      params: DailySalesBonusTransactionsQueryParams
    ): Promise<{ data: DailySalesBonusTransaction[]; total: number }> => {
      const response = await api.get('/gamification/daily-sales-bonus/transactions', { params });
      return response.data;
    },
  },
  bk: {
    create: async (data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.post('/customers/booking', data);
      return response.data;
    },
    getBookingLeaderboard: async (params?: Record<string, unknown>): Promise<BkBookingLeaderboardResponse> => {
      const response = await api.get('/kpi/bk/booking/leaderboard', { params });
      return response.data;
    },
    getBookingDetails: async (params?: BkBookingDetailsParams): Promise<BkBookingResponse> => {
      const response = await api.get('/kpi/bk/booking/details', { params });
      return response.data;
    },
    getDoneLeaderboard: async (params?: Record<string, unknown>): Promise<BkDoneLeaderboardResponse> => {
      const response = await api.get('/kpi/bk/done/leaderboard', { params });
      return response.data;
    },
    getDoneDetails: async (params?: BkDoneDetailsParams): Promise<BkDoneResponse> => {
      const response = await api.get('/kpi/bk/done/details', { params });
      return response.data;
    },
    getTipLeaderboard: async (params?: Record<string, unknown>): Promise<BkTipLeaderboardResponse> => {
      const response = await api.get('/kpi/bk/tip/leaderboard', { params });
      return response.data;
    },
    getTipDetails: async (params?: Record<string, unknown>): Promise<BkTipResponse> => {
      const response = await api.get('/kpi/bk/tip/details', { params });
      return response.data;
    },
    getRevenueLeaderboard: async (params?: Record<string, unknown>): Promise<BkRevenueLeaderboardResponse> => {
      const response = await api.get('/kpi/bk/revenue/leaderboard', { params });
      return response.data;
    },
    getRevenueDetails: async (params?: Record<string, unknown>): Promise<BkRevenueResponse> => {
      const response = await api.get('/kpi/bk/revenue/details', { params });
      return response.data;
    },
    getPaystub: async (params?: Record<string, unknown>): Promise<BkPaystubResponse> => {
      const response = await api.get('/kpi/bk/paystub', { params });
      return response.data;
    },
    getWorkLogs: async (params: {
      staffId: number;
      dateFrom?: string;
      dateTo?: string;
    }): Promise<BkWorkLogResponse> => {
      const response = await api.get('/kpi/bk/work-logs', { params });
      return response.data;
    },
    getConfig: async (): Promise<BkConfigResponse> => {
      const response = await api.get('/kpi/bk/config');
      return response.data;
    },
    saveConfig: async (data: {
      activeBkIds?: number[];
      config?: Partial<BkSalaryConfig>;
    }): Promise<{ success: boolean; message: string }> => {
      const response = await api.post('/kpi/bk/config', data);
      return response.data;
    },
    getGames: async (params?: { status?: string }): Promise<BkGameListResponse> => {
      const response = await api.get('/kpi/bk/games', { params });
      return response.data;
    },
    getGameDetail: async (id: number): Promise<BkGameDetailResponse> => {
      const response = await api.get(`/kpi/bk/games/${id}`);
      return response.data;
    },
    createGame: async (data: BkGameCreateInput): Promise<{ success: boolean; game: BkGame }> => {
      const response = await api.post('/kpi/bk/games', data);
      return response.data;
    },
    finalizeGame: async (id: number, data?: BkGameFinalizeInput): Promise<{ success: boolean; game: BkGame }> => {
      const response = await api.post(`/kpi/bk/games/${id}/finalize`, data);
      return response.data;
    },
    cancelGame: async (id: number): Promise<{ success: boolean; message: string }> => {
      const response = await api.delete(`/kpi/bk/games/${id}`);
      return response.data;
    },
  },
  cs: {
    getTip: async (params?: CsTipQueryParams): Promise<CsTipResponse> => {
      const response = await api.get('/kpi/cs-tip', { params });
      return response.data;
    },
  },
};
