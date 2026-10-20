import { FastifyInstance } from 'fastify';
import { requireAuth, JwtUserPayload } from '../../middlewares/auth.js';
import {
  MosNotificationFeedResponse,
  MosNotificationItem,
  MarkNotificationReadRequest,
  MosChatConversation,
  MosChatUserSidebarPrefs,
  MosChatTaskItem,
} from '@mos-lab/shared';
import { isDannyOrSuperAdminUser } from '../chat/routes.js';

const CHAT_CONVERSATIONS_CONFIG_KEY = 'mos_chat:conversations_v1';
const CHAT_USER_PREFS_CONFIG_KEY = 'mos_chat:user_prefs_v1';
const CHAT_TASKS_CONFIG_KEY = 'mos_chat:tasks_v1';

interface UserNotificationReadState {
  readIds: string[];
  lastMarkedAllAt?: string;
  updatedAt: string;
}

function getNotificationReadConfigKey(staffId: number): string {
  return `mos_notifications:read:${staffId}`;
}

async function loadUserReadState(fastify: FastifyInstance, staffId: number): Promise<UserNotificationReadState> {
  try {
    const row = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: getNotificationReadConfigKey(staffId) },
    });
    if (!row || !row.value) {
      return { readIds: [], updatedAt: new Date().toISOString() };
    }
    const parsed = JSON.parse(row.value);
    return {
      readIds: Array.isArray(parsed.readIds) ? parsed.readIds : [],
      lastMarkedAllAt: typeof parsed.lastMarkedAllAt === 'string' ? parsed.lastMarkedAllAt : undefined,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return { readIds: [], updatedAt: new Date().toISOString() };
  }
}

