import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '../../generated/crm-client/index.js';
import {
  InboxImplementationService,
  canAuthorizeBuildLockRecoveryRetry,
  canAuthorizeQualityGateRecoveryRetry,
  canAuthorizeSchemaRecoveryRetry,
  canAuthorizeWorkerRecoveryRetry,
  inboxImplementationCurrentPlan,
  evaluateInboxImplementationQualityGate,
  isInboxImplementationExecutionEligible,
  isInboxImplementationEligible,
  normalizeInboxImplementationResult,
  qualityTestsForCheckpointApproval,
  testsAfterOperationalCheckpointFailure,
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
    triageNote: null,
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

test('preserves completed quality evidence when deploy is interrupted', () => {
  const existing = JSON.stringify([
    { command: 'pnpm --filter @mos-lab/shared build', status: 'PASSED' },
    { command: 'git diff --check', status: 'PASSED' },
  ]);

  assert.deepEqual(testsAfterOperationalCheckpointFailure(existing, 'DEPLOY_INTERRUPTED', 'Worker restart.', true), [
    { command: 'pnpm --filter @mos-lab/shared build', status: 'PASSED' },
    { command: 'git diff --check', status: 'PASSED' },
  ]);
});

test('records a code/test worker failure as failed quality evidence', () => {
  assert.deepEqual(testsAfterOperationalCheckpointFailure(null, 'CODEX_EXEC_EXIT_1', 'Executor exited.', false), [
    {
      command: 'Codex executor',
      status: 'FAILED',
      failureCode: 'CODEX_EXEC_EXIT_1',
      failureSummary: 'Executor exited.',
    },
  ]);
});

test('removes only legacy operational checkpoint evidence before re-approving deploy', () => {
  const tests = qualityTestsForCheckpointApproval(
    JSON.stringify([
      { command: 'pnpm --filter @mos-lab/shared build', status: 'PASSED' },
      {
        command: 'Codex executor',
        status: 'FAILED',
        failureCode: 'DEPLOY_INTERRUPTED',
        failureSummary: 'Worker restart.',
      },
      { command: 'git diff --check', status: 'PASSED' },
    ]),
    'DEPLOY_INTERRUPTED'
  );

  assert.deepEqual(tests, [
    { command: 'pnpm --filter @mos-lab/shared build', status: 'PASSED' },
    { command: 'git diff --check', status: 'PASSED' },
  ]);
});

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

  const reopened = source({
    status: 'NEW',
    priority: null,
    clarificationStatus: 'PENDING_AGENT',
    clarificationSummary: null,
    implementationApprovedAt: null,
    implementationApprovalSourceVersion: null,
    inboxPlanJobs: ready.inboxPlanJobs,
  });
  assert.equal(isInboxImplementationEligible(reopened).approved, false);
  assert.equal(isInboxImplementationEligible(reopened).eligible, false);

  const reanalyzed = source({
    triageNote: 'Reporter reopened because the persistence regression remains.',
    inboxPlanJobs: ready.inboxPlanJobs,
    implementationApprovalSourceVersion: sourceVersion,
  });
  assert.equal(inboxImplementationCurrentPlan(reanalyzed, inboxImplementationSourceVersion(reanalyzed)), null);
  assert.equal(isInboxImplementationEligible(reanalyzed).approved, false);
});

test('implementation reuses the clarified plan when Danny only assigns priority', () => {
  const clarified = source({ priority: null });
  const clarifiedPlanSourceVersion = inboxImplementationSourceVersion(clarified);
  const approved = source({
    priority: 'P1',
    inboxPlanJobs: [
      {
        id: 'clarified-plan',
        status: 'COMPLETED',
        resultAction: 'POST_PLAN',
        sourceVersion: clarifiedPlanSourceVersion,
        planVersion: 'v1:clarified-plan',
      },
    ],
  });

  assert.deepEqual(inboxImplementationCurrentPlan(approved, inboxImplementationSourceVersion(approved)), {
    id: 'clarified-plan',
    sourceVersion: clarifiedPlanSourceVersion,
    planVersion: 'v1:clarified-plan',
  });
  assert.equal(isInboxImplementationEligible(approved).eligible, true);
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
  assert.deepEqual(
    normalizeInboxImplementationResult({
      summary: 'Safe failure evidence.',
      tests: [
        {
          command: 'pnpm build:web',
          status: 'FAILED',
          failureCode: 'TYPESCRIPT_ERROR',
          failureSummary: 'Missing prop; token=do-not-store and Bearer abcdefghijklmnopqrstuvwxyz1234567890.',
        },
      ],
      risksAndRollback: 'Keep the isolated worktree for review.',
    }).tests,
    [
      {
        command: 'pnpm build:web',
        status: 'FAILED',
        failureCode: 'TYPESCRIPT_ERROR',
        failureSummary: 'Missing prop; token=[redacted] and [redacted].',
      },
    ]
  );
  assert.match(
    String(
      normalizeInboxImplementationResult({
        summary: 'Safe fallback evidence.',
        tests: [{ command: 'pnpm build:web', status: 'FAILED' }],
        risksAndRollback: 'Keep the isolated worktree for review.',
      }).tests[0]?.failureSummary
    ),
    /chưa cung cấp tóm tắt lỗi an toàn/i
  );
});

