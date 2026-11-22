'use client';

import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import type { AiChatSession, AiChatMessage, AiChatAction } from '@mos-lab/shared';
import { aiApi } from '../../../../../lib/api/ai.api';
import type { CopilotCurrentUser } from './copilot-utils';

interface UseCopilotChatOptions {
  open: boolean;
  currentFilterCriteria?: Record<string, unknown>;
  currentUser?: CopilotCurrentUser | null;
  onApplyFilter: (criteria: Record<string, unknown>) => void;
  onAssistantReply?: (message: AiChatMessage) => void;
}

/**
 * Manages Copilot chat sessions, message history, clipboard image paste, sending flow, and filter actions.
 */
export function useCopilotChat({
  open,
  currentFilterCriteria,
  currentUser,
  onApplyFilter,
  onAssistantReply,
}: UseCopilotChatOptions) {
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

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const onAssistantReplyRef = useRef(onAssistantReply);
  onAssistantReplyRef.current = onAssistantReply;

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
    let timer: ReturnType<typeof setInterval> | null = null;
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

  // Create new session on server
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

        // Trigger auto-speak callback if enabled
        if (res.message?.content) {
          onAssistantReplyRef.current?.(res.message);
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
  const handleExecuteAction = (action: AiChatAction, messageId: string, actionKey?: string) => {
    if (action.type === 'APPLY_FILTER' && action.payload) {
      onApplyFilter(action.payload);
      setAppliedActions((prev) => ({
        ...prev,
        [messageId]: true,
        ...(actionKey ? { [actionKey]: true } : {}),
      }));
    }
  };

  const toggleThinking = (messageId: string) => {
    setExpandedThinking((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  return {
    sessions,
    activeSessionId,
    messages,
    inputMessage,
    setInputMessage,
    pastedImage,
    setPastedImage,
    lastFailedMessage,
    sending,
    loadingHistory,
    showSessionDrawer,
    setShowSessionDrawer,
    expandedThinking,
    appliedActions,
    elapsedSeconds,
    chatBottomRef,
    inputRef,
    loadSession,
    handleStartNewSession,
    handleNewSession,
    handleDeleteSession,
    handlePaste,
    handleSendMessage,
    handleExecuteAction,
    toggleThinking,
  };
}