async function saveUserReadState(
  fastify: FastifyInstance,
  staffId: number,
  state: UserNotificationReadState
): Promise<void> {
  const serialized = JSON.stringify({
    ...state,
    updatedAt: new Date().toISOString(),
  });
  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: getNotificationReadConfigKey(staffId) },
    create: {
      key: getNotificationReadConfigKey(staffId),
      value: serialized,
    },
    update: {
      value: serialized,
    },
  });
}

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/notifications', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const staffId = Number(user.id);
    const isDanny = isDannyOrSuperAdminUser(user);

    const userStaff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { id: true, displayName: true, username: true, email: true, role: true, avatarUrl: true },
    });

    const userDisplayName = userStaff?.displayName || user.username || '';
    const readState = await loadUserReadState(fastify, staffId);
    const readIdsSet = new Set(readState.readIds);
    const lastMarkedAllIso = readState.lastMarkedAllAt || '';

    const items: MosNotificationItem[] = [];

    // 1. mOS Inbox / Bug Reports
    try {
      if (isDanny) {
        const awaitingApprovals = await fastify.prisma.crm.crmBugReport.findMany({
          where: {
            status: {
              in: [
                'AWAITING_DANNY_COMMIT_REVIEW',
                'AWAITING_DANNY_DEPLOY_APPROVAL',
                'AWAITING_DANNY_IMPLEMENTATION_APPROVAL',
              ],
            },
          },
          select: {
            id: true,
            title: true,
            status: true,
            reporter: {
              select: { displayName: true },
            },
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        });

        for (const report of awaitingApprovals) {
          const notifId = `inbox-${report.id}-${report.status.toLowerCase()}`;
          let title = `[Duyệt Ticket] #${report.id}`;
          let badgeText = 'Chờ duyệt';
          if (report.status === 'AWAITING_DANNY_COMMIT_REVIEW') {
            title = `[Duyệt Commit] Ticket #${report.id}`;
            badgeText = 'Duyệt commit';
          } else if (report.status === 'AWAITING_DANNY_DEPLOY_APPROVAL') {
            title = `[Duyệt Deploy] Ticket #${report.id}`;
            badgeText = 'Duyệt deploy';
          } else if (report.status === 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL') {
            title = `[Duyệt Kế Hoạch] Ticket #${report.id}`;
            badgeText = 'Duyệt kế hoạch';
          }

          items.push({
            id: notifId,
            title,
            summary: report.title,
            category: 'inbox_approval',
            priority: 'urgent',
            action: {
              type: 'navigate_bug_report',
              payload: { reportId: report.id, status: report.status },
            },
            badgeText,
            isActionable: true,
            actor: {
              name: report.reporter?.displayName || 'mOS Inbox',
              role: 'Reporter',
            },
            createdAt: report.updatedAt.toISOString(),
          });
        }
      }

      // Reporter acceptance review (for whoever reported a ticket that is now fixed)
      const awaitingReporter = await fastify.prisma.crm.crmBugReport.findMany({
        where: {
          reporterStaffId: staffId,
          status: 'AWAITING_REPORTER_ACCEPTANCE',
        },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });

      for (const report of awaitingReporter) {
        const notifId = `inbox-accept-${report.id}`;
        items.push({
          id: notifId,
          title: `[Nghiệm thu] Ticket #${report.id}`,
          summary: `Bản sửa lỗi đã lên production. Vui lòng kiểm tra và nghiệm thu: ${report.title}`,
          category: 'inbox_approval',
          priority: 'high',
          action: {
            type: 'navigate_bug_report',
            payload: { reportId: report.id, status: report.status },
          },
          badgeText: 'Nghiệm thu',
          isActionable: true,
          createdAt: report.updatedAt.toISOString(),
        });
      }

      // Bug report personal notifications
      const bugNotifs = await fastify.prisma.crm.crmBugReportNotification.findMany({
        where: {
          recipientStaffId: staffId,
          readAt: null,
        },
        include: {
          report: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      for (const bn of bugNotifs) {
        const notifId = `inbox-notif-${bn.id}`;
        items.push({
          id: notifId,
          title: bn.title || `[mOS Inbox] Cập nhật ticket #${bn.reportId}`,
          summary: bn.message || bn.report?.title || '',
          category: 'inbox_approval',
          priority: 'normal',
          action: {
            type: 'navigate_bug_report',
            payload: { reportId: bn.reportId, actionUrl: bn.actionUrl },
          },
          badgeText: 'Inbox',
          createdAt: bn.createdAt.toISOString(),
        });
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Fetch inbox notifications error');
    }

    // 2. mOS Chat Mentions & Unread DMs
    try {
      const [convConfig, prefsConfig] = await Promise.all([
        fastify.prisma.crm.crmConfig.findUnique({ where: { key: CHAT_CONVERSATIONS_CONFIG_KEY } }),
        fastify.prisma.crm.crmConfig.findUnique({ where: { key: CHAT_USER_PREFS_CONFIG_KEY } }),
      ]);

      const convs: MosChatConversation[] = convConfig?.value ? JSON.parse(convConfig.value) : [];
      const allPrefs: Record<string, MosChatUserSidebarPrefs> = prefsConfig?.value ? JSON.parse(prefsConfig.value) : {};
      const userPrefs = allPrefs[`staff_${staffId}`] || allPrefs[String(staffId)] || {};
      const readMessageCountByConv = userPrefs.readMessageCountByConv || {};

      // Build name tokens for matching mentions: e.g. "Danny Do", "Danny", "danhdo", "danh do"
      const nameKeywords = [
        userDisplayName.trim().toLowerCase(),
        String(user.username || '')
          .trim()
          .toLowerCase(),
      ].filter(Boolean);

      for (const conv of convs) {
        const msgs = conv.messages || [];
        const readCount = readMessageCountByConv[conv.id] || 0;
        if (msgs.length <= readCount) continue;

        const unreadMsgs = msgs.slice(readCount);
        let hasMentionInConv = false;

        for (const msg of unreadMsgs) {
          if (Number(msg.senderId) === staffId) continue;
          const text = String(msg.text || '').toLowerCase();
          const isAtAll = text.includes('@all') || text.includes('@channel');
          const isPersonalMention = nameKeywords.some((kw) => text.includes(`@${kw}`));

          if (isAtAll || isPersonalMention) {
            hasMentionInConv = true;
            const notifId = `chat-mention-${conv.id}-${msg.id}`;
            items.push({
              id: notifId,
              title: `[Nhắc tên @] ${msg.senderName || 'Thành viên'} trong ${conv.name}`,
              summary: msg.text || '',
              category: 'chat_mention',
              priority: isPersonalMention ? 'urgent' : 'high',
              action: {
                type: 'open_chat',
                payload: { conversationId: conv.id, messageId: msg.id },
              },
              badgeText: '@Mention',
              isActionable: true,
              actor: {
                name: msg.senderName,
                avatarUrl: msg.senderAvatar || undefined,
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
            items.push({
              id: notifId,
              title: `[Tin nhắn riêng] từ ${conv.name}`,
              summary: lastMsg.text || '',
              category: 'chat_mention',
              priority: 'normal',
              action: {
                type: 'open_chat',
                payload: { conversationId: conv.id, messageId: lastMsg.id },
              },
              badgeText: `${unreadMsgs.length} tin mới`,
              isActionable: true,
              actor: {
                name: conv.name,
                avatarUrl: conv.avatar || undefined,
              },
              createdAt: lastMsg.createdAt || new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Fetch chat notifications error');
    }

    // 3. mOS Chat Tasks & Reminders
    try {
      const taskConfig = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: CHAT_TASKS_CONFIG_KEY },
      });
      if (taskConfig?.value) {
        const tasks: MosChatTaskItem[] = JSON.parse(taskConfig.value);
        const myTasks = tasks.filter((t) => {
          if (t.done || t.archived) return false;
          if (Number(t.assigneeId) === staffId) return true;
          if (isDanny && !t.assigneeId) return true;
          return false;
        });

        for (const task of myTasks.slice(0, 5)) {
          const notifId = `chat-task-${task.id}`;
          items.push({
            id: notifId,
            title: `[Nhắc việc] ${task.title}`,
            summary: task.remindAt ? `Hạn nhắc: ${task.remindAt}` : 'Nhiệm vụ cần xử lý',
            category: 'task_reminder',
            priority: 'normal',
            action: {
              type: 'open_chat',
              payload: { openTab: 'tasks', taskId: task.id },
            },
            badgeText: 'Nhắc việc',
            isActionable: true,
            createdAt: task.createdAt || new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Fetch task notifications error');
    }

    // Populate readAt based on readState
    for (const item of items) {
      if (readIdsSet.has(item.id)) {
        item.readAt = readState.updatedAt;
      } else if (lastMarkedAllIso && item.createdAt <= lastMarkedAllIso) {
        item.readAt = lastMarkedAllIso;
      } else {
        item.readAt = null;
      }
    }

    // Sort items: urgent first, then by createdAt desc
    items.sort((a, b) => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const pDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const unreadCount = items.filter((i) => !i.readAt).length;
    const urgentCount = items.filter((i) => !i.readAt && (i.priority === 'urgent' || i.priority === 'high')).length;

    const response: MosNotificationFeedResponse = {
      items,
      unreadCount,
      urgentCount,
      updatedAt: new Date().toISOString(),
    };

    return reply.send(response);
  });

  fastify.post('/notifications/read', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const staffId = Number(user.id);
    const body = (request.body || {}) as MarkNotificationReadRequest;

    const readState = await loadUserReadState(fastify, staffId);
    const readIdsSet = new Set(readState.readIds);

    if (body.all) {
      readState.lastMarkedAllAt = new Date().toISOString();
      // Also mark all crmBugReportNotification for this staff as read
      try {
        await fastify.prisma.crm.crmBugReportNotification.updateMany({
          where: {
            recipientStaffId: staffId,
            readAt: null,
          },
          data: {
            readAt: new Date(),
          },
        });
      } catch (err) {
        fastify.log.warn({ err }, 'Mark all crmBugReportNotification read error');
      }
    } else if (body.notificationId) {
      readIdsSet.add(body.notificationId);
      readState.readIds = Array.from(readIdsSet);

      if (body.notificationId.startsWith('inbox-notif-')) {
        const notifIdNum = parseInt(body.notificationId.replace('inbox-notif-', ''), 10);
        if (Number.isFinite(notifIdNum) && notifIdNum > 0) {
          try {
            await fastify.prisma.crm.crmBugReportNotification.updateMany({
              where: { id: notifIdNum, recipientStaffId: staffId },
              data: { readAt: new Date() },
            });
          } catch (err) {
            fastify.log.warn({ err }, 'Mark single bug notification read error');
          }
        }
      }
    }

    await saveUserReadState(fastify, staffId, readState);

    return reply.send({ success: true, message: 'Đã cập nhật trạng thái thông báo.' });
  });
}
