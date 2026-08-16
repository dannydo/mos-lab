import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESPONSIVE_ACCESSIBILITY_VIEWPORTS, RESPONSIVE_THEMES, RESPONSIVE_VIEWPORTS } from './viewport-presets.mjs';
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
const isolateCaptures = process.env.RESPONSIVE_ISOLATE === '1';
const outputRoot = path.join(
  workspaceRoot,
  'output',
  'responsive-baseline',
  runDate,
  'interaction-states',
  ...(browserName === 'chromium' ? [] : [browserName])
);

const defaultViewportIds = ['iphone-12-portrait', 'ipad-portrait', 'fhd'];
const viewportFilter = process.env.RESPONSIVE_VIEWPORT;
const themeFilter = process.env.RESPONSIVE_THEME;
const stateFilter = process.env.RESPONSIVE_STATE;
const allViewports = [...RESPONSIVE_VIEWPORTS, ...RESPONSIVE_ACCESSIBILITY_VIEWPORTS];
const selectedViewports = allViewports.filter((viewport) =>
  viewportFilter ? viewport.id === viewportFilter : defaultViewportIds.includes(viewport.id)
);
const selectedThemes = themeFilter ? RESPONSIVE_THEMES.filter((theme) => theme === themeFilter) : RESPONSIVE_THEMES;

const waitForAppShell = async (page) => {
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
  await page.waitForTimeout(800);
};

const scenarios = [
  {
    id: 'advanced-filter-drawer',
    async open(page) {
      await page.locator('button:has(.anticon-filter)').first().click();
      await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible' });
    },
  },
  {
    id: 'booking-wizard-drawer',
    maskOverlay: true,
    async open(page) {
      await page.getByRole('button', { name: 'Đặt lịch mới' }).click();
      await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible' });
    },
  },
  {
    id: 'random-selector-modal',
    async open(page) {
      await page.locator('button:has(.anticon-aim)').first().click();
      await page.locator('.ant-modal-content').last().waitFor({ state: 'visible' });
    },
  },
  {
    id: 'customer-detail-drawer',
    maskOverlay: true,
    async open(page, viewport) {
      if (viewport.isMobile) {
        const mobileCard = page.locator('.customer-mobile-card-open').first();
        await mobileCard.waitFor({ state: 'visible', timeout: 20_000 });
        await mobileCard.click();
        await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible' });
        return;
      }

      const row = page.locator('.ant-table-tbody tr.ant-table-row').first();
      await row.waitFor({ state: 'visible', timeout: 20_000 });
      await row.locator('.ant-avatar').first().click();
      await page.locator('.ant-drawer-content').last().waitFor({ state: 'visible' });
    },
  },
  {
    id: 'empty-results',
    async open(page) {
      const search = page.getByPlaceholder('Tìm tên hoặc SĐT...');
      await search.fill('__responsive_qa_no_match__');
      await search.press('Enter');
      await page.locator('.ant-empty').first().waitFor({ state: 'visible', timeout: 20_000 });
    },
  },
];

const selectedScenarios = stateFilter ? scenarios.filter((scenario) => scenario.id === stateFilter) : scenarios;

if (selectedViewports.length === 0) throw new Error(`Unknown RESPONSIVE_VIEWPORT: ${viewportFilter}`);
if (selectedThemes.length === 0) throw new Error(`Unknown RESPONSIVE_THEME: ${themeFilter}`);
if (selectedScenarios.length === 0) throw new Error(`Unknown RESPONSIVE_STATE: ${stateFilter}`);

