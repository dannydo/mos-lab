import type {
  CreatePilotMaterialRequest,
  CreatePilotSessionRequest,
  CreatePilotSopStepRequest,
  FinishSessionStepRequest,
  PilotMaterial,
  PilotMetricsSummary,
  PilotSession,
  PilotSessionStep,
  PilotSessionsListResponse,
  PilotSessionsQuery,
  PilotSopStep,
  ReorderPilotSopStepsRequest,
  StartSessionStepRequest,
  UpdatePilotMaterialRequest,
  UpdatePilotSessionRequest,
  UpdatePilotSopStepRequest,
  UpdateSessionStepNoteRequest,
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
    saveFeedback: async (
      id: number,
      data: { feedbackRating: number; feedbackNote?: string }
    ): Promise<PilotSession> => {
      const response = await api.post(`/pilot/sessions/${id}/feedback`, data);
      return response.data;
    },
    checkOut: async (id: number, data?: { checkOutAt?: string }): Promise<PilotSession> => {
      const response = await api.post(`/pilot/sessions/${id}/check-out`, data || {});
      return response.data;
    },
    uploadPhoto: async (data: {
      photoData: string;
      mimeType?: string;
      filename?: string;
    }): Promise<{ photoUrl: string }> => {
      const response = await api.post('/pilot/upload-photo', data);
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
    seedDefaultMaterials: async (params?: { pilotCode?: string }): Promise<PilotMaterial[]> => {
      const response = await api.post('/pilot/materials/seed-defaults', params || {});
      return response.data;
    },
    listSopSteps: async (params?: { pilotCode?: string }): Promise<PilotSopStep[]> => {
      const response = await api.get('/pilot/sop-steps', { params });
      return response.data;
    },
    createSopStep: async (data: CreatePilotSopStepRequest): Promise<PilotSopStep> => {
      const response = await api.post('/pilot/sop-steps', data);
      return response.data;
    },
    updateSopStep: async (id: number, data: UpdatePilotSopStepRequest): Promise<PilotSopStep> => {
      const response = await api.patch(`/pilot/sop-steps/${id}`, data);
      return response.data;
    },
    deleteSopStep: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/pilot/sop-steps/${id}`);
      return response.data;
    },
    reorderSopSteps: async (data: ReorderPilotSopStepsRequest): Promise<PilotSopStep[]> => {
      const response = await api.post('/pilot/sop-steps/reorder', data);
      return response.data;
    },
    seedDefaultSopSteps: async (params?: { pilotCode?: string }): Promise<PilotSopStep[]> => {
      const response = await api.post('/pilot/sop-steps/seed-defaults', params || {});
      return response.data;
    },
    getSessionSteps: async (sessionId: number): Promise<PilotSessionStep[]> => {
      const response = await api.get(`/pilot/sessions/${sessionId}/steps`);
      return response.data;
    },
    startSessionStep: async (
      sessionId: number,
      stepId: number,
      data?: StartSessionStepRequest
    ): Promise<PilotSessionStep> => {
      const response = await api.post(`/pilot/sessions/${sessionId}/steps/${stepId}/start`, data || {});
      return response.data;
    },
    finishSessionStep: async (
      sessionId: number,
      stepId: number,
      data?: FinishSessionStepRequest
    ): Promise<PilotSessionStep> => {
      const response = await api.post(`/pilot/sessions/${sessionId}/steps/${stepId}/finish`, data || {});
      return response.data;
    },
    updateSessionStepNote: async (
      sessionId: number,
      stepId: number,
      data: UpdateSessionStepNoteRequest
    ): Promise<PilotSessionStep> => {
      const response = await api.patch(`/pilot/sessions/${sessionId}/steps/${stepId}/note`, data);
      return response.data;
    },
    resetSessionStep: async (sessionId: number, stepId: number): Promise<PilotSessionStep> => {
      const response = await api.post(`/pilot/sessions/${sessionId}/steps/${stepId}/reset`);
      return response.data;
    },
  },
};
