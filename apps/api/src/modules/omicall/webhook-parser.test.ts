import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  isRealtimeCallEvent,
  normalizeOmiCallStatus,
  parseOmiCallTimestamp,
  parseOmicallWebhookPayload,
} from './webhook-parser.js';
import { registerOmicallWebhookRoutes } from './routes/omicall-webhook.routes.js';

test('parseOmicallWebhookPayload parses real OmiCall CDR inbound & outbound shapes', () => {
  const inboundCdr = parseOmicallWebhookPayload({
    transaction_id: '9ae35b3e-9369-4888-b995-fc62e664531d',
    call_uuid: '9ae35b3e-9369-4888-b995-fc62e664531d',
    state: 'cdr',
    direction: 'inbound',
    disposition: 'answered',
    answer_sec: 16,
    bill_sec: 45,
    duration: 45,
    sip_user: '108',
    source_number: '0901234665',
    destination_number: '02866810755',
    phone_number: '0901234665',
    recording_file_url: 'https://public-v1-stg.omicrm.com/third_party/recording/uc?id=abc&code=9ae35b3e',
    time_start_call: 1795424426,
    time_end_call: 1795424471,
  });

  assert.equal(inboundCdr.callUuid, '9ae35b3e-9369-4888-b995-fc62e664531d');
  assert.equal(inboundCdr.direction, 'inbound');
  assert.equal(inboundCdr.status, 'ANSWER');
  assert.equal(inboundCdr.extensionToMatch, '108');
  assert.equal(inboundCdr.customerPhone, '0901234665');
  assert.equal(
    inboundCdr.recordingUrl,
    'https://public-v1-stg.omicrm.com/third_party/recording/uc?id=abc&code=9ae35b3e'
  );
  assert.equal(inboundCdr.timeStartCall?.getUTCFullYear(), 2026);
  assert.equal(inboundCdr.timeEndCall?.getTime(), 1795424471 * 1000);

  const outboundCdr = parseOmicallWebhookPayload({
    transaction_id: 'out-uuid-1',
    state: 'cdr',
    direction: 'outbound',
    source_number: '02866810755',
    destination_number: '0938633944',
    phone_number: '0938633944',
    sip_user: '110',
    from_number: '110',
    answer_sec: 32,
    bill_sec: 35,
    duration: 40,
    recording_file: 'https://cdr-recording.omicrm.com/call-recording/quangnguyen2/archive/2026/Nov/24/out-uuid-1.mp3',
  });

  assert.equal(outboundCdr.status, 'ANSWER');
  assert.equal(outboundCdr.extensionToMatch, '110');
  assert.equal(outboundCdr.customerPhone, '0938633944');
  assert.match(outboundCdr.recordingUrl || '', /out-uuid-1\.mp3$/);
});

test('normalizeOmiCallStatus and parseOmiCallTimestamp handle missed calls & legacy payloads', () => {
  assert.equal(normalizeOmiCallStatus({ answer_sec: 0, bill_sec: 0, state: 'cdr' }), 'NOANSWER');
  assert.equal(normalizeOmiCallStatus({ disposition: 'busy', answer_sec: 0 }), 'BUSY');
  assert.equal(normalizeOmiCallStatus({ status: 'ANSWER' }), 'ANSWER');

  assert.equal(parseOmiCallTimestamp(1776849067)?.getTime(), 1776849067000);
  assert.equal(parseOmiCallTimestamp(1795424426200)?.getTime(), 1795424426200);
  assert.equal(parseOmiCallTimestamp('2026-11-24T09:00:00.000Z')?.toISOString(), '2026-11-24T09:00:00.000Z');
  assert.equal(parseOmiCallTimestamp(null), null);
});

test('isRealtimeCallEvent detects mid-call webhookEvent payloads and leaves CDR intact', () => {
  assert.equal(
    isRealtimeCallEvent({
      source: 'webhookEvent',
      state: 'ringing',
      call_uuid: 'rt-1',
      extension: '110',
      direction: 'outbound',
    }),
    true
  );
  assert.equal(
    isRealtimeCallEvent({
      state: 'hangup',
      call_uuid: 'rt-2',
      from_number: '110',
      to_number: '0938633944',
    }),
    true
  );
  assert.equal(
    isRealtimeCallEvent({
      state: 'cdr',
      call_uuid: 'cdr-1',
      answer_sec: 12,
      bill_sec: 15,
    }),
    false
  );
});

