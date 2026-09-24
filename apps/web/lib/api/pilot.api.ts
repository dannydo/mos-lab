import type {
  CreatePilotMaterialRequest,
  CreatePilotSessionRequest,
  PilotMaterial,
  PilotMetricsSummary,
  PilotSession,
  PilotSessionsListResponse,
  PilotSessionsQuery,
  UpdatePilotMaterialRequest,
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
    listMaterials: async (params?: { pilotCode?: string }): Promise<PilotMaterial[]> => {
      const response = await api.get('/pilot/materials', { params });
      return response.data;
    },
    createMaterial: async (data: CreatePilotMaterialRequest): Promise<PilotMaterial> => {
      const response = await api.post('/pilot/materials', data);
      return response.data;
    },
    updateMaterial: async (id: number, data: UpdatePilotMaterialRequest): Promise<PilotMaterial> => {
      const response = await api.patch(`/pilot/materials/${id}`, data);
      return response.data;
    },
    deleteMaterial: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/pilot/materials/${id}`);
      return response.data;
    },
  },
};
