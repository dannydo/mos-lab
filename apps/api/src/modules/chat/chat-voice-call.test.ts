import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { chatRealtimeHub } from './chat-realtime.hub.js';
import {
  buildVoiceCallLog,
  buildVoiceCallSummaryMessageText,
  chatVoiceCallManager,
  generateLiveKitJwtToken,
} from './chat-voice-call.service.js';
import { createVapidJwtToken, encryptWebPushAes128Gcm, generateVapidKeyPair } from './chat-web-push.service.js';

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

  it('generates valid VAPID ES256 JWT and encrypts/decrypts RFC 8291 aes128gcm Web Push payload for iOS PWA', () => {
    const vapid = generateVapidKeyPair();
    assert.equal(Buffer.from(vapid.publicKey, 'base64url').length, 65);

    const jwt = createVapidJwtToken({
      endpoint: 'https://web.push.apple.com/Q123456789',
      privateJwk: vapid.privateJwk,
    });
    const jwtParts = jwt.split('.');
    assert.equal(jwtParts.length, 3);
    const claims = JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString('utf8'));
    assert.equal(claims.aud, 'https://web.push.apple.com');

    // Simulate iPhone Safari PWA client subscription keys
    const clientEcdh = crypto.createECDH('prime256v1');
    clientEcdh.generateKeys();
    const clientPublic = clientEcdh.getPublicKey();
    const clientAuth = crypto.randomBytes(16);

    const payloadJson = JSON.stringify({
      title: '📞 Cuộc gọi đến từ Danny Do',
      body: 'Chạm để mở mOS Chat và nghe máy ngay',
    });

    const encryptedPacket = encryptWebPushAes128Gcm({
      payloadJson,
      p256dh: clientPublic.toString('base64url'),
      auth: clientAuth.toString('base64url'),
    });

    // Parse RFC 8188 header (86 bytes) and decrypt as the iPhone client would
    const salt = encryptedPacket.subarray(0, 16);
    const rs = encryptedPacket.readUInt32BE(16);
    const idlen = encryptedPacket.readUInt8(20);
    assert.equal(rs, 4096);
    assert.equal(idlen, 65);
    const serverEphemeralPub = encryptedPacket.subarray(21, 21 + idlen);
    const ciphertextWithTag = encryptedPacket.subarray(21 + idlen);

    const sharedSecret = clientEcdh.computeSecret(serverEphemeralPub);
    const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0', 'ascii'), clientPublic, serverEphemeralPub]);
    const ikm = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, clientAuth, keyInfo, 32));
    const cek = Buffer.from(
      crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0', 'ascii'), 16)
    );
    const nonce = Buffer.from(
      crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0', 'ascii'), 12)
    );

    const authTag = ciphertextWithTag.subarray(ciphertextWithTag.length - 16);
    const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - 16);
    const decipher = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
    decipher.setAuthTag(authTag);
    const decryptedRecord = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // Last byte must be RFC 8188 final record delimiter 0x02
    assert.equal(decryptedRecord[decryptedRecord.length - 1], 0x02);
    const decryptedText = decryptedRecord.subarray(0, decryptedRecord.length - 1).toString('utf8');
    assert.equal(decryptedText, payloadJson);
  });
});
