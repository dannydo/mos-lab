import assert from 'node:assert/strict';
import test from 'node:test';
import type { InboxIdeReleaseToken } from '@mos-lab/shared';
import { InboxIdeReleaseService } from './inbox-ide-release.service.js';
import { makeReleaseManifest, readReleaseManifest } from './inbox-release-manifest.js';
import { inboxImplementationSourceVersion } from './inbox-implementation-version.js';
import { bugReportAgentProgress, bugReportWorkflowProjection } from './bug-report.service.js';
import { InboxImplementationError, InboxImplementationService } from './inbox-implementation.service.js';

const COMMIT = 'a'.repeat(40);
type Audit = {
  id: number;
  reportId: number;
  action: string;
  actorStaffId: number | null;
  afterJson: string | null;
  createdAt: Date;
  note: string | null;
};
type Query = { where: { action?: string; afterJson?: { contains: string } } };

function fixture() {
  const report = {
    id: 29,
    requestType: 'FEATURE',
    title: 'Synthetic IDE release',
    description: 'Synthetic scope',
    status: 'IN_PROGRESS',
    priority: 'P1',
    clarificationStatus: 'READY',
    clarificationSummary: 'Clear',
    businessContext: null,
    triageNote: null,
    sourcePath: '/dashboard/bug-reports',
    reporterStaffId: 7,
    implementationActiveJobId: 'test-job',
    implementationApprovedAt: new Date('2026-09-07T01:00:00.000Z'),
    implementationApprovalSourceVersion: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: new Date(),
    startedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
    comments: [],
  };
  report.implementationApprovalSourceVersion = inboxImplementationSourceVersion(report);
  const plan = {
    id: 'test-plan',
    status: 'COMPLETED',
    resultAction: 'POST_PLAN',
    sourceVersion: report.implementationApprovalSourceVersion,
    planVersion: 'v1:p',
  };
  const tests = [{ command: 'pnpm verify', status: 'PASSED' as const }];
  const job = {
    id: 'test-job',
    reportId: 29,
    sourceVersion: plan.sourceVersion,
    planVersion: plan.planVersion,
    status: 'AWAITING_DEPLOY_REVIEW',
    executionPhase: 'AWAITING_DEPLOY_REVIEW',
    leaseToken: null,
    commitSha: COMMIT as string | null,
    changedFilesJson: JSON.stringify(['apps/api/src/example.ts']),
    testsJson: JSON.stringify(tests),
    failureCode: null,
  };
  const manifest = makeReleaseManifest({
    reportId: 29,
    jobId: job.id,
    sourceVersion: job.sourceVersion,
    planVersion: job.planVersion,
    baseCommit: 'b'.repeat(40),
    patchHash: 'c'.repeat(64),
    changedFiles: JSON.parse(job.changedFilesJson),
    tests,
  })!;
  const binding = {
    jobId: job.id,
    manifestDigest: manifest.digest,
    sourceVersion: job.sourceVersion,
    planVersion: job.planVersion,
    reviewAuditId: 20,
  };
  const audit = (id: number, action: string, after: unknown): Audit => ({
    id,
    reportId: 29,
    action,
    actorStaffId: 1,
    afterJson: JSON.stringify(after),
    createdAt: new Date(),
    note: null,
  });
  const state = {
    report,
    plan,
    job,
    audits: [
      audit(10, 'IMPLEMENTATION_APPROVED', {
        implementationApprovalSourceVersion: job.sourceVersion,
        implementationApprovedAt: '2026-09-07T01:00:00.123Z',
      }),
      audit(20, 'AGENT_IMPLEMENTATION_REVIEW_READY', { releaseManifest: manifest }),
      audit(30, 'DANNY_COMMIT_APPROVED', { releaseApproval: { ...binding, commitSha: null } }),
      audit(40, 'DANNY_DEPLOY_APPROVED', { releaseApproval: { ...binding, commitSha: COMMIT } }),
    ],
    comments: [] as unknown[],
    notifications: [] as unknown[],
    resolutions: [] as unknown[],
  };
  let failure: 'notification' | 'transition' | null = null;
  let authorized = true;
  let queue = Promise.resolve();
  const read = () => structuredClone({ ...state.report, inboxPlanJobs: [state.plan] });
  const findAudits = ({ where }: Query) =>
    state.audits
      .filter(
        (a) =>
          (!where.action || a.action === where.action) &&
          (!where.afterJson || a.afterJson?.includes(where.afterJson.contains))
      )
      .sort((a, b) => b.id - a.id);
  const actor = () => ({
    id: 1,
    isActive: true,
    role: authorized ? 'super_admin' : 'manager',
    username: 'danhdo@gmail.com',
    email: 'danhdo@gmail.com',
  });
  const db = {
    $queryRaw: async () => [],
    crmStaff: { findUnique: async () => actor(), findMany: async () => [actor()] },
    crmBugReport: {
      findUnique: async () => read(),
      updateMany: async ({ data }: { data: object }) => {
        if (failure === 'transition') throw new InboxImplementationError('transition failed', 409);
        Object.assign(state.report, data);
        return { count: 1 };
      },
    },
    crmInboxImplementationJob: {
      findUnique: async () => structuredClone(state.job),
      findFirst: async () => structuredClone(state.job),
      updateMany: async ({ data }: { data: object }) => {
        Object.assign(state.job, data);
        return { count: 1 };
      },
    },
    crmBugReportAudit: {
      findMany: async (q: Query) => structuredClone(findAudits(q)),
      findFirst: async (q: Query) => structuredClone(findAudits(q)[0] || null),
      create: async ({ data }: { data: Omit<Audit, 'id' | 'createdAt'> }) => {
        const item = { ...data, id: state.audits.length + 100, createdAt: new Date() };
        state.audits.push(item);
        return item;
      },
    },
    crmBugReportResolution: {
      upsert: async (data: unknown) => {
        state.resolutions.push(data);
      },
    },
    crmBugReportComment: {
      findMany: async () => [],
      create: async (data: unknown) => {
        state.comments.push(data);
      },
    },
    crmBugReportNotification: {
      create: async (data: unknown) => {
        if (failure === 'notification') throw new Error('notification failed');
        state.notifications.push(data);
      },
    },
  };
  const fastify = {
    prisma: {
      crm: {
        ...db,
        $transaction: async <T>(callback: (tx: typeof db) => Promise<T>) => {
          const previous = queue;
          let unlock!: () => void;
          queue = new Promise<void>((resolve) => {
            unlock = resolve;
          });
          await previous;
          const before = structuredClone(state);
          try {
            return await callback(db);
          } catch (error) {
            Object.assign(state, before);
            throw error;
          } finally {
            unlock();
          }
        },
      },
    },
  } as never;
  const verify = async () => ({ apiRelease: COMMIT, webRelease: null });
  const preview = () => InboxIdeReleaseService.preview(fastify, 29, verify);
  const record = (token: InboxIdeReleaseToken | null) =>
    InboxIdeReleaseService.record(fastify, 29, 1, { acknowledged: true, token }, verify);
  const recordDirect = () => InboxIdeReleaseService.recordDirectTechnicalHotfix(fastify, 29, 1, COMMIT, verify);
  return {
    state,
    manifest,
    fastify,
    preview,
    record,
    recordDirect,
    setFailure: (value: typeof failure) => {
      failure = value;
    },
    deny: () => {
      authorized = false;
    },
  };
}

