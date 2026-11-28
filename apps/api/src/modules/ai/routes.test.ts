process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { aiRoutes } from './routes.js';
import type { UserRole } from '@mos-lab/shared';
import { extractThinkingAndAction, generateAssistantFallback } from './ai.service.js';

test('AI Voice Chat route returns 400 when message is missing or empty', async () => {
  const app = Fastify();
  await app.register(aiRoutes);

  const res1 = await app.inject({
    method: 'POST',
    url: '/ai/voice-chat',
    payload: {},
  });
  assert.equal(res1.statusCode, 400);

  const res2 = await app.inject({
    method: 'POST',
    url: '/ai/voice-chat',
    payload: { message: '   ' },
  });
  assert.equal(res2.statusCode, 400);
});

test('AI Voice Chat route returns smart domain response when message is provided', async () => {
  const app = Fastify();
  await app.register(aiRoutes);

  const res = await app.inject({
    method: 'POST',
    url: '/ai/voice-chat',
    payload: {
      message: 'Xin chào mOS',
      context: { pathname: '/dashboard/qa-shop', userName: 'Danny' },
    },
  });

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.reply);
  assert.ok(typeof data.reply === 'string');
  assert.ok(data.reply.length > 0);
});

test('extractThinkingAndAction correctly separates thinking and action tags', () => {
  const sample = `<thinking>
Phân tích yêu cầu lọc khách NYC 60
</thinking>
Tôi đề xuất lọc tệp khách này.
<action type="APPLY_FILTER" label="Lọc NYC 60">{"activeTab":"NOT_COMBO_LIVE","daysSinceLastVisitMin":31,"daysSinceLastVisitMax":60}</action>`;

  const parsed = extractThinkingAndAction(sample);
  assert.equal(parsed.thinking, 'Phân tích yêu cầu lọc khách NYC 60');
  assert.equal(parsed.content, 'Tôi đề xuất lọc tệp khách này.');
  assert.ok(parsed.suggestedAction);
  assert.equal(parsed.suggestedAction?.type, 'APPLY_FILTER');
  assert.equal(parsed.suggestedAction?.label, 'Lọc NYC 60');
  assert.deepEqual(parsed.suggestedAction?.payload, {
    activeTab: 'NOT_COMBO_LIVE',
    daysSinceLastVisitMin: 31,
    daysSinceLastVisitMax: 60,
  });
});

test('extractThinkingAndAction correctly extracts multiple action tags and completely strips them from content (MOS-BUG-115)', () => {
  const sampleWithMultipleActions = `Chào anh **Quang Khải**, em gợi ý các bộ lọc:

<action type="APPLY_FILTER" label="🎯 Lọc khách COMBO_LIVE (14-21 ngày)">{"activeTab":"COMBO_LIVE","daysSinceLastVisitMin":14,"daysSinceLastVisitMax":21}</action>

<action type="APPLY_FILTER" label="💎 Lọc khách lẻ tiềm năng đổi Combo">{"activeTab":"NOT_COMBO_LIVE","daysSinceLastVisitMax":21,"totalSpentMin":500000}</action>

<action type="APPLY_FILTER" label="🔄 Lọc khách COMBO_DEAD cần Win-Back">{"activeTab":"COMBO_DEAD","daysSinceLastVisitMin":30,"daysSinceLastVisitMax":60}</action>

Anh muốn bắt đầu phân tích tệp khách nào cứ nhắn em nhé!`;

  const parsed = extractThinkingAndAction(sampleWithMultipleActions);

  // 1. Content must be 100% clean of all <action> tags and json payloads
  assert.ok(!parsed.content.includes('<action'));
  assert.ok(!parsed.content.includes('</action>'));
  assert.ok(!parsed.content.includes('totalSpentMin'));
  assert.ok(parsed.content.includes('Chào anh **Quang Khải**'));
  assert.ok(parsed.content.includes('Anh muốn bắt đầu phân tích tệp khách nào cứ nhắn em nhé!'));

  // 2. All 3 actions must be properly parsed
  assert.ok(parsed.suggestedActions);
  assert.equal(parsed.suggestedActions.length, 3);
  assert.equal(parsed.suggestedActions[0].label, '🎯 Lọc khách COMBO_LIVE (14-21 ngày)');
  assert.equal(parsed.suggestedActions[1].label, '💎 Lọc khách lẻ tiềm năng đổi Combo');
  assert.equal(parsed.suggestedActions[2].label, '🔄 Lọc khách COMBO_DEAD cần Win-Back');

  // 3. suggestedAction points to the first action and contains .actions list for backward compat
  assert.ok(parsed.suggestedAction);
  assert.equal(parsed.suggestedAction.label, '🎯 Lọc khách COMBO_LIVE (14-21 ngày)');
  assert.equal(parsed.suggestedAction.actions?.length, 3);

  // 4. Defensive test: stray unclosed <action> tags are also cleanly removed
  const straySample = `Văn bản thông thường <action type="APPLY_FILTER" label="Dở dang"`;
  const parsedStray = extractThinkingAndAction(straySample);
  assert.ok(!parsedStray.content.includes('<action'));
});

