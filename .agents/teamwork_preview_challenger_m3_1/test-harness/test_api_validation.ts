import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { smsRoutes } from '../../../apps/api/src/modules/sms/routes.js';

/**
 * Creates an in-memory Fastify server with mocked Prisma DB for API validation testing.
 */
export async function createTestFastifyApp() {
  const server = Fastify({ logger: false });

  await server.register(jwt, {
    secret: 'test_secret_key_mos_lab',
  });

  // Mock database state
  const mockDb = {
    crmConfig: new Map<string, string>(),
    userSms: [] as any[],
    crmCallLogs: [] as any[],
    crmDailyPlans: new Map<number, any>(),
    userContacts: [
      { user_id: 101, phone_number: '0901234567', is_disabled: false },
      { user_id: 102, phone_number: '', is_disabled: false },
    ],
    crmStaff: [{ id: 1, displayName: 'Admin Staff' }],
  };

  // Attach mock prisma plugin
  server.decorate('prisma', {
    crm: {
      crmConfig: {
        findUnique: async ({ where }: any) => {
          const val = mockDb.crmConfig.get(where.key);
          return val ? { key: where.key, value: val } : null;
        },
        upsert: async ({ where, update, create }: any) => {
          const val = update.value || create.value;
          mockDb.crmConfig.set(where.key, val);
          return { key: where.key, value: val };
        },
      },
      crmStaff: {
        findMany: async ({ where }: any) => {
          const ids = where.id?.in || [];
          return mockDb.crmStaff.filter((s) => ids.includes(s.id));
        },
        update: async ({ where, data }: any) => {
          const staff = mockDb.crmStaff.find((s) => s.id === where.id);
          if (staff) Object.assign(staff, data);
          return staff;
        },
      },
      crmCallLog: {
        create: async ({ data }: any) => {
          const record = { id: mockDb.crmCallLogs.length + 1, ...data };
          mockDb.crmCallLogs.push(record);
          return record;
        },
      },
      crmDailyPlan: {
        update: async ({ where, data }: any) => {
          const plan = mockDb.crmDailyPlans.get(where.id) || { id: where.id };
          const updated = { ...plan, ...data };
          mockDb.crmDailyPlans.set(where.id, updated);
          return updated;
        },
      },
    },
    legacy: {
      user_contact: {
        findMany: async ({ where }: any) => {
          return mockDb.userContacts.filter((c) => c.user_id === where.user_id && c.is_disabled === where.is_disabled);
        },
      },
      user_sms: {
        findMany: async ({ where }: any) => {
          const phones = where.to_phone_number?.in || [];
          return mockDb.userSms
            .filter((s) => phones.includes(s.to_phone_number))
            .sort((a, b) => b.date_created.getTime() - a.date_created.getTime());
        },
        create: async ({ data }: any) => {
          const record = { id: mockDb.userSms.length + 1, ...data };
          mockDb.userSms.push(record);
          return record;
        },
      },
    },
  });

  // Register SMS routes with /api prefix
  await server.register(smsRoutes, { prefix: '/api' });

  return { server, mockDb };
}

// Generate valid JWT tokens for testing
export function generateToken(server: any, payload: { id: number; role: string; username: string }) {
  return server.jwt.sign(payload);
}

