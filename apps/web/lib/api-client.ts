import api from './api';
import {
  Customer,
  ListCustomersParams,
  ListCustomersResponse,
  CustomerStatsResponse,
  LoginRequest,
  LoginResponse,
  Staff,
  DailyPlan,
  CallLog,
  CreateCallRequest,
  KPISummary,
  CustomerWeeklyProgress,
  ColumnConfig,
  BulkDeleteCustomersResponse,
  CustomerHistoryEntry,
  AssignmentHistoryResponse,
  AssignmentHistoryDetailsResponse,
  Referral,
  ListAppointmentsResponse,
  DetailedCustomerResponse,
  SalaryConfig,
  TrendsResponse,
  LeaderboardEntry,
  Promotion,
  Service,
  DailyCallEntry,
  CcXoayReportResponse,
  CcLeaderboardResponse,
  CcQueryParams,
  CcConfigResponse,
  CcPaystubResponse,
  CcWorkLogDetailResponse,
  CcTipLeaderboardResponse,
  CcTipResponse,
  CcTipQueryParams,
  CcDiamondResponse,
  CcDiamondDetailsResponse,
  CvXoayReportResponse,
  CvTipLeaderboardResponse,
  CvTipResponse,
  CvPaystubResponse,
  CvWorkLogDetailResponse,
  CvConfigResponse,
  DailySalesBonusConfig,
  DailySalesBonusConsultantResponse,
  DailySalesBonusTransaction,
  DailySalesBonusQueryParams,
  DailySalesBonusTransactionsQueryParams,
  BkBookingLeaderboardEntry,
  BkBookingLeaderboardResponse,
  BkBookingResponse,
  BkDoneLeaderboardEntry,
  BkDoneLeaderboardResponse,
  BkDoneResponse,
  BkTipLeaderboardEntry,
  BkTipLeaderboardResponse,
  BkTipResponse,
  BkRevenueLeaderboardEntry,
  BkRevenueLeaderboardResponse,
  BkRevenueResponse,
  BkPaystubResponse,
  BkConfigResponse,
  BkSalaryConfig,
} from '@mos-lab/shared';

