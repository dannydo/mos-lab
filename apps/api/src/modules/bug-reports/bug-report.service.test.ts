import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBugReportTransition,
  bugReportCompletionPath,
  isAgentReadableBugStatus,
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
      }),
    /Không thể chuyển/i
  );
  assert.equal(isAgentReadableBugStatus('NEW'), false);
  assert.equal(isAgentReadableBugStatus('APPROVED'), true);
  assert.equal(isAgentReadableBugStatus('IN_PROGRESS'), true);
  assert.equal(isAgentReadableBugStatus('FIXED'), true);
  assert.equal(isAgentReadableBugStatus('CLOSED'), false);
});

test('builds the one-click completion path without skipping audit states', () => {
  assert.deepEqual(bugReportCompletionPath('APPROVED'), ['IN_PROGRESS', 'FIXED', 'CLOSED']);
  assert.deepEqual(bugReportCompletionPath('IN_PROGRESS'), ['FIXED', 'CLOSED']);
  assert.deepEqual(bugReportCompletionPath('FIXED'), ['CLOSED']);
  assert.throws(() => bugReportCompletionPath('NEW'), /đã duyệt hoặc đang xử lý/);
  assert.throws(() => bugReportCompletionPath('CLOSED'), /đã duyệt hoặc đang xử lý/);
});
