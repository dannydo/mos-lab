import assert from 'node:assert/strict';
import test from 'node:test';
import { BugReportService } from './bug-report.service.js';
import { InboxFollowUpService, resolveInboxFollowUpCompletion } from './inbox-follow-up.service.js';

test('a reopen requires a deliberate re-analysis; NO_OP cannot auto-ready it', () => {
  assert.throws(() => resolveInboxFollowUpCompletion('NO_OP', 'PENDING_AGENT', 'REPORTER_REOPENED'), /re-analysis/i);
  assert.throws(
    () => resolveInboxFollowUpCompletion('PROGRESS_REVIEWED', 'PENDING_AGENT', 'REPORTER_REOPENED'),
    /re-analysis/i
  );
  assert.deepEqual(resolveInboxFollowUpCompletion('REANALYSIS_CONFIRMED', 'PENDING_AGENT', 'REPORTER_REOPENED'), {
    resultAction: 'REANALYSIS_CONFIRMED',
    confirmClarity: true,
  });
  assert.deepEqual(resolveInboxFollowUpCompletion('PROGRESS_REVIEWED', 'PENDING_AGENT', 'CREATED'), {
    resultAction: 'PROGRESS_REVIEWED',
    confirmClarity: true,
  });
  assert.deepEqual(resolveInboxFollowUpCompletion('NO_OP', 'PENDING_AGENT', 'CREATED'), {
    resultAction: 'NO_OP',
    confirmClarity: false,
  });
  assert.deepEqual(resolveInboxFollowUpCompletion('ASK_REPORTER', 'PENDING_AGENT', 'REPORTER_REOPENED'), {
    resultAction: 'ASK_REPORTER',
    confirmClarity: false,
  });
});

test('a claimed reopen carries its immutable reporter reason to the worker', async () => {
  const reopen = {
    auditId: 99,
    reason: 'Nút lưu vẫn không lưu dữ liệu.',
    reopenedAt: '2026-09-03T08:00:00.000Z',
    intent: 'UNCHANGED' as const,
    originalEvidence: [{ id: 701, fileName: 'save-still-fails.png', mimeType: 'image/png', sizeBytes: 128 }],
    knownContext: {
      sourcePath: '/dashboard',
      browser: 'Chrome 151',
      viewport: { width: 3027, height: 1638, devicePixelRatio: 1.25 },
      themeMode: 'light' as const,
      priorResolution: null,
    },
  };
  const job = {
    id: 'follow-up-1',
    eventKind: 'REPORTER_REOPENED',
    eventContextJson: JSON.stringify({ reopen }),
    updatedAt: new Date('2026-09-03T08:00:01.000Z'),
    attemptCount: 0,
    report: {
      id: 17,
      requestType: 'BUG',
      title: 'Save button regression',
      description: 'Save does not persist.',
      status: 'NEW',
      clarificationStatus: 'PENDING_AGENT',
      clarificationSummary: null,
      sourcePath: '/dashboard',
      comments: [],
    },
  };
  const fastify = {
    prisma: {
      crm: {
        crmInboxFollowUpJob: {
          updateMany: async () => ({ count: 1 }),
          findFirst: async () => job,
        },
      },
    },
  };
  const claimed = await InboxFollowUpService.claim(fastify as never, 'test-worker');
  assert.deepEqual(claimed?.context.reopen, reopen);
});

test('a reopen snapshots only original report evidence in its durable follow-up context', async () => {
  const capture: { value: Record<string, unknown> | null } = { value: null };
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: {
          findUnique: async () => ({
            id: 17,
            status: 'NEW',
            sourcePath: '/dashboard/inbox',
            contextJson: JSON.stringify({
              userAgent: 'Mozilla/5.0 Chrome/151.0.0.0',
              viewport: { width: 3027, height: 1638, devicePixelRatio: 1.25 },
              themeMode: 'light',
            }),
            resolution: {
              solutionSummary: 'Đã dùng container full width.',
              verificationSummary: 'Đã kiểm tra tại zoom 125% và 150%.',
            },
            audits: [],
            attachments: [
              {
                id: 701,
                commentId: null,
                originalName: 'original.png',
                mimeType: 'image/png',
                sizeBytes: 128,
                deletedAt: null,
              },
              {
                id: 702,
                commentId: 3,
                originalName: 'later-comment.png',
                mimeType: 'image/png',
                sizeBytes: 256,
                deletedAt: null,
              },
              {
                id: 703,
                commentId: null,
                originalName: 'deleted.png',
                mimeType: 'image/png',
                sizeBytes: 256,
                deletedAt: new Date(),
              },
            ],
          }),
        },
        crmBugReportAudit: {
          findFirst: async () => ({
            id: 99,
            note: 'Hai ảnh ban đầu vẫn cho thấy lỗi.',
            createdAt: new Date('2026-09-03T08:00:00.000Z'),
          }),
        },
        crmInboxFollowUpJob: { create: async ({ data }: { data: Record<string, unknown> }) => (capture.value = data) },
      },
    },
  };
  assert.equal(await InboxFollowUpService.enqueue(fastify as never, 17, 'REPORTER_REOPENED', 'ignored'), true);
  assert.ok(capture.value);
  assert.deepEqual(JSON.parse(String(capture.value.eventContextJson)).reopen.originalEvidence, [
    { id: 701, fileName: 'original.png', mimeType: 'image/png', sizeBytes: 128 },
  ]);
  assert.deepEqual(JSON.parse(String(capture.value.eventContextJson)).reopen.knownContext, {
    sourcePath: '/dashboard/inbox',
    browser: 'Mozilla/5.0 Chrome/151.0.0.0',
    viewport: { width: 3027, height: 1638, devicePixelRatio: 1.25 },
    themeMode: 'light',
    priorResolution: {
      solutionSummary: 'Đã dùng container full width.',
      verificationSummary: 'Đã kiểm tra tại zoom 125% và 150%.',
    },
  });
  assert.equal(capture.value.eventVersion, 'reopen:99');
});

