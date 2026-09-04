import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import {
  buildCodexExecArgs,
  buildCodexImplementationArgs,
  buildInboxFollowUpPrompt,
  CodexCliError,
  executeCodexCli,
  implementationWorktreeRoot,
  isCodexImplementationHelpCompatible,
  formatInboxImplementationFailure,
  formatInboxFollowUpFailure,
  formatInboxPlanFailure,
  parseCodexClassification,
  parseCodexConversation,
  parseCodexInboxFollowUp,
  inboxFollowUpOriginalEvidenceFiles,
  missingOriginalEvidenceFollowUpResult,
  parseCodexInboxPlan,
  parseCodexInboxImplementation,
  resolveCodexCliPath,
  safeBridgeFailureCode,
  safeCodexCliFailureSummary,
  safeCodexCliJsonFailureSummary,
  inboxImplementationFailureSummary,
  inboxImplementationSchema,
} from './request-classifier-worker.js';

test('builds a noninteractive Codex invocation with private structured output', async () => {
  const prompt = 'QA controlled input';
  const args = buildCodexExecArgs('/tmp/schema.json', '/tmp/final.json', prompt);
  assert.deepEqual(args, [
    'exec',
    '--ephemeral',
    '--sandbox',
    'read-only',
    '--skip-git-repo-check',
    '--color',
    'never',
    '--output-schema',
    '/tmp/schema.json',
    '--output-last-message',
    '/tmp/final.json',
    prompt,
  ]);

  const child = new EventEmitter() as never as import('node:child_process').ChildProcess;
  const calls: Array<{ command: string; args: readonly string[]; options: unknown }> = [];
  await executeCodexCli('/custom/codex', args, '/tmp', 1_000, ((command, invocationArgs, options) => {
    calls.push({ command, args: invocationArgs, options });
    queueMicrotask(() => child.emit('exit', 0));
    return child;
  }) as never);
  assert.deepEqual(calls, [
    {
      command: '/custom/codex',
      args,
      options: { cwd: '/tmp', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: true },
    },
  ]);
});

test('builds a write-enabled but noninteractive implementation command for an isolated worktree', () => {
  const args = buildCodexImplementationArgs('/tmp/schema.json', '/tmp/final.json', 'safe scope');
  assert.deepEqual(args.slice(0, 8), [
    'exec',
    '--ephemeral',
    '--ignore-user-config',
    '--approve-for-me',
    '--color',
    'never',
    '--json',
    '--output-schema',
  ]);
  assert.deepEqual(args.slice(-3), ['--output-last-message', '/tmp/final.json', 'safe scope']);
  assert.equal(
    implementationWorktreeRoot('/Users/dannydo/projects/mos-lab'),
    '/Users/dannydo/projects/.mos-inbox-worktrees'
  );
});

test('uses a strict Codex-compatible schema for every implementation test field', () => {
  const schema = JSON.parse(inboxImplementationSchema()) as {
    properties: {
      tests: { items: { additionalProperties: boolean; required: string[]; properties: Record<string, unknown> } };
    };
  };
  const testItem = schema.properties.tests.items;
  assert.equal(testItem.additionalProperties, false);
  assert.deepEqual(testItem.required, ['command', 'status', 'failureCode', 'failureSummary']);
  assert.deepEqual(Object.keys(testItem.properties), ['command', 'status', 'failureCode', 'failureSummary']);
});

test('requires the exact supported bundled Codex flags before implementation can claim work', () => {
  assert.equal(
    isCodexImplementationHelpCompatible('--ephemeral --approve-for-me --output-schema --output-last-message'),
    true
  );
  assert.equal(isCodexImplementationHelpCompatible('--ephemeral --output-schema --output-last-message'), false);
});

test('starts the lease lifecycle only after the child process is genuinely spawned', async () => {
  const child = new EventEmitter() as never as import('node:child_process').ChildProcess;
  Object.assign(child, { pid: 4242 });
  let lifecyclePid: number | null = null;
  await executeCodexCli(
    '/custom/codex',
    ['exec'],
    '/tmp',
    1_000,
    (() => {
      queueMicrotask(() => {
        child.emit('spawn');
        child.emit('close', 0, null);
      });
      return child;
    }) as never,
    undefined,
    {
      onStarted: async (runtime) => {
        lifecyclePid = runtime.processId;
      },
    }
  );
  assert.equal(lifecyclePid, 4242);
});

