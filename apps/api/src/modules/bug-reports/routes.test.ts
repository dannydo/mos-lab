import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { bugReportRoutes } from './routes.js';
import { InboxImplementationService } from './inbox-implementation.service.js';
import { BugReportService } from './bug-report.service.js';
import { InboxIdeReleaseService } from './inbox-ide-release.service.js';
import {
  canManageBugInbox,
  canReadBugInbox,
  consumeClassifierWorkerRateLimit,
  isValidAgentAuthorization,
} from './routes.js';

test('request-changes route permits only authenticated canonical Danny and passes the exact review payload', async (t) => {
  const app = Fastify();
  app.decorate('prisma', { crm: { crmStaff: { update: async () => ({}) } } } as unknown as typeof app.prisma);
  app.decorateRequest('jwtVerify', async function () {
    if (!this.headers['x-test-role']) throw new Error('No test session');
    this.user = {
      id: 1,
      username: String(this.headers['x-test-name'] || 'not-danny'),
      displayName: 'Synthetic review',
      role: this.headers['x-test-role'] as never,
    };
  });
  const called = t.mock.method(InboxImplementationService, 'requestChanges', async () => {});
  const planCalled = t.mock.method(InboxImplementationService, 'requestPlanChanges', async () => {});
  t.mock.method(BugReportService, 'detail', async () => ({ id: 29 }) as never);
  await app.register(bugReportRoutes);
  const payload = {
    acknowledged: true,
    jobId: 'ae32a70f-8490-4247-aa4f-2f0e45bcdc40',
    sourceVersion: 'v1:s',
    planVersion: 'v1:p',
    reason: 'Cần bổ sung tiêu chí nghiệm thu.',
  };
  try {
    const inject = (headers: Record<string, string>) =>
      app.inject({ method: 'POST', url: '/bug-reports/29/implementation-request-changes', headers, payload });
    assert.equal((await inject({})).statusCode, 401);
    assert.equal((await inject({ 'x-test-role': 'manager' })).statusCode, 403);
    assert.equal((await inject({ 'x-test-role': 'super_admin' })).statusCode, 403);
    assert.equal(called.mock.callCount(), 0);
    assert.equal((await inject({ 'x-test-role': 'super_admin', 'x-test-name': 'danhdo@gmail.com' })).statusCode, 200);
    assert.equal(called.mock.callCount(), 1);
    assert.deepEqual(called.mock.calls[0].arguments.slice(1), [29, 1, payload]);
    const planPayload = { ...payload, planJobId: payload.jobId };
    const planInject = (headers: Record<string, string>) =>
      app.inject({ method: 'POST', url: '/bug-reports/29/plan-request-changes', headers, payload: planPayload });
    assert.equal((await planInject({})).statusCode, 401);
    assert.equal((await planInject({ 'x-test-role': 'manager' })).statusCode, 403);
    assert.equal((await planInject({ 'x-test-role': 'super_admin' })).statusCode, 403);
    assert.equal(planCalled.mock.callCount(), 0);
    assert.equal(
      (await planInject({ 'x-test-role': 'super_admin', 'x-test-name': 'danhdo@gmail.com' })).statusCode,
      200
    );
    assert.deepEqual(planCalled.mock.calls[0].arguments.slice(1), [29, 1, planPayload]);
  } finally {
    await app.close();
  }
});

test('only Danny canonical Super Admin can manage Bug Inbox', () => {
  assert.equal(canManageBugInbox({ role: 'super_admin', username: 'danhdo@gmail.com' }), true);
  assert.equal(canManageBugInbox({ role: 'super_admin', username: 'another-admin' }), false);
  assert.equal(canManageBugInbox({ role: 'admin', username: 'danhdo@gmail.com' }), false);
  assert.equal(canManageBugInbox({ role: 'manager', username: 'manager' }), false);
});

test('IDE release checkpoint accepts only the independent publisher token and never enqueues execution', async (t) => {
  const app = Fastify();
  app.decorate('prisma', {
    crm: { crmStaff: { update: async () => ({}), findUnique: async () => ({ role: 'admin', isActive: true }) } },
  } as unknown as typeof app.prisma);
  app.decorateRequest('jwtVerify', async function () {
    if (!this.headers['x-test-role']) throw new Error('No session');
    this.user = {
      id: 1,
      role: this.headers['x-test-role'] as never,
      username: String(this.headers['x-test-name'] || 'other'),
      displayName: 'Test',
    };
  });
  const record = t.mock.method(InboxIdeReleaseService, 'recordOfficialCheckpoint', async () => {});
  const enqueue = t.mock.method(InboxImplementationService, 'approve', async () => false);
  const token = 'ide-release-publisher-token-that-is-definitely-over-32-characters';
  const previous = process.env.MOS_IDE_RELEASE_CHECKPOINT_TOKEN;
  process.env.MOS_IDE_RELEASE_CHECKPOINT_TOKEN = token;
  await app.register(bugReportRoutes);
  try {
    const payload = {
      jobId: 'test-job',
      manifestDigest: 'a'.repeat(64),
      commitSha: 'b'.repeat(40),
      apiRelease: 'b'.repeat(40),
      webRelease: null,
    };
    const request = (authorization?: string) =>
      app.inject({
        method: 'POST',
        url: '/ide-release-checkpoints/29',
        headers: authorization ? { authorization } : {},
        payload,
      });
    assert.equal((await request()).statusCode, 401);
    assert.equal((await request('Bearer invalid')).statusCode, 401);
    assert.equal((await request(`Bearer ${token}`)).statusCode, 200);
    assert.equal(record.mock.callCount(), 1);
    assert.equal(enqueue.mock.callCount(), 0);
    assert.deepEqual(record.mock.calls[0].arguments.slice(1), [29, payload]);
  } finally {
    if (previous === undefined) delete process.env.MOS_IDE_RELEASE_CHECKPOINT_TOKEN;
    else process.env.MOS_IDE_RELEASE_CHECKPOINT_TOKEN = previous;
    await app.close();
  }
});

test('Admin and Super Admin can read every Inbox ticket without gaining Danny triage authority', () => {
  assert.equal(canReadBugInbox({ role: 'super_admin' }), true);
  assert.equal(canReadBugInbox({ role: 'admin' }), true);
  assert.equal(canReadBugInbox({ role: 'manager' }), false);
  assert.equal(canReadBugInbox({ role: 'telesales' }), false);
});

test('Agent bridge requires an exact independent bearer token', () => {
  const token = 'agent-token-that-is-definitely-over-32-characters';
  assert.equal(isValidAgentAuthorization(`Bearer ${token}`, token), true);
  assert.equal(isValidAgentAuthorization('Bearer wrong-token', token), false);
  assert.equal(isValidAgentAuthorization(`Basic ${token}`, token), false);
  assert.equal(isValidAgentAuthorization(`Bearer ${token}`, 'short'), false);
});

test('classifier worker bridge has a bounded request rate and recovers in the next window', () => {
  const key = `worker-rate-test-${Date.now()}`;
  for (let index = 0; index < 180; index += 1) assert.equal(consumeClassifierWorkerRateLimit(key, 1_000), true);
  assert.equal(consumeClassifierWorkerRateLimit(key, 1_000), false);
  assert.equal(consumeClassifierWorkerRateLimit(key, 61_000), true);
});
