import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgChatBridgeService } from './ag-chat-bridge.service.js';
import { runAssistantEngines } from './ai-service/ai-engine-runner.js';

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

describe('AgChatBridgeService.detectAntigravityLsEnv', () => {
  it('ignores stale ANTIGRAVITY_LS_ADDRESS env override when endpoint is unreachable and falls back to live hub_*.json', async () => {
    const daemonDir = await mkdtemp(join(tmpdir(), 'ag-hub-stale-env-'));
    try {
      await writeFile(
        join(daemonDir, 'hub_46121.json'),
        JSON.stringify({ pid: process.pid, httpPort: 46121, csrfToken: 'fresh-hub-csrf' })
      );

      const detected = await AgChatBridgeService.detectAntigravityLsEnv({
        env: {
          ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:45281',
          ANTIGRAVITY_CSRF_TOKEN: 'stale-csrf-token',
          ANTIGRAVITY_PROJECT_ID: 'proj-test',
        },
        daemonDir,
        verifyEndpoint: async () => false,
        isPidAlive: (pid) => pid === process.pid,
        probePort: async (port) => (port === 46121 ? { ok: true } : null),
      });

      assert.deepEqual(detected, {
        ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:46121',
        ANTIGRAVITY_CSRF_TOKEN: 'fresh-hub-csrf',
        ANTIGRAVITY_PROJECT_ID: 'proj-test',
      });
    } finally {
      await rm(daemonDir, { recursive: true, force: true });
    }
  });

  it('uses ANTIGRAVITY_LS_ADDRESS env override when endpoint verification succeeds', async () => {
    const detected = await AgChatBridgeService.detectAntigravityLsEnv({
      env: {
        ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:46121',
        ANTIGRAVITY_CSRF_TOKEN: 'live-env-csrf',
        ANTIGRAVITY_PROJECT_ID: 'proj-test',
      },
      verifyEndpoint: async (addr, token) => addr === '127.0.0.1:46121' && token === 'live-env-csrf',
    });

    assert.deepEqual(detected, {
      ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:46121',
      ANTIGRAVITY_CSRF_TOKEN: 'live-env-csrf',
      ANTIGRAVITY_PROJECT_ID: 'proj-test',
    });
  });
});

describe('AgChatBridgeService debug & model metadata propagation', () => {
  it('preserves model, debugMode, and executionTimeoutMs on claimed remote chat job', async () => {
    await AgChatBridgeService.getNextRemoteChatJob(5);
    const pending = AgChatBridgeService.enqueueRemoteChatJob(undefined, 'debug prompt', 'Debug Title', 60_000, 's-1', {
      scope: 'mos-chat-space:space-dev',
      targetChatConvId: 'space-dev',
      userName: 'Danny Do',
      model: 'claude-opus-5-5-medium',
      debugMode: true,
      executionTimeoutMs: 420_000,
    });
    const claimed = await AgChatBridgeService.getNextRemoteChatJob(500);
    assert.ok(claimed);
    assert.equal(claimed.model, 'claude-opus-5-5-medium');
    assert.equal(claimed.debugMode, true);
    assert.equal(claimed.timeoutMs, 420_000);

    AgChatBridgeService.completeRemoteChatJob(claimed.id, {
      conversationId: 'ag-conv-99',
      response: { content: 'Đã kiểm tra xong', thinking: null, suggestedAction: null },
    });
    const result = await pending;
    assert.equal(result.conversationId, 'ag-conv-99');
  });

  it('runAssistantEngines in debugMode enables tools, includes room context, forwards modelId, and never falls back to Gemini', async () => {
    let capturedPrompt = '';
    let capturedModel: string | undefined;
    let capturedTimeoutMs: number | undefined;

    const okResult = await runAssistantEngines({
      sessionId: 'sess-debug-1',
      staffId: 1,
      trimmedMessage: 'Kiểm tra nguyên nhân lỗi nút duyệt commit',
      scope: 'mos-chat-space:space-core',
      context: { page: 'mos-chat-space:space-core', userName: 'Danny Do', myRole: 'super_admin' },
      recentMessages: [{ role: 'user', content: 'Kiểm tra nguyên nhân lỗi nút duyệt commit' }],
      liveCustomerText: '',
      liveStaffCareerText: '',
      liveGoogleWorkspaceText: '',
      liveRoomContextText: '<LIVE_CHAT_ROOM_CONTEXT>\n- Anh A: Nút duyệt bị 403\n</LIVE_CHAT_ROOM_CONTEXT>',
      targetChatConvId: 'space-core',
      debugMode: true,
      modelId: 'gemini-4-neon-high',
      agBridge: {
        isLocalAgAvailable: async () => true,
        executeLocalAgPrompt: async (_convId, prompt, _title, opts) => {
          capturedPrompt = prompt;
          capturedModel = opts?.model;
          capturedTimeoutMs = opts?.timeoutMs;
          return {
            conversationId: 'ag-debug-conv-1',
            response: { content: 'Nguyên nhân nằm ở route guard.', thinking: null, suggestedAction: null },
          };
        },
        enqueueRemoteChatJob: async () => null,
        markJobDelivered: () => {},
      },
    });

    assert.equal(okResult.source, 'ag');
    assert.equal(capturedModel, 'gemini-4-neon-high');
    assert.equal(capturedTimeoutMs, 420_000);
    assert.ok(!capturedPrompt.includes('TUYỆT ĐỐI KHÔNG GỌI BẤT KỲ TOOL NÀO'));
    assert.ok(capturedPrompt.includes('CHẾ ĐỘ ANTIGRAVITY DEBUG'));
    assert.ok(capturedPrompt.includes('KHÔNG chỉnh sửa, ghi đè, hoặc xóa file mã nguồn'));
    assert.ok(capturedPrompt.includes('<LIVE_CHAT_ROOM_CONTEXT>'));

    // When bridge is offline in debugMode, must return diagnostic offline notice (never Gemini fallback)
    const offlineResult = await runAssistantEngines({
      sessionId: 'sess-debug-2',
      staffId: 1,
      trimmedMessage: 'Test flow login',
      scope: 'mos-chat-private',
      context: { page: 'mos-chat-private', userName: 'Danny Do', myRole: 'super_admin' },
      recentMessages: [{ role: 'user', content: 'Test flow login' }],
      liveCustomerText: '',
      liveStaffCareerText: '',
      liveGoogleWorkspaceText: '',
      debugMode: true,
      modelId: 'claude-sonnet-5-5-high',
      agBridge: {
        isLocalAgAvailable: async () => false,
        executeLocalAgPrompt: async () => null,
        enqueueRemoteChatJob: async () => {
          throw new Error('No active remote Antigravity bridge poller connected');
        },
        markJobDelivered: () => {},
      },
    });

    assert.equal(offlineResult.source, 'fallback');
    assert.match(offlineResult.parsedResponse.content, /Không thể chạy AG Debug Mode/);
  });
});
