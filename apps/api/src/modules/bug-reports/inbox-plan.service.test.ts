import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InboxPlanService,
  inboxPlanEventVersion,
  isInboxPlanEligible,
  isInboxPlanStale,
  normalizeInboxPlanResult,
} from './inbox-plan.service.js';

const at = new Date('2026-09-02T18:00:00.000Z');

function readyReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 14,
    requestType: 'BUG',
    title: 'QA Inbox plan event',
    description: 'Controlled non-sensitive plan verification.',
    status: 'NEW',
    priority: null,
    clarificationStatus: 'READY',
    clarificationSummary: 'Ticket has enough context for Danny review.',
    businessContext: 'Controlled QA only.',
    triageNote: null,
    sourcePath: '/dashboard',
    updatedAt: at,
    comments: [],
    ...overrides,
  };
}

const planResult = {
  action: 'POST_PLAN' as const,
  note: 'Plan is ready for Danny review.',
  plan: {
    evidence: 'The controlled event reached the ready gate.',
    expectedOutcome: 'One reviewable plan appears without implementation.',
    scope: 'Inbox plan worker and native ticket only.',
    steps: ['Add durable job.', 'Run the outbound worker.', 'Verify the native plan.'],
    verification: 'Check the ticket audit and plan comment.',
    risksAndRollback: 'No runtime change beyond a ticket comment; disable the worker path if needed.',
    approvalRequest: 'Danny approves or rejects this plan before any implementation.',
  },
};

test('plans only tickets genuinely ready for review and versions each source event', () => {
  assert.equal(isInboxPlanEligible(readyReport()), true);
  assert.equal(isInboxPlanEligible(readyReport({ clarificationStatus: 'PENDING_AGENT' })), false);
  assert.equal(isInboxPlanEligible(readyReport({ status: 'IN_PROGRESS' })), false);
  assert.equal(isInboxPlanEligible(readyReport({ status: 'CLOSED' })), false);
  const version = inboxPlanEventVersion(readyReport(), 'CLARITY_READY');
  assert.match(version, /^v1:[a-f0-9]{64}$/);
  assert.equal(isInboxPlanStale(version, readyReport(), 'CLARITY_READY'), false);
  assert.equal(
    isInboxPlanStale(version, readyReport({ description: 'Reporter added a material update.' }), 'CLARITY_READY'),
    true
  );
  assert.notEqual(
    inboxPlanEventVersion(readyReport(), 'CLARITY_READY'),
    inboxPlanEventVersion(readyReport(), 'IMPLEMENTATION_APPROVAL')
  );
  assert.notEqual(
    inboxPlanEventVersion(readyReport(), 'REOPEN_REANALYZED', {
      auditId: 44,
      reason: 'Reporter found the old behavior still present.',
      reopenedAt: '2026-09-03T08:00:00.000Z',
      originalEvidence: [{ id: 12, fileName: 'original.png', mimeType: 'image/png', sizeBytes: 120 }],
    }),
    inboxPlanEventVersion(readyReport(), 'CLARITY_READY')
  );
});

test('normalizes only a complete actionable plan and distinguishes no-op outcomes', () => {
  assert.deepEqual(normalizeInboxPlanResult(planResult), planResult);
  assert.deepEqual(normalizeInboxPlanResult({ action: 'NO_OP', note: 'No new plan is useful.', plan: null }), {
    action: 'NO_OP',
    note: 'No new plan is useful.',
    plan: null,
  });
  assert.throws(
    () => normalizeInboxPlanResult({ action: 'POST_PLAN', note: 'Incomplete', plan: { steps: [] } }),
    /Kế hoạch cần đủ/i
  );
  assert.throws(
    () =>
      normalizeInboxPlanResult({ action: 'INSUFFICIENT_INFORMATION', note: 'Need evidence.', plan: planResult.plan }),
    /không được kèm/i
  );
});

test('duplicate event delivery is idempotent at the durable enqueue boundary', async () => {
  const report = readyReport();
  const delivered = new Set<string>();
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => report },
        crmInboxPlanJob: {
          create: async ({ data }: { data: { eventVersion: string } }) => {
            if (delivered.has(data.eventVersion)) throw Object.assign(new Error('unique event key'), { code: 'P2002' });
            delivered.add(data.eventVersion);
          },
        },
      },
    },
  };
  assert.equal(await InboxPlanService.enqueue(fastify as never, 14, 'CLARITY_READY'), true);
  assert.equal(await InboxPlanService.enqueue(fastify as never, 14, 'CLARITY_READY'), false);
  assert.equal(await InboxPlanService.enqueue(fastify as never, 14, 'TRIAGE_UPDATED'), true);
  assert.equal(delivered.size, 2);
});

test('a reopen plan carries the exact evidence snapshot that re-analysis considered', async () => {
  const capture: { value: Record<string, unknown> | null } = { value: null };
  const reopen = {
    auditId: 88,
    reason: 'The two original screenshots still reproduce the defect.',
    reopenedAt: '2026-09-03T08:00:00.000Z',
    originalEvidence: [
      { id: 12, fileName: 'original-before.png', mimeType: 'image/png', sizeBytes: 120 },
      { id: 13, fileName: 'original-after.png', mimeType: 'image/png', sizeBytes: 121 },
    ],
  };
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => readyReport() },
        crmInboxPlanJob: { create: async ({ data }: { data: Record<string, unknown> }) => (capture.value = data) },
      },
    },
  };
  assert.equal(await InboxPlanService.enqueue(fastify as never, 14, 'REOPEN_REANALYZED', reopen), true);
  assert.ok(capture.value);
  assert.deepEqual(JSON.parse(String(capture.value.eventContextJson)).reopen.originalEvidence, reopen.originalEvidence);
});

