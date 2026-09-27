'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sliders,
  Check,
  Loader2,
  History,
  User,
  RefreshCw,
  Lightbulb,
  MessageSquare,
  Volume2,
  VolumeX,
  Copy,
  Square,
} from 'lucide-react';
import { Tooltip } from 'antd';
import type { AiChatSession, AiChatMessage, AiChatAction } from '@mos-lab/shared';
import { AdaptiveDrawer } from '../../../../components/ui';
import { aiApi } from '../../../../lib/api/ai.api';
import { speakText, stopSpeaking } from '../../../../components/voice-assistant/speech-utils';
import {
  AI_LAUNCHER_MARGIN,
  AI_LAUNCHER_SIZE,
  DRAG_THRESHOLD,
  clampAiLauncherPosition,
  persistAiLauncherPosition,
  readAiLauncherPosition,
  subscribeAiLauncherPosition,
  readAiCopilotVisible,
  subscribeAiCopilotVisibility,
  type AiLauncherPosition,
} from '../../../../lib/ai-assistant-launcher';

export interface AIAssistantWidgetProps {
  themeMode: string;
  currentFilterCriteria?: Record<string, unknown>;
  onApplyFilter: (criteria: Record<string, unknown>) => void;
  currentUser?: {
    id: number;
    username: string;
    displayName: string;
    role?: string;
  } | null;
}

