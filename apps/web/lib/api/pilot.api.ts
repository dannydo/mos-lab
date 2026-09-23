import type {
  CreatePilotSessionRequest,
  PilotMetricsSummary,
  PilotSession,
  PilotSessionsListResponse,
  PilotSessionsQuery,
  UpdatePilotSessionRequest,
} from '@mos-lab/shared';

import { api } from './base';

export const pilotApi = {
  pilot: {
    getFeatureFlag: async (): Promise<{ enabled: boolean; pilotCode: string }> => {
      const response = await api.get('/pilot/feature-flag');
      return response.data;
    },
    listSessions: async (params?: PilotSessionsQuery): Promise<PilotSessionsListResponse> => {
      const response = await api.get('/pilot/sessions', { params });
      return response.data;
    },
    getMetrics: async (params?: PilotSessionsQuery): Promise<PilotMetricsSummary> => {
      const response = await api.get('/pilot/metrics', { params });
      return response.data;
    },
    createSession: async (data: CreatePilotSessionRequest): Promise<PilotSession> => {
      const response = await api.post('/pilot/sessions', data);
      return response.data;
    },
    updateSession: async (id: number, data: UpdatePilotSessionRequest): Promise<PilotSession> => {
      const response = await api.patch(`/pilot/sessions/${id}`, data);
      return response.data;
    },
    deleteSession: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/pilot/sessions/${id}`);
      return response.data;
    },
  },
};
