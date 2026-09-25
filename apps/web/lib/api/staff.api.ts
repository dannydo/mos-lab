import type {
  AnnualHolidayCalendarQuery,
  AnnualHolidayCalendarResponse,
  CreateHolidayPayrollAdjustmentRequest,
  CreateStaffPerformanceEventRequest,
  HolidayActionResponse,
  HolidayCandidateScore,
  HolidayCoverageRequirement,
  HolidayPayrollAdjustment,
  HolidayPayrollLedgerEntry,
  HolidayPeriod,
  HolidayPeriodListResponse,
  HolidayPeriodQuery,
  HolidayRosterEntry,
  HolidayWorkspaceResponse,
  Staff,
  StaffAuditLog,
  StaffPerformanceEvent,
  StaffPerformanceEventListResponse,
  StaffPerformanceEventQuery,
  Team,
  TeamDetailResponse,
  TeamListResponse,
  UpdateTeamMembersRequest,
  UpsertHolidayBranchCoverageRequest,
  UpsertHolidayCoverageRequest,
  UpsertHolidayPeriodRequest,
  UpsertHolidayRosterRequest,
  UpsertTeamRequest,
  AvatarUploadRequest,
  AvatarUploadResponse,
} from '@mos-lab/shared';

import { api, dedupeApiGet, invalidateApiGetCache, ApiRequestOptions } from './base';