test('normalizes isolated bridge protocol failures without exposing request content', () => {
  assert.equal(
    safeBridgeFailureCode(new Error('Worker bridge inbox-implementation HTTP 404')),
    'BRIDGE_PROTOCOL_MISMATCH'
  );
  assert.equal(safeBridgeFailureCode(new Error('Worker bridge classifier HTTP 503')), 'BRIDGE_SERVER_ERROR');
});

test('never includes child-process content in Inbox failure telemetry', () => {
  const sensitive = 'QA title and reporter message must never reach logs';
  const line = formatInboxFollowUpFailure('codex_exec', new Error(`Command failed: ${sensitive}`));
  assert.equal(line, 'Inbox follow-up class=inbox_follow_up phase=codex_exec code=UNEXPECTED_FAILURE');
  assert.doesNotMatch(line, /QA title|reporter message|Command failed/);
});

test('maps raw Codex process errors and timeouts to safe failure codes', async () => {
  const sensitive = 'prompt text must never be logged';
  const failedChild = new EventEmitter() as never as import('node:child_process').ChildProcess;
  await assert.rejects(
    executeCodexCli('/custom/codex', ['exec'], '/tmp', 1_000, (() => {
      queueMicrotask(() => failedChild.emit('error', new Error(sensitive)));
      return failedChild;
    }) as never),
    (error) => {
      const line = formatInboxFollowUpFailure('codex_exec', error);
      assert.equal(line, 'Inbox follow-up class=inbox_follow_up phase=codex_exec code=CODEX_EXEC_FAILED');
      assert.doesNotMatch(line, /prompt text|custom\/codex/);
      return true;
    }
  );

  const timeoutChild = new EventEmitter() as never as import('node:child_process').ChildProcess;
  let killed = false;
  timeoutChild.kill = () => {
    killed = true;
    queueMicrotask(() => timeoutChild.emit('close', null, 'SIGTERM'));
    return true;
  };
  await assert.rejects(executeCodexCli('/custom/codex', ['exec'], '/tmp', 1, (() => timeoutChild) as never), (error) =>
    formatInboxFollowUpFailure('codex_exec', error).endsWith('code=CODEX_EXEC_TIMEOUT')
  );
  assert.equal(killed, true);
});

test('waits for a spawned lease start before settling a child-process error', async () => {
  const child = new EventEmitter() as never as import('node:child_process').ChildProcess;
  Object.assign(child, { pid: 4242 });
  let releaseStart: (() => void) | undefined;
  const startGate = new Promise<void>((resolve) => {
    releaseStart = resolve;
  });
  let startRecorded = false;
  child.kill = () => {
    queueMicrotask(() => child.emit('close', null, 'SIGTERM'));
    return true;
  };

  const execution = executeCodexCli(
    '/custom/codex',
    ['exec'],
    '/tmp',
    1_000,
    (() => {
      queueMicrotask(() => {
        child.emit('spawn');
        child.emit('error', new Error('do not expose child details'));
      });
      return child;
    }) as never,
    undefined,
    {
      onStarted: async () => {
        startRecorded = true;
        await startGate;
      },
    }
  );

  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(startRecorded, true);
  releaseStart?.();
  await assert.rejects(execution, (error) =>
    formatInboxImplementationFailure('codex_exec', error).endsWith('CODEX_EXEC_FAILED')
  );
});

test('times out a spawned process only after its lease lifecycle has started', async () => {
  const child = new EventEmitter() as never as import('node:child_process').ChildProcess;
  Object.assign(child, { pid: 4242 });
  let lifecycleStarted = false;
  let killed = false;
  child.kill = () => {
    killed = true;
    queueMicrotask(() => child.emit('close', null, 'SIGTERM'));
    return true;
  };

  await assert.rejects(
    executeCodexCli(
      '/custom/codex',
      ['exec'],
      '/tmp',
      1,
      (() => {
        queueMicrotask(() => child.emit('spawn'));
        return child;
      }) as never,
      undefined,
      { onStarted: () => void (lifecycleStarted = true) }
    ),
    (error) => formatInboxImplementationFailure('codex_exec', error).endsWith('CODEX_EXEC_TIMEOUT')
  );
  assert.equal(lifecycleStarted, true);
  assert.equal(killed, true);
});

