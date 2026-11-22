import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgChatBridgeService } from './ag-chat-bridge.service.js';

describe('AgChatBridgeService.failRemoteChatJob', () => {
  it('rejects the waiting request immediately instead of waiting for the bridge timeout', async () => {
    // Mark a remote poller as present (long-poll returns null when there is no job).
    await AgChatBridgeService.getNextRemoteChatJob(5);

    const startedAt = Date.now();
    const pending = AgChatBridgeService.enqueueRemoteChatJob(undefined, 'ping', 'test', 60_000);
    const claimed = await AgChatBridgeService.getNextRemoteChatJob(500);
    assert.ok(claimed, 'job should be handed to the poller');

    assert.equal(AgChatBridgeService.failRemoteChatJob(claimed.id, 'Antigravity Language Server is not running'), true);
    await assert.rejects(pending, /Remote Antigravity bridge failed/);
    assert.ok(Date.now() - startedAt < 2_000, 'must fail fast, not after the 60s timeout');
  });

  it('returns false for unknown or already finished jobs', () => {
    assert.equal(AgChatBridgeService.failRemoteChatJob('does-not-exist'), false);
  });
});

describe('AgChatBridgeService.readAntigravityDaemonHubEnv', () => {
  it('reads httpPort + csrfToken from live hub_*.json while skipping dead PIDs', async () => {
    const daemonDir = await mkdtemp(join(tmpdir(), 'ag-hub-daemon-'));
    try {
      await writeFile(
        join(daemonDir, 'hub_41001.json'),
        JSON.stringify({ pid: 999001, httpPort: 41001, csrfToken: 'stale-token' })
      );
      await writeFile(
        join(daemonDir, 'hub_49523.json'),
        JSON.stringify({ pid: process.pid, httpPort: 49523, csrfToken: 'live-csrf-token-1234' })
      );

      const env = await AgChatBridgeService.readAntigravityDaemonHubEnv({
        daemonDir,
        projectId: 'proj-123',
        isPidAlive: (pid) => pid === process.pid,
        probePort: async (port) => (port === 49523 ? { ok: true } : null),
      });

      assert.deepEqual(env, {
        ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:49523',
        ANTIGRAVITY_CSRF_TOKEN: 'live-csrf-token-1234',
        ANTIGRAVITY_PROJECT_ID: 'proj-123',
      });
    } finally {
      await rm(daemonDir, { recursive: true, force: true });
    }
  });
});
