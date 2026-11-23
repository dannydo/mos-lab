import type { AiChatAction, AiChatMessage } from '@mos-lab/shared';

export interface CopilotCurrentUser {
  id: number;
  username: string;
  displayName: string;
  role?: string;
}

export interface AIAssistantWidgetProps {
  themeMode: string;
  currentFilterCriteria?: Record<string, unknown>;
  onApplyFilter: (criteria: Record<string, unknown>) => void;
  currentUser?: CopilotCurrentUser | null;
}

export interface QuickPromptItem {
  label: string;
  prompt: string;
}

export const QUICK_PROMPTS: QuickPromptItem[] = [
  {
    label: 'Giải thích nhóm khách (Buckets)',
    prompt: 'Giải thích các nhóm khách hàng COMBO_LIVE, NOT_COMBO_LIVE, COMBO_DEAD và SINGLE trong hệ thống mOS.',
  },
  {
    label: 'Lọc khách NYC 60 chi tiêu > 1tr',
    prompt:
      'Lọc giúp tôi các khách hàng NYC 60 (31 đến 60 ngày chưa ghé) có tổng chi tiêu trên 1 triệu đồng để gọi nhắc dặm mi.',
  },
  {
    label: 'Khách hàng được giao cho tôi',
    prompt: 'Lọc danh sách khách hàng đang được phân bổ cho riêng tôi.',
  },
  {
    label: 'Tư vấn quy trình CSKH dặm mi',
    prompt: 'Tư vấn quy trình và thời điểm gọi chăm sóc khách hàng dặm mi chuẩn để tối ưu tỷ lệ quay lại.',
  },
];

export const QUICK_CHAT_CHIPS: QuickPromptItem[] = [
  {
    label: 'Nhóm khách',
    prompt: 'Giải thích các nhóm khách',
  },
  {
    label: 'Lọc NYC 60',
    prompt: 'Lọc khách NYC 60 có chi tiêu cao',
  },
  {
    label: 'Tệp của tôi',
    prompt: 'Khách hàng được giao cho tôi',
  },
];

export const PLAYBACK_RATES = [1.0, 1.25, 1.5] as const;

export const COPILOT_AUTO_SPEAK_KEY = 'mos_copilot_auto_speak';
export const COPILOT_PLAYBACK_RATE_KEY = 'mos_copilot_playback_rate';

/** Strip inline `<action>` XML tags so users only see clean natural language in chat bubbles and speech. */
export function sanitizeMessageContent(content?: string | null): string {
  return (content || '')
    .replace(/<action[\s\S]*?<\/action>/gi, '')
    .replace(/<\/?action[^>]*>/gi, '')
    .trim();
}

/** Normalize suggested action arrays from legacy single-action and multi-action payload shapes. */
export function extractMessageActions(msg: AiChatMessage): AiChatAction[] {
  if (msg.suggestedActions && msg.suggestedActions.length > 0) {
    return msg.suggestedActions;
  }
  if (msg.suggestedAction?.actions && msg.suggestedAction.actions.length > 0) {
    return msg.suggestedAction.actions;
  }
  if (msg.suggestedAction) {
    return [msg.suggestedAction];
  }
  return [];
}

export function formatSessionTimestamp(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

export function readAutoSpeakPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(COPILOT_AUTO_SPEAK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function persistAutoSpeakPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COPILOT_AUTO_SPEAK_KEY, String(enabled));
  } catch {
    // Ignore localStorage errors
  }
}

export function readPlaybackRatePreference(): number {
  if (typeof window === 'undefined') return 1.05;
  try {
    const saved = localStorage.getItem(COPILOT_PLAYBACK_RATE_KEY);
    return saved ? parseFloat(saved) || 1.05 : 1.05;
  } catch {
    return 1.05;
  }
}

export function persistPlaybackRatePreference(rate: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COPILOT_PLAYBACK_RATE_KEY, String(rate));
  } catch {
    // Ignore localStorage errors
  }
}
