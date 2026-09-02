import assert from 'node:assert/strict';
import test from 'node:test';
import { BugReportService } from './bug-report.service.js';
import { resolveInboxFollowUpCompletion } from './inbox-follow-up.service.js';

test('a no-question follow-up cannot leave an Agent-needed ticket pending', () => {
  assert.deepEqual(resolveInboxFollowUpCompletion('NO_OP', 'PENDING_AGENT'), {
    resultAction: 'PROGRESS_REVIEWED',
    confirmClarity: true,
  });
  assert.deepEqual(resolveInboxFollowUpCompletion('PROGRESS_REVIEWED', 'PENDING_AGENT'), {
    resultAction: 'PROGRESS_REVIEWED',
    confirmClarity: true,
  });
  assert.deepEqual(resolveInboxFollowUpCompletion('NO_OP', 'READY'), {
    resultAction: 'NO_OP',
    confirmClarity: false,
  });
  assert.deepEqual(resolveInboxFollowUpCompletion('ASK_REPORTER', 'PENDING_AGENT'), {
    resultAction: 'ASK_REPORTER',
    confirmClarity: false,
  });
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