test('generateAssistantFallback provides domain thinking and filter payload for customer queries', () => {
  // 1. Bucket query
  const res1 = generateAssistantFallback('Giải thích các nhóm khách bucket trong mOS');
  assert.ok(res1.thinking && res1.thinking.length > 0);
  assert.ok(res1.content.includes('COMBO_LIVE'));
  assert.ok(res1.content.includes('NOT_COMBO_LIVE'));
  assert.ok(res1.suggestedAction);
  assert.equal(res1.suggestedAction.payload.activeTab, 'NOT_COMBO_LIVE');

  // 2. Filter query with NYC 60 and spending
  const res2 = generateAssistantFallback('Lọc giúp tôi khách nyc 60 có chi tiêu trên 2 triệu');
  assert.ok(res2.thinking && res2.thinking.length > 0);
  assert.ok(res2.suggestedAction);
  assert.equal(res2.suggestedAction.payload.daysSinceLastVisitMin, 31);
  assert.equal(res2.suggestedAction.payload.daysSinceLastVisitMax, 60);
  assert.equal(res2.suggestedAction.payload.totalSpentMin, 2_000_000);

  // 3. My customers query
  const res3 = generateAssistantFallback('Tệp khách hàng của tôi');
  assert.ok(res3.suggestedAction);
  assert.equal(res3.suggestedAction.payload.assignedStaffId, 'me');

  // 4. Wings Culture & Kinh Thánh mOS query (MOS-002)
  const res4 = generateAssistantFallback('4 key văn hóa của Wings là gì?');
  assert.ok(res4.thinking && res4.thinking.includes('MOS-002'));
  assert.ok(res4.content.includes('Vui Vẻ'));
  assert.ok(res4.content.includes('Ân Cần'));
  assert.ok(res4.content.includes('Chân Thành'));
  assert.ok(res4.content.includes('Khoa Học'));
  assert.ok(res4.content.includes('Kinh Thánh mOS'));
});

