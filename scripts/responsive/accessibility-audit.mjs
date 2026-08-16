import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
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

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '../..');
const runDate = process.env.RESPONSIVE_RUN_DATE || new Date().toISOString().slice(0, 10);
const baseUrl = process.env.MOS_WEB_URL || 'http://localhost:4000';
const apiUrl = process.env.MOS_API_URL || 'http://localhost:4001';
const browserName = getResponsiveBrowserName();
const outputRoot = path.join(workspaceRoot, 'output', 'responsive-accessibility', runDate, browserName);
const axeSourcePath = require.resolve('axe-core/axe.min.js');
const axeSource = await readFile(axeSourcePath, 'utf8');
const axeTimeoutMs = Number(process.env.A11Y_AXE_TIMEOUT_MS || '60000');
const desktopDensity = process.env.A11Y_DESKTOP_DENSITY || 'standard';
const requiredImpacts = new Set(
  (process.env.A11Y_IMPACTS || 'critical,serious').split(',').map((impact) => impact.trim())
);
const viewportIds = (process.env.A11Y_VIEWPORTS || 'iphone-12-portrait,fhd').split(',').map((id) => id.trim());
const selectedViewports = RESPONSIVE_VIEWPORTS.filter((viewport) => viewportIds.includes(viewport.id));
const selectedThemes = process.env.A11Y_THEMES
  ? RESPONSIVE_THEMES.filter((theme) => process.env.A11Y_THEMES.split(',').includes(theme))
  : RESPONSIVE_THEMES;

const allScenarios = [
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
    id: 'cc-tip-report',
    route: '/dashboard/cc?tab=tip',
    async ready(page) {
      await page.locator('.cc-page .report-period-navigator').waitFor({ state: 'visible', timeout: 20_000 });
    },
  },
  {
    id: 'cc-bonus-config-drawer',
    route: '/dashboard/cc?tab=tip',
    async open(page) {
      await page.locator('[data-ui="cc-settings-trigger"]').click();
      const bonusMenuItem = page.locator('.ant-dropdown-menu-item').filter({ hasText: 'Cấu hình thưởng CC' });
      await bonusMenuItem.waitFor({ state: 'visible', timeout: 20_000 });
      await bonusMenuItem.dispatchEvent('click');
      await page.locator('.cc-bonus-config-drawer').waitFor({ state: 'visible', timeout: 20_000 });
    },
  },
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
];
const scenarioIds = process.env.A11Y_SCENARIOS?.split(',').map((id) => id.trim());
const scenarios = scenarioIds ? allScenarios.filter((scenario) => scenarioIds.includes(scenario.id)) : allScenarios;

if (selectedViewports.length === 0) throw new Error(`Unknown A11Y_VIEWPORTS: ${process.env.A11Y_VIEWPORTS}`);
if (selectedThemes.length === 0) throw new Error(`Unknown A11Y_THEMES: ${process.env.A11Y_THEMES}`);
if (scenarios.length === 0) throw new Error(`Unknown A11Y_SCENARIOS: ${process.env.A11Y_SCENARIOS}`);
if (!['compact', 'standard', 'comfortable'].includes(desktopDensity)) {
  throw new Error(`Unknown A11Y_DESKTOP_DENSITY: ${desktopDensity}`);
}