test('reports a numeric Codex exit code without child output', async () => {
  const child = new EventEmitter() as never as import('node:child_process').ChildProcess;
  await assert.rejects(
    executeCodexCli('/custom/codex', ['exec'], '/tmp', 1_000, (() => {
      queueMicrotask(() => child.emit('exit', 1, null));
      return child;
    }) as never),
    (error) => formatInboxFollowUpFailure('codex_exec', error).endsWith('code=CODEX_EXEC_EXIT_1')
  );
});

test('keeps only a bounded sanitized executor diagnosis for implementation failures', async () => {
  const child = new EventEmitter() as never as import('node:child_process').ChildProcess;
  const stderr = new EventEmitter();
  Object.assign(child, { stderr });
  await assert.rejects(
    executeCodexCli('/custom/codex', ['exec'], '/tmp', 1_000, (() => {
      queueMicrotask(() => {
        stderr.emit('data', 'Error: authorization=super-secret-value at /Users/dannydo/projects/mos-lab/file.ts');
        child.emit('exit', 1, null);
      });
      return child;
    }) as never),
    (error) => {
      assert.ok(error instanceof CodexCliError);
      assert.match(inboxImplementationFailureSummary(error), /authorization=\[redacted\]/i);
      assert.doesNotMatch(inboxImplementationFailureSummary(error), /super-secret|dannydo|file\.ts/i);
      return true;
    }
  );
  assert.equal(safeCodexCliFailureSummary('normal output only'), null);
  assert.equal(
    safeCodexCliJsonFailureSummary(
      [
        JSON.stringify({ type: 'item.completed', item: { text: 'Do not retain this ticket sentence.' } }),
        JSON.stringify({ type: 'item.failed', item: { message: 'Error: rate limit reached, token=do-not-store.' } }),
      ].join('\n')
    ),
    'Error: rate limit reached, token=[redacted]'
  );
  assert.equal(
    safeCodexCliJsonFailureSummary(
      JSON.stringify({
        type: 'turn.failed',
        error: { message: 'Error: model unavailable at /Users/dannydo/projects/mos-lab/file.ts' },
      })
    ),
    'Error: model unavailable at [internal-path]'
  );
});

test('treats the final child close event as a Codex completion', async () => {
  const child = new EventEmitter() as never as import('node:child_process').ChildProcess;
  await executeCodexCli('/custom/codex', ['exec'], '/tmp', 1_000, (() => {
    queueMicrotask(() => child.emit('close', 0, null));
    return child;
  }) as never);
});

test('accepts Codex structured JSON and rejects unsafe output', () => {
  assert.deepEqual(
    parseCodexClassification(
      '{"requestType":"BUG","confidence":0.91,"rationale":"A save action should already work.","clarificationQuestion":null}'
    ),
    {
      requestType: 'BUG',
      confidence: 0.91,
      rationale: 'A save action should already work.',
      clarificationQuestion: null,
    }
  );
  assert.throws(() => parseCodexClassification('{"requestType":"SYSTEM","confidence":1}'));
});

test('resolves configured Codex CLI path before macOS discovery', () => {
  assert.equal(
    resolveCodexCliPath({ MOS_CODEX_CLI_PATH: '/custom/codex' }, (path) => path === '/custom/codex'),
    '/custom/codex'
  );
  assert.equal(
    resolveCodexCliPath({}, (path) => path === '/Applications/ChatGPT.app/Contents/Resources/codex'),
    '/Applications/ChatGPT.app/Contents/Resources/codex'
  );
  assert.throws(() => resolveCodexCliPath({ MOS_CODEX_CLI_PATH: '/missing' }, () => false));
});

