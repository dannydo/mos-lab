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
    args: isHeaded ? [] : ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox'],
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
      // Giống thao tác người dùng bấm "Để mai": không để AvatarPromptModal chặn mọi click của bot.
      // Khóa khớp với AvatarPromptModal.tsx ('mos_avatar_prompt_dismissed:' + user.id).
      if (user?.id) {
        try {
          sessionStorage.setItem(`mos_avatar_prompt_dismissed:${user.id}`, '1');
        } catch {
          // sessionStorage không khả dụng: bỏ qua, phát hiện overlay chặn sẽ cảnh báo bên dưới
        }
      }
    },
    { token: auth.token, user: auth.user }
  );

  const results = [];
  const globalSlowApiRequests = [];
  const globalFailedRequests = [];
  const globalConsoleErrors = [];

  // Warm-up (không tính vào số đo): route đầu tiên của trình duyệt mới thường bị treo/chậm bất thường
  // do hydrate + request đầu tiên; mở một trang bỏ đi để route đầu tiên được đo công bằng.
  try {
    const warmPage = await context.newPage();
    warmPage.setDefaultTimeout(8000);
    await warmPage.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Thao tác canvas 2D đầu tiên có thể bị chặn đến ~80s trong Chromium headless "lạnh" (xem
    // investigate_frozen_routes.md). Trang dashboard tự vẽ badge favicon ngay khi tải, nên chờ một
    // thao tác canvas thật hoàn tất ở đây (tối đa 150s) để các route sau không bị treo oan.
    const canvasProbeStart = Date.now();
    const canvasProbe = await Promise.race([
      warmPage
        .evaluate(() => {
          const c = document.createElement('canvas');
          c.width = 32;
          c.height = 32;
          const ctx2d = c.getContext('2d');
          const s = performance.now();
          if (ctx2d) {
            ctx2d.clearRect(0, 0, 32, 32);
            ctx2d.fillText('m', 16, 17);
          }
          return Math.round(performance.now() - s);
        })
        .then((ms) => ({ ok: true, ms })),
      new Promise((resolve) => setTimeout(() => resolve({ ok: false }), 150000)),
    ]);
    const canvasWaitMs = Date.now() - canvasProbeStart;
    if (canvasProbe.ok) {
      console.log(
        `[Crawler] Warm-up canvas: thao tác đầu tiên xong, chờ ${canvasWaitMs}ms (thao tác ${canvasProbe.ms}ms).` +
          (canvasWaitMs > 5000 ? ' ⚠️ Máy đang "lạnh": đã khởi tạo canvas trước khi đo.' : '')
      );
    } else {
      console.warn(`[Crawler] ⚠️ Warm-up canvas chưa xong sau ${canvasWaitMs}ms; các route đo có thể bị treo oan.`);
    }
    await warmPage.waitForTimeout(3000);
    await Promise.race([warmPage.close({ runBeforeUnload: false }).catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
    console.log('[Crawler] Warm-up hoàn tất (không tính vào số đo).');
  } catch (warmErr) {
    console.warn(`[Crawler] Warm-up bỏ qua: ${warmErr.message}`);
  }

  console.log(`[Crawler] Starting crawl for ${routesToTest.length} routes...`);

  for (let i = 0; i < routesToTest.length; i++) {
    const targetRoute = routesToTest[i];
    const fullUrl = `${baseUrl}${targetRoute.path}`;
    console.log(
      `[Crawler] [${i + 1}/${routesToTest.length}] Navigating to: ${targetRoute.title} (${targetRoute.path})`
    );

    const page = await context.newPage();
    // Không để một thao tác treo (handle hỏng, phần tử biến mất) ăn hết 30s mặc định của Playwright.
    page.setDefaultTimeout(8000);
    const pageErrors = [];
    const pageFailedRequests = [];
    const pageSlowApis = [];
    const requestTimings = new Map();

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
      globalConsoleErrors.push({ route: targetRoute.path, error: err.message });
    });

    // Theo dõi số request /api/ đang chạy để chờ "yên lặng" thay vì sleep cố định.
    const inflightApi = new Set();
    page.on('request', (req) => {
      requestTimings.set(req, Date.now());
      if (req.url().includes('/api/')) inflightApi.add(req);
    });
    page.on('requestfinished', (req) => inflightApi.delete(req));
    page.on('requestfailed', (req) => inflightApi.delete(req));

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
    let blockedByOverlay = false;
    let mainThreadBlocked = false;
    let mainThreadProbeMs = null;
    let interactionStartMs = null;
    let popupClickFailures = 0;

    try {
      await Promise.race([
        (async () => {
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

          // Chờ theo điều kiện: không còn request /api/ đang chạy trong ~300ms (tối đa 1500ms),
          // thay cho sleep cố định 1000ms.
          {
            const quietDeadline = Date.now() + 1500;
            let quietSince = null;
            while (Date.now() < quietDeadline) {
              if (inflightApi.size === 0) {
                quietSince = quietSince ?? Date.now();
                if (Date.now() - quietSince >= 300) break;
              } else {
                quietSince = null;
              }
              await page.waitForTimeout(50);
            }
          }

          // Kiểm tra luồng chính của trang còn phản hồi không (ví dụ iframe đồ thị nặng chiếm CPU).
          // Nếu một evaluate rỗng không trả lời trong 5s thì mọi thao tác sau đó sẽ treo đến hết
          // timeout route: ghi nhận như một chỉ số thật và bỏ qua tương tác thay vì chờ 55s.
          {
            const probeStart = Date.now();
            const probe = await Promise.race([
              page.evaluate(() => 1).then(() => 'ok'),
              new Promise((resolve) => setTimeout(() => resolve('blocked'), 5000)),
            ]).catch(() => 'ok');
            mainThreadProbeMs = Date.now() - probeStart;
            if (probe === 'blocked') {
              mainThreadBlocked = true;
              browserTimings = { mainThreadBlocked: true };
              console.warn(
                `[Crawler] ⚠️ ${targetRoute.key}: luồng chính của trang không phản hồi sau 5s, bỏ qua tương tác.`
              );
              return;
            }
          }

          // Collect Core Web Vitals / Navigation Timings (retry once if hydration triggered a navigation)
          const collectTimings = () =>
            page.evaluate(() => {
              const nav = performance.getEntriesByType('navigation')[0];
              const fcp = performance
                .getEntriesByType('paint')
                .find((p) => p.name === 'first-contentful-paint')?.startTime;
              return {
                ttfbMs: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
                domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
                totalLoadMs: nav ? Math.round(nav.duration) : null,
                fcpMs: fcp ? Math.round(fcp) : null,
                domNodeCount: document.querySelectorAll('*').length,
              };
            });

          try {
            browserTimings = await collectTimings();
          } catch (evalErr) {
            if (String(evalErr?.message || '').includes('Execution context was destroyed')) {
              await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
              await page.waitForTimeout(800);
              browserTimings = await collectTimings();
            } else {
              throw evalErr;
            }
          }

          // Phát hiện overlay (modal) đang che trang trước khi tương tác: nếu có, mọi click sẽ
          // timeout 3s và làm phình thời gian đo. Báo rõ thay vì im lặng.
          const overlayCount = await page.evaluate(
            () =>
              Array.from(document.querySelectorAll('.ant-modal-wrap')).filter((el) => {
                const s = window.getComputedStyle(el);
                return s.display !== 'none' && s.visibility !== 'hidden';
              }).length
          );
          if (overlayCount > 0) {
            blockedByOverlay = true;
            console.warn(
              `[Crawler] ⚠️ ${targetRoute.key}: có ${overlayCount} modal đang che trang trước khi tương tác (click sẽ bị chặn).`
            );
          }
          interactionStartMs = Date.now();

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
          let buttonAttempts = 0;
          const seenButtonTexts = new Set();

          for (const btn of buttons) {
            if (popupInspectedCount >= 3 || buttonAttempts >= 6) break; // Giới hạn để tối ưu thời gian
            try {
              const btnText = (await btn.innerText()).trim();
              // Bỏ qua các nút cấm hoặc nút submit hoặc trùng nhãn đã thử
              const isProhibited = manifest.interactionRules.prohibitedButtonTexts.some((p) => btnText.includes(p));
              if (isProhibited || !btnText || seenButtonTexts.has(btnText)) continue;

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
                seenButtonTexts.add(btnText);
                buttonAttempts++;
                console.log(`[Crawler] Testing potential popup button: "${btnText}" on ${targetRoute.key}`);
                const popupOpenStart = Date.now();
                await btn.click({ timeout: 3000 });
                await page.waitForTimeout(800);

                // Nút điều hướng sang trang khác (ví dụ router.push): các handle cũ đã hỏng,
                // tiếp tục vòng lặp sẽ treo đến khi hết timeout cả route. Dừng tương tác ở route này.
                if (new URL(page.url()).pathname !== new URL(fullUrl).pathname) {
                  console.log(
                    `[Crawler] Nút "${btnText}" điều hướng sang ${new URL(page.url()).pathname}; dừng thử popup trên ${targetRoute.key}.`
                  );
                  break;
                }

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
              // Không làm hỏng route vì một nút không click được, nhưng vẫn đếm để báo cáo.
              popupClickFailures++;
            }
          }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Route crawl timed out after 55000ms')), 55000)),
      ]);
    } catch (err) {
      loadStatus = 'ERROR';
      pageErrors.push(err.message);
      console.error(`[Crawler] Error loading route ${targetRoute.path}:`, err.message);
    }

    const totalElapsedMs = Date.now() - routeStartTime;
    const interactionMs = interactionStartMs ? Date.now() - interactionStartMs : 0;
    const tabClickFailures = tabResults.filter((t) => t.status === 'FAILED').length;
    const interactionBlocked = blockedByOverlay || tabClickFailures > 0;
    if (interactionBlocked) {
      console.warn(
        `[Crawler] ⚠️ ${targetRoute.key}: tương tác bị chặn (tab click lỗi: ${tabClickFailures}, popup click lỗi: ${popupClickFailures}).`
      );
    }

    results.push({
      key: targetRoute.key,
      title: targetRoute.title,
      path: targetRoute.path,
      group: targetRoute.group,
      status: loadStatus,
      totalElapsedMs,
      interactionMs,
      interactionBlocked,
      mainThreadBlocked,
      mainThreadProbeMs,
      tabClickFailures,
      popupClickFailures,
      browserTimings,
      tabs: tabResults,
      popups: popupResults,
      slowApis: pageSlowApis,
      failedRequests: pageFailedRequests,
      errors: pageErrors,
    });

    await Promise.race([
      page.close({ runBeforeUnload: false }).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  }

  await Promise.race([browser.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 5000))]);

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
      // Tải trang thật (Navigation Timing) — chỉ tính route có số đo.
      averageLoadMs: (() => {
        const loads = results.map((r) => r.browserTimings?.totalLoadMs).filter((v) => typeof v === 'number');
        return loads.length ? Math.round(loads.reduce((a, b) => a + b, 0) / loads.length) : null;
      })(),
      // Thời gian bot click tab/popup, tách riêng khỏi tải trang.
      averageInteractionMs: Math.round(results.reduce((sum, r) => sum + (r.interactionMs || 0), 0) / (results.length || 1)),
      blockedInteractionRoutes: results.filter((r) => r.interactionBlocked).length,
      mainThreadBlockedRoutes: results.filter((r) => r.mainThreadBlocked).map((r) => r.path),
      totalTabClickFailures: results.reduce((sum, r) => sum + (r.tabClickFailures || 0), 0),
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