test('IDE checkpoint is atomic, truthful and idempotent under concurrent submissions; projections agree', async () => {
  const f = fixture();
  const oldMarker = process.env.DEPLOY_COMMIT;
  process.env.DEPLOY_COMMIT = COMMIT;
  try {
    const p = await f.preview();
    assert.equal(p.eligible, true);
    const oldHistory = structuredClone(f.state.audits);
    await Promise.all([f.record(p.token), f.record(p.token), f.record(p.token)]);
    assert.equal(f.state.report.status, 'FIXED');
    assert.equal(f.state.job.status, 'RELEASED');
    assert.equal(f.state.report.closedAt, null);
    assert.equal(f.state.report.implementationActiveJobId, null);
    assert.equal(f.state.notifications.length, 1);
    assert.equal(f.state.resolutions.length, 1);
    assert.equal(f.state.comments.length, 1);
    assert.deepEqual(f.state.audits.slice(0, 4), oldHistory);
    const success = f.state.audits.filter((a) => a.action === 'IDE_RELEASE_RECORDED');
    assert.equal(success.length, 1);
    assert.equal(JSON.parse(success[0].afterJson!).source, 'IDE');
    assert.equal(JSON.parse(success[0].afterJson!).recordedByStaffId, 1);
    assert.deepEqual(JSON.parse(success[0].afterJson!).approvalActors, [1, 1, 1]);
    const source = { ...f.state.report, audits: f.state.audits, implementation: null };
    assert.equal(bugReportAgentProgress(source as never).stage, 'AWAITING_REPORTER_ACCEPTANCE');
    assert.equal(bugReportWorkflowProjection(source as never).nextAction.actor, 'REPORTER');
    f.state.report.status = 'APPROVED';
    await assert.rejects(f.record(p.token), { code: 'IDE_RECEIPT_STALE' });
  } finally {
    if (oldMarker === undefined) delete process.env.DEPLOY_COMMIT;
    else process.env.DEPLOY_COMMIT = oldMarker;
  }
});

