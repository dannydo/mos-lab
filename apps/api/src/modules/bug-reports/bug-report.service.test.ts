import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBugReportKey } from '@mos-lab/shared';
import {
  assertBugReportTransition,
  assertAgentProgressUpdateAllowed,
  BugReportService,
  bugReportAgentProgress,
  bugReportClarificationWhere,
  bugReportCompletionPath,
  bugReportWorkflowProjection,
  bugReportReporterExperience,
  bugReportNextAction,
  bugReportNextActorWhere,
  isAgentReadableBugStatus,
  knowledgeTokens,
  normalizeBugReportExpertDetails,
  normalizeAgentResolution,
  normalizeFeatureRequestContext,
  parseBugReportKey,
  sanitizeBugReportContext,
} from './bug-report.service.js';

test('normalizes optional expert details without making them a submission requirement', () => {
  assert.equal(normalizeBugReportExpertDetails(undefined), null);
  assert.deepEqual(
    normalizeBugReportExpertDetails({
      reproductionSteps: 'Mở Danh sách lỗi rồi zoom browser 150%.',
      impact: 'HIGH',
      environment: 'Chrome · 4K',
      relatedTicket: 'MOS-BUG-17',
      unexpected: 'ignored',
    }),
    {
      reproductionSteps: 'Mở Danh sách lỗi rồi zoom browser 150%.',
      expectedResult: null,
      actualResult: null,
      impact: 'HIGH',
      environment: 'Chrome · 4K',
      workaround: null,
      relatedTicket: 'MOS-BUG-17',
    }
  );
});

function progressSource(
  overrides: Partial<Parameters<typeof bugReportAgentProgress>[0]> = {}
): Parameters<typeof bugReportAgentProgress>[0] {
  const createdAt = new Date('2026-08-31T01:00:00.000Z');
  return {
    status: 'NEW',
    clarificationStatus: 'PENDING_AGENT',
    createdAt,
    approvedAt: null,
    implementationApprovedAt: null,
    implementationActiveJobId: null,
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
    'AWAITING_DANNY_IMPLEMENTATION_APPROVAL'
  );
  assert.equal(
    bugReportAgentProgress(
      progressSource({
        status: 'APPROVED',
        clarificationStatus: 'READY',
        audits: [{ action: 'AGENT_IMPLEMENTATION_FAILED', note: 'Lease ended safely.', createdAt: agentAt }],
      })
    ).stage,
    'IMPLEMENTATION_FAILED'
  );
  assert.deepEqual(
    bugReportAgentProgress(
      progressSource({
        status: 'APPROVED',
        clarificationStatus: 'READY',
        implementation: {
          status: 'FAILED',
          executionPhase: 'FAILED',
          progressLabel: null,
          lastProgressAt: null,
          progressCount: 0,
          checkpointCount: 0,
          failureCode: 'CODEX_EXEC_TIMEOUT',
          retainUntil: new Date('2026-09-30T01:00:00.000Z'),
          startedAt: agentAt,
          completedAt: null,
          updatedAt: new Date('2026-08-31T01:10:00.000Z'),
        },
      })
    ),
    {
      stage: 'IMPLEMENTATION_FAILED',
      note: 'Codex vượt thời lượng chạy cho phép; worker đã dừng an toàn. Bản nháp được giữ, chưa commit hoặc deploy.',
      updatedAt: '2026-08-31T01:10:00.000Z',
    }
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
        audits: [
          {
            action: 'AGENT_IMPLEMENTATION_REVIEW_READY',
            note: 'Code and tests are ready for Danny.',
            createdAt: agentAt,
          },
        ],
      })
    ).stage,
    'AWAITING_DANNY_COMMIT_REVIEW'
  );
  assert.equal(
    bugReportAgentProgress(
      progressSource({
        status: 'IN_PROGRESS',
        clarificationStatus: 'READY',
        implementation: {
          status: 'AWAITING_COMMIT_REVIEW',
          executionPhase: 'AWAITING_COMMIT_REVIEW',
          progressLabel: null,
          lastProgressAt: null,
          progressCount: 0,
          checkpointCount: 0,
          failureCode: null,
          retainUntil: null,
          startedAt: agentAt,
          completedAt: agentAt,
          updatedAt: agentAt,
        },
      })
    ).stage,
    'AWAITING_DANNY_COMMIT_REVIEW'
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
  assert.deepEqual(
    bugReportAgentProgress(
      progressSource({
        status: 'FIXED',
        clarificationStatus: 'READY',
        resolvedAt: agentAt,
        audits: [
          {
            action: 'DANNY_RELEASED_FOR_REPORTER_ACCEPTANCE',
            note: 'Đã deploy; chờ người báo nghiệm thu.',
            createdAt: agentAt,
          },
        ],
      })
    ),
    {
      stage: 'AWAITING_REPORTER_ACCEPTANCE',
      note: 'Đã deploy; chờ người báo nghiệm thu.',
      updatedAt: agentAt.toISOString(),
    }
  );
  assert.equal(
    bugReportAgentProgress(
      progressSource({
        status: 'IN_PROGRESS',
        clarificationStatus: 'READY',
        audits: [{ action: 'REPORTER_IMPLEMENTATION_REOPENED', note: 'Nút vẫn sai.', createdAt: agentAt }],
      })
    ).stage,
    'REOPENED_BY_REPORTER'
  );
  assert.equal(bugReportAgentProgress(progressSource({ status: 'CLOSED', closedAt: agentAt })).stage, 'COMPLETED');
});

