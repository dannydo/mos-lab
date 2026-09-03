import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InboxImplementationService,
  inboxImplementationCurrentPlan,
  isInboxImplementationExecutionEligible,
  isInboxImplementationEligible,
  normalizeInboxImplementationResult,
} from './inbox-implementation.service.js';
import { inboxImplementationSourceVersion } from './inbox-implementation-version.js';

type Source = Parameters<typeof isInboxImplementationEligible>[0];

function source(overrides: Partial<Source> = {}): Source {
  const base = {
    id: 16,
    requestType: 'BUG',
    title: 'Presentation-only health card',
    description: 'Use colors and icons to simplify worker health.',
    status: 'APPROVED',
    priority: 'P1',
    clarificationStatus: 'READY',
    clarificationSummary: 'The ticket scope is presentation-only.',
    businessContext: 'Do not alter health telemetry or production behavior.',
    sourcePath: '/dashboard/bug-reports',
    implementationApprovedAt: new Date('2026-09-03T02:45:00.000Z'),
    implementationApprovalSourceVersion: null,
    implementationActiveJobId: null,
    comments: [{ id: 9, body: 'Reporter confirmed the approved scope.' }],
    inboxPlanJobs: [],
  } satisfies Source;
  const first = { ...base, ...overrides } as Source;
  const version = inboxImplementationSourceVersion(first);
  return { ...first, implementationApprovalSourceVersion: overrides.implementationApprovalSourceVersion ?? version };
}

test('implementation requires a distinct approval and a native plan for the exact material source version', () => {
  const pendingPlan = source();
  assert.equal(isInboxImplementationEligible(pendingPlan).eligible, false);

  const sourceVersion = inboxImplementationSourceVersion(pendingPlan);
  const ready = source({
    inboxPlanJobs: [
      {
        id: 'plan-1',
        status: 'COMPLETED',
        resultAction: 'POST_PLAN',
        sourceVersion,
        planVersion: 'v1:plan',
      },
    ],
  });
  assert.deepEqual(inboxImplementationCurrentPlan(ready, sourceVersion), {
    id: 'plan-1',
    sourceVersion,
    planVersion: 'v1:plan',
  });
  assert.equal(isInboxImplementationEligible(ready).eligible, true);

  const changed = source({
    description: 'The reporter materially narrowed the requested presentation behavior.',
    inboxPlanJobs: ready.inboxPlanJobs,
    implementationApprovalSourceVersion: sourceVersion,
  });
  assert.equal(isInboxImplementationEligible(changed).approved, false);
  assert.equal(isInboxImplementationEligible(changed).eligible, false);

  const retrying = source({ status: 'IN_PROGRESS', inboxPlanJobs: ready.inboxPlanJobs });
  assert.equal(isInboxImplementationEligible(retrying).eligible, false);
  assert.equal(isInboxImplementationExecutionEligible(retrying).eligible, true);
});

test('implementation outcome stores only bounded structured review metadata', () => {
  assert.deepEqual(
    normalizeInboxImplementationResult({
      summary: 'Updated safe presentation only.',
      tests: [
        { command: 'pnpm --filter @mos-lab/web test:run', status: 'PASSED' },
        { command: 'pnpm build', status: 'NOT_RUN' },
      ],
      risksAndRollback: 'Discard the isolated worktree if review is declined.',
    }),
    {
      summary: 'Updated safe presentation only.',
      tests: [
        { command: 'pnpm --filter @mos-lab/web test:run', status: 'PASSED' },
        { command: 'pnpm build', status: 'NOT_RUN' },
      ],
      risksAndRollback: 'Discard the isolated worktree if review is declined.',
    }
  );
  assert.throws(() => normalizeInboxImplementationResult({ summary: 'Only summary' }), /tóm tắt và rủi ro/i);
  assert.deepEqual(
    normalizeInboxImplementationResult({
      summary: 'Safe.',
      tests: [{ command: 'TOKEN=do-not-store pnpm test', status: 'PASSED' }],
      risksAndRollback: 'Review first.',
    }).tests,
    [{ command: 'TOKEN=[redacted] pnpm test', status: 'PASSED' }]
  );
});