test('POST /omicall/webhook ignores realtime events and upgrades WAITING_RECORDING on CDR retry', async () => {
  const prevSecret = process.env.OMICALL_WEBHOOK_SECRET;
  const prevGemini = process.env.GEMINI_API_KEY;
  process.env.OMICALL_WEBHOOK_SECRET = 'test_webhook_secret';
  delete process.env.GEMINI_API_KEY; // Prevent immediate background HTTP call in test

  try {
    const logsByUuid = new Map<string, SafeAny>();
    let nextId = 1;

    const app = Fastify();
    (app as SafeAny).prisma = {
      crm: {
        crmOmicallConfig: {
          findFirst: async ({ where }: SafeAny) => (where.extension === '110' ? { staffId: 1 } : null),
        },
        crmCallLog: {
          findFirst: async () => null,
          update: async () => ({}),
        },
        crmOmicallLog: {
          findUnique: async ({ where }: SafeAny) => logsByUuid.get(where.callUuid) || null,
          upsert: async ({ where, create, update }: SafeAny) => {
            const existing = logsByUuid.get(where.callUuid);
            const record = existing ? { ...existing, ...update } : { id: nextId++, ...create };
            logsByUuid.set(where.callUuid, record);
            return record;
          },
          updateMany: async () => ({ count: 0 }),
        },
      },
      legacy: {
        user_contact: {
          findFirst: async () => ({ user_id: 999 }),
        },
      },
    };
    registerOmicallWebhookRoutes(app);

    // 1. Realtime call_event must be ignored without DB upsert
    const rtRes = await app.inject({
      method: 'POST',
      url: '/omicall/webhook',
      headers: { 'x-webhook-secret': 'test_webhook_secret' },
      payload: {
        source: 'webhookEvent',
        state: 'answered',
        call_uuid: 'call-123',
        extension: '110',
        direction: 'outbound',
      },
    });
    assert.equal(rtRes.statusCode, 200);
    assert.deepEqual(rtRes.json(), {
      success: true,
      ignored: true,
      reason: 'realtime_call_event',
      state: 'answered',
    });
    assert.equal(logsByUuid.size, 0);

    // 2. First CDR arrives answered without recording -> WAITING_RECORDING
    const cdr1Res = await app.inject({
      method: 'POST',
      url: '/omicall/webhook',
      headers: { 'x-webhook-secret': 'test_webhook_secret' },
      payload: {
        transaction_id: 'call-123',
        state: 'cdr',
        direction: 'outbound',
        source_number: '02866810755',
        destination_number: '0938633944',
        phone_number: '0938633944',
        sip_user: '110',
        answer_sec: 35,
        bill_sec: 35,
        duration: 40,
        time_start_call: 1795424426,
      },
    });
    assert.equal(cdr1Res.statusCode, 200);
    assert.equal(cdr1Res.json().analysisStatus, 'WAITING_RECORDING');
    assert.equal(logsByUuid.get('call-123').status, 'ANSWER');
    assert.equal(logsByUuid.get('call-123').staffId, 1);
    assert.equal(logsByUuid.get('call-123').legacyUserId, 999);
    assert.equal(logsByUuid.get('call-123').timeStartCall.getUTCFullYear(), 2026);

    // 3. Second CDR retry arrives with recording_file_url -> upgrades to PENDING
    const cdr2Res = await app.inject({
      method: 'POST',
      url: '/omicall/webhook',
      headers: { 'x-webhook-secret': 'test_webhook_secret' },
      payload: {
        transaction_id: 'call-123',
        state: 'cdr',
        direction: 'outbound',
        source_number: '02866810755',
        destination_number: '0938633944',
        sip_user: '110',
        answer_sec: 35,
        bill_sec: 35,
        duration: 40,
        recording_file_url: 'https://public-v1-stg.omicrm.com/third_party/recording/uc?id=xyz&code=call-123',
      },
    });
    assert.equal(cdr2Res.statusCode, 200);
    assert.equal(cdr2Res.json().analysisStatus, 'PENDING');
    assert.equal(
      logsByUuid.get('call-123').recordingUrl,
      'https://public-v1-stg.omicrm.com/third_party/recording/uc?id=xyz&code=call-123'
    );

    await app.close();
  } finally {
    if (prevSecret === undefined) delete process.env.OMICALL_WEBHOOK_SECRET;
    else process.env.OMICALL_WEBHOOK_SECRET = prevSecret;
    if (prevGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevGemini;
  }
});