const getDevAuth = async () => {
  const response = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ isMock: true, email: 'danhdo@gmail.com', name: 'Responsive QA' }),
  });
  if (!response.ok) throw new Error(`Dev authentication failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (!payload?.token || !payload?.user) throw new Error('Dev authentication response did not include token and user.');
  return payload;
};

const sanitizeVisibleData = async (page, maskOverlay) => {
  await page.evaluate((shouldMaskOverlay) => {
    const replaceText = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (node.nodeValue?.trim()) node.nodeValue = node.nodeValue.replace(/[\p{L}\p{N}]/gu, '•');
      }
    };

    const selectors = [
      '.ant-table-tbody',
      '.ant-list-items',
      '.ant-timeline',
      '.ant-select-selection-item',
      '[class*="customer-card" i]',
      '[class*="staff-card" i]',
      '[class*="leaderboard" i]',
    ];
    if (shouldMaskOverlay)
      selectors.push('.ant-drawer-header', '.ant-drawer-body', '.ant-modal-header', '.ant-modal-body');
    selectors.push('.ant-layout-content');
    selectors.forEach((selector) => document.querySelectorAll(selector).forEach(replaceText));

    document.querySelectorAll('input, textarea').forEach((field) => {
      field.value = '';
      field.setAttribute('value', '');
      field.setAttribute('placeholder', 'Sanitized for responsive QA');
    });
    document.querySelectorAll('img').forEach((image) => {
      if (!/logo/i.test(image.alt || '')) {
        image.removeAttribute('src');
        image.style.background = '#64748b';
      }
    });
  }, maskOverlay);
};

const inspectViewport = async (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
    const overlay = document.querySelector('.ant-drawer-content, .ant-modal-content, .ant-empty');
    const overlayRect = overlay?.getBoundingClientRect();
    const overlayOutsideViewport = Boolean(
      overlayRect &&
      (overlayRect.left < -1 ||
        overlayRect.right > window.innerWidth + 1 ||
        overlayRect.top < -1 ||
        overlayRect.bottom > window.innerHeight + 1)
    );
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: { clientWidth: root.clientWidth, scrollWidth, canScrollX: scrollWidth > root.clientWidth + 1 },
      overlay: overlayRect
        ? {
            left: Math.round(overlayRect.left),
            right: Math.round(overlayRect.right),
            width: Math.round(overlayRect.width),
            height: Math.round(overlayRect.height),
          }
        : null,
      overlayOutsideViewport,
    };
  });

const run = async () => {
  await mkdir(outputRoot, { recursive: true });
  const auth = await getDevAuth();
  const browserType = getResponsiveBrowserType(browserName);
  const browser = isolateCaptures ? null : await browserType.launch({ headless: true });
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    browser: browserName,
    route: '/dashboard/customers',
    outputRoot,
    sanitized: true,
    networkStubs: ['lh3.googleusercontent.com image', 'cdn.wingslashes.com image', 'wingslashes.com/uploads image'],
    captures: [],
  };

  try {
    const total = selectedViewports.length * selectedThemes.length * selectedScenarios.length;
    let current = 0;
    for (const viewport of selectedViewports) {
      for (const theme of selectedThemes) {
        let sharedContext = null;
        if (!isolateCaptures) {
          sharedContext = await browser.newContext(getResponsiveContextOptions(viewport, browserName));
          await installSanitizedAssetStubs(sharedContext);
          await sharedContext.addInitScript(
            ({ token, user, selectedTheme }) => {
              localStorage.setItem('mos_token', token);
              localStorage.setItem('mos_user', JSON.stringify(user));
              localStorage.setItem('mos_theme', selectedTheme);
            },
            { token: auth.token, user: auth.user, selectedTheme: theme }
          );
        }

        for (const scenario of selectedScenarios) {
          current += 1;
          const captureBrowser = isolateCaptures ? await browserType.launch({ headless: true }) : browser;
          const context = isolateCaptures
            ? await captureBrowser.newContext(getResponsiveContextOptions(viewport, browserName))
            : sharedContext;
          if (isolateCaptures) {
            await installSanitizedAssetStubs(context);
            await context.addInitScript(
              ({ token, user, selectedTheme }) => {
                localStorage.setItem('mos_token', token);
                localStorage.setItem('mos_user', JSON.stringify(user));
                localStorage.setItem('mos_theme', selectedTheme);
              },
              { token: auth.token, user: auth.user, selectedTheme: theme }
            );
          }
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
          let screenshot = null;
          try {
            await page.goto(`${baseUrl}/dashboard/customers`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await waitForAppShell(page);
            await scenario.open(page, viewport);
            await page.waitForTimeout(500);
            await sanitizeVisibleData(page, scenario.maskOverlay || false);
            metrics = await inspectViewport(page);
            const relativeScreenshot = path.join(viewport.id, theme, `${scenario.id}.jpg`);
            const screenshotPath = path.join(outputRoot, relativeScreenshot);
            await mkdir(path.dirname(screenshotPath), { recursive: true });
            await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 78, fullPage: false, scale: 'css' });
            screenshot = relativeScreenshot;
          } catch (error) {
            status = 'error';
            errors.push(error instanceof Error ? error.message : String(error));
          }

          manifest.captures.push({
            state: scenario.id,
            viewport: viewport.id,
            theme,
            status,
            screenshot,
            durationMs: Date.now() - startedAt,
            metrics,
            errors: [...new Set(errors)].slice(0, 20),
            failedRequests: failedRequests.slice(0, 20),
          });
          console.log(`[${current}/${total}] ${scenario.id} | ${viewport.id} | ${theme} | ${status}`);
          await page.close();
          if (isolateCaptures) {
            await context.close();
            await captureBrowser.close();
          }
        }
        await sharedContext?.close();
      }
    }
  } finally {
    await browser?.close();
  }

  const failedRequestSummary = createFailedRequestSummary(manifest.captures, baseUrl, apiUrl);
  const summary = {
    browser: browserName,
    total: manifest.captures.length,
    successful: manifest.captures.filter((capture) => capture.status === 'ok').length,
    failed: manifest.captures.filter((capture) => capture.status !== 'ok').length,
    pageOverflow: manifest.captures.filter((capture) => capture.metrics?.document?.canScrollX).length,
    capturesWithPageErrors: manifest.captures.filter((capture) => capture.errors.length > 0).length,
    capturesWithOverlayOutsideViewport: manifest.captures.filter((capture) => capture.metrics?.overlayOutsideViewport)
      .length,
    ...failedRequestSummary,
  };
  await writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(outputRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary));

  const hasBlockingFailure =
    summary.failed > 0 ||
    summary.pageOverflow > 0 ||
    summary.capturesWithPageErrors > 0 ||
    summary.capturesWithOverlayOutsideViewport > 0 ||
    summary.capturesWithLocalFailedRequests > 0 ||
    summary.unexpectedExternalFailures > 0;
  if (hasBlockingFailure) {
    console.error(
      'Responsive interaction-state gate failed. Inspect summary.json and manifest.json for the failing captures.'
    );
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
