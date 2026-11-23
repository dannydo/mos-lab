#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = '/tmp';

const hardTimeout = setTimeout(() => {
  console.error('TIMEOUT: verify-mos-bug-260-visual.mjs exceeded 90s');
  process.exit(1);
}, 90000);
hardTimeout.unref();

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 4060;
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.status < 500) return;
    } catch {
      // Wait for server startup
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Next.js server did not become ready at ${url} within ${timeoutMs}ms`);
}

function buildScenarioData(initialClosed = false) {
  const fixedMission = {
    reportId: 254,
    key: 'MOS-FEAT-254',
    missionKey: 'MOS-FEAT-254',
    missionCode: 'MSN-254',
    requestType: 'FEATURE',
    title: 'Lưu ghi chú sau nối (user_note) trên /ios-app',
    status: 'FIXED',
    clarificationStatus: 'READY',
    stage: 'READY_FOR_REVIEW',
    stepIndex: 3,
    humanBadge: '🟢 Đã lên sóng · Mời kiểm tra',
    stageLabel: '🟢 Đã lên sóng · Mời kiểm tra',
    humanSummary:
      '🎉 Đã cập nhật lên web: Sửa lỗi Unknown column client_store_id khi lưu/tải Ghi chú sau nối trên /ios-app.',
    humanStatusSummary:
      '🎉 Đã cập nhật lên web: Sửa lỗi Unknown column client_store_id khi lưu/tải Ghi chú sau nối trên /ios-app.',
    canSuperAdminApproveCommit: false,
    canSuperAdminApproveDeploy: false,
    canReporterAccept: true,
    conversationId: 'space-ff2b500c',
    messageId: 'msg-254',
    taskId: 'task-254',
    updatedAt: '2026-11-21T08:35:00.000Z',
    superAdminActions: {
      canApproveImplementation: false,
      canApproveCommit: false,
      canApproveDeploy: false,
      canConfirmClose: true,
      activeJobId: null,
      executionPhase: 'AWAITING_REPORTER_ACCEPTANCE',
      changedFilesCount: 2,
      diffStat: '2 files changed',
      agentSummary: null,
    },
    reporterActions: {
      canAcceptOrReopen: true,
    },
  };

  const closedMission = {
    ...fixedMission,
    status: 'CLOSED',
    stage: 'COMPLETED',
    stepIndex: 4,
    humanBadge: '✅ Hoàn tất nhiệm vụ',
    stageLabel: '✅ Hoàn tất nhiệm vụ',
    humanSummary: 'Sửa lỗi Unknown column client_store_id khi lưu/tải Ghi chú sau nối trên /ios-app.',
    humanStatusSummary: 'Sửa lỗi Unknown column client_store_id khi lưu/tải Ghi chú sau nối trên /ios-app.',
    canReporterAccept: false,
    updatedAt: '2026-11-21T13:42:00.000Z',
    superAdminActions: {
      ...fixedMission.superAdminActions,
      canConfirmClose: false,
    },
    reporterActions: {
      canAcceptOrReopen: true,
    },
  };

  const milestoneReplies = [
    {
      id: 'th-msn-1',
      senderId: 'mos-mission-bot',
      senderName: '🚀 mOS Mission',
      senderRole: 'Trợ lý Kỹ thuật',
      text: '🚀 **Đã chuyển vào mOS Mission #MSN-254 (MOS-FEAT-254)**\nAnh Danny đã chuyển yêu cầu này sang mOS Mission.',
      timeLabel: '12:46',
      createdAt: '2026-11-21T05:46:00.000Z',
      isMissionMilestone: true,
      missionStage: 'RECEIVED',
      missionId: 254,
    },
    {
      id: 'th-msn-2',
      senderId: 'mos-mission-bot',
      senderName: '🚀 mOS Mission',
      senderRole: 'Trợ lý Kỹ thuật',
      text: '🎉 **Đã cập nhật lên hệ thống chính thức (#MSN-254)!**\nMời Thảo Ly kiểm tra thử kết quả rồi bấm [✅ Đã đúng ý] hoặc [🔄 Cần chỉnh thêm] nhé!',
      timeLabel: '15:35',
      createdAt: '2026-11-21T08:35:00.000Z',
      isMissionMilestone: true,
      missionStage: 'READY_FOR_REVIEW',
      missionId: 254,
    },
  ];

  const completedReply = {
    id: 'th-msn-3',
    senderId: 'mos-mission-bot',
    senderName: '🚀 mOS Mission',
    senderRole: 'Trợ lý Kỹ thuật',
    text: '✅ **Hoàn tất nhiệm vụ #MSN-254!**\nCảm ơn bạn đã kiểm tra và xác nhận kết quả. Công việc trong mOS Chat đã được tự động đánh dấu hoàn thành.',
    timeLabel: '20:42',
    createdAt: '2026-11-21T13:42:00.000Z',
    isMissionMilestone: true,
    missionStage: 'COMPLETED',
    missionId: 254,
  };

  const activeMission = initialClosed ? closedMission : fixedMission;
  const activeThread = initialClosed ? [...milestoneReplies, completedReply] : milestoneReplies;

  const msg = {
    id: 'msg-254',
    conversationId: 'space-ff2b500c',
    senderId: '6',
    senderName: 'Thảo Ly',
    senderRole: 'Staff',
    text: 'Lưu ghi chú sau nối trên /ios-app bị báo lỗi Unknown column',
    timeLabel: '12:40',
    createdAt: '2026-11-21T05:40:00.000Z',
    reactions: {},
    attachments: [],
    missionId: 254,
    missionKey: 'MOS-FEAT-254',
    mission: activeMission,
    thread: activeThread,
  };

  const task = {
    id: 'task-254',
    conversationId: 'space-ff2b500c',
    conversationName: 'cv🪶',
    sourceMessageId: 'msg-254',
    title: 'Lưu ghi chú sau nối (user_note) trên /ios-app',
    done: initialClosed,
    priority: 'high',
    creatorId: '1',
    creatorName: 'Danny Do',
    assigneeId: '6',
    assigneeName: 'Thảo Ly',
    missionId: 254,
    missionKey: 'MOS-FEAT-254',
    mission: activeMission,
    createdAt: '2026-11-21T05:46:00.000Z',
    updatedAt: '2026-11-21T13:42:00.000Z',
  };

  const user = {
    id: 6,
    legacyStaffId: 6,
    username: 'thaoly',
    displayName: 'Thảo Ly',
    role: 'staff',
    isActive: true,
  };

  return {
    user,
    fixedMission,
    closedMission,
    completedReply,
    bootstrap: {
      conversations: [
        {
          id: 'space-ff2b500c',
          type: 'space',
          name: 'cv🪶',
          subtitle: 'Kênh chuyên môn',
          memberCount: 5,
          memberIds: [1, 6],
          unreadCount: 0,
          updatedAt: '2026-11-21T13:42:00.000Z',
          messages: [msg],
        },
      ],
      tasks: [task],
      staffDirectory: [
        { id: 1, displayName: 'Danny Do', role: 'Super Admin' },
        { id: 6, displayName: 'Thảo Ly', role: 'Staff' },
      ],
      accessConfig: { allowAllStaff: true, allowedGroupKeys: [], allowedStaffIds: [] },
      canAccessChat: true,
    },
  };
}

async function setupRoutes(page, state) {
  let actionCalls = 0;

  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const url = new URL(route.request().url());
      const pathname = url.pathname;
      const json = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(data),
        });

      if (pathname === '/api/telemetry/frontend-issues') {
        console.error('[frontend-issue]', route.request().postData());
        return json({ ok: true });
      }
      if (pathname === '/api/ai/chat/sessions') {
        return json({ success: true, sessions: [], data: [] });
      }
      if (pathname === '/api/auth/me') return json({ user: state.user });
      if (pathname === '/api/chat/stream') {
        return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: connected\ndata: {}\n\n' });
      }
      if (pathname === '/api/chat/bootstrap') return json(state.bootstrap);
      if (pathname === '/api/chat/sync' || pathname === '/api/chat/sync-delta') {
        return json({
          success: true,
          cursor: '2026-11-21T13:45:00.000Z',
          updatedConversations: [],
          updatedMessages: [],
          updatedMissions: [],
          updatedTasks: [],
        });
      }
      if (pathname === '/api/chat/calls/active') return json({ activeCall: null });
      if (pathname === '/api/chat/workflows') return json({ success: true, templates: [], instances: [] });
      if (pathname === '/api/chat/missions/254/action') {
        actionCalls += 1;
        const msg = state.bootstrap.conversations[0].messages[0];
        const updatedMsg = {
          ...msg,
          mission: state.closedMission,
          thread: [...msg.thread, state.completedReply],
        };
        state.bootstrap.conversations[0].messages[0] = updatedMsg;
        state.bootstrap.tasks[0] = {
          ...state.bootstrap.tasks[0],
          done: true,
          mission: state.closedMission,
        };
        return json({
          success: true,
          mission: state.closedMission,
          message: updatedMsg,
          task: state.bootstrap.tasks[0],
          systemReply: state.completedReply,
        });
      }
      if (pathname === '/api/bug-reports/mine') {
        return json({ data: [], notifications: [], unreadCount: 0, actionRequiredCount: 0 });
      }
      if (pathname === '/api/notifications' || pathname === '/api/notifications/unread-count') {
        return json({ items: [], data: [], notifications: [], count: 0, unreadCount: 0 });
      }
      if (pathname.startsWith('/api/menu-access')) {
        return json({ items: [], policies: [], allowedPaths: ['/chat', '/dashboard'], isUnrestricted: true });
      }
      return json({ success: true, items: [], data: [] });
    }
  );

  return {
    getActionCalls: () => actionCalls,
  };
}

async function main() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  const port = await getFreePort();
  const nextBin = path.join(ROOT, 'apps', 'web', 'node_modules', '.bin', 'next');

  const server = spawn(nextBin, ['start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: path.join(ROOT, 'apps', 'web'),
    env: { ...process.env, PORT: String(port) },
    stdio: 'pipe',
  });
  server.stderr.on('data', (d) => process.stderr.write(`[next stderr] ${d}`));

  let browser;
  let exitCode = 0;
  try {
    await waitForServer(`http://127.0.0.1:${port}/chat`);
    browser = await chromium.launch({ headless: true });

    // Scenario 1: Light Theme - Click "Đã đúng ý (Nghiệm thu hoàn tất)" on FIXED mission and confirm immediate removal
    {
      const state = buildScenarioData(false);
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      });
      await context.addInitScript(
        ({ user }) => {
          HTMLCanvasElement.prototype.getContext = () => null;
          HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
          localStorage.setItem('mos_token', 'mock-playwright-token');
          localStorage.setItem('mos_user', JSON.stringify(user));
          localStorage.setItem('mos_theme', 'light');
          localStorage.setItem('mos_theme_preference', 'light');
        },
        { user: state.user }
      );
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      const takeSnap = async (fileName) => {
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
        await fs.writeFile(path.join(SCREENSHOT_DIR, fileName), Buffer.from(data, 'base64'));
      };
      const t0 = Date.now();
      page.on('pageerror', (err) => console.error(`[+${Date.now() - t0}ms pageerror]`, err.message));
      const tracker = await setupRoutes(page, state);

      console.log('Navigating to /chat...');
      await page.goto(`http://127.0.0.1:${port}/chat?convId=space-ff2b500c&threadId=msg-254`, {
        waitUntil: 'domcontentloaded',
      });
      console.log('domcontentloaded in', Date.now() - t0, 'ms');

      const acceptBtn = page.getByRole('button', { name: /Đã đúng ý \(Nghiệm thu hoàn tất\)/i }).first();
      try {
        await acceptBtn.waitFor({ state: 'visible', timeout: 8000 });
      } catch (err) {
        console.error('Debug body text:', (await page.evaluate(() => document.body.innerText)).slice(0, 600));
        await takeSnap('mos-bug-260-debug.png');
        throw err;
      }
      await takeSnap('mos-bug-260-before-accept-light.png');

      await acceptBtn.click();
      await page.waitForTimeout(500);

      assert.equal(tracker.getActionCalls(), 1, 'Expected REPORTER_ACCEPT API call once');
      const remainingBtns = await page.getByRole('button', { name: /Đã đúng ý \(Nghiệm thu hoàn tất\)/i }).count();
      assert.equal(remainingBtns, 0, 'Green acceptance button must disappear immediately after clicking');

      const completedTextVisible = await page.getByText('✅ Hoàn tất nhiệm vụ').first().isVisible();
      assert.equal(completedTextVisible, true, 'Completed badge must be visible after acceptance');

      await takeSnap('mos-bug-260-after-accept-light.png');
      await context.close();
    }

    // Scenario 2: Dark Theme - Reopen already-CLOSED mission (with reporterActions.canAcceptOrReopen=true)
    {
      const state = buildScenarioData(true);
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      });
      await context.addInitScript(
        ({ user }) => {
          HTMLCanvasElement.prototype.getContext = () => null;
          HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
          localStorage.setItem('mos_token', 'mock-playwright-token');
          localStorage.setItem('mos_user', JSON.stringify(user));
          localStorage.setItem('mos_theme', 'dark');
          localStorage.setItem('mos_theme_preference', 'dark');
        },
        { user: state.user }
      );
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      const takeSnap = async (fileName) => {
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
        await fs.writeFile(path.join(SCREENSHOT_DIR, fileName), Buffer.from(data, 'base64'));
      };
      await setupRoutes(page, state);

      await page.goto(`http://127.0.0.1:${port}/chat?convId=space-ff2b500c&threadId=msg-254`, {
        waitUntil: 'domcontentloaded',
      });

      await page.getByText('✅ Hoàn tất nhiệm vụ').first().waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(400);

      const remainingBtns = await page.getByRole('button', { name: /Đã đúng ý \(Nghiệm thu hoàn tất\)/i }).count();
      assert.equal(
        remainingBtns,
        0,
        'Green acceptance button must NOT render when reopening an already CLOSED/COMPLETED mission'
      );

      await takeSnap('mos-bug-260-closed-dark.png');
      await context.close();
    }

    // Scenario 3: Dark Theme - Tasks tab must NOT show "Chờ nghiệm thu" badge on CLOSED mission
    {
      const state = buildScenarioData(true);
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      });
      await context.addInitScript(
        ({ user }) => {
          HTMLCanvasElement.prototype.getContext = () => null;
          HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
          localStorage.setItem('mos_token', 'mock-playwright-token');
          localStorage.setItem('mos_user', JSON.stringify(user));
          localStorage.setItem('mos_theme', 'dark');
          localStorage.setItem('mos_theme_preference', 'dark');
        },
        { user: state.user }
      );
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      const takeSnap = async (fileName) => {
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
        await fs.writeFile(path.join(SCREENSHOT_DIR, fileName), Buffer.from(data, 'base64'));
      };
      await setupRoutes(page, state);

      await page.goto(`http://127.0.0.1:${port}/chat?convId=space-ff2b500c&tab=tasks`, {
        waitUntil: 'domcontentloaded',
      });

      const doneFilterBtn = page.getByRole('button', { name: /Đã xong/i }).first();
      await doneFilterBtn.waitFor({ state: 'visible', timeout: 15000 });
      await doneFilterBtn.click();
      await page.getByText('#MOS-FEAT-254').first().waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(300);

      const awaitingAcceptCount = await page.getByText('Chờ nghiệm thu').count();
      assert.equal(awaitingAcceptCount, 0, 'Tasks tab must NOT show "Chờ nghiệm thu" on CLOSED mission');

      await takeSnap('mos-bug-260-tasks-dark.png');

      // Open Task Detail Sheet and verify green acceptance button is NOT shown on CLOSED mission
      await page.getByText('#MOS-FEAT-254').first().click();
      await page.getByText('✅ Hoàn tất nhiệm vụ').first().waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(300);

      const detailAcceptBtns = await page.getByRole('button', { name: /Đã đúng ý \(Nghiệm thu hoàn tất\)/i }).count();
      assert.equal(detailAcceptBtns, 0, 'Task detail sheet must NOT show green acceptance button on CLOSED mission');

      await takeSnap('mos-bug-260-task-detail-dark.png');
      await context.close();
    }

    console.log('Playwright visual QA PASSED: Light & Dark mobile thread, tasks tab, and task detail verified.');
  } catch (err) {
    exitCode = 1;
    console.error('Playwright visual QA FAILED:', err);
  } finally {
    await browser?.close().catch(() => {});
    server.kill('SIGKILL');
    process.exit(exitCode);
  }
}

main();