test('normalizes an executor failure as safe retry evidence', () => {
  assert.deepEqual(
    normalizeInboxImplementationResult({
      summary: 'Executor failure.',
      tests: [
        {
          command: 'Codex executor',
          status: 'FAILED',
          failureCode: 'CODEX_EXEC_EXIT_1',
          failureSummary: 'Error: token=do-not-store at /Users/dannydo/projects/mos-lab/file.ts',
        },
      ],
      risksAndRollback: 'Keep the isolated worktree for review.',
    }).tests,
    [
      {
        command: 'Codex executor',
        status: 'FAILED',
        failureCode: 'CODEX_EXEC_EXIT_1',
        failureSummary: 'Error: token=[redacted] at [internal-path]',
      },
    ]
  );
});

test('quality gate blocks an unverified web patch and permits only passed visual QA', () => {
  const blocked = evaluateInboxImplementationQualityGate({
    changedFiles: ['apps/web/app/dashboard/bug-reports/page.tsx'],
    tests: [
      { command: 'pnpm --filter @mos-lab/web typecheck', status: 'PASSED' },
      { command: 'playwright visual QA at 125% zoom', status: 'FAILED' },
    ],
  });
  assert.equal(blocked.eligible, false);
  assert.match(blocked.reason || '', /FAILED|NOT_RUN/i);

  const missingVisual = evaluateInboxImplementationQualityGate({
    changedFiles: ['apps/web/app/dashboard/bug-reports/page.tsx'],
    tests: [{ command: 'pnpm --filter @mos-lab/web typecheck', status: 'PASSED' }],
  });
  assert.equal(missingVisual.eligible, false);
  assert.match(missingVisual.reason || '', /visual QA/i);

  assert.deepEqual(
    evaluateInboxImplementationQualityGate({
      changedFiles: ['apps/web/app/dashboard/bug-reports/page.tsx'],
      tests: [
        { command: 'pnpm --filter @mos-lab/web typecheck', status: 'PASSED' },
        { command: 'playwright visual screenshot QA at 125% and 150%', status: 'PASSED' },
      ],
    }),
    { eligible: true, reason: null }
  );
});

test('quality gate accepts only an audited corrected archive measurement and never bypasses a real failure', () => {
  const archiveCommand = 'Initial newline-delimited archive measurement';
  const correctedCommand = 'Null-delimited before/after archive measurement';
  const accepted = evaluateInboxImplementationQualityGate({
    changedFiles: ['apps/api/src/modules/bug-reports/inbox-implementation.service.ts'],
    tests: [
      {
        command: archiveCommand,
        status: 'SUPERSEDED',
        failureCode: 'ARCHIVE_FILENAME_ENCODING',
        failureSummary: 'The archive tool misinterpreted a non-ASCII filename.',
        supersededBy: correctedCommand,
      },
      { command: correctedCommand, status: 'PASSED' },
    ],
  });
  assert.deepEqual(accepted, { eligible: true, reason: null });

  const acceptedPatternDiagnostic = evaluateInboxImplementationQualityGate({
    changedFiles: ['.vercelignore'],
    tests: [
      {
        command: 'BSD tar archive simulation',
        status: 'SUPERSEDED',
        failureCode: 'ARCHIVE_SIMULATION_PATTERN_MISMATCH',
        failureSummary: 'BSD tar does not implement Vercel root-anchored patterns.',
        supersededBy: correctedCommand,
      },
      { command: correctedCommand, status: 'PASSED' },
      { command: 'pnpm build:web', status: 'PASSED' },
    ],
  });
  assert.deepEqual(acceptedPatternDiagnostic, { eligible: true, reason: null });

  const packagingOnlyWithoutVisualQa = evaluateInboxImplementationQualityGate({
    changedFiles: ['.vercelignore'],
    tests: [
      { command: correctedCommand, status: 'PASSED' },
      { command: 'pnpm build:web', status: 'PASSED' },
      { command: 'Playwright visual QA', status: 'NOT_RUN' },
    ],
  });
  assert.deepEqual(packagingOnlyWithoutVisualQa, { eligible: true, reason: null });

  const blocked = evaluateInboxImplementationQualityGate({
    changedFiles: ['apps/api/src/modules/bug-reports/inbox-implementation.service.ts'],
    tests: [
      {
        command: 'pnpm build:web',
        status: 'SUPERSEDED',
        failureCode: 'NEXT_BUILD_LOCK_BUSY',
        failureSummary: 'A build lock was held.',
        supersededBy: correctedCommand,
      },
      { command: correctedCommand, status: 'PASSED' },
    ],
  });
  assert.equal(blocked.eligible, false);

  const sandboxBlocked = evaluateInboxImplementationQualityGate({
    changedFiles: ['.vercelignore'],
    tests: [
      { command: correctedCommand, status: 'PASSED' },
      {
        command: 'process diagnostic',
        status: 'SUPERSEDED',
        failureCode: 'SANDBOX_PROCESS_INSPECTION_DENIED',
        supersededBy: correctedCommand,
      },
    ],
  });
  assert.equal(sandboxBlocked.eligible, false);
});

