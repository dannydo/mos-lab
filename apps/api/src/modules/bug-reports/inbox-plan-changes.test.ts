import assert from 'node:assert/strict';
import test from 'node:test';
import { InboxImplementationService, inboxPlanReviewCandidate } from './inbox-implementation.service.js';
import { inboxImplementationSourceVersion } from './inbox-implementation-version.js';
import { bugReportAgentProgress, bugReportWorkflowProjection } from './bug-report.service.js';

type MutableRow = Record<string, unknown>;
type AuditRow = MutableRow & { action: string; beforeJson: string };
type CommentRow = MutableRow & { id: number; body: string };
type FollowUpRow = MutableRow & { eventVersion: string };
type SqlQuery = { sql: string; values: unknown[] };

function fixture() {
  const report = {
    id: 29,
    requestType: 'FEATURE',
    title: 'Synthetic plan',
    description: 'Synthetic scope',
    status: 'APPROVED',
    priority: 'P1',
    clarificationStatus: 'READY',
    clarificationSummary: 'Clear scope',
    businessContext: null,
    triageNote: null,
    sourcePath: '/dashboard/bug-reports',
    implementationApprovedAt: null,
    implementationApprovedByStaffId: null,
    implementationApprovalSourceVersion: null,
    implementationActiveJobId: null,
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: new Date(),
    startedAt: null,
    resolvedAt: null,
    closedAt: null,
  };
  const plan = {
    id: 'ae32a70f-8490-4247-aa4f-2f0e45bcdc40',
    reportId: 29,
    status: 'COMPLETED',
    resultAction: 'POST_PLAN',
    sourceVersion: inboxImplementationSourceVersion(report),
    planVersion: 'v1:plan',
    resultJson: '{"immutable":"plan evidence"}',
    reviewCommentId: 77,
  };
  const state = {
    report,
    plans: [plan],
    audits: [] as AuditRow[],
    comments: [] as CommentRow[],
    followUps: [] as FollowUpRow[],
  };
  let failure = false;
  let queue = Promise.resolve();
  const read = () =>
    structuredClone({ ...state.report, comments: [...state.comments].reverse(), inboxPlanJobs: state.plans });
  const db = {
    crmBugReport: { findUnique: async () => read() },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      const previous = queue;
      let release!: () => void;
      queue = new Promise<void>((done) => {
        release = done;
      });
      await previous;
      const before = structuredClone(state);
      let locked = false;
      const tx = {
        $queryRaw: async (query: SqlQuery) => {
          assert.match(query.sql, /FOR UPDATE/);
          assert.deepEqual(query.values, [29]);
          locked = true;
        },
        crmBugReport: {
          findUnique: async () => {
            assert.ok(locked);
            return read();
          },
          update: async ({ data }: { data: MutableRow }) => {
            Object.assign(state.report, data);
            return read();
          },
        },
        crmInboxPlanJob: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            structuredClone(state.plans.find((p) => p.id === where.id)),
          update: async ({ where, data }: { where: { id: string }; data: MutableRow }) =>
            Object.assign(
              state.plans.find((p) => p.id === where.id)!,
              data
            ),
          updateMany: async ({ where, data }: { where: { status: { in: string[] } }; data: MutableRow }) => {
            for (const p of state.plans) if (where.status.in.includes(p.status)) Object.assign(p, data);
          },
        },
        crmInboxImplementationJob: { findFirst: async () => null },
        crmBugReportComment: {
          create: async ({ data }: { data: MutableRow }) => {
            const row = { id: 78, body: '', ...data } as CommentRow;
            state.comments.push(row);
            return row;
          },
        },
        crmBugReportAudit: {
          create: async ({ data }: { data: MutableRow }) => {
            state.audits.push({ action: '', beforeJson: '', ...data, createdAt: new Date() } as AuditRow);
          },
          findFirst: async ({ where }: { where: { action: string } }) =>
            state.audits.find((a) => a.action === where.action) ?? null,
        },
        crmInboxFollowUpJob: {
          create: async ({ data }: { data: MutableRow }) => {
            if (failure) throw new Error('outbox unavailable');
            state.followUps.push({ eventVersion: '', ...data } as FollowUpRow);
          },
        },
      };
      try {
        return await callback(tx);
      } catch (e) {
        Object.assign(state, before);
        throw e;
      } finally {
        release();
      }
    },
  };
  const candidate = inboxPlanReviewCandidate(read())!;
  return {
    state,
    read,
    fastify: { prisma: { crm: db } } as never,
    candidate,
    input: { ...candidate, acknowledged: true as const, reason: 'Bổ sung tiêu chí nghiệm thu rõ hơn.' },
    fail: () => {
      failure = true;
    },
  };
}

