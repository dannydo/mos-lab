'use client';

import React, { useCallback, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadMoveMode,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import type { MosChatReactionUsersTarget } from '../types/mos-chat-types';
import { playWebAudioBuzzChime, triggerBuzzVibration } from '../utils/chat-helpers';
import {
  applyBuzzToMessageItem,
  applyDeleteToMessageItem,
  applyEditToMessageItem,
  applyReactionToggleToMessage,
  applyRestoreToMessageItem,
  formatMoveTargetSnippetFromTasks,
  hasUserReactedInMessage,
  mapConversationMessage,
  mapThreadReplyInMessage,
} from '../utils/portal-message-updaters';
import { saveNotifiedBuzzKeys } from '../utils/portal-notification-dispatch';

export interface UsePortalMessageMutationsParams {
  currentUser?: SafeAny;
  isMobile: boolean;
  activeConversation?: MosChatConversation;
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  setAiMessages: React.Dispatch<React.SetStateAction<MosChatMessage[]>>;
  uniqueTasks: MosChatTaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  notifiedBuzzIdsRef: React.MutableRefObject<Set<string>>;
  lastVersionRef: React.MutableRefObject<number>;
  lastTapRef: React.MutableRefObject<{ msgId: string; time: number }>;
  setHeartFlyMsgId: React.Dispatch<React.SetStateAction<string | null>>;
  setMobileActiveMsgId: React.Dispatch<React.SetStateAction<string | null>>;
  setMobileActiveView: (view: 'inbox' | 'conversation' | 'thread') => void;
  setHighlightedMsgId: (id: string | null) => void;
  setActiveThreadMsgId: (id: string | null) => void;
  setThreadOpen: (open: boolean) => void;
  isMessageFromCurrentUser: (m: {
    senderId?: number | string | null;
    senderName?: string | null;
    isAiBot?: boolean;
    isSystemReminder?: boolean;
  }) => boolean;
  handleOpenThread: (msgId: string, convIdOverride?: string, options?: { autoFocus?: boolean }) => void;
  notifyLivePeers: () => void;
  antdMessage: MessageInstance;
}

export function usePortalMessageMutations({
  currentUser,
  isMobile,
  activeConversation,
  setConversations,
  setAiMessages,
  uniqueTasks,
  setTasks,
  notifiedBuzzIdsRef,
  lastVersionRef,
  lastTapRef,
  setHeartFlyMsgId,
  setMobileActiveMsgId,
  setMobileActiveView,
  setHighlightedMsgId,
  setActiveThreadMsgId,
  setThreadOpen,
  isMessageFromCurrentUser,
  handleOpenThread,
  notifyLivePeers,
  antdMessage,
}: UsePortalMessageMutationsParams) {
  const [reactionUsersModalOpen, setReactionUsersModalOpen] = useState<boolean>(false);
  const [reactionUsersTarget, setReactionUsersTarget] = useState<MosChatReactionUsersTarget | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingTextState, setEditingTextState] = useState<string>('');
  const editingTextRef = useRef<string>('');
  const setEditingText = useCallback((valOrFn: string | ((prev: string) => string)) => {
    const nextVal = typeof valOrFn === 'function' ? valOrFn(editingTextRef.current) : valOrFn;
    editingTextRef.current = nextVal;
  }, []);
  const editingText = editingTextState;
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [historyModalMessage, setHistoryModalMessage] = useState<MosChatMessage | MosChatThreadReply | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);

  const [movingThreadItemKey, setMovingThreadItemKey] = useState<string | null>(null);
  const [openMovePopoverKey, setOpenMovePopoverKey] = useState<string | null>(null);
  const [moveThreadSearchQuery, setMoveThreadSearchQuery] = useState<string>('');
  const [draggingRootMsgId, setDraggingRootMsgId] = useState<string | null>(null);
  const [dragOverTargetMsgId, setDragOverTargetMsgId] = useState<string | null>(null);
  const [dragOverThreadPane, setDragOverThreadPane] = useState<boolean>(false);

  const handleOpenReactionUsers = useCallback(
    (
      target: {
        id?: string;
        messageId?: string;
        replyId?: string;
        reactions?: Record<string, number>;
        reactionUsers?: Record<string, Array<number | string>>;
      },
      initialEmoji?: string
    ) => {
      const resolvedMsgId = target.messageId || target.id || '';
      setReactionUsersTarget({
        messageId: resolvedMsgId,
        replyId: target.replyId,
        reactions: target.reactions || {},
        reactionUsers: target.reactionUsers || {},
        initialEmoji,
      });
      setReactionUsersModalOpen(true);
    },
    []
  );

  const handleCloseReactionUsers = useCallback(() => {
    setReactionUsersModalOpen(false);
    setReactionUsersTarget(null);
  }, []);

  const currentUserReactionKey = String(currentUser?.id || 'me');

  const hasUserReacted = (
    m: { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<number | string>> } | undefined,
    emoji: string
  ): boolean => hasUserReactedInMessage(m, emoji, currentUserReactionKey);

  const handleToggleReaction = async (msgId: string, emoji: string, replyId?: string) => {
    if (!activeConversation) return;
    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) =>
        prev.map((m) => (m.id === msgId ? applyReactionToggleToMessage(m, emoji, currentUserReactionKey) : m))
      );
      return;
    }
    const targetConvId = activeConversation.id;

    setConversations((prev) =>
      mapConversationMessage(prev, targetConvId, msgId, (m) =>
        replyId
          ? mapThreadReplyInMessage(m, replyId, (r) => applyReactionToggleToMessage(r, emoji, currentUserReactionKey))
          : applyReactionToggleToMessage(m, emoji, currentUserReactionKey)
      )
    );
    try {
      const res = await apiClient.chat.reactToMessage(msgId, targetConvId, emoji, replyId);
      if (res?.reactions) {
        setReactionUsersTarget((prev) => {
          if (!prev) return null;
          if (prev.messageId === msgId && (replyId ? prev.replyId === replyId : !prev.replyId)) {
            return {
              ...prev,
              reactions: res.reactions || {},
              reactionUsers: res.reactionUsers ?? prev.reactionUsers ?? {},
            };
          }
          return prev;
        });
        setConversations((prev) =>
          mapConversationMessage(prev, targetConvId, msgId, (m) =>
            replyId
              ? mapThreadReplyInMessage(m, replyId, (r) => ({
                  ...r,
                  reactions: res.reactions,
                  reactionUsers: res.reactionUsers ?? r.reactionUsers,
                }))
              : { ...m, reactions: res.reactions, reactionUsers: res.reactionUsers ?? m.reactionUsers }
          )
        );
      }
      notifyLivePeers();
    } catch {
      // ignore
    }
  };

  const handleTogglePin = async (msgId: string) => {
    if (!activeConversation) return;
    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m)));
      return;
    }
    setConversations((prev) =>
      mapConversationMessage(prev, activeConversation.id, msgId, (m) => ({ ...m, pinned: !m.pinned }))
    );
    try {
      await apiClient.chat.togglePinMessage(msgId, activeConversation.id);
      notifyLivePeers();
    } catch {
      // ignore
    }
  };

  const handleStartEdit = (msg: MosChatMessage, replyId?: string) => {
    if (replyId) {
      const reply = msg.thread?.find((r) => r.id === replyId);
      if (reply) {
        if (!isMessageFromCurrentUser(reply)) {
          antdMessage.warning('Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình');
          return;
        }
        setEditingMessageId(msg.id);
        setEditingReplyId(replyId);
        editingTextRef.current = reply.text;
        setEditingTextState(reply.text);
      }
    } else {
      if (!isMessageFromCurrentUser(msg)) {
        antdMessage.warning('Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình');
        return;
      }
      setEditingMessageId(msg.id);
      setEditingReplyId(null);
      editingTextRef.current = msg.text;
      setEditingTextState(msg.text);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingReplyId(null);
    editingTextRef.current = '';
    setEditingTextState('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !activeConversation) return;
    const trimmed = editingTextRef.current.trim();
    if (!trimmed) {
      antdMessage.warning('Nội dung tin nhắn không được để trống');
      return;
    }

    setIsSavingEdit(true);
    const nowIso = new Date().toISOString();
    const myId = currentUser?.id || 'me';
    const myName = currentUser?.displayName || currentUser?.username || 'Bạn';
    const editMsgId = editingMessageId;
    const editRepId = editingReplyId;

    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) =>
        prev.map((m) => (m.id === editMsgId ? applyEditToMessageItem(m, trimmed, myId, myName, nowIso) : m))
      );
      handleCancelEdit();
      setIsSavingEdit(false);
      antdMessage.success('Đã lưu chỉnh sửa tin nhắn');
      return;
    }

    setConversations((prev) =>
      mapConversationMessage(prev, activeConversation.id, editMsgId, (m) =>
        editRepId
          ? mapThreadReplyInMessage(m, editRepId, (r) => applyEditToMessageItem(r, trimmed, myId, myName, nowIso))
          : applyEditToMessageItem(m, trimmed, myId, myName, nowIso)
      )
    );

    try {
      await apiClient.chat.editMessage(editMsgId, {
        conversationId: activeConversation.id,
        text: trimmed,
        replyId: editRepId || undefined,
      });
      notifyLivePeers();
      antdMessage.success('Đã lưu chỉnh sửa tin nhắn');
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || 'Lỗi khi cập nhật tin nhắn');
    } finally {
      setIsSavingEdit(false);
      handleCancelEdit();
    }
  };

  const handleDeleteMessage = async (msgId: string, replyId?: string) => {
    if (!activeConversation) return;
    const nowIso = new Date().toISOString();
    const myId = currentUser?.id || 'me';
    const myName = currentUser?.displayName || currentUser?.username || 'Bạn';

    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) =>
        prev.map((m) => (m.id === msgId ? applyDeleteToMessageItem(m, myId, myName, nowIso) : m))
      );
      if (historyModalMessage && (historyModalMessage.id === msgId || historyModalMessage.id === replyId)) {
        setHistoryModalMessage((prev) => (prev ? applyDeleteToMessageItem(prev, myId, myName, nowIso) : null));
      }
      antdMessage.success('Đã xoá tin nhắn (lịch sử đã được lưu lại)');
      return;
    }

    setConversations((prev) =>
      mapConversationMessage(prev, activeConversation.id, msgId, (m) =>
        replyId
          ? mapThreadReplyInMessage(m, replyId, (r) => applyDeleteToMessageItem(r, myId, myName, nowIso))
          : applyDeleteToMessageItem(m, myId, myName, nowIso)
      )
    );
    if (historyModalMessage && (historyModalMessage.id === msgId || historyModalMessage.id === replyId)) {
      setHistoryModalMessage((prev) => (prev ? applyDeleteToMessageItem(prev, myId, myName, nowIso) : null));
    }

    try {
      await apiClient.chat.deleteMessage(msgId, {
        conversationId: activeConversation.id,
        replyId: replyId || undefined,
      });
      notifyLivePeers();
      antdMessage.success('Đã xoá tin nhắn (lịch sử đã được lưu lại)');
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || 'Lỗi khi xoá tin nhắn');
    }
  };

  const handleRestoreMessage = async (msgId: string, replyId?: string) => {
    if (!activeConversation) return;

    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) => prev.map((m) => (m.id === msgId ? applyRestoreToMessageItem(m) : m)));
      if (historyModalMessage && (historyModalMessage.id === msgId || historyModalMessage.id === replyId)) {
        setHistoryModalMessage((prev) => (prev ? applyRestoreToMessageItem(prev) : null));
      }
      antdMessage.success('Đã khôi phục tin nhắn thành công');
      return;
    }

    setConversations((prev) =>
      mapConversationMessage(prev, activeConversation.id, msgId, (m) =>
        replyId ? mapThreadReplyInMessage(m, replyId, applyRestoreToMessageItem) : applyRestoreToMessageItem(m)
      )
    );
    if (historyModalMessage && (historyModalMessage.id === msgId || historyModalMessage.id === replyId)) {
      setHistoryModalMessage((prev) => (prev ? applyRestoreToMessageItem(prev) : null));
    }

    try {
      await apiClient.chat.restoreMessage(msgId, {
        conversationId: activeConversation.id,
        replyId: replyId || undefined,
      });
      notifyLivePeers();
      antdMessage.success('Đã khôi phục tin nhắn thành công');
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || 'Lỗi khi khôi phục tin nhắn');
    }
  };

  const handleRestoreVersion = async (msgId: string, versionText: string, replyId?: string) => {
    if (!activeConversation) return;
    try {
      await apiClient.chat.editMessage(msgId, {
        conversationId: activeConversation.id,
        text: versionText,
        replyId: replyId || undefined,
      });
      const editedAt = new Date().toISOString();
      setConversations((prev) =>
        mapConversationMessage(prev, activeConversation.id, msgId, (m) =>
          replyId
            ? mapThreadReplyInMessage(m, replyId, (r) => ({ ...r, text: versionText, editedAt }))
            : { ...m, text: versionText, editedAt }
        )
      );
      if (historyModalMessage && (historyModalMessage.id === msgId || historyModalMessage.id === replyId)) {
        setHistoryModalMessage((prev) => (prev ? { ...prev, text: versionText, editedAt } : null));
      }
      notifyLivePeers();
      antdMessage.success('Đã khôi phục nội dung phiên bản đã chọn');
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || 'Lỗi khi khôi phục phiên bản');
    }
  };

  const handleBuzzMessage = async (msgId: string, replyId?: string) => {
    if (!activeConversation) return;
    try {
      antdMessage.loading({ content: 'Đang gửi tín hiệu Buzz khẩn cấp...', key: `buzz-${msgId}` });
      const res = await apiClient.chat.buzzMessage(msgId, {
        conversationId: activeConversation.id,
        replyId,
      });
      if (res?.success) {
        const buzzKey = `${replyId || msgId}-${res.buzzEvent.buzzedAt}`;
        notifiedBuzzIdsRef.current.add(buzzKey);
        if (res.buzzEvent?.id) {
          notifiedBuzzIdsRef.current.add(res.buzzEvent.id);
        }
        saveNotifiedBuzzKeys(notifiedBuzzIdsRef.current);

        playWebAudioBuzzChime();
        triggerBuzzVibration();
        antdMessage.success({
          content: '⚡ Đã Buzz tin nhắn khẩn cấp thành công! Hệ thống đã gửi cảnh báo đến người nhận.',
          key: `buzz-${msgId}`,
          duration: 3,
        });

        setConversations((prev) =>
          mapConversationMessage(
            prev,
            activeConversation.id,
            msgId,
            (m) =>
              replyId
                ? mapThreadReplyInMessage(m, replyId, (r) => applyBuzzToMessageItem(r, res.buzzEvent))
                : applyBuzzToMessageItem(m, res.buzzEvent),
            res.buzzEvent.buzzedAt
          )
        );
        notifyLivePeers();
      }
    } catch (err: SafeAny) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể Buzz tin nhắn này';
      antdMessage.error({ content: errorMsg, key: `buzz-${msgId}`, duration: 4 });
    }
  };

  const handleMessageTap = (m: MosChatMessage, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    if (typeof window !== 'undefined' && window.getSelection()?.toString()?.trim()) {
      return;
    }
    const msgId = m.id;
    const now = Date.now();
    const hasSubthread = Boolean(m.thread && m.thread.length > 0);

    if (lastTapRef.current.msgId === msgId && now - lastTapRef.current.time < 380) {
      void handleToggleReaction(msgId, '❤️');
      setHeartFlyMsgId(msgId);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(25);
        } catch {
          // ignore
        }
      }
      setTimeout(() => setHeartFlyMsgId((cur) => (cur === msgId ? null : cur)), 850);
      lastTapRef.current = { msgId: '', time: 0 };
    } else {
      lastTapRef.current = { msgId, time: now };
      if (isMobile) {
        setMobileActiveMsgId((prev) => (prev === msgId ? null : msgId));
      }
      if (hasSubthread) {
        handleOpenThread(msgId);
      }
    }
  };

  const formatMoveTargetSnippet = (msg: MosChatMessage): string => formatMoveTargetSnippetFromTasks(msg, uniqueTasks);

  const handleMoveThreadItem = async (params: {
    mode: MosChatThreadMoveMode;
    sourceMessageId: string;
    replyId?: string;
    targetMessageId?: string;
  }) => {
    if (!activeConversation || activeConversation.id === AI_COPILOT_CONV_ID) return;
    const convId = activeConversation.id;
    const loadingKey = `${params.mode}:${params.sourceMessageId}:${params.replyId || ''}`;
    setMovingThreadItemKey(loadingKey);
    setOpenMovePopoverKey(null);
    setMoveThreadSearchQuery('');
    try {
      const res = await apiClient.chat.moveThreadItem({
        conversationId: convId,
        mode: params.mode,
        sourceMessageId: params.sourceMessageId,
        replyId: params.replyId,
        targetMessageId: params.targetMessageId,
      });
      lastVersionRef.current = Date.now();
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === convId ? res.conversation : c)));
      }
      if (res?.tasks) {
        setTasks(res.tasks);
      }
      if (params.mode === 'PROMOTE_REPLY_TO_ROOT' && res?.promotedMessage?.id) {
        setHighlightedMsgId(res.promotedMessage.id);
      }
      if (
        (params.mode === 'MERGE_ROOT_TO_THREAD' || params.mode === 'MOVE_REPLY_TO_THREAD') &&
        params.targetMessageId
      ) {
        setActiveThreadMsgId(params.targetMessageId);
        setThreadOpen(true);
        if (isMobile) {
          setMobileActiveView('thread');
        }
      }
      notifyLivePeers();
      if (params.mode === 'MERGE_ROOT_TO_THREAD') {
        antdMessage.success('Đã gộp tin nhắn (kèm ảnh & phản hồi) vào luồng trả lời phụ!');
      } else if (params.mode === 'PROMOTE_REPLY_TO_ROOT') {
        antdMessage.success('Đã tách phản hồi ra thành tin nhắn độc lập ở luồng chính!');
      } else {
        antdMessage.success('Đã chuyển phản hồi sang luồng trả lời đích!');
      }
    } catch (err: SafeAny) {
      antdMessage.error(
        err?.response?.data?.message || err?.message || 'Không thể di chuyển tin nhắn / luồng trả lời.'
      );
    } finally {
      setMovingThreadItemKey(null);
    }
  };

  return {
    reactionUsersModalOpen,
    setReactionUsersModalOpen,
    reactionUsersTarget,
    setReactionUsersTarget,
    handleOpenReactionUsers,
    handleCloseReactionUsers,
    editingMessageId,
    editingReplyId,
    editingText,
    setEditingText,
    isSavingEdit,
    historyModalMessage,
    setHistoryModalMessage,
    historyModalOpen,
    setHistoryModalOpen,
    movingThreadItemKey,
    openMovePopoverKey,
    setOpenMovePopoverKey,
    moveThreadSearchQuery,
    setMoveThreadSearchQuery,
    draggingRootMsgId,
    setDraggingRootMsgId,
    dragOverTargetMsgId,
    setDragOverTargetMsgId,
    dragOverThreadPane,
    setDragOverThreadPane,
    hasUserReacted,
    handleToggleReaction,
    handleTogglePin,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleDeleteMessage,
    handleRestoreMessage,
    handleRestoreVersion,
    handleBuzzMessage,
    handleMessageTap,
    formatMoveTargetSnippet,
    handleMoveThreadItem,
  };
}