test('a failed visual QA completes as a retry-only terminal job, never a commit review', async () => {
  const seed = source({ status: 'IN_PROGRESS' });
  const report = source({
    status: 'IN_PROGRESS',
    implementationActiveJobId: 'quality-gate-job',
    inboxPlanJobs: [
      {
        id: 'plan-1',
        status: 'COMPLETED',
        resultAction: 'POST_PLAN',
        sourceVersion: inboxImplementationSourceVersion(seed),
        planVersion: 'v1:plan',
      },
    ],
  });
  const job = {
    id: 'quality-gate-job',
    reportId: 16,
    status: 'RUNNING',
    leaseToken: 'lease-1',
    leaseExpiresAt: new Date(Date.now() + 60_000),
    sourceVersion: inboxImplementationSourceVersion(report),
    planVersion: 'v1:plan',
    report,
  };
  const updates: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const fastify = {
    prisma: {
      crm: {
        crmInboxImplementationJob: {
          findFirst: async () => job,
        },
        crmInboxImplementationWorkerLock: { updateMany: async () => ({ count: 1 }) },
        $transaction: async (callback: (tx: unknown) => Promise<void>) =>
          callback({
            crmInboxImplementationJob: {
              update: async (input: { data: Record<string, unknown> }) => updates.push(input.data),
            },
            crmBugReport: { update: async () => ({ ...report, updatedAt: new Date() }) },
            crmBugReportComment: { create: async () => ({}) },
            crmBugReportAudit: { create: async (input: Record<string, unknown>) => audits.push(input) },
          }),
      },
    },
  };

  await InboxImplementationService.complete(
    fastify as never,
    job.id,
    'lease-1',
    {
      summary: 'Layout patch was attempted.',
      risksAndRollback: 'Discard the isolated draft.',
      tests: [
        {
          command: 'playwright visual screenshot QA at 125% zoom',
          status: 'FAILED',
          failureCode: 'VISUAL_REGRESSION',
          failureSummary: 'Trang vẫn còn khoảng trống bên phải ở mức zoom 125%.',
        },
      ],
    },
    { changedFiles: ['apps/web/app/dashboard/bug-reports/page.tsx'], diffStat: '1 file changed' }
  );

  assert.equal(updates[0]?.status, 'FAILED');
  assert.equal(updates[0]?.failureCode, 'QUALITY_GATE_FAILED');
  assert.equal(updates[0]?.executionPhase, 'FAILED');
  assert.match(String(updates[0]?.testsJson), /VISUAL_REGRESSION/);
  assert.equal((audits[0]?.data as { action?: string }).action, 'AGENT_IMPLEMENTATION_FAILED');
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
          findFirst: async () => null,
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

test('Danny retry creates a bounded linked chain and leaves terminal evidence unchanged', async () => {
  const draft = source();
  const sourceVersion = inboxImplementationSourceVersion(draft);
  const report = source({
    implementationActiveJobId: 'terminal-job',
    inboxPlanJobs: [
      { id: 'plan-1', status: 'COMPLETED', resultAction: 'POST_PLAN', sourceVersion, planVersion: 'v1:plan' },
    ],
  });
  const terminal = {
    id: 'terminal-job',
    status: 'FAILED',
    retryOfJobId: 'prior-terminal-job',
    retrySequence: 1,
    sourceVersion,
    planVersion: 'v1:plan',
    failureCode: 'LEASE_EXPIRED',
  };
  const createdRows: Record<string, unknown>[] = [];
  let auditAction = '';
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => report },
        crmInboxImplementationJob: {
          findUnique: async () => terminal,
          findFirst: async () => null,
        },
        $transaction: async (callback: (tx: unknown) => Promise<boolean>) =>
          callback({
            crmInboxImplementationJob: {
              create: async ({ data }: { data: Record<string, unknown> }) => {
                createdRows.push(data);
                return data;
              },
              update: async () => ({}),
            },
            crmBugReport: {
              updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                Object.assign(report, data);
                return { count: 1 };
              },
            },
            crmBugReportAudit: {
              create: async ({ data }: { data: { action: string } }) => {
                auditAction = data.action;
                return {};
              },
            },
          }),
      },
    },
  };

  assert.equal(await InboxImplementationService.retryFailed(fastify as never, 16, 1), true);
  assert.equal(createdRows[0]?.retryOfJobId, 'terminal-job');
  assert.equal(createdRows[0]?.retrySequence, 2);
  assert.equal(terminal.status, 'FAILED');
  assert.equal(report.status, 'APPROVED');
  assert.equal(auditAction, 'AGENT_IMPLEMENTATION_RETRY_QUEUED');
});

