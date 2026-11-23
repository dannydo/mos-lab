import type { FastifyInstance } from 'fastify';
import type { MosNotificationItem } from '@mos-lab/shared';

export async function collectInboxNotifications(
  fastify: FastifyInstance,
  staffId: number,
  isDanny: boolean,
  items: MosNotificationItem[],
  readIdsSet: Set<string>
): Promise<void> {
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
            name: report.reporter?.displayName || 'mOS Mission',
            role: 'Reporter',
          },
          createdAt: report.updatedAt.toISOString(),
        });
      }

      // Past completed tickets for Danny (shown in Read / Earlier section)
      const recentCompletedTickets = await fastify.prisma.crm.crmBugReport.findMany({
        where: {
          status: {
            in: ['FIXED', 'AWAITING_REPORTER_ACCEPTANCE'],
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
        take: 5,
      });

      for (const report of recentCompletedTickets) {
        const notifId = `inbox-completed-${report.id}`;
        readIdsSet.add(notifId);
        items.push({
          id: notifId,
          title: `[Đã hoàn tất] Ticket #${report.id}`,
          summary: report.title,
          category: 'inbox_approval',
          priority: 'low',
          action: {
            type: 'navigate_bug_report',
            payload: { reportId: report.id, status: report.status },
          },
          badgeText: report.status === 'FIXED' ? 'Đã đóng' : 'Chờ nghiệm thu',
          isActionable: false,
          actor: {
            name: report.reporter?.displayName || 'mOS Mission',
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

    // Bug report personal notifications (both unread and recently read)
    const bugNotifs = await fastify.prisma.crm.crmBugReportNotification.findMany({
      where: {
        recipientStaffId: staffId,
      },
      include: {
        report: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    for (const bn of bugNotifs) {
      const notifId = `inbox-notif-${bn.id}`;
      if (bn.readAt) {
        readIdsSet.add(notifId);
      }
      items.push({
        id: notifId,
        title: bn.title || `[mOS Mission] Cập nhật ticket #${bn.reportId}`,
        summary: bn.message || bn.report?.title || '',
        category: 'inbox_approval',
        priority: bn.readAt ? 'low' : 'normal',
        action: {
          type: 'navigate_bug_report',
          payload: { reportId: bn.reportId, actionUrl: bn.actionUrl },
        },
        badgeText: 'Mission',
        createdAt: bn.createdAt.toISOString(),
      });
    }
  } catch (err) {
    fastify.log.warn({ err }, 'Fetch inbox notifications error');
  }
}
