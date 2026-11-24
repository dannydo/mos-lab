import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import type { UserRole } from '@mos-lab/shared';
import {
  clearPendingSelfAssessments,
  consumePendingSelfAssessment,
  recordPendingSelfAssessment,
  redactLogForViewer,
} from './omicall-coaching.service.js';
import { buildSatisfactionWhereClauses, doesRowHaveAiMismatch } from './omicall-logs-query.service.js';
import { registerOmicallLogRoutes } from './routes/omicall-logs.routes.js';
import { registerOmicallRatingRoutes } from './routes/omicall-rating.routes.js';

test('redactLogForViewer locks AI fields for non-QA staff until self-rated, never for QA/Admin', () => {
  const sample = {
    id: 1,
    analysisStatus: 'DONE',
    happyCallStatus: 'APPROVED',
    happyCallReason: 'auto_laughter_30s',
    customerSatisfactionScore: 5,
    customerSentiment: 'HAPPY',
    satisfactionAnalysis: 'Rất tốt',
    transcript: '[00:01] KH: Tuyệt vời',
    qaTags: ['CSKH'],
    staffSelfSatisfactionScore: null as number | null,
  };

  const locked = redactLogForViewer(sample, { isQaReviewer: false });
  assert.equal(locked.aiLockedUntilSelfRated, true);
  assert.equal(locked.happyCallStatus, 'LOCKED');
  assert.equal(locked.customerSatisfactionScore, null);
  assert.equal(locked.transcript, null);
  assert.deepEqual(locked.qaTags, []);

  const qaView = redactLogForViewer(sample, { isQaReviewer: true });
  assert.equal(qaView.aiLockedUntilSelfRated, false);
  assert.equal(qaView.happyCallStatus, 'APPROVED');
  assert.equal(qaView.customerSatisfactionScore, 5);

  const unlockedStaff = redactLogForViewer({ ...sample, staffSelfSatisfactionScore: 4 }, { isQaReviewer: false });
  assert.equal(unlockedStaff.aiLockedUntilSelfRated, false);
  assert.equal(unlockedStaff.happyCallStatus, 'APPROVED');
  assert.equal(unlockedStaff.customerSatisfactionScore, 5);
});

test('buildSatisfactionWhereClauses and doesRowHaveAiMismatch handle all rating sources & levels', () => {
  const aiSatisfied = buildSatisfactionWhereClauses({ aiSatisfaction: 'SATISFIED', canViewAiScore: true });
  assert.deepEqual(aiSatisfied, [{ customerSatisfactionScore: { gte: 4 } }]);

  const blockedStaffAi = buildSatisfactionWhereClauses({ aiSatisfaction: 'UNSATISFIED', canViewAiScore: false });
  assert.deepEqual(blockedStaffAi, [
    { staffSelfSatisfactionScore: { not: null } },
    { customerSatisfactionScore: { lte: 2, gte: 1 } },
  ]);

  const adminRated = buildSatisfactionWhereClauses({ ratingSource: 'ADMIN', ratingLevel: '5' });
  assert.deepEqual(adminRated, [{ adminSatisfactionScore: 5 }]);

  const anyUnrated = buildSatisfactionWhereClauses({ ratingSource: 'ANY', ratingLevel: 'UNRATED' });
  assert.deepEqual(anyUnrated, [
    {
      AND: [{ adminSatisfactionScore: null }, { managerSatisfactionScore: null }, { staffSelfSatisfactionScore: null }],
    },
  ]);

  assert.equal(
    doesRowHaveAiMismatch(
      {
        customerSatisfactionScore: 2,
        adminSatisfactionScore: null,
        managerSatisfactionScore: 3,
        staffSelfSatisfactionScore: 5,
      },
      'STAFF'
    ),
    true
  );
  assert.equal(
    doesRowHaveAiMismatch(
      {
        customerSatisfactionScore: 4,
        adminSatisfactionScore: null,
        managerSatisfactionScore: 3,
        staffSelfSatisfactionScore: 5,
      },
      'ANY'
    ),
    false
  );
});

test('recordPendingSelfAssessment & consumePendingSelfAssessment match within TTL and pop once', () => {
  clearPendingSelfAssessments();
  recordPendingSelfAssessment({
    staffId: 7,
    phone: '0989062401',
    callUuid: 'uuid-999',
    score: 5,
    note: 'Khách rất vui',
  });

  const wrongStaff = consumePendingSelfAssessment({ staffId: 8, customerPhone: '0989062401', callUuid: 'uuid-999' });
  assert.equal(wrongStaff, null);

  const matched = consumePendingSelfAssessment({ staffId: 7, customerPhone: '84989062401', callUuid: null });
  assert.ok(matched);
  assert.equal(matched?.score, 5);
  assert.equal(matched?.note, 'Khách rất vui');

  // Consumed once -> second pop returns null
  assert.equal(consumePendingSelfAssessment({ staffId: 7, callUuid: 'uuid-999' }), null);
});