test('direct technical hotfix uses the same checkpoint, fails closed, and retries without duplicate effects', async () => {
  const f = fixture();
  f.state.job.status = 'AWAITING_COMMIT_REVIEW';
  f.state.job.executionPhase = 'AWAITING_COMMIT_REVIEW';
  f.state.job.commitSha = null;
  f.state.audits = f.state.audits.filter(
    (audit) => !['DANNY_COMMIT_APPROVED', 'DANNY_DEPLOY_APPROVED'].includes(audit.action)
  );
  const oldMarker = process.env.DEPLOY_COMMIT;
  process.env.DEPLOY_COMMIT = COMMIT;
  try {
    await Promise.all([f.recordDirect(), f.recordDirect(), f.recordDirect()]);
    assert.equal(f.state.report.status, 'FIXED');
    assert.equal(f.state.report.implementationActiveJobId, null);
    assert.equal(f.state.job.status, 'RELEASED');
    assert.equal(f.state.comments.length, 1);
    assert.equal(f.state.notifications.length, 1);
    assert.equal(f.state.resolutions.length, 1);
    assert.equal(f.state.audits.filter((audit) => audit.action === 'DIRECT_TECHNICAL_HOTFIX_AUTHORIZED').length, 1);
    const release = f.state.audits.filter((audit) => audit.action === 'DIRECT_TECHNICAL_HOTFIX_RELEASE_RECORDED');
    assert.equal(release.length, 1);
    assert.equal(JSON.parse(release[0].afterJson!).source, 'TECHNICAL_HOTFIX');
    assert.equal(
      bugReportAgentProgress({ ...f.state.report, audits: f.state.audits, implementation: null } as never).stage,
      'AWAITING_REPORTER_ACCEPTANCE'
    );
    assert.equal(
      bugReportWorkflowProjection({ ...f.state.report, audits: f.state.audits, implementation: null } as never)
        .nextAction.actor,
      'REPORTER'
    );
  } finally {
    if (oldMarker === undefined) delete process.env.DEPLOY_COMMIT;
    else process.env.DEPLOY_COMMIT = oldMarker;
  }
});

