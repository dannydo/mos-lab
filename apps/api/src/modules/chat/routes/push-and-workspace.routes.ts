import type { FastifyInstance } from 'fastify';
import {
  type SafeAny,
  isAiCopilotConversationId,
  type SubscribeMosChatPushRequest,
  type UnsubscribeMosChatPushRequest,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { ChatGoogleWorkspaceService } from '../chat-google-workspace.service.js';
import {
  getOrCreateVapidKeys,
  getStaffPushSubscriptionCount,
  registerStaffPushSubscription,
  sendWebPushToStaffIds,
  unregisterStaffPushSubscription,
} from '../chat-web-push.service.js';
import { canUserAccessConversation } from '../chat-access.service.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState } from '../chat-state-store.js';

export async function registerChatPushAndWorkspaceRoutes(fastify: FastifyInstance) {
  // GET /api/chat/push/config
  fastify.get(
    '/chat/push/config',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const staffId = String(user?.id ?? '0');
        const [vapid, subscribedCount] = await Promise.all([
          getOrCreateVapidKeys(fastify),
          getStaffPushSubscriptionCount(fastify, staffId),
        ]);
        return {
          success: true,
          vapidPublicKey: vapid.publicKey,
          subscribedCount,
        };
      } catch (err: SafeAny) {
        fastify.log.error('GET /chat/push/config error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể tải cấu hình Web Push.',
        });
      }
    }
  );

  // POST /api/chat/push/subscribe
  fastify.post<{ Body: SubscribeMosChatPushRequest }>(
    '/chat/push/subscribe',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const staffId = String(user?.id ?? '0');
        const sub = request.body?.subscription;
        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Thiếu thông tin đăng ký Web Push (endpoint, keys.p256dh, keys.auth).',
          });
        }
        const subscribedCount = await registerStaffPushSubscription(fastify, staffId, sub);
        return {
          success: true,
          subscribedCount,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/push/subscribe error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể đăng ký nhận thông báo cuộc gọi.',
        });
      }
    }
  );

  // POST /api/chat/push/unsubscribe
  fastify.post<{ Body: UnsubscribeMosChatPushRequest }>(
    '/chat/push/unsubscribe',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const staffId = String(user?.id ?? '0');
        const endpoint = String(request.body?.endpoint || '').trim();
        if (!endpoint) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Thiếu endpoint cần hủy đăng ký.',
          });
        }
        const subscribedCount = await unregisterStaffPushSubscription(fastify, staffId, endpoint);
        return {
          success: true,
          subscribedCount,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/push/unsubscribe error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể hủy đăng ký thông báo cuộc gọi.',
        });
      }
    }
  );

  // GET /api/chat/google-workspace/preview (Google Sheets & Google Docs In-Chat Reader)
  fastify.get<{
    Querystring: {
      url?: string;
      gid?: string;
      range?: string;
      conversationId?: string;
      messageId?: string;
      refresh?: string;
    };
  }>(
    '/chat/google-workspace/preview',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const rawUrl = String(request.query?.url || '').trim();
        if (!rawUrl) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Thiếu đường dẫn Google Sheets, Google Docs hoặc Canva cần đọc.',
          });
        }

        const requestedConvId = request.query?.conversationId ? String(request.query.conversationId).trim() : '';
        const requestedMsgId = request.query?.messageId ? String(request.query.messageId).trim() : '';
        const requestedGid = request.query?.gid ? String(request.query.gid).trim() : undefined;
        const requestedRange = request.query?.range ? String(request.query.range).trim() : undefined;
        const refresh = request.query?.refresh === 'true' || request.query?.refresh === '1';

        let senderContext: {
          id?: number | string | null;
          role?: string | null;
          username?: string | null;
          displayName?: string | null;
        } | null = null;

        if (requestedConvId && !isAiCopilotConversationId(requestedConvId)) {
          const [{ conversations }, staffDirectory] = await Promise.all([
            loadChatState(fastify),
            loadStaffDirectoryCached(fastify),
          ]);
          const conv = conversations.find((c) => c.id === requestedConvId);
          if (!conv) {
            return reply.status(404).send({
              error: 'Not Found',
              message: 'Không tìm thấy cuộc trò chuyện tương ứng.',
            });
          }
          if (!canUserAccessConversation(conv, user, staffDirectory)) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: 'Bạn không có quyền truy cập cuộc trò chuyện này.',
            });
          }

          let matchedSender: { senderId?: number | string; senderRole?: string; senderName?: string } | null = null;
          if (requestedMsgId) {
            for (const msg of conv.messages || []) {
              if (msg.id === requestedMsgId) {
                matchedSender = msg;
                break;
              }
              const replyHit = (msg.thread || []).find((th) => th.id === requestedMsgId);
              if (replyHit) {
                matchedSender = replyHit;
                break;
              }
            }
          }
          if (!matchedSender) {
            const urlFileIdMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
            const targetFileId = urlFileIdMatch?.[1] || rawUrl;
            for (let i = (conv.messages || []).length - 1; i >= 0 && !matchedSender; i--) {
              const msg = conv.messages[i];
              if (!msg.isDeleted && msg.text && msg.text.includes(targetFileId)) {
                matchedSender = msg;
                break;
              }
              for (const th of msg.thread || []) {
                if (!th.isDeleted && th.text && th.text.includes(targetFileId)) {
                  matchedSender = th;
                  break;
                }
              }
            }
          }

          if (matchedSender) {
            const senderStaff = staffDirectory.find((s) => String(s.id) === String(matchedSender!.senderId));
            senderContext = {
              id: matchedSender.senderId,
              role: senderStaff?.role || matchedSender.senderRole,
              username: senderStaff?.username,
              displayName: senderStaff?.displayName || matchedSender.senderName,
            };
          }
        }

        const result = await ChatGoogleWorkspaceService.previewLink({
          url: rawUrl,
          gid: requestedGid,
          range: requestedRange,
          refresh,
          viewer: {
            id: user?.id,
            role: user?.role,
            username: user?.username,
            displayName: user?.displayName,
          },
          sender: senderContext,
        });

        return result;
      } catch (err: SafeAny) {
        fastify.log.warn('GET /chat/google-workspace/preview error:', err);
        return reply.status(400).send({
          error: 'Bad Request',
          message: err?.message || 'Không thể đọc dữ liệu Google Sheet, Docs hoặc Canva.',
        });
      }
    }
  );

  // POST /api/chat/push/test
  fastify.post<{ Body?: { title?: string; body?: string; conversationId?: string } }>(
    '/chat/push/test',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const staffId = String(user?.id ?? '0');
        const bodyConvId = request.body?.conversationId ? String(request.body.conversationId) : undefined;
        const targetUrl = bodyConvId ? `/chat?convId=${encodeURIComponent(bodyConvId)}` : '/chat';
        const result = await sendWebPushToStaffIds(fastify, [staffId], {
          title: request.body?.title || '📞 Cuộc gọi thử nghiệm từ mOS Chat',
          body: request.body?.body || 'Thông báo cuộc gọi khi khóa màn hình iPhone đã hoạt động hoàn hảo!',
          icon: '/apple-touch-icon.png',
          badge: '/icon-192.png',
          tag: `mos-voice-test-${Date.now()}`,
          renotify: true,
          requireInteraction: true,
          vibrate: [300, 150, 300, 150, 300, 150, 400],
          data: {
            type: 'VOICE_CALL_INCOMING',
            conversationId: bodyConvId,
            url: targetUrl,
          },
        });
        return {
          success: true,
          sent: result.sent,
          failed: result.failed,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/push/test error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể gửi thông báo thử nghiệm.',
        });
      }
    }
  );
}
