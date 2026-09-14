import type { DashboardTodayResponse, RevenueHourlyResponse } from '@mos-lab/shared';

import { api, dedupeInFlightApiGet } from './base';

export const telecomApi = {
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
    getToday: async (params?: Record<string, unknown>): Promise<DashboardTodayResponse> => {
      return dedupeInFlightApiGet<DashboardTodayResponse>('/dashboard/today', params);
    },
    getRevenueHourly: async (params: {
      dateFrom: string;
      dateTo: string;
      endAt?: string;
      branchKey?: string;
      bookerFilter?: string;
    }): Promise<RevenueHourlyResponse> => {
      return dedupeInFlightApiGet<RevenueHourlyResponse>('/dashboard/today/revenue-hourly', params);
    },
    getRevenueDetail: async (params: {
      dateFrom: string;
      dateTo: string;
      hour?: string;
      branchKey?: string;
      bookerFilter?: string;
    }): Promise<unknown> => {
      return dedupeInFlightApiGet('/dashboard/today/revenue-detail', params);
    },
  },
  cs: {
    // Happy Calls
    listHappyCalls: async (params?: any) => {
      const response = await api.get('/cs/happy-calls', { params });
      return response.data;
    },
    generateHappyCalls: async () => {
      const response = await api.post('/cs/happy-calls/generate');
      return response.data;
    },
    updateHappyCallStatus: async (id: number, status: string) => {
      const response = await api.put(`/cs/happy-calls/${id}/status`, { status });
      return response.data;
    },
    submitSurvey: async (taskId: number, dto: any) => {
      const response = await api.post(`/cs/happy-calls/${taskId}/survey`, dto);
      return response.data;
    },
    // Tickets
    listTickets: async (params?: any) => {
      const response = await api.get('/cs/tickets', { params });
      return response.data;
    },
    createTicket: async (dto: any) => {
      const response = await api.post('/cs/tickets', dto);
      return response.data;
    },
    updateTicket: async (id: number, dto: any) => {
      const response = await api.put(`/cs/tickets/${id}`, dto);
      return response.data;
    },
    resolveTicket: async (id: number, dto: any) => {
      const response = await api.post(`/cs/tickets/${id}/resolve`, dto);
      return response.data;
    },
    scheduleSubtaskInspection: async (subtaskId: number, dto: any) => {
      const response = await api.post(`/cs/tickets/subtasks/${subtaskId}/schedule-inspection`, dto);
      return response.data;
    },
    resolveSubtask: async (subtaskId: number, dto: any) => {
      const response = await api.post(`/cs/tickets/subtasks/${subtaskId}/resolve`, dto);
      return response.data;
    },
    addTicketComment: async (ticketId: number, dto: any) => {
      const response = await api.post(`/cs/tickets/${ticketId}/comments`, dto);
      return response.data;
    },
    getDepartmentHandlers: async () => {
      const response = await api.get('/cs/tickets/department-handlers');
      return response.data;
    },
    updateDepartmentHandlers: async (data: any) => {
      const response = await api.put('/cs/tickets/department-handlers', data);
      return response.data;
    },
    // Campaigns
    listCsCampaigns: async (params?: any) => {
      const response = await api.get('/cs/campaigns', { params });
      return response.data;
    },
    createCsCampaign: async (dto: any) => {
      const response = await api.post('/cs/campaigns', dto);
      return response.data;
    },
    updateCsCampaign: async (id: number, dto: any) => {
      const response = await api.put(`/cs/campaigns/${id}`, dto);
      return response.data;
    },
    activateCsCampaign: async (id: number) => {
      const response = await api.post(`/cs/campaigns/${id}/activate`);
      return response.data;
    },
    getCsCampaignTasks: async (id: number, params?: any) => {
      const response = await api.get(`/cs/campaigns/${id}/tasks`, { params });
      return response.data;
    },
    // Dashboard
    getDashboardStats: async (params?: any) => {
      const response = await api.get('/cs/dashboard/stats', { params });
      return response.data;
    },
    getStaffRankings: async (params?: any) => {
      const response = await api.get('/cs/dashboard/staff-rankings', { params });
      return response.data;
    },
    getRatingTrends: async (params?: any) => {
      const response = await api.get('/cs/dashboard/rating-trends', { params });
      return response.data;
    },
    getCsStaffPerformance: async (params?: any) => {
      const response = await api.get('/cs/dashboard/staff-performance', { params });
      return response.data;
    },
  },
};
