import { createHmac, randomUUID } from 'node:crypto';
import type {
  MosChatVoiceCallLog,
  MosChatVoiceCallParticipant,
  MosChatVoiceCallSession,
  MosChatVoiceCallSignalEnvelope,
  MosChatVoiceCallSignalType,
} from '@mos-lab/shared';
import { chatRealtimeHub } from './chat-realtime.hub.js';

export interface VoiceCallActorInfo {
  staffId: string;
  name: string;
  role?: string;
  avatar?: string | null;
  roleColor?: string | null;
}

const DEFAULT_RING_TIMEOUT_MS = 35_000;

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function generateLiveKitJwtToken(params: {
  apiKey: string;
  apiSecret: string;
  roomName: string;
  identity: string;
  name: string;
  ttlSeconds?: number;
}): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + (params.ttlSeconds ?? 3600);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: params.apiKey,
    sub: params.identity,
    name: params.name,
    nbf: nowSec,
    exp: expSec,
    jti: `${params.identity}-${randomUUID().slice(0, 8)}`,
    video: {
      roomJoin: true,
      room: params.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', params.apiSecret).update(signingInput).digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

export function formatVoiceCallDurationText(durationSec: number): string {
  const safeSecs = Math.max(0, Math.floor(durationSec));
  const mins = Math.floor(safeSecs / 60);
  const secs = safeSecs % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function buildVoiceCallSummaryMessageText(call: MosChatVoiceCallSession): string {
  if (call.status === 'DECLINED') {
    return `📵 **Cuộc gọi thoại bị từ chối** · Người gọi: ${call.initiatorName}`;
  }
  if (call.status === 'MISSED') {
    return `📵 **Cuộc gọi nhỡ** từ **${call.initiatorName}**`;
  }
  const durationLabel = formatVoiceCallDurationText(call.durationSec || 0);
  const participantNames = call.participants.map((p) => p.name).filter(Boolean);
  const namesSummary = participantNames.length > 0 ? ` (${participantNames.join(', ')})` : '';
  return `📞 **Cuộc gọi thoại đã kết thúc** · Thời lượng: \`${durationLabel}\`${namesSummary}`;
}

export function buildVoiceCallLog(call: MosChatVoiceCallSession): MosChatVoiceCallLog {
  return {
    callId: call.callId,
    conversationId: call.conversationId,
    conversationType: call.conversationType,
    status: call.status,
    initiatorId: call.initiatorId,
    initiatorName: call.initiatorName,
    durationSec: call.durationSec ?? 0,
    participantNames: call.participants.map((p) => p.name),
    startedAt: call.startedAt,
    endedAt: call.endedAt || new Date().toISOString(),
  };
}

class ChatVoiceCallManager {
  private callsById = new Map<string, MosChatVoiceCallSession>();
  private activeCallIdByConversation = new Map<string, string>();
  private ringTimers = new Map<string, NodeJS.Timeout>();
  private pendingSignalsByStaffId = new Map<string, MosChatVoiceCallSignalEnvelope[]>();

  public getLiveKitConfig(): { apiKey: string; apiSecret: string; wsUrl: string } | null {
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
    const wsUrl = process.env.LIVEKIT_WS_URL?.trim();
    if (apiKey && apiSecret && wsUrl) {
      return { apiKey, apiSecret, wsUrl };
    }
    return null;
  }

  public issueLiveKitTokenIfConfigured(
    roomName: string,
    actor: VoiceCallActorInfo
  ): { livekitUrl: string | null; livekitToken: string | null } {
    const cfg = this.getLiveKitConfig();
    if (!cfg) {
      return { livekitUrl: null, livekitToken: null };
    }
    const token = generateLiveKitJwtToken({
      apiKey: cfg.apiKey,
      apiSecret: cfg.apiSecret,
      roomName,
      identity: String(actor.staffId),
      name: actor.name,
    });
    return { livekitUrl: cfg.wsUrl, livekitToken: token };
  }

  public startOrJoinCall(input: {
    conversationId: string;
    conversationName: string;
    conversationType: 'dm' | 'space';
    initiator: VoiceCallActorInfo;
    targetStaffIds: string[];
    ringTimeoutMs?: number;
    onRingTimeout?: (timedOutCall: MosChatVoiceCallSession) => Promise<void> | void;
  }): {
    call: MosChatVoiceCallSession;
    joinedExisting: boolean;
    livekitToken: string | null;
  } {
    const existingCallId = this.activeCallIdByConversation.get(input.conversationId);
    if (existingCallId) {
      const existingCall = this.callsById.get(existingCallId);
      if (existingCall && (existingCall.status === 'RINGING' || existingCall.status === 'ACTIVE')) {
        const nowIso = new Date().toISOString();
        const existingParticipant = existingCall.participants.find(
          (p) => String(p.staffId) === String(input.initiator.staffId)
        );
        if (!existingParticipant) {
          existingCall.participants.push({
            staffId: String(input.initiator.staffId),
            name: input.initiator.name,
            role: input.initiator.role,
            avatar: input.initiator.avatar ?? null,
            roleColor: input.initiator.roleColor ?? null,
            isMuted: false,
            joinedAt: nowIso,
          });
        }
        if (existingCall.status === 'RINGING' && existingCall.participants.length > 1) {
          existingCall.status = 'ACTIVE';
          existingCall.connectedAt = existingCall.connectedAt || nowIso;
          this.clearRingTimer(existingCall.callId);
        }
        const lk = this.issueLiveKitTokenIfConfigured(
          existingCall.livekitRoomName || `mos-call-${existingCall.callId}`,
          input.initiator
        );
        existingCall.livekitUrl = lk.livekitUrl;
        this.broadcastCallState(existingCall, input.initiator.staffId, 'JOINED');
        return {
          call: this.cloneCall(existingCall),
          joinedExisting: true,
          livekitToken: lk.livekitToken,
        };
      }
    }

    const nowIso = new Date().toISOString();
    const callId = `call-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const roomName = `mos-call-${callId}`;
    const lk = this.issueLiveKitTokenIfConfigured(roomName, input.initiator);

    const initialParticipant: MosChatVoiceCallParticipant = {
      staffId: String(input.initiator.staffId),
      name: input.initiator.name,
      role: input.initiator.role,
      avatar: input.initiator.avatar ?? null,
      roleColor: input.initiator.roleColor ?? null,
      isMuted: false,
      joinedAt: nowIso,
    };

    const normalizedTargets = Array.from(
      new Set(input.targetStaffIds.map((id) => String(id)).filter((id) => id && id !== String(input.initiator.staffId)))
    );

    const call: MosChatVoiceCallSession = {
      callId,
      conversationId: input.conversationId,
      conversationName: input.conversationName,
      conversationType: input.conversationType,
      status: 'RINGING',
      initiatorId: String(input.initiator.staffId),
      initiatorName: input.initiator.name,
      initiatorRole: input.initiator.role,
      initiatorAvatar: input.initiator.avatar ?? null,
      targetStaffIds: normalizedTargets,
      participants: [initialParticipant],
      declinedStaffIds: [],
      startedAt: nowIso,
      connectedAt: null,
      endedAt: null,
      durationSec: 0,
      livekitUrl: lk.livekitUrl,
      livekitRoomName: roomName,
    };

    this.callsById.set(callId, call);
    this.activeCallIdByConversation.set(input.conversationId, callId);

    const timeoutMs = input.ringTimeoutMs ?? DEFAULT_RING_TIMEOUT_MS;
    const timer = setTimeout(() => {
      this.ringTimers.delete(callId);
      const current = this.callsById.get(callId);
      if (!current || current.status !== 'RINGING') return;
      current.status = 'MISSED';
      current.endedAt = new Date().toISOString();
      current.durationSec = 0;
      this.activeCallIdByConversation.delete(current.conversationId);
      this.broadcastCallState(current, current.initiatorId, 'MISSED');
      if (input.onRingTimeout) {
        Promise.resolve(input.onRingTimeout(this.cloneCall(current))).catch(() => {
          // ignore callback errors
        });
      }
    }, timeoutMs);
    timer.unref?.();
    this.ringTimers.set(callId, timer);

    this.broadcastCallState(call, input.initiator.staffId, 'STARTED');

    return {
      call: this.cloneCall(call),
      joinedExisting: false,
      livekitToken: lk.livekitToken,
    };
  }

  public respondToCall(input: { callId: string; responder: VoiceCallActorInfo; action: 'ACCEPT' | 'DECLINE' }): {
    call: MosChatVoiceCallSession | null;
    finalized: boolean;
    livekitToken: string | null;
  } {
    const call = this.callsById.get(input.callId);
    if (!call) {
      return { call: null, finalized: false, livekitToken: null };
    }

    if (call.status !== 'RINGING' && call.status !== 'ACTIVE') {
      return { call: this.cloneCall(call), finalized: false, livekitToken: null };
    }

    const responderId = String(input.responder.staffId);
    const nowIso = new Date().toISOString();

    if (input.action === 'ACCEPT') {
      call.declinedStaffIds = call.declinedStaffIds.filter((id) => id !== responderId);
      const alreadyIn = call.participants.find((p) => String(p.staffId) === responderId);
      if (!alreadyIn) {
        call.participants.push({
          staffId: responderId,
          name: input.responder.name,
          role: input.responder.role,
          avatar: input.responder.avatar ?? null,
          roleColor: input.responder.roleColor ?? null,
          isMuted: false,
          joinedAt: nowIso,
        });
      }
      if (call.status === 'RINGING') {
        call.status = 'ACTIVE';
        call.connectedAt = call.connectedAt || nowIso;
        this.clearRingTimer(call.callId);
      }

      const lk = this.issueLiveKitTokenIfConfigured(call.livekitRoomName || `mos-call-${call.callId}`, input.responder);
      call.livekitUrl = lk.livekitUrl;
      this.broadcastCallState(call, responderId, 'ACCEPTED');

      return {
        call: this.cloneCall(call),
        finalized: false,
        livekitToken: lk.livekitToken,
      };
    }

    // action === 'DECLINE'
    if (!call.declinedStaffIds.includes(responderId)) {
      call.declinedStaffIds.push(responderId);
    }
    call.participants = call.participants.filter((p) => String(p.staffId) !== responderId);

    const allTargetsDeclined =
      call.targetStaffIds.length > 0 && call.targetStaffIds.every((tId) => call.declinedStaffIds.includes(String(tId)));

    if (
      call.status === 'RINGING' &&
      (call.conversationType === 'dm' || allTargetsDeclined) &&
      call.participants.length <= 1
    ) {
      call.status = 'DECLINED';
      call.endedAt = nowIso;
      call.durationSec = 0;
      this.clearRingTimer(call.callId);
      this.activeCallIdByConversation.delete(call.conversationId);
      this.broadcastCallState(call, responderId, 'DECLINED');
      return {
        call: this.cloneCall(call),
        finalized: true,
        livekitToken: null,
      };
    }

    this.broadcastCallState(call, responderId, 'PARTICIPANT_DECLINED');
    return {
      call: this.cloneCall(call),
      finalized: false,
      livekitToken: null,
    };
  }

  public setParticipantMute(
    callId: string,
    staffId: string | number,
    isMuted: boolean
  ): MosChatVoiceCallSession | null {
    const call = this.callsById.get(callId);
    if (!call || (call.status !== 'RINGING' && call.status !== 'ACTIVE')) {
      return null;
    }
    const target = call.participants.find((p) => String(p.staffId) === String(staffId));
    if (!target) {
      return this.cloneCall(call);
    }
    target.isMuted = Boolean(isMuted);
    this.broadcastCallState(call, staffId, 'MUTE_CHANGED');
    return this.cloneCall(call);
  }

  public forwardWebRtcSignal(input: {
    callId: string;
    fromStaffId: string;
    fromName: string;
    targetStaffId: string;
    signalType: MosChatVoiceCallSignalType;
    sdp?: unknown;
    candidate?: unknown;
  }): boolean {
    const call = this.callsById.get(input.callId);
    if (!call || (call.status !== 'RINGING' && call.status !== 'ACTIVE')) {
      return false;
    }

    const envelope: MosChatVoiceCallSignalEnvelope = {
      id: `sig-${Date.now()}-${randomUUID().slice(0, 6)}`,
      callId: call.callId,
      conversationId: call.conversationId,
      fromStaffId: String(input.fromStaffId),
      fromName: input.fromName,
      targetStaffId: String(input.targetStaffId),
      signalType: input.signalType,
      sdp: input.sdp ?? null,
      candidate: input.candidate ?? null,
      timestamp: new Date().toISOString(),
    };

    const targetKey = String(input.targetStaffId);
    const existingQueue = this.pendingSignalsByStaffId.get(targetKey) || [];
    existingQueue.push(envelope);
    if (existingQueue.length > 200) {
      existingQueue.splice(0, existingQueue.length - 200);
    }
    this.pendingSignalsByStaffId.set(targetKey, existingQueue);

    chatRealtimeHub.publish({
      type: 'CALL_SIGNAL',
      conversationId: call.conversationId,
      actorStaffId: input.fromStaffId,
      targetStaffIds: [input.targetStaffId],
      payload: envelope as unknown as Record<string, unknown>,
    });
    return true;
  }

  public drainPendingSignalsForStaff(staffId: string | number): MosChatVoiceCallSignalEnvelope[] {
    const key = String(staffId);
    const queue = this.pendingSignalsByStaffId.get(key) || [];
    if (queue.length === 0) return [];
    this.pendingSignalsByStaffId.delete(key);
    return queue;
  }

  public endOrLeaveCall(input: { callId: string; actorStaffId: string | number; forceEndAll?: boolean }): {
    call: MosChatVoiceCallSession | null;
    finalized: boolean;
  } {
    const call = this.callsById.get(input.callId);
    if (!call) {
      return { call: null, finalized: false };
    }

    if (call.status !== 'RINGING' && call.status !== 'ACTIVE') {
      return { call: this.cloneCall(call), finalized: false };
    }

    const actorId = String(input.actorStaffId);
    const now = new Date();
    const nowIso = now.toISOString();

    // In a space huddle with multiple active participants, if one person leaves (and not forceEndAll),
    // keep the call alive for the remaining participants if >= 2 remain or if 1 remains in an active space room
    if (
      call.conversationType === 'space' &&
      !input.forceEndAll &&
      call.status === 'ACTIVE' &&
      call.participants.length > 2
    ) {
      call.participants = call.participants.filter((p) => String(p.staffId) !== actorId);
      this.broadcastCallState(call, actorId, 'LEFT');
      return {
        call: this.cloneCall(call),
        finalized: false,
      };
    }

    this.clearRingTimer(call.callId);
    this.activeCallIdByConversation.delete(call.conversationId);

    if (call.connectedAt) {
      const connectedMs = new Date(call.connectedAt).getTime();
      call.durationSec = Math.max(1, Math.round((now.getTime() - connectedMs) / 1000));
      call.status = 'ENDED';
    } else {
      call.durationSec = 0;
      call.status = 'MISSED';
    }
    call.endedAt = nowIso;

    this.broadcastCallState(call, actorId, 'ENDED');
    return {
      call: this.cloneCall(call),
      finalized: true,
    };
  }

  public getCall(callId: string): MosChatVoiceCallSession | null {
    const call = this.callsById.get(callId);
    return call ? this.cloneCall(call) : null;
  }

  public getActiveCallsForConversations(conversationIds?: Iterable<string>): MosChatVoiceCallSession[] {
    const filterSet = conversationIds ? new Set(conversationIds) : null;
    const result: MosChatVoiceCallSession[] = [];
    for (const callId of this.activeCallIdByConversation.values()) {
      const call = this.callsById.get(callId);
      if (!call) continue;
      if (call.status !== 'RINGING' && call.status !== 'ACTIVE') continue;
      if (filterSet && !filterSet.has(call.conversationId)) continue;
      result.push(this.cloneCall(call));
    }
    return result;
  }

  public clearForTests(): void {
    for (const timer of this.ringTimers.values()) {
      clearTimeout(timer);
    }
    this.ringTimers.clear();
    this.callsById.clear();
    this.activeCallIdByConversation.clear();
    this.pendingSignalsByStaffId.clear();
  }

  private clearRingTimer(callId: string): void {
    const timer = this.ringTimers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.ringTimers.delete(callId);
    }
  }

  private broadcastCallState(call: MosChatVoiceCallSession, actorStaffId: string | number, reason: string): void {
    chatRealtimeHub.publish({
      type: 'CALL_STATE_CHANGED',
      conversationId: call.conversationId,
      actorStaffId: String(actorStaffId),
      payload: {
        reason,
        call: this.cloneCall(call),
      },
    });
  }

  private cloneCall(call: MosChatVoiceCallSession): MosChatVoiceCallSession {
    return {
      ...call,
      targetStaffIds: [...call.targetStaffIds],
      declinedStaffIds: [...call.declinedStaffIds],
      participants: call.participants.map((p) => ({ ...p })),
    };
  }
}

export const chatVoiceCallManager = new ChatVoiceCallManager();
