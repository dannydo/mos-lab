'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Input, Modal, Tooltip, message as antdMessage, theme } from 'antd';
import { Check, Copy, History, Link2, Loader2, MessageSquare } from 'lucide-react';
import type { AiChatSession } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import {
  buildMosChatAiSessionPermalink,
  isValidMosChatSessionId,
  readMosChatSessionId,
} from '../utils/mos-chat-permalink';

export const MOS_CHAT_AI_SESSION_SCOPE = 'mos-chat-private';

/** Copy a mOS Chat permalink to the clipboard and tell the user. */
export async function copyMosChatSessionPermalink(sessionId: string): Promise<boolean> {
  const url = buildMosChatAiSessionPermalink(sessionId);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      throw new Error('clipboard unavailable');
    }
    antdMessage.success('Đã sao chép liên kết cố định của phiên hội thoại');
    return true;
  } catch {
    antdMessage.warning(`Không thể tự sao chép. Liên kết: ${url}`);
    return false;
  }
}

/**
 * Accepts either a raw session id or a full permalink and returns the session id (or undefined).
 */
export function parseSessionIdFromInput(input: string): string | undefined {
  const raw = input.trim();
  if (!raw) return undefined;
  if (isValidMosChatSessionId(raw)) return raw;
  try {
    const url = new URL(raw, 'http://localhost');
    return readMosChatSessionId((key) => url.searchParams.get(key));
  } catch {
    return undefined;
  }
}

/** Owner-side privacy summary read from the session metadata (sharing flag + Admin/Super Admin views). */
export function summarizeSessionPrivacy(metadata: AiChatSession['metadata']): {
  shared: boolean;
  adminViews: number;
  lastView?: { name: string; mode: string; at: string };
} {
  const meta = (metadata || {}) as {
    sharing?: { enabled?: boolean };
    accessLog?: Array<{ viewerName?: string; mode?: string; at?: string }>;
  };
  const log = Array.isArray(meta.accessLog) ? meta.accessLog : [];
  const last = log[log.length - 1];
  return {
    shared: meta.sharing?.enabled === true,
    adminViews: log.length,
    ...(last ? { lastView: { name: last.viewerName || 'Quản trị', mode: last.mode || '', at: last.at || '' } } : {}),
  };
}

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', { hour12: false, dateStyle: 'short', timeStyle: 'short' });
}

export interface MosChatAiSessionsModalProps {
  open: boolean;
  onClose: () => void;
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

export const MosChatAiSessionsModal: React.FC<MosChatAiSessionsModalProps> = ({
  open,
  onClose,
  activeSessionId,
  onSelectSession,
}) => {
  const { token } = theme.useToken();
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.ai.listSessions({ scope: MOS_CHAT_AI_SESSION_SCOPE });
      setSessions(res?.sessions || []);
    } catch {
      setLoadError('Không tải được danh sách phiên hội thoại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadSessions();
  }, [open, loadSessions]);

  const handleCopy = async (sessionId: string) => {
    const ok = await copyMosChatSessionPermalink(sessionId);
    if (ok) {
      setCopiedId(sessionId);
      window.setTimeout(() => setCopiedId((cur) => (cur === sessionId ? null : cur)), 1800);
    }
  };

  const handleOpenPasted = () => {
    const sessionId = parseSessionIdFromInput(pasted);
    if (!sessionId) {
      antdMessage.warning('Liên kết hoặc mã phiên không hợp lệ.');
      return;
    }
    setPasted('');
    onSelectSession(sessionId);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={560}
      destroyOnHidden
      title={
        <span className="inline-flex items-center gap-2">
          <History size={16} />
          Lịch sử phiên hội thoại MAI
        </span>
      }
    >
      <div className="flex flex-col gap-3" data-testid="mos-chat-ai-sessions-modal">
        <div className="flex items-center gap-2">
          <Input
            size="middle"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            onPressEnter={handleOpenPasted}
            prefix={<Link2 size={14} />}
            placeholder="Dán liên kết hoặc mã phiên để mở"
            aria-label="Dán liên kết hoặc mã phiên"
            allowClear
          />
          <button
            type="button"
            onClick={handleOpenPasted}
            className="px-3 h-8 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{ background: token.colorPrimary, color: '#fff' }}
          >
            Mở phiên
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto flex flex-col gap-2 pr-1">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8" style={{ color: token.colorTextSecondary }}>
              <Loader2 size={16} className="animate-spin" /> Đang tải...
            </div>
          )}
          {!loading && loadError && (
            <div className="py-6 text-center text-sm" style={{ color: token.colorError }}>
              {loadError}
            </div>
          )}
          {!loading && !loadError && sessions.length === 0 && (
            <div className="py-8 text-center text-sm" style={{ color: token.colorTextSecondary }}>
              Chưa có phiên hội thoại nào. Hãy nhắn cho MAI để tạo phiên đầu tiên.
            </div>
          )}
          {!loading &&
            sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              const privacy = summarizeSessionPrivacy(s.metadata);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2"
                  style={{
                    border: `1px solid ${isActive ? token.colorPrimary : token.colorBorderSecondary}`,
                    background: isActive ? token.colorPrimaryBg : token.colorBgContainer,
                  }}
                >
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left cursor-pointer bg-transparent border-0 p-0"
                    onClick={() => onSelectSession(s.id)}
                    aria-label={`Mở phiên ${s.title}`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} style={{ color: token.colorTextSecondary }} />
                      <span className="truncate text-sm font-medium" style={{ color: token.colorText }}>
                        {s.title || 'Hội thoại mới'}
                      </span>
                      {privacy.shared && (
                        <span
                          className="inline-flex items-center justify-center leading-none rounded-full px-2 py-1 text-[10px]"
                          style={{ background: token.colorSuccessBg, color: token.colorSuccess }}
                        >
                          Đang chia sẻ
                        </span>
                      )}
                      {isActive && (
                        <span
                          className="inline-flex items-center justify-center leading-none rounded-full px-2 py-1 text-[10px]"
                          style={{ background: token.colorPrimary, color: '#fff' }}
                        >
                          Đang mở
                        </span>
                      )}
                    </div>
                    {s.lastMessage && (
                      <div className="truncate text-xs mt-0.5" style={{ color: token.colorTextSecondary }}>
                        {s.lastMessage}
                      </div>
                    )}
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: token.colorTextTertiary, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatSessionTime(s.updatedAt)} · {s.messageCount ?? 0} tin nhắn
                    </div>
                    {privacy.adminViews > 0 && privacy.lastView && (
                      <div className="text-[11px] mt-0.5" style={{ color: token.colorWarning }}>
                        Quản trị đã xem {privacy.adminViews} lần · gần nhất: {privacy.lastView.name} (
                        {privacy.lastView.mode === 'mission' ? 'liên quan mOS Mission' : 'rà soát bảo mật'}
                        {privacy.lastView.at ? `, ${formatSessionTime(privacy.lastView.at)}` : ''})
                      </div>
                    )}
                  </button>
                  <Tooltip title="Sao chép liên kết cố định">
                    <button
                      type="button"
                      aria-label={`Sao chép liên kết phiên ${s.title}`}
                      onClick={() => void handleCopy(s.id)}
                      className="w-8 h-8 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                      style={{ color: token.colorTextSecondary }}
                    >
                      {copiedId === s.id ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </Tooltip>
                </div>
              );
            })}
        </div>
      </div>
    </Modal>
  );
};

export default MosChatAiSessionsModal;