test('accepts only safe inbox follow-up actions', () => {
  assert.deepEqual(
    parseCodexInboxFollowUp('{"action":"NO_OP","note":"Đã đủ thông tin, không cần hỏi lại.","question":null}'),
    { action: 'NO_OP', note: 'Đã đủ thông tin, không cần hỏi lại.', question: null }
  );
  assert.deepEqual(
    parseCodexInboxFollowUp('{"action":"REANALYSIS_CONFIRMED","note":"Đã đủ cơ sở tái phân tích.","question":null}'),
    { action: 'REANALYSIS_CONFIRMED', note: 'Đã đủ cơ sở tái phân tích.', question: null }
  );
  assert.throws(() => parseCodexInboxFollowUp('{"action":"ASK_REPORTER","note":"Thiếu chi tiết","question":null}'));
});

test('uses bounded safe local names for leased original reopen evidence', () => {
  const files = inboxFollowUpOriginalEvidenceFiles({
    id: 'follow-up-1',
    ticketId: 17,
    ticketKey: 'MOS-BUG-17',
    eventKind: 'REPORTER_REOPENED',
    leaseToken: 'lease-1',
    attemptCount: 1,
    context: {
      requestType: 'BUG',
      title: 'Controlled reopen',
      description: 'Controlled test only.',
      status: 'NEW',
      clarificationStatus: 'PENDING_AGENT',
      clarificationSummary: null,
      sourcePath: '/dashboard',
      reporterMessages: [],
      reopen: {
        auditId: 42,
        reason: 'The original screenshot still shows the defect.',
        reopenedAt: '2026-09-03T08:00:00.000Z',
        intent: 'UNCHANGED',
        originalEvidence: [{ id: 7, fileName: '../../still broken?.png', mimeType: 'image/png', sizeBytes: 42 }],
        knownContext: {
          sourcePath: '/dashboard',
          browser: 'Chrome 151.0.0.0',
          viewport: { width: 3027, height: 1638, devicePixelRatio: 1.25 },
          themeMode: 'light',
          priorResolution: {
            solutionSummary: 'Use the full-width container.',
            verificationSummary: 'Browser proof completed.',
          },
        },
      },
    },
  });
  assert.deepEqual(files, ['7-still-broken-.png']);
});

test('tells a reopen Agent not to repeat facts already captured by mOS', () => {
  const prompt = buildInboxFollowUpPrompt(
    {
      id: 'follow-up-2',
      ticketId: 17,
      ticketKey: 'MOS-BUG-17',
      eventKind: 'REPORTER_REOPENED',
      leaseToken: 'lease-2',
      attemptCount: 1,
      context: {
        requestType: 'BUG',
        title: 'Container width regression',
        description: 'The right side is still clipped.',
        status: 'NEW',
        clarificationStatus: 'PENDING_AGENT',
        clarificationSummary: null,
        sourcePath: '/dashboard',
        reporterMessages: ['Vẫn còn lỗi như hai hình đã gửi từ đầu.'],
        reopen: {
          auditId: 42,
          reason: 'Vẫn chưa được giải quyết; biểu hiện vẫn giống bằng chứng ban đầu.',
          reopenedAt: '2026-09-03T08:00:00.000Z',
          intent: 'UNCHANGED',
          originalEvidence: [],
          knownContext: {
            sourcePath: '/dashboard',
            browser: 'Chrome 151.0.0.0',
            viewport: { width: 3027, height: 1638, devicePixelRatio: 1.25 },
            themeMode: 'light',
            priorResolution: null,
          },
        },
      },
    },
    ['17-original.png']
  );
  assert.match(prompt, /never ask for a non-empty browser, browser version, viewport/i);
  assert.match(prompt, /intent is UNCHANGED/i);
  assert.match(prompt, /Chrome 151\.0\.0\.0/);
});

test('turns unavailable original reopen evidence into one Agent clarification', () => {
  assert.deepEqual(missingOriginalEvidenceFollowUpResult(), {
    action: 'ASK_REPORTER',
    note: 'Agent không thể mở một hoặc nhiều ảnh gốc đã được lưu cùng ticket reopen.',
    question:
      'Agent không mở được ảnh gốc của ticket. Bạn vui lòng bổ sung lại ảnh hoặc mô tả phần vẫn còn lỗi để Agent tiếp tục làm rõ.',
  });
});

