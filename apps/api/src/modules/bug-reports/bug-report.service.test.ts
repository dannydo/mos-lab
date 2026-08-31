import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBugReportTransition,
  bugReportCompletionPath,
  isAgentReadableBugStatus,
  knowledgeTokens,
  normalizeAgentResolution,
  parseBugReportKey,
  sanitizeBugReportContext,
} from './bug-report.service.js';

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

test('clips diagnostics and accepts only canonical bug keys', () => {
  const context = sanitizeBugReportContext({
    overlays: Array.from({ length: 20 }, (_, index) => `Popup ${index}`),
    recentClientErrors: Array.from({ length: 20 }, (_, index) => ({ name: 'Error', message: `Failure ${index}` })),
  });
  assert.equal(context.overlays.length, 10);
  assert.equal(context.recentClientErrors.length, 10);
  assert.equal(parseBugReportKey('MOS-BUG-42'), 42);
  assert.throws(() => parseBugReportKey('MOS-BUG-x'), /không hợp lệ/);
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