test('missing/mismatched/current-plan/approval/test/manifest evidence is rejected with no success effects', async (t) => {
  const cases: Array<[string, (f: ReturnType<typeof fixture>) => void]> = [
    [
      'code approval',
      (f) => {
        f.state.audits = f.state.audits.filter((a) => a.id !== 10);
      },
    ],
    [
      'commit approval',
      (f) => {
        f.state.audits = f.state.audits.filter((a) => a.id !== 30);
      },
    ],
    [
      'deploy approval',
      (f) => {
        f.state.audits = f.state.audits.filter((a) => a.id !== 40);
      },
    ],
    [
      'manifest',
      (f) => {
        f.state.audits = f.state.audits.filter((a) => a.id !== 20);
      },
    ],
    [
      'cross ticket',
      (f) => {
        f.state.job.reportId = 27;
      },
    ],
    [
      'stale source',
      (f) => {
        f.state.report.description = 'different scope';
      },
    ],
    [
      'superseded plan',
      (f) => {
        f.state.plan.status = 'SUPERSEDED';
      },
    ],
    [
      'wrong plan',
      (f) => {
        f.state.job.planVersion = 'other';
      },
    ],
    [
      'unreviewed tests',
      (f) => {
        f.state.job.testsJson = JSON.stringify([{ command: 'other', status: 'PASSED' }]);
      },
    ],
    [
      'failed tests',
      (f) => {
        f.state.job.testsJson = JSON.stringify([{ command: 'pnpm verify', status: 'FAILED' }]);
      },
    ],
    [
      'different files',
      (f) => {
        f.state.job.changedFilesJson = '[]';
      },
    ],
    [
      'different commit',
      (f) => {
        f.state.job.commitSha = 'd'.repeat(40);
      },
    ],
    [
      'busy worker',
      (f) => {
        f.state.job.status = 'RUNNING';
      },
    ],
    [
      'unauthorized approver',
      (f) => {
        f.state.audits[2].actorStaffId = 99;
      },
    ],
  ];
  for (const [name, mutate] of cases)
    await t.test(name, async () => {
      const f = fixture();
      const before = await f.preview();
      mutate(f);
      assert.equal((await f.preview()).eligible, false);
      await assert.rejects(f.record(before.token));
      await assert.rejects(f.record(before.token));
      assert.equal(f.state.report.status, 'IN_PROGRESS');
      assert.equal(f.state.comments.length, 0);
      assert.equal(f.state.notifications.length, 0);
      assert.equal(f.state.resolutions.length, 0);
      assert.equal(f.state.audits.filter((a) => a.action === 'IDE_RELEASE_REJECTED').length, 1);
      assert.equal(f.state.audits.filter((a) => a.action === 'IDE_RELEASE_RECORDED').length, 0);
    });
});

test('newest review cannot revive approvals from an older valid candidate', async (t) => {
  const cases = [
    ['malformed review', () => '{', 'IDE_MANIFEST_MISSING'],
    ['missing manifest', () => '{}', 'IDE_MANIFEST_MISSING'],
    [
      'corrupt manifest',
      (f: ReturnType<typeof fixture>) =>
        JSON.stringify({ releaseManifest: { ...f.manifest, patchHash: '0'.repeat(64) } }),
      'IDE_MANIFEST_MISSING',
    ],
    [
      'different candidate',
      (f: ReturnType<typeof fixture>) => {
        const { version: _version, digest: _digest, ...content } = f.manifest;
        return JSON.stringify({ releaseManifest: makeReleaseManifest({ ...content, jobId: 'other-job' }) });
      },
      'IDE_MANIFEST_MISSING',
    ],
    [
      'new review of identical manifest without fresh approvals',
      (f: ReturnType<typeof fixture>) => JSON.stringify({ releaseManifest: f.manifest }),
      'IDE_APPROVAL_BINDING_MISSING',
    ],
  ] as const;
  for (const [name, afterJson, code] of cases) {
    await t.test(name, async () => {
      const f = fixture();
      const preview = await f.preview();
      assert.equal(preview.eligible, true);
      f.state.audits.push({ ...f.state.audits[1], id: 50, afterJson: afterJson(f) });
      const history = structuredClone(f.state.audits);
      assert.equal((await f.preview()).code, code);
      await Promise.all([
        assert.rejects(f.record(preview.token), { code }),
        assert.rejects(f.record(preview.token), { code }),
      ]);
      assert.deepEqual(f.state.audits.slice(0, history.length), history);
      assert.equal(f.state.audits.filter((a) => a.action === 'IDE_RELEASE_REJECTED').length, 1);
      assert.equal(f.state.audits.filter((a) => a.action === 'IDE_RELEASE_RECORDED').length, 0);
      assert.equal(f.state.report.status, 'IN_PROGRESS');
      assert.equal(f.state.job.status, 'AWAITING_DEPLOY_REVIEW');
      assert.equal(f.state.comments.length, 0);
      assert.equal(f.state.notifications.length, 0);
      assert.equal(f.state.resolutions.length, 0);
    });
  }
});

