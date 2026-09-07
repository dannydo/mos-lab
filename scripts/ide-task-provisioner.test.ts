import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readManagedRuntimeConfig, readProvisioningLedger, runProvisionerOnce } from './ide-task-provisioner.js';
import { renderLaunchAgentPlist } from './install-ide-task-provisioner.js';

const request = {
  jobId: '11111111-1111-4111-8111-111111111111',
  requestId: '22222222-2222-4222-8222-222222222222',
  reportId: 30,
  ticketKey: 'MOS-FEAT-30',
  title: 'Isolated provisioning test',
  branchName: 'codex/mos-feat-30-11111111',
  sourceVersion: 'source-v1',
  planVersion: 'plan-v1',
};

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), { status, headers: { 'Content-Type': 'application/json' } });
}

test('provisioner persists a created task before completion and reuses it after a callback interruption', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'mos-ide-provisioner-'));
  const ledgerPath = join(temporary, 'ledger.json');
  let creates = 0;
  let worktrees = 0;
  let completions = 0;
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/provisioning/next')) return response(request);
    if (url.endsWith('/complete')) {
      completions += 1;
      return completions === 1 ? response({ error: 'interrupted' }, 503) : response({ outcome: 'BOUND' });
    }
    throw new Error(`Unexpected URL: ${url} ${init?.method || 'GET'}`);
  };
  const deps = {
    apiUrl: 'http://127.0.0.1/api',
    createTask: async () => {
      creates += 1;
      return 'task-ide-isolated-30';
    },
    fetch: fetcher,
    ledgerPath,
    prepareWorktree: async () => {
      worktrees += 1;
      return join(temporary, 'worktree');
    },
    provisionerId: 'test-provisioner',
    token: 'test-token-that-is-longer-than-32-characters',
  };
  try {
    await assert.rejects(() => runProvisionerOnce(deps), /rejected request \(503\)/);
    assert.deepEqual(readProvisioningLedger(ledgerPath), {
      [request.requestId]: { taskId: 'task-ide-isolated-30', worktreePath: join(temporary, 'worktree') },
    });
    assert.equal(await runProvisionerOnce(deps), 'BOUND');
    assert.equal(creates, 1);
    assert.equal(worktrees, 1);
    assert.deepEqual(readProvisioningLedger(ledgerPath), {});
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('provisioner does not create a task when the bridge has no pending request', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'mos-ide-provisioner-'));
  try {
    const result = await runProvisionerOnce({
      apiUrl: 'http://127.0.0.1/api',
      createTask: async () => {
        throw new Error('must not create');
      },
      fetch: async () => response(null),
      ledgerPath: join(temporary, 'ledger.json'),
      prepareWorktree: async () => {
        throw new Error('must not prepare');
      },
      provisionerId: 'test-provisioner',
      token: 'test-token-that-is-longer-than-32-characters',
    });
    assert.equal(result, 'IDLE');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('managed runtime config is 0600, separate from the bearer, and rejects an exposed config', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'mos-ide-provisioner-config-'));
  const configPath = join(temporary, 'runtime.env');
  try {
    await writeFile(
      configPath,
      [
        'MOS_IDE_PROVISIONER_REPOSITORY=/tmp/repository',
        'MOS_IDE_PROVISIONER_WORKTREE_ROOT=/tmp/worktrees',
        'MOS_IDE_PROVISIONER_API_URL=https://api.lab.masteros.app/api',
        'MOS_IDE_PROVISIONER_ID=test-companion',
        '',
      ].join('\n'),
      { mode: 0o600 }
    );
    assert.deepEqual(readManagedRuntimeConfig(configPath), {
      repository: '/tmp/repository',
      worktreeRoot: '/tmp/worktrees',
      apiUrl: 'https://api.lab.masteros.app/api',
      provisionerId: 'test-companion',
    });
    await chmod(configPath, 0o644);
    assert.throws(() => readManagedRuntimeConfig(configPath), /must not be group\/world-readable/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('launchd service definition contains no bridge bearer or nonce and starts the polling service', () => {
  const plist = renderLaunchAgentPlist('/tmp/mos-lab', '/opt/homebrew/bin/pnpm');
  assert.match(plist, /ide-task-provisioner:service/);
  assert.match(plist, /RunAtLoad/);
  assert.match(plist, /KeepAlive/);
  assert.doesNotMatch(plist, /TOKEN|NONCE|Authorization/i);
});
