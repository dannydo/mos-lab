/**
 * crawler-runner.mjs
 * Bot giả lập người dùng E2E: duyệt qua toàn bộ các route, tab, popup;
 * đo lường thời gian thực (Navigation, FCP, TTFB, API latency), chụp ảnh popup,
 * thu thập slow queries và tổng hợp báo cáo.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { generateManifest, SYSTEM_ROUTES } from './manifest-generator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../..');
const outputDir = path.resolve(workspaceRoot, 'output', 'benchmark');
const screenshotsDir = path.join(outputDir, 'screenshots');
const rawMetricsPath = path.join(outputDir, 'raw-metrics.json');

// Parse CLI flags
const args = process.argv.slice(2);
const isQuick = args.some((arg) => arg.includes('--profile=quick') || arg.includes('-q'));
const isHeaded = args.some((arg) => arg.includes('--headed'));

const baseUrl = process.env.MOS_WEB_URL || 'http://localhost:4000';
const apiUrl = process.env.MOS_API_URL || 'http://localhost:4001';

console.log(`[Crawler] Target Web URL: ${baseUrl}`);
console.log(`[Crawler] Target API URL: ${apiUrl}`);
console.log(`[Crawler] Execution Profile: ${isQuick ? 'QUICK RUN (Core Routes)' : 'FULL AUDIT (All Routes)'}`);

const getDevAuth = async () => {
  try {
    const response = await fetch(`${apiUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isMock: true, email: 'danhdo@gmail.com', name: 'Benchmark Crawler' }),
    });

    if (!response.ok) {
      throw new Error(`Auth request failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    if (!payload?.token || !payload?.user) {
      throw new Error('Auth payload did not include token or user');
    }
    return payload;
  } catch (err) {
    console.warn(`[Crawler] Mock auth failed against ${apiUrl}: ${err.message}. Proceeding without mock auth token.`);
    return { token: 'mock-token-fallback', user: { id: 1, email: 'danhdo@gmail.com', role: 'super_admin' } };
  }
};

const clearBackendSlowQueryLog = async () => {
  try {
    await fetch(`${apiUrl}/api/benchmark/slow-queries`, { method: 'DELETE' });
    console.log('[Crawler] Cleared backend slow query log');
  } catch (err) {
    console.warn(
      '[Crawler] Could not clear backend slow query log (API server might not be running yet):',
      err.message
    );
  }
};

const fetchBackendSlowQueries = async () => {
  try {
    const res = await fetch(`${apiUrl}/api/benchmark/slow-queries`);
    if (res.ok) {
      const data = await res.json();
      return data.slowQueries || [];
    }
  } catch {
    // Fallback to reading file directly if on same machine
  }

  const logFilePath = path.join(outputDir, 'slow-queries.jsonl');
  if (fs.existsSync(logFilePath)) {
    const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n').filter(Boolean);
    return lines
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }
  return [];
};

export async function runCrawler() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(screenshotsDir, { recursive: true });

  // Generate or refresh manifest
  const manifest = generateManifest();
  const routesToTest = isQuick ? manifest.routes.filter((r) => r.isCore) : manifest.routes;

  await clearBackendSlowQueryLog();
  const auth = await getDevAuth();

  const browser = await chromium.launch({
    headless: !isHeaded,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  // Inject session into browser localStorage
  await context.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));
      localStorage.setItem('mos_theme', 'dark');
      localStorage.setItem('mos_desktop_density', 'standard');
    },
    { token: auth.token, user: auth.user }
  );

  const results = [];
  const globalSlowApiRequests = [];
  const globalFailedRequests = [];
  const globalConsoleErrors = [];

  console.log(`[Crawler] Starting crawl for ${routesToTest.length} routes...`);

  for (let i = 0; i < routesToTest.length; i++) {
    const targetRoute = routesToTest[i];
    const fullUrl = `${baseUrl}${targetRoute.path}`;
    console.log(
      `[Crawler] [${i + 1}/${routesToTest.length}] Navigating to: ${targetRoute.title} (${targetRoute.path})`
    );

    const page = await context.newPage();
    const pageErrors = [];
    const pageFailedRequests = [];
    const pageSlowApis = [];
    const requestTimings = new Map();

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
      globalConsoleErrors.push({ route: targetRoute.path, error: err.message });
    });

    page.on('request', (req) => {
      requestTimings.set(req, Date.now());
    });

    page.on('requestfailed', (req) => {
      const info = { url: req.url(), method: req.method(), error: req.failure()?.errorText || 'failed' };
      pageFailedRequests.push(info);
      globalFailedRequests.push({ route: targetRoute.path, ...info });
    });

    page.on('response', (res) => {
      const start = requestTimings.get(res.request());
      if (start) {
        const duration = Date.now() - start;
        if (duration >= 1000 && res.url().includes('/api/')) {
          const record = { url: res.url(), status: res.status(), durationMs: duration, route: targetRoute.path };
          pageSlowApis.push(record);
          globalSlowApiRequests.push(record);
        }
      }
    });

    const routeStartTime = Date.now();
    let loadStatus = 'OK';
    let browserTimings = {};
    const tabResults = [];
    const popupResults = [];

    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });

      // Wait for app shell to hydrate and spinners to subside
      await page
        .waitForFunction(
          () => {
            const bodyText = document.body?.innerText || '';
            const isSessionLoading = bodyText.includes('Tải thông tin phiên đăng nhập');
            const hasApp = Boolean(document.querySelector('.ant-layout-content, main, #__next'));
            return hasApp && !isSessionLoading;
          },
          { timeout: 15000 }
        )
        .catch(() => {});

      await page.waitForTimeout(1000);

      // Collect Core Web Vitals / Navigation Timings
      browserTimings = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const fcp = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint')?.startTime;
        return {
          ttfbMs: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
          domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
          totalLoadMs: nav ? Math.round(nav.duration) : null,
          fcpMs: fcp ? Math.round(fcp) : null,
          domNodeCount: document.querySelectorAll('*').length,
        };
      });

      // 1. Tương tác Tab: Click các tab trên trang (nếu có)
      const tabElements = await page.$$('.ant-tabs-tab');
      if (tabElements.length > 1) {
        console.log(`[Crawler] Found ${tabElements.length} tabs on ${targetRoute.key}. Clicking tabs safely...`);
        for (let t = 0; t < Math.min(tabElements.length, 5); t++) {
          try {
            const tabText = (await tabElements[t].innerText()).trim();
            const tabStart = Date.now();
            await tabElements[t].click({ timeout: 3000 });
            await page.waitForTimeout(600);
            const tabDuration = Date.now() - tabStart;
            tabResults.push({ tabTitle: tabText, switchDurationMs: tabDuration, status: 'OK' });
          } catch (tabErr) {
            tabResults.push({ tabIndex: t, error: tabErr.message, status: 'FAILED' });
          }
        }
      }

      // 2. Tương tác Modal / Drawer: Tìm các nút mở popup an toàn
      const buttons = await page.$$('button:visible');
      let popupInspectedCount = 0;

      for (const btn of buttons) {
        if (popupInspectedCount >= 3) break; // Giới hạn tối đa 3 popups mỗi trang để tối ưu thời gian
        try {
          const btnText = (await btn.innerText()).trim();
          // Bỏ qua các nút cấm hoặc nút submit
          const isProhibited = manifest.interactionRules.prohibitedButtonTexts.some((p) => btnText.includes(p));
          if (isProhibited || !btnText) continue;

          // Kiểm tra xem nút có dấu hiệu mở popup / bộ lọc / chi tiết không
          const isTriggerCandidate =
            btnText.includes('Lọc') ||
            btnText.includes('Bộ lọc') ||
            btnText.includes('Chi tiết') ||
            btnText.includes('Thêm') ||
            btnText.includes('Tạo') ||
            btnText.includes('Xem') ||
            btnText.includes('Cấu hình') ||
            btnText.includes('Export') ||
            btnText.includes('Xuất');

          if (isTriggerCandidate) {
            console.log(`[Crawler] Testing potential popup button: "${btnText}" on ${targetRoute.key}`);
            const popupOpenStart = Date.now();
            await btn.click({ timeout: 3000 });
            await page.waitForTimeout(800);

            // Kiểm tra xem Modal hoặc Drawer có xuất hiện không
            const hasModal = await page.locator('.ant-modal-content:visible').count();
            const hasDrawer = await page.locator('.ant-drawer-content:visible').count();

            if (hasModal > 0 || hasDrawer > 0) {
              const openDurationMs = Date.now() - popupOpenStart;
              const popupType = hasModal > 0 ? 'MODAL' : 'DRAWER';
              const screenshotFilename = `popup_${targetRoute.key}_${popupInspectedCount + 1}.png`;
              const screenshotPath = path.join(screenshotsDir, screenshotFilename);

              await page.screenshot({ path: screenshotPath });
              console.log(`[Crawler] Captured screenshot for ${popupType} on "${btnText}": ${screenshotFilename}`);

              // Đóng popup an toàn (Tuyệt đối KHÔNG submit)
              let closedSafely = false;
              for (const closeSelector of manifest.interactionRules.safeCloseSelectors) {
                const closeBtn = page.locator(`${closeSelector}:visible`).first();
                if ((await closeBtn.count()) > 0) {
                  await closeBtn.click({ timeout: 2000 }).catch(() => {});
                  closedSafely = true;
                  break;
                }
              }

              if (!closedSafely) {
                await page.keyboard.press('Escape');
              }
              await page.waitForTimeout(400);

              popupResults.push({
                triggerButton: btnText,
                type: popupType,
                openDurationMs,
                screenshot: screenshotFilename,
                status: 'OK',
              });
              popupInspectedCount++;
            }
          }
        } catch {
          // Bỏ qua lỗi click nút không mở popup
        }
      }
    } catch (err) {
      loadStatus = 'ERROR';
      pageErrors.push(err.message);
      console.error(`[Crawler] Error loading route ${targetRoute.path}:`, err.message);
    }

    const totalElapsedMs = Date.now() - routeStartTime;

    results.push({
      key: targetRoute.key,
      title: targetRoute.title,
      path: targetRoute.path,
      group: targetRoute.group,
      status: loadStatus,
      totalElapsedMs,
      browserTimings,
      tabs: tabResults,
      popups: popupResults,
      slowApis: pageSlowApis,
      failedRequests: pageFailedRequests,
      errors: pageErrors,
    });

    await page.close();
  }

  await browser.close();

  // Thu thập Backend Slow Queries từ plugin Fastify / Prisma
  const backendSlowQueries = await fetchBackendSlowQueries();

  const finalReportData = {
    executedAt: new Date().toISOString(),
    profile: isQuick ? 'quick' : 'full',
    baseUrl,
    apiUrl,
    summary: {
      totalRoutes: routesToTest.length,
      successfulRoutes: results.filter((r) => r.status === 'OK').length,
      failedRoutes: results.filter((r) => r.status !== 'OK').length,
      averagePageDurationMs: Math.round(results.reduce((sum, r) => sum + r.totalElapsedMs, 0) / (results.length || 1)),
      totalSlowApiRequests: globalSlowApiRequests.length,
      totalPrismaSlowQueries: backendSlowQueries.filter((q) => q.type === 'PRISMA_QUERY').length,
      totalConsoleErrors: globalConsoleErrors.length,
    },
    results,
    backendSlowQueries,
    globalSlowApiRequests,
    globalFailedRequests,
    globalConsoleErrors,
  };

  await writeFile(rawMetricsPath, JSON.stringify(finalReportData, null, 2), 'utf-8');
  console.log(`[Crawler] Raw metrics written to ${rawMetricsPath}`);

  return finalReportData;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCrawler()
    .then(() => {
      console.log('[Crawler] Finished successfully.');
    })
    .catch((err) => {
      console.error('[Crawler] Fatal execution error:', err);
      process.exit(1);
    });
}