test('duplicate approval delivery creates one durable implementation job for the same source and plan', async () => {
  const draft = source();
  const sourceVersion = inboxImplementationSourceVersion(draft);
  const report = source({
    inboxPlanJobs: [
      { id: 'plan-1', status: 'COMPLETED', resultAction: 'POST_PLAN', sourceVersion, planVersion: 'v1:plan' },
    ],
  });
  let creates = 0;
  const jobs = new Map<string, Record<string, unknown>>();
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: {
          findUnique: async () => report,
          updateMany: async ({ data }: { data: Record<string, unknown> }) => {
            Object.assign(report, data);
            return { count: 1 };
          },
        },
        crmInboxImplementationJob: {
          findUnique: async ({ where }: { where: Record<string, unknown> }) => {
            const composite = where.reportId_sourceVersion_planVersion as
              { reportId: number; sourceVersion: string; planVersion: string } | undefined;
            if (composite) return [...jobs.values()].find((job) => job.reportId === composite.reportId) ?? null;
            return report.implementationActiveJobId ? (jobs.get(report.implementationActiveJobId) ?? null) : null;
          },
          create: async ({ data }: { data: Record<string, unknown> }) => {
            creates += 1;
            jobs.set(String(data.id), data);
            return data;
          },
          update: async () => ({}),
        },
      },
    },
  };
  assert.equal(await InboxImplementationService.enqueueApproved(fastify as never, 16), true);
  assert.equal(await InboxImplementationService.enqueueApproved(fastify as never, 16), false);
  assert.equal(creates, 1);
});

test('a database permit enforces global implementation concurrency and stale jobs never claim', async () => {
  const draft = source();
  const sourceVersion = inboxImplementationSourceVersion(draft);
  const report = source({
    implementationActiveJobId: 'job-1',
    inboxPlanJobs: [
      { id: 'plan-1', status: 'COMPLETED', resultAction: 'POST_PLAN', sourceVersion, planVersion: 'v1:plan' },
    ],
  });
  const job = {
    id: 'job-1',
    reportId: 16,
    sourceVersion,
    planVersion: 'v1:plan',
    branchName: 'codex/inbox/mos-bug-16-job-1',
    attemptCount: 0,
    updatedAt: new Date('2026-09-03T03:00:00.000Z'),
    report,
  };
  let permitAvailable = true;
  const fastify = {
    prisma: {
      crm: {
        crmInboxImplementationJob: {
          findMany: async () => [],
          findFirst: async () => job,
          updateMany: async () => ({ count: 1 }),
        },
        crmInboxImplementationWorkerLock: {
          upsert: async () => ({}),
          updateMany: async () => {
            if (!permitAvailable) return { count: 0 };
            permitAvailable = false;
            return { count: 1 };
          },
        },
        crmBugReport: { updateMany: async () => ({ count: 1 }) },
      },
    },
  };
  const first = await InboxImplementationService.claim(fastify as never, 'mac-worker');
  const second = await InboxImplementationService.claim(fastify as never, 'mac-worker-duplicate');
  assert.equal(first?.id, 'job-1');
  assert.equal(second, null);

  const staleReport = source({
    implementationActiveJobId: 'stale-job',
    description: 'Reporter changed the approved material scope after the lease was created.',
    inboxPlanJobs: job.report.inboxPlanJobs,
    implementationApprovalSourceVersion: sourceVersion,
  });
  const staleFastify = {
    prisma: {
      crm: {
        crmInboxImplementationJob: {
          findMany: async () => [],
          findFirst: async () => ({ ...job, id: 'stale-job', report: staleReport }),
          updateMany: async ({ data }: { data: Record<string, unknown> }) => {
            assert.equal(data.status, 'STALE');
            return { count: 1 };
          },
        },
        crmBugReport: { updateMany: async () => ({ count: 1 }) },
      },
    },
  };
  assert.equal(await InboxImplementationService.claim(staleFastify as never, 'mac-worker'), null);
});