test('a legacy reopen completed as NO_OP is automatically requeued once for strict re-analysis', async () => {
  const created: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const fastify = {
    prisma: {
      crm: {
        crmInboxFollowUpJob: {
          findFirst: async ({ where }: { where: { status?: string } }) =>
            where.status === 'COMPLETED' ? { reportId: 17 } : null,
          updateMany: async () => ({ count: 0 }),
          create: async ({ data }: { data: Record<string, unknown> }) => created.push(data),
        },
        crmBugReport: {
          findUnique: async () => ({
            id: 17,
            status: 'NEW',
            audits: [],
            attachments: [
              {
                id: 701,
                commentId: null,
                originalName: 'original.png',
                mimeType: 'image/png',
                sizeBytes: 128,
                deletedAt: null,
              },
            ],
          }),
        },
        crmBugReportAudit: {
          findFirst: async () => ({
            id: 99,
            note: 'Hai ảnh gốc vẫn cho thấy lỗi.',
            createdAt: new Date('2026-09-03T08:00:00.000Z'),
          }),
          create: async ({ data }: { data: Record<string, unknown> }) => audits.push(data),
        },
      },
    },
  };

  assert.equal(await InboxFollowUpService.claim(fastify as never, 'test-worker'), null);
  assert.equal(created.length, 1);
  assert.equal(created[0]?.eventVersion, 'reopen-reanalysis:99');
  assert.deepEqual(JSON.parse(String(created[0]?.eventContextJson)).reopen.originalEvidence, [
    { id: 701, fileName: 'original.png', mimeType: 'image/png', sizeBytes: 128 },
  ]);
  assert.equal(audits[0]?.action, 'SYSTEM_REOPEN_REANALYSIS_REQUEUED');
});

test('a leased reopen attachment is constrained to the immutable original-evidence snapshot', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmInboxFollowUpJob: {
          findFirst: async () => ({
            reportId: 17,
            eventContextJson: JSON.stringify({
              reopen: {
                auditId: 99,
                reason: 'Nút lưu vẫn không lưu dữ liệu.',
                reopenedAt: '2026-09-03T08:00:00.000Z',
                intent: 'DETAILS',
                originalEvidence: [
                  { id: 701, fileName: 'save-still-fails.png', mimeType: 'image/png', sizeBytes: 128 },
                ],
                knownContext: {
                  sourcePath: '/dashboard',
                  browser: '',
                  viewport: { width: 0, height: 0, devicePixelRatio: 1 },
                  themeMode: 'unknown',
                  priorResolution: null,
                },
              },
            }),
          }),
        },
        crmBugReportAttachment: { findFirst: async () => null },
      },
    },
  };
  // Storage is deliberately not reached in this unit: a fake path must become
  // the same safe unavailable-evidence outcome instead of leaking the path.
  await assert.rejects(
    InboxFollowUpService.originalEvidenceAttachment(fastify as never, 'follow-up-1', 'lease-1', 701),
    (error: unknown) => error instanceof Error && /không còn khả dụng/i.test(error.message)
  );
});

test('a visible Inbox review records progress and changes PENDING_AGENT to READY', async () => {
  const before = {
    id: 14,
    requestType: 'BUG',
    requestMetadataJson: null,
    status: 'NEW',
    priority: null,
    businessContext: null,
    triageNote: null,
    clarificationStatus: 'PENDING_AGENT',
    clarificationSummary: null,
    clarifiedAt: null,
    duplicateOfId: null,
    approvedByStaffId: null,
    approvedAt: null,
    startedAt: null,
    resolvedAt: null,
    closedAt: null,
  };
  const updates: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const transaction = {
    crmBugReport: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return { ...before, ...data };
      },
    },
    crmBugReportAudit: { create: async ({ data }: { data: Record<string, unknown> }) => audits.push(data) },
  };
  const fastify = {
    prisma: {
      crm: {
        crmBugReport: { findUnique: async () => before },
        $transaction: async (callback: (tx: typeof transaction) => Promise<void>) => callback(transaction),
      },
    },
  };

  assert.equal(
    await BugReportService.markInboxFollowUpReviewed(
      fastify as never,
      'MOS-BUG-14',
      'Đã xem theo sự kiện; ticket đã đủ thông tin để Danny duyệt.'
    ),
    true
  );
  assert.equal(updates[0]?.clarificationStatus, 'READY');
  assert.equal(audits[0]?.action, 'AGENT_PROGRESS_CHECKING_BUSINESS_LOGIC');
});
