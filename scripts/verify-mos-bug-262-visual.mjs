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
  console.error('TIMEOUT: verify-mos-bug-262-visual.mjs exceeded 90s');
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
      const port = typeof addr === 'object' && addr ? addr.port : 4062;
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 25000) {
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

function buildMockCareerData() {
  const user = {
    id: 1,
    username: 'danny',
    displayName: 'Danny Do',
    name: 'Danny Do',
    role: 'super_admin',
    email: 'danny@wingslashes.com',
    avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocIJJep0bLuLUhfNQp8giJhSH0vBc8l7Bk_IVJsDkf-UNLrFGa17Hg=s96-c',
  };

  const staffList = [
    {
      id: 35,
      displayName: 'HânEmBé',
      username: 'hanembe',
      role: 'lt',
      careerRole: 'CV',
      storeId: 16,
      branchName: 'Estella Place',
      branchCode: 'EP',
      ordersCount: 360,
      fixRate: 0,
      totalTip: 12_000_000,
      tipRatioAboveShop: 0.12,
      staffTipRate: 0.52,
      shopTipRate: 0.45,
      selfComboRate: 0.28,
      happinessIndex: 0.85,
      bananaCount: 24,
      bananaBalance: 120,
      qaAuditsCount: 4,
      servicesPerHour: 0.59,
      revenuePerHour: 231_481,
      actualWorkingHours: 207,
      totalCompletedServices: 123,
      fullSetCount: 87,
      comboRetainCount: 29,
      singleRetainCount: 7,
      serviceRevenue: 47_916_599,
      productivity: {
        totalCompletedServices: 123,
        fullSetCount: 87,
        comboRetainCount: 29,
        singleRetainCount: 7,
        actualWorkingHours: 207,
        servicesPerHour: 0.59,
        serviceRevenue: 47_916_599,
        revenuePerHour: 231_481,
        workingHoursSource: 'SHIFT',
      },
    },
    {
      id: 48,
      displayName: 'Phương Nhi',
      username: 'phuongnhi',
      role: 'lt',
      careerRole: 'CV',
      storeId: 6,
      branchName: 'Đề Thám',
      branchCode: 'DT',
      ordersCount: 310,
      fixRate: 0.01,
      totalTip: 9_500_000,
      tipRatioAboveShop: 0.06,
      staffTipRate: 0.48,
      shopTipRate: 0.45,
      selfComboRate: 0.22,
      happinessIndex: 0.78,
      bananaCount: 21,
      bananaBalance: 90,
      qaAuditsCount: 4,
      servicesPerHour: 0.41,
      revenuePerHour: 159_999,
      actualWorkingHours: 205,
      totalCompletedServices: 84,
      fullSetCount: 69,
      comboRetainCount: 10,
      singleRetainCount: 5,
      serviceRevenue: 32_799_726,
      productivity: {
        totalCompletedServices: 84,
        fullSetCount: 69,
        comboRetainCount: 10,
        singleRetainCount: 5,
        actualWorkingHours: 205,
        servicesPerHour: 0.41,
        serviceRevenue: 32_799_726,
        revenuePerHour: 159_999,
        workingHoursSource: 'SHIFT',
      },
    },
  ];

  const progressionById = {
    35: {
      staffId: 35,
      staffName: 'HânEmBé',
      currentRole: 'CV',
      targetRole: 'CV_PLUS',
      status: 'QUALIFIED',
      period: 'last_30_days',
      targetOrders: 330,
      metrics: {
        ordersCount: 360,
        periodOrders: 123,
        fixCount: 0,
        fixRate: 0,
        totalTip: 12_000_000,
        tipRatioAboveShop: 0.12,
        staffTipRate: 0.52,
        shopTipRate: 0.45,
        storeId: 16,
        branchName: 'Estella Place',
        branchCode: 'EP',
        happinessIndex: 0.85,
        happyCount: 17,
        totalHi: 20,
        bananaCount: 24,
        bananaBalance: 120,
        selfComboCount: 15,
        selfComboRate: 0.28,
        monthsInRole: 6,
        servicesPerHour: 0.59,
        revenuePerHour: 231_481,
        actualWorkingHours: 207,
        totalCompletedServices: 123,
        serviceRevenue: 47_916_599,
        productivity: staffList[0].productivity,
        qaAudit: {
          totalAudits: 4,
          requiredAudits: 4,
          passedAudits: 4,
          failedAudits: 0,
          weeklyAuditRate: 1,
          hasFailedAudit: false,
          isPassed: true,
          latestResult: 'PASSED',
        },
      },
      qualifiedQuests: {
        foundationCompleted: true,
        bossTrialCompleted: true,
        qaAuditCompleted: true,
        allPassed: true,
      },
      recommendedAction: 'PROMOTE',
      earningsSimulation: {
        currentEstimatedIncome: 14_500_000,
        nextTierEstimatedIncome: 18_200_000,
        incomeGain: 3_700_000,
        details: {
          hourlyWageCurrent: 25_500,
          hourlyWageNext: 27_500,
          tipShareCurrent: 4_500_000,
          tipShareNext: 5_785_000,
          comboCommissionCurrent: 0,
          comboCommissionNext: 1_200_000,
          actualWorkingHours: 207,
          payrollWorkingHours: 207,
          payrollHourlyRate: 25_500,
          payrollWageAmount: 5_278_500,
          payrollBonusAmount: 2_800_000,
          payrollTipAmount: 4_500_000,
          payrollMonthLabel: 'Tháng 10/2026',
          avgComboPrice: 4_500_000,
          expectedSerumsPerWeek: 1,
          expectedCombosPerMonth: 8,
        },
      },
    },
    48: {
      staffId: 48,
      staffName: 'Phương Nhi',
      currentRole: 'CV',
      targetRole: 'CV_PLUS',
      status: 'IN_PROGRESS',
      period: 'last_30_days',
      targetOrders: 330,
      metrics: {
        ordersCount: 310,
        periodOrders: 84,
        fixCount: 1,
        fixRate: 0.01,
        totalTip: 9_500_000,
        tipRatioAboveShop: 0.06,
        staffTipRate: 0.48,
        shopTipRate: 0.45,
        storeId: 6,
        branchName: 'Đề Thám',
        branchCode: 'DT',
        happinessIndex: 0.78,
        happyCount: 14,
        totalHi: 18,
        bananaCount: 21,
        bananaBalance: 90,
        selfComboCount: 9,
        selfComboRate: 0.22,
        monthsInRole: 5,
        servicesPerHour: 0.41,
        revenuePerHour: 159_999,
        actualWorkingHours: 205,
        totalCompletedServices: 84,
        serviceRevenue: 32_799_726,
        productivity: staffList[1].productivity,
        qaAudit: {
          totalAudits: 4,
          requiredAudits: 4,
          passedAudits: 4,
          failedAudits: 0,
          weeklyAuditRate: 1,
          hasFailedAudit: false,
          isPassed: true,
          latestResult: 'PASSED',
        },
      },
      qualifiedQuests: {
        foundationCompleted: false,
        bossTrialCompleted: true,
        qaAuditCompleted: true,
        allPassed: false,
      },
      recommendedAction: 'CONTINUE_TRAINING',
      earningsSimulation: {
        currentEstimatedIncome: 12_100_000,
        nextTierEstimatedIncome: 15_300_000,
        incomeGain: 3_200_000,
        details: {
          hourlyWageCurrent: 25_500,
          hourlyWageNext: 27_500,
          tipShareCurrent: 3_800_000,
          tipShareNext: 4_885_000,
          comboCommissionCurrent: 0,
          comboCommissionNext: 900_000,
          actualWorkingHours: 205,
          payrollWorkingHours: 205,
          payrollHourlyRate: 25_500,
          payrollWageAmount: 5_227_500,
          payrollBonusAmount: 2_100_000,
          payrollTipAmount: 3_800_000,
          payrollMonthLabel: 'Tháng 10/2026',
          avgComboPrice: 4_500_000,
          expectedSerumsPerWeek: 1,
          expectedCombosPerMonth: 8,
        },
      },
    },
  };

  return { user, staffList, progressionById };
}

async function setupRoutes(page, data) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const reqUrl = new URL(route.request().url());
      const pathname = reqUrl.pathname;
      const json = (payload) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });

      if (pathname === '/api/auth/me') return json({ user: data.user });
      if (pathname === '/api/career/staff-list') return json({ success: true, data: data.staffList });
      if (pathname.startsWith('/api/career/staff/')) {
        const idMatch = pathname.match(/\/api\/career\/staff\/(\d+)/);
        const sid = idMatch ? Number(idMatch[1]) : 35;
        return json({ success: true, data: data.progressionById[sid] || data.progressionById[35] });
      }
      if (pathname === '/api/career/cv-plus-rewards') return json({ success: true, data: null });
      if (pathname.startsWith('/api/menu-access')) {
        return json({
          items: [],
          policies: [],
          allowedPaths: ['/dashboard', '/dashboard/career-path'],
          isUnrestricted: true,
        });
      }
      if (pathname === '/api/bug-reports/mine') {
        return json({ data: [], notifications: [], unreadCount: 0, actionRequiredCount: 0 });
      }
      if (pathname === '/api/notifications' || pathname === '/api/notifications/unread-count') {
        return json({ items: [], data: [], notifications: [], count: 0, unreadCount: 0 });
      }
      return json({ success: true, items: [], data: [] });
    }
  );
}

