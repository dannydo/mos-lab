'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, message } from 'antd';
import { Loader2, Rocket, Send, X } from 'lucide-react';
import {
  BUG_REPORT_Z_INDEX,
  type MosChatConversation,
  type MosChatStaffMember,
  type SafeAny,
} from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../lib/api-client';
import { safeStorage } from '../../lib/safe-storage';
import { AdaptiveModal } from '../ui';
import { ForwardTargetPickerSection } from '../mos-chat/components/mos-chat-forward-modal/ForwardTargetPickerSection';
import {
  buildForwardTargetOptions,
  filterAndGroupForwardTargets,
  resolveCurrentStaffId,
} from '../mos-chat/components/mos-chat-forward-modal/forwardModalHelpers';
import { MAX_FORWARD_TARGETS, type ForwardTargetOption } from '../mos-chat/components/mos-chat-forward-modal/forwardModalTypes';

export interface ShareBugReportTarget {
  id: number;
  key: string;
  title: string;
  requestType: 'BUG' | 'FEATURE';
  statusLabel?: string;
  summary?: string | null;
}

export interface ShareBugReportToChatModalProps {
  open: boolean;
  ticket: ShareBugReportTarget | null;
  onClose: () => void;
  onAfterNavigateToChat?: () => void;
}

/**
 * Instagram-inspired Share Sheet modal that sends a live mOS Mission card
 * for a ticket into one or more mOS Chat Spaces or 1-1 DMs.
 */
