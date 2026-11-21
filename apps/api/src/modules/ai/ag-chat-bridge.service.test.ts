import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
