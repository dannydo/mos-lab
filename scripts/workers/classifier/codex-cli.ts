import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { execFile, execFileSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

export const DEFAULT_API_URL = 'https://api.lab.masteros.app/api';
export const DEFAULT_WEB_RELEASE_URL = 'https://lab.masteros.app/api/release-version';
export const POLL_INTERVAL_MS = 30_000;
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const CODEX_TIMEOUT_MS = 90_000;
export const CODEX_IMPLEMENTATION_SLICE_TIMEOUT_MS = 45 * 60 * 1000;
export const IMPLEMENTATION_NO_PROGRESS_WARNING_MS = 10 * 60 * 1000;
export const IMPLEMENTATION_NO_PROGRESS_STOP_MS = 20 * 60 * 1000;
export const IMPLEMENTATION_PROGRESS_POLL_MS = 30_000;
export const IMPLEMENTATION_MAX_SLICES = 2;
export const CODEX_STOP_GRACE_MS = 5_000;
export const IMPLEMENTATION_LEASE_RENEWAL_MS = 60_000;
export const IMPLEMENTATION_LEASE_RENEWAL_ATTEMPTS = 3;
export const IMPLEMENTATION_LEASE_RENEWAL_BACKOFF_MS = 2_000;
export const IMPLEMENTATION_PREFLIGHT_CACHE_MS = 5 * 60 * 1000;
export const WORKER_FETCH_TIMEOUT_MS = 20_000;
export const PNPM_EXECUTABLE = '/opt/homebrew/bin/pnpm';
export const execFileAsync = promisify(execFile);

const MACOS_CODEX_CANDIDATES = [
  '/Applications/ChatGPT.app/Contents/Resources/codex',
  '/usr/local/bin/codex',
  '/opt/homebrew/bin/codex',
];

export function isExecutablePath(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveCodexCliPath(
  env: NodeJS.ProcessEnv = process.env,
  isExecutable: (path: string) => boolean = isExecutablePath
): string {
  const configured = String(env.MOS_CODEX_CLI_PATH || '').trim();
  if (configured) {
    if (!isExecutable(configured)) throw new Error('Configured MOS_CODEX_CLI_PATH is not executable.');
    return configured;
  }
  const discovered = MACOS_CODEX_CANDIDATES.find(isExecutable);
  if (!discovered) throw new Error('Codex CLI was not found; set MOS_CODEX_CLI_PATH for the launchd worker.');
  return discovered;
}

export type CodexCliFailureCode =
  | 'CODEX_EXEC_TIMEOUT'
  | 'CODEX_EXEC_STALLED'
  | 'CODEX_EXEC_CHECKPOINT_REQUIRED'
  | 'CODEX_EXEC_MAX_RUNTIME'
  | 'CODEX_EXEC_FAILED'
  | 'CODEX_EXEC_SIGNAL'
  | 'CODEX_PREFLIGHT_FAILED'
  | 'LEASE_START_FAILED'
  | 'LEASE_RENEW_FAILED'
  | 'CODEX_OUTPUT_MISSING'
  | 'FORBIDDEN_GIT_MUTATION'
  | 'DEPLOY_MERGE_CONFLICT'
  | 'DEPLOY_PUSH_FAILED'
  | 'DEPLOY_PIPELINE_FAILED'
  | `CODEX_EXEC_EXIT_${number}`;

export class CodexCliError extends Error {
  constructor(
    readonly code: CodexCliFailureCode,
    readonly failureSummary: string | null = null
  ) {
    super(code);
  }
}

export type SpawnProcess = (command: string, args: readonly string[], options: SpawnOptions) => ChildProcess;

export type CodexCliRuntime = {
  processId: number | null;
  terminate: (code: CodexCliFailureCode) => void;
};

export type CodexCliLifecycle = {
  onStarted?: (runtime: CodexCliRuntime) => Promise<void> | void;
  onActivity?: () => void;
};

/**
 * A Codex child can fail before it produces the structured result that the
 * implementation job normally persists. Keep only a short, scrubbed diagnosis
 * in memory so the worker can report the failure without retaining raw CLI
 * output, ticket content, paths, or credentials.
 */
export function safeCodexCliFailureSummary(value: unknown): string | null {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const candidate = text
    .split(/(?<=\.)\s+|\s{2,}/)
    .reverse()
    .find((line) =>
      /^(?:error|fatal|failed|failure|invalid|unknown|cannot|unable|denied|unauthorized|forbidden|rate limit|not found)\b/i.test(
        line.trim()
      )
    );
  if (!candidate) return null;
  const safe = candidate
    .replace(/\b(token|secret|password|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\b(?:Bearer\s+)?[A-Za-z0-9_-]{32,}\b/g, '[redacted]')
    .replace(/\/(?:Users|home)\/[^\s:]+/g, '[internal-path]')
    .replace(/[^\p{L}\p{N}\s.,:;()[\]_=-]/gu, '')
    .trim();
  return safe ? safe.slice(0, 280) : null;
}

/**
 * Extract only explicit terminal failure events from Codex JSONL. Model text,
 * tool output, prompts and successful events are never inspected or retained.
 */
export function safeCodexCliJsonFailureSummary(value: unknown): string | null {
  for (const line of String(value || '')
    .split(/\r?\n/)
    .reverse()) {
    try {
      const event = JSON.parse(line) as {
        type?: unknown;
        error?: unknown;
        message?: unknown;
        item?: { error?: unknown; message?: unknown } | null;
      };
      const type = String(event.type ?? '')
        .trim()
        .slice(0, 80)
        .toLowerCase();
      if (!['error', 'turn.failed', 'item.failed'].includes(type)) continue;
      for (const detail of [event.error, event.message, event.item?.error, event.item?.message]) {
        const message =
          typeof detail === 'string'
            ? detail
            : detail && typeof detail === 'object' && 'message' in detail
              ? (detail as { message?: unknown }).message
              : null;
        const summary = safeCodexCliFailureSummary(message);
        if (summary) return summary;
      }
    } catch (error) {
      if (error instanceof CodexCliError) throw error;
    }
  }
  return null;
}

export function inboxImplementationFailureSummary(error: unknown): string {
  if (error instanceof CodexCliError) {
    if (error.failureSummary) return error.failureSummary;
    if (error.code.startsWith('CODEX_EXEC_EXIT_'))
      return `Codex executor thoát với ${error.code.replace('CODEX_EXEC_EXIT_', 'mã ')} trước khi trả kết quả có cấu trúc.`;
    if (error.code === 'CODEX_EXEC_TIMEOUT') return 'Codex executor vượt quá thời gian chạy cho phép.';
    if (error.code === 'CODEX_EXEC_STALLED') return 'Codex executor không tạo tiến độ mới trong thời hạn cho phép.';
  }
  return 'Worker dừng trước khi nhận được kết quả kỹ thuật có cấu trúc.';
}

export function buildCodexExecArgs(schemaPath: string, outputPath: string, prompt: string): string[] {
  return [
    'exec',
    '--ephemeral',
    '--sandbox',
    'read-only',
    '--skip-git-repo-check',
    '--color',
    'never',
    '--output-schema',
    schemaPath,
    '--output-last-message',
    outputPath,
    prompt,
  ];
}

/** Implementation is intentionally more constrained than an interactive Codex session. */
export function buildCodexImplementationArgs(schemaPath: string, outputPath: string, prompt: string): string[] {
  return [
    'exec',
    '--ephemeral',
    '--ignore-user-config',
    '--approve-for-me',
    '--color',
    'never',
    '--json',
    '--output-schema',
    schemaPath,
    '--output-last-message',
    outputPath,
    prompt,
  ];
}

export function implementationWorktreeRoot(workspace: string): string {
  return resolve(workspace, '..', '.mos-inbox-worktrees');
}

export function configuredWorkspace(): string {
  // Anchored from scripts/workers/classifier/ back to repo root.
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

let operationalWorkspace: string | null = null;
export function configuredOperationalWorkspace(): string {
  if (!operationalWorkspace) {
    const common = execFileSync('/usr/bin/git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: configuredWorkspace(),
      encoding: 'utf8',
      timeout: 5_000,
    }).trim();
    if (!common.endsWith('/.git')) throw new Error('TRUSTED_WORKSPACE_INVALID');
    operationalWorkspace = dirname(common);
  }
  return operationalWorkspace;
}

export function isCodexImplementationHelpCompatible(help: string): boolean {
  return ['--ephemeral', '--approve-for-me', '--output-schema', '--output-last-message'].every((flag) =>
    help.includes(flag)
  );
}

let lastImplementationPreflightAt = 0;
export async function ensureCodexImplementationPreflight(): Promise<void> {
  if (Date.now() - lastImplementationPreflightAt < IMPLEMENTATION_PREFLIGHT_CACHE_MS) return;
  try {
    const { stdout } = await execFileAsync(resolveCodexCliPath(), ['exec', '--help'], {
      encoding: 'utf8',
      timeout: 15_000,
      maxBuffer: 64 * 1024,
      windowsHide: true,
    });
    if (!isCodexImplementationHelpCompatible(String(stdout || ''))) throw new Error('CLI flags unavailable');
    lastImplementationPreflightAt = Date.now();
  } catch {
    throw new CodexCliError('CODEX_PREFLIGHT_FAILED');
  }
}

export function implementationRunRegistryPath(jobId: string): string {
  return join(implementationWorktreeRoot(configuredOperationalWorkspace()), `.mos-inbox-run-${jobId}.json`);
}

export async function registeredCodexProcessAlive(processId: number): Promise<boolean> {
  if (!Number.isSafeInteger(processId) || processId <= 0) return false;
  try {
    const { stdout } = await execFileAsync('/bin/ps', ['-o', 'comm=', '-p', String(processId)], {
      encoding: 'utf8',
      timeout: 5_000,
      maxBuffer: 1_024,
    });
    return /codex/i.test(String(stdout || ''));
  } catch {
    return false;
  }
}

export async function registerImplementationProcess(jobId: string, processId: number): Promise<void> {
  const root = implementationWorktreeRoot(configuredOperationalWorkspace());
  await mkdir(root, { recursive: true, mode: 0o700 });
  await writeFile(
    implementationRunRegistryPath(jobId),
    JSON.stringify({ jobId, processId, startedAt: new Date().toISOString() }),
    { mode: 0o600 }
  );
}

export async function clearImplementationProcessRegistration(jobId: string, processId: number | null): Promise<void> {
  if (processId && (await registeredCodexProcessAlive(processId))) return;
  await rm(implementationRunRegistryPath(jobId), { force: true }).catch(() => undefined);
}

/** Never reclaim an expired lease while its recorded Codex process might still be working. */
export async function containOrphanedImplementationProcesses(): Promise<boolean> {
  const root = implementationWorktreeRoot(configuredOperationalWorkspace());
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return true;
  }
  for (const entry of entries.filter((name) => /^\.mos-inbox-run-[a-f0-9-]{36}\.json$/i.test(name))) {
    const path = join(root, entry);
    try {
      const value = JSON.parse(await readFile(path, 'utf8')) as { processId?: unknown };
      const processId = Number(value.processId);
      if (!(await registeredCodexProcessAlive(processId))) {
        await rm(path, { force: true });
        continue;
      }
      try {
        process.kill(-processId, 'SIGTERM');
      } catch {
        return false;
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 500));
      if (await registeredCodexProcessAlive(processId)) {
        try {
          process.kill(-processId, 'SIGKILL');
        } catch {
          return false;
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 500));
      }
      if (await registeredCodexProcessAlive(processId)) return false;
      await rm(path, { force: true });
    } catch {
      await rm(path, { force: true }).catch(() => undefined);
    }
  }
  return true;
}

