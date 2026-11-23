import { createHash, randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import type { InboxImplementationWorkerResult } from '@mos-lab/shared';
import { chromium } from 'playwright';
import { CODEX_STOP_GRACE_MS, PNPM_EXECUTABLE, isExecutablePath } from './codex-cli.js';
import { terminateCodexProcessGroup } from './codex-runner.js';

const PRIVATE_VISUAL_QA_SERVER_TIMEOUT_MS = 180_000;
const PRIVATE_VISUAL_QA_SERVER_PROBE_TIMEOUT_MS = 10_000;
const PRIVATE_VISUAL_QA_PAGE_TIMEOUT_MS = 60_000;

type InboxVisualQaRole = 'manager' | 'participant';
type PrivateVisualQaPhase =
  | 'prepare'
  | 'server'
  | 'browser'
  | 'manager_navigation'
  | 'manager_assertion'
  | 'manager_screenshot'
  | 'participant_navigation'
  | 'participant_assertion'
  | 'participant_screenshot';

export type PrivateVisualQaFailureCode =
  | 'PRIVATE_QA_PNPM_UNAVAILABLE'
  | 'PRIVATE_QA_PORT_UNAVAILABLE'
  | 'PRIVATE_QA_SERVER_UNAVAILABLE'
  | 'PRIVATE_QA_SERVER_EXITED'
  | 'PRIVATE_QA_SERVER_TIMEOUT'
  | 'PRIVATE_QA_PAGE_ERROR'
  | 'PRIVATE_QA_PREPARE_FAILED'
  | 'PRIVATE_QA_SERVER_FAILED'
  | 'PRIVATE_QA_BROWSER_FAILED'
  | 'PRIVATE_QA_MANAGER_NAVIGATION_FAILED'
  | 'PRIVATE_QA_MANAGER_ASSERTION_FAILED'
  | 'PRIVATE_QA_MANAGER_SCREENSHOT_FAILED'
  | 'PRIVATE_QA_PARTICIPANT_NAVIGATION_FAILED'
  | 'PRIVATE_QA_PARTICIPANT_ASSERTION_FAILED'
  | 'PRIVATE_QA_PARTICIPANT_SCREENSHOT_FAILED';

export type PrivateVisualQaScenario = 'architecture_smoke' | 'game_bk';

export type PrivateVisualQaResult = {
  scenario: PrivateVisualQaScenario;
  passed: boolean;
  evidence: { managerScreenshotSha256: string; participantScreenshotSha256: string } | null;
  failureCode?: PrivateVisualQaFailureCode;
};

const PRIVATE_VISUAL_QA_EXACT_FAILURE_CODES = new Set<PrivateVisualQaFailureCode>([
  'PRIVATE_QA_PNPM_UNAVAILABLE',
  'PRIVATE_QA_PORT_UNAVAILABLE',
  'PRIVATE_QA_SERVER_UNAVAILABLE',
  'PRIVATE_QA_SERVER_EXITED',
  'PRIVATE_QA_SERVER_TIMEOUT',
  'PRIVATE_QA_PAGE_ERROR',
]);

/** Returns only fixed operational codes; raw browser/server errors stay local. */
export function privateVisualQaFailureCode(phase: PrivateVisualQaPhase, error: unknown): PrivateVisualQaFailureCode {
  const message = error instanceof Error ? error.message : '';
  if (PRIVATE_VISUAL_QA_EXACT_FAILURE_CODES.has(message as PrivateVisualQaFailureCode)) {
    return message as PrivateVisualQaFailureCode;
  }
  return `PRIVATE_QA_${phase.toUpperCase()}_FAILED` as PrivateVisualQaFailureCode;
}

export function inboxVisualQaSyntheticStorage(role: InboxVisualQaRole): Record<string, string> {
  const user =
    role === 'manager'
      ? {
          id: -71001,
          username: 'inbox-qa-manager',
          email: 'inbox-qa-manager@invalid.test',
          displayName: 'Inbox QA Manager',
          role: 'admin',
        }
      : {
          id: -71002,
          username: 'inbox-qa-participant',
          email: 'inbox-qa-participant@invalid.test',
          displayName: 'Inbox QA Participant',
          role: 'telesales',
        };
  return {
    mos_token: `inbox-qa-synthetic-${role}-v1`,
    mos_user: JSON.stringify(user),
    mos_theme: 'light',
    mos_testing_bot: 'true',
  };
}

function syntheticVisualQaApiResponse(pathname: string, role: InboxVisualQaRole): unknown {
  const user = JSON.parse(inboxVisualQaSyntheticStorage(role).mos_user);
  if (pathname.endsWith('/auth/me')) return user;
  if (pathname.endsWith('/menu-access/sidebar-visibility')) {
    return { data: { visibility: {}, categoryVisibility: {} } };
  }
  if (pathname.endsWith('/academy-sales/access')) return { data: { canAccess: false } };
  if (pathname.endsWith('/academy-sales/campaigns/sidebar')) return [];
  if (pathname.endsWith('/campaigns')) return { items: [] };
  if (pathname.endsWith('/kpi/bk/booking/leaderboard')) return { leaderboard: [] };
  if (pathname.endsWith('/bug-reports/mine')) {
    return { data: [], notifications: [], unreadCount: 0, actionRequiredCount: 0 };
  }
  if (pathname.endsWith('/bug-reports')) return { summary: { readyForDannyCount: 0 }, data: [] };
  if (pathname.endsWith('/release')) return { deployedAt: null };
  return {};
}

export function privateVisualQaScenarioForChangedFiles(changedFiles: readonly string[]): PrivateVisualQaScenario {
  return changedFiles.some((file) => file.startsWith('apps/web/app/dashboard/bk/')) ? 'game_bk' : 'architecture_smoke';
}

function privateVisualQaRoute(scenario: PrivateVisualQaScenario): string {
  return scenario === 'game_bk' ? '/dashboard/bk?tab=game' : '/dashboard/architecture';
}

async function assertPrivateVisualQaSurface(
  page: import('playwright').Page,
  scenario: PrivateVisualQaScenario,
  role: InboxVisualQaRole
): Promise<void> {
  if (scenario === 'architecture_smoke') {
    await page
      .getByText(role === 'manager' ? 'Sơ Đồ Kiến Trúc Knowledge Graph' : 'Chỉ Dành Cho Quản Trị Viên', {
        exact: false,
      })
      .waitFor({ state: 'visible', timeout: PRIVATE_VISUAL_QA_PAGE_TIMEOUT_MS });
    return;
  }

  await page.getByText('Game BK', { exact: false }).first().waitFor({
    state: 'visible',
    timeout: PRIVATE_VISUAL_QA_PAGE_TIMEOUT_MS,
  });
  await page.getByLabel('Chỉ số xếp hạng Game BK').waitFor({
    state: 'visible',
    timeout: PRIVATE_VISUAL_QA_PAGE_TIMEOUT_MS,
  });

  const inboxNavigation = page.getByText('mOS Inbox', { exact: true });
  if (role === 'manager') {
    await inboxNavigation.waitFor({ state: 'visible', timeout: PRIVATE_VISUAL_QA_PAGE_TIMEOUT_MS });
    return;
  }
  if ((await inboxNavigation.count()) !== 0) throw new Error('PRIVATE_QA_PARTICIPANT_ASSERTION_FAILED');
}

async function reservePrivateLoopbackPort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const reservation = createServer();
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', () => {
      const address = reservation.address();
      if (!address || typeof address === 'string') {
        reservation.close();
        reject(new Error('PRIVATE_QA_PORT_UNAVAILABLE'));
        return;
      }
      reservation.close((error) => (error ? reject(error) : resolvePort(address.port)));
    });
  });
}

