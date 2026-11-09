import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { chatRealtimeHub } from './chat-realtime.hub.js';
import {
  buildVoiceCallLog,
  buildVoiceCallSummaryMessageText,
  chatVoiceCallManager,
  generateLiveKitJwtToken,
} from './chat-voice-call.service.js';

describe('mOS Chat Voice Call Service & WebRTC/LiveKit Signaling', () => {
  beforeEach(() => {
    chatVoiceCallManager.clearForTests();
    chatRealtimeHub.clearForTests();
  });

  afterEach(() => {
    chatVoiceCallManager.clearForTests();
    chatRealtimeHub.clearForTests();
  });

  it('starts a 1-1 direct call in RINGING state, accepts to ACTIVE, exchanges WebRTC SDP/ICE signals, and ends with call log', () => {
    const started = chatVoiceCallManager.startOrJoinCall({
      conversationId: 'dm-1-4',
      conversationName: 'Tâm Nguyễn',
      conversationType: 'dm',
      initiator: {
        staffId: '1',
        name: 'Danny Do',
        role: 'Super Admin',
      },
      targetStaffIds: ['4'],
    });

    assert.equal(started.joinedExisting, false);
    assert.equal(started.call.status, 'RINGING');
    assert.equal(started.call.participants.length, 1);
    assert.deepEqual(started.call.targetStaffIds, ['4']);

    // Accept call from Staff 4
    const accepted = chatVoiceCallManager.respondToCall({
      callId: started.call.callId,
      responder: {
        staffId: '4',
        name: 'Tâm Nguyễn',
        role: 'Admin',
      },
      action: 'ACCEPT',
    });

    assert.ok(accepted.call);
    assert.equal(accepted.finalized, false);
    assert.equal(accepted.call.status, 'ACTIVE');
    assert.ok(accepted.call.connectedAt);
    assert.equal(accepted.call.participants.length, 2);

    // Forward WebRTC SDP Offer from Staff 1 to Staff 4
    const signalSent = chatVoiceCallManager.forwardWebRtcSignal({
      callId: started.call.callId,
      fromStaffId: '1',
      fromName: 'Danny Do',
      targetStaffId: '4',
      signalType: 'offer',
      sdp: { type: 'offer', sdp: 'v=0...' },
    });
    assert.equal(signalSent, true);

    const drainedFor4 = chatVoiceCallManager.drainPendingSignalsForStaff('4');
    assert.equal(drainedFor4.length, 1);
    assert.equal(drainedFor4[0].signalType, 'offer');
    assert.equal(drainedFor4[0].fromStaffId, '1');
    assert.equal(chatVoiceCallManager.drainPendingSignalsForStaff('4').length, 0);

    // Toggle mute
    const muted = chatVoiceCallManager.setParticipantMute(started.call.callId, '4', true);
    assert.ok(muted);
    const p4 = muted.participants.find((p) => p.staffId === '4');
    assert.equal(p4?.isMuted, true);

    // End call
    const ended = chatVoiceCallManager.endOrLeaveCall({
      callId: started.call.callId,
      actorStaffId: '1',
    });
    assert.ok(ended.call);
    assert.equal(ended.finalized, true);
    assert.equal(ended.call.status, 'ENDED');
    assert.ok((ended.call.durationSec ?? 0) >= 1);

    const summaryText = buildVoiceCallSummaryMessageText(ended.call);
    assert.ok(summaryText.includes('Cuộc gọi thoại đã kết thúc'));
    const log = buildVoiceCallLog(ended.call);
    assert.equal(log.status, 'ENDED');
    assert.deepEqual(log.participantNames, ['Danny Do', 'Tâm Nguyễn']);
  });

  it('declines a ringing DM call and marks it DECLINED', () => {
    const started = chatVoiceCallManager.startOrJoinCall({
      conversationId: 'dm-1-6',
      conversationName: 'Nguyễn Quang Khải',
      conversationType: 'dm',
      initiator: {
        staffId: '1',
        name: 'Danny Do',
      },
      targetStaffIds: ['6'],
    });

    const declined = chatVoiceCallManager.respondToCall({
      callId: started.call.callId,
      responder: {
        staffId: '6',
        name: 'Nguyễn Quang Khải',
      },
      action: 'DECLINE',
    });

    assert.ok(declined.call);
    assert.equal(declined.finalized, true);
    assert.equal(declined.call.status, 'DECLINED');
    const summaryText = buildVoiceCallSummaryMessageText(declined.call);
    assert.ok(summaryText.includes('Cuộc gọi thoại bị từ chối'));
  });

  it('auto-expires an unanswered call to MISSED after ringTimeoutMs', async () => {
    let timedOutCallId = '';
    const started = chatVoiceCallManager.startOrJoinCall({
      conversationId: 'dm-timeout-test',
      conversationName: 'Lễ tân Q1',
      conversationType: 'dm',
      initiator: {
        staffId: '1',
        name: 'Danny Do',
      },
      targetStaffIds: ['9'],
      ringTimeoutMs: 40,
      onRingTimeout: (call) => {
        timedOutCallId = call.callId;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 90));
    assert.equal(timedOutCallId, started.call.callId);
    const updated = chatVoiceCallManager.getCall(started.call.callId);
    assert.equal(updated?.status, 'MISSED');
    assert.ok(buildVoiceCallSummaryMessageText(updated!).includes('Cuộc gọi nhỡ'));
  });

  it('generates a valid 3-part LiveKit HS256 JWT token', () => {
    const token = generateLiveKitJwtToken({
      apiKey: 'APIkeyTest123',
      apiSecret: 'SecretTest4567890',
      roomName: 'mos-call-room-1',
      identity: '1',
      name: 'Danny Do',
    });
    const parts = token.split('.');
    assert.equal(parts.length, 3);
    const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    assert.equal(decodedPayload.iss, 'APIkeyTest123');
    assert.equal(decodedPayload.sub, '1');
    assert.equal(decodedPayload.video.room, 'mos-call-room-1');
    assert.equal(decodedPayload.video.roomJoin, true);
  });
});
