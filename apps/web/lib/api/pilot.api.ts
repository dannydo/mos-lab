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
    checkIn: async (id: number, data?: { checkInAt?: string }): Promise<PilotSession> => {
      const response = await api.post(`/pilot/sessions/${id}/check-in`, data || {});
      return response.data;
    },
    saveBeforePhoto: async (id: number, data: { beforePhotoUrl: string }): Promise<PilotSession> => {
      const response = await api.post(`/pilot/sessions/${id}/before-photo`, data);
      return response.data;
    },
    markServiceDone: async (id: number, data?: { serviceDoneAt?: string }): Promise<PilotSession> => {
      const response = await api.post(`/pilot/sessions/${id}/service-done`, data || {});
      return response.data;
    },
    saveAfterPhoto: async (id: number, data: { afterPhotoUrl: string }): Promise<PilotSession> => {
      const response = await api.post(`/pilot/sessions/${id}/after-photo`, data);
      return response.data;
    },
    saveFeedback: async (id: number, data: { feedbackRating: number; feedbackNote?: string }): Promise<PilotSession> => {
      const response = await api.post(`/pilot/sessions/${id}/feedback`, data);
      return response.data;
    },
    checkOut: async (id: number, data?: { checkOutAt?: string }): Promise<PilotSession> => {
      const response = await api.post(`/pilot/sessions/${id}/check-out`, data || {});
      return response.data;
    },
    uploadPhoto: async (data: { photoData: string; mimeType?: string; filename?: string }): Promise<{ photoUrl: string }> => {
      const response = await api.post('/pilot/upload-photo', data);
      return response.data;
    },
    deleteSession: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/pilot/sessions/${id}`);
      return response.data;
    },
  },
};
