import React from 'react';
import type { ParsedGoogleWorkspaceRange } from '@mos-lab/shared';
import type { OpenGoogleWorkspaceReaderPayload } from '../../utils/google-workspace-bridge';

export const MOS_CHAT_GW_DRAWER_WIDTH_KEY = 'mos_chat_gw_drawer_width_v1';
export const MOS_CHAT_GW_DRAWER_SESSION_KEY = 'mos_chat_gw_drawer_session_v1';

export const MIN_GW_DRAWER_WIDTH = 380;
export const DEFAULT_GW_DRAWER_WIDTH = 680;
export const MAX_FAST_GRID_COLS = 52;

export interface StoredGwDrawerSession {
  open: boolean;
  payload: OpenGoogleWorkspaceReaderPayload | null;
  selectedGid?: string | null;
  readerMode: 'fast' | 'embed';
  updatedAt: number;
}

export interface MosChatGoogleWorkspaceDrawerProps {
  isMobile?: boolean;
  isDark: boolean;
  activeConversationId?: string;
  portalOpen?: boolean;
  surfaceBg?: string;
  surfaceRaised?: string;
  canvasBg?: string;
  borderColor?: string;
  onEnsureContainerWidth?: (desiredDrawerWidth: number) => void;
  onPostAiReplyToChat?: (replyText: string, docTitle: string) => void;
}

export function getMaxAllowedGwDrawerWidth(basisWidth?: number): number {
  const fallback = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1920;
  const basis = basisWidth && basisWidth > 0 ? basisWidth : fallback;
  return Math.max(MIN_GW_DRAWER_WIDTH, Math.min(Math.round(basis * 0.86), basis - 280));
}

export function clampGwDrawerWidth(width: number, basisWidth?: number): number {
  if (!Number.isFinite(width)) return DEFAULT_GW_DRAWER_WIDTH;
  const maxAllowed = getMaxAllowedGwDrawerWidth(basisWidth);
  return Math.max(MIN_GW_DRAWER_WIDTH, Math.min(maxAllowed, Math.round(width)));
}

export function readStoredGwDrawerWidth(basisWidth?: number): number {
  const fallbackDefault = clampGwDrawerWidth(DEFAULT_GW_DRAWER_WIDTH, basisWidth);
  if (typeof window === 'undefined') return fallbackDefault;
  try {
    const raw = window.localStorage.getItem(MOS_CHAT_GW_DRAWER_WIDTH_KEY);
    if (!raw) return fallbackDefault;
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return fallbackDefault;
    return clampGwDrawerWidth(num, basisWidth);
  } catch {
    return fallbackDefault;
  }
}

export function writeStoredGwDrawerWidth(width: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MOS_CHAT_GW_DRAWER_WIDTH_KEY, String(Math.round(width)));
  } catch {
    // ignore storage quota error
  }
}

export function sanitizePayloadForStorage(
  payload: OpenGoogleWorkspaceReaderPayload | null
): OpenGoogleWorkspaceReaderPayload | null {
  if (!payload || !payload.url) return null;
  return {
    url: payload.url,
    gid: payload.gid ?? null,
    range: payload.range ?? null,
    conversationId: payload.conversationId,
    messageId: payload.messageId,
    initialMode: payload.initialMode,
  };
}

export function readStoredGwDrawerSession(): StoredGwDrawerSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MOS_CHAT_GW_DRAWER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredGwDrawerSession>;
    if (!parsed || parsed.open !== true || !parsed.payload?.url) return null;
    return {
      open: true,
      payload: sanitizePayloadForStorage(parsed.payload),
      selectedGid: parsed.selectedGid ?? undefined,
      readerMode: parsed.readerMode === 'embed' ? 'embed' : 'fast',
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeStoredGwDrawerSession(session: StoredGwDrawerSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MOS_CHAT_GW_DRAWER_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore storage quota error
  }
}

export function clearStoredGwDrawerSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MOS_CHAT_GW_DRAWER_SESSION_KEY);
  } catch {
    // ignore storage error
  }
}

export function isCellInRange(rowNumber: number, colIndex: number, range?: ParsedGoogleWorkspaceRange | null): boolean {
  if (!range) return false;
  return (
    rowNumber >= range.startRow && rowNumber <= range.endRow && colIndex >= range.startCol && colIndex <= range.endCol
  );
}

export function highlightMatchText(text: string, query: string, isDark: boolean): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase()
      ? React.createElement(
          'mark',
          {
            key: idx,
            className: `px-0.5 rounded ${isDark ? 'bg-amber-400/30 text-amber-100' : 'bg-amber-200 text-amber-950'}`,
          },
          part
        )
      : React.createElement(React.Fragment, { key: idx }, part)
  );
}