test('native plan revision retires eligibility, preserves history and emits one durable replan with truthful projection', async () => {
  const f = fixture();
  const original = structuredClone(f.state.plans[0]);
  await InboxImplementationService.requestPlanChanges(f.fastify, 29, 1, f.input);
  assert.deepEqual(f.state.plans[0], { ...original, status: 'SUPERSEDED' });
  assert.equal(f.state.report.status, 'APPROVED');
  assert.equal(f.state.report.priority, 'P1');
  assert.equal(f.state.report.clarificationStatus, 'PENDING_AGENT');
  assert.equal(f.state.report.implementationApprovedAt, null);
  assert.equal(f.state.report.implementationActiveJobId, null);
  assert.equal(inboxPlanReviewCandidate(f.read()), null);
  assert.equal(f.state.audits[0].action, 'DANNY_PLAN_CHANGES_REQUESTED');
  assert.equal(JSON.parse(f.state.audits[0].beforeJson).plan.resultJson, original.resultJson);
  assert.equal(f.state.followUps[0].eventVersion, `plan-review:${original.id}`);
  assert.match(f.state.comments[0].body, /Bổ sung tiêu chí/);
  const source = { ...f.read(), implementation: null, audits: f.state.audits };
  assert.equal(bugReportAgentProgress(source as never).stage, 'ANALYZING');
  assert.equal(bugReportWorkflowProjection(source as never).nextAction.actor, 'AGENT');
  assert.equal(
    bugReportWorkflowProjection({ ...source, clarificationStatus: 'READY' } as never).nextAction.actor,
    'AGENT'
  );
});

test('identical concurrent submissions produce one audit/comment/outbox; conflicting decisions cannot overwrite', async () => {
  const f = fixture();
  await Promise.all([1, 2, 3].map(() => InboxImplementationService.requestPlanChanges(f.fastify, 29, 1, f.input)));
  assert.equal(f.state.audits.length, 1);
  assert.equal(f.state.comments.length, 1);
  assert.equal(f.state.followUps.length, 1);
  await assert.rejects(
    InboxImplementationService.requestPlanChanges(f.fastify, 29, 1, {
      ...f.input,
      reason: 'Một lý do khác cần không ghi đè.',
    }),
    { code: 'PLAN_REVIEW_CONFLICT' }
  );
});

test('invalid reason, acknowledgment, candidate, version, active/approved/wrong state all fail without writes', async () => {
  for (const change of [
    { reason: '' },
    { reason: { text: 'not a reason string' } },
    { reason: 'x'.repeat(2001) },
    { acknowledged: false },
    { planJobId: 'bad' },
    { sourceVersion: 'stale' },
    { planVersion: 'stale' },
  ]) {
    const f = fixture();
    const before = structuredClone(f.state);
    await assert.rejects(
      InboxImplementationService.requestPlanChanges(f.fastify, 29, 1, { ...f.input, ...change } as never)
    );
    assert.deepEqual(f.state, before);
  }
  for (const change of [
    { status: 'IN_PROGRESS' },
    { status: 'CLOSED' },
    { clarificationStatus: 'PENDING_AGENT' },
    { implementationApprovedAt: new Date() },
    { implementationActiveJobId: 'running' },
  ]) {
    const f = fixture();
    Object.assign(f.state.report, change);
    const before = structuredClone(f.state);
    await assert.rejects(InboxImplementationService.requestPlanChanges(f.fastify, 29, 1, f.input), {
      code: 'PLAN_REVIEW_NOT_OPEN',
    });
    assert.deepEqual(f.state, before);
  }
});

test('outbox failure rolls back every decision write', async () => {
  const f = fixture();
  const before = structuredClone(f.state);
  f.fail();
  await assert.rejects(InboxImplementationService.requestPlanChanges(f.fastify, 29, 1, f.input), /outbox unavailable/);
  assert.deepEqual(f.state, before);
});

test('revision winning the row lock rejects concurrent stale approval and any old approval after replan', async (t) => {
  t.mock.method(InboxImplementationService, 'enqueueApproved', async () => false);
  const f = fixture();
  const results = await Promise.allSettled([
    InboxImplementationService.requestPlanChanges(f.fastify, 29, 1, f.input),
    InboxImplementationService.approve(f.fastify, 29, 1, f.candidate),
  ]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  f.state.report.clarificationStatus = 'READY';
  f.state.plans.unshift({
    ...f.state.plans[0],
    id: 'be32a70f-8490-4247-aa4f-2f0e45bcdc40',
    status: 'COMPLETED',
    sourceVersion: inboxImplementationSourceVersion(f.read()),
    planVersion: 'v1:new',
  });
  await assert.rejects(InboxImplementationService.approve(f.fastify, 29, 1, f.candidate), {
    code: 'PLAN_REVIEW_CHANGED',
  });
  await assert.rejects(InboxImplementationService.approve(f.fastify, 29, 1), { code: 'PLAN_REVIEW_CHANGED' });
  assert.equal(f.state.report.implementationApprovedAt, null);
  await InboxImplementationService.approve(f.fastify, 29, 1, inboxPlanReviewCandidate(f.read())!);
  assert.ok(f.state.report.implementationApprovedAt);
});

test('approval winning the row lock rejects revision, without a replan event', async (t) => {
  t.mock.method(InboxImplementationService, 'enqueueApproved', async () => false);
  const f = fixture();
  const results = await Promise.allSettled([
    InboxImplementationService.approve(f.fastify, 29, 1, f.candidate),
    InboxImplementationService.requestPlanChanges(f.fastify, 29, 1, f.input),
  ]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal(f.state.followUps.length, 0);
  assert.equal(f.state.plans[0].status, 'COMPLETED');
});
