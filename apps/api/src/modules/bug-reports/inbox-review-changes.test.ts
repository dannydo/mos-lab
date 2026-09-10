import assert from 'node:assert/strict';
import test from 'node:test';
import { InboxImplementationService, isInboxImplementationExecutionEligible } from './inbox-implementation.service.js';
import { bugReportAgentProgress, bugReportWorkflowProjection } from './bug-report.service.js';

type MutableRow = Record<string, unknown>;
type AuditRow = MutableRow & { action: string; beforeJson: string };
type CommentRow = MutableRow & { body: string };
type FollowUpRow = MutableRow & { eventVersion: string };

const candidate = { jobId: 'ae32a70f-8490-4247-aa4f-2f0e45bcdc40', sourceVersion: 'v1:source', planVersion: 'v1:plan' };
const input = { ...candidate, acknowledged: true as const, reason: 'Bổ sung đủ tiêu chí đã duyệt trước khi commit.' };
function fixture() {
  const now = new Date('2026-09-07T04:40:52Z');
  const state = {
    report: {
      id: 29,
      status: 'IN_PROGRESS',
      implementationActiveJobId: candidate.jobId,
      priority: 'P1',
      clarificationStatus: 'READY',
      implementationApprovedAt: now,
      implementationApprovedByStaffId: 1,
      implementationApprovalSourceVersion: 'v1:source',
      approvedAt: now,
      updatedAt: now,
      createdAt: now,
      startedAt: now,
      resolvedAt: null,
      closedAt: null,
      inboxPlanJobs: [{ id: 'old-plan' }],
      comments: [],
    },
    job: {
      id: candidate.jobId,
      reportId: 29,
      status: 'AWAITING_COMMIT_REVIEW',
      executionPhase: 'AWAITING_COMMIT_REVIEW',
      sourceVersion: candidate.sourceVersion,
      planVersion: candidate.planVersion,
      updatedAt: now,
      commitSha: null,
      changedFilesJson: '["retained.ts"]',
      testsJson: '[{"status":"PASSED"}]',
      worktreePath: '/retained/candidate',
      completedAt: now,
    },
    audits: [] as AuditRow[],
    comments: [] as CommentRow[],
    followUps: [] as FollowUpRow[],
  };
  let failAt = '';
  let lostCas = false;
  let queue = Promise.resolve();
  const db = {
    $transaction: async (callback: (tx: unknown) => Promise<void>) => {
      const previous = queue;
      let release!: () => void;
      queue = new Promise<void>((done) => {
        release = done;
      });
      await previous;
      const before = structuredClone(state);
      let locked = false;
      const tx = {
        $queryRaw: async (query: { sql: string; values: unknown[] }) => {
          assert.match(query.sql, /FOR UPDATE/);
          assert.deepEqual(query.values, [29]);
          locked = true;
        },
        crmBugReport: {
          findUnique: async () => {
            assert.equal(locked, true);
            return structuredClone(state.report);
          },
          updateMany: async ({ data }: { data: MutableRow }) => {
            Object.assign(state.report, data);
            return { count: 1 };
          },
        },
        crmInboxImplementationJob: {
          findUnique: async () => structuredClone(state.job),
          updateMany: async ({ where, data }: { where: { status: string }; data: MutableRow }) => {
            assert.equal(where.status, 'AWAITING_COMMIT_REVIEW');
            if (lostCas || state.job.status !== where.status) return { count: 0 };
            Object.assign(state.job, data);
            return { count: 1 };
          },
        },
        crmBugReportComment: {
          create: async ({ data }: { data: MutableRow }) => {
            state.comments.push({ body: '', ...data } as CommentRow);
            return { id: 177 };
          },
        },
        crmBugReportAudit: {
          create: async ({ data }: { data: MutableRow }) => {
            state.audits.push({ action: '', beforeJson: '', ...data } as AuditRow);
          },
          findFirst: async () => state.audits[0] ?? null,
        },
        crmInboxFollowUpJob: {
          create: async ({ data }: { data: MutableRow }) => {
            if (failAt === 'outbox') throw new Error('outbox unavailable');
            state.followUps.push({ eventVersion: '', ...data } as FollowUpRow);
          },
        },
      };
      try {
        await callback(tx);
      } catch (error) {
        Object.assign(state, before);
        throw error;
      } finally {
        release();
      }
    },
  };
  return {
    state,
    fastify: { prisma: { crm: db } } as never,
    failOutbox: () => {
      failAt = 'outbox';
    },
    loseCas: () => {
      lostCas = true;
    },
  };
}

