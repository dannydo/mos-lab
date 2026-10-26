'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Hash,
  Pin,
  Mail,
  MailOpen,
  Maximize2,
  Minus,
  X,
  AlarmClockPlus,
  SmilePlus,
  ImagePlus,
  SendHorizontal,
  ChevronLeft,
  Smartphone,
  CheckCircle2,
  Clock,
  Plus,
  MessageSquareReply,
  CheckSquare,
  Square,
  AlertCircle,
  MoreHorizontal,
  Paperclip,
  Check,
  ArrowDown,
} from 'lucide-react';
import { Tooltip, Popover, Dropdown } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatImageAttachment,
  SafeAny,
} from '@mos-lab/shared';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export type MosChatDockPreset = 'compact' | 'standard' | 'promax' | 'custom';

export interface MosChatDockDimension {
  width: number;
  height: number;
  preset?: MosChatDockPreset;
}

export const DOCK_PRESET_CONFIGS: Record<
  'compact' | 'standard' | 'promax',
  { width: number; height: number; label: string }
> = {
  compact: { width: 340, height: 500, label: 'iPhone Mini (340×500)' },
  standard: { width: 385, height: 600, label: 'iPhone Tiêu chuẩn (385×600)' },
  promax: { width: 430, height: 720, label: 'iPhone Pro Max (430×720)' },
};

export const DOCKED_STORAGE_KEY_V2 = 'mos_chat_docked_state_v2';