export async function runApiValidationTests() {
  console.log('=====================================================');
  console.log('RUNNING EMPIRICAL TEST SUITE 3: FASTIFY API VALIDATION');
  console.log('=====================================================\n');

  const { server, mockDb } = await createTestFastifyApp();
  await server.ready();

  const adminToken = generateToken(server, { id: 1, role: 'admin', username: 'admin' });
  const staffToken = generateToken(server, { id: 2, role: 'telesales', username: 'staff2' });

  const testResults: any[] = [];

  // Helper runner
  async function testEndpoint(
    name: string,
    req: { method: 'GET' | 'POST' | 'DELETE'; url: string; token?: string; payload?: any },
    expectedStatus: number,
    description: string
  ) {
    const headers: Record<string, string> = {};
    if (req.token) {
      headers.authorization = `Bearer ${req.token}`;
    }

    const response = await server.inject({
      method: req.method,
      url: req.url,
      headers,
      payload: req.payload,
    });

    const statusMatched = response.statusCode === expectedStatus;
    const logTag = statusMatched ? '[PASS]' : '[FAIL BUG / UNEXPECTED]';

    console.log(`${logTag} ${name}`);
    console.log(`       Method & URL   : ${req.method} ${req.url}`);
    console.log(`       Auth Header    : ${req.token ? 'Bearer Token' : 'None'}`);
    console.log(`       Payload        : ${JSON.stringify(req.payload)}`);
    console.log(`       Expected Status: ${expectedStatus}`);
    console.log(`       Actual Status  : ${response.statusCode}`);
    console.log(`       Response Body  : ${response.body.slice(0, 300)}`);
    console.log(`       Note           : ${description}\n`);

    testResults.push({
      name,
      method: req.method,
      url: req.url,
      expectedStatus,
      actualStatus: response.statusCode,
      body: response.json(),
      statusMatched,
      description,
    });
  }

  // --- GET /api/sms/templates ---
  await testEndpoint(
    'Test 3.1: GET /api/sms/templates without Auth token',
    { method: 'GET', url: '/api/sms/templates' },
    401,
    'Should reject unauthorized requests with 401'
  );

  await testEndpoint(
    'Test 3.2: GET /api/sms/templates with valid staff token',
    { method: 'GET', url: '/api/sms/templates', token: staffToken },
    200,
    'Should return default SMS templates'
  );

  // --- POST /api/sms/templates ---
  await testEndpoint(
    'Test 3.3: POST /api/sms/templates as Non-Admin (Telesales)',
    {
      method: 'POST',
      url: '/api/sms/templates',
      token: staffToken,
      payload: { title: 'Telesales Template', content: 'Test content' },
    },
    403,
    'Non-admin users should be forbidden from creating templates (403)'
  );

  await testEndpoint(
    'Test 3.4: POST /api/sms/templates missing title (Schema validation)',
    {
      method: 'POST',
      url: '/api/sms/templates',
      token: adminToken,
      payload: { content: 'Content without title' },
    },
    400,
    'Fastify schema validation should reject missing required title with 400'
  );

  await testEndpoint(
    'Test 3.5: POST /api/sms/templates with empty title/content strings',
    {
      method: 'POST',
      url: '/api/sms/templates',
      token: adminToken,
      payload: { title: '   ', content: '' },
    },
    200, // Or 400 if validation checked empty strings!
    'Fastify schema only checks type string, so empty strings "   " and "" are accepted!'
  );

  await testEndpoint(
    'Test 3.6: POST /api/sms/templates valid payload as Admin',
    {
      method: 'POST',
      url: '/api/sms/templates',
      token: adminToken,
      payload: { title: 'New Promo Template', content: 'Chao {ten_khach}, khuyen mai moi!', category: 'PROMOTION' },
    },
    200,
    'Admin should successfully save template'
  );

  // --- DELETE /api/sms/templates/:id ---
  await testEndpoint(
    'Test 3.7: DELETE /api/sms/templates/:id as Non-Admin',
    { method: 'DELETE', url: '/api/sms/templates/tpl_reminder_17', token: staffToken },
    403,
    'Non-admin users should be forbidden (403)'
  );

  await testEndpoint(
    'Test 3.8: DELETE default system template (tpl_reminder_17) as Admin',
    { method: 'DELETE', url: '/api/sms/templates/tpl_reminder_17', token: adminToken },
    200,
    'System default templates can be deleted by admin without system lock protection'
  );

  // --- POST /api/sms/send ---
  await testEndpoint(
    'Test 3.9: POST /api/sms/send missing legacyUserId',
    {
      method: 'POST',
      url: '/api/sms/send',
      token: staffToken,
      payload: { toPhoneNumber: '0901234567', body: 'Hello' },
    },
    400,
    'Fastify schema requires legacyUserId (400)'
  );

  await testEndpoint(
    'Test 3.10: POST /api/sms/send with legacyUserId = 0 (JS Falsy edge case!)',
    {
      method: 'POST',
      url: '/api/sms/send',
      token: staffToken,
      payload: { legacyUserId: 0, toPhoneNumber: '0901234567', body: 'Hello customer 0' },
    },
    400,
    'BUG DETECTED: `!legacyUserId` in code treats legacyUserId = 0 as falsy and returns 400 Bad Request despite 0 being a valid integer in Fastify schema!'
  );

  await testEndpoint(
    'Test 3.11: POST /api/sms/send with empty body string "   "',
    {
      method: 'POST',
      url: '/api/sms/send',
      token: staffToken,
      payload: { legacyUserId: 101, toPhoneNumber: '0901234567', body: '   ' },
    },
    400,
    'Should reject empty/whitespace body with 400'
  );

  await testEndpoint(
    'Test 3.12: POST /api/sms/send with templateId = "tpl_reminder_17" (string ID vs number DB parsing)',
    {
      method: 'POST',
      url: '/api/sms/send',
      token: staffToken,
      payload: { legacyUserId: 101, toPhoneNumber: '0901234567', body: 'Test body', templateId: 'tpl_reminder_17' },
    },
    200,
    'String templateId "tpl_reminder_17" causes parseInt("tpl_reminder_17") -> NaN -> stores NULL in template_id column!'
  );

  await testEndpoint(
    'Test 3.13: POST /api/sms/send valid request',
    {
      method: 'POST',
      url: '/api/sms/send',
      token: staffToken,
      payload: { legacyUserId: 101, toPhoneNumber: '0901234567', body: 'Valid SMS body', planId: 42 },
    },
    200,
    'Valid SMS request returns 200 with smsId and callLogId'
  );

  // --- GET /api/sms/history/:customerId ---
  await testEndpoint(
    'Test 3.14: GET /api/sms/history/invalid_id',
    { method: 'GET', url: '/api/sms/history/abc', token: staffToken },
    400,
    'Invalid non-numeric customerId returns 400 Bad Request'
  );

  await testEndpoint(
    'Test 3.15: GET /api/sms/history/101 (valid customer with history)',
    { method: 'GET', url: '/api/sms/history/101', token: staffToken },
    200,
    'Returns array of customer SMS history'
  );

  await testEndpoint(
    'Test 3.16: GET /api/sms/history/102 (customer with empty phone number in user_contact)',
    { method: 'GET', url: '/api/sms/history/102', token: staffToken },
    200,
    'Returns empty array [] when customer phone_number is empty'
  );

  return testResults;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runApiValidationTests();
}
