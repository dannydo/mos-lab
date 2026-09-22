import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { aiRoutes } from './routes.js';
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
        const found = mockSessions.find((s) => s.id === args.where.id && s.staffId === args.where.staffId);
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
      role: 'telesales',
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

  // 4. PRIVATE WORKSPACE ISOLATION: Staff 2 cannot view Staff 1's session (must return 404)
  const getResStaff2 = await app.inject({
    method: 'GET',
    url: `/ai/chat/sessions/${session1.id}`,
    headers: { 'x-staff-id': '202' },
  });
  assert.equal(getResStaff2.statusCode, 404);

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