export interface MosChatDockedWindowsProps {
  isMobile: boolean;
  dockedConvIds: string[];
  conversations: MosChatConversation[];
  collapsedDockIds: Record<string, boolean>;
  setCollapsedDockIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  userPrefs: SafeAny;
  getEffectiveUnreadCount: (conv: MosChatConversation) => number;
  dockAttachments: Record<string, any[]>;
  setDockAttachments: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  dockInputs: Record<string, string>;
  setDockInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  surfaceBg: string;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  borderStrong: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  accentContrast: string;
  token: SafeAny;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  isConversationParticipantOnline: (conv: MosChatConversation) => boolean;
  togglePinConversation: (cid: string) => void;
  toggleManualUnreadConversation: (conv: MosChatConversation) => void;
  selectConversation: (cid: string) => void;
  onToggle: () => void;
  setDockedConvIds: React.Dispatch<React.SetStateAction<string[]>>;
  dockMessagesContainerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  isMessageFromCurrentUser: (m: MosChatMessage) => boolean;
  getMessageReadBreakdown: (conv: MosChatConversation, m: MosChatMessage) => { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  renderReadStatusCheckmark: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  openTaskModalFromMessage: (m: MosChatMessage | null) => void;
  renderRichTextMessage: (text: string, isMine?: boolean) => React.ReactNode;
  renderMessageAttachments: (atts?: SafeAny[], compact?: boolean) => React.ReactNode;
  renderStagedAttachmentsStrip: (attachments: SafeAny[], scope: SafeAny, convId?: string) => React.ReactNode;
  dockInputRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  handleClipboardPaste: (e: React.ClipboardEvent<SafeAny>, scope?: SafeAny, convId?: string) => void;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  handleSendMessage: (convId: string, text: string, quote?: SafeAny, atts?: SafeAny[]) => void;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  renderComposerEmojiPickerContent: (opts?: SafeAny) => React.ReactNode;
  triggerFilePicker: (scope: 'main' | 'thread' | 'dock', convId?: string) => void;

  // Additional props for iPhone Refactor (threads, tasks, resizing & persistence)
  tasks?: MosChatTaskItem[];
  onToggleTaskDone?: (taskId: string) => Promise<void> | void;
  onQuickCreateTask?: (params: { conversationId: string; title: string }) => Promise<void> | void;
  onSendThreadReply?: (convId: string, rootMsgId: string, text: string, atts?: SafeAny[]) => Promise<void> | void;
  dockDimensions?: Record<string, MosChatDockDimension>;
  setDockDimensions?: React.Dispatch<React.SetStateAction<Record<string, MosChatDockDimension>>>;
  dockActiveTabs?: Record<string, 'chat' | 'tasks'>;
  setDockActiveTabs?: React.Dispatch<React.SetStateAction<Record<string, 'chat' | 'tasks'>>>;
  dockActiveThreadMsgIds?: Record<string, string | null>;
  setDockActiveThreadMsgIds?: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
}

export const MosChatDockedWindows: React.FC<MosChatDockedWindowsProps> = React.memo(
  ({
    isMobile,
    dockedConvIds,
    conversations,
    collapsedDockIds,
    setCollapsedDockIds,
    userPrefs,
    getEffectiveUnreadCount,
    dockAttachments,
    setDockAttachments,
    dockInputs,
    setDockInputs,
    surfaceBg,
    surfaceRaised,
    canvasBg,
    borderColor,
    borderStrong,
    accentColor,
    accentSoftBg,
    accentBorder,
    accentContrast,
    token,
    renderUserAvatarNode,
    isConversationParticipantOnline,
    togglePinConversation,
    toggleManualUnreadConversation,
    selectConversation,
    onToggle,
    setDockedConvIds,
    dockMessagesContainerRefs,
    isMessageFromCurrentUser,
    getMessageReadBreakdown,
    renderReadStatusCheckmark,
    openTaskModalFromMessage,
    renderRichTextMessage,
    renderMessageAttachments,
    renderStagedAttachmentsStrip,
    dockInputRefs,
    handleClipboardPaste,
    isComposingRef,
    lastCompositionEndMsRef,
    handleSendMessage,
    openStickerPopoverKey,
    setOpenStickerPopoverKey,
    renderComposerEmojiPickerContent,
    triggerFilePicker,
    tasks = [],
    onToggleTaskDone,
    onQuickCreateTask,
    onSendThreadReply,
    dockDimensions: externalDimensions,
    setDockDimensions: externalSetDimensions,
    dockActiveTabs: externalActiveTabs,
    setDockActiveTabs: externalSetActiveTabs,
    dockActiveThreadMsgIds: externalThreadMsgIds,
    setDockActiveThreadMsgIds: externalSetThreadMsgIds,
  }) => {
    // Local state fallbacks if not controlled by parent
    const [internalDimensions, setInternalDimensions] = useState<Record<string, MosChatDockDimension>>({});
    const [internalActiveTabs, setInternalActiveTabs] = useState<Record<string, 'chat' | 'tasks'>>({});
    const [internalThreadMsgIds, setInternalThreadMsgIds] = useState<Record<string, string | null>>({});

    const dimensions = externalDimensions || internalDimensions;
    const setDimensions = externalSetDimensions || setInternalDimensions;

    const activeTabs = externalActiveTabs || internalActiveTabs;
    const setActiveTabs = externalSetActiveTabs || setInternalActiveTabs;

    const activeThreadMsgIds = externalThreadMsgIds || internalThreadMsgIds;
    const setActiveThreadMsgIds = externalSetThreadMsgIds || setInternalThreadMsgIds;

    // Thread reply text & staged attachments per dock
    const [threadReplyInputs, setThreadReplyInputs] = useState<Record<string, string>>({});
    const [threadReplyAttachments, setThreadReplyAttachments] = useState<Record<string, MosChatImageAttachment[]>>({});

    // Quick task input text per dock
    const [quickTaskInputs, setQuickTaskInputs] = useState<Record<string, string>>({});
    const [taskFilterScopes, setTaskFilterScopes] = useState<Record<string, 'pending' | 'completed' | 'all'>>({});

    // Scroll to bottom detection and handlers per dock
    const [showScrollBottomByConv, setShowScrollBottomByConv] = useState<Record<string, boolean>>({});
    const [showScrollBottomThreadByConv, setShowScrollBottomThreadByConv] = useState<Record<string, boolean>>({});
    const threadFeedRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const prevMsgCountRef = useRef<Record<string, number>>({});

    const handleFeedScroll = (cid: string, e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const isFarFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight > 100;
      setShowScrollBottomByConv((prev) => {
        if (prev[cid] === isFarFromBottom) return prev;
        return { ...prev, [cid]: isFarFromBottom };
      });
    };

    const handleThreadFeedScroll = (cid: string, e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const isFarFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight > 80;
      setShowScrollBottomThreadByConv((prev) => {
        if (prev[cid] === isFarFromBottom) return prev;
        return { ...prev, [cid]: isFarFromBottom };
      });
    };

    const safeScrollToBottom = (el: HTMLElement | null, smooth = true) => {
      if (!el) return;
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    };

    const scrollToBottom = useCallback(
      (cid: string, smooth = true) => {
        const el = dockMessagesContainerRefs.current[cid];
        if (el) {
          safeScrollToBottom(el, smooth);
          setShowScrollBottomByConv((prev) => ({ ...prev, [cid]: false }));
        }
      },
      [dockMessagesContainerRefs]
    );

    const scrollToBottomThread = useCallback((cid: string, smooth = true) => {
      const el = threadFeedRefs.current[cid];
      if (el) {
        safeScrollToBottom(el, smooth);
        setShowScrollBottomThreadByConv((prev) => ({ ...prev, [cid]: false }));
      }
    }, []);

    // Auto scroll to bottom on mount or when messages arrive
    useEffect(() => {
      dockedConvIds.forEach((cid) => {
        const conv = conversations.find((c) => c.id === cid);
        if (!conv) return;
        const count = conv.messages.length;
        const prevCount = prevMsgCountRef.current[cid] ?? 0;
        const el = dockMessagesContainerRefs.current[cid];

        if (el) {
          const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
          if (prevCount === 0 || isNearBottom) {
            safeScrollToBottom(el, prevCount !== 0);
            setShowScrollBottomByConv((prev) => ({ ...prev, [cid]: false }));
          } else if (count > prevCount) {
            setShowScrollBottomByConv((prev) => ({ ...prev, [cid]: true }));
          }
        }
        prevMsgCountRef.current[cid] = count;
      });
    }, [dockedConvIds, conversations, dockMessagesContainerRefs]);

    // Resizing state
    const resizingRef = useRef<{
      convId: string;
      direction: 'both' | 'top' | 'left';
      startX: number;
      startY: number;
      startWidth: number;
      startHeight: number;
    } | null>(null);

    // Active resize handle listener
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!resizingRef.current) return;
        const { convId, direction, startX, startY, startWidth, startHeight } = resizingRef.current;
        const deltaX = startX - e.clientX; // dragging left expands width
        const deltaY = startY - e.clientY; // dragging up expands height

        const maxHeight = typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.88) : 800;

        let nextWidth = startWidth;
        let nextHeight = startHeight;

        if (direction === 'both' || direction === 'left') {
          nextWidth = Math.max(320, Math.min(640, startWidth + deltaX));
        }
        if (direction === 'both' || direction === 'top') {
          nextHeight = Math.max(380, Math.min(maxHeight, startHeight + deltaY));
        }