const getDevAuth = async () => {
  const response = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ isMock: true, email: 'danhdo@gmail.com', name: 'Responsive Accessibility QA' }),
  });
  if (!response.ok) throw new Error(`Dev authentication failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (!payload?.token || !payload?.user) throw new Error('Dev authentication response did not include token and user.');
  return payload;
};

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

const inspectPage = async (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
    return { clientWidth: root.clientWidth, scrollWidth, canScrollX: scrollWidth > root.clientWidth + 1 };
  });

const simplifyAxeViolations = (violations) =>
  violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    helpUrl: violation.helpUrl,
    tags: violation.tags,
    nodes: violation.nodes.map((node) => ({ target: node.target, failureSummary: node.failureSummary })),
  }));

const withTimeout = async (promise, timeoutMs, label) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms.`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const auditFocusOrder = async (page) => {
  await page.locator('body').focus();
  const steps = [];
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab');
    steps.push(
      await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement)) return { valid: false, reason: 'No HTMLElement received focus.' };
        const focusSurface =
          element.closest(
            '.ant-select, .ant-picker, .ant-checkbox-wrapper, .ant-radio-wrapper, .ant-tabs-tab, button, a, [role]'
          ) || element;
        const rect = focusSurface.getBoundingClientRect();
        const style = getComputedStyle(focusSurface);
        const visible =
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth;
        const isBody = element === document.body || element === document.documentElement;
        return {
          valid: !isBody && element.matches(':focus-visible'),
          tag: focusSurface.tagName.toLowerCase(),
          role: focusSurface.getAttribute('role'),
          ariaLabel: focusSurface.getAttribute('aria-label') || element.getAttribute('aria-label'),
          visible,
          focusVisible: element.matches(':focus-visible'),
          reason: isBody ? 'Focus returned to document body.' : 'No :focus-visible state.',
        };
      })
    );
  }
  return { steps, failures: steps.filter((step) => !step.valid) };
};

