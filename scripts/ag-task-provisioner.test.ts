import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  buildAgentPrompt,
  readManagedRuntimeConfig,
  readProvisioningLedger,
  runProvisionerOnce,
  runClarificationWatcher,
} from './ag-task-provisioner.js';

const mockRequest = {
  jobId: '11111111-1111-4111-8111-111111111111',
  requestId: '22222222-2222-4222-8222-222222222222',
  reportId: 23,
  ticketKey: 'MOS-FEAT-23',
  title: 'Track Agent execution time',
  branchName: 'task/mos-feat-23-agent-time',
  sourceVersion: 'source-v1',
  planVersion: 'plan-v1',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), { status, headers: { 'Content-Type': 'application/json' } });
}

test('buildAgentPrompt formats clear instructions with worktree and UI-007 invariants', () => {
  const prompt = buildAgentPrompt(mockRequest, '/tmp/worktree/ag-job-1');
  assert.match(prompt, /MOS-FEAT-23/);
  assert.match(prompt, /Track Agent execution time/);
  assert.match(prompt, /cd \/tmp\/worktree\/ag-job-1/);
  assert.match(prompt, /Điều răn UI-007/);
  assert.match(prompt, /TUYỆT ĐỐI KHÔNG commit vào nhánh main/);
});

test('ag-task-provisioner returns IDLE when no pending AG task is available', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'ag-prov-test-'));
  const ledgerPath = join(temporary, 'ledger.json');
  try {
    const result = await runProvisionerOnce({
      apiUrl: 'http://127.0.0.1:4001/api',
      createTask: async () => {
        throw new Error('Must not call createTask');
      },
      fetch: async () => jsonResponse(null),
      ledgerPath,
      prepareWorktree: async () => {
        throw new Error('Must not call prepareWorktree');
      },
      provisionerId: 'test-ag-provisioner',
      token: 'test-token-over-thirty-two-chars-long-example',
    });
    assert.equal(result, 'IDLE');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('ag-task-provisioner persists created session and completes task successfully', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'ag-prov-test-'));
  const ledgerPath = join(temporary, 'ledger.json');
  let creates = 0;
  let worktrees = 0;
  let completions = 0;
  let voices = 0;

  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/ag-task-bridge/provisioning/next')) {
      return jsonResponse(mockRequest);
    }
    if (url.endsWith('/complete')) {
      completions += 1;
      const body = JSON.parse(String(init?.body || '{}'));
      assert.equal(body.requestId, mockRequest.requestId);
      assert.equal(body.taskId, 'ag-conv-uuid-1234');
      return jsonResponse({ success: true });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const deps = {
    apiUrl: 'http://127.0.0.1:4001/api',
    createTask: async () => {
      creates += 1;
      return 'ag-conv-uuid-1234';
    },
    prepareWorktree: async () => {
      worktrees += 1;
      return join(temporary, 'worktree');
    },
    notifyVoice: async (msg: string) => {
      voices += 1;
      assert.match(msg, /MOS-FEAT-23/);
    },
    fetch: fetcher,
    ledgerPath,
    provisionerId: 'test-ag-provisioner',
    token: 'test-token-over-thirty-two-chars-long-example',
  };

  try {
    const outcome = await runProvisionerOnce(deps);
    assert.equal(outcome, 'BOUND');
    assert.equal(creates, 1);
    assert.equal(worktrees, 1);
    assert.equal(completions, 1);
    assert.equal(voices, 1);
    assert.deepEqual(readProvisioningLedger(ledgerPath), {});
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('ag-task-provisioner recovers idempotently if completion callback is interrupted', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'ag-prov-test-'));
  const ledgerPath = join(temporary, 'ledger.json');
  let creates = 0;
  let worktrees = 0;
  let completions = 0;

  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/ag-task-bridge/provisioning/next')) {
      return jsonResponse(mockRequest);
    }
    if (url.endsWith('/complete')) {
      completions += 1;
      if (completions === 1) {
        return jsonResponse({ error: 'temporary network failure' }, 503);
      }
      return jsonResponse({ success: true });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const deps = {
    apiUrl: 'http://127.0.0.1:4001/api',
    createTask: async () => {
      creates += 1;
      return 'ag-conv-uuid-1234';
    },
    prepareWorktree: async () => {
      worktrees += 1;
      return join(temporary, 'worktree');
    },
    fetch: fetcher,
    ledgerPath,
    provisionerId: 'test-ag-provisioner',
    token: 'test-token-over-thirty-two-chars-long-example',
  };

  try {
    // First run fails at completion
    await assert.rejects(() => runProvisionerOnce(deps), /rejected request \(503\)/);
    assert.equal(creates, 1);
    assert.equal(worktrees, 1);
    // Ledger has saved the session
    const saved = readProvisioningLedger(ledgerPath);
    assert.equal(saved[mockRequest.requestId]?.taskId, 'ag-conv-uuid-1234');

    // Second run reuses the saved session without re-creating worktree or session
    const outcome = await runProvisionerOnce(deps);
    assert.equal(outcome, 'BOUND');
    assert.equal(creates, 1, 'createTask must not be called a second time');
    assert.equal(worktrees, 1, 'prepareWorktree must not be called a second time');
    assert.equal(completions, 2);
    assert.deepEqual(readProvisioningLedger(ledgerPath), {});
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('ag-task-provisioner defers task when session creation fails before ledger write', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'ag-prov-test-'));
  const ledgerPath = join(temporary, 'ledger.json');
  let defers = 0;

  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/ag-task-bridge/provisioning/next')) return jsonResponse(mockRequest);
    if (url.endsWith('/defer')) {
      defers += 1;
      return jsonResponse({ deferred: true });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const deps = {
    apiUrl: 'http://127.0.0.1:4001/api',
    createTask: async () => {
      throw new Error('agentapi binary crashed');
    },
    prepareWorktree: async () => join(temporary, 'worktree'),
    fetch: fetcher,
    ledgerPath,
    provisionerId: 'test-ag-provisioner',
    token: 'test-token-over-thirty-two-chars-long-example',
  };

  try {
    await assert.rejects(() => runProvisionerOnce(deps), /agentapi binary crashed/);
    assert.equal(defers, 1);
    assert.deepEqual(readProvisioningLedger(ledgerPath), {});
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('managed runtime config enforces 0600 permissions and parses keys', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'ag-prov-test-'));
  const envPath = join(temporary, 'config.env');
  try {
    await writeFile(
      envPath,
      [
        'MOS_AG_PROVISIONER_REPOSITORY=/tmp/repo',
        'MOS_AG_PROVISIONER_WORKTREE_ROOT=/tmp/worktrees',
        'MOS_AG_PROVISIONER_API_URL=https://api.lab.masteros.app/api',
        'MOS_AG_PROVISIONER_ID=test-ag-desktop',
      ].join('\n')
    );
    await chmod(envPath, 0o600);
    const config = readManagedRuntimeConfig(envPath);
    assert.equal(config.repository, '/tmp/repo');
    assert.equal(config.worktreeRoot, '/tmp/worktrees');
    assert.equal(config.apiUrl, 'https://api.lab.masteros.app/api');
    assert.equal(config.provisionerId, 'test-ag-desktop');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('runClarificationWatcher returns IDLE when no follow-up job is available', async () => {
  const result = await runClarificationWatcher({
    apiUrl: 'http://127.0.0.1:4001/api',
    token: 'test-token-over-thirty-two-chars-long-example',
    provisionerId: 'test-ag-desktop',
    repository: '/tmp/repo',
    fetch: async () => jsonResponse(null),
  });
  assert.equal(result, 'IDLE');
});

test('runClarificationWatcher claims and completes follow-up job successfully', async () => {
  let completed = false;
  let voiceNotified = false;

  const mockJob = {
    id: 'follow-up-uuid-1',
    ticketId: 34,
    ticketKey: 'MOS-BUG-34',
    eventKind: 'CREATED',
    leaseToken: 'lease-token-123',
    context: {
      requestType: 'BUG',
      title: 'em không đổi lịch đặt sẵn được',
      description: 'em không đổi lịch đặt sẵn được ở trên này',
      status: 'NEW',
      clarificationStatus: 'PENDING_AGENT',
      sourcePath: '/dashboard/loca',
    },
  };

  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/request-classifier/inbox-follow-ups/claim')) {
      return jsonResponse(mockJob);
    }
    if (url.includes('/complete')) {
      completed = true;
      const body = JSON.parse(String(init?.body || '{}'));
      assert.equal(body.leaseToken, 'lease-token-123');
      assert.equal(body.result.action, 'PROGRESS_REVIEWED');
      assert.match(body.result.note, /Antigravity IDE/);
      return jsonResponse({ success: true });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const result = await runClarificationWatcher({
    apiUrl: 'http://127.0.0.1:4001/api',
    token: 'test-token-over-thirty-two-chars-long-example',
    provisionerId: 'test-ag-desktop',
    repository: '/tmp/repo',
    fetch: fetcher,
    notifyVoice: async (msg: string) => {
      voiceNotified = true;
      assert.match(msg, /MOS-BUG-34/);
    },
  });

  assert.equal(result, 'CLARIFIED');
  assert.equal(completed, true);
  assert.equal(voiceNotified, true);
});
