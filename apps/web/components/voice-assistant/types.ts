export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: 'gemini' | 'fallback';
}

export interface VoiceAssistantContext {
  pathname?: string;
  userName?: string;
  userRole?: string;
}