test('request changes preserves candidate/history, revokes execution, and atomically emits only native planning', async () => {
  const f = fixture();
  const before = structuredClone(f.state);
  await InboxImplementationService.requestChanges(f.fastify, 29, 1, input);
  assert.deepEqual(f.state.job, { ...before.job, status: 'CHANGES_REQUESTED', executionPhase: 'CHANGES_REQUESTED' });
  assert.equal(f.state.report.priority, 'P1');
  assert.deepEqual(f.state.report.inboxPlanJobs, before.report.inboxPlanJobs);
  assert.equal(f.state.report.status, 'APPROVED');
  assert.equal(f.state.report.clarificationStatus, 'PENDING_AGENT');
  assert.equal(f.state.report.implementationApprovedAt, null);
  assert.equal(f.state.report.implementationActiveJobId, null);
  assert.equal(f.state.report.implementationApprovalSourceVersion, null);
  assert.equal(f.state.audits.length, 1);
  assert.equal(f.state.audits[0].action, 'DANNY_CHANGES_REQUESTED');
  assert.deepEqual(JSON.parse(f.state.audits[0].beforeJson).candidate, JSON.parse(JSON.stringify(before.job)));
  assert.match(f.state.comments[0].body, /code\/test cần Danny duyệt mới/);
  assert.equal(f.state.followUps.length, 1);
  assert.equal(f.state.followUps[0].eventVersion, `review:${candidate.jobId}`);
  assert.equal(isInboxImplementationExecutionEligible(f.state.report as never).eligible, false);
  const projectionSource = {
    ...f.state.report,
    implementation: null,
    audits: f.state.audits.map((a) => ({ ...a, createdAt: new Date() })),
  };
  assert.equal(bugReportAgentProgress(projectionSource as never).stage, 'ANALYZING');
  const projection = bugReportWorkflowProjection(projectionSource as never);
  assert.equal(projection.nextAction.actor, 'AGENT');
  const readySource = { ...projectionSource, clarificationStatus: 'READY' };
  assert.equal(bugReportAgentProgress(readySource as never).stage, 'CHECKING_BUSINESS_LOGIC');
  assert.equal(bugReportWorkflowProjection(readySource as never).nextAction.actor, 'AGENT');
  const plannedSource = {
    ...readySource,
    audits: [...readySource.audits, { action: 'AGENT_PLAN_POSTED', createdAt: new Date() }],
  };
  assert.equal(bugReportAgentProgress(plannedSource as never).stage, 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL');
  assert.equal(bugReportWorkflowProjection(plannedSource as never).nextAction.actor, 'DANNY');
  assert.equal(isInboxImplementationExecutionEligible(readySource as never).eligible, false);
});

test('duplicate and concurrent identical review requests produce one decision/comment/outbox event', async () => {
  const f = fixture();
  await Promise.all([1, 2, 3].map(() => InboxImplementationService.requestChanges(f.fastify, 29, 1, input)));
  assert.equal(f.state.audits.length, 1);
  assert.equal(f.state.comments.length, 1);
  assert.equal(f.state.followUps.length, 1);
  await assert.rejects(
    InboxImplementationService.requestChanges(f.fastify, 29, 1, {
      ...input,
      reason: 'Một quyết định khác không được ghi đè.',
    })
  );
});

test('fresh code approval cannot be recorded before the returned candidate has a current native plan', async () => {
  const f = fixture();
  await InboxImplementationService.requestChanges(f.fastify, 29, 1, input);
  f.state.report.clarificationStatus = 'READY';
  const before = structuredClone(f.state);
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => f.state.report },
        crmInboxImplementationJob: { findFirst: async () => ({ id: candidate.jobId }) },
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            $queryRaw: async () => [],
            crmBugReport: { findUnique: async () => f.state.report },
            crmBugReportAudit: { findFirst: async () => null },
            crmInboxImplementationJob: { findFirst: async () => ({ id: candidate.jobId }) },
          }),
      },
    },
  } as never;
  await assert.rejects(InboxImplementationService.approve(fastify, 29, 1), { code: 'REPLAN_REQUIRED' });
  assert.deepEqual(f.state, before);
});

test('outbox failure rolls back rejection, authority clearing and history writes', async () => {
  const f = fixture();
  const before = structuredClone(f.state);
  f.failOutbox();
  await assert.rejects(InboxImplementationService.requestChanges(f.fastify, 29, 1, input), /outbox unavailable/);
  assert.deepEqual(f.state, before);
});

test('commit approval winning the candidate CAS blocks request changes without partial writes', async () => {
  const f = fixture();
  const before = structuredClone(f.state);
  f.loseCas();
  await assert.rejects(InboxImplementationService.requestChanges(f.fastify, 29, 1, input));
  assert.deepEqual(f.state, before);
});

test('invalid reason, acknowledgement, candidate/version, another ticket and wrong checkpoints fail closed', async () => {
  for (const overrides of [
    { reason: '' },
    { reason: 'x'.repeat(2001) },
    { acknowledged: false },
    { jobId: 'invalid' },
    { sourceVersion: 'v1:stale' },
    { planVersion: 'v1:stale' },
  ]) {
    const f = fixture();
    const before = structuredClone(f.state);
    await assert.rejects(
      InboxImplementationService.requestChanges(f.fastify, 29, 1, { ...input, ...overrides } as never)
    );
    assert.deepEqual(f.state, before);
  }
  for (const status of ['PENDING', 'RUNNING', 'FAILED', 'RELEASED', 'AWAITING_DEPLOY_REVIEW']) {
    const f = fixture();
    f.state.job.status = status;
    const before = structuredClone(f.state);
    await assert.rejects(InboxImplementationService.requestChanges(f.fastify, 29, 1, input));
    assert.deepEqual(f.state, before);
  }
  const f = fixture();
  f.state.job.reportId = 13;
  await assert.rejects(InboxImplementationService.requestChanges(f.fastify, 29, 1, input));
  assert.equal(f.state.audits.length, 0);
});