test('serializes progress and next owner from one server-owned workflow projection', () => {
  const agentAt = new Date('2026-08-31T01:05:00.000Z');
  assert.deepEqual(
    bugReportWorkflowProjection(
      progressSource({
        status: 'APPROVED',
        clarificationStatus: 'READY',
        approvedAt: agentAt,
      })
    ),
    {
      agentProgress: {
        stage: 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL',
        note: null,
        updatedAt: agentAt.toISOString(),
      },
      nextAction: {
        actor: 'DANNY',
        type: 'IMPLEMENT',
        label: 'Duyệt code/test',
        detail:
          'Plan đã có, nhưng Agent chỉ được bắt đầu sau khi Danny duyệt code/test. Khi job bền vững được tạo, UI mới hiển thị Agent triển khai.',
        waitingSince: agentAt.toISOString(),
      },
    }
  );
});

test('agent queue projects the latest durable implementation job for terminal and commit-review tickets', async () => {
  const updatedAt = new Date('2026-09-05T01:00:00.000Z');
  const report = (id: number, implementation: Record<string, unknown>) => ({
    ...progressSource({ status: 'IN_PROGRESS', clarificationStatus: 'READY', updatedAt, startedAt: updatedAt }),
    id,
    requestType: 'FEATURE',
    title: `Ticket ${id}`,
    priority: 'P0',
    sourcePath: '/dashboard/bk',
    inboxImplementationJobs: [implementation],
  });
  const terminal = report(13, {
    id: 'terminal-sequence-two',
    status: 'FAILED',
    executionPhase: 'FAILED',
    progressLabel: null,
    lastProgressAt: null,
    progressCount: 1,
    checkpointCount: 0,
    failureCode: 'QUALITY_GATE_FAILED',
    retrySequence: 2,
    testsJson: JSON.stringify([{ status: 'FAILED', failureCode: 'SANDBOX_PORT_BINDING' }]),
    changedFilesJson: '[]',
    retainUntil: new Date('2026-09-19T01:00:00.000Z'),
    startedAt: updatedAt,
    completedAt: updatedAt,
    updatedAt,
  });
  const review = report(14, {
    id: 'review-ready',
    status: 'AWAITING_COMMIT_REVIEW',
    executionPhase: 'AWAITING_COMMIT_REVIEW',
    progressLabel: null,
    lastProgressAt: null,
    progressCount: 1,
    checkpointCount: 0,
    failureCode: null,
    retrySequence: 0,
    testsJson: '[]',
    changedFilesJson: '[]',
    retainUntil: new Date('2026-10-05T01:00:00.000Z'),
    startedAt: updatedAt,
    completedAt: updatedAt,
    updatedAt,
  });
  const fastify = {
    prisma: { crm: { crmBugReport: { findMany: async () => [terminal, review] } } },
  };

  const queue = await BugReportService.agentQueue(fastify as never);
  assert.equal(queue[0]?.agentProgress.stage, 'IMPLEMENTATION_FAILED');
  assert.equal(queue[0]?.nextAction.actor, 'SYSTEM');
  assert.equal(queue[0]?.nextAction.label, 'Đang chờ khắc phục cổng kiểm thử');
  assert.notEqual(queue[0]?.nextAction.label, 'Quyết định retry');
  assert.equal(queue[1]?.agentProgress.stage, 'AWAITING_DANNY_COMMIT_REVIEW');
  assert.equal(queue[1]?.nextAction.type, 'REVIEW_COMMIT');
});