test('a completed plan posts one visible native plan without changing implementation state', async () => {
  const report = readyReport();
  const eventVersion = inboxPlanEventVersion(report, 'CLARITY_READY');
  const comments: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const reportUpdates: Array<Record<string, unknown>> = [];
  const jobUpdates: Array<Record<string, unknown>> = [];
  const transaction = {
    crmBugReport: {
      findUnique: async () => report,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        reportUpdates.push(data);
        return { ...report, ...data };
      },
    },
    crmBugReportComment: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        comments.push(data);
        return { id: 101 };
      },
    },
    crmBugReportAudit: { create: async ({ data }: { data: Record<string, unknown> }) => audits.push(data) },
    crmInboxPlanJob: {
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        jobUpdates.push(data);
        return { count: 1 };
      },
      update: async () => ({ id: 'job-1' }),
    },
    $queryRaw: async () => [],
  };
  const fastify = {
    prisma: {
      crm: {
        crmInboxPlanJob: {
          findFirst: async () => ({ id: 'job-1', reportId: 14, eventKind: 'CLARITY_READY', eventVersion }),
        },
        crmBugReport: { findUnique: async () => report },
        $transaction: async (callback: (tx: typeof transaction) => Promise<string>) => callback(transaction),
      },
    },
  };

  await InboxPlanService.complete(fastify as never, 'job-1', 'lease-1', planResult);
  assert.match(String(comments[0]?.body), /Phương án Agent đề xuất/);
  assert.equal(comments[0]?.authorType, 'AGENT');
  assert.equal(audits[0]?.action, 'AGENT_PLAN_POSTED');
  assert.deepEqual(Object.keys(reportUpdates[0] || {}), ['updatedAt']);
  assert.equal(jobUpdates[0]?.resultAction, 'POST_PLAN');
  assert.equal(jobUpdates[0]?.status, 'COMPLETED');
});

test('a valid re-analysis posts a reopen-specific native plan with the reporter reason', async () => {
  const report = readyReport({ triageNote: 'Old deployment still does not persist.', priority: null });
  const reopen = {
    auditId: 88,
    reason: 'Old deployment still does not persist.',
    reopenedAt: '2026-09-03T08:00:00.000Z',
    originalEvidence: [{ id: 12, fileName: 'original-save.png', mimeType: 'image/png', sizeBytes: 120 }],
  };
  const eventVersion = inboxPlanEventVersion(report, 'REOPEN_REANALYZED', reopen);
  const comments: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const transaction = {
    crmBugReport: {
      findUnique: async () => report,
      update: async ({ data }: { data: Record<string, unknown> }) => ({ ...report, ...data }),
    },
    crmBugReportComment: {
      create: async ({ data }: { data: Record<string, unknown> }) => (comments.push(data), { id: 102 }),
    },
    crmBugReportAudit: { create: async ({ data }: { data: Record<string, unknown> }) => audits.push(data) },
    crmInboxPlanJob: {
      updateMany: async () => ({ count: 1 }),
      update: async () => ({ id: 'reopen-plan-1' }),
    },
    $queryRaw: async () => [],
  };
  const fastify = {
    prisma: {
      crm: {
        crmInboxPlanJob: {
          findFirst: async () => ({
            id: 'reopen-plan-1',
            reportId: 14,
            eventKind: 'REOPEN_REANALYZED',
            eventVersion,
            eventContextJson: JSON.stringify({ reopen }),
          }),
        },
        crmBugReport: { findUnique: async () => report },
        $transaction: async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction),
      },
    },
  };
  await InboxPlanService.complete(fastify as never, 'reopen-plan-1', 'lease-1', planResult);
  assert.match(String(comments[0]?.body), /sau reopen/i);
  assert.match(String(comments[0]?.body), /Old deployment still does not persist/);
  assert.match(String(comments[0]?.body), /original-save\.png/);
  assert.equal(audits[0]?.action, 'AGENT_REOPEN_PLAN_POSTED');
});

test('a stale claimed result is completed without a duplicate native plan', async () => {
  const current = readyReport({ description: 'Reporter submitted a newer material fact.' });
  const staleEventVersion = inboxPlanEventVersion(readyReport(), 'CLARITY_READY');
  const comments: Array<Record<string, unknown>> = [];
  const jobUpdates: Array<Record<string, unknown>> = [];
  const fastify = {
    prisma: {
      crm: {
        crmInboxPlanJob: {
          findFirst: async () => ({
            id: 'job-1',
            reportId: 14,
            eventKind: 'CLARITY_READY',
            eventVersion: staleEventVersion,
          }),
          updateMany: async ({ data }: { data: Record<string, unknown> }) => {
            jobUpdates.push(data);
            return { count: 1 };
          },
        },
        crmBugReport: { findUnique: async () => current },
        $transaction: async () => {
          throw new Error('stale work must not enter a write transaction');
        },
        crmBugReportComment: { create: async ({ data }: { data: Record<string, unknown> }) => comments.push(data) },
      },
    },
  };

  await InboxPlanService.complete(fastify as never, 'job-1', 'lease-1', planResult);
  assert.equal(comments.length, 0);
  assert.equal(jobUpdates[0]?.resultAction, 'STALE');
  assert.equal(jobUpdates[0]?.status, 'COMPLETED');
});
