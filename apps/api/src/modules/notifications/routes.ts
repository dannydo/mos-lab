import type { FastifyInstance } from 'fastify';
import { isCanonicalSuperAdminIdentity, type MarkNotificationReadRequest } from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../middlewares/auth.js';
import { computeNotificationsFeed } from './service/notification-feed.service.js';
import {
  inFlightNotificationPromises,
  invalidateNotificationsCache,
  loadUserReadState,
  saveUserReadState,
  userNotificationsCache,
} from './service/notification-state.js';

export { computeNotificationsFeed, invalidateNotificationsCache };

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/notifications', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const staffId = Number(user.id);
    const isDanny = isCanonicalSuperAdminIdentity(user);
    const now = Date.now();

    // SWR Cache 15s per staffId to completely eliminate redundant DB polling
    const cached = userNotificationsCache.get(staffId);
    if (cached) {
      const age = now - cached.computedAt;
      if (age < 15_000) {
        return reply.send(cached.data);
      }
      if (age < 60_000 && !inFlightNotificationPromises.has(staffId)) {
        const revalidatePromise = computeNotificationsFeed(fastify, user, staffId, isDanny)
          .then((fresh) => {
            userNotificationsCache.set(staffId, { data: fresh, computedAt: Date.now() });
            return fresh;
          })
          .catch((err) => {
            fastify.log.warn({ err }, 'Background revalidation failed for notifications');
            return cached.data;
          })
          .finally(() => {
            inFlightNotificationPromises.delete(staffId);
          });
        inFlightNotificationPromises.set(staffId, revalidatePromise);
        return reply.send(cached.data);
      }
    }

    const inFlight = inFlightNotificationPromises.get(staffId);
    if (inFlight) {
      return reply.send(await inFlight);
    }

    const computePromise = computeNotificationsFeed(fastify, user, staffId, isDanny)
      .then((fresh) => {
        userNotificationsCache.set(staffId, { data: fresh, computedAt: Date.now() });
        return fresh;
      })
      .finally(() => {
        inFlightNotificationPromises.delete(staffId);
      });

    inFlightNotificationPromises.set(staffId, computePromise);
    return reply.send(await computePromise);
  });

  fastify.post('/notifications/read', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const staffId = Number(user.id);
    const body = (request.body || {}) as MarkNotificationReadRequest;

    const readState = await loadUserReadState(fastify, staffId);
    const readIdsSet = new Set(readState.readIds);

    if (body.unread && body.notificationId) {
      readIdsSet.delete(body.notificationId);
      readState.readIds = Array.from(readIdsSet);

      if (body.notificationId.startsWith('inbox-notif-')) {
        const notifIdNum = parseInt(body.notificationId.replace('inbox-notif-', ''), 10);
        if (Number.isFinite(notifIdNum) && notifIdNum > 0) {
          try {
            await fastify.prisma.crm.crmBugReportNotification.updateMany({
              where: { id: notifIdNum, recipientStaffId: staffId },
              data: { readAt: null },
            });
          } catch (err) {
            fastify.log.warn({ err }, 'Mark single bug notification unread error');
          }
        }
      }
      await saveUserReadState(fastify, staffId, readState);
      userNotificationsCache.delete(staffId);
      return reply.send({ success: true, message: 'Đã đánh dấu thông báo là chưa đọc.' });
    }

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
    userNotificationsCache.delete(staffId);

    return reply.send({ success: true, message: 'Đã cập nhật trạng thái thông báo.' });
  });
}