test('projects a plain-language reporter view without exposing operating gates', () => {
  const createdAt = new Date('2026-08-31T01:00:00.000Z');
  const updatedAt = new Date('2026-08-31T01:05:00.000Z');
  assert.deepEqual(
    bugReportReporterExperience({
      status: 'NEW',
      clarificationStatus: 'PENDING_AGENT',
      createdAt,
      approvedAt: null,
      startedAt: null,
      resolvedAt: null,
      closedAt: null,
      updatedAt,
    }),
    {
      state: 'REVIEWING',
      label: 'Đang xem xét',
      summary: 'mOS đang xem yêu cầu và thông tin bạn đã gửi.',
      nextAction: {
        label: 'Bạn chưa cần làm gì',
        detail: 'mOS sẽ báo bạn khi cần thêm thông tin hoặc có kết quả để kiểm tra.',
      },
      updates: [{ label: 'Đã nhận yêu cầu của bạn', occurredAt: createdAt.toISOString() }],
    }
  );
  assert.equal(
    bugReportReporterExperience({
      status: 'FIXED',
      clarificationStatus: 'READY',
      createdAt,
      approvedAt: null,
      startedAt: null,
      resolvedAt: updatedAt,
      closedAt: null,
      updatedAt,
    }).nextAction.label,
    'Kiểm tra lại kết quả'
  );
  assert.equal(
    bugReportReporterExperience({
      status: 'NEW',
      clarificationStatus: 'WAITING_REPORTER',
      createdAt,
      approvedAt: null,
      startedAt: null,
      resolvedAt: null,
      closedAt: null,
      updatedAt,
    }).label,
    'Cần bạn trả lời'
  );
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
    bugReportNextAction(progressSource({ status: 'APPROVED', clarificationStatus: 'READY' })).actor,
    'DANNY'
  );
  assert.deepEqual(
    bugReportNextAction(
      progressSource({
        status: 'APPROVED',
        clarificationStatus: 'READY',
        audits: [
          {
            action: 'AGENT_IMPLEMENTATION_FAILED',
            note: 'Lease ended safely.',
            createdAt: new Date('2026-08-31T01:10:00.000Z'),
          },
        ],
      })
    ).type,
    'RETRY_IMPLEMENTATION'
  );
  assert.equal(
    bugReportNextAction(
      progressSource({
        status: 'APPROVED',
        clarificationStatus: 'READY',
        implementation: {
          status: 'FAILED',
          executionPhase: 'FAILED',
          progressLabel: null,
          lastProgressAt: null,
          progressCount: 0,
          checkpointCount: 0,
          failureCode: 'CODEX_EXEC_TIMEOUT',
          retainUntil: new Date('2026-09-30T01:00:00.000Z'),
          startedAt: null,
          completedAt: null,
          updatedAt: new Date('2026-08-31T01:10:00.000Z'),
        },
      })
    ).type,
    'RETRY_IMPLEMENTATION'
  );
  assert.equal(
    bugReportNextAction(
      progressSource({
        status: 'IN_PROGRESS',
        clarificationStatus: 'READY',
        implementation: {
          status: 'AWAITING_COMMIT_REVIEW',
          executionPhase: 'AWAITING_COMMIT_REVIEW',
          progressLabel: null,
          lastProgressAt: null,
          progressCount: 0,
          checkpointCount: 0,
          failureCode: null,
          retainUntil: null,
          startedAt: null,
          completedAt: null,
          updatedAt: new Date('2026-08-31T01:10:00.000Z'),
        },
      })
    ).type,
    'REVIEW_COMMIT'
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
  const reopenAction = bugReportNextAction(
    progressSource({
      status: 'NEW',
      clarificationStatus: 'PENDING_AGENT',
      audits: [{ action: 'REPORTER_REOPENED', note: 'Vẫn sai.', createdAt: new Date('2026-08-31T01:10:00.000Z') }],
    })
  );
  assert.equal(reopenAction.actor, 'AGENT');
  assert.equal(reopenAction.label, 'Tái phân tích reopen');
  assert.match(reopenAction.detail, /Plan, Danny approval và priority cũ không được dùng lại/);
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
