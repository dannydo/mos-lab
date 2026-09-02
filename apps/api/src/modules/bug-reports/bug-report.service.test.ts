import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBugReportKey } from '@mos-lab/shared';
import {
  assertBugReportTransition,
  assertAgentProgressUpdateAllowed,
  bugReportAgentProgress,
  bugReportClarificationWhere,
  bugReportCompletionPath,
  bugReportNextAction,
  bugReportNextActorWhere,
  isAgentReadableBugStatus,
  knowledgeTokens,
  normalizeAgentResolution,
  normalizeFeatureRequestContext,
  parseBugReportKey,
  sanitizeBugReportContext,
} from './bug-report.service.js';

function progressSource(
  overrides: Partial<Parameters<typeof bugReportAgentProgress>[0]> = {}
): Parameters<typeof bugReportAgentProgress>[0] {
  const createdAt = new Date('2026-08-31T01:00:00.000Z');
  return {
    status: 'NEW',
    clarificationStatus: 'PENDING_AGENT',
    createdAt,
    approvedAt: null,
    startedAt: null,
    resolvedAt: null,
    closedAt: null,
    updatedAt: createdAt,
    audits: [],
    ...overrides,
  };
}

test('projects every Agent milestone from canonical ticket state and audit activity', () => {
  const agentAt = new Date('2026-08-31T01:05:00.000Z');
  assert.equal(bugReportAgentProgress(progressSource()).stage, 'NOT_VIEWED');
  assert.deepEqual(
    bugReportAgentProgress(
      progressSource({
        audits: [{ action: 'AGENT_PROGRESS_ANALYZING', note: 'Đang phân tích.', createdAt: agentAt }],
      })
    ),
    { stage: 'ANALYZING', note: 'Đang phân tích.', updatedAt: agentAt.toISOString() }
  );
  assert.equal(
    bugReportAgentProgress(progressSource({ clarificationStatus: 'WAITING_REPORTER', updatedAt: agentAt })).stage,
    'WAITING_REPORTER'
  );
  assert.equal(
    bugReportAgentProgress(
      progressSource({
        audits: [{ action: 'CLARIFICATION_ANSWERED', note: 'Đã bổ sung ảnh.', createdAt: agentAt }],
      })
    ).stage,
    'REPORTER_REPLIED'
  );
  assert.equal(bugReportAgentProgress(progressSource({ clarificationStatus: 'READY' })).stage, 'READY_FOR_TRIAGE');
  assert.equal(
    bugReportAgentProgress(progressSource({ status: 'APPROVED', clarificationStatus: 'READY', approvedAt: agentAt }))
      .stage,
    'QUEUED_FOR_FIX'
  );
  assert.equal(
    bugReportAgentProgress(progressSource({ status: 'IN_PROGRESS', clarificationStatus: 'READY', startedAt: agentAt }))
      .stage,
    'IMPLEMENTING'
  );
  assert.equal(
    bugReportAgentProgress(
      progressSource({
        status: 'IN_PROGRESS',
        clarificationStatus: 'READY',
        startedAt: agentAt,
        audits: [{ action: 'AGENT_PROGRESS_VERIFYING', note: 'Đang chạy test.', createdAt: agentAt }],
      })
    ).stage,
    'VERIFYING'
  );
  assert.equal(
    bugReportAgentProgress(
      progressSource({
        status: 'IN_PROGRESS',
        clarificationStatus: 'READY',
        startedAt: agentAt,
        audits: [
          { action: 'AGENT_PROGRESS_VERIFYING', note: 'Đang chạy test.', createdAt: agentAt },
          {
            action: 'REPORTER_REOPENED',
            note: 'Vẫn chưa đúng.',
            createdAt: new Date('2026-08-31T01:10:00.000Z'),
          },
        ],
      })
    ).stage,
    'REOPENED_BY_REPORTER'
  );
  assert.deepEqual(
    bugReportAgentProgress(
      progressSource({
        status: 'FIXED',
        clarificationStatus: 'READY',
        resolvedAt: agentAt,
        audits: [
          {
            action: 'AGENT_PROGRESS_VERIFYING',
            note: 'Đang chạy test.',
            createdAt: new Date('2026-08-31T01:04:00.000Z'),
          },
        ],
      })
    ),
    {
      stage: 'AWAITING_REPORTER_REVIEW',
      note: 'Agent đã hoàn tất bản sửa và gửi người báo xác nhận.',
      updatedAt: agentAt.toISOString(),
    }
  );
  assert.equal(bugReportAgentProgress(progressSource({ status: 'CLOSED', closedAt: agentAt })).stage, 'COMPLETED');
});