test('Danny may authorize exactly one recovery retry for a known Worker failure after the normal cap', async () => {
  const draft = source();
  const sourceVersion = inboxImplementationSourceVersion(draft);
  const report = source({
    implementationActiveJobId: 'worker-terminal-job',
    inboxPlanJobs: [
      { id: 'plan-1', status: 'COMPLETED', resultAction: 'POST_PLAN', sourceVersion, planVersion: 'v1:plan' },
    ],
  });
  const terminal = {
    id: 'worker-terminal-job',
    status: 'FAILED',
    retryOfJobId: 'retry-1',
    retrySequence: 2,
    sourceVersion,
    planVersion: 'v1:plan',
    failureCode: 'CODEX_EXEC_EXIT_1',
  };
  const createdRows: Record<string, unknown>[] = [];
  let auditAction = '';
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => report },
        crmInboxImplementationJob: {
          findUnique: async () => terminal,
          findFirst: async () => null,
        },
        $transaction: async (callback: (tx: unknown) => Promise<boolean>) =>
          callback({
            crmInboxImplementationJob: {
              create: async ({ data }: { data: Record<string, unknown> }) => {
                createdRows.push(data);
                return data;
              },
              update: async () => ({}),
            },
            crmBugReport: {
              updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                Object.assign(report, data);
                return { count: 1 };
              },
            },
            crmBugReportAudit: {
              create: async ({ data }: { data: { action: string } }) => {
                auditAction = data.action;
                return {};
              },
            },
          }),
      },
    },
  };

  assert.equal(canAuthorizeWorkerRecoveryRetry(terminal), true);
  assert.equal(await InboxImplementationService.authorizeWorkerRecoveryRetry(fastify as never, 16, 1), true);
  assert.equal(createdRows[0]?.retryOfJobId, 'worker-terminal-job');
  assert.equal(createdRows[0]?.retrySequence, 3);
  assert.equal(auditAction, 'DANNY_WORKER_RECOVERY_RETRY_AUTHORIZED');
  assert.equal(canAuthorizeWorkerRecoveryRetry({ ...terminal, retrySequence: 3 }), false);
  assert.equal(canAuthorizeWorkerRecoveryRetry({ ...terminal, failureCode: 'QUALITY_GATE_FAILED' }), false);
});

test('schema recovery needs a diagnostic for the exact exhausted job and creates only sequence four', async () => {
  const draft = source();
  const sourceVersion = inboxImplementationSourceVersion(draft);
  const report = source({
    implementationActiveJobId: 'schema-terminal-job',
    inboxPlanJobs: [
      { id: 'plan-1', status: 'COMPLETED', resultAction: 'POST_PLAN', sourceVersion, planVersion: 'v1:plan' },
    ],
  });
  const terminal = {
    id: 'schema-terminal-job',
    status: 'FAILED',
    retryOfJobId: 'worker-recovery-job',
    retrySequence: 3,
    sourceVersion,
    planVersion: 'v1:plan',
    failureCode: 'CODEX_EXEC_EXIT_1',
  };
  const diagnostic = {
    action: 'WORKER_READONLY_DIAGNOSTIC_PASSED',
    afterJson: JSON.stringify({
      jobId: 'schema-terminal-job',
      rootCause: 'STRICT_RESPONSE_SCHEMA_REQUIRED_FIELDS',
    }),
  };
  const createdRows: Record<string, unknown>[] = [];
  let auditAction = '';
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => report },
        crmInboxImplementationJob: {
          findUnique: async () => terminal,
          findFirst: async () => null,
        },
        crmBugReportAudit: { findFirst: async () => diagnostic },
        $transaction: async (callback: (tx: unknown) => Promise<boolean>) =>
          callback({
            crmInboxImplementationJob: {
              create: async ({ data }: { data: Record<string, unknown> }) => {
                createdRows.push(data);
                return data;
              },
              update: async () => ({}),
            },
            crmBugReport: {
              updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                Object.assign(report, data);
                return { count: 1 };
              },
            },
            crmBugReportAudit: {
              create: async ({ data }: { data: { action: string } }) => {
                auditAction = data.action;
                return {};
              },
            },
          }),
      },
    },
  };

  assert.equal(canAuthorizeSchemaRecoveryRetry(terminal, diagnostic), true);
  assert.equal(await InboxImplementationService.authorizeSchemaRecoveryRetry(fastify as never, 16, 1), true);
  assert.equal(createdRows[0]?.retryOfJobId, 'schema-terminal-job');
  assert.equal(createdRows[0]?.retrySequence, 4);
  assert.equal(auditAction, 'DANNY_SCHEMA_RECOVERY_RETRY_AUTHORIZED');
  assert.equal(
    canAuthorizeSchemaRecoveryRetry(terminal, {
      ...diagnostic,
      afterJson: JSON.stringify({ jobId: 'different-job', rootCause: 'STRICT_RESPONSE_SCHEMA_REQUIRED_FIELDS' }),
    }),
    false
  );
});

