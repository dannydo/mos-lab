import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESPONSIVE_THEMES, RESPONSIVE_VIEWPORTS } from './viewport-presets.mjs';
import {
  createFailedRequestSummary,
  getResponsiveBrowserType,
  getResponsiveContextOptions,
  installSanitizedAssetStubs,
} from './browser-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '../..');
const runDate = process.env.RESPONSIVE_RUN_DATE || new Date().toISOString().slice(0, 10);
const baseUrl = process.env.MOS_WEB_URL || 'http://localhost:4000';
const apiUrl = process.env.MOS_API_URL || 'http://localhost:4001';
const outputRoot = path.join(workspaceRoot, 'output', 'responsive-input', runDate);
const themes = process.env.INPUT_THEMES
  ? RESPONSIVE_THEMES.filter((theme) => process.env.INPUT_THEMES.split(',').includes(theme))
  : RESPONSIVE_THEMES;

const getViewport = (id) => {
  const viewport = RESPONSIVE_VIEWPORTS.find((candidate) => candidate.id === id);
  if (!viewport) throw new Error(`Unknown input-matrix viewport: ${id}`);
  return viewport;
};

const waitForAppShell = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForFunction(
    () => Boolean(document.querySelector('.ant-layout-header') && document.querySelector('.ant-layout-content')),
    { timeout: 30_000 }
  );
  await page.waitForTimeout(1_000);
};

const waitForOverlayClosed = async (page) => {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.ant-drawer-content-wrapper')].every(
        (drawer) => getComputedStyle(drawer).display === 'none'
      ),
    { timeout: 10_000 }
  );
};