test('recovery reattaches only the exact stale in-progress job without a new approval or job', async () => {
  const draft = source();
  const sourceVersion = inboxImplementationSourceVersion(draft);
  const report = source({
    status: 'IN_PROGRESS',
    implementationActiveJobId: null,
    inboxPlanJobs: [
      { id: 'plan-1', status: 'COMPLETED', resultAction: 'POST_PLAN', sourceVersion, planVersion: 'v1:plan' },
    ],
  });
  const job = {
    id: 'job-1',
    status: 'STALE',
    failureCode: 'STALE_APPROVAL_OR_PLAN',
    sourceVersion,
    planVersion: 'v1:plan',
  };
  const tx = {
    crmInboxImplementationJob: {
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (where.status === 'STALE' && job.status === 'STALE') {
          job.status = String(data.status);
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
    crmBugReport: {
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(report, data);
        return { count: 1 };
      },
    },
  };
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findMany: async () => [report] },
        crmInboxImplementationJob: { findFirst: async () => ({ ...job, attemptCount: 2 }) },
        $transaction: async (callback: (value: typeof tx) => Promise<boolean>) => callback(tx),
      },
    },
  };

  assert.equal(await InboxImplementationService.recoverInterruptedImplementationJobs(fastify as never), 1);
  assert.equal(job.status, 'PENDING');
  assert.equal(report.implementationActiveJobId, 'job-1');
});

test('recovery grants only one extra claim for the known pre-fix CLI argument failure', async () => {
  const draft = source();
  const sourceVersion = inboxImplementationSourceVersion(draft);
  const report = source({
    status: 'IN_PROGRESS',
    implementationActiveJobId: 'job-1',
    inboxPlanJobs: [
      { id: 'plan-1', status: 'COMPLETED', resultAction: 'POST_PLAN', sourceVersion, planVersion: 'v1:plan' },
    ],
  });
  const job = {
    id: 'job-1',
    status: 'FAILED',
    failureCode: 'CODEX_EXEC_EXIT_2',
    sourceVersion,
    planVersion: 'v1:plan',
  };
  const tx = {
    crmInboxImplementationJob: {
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        job.status = String(data.status);
        job.failureCode = String(data.failureCode);
        return { count: 1 };
      },
    },
    crmBugReport: {
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(report, data);
        return { count: 1 };
      },
    },
  };
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findMany: async () => [report] },
        crmInboxImplementationJob: { findFirst: async () => ({ ...job, attemptCount: 3 }) },
        $transaction: async (callback: (value: typeof tx) => Promise<boolean>) => callback(tx),
      },
    },
  };

  assert.equal(await InboxImplementationService.recoverInterruptedImplementationJobs(fastify as never), 1);
  assert.equal(job.status, 'PENDING');
  assert.equal(job.failureCode, 'CLI_ARGUMENTS_RECOVERED');
  assert.equal(report.implementationActiveJobId, 'job-1');
});

test('recovery marks one final close-event repair after a lease-expired process', async () => {
  const draft = source();
  const sourceVersion = inboxImplementationSourceVersion(draft);
  const report = source({
    status: 'IN_PROGRESS',
    implementationActiveJobId: 'job-1',
    inboxPlanJobs: [
      { id: 'plan-1', status: 'COMPLETED', resultAction: 'POST_PLAN', sourceVersion, planVersion: 'v1:plan' },
    ],
  });
  const job = {
    id: 'job-1',
    status: 'PENDING',
    failureCode: 'LEASE_EXPIRED',
    sourceVersion,
    planVersion: 'v1:plan',
  };
  const tx = {
    crmInboxImplementationJob: {
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        job.status = String(data.status);
        job.failureCode = String(data.failureCode);
        return { count: 1 };
      },
    },
    crmBugReport: { updateMany: async () => ({ count: 1 }) },
  };
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findMany: async () => [report] },
        crmInboxImplementationJob: { findFirst: async () => ({ ...job, attemptCount: 4 }) },
        $transaction: async (callback: (value: typeof tx) => Promise<boolean>) => callback(tx),
      },
    },
  };

  assert.equal(await InboxImplementationService.recoverInterruptedImplementationJobs(fastify as never), 1);
  assert.equal(job.failureCode, 'CLI_PROCESS_RECOVERED');
});