test('AI Assistant Chat routes enforce Private Workspace isolation between staff members', async () => {
  const app = Fastify();

  // In-memory mock store for sessions & messages
  const mockSessions: SafeAny[] = [];
  const mockMessages: SafeAny[] = [];

  const mockCrm = {
    crmStaff: {
      update: async () => ({}),
    },
    crmAiChatSession: {
      findMany: async (args: SafeAny) => {
        return mockSessions
          .filter((s) => s.staffId === args.where.staffId && s.scope === (args.where.scope || 'customers'))
          .map((s) => ({
            ...s,
            messages: mockMessages.filter((m) => m.sessionId === s.id).slice(-1),
            _count: {
              messages: mockMessages.filter((m) => m.sessionId === s.id).length,
            },
          }));
      },
      findFirst: async (args: SafeAny) => {
        const found = mockSessions.find(
          (s) => s.id === args.where.id && (args.where.staffId === undefined || s.staffId === args.where.staffId)
        );
        if (!found) return null;
        return {
          ...found,
          messages: mockMessages.filter((m) => m.sessionId === found.id),
        };
      },
      create: async (args: SafeAny) => {
        const item = {
          id: `session-${Date.now()}-${Math.random()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSessions.push(item);
        return item;
      },
      update: async (args: SafeAny) => {
        const s = mockSessions.find((item) => item.id === args.where.id);
        if (s) Object.assign(s, args.data);
        return s;
      },
      deleteMany: async (args: SafeAny) => {
        const before = mockSessions.length;
        const remaining = mockSessions.filter((s) => !(s.id === args.where.id && s.staffId === args.where.staffId));
        mockSessions.length = 0;
        mockSessions.push(...remaining);
        return { count: before - remaining.length };
      },
    },
    crmAiChatMessage: {
      findMany: async (args: SafeAny) => {
        return mockMessages.filter((m) => m.sessionId === args.where.sessionId);
      },
      create: async (args: SafeAny) => {
        const item = {
          id: `msg-${Date.now()}-${Math.random()}`,
          ...args.data,
          createdAt: new Date(),
        };
        mockMessages.push(item);
        return item;
      },
    },
  };

  app.decorate('prisma', { crm: mockCrm } as SafeAny);

  // Dynamic user auth mock via custom header x-staff-id
  app.decorateRequest('jwtVerify', async function () {
    const staffId = Number(this.headers['x-staff-id'] || 1);
    this.user = {
      id: staffId,
      username: `user_${staffId}`,
      displayName: `User ${staffId}`,
      role: String(this.headers['x-role'] || 'admin') as UserRole,
    };
  });

  await app.register(aiRoutes);

  // 1. Staff 1 creates a private chat session
  const createRes1 = await app.inject({
    method: 'POST',
    url: '/ai/chat/sessions',
    headers: { 'x-staff-id': '101' },
    payload: { title: 'Phiên phân tích của Staff 101' },
  });
  assert.equal(createRes1.statusCode, 201);
  const session1 = JSON.parse(createRes1.body).session;
  assert.equal(session1.staffId, 101);

  // 2. Staff 1 sends a message in the session
  const msgRes = await app.inject({
    method: 'POST',
    url: '/ai/chat/message',
    headers: { 'x-staff-id': '101' },
    payload: {
      sessionId: session1.id,
      message: 'Lọc khách NYC 60 có chi tiêu trên 1 triệu',
      context: { page: 'customers' },
    },
  });
  assert.equal(msgRes.statusCode, 200);
  const msgData = JSON.parse(msgRes.body);
  assert.ok(msgData.message.content);
  assert.ok(msgData.message.thinking);
  assert.ok(msgData.message.suggestedAction);
  assert.equal(msgData.message.suggestedAction.payload.daysSinceLastVisitMin, 31);

  // 3. Staff 1 can retrieve their session details
  const getResStaff1 = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}`,
    headers: { 'x-staff-id': '101' },
  });
  assert.equal(getResStaff1.statusCode, 200);
  const sessionDetails = JSON.parse(getResStaff1.body);
  assert.equal(sessionDetails.session.id, session1.id);
  assert.equal(sessionDetails.messages.length, 2); // 1 user + 1 assistant

  // 4. PRIVATE BY DEFAULT: nobody but the owner can open the permalink. A non-admin only learns it is forbidden,
  //    an Admin is additionally told that a logged security audit is available. Unknown ids are a plain 404.
  const getResNonAdmin = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}`,
    headers: { 'x-staff-id': '303', 'x-role': 'telesales' },
  });
  assert.equal(getResNonAdmin.statusCode, 403);
  assert.equal(JSON.parse(getResNonAdmin.body).auditAvailable, false);
  assert.equal(JSON.parse(getResNonAdmin.body).session, undefined);

  const getResAdminNoAudit = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}`,
    headers: { 'x-staff-id': '202', 'x-role': 'admin' },
  });
  assert.equal(getResAdminNoAudit.statusCode, 403);
  assert.equal(JSON.parse(getResAdminNoAudit.body).auditAvailable, true);

  const getResUnknown = await app.inject({
    method: 'GET',
    url: '/ai/chat/sessions/does-not-exist',
    headers: { 'x-staff-id': '202', 'x-role': 'admin' },
  });
  assert.equal(getResUnknown.statusCode, 404);

  // 4b. Super Admin has no shortcut while the session is not linked to a mOS Mission
  const getResSuperUnlinked = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}`,
    headers: { 'x-staff-id': '1', 'x-role': 'super_admin' },
  });
  assert.equal(getResSuperUnlinked.statusCode, 403);

  // 4c. Security audit: Admin must give a written reason; the view is read-only and logged for the owner
  const getResAuditShort = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}?purpose=security_audit&reason=abc`,
    headers: { 'x-staff-id': '202', 'x-role': 'admin' },
  });
  assert.equal(getResAuditShort.statusCode, 403);

  const getResAudit = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}?purpose=security_audit&reason=${encodeURIComponent('Rà soát nhân viên nghi dùng MAI sai mục đích')}`,
    headers: { 'x-staff-id': '202', 'x-role': 'admin' },
  });
  assert.equal(getResAudit.statusCode, 200);
  const auditBody = JSON.parse(getResAudit.body);
  assert.equal(auditBody.access.mode, 'audit');
  assert.equal(auditBody.access.readOnly, true);
  assert.equal(auditBody.session.metadata, null, "someone else's session metadata is never returned");
  assert.equal(auditBody.access.accessLog, undefined, 'only the owner sees the access log');

  const ownerAfterAudit = JSON.parse(
    (
      await app.inject({
        method: 'GET',
        url: `/ai/chat/sessions/${session1.id}`,
        headers: { 'x-staff-id': '101' },
      })
    ).body
  );
  assert.equal(ownerAfterAudit.access.mode, 'owner');
  assert.equal(ownerAfterAudit.access.accessLog.length, 1);
  assert.equal(ownerAfterAudit.access.accessLog[0].mode, 'audit');
  assert.equal(ownerAfterAudit.access.accessLog[0].viewerStaffId, 202);
  assert.match(ownerAfterAudit.access.accessLog[0].reason, /Rà soát/);

  // 4d. Mission-linked session: Super Admin can open it (logged); a regular Admin still cannot
  const mockSession = mockSessions.find((x) => x.id === session1.id);
  mockSession.metadataJson = JSON.stringify({
    ...JSON.parse(mockSession.metadataJson || '{}'),
    missionReportIds: [255],
  });
  const getResSuperLinked = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}`,
    headers: { 'x-staff-id': '1', 'x-role': 'super_admin' },
  });
  assert.equal(getResSuperLinked.statusCode, 200);
  assert.equal(JSON.parse(getResSuperLinked.body).access.mode, 'mission');
  const getResAdminLinked = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}`,
    headers: { 'x-staff-id': '202', 'x-role': 'admin' },
  });
  assert.equal(getResAdminLinked.statusCode, 403);

  // 4e. Owner shares the link: any signed-in staff may view (read-only); only the owner can toggle sharing
  const shareByOther = await app.inject({
    method: 'PATCH',
    url: `/ai/chat/sessions/${session1.id}/sharing`,
    headers: { 'x-staff-id': '202', 'x-role': 'admin' },
    payload: { enabled: true },
  });
  assert.equal(shareByOther.statusCode, 404);
  const shareBad = await app.inject({
    method: 'PATCH',
    url: `/ai/chat/sessions/${session1.id}/sharing`,
    headers: { 'x-staff-id': '101' },
    payload: {},
  });
  assert.equal(shareBad.statusCode, 400);
  const shareOn = await app.inject({
    method: 'PATCH',
    url: `/ai/chat/sessions/${session1.id}/sharing`,
    headers: { 'x-staff-id': '101' },
    payload: { enabled: true },
  });
  assert.equal(shareOn.statusCode, 200);
  assert.equal(JSON.parse(shareOn.body).sharingEnabled, true);

  const getResShared = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}`,
    headers: { 'x-staff-id': '303', 'x-role': 'telesales' },
  });
  assert.equal(getResShared.statusCode, 200);
  assert.equal(JSON.parse(getResShared.body).access.mode, 'shared');
  assert.equal(JSON.parse(getResShared.body).access.readOnly, true);

  await app.inject({
    method: 'PATCH',
    url: `/ai/chat/sessions/${session1.id}/sharing`,
    headers: { 'x-staff-id': '101' },
    payload: { enabled: false },
  });
  const getResRevoked = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}`,
    headers: { 'x-staff-id': '303', 'x-role': 'telesales' },
  });
  assert.equal(getResRevoked.statusCode, 403);

  // 5. Staff 2 lists sessions -> empty for Staff 2
  const listResStaff2 = await app.inject({
    method: 'GET',
    url: '/ai/chat/sessions',
    headers: { 'x-staff-id': '202' },
  });
  assert.equal(listResStaff2.statusCode, 200);
  assert.equal(JSON.parse(listResStaff2.body).sessions.length, 0);

  // 6. Staff 1 deletes their session
  const delRes = await app.inject({
    method: 'DELETE',
    url: `/ai/chat/sessions/${session1.id}`,
    headers: { 'x-staff-id': '101' },
  });
  assert.equal(delRes.statusCode, 200);
  assert.equal(JSON.parse(delRes.body).success, true);
});

test('AI Chat rejects non-admin users with 403 Forbidden', async () => {
  const app = Fastify();
  app.decorateRequest('jwtVerify', async function () {
    this.user = {
      id: 999,
      username: 'normal_staff',
      displayName: 'Normal Staff',
      role: 'telesales',
    };
  });
  await app.register(aiRoutes);

  const res = await app.inject({
    method: 'POST',
    url: '/ai/chat/message',
    payload: {
      message: 'Xin chào @MAI',
    },
  });

  assert.equal(res.statusCode, 403);
  const data = JSON.parse(res.body);
  assert.equal(data.error, 'Forbidden');
  assert.match(data.message, /Chỉ Admin mới được phép trò chuyện với mOS AI/);
});

test('GET /ai/ag-models is strictly Super Admin only and returns the Antigravity model catalog', async () => {
  const buildApp = async (user: { id: number; username: string; displayName: string; role: UserRole }) => {
    const app = Fastify();
    app.decorateRequest('jwtVerify', async function () {
      this.user = user;
    });
    await app.register(aiRoutes);
    return app;
  };

  // Regular admin (non-Danny) must get 403
  const adminApp = await buildApp({
    id: 202,
    username: 'branch_admin',
    displayName: 'Branch Admin',
    role: 'admin',
  });
  const adminRes = await adminApp.inject({ method: 'GET', url: '/ai/ag-models' });
  assert.equal(adminRes.statusCode, 403);

  // Telesales must get 403
  const salesApp = await buildApp({
    id: 303,
    username: 'telesales_1',
    displayName: 'Telesales',
    role: 'telesales',
  });
  const salesRes = await salesApp.inject({ method: 'GET', url: '/ai/ag-models' });
  assert.equal(salesRes.statusCode, 403);

  // Super Admin Danny gets 200 with full AG catalog
  const superApp = await buildApp({
    id: 1,
    username: 'danhdo@gmail.com',
    displayName: 'Danny Do',
    role: 'super_admin',
  });
  const superRes = await superApp.inject({ method: 'GET', url: '/ai/ag-models' });
  assert.equal(superRes.statusCode, 200);
  const body = JSON.parse(superRes.body);
  assert.ok(Array.isArray(body.models));
  const ids = new Set(body.models.map((m: { id: string }) => m.id));
  for (const expectedId of [
    'gemini-4-neon-high',
    'gemini-4-carbon-medium',
    'gemini-4-argon-medium',
    'gemini-4-hydrogen-high',
    'gemini-pro-orchestrator-neon',
    'gemini-3.8-flash-high',
    'claude-opus-5-5-medium',
    'claude-sonnet-5-5-high',
    'gpt-oss-120b-medium',
  ]) {
    assert.ok(ids.has(expectedId), `expected model ${expectedId} in /ai/ag-models`);
  }
});

test('POST /ai/chat/message rejects debugMode, /debug prefix, and custom modelId for regular admin, and rejects invalid modelId for super_admin', async () => {
  const buildApp = async (user: { id: number; username: string; displayName: string; role: UserRole }) => {
    const app = Fastify();
    app.decorateRequest('jwtVerify', async function () {
      this.user = user;
    });
    await app.register(aiRoutes);
    return app;
  };

  const adminApp = await buildApp({
    id: 202,
    username: 'branch_admin',
    displayName: 'Branch Admin',
    role: 'admin',
  });

  const debugRes = await adminApp.inject({
    method: 'POST',
    url: '/ai/chat/message',
    payload: { message: 'Kiểm tra code giúp tôi', debugMode: true },
  });
  assert.equal(debugRes.statusCode, 403);

  const slashDebugRes = await adminApp.inject({
    method: 'POST',
    url: '/ai/chat/message',
    payload: { message: '/debug kiểm tra bug này' },
  });
  assert.equal(slashDebugRes.statusCode, 403);

  const modelRes = await adminApp.inject({
    method: 'POST',
    url: '/ai/chat/message',
    payload: { message: 'Chào MAI', modelId: 'claude-opus-5-5-medium' },
  });
  assert.equal(modelRes.statusCode, 403);

  const superApp = await buildApp({
    id: 1,
    username: 'danhdo@gmail.com',
    displayName: 'Danny Do',
    role: 'super_admin',
  });
  const invalidModelRes = await superApp.inject({
    method: 'POST',
    url: '/ai/chat/message',
    payload: { message: 'Chào MAI', modelId: 'rm -rf /' },
  });
  assert.equal(invalidModelRes.statusCode, 400);
});
