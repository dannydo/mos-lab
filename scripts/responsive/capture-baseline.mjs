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
// Next.js HMR and the API CORS allow-list are configured for localhost in this repo.
// Using 127.0.0.1 leaves the dev client unhydrated even though the HTML request succeeds.
const baseUrl = process.env.MOS_WEB_URL || 'http://localhost:4000';
const apiUrl = process.env.MOS_API_URL || 'http://localhost:4001';
const browserName = getResponsiveBrowserName();
const outputRoot = path.join(
  workspaceRoot,
  'output',
  'responsive-baseline',
  runDate,
  ...(browserName === 'chromium' ? [] : [browserName])
);

const routes = [
  { id: 'dashboard', path: '/dashboard' },
  { id: 'customers', path: '/dashboard/customers' },
  { id: 'appointments', path: '/dashboard/appointments' },
  { id: 'calls', path: '/dashboard/calls' },
  { id: 'plans', path: '/dashboard/plans' },
  { id: 'referrals', path: '/dashboard/referrals' },
  { id: 'loca', path: '/dashboard/loca' },
  { id: 'nyc', path: '/dashboard/nyc' },
  { id: 'nyc-campaigns', path: '/dashboard/nyc/campaigns' },
  { id: 'today', path: '/dashboard/today' },
  { id: 'kpi', path: '/dashboard/kpi' },
  { id: 'bk', path: '/dashboard/bk' },
  { id: 'cc', path: '/dashboard/cc' },
  { id: 'cv', path: '/dashboard/cv' },
  { id: 'fal', path: '/dashboard/fal' },
  { id: 'schedule-calendar', path: '/dashboard/schedule-calendar' },
  { id: 'catalog', path: '/dashboard/catalog' },
  { id: 'staff', path: '/dashboard/staff' },
  { id: 'staff-teams', path: '/dashboard/staff/teams' },
  { id: 'cs', path: '/dashboard/cs' },
  { id: 'qa-shop', path: '/dashboard/qa-shop' },
  { id: 'omicall', path: '/dashboard/omicall' },
  { id: 'architecture', path: '/dashboard/architecture' },
  { id: 'diagrams', path: '/dashboard/diagrams' },
];

const routeFilter = process.env.RESPONSIVE_ROUTE;
const viewportFilter = process.env.RESPONSIVE_VIEWPORT;
const themeFilter = process.env.RESPONSIVE_THEME;
const desktopDensity = process.env.RESPONSIVE_DESKTOP_DENSITY || 'standard';
const profile = process.env.RESPONSIVE_PROFILE;
const webkitSmokeRouteIds = ['customers', 'today', 'schedule-calendar'];
const webkitSmokeViewportIds = ['iphone-12-portrait', 'iphone-12-landscape', 'ipad-portrait', 'ipad-landscape'];
const routeIds = routeFilter?.split(',').map((id) => id.trim());
const viewportIds = viewportFilter?.split(',').map((id) => id.trim());
const allViewports = [...RESPONSIVE_VIEWPORTS, ...RESPONSIVE_ACCESSIBILITY_VIEWPORTS];
const selectedRoutes = routeIds
  ? routes.filter((route) => routeIds.includes(route.id))
  : profile === 'webkit-smoke'
    ? routes.filter((route) => webkitSmokeRouteIds.includes(route.id))
    : routes;
const selectedViewports = viewportIds
  ? allViewports.filter((viewport) => viewportIds.includes(viewport.id))
  : profile === 'webkit-smoke'
    ? RESPONSIVE_VIEWPORTS.filter((viewport) => webkitSmokeViewportIds.includes(viewport.id))
    : RESPONSIVE_VIEWPORTS;
const selectedThemes = themeFilter ? RESPONSIVE_THEMES.filter((theme) => theme === themeFilter) : RESPONSIVE_THEMES;

