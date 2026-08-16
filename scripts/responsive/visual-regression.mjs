import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESPONSIVE_THEMES, RESPONSIVE_VIEWPORTS } from './viewport-presets.mjs';
import {
  createFailedRequestSummary,
  getResponsiveBrowserName,
  getResponsiveBrowserType,
  getResponsiveContextOptions,
  installSanitizedAssetStubs,
} from './browser-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '../..');
const runDate = process.env.RESPONSIVE_RUN_DATE || new Date().toISOString().slice(0, 10);
const baseUrl = process.env.MOS_WEB_URL || 'http://localhost:4000';
const apiUrl = process.env.MOS_API_URL || 'http://localhost:4001';
const browserName = getResponsiveBrowserName();
const updateBaseline = process.env.VISUAL_UPDATE === '1';
const desktopDensity = process.env.RESPONSIVE_DESKTOP_DENSITY || 'standard';
const changedPixelRatioThreshold = Number(process.env.VISUAL_DIFF_RATIO || '0.005');
const pixelDeltaThreshold = Number(process.env.VISUAL_PIXEL_DELTA || '24');
const baselineRoot = path.join(scriptDir, 'visual-baselines');
const outputRoot = path.join(workspaceRoot, 'output', 'responsive-visual', runDate, browserName);

const viewportIds = ['iphone-12-portrait', 'fhd'];
const visualViewports = RESPONSIVE_VIEWPORTS.filter((viewport) => viewportIds.includes(viewport.id));

if (!['compact', 'standard', 'comfortable'].includes(desktopDensity)) {
  throw new Error(`Unknown RESPONSIVE_DESKTOP_DENSITY: ${desktopDensity}`);
}

const scenarios = [
  { id: 'dashboard-default', route: '/dashboard' },
  { id: 'customers-default', route: '/dashboard/customers' },
  {
    id: 'today-default',
    route: '/dashboard/today',
    async ready(page) {
      await page
        .getByRole('heading', { name: 'Control Board Hôm Nay (Today operations)' })
        .waitFor({ state: 'visible', timeout: 20_000 });
    },
  },
  { id: 'schedule-default', route: '/dashboard/schedule-calendar' },
  { id: 'catalog-default', route: '/dashboard/catalog' },
  { id: 'qa-shop-default', route: '/dashboard/qa-shop' },
  {
    id: 'customers-filter-drawer',
    route: '/dashboard/customers',
    async open(page) {
      await page.locator('[data-ui="customer-filter-trigger"]').click();
      await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible' });
    },
  },
  {
    id: 'customers-booking-wizard',
    route: '/dashboard/customers',
    async open(page) {
      await page.getByRole('button', { name: 'Đặt lịch mới' }).click();
      await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible' });
    },
  },
  {
    id: 'customers-detail-drawer',
    route: '/dashboard/customers',
    async open(page, viewport) {
      if (viewport.isMobile) {
        const card = page.locator('.customer-mobile-card-open').first();
        await card.waitFor({ state: 'visible', timeout: 20_000 });
        await card.click();
      } else {
        const row = page.locator('.ant-table-tbody tr.ant-table-row').first();
        await row.waitFor({ state: 'visible', timeout: 20_000 });
        await row.locator('.ant-avatar').first().click();
      }
      await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible' });
    },
  },
  {
    id: 'customers-empty-state',
    route: '/dashboard/customers',
    async open(page) {
      const search = page.getByPlaceholder('Tìm tên hoặc SĐT...');
      await search.fill('__responsive_visual_no_match__');
      await search.press('Enter');
      await page.locator('.ant-empty').first().waitFor({ state: 'visible', timeout: 20_000 });
    },
  },
];

