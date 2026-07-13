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
  UserRole,
  ColumnConfig
} from '@mos-lab/shared';

// API Client SDK for mos-lab
export const apiClient = {
  auth: {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    google: async (data: { credential?: string; isMock?: boolean; email?: string; name?: string }): Promise<LoginResponse> => {
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
    }
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
    getHistory: async (id: number): Promise<any[]> => {
      const response = await api.get(`/customers/${id}/history`);
      return response.data;
    },
    getRandomIds: async (params: any): Promise<number[]> => {
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
    getStaff: async (): Promise<Staff[]> => {
      const response = await api.get('/customers/staff');
      return response.data;
    },
    getAssignmentHistory: async (params: any): Promise<any> => {
      const response = await api.get('/customers/assignment-history', { params });
      return response.data;
    },
    getAssignmentHistoryDetails: async (batchId: string): Promise<any> => {
      const response = await api.get(`/customers/assignment-history/${batchId}/details`);
      return response.data;
    },
    undoAssignment: async (batchId: string): Promise<any> => {
      const response = await api.post('/customers/assignment-history/undo', { batchId });
      return response.data;
    },
    getReferrals: async (): Promise<any[]> => {
      const response = await api.get('/customers/referrals');
      return response.data;
    },
    getAppointments: async (params: any): Promise<any> => {
      const response = await api.get('/customers/appointments', { params });
      return response.data;
    },
    deleteBooking: async (orderId: number): Promise<any> => {
      const response = await api.delete(`/customers/booking/${orderId}`);
      return response.data;
    }
  },

  plans: {
    create: async (data: { legacyUserId: number; date?: string; bucket?: string; priority?: number }): Promise<DailyPlan> => {
      const response = await api.post('/plans', data);
      return response.data;
    },
    listToday: async (): Promise<DailyPlan[]> => {
      const response = await api.get('/plans/today');
      return response.data;
    },
    updateStatus: async (id: number, status: string): Promise<DailyPlan> => {
      const response = await api.put(`/plans/${id}`, { status });
      return response.data;
    },
    confirm: async (planId: number, data?: any): Promise<DailyPlan> => {
      const response = await api.put(`/plans/${planId}/confirm`, data);
      return response.data;
    },
    getWeekly: async (params: { weekStart: string; assignedStaffId?: string }): Promise<CustomerWeeklyProgress[]> => {
      const response = await api.get('/plans/weekly', { params });
      return response.data;
    },
    getSuggestions: async (): Promise<any> => {
      const response = await api.get('/plans/suggest');
      return response.data;
    }
  },

  calls: {
    create: async (data: CreateCallRequest): Promise<CallLog> => {
      const response = await api.post('/calls', data);
      return response.data;
    },
    listByCustomer: async (customerId: number): Promise<CallLog[]> => {
      const response = await api.get(`/calls/${customerId}`);
      return response.data;
    }
  },

  kpi: {
    getSummary: async (params: { startDate: string; endDate: string; staffId?: string; role?: string }): Promise<KPISummary & { salary?: any }> => {
      const response = await api.get('/kpi/summary', { params });
      return response.data;
    },
    getTrends: async (params: any): Promise<any> => {
      const response = await api.get('/kpi/trends', { params });
      return response.data;
    },
    getLeaderboard: async (params: any): Promise<any> => {
      const response = await api.get('/kpi/leaderboard', { params });
      return response.data;
    },
    getSalaryConfig: async (): Promise<any> => {
      const response = await api.get('/kpi/salary-config');
      return response.data;
    },
    updateSalaryConfig: async (config: any): Promise<{ success: boolean; message: string }> => {
      const response = await api.post('/kpi/salary-config', config);
      return response.data;
    },
    getBookerAppointments: async (params: any): Promise<any> => {
      const response = await api.get('/kpi/booker-appointments', { params });
      return response.data;
    }
  },

  nyc: {
    getConfig: async (): Promise<any> => {
      const response = await api.get('/nyc/config');
      return response.data;
    },
    updateConfig: async (configs: any): Promise<any> => {
      const response = await api.put('/nyc/config', configs);
      return response.data;
    }
  },

  staff: {
    list: async (params?: any): Promise<Staff[]> => {
      const response = await api.get('/staff', { params });
      return response.data;
    },
    getLegacy: async (): Promise<any[]> => {
      const response = await api.get('/staff/legacy');
      return response.data;
    },
    create: async (data: any): Promise<Staff> => {
      const response = await api.post('/staff', data);
      return response.data;
    },
    update: async (id: number, data: any): Promise<Staff> => {
      const response = await api.put(`/staff/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/staff/${id}`);
      return response.data;
    }
  },

  roles: {
    list: async (): Promise<any[]> => {
      const response = await api.get('/roles');
      return response.data;
    },
    create: async (data: any): Promise<any> => {
      const response = await api.post('/roles', data);
      return response.data;
    },
    update: async (key: string, data: any): Promise<any> => {
      const response = await api.put(`/roles/${key}`, data);
      return response.data;
    },
    delete: async (key: string): Promise<{ success: boolean }> => {
      const response = await api.delete(`/roles/${key}`);
      return response.data;
    }
  },

  savedFilters: {
    list: async (): Promise<any[]> => {
      const response = await api.get('/saved-filters');
      return response.data;
    },
    create: async (data: any): Promise<any> => {
      const response = await api.post('/saved-filters', data);
      return response.data;
    },
    delete: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/saved-filters/${id}`);
      return response.data;
    }
  },

  tableConfig: {
    get: async (tableId: string): Promise<{ userConfig: ColumnConfig[] | null; defaultConfig: ColumnConfig[] | null }> => {
      const response = await api.get(`/table-config/${tableId}`);
      return response.data;
    },
    save: async (tableId: string, columns: ColumnConfig[], saveAsDefault?: boolean): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/table-config/${tableId}`, { columns, saveAsDefault });
      return response.data;
    },
    reset: async (tableId: string): Promise<{ success: boolean; message: string }> => {
      const response = await api.post(`/table-config/${tableId}/reset`);
      return response.data;
    }
  }
};