test('allows fix progress only after clarity, approval, and priority are present', () => {
  assert.doesNotThrow(() =>
    assertAgentProgressUpdateAllowed({
      stage: 'CHECKING_BUSINESS_LOGIC',
      status: 'NEW',
      clarificationStatus: 'PENDING_AGENT',
      priority: null,
    })
  );
  assert.doesNotThrow(() =>
    assertAgentProgressUpdateAllowed({
      stage: 'IMPLEMENTING',
      status: 'APPROVED',
      clarificationStatus: 'READY',
      priority: 'P1',
    })
  );
  assert.throws(
    () =>
      assertAgentProgressUpdateAllowed({
        stage: 'IMPLEMENTING',
        status: 'APPROVED',
        clarificationStatus: 'WAITING_REPORTER',
        priority: 'P1',
      }),
    /chưa thể sửa/i
  );
  assert.throws(
    () =>
      assertAgentProgressUpdateAllowed({
        stage: 'VERIFYING',
        status: 'NEW',
        clarificationStatus: 'READY',
        priority: null,
      }),
    /chưa được duyệt/i
  );
});

test('maps clarification tracking filters to canonical database states', () => {
  assert.deepEqual(bugReportClarificationWhere(undefined), {});
  assert.deepEqual(bugReportClarificationWhere('ALL'), {});
  assert.deepEqual(bugReportClarificationWhere('INVALID'), {});
  assert.deepEqual(bugReportClarificationWhere('UNCLEAR'), {
    clarificationStatus: { in: ['PENDING_AGENT', 'WAITING_REPORTER'] },
  });
  assert.deepEqual(bugReportClarificationWhere('PENDING_AGENT'), { clarificationStatus: 'PENDING_AGENT' });
  assert.deepEqual(bugReportClarificationWhere('WAITING_REPORTER'), { clarificationStatus: 'WAITING_REPORTER' });
  assert.deepEqual(bugReportClarificationWhere('READY'), { clarificationStatus: 'READY' });
});

test('derives one canonical next owner and action for every workflow gate', () => {
  assert.equal(bugReportNextAction(progressSource()).actor, 'AGENT');
  assert.equal(
    bugReportNextAction(progressSource({ clarificationStatus: 'WAITING_REPORTER' })).type,
    'ANSWER_CLARIFICATION'
  );
  assert.equal(bugReportNextAction(progressSource({ clarificationStatus: 'READY' })).actor, 'DANNY');
  assert.equal(
    bugReportNextAction(progressSource({ status: 'APPROVED', clarificationStatus: 'READY' })).type,
    'IMPLEMENT'
  );
  assert.equal(
    bugReportNextAction(
      progressSource({
        status: 'IN_PROGRESS',
        clarificationStatus: 'READY',
        audits: [
          {
            action: 'REPORTER_REOPENED',
            note: 'Vẫn sai.',
            createdAt: new Date('2026-08-31T01:10:00.000Z'),
          },
        ],
      })
    ).type,
    'REWORK'
  );
  assert.equal(bugReportNextAction(progressSource({ status: 'FIXED' })).type, 'REVIEW_RESULT');
  assert.equal(bugReportNextAction(progressSource({ status: 'CLOSED' })).actor, 'NONE');
});

test('maps next-owner filters to the same workflow gates used by projections', () => {
  assert.deepEqual(bugReportNextActorWhere('DANNY'), { status: 'NEW', clarificationStatus: 'READY' });
  assert.deepEqual(bugReportNextActorWhere('NONE'), {
    status: { in: ['CLOSED', 'REJECTED', 'DUPLICATE'] },
  });
  assert.deepEqual(bugReportNextActorWhere('ALL'), {});
  assert.ok('OR' in bugReportNextActorWhere('REPORTER'));
  assert.ok('OR' in bugReportNextActorWhere('AGENT'));
});

