import api from './api';
import {
  Customer,
  TouchpointStatus,
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
  CustomerAssignmentTimelineItem,
  RevokePreviewResponse,
  RandomIdsResponse,
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
  BkBookingLeaderboardResponse,
  BkBookingResponse,
  BkDoneLeaderboardResponse,
  BkDoneResponse,
  BkTipLeaderboardResponse,
  BkTipResponse,
  BkRevenueLeaderboardResponse,
  BkRevenueResponse,
  BkPaystubResponse,
  BkConfigResponse,
  BkSalaryConfig,
  TeamListResponse,
  TeamDetailResponse,
  UpsertTeamRequest,
  UpdateTeamMembersRequest,
  PackageAuditListParams,
  PackageAuditListResponse,
  ReviewPackageAuditParams,
  CatalogService,
  CatalogServicePrice,
  CatalogProduct,
  CatalogListParams,
  CatalogListResponse,
  CatalogDetailResponse,
  CatalogReportSummary,
  CatalogReportSummaryParams,
  CatalogItemHistoryResponse,
  CatalogItemHistoryParams,
  ComboLiveParams,
  ComboLiveResponse,
  ServiceLiveComboCheckResult,
  CreateServiceInput,
  UpdateServiceInput,
  CreateServicePriceInput,
  CreateProductInput,
  UpdateProductInput,
  MissedSummaryStats,
  SaveMissedLogInput,
  MissedLog,
  SmsTemplate,
  SaveSmsTemplateInput,
  SendSmsRequest,
  SendSmsResponse,
  CustomerSmsHistoryItem,
  CustomerAllocationBatch,
  CustomerAllocationItem,
  CreateAllocationBatchDto,
  DeclineAllocationBatchDto,
  RecallAllocationBatchDto,
  AllocationHistoryQueryParams,
  AllocationAuditQueryParams,
  AllocationAuditStatsResponse,
  BookerAllocationBatchSummary,
  Campaign,
  CampaignCustomer,
  CampaignTouchpoint,
  CampaignPromotion,
  CampaignTouchpointLog,
  CreateCampaignDto,
  UpdateCampaignDto,
  AddCampaignCustomersDto,
  RemoveCampaignCustomerDto,
  BatchRemoveCampaignCustomersDto,
  CreateCampaignTouchpointDto,
  UpdateCampaignTouchpointDto,
  CreateCampaignPromotionDto,
  UpdateCampaignPromotionDto,
  ToggleCampaignTouchpointLogDto,
  CustomerCampaignPromotionInfo,
  CampaignStatsResponse,
  ListCampaignsParams,
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

  catalog: {
    listServices: async (params: CatalogListParams): Promise<CatalogListResponse<CatalogService>> => {
      const response = await api.get('/catalog/services', { params });
      return response.data;
    },
    getService: async (id: number): Promise<CatalogDetailResponse<CatalogService>> => {
      const response = await api.get(`/catalog/services/${id}`);
      return response.data;
    },
    createService: async (data: CreateServiceInput): Promise<CatalogDetailResponse<CatalogService>> => {
      const response = await api.post('/catalog/services', data);
      return response.data;
    },
    updateService: async (
      id: number,
      data: UpdateServiceInput & { confirm?: boolean }
    ): Promise<CatalogDetailResponse<CatalogService>> => {
      const response = await api.put(`/catalog/services/${id}`, data);
      return response.data;
    },
    deleteService: async (id: number, confirm?: boolean): Promise<{ success: boolean }> => {
      const response = await api.delete(`/catalog/services/${id}`, { data: { confirm } });
      return response.data;
    },
    restoreService: async (id: number): Promise<CatalogDetailResponse<CatalogService>> => {
      const response = await api.post(`/catalog/services/${id}/restore`);
      return response.data;
    },
    checkServiceLiveCombos: async (id: number): Promise<{ success: boolean; data: ServiceLiveComboCheckResult }> => {
      const response = await api.get(`/catalog/services/${id}/live-combo-check`);
      return response.data;
    },
    reorderServices: async (items: { id: number; position: number }[]): Promise<{ success: boolean }> => {
      const response = await api.post('/catalog/services/reorder', { items });
      return response.data;
    },
    bulkStatusServices: async (
      ids: number[],
      isDisabled: boolean,
      confirm?: boolean
    ): Promise<{ success: boolean }> => {
      const response = await api.post('/catalog/services/bulk-status', { ids, isDisabled, confirm });
      return response.data;
    },
    listCombos: async (params: CatalogListParams): Promise<CatalogListResponse<CatalogServicePrice>> => {
      const response = await api.get('/catalog/combos', { params });
      return response.data;
    },
    getCombo: async (id: number): Promise<CatalogDetailResponse<CatalogServicePrice>> => {
      const response = await api.get(`/catalog/combos/${id}`);
      return response.data;
    },
    createCombo: async (data: CreateServicePriceInput): Promise<CatalogDetailResponse<CatalogServicePrice>> => {
      const response = await api.post('/catalog/combos', data);
      return response.data;
    },
    updateCombo: async (
      id: number,
      data: Partial<CreateServicePriceInput>
    ): Promise<CatalogDetailResponse<CatalogServicePrice>> => {
      const response = await api.put(`/catalog/combos/${id}`, data);
      return response.data;
    },
    deleteCombo: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/catalog/combos/${id}`);
      return response.data;
    },
    listProducts: async (params: CatalogListParams): Promise<CatalogListResponse<CatalogProduct>> => {
      const response = await api.get('/catalog/products', { params });
      return response.data;
    },
    getProduct: async (id: number): Promise<CatalogDetailResponse<CatalogProduct>> => {
      const response = await api.get(`/catalog/products/${id}`);
      return response.data;
    },
    createProduct: async (data: CreateProductInput): Promise<CatalogDetailResponse<CatalogProduct>> => {
      const response = await api.post('/catalog/products', data);
      return response.data;
    },
    updateProduct: async (id: number, data: UpdateProductInput): Promise<CatalogDetailResponse<CatalogProduct>> => {
      const response = await api.put(`/catalog/products/${id}`, data);
      return response.data;
    },
    deleteProduct: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/catalog/products/${id}`);
      return response.data;
    },
    getGroups: async (): Promise<{ success: boolean; data: { key: string; name: string }[] }> => {
      const response = await api.get('/catalog/groups');
      return response.data;
    },
    getTypes: async (): Promise<{ success: boolean; data: { key: string; label: string }[] }> => {
      const response = await api.get('/catalog/types');
      return response.data;
    },
    statsSummary: async (
      params?: CatalogReportSummaryParams
    ): Promise<{ success: boolean; data: CatalogReportSummary }> => {
      const response = await api.get('/catalog/stats-summary', { params });
      return response.data;
    },
    itemHistory: async (params: CatalogItemHistoryParams): Promise<CatalogItemHistoryResponse> => {
      const response = await api.get('/catalog/item-history', { params });
      return response.data;
    },
    getComboLive: async (params?: ComboLiveParams): Promise<ComboLiveResponse> => {
      const response = await api.get('/catalog/combo-live', { params });
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
    getLocaStats: async (
      params?: Record<string, unknown>
    ): Promise<{
      tabs: Record<string, number>;
      touchpoints: Record<string, number>;
    }> => {
      const response = await api.get('/customers/loca-stats', { params });
      return response.data;
    },
    getNycStats: async (
      params?: Record<string, unknown>
    ): Promise<{
      tabs: Record<string, number>;
      touchpoints: Record<string, number>;
    }> => {
      const response = await api.get('/customers/nyc-stats', { params });
      return response.data;
    },
    getDetails: async (id: number): Promise<Customer> => {
      const response = await api.get(`/customers/${id}`);
      return response.data;
    },
    toggleTouchpoint: async (data: {
      customerId: number;
      touchpointKey: string;
      isChecked: boolean;
      status?: TouchpointStatus | null;
      note?: string;
      cycleDate?: string;
    }): Promise<{ success: boolean; touchpoint: SafeAny }> => {
      const response = await api.post('/customers/loca-touchpoint', data);
      return response.data;
    },
    getHistory: async (id: number): Promise<CustomerHistoryEntry[]> => {
      const response = await api.get(`/customers/${id}/history`);
      return response.data;
    },
    getRandomIds: async (params: Record<string, unknown>): Promise<RandomIdsResponse | number[]> => {
      const response = await api.get('/customers/random-ids', { params });
      return response.data;
    },
    revokePreview: async (data: { customerIds: number[] }): Promise<RevokePreviewResponse> => {
      const response = await api.post('/customers/revoke/preview', data);
      return response.data;
    },
    assign: async (data: {
      customerIds: number[];
      staffId: number;
      durationDays?: number;
      sourceType?: string;
      sourceFilterSummary?: string;
      sourceFilterJson?: string;
      parentBatchId?: string;
    }): Promise<{ success: boolean; count: number; batchId?: string }> => {
      const response = await api.post('/customers/assign', data);
      return response.data;
    },
    revoke: async (data: {
      customerIds: number[];
      reason: string;
      targetStaffId?: number | null;
      batchId?: string;
      parentBatchId?: string;
    }): Promise<{
      success: boolean;
      count: number;
      revokedCount?: number;
      skippedUnassignedCount?: number;
      alreadyExpiredCount?: number;
      batchId?: string;
    }> => {
      const response = await api.post('/customers/revoke', data);
      return response.data;
    },
    unassign: async (data: {
      customerIds: number[];
      reason?: string;
    }): Promise<{ success: boolean; count: number }> => {
      const response = await api.post('/customers/unassign', data);
      return response.data;
    },
    retain: async (data: {
      customerIds: number[];
      isRetained?: boolean;
    }): Promise<{ success: boolean; message: string }> => {
      const response = await api.post('/customers/retain', data);
      return response.data;
    },
    getRetainQuota: async (): Promise<{ retainedCount: number; quotaLimit: number; remainingQuota: number }> => {
      const response = await api.get('/customers/booker-retain-quota');
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
      batchId: string,
      reason: string,
      force = true
    ): Promise<{
      success: boolean;
      revertedCount: number;
      totalCount: number;
      skippedCount: number;
    }> => {
      const response = await api.post('/customers/assignment-history/undo', { batchId, reason, force });
      return response.data;
    },
    getTimeline: async (customerId: number): Promise<{ data: CustomerAssignmentTimelineItem[] }> => {
      const response = await api.get(`/customers/${customerId}/assignment-timeline`);
      return response.data;
    },
    getReferrals: async (params?: Record<string, unknown>): Promise<Referral[]> => {
      const response = await api.get('/customers/referrals', { params });
      return response.data;
    },
    getAppointments: async (params: Record<string, unknown>): Promise<ListAppointmentsResponse> => {
      const response = await api.get('/customers/appointments', { params });
      return response.data;
    },
    getMissedSummary: async (params?: {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    }): Promise<MissedSummaryStats> => {
      const response = await api.get('/customers/missed/summary', { params });
      return response.data;
    },
    saveMissedLog: async (data: SaveMissedLogInput): Promise<{ success: boolean; data: MissedLog }> => {
      const response = await api.post('/customers/missed/log', data);
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
    getSummary: async (id: number): Promise<SafeAny> => {
      const response = await api.get(`/customers/${id}/summary`);
      return response.data;
    },
    getBookings: async (
      id: number,
      params?: { page?: number; limit?: number }
    ): Promise<{ items: SafeAny[]; totalCount: number; hasMore: boolean }> => {
      const response = await api.get(`/customers/${id}/bookings`, { params });
      return response.data;
    },
    getNotes: async (
      id: number,
      params?: { page?: number; limit?: number }
    ): Promise<{ items: SafeAny[]; totalCount: number; hasMore: boolean }> => {
      const response = await api.get(`/customers/${id}/notes`, { params });
      return response.data;
    },
    getCalls: async (
      id: number,
      params?: { page?: number; limit?: number }
    ): Promise<{ items: SafeAny[]; totalCount: number; hasMore: boolean }> => {
      const response = await api.get(`/customers/${id}/calls`, { params });
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
    merge: async (data: {
      targetStaffId: number;
      sourceStaffIds: number[];
    }): Promise<{ success: boolean; message: string }> => {
      const response = await api.post('/staff/merge', data);
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

  tableConfig: (() => {
    const tableCache = new Map<
      string,
      Promise<{ userConfig: ColumnConfig[] | null; defaultConfig: ColumnConfig[] | null }>
    >();
    return {
      get: async (
        tableId: string,
        forceRefresh = true
      ): Promise<{ userConfig: ColumnConfig[] | null; defaultConfig: ColumnConfig[] | null }> => {
        if (!forceRefresh && tableCache.has(tableId)) {
          return tableCache.get(tableId)!;
        }
        const promise = api
          .get(`/table-config/${tableId}`)
          .then((res) => res.data)
          .catch((err) => {
            tableCache.delete(tableId);
            throw err;
          });
        tableCache.set(tableId, promise);
        return promise;
      },
      save: async (
        tableId: string,
        columns: ColumnConfig[],
        saveAsDefault?: boolean
      ): Promise<{ success: boolean; message: string }> => {
        tableCache.delete(tableId);
        const response = await api.post(`/table-config/${tableId}`, { columns, saveAsDefault });
        return response.data;
      },
      reset: async (tableId: string): Promise<{ success: boolean; message: string }> => {
        tableCache.delete(tableId);
        const response = await api.post(`/table-config/${tableId}/reset`);
        return response.data;
      },
    };
  })(),

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
    getRevenueHourly: async (params: {
      dateFrom: string;
      dateTo: string;
      branchKey?: string;
      bookerFilter?: string;
    }): Promise<unknown> => {
      const response = await api.get('/dashboard/today/revenue-hourly', { params });
      return response.data;
    },
    getRevenueDetail: async (params: {
      dateFrom: string;
      dateTo: string;
      hour?: string;
      branchKey?: string;
      bookerFilter?: string;
    }): Promise<unknown> => {
      const response = await api.get('/dashboard/today/revenue-detail', { params });
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
    create: async (data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.post('/customers/booking', data);
      return response.data;
    },
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

  teams: {
    list: async (): Promise<TeamListResponse> => {
      const response = await api.get('/teams');
      return response.data;
    },
    getByCode: async (code: string): Promise<TeamDetailResponse> => {
      const response = await api.get(`/teams/${code}`);
      return response.data;
    },
    create: async (data: UpsertTeamRequest): Promise<{ success: boolean; team: unknown }> => {
      const response = await api.post('/teams', data);
      return response.data;
    },
    update: async (id: number, data: UpsertTeamRequest): Promise<{ success: boolean; team: unknown }> => {
      const response = await api.put(`/teams/${id}`, data);
      return response.data;
    },
    updateMembers: async (
      id: number,
      data: UpdateTeamMembersRequest
    ): Promise<{ success: boolean; message: string }> => {
      const response = await api.put(`/teams/${id}/members`, data);
      return response.data;
    },
  },

  bookingAudit: {
    getLogsForOrder: async (orderId: number) => {
      const response = await api.get(`/customers/booking/${orderId}/logs`);
      return response.data;
    },
    getAuditLogReport: async (params?: Record<string, any>) => {
      const response = await api.get('/kpi/booking-audit-logs', { params });
      return response.data;
    },
    cancelBooking: async (id: number, data?: { reasonCategory?: string; reasonNote?: string }) => {
      const response = await api.delete(`/customers/booking/${id}`, { data });
      return response.data;
    },
    rescheduleBooking: async (id: number, data: Record<string, any>) => {
      const response = await api.put(`/customers/booking/${id}`, data);
      return response.data;
    },
  },

  sms: {
    getTemplates: async (): Promise<SmsTemplate[]> => {
      const response = await api.get('/sms/templates');
      return response.data;
    },
    saveTemplate: async (
      data: SaveSmsTemplateInput
    ): Promise<{ success: boolean; template: SmsTemplate; templates: SmsTemplate[] }> => {
      const response = await api.post('/sms/templates', data);
      return response.data;
    },
    deleteTemplate: async (id: string): Promise<{ success: boolean; templates: SmsTemplate[] }> => {
      const response = await api.delete(`/sms/templates/${id}`);
      return response.data;
    },
    getHistory: async (customerId: number): Promise<CustomerSmsHistoryItem[]> => {
      const response = await api.get(`/sms/history/${customerId}`);
      return response.data;
    },
    sendSms: async (data: SendSmsRequest): Promise<SendSmsResponse> => {
      const response = await api.post('/sms/send', data);
      return response.data;
    },
    getUserUrl: async (customerId: number): Promise<{ bookingUrl: string }> => {
      const response = await api.get(`/sms/user-url/${customerId}`);
      return response.data;
    },
  },

  allocation: {
    createBatch: async (data: CreateAllocationBatchDto): Promise<CustomerAllocationBatch> => {
      const response = await api.post('/allocation/batch', data);
      return response.data;
    },
    getPendingBatches: async (): Promise<CustomerAllocationBatch[]> => {
      const response = await api.get('/allocation/pending');
      return response.data;
    },
    getMyBatches: async (): Promise<BookerAllocationBatchSummary[]> => {
      const response = await api.get('/allocation/my-batches');
      return response.data;
    },
    getBatchDetails: async (
      batchId: number
    ): Promise<{ batch: CustomerAllocationBatch; items: CustomerAllocationItem[] }> => {
      const response = await api.get(`/allocation/batches/${batchId}`);
      return response.data;
    },
    acceptBatch: async (batchId: number): Promise<{ success: boolean; message: string; count: number }> => {
      const response = await api.post(`/allocation/batches/${batchId}/accept`);
      return response.data;
    },
    declineBatch: async (
      batchId: number,
      data: DeclineAllocationBatchDto
    ): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/allocation/batches/${batchId}/decline`, data);
      return response.data;
    },
    recallBatch: async (
      batchId: number,
      data: RecallAllocationBatchDto
    ): Promise<{ success: boolean; message: string; count: number }> => {
      const response = await api.post(`/allocation/batches/${batchId}/recall`, data);
      return response.data;
    },
    checkExpired: async (): Promise<{ success: boolean; message: string }> => {
      const response = await api.post('/allocation/check-expired');
      return response.data;
    },
    get30DayHistory: async (
      params?: AllocationHistoryQueryParams
    ): Promise<{ items: CustomerAllocationBatch[]; total: number }> => {
      const response = await api.get('/allocation/history', { params });
      return response.data;
    },
    getAuditStats: async (params?: AllocationAuditQueryParams): Promise<AllocationAuditStatsResponse> => {
      const response = await api.get('/allocation/audit-stats', { params });
      return response.data;
    },
  },

  campaigns: {
    list: async (params?: ListCampaignsParams) => {
      const response = await api.get('/campaigns', { params });
      return response.data;
    },
    getById: async (id: number) => {
      const response = await api.get(`/campaigns/${id}`);
      return response.data;
    },
    getBySlug: async (slug: string) => {
      const response = await api.get(`/campaigns/slug/${slug}`);
      return response.data;
    },
    create: async (dto: CreateCampaignDto) => {
      const response = await api.post('/campaigns', dto);
      return response.data;
    },
    update: async (id: number, dto: UpdateCampaignDto) => {
      const response = await api.put(`/campaigns/${id}`, dto);
      return response.data;
    },
    delete: async (id: number) => {
      const response = await api.delete(`/campaigns/${id}`);
      return response.data;
    },
    endCampaign: async (id: number) => {
      const response = await api.post(`/campaigns/${id}/end`);
      return response.data;
    },
    getCustomers: async (campaignId: number, params?: Record<string, unknown>) => {
      const response = await api.get(`/campaigns/${campaignId}/customers`, { params });
      return response.data;
    },
    addCustomers: async (campaignId: number, dto: AddCampaignCustomersDto) => {
      const response = await api.post(`/campaigns/${campaignId}/customers`, dto);
      return response.data;
    },
    removeCustomer: async (campaignId: number, customerId: number, dto?: RemoveCampaignCustomerDto) => {
      const response = await api.delete(
        `/campaigns/${campaignId}/customers/${customerId}`,
        dto ? { data: dto } : undefined
      );
      return response.data;
    },
    removeCustomersBatch: async (campaignId: number, dto: BatchRemoveCampaignCustomersDto) => {
      const response = await api.post(`/campaigns/${campaignId}/customers/batch-remove`, dto);
      return response.data;
    },
    toggleTouchpointLog: async (
      campaignId: number,
      customerId: number,
      touchpointId: number,
      dto: ToggleCampaignTouchpointLogDto
    ) => {
      const response = await api.post(
        `/campaigns/${campaignId}/customers/${customerId}/touchpoints/${touchpointId}`,
        dto
      );
      return response.data;
    },
    getPromotions: async (campaignId: number) => {
      const response = await api.get(`/campaigns/${campaignId}/promotions`);
      return response.data;
    },
    createPromotion: async (campaignId: number, dto: CreateCampaignPromotionDto) => {
      const response = await api.post(`/campaigns/${campaignId}/promotions`, dto);
      return response.data;
    },
    deletePromotion: async (campaignId: number, promotionId: number) => {
      const response = await api.delete(`/campaigns/${campaignId}/promotions/${promotionId}`);
      return response.data;
    },
    getStats: async (campaignId: number) => {
      const response = await api.get(`/campaigns/${campaignId}/stats`);
      return response.data;
    },
    getCustomerActivePromotions: async (customerId: number): Promise<CustomerCampaignPromotionInfo[]> => {
      const response = await api.get(`/campaigns/customer/${customerId}/active-promotions`);
      return response.data;
    },
  },
};