test('unexpected or domain write failure rolls back every mutation, including success audit', async () => {
  const marker = process.env.DEPLOY_COMMIT;
  process.env.DEPLOY_COMMIT = COMMIT;
  try {
    for (const failure of ['notification', 'transition'] as const) {
      const f = fixture();
      const p = await f.preview();
      const before = structuredClone(f.state);
      f.setFailure(failure);
      await assert.rejects(f.record(p.token));
      assert.deepEqual(f.state, before);
    }
  } finally {
    if (marker === undefined) delete process.env.DEPLOY_COMMIT;
    else process.env.DEPLOY_COMMIT = marker;
  }
});

test('service authorization, explicit confirmation and exact preview token cannot be bypassed', async () => {
  const f = fixture();
  const p = await f.preview();
  await assert.rejects(f.record({ ...p.token!, manifestDigest: 'bad' }), { code: 'IDE_PREVIEW_CHANGED' });
  await assert.rejects(f.record(null), { code: 'IDE_PREVIEW_CHANGED' });
  f.deny();
  await assert.rejects(f.record(p.token), { statusCode: 403 });
  assert.equal(f.state.notifications.length, 0);
  await assert.rejects(InboxIdeReleaseService.record(f.fastify, 29, 1, {} as never), { statusCode: 422 });
});

test('manifest is immutable and rejects missing content proof', () => {
  const f = fixture();
  assert.deepEqual(readReleaseManifest(JSON.stringify({ releaseManifest: f.manifest })), f.manifest);
  assert.equal(
    readReleaseManifest(JSON.stringify({ releaseManifest: { ...f.manifest, patchHash: '0'.repeat(64) } })),
    null
  );
  assert.equal(makeReleaseManifest({ ...f.manifest, patchHash: '' }), null);
});

test('real native commit/deploy approval methods persist the exact reviewed manifest binding', async () => {
  const f = fixture();
  f.state.audits = f.state.audits.filter((a) => a.id <= 20);
  f.state.job.status = 'AWAITING_COMMIT_REVIEW';
  assert.equal(await InboxImplementationService.approveCommit(f.fastify, 29, 1), true);
  const commit = f.state.audits.find((a) => a.action === 'DANNY_COMMIT_APPROVED')!;
  assert.equal(JSON.parse(commit.afterJson!).releaseApproval.manifestDigest, f.manifest.digest);
  f.state.job.status = 'AWAITING_DEPLOY_REVIEW';
  assert.equal(await InboxImplementationService.approveDeploy(f.fastify, 29, 1), true);
  const deploy = f.state.audits.find((a) => a.action === 'DANNY_DEPLOY_APPROVED')!;
  assert.equal(JSON.parse(deploy.afterJson!).releaseApproval.commitSha, COMMIT);
  assert.equal(JSON.parse(deploy.afterJson!).releaseApproval.reviewAuditId, 20);
  f.state.job.status = 'AWAITING_DEPLOY_REVIEW';
  assert.equal((await f.preview()).eligible, true);
});
