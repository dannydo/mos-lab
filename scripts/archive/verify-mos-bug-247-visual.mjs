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
const SCREENSHOT_DIR = path.join(ROOT, 'docs', 'screenshots');

const hardTimeout = setTimeout(() => {
  console.error('TIMEOUT: verify-mos-bug-247-visual.mjs exceeded 55s');
  process.exit(1);
}, 55000);
hardTimeout.unref();

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 4047;
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

function buildMockPayload() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const startIso = `${todayIso}T00:00:00+07:00`;
  const endDate = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
  const endIso = `${endDate}T23:59:59+07:00`;

  const config = {
    enabled: true,
    timeWindowStart: '08:00',
    timeWindowEnd: '22:00',
    tiers: [
      { id: 'tier-30', minBookings: 30, bonusPerDone: 5000 },
      { id: 'tier-40', minBookings: 40, bonusPerDone: 7000 },
      { id: 'tier-50', minBookings: 50, bonusPerDone: 10000 },
    ],
  };

  const game = {
    id: 78,
    title: 'WINGS BOOKING RACE - Tháng 11',
    description: 'Đua Booking Team nhận thưởng Done khách lẻ mỗi ngày',
    gameType: 'INDIVIDUAL',
    metricType: 'DONE',
    targetMetric: 'DONE',
    targetType: 'INDIVIDUAL',
    status: 'ACTIVE',
    startTime: startIso,
    endTime: endIso,
    startDate: startIso,
    endDate: endIso,
    targetGoal: 50,
    targetScore: 50,
    targetValue: 50,
    rewardPool: 5000000,
    entryFee: 0,
    prizeAmount: 5000000,
    rewardDescription: 'Thưởng Done khách lẻ theo mốc Booking Team',
    penaltyDescription: null,
    rewardRule: 'Thưởng Done khách lẻ theo mốc Booking Team',
    allowedBookingChannels: ['FB Page', 'Zalo OA'],
    doneBonusConfig: null,
    teamBookingDoneBonusConfig: config,
    teamKpiConfig: null,
    creatorId: 1,
    participantIds: [11, 12],
    teams: [],
    createdAt: startIso,
    updatedAt: startIso,
  };

  const yestIso = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  const tomIso = endDate;

  const summary = {
    enabled: true,
    config,
    effectiveTimeWindow: '08:00 - 22:00',
    todayDate: todayIso,
    todayTeamBookings: 42,
    todayTierLabel: '40–49 BK',
    todayBonusPerDone: 7000,
    todaySingleDone: 15,
    todayTotalBonus: 105000,
    nextTierMinBookings: 50,
    nextTierBonusPerDone: 10000,
    bookingsToNextTier: 8,
    totalSingleDone: 23,
    totalComboDoneExcluded: 3,
    totalBonus: 145000,
    staffTotals: [
      { staffId: 11, staffName: 'Lê Thị Minh Tâm', singleDoneCount: 14, totalBonus: 88000 },
      { staffId: 12, staffName: 'Nguyễn Hải Yến', singleDoneCount: 9, totalBonus: 57000 },
    ],
    dailyResults: [
      {
        date: yestIso,
        dateLabel: 'Hôm qua',
        isToday: false,
        isFuture: false,
        teamBookings: 34,
        matchedMinBookings: 30,
        tierLabel: '30–39 BK',
        bonusPerDone: 5000,
        totalSingleDone: 8,
        totalComboDoneExcluded: 1,
        totalDayBonus: 40000,
        staffBreakdown: [
          {
            staffId: 11,
            staffName: 'Lê Thị Minh Tâm',
            singleDoneCount: 5,
            comboDoneExcludedCount: 1,
            bonusPerDone: 5000,
            totalBonus: 25000,
          },
          {
            staffId: 12,
            staffName: 'Nguyễn Hải Yến',
            singleDoneCount: 3,
            comboDoneExcludedCount: 0,
            bonusPerDone: 5000,
            totalBonus: 15000,
          },
        ],
      },
      {
        date: todayIso,
        dateLabel: 'Hôm nay',
        isToday: true,
        isFuture: false,
        teamBookings: 42,
        matchedMinBookings: 40,
        tierLabel: '40–49 BK',
        bonusPerDone: 7000,
        totalSingleDone: 15,
        totalComboDoneExcluded: 2,
        totalDayBonus: 105000,
        staffBreakdown: [
          {
            staffId: 11,
            staffName: 'Lê Thị Minh Tâm',
            singleDoneCount: 9,
            comboDoneExcludedCount: 1,
            bonusPerDone: 7000,
            totalBonus: 63000,
          },
          {
            staffId: 12,
            staffName: 'Nguyễn Hải Yến',
            singleDoneCount: 6,
            comboDoneExcludedCount: 1,
            bonusPerDone: 7000,
            totalBonus: 42000,
          },
        ],
      },
      {
        date: tomIso,
        dateLabel: tomIso.slice(5).split('-').reverse().join('/'),
        isToday: false,
        isFuture: true,
        teamBookings: 0,
        matchedMinBookings: null,
        tierLabel: 'Chưa đạt mốc',
        bonusPerDone: 0,
        totalSingleDone: 0,
        totalComboDoneExcluded: 0,
        totalDayBonus: 0,
        staffBreakdown: [],
      },
    ],
    records: [
      {
        id: 1,
        gameId: 78,
        orderId: 901234,
        orderKey: 'ORD-901234',
        staffId: 11,
        staffName: 'Lê Thị Minh Tâm',
        customerName: 'Trần Ngọc Anh',
        rewardDate: todayIso,
        orderCompletedAt: `${todayIso}T14:20:00+07:00`,
        teamBookings: 42,
        tierLabel: '40–49 BK',
        bonusPerDone: 7000,
        bonusAmount: 7000,
      },
      {
        id: 2,
        gameId: 78,
        orderId: 901235,
        orderKey: 'ORD-901235',
        staffId: 12,
        staffName: 'Nguyễn Hải Yến',
        customerName: 'Phạm Bảo Châu',
        rewardDate: todayIso,
        orderCompletedAt: `${todayIso}T15:05:00+07:00`,
        teamBookings: 42,
        tierLabel: '40–49 BK',
        bonusPerDone: 7000,
        bonusAmount: 7000,
      },
    ],
  };

  const mockAvatar =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="#f59e0b"/></svg>'
    );

  const participants = [
    {
      staffId: 11,
      staffName: 'Lê Thị Minh Tâm',
      avatar: mockAvatar,
      rank: 1,
      score: 12,
      doneCount: 11,
      singleDoneCount: 9,
      teamBookingDoneBonus: 63000,
      targetProgressPercent: 80,
      progressPercent: 80,
      isTargetReached: false,
      status: 'ON_TRACK',
    },
    {
      staffId: 12,
      staffName: 'Nguyễn Hải Yến',
      avatar: mockAvatar,
      rank: 2,
      score: 9,
      doneCount: 8,
      singleDoneCount: 6,
      teamBookingDoneBonus: 42000,
      targetProgressPercent: 60,
      progressPercent: 60,
      isTargetReached: false,
      status: 'ON_TRACK',
    },
  ];

  const detail = {
    game,
    participants,
    leaderboard: participants,
    stats: {
      timeRemainingSeconds: 86400,
      totalParticipants: 2,
      completedCount: 0,
      totalScore: 21,
      averageProgress: 70,
    },
    metrics: {
      totalParticipants: 2,
      targetReachedCount: 0,
      onTrackCount: 2,
      totalScore: 21,
      averageProgress: 70,
    },
    recentEvents: [],
    doneBonusSummary: null,
    teamBookingDoneBonusSummary: summary,
    teamKpiSummary: null,
  };

  const staffList = [
    {
      id: 1,
      legacyStaffId: 1,
      displayName: 'Danny Do',
      username: 'danny',
      role: 'admin',
      avatarUrl: mockAvatar,
      isActive: true,
    },
    {
      id: 11,
      legacyStaffId: 11,
      displayName: 'Lê Thị Minh Tâm',
      username: 'tam',
      role: 'telesales',
      avatarUrl: mockAvatar,
      isActive: true,
    },
    {
      id: 12,
      legacyStaffId: 12,
      displayName: 'Nguyễn Hải Yến',
      username: 'yen',
      role: 'telesales',
      avatarUrl: mockAvatar,
      isActive: true,
    },
  ];

  return { game, detail, summary, staffList };
}