// API Client SDK for mos-lab
export const apiClient = {
  auth: {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    google: async (data: {
      credential?: string;
      isMock?: boolean;
      email?: string;
      name?: string;
    }): Promise<LoginResponse> => {
      const response = await api.post('/auth/google', data);
      return response.data;
    },
    me: async (): Promise<Staff> => {
      const response = await api.get('/auth/me');
      return response.data;
    },
    impersonate: async (userId: number): Promise<LoginResponse> => {
      const response = await api.post('/auth/impersonate', { userId });
      return response.data;
    },
  },

  customers: {
    list: async (params: ListCustomersParams): Promise<ListCustomersResponse> => {
      const response = await api.get('/customers', { params });
      return response.data;
    },
    getStats: async (params: ListCustomersParams): Promise<CustomerStatsResponse> => {
      const response = await api.get('/customers/stats', { params });
      return response.data;
    },
    getDetails: async (id: number): Promise<Customer> => {
      const response = await api.get(`/customers/${id}`);
      return response.data;
    },
    getHistory: async (id: number): Promise<CustomerHistoryEntry[]> => {
      const response = await api.get(`/customers/${id}/history`);
      return response.data;
    },
    getRandomIds: async (params: Record<string, unknown>): Promise<number[]> => {
      const response = await api.get('/customers/random-ids', { params });
      return response.data;
    },
    assign: async (data: { customerIds: number[]; staffId: number }): Promise<{ success: boolean; count: number }> => {
      const response = await api.post('/customers/assign', data);
      return response.data;
    },
    unassign: async (data: { customerIds: number[] }): Promise<{ success: boolean; count: number }> => {
      const response = await api.post('/customers/unassign', data);
      return response.data;
    },
    getStaff: async (params?: Record<string, unknown>): Promise<Staff[]> => {
      const response = await api.get('/customers/staff', { params });
      return response.data;
    },
    getAssignmentHistory: async (params: Record<string, unknown>): Promise<AssignmentHistoryResponse> => {
      const response = await api.get('/customers/assignment-history', { params });
      return response.data;
    },
    getAssignmentHistoryDetails: async (batchId: string): Promise<AssignmentHistoryDetailsResponse> => {
      const response = await api.get(`/customers/assignment-history/${batchId}/details`);
      return response.data;
    },
    undoAssignment: async (
      batchId: string
    ): Promise<{
      success: boolean;
      revertedCount: number;
      totalCount: number;
      skippedCount: number;
    }> => {
      const response = await api.post('/customers/assignment-history/undo', { batchId });
      return response.data;
    },
    getReferrals: async (): Promise<Referral[]> => {
      const response = await api.get('/customers/referrals');
      return response.data;
    },
    getAppointments: async (params: Record<string, unknown>): Promise<ListAppointmentsResponse> => {
      const response = await api.get('/customers/appointments', { params });
      return response.data;
    },
    deleteBooking: async (orderId: number): Promise<{ success: boolean; message: string }> => {
      const response = await api.delete(`/customers/booking/${orderId}`);
      return response.data;
    },
    getDetailed: async (id: number): Promise<DetailedCustomerResponse> => {
      const response = await api.get(`/customers/${id}/detailed`);
      return response.data;
    },
    delete: async (id: number): Promise<{ success: boolean; message: string }> => {
      const response = await api.delete(`/customers/${id}`);
      return response.data;
    },
    restore: async (id: number): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/customers/${id}/restore`);
      return response.data;
    },
    bulkDelete: async (ids: number[]): Promise<BulkDeleteCustomersResponse> => {
      const response = await api.post('/customers/bulk-delete', { ids });
      return response.data;
    },
    update: async (
      id: number,
      data: {
        name: string;
        email: string | null;
        gender: string | null;
        dob: string | null;
        phones: Array<{ id?: number; phone_number: string; is_disabled?: boolean; is_deleted?: boolean }>;
      }
    ): Promise<Customer> => {
      const response = await api.put(`/customers/${id}`, data);
      return response.data;
    },
    getPromotions: async (): Promise<Promotion[]> => {
      const response = await api.get('/customers/promotions');
      return response.data;
    },
    getServices: async (): Promise<Service[]> => {
      const response = await api.get('/customers/services');
      return response.data;
    },
    getBookingSlots: async (params: Record<string, unknown>): Promise<unknown> => {
      const response = await api.get('/customers/booking-slots', { params });
      return response.data;
    },
    createBooking: async (data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.post('/customers/booking', data);
      return response.data;
    },
    updateBooking: async (orderId: number, data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.put(`/customers/booking/${orderId}`, data);
      return response.data;
    },
    createNote: async (
      id: number,
      data: { note: string; noteFieldKey: 'note' | 'order_note'; isSticky?: boolean }
    ): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/customers/${id}/notes`, data);
      return response.data;
    },
    unpinNote: async (customerId: number, noteId: number): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/customers/${customerId}/notes/${noteId}/unpin`);
      return response.data;
    },
    pinNote: async (customerId: number, noteId: number): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/customers/${customerId}/notes/${noteId}/pin`);
      return response.data;
    },
  },

  plans: {
    create: async (data: {
      legacyUserId: number;
      date?: string;
      bucket?: string;
      priority?: number;
    }): Promise<DailyPlan> => {
      const response = await api.post('/plans', data);
      return response.data;
    },
    listToday: async (): Promise<DailyPlan[]> => {
      const response = await api.get('/plans/today');
      return response.data;
    },
    confirm: async (planId: number, data?: Record<string, unknown>): Promise<DailyPlan> => {
      const response = await api.put(`/plans/${planId}/confirm`, data);
      return response.data;
    },
    getWeekly: async (params: { weekStart: string; assignedStaffId?: string }): Promise<CustomerWeeklyProgress[]> => {
      const response = await api.get('/plans/weekly', { params });
      return response.data;
    },
    getSuggestions: async (): Promise<unknown> => {
      const response = await api.get('/plans/suggest');
      return response.data;
    },
  },

  calls: {
    create: async (data: CreateCallRequest): Promise<CallLog> => {
      const response = await api.post('/calls', data);
      return response.data;
    },
    listByCustomer: async (customerId: number): Promise<CallLog[]> => {
      const response = await api.get(`/calls/${customerId}`);
      return response.data;
    },
    listDaily: async (params: {
      date: string;
      scope: 'all' | 'me' | 'nyc';
      staffId?: string;
    }): Promise<DailyCallEntry[]> => {
      const response = await api.get('/calls/daily', { params });
      return response.data;
    },
  },

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
      date_from: string;
      date_to: string;
      staff_id?: string;
      booker?: string;
    }): Promise<TrendsResponse> => {
      const response = await api.get('/kpi/trends', { params });
      return response.data;
    },
    getLeaderboard: async (params: {
      date_from: string;
      date_to: string;
      role?: string;
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
      consultantId: number;
      dateFrom?: string;
      dateTo?: string;
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
  },

  nyc: {
    getConfig: async (): Promise<unknown> => {
      const response = await api.get('/nyc/config');
      return response.data;
    },
    updateConfig: async (configs: Record<string, unknown>): Promise<unknown> => {
      const response = await api.put('/nyc/config', configs);
      return response.data;
    },
  },

  loca: {
    getConfig: async (): Promise<unknown> => {
      const response = await api.get('/loca/config');
      return response.data;
    },
    updateConfig: async (configs: Record<string, unknown>): Promise<unknown> => {
      const response = await api.put('/loca/config', configs);
      return response.data;
    },
  },

  staff: {
    list: async (params?: Record<string, unknown>): Promise<Staff[]> => {
      const response = await api.get('/staff', { params });
      return response.data;
    },
    getLegacy: async (): Promise<unknown[]> => {
      const response = await api.get('/staff/legacy');
      return response.data;
    },
    syncLegacy: async (): Promise<{ success: boolean; count: number; message: string }> => {
      const response = await api.post('/staff/sync-legacy');
      return response.data;
    },
    create: async (data: Record<string, unknown>): Promise<Staff> => {
      const response = await api.post('/staff', data);
      return response.data;
    },
    update: async (id: number, data: Record<string, unknown>): Promise<Staff> => {
      const response = await api.put(`/staff/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/staff/${id}`);
      return response.data;
    },
    bulkUpdate: async (data: {
      ids: number[];
      role?: string;
      isActive?: boolean;
    }): Promise<{ success: boolean; count: number; message: string }> => {
      const response = await api.post('/staff/bulk-update', data);
      return response.data;
    },
  },

  roles: {
    list: async (): Promise<unknown[]> => {
      const response = await api.get('/roles');
      return response.data;
    },
    create: async (data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.post('/roles', data);
      return response.data;
    },
    update: async (key: string, data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.put(`/roles/${key}`, data);
      return response.data;
    },
    delete: async (key: string): Promise<{ success: boolean }> => {
      const response = await api.delete(`/roles/${key}`);
      return response.data;
    },
  },

  savedFilters: {
    list: async (): Promise<unknown[]> => {
      const response = await api.get('/saved-filters');
      return response.data;
    },
    create: async (data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.post('/saved-filters', data);
      return response.data;
    },
    delete: async (id: string | number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/saved-filters/${id}`);
      return response.data;
    },
  },

  tableConfig: {
    get: async (
      tableId: string
    ): Promise<{ userConfig: ColumnConfig[] | null; defaultConfig: ColumnConfig[] | null }> => {
      const response = await api.get(`/table-config/${tableId}`);
      return response.data;
    },
    save: async (
      tableId: string,
      columns: ColumnConfig[],
      saveAsDefault?: boolean
    ): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/table-config/${tableId}`, { columns, saveAsDefault });
      return response.data;
    },
    reset: async (tableId: string): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/table-config/${tableId}/reset`);
      return response.data;
    },
  },

  omicall: {
    getSipConfig: async (): Promise<unknown> => {
      const response = await api.get('/omicall/sip-config');
      return response.data;
    },
    getLatestLog: async (params: { phone: string; direction: string }): Promise<unknown> => {
      const response = await api.get('/omicall/logs/latest', { params });
      return response.data;
    },
    listLogs: async (params: Record<string, unknown>): Promise<unknown> => {
      const response = await api.get('/omicall/logs', { params });
      return response.data;
    },
    getConfigs: async (): Promise<unknown[]> => {
      const response = await api.get('/omicall/config');
      return response.data;
    },
    saveConfig: async (data: {
      staffId: number;
      extension: string;
      phoneNumber?: string;
      sipPassword?: string;
    }): Promise<unknown> => {
      const response = await api.post('/omicall/config', data);
      return response.data;
    },
    deleteConfig: async (staffId: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/omicall/config/${staffId}`);
      return response.data;
    },
    getPlayDetails: async (id: number): Promise<unknown> => {
      const response = await api.get(`/omicall/logs/${id}/play`);
      return response.data;
    },
    verifyLog: async (id: number, data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.post(`/omicall/logs/${id}/verify`, data);
      return response.data;
    },
  },
  dashboard: {
    getToday: async (params?: Record<string, unknown>): Promise<unknown> => {
      const response = await api.get('/dashboard/today', { params });
      return response.data;
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
    getBookingLeaderboard: async (params?: Record<string, unknown>): Promise<BkBookingLeaderboardResponse> => {
      const response = await api.get('/kpi/bk/booking/leaderboard', { params });
      return response.data;
    },
    getBookingDetails: async (params?: Record<string, unknown>): Promise<BkBookingResponse> => {
      const response = await api.get('/kpi/bk/booking/details', { params });
      return response.data;
    },
    getDoneLeaderboard: async (params?: Record<string, unknown>): Promise<BkDoneLeaderboardResponse> => {
      const response = await api.get('/kpi/bk/done/leaderboard', { params });
      return response.data;
    },
    getDoneDetails: async (params?: Record<string, unknown>): Promise<BkDoneResponse> => {
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
  },
};