test('sanitizes query values and never retains sensitive inputs', () => {
  const context = sanitizeBugReportContext({
    path: '/dashboard/customers?token=secret',
    query: {
      customerId: '123',
      phone: '0909000000',
      search: 'Nguyễn Văn A',
      accessToken: 'abc.def.ghi',
    },
    recentApiFailures: [
      {
        occurredAt: '2026-08-30T12:00:00.000Z',
        method: 'get',
        url: '/customers?phone=0909000000&customerId=123',
        status: 500,
        message: 'Bearer abc.def.ghi failed for danny@example.com phone=0909000000 token=eyJabcdefgh.ijklmnop.qrstuvwx',
      },
    ],
  });

  assert.equal(context.path, '/dashboard/customers');
  assert.equal(context.query.customerId, '123');
  assert.equal(context.query.phone, '[REDACTED]');
  assert.equal(context.query.search, '[REDACTED]');
  assert.equal(context.query.accessToken, '[REDACTED]');
  assert.match(context.recentApiFailures[0].url, /phone=%5BREDACTED%5D/);
  assert.doesNotMatch(context.recentApiFailures[0].message, /abc\.def\.ghi/);
  assert.doesNotMatch(context.recentApiFailures[0].message, /danny@example\.com|0909000000|eyJabcdefgh/);
});

test('clips diagnostics and accepts canonical bug and feature keys', () => {
  const context = sanitizeBugReportContext({
    overlays: Array.from({ length: 20 }, (_, index) => `Popup ${index}`),
    recentClientErrors: Array.from({ length: 20 }, (_, index) => ({ name: 'Error', message: `Failure ${index}` })),
  });
  assert.equal(context.overlays.length, 10);
  assert.equal(context.recentClientErrors.length, 10);
  assert.equal(parseBugReportKey('MOS-BUG-42'), 42);
  assert.equal(parseBugReportKey('MOS-FEAT-43'), 43);
  assert.equal(formatBugReportKey(43, 'FEATURE'), 'MOS-FEAT-43');
  assert.throws(() => parseBugReportKey('MOS-BUG-x'), /không hợp lệ/);
});

test('normalizes structured feature context before persistence', () => {
  assert.deepEqual(
    normalizeFeatureRequestContext({
      reason: '  Giảm thao tác nhập tay  ',
      audience: 'TEAM',
      desiredOutcome: '  Chỉ cần một lần bấm  ',
    }),
    {
      reason: 'Giảm thao tác nhập tay',
      audience: 'TEAM',
      desiredOutcome: 'Chỉ cần một lần bấm',
    }
  );
  assert.throws(() => normalizeFeatureRequestContext({ reason: 'x', audience: 'TEAM' }), /vì sao/i);
  assert.throws(() => normalizeFeatureRequestContext({ reason: 'Hợp lệ', audience: 'UNKNOWN' }), /ai sẽ sử dụng/i);
});

test('enforces the complete triage workflow before any database write', () => {
  assert.doesNotThrow(() =>
    assertBugReportTransition({
      reportId: 42,
      previousStatus: 'NEW',
      status: 'APPROVED',
      priority: 'P1',
      note: null,
      duplicateOfId: null,
      clarificationStatus: 'READY',
    })
  );
  assert.throws(
    () =>
      assertBugReportTransition({
        reportId: 42,
        previousStatus: 'NEW',
        status: 'APPROVED',
        priority: null,
        note: null,
        duplicateOfId: null,
        clarificationStatus: 'READY',
      }),
    /priority/i
  );
  assert.throws(
    () =>
      assertBugReportTransition({
        reportId: 42,
        previousStatus: 'IN_PROGRESS',
        status: 'FIXED',
        priority: 'P1',
        note: null,
        duplicateOfId: null,
        clarificationStatus: 'READY',
      }),
    /ghi chú/i
  );
  assert.throws(
    () =>
      assertBugReportTransition({
        reportId: 42,
        previousStatus: 'CLOSED',
        status: 'IN_PROGRESS',
        priority: 'P2',
        note: null,
        duplicateOfId: null,
        clarificationStatus: 'READY',
      }),
    /mở lại/i
  );
  assert.throws(
    () =>
      assertBugReportTransition({
        reportId: 42,
        previousStatus: 'NEW',
        status: 'DUPLICATE',
        priority: null,
        note: null,
        duplicateOfId: 42,
        clarificationStatus: 'PENDING_AGENT',
      }),
    /ticket gốc/i
  );
  assert.throws(
    () =>
      assertBugReportTransition({
        reportId: 42,
        previousStatus: 'NEW',
        status: 'CLOSED',
        priority: null,
        note: null,
        duplicateOfId: null,
        clarificationStatus: 'PENDING_AGENT',
      }),
    /Không thể chuyển/i
  );
  assert.equal(isAgentReadableBugStatus('NEW'), true);
  assert.equal(isAgentReadableBugStatus('APPROVED'), true);
  assert.equal(isAgentReadableBugStatus('IN_PROGRESS'), true);
  assert.equal(isAgentReadableBugStatus('FIXED'), true);
  assert.equal(isAgentReadableBugStatus('CLOSED'), false);
});

