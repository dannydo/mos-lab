import type {
  AllocationAuditQueryParams,
  AllocationAuditStatsResponse,
  AllocationHistoryQueryParams,
  AssignmentHistoryDetailsResponse,
  AssignmentHistoryResponse,
  BookerAllocationBatchSummary,
  BookingPromotionOptionsResponse,
  BookingRescheduleEligibilityResponse,
  BulkDeleteCustomersResponse,
  CallLog,
  CreateAllocationBatchDto,
  CreateCallRequest,
  CreateCustomerInput,
  CreateCustomerResponse,
  Customer,
  CustomerAllocationBatch,
  CustomerAllocationItem,
  CustomerAssignmentTimelineItem,
  CustomerCreationOptionsResponse,
  CustomerHistoryEntry,
  CustomerServiceFilterOptionsResponse,
  CustomerStatsResponse,
  CustomerWeeklyProgress,
  CvRealtimeStatusResponse,
  CvScheduleRosterResponse,
  DailyCallEntry,
  DailyPlan,
  DeclineAllocationBatchDto,
  DetailedCustomerResponse,
  ListAppointmentsResponse,
  ListCustomersParams,
  ListCustomersResponse,
  LocaStaffActivityResponse,
  MissedLog,
  MissedSummaryStats,
  Promotion,
  RandomIdsResponse,
  RecallAllocationBatchDto,
  Referral,
  RevokePreviewResponse,
  SaveMissedLogInput,
  Service,
  Staff,
  TouchpointStatus,
  UpdateBookingRequest,
} from '@mos-lab/shared';

import { api, dedupeApiGet, dedupeInFlightApiGet, invalidateApiGetCache, ApiRequestOptions } from './base';

export const customersApi = {
  customers: {
    list: async (params: ListCustomersParams, options?: ApiRequestOptions): Promise<ListCustomersResponse> => {
      return dedupeInFlightApiGet<ListCustomersResponse>('/customers', params, options);
    },
    getStats: async (params: ListCustomersParams, options?: ApiRequestOptions): Promise<CustomerStatsResponse> => {
      return dedupeInFlightApiGet<CustomerStatsResponse>('/customers/stats', params, options);
    },
    getCreationOptions: async (): Promise<CustomerCreationOptionsResponse> => {
      return dedupeInFlightApiGet<CustomerCreationOptionsResponse>('/customers/create-options');
    },
    create: async (data: CreateCustomerInput): Promise<CreateCustomerResponse> => {
      const response = await api.post('/customers/create', data);
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
      params?: Record<string, unknown>,
      options?: ApiRequestOptions
    ): Promise<{
      tabs: Record<string, number>;
      touchpoints: Record<string, number>;
    }> => {
      const response = await api.get('/customers/nyc-stats', {
        params,
        signal: options?.signal,
        isPolling: options?.isPolling,
        priority: options?.priority,
        timeout: options?.timeout,
      });
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
      callbackDate?: string;
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
      return dedupeInFlightApiGet('/customers/booker-retain-quota');
    },
    getStaff: async (params?: Record<string, unknown>): Promise<Staff[]> => {
      const response = await api.get('/customers/staff', { params });
      return response.data;
    },
    getLocaStaffActivity: async (params?: Record<string, unknown>): Promise<LocaStaffActivityResponse> => {
      const response = await api.get('/customers/loca-staff-activity', { params });
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
      const data = await dedupeApiGet<ListAppointmentsResponse>('/customers/appointments', params, 2000);
      return data;
    },
    getCvRealtimeStatus: async (
      params?: { countOnly?: boolean | string },
      options?: ApiRequestOptions
    ): Promise<CvRealtimeStatusResponse> => {
      const response = await api.get('/customers/cv-realtime-status', {
        params,
        signal: options?.signal,
        isPolling: options?.isPolling,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return response.data;
    },
    getCvScheduleRoster: async (date: string): Promise<CvScheduleRosterResponse> => {
      const response = await api.get('/customers/cv-schedule-roster', { params: { date } });
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
        isForeign?: boolean;
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
    getServiceFilterOptions: async (): Promise<CustomerServiceFilterOptionsResponse> => {
      const response = await api.get('/customers/service-filter-options');
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
    getBookingPromotionOptions: async (orderId: number): Promise<BookingPromotionOptionsResponse> => {
      const response = await api.get(`/customers/booking/${orderId}/promotions`);
      return response.data;
    },
    getRescheduleEligibility: async (orderId: number): Promise<BookingRescheduleEligibilityResponse> => {
      const response = await api.get(`/customers/booking/${orderId}/reschedule-eligibility`);
      return response.data;
    },
    updateBooking: async (
      orderId: number,
      data: UpdateBookingRequest
    ): Promise<{ success: boolean; orderId: number }> => {
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
      const response = await api.post(`/customers/${customerId}/notes/${noteId}/unpin`, {});
      return response.data;
    },
    pinNote: async (customerId: number, noteId: number): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/customers/${customerId}/notes/${noteId}/pin`, {});
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
      return dedupeInFlightApiGet<DailyPlan[]>('/plans/today');
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
      invalidateApiGetCache(['/calls/daily']);
      return response.data;
    },
    listByCustomer: async (customerId: number): Promise<CallLog[]> => {
      const response = await api.get(`/calls/${customerId}`);
      return response.data;
    },
    listDaily: async (
      params: {
        date: string;
        scope: 'all' | 'me' | 'nyc';
        staffId?: string;
      },
      options?: ApiRequestOptions
    ): Promise<DailyCallEntry[]> => {
      const data = await dedupeApiGet<DailyCallEntry[]>(
        '/calls/daily',
        params as Record<string, unknown>,
        30000,
        options
      );
      return data;
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
  allocation: {
    createBatch: async (data: CreateAllocationBatchDto): Promise<CustomerAllocationBatch> => {
      const response = await api.post('/allocation/batch', data);
      return response.data;
    },
    getPendingBatches: async (options?: ApiRequestOptions): Promise<CustomerAllocationBatch[]> => {
      const data = await dedupeApiGet<CustomerAllocationBatch[]>('/allocation/pending', undefined, 5000, options);
      return data;
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
};