async function setupApiRoutes(page, mocks) {
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

      if (pathname === '/api/auth/me') return json({ user: mocks.staffList[0] });
      if (pathname === '/api/staff') return json(mocks.staffList);
      if (pathname === '/api/teams') return json({ items: [] });
      if (pathname === '/api/roles') return json([{ key: 'telesales', name: 'Telesales' }]);
      if (pathname === '/api/kpi/bk/config') return json({ defaultValidOrderHours: 48 });
      if (pathname === '/api/kpi/bk/games') return json({ games: [mocks.game] });
      if (pathname === '/api/kpi/bk/games/78') return json(mocks.detail);
      if (pathname === '/api/kpi/bk/games/78/team-booking-done-bonuses') return json(mocks.summary);
      if (pathname === '/api/kpi/bk/booking/leaderboard') return json([]);
      if (pathname === '/api/bug-reports/mine') {
        return json({ data: [], notifications: [], unreadCount: 0, actionRequiredCount: 0 });
      }
      if (pathname === '/api/notifications' || pathname === '/api/notifications/unread-count') {
        return json({ items: [], data: [], notifications: [], count: 0, unreadCount: 0 });
      }
      if (pathname.startsWith('/api/menu-access')) {
        return json({ items: [], policies: [], allowedPaths: ['/dashboard/bk'], isUnrestricted: true });
      }
      return json({ ok: true, items: [], data: [] });
    }
  );
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

  let browser;
  let exitCode = 0;
  try {
    await waitForServer(`http://127.0.0.1:${port}/dashboard/bk`);
    const mocks = buildMockPayload();
    const pageErrors = [];

    browser = await chromium.launch({ headless: true });

    const runScenario = async (themeMode) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
      await context.addInitScript(
        ({ user, mode }) => {
          localStorage.setItem('mos_token', 'mock-playwright-token');
          localStorage.setItem('mos_user', JSON.stringify(user));
          localStorage.setItem('mos_theme', mode);
          localStorage.setItem('mos_theme_preference', mode);
        },
        { user: mocks.staffList[0], mode: themeMode }
      );
      const page = await context.newPage();
      page.on('pageerror', (err) => {
        pageErrors.push(`${themeMode}: ${err.message}`);
      });
      await setupApiRoutes(page, mocks);

      await page.goto(`http://127.0.0.1:${port}/dashboard/bk?tab=game`, { waitUntil: 'networkidle' });
      const panel = page.getByTestId('bk-team-booking-done-bonus-panel');
      await panel.waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(400);

      const panelText = await panel.innerText();
      assert(panelText.includes('42 Booking'), `Expected 42 Booking in ${themeMode} panel`);
      assert(panelText.includes('40–49 BK'), `Expected 40–49 BK tier in ${themeMode} panel`);
      assert(panelText.includes('Lê Thị Minh Tâm'), `Expected Lê Thị Minh Tâm in ${themeMode} panel`);

      await panel.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `verify-mos-bug-247-panel-${themeMode}.png`),
        fullPage: false,
      });

      return { context, page };
    };

    // 1. Light Theme panel screenshot
    const lightSession = await runScenario('light');
    await lightSession.context.close();

    // 2. Dark Theme panel + drawer + create modal screenshots
    const darkSession = await runScenario('dark');
    const { page } = darkSession;

    // 3. Open details drawer and verify right-side close button
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: /Chi Tiết Thưởng Mốc BK/i }).click();
    const drawer = page.locator('.ant-drawer-content').first();
    await drawer.waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(400);

    const drawerBox = await drawer.boundingBox();
    const closeBox = await drawer.locator('.ant-drawer-close').first().boundingBox();
    assert(drawerBox && closeBox, 'Drawer and close button should have bounding boxes');
    assert(
      closeBox.x > drawerBox.x + drawerBox.width * 0.7,
      `Drawer close button must be on the right side (close.x=${closeBox.x}, drawerRight=${drawerBox.x + drawerBox.width})`
    );
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'verify-mos-bug-247-drawer-dark.png'),
      fullPage: false,
    });
    await drawer.locator('.ant-drawer-close').first().click();
    await drawer.waitFor({ state: 'hidden', timeout: 5000 });

    // 4. Open Create Game modal and apply WINGS BOOKING RACE preset
    await page.getByRole('button', { name: /Tạo Game Mới/i }).click();
    const modal = page.locator('.ant-modal-content').first();
    await modal.waitFor({ state: 'visible', timeout: 8000 });
    const presetBtn = modal.getByTestId('apply-wings-booking-race-preset-btn');
    await presetBtn.scrollIntoViewIfNeeded();
    await presetBtn.click();
    await page.waitForTimeout(350);

    const configBlock = modal.getByTestId('bk-team-booking-done-bonus-config');
    const configText = await configBlock.innerText();
    assert(configText.includes('3 mốc'), `Expected 3 mốc after applying preset, got: ${configText}`);
    assert(configText.includes('Dưới 30 Booking'), 'Expected baseline Dưới 30 Booking note');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'verify-mos-bug-247-modal-dark.png'),
      fullPage: false,
    });

    await darkSession.context.close();

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join('; ')}`);
    console.log('Playwright visual QA PASSED: light panel, dark panel, drawer, and create modal verified.');
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
