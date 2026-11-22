import type { FastifyInstance } from 'fastify';
import type { MosNotificationItem } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../../middlewares/auth.js';
import {
  filterAndFormatConversationsForUser,
  filterTasksForUser,
  isStaffMentionedInChatText,
  loadChatState,
  loadStaffDirectoryCached,
} from '../../chat/routes.js';
import { cleanConversationName, formatRemindAtVi } from './notification-state.js';

export async function collectChatNotifications(
  fastify: FastifyInstance,
  user: JwtUserPayload,
  staffId: number,
  userStaff: { username?: string | null; email?: string | null } | null,
  userDisplayName: string,
  items: MosNotificationItem[],
  readIdsSet: Set<string>
): Promise<void> {
  // 2. mOS Chat Mentions, Unread DMs, Thread Replies & Tasks directly from memoryChatCache
  try {
    const [{ conversations: rawConvs, userPrefsByUserKey: allPrefs, tasks: chatTasks }, staffDirectory] =
      await Promise.all([loadChatState(fastify), loadStaffDirectoryCached(fastify)]);
    const userPrefs = allPrefs[`staff_${staffId}`] || allPrefs[String(staffId)] || {};
    const readMessageCountByConv = userPrefs.readMessageCountByConv || {};
    const mutedIdsSet = new Set(userPrefs.mutedIds || []);

    const directoryStaff = staffDirectory.find((s) => Number(s.id) === staffId);
    const myStaffIdentity = {
      id: staffId,
      username: userStaff?.username || directoryStaff?.username || user.username || '',
      displayName: userDisplayName || directoryStaff?.displayName || '',
      email: userStaff?.email || undefined,
    };

    // Strict Conversation Privacy Invariant: ONLY evaluate conversations accessible to this user
    const accessibleConvs = filterAndFormatConversationsForUser(
      rawConvs || [],
      user,
      staffDirectory,
      userPrefs,
      allPrefs
    );

    for (const conv of accessibleConvs) {
      const convIdStr = String(conv.id || '');
      if (mutedIdsSet.has(convIdStr)) continue;
      if (conv.isSelf || convIdStr.startsWith('dm-self-')) continue;

      if (conv.type === 'dm') {
        const dmParticipantIds = Array.isArray(conv.memberIds) ? conv.memberIds.map(Number) : [];
        if (dmParticipantIds.length !== 2 || !dmParticipantIds.includes(staffId)) {
          continue;
        }
      }

      const explicitSpaceMemberNums =
        conv.type === 'space' && Array.isArray(conv.memberIds)
          ? conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
          : [];
      const isExplicitSpaceMember =
        conv.type !== 'space' || explicitSpaceMemberNums.length === 0 || explicitSpaceMemberNums.includes(staffId);

      const msgs = conv.messages || [];
      const explicitReadCount = readMessageCountByConv[conv.id];
      const personalizedUnread = conv.unreadCount || 0;
      const startIndex =
        typeof explicitReadCount === 'number'
          ? Math.min(msgs.length, Math.max(0, explicitReadCount))
          : conv.type === 'dm' && personalizedUnread > 0
            ? Math.max(0, msgs.length - personalizedUnread)
            : msgs.length;

      const unreadMsgs = msgs.slice(startIndex).filter((m) => !m.isDeleted && Number(m.senderId) !== staffId);
      let hasMentionInConv = false;

      for (const msg of unreadMsgs) {
        const mentionMatch = isStaffMentionedInChatText(msg.text, myStaffIdentity, {
          nicknames: conv.memberNicknames,
          includeAtAll: isExplicitSpaceMember,
        });

        if (mentionMatch.isPersonalMention || mentionMatch.isAtAll) {
          hasMentionInConv = true;
          const notifId = `chat-mention-${conv.id}-${msg.id}`;
          const targetChannelName = cleanConversationName(conv.name, conv.type);
          items.push({
            id: notifId,
            title:
              conv.type === 'dm'
                ? `[Nhắc tên @] từ ${msg.senderName || conv.name}`
                : `[Nhắc tên @] ${msg.senderName || 'Thành viên'} trong ${targetChannelName}`,
            summary: msg.text || (msg.attachments?.length ? '[Hình ảnh đính kèm]' : ''),
            category: 'chat_mention',
            priority: mentionMatch.isPersonalMention || msg.isBuzzed ? 'urgent' : 'high',
            action: {
              type: 'open_chat',
              payload: { conversationId: conv.id, messageId: msg.id },
            },
            badgeText: '@Mention',
            isActionable: true,
            actor: {
              name: msg.senderName || conv.name,
              avatarUrl: msg.senderAvatar || conv.avatar || undefined,
            },
            createdAt: msg.createdAt || new Date().toISOString(),
          });
        }
      }

      // If it's a 1-1 DM with unread messages and not already added via mention
      if (conv.type === 'dm' && !hasMentionInConv && unreadMsgs.length > 0) {
        const lastMsg = unreadMsgs[unreadMsgs.length - 1];
        if (Number(lastMsg.senderId) !== staffId) {
          const notifId = `chat-dm-${conv.id}-${lastMsg.id}`;
          const senderLabel = lastMsg.senderName || conv.name;
          items.push({
            id: notifId,
            title: `[Tin nhắn riêng] từ ${senderLabel}`,
            summary: lastMsg.text || (lastMsg.attachments?.length ? '[Hình ảnh đính kèm]' : ''),
            category: 'chat_mention',
            priority: lastMsg.isBuzzed ? 'urgent' : 'high',
            action: {
              type: 'open_chat',
              payload: { conversationId: conv.id, messageId: lastMsg.id },
            },
            badgeText: `${unreadMsgs.length} tin mới`,
            isActionable: true,
            actor: {
              name: senderLabel,
              avatarUrl: lastMsg.senderAvatar || conv.avatar || undefined,
            },
            createdAt: lastMsg.createdAt || new Date().toISOString(),
          });
        }
      }

      // Inspect unread thread replies across all messages in this accessible conversation
      for (const msg of msgs) {
        const threadReplies = msg.thread || [];
        const unreadThreadReplyCount = msg.unreadThreadReplyCount || 0;
        if (threadReplies.length === 0 || unreadThreadReplyCount <= 0) continue;

        const threadKey = `${conv.id}::${msg.id}`;
        const explicitThreadRead =
          userPrefs.readThreadReplyCountByMsg?.[threadKey] ?? userPrefs.readThreadReplyCountByMsg?.[msg.id];
        let lastMyReplyIdx = -1;
        for (let i = 0; i < threadReplies.length; i++) {
          if (Number(threadReplies[i].senderId) === staffId) {
            lastMyReplyIdx = i;
          }
        }
        const replyStartIdx =
          typeof explicitThreadRead === 'number'
            ? Math.max(explicitThreadRead, lastMyReplyIdx >= 0 ? lastMyReplyIdx + 1 : 0)
            : lastMyReplyIdx >= 0
              ? lastMyReplyIdx + 1
              : 0;

        const unreadReplies = threadReplies
          .slice(replyStartIdx)
          .filter((r) => !r.isDeleted && Number(r.senderId) !== staffId && !r.isMissionMilestone);
        if (unreadReplies.length === 0) continue;

        const lastReply = unreadReplies[unreadReplies.length - 1];
        const hasPersonalMentionInThread = unreadReplies.some(
          (r) =>
            isStaffMentionedInChatText(r.text, myStaffIdentity, {
              nicknames: conv.memberNicknames,
              includeAtAll: isExplicitSpaceMember,
            }).isPersonalMention
        );
        const notifId = `chat-thread-${conv.id}-${msg.id}-${lastReply.id}`;
        const targetChannelName = cleanConversationName(conv.name, conv.type);
        const replySenderName = lastReply.senderName || conv.name || 'Thành viên';

        items.push({
          id: notifId,
          title:
            conv.type === 'dm'
              ? `[Phản hồi luồng] từ ${replySenderName}`
              : hasPersonalMentionInThread
                ? `[Nhắc tên trong luồng @] ${replySenderName} tại ${targetChannelName}`
                : `[Phản hồi luồng] ${replySenderName} tại ${targetChannelName}`,
          summary: lastReply.text || (lastReply.attachments?.length ? '[Hình ảnh đính kèm]' : msg.text || ''),
          category: 'chat_mention',
          priority: hasPersonalMentionInThread ? 'urgent' : 'high',
          action: {
            type: 'open_chat',
            payload: {
              conversationId: conv.id,
              messageId: lastReply.id,
              threadRootMessageId: msg.id,
            },
          },
          badgeText: hasPersonalMentionInThread ? '@Mention' : `${unreadThreadReplyCount} phản hồi mới`,
          isActionable: true,
          actor: {
            name: replySenderName,
            avatarUrl: lastReply.senderAvatar || conv.avatar || undefined,
          },
          createdAt: lastReply.createdAt || new Date().toISOString(),
        });
      }
    }

    // 3. mOS Chat Tasks & Reminders from accessible conversations only
    const accessibleTasks = filterTasksForUser(chatTasks || [], rawConvs || [], user, staffDirectory);
    const myTasks = accessibleTasks.filter((t) => {
      if (t.done || t.archived) return false;
      if (Number(t.assigneeId) === staffId) return true;
      return false;
    });

    for (const task of myTasks.slice(0, 5)) {
      const notifId = `chat-task-${task.id}`;
      items.push({
        id: notifId,
        title: `[Nhắc việc] ${task.title}`,
        summary: task.remindAt ? formatRemindAtVi(task.remindAt) : 'Nhiệm vụ cần xử lý',
        category: 'task_reminder',
        priority: 'normal',
        action: {
          type: 'open_chat',
          payload: {
            openTab: 'tasks',
            taskId: task.id,
            conversationId: task.conversationId,
            messageId: task.sourceMessageId || undefined,
          },
        },
        badgeText: 'Nhắc việc',
        isActionable: true,
        createdAt: task.createdAt || new Date().toISOString(),
      });
    }

    // Past completed tasks (shown in Read / Earlier section)
    const completedTasks = accessibleTasks.filter((t) => {
      if (!t.done) return false;
      if (Number(t.assigneeId) === staffId) return true;
      return false;
    });

    for (const task of completedTasks.slice(0, 5)) {
      const notifId = `chat-task-${task.id}`;
      readIdsSet.add(notifId);
      items.push({
        id: notifId,
        title: `[Đã xong] ${task.title}`,
        summary: task.remindAt ? formatRemindAtVi(task.remindAt) : 'Nhiệm vụ đã hoàn tất',
        category: 'task_reminder',
        priority: 'low',
        action: {
          type: 'open_chat',
          payload: {
            openTab: 'tasks',
            taskId: task.id,
            conversationId: task.conversationId,
            messageId: task.sourceMessageId || undefined,
          },
        },
        badgeText: 'Đã xong',
        isActionable: false,
        createdAt: (task as { completedAt?: string }).completedAt || task.createdAt || new Date().toISOString(),
      });
    }
  } catch (err) {
    fastify.log.warn({ err }, 'Fetch chat notifications error');
  }
}