test('blocks Agent work until clarification is explicitly ready', () => {
  assert.throws(
    () =>
      assertBugReportTransition({
        reportId: 42,
        previousStatus: 'NEW',
        status: 'APPROVED',
        priority: 'P1',
        note: null,
        duplicateOfId: null,
        clarificationStatus: 'WAITING_REPORTER',
      }),
    /chưa đủ rõ/i
  );
});

test('builds the one-click completion path without skipping audit states', () => {
  assert.deepEqual(bugReportCompletionPath('APPROVED'), ['IN_PROGRESS', 'FIXED', 'CLOSED']);
  assert.deepEqual(bugReportCompletionPath('IN_PROGRESS'), ['FIXED', 'CLOSED']);
  assert.deepEqual(bugReportCompletionPath('FIXED'), ['CLOSED']);
  assert.throws(() => bugReportCompletionPath('NEW'), /đã duyệt hoặc đang xử lý/);
  assert.throws(() => bugReportCompletionPath('CLOSED'), /đã duyệt hoặc đang xử lý/);
});

test('requires a structured Agent resolution and safe release link', () => {
  assert.deepEqual(
    normalizeAgentResolution({
      problemSummary: 'Popup không lưu được thay đổi của người dùng.',
      rootCause: 'Mutation không refresh cache.',
      solutionSummary: 'Invalidate cache sau khi mutation thành công.',
      verificationSummary: 'Unit test và browser QA đều đạt.',
      changedFiles: ['apps/web/example.tsx'],
      commitSha: 'abc123',
      releaseUrl: 'https://lab.masteros.app/dashboard',
    }),
    {
      problemSummary: 'Popup không lưu được thay đổi của người dùng.',
      rootCause: 'Mutation không refresh cache.',
      solutionSummary: 'Invalidate cache sau khi mutation thành công.',
      verificationSummary: 'Unit test và browser QA đều đạt.',
      changedFiles: ['apps/web/example.tsx'],
      commitSha: 'abc123',
      releaseUrl: 'https://lab.masteros.app/dashboard',
    }
  );
  assert.throws(
    () =>
      normalizeAgentResolution({
        problemSummary: 'Quá ngắn',
        rootCause: 'x',
        solutionSummary: 'Quá ngắn',
        verificationSummary: 'x',
        releaseUrl: 'javascript:alert(1)',
      }),
    /ít nhất|nguyên nhân|link/i
  );
  assert.throws(
    () =>
      normalizeAgentResolution({
        problemSummary: 'Popup không lưu được thay đổi của người dùng.',
        rootCause: 'Mutation không refresh cache.',
        solutionSummary: 'Invalidate cache sau khi mutation thành công.',
        verificationSummary: 'Unit test và browser QA đều đạt.',
        releaseUrl: '//example.com/phishing',
      }),
    /link/i
  );
});

test('normalizes Vietnamese issue text into reusable knowledge tokens', () => {
  assert.deepEqual(knowledgeTokens('Không lưu được trạng thái trong Popup khách hàng'), [
    'luu',
    'trang',
    'thai',
    'popup',
    'khach',
    'hang',
  ]);
});
