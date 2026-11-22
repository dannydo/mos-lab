'use client';

import { useCallback } from 'react';
import { message as antdMessage } from 'antd';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadMoveMode,
  SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { toggleReactionState, hasUserReacted as hasUserReactedHelper } from '../utils/chat-helpers';
import type { MosChatMobileView, MosChatReactionUsersTarget } from '../types/mos-chat-types';

export interface UseMosChatMessageMutationsParams {
  currentUser: SafeAny;
  effectiveUser: SafeAny;
  activeConvId: string;
  activeConversation: MosChatConversation | null;
  activeThreadMsg: MosChatMessage | null;
  messages: MosChatMessage[];
  setAllMessagesByConv: React.Dispatch<React.SetStateAction<Record<string, MosChatMessage[]>>>;
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  setActiveThreadMsg: React.Dispatch<React.SetStateAction<MosChatMessage | null>>;
  setReactionUsersTarget: React.Dispatch<React.SetStateAction<MosChatReactionUsersTarget | null>>;
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  setMobileView: React.Dispatch<React.SetStateAction<MosChatMobileView>>;
}

function mapTargetMessageList(
  list: MosChatMessage[],
  msgId: string,
  updater: (msg: MosChatMessage) => MosChatMessage
): MosChatMessage[] {
  return list.map((m) => (m.id === msgId ? updater(m) : m));
}

/**
 * Handles Context-layer message mutations: reactions, pin, soft delete (root & reply), and thread moves.
 */