test('quality-gate recovery creates sequence five once after the verified gate repair', async () => {
  const draft = source();
  const sourceVersion = inboxImplementationSourceVersion(draft);
  const report = source({
    implementationActiveJobId: 'quality-gate-terminal-job',
    inboxPlanJobs: [
      { id: 'plan-1', status: 'COMPLETED', resultAction: 'POST_PLAN', sourceVersion, planVersion: 'v1:plan' },
    ],
  });
  const terminal = {
    id: 'quality-gate-terminal-job',
    status: 'FAILED',
    retryOfJobId: 'schema-recovery-job',
    retrySequence: 4,
    sourceVersion,
    planVersion: 'v1:plan',
    failureCode: 'QUALITY_GATE_FAILED',
  };
  const createdRows: Record<string, unknown>[] = [];
  let auditAction = '';
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => report },
        crmInboxImplementationJob: {
          findUnique: async () => terminal,
        },
        $transaction: async (callback: (tx: unknown) => Promise<boolean>) =>
          callback({
            crmInboxImplementationJob: {
              create: async ({ data }: { data: Record<string, unknown> }) => {
                createdRows.push(data);
                return data;
              },
              update: async () => ({}),
            },
            crmBugReport: {
              updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                Object.assign(report, data);
                return { count: 1 };
              },
            },
            crmBugReportAudit: {
              create: async ({ data }: { data: { action: string } }) => {
                auditAction = data.action;
                return {};
              },
            },
          }),
      },
    },
  };

  assert.equal(canAuthorizeQualityGateRecoveryRetry(terminal), true);
  assert.equal(await InboxImplementationService.authorizeQualityGateRecoveryRetry(fastify as never, 16, 1), true);
  assert.equal(createdRows[0]?.retryOfJobId, 'quality-gate-terminal-job');
  assert.equal(createdRows[0]?.retrySequence, 5);
  assert.equal(auditAction, 'DANNY_GATE_RECOVERY_RETRY_AUTH');
  assert.equal(canAuthorizeQualityGateRecoveryRetry({ ...terminal, retrySequence: 5 }), false);
  assert.equal(canAuthorizeQualityGateRecoveryRetry({ ...terminal, failureCode: 'NEXT_BUILD_STALLED' }), false);
});

test('build-lock recovery opens only once for the recorded private Next output lock', () => {
  const terminal = {
    status: 'FAILED',
    retrySequence: 5,
    failureCode: 'QUALITY_GATE_FAILED',
    testsJson: JSON.stringify([
      {
        status: 'FAILED',
        summary:
          'The repeated build was rejected because the initial build process still held the private build-directory lock.',
      },
    ]),
  };
  assert.equal(canAuthorizeBuildLockRecoveryRetry(terminal), true);
  assert.equal(canAuthorizeBuildLockRecoveryRetry({ ...terminal, retrySequence: 6 }), false);
  assert.equal(
    canAuthorizeBuildLockRecoveryRetry({
      ...terminal,
      testsJson: JSON.stringify([{ status: 'FAILED', code: 'WEB_BUILD_ALREADY_RUNNING' }]),
    }),
    true
  );
  assert.equal(canAuthorizeBuildLockRecoveryRetry({ ...terminal, testsJson: 'quality gate failed' }), false);
  assert.equal(canAuthorizeBuildLockRecoveryRetry({ ...terminal, failureCode: 'NEXT_BUILD_STALLED' }), false);
});

test('lease renewal accepts only the same active worker, token, and Codex process epoch', async () => {
  const draft = source();
  const sourceVersion = inboxImplementationSourceVersion(draft);
  const report = source({
    status: 'IN_PROGRESS',
    implementationActiveJobId: 'job-1',
    inboxPlanJobs: [
      { id: 'plan-1', status: 'COMPLETED', resultAction: 'POST_PLAN', sourceVersion, planVersion: 'v1:plan' },
    ],
  });
  const renewals: Record<string, unknown>[] = [];
  const fastify = {
    prisma: {
      crm: {
        crmInboxImplementationJob: {
          findFirst: async () => ({
            id: 'job-1',
            sourceVersion,
            planVersion: 'v1:plan',
            report,
          }),
          updateMany: async ({ data }: { data: Record<string, unknown> }) => {
            renewals.push(data);
            return { count: 1 };
          },
        },
      },
    },
  };
  assert.equal(await InboxImplementationService.renew(fastify as never, 'job-1', 'lease-1', 'worker-a', 4242), true);
  assert.equal(renewals[0]?.executionPhase, undefined);
  assert.ok(renewals[0]?.leaseHeartbeatAt instanceof Date);
  assert.ok(renewals[0]?.leaseExpiresAt instanceof Date);
});

