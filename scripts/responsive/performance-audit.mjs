import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESPONSIVE_VIEWPORTS } from './viewport-presets.mjs';
import {
  createFailedRequestSummary,
  getResponsiveBrowserType,
  getResponsiveContextOptions,
  installSanitizedAssetStubs,
} from './browser-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '../..');
const runDate = process.env.RESPONSIVE_RUN_DATE || new Date().toISOString().slice(0, 10);
const baseUrl = process.env.MOS_WEB_URL || 'http://localhost:4002';
const apiUrl = process.env.MOS_API_URL || 'http://localhost:4001';
const outputRoot = path.join(workspaceRoot, 'output', 'responsive-performance', runDate);

const BUDGETS = {
  maxDomNodes: 6_000,
  maxInitialJsBytes: 1_500_000,
  maxFirstContentfulPaintMs: 2_500,
  maxResizeEvents: 4,
  mobilePageSize: 10,
  desktopPageSize: 50,
};

const getViewport = (id) => {
  const viewport = RESPONSIVE_VIEWPORTS.find((candidate) => candidate.id === id);
  if (!viewport) throw new Error(`Unknown performance viewport: ${id}`);
  return viewport;
};

const profiles = [
  { id: 'iphone-12', viewport: getViewport('iphone-12-portrait'), expectedSurface: 'mobile' },
  { id: 'fhd', viewport: getViewport('fhd'), expectedSurface: 'table' },
  { id: '4k', viewport: getViewport('4k'), expectedSurface: 'table' },
];

const waitForAppShell = async (page, expectedSurface) => {
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
    .waitForFunction(() => document.querySelectorAll('.ant-spin-spinning').length === 0, { timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1_000);
  const selector =
    expectedSurface === 'mobile' ? '.customer-mobile-card' : '.customer-data-table .ant-table-tbody tr.ant-table-row';
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 20_000 });
};