export function inboxFollowUpFailureCode(
  error: unknown
): CodexCliFailureCode | 'INVALID_STRUCTURED_OUTPUT' | 'BRIDGE_REQUEST_FAILED' | 'UNEXPECTED_FAILURE' {
  if (error instanceof CodexCliError) return error.code;
  if (
    error instanceof SyntaxError ||
    (error instanceof Error && error.message === 'Codex did not return a valid inbox follow-up JSON object.')
  ) {
    return 'INVALID_STRUCTURED_OUTPUT';
  }
  if (error instanceof Error && error.message.startsWith('Worker bridge ')) return 'BRIDGE_REQUEST_FAILED';
  return 'UNEXPECTED_FAILURE';
}

export function formatInboxFollowUpFailure(phase: string, error: unknown): string {
  return `Inbox follow-up class=inbox_follow_up phase=${phase} code=${inboxFollowUpFailureCode(error)}`;
}

export function inboxPlanFailureCode(
  error: unknown
): CodexCliFailureCode | 'INVALID_STRUCTURED_OUTPUT' | 'BRIDGE_REQUEST_FAILED' | 'UNEXPECTED_FAILURE' {
  if (error instanceof CodexCliError) return error.code;
  if (
    error instanceof SyntaxError ||
    (error instanceof Error && error.message === 'Codex did not return a valid inbox plan JSON object.')
  ) {
    return 'INVALID_STRUCTURED_OUTPUT';
  }
  if (error instanceof Error && error.message.startsWith('Worker bridge ')) return 'BRIDGE_REQUEST_FAILED';
  return 'UNEXPECTED_FAILURE';
}

export function formatInboxPlanFailure(phase: string, error: unknown): string {
  return `Inbox plan class=inbox_plan phase=${phase} code=${inboxPlanFailureCode(error)}`;
}

export function inboxImplementationFailureCode(
  error: unknown
):
  | CodexCliFailureCode
  | 'WORKTREE_SETUP_FAILED'
  | 'INVALID_STRUCTURED_OUTPUT'
  | 'BRIDGE_REQUEST_FAILED'
  | 'UNEXPECTED_FAILURE' {
  if (error instanceof CodexCliError) return error.code;
  if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Invalid implementation JSON.')) {
    return 'INVALID_STRUCTURED_OUTPUT';
  }
  if (error instanceof Error && error.message.startsWith('Worker bridge ')) return 'BRIDGE_REQUEST_FAILED';
  if (error instanceof Error && /WORKTREE|TRUSTED_WORKSPACE/.test(error.message)) return 'WORKTREE_SETUP_FAILED';
  return 'UNEXPECTED_FAILURE';
}

export function formatInboxImplementationFailure(phase: string, error: unknown): string {
  return `Inbox implementation class=inbox_implementation phase=${phase} code=${inboxImplementationFailureCode(error)}`;
}

export { spawn };