test('generated Prisma client includes every implementation lease and retry field', () => {
  const model = Prisma.dmmf.datamodel.models.find((candidate) => candidate.name === 'CrmInboxImplementationJob');
  assert.ok(model);
  const fields = new Set(model.fields.map((field) => field.name));
  for (const field of [
    'retryOfJobId',
    'retrySequence',
    'leaseHeartbeatAt',
    'processPid',
    'executionPhase',
    'progressLabel',
    'lastProgressAt',
    'progressCount',
    'checkpointCount',
  ]) {
    assert.equal(fields.has(field), true, `generated Prisma client is missing ${field}`);
  }
});

test('a worker restart terminalizes an expired lease before another job can be claimed', async () => {
  const expiredJob = {
    id: 'expired-job',
    reportId: 16,
    status: 'RUNNING',
    leaseExpiresAt: new Date('2026-09-03T03:00:00.000Z'),
  };
  const updates: Array<Record<string, unknown>> = [];
  let permitCleared = false;
  const fastify = {
    prisma: {
      crm: {
        crmInboxImplementationJob: {
          findMany: async () => [expiredJob],
          updateMany: async ({ data }: { data: Record<string, unknown> }) => {
            updates.push(data);
            return { count: 1 };
          },
          findFirst: async () => null,
        },
        crmBugReport: { updateMany: async () => ({ count: 1 }) },
        crmBugReportAudit: { create: async () => ({}) },
        crmInboxImplementationWorkerLock: {
          updateMany: async () => {
            permitCleared = true;
            return { count: 1 };
          },
        },
      },
    },
  };

  assert.equal(await InboxImplementationService.claim(fastify as never, 'restarted-worker'), null);
  assert.deepEqual(updates[0], {
    status: 'FAILED',
    leaseToken: null,
    leasedBy: null,
    leaseExpiresAt: null,
    processPid: null,
    executionPhase: 'FAILED',
    failureCode: 'LEASE_EXPIRED',
    retainUntil: updates[0]?.retainUntil,
  });
  assert.ok(updates[0]?.retainUntil instanceof Date);
  assert.equal(permitCleared, true);
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
    commitSha: 'fb757616e4a48f1fdb2f4b236b20bee68ae65716',
    changedFilesJson: JSON.stringify(['apps/web/app/dashboard/bug-reports/page.tsx']),
    worktreePath: '/Users/dannydo/projects/.mos-inbox-worktrees/job-1',
    executionPhase: 'DEPLOY_APPROVED',
    attemptCount: 1,
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
  assert.equal(first?.operation, 'DEPLOY');
  assert.equal(first?.commitSha, 'fb757616e4a48f1fdb2f4b236b20bee68ae65716');
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

test('a lease that expires after its one process recovery becomes a terminal failure', async () => {
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
    reportId: 16,
    status: 'PENDING',
    failureCode: 'LEASE_EXPIRED',
    sourceVersion,
    planVersion: 'v1:plan',
    attemptCount: 5,
  };
  let auditAction = '';
  let permitCleared = false;
  const tx = {
    crmInboxImplementationJob: {
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        assert.equal(where.status, 'PENDING');
        assert.equal(where.failureCode, 'LEASE_EXPIRED');
        assert.deepEqual(where.attemptCount, { gte: 5 });
        job.status = String(data.status);
        job.failureCode = String(data.failureCode);
        return { count: 1 };
      },
    },
    crmBugReport: { update: async () => ({ ...report, updatedAt: new Date() }) },
    crmBugReportAudit: {
      create: async ({ data }: { data: { action: string } }) => {
        auditAction = data.action;
        return {};
      },
    },
  };
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findMany: async () => [report] },
        crmInboxImplementationJob: { findFirst: async () => ({ ...job }) },
        crmInboxImplementationWorkerLock: {
          updateMany: async () => {
            permitCleared = true;
            return { count: 1 };
          },
        },
        $transaction: async (callback: (value: typeof tx) => Promise<boolean>) => callback(tx),
      },
    },
  };

  assert.equal(await InboxImplementationService.recoverInterruptedImplementationJobs(fastify as never), 1);
  assert.equal(job.status, 'FAILED');
  assert.equal(job.failureCode, 'LEASE_EXPIRED');
  assert.equal(auditAction, 'AGENT_IMPLEMENTATION_FAILED');
  assert.equal(permitCleared, true);
});

