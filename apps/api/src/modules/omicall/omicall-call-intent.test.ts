import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  clearOmiCallIntentsForTest,
  recordOmiCallIntent,
  resolveMatchingOmiCallIntent,
} from './omicall-call-intent.service.js';
import { upsertOmicallCdrBatch } from './omicall-cdr-sync.service.js';
import { registerOmicallLogRoutes } from './routes/omicall-logs.routes.js';

test('resolveMatchingOmiCallIntent attributes shared Ext 110 calls to the initiating staff member', () => {
  clearOmiCallIntentsForTest();
  const baseNow = Date.now();

  recordOmiCallIntent({
    staffId: 1,
    phone: '0989062401',
    extension: '110',
    callUuid: 'uuid-danny-1',
    now: baseNow,
  });

  // Exact callUuid match
  assert.equal(
    resolveMatchingOmiCallIntent({
      extension: '110',
      customerPhone: '0989062401',
      callUuid: 'uuid-danny-1',
      now: baseNow + 10_000,
    }),
    1
  );
  // Fallback extension + phone suffix match when callUuid wasn't known before SDK call started
  assert.equal(
    resolveMatchingOmiCallIntent({
      extension: '110',
      customerPhone: '+84989062401',
      callUuid: 'different-uuid',
      now: baseNow + 10_000,
    }),
    1
  );
  // Expired after 15 minutes
  assert.equal(
    resolveMatchingOmiCallIntent({ extension: '110', customerPhone: '0989062401', now: baseNow + 16 * 60 * 1000 }),
    null
  );
  clearOmiCallIntentsForTest();
});

test('upsertOmicallCdrBatch with autoAnalyze preserves recorded call-intent staffId over first Ext 110 row', async () => {
  clearOmiCallIntentsForTest();
  recordOmiCallIntent({
    staffId: 1,
    phone: '0989062401',
    extension: '110',
    callUuid: 'call-intent-live-1',
  });

  const store = new Map<string, SafeAny>();
  const mockFastify = {
    log: { error: () => {}, info: () => {}, warn: () => {}, debug: () => {} },
    prisma: {
      crm: {
        crmOmicallConfig: {
          findMany: async () => [{ staffId: 4 }, { staffId: 12 }, { staffId: 1 }],
        },
        crmCallLog: {
          findFirst: async () => null,
          update: async () => ({}),
        },
        crmOmicallLog: {
          findUnique: async () => null,
          upsert: async ({ where, create }: SafeAny) => {
            const row = { id: 800, ...create };
            store.set(where.callUuid, row);
            return row;
          },
          updateMany: async () => ({ count: 0 }),
        },
      },
      legacy: {
        user_contact: {
          findFirst: async () => ({ user_id: 43554 }),
        },
      },
    },
  } as SafeAny;

  await upsertOmicallCdrBatch(
    mockFastify,
    [
      {
        transaction_id: 'call-intent-live-1',
        direction: 'outbound',
        disposition: 'answered',
        sip_user: '110',
        source_number: '02866810755',
        destination_number: '0989062401',
        duration: 132,
        bill_sec: 133,
      },
    ],
    { autoAnalyze: true }
  );

  assert.equal(store.get('call-intent-live-1')?.staffId, 1);
  clearOmiCallIntentsForTest();
});

test('GET /omicall/logs with legacyUserId blocks non-QA callers with 403 and allows admin', async () => {
  const app = Fastify();
  let currentRole = 'cc';
  app.decorateRequest('jwtVerify', async function jwtVerify(this: SafeAny) {
    this.user = { id: 99, username: 'cc_user', displayName: 'CC', role: currentRole };
  });
  (app as SafeAny).prisma = {
    crm: {
      crmStaff: {
        findUnique: async () => ({ role: currentRole, isActive: true }),
        update: async () => ({}),
        findMany: async () => [{ id: 1, displayName: 'Danny Do' }],
      },
      crmOmicallConfig: {
        findFirst: async () => null,
      },
      crmOmicallLog: {
        findMany: async () => [
          {
            id: 754,
            callUuid: '8a343772-f035-44b2-a99b-5f59d0224c0f',
            direction: 'outbound',
            status: 'ANSWER',
            sourceNumber: '02866810755',
            destinationNumber: '0989062401',
            duration: 132,
            billSec: 133,
            recordingUrl: 'https://cdn.example.com/rec.mp3',
            staffId: 1,
            legacyUserId: 43554,
            analysisStatus: 'DONE',
            happyCallStatus: 'NONE',
            qaTags: '["CSKH"]',
            qaChecklist: '{}',
            laughTimestamps: '[]',
            createdAt: new Date('2026-11-24T14:49:43.000Z'),
          },
        ],
        count: async () => 1,
      },
    },
    legacy: {
      user_contact: {
        findMany: async () => [{ phone_number: '0989062401' }],
      },
      user_profile: {
        findMany: async () => [{ user_id: 43554, full_name: 'Bảo Hân', first_name: null, last_name: null }],
      },
    },
  };
  registerOmicallLogRoutes(app);

  // Blocked for regular CC
  const ccRes = await app.inject({ method: 'GET', url: '/omicall/logs?legacyUserId=43554' });
  assert.equal(ccRes.statusCode, 403);

  // Allowed for super_admin
  currentRole = 'super_admin';
  const adminRes = await app.inject({ method: 'GET', url: '/omicall/logs?legacyUserId=43554' });
  assert.equal(adminRes.statusCode, 200);
  const body = adminRes.json();
  assert.equal(body.total, 1);
  assert.equal(body.logs[0].callType, 'CSKH');
  assert.equal(body.logs[0].staffName, 'Danny Do');

  await app.close();
});