if (selectedRoutes.length === 0) throw new Error(`Unknown RESPONSIVE_ROUTE: ${routeFilter}`);
if (selectedViewports.length === 0) throw new Error(`Unknown RESPONSIVE_VIEWPORT: ${viewportFilter}`);
if (selectedThemes.length === 0) throw new Error(`Unknown RESPONSIVE_THEME: ${themeFilter}`);
if (!['compact', 'standard', 'comfortable'].includes(desktopDensity)) {
  throw new Error(`Unknown RESPONSIVE_DESKTOP_DENSITY: ${desktopDensity}`);
}

const getDevAuth = async () => {
  const response = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ isMock: true, email: 'danhdo@gmail.com', name: 'Responsive QA' }),
  });

  if (!response.ok) {
    throw new Error(`Dev authentication failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (!payload?.token || !payload?.user) {
    throw new Error('Dev authentication response did not include token and user.');
  }

  return payload;
};

const sanitizeVisibleData = async (page) => {
  await page.evaluate(() => {
    const replaceText = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      for (const node of nodes) {
        const value = node.nodeValue || '';
        if (!value.trim()) continue;
        node.nodeValue = value.replace(/[\p{L}\p{N}]/gu, '•');
      }
    };

    const protectedSelectors = [
      '.ant-table-tbody',
      '.ant-list-items',
      '.ant-timeline',
      '.fc-event',
      '.schedule-calendar-page .sub-slot-zone',
      '.schedule-calendar-page [class*="appointment" i]',
      '.schedule-calendar-page [class*="booking" i]',
      '.ant-select-selection-item',
      '[class*="auditor" i]',
      '[class*="customer-card" i]',
      '[class*="booking-card" i]',
      '[class*="staff-card" i]',
      '[class*="leaderboard" i]',
    ];

    for (const selector of protectedSelectors) {
      document.querySelectorAll(selector).forEach(replaceText);
    }

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
  });
};

const inspectViewport = async (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const overflowCandidates = [];

    for (const element of document.querySelectorAll('body *')) {
      if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) continue;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.bottom < 0 || rect.top > viewportHeight) continue;

      const exceedsRight = rect.right > viewportWidth + 1;
      const exceedsLeft = rect.left < -1;
      if (!exceedsRight && !exceedsLeft) continue;

      const className = typeof element.className === 'string' ? element.className : element.getAttribute('class') || '';
      overflowCandidates.push({
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        className: className.slice(0, 180),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        position: style.position,
        overflowX: style.overflowX,
      });

      if (overflowCandidates.length >= 20) break;
    }

    const content = document.querySelector('main, .ant-layout-content');
    const header = document.querySelector('header, .ant-layout-header');

    return {
      viewport: { width: viewportWidth, height: viewportHeight },
      document: {
        clientWidth: root.clientWidth,
        scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth || 0),
        scrollHeight: Math.max(root.scrollHeight, body?.scrollHeight || 0),
        canScrollX: Math.max(root.scrollWidth, body?.scrollWidth || 0) > root.clientWidth + 1,
      },
      regions: {
        header: header
          ? (() => {
              const rect = header.getBoundingClientRect();
              return { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
            })()
          : null,
        content: content
          ? (() => {
              const rect = content.getBoundingClientRect();
              return { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
            })()
          : null,
      },
      overflowCandidates,
    };
  });

const waitForPageToSettle = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForFunction(
    () => {
      const bodyText = document.body?.innerText || '';
      const hasAppShell = Boolean(
        document.querySelector('.ant-layout-header') && document.querySelector('.ant-layout-content')
      );
      const isSessionLoading = bodyText.includes('Tải thông tin phiên đăng nhập');
      return hasAppShell && !isSessionLoading;
    },
    { timeout: 30_000 }
  );

  await page
    .waitForFunction(() => document.querySelectorAll('.ant-spin-spinning').length === 0, { timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(1_500);
};

const run = async () => {
  await mkdir(outputRoot, { recursive: true });
  const auth = await getDevAuth();
  const browser = await getResponsiveBrowserType(browserName).launch({ headless: true });
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    browser: browserName,
    profile: profile || 'full',
    baseUrl,
    outputRoot,
    sanitized: true,
    networkStubs: ['lh3.googleusercontent.com image', 'cdn.wingslashes.com image', 'wingslashes.com/uploads image'],
    routes: selectedRoutes,
    viewports: selectedViewports,
    themes: selectedThemes,
    desktopDensity,
    captures: [],
  };

  try {
    const total = selectedViewports.length * selectedThemes.length * selectedRoutes.length;
    let current = 0;

    for (const viewport of selectedViewports) {
      for (const theme of selectedThemes) {
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

        for (const route of selectedRoutes) {
          current += 1;
          const page = await context.newPage();
          const errors = [];
          const failedRequests = [];

          page.on('pageerror', (error) => errors.push(error.message));
          page.on('requestfailed', (request) => {
            failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' });
          });

          const startedAt = Date.now();
          let status = 'ok';
          let metrics = null;
          let finalUrl = null;
          let screenshot = null;

          try {
            await page.goto(`${baseUrl}${route.path}`, {
              waitUntil: 'domcontentloaded',
              timeout: 45_000,
            });
            await waitForPageToSettle(page);
            finalUrl = page.url();
            await sanitizeVisibleData(page);
            metrics = await inspectViewport(page);

            const relativeScreenshot = path.join(viewport.id, theme, `${route.id}.jpg`);
            screenshot = path.join(outputRoot, relativeScreenshot);
            await mkdir(path.dirname(screenshot), { recursive: true });
            await page.screenshot({
              path: screenshot,
              type: 'jpeg',
              quality: 78,
              fullPage: false,
              scale: 'css',
            });
            screenshot = relativeScreenshot;
          } catch (error) {
            status = 'error';
            errors.push(error instanceof Error ? error.message : String(error));
          }

          manifest.captures.push({
            route: route.id,
            routePath: route.path,
            viewport: viewport.id,
            theme,
            status,
            finalUrl,
            screenshot,
            durationMs: Date.now() - startedAt,
            metrics,
            errors: [...new Set(errors)].slice(0, 20),
            failedRequests: failedRequests.slice(0, 20),
          });

          console.log(
            `[${current}/${total}] ${route.id} | ${viewport.id} | ${theme} | ${status}` +
              `${metrics?.document?.canScrollX ? ' | PAGE_X_OVERFLOW' : ''}`
          );
          await page.close();
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const manifestPath = path.join(outputRoot, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const failedRequestSummary = createFailedRequestSummary(manifest.captures, baseUrl, apiUrl);
  const summary = {
    browser: browserName,
    profile: profile || 'full',
    total: manifest.captures.length,
    successful: manifest.captures.filter((capture) => capture.status === 'ok').length,
    failed: manifest.captures.filter((capture) => capture.status !== 'ok').length,
    pageOverflow: manifest.captures.filter((capture) => capture.metrics?.document?.canScrollX).length,
    capturesWithVisibleOverflowCandidates: manifest.captures.filter(
      (capture) => (capture.metrics?.overflowCandidates?.length || 0) > 0
    ).length,
    capturesWithPageErrors: manifest.captures.filter((capture) => capture.errors.length > 0).length,
    ...failedRequestSummary,
  };

  await writeFile(path.join(outputRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Baseline manifest: ${manifestPath}`);
  console.log(JSON.stringify(summary));

  const hasBlockingFailure =
    summary.failed > 0 ||
    summary.pageOverflow > 0 ||
    summary.capturesWithPageErrors > 0 ||
    summary.capturesWithLocalFailedRequests > 0 ||
    summary.unexpectedExternalFailures > 0;
  if (hasBlockingFailure) {
    console.error('Responsive baseline gate failed. Inspect summary.json and manifest.json for the failing captures.');
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