test('a verified release hands a reviewed implementation to reporter acceptance exactly once', async () => {
  const report = {
    ...source({ status: 'IN_PROGRESS', implementationActiveJobId: 'review-job' }),
    reporterStaffId: 7,
  };
  const job = {
    id: 'review-job',
    reportId: 16,
    status: 'AWAITING_DEPLOY_REVIEW',
    changedFilesJson: JSON.stringify(['apps/web/app/dashboard/bug-reports/page.tsx']),
    testsJson: JSON.stringify([
      { command: 'pnpm --filter @mos-lab/web typecheck', status: 'PASSED' },
      { command: 'playwright visual screenshot QA', status: 'PASSED' },
    ]),
  };
  const jobUpdates: Array<Record<string, unknown>> = [];
  const reportUpdates: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const comments: Array<Record<string, unknown>> = [];
  const notifications: Array<Record<string, unknown>> = [];
  const resolutions: Array<Record<string, unknown>> = [];
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => report },
        crmInboxImplementationJob: { findFirst: async () => job },
        $transaction: async (callback: (tx: unknown) => Promise<void>) =>
          callback({
            crmInboxImplementationJob: {
              updateMany: async (input: { data: Record<string, unknown> }) => {
                jobUpdates.push(input.data);
                return { count: 1 };
              },
            },
            crmBugReport: {
              updateMany: async (input: { data: Record<string, unknown> }) => {
                reportUpdates.push(input.data);
                return { count: 1 };
              },
            },
            crmBugReportResolution: { upsert: async (input: Record<string, unknown>) => resolutions.push(input) },
            crmBugReportAudit: { create: async (input: Record<string, unknown>) => audits.push(input) },
            crmBugReportComment: { create: async (input: Record<string, unknown>) => comments.push(input) },
            crmBugReportNotification: { create: async (input: Record<string, unknown>) => notifications.push(input) },
          }),
      },
    },
  };
  const originalCommit = process.env.DEPLOY_COMMIT;
  process.env.DEPLOY_COMMIT = '5e682f81c472d5d10364a7a5131e6f2d2ad04e7c';
  try {
    await InboxImplementationService.recordReleasedForReporterAcceptance(fastify as never, 16, 1, {
      acknowledged: true,
      commitSha: '5e682f81c472d5d10364a7a5131e6f2d2ad04e7c',
    });
  } finally {
    if (originalCommit === undefined) delete process.env.DEPLOY_COMMIT;
    else process.env.DEPLOY_COMMIT = originalCommit;
  }

  assert.deepEqual(jobUpdates[0], {
    status: 'RELEASED',
    executionPhase: 'AWAITING_REPORTER_ACCEPTANCE',
    retainUntil: jobUpdates[0]?.retainUntil,
  });
  assert.equal(reportUpdates[0]?.status, 'FIXED');
  assert.equal(reportUpdates[0]?.implementationActiveJobId, null);
  assert.equal(resolutions.length, 1);
  assert.equal(
    audits[0]?.data && (audits[0].data as { action?: string }).action,
    'DANNY_RELEASED_FOR_REPORTER_ACCEPTANCE'
  );
  assert.equal(comments.length, 1);
  assert.equal(notifications.length, 1);
});

test('commit approval requeues only the retained reviewed patch for the Mac worker', async () => {
  const readySource = source({
    status: 'IN_PROGRESS',
    implementationActiveJobId: 'review-job',
    inboxPlanJobs: [
      {
        id: 'plan-1',
        status: 'COMPLETED',
        resultAction: 'POST_PLAN',
        sourceVersion: inboxImplementationSourceVersion(source()),
        planVersion: 'v1:plan',
      },
    ],
  });
  const job = {
    id: 'review-job',
    reportId: 16,
    status: 'AWAITING_COMMIT_REVIEW',
    sourceVersion: inboxImplementationSourceVersion(readySource),
    planVersion: 'v1:plan',
    changedFilesJson: JSON.stringify(['apps/web/app/dashboard/bug-reports/page.tsx']),
    testsJson: JSON.stringify([
      { command: 'pnpm --filter @mos-lab/web typecheck', status: 'PASSED' },
      { command: 'playwright visual screenshot QA', status: 'PASSED' },
    ]),
    updatedAt: new Date('2026-09-04T00:00:00.000Z'),
  };
  const updates: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => readySource },
        crmInboxImplementationJob: { findFirst: async () => job },
        $transaction: async (callback: (tx: unknown) => Promise<boolean>) =>
          callback({
            crmInboxImplementationJob: {
              updateMany: async (input: { data: Record<string, unknown> }) => {
                updates.push(input.data);
                return { count: 1 };
              },
            },
            crmBugReportAudit: { create: async (input: Record<string, unknown>) => audits.push(input) },
          }),
      },
    },
  };

  assert.equal(await InboxImplementationService.approveCommit(fastify as never, 16, 1), true);
  assert.equal(updates[0]?.status, 'PENDING');
  assert.equal(updates[0]?.executionPhase, 'COMMIT_APPROVED');
  assert.equal((audits[0]?.data as { action?: string }).action, 'DANNY_COMMIT_APPROVED');
});

