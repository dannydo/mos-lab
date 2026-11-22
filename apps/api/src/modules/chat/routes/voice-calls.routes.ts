import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import type {
  MosChatMessage,
  MosChatStaffMember,
  SafeAny,
  MosChatVoiceCallSession,
  MuteMosChatVoiceCallRequest,
  RespondMosChatVoiceCallRequest,
  SignalMosChatVoiceCallRequest,
  StartMosChatVoiceCallRequest,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { chatRealtimeHub } from '../chat-realtime.hub.js';
import {
  buildVoiceCallLog,
  buildVoiceCallSummaryMessageText,
  chatVoiceCallManager,
  type VoiceCallActorInfo,
} from '../chat-voice-call.service.js';
import { sendWebPushToStaffIds } from '../chat-web-push.service.js';
import { canUserAccessConversation, resolveUserPrefKey } from '../chat-access.service.js';
import {
  formatTimeLabel,
  getRoleDisplayLabel,
  getInitials,
  formatConversationForUser,
} from '../chat-format.service.js';
import { buildDefaultUserSidebarPrefs } from '../chat-state-defaults.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveConversations } from '../chat-state-store.js';

export async function registerChatVoiceCallRoutes(fastify: FastifyInstance) {
  // ================= VOICE CALL (1-1 DIRECT CALL & SPACE VOICE HUDDLE) =================

  const resolveVoiceCallActor = async (
    user: JwtUserPayload | undefined,
    staffDirectory: MosChatStaffMember[]
  ): Promise<VoiceCallActorInfo> => {
    const userIdStr = String(user?.id ?? '0');
    const dirMember = staffDirectory.find((s) => String(s.id) === userIdStr);
    if (dirMember) {
      const roleInfo = getRoleDisplayLabel(dirMember.role);
      return {
        staffId: String(dirMember.id),
        name: dirMember.displayName || dirMember.username,
        role: roleInfo.label,
        avatar: dirMember.avatarUrl || getInitials(dirMember.displayName, dirMember.username),
        roleColor: roleInfo.color,
      };
    }

    const crm = (fastify as SafeAny)?.prisma?.crm;
    const staffRecord = crm?.crmStaff
      ? await crm.crmStaff
          .findUnique({
            where: { id: Number(user?.id) || 0 },
            select: { displayName: true, username: true, role: true, avatarUrl: true },
          })
          .catch(() => null)
      : null;

    const senderName = staffRecord?.displayName || user?.username || 'Nhân sự mOS';
    const roleInfo = getRoleDisplayLabel(staffRecord?.role || user?.role);
    return {
      staffId: userIdStr,
      name: senderName,
      role: roleInfo.label,
      avatar: staffRecord?.avatarUrl || getInitials(senderName, user?.username),
      roleColor: roleInfo.color,
    };
  };

  const appendCallLogMessageToConversation = async (call: MosChatVoiceCallSession): Promise<MosChatMessage | null> => {
    try {
      const { conversations } = await loadChatState(fastify);
      const conv = conversations.find((c) => c.id === call.conversationId);
      if (!conv) return null;

      const now = new Date();
      const callLog = buildVoiceCallLog(call);
      const summaryText = buildVoiceCallSummaryMessageText(call);

      const newMessage: MosChatMessage = {
        id: `msg-call-${crypto.randomUUID().slice(0, 8)}`,
        conversationId: conv.id,
        senderId: call.initiatorId,
        senderName: call.initiatorName,
        senderRole: call.initiatorRole || 'Nhân sự',
        senderAvatar: call.initiatorAvatar || getInitials(call.initiatorName),
        text: summaryText,
        timeLabel: formatTimeLabel(now),
        createdAt: now.toISOString(),
        reactions: {},
        thread: [],
        callLog,
      };

      conv.messages.push(newMessage);
      conv.updatedAt = now.toISOString();
      await saveConversations(fastify, conversations, {
        touchedConversation: conv,
        touchedMessage: newMessage,
      });

      chatRealtimeHub.publish({
        type: 'MESSAGE_CREATED',
        conversationId: conv.id,
        actorStaffId: call.initiatorId,
        payload: {
          conversationId: conv.id,
          message: newMessage,
        },
      });

      return newMessage;
    } catch (err: SafeAny) {
      fastify.log.error('appendCallLogMessageToConversation error:', err);
      return null;
    }
  };

  // GET /api/chat/calls/active
  fastify.get(
    '/chat/calls/active',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const [{ conversations }, staffDirectory] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
        ]);
        const accessibleConvIds = conversations
          .filter((c) => canUserAccessConversation(c, user, staffDirectory))
          .map((c) => c.id);

        const activeCalls = chatVoiceCallManager.getActiveCallsForConversations(accessibleConvIds);
        const pendingSignals = chatVoiceCallManager.drainPendingSignalsForStaff(String(user?.id ?? '0'));
        return {
          success: true,
          activeCalls,
          pendingSignals,
        };
      } catch (err: SafeAny) {
        fastify.log.error('GET /chat/calls/active error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể tải danh sách cuộc gọi đang diễn ra.',
        });
      }
    }
  );

  // POST /api/chat/calls/start
  fastify.post<{ Body: StartMosChatVoiceCallRequest }>(
    '/chat/calls/start',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const body = (request.body || {}) as StartMosChatVoiceCallRequest;
        const conversationId = String(body.conversationId || '').trim();
        if (!conversationId) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Thiếu mã cuộc trò chuyện (conversationId).',
          });
        }

        const [{ conversations, userPrefsByUserKey }, staffDirectory] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
        ]);

        const conv = conversations.find((c) => c.id === conversationId);
        if (!conv) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Không tìm thấy cuộc trò chuyện.',
          });
        }

        if (!canUserAccessConversation(conv, user, staffDirectory)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Bạn không có quyền gọi trong cuộc trò chuyện này.',
          });
        }

        const actor = await resolveVoiceCallActor(user, staffDirectory);
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentUserPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
        const formattedConv = formatConversationForUser(
          conv,
          user,
          staffDirectory,
          currentUserPrefs,
          userPrefsByUserKey
        );

        const targetIds: string[] = [];
        if (conv.type === 'dm') {
          if (conv.participantStaffId != null) {
            targetIds.push(String(conv.participantStaffId));
          }
          for (const mId of conv.memberIds || []) {
            targetIds.push(String(mId));
          }
        } else {
          for (const mId of conv.memberIds || []) {
            targetIds.push(String(mId));
          }
        }

        const started = chatVoiceCallManager.startOrJoinCall({
          conversationId: conv.id,
          conversationName: formattedConv.name || conv.name,
          conversationType: conv.type,
          initiator: actor,
          targetStaffIds: targetIds,
          onRingTimeout: async (timedOutCall) => {
            await appendCallLogMessageToConversation(timedOutCall);
            const recipients = timedOutCall.targetStaffIds.filter(
              (id) => id !== timedOutCall.initiatorId && !timedOutCall.declinedStaffIds.includes(id)
            );
            if (recipients.length > 0) {
              void sendWebPushToStaffIds(fastify, recipients, {
                title: `📵 Cuộc gọi nhỡ từ ${timedOutCall.initiatorName}`,
                body:
                  timedOutCall.conversationType === 'dm'
                    ? 'Chạm để mở mOS Chat và gọi lại'
                    : `Trong nhóm ${timedOutCall.conversationName}`,
                icon: '/apple-touch-icon.png',
                badge: '/icon-192.png',
                tag: `mos-voice-call-${timedOutCall.callId}`,
                renotify: true,
                requireInteraction: false,
                data: {
                  type: 'VOICE_CALL_MISSED',
                  callId: timedOutCall.callId,
                  conversationId: timedOutCall.conversationId,
                  url: `/chat?convId=${encodeURIComponent(timedOutCall.conversationId)}`,
                },
              });
            }
          },
        });

        if (!started.joinedExisting) {
          const recipients = started.call.targetStaffIds.filter((id) => id !== actor.staffId);
          if (recipients.length > 0) {
            void sendWebPushToStaffIds(fastify, recipients, {
              title:
                conv.type === 'dm'
                  ? `📞 Cuộc gọi đến từ ${actor.name}`
                  : `🎙️ ${actor.name} đang gọi nhóm (${started.call.conversationName})`,
              body: 'Chạm để mở mOS Chat và nghe máy ngay',
              icon: '/apple-touch-icon.png',
              badge: '/icon-192.png',
              tag: `mos-voice-call-${started.call.callId}`,
              renotify: true,
              requireInteraction: true,
              vibrate: [300, 150, 300, 150, 300, 150, 400],
              data: {
                type: 'VOICE_CALL_INCOMING',
                callId: started.call.callId,
                conversationId: conv.id,
                url: `/chat?convId=${encodeURIComponent(conv.id)}`,
              },
            });
          }
        }

        return {
          success: true,
          call: started.call,
          joinedExisting: started.joinedExisting,
          livekitToken: started.livekitToken,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/calls/start error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể khởi tạo cuộc gọi thoại.',
        });
      }
    }
  );

  // POST /api/chat/calls/:callId/respond
  fastify.post<{ Params: { callId: string }; Body: RespondMosChatVoiceCallRequest }>(
    '/chat/calls/:callId/respond',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { callId } = request.params;
        const body = (request.body || {}) as RespondMosChatVoiceCallRequest;
        if (body.action !== 'ACCEPT' && body.action !== 'DECLINE') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Hành động phản hồi cuộc gọi không hợp lệ (ACCEPT | DECLINE).',
          });
        }

        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const actor = await resolveVoiceCallActor(user, staffDirectory);

        const result = chatVoiceCallManager.respondToCall({
          callId,
          responder: actor,
          action: body.action,
        });

        if (!result.call) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Cuộc gọi không tồn tại hoặc đã kết thúc.',
          });
        }

        let systemMessage: MosChatMessage | null = null;
        if (result.finalized) {
          systemMessage = await appendCallLogMessageToConversation(result.call);
        }

        return {
          success: true,
          call: result.call,
          livekitToken: result.livekitToken,
          systemMessage,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/calls/:callId/respond error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể phản hồi cuộc gọi thoại.',
        });
      }
    }
  );

  // POST /api/chat/calls/:callId/signal
  fastify.post<{ Params: { callId: string }; Body: SignalMosChatVoiceCallRequest }>(
    '/chat/calls/:callId/signal',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { callId } = request.params;
        const body = (request.body || {}) as SignalMosChatVoiceCallRequest;
        if (!body.targetStaffId || !body.signalType) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Thiếu targetStaffId hoặc signalType.',
          });
        }

        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const actor = await resolveVoiceCallActor(user, staffDirectory);

        const ok = chatVoiceCallManager.forwardWebRtcSignal({
          callId,
          fromStaffId: actor.staffId,
          fromName: actor.name,
          targetStaffId: String(body.targetStaffId),
          signalType: body.signalType,
          sdp: body.sdp,
          candidate: body.candidate,
        });

        if (!ok) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Cuộc gọi không còn hoạt động.',
          });
        }

        return { success: true };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/calls/:callId/signal error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể truyền tín hiệu cuộc gọi.',
        });
      }
    }
  );

  // POST /api/chat/calls/:callId/mute
  fastify.post<{ Params: { callId: string }; Body: MuteMosChatVoiceCallRequest }>(
    '/chat/calls/:callId/mute',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { callId } = request.params;
        const body = (request.body || {}) as MuteMosChatVoiceCallRequest;

        const updatedCall = chatVoiceCallManager.setParticipantMute(
          callId,
          String(user?.id ?? '0'),
          Boolean(body.isMuted)
        );
        if (!updatedCall) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Cuộc gọi không tồn tại hoặc đã kết thúc.',
          });
        }

        return {
          success: true,
          call: updatedCall,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/calls/:callId/mute error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể cập nhật trạng thái micro.',
        });
      }
    }
  );

  // POST /api/chat/calls/:callId/end
  fastify.post<{ Params: { callId: string } }>(
    '/chat/calls/:callId/end',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { callId } = request.params;

        const result = chatVoiceCallManager.endOrLeaveCall({
          callId,
          actorStaffId: String(user?.id ?? '0'),
        });

        if (!result.call) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Cuộc gọi không tồn tại hoặc đã kết thúc.',
          });
        }

        let systemMessage: MosChatMessage | null = null;
        if (result.finalized) {
          systemMessage = await appendCallLogMessageToConversation(result.call);
        }

        return {
          success: true,
          call: result.call,
          systemMessage,
        };
      } catch (err: SafeAny) {
        fastify.log.error('POST /chat/calls/:callId/end error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể kết thúc cuộc gọi.',
        });
      }
    }
  );
}