export const ShareBugReportToChatModal: React.FC<ShareBugReportToChatModalProps> = ({
  open,
  ticket,
  onClose,
  onAfterNavigateToChat,
}) => {
  const router = useRouter();
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  const [loadingTargets, setLoadingTargets] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<MosChatConversation[]>([]);
  const [staffDirectory, setStaffDirectory] = useState<MosChatStaffMember[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [note, setNote] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openChatAfterSend, setOpenChatAfterSend] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const currentUser = useMemo<SafeAny>(() => {
    try {
      const raw = safeStorage.getItem('mos_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!open || !ticket) return;
    setSearchQuery('');
    setNote('');
    setSelectedKeys([]);
    setIsSubmitting(false);
    setOpenChatAfterSend(false);
    setLoadError(null);

    let cancelled = false;
    setLoadingTargets(true);
    void apiClient.chat
      .bootstrap({ messageLimit: 0 })
      .then((res) => {
        if (cancelled) return;
        setConversations(Array.isArray(res?.conversations) ? res.conversations : []);
        setStaffDirectory(Array.isArray(res?.staffDirectory) ? res.staffDirectory : []);
        setPinnedIds(Array.isArray(res?.userPrefs?.pinnedIds) ? res.userPrefs.pinnedIds : []);
        window.setTimeout(() => searchInputRef.current?.focus(), 60);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null;
        setLoadError(msg || 'Không thể tải danh sách phòng chat và nhân sự mOS Chat.');
      })
      .finally(() => {
        if (!cancelled) setLoadingTargets(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, ticket?.id]);

  const myStaffId = useMemo(
    () => resolveCurrentStaffId(currentUser, staffDirectory),
    [currentUser, staffDirectory]
  );

  const allTargetOptions = useMemo<ForwardTargetOption[]>(
    () =>
      buildForwardTargetOptions({
        conversations,
        staffDirectory,
        pinnedIds,
        myStaffId,
        currentUser,
      }),
    [conversations, staffDirectory, pinnedIds, myStaffId, currentUser]
  );

  const groupedTargets = useMemo(
    () => filterAndGroupForwardTargets(allTargetOptions, searchQuery),
    [allTargetOptions, searchQuery]
  );

  const optionByKey = useMemo(() => {
    const map = new Map<string, ForwardTargetOption>();
    for (const opt of allTargetOptions) {
      map.set(opt.key, opt);
    }
    return map;
  }, [allTargetOptions]);

  const toggleSelectKey = (key: string) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_FORWARD_TARGETS) {
        message.warning(`Chỉ có thể chọn tối đa ${MAX_FORWARD_TARGETS} nơi nhận trong một lần.`);
        return prev;
      }
      return [...prev, key];
    });
  };

  const handleConfirmShare = async () => {
    if (!ticket || selectedKeys.length === 0 || isSubmitting) return;

    const targetConversationIds: string[] = [];
    const targetStaffIds: number[] = [];

    for (const key of selectedKeys) {
      const opt = optionByKey.get(key);
      if (!opt) continue;
      if (opt.kind === 'conv' && opt.conversationId) {
        targetConversationIds.push(opt.conversationId);
      } else if (opt.kind === 'staff' && opt.staffId) {
        targetStaffIds.push(opt.staffId);
      }
    }

    if (targetConversationIds.length === 0 && targetStaffIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await apiClient.chat.shareMission({
        reportId: ticket.id,
        targetConversationIds,
        targetStaffIds,
        note: note.trim() || null,
      });

      if (res?.success) {
        const count = res.results?.length || 1;
        const first = res.results?.[0];
        const chatHref = first
          ? `/chat?conversationId=${encodeURIComponent(first.conversationId)}&messageId=${encodeURIComponent(first.message.id)}`
          : '/chat';

        onClose();

        if (openChatAfterSend) {
          onAfterNavigateToChat?.();
          router.push(chatHref);
          return;
        }

        message.success(
          <span className="inline-flex items-center gap-2">
            <span>
              Đã chia sẻ {ticket.key} tới {count} nơi nhận trong mOS Chat.
            </span>
            <button
              type="button"
              onClick={() => {
                onAfterNavigateToChat?.();
                router.push(chatHref);
              }}
              className="font-bold underline cursor-pointer bg-transparent border-none p-0 text-amber-500"
            >
              Mở mOS Chat
            </button>
          </span>,
          5
        );
      }
    } catch (err) {
      const errMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(errMsg || 'Không thể chia sẻ yêu cầu vào mOS Chat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ticket) return null;

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnHidden
      intent="confirm"
      zIndex={BUG_REPORT_Z_INDEX.SHARE_MODAL}
      width={540}
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      closable={{
        closeIcon: (
          <span
            aria-label="Đóng hộp thoại chia sẻ"
            className={`inline-flex items-center justify-center p-1 rounded-lg ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <X size={16} />
          </span>
        ),
      }}
      styles={{
        content: {
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(255, 255, 255)',
          border: isDark ? '1px solid rgb(42, 42, 47)' : '1px solid rgb(226, 232, 240)',
        },
        body: {
          padding: 0,
          overscrollBehavior: 'contain',
        },
      }}
      title={null}
    >
      <div
        className={`flex flex-col max-h-[86vh] ${isDark ? 'bg-[#141414] text-slate-100' : 'bg-white text-slate-900'}`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3.5 border-b flex items-center gap-2.5 pr-11 ${
            isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 ${
              isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-600/10 text-amber-600'
            }`}
          >
            <Send size={15} />
          </div>
          <div className="min-w-0">
            <h2 className={`text-[15px] font-bold leading-tight m-0 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Chia sẻ yêu cầu vào mOS Chat
            </h2>
            <p className={`text-[11.5px] m-0 mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Gửi thẻ mOS Mission kèm link mở xem trực tiếp để trao đổi trên Lab
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3 overflow-y-auto overscroll-contain flex-1">
          {/* Shared Ticket Preview Card (mOS MISSION style) */}
          <div
            className={`rounded-xl p-3 border space-y-1.5 ${
              isDark
                ? 'bg-purple-950/25 border-purple-500/35'
                : 'bg-purple-50/90 border-purple-500/30'
            }`}
            style={{ borderLeft: '3.5px solid #a78bfa' }}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-extrabold"
                  style={{
                    background: 'rgba(212, 168, 75, 0.2)',
                    color: '#d4a84b',
                    border: '1px solid rgba(212, 168, 75, 0.4)',
                  }}
                >
                  <Rocket size={11} />
                  <span>mOS MISSION · #{ticket.key}</span>
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-500/15 text-purple-700'
                  }`}
                >
                  {ticket.requestType === 'FEATURE' ? 'Tính năng mới' : 'Báo lỗi'}
                </span>
              </div>
              {ticket.statusLabel && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                    isDark ? 'bg-white/10 text-slate-200' : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  {ticket.statusLabel}
                </span>
              )}
            </div>
            <div className={`text-[13px] font-bold leading-snug ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {ticket.title}
            </div>
            {ticket.summary && (
              <p className={`text-[11.5px] m-0 line-clamp-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {ticket.summary}
              </p>
            )}
          </div>

          {loadingTargets ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 size={20} className="animate-spin text-amber-500" />
              <span>Đang tải danh sách phòng chat và nhân sự…</span>
            </div>
          ) : loadError ? (
            <Alert
              type="error"
              showIcon
              message="Không thể tải danh sách mOS Chat"
              description={loadError}
              action={
                <Button size="small" onClick={onClose}>
                  Đóng
                </Button>
              }
            />
          ) : (
            <ForwardTargetPickerSection
              isDark={isDark}
              note={note}
              onChangeNote={setNote}
              searchQuery={searchQuery}
              onChangeSearchQuery={setSearchQuery}
              searchInputRef={searchInputRef}
              selectedKeys={selectedKeys}
              optionByKey={optionByKey}
              groupedTargets={groupedTargets}
              onToggleSelectKey={toggleSelectKey}
              staffDirectory={staffDirectory}
            />
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 ${
            isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <label
            className={`inline-flex items-center gap-2 text-[12px] cursor-pointer select-none ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <input
              type="checkbox"
              checked={openChatAfterSend}
              onChange={(e) => setOpenChatAfterSend(e.target.checked)}
              className="accent-amber-500 rounded cursor-pointer"
            />
            <span>Mở mOS Chat sau khi gửi</span>
          </label>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold cursor-pointer transition-colors border bg-transparent ${
                isDark
                  ? 'border-zinc-800 text-slate-400 hover:bg-white/5'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmShare()}
              disabled={selectedKeys.length === 0 || isSubmitting || loadingTargets}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-[12.5px] font-bold cursor-pointer transition-all disabled:opacity-45 disabled:cursor-not-allowed tabular-nums bg-amber-500 hover:bg-amber-400 text-slate-900"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
              <span>{selectedKeys.length > 0 ? `Gửi (${selectedKeys.length})` : 'Gửi'}</span>
            </button>
          </div>
        </div>
      </div>
    </AdaptiveModal>
  );
};