async function capturePng(context, page, fileName) {
  const cdp = await context.newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile(path.join(SCREENSHOT_DIR, fileName), Buffer.from(data, 'base64'));
  await cdp.detach();
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
    await waitForServer(`http://127.0.0.1:${port}/dashboard/career-path`);
    browser = await chromium.launch({ headless: true });
    const data = buildMockCareerData();

    // 1. Desktop Light Theme + Table Mode + Branch Filter (ALL -> DE_THAM)
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
      await context.addInitScript(
        ({ user }) => {
          localStorage.setItem('mos_token', 'mock-playwright-token');
          localStorage.setItem('mos_user', JSON.stringify(user));
          localStorage.setItem('mos_theme', 'light');
          localStorage.setItem('mos_theme_preference', 'light');
          localStorage.setItem('mos_career_selector_mode', 'table');
        },
        { user: data.user }
      );
      const page = await context.newPage();
      await setupRoutes(page, data);
      await page.goto(`http://127.0.0.1:${port}/dashboard/career-path`, { waitUntil: 'domcontentloaded' });

      const widget = page.getByTestId('career-hourly-productivity-widget');
      await widget.waitFor({ state: 'visible', timeout: 12000 });
      const deThamBtn = page.getByTestId('branch-filter-de_tham');
      await deThamBtn.waitFor({ state: 'visible', timeout: 5000 });

      const lightWidgetText = await widget.innerText();
      assert.ok(lightWidgetText.includes('0.59'), 'Expected SPH 0.59 in widget');
      assert.ok(lightWidgetText.includes('231.481đ'), 'Expected Revenue/Hour 231.481đ in widget');

      await deThamBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(200);
      await capturePng(context, page, 'mos-bug-262-desktop-light-table.png');

      await widget.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(200);
      await capturePng(context, page, 'mos-bug-262-desktop-light-widget.png');

      // Click Đề Thám branch filter -> should auto-switch active staff to Phương Nhi (0.41/h)
      await deThamBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(150);
      await deThamBtn.click({ force: true });
      await page.waitForTimeout(500);
      const dtWidgetText = await widget.innerText();
      assert.ok(dtWidgetText.includes('0.41'), 'Expected SPH 0.41 after switching to Đề Thám branch');

      await context.close();
    }

    // 2. Desktop Dark Theme + Table Mode
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
      await context.addInitScript(
        ({ user }) => {
          localStorage.setItem('mos_token', 'mock-playwright-token');
          localStorage.setItem('mos_user', JSON.stringify(user));
          localStorage.setItem('mos_theme', 'dark');
          localStorage.setItem('mos_theme_preference', 'dark');
          localStorage.setItem('mos_career_selector_mode', 'table');
        },
        { user: data.user }
      );
      const page = await context.newPage();
      await setupRoutes(page, data);
      await page.goto(`http://127.0.0.1:${port}/dashboard/career-path`, { waitUntil: 'domcontentloaded' });
      const widget = page.getByTestId('career-hourly-productivity-widget');
      await widget.waitFor({ state: 'visible', timeout: 12000 });
      await widget.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(250);
      await capturePng(context, page, 'mos-bug-262-desktop-dark.png');
      await context.close();
    }

    // 3. Mobile (390x844) Dark Theme + Mobile Staff Sheet Branch Filter
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        reducedMotion: 'reduce',
      });
      await context.addInitScript(
        ({ user }) => {
          localStorage.setItem('mos_token', 'mock-playwright-token');
          localStorage.setItem('mos_user', JSON.stringify(user));
          localStorage.setItem('mos_theme', 'dark');
          localStorage.setItem('mos_theme_preference', 'dark');
        },
        { user: data.user }
      );
      const page = await context.newPage();
      await setupRoutes(page, data);
      await page.goto(`http://127.0.0.1:${port}/dashboard/career-path`, { waitUntil: 'domcontentloaded' });
      const widget = page.getByTestId('career-hourly-productivity-widget');
      await widget.waitFor({ state: 'visible', timeout: 12000 });
      await widget.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(250);
      await capturePng(context, page, 'mos-bug-262-mobile-dark.png');
      await context.close();
    }

    console.log(
      'Playwright visual QA PASSED: desktop light, desktop dark, mobile dark + branch filter & SPH verified.'
    );
  } catch (err) {
    console.error('Playwright visual QA FAILED:', err);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    process.exit(exitCode);
  }
}

main();