test('self-assessment unlocks once then locks with 409; Admin vs Manager verify scores stay independent', async () => {
  const prevGeminiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const dbRow: Record<string, SafeAny> = {
    id: 754,
    callUuid: 'uuid-754',
    staffId: 7,
    legacyUserId: null,
    storeId: 3,
    direction: 'outbound',
    status: 'ANSWER',
    sourceNumber: '110',
    destinationNumber: '0989062401',
    duration: 120,
    billSec: 120,
    recordingUrl: 'https://cdn.example.com/754.mp3',
    analysisStatus: 'DONE',
    happyCallStatus: 'APPROVED',
    happyCallReason: 'auto_laughter_30s',
    customerSatisfactionScore: 4,
    customerSentiment: 'SATISFIED',
    satisfactionAnalysis: 'Khách hài lòng.',
    transcript: '[00:01] KH: Ok em',
    laughTimestamps: '[]',
    qaLaughVerifications: '[]',
    qaTags: '["CSKH"]',
    qaChecklist: '{}',
    staffSelfSatisfactionScore: null,
    staffSelfNote: null,
    staffSelfRatedAt: null,
    staffAiCoachingFeedback: null,
    staffAiCoachingAt: null,
    managerSatisfactionScore: null,
    managerReviewedBy: null,
    managerReviewedAt: null,
    managerNote: null,
    adminSatisfactionScore: null,
    adminReviewedBy: null,
    adminReviewedAt: null,
    adminNote: null,
  };

  let currentUser: { id: number; username: string; displayName: string; role: UserRole; staffId: number } = {
    id: 7,
    username: 'staff7',
    displayName: 'Staff 7',
    role: 'booker' as UserRole,
    staffId: 7,
  };
  const app = Fastify();
  app.decorate('prisma', {
    crm: {
      crmOmicallConfig: { findFirst: async () => null, findMany: async () => [] },
      crmOmicallLog: {
        findUnique: async ({ where }: SafeAny) => (where.id === 754 ? { ...dbRow } : null),
        update: async ({ data }: SafeAny) => {
          Object.assign(dbRow, data);
          return { ...dbRow };
        },
      },
      crmStaff: {
        findMany: async ({ where }: SafeAny) => {
          const ids: number[] = where?.id?.in || [];
          return ids.map((id) => ({ id, displayName: `Staff #${id}`, avatarUrl: null }));
        },
      },
      crmStore: {
        findMany: async () => [{ id: 3, legacyClientStoreId: 3, name: 'Wings Q1' }],
      },
    },
    legacy: {
      client_store_language: {
        findMany: async () => [{ client_store_id: 3, client_store_name: 'Wings Q1' }],
      },
      user_profile: { findFirst: async () => null },
    },
  } as SafeAny);

  app.addHook('onRequest', async (req) => {
    const rawRole = req.headers['x-test-role'];
    const rawId = req.headers['x-test-user-id'];
    currentUser = {
      id: rawId ? Number(rawId) : 7,
      username: 'tester',
      displayName: 'Tester',
      role: (typeof rawRole === 'string' ? rawRole : 'booker') as UserRole,
      staffId: rawId ? Number(rawId) : 7,
    };
    (req as SafeAny).jwtVerify = async () => currentUser;
    req.user = currentUser;
  });

  registerOmicallLogRoutes(app);
  registerOmicallRatingRoutes(app);

  try {
    // 1. Unauthorized other booker gets 403
    const forbidden = await app.inject({
      method: 'POST',
      url: '/omicall/logs/754/self-assessment',
      headers: { authorization: 'Bearer t', 'x-test-role': 'booker', 'x-test-user-id': '99' },
      payload: { score: 4 },
    });
    assert.equal(forbidden.statusCode, 403);

    // 2. Caller submits self-assessment -> 200 unlocked + deterministic coaching generated
    const first = await app.inject({
      method: 'POST',
      url: '/omicall/logs/754/self-assessment',
      headers: { authorization: 'Bearer t', 'x-test-role': 'booker', 'x-test-user-id': '7' },
      payload: { score: 2, note: 'Khách hơi vội' },
    });
    assert.equal(first.statusCode, 200);
    const firstBody = first.json();
    assert.equal(firstBody.log.aiLockedUntilSelfRated, false);
    assert.equal(firstBody.log.staffSelfSatisfactionScore, 2);
    assert.equal(firstBody.log.customerSatisfactionScore, 4);
    assert.ok(String(firstBody.log.staffAiCoachingFeedback || '').includes('khắt khe hơn thực tế'));

    // 3. Re-submitting self-assessment returns 409 Conflict (anti-gaming lock)
    const second = await app.inject({
      method: 'POST',
      url: '/omicall/logs/754/self-assessment',
      headers: { authorization: 'Bearer t', 'x-test-role': 'booker', 'x-test-user-id': '7' },
      payload: { score: 5 },
    });
    assert.equal(second.statusCode, 409);

    // 4. Manager verify sets managerSatisfactionScore without touching adminSatisfactionScore
    const mgrRes = await app.inject({
      method: 'POST',
      url: '/omicall/logs/754/verify',
      headers: { authorization: 'Bearer t', 'x-test-role': 'manager', 'x-test-user-id': '12' },
      payload: { happyCallStatus: 'APPROVED', managerSatisfactionScore: 4, managerNote: 'Tốt' },
    });
    assert.equal(mgrRes.statusCode, 200);
    assert.equal(dbRow.managerSatisfactionScore, 4);
    assert.equal(dbRow.adminSatisfactionScore, null);

    // 5. Admin verify sets adminSatisfactionScore without overwriting managerSatisfactionScore
    const admRes = await app.inject({
      method: 'POST',
      url: '/omicall/logs/754/verify',
      headers: { authorization: 'Bearer t', 'x-test-role': 'super_admin', 'x-test-user-id': '1' },
      payload: { happyCallStatus: 'APPROVED', adminSatisfactionScore: 5, adminNote: 'Chuẩn' },
    });
    assert.equal(admRes.statusCode, 200);
    assert.equal(dbRow.adminSatisfactionScore, 5);
    assert.equal(dbRow.managerSatisfactionScore, 4);
  } finally {
    await app.close();
    if (prevGeminiKey !== undefined) process.env.GEMINI_API_KEY = prevGeminiKey;
  }
});