const getDevAuth = async () => {
  const response = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ isMock: true, email: 'danhdo@gmail.com', name: 'Responsive Input QA' }),
  });
  if (!response.ok) throw new Error(`Dev authentication failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (!payload?.token || !payload?.user) throw new Error('Dev authentication response did not include token and user.');
  return payload;
};

const getPageMetrics = async (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
    return { clientWidth: root.clientWidth, scrollWidth, pageOverflow: scrollWidth > root.clientWidth + 1 };
  });

const desktopInputFlow = {
  id: 'desktop-mouse-keyboard-wheel',
  browser: 'chromium',
  viewport: getViewport('fhd'),
  async run(page) {
    const filterButton = page.locator('button:has(.anticon-filter)').first();
    const box = await filterButton.boundingBox();
    if (!box) throw new Error('Filter control did not expose a mouse target.');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible', timeout: 10_000 });
    await page.keyboard.press('Escape');
    await waitForOverlayClosed(page);

    await filterButton.focus();
    await page.keyboard.press('Enter');
    await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible', timeout: 10_000 });
    await page.keyboard.press('Escape');
    await waitForOverlayClosed(page);

    const tableBody = page.locator('.ant-table-body').first();
    await tableBody.waitFor({ state: 'visible', timeout: 10_000 });
    await page.waitForFunction(
      () => {
        const body = document.querySelector('.ant-table-body');
        return body instanceof HTMLElement && body.scrollHeight > body.clientHeight;
      },
      { timeout: 10_000 }
    );
    const scrollTopBefore = await tableBody.evaluate((element) => element.scrollTop);
    await tableBody.hover();
    await page.mouse.wheel(0, 480);
    await page.waitForTimeout(150);
    const scrollTopAfter = await tableBody.evaluate((element) => element.scrollTop);
    if (scrollTopAfter <= scrollTopBefore)
      throw new Error('Wheel/trackpad-equivalent input did not scroll the desktop data surface.');
  },
};

const touchInputFlow = (viewport) => ({
  id: `touch-overlays-${viewport.id}`,
  browser: 'webkit',
  viewport,
  async run(page) {
    const filterButton = page.locator('button:has(.anticon-filter)').first();
    await filterButton.tap();
    await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('.ant-drawer-close').last().tap();
    await waitForOverlayClosed(page);

    await page.getByRole('button', { name: 'Đặt lịch mới' }).tap();
    await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('.ant-drawer-close').last().tap();
    await waitForOverlayClosed(page);
  },
});

const allFlows = [
  desktopInputFlow,
  touchInputFlow(getViewport('iphone-12-portrait')),
  touchInputFlow(getViewport('ipad-portrait')),
];
const requestedFlows = process.env.INPUT_FLOWS?.split(',').map((id) => id.trim());
const flows = requestedFlows ? allFlows.filter((flow) => requestedFlows.includes(flow.id)) : allFlows;
if (flows.length === 0) throw new Error(`Unknown INPUT_FLOWS: ${process.env.INPUT_FLOWS}`);
if (themes.length === 0) throw new Error(`Unknown INPUT_THEMES: ${process.env.INPUT_THEMES}`);

const runCapture = async ({ flow, theme, auth }) => {
  const browser = await getResponsiveBrowserType(flow.browser).launch({ headless: true });
  const context = await browser.newContext(getResponsiveContextOptions(flow.viewport, flow.browser));
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) =>
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' })
  );

  try {
    await installSanitizedAssetStubs(context);
    await context.addInitScript(
      ({ token, user, selectedTheme, pageSize }) => {
        localStorage.setItem('mos_token', token);
        localStorage.setItem('mos_user', JSON.stringify(user));
        localStorage.setItem('mos_theme', selectedTheme);
        localStorage.setItem('mos_customers_pageSize', pageSize);
      },
      {
        token: auth.token,
        user: auth.user,
        selectedTheme: theme,
        pageSize: flow.id === 'desktop-mouse-keyboard-wheel' ? '50' : '10',
      }
    );
    await page.goto(`${baseUrl}/dashboard/customers`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await waitForAppShell(page);
    await flow.run(page);
    return {
      status: 'ok',
      metrics: await getPageMetrics(page),
      // Context shutdown aborts any still-polling background request. Snapshot
      // before cleanup so a runner-created abort cannot be reported as an app
      // regression.
      errors: [...errors],
      failedRequests: [...failedRequests],
    };
  } catch (error) {
    return {
      status: 'error',
      metrics: null,
      errors: [...errors, error instanceof Error ? error.message : String(error)],
      failedRequests: [...failedRequests],
    };
  } finally {
    await context.close();
    await browser.close();
  }
};

const run = async () => {
  await mkdir(outputRoot, { recursive: true });
  const auth = await getDevAuth();
  const manifest = { version: 1, createdAt: new Date().toISOString(), captures: [] };
  const total = flows.length * themes.length;
  let current = 0;

  for (const flow of flows) {
    for (const theme of themes) {
      current += 1;
      const startedAt = Date.now();
      const result = await runCapture({ flow, theme, auth });
      manifest.captures.push({
        flow: flow.id,
        browser: flow.browser,
        viewport: flow.viewport.id,
        theme,
        durationMs: Date.now() - startedAt,
        ...result,
      });
      console.log(
        `[${current}/${total}] ${flow.id} | ${flow.browser} | ${flow.viewport.id} | ${theme} | ${result.status}`
      );
    }
  }

  const failedRequestSummary = createFailedRequestSummary(manifest.captures, baseUrl, apiUrl);
  const summary = {
    total: manifest.captures.length,
    successful: manifest.captures.filter((capture) => capture.status === 'ok').length,
    failed: manifest.captures.filter((capture) => capture.status !== 'ok').length,
    pageOverflow: manifest.captures.filter((capture) => capture.metrics?.pageOverflow).length,
    capturesWithPageErrors: manifest.captures.filter((capture) => capture.errors.length > 0).length,
    ...failedRequestSummary,
  };
  await writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(outputRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary));

  if (
    summary.failed > 0 ||
    summary.pageOverflow > 0 ||
    summary.capturesWithPageErrors > 0 ||
    summary.capturesWithLocalFailedRequests > 0 ||
    summary.unexpectedExternalFailures > 0
  ) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
