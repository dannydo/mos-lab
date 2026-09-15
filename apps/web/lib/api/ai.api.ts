import { api } from './base';

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
  },
};