async function waitForPrivateVisualQaServer(url: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + PRIVATE_VISUAL_QA_SERVER_TIMEOUT_MS;
  let exited = false;
  child.once('exit', () => {
    exited = true;
  });
  while (Date.now() < deadline) {
    if (exited) throw new Error('PRIVATE_QA_SERVER_EXITED');
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(
          Math.min(PRIVATE_VISUAL_QA_SERVER_PROBE_TIMEOUT_MS, Math.max(1, deadline - Date.now()))
        ),
      });
      if (response.ok) return;
    } catch {
      // Next can need a few seconds to initialize a fresh private output directory.
    }
    await new Promise<void>((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error('PRIVATE_QA_SERVER_TIMEOUT');
}

/**
 * This starts Next from the trusted worker process, after Codex has finished
 * and outside Codex's workspace-write sandbox.
 */
export async function runPrivateVisualQaScenario(
  workspace: string,
  scenario: PrivateVisualQaScenario
): Promise<PrivateVisualQaResult> {
  let outputDirectory = '';
  let outputDirectoryPath = '';
  let server: ChildProcess | null = null;
  let phase: PrivateVisualQaPhase = 'prepare';
  try {
    if (!isExecutablePath(PNPM_EXECUTABLE)) throw new Error('PRIVATE_QA_PNPM_UNAVAILABLE');
    const port = await reservePrivateLoopbackPort();
    outputDirectory = `.next-inbox-private-qa-${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    outputDirectoryPath = join(workspace, 'apps', 'web', outputDirectory);
    server = spawn(
      PNPM_EXECUTABLE,
      ['--filter', '@mos-lab/web', 'exec', 'next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
      {
        cwd: workspace,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: {
          ...process.env,
          NEXT_DIST_DIR: outputDirectory,
          NEXT_PUBLIC_API_URL: '/api',
          MOS_NEXT_BUILD_COMPILER: 'webpack',
        },
      }
    );
    if (!server.pid) throw new Error('PRIVATE_QA_SERVER_UNAVAILABLE');
    const baseUrl = `http://127.0.0.1:${port}`;
    phase = 'server';
    await waitForPrivateVisualQaServer(`${baseUrl}/login`, server);
    phase = 'browser';
    const browser = await chromium.launch({ headless: true });
    try {
      const runRole = async (role: InboxVisualQaRole): Promise<string> => {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 960 },
          deviceScaleFactor: 1,
          reducedMotion: 'reduce',
        });
        try {
          const storage = inboxVisualQaSyntheticStorage(role);
          await context.addInitScript((values) => {
            Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, value));
          }, storage);
          await context.route('**/api/**', async (route) => {
            const pathname = new URL(route.request().url()).pathname;
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(syntheticVisualQaApiResponse(pathname, role)),
            });
          });
          const page = await context.newPage();
          const pageErrors: string[] = [];
          page.on('pageerror', () => pageErrors.push('pageerror'));
          phase = `${role}_navigation`;
          await page.goto(`${baseUrl}${privateVisualQaRoute(scenario)}`, {
            waitUntil: 'domcontentloaded',
            timeout: PRIVATE_VISUAL_QA_PAGE_TIMEOUT_MS,
          });
          phase = `${role}_assertion`;
          await assertPrivateVisualQaSurface(page, scenario, role);
          if (pageErrors.length) throw new Error('PRIVATE_QA_PAGE_ERROR');
          phase = `${role}_screenshot`;
          const screenshot = await page.screenshot({ type: 'png', fullPage: false, scale: 'css' });
          return createHash('sha256').update(screenshot).digest('hex');
        } finally {
          await context.close();
        }
      };
      const managerScreenshotSha256 = await runRole('manager');
      const participantScreenshotSha256 = await runRole('participant');
      return { scenario, passed: true, evidence: { managerScreenshotSha256, participantScreenshotSha256 } };
    } finally {
      await browser.close();
    }
  } catch (error) {
    return { scenario, passed: false, evidence: null, failureCode: privateVisualQaFailureCode(phase, error) };
  } finally {
    if (server) {
      const cancelEscalation = terminateCodexProcessGroup(server.pid ?? null, server);
      await new Promise<void>((resolveStopped) => setTimeout(resolveStopped, CODEX_STOP_GRACE_MS + 250));
      cancelEscalation();
    }
    if (outputDirectoryPath) await rm(outputDirectoryPath, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** The recovery self-check is deliberately a generic worker-harness smoke. */
export async function runPrivateVisualQaSelfCheck(workspace: string): Promise<PrivateVisualQaResult> {
  return runPrivateVisualQaScenario(workspace, 'architecture_smoke');
}

export async function runPrivateVisualQaForImplementation(
  workspace: string,
  changedFiles: readonly string[]
): Promise<PrivateVisualQaResult> {
  const smoke = await runPrivateVisualQaSelfCheck(workspace);
  if (!smoke.passed) return smoke;
  const scenario = privateVisualQaScenarioForChangedFiles(changedFiles);
  return scenario === 'architecture_smoke' ? smoke : runPrivateVisualQaScenario(workspace, scenario);
}

export function withWorkerOwnedVisualQaEvidence(
  result: InboxImplementationWorkerResult,
  changedFiles: readonly string[],
  visualQa: Pick<PrivateVisualQaResult, 'scenario' | 'passed' | 'failureCode'>
): InboxImplementationWorkerResult {
  if (!changedFiles.some((file) => file.startsWith('apps/web/'))) return result;
  const command =
    visualQa.scenario === 'game_bk'
      ? 'Worker-owned Playwright Game BK visual QA at /dashboard/bk?tab=game (private synthetic manager and participant sessions)'
      : 'Worker-owned Playwright Architecture smoke QA at /dashboard/architecture (private synthetic manager and participant sessions)';
  const hasModelVisualEvidence = result.tests.some((test) =>
    /(visual|screenshot|snapshot|tohavescreenshot)/i.test(test.command)
  );
  if (hasModelVisualEvidence) return result;
  return {
    ...result,
    tests: [
      ...result.tests,
      visualQa.passed
        ? { command, status: 'PASSED' as const }
        : {
            command,
            status: 'FAILED' as const,
            failureCode: visualQa.failureCode ?? 'PRIVATE_QA_PREPARE_FAILED',
            failureSummary:
              visualQa.scenario === 'game_bk'
                ? 'Game BK private visual QA không hoàn tất; quality gate giữ commit và deploy bị chặn.'
                : 'Private Architecture smoke QA không hoàn tất; quality gate giữ commit và deploy bị chặn.',
          },
    ],
  };
}