const auditTargetSize = async (page, minimumSize, compactMinimumSize) =>
  page.evaluate(
    ({ minimum, compactMinimum }) => {
      const isVisible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth
        );
      };
      const describe = (element) => {
        const classes = [...element.classList]
          .slice(0, 2)
          .map((name) => `.${name}`)
          .join('');
        return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${classes}`;
      };
      const candidates = [
        ...document.querySelectorAll(
          'button, input:not([type="hidden"]), select, textarea, [role="button"], [role="switch"], [role="checkbox"], [role="tab"]'
        ),
      ];
      return candidates
        .filter((element) => element instanceof HTMLElement && !element.hasAttribute('disabled') && isVisible(element))
        .map((element) => {
          const wrapper = element.closest(
            'label, .ant-radio-wrapper, .ant-checkbox-wrapper, .ant-tabs-tab, .ant-select, .ant-picker, .ant-input-affix-wrapper'
          );
          const target = wrapper instanceof HTMLElement && isVisible(wrapper) ? wrapper : element;
          const rect = target.getBoundingClientRect();
          const isCompactDataControl = Boolean(
            element.closest('.ant-table, .ant-pagination, .ant-tabs-nav') || element.classList.contains('ant-btn-link')
          );
          return {
            target: describe(element),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            minimum: isCompactDataControl ? compactMinimum : minimum,
          };
        })
        .filter((target) => target.width < target.minimum || target.height < target.minimum)
        .slice(0, 100);
    },
    { minimum: minimumSize, compactMinimum: compactMinimumSize }
  );

const auditReducedMotion = async (page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  return page.evaluate(() => {
    const toMs = (value) =>
      Math.max(
        ...value.split(',').map((part) => {
          const trimmed = part.trim();
          return trimmed.endsWith('ms') ? Number(trimmed.slice(0, -2)) : Number(trimmed.slice(0, -1)) * 1000;
        })
      );
    const offenders = [...document.querySelectorAll('*')]
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.animationName !== 'none' && toMs(style.animationDuration) > 1;
      })
      .slice(0, 50)
      .map((element) => element.tagName.toLowerCase());
    return { mediaApplied: matchMedia('(prefers-reduced-motion: reduce)').matches, offenders };
  });
};

const run = async () => {
  await mkdir(outputRoot, { recursive: true });
  const auth = await getDevAuth();
  const browser = await getResponsiveBrowserType(browserName).launch({ headless: true });
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    browser: browserName,
    axeVersion: require('axe-core/package.json').version,
    axeTimeoutMs,
    requiredImpacts: [...requiredImpacts],
    viewports: selectedViewports,
    themes: selectedThemes,
    desktopDensity,
    scenarios: scenarios.map(({ id, route }) => ({ id, route })),
    captures: [],
  };

  try {
    const total = scenarios.length * selectedViewports.length * selectedThemes.length;
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
            localStorage.setItem('mos_customers_pageSize', '10');
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
          let axeViolations = [];
          let focus = { steps: [], failures: [] };
          let undersizedTargets = [];
          let reducedMotion = { mediaApplied: false, offenders: [] };
          try {
            await page.goto(`${baseUrl}${scenario.route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
            await waitForPageToSettle(page);
            if (scenario.ready) await scenario.ready(page);
            if (scenario.open) {
              await scenario.open(page, viewport);
              await page.waitForTimeout(500);
            }
            await page.addScriptTag({ content: axeSource });
            const axeResults = await withTimeout(
              page.evaluate(async () =>
                window.axe.run(document, {
                  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
                })
              ),
              axeTimeoutMs,
              `Axe audit for ${scenario.id} (${viewport.id}/${theme})`
            );
            axeViolations = simplifyAxeViolations(axeResults.violations);
            focus = await auditFocusOrder(page);
            const minimumTargetSize = viewport.hasTouch ? 44 : 32;
            const compactTargetSize = viewport.hasTouch ? 44 : 24;
            undersizedTargets = await auditTargetSize(page, minimumTargetSize, compactTargetSize);
            reducedMotion = await auditReducedMotion(page);
            metrics = await inspectPage(page);
            if (
              axeViolations.some((violation) => requiredImpacts.has(violation.impact)) ||
              focus.failures.length > 0 ||
              undersizedTargets.length > 0 ||
              !reducedMotion.mediaApplied ||
              reducedMotion.offenders.length > 0
            ) {
              status = 'accessibility-failure';
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
            axeViolations,
            focus,
            undersizedTargets,
            reducedMotion,
            errors: [...new Set(errors)].slice(0, 20),
            failedRequests: failedRequests.slice(0, 20),
          });
          const axeCount = axeViolations.reduce((totalNodes, violation) => totalNodes + violation.nodes.length, 0);
          console.log(
            `[${current}/${total}] ${scenario.id} | ${viewport.id} | ${theme} | ${status} | axe ${axeCount} | focus ${focus.failures.length} | targets ${undersizedTargets.length}`
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
    total: manifest.captures.length,
    successful: manifest.captures.filter((capture) => capture.status === 'ok').length,
    failed: manifest.captures.filter((capture) => capture.status !== 'ok').length,
    axeViolations: manifest.captures.reduce(
      (total, capture) => total + capture.axeViolations.reduce((count, violation) => count + violation.nodes.length, 0),
      0
    ),
    focusFailures: manifest.captures.reduce((total, capture) => total + capture.focus.failures.length, 0),
    undersizedTargets: manifest.captures.reduce((total, capture) => total + capture.undersizedTargets.length, 0),
    reducedMotionFailures: manifest.captures.filter(
      (capture) => !capture.reducedMotion.mediaApplied || capture.reducedMotion.offenders.length > 0
    ).length,
    pageOverflow: manifest.captures.filter((capture) => capture.metrics?.canScrollX).length,
    capturesWithPageErrors: manifest.captures.filter((capture) => capture.errors.length > 0).length,
    ...failedRequestSummary,
  };
  await writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(outputRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary));

  if (
    summary.failed > 0 ||
    summary.axeViolations > 0 ||
    summary.focusFailures > 0 ||
    summary.undersizedTargets > 0 ||
    summary.reducedMotionFailures > 0 ||
    summary.pageOverflow > 0 ||
    summary.capturesWithPageErrors > 0 ||
    summary.capturesWithLocalFailedRequests > 0 ||
    summary.unexpectedExternalFailures > 0
  ) {
    console.error('Accessibility gate failed. Inspect output/responsive-accessibility for the per-scenario report.');
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