test('accepts structured plan output and never logs ticket text on a plan failure', () => {
  const result = parseCodexInboxPlan(
    JSON.stringify({
      action: 'POST_PLAN',
      note: 'Plan needs Danny approval.',
      plan: {
        evidence: 'The event reached the ready gate.',
        expectedOutcome: 'A native plan is visible.',
        scope: 'Inbox plan worker only.',
        steps: ['Claim the durable job.', 'Post one plan.'],
        verification: 'Read the native ticket comment.',
        risksAndRollback: 'No production change; stop the worker path if necessary.',
        approvalRequest: 'Danny approves the plan before implementation.',
      },
    })
  );
  assert.equal(result.action, 'POST_PLAN');
  assert.equal(result.plan?.steps.length, 2);
  assert.throws(() => parseCodexInboxPlan('{"action":"POST_PLAN","note":"Missing plan","plan":null}'));
  const sensitive = 'QA ticket body must never reach logs';
  const line = formatInboxPlanFailure('codex_exec', new Error(`failure: ${sensitive}`));
  assert.equal(line, 'Inbox plan class=inbox_plan phase=codex_exec code=UNEXPECTED_FAILURE');
  assert.doesNotMatch(line, /QA ticket body|failure:/);
});

test('accepts a bounded implementation review result and never exposes child output on failure', () => {
  assert.deepEqual(
    parseCodexInboxImplementation(
      JSON.stringify({
        summary: 'Updated the presentation-only health card.',
        tests: [{ command: 'pnpm --filter @mos-lab/web test:run', status: 'PASSED' }],
        risksAndRollback: 'Revert the isolated worktree diff if Danny declines review.',
      })
    ),
    {
      summary: 'Updated the presentation-only health card.',
      tests: [{ command: 'pnpm --filter @mos-lab/web test:run', status: 'PASSED' }],
      risksAndRollback: 'Revert the isolated worktree diff if Danny declines review.',
    }
  );
  assert.throws(() => parseCodexInboxImplementation('{"summary":"missing required structured fields"}'));
  assert.deepEqual(
    parseCodexInboxImplementation(
      JSON.stringify({
        summary: 'A build gate stopped the draft.',
        tests: [
          {
            command: 'pnpm build:web',
            status: 'FAILED',
            failureCode: 'TYPESCRIPT_ERROR',
            failureSummary: 'TypeScript could not satisfy a required component property.',
          },
        ],
        risksAndRollback: 'Keep the draft isolated until the failed build is understood.',
      })
    ).tests[0],
    {
      command: 'pnpm build:web',
      status: 'FAILED',
      failureCode: 'TYPESCRIPT_ERROR',
      failureSummary: 'TypeScript could not satisfy a required component property.',
    }
  );
  const sensitive = 'ticket body secret must never reach worker logs';
  const line = formatInboxImplementationFailure('codex_exec', new Error(`failed: ${sensitive}`));
  assert.equal(line, 'Inbox implementation class=inbox_implementation phase=codex_exec code=UNEXPECTED_FAILURE');
  assert.doesNotMatch(line, /ticket body|secret|failed:/);
});

test('accepts one-question guided intake output', () => {
  const result = parseCodexConversation(
    JSON.stringify({
      requestType: 'BUG',
      summary: {
        requestType: 'BUG',
        whereItHappened: 'Trang khách',
        userAction: 'Bấm Lưu',
        observedResult: null,
        expectedResult: null,
        impact: null,
        userOrAudience: null,
        problem: null,
        desiredOutcome: null,
        currentWorkaround: null,
        priorityOrImpact: null,
        constraints: null,
      },
      nextQuestion: 'Sau khi bấm Lưu, điều gì xảy ra?',
      readyToSubmit: false,
    })
  );
  assert.equal(result.nextQuestion, 'Sau khi bấm Lưu, điều gì xảy ra?');
  assert.throws(() => parseCodexConversation('{"requestType":"BUG","readyToSubmit":false}'));
});