const QUICK_PROMPTS = [
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

export function AIAssistantWidget({ currentFilterCriteria, onApplyFilter, currentUser }: AIAssistantWidgetProps) {
  const [copilotVisible, setCopilotVisible] = useState(() => readAiCopilotVisible());
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sync Copilot Visibility from User Profile / Storage
  useEffect(() => {
    return subscribeAiCopilotVisibility(() => {
      setCopilotVisible(readAiCopilotVisible());
    });
  }, []);

  // Audio Speech (TTS) & Playback Rate State
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('mos_copilot_auto_speak') === 'true';
    } catch {
      return false;
    }
  });
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.05;
    try {
      const saved = localStorage.getItem('mos_copilot_playback_rate');
      return saved ? parseFloat(saved) || 1.05 : 1.05;
    } catch {
      return 1.05;
    }
  });

  const handleToggleAutoSpeak = () => {
    setAutoSpeakEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('mos_copilot_auto_speak', String(next));
        } catch {
          // Ignore localStorage errors
        }
      }
      return next;
    });
  };

  const handleCyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length] || 1.0;
    setPlaybackRate(nextRate);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mos_copilot_playback_rate', String(nextRate));
      } catch {
        // Ignore localStorage errors
      }
    }
  };

  const handleToggleSpeak = useCallback(
    (msg: AiChatMessage) => {
      if (speakingMessageId === msg.id) {
        stopSpeaking();
        setSpeakingMessageId(null);
        return;
      }

      stopSpeaking();
      setSpeakingMessageId(msg.id);
      speakText(msg.content, {
        rate: playbackRate,
        onStart: () => setSpeakingMessageId(msg.id),
        onEnd: () => setSpeakingMessageId((current) => (current === msg.id ? null : current)),
        onError: () => setSpeakingMessageId((current) => (current === msg.id ? null : current)),
      });
    },
    [speakingMessageId, playbackRate]
  );

  const handleCopyContent = useCallback((msg: AiChatMessage) => {
    if (!msg.content) return;
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId((cur) => (cur === msg.id ? null : cur)), 2000);
    });
  }, []);

  // Cleanup speech when drawer closes or unmounts
  useEffect(() => {
    if (!open) {
      stopSpeaking();
      setSpeakingMessageId(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Floating Launcher Drag & Persistence State
  const [launcherPosition, setLauncherPosition] = useState<AiLauncherPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    latest: AiLauncherPosition;
  } | null>(null);
  const suppressClickUntilRef = useRef(0);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  // Load a specific session and its messages
  const loadSession = async (sessionId: string) => {
    try {
      setActiveSessionId(sessionId);
      setShowSessionDrawer(false);
      const res = await aiApi.ai.getSession(sessionId);
      if (res?.messages) {
        setMessages(res.messages);
        // Expand thinking on the latest message by default
        const latestMsg = res.messages[res.messages.length - 1];
        if (latestMsg?.id && latestMsg.thinking) {
          setExpandedThinking((prev) => ({ ...prev, [latestMsg.id]: true }));
        }
      }
    } catch {
      // Ignore load error
    }
  };

  // Fetch list of private sessions
  const fetchSessions = async () => {
    try {
      setLoadingHistory(true);
      const res = await aiApi.ai.listSessions({ scope: 'customers' });
      if (res?.sessions) {
        setSessions(res.sessions);
        if (!activeSessionId && res.sessions.length > 0) {
          // Select most recent session
          await loadSession(res.sessions[0].id);
        }
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoadingHistory(false);
    }
  };

  // Initialize sessions when widget opens
  useEffect(() => {
    if (open) {
      void fetchSessions();
    }
  }, [open]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (open && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, open]);

  // Track elapsed reasoning time when sending
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (sending) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sending]);

  // Start a new empty session (ready to send)
  const handleStartNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setShowSessionDrawer(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Create new session
  const handleNewSession = async () => {
    try {
      const res = await aiApi.ai.createSession({
        title: 'Hội thoại phân tích mới',
        scope: 'customers',
      });
      if (res?.session) {
        setSessions((prev) => [res.session, ...prev]);
        setActiveSessionId(res.session.id);
        setMessages([]);
        setShowSessionDrawer(false);
      }
    } catch {
      setActiveSessionId(null);
      setMessages([]);
      setShowSessionDrawer(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await aiApi.ai.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch {
      // Ignore delete error
    }
  };

  // Paste screenshot from clipboard
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
              setPastedImage(event.target.result);
            }
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    const hasImage = !!pastedImage;
    if ((!text && !hasImage) || sending) return;

    const fullContent = hasImage ? `${text ? text + '\n' : ''}[Đính kèm ảnh màn hình]` : text;

    setInputMessage('');
    setLastFailedMessage(null);
    setSending(true);

    // Optimistic user message
    const tempUserMsg: AiChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: activeSessionId || '',
      role: 'user',
      content: fullContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    if (hasImage) {
      setPastedImage(null);
    }

    try {
      const res = await aiApi.ai.sendMessage({
        sessionId: activeSessionId || undefined,
        message: fullContent,
        scope: 'customers',
        context: {
          page: 'customers',
          pathname: '/dashboard/customers',
          currentFilter: currentFilterCriteria,
          userName: currentUser?.displayName || currentUser?.username,
          myStaffId: currentUser?.id,
        },
      });

      if (res) {
        if (!activeSessionId && res.sessionId) {
          setActiveSessionId(res.sessionId);
          setSessions((prev) => [res.session, ...prev]);
        }

        // Replace temp message and append assistant message
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          return [...filtered, { ...tempUserMsg, sessionId: res.sessionId }, res.message];
        });

        // Expand thinking for assistant message
        if (res.message?.thinking) {
          setExpandedThinking((prev) => ({ ...prev, [res.message.id]: true }));
        }

        // Auto-speak if enabled
        if (autoSpeakEnabled && res.message?.content) {
          handleToggleSpeak(res.message);
        }
      }
    } catch {
      setLastFailedMessage(fullContent);
      // Append error message
      const errorMsg: AiChatMessage = {
        id: `err-${Date.now()}`,
        sessionId: activeSessionId || '',
        role: 'assistant',
        content: 'Không thể kết nối đến máy chủ AI. Vui lòng thử lại sau giây lát.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Handle applying action to current board
  const handleExecuteAction = (action: AiChatAction, messageId: string) => {
    if (action.type === 'APPLY_FILTER' && action.payload) {
      onApplyFilter(action.payload);
      setAppliedActions((prev) => ({ ...prev, [messageId]: true }));
    }
  };

  const toggleThinking = (messageId: string) => {
    setExpandedThinking((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  // Floating Launcher Position Sync & Drag Logic
  useEffect(() => {
    const syncPosition = () => {
      if (typeof window === 'undefined') return;
      const saved = readAiLauncherPosition();
      if (saved) {
        const clamped = clampAiLauncherPosition(
          saved,
          { width: window.innerWidth, height: window.innerHeight },
          AI_LAUNCHER_SIZE,
          AI_LAUNCHER_MARGIN
        );
        setLauncherPosition(clamped);
      }
    };

    syncPosition();
    const unsubscribe = subscribeAiLauncherPosition(syncPosition);

    const onResize = () => {
      setLauncherPosition((current) => {
        if (!current || typeof window === 'undefined') return current;
        const clamped = clampAiLauncherPosition(
          current,
          { width: window.innerWidth, height: window.innerHeight },
          AI_LAUNCHER_SIZE,
          AI_LAUNCHER_MARGIN
        );
        if (clamped.x !== current.x || clamped.y !== current.y) {
          persistAiLauncherPosition(clamped);
        }
        return clamped;
      });
    };

    window.addEventListener('resize', onResize);
    return () => {
      unsubscribe();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const origin = { x: rect.left, y: rect.top };
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      moved: false,
      latest: origin,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) {
      return;
    }

    if (!drag.moved) {
      drag.moved = true;
      setIsDragging(true);
    }

    const nextPos = clampAiLauncherPosition(
      { x: drag.originX + deltaX, y: drag.originY + deltaY },
      { width: window.innerWidth, height: window.innerHeight },
      AI_LAUNCHER_SIZE,
      AI_LAUNCHER_MARGIN
    );
    drag.latest = nextPos;
    setLauncherPosition(nextPos);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved) {
      persistAiLauncherPosition(drag.latest);
      suppressClickUntilRef.current = Date.now() + 200;
    }

    setIsDragging(false);
    dragRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore if pointer capture was already released
    }
  };

  if (!copilotVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Launcher Trigger with Drag & Drop + Persistence */}
      <div
        data-ai-assistant-launcher-container
        className="fixed z-40 select-none"
        style={{
          left: launcherPosition ? `${launcherPosition.x}px` : undefined,
          top: launcherPosition ? `${launcherPosition.y}px` : undefined,
          right: launcherPosition ? undefined : '24px',
          bottom: launcherPosition ? undefined : '24px',
          width: AI_LAUNCHER_SIZE,
          height: AI_LAUNCHER_SIZE,
          touchAction: 'none',
        }}
      >
        <Tooltip
          title={isDragging ? 'Đang di chuyển...' : 'mOS Copilot · Trợ lý AI riêng tư (Kéo để di chuyển)'}
          placement="left"
        >
          <button
            type="button"
            data-ai-assistant-launcher
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={(e) => {
              if (Date.now() < suppressClickUntilRef.current) {
                e.preventDefault();
                return;
              }
              setOpen(true);
            }}
            aria-label="mOS Copilot (Riêng tư)"
            className="group relative flex items-center justify-center w-12 h-12 rounded-full shadow-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-500 hover:to-pink-400 text-white shadow-indigo-500/30 border border-white/25 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out, box-shadow 0.2s',
              transform: isDragging ? 'scale(1.08)' : undefined,
            }}
          >
            <Sparkles className="w-5 h-5 text-white transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 pointer-events-none" />
            <span
              className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm pointer-events-none"
              title="Bảo mật riêng tư"
            >
              <ShieldCheck className="w-2 h-2 text-white" />
            </span>
            {/* Screen reader text for accessibility & automated tests */}
            <span className="sr-only">mOS Copilot</span>
            <span className="sr-only">Riêng tư</span>
          </button>
        </Tooltip>
      </div>

      {/* Adaptive Slide-over Assistant Drawer */}
      <AdaptiveDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-base">mOS Copilot</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3" />
                    Private Workspace
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs">
                    <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                    Powered by Antigravity (AG)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Trợ lý Đa Nhiệm cá nhân · Không ảnh hưởng thành viên khác
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Audio Controls */}
              <Tooltip
                title={
                  autoSpeakEnabled
                    ? 'Tự động đọc phản hồi (Đang BẬT) · Bấm để tắt'
                    : 'Tự động đọc phản hồi (Đang TẮT) · Bấm để bật'
                }
              >
                <button
                  type="button"
                  onClick={handleToggleAutoSpeak}
                  className={`p-1.5 rounded-md transition-colors ${
                    autoSpeakEnabled
                      ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  aria-label="Tự động đọc phản hồi"
                >
                  {autoSpeakEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </Tooltip>

              <Tooltip title={`Tốc độ đọc giọng nói: ${playbackRate}x · Bấm để đổi (1.0x / 1.25x / 1.5x)`}>
                <button
                  type="button"
                  onClick={handleCyclePlaybackRate}
                  className="px-1.5 py-1 rounded-md text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {playbackRate}x
                </button>
              </Tooltip>

              <button
                type="button"
                onClick={() => setShowSessionDrawer(!showSessionDrawer)}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Lịch sử hội thoại"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNewSession}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Tạo hội thoại mới"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
        width={560}
      >
        <div className="flex flex-col h-full -mx-4 -my-4 bg-slate-50/50 dark:bg-slate-950/50">
          {/* Private Workspace Notice Banner */}
          <div className="px-4 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>Toàn bộ thảo luận & bộ lọc chỉ áp dụng trên màn hình cá nhân của bạn.</span>
            </div>
            {sessions.length > 0 && (
              <span className="text-[11px] font-medium opacity-80">{sessions.length} phiên đã lưu</span>
            )}
          </div>

          {/* Quick Session Switcher Bar */}
          <div className="px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
            {/* New Session Button */}
            <button
              type="button"
              onClick={handleStartNewSession}
              className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                !activeSessionId && messages.length === 0
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              }`}
              title="Tạo hội thoại mới"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Phiên mới</span>
            </button>

            {/* Quick Session Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-1 min-w-0">
              {sessions.slice(0, 6).map((s) => {
                const isActive = activeSessionId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={`flex-shrink-0 group flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer text-xs transition-all max-w-[170px] border ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold border-indigo-300 dark:border-indigo-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                    title={s.title || 'Hội thoại'}
                  >
                    <MessageSquare className="w-3 h-3 flex-shrink-0 text-slate-400 group-hover:text-indigo-500" />
                    <span className="truncate">{s.title || 'Hội thoại'}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-500 transition-opacity ml-0.5"
                      title="Xóa phiên"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Full History Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setShowSessionDrawer(!showSessionDrawer)}
              className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                showSessionDrawer
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Xem tất cả phiên hội thoại cũ"
            >
              <History className="w-3.5 h-3.5" />
              <span>{sessions.length > 6 ? `Tất cả (${sessions.length})` : 'Lịch sử'}</span>
            </button>
          </div>

          {/* Sessions List Panel (Overlay inside drawer) */}
          {showSessionDrawer && (
            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Lịch sử phiên trao đổi cá nhân
                </span>
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  <Plus className="w-3 h-3" /> Tạo mới
                </button>
              </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center py-4 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Đang tải lịch sử...
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  Chưa có phiên làm việc nào. Bắt đầu câu hỏi đầu tiên bên dưới.
                </div>
              ) : (
                <div className="space-y-1">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => loadSession(s.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        activeSessionId === s.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex-1 truncate mr-2">
                        <div className="truncate font-medium">{s.title || 'Hội thoại'}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(s.createdAt).toLocaleDateString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Xóa phiên"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conversation Messages View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">
                  Không Gian Làm Việc Trợ Lý AI
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                  Tôi có thể giúp bạn giải đáp cấu trúc khách hàng, tư duy tối ưu luồng CSKH và tự động lọc dữ liệu trên
                  màn hình của bạn.
                </p>

                {/* Quick Prompts */}
                <div className="w-full space-y-2 text-left">
                  <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                    Gợi ý câu hỏi nhanh:
                  </div>
                  {QUICK_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-200 text-xs transition-all text-left shadow-sm group"
                    >
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ChevronDown className="w-3 h-3 text-slate-400 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                const hasThinking = Boolean(msg.thinking);
                const isExpanded = expandedThinking[msg.id] ?? false;
                const isActionApplied = appliedActions[msg.id];

                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* User / Bot Avatar & Badge */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400 dark:text-slate-500">
                      {isUser ? (
                        <>
                          <span>Bạn (Không gian riêng)</span>
                          <User className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <Bot className="w-3 h-3 text-indigo-500" />
                          <span className="font-medium text-slate-600 dark:text-slate-300">mOS Copilot</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {msg.source === 'ag' ? 'AG Engine' : 'Live Copilot'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Thinking Process Accordion (for Assistant) */}
                    {!isUser && hasThinking && (
                      <div className="w-full max-w-[90%] mb-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleThinking(msg.id)}
                          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Tư duy & Phân tích logic</span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {isExpanded && (
                          <div className="px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono leading-relaxed border-t border-amber-200/60 dark:border-amber-900/40 bg-white/40 dark:bg-black/20 whitespace-pre-wrap">
                            {msg.thinking}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Bubble Content */}
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : msg.id.startsWith('err-')
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-tl-none'
                            : `bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border rounded-tl-none ${
                                speakingMessageId === msg.id
                                  ? 'border-purple-300 dark:border-purple-700/80 shadow-purple-500/10 shadow-md ring-1 ring-purple-400/30'
                                  : 'border-slate-200 dark:border-slate-800'
                              }`
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      {msg.id.startsWith('err-') && lastFailedMessage && (
                        <div className="mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-rose-500">Mất kết nối máy chủ AI</span>
                          <button
                            type="button"
                            onClick={() => handleSendMessage(lastFailedMessage)}
                            disabled={sending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Thử lại câu hỏi</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Bar (Audio Speech & Copy) for Assistant Message */}
                    {!isUser && (
                      <div className="flex items-center gap-2 mt-1.5 px-1">
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(msg)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                            speakingMessageId === msg.id
                              ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={speakingMessageId === msg.id ? 'Dừng đọc' : 'Nghe đọc câu trả lời'}
                        >
                          {speakingMessageId === msg.id ? (
                            <>
                              <Square className="w-3 h-3 fill-current text-purple-600 dark:text-purple-400" />
                              <span className="font-semibold text-purple-700 dark:text-purple-300">Dừng</span>
                              {/* Animated mini soundwave equalizer */}
                              <span className="flex items-end gap-0.5 ml-0.5 h-3">
                                <span className="w-0.5 h-2 bg-purple-500 rounded-full animate-pulse" />
                                <span className="w-0.5 h-3 bg-purple-500 rounded-full animate-pulse" />
                                <span className="w-0.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                              </span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>Nghe đọc</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyContent(msg)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Sao chép nội dung"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Action Suggestion Card */}
                    {!isUser && msg.suggestedAction && (
                      <div className="w-full max-w-[90%] mt-2 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                            {msg.suggestedAction.label}
                          </span>
                        </div>

                        {/* Criteria details */}
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {Object.entries(msg.suggestedAction.payload).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 text-slate-700 dark:text-slate-300"
                            >
                              {k}: <strong className="text-emerald-600 dark:text-emerald-400">{String(v)}</strong>
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleExecuteAction(msg.suggestedAction!, msg.id)}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                            isActionApplied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow'
                          }`}
                        >
                          {isActionApplied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Đã áp dụng vào bảng dữ liệu</span>
                            </>
                          ) : (
                            <>
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Áp dụng vào bảng hiện tại</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {sending && (
              <div className="flex flex-col gap-1.5 text-xs py-2.5 px-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 shadow-sm transition-all">
                <div className="flex items-center gap-2 font-medium text-indigo-700 dark:text-indigo-300">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500 flex-shrink-0" />
                  <span>
                    {elapsedSeconds < 10
                      ? 'mOS Copilot đang suy luận và phân tích câu hỏi...'
                      : elapsedSeconds < 30
                        ? 'Đang tra cứu cơ sở dữ liệu khách hàng & salon...'
                        : 'Đang tổng hợp dữ liệu chi tiết và tính toán số liệu...'}
                  </span>
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-indigo-500 dark:text-indigo-400">
                    {elapsedSeconds}s
                  </span>
                </div>
                {elapsedSeconds >= 12 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-tight">
                    Hệ thống đang truy vấn dữ liệu thực tế, phản hồi trễ một chút vẫn đảm bảo số liệu chính xác 100%.
                  </p>
                )}
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick chip bar (when conversation has started) */}
          {messages.length > 0 && (
            <div className="px-4 py-1.5 bg-slate-100/60 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-slate-400 text-[10px] whitespace-nowrap">Gợi ý:</span>
              <button
                type="button"
                onClick={() => handleSendMessage('Giải thích các nhóm khách')}
                className="whitespace-nowrap px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 transition-colors"
              >
                Nhóm khách
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Lọc khách NYC 60 có chi tiêu cao')}
                className="whitespace-nowrap px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 transition-colors"
              >
                Lọc NYC 60
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Khách hàng được giao cho tôi')}
                className="whitespace-nowrap px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 transition-colors"
              >
                Tệp của tôi
              </button>
            </div>
          )}

          {/* Input Box Area */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            {pastedImage && (
              <div className="mb-2 relative inline-block">
                <div className="relative rounded-lg overflow-hidden border border-indigo-200 dark:border-indigo-800 max-h-28 max-w-xs shadow-sm bg-slate-100 dark:bg-slate-800">
                  <img src={pastedImage} alt="Ảnh chụp màn hình" className="max-h-28 object-contain" />
                  <button
                    type="button"
                    onClick={() => setPastedImage(null)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                    title="Gỡ ảnh đính kèm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                  📷 Đã dán ảnh chụp màn hình từ Clipboard
                </span>
              </div>
            )}
            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Hỏi về cấu trúc khách hàng, dán ảnh màn hình (Ctrl+V) hoặc yêu cầu lọc dữ liệu..."
                rows={1}
                className="flex-1 bg-transparent resize-none border-0 focus:outline-none focus:ring-0 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 max-h-24 py-1.5 px-2 leading-relaxed"
              />
              <button
                type="button"
                disabled={(!inputMessage.trim() && !pastedImage) || sending}
                onClick={() => handleSendMessage()}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors flex-shrink-0 cursor-pointer"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400">
              <span>Enter để gửi · Shift+Enter để xuống dòng · Ctrl+V dán ảnh</span>
              <span>Workspace cá nhân</span>
            </div>
          </div>
        </div>
      </AdaptiveDrawer>
    </>
  );
}