export function useMosChatMessageMutations({
  currentUser,
  effectiveUser,
  activeConvId,
  activeConversation,
  activeThreadMsg,
  messages,
  setAllMessagesByConv,
  setConversations,
  setActiveThreadMsg,
  setReactionUsersTarget,
  setTasks,
  setMobileView,
}: UseMosChatMessageMutationsParams) {
  const currentUserReactionKey = String(currentUser?.id || 'me');

  const hasUserReactedMsg = useCallback(
    (
      target:
        | { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<number | string>> }
        | undefined
        | null,
      emoji: string
    ): boolean => hasUserReactedHelper(target, emoji, currentUserReactionKey),
    [currentUserReactionKey]
  );

  const applyReactionToStore = useCallback(
    (
      msgId: string,
      replyId: string | undefined,
      transform: (target: {
        reactions?: Record<string, number>;
        reactionUsers?: Record<string, Array<number | string>>;
      }) => SafeAny
    ) => {
      const applyToMessage = (m: MosChatMessage): MosChatMessage => {
        if (replyId && m.thread) {
          return {
            ...m,
            thread: m.thread.map((r) => (r.id === replyId ? { ...r, ...transform(r) } : r)),
          };
        }
        return { ...m, ...transform(m) };
      };

      setAllMessagesByConv((prev) => ({
        ...prev,
        [activeConvId]: mapTargetMessageList(prev[activeConvId] || [], msgId, applyToMessage),
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId ? { ...c, messages: mapTargetMessageList(c.messages || [], msgId, applyToMessage) } : c
        )
      );
      setActiveThreadMsg((prev) => {
        if (!prev || prev.id !== msgId) return prev;
        if (replyId) return applyToMessage(prev);
        return { ...prev, ...transform(prev) };
      });
      setReactionUsersTarget((prev) => {
        if (!prev || prev.messageId !== msgId || prev.replyId !== replyId) return prev;
        return { ...prev, ...transform(prev) };
      });
    },
    [activeConvId, setActiveThreadMsg, setAllMessagesByConv, setConversations, setReactionUsersTarget]
  );

  const reactToMessage = useCallback(
    async (msgId: string, emoji: string, replyId?: string) => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10);
      }

      applyReactionToStore(msgId, replyId, (target) => toggleReactionState(target, emoji, currentUserReactionKey));

      try {
        const res = await apiClient.chat.reactToMessage(msgId, activeConvId, emoji, replyId);
        if (res?.success && res.reactions) {
          const serverReactions = res.reactions;
          const serverReactionUsers = res.reactionUsers || {};
          applyReactionToStore(msgId, replyId, () => ({
            reactions: serverReactions,
            reactionUsers: serverReactionUsers,
          }));
        }
      } catch {
        // ignore
      }
    },
    [activeConvId, applyReactionToStore, currentUserReactionKey]
  );

  const togglePinMessage = useCallback(
    async (msgId: string) => {
      setAllMessagesByConv((prev) => {
        const currentList = prev[activeConvId] || activeConversation?.messages || [];
        return {
          ...prev,
          [activeConvId]: currentList.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m)),
        };
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, messages: (c.messages || []).map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m)) }
            : c
        )
      );
      try {
        await apiClient.chat.togglePinMessage(msgId, activeConvId);
      } catch {
        // ignore
      }
    },
    [activeConvId, activeConversation, setAllMessagesByConv, setConversations]
  );

  const resolveDeletedByInfo = useCallback(() => {
    const myId = effectiveUser?.id || currentUser?.id || 'me';
    const myName =
      effectiveUser?.displayName ||
      effectiveUser?.fullName ||
      effectiveUser?.name ||
      currentUser?.displayName ||
      currentUser?.fullName ||
      currentUser?.name ||
      'Bạn';
    return { myId, myName, deletedAt: new Date().toISOString() };
  }, [currentUser, effectiveUser]);

  const deleteMessage = useCallback(
    async (msgId: string) => {
      const { myId, myName, deletedAt } = resolveDeletedByInfo();
      const markDeleted = (m: MosChatMessage): MosChatMessage => ({
        ...m,
        originalText: m.originalText || m.text,
        isDeleted: true,
        deletedAt,
        deletedBy: myId,
        deletedByName: myName,
      });

      setActiveThreadMsg((prev) => (prev && prev.id === msgId ? markDeleted(prev) : prev));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId ? { ...c, messages: mapTargetMessageList(c.messages || [], msgId, markDeleted) } : c
        )
      );
      setAllMessagesByConv((prev) => ({
        ...prev,
        [activeConvId]: mapTargetMessageList(prev[activeConvId] || [], msgId, markDeleted),
      }));

      try {
        await apiClient.chat.deleteMessage(msgId, { conversationId: activeConvId });
      } catch (err) {
        console.error('Failed to delete message:', err);
        throw err;
      }
    },
    [activeConvId, resolveDeletedByInfo, setActiveThreadMsg, setAllMessagesByConv, setConversations]
  );

  const deleteThreadReply = useCallback(
    async (parentMsgId: string, replyId: string) => {
      const { myId, myName, deletedAt } = resolveDeletedByInfo();
      const markReplyDeleted = (m: MosChatMessage): MosChatMessage => ({
        ...m,
        thread: (m.thread || []).map((r) =>
          r.id === replyId
            ? {
                ...r,
                originalText: r.originalText || r.text,
                isDeleted: true,
                deletedAt,
                deletedBy: myId,
                deletedByName: myName,
              }
            : r
        ),
      });

      setActiveThreadMsg((prev) => (prev && prev.id === parentMsgId ? markReplyDeleted(prev) : prev));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, messages: mapTargetMessageList(c.messages || [], parentMsgId, markReplyDeleted) }
            : c
        )
      );
      setAllMessagesByConv((prev) => ({
        ...prev,
        [activeConvId]: mapTargetMessageList(prev[activeConvId] || [], parentMsgId, markReplyDeleted),
      }));

      try {
        await apiClient.chat.deleteMessage(parentMsgId, { conversationId: activeConvId, replyId });
      } catch (err) {
        console.error('Failed to delete thread reply:', err);
        throw err;
      }
    },
    [activeConvId, resolveDeletedByInfo, setActiveThreadMsg, setAllMessagesByConv, setConversations]
  );

  const moveThreadItem = useCallback(
    async (params: {
      mode: MosChatThreadMoveMode;
      sourceMessageId: string;
      replyId?: string;
      targetMessageId?: string;
    }): Promise<boolean> => {
      if (!activeConvId || activeConvId === 'ai-copilot') return false;
      try {
        const res = await apiClient.chat.moveThreadItem({
          conversationId: activeConvId,
          mode: params.mode,
          sourceMessageId: params.sourceMessageId,
          replyId: params.replyId,
          targetMessageId: params.targetMessageId,
        });

        if (res?.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === activeConvId ? res.conversation : c)));
          if (res.conversation.messages) {
            setAllMessagesByConv((prev) => ({
              ...prev,
              [activeConvId]: res.conversation.messages,
            }));
          }
        }
        if (res?.tasks) setTasks(res.tasks);
        if (
          (params.mode === 'MERGE_ROOT_TO_THREAD' || params.mode === 'MOVE_REPLY_TO_THREAD') &&
          params.targetMessageId
        ) {
          const targetMsg =
            res?.conversation?.messages?.find((m) => m.id === params.targetMessageId) ||
            messages.find((m) => m.id === params.targetMessageId);
          if (targetMsg) {
            setActiveThreadMsg(targetMsg);
            setMobileView('thread');
          }
        } else if (params.mode === 'PROMOTE_REPLY_TO_ROOT') {
          if (activeThreadMsg && res?.conversation?.messages) {
            const updatedParent = res.conversation.messages.find((m) => m.id === activeThreadMsg.id);
            if (updatedParent) setActiveThreadMsg(updatedParent);
          }
        }
        if (params.mode === 'MERGE_ROOT_TO_THREAD') {
          antdMessage.success('Đã gộp tin nhắn vào luồng trả lời phụ!');
        } else if (params.mode === 'PROMOTE_REPLY_TO_ROOT') {
          antdMessage.success('Đã tách phản hồi ra thành tin nhắn độc lập ở luồng chính!');
        } else {
          antdMessage.success('Đã chuyển phản hồi sang luồng trả lời đích!');
        }
        return true;
      } catch (err: SafeAny) {
        antdMessage.error(
          err?.response?.data?.message || err?.message || 'Không thể di chuyển tin nhắn / luồng trả lời.'
        );
        return false;
      }
    },
    [
      activeConvId,
      activeThreadMsg,
      messages,
      setActiveThreadMsg,
      setAllMessagesByConv,
      setConversations,
      setMobileView,
      setTasks,
    ]
  );

  return {
    hasUserReactedMsg,
    reactToMessage,
    togglePinMessage,
    deleteMessage,
    deleteThreadReply,
    moveThreadItem,
  };
}
