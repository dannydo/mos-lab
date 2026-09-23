import { api } from './base';
import type {
  AiAssistantChatRequest,
  AiAssistantChatResponse,
  AiChatSession,
  CreateAiSessionRequest,
  GetAiSessionResponse,
  ListAiSessionsResponse,
} from '@mos-lab/shared';

export interface VoiceChatRequest {
  message: string;
  context?: {
    pathname?: string;
    userName?: string;
    userRole?: string;
  };
  history?: Array<{
    role: 'user' | 'model';
    text: string;
  }>;
}

export interface VoiceChatResponse {
  reply: string;
  source?: 'gemini' | 'fallback';
  error?: string;
}

export const aiApi = {
  ai: {
    voiceChat: async (data: VoiceChatRequest): Promise<VoiceChatResponse> => {
      const response = await api.post<VoiceChatResponse>('/ai/voice-chat', data);
      return response.data;
    },
    listSessions: async (params?: { scope?: string }): Promise<ListAiSessionsResponse> => {
      const response = await api.get<ListAiSessionsResponse>('/ai/chat/sessions', { params });
      return response.data;
    },
    createSession: async (data: CreateAiSessionRequest): Promise<{ session: AiChatSession }> => {
      const response = await api.post<{ session: AiChatSession }>('/ai/chat/sessions', data);
      return response.data;
    },
    getSession: async (sessionId: string): Promise<GetAiSessionResponse> => {
      const response = await api.get<GetAiSessionResponse>(`/ai/chat/sessions/${sessionId}`);
      return response.data;
    },
    deleteSession: async (sessionId: string): Promise<{ success: boolean }> => {
      const response = await api.delete<{ success: boolean }>(`/ai/chat/sessions/${sessionId}`);
      return response.data;
    },
    sendMessage: async (data: AiAssistantChatRequest): Promise<AiAssistantChatResponse> => {
      const response = await api.post<AiAssistantChatResponse>('/ai/chat/message', data, {
        timeout: 240_000,
      });
      return response.data;
    },
  },
};