const waitForPageToSettle = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForFunction(
    () => {
      const bodyText = document.body?.innerText || '';
      return (
        Boolean(document.querySelector('.ant-layout-header') && document.querySelector('.ant-layout-content')) &&
        !bodyText.includes('Tải thông tin phiên đăng nhập')
      );
    },
    { timeout: 30_000 }
  );
  await page
    .waitForFunction(() => document.querySelectorAll('.ant-spin-spinning').length === 0, { timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(1_500);
};

const sanitizeVisualSnapshot = async (page) => {
  await page.evaluate(() => {
    const redactText = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return node.parentElement?.closest('script, style, svg, noscript')
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        },
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      for (const node of nodes) {
        const value = node.nodeValue || '';
        if (!value.trim()) continue;
        node.nodeValue = value.replace(/[\p{L}\p{N}]/gu, '•').replace(/•{2}:•{2}/g, '••:••');
      }
    };

    const redactSelectors = [
      '.ant-table-tbody',
      '.ant-list-items',
      '.ant-timeline',
      '.fc-event',
      '.ant-select-selection-item',
      '[class*="auditor" i]',
      '[class*="customer-card" i]',
      '[class*="booking-card" i]',
      '[class*="staff-card" i]',
      '[class*="leaderboard" i]',
      '.ant-drawer-header',
      '.ant-drawer-body',
      '.ant-modal-header',
      '.ant-modal-body',
    ];
    redactSelectors.forEach((selector) => document.querySelectorAll(selector).forEach(redactText));

    // These images are committed as baselines. Redact all runtime text (not only
    // customer tables) so they cannot retain staff/customer PII or moving metrics.
    // Text node length remains intact enough to preserve the layout signal.
    redactText(document.body);

    // Preserve layout while making live values and timestamps visually stable.
    document.querySelectorAll('.ant-statistic-content-value, .tabular-nums').forEach((element) => {
      (element instanceof HTMLElement ? element : null)?.style.setProperty('color', 'transparent', 'important');
      (element instanceof HTMLElement ? element : null)?.style.setProperty('text-shadow', 'none', 'important');
    });
    // Inputs are left intact: every context starts with blank local storage and
    // deterministic QA navigation. Mutating controlled inputs races React's next
    // render (notably the Today date picker) and would make the baseline flaky.
    document.querySelectorAll('img').forEach((image) => {
      if (!/logo/i.test(image.alt || '')) {
        image.removeAttribute('src');
        image.style.background = '#64748b';
      }
    });
  });
};

const inspectPage = async (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
    return {
      document: {
        clientWidth: root.clientWidth,
        scrollWidth,
        canScrollX: scrollWidth > root.clientWidth + 1,
      },
    };
  });