test('commit approval rejects a retained patch when quality gate evidence failed', async () => {
  const readySource = source({
    status: 'IN_PROGRESS',
    implementationActiveJobId: 'failed-review-job',
    inboxPlanJobs: [
      {
        id: 'plan-1',
        status: 'COMPLETED',
        resultAction: 'POST_PLAN',
        sourceVersion: inboxImplementationSourceVersion(source()),
        planVersion: 'v1:plan',
      },
    ],
  });
  const job = {
    id: 'failed-review-job',
    reportId: 16,
    status: 'AWAITING_COMMIT_REVIEW',
    sourceVersion: inboxImplementationSourceVersion(readySource),
    planVersion: 'v1:plan',
    changedFilesJson: JSON.stringify(['apps/web/app/dashboard/bug-reports/page.tsx']),
    testsJson: JSON.stringify([{ command: 'playwright visual screenshot QA', status: 'FAILED' }]),
  };
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => readySource },
        crmInboxImplementationJob: { findFirst: async () => job },
      },
    },
  };

  await assert.rejects(
    () => InboxImplementationService.approveCommit(fastify as never, 16, 1),
    (error: unknown) => error instanceof Error && /không thể duyệt commit/i.test(error.message)
  );
});

test('deploy approval requeues only the recorded implementation commit for the Mac worker', async () => {
  const readySource = source({
    status: 'IN_PROGRESS',
    implementationActiveJobId: 'deploy-job',
    inboxPlanJobs: [
      {
        id: 'plan-1',
        status: 'COMPLETED',
        resultAction: 'POST_PLAN',
        sourceVersion: inboxImplementationSourceVersion(source()),
        planVersion: 'v1:plan',
      },
    ],
  });
  const job = {
    id: 'deploy-job',
    reportId: 16,
    status: 'AWAITING_DEPLOY_REVIEW',
    sourceVersion: inboxImplementationSourceVersion(readySource),
    planVersion: 'v1:plan',
    commitSha: 'fb757616e4a48f1fdb2f4b236b20bee68ae65716',
    changedFilesJson: JSON.stringify(['apps/api/src/modules/bug-reports/inbox-implementation.service.ts']),
    testsJson: JSON.stringify([{ command: 'pnpm --filter @mos-lab/api typecheck', status: 'PASSED' }]),
    updatedAt: new Date('2026-09-04T00:00:00.000Z'),
  };
  const updates: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => readySource },
        crmInboxImplementationJob: { findFirst: async () => job },
        $transaction: async (callback: (tx: unknown) => Promise<boolean>) =>
          callback({
            crmInboxImplementationJob: {
              updateMany: async (input: { data: Record<string, unknown> }) => {
                updates.push(input.data);
                return { count: 1 };
              },
            },
            crmBugReportAudit: { create: async (input: Record<string, unknown>) => audits.push(input) },
          }),
      },
    },
  };

  assert.equal(await InboxImplementationService.approveDeploy(fastify as never, 16, 1), true);
  assert.equal(updates[0]?.status, 'PENDING');
  assert.equal(updates[0]?.executionPhase, 'DEPLOY_APPROVED');
  assert.equal((audits[0]?.data as { action?: string }).action, 'DANNY_DEPLOY_APPROVED');
});

test('reporter acceptance closes a released ticket without queuing more implementation', async () => {
  const report = {
    ...source({ status: 'FIXED', implementationActiveJobId: null }),
    reporterStaffId: 1,
    startedAt: null,
    resolvedAt: new Date(),
  };
  const job = {
    id: 'released-job',
    reportId: 16,
    status: 'RELEASED',
    executionPhase: 'AWAITING_REPORTER_ACCEPTANCE',
  };
  const jobUpdates: Array<Record<string, unknown>> = [];
  const reportUpdates: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const comments: Array<Record<string, unknown>> = [];
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => report },
        crmInboxImplementationJob: { findFirst: async () => job },
        $transaction: async (callback: (tx: unknown) => Promise<void>) =>
          callback({
            crmInboxImplementationJob: {
              updateMany: async (input: { data: Record<string, unknown> }) => {
                jobUpdates.push(input.data);
                return { count: 1 };
              },
            },
            crmBugReport: {
              updateMany: async (input: { data: Record<string, unknown> }) => {
                reportUpdates.push(input.data);
                return { count: 1 };
              },
            },
            crmBugReportAudit: { create: async (input: Record<string, unknown>) => audits.push(input) },
            crmBugReportComment: { create: async (input: Record<string, unknown>) => comments.push(input) },
          }),
      },
    },
  };

  await InboxImplementationService.reviewReporterAcceptance(fastify as never, 16, 1, { decision: 'APPROVE' });

  assert.deepEqual(jobUpdates[0], { executionPhase: 'ACCEPTED' });
  assert.equal(reportUpdates[0]?.status, 'CLOSED');
  assert.equal(audits[0]?.data && (audits[0].data as { action?: string }).action, 'REPORTER_IMPLEMENTATION_ACCEPTED');
  assert.equal(comments.length, 1);
});

test('Danny reopen requires a note and does not create an implementation job', async () => {
  await assert.rejects(
    () => InboxImplementationService.reviewReporterAcceptance({} as never, 16, 1, { decision: 'REOPEN' }),
    /cần mô tả/i
  );
});