const getDevAuth = async () => {
  const response = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ isMock: true, email: 'danhdo@gmail.com', name: 'Responsive Performance QA' }),
  });
  if (!response.ok) throw new Error(`Dev authentication failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (!payload?.token || !payload?.user) throw new Error('Dev authentication response did not include token and user.');
  return payload;
};

const getPageMetrics = async (page, expectedSurface) =>
  page.evaluate(
    ({ expectedSurface, baseUrl }) => {
      const entries = performance.getEntriesByType('resource');
      const initialJsBytes = entries
        .filter(
          (entry) => entry.name.startsWith(baseUrl) && entry.name.includes('/_next/') && entry.name.endsWith('.js')
        )
        .reduce((sum, entry) => sum + entry.transferSize, 0);
      const initialCssBytes = entries
        .filter(
          (entry) => entry.name.startsWith(baseUrl) && entry.name.includes('/_next/') && entry.name.endsWith('.css')
        )
        .reduce((sum, entry) => sum + entry.transferSize, 0);
      const navigation = performance.getEntriesByType('navigation')[0];
      const firstContentfulPaint = performance
        .getEntriesByType('paint')
        .find((entry) => entry.name === 'first-contentful-paint')?.startTime;
      const mobileCards = document.querySelectorAll('.customer-mobile-card').length;
      const tableRows = document.querySelectorAll('.customer-data-table .ant-table-tbody tr.ant-table-row').length;
      const root = document.documentElement;
      const scrollWidth = Math.max(root.scrollWidth, document.body?.scrollWidth || 0);

      return {
        domNodes: document.querySelectorAll('*').length,
        initialJsBytes,
        initialCssBytes,
        navigation: navigation
          ? {
              ttfbMs: Math.round(navigation.responseStart),
              domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
              loadMs: Math.round(navigation.loadEventEnd || navigation.duration),
            }
          : null,
        firstContentfulPaintMs: firstContentfulPaint ? Math.round(firstContentfulPaint) : null,
        mobileCards,
        tableRows,
        dualDataSurface: mobileCards > 0 && tableRows > 0,
        expectedSurfaceMatched:
          expectedSurface === 'mobile' ? mobileCards > 0 && tableRows === 0 : tableRows > 0 && mobileCards === 0,
        pageOverflow: scrollWidth > root.clientWidth + 1,
      };
    },
    { expectedSurface, baseUrl }
  );

const inspectResizeBehavior = async (page, profile) => {
  await page.evaluate(() => {
    window.__responsivePerformanceResize = { events: 0, frames: 0 };
    const recordResize = () => {
      window.__responsivePerformanceResize.events += 1;
      requestAnimationFrame(() => {
        window.__responsivePerformanceResize.frames += 1;
      });
    };
    window.addEventListener('resize', recordResize, { once: false });
  });

  const alternate =
    profile.id === 'iphone-12'
      ? { width: 844, height: 390 }
      : profile.id === 'fhd'
        ? { width: 3840, height: 2160 }
        : { width: 1920, height: 1080 };
  await page.setViewportSize(alternate);
  await page.waitForTimeout(350);
  await page.setViewportSize({ width: profile.viewport.width, height: profile.viewport.height });
  await page.waitForTimeout(500);

  return page.evaluate(() => window.__responsivePerformanceResize);
};

const meetsBudget = (metrics, resize, resizeRequests) => {
  const failures = [];
  if (metrics.domNodes > BUDGETS.maxDomNodes) failures.push(`DOM nodes ${metrics.domNodes} > ${BUDGETS.maxDomNodes}`);
  if (metrics.initialJsBytes > BUDGETS.maxInitialJsBytes)
    failures.push(`initial JS ${metrics.initialJsBytes} B > ${BUDGETS.maxInitialJsBytes} B`);
  if (metrics.firstContentfulPaintMs && metrics.firstContentfulPaintMs > BUDGETS.maxFirstContentfulPaintMs)
    failures.push(`FCP ${metrics.firstContentfulPaintMs} ms > ${BUDGETS.maxFirstContentfulPaintMs} ms`);
  if (metrics.dualDataSurface) failures.push('Desktop table and mobile cards rendered together');
  if (!metrics.expectedSurfaceMatched) failures.push('Incorrect data surface rendered for this viewport tier');
  if (metrics.pageOverflow) failures.push('Page-level horizontal overflow');
  if (metrics.mobileCards > BUDGETS.mobilePageSize)
    failures.push(`mobile records ${metrics.mobileCards} > controlled page size ${BUDGETS.mobilePageSize}`);
  if (metrics.tableRows > BUDGETS.desktopPageSize)
    failures.push(`desktop rows ${metrics.tableRows} > controlled page size ${BUDGETS.desktopPageSize}`);
  if (resize.events > BUDGETS.maxResizeEvents)
    failures.push(`resize events ${resize.events} > ${BUDGETS.maxResizeEvents}`);
  if (resizeRequests > 0) failures.push(`resize initiated ${resizeRequests} local network request(s)`);
  return failures;
};

const auditProfile = async ({ browser, auth, profile }) => {
  const context = await browser.newContext(getResponsiveContextOptions(profile.viewport, 'chromium'));
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  const resizeRequests = [];
  let resizeAuditActive = false;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) =>
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' })
  );
  page.on('request', (request) => {
    if (resizeAuditActive && (request.url().startsWith(baseUrl) || request.url().startsWith(apiUrl))) {
      resizeRequests.push(request.url());
    }
  });

  try {
    await installSanitizedAssetStubs(context);
    await context.addInitScript(
      ({ token, user, pageSize }) => {
        localStorage.setItem('mos_token', token);
        localStorage.setItem('mos_user', JSON.stringify(user));
        localStorage.setItem('mos_theme', 'dark');
        localStorage.setItem('mos_customers_pageSize', pageSize);
      },
      {
        token: auth.token,
        user: auth.user,
        pageSize:
          profile.expectedSurface === 'mobile' ? String(BUDGETS.mobilePageSize) : String(BUDGETS.desktopPageSize),
      }
    );
    await page.goto(`${baseUrl}/dashboard/customers`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await waitForAppShell(page, profile.expectedSurface);
    const metrics = await getPageMetrics(page, profile.expectedSurface);
    resizeAuditActive = true;
    const resize = await inspectResizeBehavior(page, profile);
    resizeAuditActive = false;
    const failures = meetsBudget(metrics, resize, resizeRequests.length);
    return {
      status: failures.length === 0 ? 'ok' : 'error',
      profile: profile.id,
      viewport: profile.viewport.id,
      metrics,
      resize,
      resizeRequests: [...resizeRequests],
      budgetFailures: failures,
      errors: [...errors],
      failedRequests: [...failedRequests],
    };
  } catch (error) {
    return {
      status: 'error',
      profile: profile.id,
      viewport: profile.viewport.id,
      metrics: null,
      resize: null,
      resizeRequests: [...resizeRequests],
      budgetFailures: [error instanceof Error ? error.message : String(error)],
      errors: [...errors],
      failedRequests: [...failedRequests],
    };
  } finally {
    await context.close();
  }
};

const run = async () => {
  await mkdir(outputRoot, { recursive: true });
  const auth = await getDevAuth();
  const browser = await getResponsiveBrowserType('chromium').launch({ headless: true });
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    baseUrl,
    route: '/dashboard/customers',
    budgets: BUDGETS,
    captures: [],
  };

  try {
    for (const [index, profile] of profiles.entries()) {
      const capture = await auditProfile({ browser, auth, profile });
      manifest.captures.push(capture);
      console.log(`[${index + 1}/${profiles.length}] ${profile.id} | ${capture.status}`);
    }
  } finally {
    await browser.close();
  }

  const failedRequestSummary = createFailedRequestSummary(manifest.captures, baseUrl, apiUrl);
  const summary = {
    total: manifest.captures.length,
    successful: manifest.captures.filter((capture) => capture.status === 'ok').length,
    failed: manifest.captures.filter((capture) => capture.status !== 'ok').length,
    maxDomNodes: Math.max(...manifest.captures.map((capture) => capture.metrics?.domNodes || 0)),
    maxInitialJsBytes: Math.max(...manifest.captures.map((capture) => capture.metrics?.initialJsBytes || 0)),
    maxInitialCssBytes: Math.max(...manifest.captures.map((capture) => capture.metrics?.initialCssBytes || 0)),
    maxFirstContentfulPaintMs: Math.max(
      ...manifest.captures.map((capture) => capture.metrics?.firstContentfulPaintMs || 0)
    ),
    capturesWithPageErrors: manifest.captures.filter((capture) => capture.errors.length > 0).length,
    ...failedRequestSummary,
  };
  await writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(outputRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary));

  if (
    summary.failed > 0 ||
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