const getDevAuth = async () => {
  const response = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ isMock: true, email: 'danhdo@gmail.com', name: 'Responsive Visual QA' }),
  });
  if (!response.ok) throw new Error(`Dev authentication failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (!payload?.token || !payload?.user) throw new Error('Dev authentication response did not include token and user.');
  return payload;
};

const compareImages = async (page, baselineBuffer, candidateBuffer) => {
  const toDataUrl = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;
  return page.evaluate(
    async ({ baselineDataUrl, candidateDataUrl, threshold }) => {
      const loadImage = (src) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('Unable to decode visual-regression image.'));
          image.src = src;
        });
      const [baseline, candidate] = await Promise.all([loadImage(baselineDataUrl), loadImage(candidateDataUrl)]);
      if (baseline.width !== candidate.width || baseline.height !== candidate.height) {
        return {
          dimensionsMatch: false,
          baseline: { width: baseline.width, height: baseline.height },
          candidate: { width: candidate.width, height: candidate.height },
          differentPixels: baseline.width * baseline.height,
          changedPixelRatio: 1,
          maxChannelDelta: 255,
        };
      }

      const canvas = document.createElement('canvas');
      canvas.width = baseline.width;
      canvas.height = baseline.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Unable to create canvas context for visual comparison.');
      context.drawImage(baseline, 0, 0);
      const baselinePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(candidate, 0, 0);
      const candidatePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

      let differentPixels = 0;
      let maxChannelDelta = 0;
      for (let index = 0; index < baselinePixels.length; index += 4) {
        const delta = Math.max(
          Math.abs(baselinePixels[index] - candidatePixels[index]),
          Math.abs(baselinePixels[index + 1] - candidatePixels[index + 1]),
          Math.abs(baselinePixels[index + 2] - candidatePixels[index + 2]),
          Math.abs(baselinePixels[index + 3] - candidatePixels[index + 3])
        );
        maxChannelDelta = Math.max(maxChannelDelta, delta);
        if (delta > threshold) differentPixels += 1;
      }

      return {
        dimensionsMatch: true,
        baseline: { width: baseline.width, height: baseline.height },
        candidate: { width: candidate.width, height: candidate.height },
        differentPixels,
        changedPixelRatio: differentPixels / (baseline.width * baseline.height),
        maxChannelDelta,
      };
    },
    {
      baselineDataUrl: toDataUrl(baselineBuffer),
      candidateDataUrl: toDataUrl(candidateBuffer),
      threshold: pixelDeltaThreshold,
    }
  );
};

const run = async () => {
  await mkdir(outputRoot, { recursive: true });
  if (updateBaseline) await mkdir(baselineRoot, { recursive: true });

  const auth = await getDevAuth();
  const browser = await getResponsiveBrowserType(browserName).launch({ headless: true });
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    browser: browserName,
    mode: updateBaseline ? 'update' : 'compare',
    sanitized: true,
    changedPixelRatioThreshold,
    pixelDeltaThreshold,
    viewports: visualViewports,
    themes: RESPONSIVE_THEMES,
    desktopDensity,
    scenarios: scenarios.map(({ id, route }) => ({ id, route })),
    captures: [],
  };

  try {
    const total = scenarios.length * visualViewports.length * RESPONSIVE_THEMES.length;
    let current = 0;
    for (const viewport of visualViewports) {
      for (const theme of RESPONSIVE_THEMES) {
        const context = await browser.newContext(getResponsiveContextOptions(viewport, browserName));
        await installSanitizedAssetStubs(context);
        await context.addInitScript(
          ({ token, user, selectedTheme, selectedDesktopDensity }) => {
            localStorage.setItem('mos_token', token);
            localStorage.setItem('mos_user', JSON.stringify(user));
            localStorage.setItem('mos_theme', selectedTheme);
            localStorage.setItem('mos_desktop_density', selectedDesktopDensity);
          },
          { token: auth.token, user: auth.user, selectedTheme: theme, selectedDesktopDensity: desktopDensity }
        );

        for (const scenario of scenarios) {
          current += 1;
          const page = await context.newPage();
          const errors = [];
          const failedRequests = [];
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('requestfailed', (request) =>
            failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' })
          );

          const startedAt = Date.now();
          let status = 'ok';
          let metrics = null;
          let comparison = null;
          let candidatePath = null;
          let baselinePath = null;
          try {
            await page.goto(`${baseUrl}${scenario.route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await waitForPageToSettle(page);
            if (scenario.ready) await scenario.ready(page);
            if (scenario.open) {
              await scenario.open(page, viewport);
              await page.waitForTimeout(500);
            }
            await sanitizeVisualSnapshot(page);
            metrics = await inspectPage(page);
            const candidateBuffer = await page.screenshot({ type: 'png', fullPage: false, scale: 'css' });
            const relativeImagePath = path.join(scenario.id, viewport.id, `${theme}.png`);
            candidatePath = path.join(outputRoot, 'candidate', relativeImagePath);
            baselinePath = path.join(baselineRoot, relativeImagePath);
            await mkdir(path.dirname(candidatePath), { recursive: true });
            await writeFile(candidatePath, candidateBuffer);

            if (updateBaseline) {
              await mkdir(path.dirname(baselinePath), { recursive: true });
              await writeFile(baselinePath, candidateBuffer);
            } else {
              const baselineBuffer = await readFile(baselinePath);
              comparison = await compareImages(page, baselineBuffer, candidateBuffer);
              if (!comparison.dimensionsMatch || comparison.changedPixelRatio > changedPixelRatioThreshold) {
                status = 'visual-regression';
              }
            }
          } catch (error) {
            status = 'error';
            errors.push(error instanceof Error ? error.message : String(error));
          }

          manifest.captures.push({
            scenario: scenario.id,
            route: scenario.route,
            viewport: viewport.id,
            theme,
            status,
            durationMs: Date.now() - startedAt,
            metrics,
            comparison,
            candidate: candidatePath ? path.relative(workspaceRoot, candidatePath) : null,
            baseline: baselinePath ? path.relative(workspaceRoot, baselinePath) : null,
            errors: [...new Set(errors)].slice(0, 20),
            failedRequests: failedRequests.slice(0, 20),
          });
          console.log(
            `[${current}/${total}] ${scenario.id} | ${viewport.id} | ${theme} | ${status}` +
              `${comparison ? ` | diff ${(comparison.changedPixelRatio * 100).toFixed(3)}%` : ''}`
          );
          await page.close();
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const failedRequestSummary = createFailedRequestSummary(manifest.captures, baseUrl, apiUrl);
  const summary = {
    browser: browserName,
    mode: updateBaseline ? 'update' : 'compare',
    total: manifest.captures.length,
    successful: manifest.captures.filter((capture) => capture.status === 'ok').length,
    failed: manifest.captures.filter((capture) => capture.status !== 'ok').length,
    visualRegressions: manifest.captures.filter((capture) => capture.status === 'visual-regression').length,
    pageOverflow: manifest.captures.filter((capture) => capture.metrics?.document?.canScrollX).length,
    capturesWithPageErrors: manifest.captures.filter((capture) => capture.errors.length > 0).length,
    ...failedRequestSummary,
  };
  await writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(outputRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  if (updateBaseline) {
    await writeFile(
      path.join(baselineRoot, 'manifest.json'),
      `${JSON.stringify({ ...manifest, createdAt: new Date().toISOString() }, null, 2)}\n`
    );
  }
  console.log(JSON.stringify(summary));

  const hasBlockingFailure =
    summary.failed > 0 ||
    summary.visualRegressions > 0 ||
    summary.pageOverflow > 0 ||
    summary.capturesWithPageErrors > 0 ||
    summary.capturesWithLocalFailedRequests > 0 ||
    summary.unexpectedExternalFailures > 0;
  if (hasBlockingFailure) {
    console.error(
      'Visual regression gate failed. Inspect output/responsive-visual for candidate screenshots and manifest details.'
    );
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