export const staffApi = {
  staff: {
    list: async (params?: Record<string, unknown>, options?: ApiRequestOptions): Promise<Staff[]> => {
      try {
        const data = await dedupeApiGet<Staff[]>('/staff', params, 30000, options);
        return Array.isArray(data) ? data : [];
      } catch (_err) {
        return [];
      }
    },
    getLegacy: async (): Promise<unknown[]> => {
      const response = await api.get('/staff/legacy');
      return response.data;
    },
    syncLegacy: async (): Promise<{ success: boolean; count: number; message: string }> => {
      const response = await api.post('/staff/sync-legacy');
      invalidateApiGetCache(['/staff']);
      return response.data;
    },
    create: async (data: Record<string, unknown>): Promise<Staff> => {
      const response = await api.post('/staff', data);
      invalidateApiGetCache(['/staff']);
      return response.data;
    },
    update: async (id: number, data: Record<string, unknown>): Promise<Staff> => {
      const response = await api.put(`/staff/${id}`, data);
      invalidateApiGetCache(['/staff']);
      return response.data;
    },
    delete: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/staff/${id}`);
      invalidateApiGetCache(['/staff']);
      return response.data;
    },
    bulkUpdate: async (data: {
      ids: number[];
      role?: string;
      isActive?: boolean;
    }): Promise<{ success: boolean; count: number; message: string }> => {
      const response = await api.post('/staff/bulk-update', data);
      invalidateApiGetCache(['/staff']);
      return response.data;
    },
    merge: async (data: {
      targetStaffId: number;
      sourceStaffIds: number[];
    }): Promise<{ success: boolean; message: string }> => {
      const response = await api.post('/staff/merge', data);
      invalidateApiGetCache(['/staff']);
      return response.data;
    },
    getAuditLogs: async (id: number): Promise<StaffAuditLog[]> => {
      const response = await api.get(`/staff/${id}/audit-logs`);
      return response.data;
    },
    getTelesalesProfile: async (): Promise<Record<string, unknown>> => {
      const response = await api.get('/staff/roles/telesales-profile');
      return response.data;
    },
    uploadAvatar: async (data: AvatarUploadRequest): Promise<AvatarUploadResponse> => {
      const response = await api.post('/staff/avatar/upload', data);
      invalidateApiGetCache(['/staff']);
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
    create: async (data: UpsertTeamRequest): Promise<{ success: boolean; team: Team }> => {
      const response = await api.post('/teams', data);
      return response.data;
    },
    update: async (id: number, data: UpsertTeamRequest): Promise<{ success: boolean; team: Team }> => {
      const response = await api.put(`/teams/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<{ success: boolean; message: string }> => {
      const response = await api.delete(`/teams/${id}`);
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
  holidayWork: {
    getAnnualCalendar: async (params?: AnnualHolidayCalendarQuery): Promise<AnnualHolidayCalendarResponse> => {
      const response = await api.get('/holiday-work/calendar', { params });
      return response.data;
    },
    listPeriods: async (params?: HolidayPeriodQuery): Promise<HolidayPeriodListResponse> => {
      const response = await api.get('/holiday-work/periods', { params });
      return response.data;
    },
    getWorkspace: async (holidayId: number): Promise<HolidayWorkspaceResponse> => {
      const response = await api.get(`/holiday-work/periods/${holidayId}`);
      return response.data;
    },
    createPeriod: async (data: UpsertHolidayPeriodRequest): Promise<HolidayActionResponse<HolidayPeriod>> => {
      const response = await api.post('/holiday-work/periods', data);
      return response.data;
    },
    updatePeriod: async (
      holidayId: number,
      data: UpsertHolidayPeriodRequest
    ): Promise<HolidayActionResponse<HolidayPeriod>> => {
      const response = await api.put(`/holiday-work/periods/${holidayId}`, data);
      return response.data;
    },
    createCoverage: async (
      holidayId: number,
      data: UpsertHolidayCoverageRequest
    ): Promise<HolidayActionResponse<HolidayCoverageRequirement>> => {
      const response = await api.post(`/holiday-work/periods/${holidayId}/coverage`, data);
      return response.data;
    },
    updateCoverage: async (
      holidayId: number,
      coverageId: number,
      data: UpsertHolidayCoverageRequest
    ): Promise<HolidayActionResponse<HolidayCoverageRequirement>> => {
      const response = await api.put(`/holiday-work/periods/${holidayId}/coverage/${coverageId}`, data);
      return response.data;
    },
    upsertBranchCoverage: async (
      holidayId: number,
      data: UpsertHolidayBranchCoverageRequest
    ): Promise<HolidayActionResponse<HolidayCoverageRequirement[]>> => {
      const response = await api.put(`/holiday-work/periods/${holidayId}/branch-coverage`, data);
      return response.data;
    },
    createRoster: async (
      holidayId: number,
      data: UpsertHolidayRosterRequest
    ): Promise<HolidayActionResponse<HolidayRosterEntry>> => {
      const response = await api.post(`/holiday-work/periods/${holidayId}/roster`, data);
      return response.data;
    },
    updateRoster: async (
      holidayId: number,
      rosterId: number,
      data: UpsertHolidayRosterRequest
    ): Promise<HolidayActionResponse<HolidayRosterEntry>> => {
      const response = await api.put(`/holiday-work/periods/${holidayId}/roster/${rosterId}`, data);
      return response.data;
    },
    generateCandidates: async (holidayId: number): Promise<HolidayActionResponse<HolidayCandidateScore[]>> => {
      const response = await api.post(`/holiday-work/periods/${holidayId}/candidates/generate`);
      return response.data;
    },
    recalculatePayroll: async (holidayId: number): Promise<HolidayActionResponse<HolidayPayrollLedgerEntry[]>> => {
      const response = await api.post(`/holiday-work/periods/${holidayId}/payroll/recalculate`);
      return response.data;
    },
    publish: async (holidayId: number): Promise<HolidayActionResponse<HolidayPeriod>> => {
      const response = await api.post(`/holiday-work/periods/${holidayId}/publish`);
      return response.data;
    },
    lockPayroll: async (holidayId: number): Promise<HolidayActionResponse<HolidayWorkspaceResponse>> => {
      const response = await api.post(`/holiday-work/periods/${holidayId}/payroll/lock`);
      return response.data;
    },
    createPayrollAdjustment: async (
      holidayId: number,
      data: CreateHolidayPayrollAdjustmentRequest
    ): Promise<HolidayActionResponse<HolidayPayrollAdjustment>> => {
      const response = await api.post(`/holiday-work/periods/${holidayId}/payroll/adjustments`, data);
      return response.data;
    },
    listPerformanceEvents: async (params?: StaffPerformanceEventQuery): Promise<StaffPerformanceEventListResponse> => {
      const response = await api.get('/holiday-work/performance-events', { params });
      return response.data;
    },
    createPerformanceEvent: async (
      data: CreateStaffPerformanceEventRequest
    ): Promise<HolidayActionResponse<StaffPerformanceEvent>> => {
      const response = await api.post('/holiday-work/performance-events', data);
      return response.data;
    },
    reviewPerformanceEvent: async (
      eventId: number,
      data: { status: 'VERIFIED' | 'REJECTED'; rejectionReason?: string }
    ): Promise<HolidayActionResponse<StaffPerformanceEvent>> => {
      const response = await api.post(`/holiday-work/performance-events/${eventId}/review`, data);
      return response.data;
    },
  },
};