        setDimensions((prev) => ({
          ...prev,
          [convId]: { width: nextWidth, height: nextHeight, preset: 'custom' },
        }));
      };

      const handleMouseUp = () => {
        if (resizingRef.current) {
          resizingRef.current = null;
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [setDimensions]);

    const startResizing = (e: React.MouseEvent, convId: string, direction: 'both' | 'top' | 'left') => {
      e.preventDefault();
      e.stopPropagation();
      const currDim = dimensions[convId] || DOCK_PRESET_CONFIGS.standard;
      resizingRef.current = {
        convId,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: currDim.width,
        startHeight: currDim.height,
      };
      document.body.style.userSelect = 'none';
      document.body.style.cursor =
        direction === 'both' ? 'nwse-resize' : direction === 'top' ? 'ns-resize' : 'ew-resize';
    };

    const handleCyclePreset = (cid: string) => {
      const curr = dimensions[cid]?.preset || 'standard';
      let nextPreset: MosChatDockPreset = 'standard';
      if (curr === 'compact') nextPreset = 'standard';
      else if (curr === 'standard') nextPreset = 'promax';
      else nextPreset = 'compact';

      const cfg = DOCK_PRESET_CONFIGS[nextPreset as 'compact' | 'standard' | 'promax'];
      setDimensions((prev) => ({
        ...prev,
        [cid]: { width: cfg.width, height: cfg.height, preset: nextPreset },
      }));
    };

    if (isMobile || dockedConvIds.length === 0) return null;

    return (
      <div
        className="mos-chat-theme-scope fixed bottom-2 right-4 flex items-end gap-3 z-[990]"
        style={{ pointerEvents: 'none', color: token.colorText }}
      >
        {dockedConvIds.map((cid) => {
          const conv = conversations.find((c) => c.id === cid);
          if (!conv) return null;

          const isCollapsed = Boolean(collapsedDockIds[cid]);
          const isDockPinned = (userPrefs.pinnedIds || []).includes(cid);
          const isDockManualUnread = (userPrefs.manualUnreadIds || []).includes(cid);
          const dockUnread = getEffectiveUnreadCount(conv);
          const dockStaged = dockAttachments[cid] || [];

          // Dimensions
          const currentDimension = dimensions[cid] || DOCK_PRESET_CONFIGS.standard;
          const currentWidth = currentDimension.width || 385;
          const currentHeight = currentDimension.height || 600;
          const currentPreset = currentDimension.preset || 'standard';

          // Tabs & Thread navigation
          const currentTab = activeTabs[cid] || 'chat';
          const activeThreadId = activeThreadMsgIds[cid] || null;
          const activeThreadMsg = activeThreadId ? conv.messages.find((m) => m.id === activeThreadId) || null : null;

          // Tasks for this conversation
          const convTasks = tasks.filter((t) => t.conversationId === cid && !t.archived);
          const pendingConvTasks = convTasks.filter((t) => !t.done);
          const currentTaskFilter = taskFilterScopes[cid] || 'pending';
          const filteredTasks = convTasks.filter((t) => {
            if (currentTaskFilter === 'pending') return !t.done;
            if (currentTaskFilter === 'completed') return t.done;
            return true;
          });

          // Recent messages (display recent 40 messages for full experience)
          const messagesToDisplay = conv.messages.slice(-40);

          return (
            <div
              key={cid}
              data-dock-conv-id={cid}
              className="group relative rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all duration-200 backdrop-blur-xl"
              style={{
                width: `${currentWidth}px`,
                height: isCollapsed ? '46px' : `${currentHeight}px`,
                background: surfaceBg ? `${surfaceBg}f2` : 'rgba(20, 20, 20, 0.95)',
                border: `1px solid ${borderStrong || 'rgba(255, 255, 255, 0.12)'}`,
                pointerEvents: 'auto',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
              }}
            >
              {/* ================= RESIZE HANDLES (TOP & LEFT) ================= */}
              {!isCollapsed && (
                <>
                  {/* Top-Left Corner Handle */}
                  <div
                    onMouseDown={(e) => startResizing(e, cid, 'both')}
                    title="Kéo để điều chỉnh chiều rộng và chiều cao"
                    className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-40 hover:bg-amber-400/30 transition-colors rounded-tl-2xl flex items-center justify-center group/corner"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50 opacity-0 group-hover/corner:opacity-100 transition-opacity" />
                  </div>
                  {/* Top Edge Handle */}
                  <div
                    onMouseDown={(e) => startResizing(e, cid, 'top')}
                    title="Kéo lên/xuống để chỉnh chiều cao"
                    className="absolute top-0 left-4 right-4 h-2 cursor-ns-resize z-30 hover:bg-amber-400/20 transition-colors"
                  />
                  {/* Left Edge Handle */}
                  <div
                    onMouseDown={(e) => startResizing(e, cid, 'left')}
                    title="Kéo sang trái/phải để chỉnh chiều rộng"
                    className="absolute top-4 bottom-0 left-0 w-2 cursor-ew-resize z-30 hover:bg-amber-400/20 transition-colors"
                  />
                </>
              )}

              {/* ================= iOS TOP DRAG PILL ================= */}
              <div
                onClick={() => setCollapsedDockIds((p) => ({ ...p, [cid]: !p[cid] }))}
                className="w-full flex justify-center pt-1.5 pb-0.5 cursor-pointer hover:opacity-100 transition-opacity select-none"
              >
                <div className="w-9 h-1 rounded-full bg-neutral-400/40 dark:bg-white/20 group-hover:bg-amber-400/60 transition-colors" />
              </div>

              {/* ================= iOS CUPERTINO NAVIGATION HEADER ================= */}
              <div
                className="h-10 px-3 flex items-center justify-between select-none cursor-pointer border-b"
                style={{
                  background: surfaceRaised || 'rgba(30, 30, 30, 0.95)',
                  borderColor: borderColor || 'rgba(255, 255, 255, 0.08)',
                }}
                onClick={() => setCollapsedDockIds((p) => ({ ...p, [cid]: !p[cid] }))}
              >
                {/* Left: Navigation or Channel Identity */}
                <div className="flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
                  {activeThreadId ? (
                    /* iOS Back Button inside Thread */
                    <button
                      type="button"
                      onClick={() => setActiveThreadMsgIds((prev) => ({ ...prev, [cid]: null }))}
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer group/back py-1 -ml-1 pr-1.5"
                    >
                      <ChevronLeft size={16} className="transition-transform group-hover/back:-translate-x-0.5" />
                      <span className="truncate max-w-[140px]">{conv.name}</span>
                    </button>
                  ) : (
                    /* Main Channel / DM Header */
                    <div className="flex items-center gap-1.5 min-w-0">
                      {conv.type === 'dm' ? (
                        renderUserAvatarNode({
                          staffId: conv.participantStaffId,
                          name: conv.name,
                          avatarUrl: conv.avatar,
                          sizeClass: 'w-6 h-6',
                          textClass: 'text-[9.5px]',
                          isOnline: isConversationParticipantOnline(conv),
                        })
                      ) : (
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                          style={{ background: conv.color ? `${conv.color}25` : 'rgba(212, 168, 75, 0.2)' }}
                        >
                          <Hash size={13} style={{ color: conv.color || '#d4a84b' }} />
                        </div>
                      )}
                      <span className="text-[13px] font-bold tracking-tight truncate max-w-[150px]">{conv.name}</span>
                      {isDockPinned && (
                        <Tooltip title="Đã ghim">
                          <Pin size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                        </Tooltip>
                      )}
                      {(dockUnread > 0 || isDockManualUnread) && (
                        <span className="inline-flex items-center justify-center px-1.5 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold tabular-nums shrink-0 shadow-sm">
                          {dockUnread > 0 ? dockUnread : 1}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: iOS Action Controls */}
                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Preset Switcher (Compact / Standard / ProMax) */}
                  <Tooltip
                    title={`Đổi kích thước iPhone (Hiện tại: ${currentPreset.toUpperCase()} - ${currentWidth}×${currentHeight}px)`}
                  >
                    <button
                      type="button"
                      onClick={() => handleCyclePreset(cid)}
                      className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10 text-neutral-400 hover:text-amber-400"
                    >
                      <Smartphone size={13} />
                    </button>
                  </Tooltip>

                  {/* Pin Box */}
                  <Tooltip title={isDockPinned ? 'Bỏ ghim box chat' : 'Ghim box chat'}>
                    <button
                      type="button"
                      onClick={() => togglePinConversation(cid)}
                      className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
                      style={{ color: isDockPinned ? '#d4a84b' : token.colorTextSecondary }}
                    >
                      <Pin size={12} className={isDockPinned ? 'fill-amber-400 text-amber-400' : ''} />
                    </button>
                  </Tooltip>

                  {/* Mark as Unread */}
                  <Tooltip title={dockUnread > 0 || isDockManualUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}>
                    <button
                      type="button"
                      onClick={() => toggleManualUnreadConversation(conv)}
                      className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
                      style={{ color: dockUnread > 0 || isDockManualUnread ? '#f43f5e' : token.colorTextSecondary }}
                    >
                      {dockUnread > 0 || isDockManualUnread ? <MailOpen size={12} /> : <Mail size={12} />}
                    </button>
                  </Tooltip>

                  {/* Expand to Full Screen Modal / Portal */}
                  <Tooltip title="Mở toàn màn hình">
                    <button
                      type="button"
                      onClick={() => {
                        selectConversation(cid);
                        onToggle();
                      }}
                      className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                      style={{ color: token.colorTextSecondary }}
                    >
                      <Maximize2 size={12} />
                    </button>
                  </Tooltip>

                  {/* Collapse / Expand */}
                  <Tooltip title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}>
                    <button
                      type="button"
                      onClick={() => setCollapsedDockIds((p) => ({ ...p, [cid]: !p[cid] }))}
                      className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                      style={{ color: token.colorTextSecondary }}
                    >
                      <Minus size={12} />
                    </button>
                  </Tooltip>

                  {/* Close Box */}
                  <Tooltip title="Đóng cửa sổ">
                    <button
                      type="button"
                      onClick={() => setDockedConvIds((prev) => prev.filter((id) => id !== cid))}
                      className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/20 hover:text-rose-400 text-neutral-400"
                    >
                      <X size={13} />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* ================= EXPANDED CONTENT ================= */}
              {!isCollapsed && (
                <div
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                  style={{ background: canvasBg || 'transparent' }}
                >
                  {/* ================= iOS SEGMENTED CONTROL ([ Tin nhắn ] | [ Tác vụ (N) ]) ================= */}
                  {!activeThreadId && (
                    <div
                      className="px-3 pt-2 pb-1.5 flex items-center justify-center border-b"
                      style={{ borderColor: borderColor || 'rgba(255, 255, 255, 0.08)' }}
                    >
                      <div
                        className="w-full grid grid-cols-2 p-0.5 rounded-xl text-[12px] font-semibold transition-colors"
                        style={{ background: surfaceRaised || 'rgba(0,0,0,0.2)' }}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveTabs((p) => ({ ...p, [cid]: 'chat' }))}
                          className={`py-1 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                            currentTab === 'chat'
                              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                              : 'text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          <span>💬 Tin nhắn</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTabs((p) => ({ ...p, [cid]: 'tasks' }))}
                          className={`py-1 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                            currentTab === 'tasks'
                              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                              : 'text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          <span>⏱️ Tác vụ</span>
                          {pendingConvTasks.length > 0 && (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-extrabold ${
                                currentTab === 'tasks'
                                  ? 'bg-black/25 text-neutral-950'
                                  : 'bg-amber-400/20 text-amber-400'
                              }`}
                            >
                              {pendingConvTasks.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ================= VIEW 1: THREAD VIEW (PUSH SLIDE TRANSITION) ================= */}
                  {activeThreadId && activeThreadMsg ? (
                    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4 duration-200 relative">
                      {/* Parent Message Card (Pinned Top) */}
                      <div
                        className="p-3 border-b shrink-0 flex flex-col gap-1.5 text-[12px]"
                        style={{
                          background: surfaceRaised ? `${surfaceRaised}cc` : 'rgba(255,255,255,0.03)',
                          borderColor: borderColor || 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {renderUserAvatarNode({
                              name: activeThreadMsg.senderName,
                              avatarUrl: activeThreadMsg.senderAvatar,
                              sizeClass: 'w-5 h-5',
                              textClass: 'text-[9px]',
                            })}
                            <span className="font-bold text-amber-500 text-[11px]">{activeThreadMsg.senderName}</span>
                            <span className="text-[10px] text-neutral-400 tabular-nums">
                              · {activeThreadMsg.timeLabel}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            Tin nhắn gốc
                          </span>
                        </div>
                        <div className="pl-6 border-l-2 border-amber-500/40 text-neutral-200 text-[12px] leading-relaxed break-words">
                          {renderRichTextMessage(activeThreadMsg.text, false)}
                          {renderMessageAttachments(activeThreadMsg.attachments, true)}
                        </div>
                      </div>

                      {/* Thread Replies Feed */}
                      <div
                        ref={(el) => {
                          threadFeedRefs.current[cid] = el;
                        }}
                        onScroll={(e) => handleThreadFeedScroll(cid, e)}
                        className="flex-1 overflow-y-auto p-3 space-y-2.5"
                      >
                        {(!activeThreadMsg.thread || activeThreadMsg.thread.length === 0) && (
                          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 text-[12px] py-8">
                            <MessageSquareReply size={28} className="text-neutral-500 mb-2 opacity-60" />
                            <p className="font-medium text-neutral-300">Chưa có phản hồi nào trong luồng</p>
                            <p className="text-[11px] text-neutral-500">
                              Hãy là người đầu tiên trả lời câu hỏi này nhé.
                            </p>
                          </div>
                        )}

                        {(activeThreadMsg.thread || []).map((reply: MosChatThreadReply) => {
                          const isMine = isMessageFromCurrentUser(reply as SafeAny);
                          return (
                            <div
                              key={reply.id}
                              className={`flex gap-2 items-start ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                              {renderUserAvatarNode({
                                name: reply.senderName,
                                avatarUrl: reply.senderAvatar,
                                sizeClass: 'w-6 h-6 mt-0.5',
                                textClass: 'text-[9px]',
                                bgStyle: isMine ? 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)' : '#2563eb',
                                textColor: isMine ? '#000' : '#fff',
                              })}
                              <div
                                className={`max-w-[82%] px-3 py-2 rounded-2xl text-[12px] shadow-sm ${
                                  isMine
                                    ? 'rounded-tr-xs bg-gradient-to-br from-[#d4a84b] to-[#b45309] text-neutral-950 font-medium'
                                    : 'rounded-tl-xs bg-white/10 dark:bg-white/5 border border-white/10 text-neutral-100'
                                }`}
                              >
                                <div
                                  className={`flex items-center gap-1.5 mb-0.5 ${isMine ? 'justify-end text-neutral-900/80' : 'text-neutral-400'} text-[10px]`}
                                >
                                  <span className="font-bold">{reply.senderName}</span>
                                  <span>·</span>
                                  <span className="tabular-nums">{reply.timeLabel}</span>
                                </div>
                                <div className="break-words leading-relaxed">
                                  {renderRichTextMessage(reply.text, isMine)}
                                </div>
                                {renderMessageAttachments(reply.attachments, true)}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Floating Scroll to Bottom Button in Thread */}
                      {showScrollBottomThreadByConv[cid] && (
                        <div className="absolute bottom-14 right-3 z-30 animate-in fade-in zoom-in-90 duration-150">
                          <button
                            type="button"
                            onClick={() => scrollToBottomThread(cid, true)}
                            className="px-3 py-1 rounded-full shadow-2xl flex items-center gap-1.5 text-[11px] font-extrabold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 border select-none"
                            style={{
                              background: 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)',
                              color: '#000',
                              borderColor: 'rgba(255, 255, 255, 0.4)',
                              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.7), 0 0 14px rgba(212, 168, 75, 0.5)',
                            }}
                          >
                            <span>Mới nhất</span>
                            <ArrowDown size={12} className="animate-bounce" />
                          </button>
                        </div>
                      )}

                      {/* Dedicated Thread Composer */}
                      <div
                        className="p-2 border-t"
                        style={{
                          background: surfaceBg || 'rgba(20, 20, 20, 0.98)',
                          borderColor: borderColor || 'rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={threadReplyInputs[cid] || ''}
                            onChange={(e) => setThreadReplyInputs((p) => ({ ...p, [cid]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                const val = threadReplyInputs[cid] || '';
                                if (!val.trim()) return;
                                if (onSendThreadReply) {
                                  onSendThreadReply(cid, activeThreadMsg.id, val);
                                }
                                setThreadReplyInputs((p) => ({ ...p, [cid]: '' }));
                              }
                            }}
                            placeholder="Trả lời trong luồng... (Enter gửi)"
                            className="flex-1 h-9 rounded-full px-3.5 text-[12px] outline-none transition-all focus:ring-1 focus:ring-amber-500/50"
                            style={{
                              background: surfaceRaised || 'rgba(255, 255, 255, 0.06)',
                              border: `1px solid ${borderColor || 'rgba(255, 255, 255, 0.1)'}`,
                              color: token.colorText,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = threadReplyInputs[cid] || '';
                              if (!val.trim()) return;
                              if (onSendThreadReply) {
                                onSendThreadReply(cid, activeThreadMsg.id, val);
                              }
                              setThreadReplyInputs((p) => ({ ...p, [cid]: '' }));
                            }}
                            disabled={!(threadReplyInputs[cid] || '').trim()}
                            className="w-9 h-9 rounded-full inline-flex items-center justify-center cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
                            style={{ background: accentColor || '#d4a84b', color: accentContrast || '#000' }}
                          >
                            <SendHorizontal size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : currentTab === 'tasks' ? (
                    /* ================= VIEW 2: TASKS VIEW (APPLE REMINDERS STYLE) ================= */
                    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-150">
                      {/* Filter Pills & Add Action Bar */}
                      <div
                        className="p-2.5 border-b flex items-center justify-between gap-2"
                        style={{
                          background: surfaceRaised ? `${surfaceRaised}66` : 'rgba(255,255,255,0.02)',
                          borderColor: borderColor || 'rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => setTaskFilterScopes((p) => ({ ...p, [cid]: 'pending' }))}
                            className={`px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                              currentTaskFilter === 'pending'
                                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                            }`}
                          >
                            Cần làm ({pendingConvTasks.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskFilterScopes((p) => ({ ...p, [cid]: 'completed' }))}
                            className={`px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                              currentTaskFilter === 'completed'
                                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                            }`}
                          >
                            Đã xong ({convTasks.length - pendingConvTasks.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskFilterScopes((p) => ({ ...p, [cid]: 'all' }))}
                            className={`px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                              currentTaskFilter === 'all'
                                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                            }`}
                          >
                            Tất cả
                          </button>
                        </div>

                        <Tooltip title="Mở modal tạo task đầy đủ (giao việc, hẹn giờ)">
                          <button
                            type="button"
                            onClick={() => openTaskModalFromMessage(null)}
                            className="w-7 h-7 rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10 text-amber-400"
                          >
                            <AlarmClockPlus size={14} />
                          </button>
                        </Tooltip>
                      </div>

                      {/* Quick Add Task Row (Apple Reminders Input) */}
                      <div
                        className="px-3 py-2 border-b"
                        style={{ borderColor: borderColor || 'rgba(255, 255, 255, 0.08)' }}
                      >
                        <div className="flex items-center gap-2">
                          <Plus size={14} className="text-amber-400 shrink-0" />
                          <input
                            type="text"
                            value={quickTaskInputs[cid] || ''}
                            onChange={(e) => setQuickTaskInputs((p) => ({ ...p, [cid]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = (quickTaskInputs[cid] || '').trim();
                                if (!val) return;
                                if (onQuickCreateTask) {
                                  onQuickCreateTask({ conversationId: cid, title: val });
                                }
                                setQuickTaskInputs((p) => ({ ...p, [cid]: '' }));
                              }
                            }}
                            placeholder="Thêm việc mới... (Nhấn Enter để tạo)"
                            className="flex-1 text-[12px] bg-transparent outline-none text-neutral-200 placeholder:text-neutral-500"
                          />
                        </div>
                      </div>

                      {/* Tasks List */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {filteredTasks.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 text-[12px] py-10">
                            <CheckCircle2 size={32} className="text-neutral-500 mb-2 opacity-50" />
                            <p className="font-semibold text-neutral-300">Không có tác vụ nào</p>
                            <p className="text-[11px] text-neutral-500">Mọi việc đã được xử lý gọn gàng!</p>
                          </div>
                        ) : (
                          filteredTasks.map((t) => {
                            const deadline = t.dueAt || t.deadline;
                            const isOverdue = deadline && !t.done && dayjs(deadline).isBefore(dayjs());
                            return (
                              <div
                                key={t.id}
                                className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                                  t.done
                                    ? 'bg-white/5 border-white/5 opacity-60'
                                    : isOverdue
                                      ? 'bg-rose-500/10 border-rose-500/30'
                                      : 'bg-white/5 border-white/10 hover:border-amber-500/40'
                                }`}
                              >
                                {/* Apple Reminders Circular Checkbox */}
                                <button
                                  type="button"
                                  onClick={() => onToggleTaskDone && onToggleTaskDone(t.id)}
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer mt-0.5 transition-all ${
                                    t.done
                                      ? 'bg-amber-500 border-amber-500 text-neutral-950'
                                      : 'border-amber-400/50 hover:border-amber-400 hover:bg-amber-400/10'
                                  }`}
                                >
                                  {t.done && <Check size={11} strokeWidth={3} />}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-[12.5px] leading-snug font-medium break-words ${
                                      t.done ? 'line-through text-neutral-400' : 'text-neutral-100'
                                    }`}
                                  >
                                    {t.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                                    {t.assigneeName && (
                                      <span className="font-semibold text-amber-400/90 truncate max-w-[120px]">
                                        @{t.assigneeName}
                                      </span>
                                    )}
                                    {deadline && (
                                      <span
                                        className={`inline-flex items-center gap-0.5 tabular-nums ${
                                          isOverdue ? 'text-rose-400 font-bold' : 'text-neutral-400'
                                        }`}
                                      >
                                        <Clock size={10} />
                                        {dayjs(deadline).fromNow()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ================= VIEW 3: MAIN CHAT FEED (iMESSAGE BUBBLES) ================= */
                    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-150 relative">
                      <div
                        ref={(el) => {
                          dockMessagesContainerRefs.current[cid] = el;
                        }}
                        onScroll={(e) => handleFeedScroll(cid, e)}
                        className="flex-1 overflow-y-auto p-3 space-y-3"
                      >
                        {messagesToDisplay.map((m) => {
                          const isDockMine = isMessageFromCurrentUser(m);
                          const dockBreakdown = isDockMine
                            ? getMessageReadBreakdown(conv, m)
                            : { seenBy: [], unseenBy: [] };
                          const threadCount = m.thread?.length || m.unreadThreadReplyCount || 0;

                          return (
                            <div
                              key={m.id}
                              className={`group/msg flex gap-2 items-start ${isDockMine ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                              {renderUserAvatarNode({
                                name: m.senderName,
                                avatarUrl: m.senderAvatar,
                                sizeClass: 'w-6 h-6 mt-0.5 shrink-0',
                                textClass: 'text-[9.5px]',
                                bgStyle: isDockMine ? 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)' : '#2563eb',
                                textColor: isDockMine ? '#000' : '#fff',
                              })}

                              <div
                                className={`max-w-[84%] p-2.5 rounded-2xl text-[12px] shadow-sm relative group/bubble ${
                                  isDockMine
                                    ? 'rounded-tr-xs bg-gradient-to-br from-[#d4a84b] to-[#b45309] text-neutral-950 font-medium'
                                    : 'rounded-tl-xs bg-white/10 dark:bg-white/5 border border-white/10 text-neutral-100'
                                }`}
                              >
                                {/* Message Header: Sender name, time, read status */}
                                <div
                                  className={`flex items-center justify-between gap-2 mb-1 ${
                                    isDockMine ? 'flex-row-reverse' : 'flex-row'
                                  }`}
                                >
                                  <span
                                    className={`text-[10.5px] font-bold inline-flex items-center gap-1 ${
                                      isDockMine ? 'text-neutral-900/80' : 'text-amber-400'
                                    }`}
                                  >
                                    <span>{m.senderName}</span>
                                    <span>·</span>
                                    <span className="tabular-nums font-normal">{m.timeLabel}</span>
                                    {isDockMine &&
                                      !m.isDeleted &&
                                      renderReadStatusCheckmark(dockBreakdown.seenBy, dockBreakdown.unseenBy, {
                                        compact: true,
                                        scopeLabel: 'Trạng thái đọc',
                                      })}
                                  </span>

                                  <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                    {/* Quick Reply in Thread */}
                                    <Tooltip title="Vào luồng trả lời (Thread)">
                                      <button
                                        type="button"
                                        onClick={() => setActiveThreadMsgIds((p) => ({ ...p, [cid]: m.id }))}
                                        className={`w-5 h-5 rounded inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 ${
                                          isDockMine ? 'text-neutral-900' : 'text-neutral-400'
                                        }`}
                                      >
                                        <MessageSquareReply size={12} />
                                      </button>
                                    </Tooltip>
                                    {/* Create Task from Message */}
                                    <Tooltip title="Tạo Task từ tin nhắn này">
                                      <button
                                        type="button"
                                        onClick={() => openTaskModalFromMessage(m)}
                                        className={`w-5 h-5 rounded inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 ${
                                          isDockMine ? 'text-neutral-900' : 'text-neutral-400'
                                        }`}
                                      >
                                        <AlarmClockPlus size={12} />
                                      </button>
                                    </Tooltip>
                                  </div>
                                </div>

                                {/* Message Text */}
                                {m.text && (
                                  <div className="break-words leading-relaxed text-[12.5px]">
                                    {renderRichTextMessage(m.text, isDockMine)}
                                  </div>
                                )}

                                {/* Message Attachments */}
                                {renderMessageAttachments(m.attachments, true)}

                                {/* Thread Replies Badge (Click to enter Thread) */}
                                {threadCount > 0 && (
                                  <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10">
                                    <button
                                      type="button"
                                      onClick={() => setActiveThreadMsgIds((p) => ({ ...p, [cid]: m.id }))}
                                      className={`w-full py-1 px-2 rounded-lg text-[11px] font-bold inline-flex items-center justify-between cursor-pointer transition-all ${
                                        isDockMine
                                          ? 'bg-black/15 text-neutral-950 hover:bg-black/25'
                                          : 'bg-amber-400/15 text-amber-400 hover:bg-amber-400/25 border border-amber-400/20'
                                      }`}
                                    >
                                      <span className="inline-flex items-center gap-1.5">
                                        <MessageSquareReply size={12} />
                                        <span>{threadCount} phản hồi</span>
                                      </span>
                                      <span>›</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Floating Scroll to Bottom Button in Main Chat */}
                      {showScrollBottomByConv[cid] && (
                        <div className="absolute bottom-16 right-4 z-30 animate-in fade-in zoom-in-90 duration-150">
                          <button
                            type="button"
                            onClick={() => scrollToBottom(cid, true)}
                            className="px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 text-[11px] font-extrabold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 border select-none"
                            style={{
                              background: 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)',
                              color: '#000',
                              borderColor: 'rgba(255, 255, 255, 0.4)',
                              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.7), 0 0 14px rgba(212, 168, 75, 0.5)',
                            }}
                          >
                            <span>Tin nhắn mới</span>
                            <ArrowDown size={13} className="animate-bounce" />
                          </button>
                        </div>
                      )}

                      {/* ================= iOS PILL COMPOSER ================= */}
                      <div
                        className="p-2.5 border-t select-none"
                        style={{
                          background: surfaceBg || 'rgba(20, 20, 20, 0.98)',
                          borderColor: borderColor || 'rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        {renderStagedAttachmentsStrip(dockStaged, 'dock', cid)}

                        <div className="flex items-center gap-1.5">
                          {/* iOS Action '+' Button */}
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: 'create-task',
                                  icon: <AlarmClockPlus size={14} className="text-amber-400" />,
                                  label: 'Tạo việc cần làm (Task)',
                                  onClick: () => openTaskModalFromMessage(null),
                                },
                                {
                                  key: 'upload-image',
                                  icon: <ImagePlus size={14} className="text-sky-400" />,
                                  label: 'Tải hình ảnh lên',
                                  onClick: () => triggerFilePicker('dock', cid),
                                },
                                {
                                  key: 'emoji-sticker',
                                  icon: <SmilePlus size={14} className="text-emerald-400" />,
                                  label: 'Nhãn dán & Emoji',
                                  onClick: () => setOpenStickerPopoverKey(`composer:dock:${cid}`),
                                },
                              ],
                            }}
                            trigger={['click']}
                            placement="topLeft"
                          >
                            <button
                              type="button"
                              title="Tùy chọn thêm"
                              className="w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer transition-colors bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-amber-400 shrink-0"
                            >
                              <Plus size={16} />
                            </button>
                          </Dropdown>

                          {/* Pill Textarea */}
                          <textarea
                            ref={(el) => {
                              dockInputRefs.current[cid] = el;
                            }}
                            rows={1}
                            value={dockInputs[cid] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDockInputs((p) => ({ ...p, [cid]: val }));
                              e.target.style.height = 'auto';
                              e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                            }}
                            onPaste={(e) => handleClipboardPaste(e, 'dock', cid)}
                            onCompositionStart={() => {
                              isComposingRef.current = true;
                            }}
                            onCompositionEnd={() => {
                              lastCompositionEndMsRef.current = Date.now();
                              setTimeout(() => {
                                isComposingRef.current = false;
                              }, 50);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                if (
                                  e.nativeEvent.isComposing ||
                                  isComposingRef.current ||
                                  e.keyCode === 229 ||
                                  Date.now() - lastCompositionEndMsRef.current < 60
                                ) {
                                  return;
                                }
                                e.preventDefault();
                                const val = dockInputs[cid] || '';
                                const atts = dockAttachments[cid] || [];
                                if (!val.trim() && atts.length === 0) return;
                                setDockInputs((p) => ({ ...p, [cid]: '' }));
                                setDockAttachments((p) => ({ ...p, [cid]: [] }));
                                if (dockInputRefs.current[cid]) {
                                  dockInputRefs.current[cid]!.style.height = 'auto';
                                }
                                handleSendMessage(cid, val, null, atts);
                              }
                            }}
                            placeholder="Nhắn tin..."
                            className="flex-1 min-h-[32px] max-h-[96px] rounded-2xl px-3.5 py-1.5 text-[12.5px] outline-none resize-none leading-relaxed transition-all focus:ring-1 focus:ring-amber-500/40"
                            style={{
                              background: surfaceRaised || 'rgba(255, 255, 255, 0.06)',
                              border: `1px solid ${borderColor || 'rgba(255, 255, 255, 0.1)'}`,
                              color: token.colorText,
                            }}
                          />

                          {/* Sticker / Emoji Popover */}
                          <Popover
                            trigger="click"
                            placement="topRight"
                            open={openStickerPopoverKey === `composer:dock:${cid}`}
                            onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? `composer:dock:${cid}` : null)}
                            content={renderComposerEmojiPickerContent({ dockConvId: cid })}
                          >
                            <button
                              type="button"
                              aria-label="Gửi Sticker động hoặc Emoji"
                              className="w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer hover:bg-white/10 text-neutral-400 hover:text-neutral-200 shrink-0"
                            >
                              <SmilePlus size={15} />
                            </button>
                          </Popover>

                          {/* Send Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const val = dockInputs[cid] || '';
                              const atts = dockAttachments[cid] || [];
                              if (!val.trim() && atts.length === 0) return;
                              setDockInputs((p) => ({ ...p, [cid]: '' }));
                              setDockAttachments((p) => ({ ...p, [cid]: [] }));
                              if (dockInputRefs.current[cid]) {
                                dockInputRefs.current[cid]!.style.height = 'auto';
                              }
                              handleSendMessage(cid, val, null, atts);
                            }}
                            disabled={!(dockInputs[cid] || '').trim() && (dockAttachments[cid] || []).length === 0}
                            className="w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
                            style={{ background: accentColor || '#d4a84b', color: accentContrast || '#000' }}
                          >
                            <SendHorizontal size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

MosChatDockedWindows.displayName = 'MosChatDockedWindows';
