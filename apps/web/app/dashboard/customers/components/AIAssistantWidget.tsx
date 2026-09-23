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
} from 'lucide-react';
import { Tooltip } from 'antd';
import type { AiChatSession, AiChatMessage, AiChatAction } from '@mos-lab/shared';
import { AdaptiveDrawer } from '../../../../components/ui';
import { aiApi } from '../../../../lib/api/ai.api';

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
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || sending) return;

    setInputMessage('');
    setSending(true);

    // Optimistic user message
    const tempUserMsg: AiChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: activeSessionId || '',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await aiApi.ai.sendMessage({
        sessionId: activeSessionId || undefined,
        message: text,
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
      }
    } catch {
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

  return (
    <>
      {/* Floating Launcher Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <Tooltip title="mOS Copilot · Trợ lý AI riêng tư" placement="left">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="mOS Copilot (Riêng tư)"
            className="group relative flex items-center justify-center w-12 h-12 rounded-full shadow-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-500 hover:to-pink-400 text-white transition-all duration-300 hover:scale-110 active:scale-95 shadow-indigo-500/30 border border-white/25 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <Sparkles className="w-5 h-5 text-white transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
            <span
              className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm"
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
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    </div>

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
            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Hỏi về cấu trúc khách hàng, tư vấn CSKH hoặc yêu cầu lọc dữ liệu..."
                rows={1}
                className="flex-1 bg-transparent resize-none border-0 focus:outline-none focus:ring-0 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 max-h-24 py-1.5 px-2 leading-relaxed"
              />
              <button
                type="button"
                disabled={!inputMessage.trim() || sending}
                onClick={() => handleSendMessage()}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors flex-shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400">
              <span>Enter để gửi · Shift+Enter để xuống dòng</span>
              <span>Workspace cá nhân</span>
            </div>
          </div>
        </div>
      </AdaptiveDrawer>
    </>
  );
}
