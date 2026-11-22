import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, lstat, mkdir, realpath, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { InboxIdeReleaseCheckpointMetadata, InboxImplementationWorkerJob } from '@mos-lab/shared';
import {
  CodexCliError,
  DEFAULT_API_URL,
  DEFAULT_WEB_RELEASE_URL,
  PNPM_EXECUTABLE,
  WORKER_FETCH_TIMEOUT_MS,
  configuredOperationalWorkspace,
  configuredWorkspace,
  execFileAsync,
  implementationWorktreeRoot,
  isExecutablePath,
} from './codex-cli.js';
import { loadLocalWorkerEnv } from './worker-transport.js';

function implementationDeploymentWorktreeRoot(workspace: string): string {
  return resolve(workspace, '..', '.mos-inbox-deployments');
}

export async function runTrustedGit(args: string[], cwd: string, maxBuffer = 64 * 1024): Promise<string> {
  const { stdout } = await execFileAsync('/usr/bin/git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer,
  });
  return String(stdout || '').trim();
}

export async function createOrReuseImplementationWorktree(job: InboxImplementationWorkerJob): Promise<string> {
  const workspace = await realpath(configuredWorkspace());
  const gitRoot = await realpath(await runTrustedGit(['rev-parse', '--show-toplevel'], workspace));
  if (gitRoot !== workspace) throw new Error('TRUSTED_WORKSPACE_INVALID');
  const root = implementationWorktreeRoot(configuredOperationalWorkspace());
  const worktreePath = join(root, job.id);
  await mkdir(root, { recursive: true, mode: 0o700 });
  try {
    await stat(worktreePath);
    const existingRoot = await realpath(await runTrustedGit(['rev-parse', '--show-toplevel'], worktreePath));
    const existingBranch = await runTrustedGit(['branch', '--show-current'], worktreePath);
    if (existingRoot !== (await realpath(worktreePath)) || existingBranch !== job.branchName) {
      throw new Error('WORKTREE_IDENTITY_MISMATCH');
    }
    await installWorktreeDependencies(worktreePath);
    return worktreePath;
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT')) {
      if (error instanceof Error && ['WORKTREE_IDENTITY_MISMATCH', 'TRUSTED_WORKSPACE_INVALID'].includes(error.message))
        throw error;
      if (existsSync(worktreePath)) throw new Error('WORKTREE_REUSE_FAILED');
    }
  }
  await runTrustedGit(['worktree', 'add', '-b', job.branchName, worktreePath, 'HEAD'], workspace);
  await installWorktreeDependencies(worktreePath);
  return worktreePath;
}

export async function createOrReuseDeploymentWorktree(job: InboxImplementationWorkerJob): Promise<string> {
  const workspace = await realpath(configuredWorkspace());
  const gitRoot = await realpath(await runTrustedGit(['rev-parse', '--show-toplevel'], workspace));
  if (gitRoot !== workspace) throw new Error('TRUSTED_WORKSPACE_INVALID');
  const root = implementationDeploymentWorktreeRoot(configuredOperationalWorkspace());
  const attempt = String(job.attemptCount);
  const worktreePath = join(root, `${job.id}-${attempt}`);
  const branchName = `codex/inbox-deploy-${job.id.slice(0, 8)}-${attempt}`;
  await mkdir(root, { recursive: true, mode: 0o700 });
  try {
    await stat(worktreePath);
    const existingRoot = await realpath(await runTrustedGit(['rev-parse', '--show-toplevel'], worktreePath));
    const existingBranch = await runTrustedGit(['branch', '--show-current'], worktreePath);
    if (existingRoot !== (await realpath(worktreePath)) || existingBranch !== branchName) {
      throw new Error('WORKTREE_IDENTITY_MISMATCH');
    }
    return worktreePath;
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT')) {
      if (error instanceof Error && ['WORKTREE_IDENTITY_MISMATCH', 'TRUSTED_WORKSPACE_INVALID'].includes(error.message))
        throw error;
      if (existsSync(worktreePath)) throw new Error('WORKTREE_REUSE_FAILED');
    }
  }
  await runTrustedGit(['fetch', 'origin', 'main'], workspace);
  await runTrustedGit(['worktree', 'add', '-b', branchName, worktreePath, 'origin/main'], workspace);
  return worktreePath;
}

export async function runTrustedProductionDeploy(worktreePath: string): Promise<void> {
  try {
    await execFileAsync(
      '/usr/bin/ssh',
      ['-o', 'BatchMode=yes', 'live-wings', 'bash /home/web/mos-lab/scripts/deploy-production.sh'],
      {
        cwd: worktreePath,
        encoding: 'utf8',
        timeout: 12 * 60 * 1000,
        maxBuffer: 64 * 1024,
      }
    );
  } catch {
    throw new CodexCliError('DEPLOY_PIPELINE_FAILED');
  }
}

/**
 * Materialize dependencies inside the isolated worktree. A node_modules symlink
 * back to the primary checkout would let a workspace-write CLI process escape its
 * source boundary, so it is deliberately rejected.
 */
async function installWorktreeDependencies(worktreePath: string): Promise<void> {
  const worktreeModules = join(worktreePath, 'node_modules');
  try {
    const existing = await lstat(worktreeModules);
    if (existing.isSymbolicLink() || !existing.isDirectory()) {
      throw new Error('WORKTREE_DEPENDENCIES_MISMATCH');
    }
    return;
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT'))
      throw error;
  }
  if (!isExecutablePath(PNPM_EXECUTABLE)) throw new Error('WORKTREE_DEPENDENCIES_MISSING');
  await execFileAsync(PNPM_EXECUTABLE, ['install', '--offline', '--frozen-lockfile', '--ignore-scripts'], {
    cwd: worktreePath,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 64 * 1024,
  });
}

export async function implementationGitEnvironment(worktreePath: string, jobId: string): Promise<NodeJS.ProcessEnv> {
  const hookRoot = join(worktreePath, '.mos-inbox-git-hooks');
  await mkdir(hookRoot, { recursive: true, mode: 0o700 });
  const hook = '#!/bin/sh\necho "mOS Inbox implementation jobs cannot commit or push" >&2\nexit 1\n';
  await Promise.all([
    writeFile(join(hookRoot, 'pre-commit'), hook, { mode: 0o700 }),
    writeFile(join(hookRoot, 'pre-push'), hook, { mode: 0o700 }),
  ]);
  await Promise.all([chmod(join(hookRoot, 'pre-commit'), 0o700), chmod(join(hookRoot, 'pre-push'), 0o700)]);
  const existingCount = Number(process.env.GIT_CONFIG_COUNT || '0');
  const configIndex = Number.isInteger(existingCount) && existingCount >= 0 ? existingCount : 0;
  return {
    ...process.env,
    NEXT_DIST_DIR: `.next-inbox-${jobId.replace(/[^a-z0-9]/gi, '').slice(0, 16)}`,
    MOS_NEXT_BUILD_COMPILER: 'webpack',
    GIT_CONFIG_COUNT: String(configIndex + 1),
    [`GIT_CONFIG_KEY_${configIndex}`]: 'core.hooksPath',
    [`GIT_CONFIG_VALUE_${configIndex}`]: hookRoot,
  };
}

export async function implementationDiffArtifacts(
  worktreePath: string
): Promise<{ changedFiles: string[]; diffStat: string; baseCommit: string; patchHash: string }> {
  const changedFiles = (await runTrustedGit(['diff', '--name-only', 'HEAD'], worktreePath))
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter((file) => file && !file.startsWith('/') && !file.includes('..'))
    .slice(0, 100);
  const diffStat = (await runTrustedGit(['diff', '--stat', 'HEAD'], worktreePath)).slice(0, 4_000);
  const baseCommit = (await runTrustedGit(['rev-parse', 'HEAD'], worktreePath)).trim();
  const patch = await runTrustedGit(
    ['-c', 'core.quotePath=false', 'diff', '--binary', '--no-ext-diff', '--no-renames', 'HEAD'],
    worktreePath,
    10 * 1024 * 1024
  );
  return { changedFiles, diffStat, baseCommit, patchHash: createHash('sha256').update(patch.trim()).digest('hex') };
}

export function sameReviewedFiles(actual: string[], reviewed: string[]): boolean {
  const normalize = (files: string[]) => [...new Set(files.map((file) => file.trim()).filter(Boolean))].sort();
  const left = normalize(actual);
  const right = normalize(reviewed);
  return left.length === right.length && left.every((file, index) => file === right[index]);
}

export function ideReleasePublisherConfiguration(): { apiUrl: string; token: string; webReleaseUrl: string } {
  loadLocalWorkerEnv();
  const token = String(process.env.MOS_IDE_RELEASE_CHECKPOINT_TOKEN || '').trim();
  if (token.length < 32) throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'IDE release publisher is not configured.');
  return {
    apiUrl: String(process.env.MOS_REQUEST_CLASSIFIER_API_URL || DEFAULT_API_URL).replace(/\/+$/, ''),
    token,
    webReleaseUrl: String(process.env.MOS_IDE_RELEASE_WEB_RELEASE_URL || DEFAULT_WEB_RELEASE_URL).trim(),
  };
}

type ReleaseMarker = { commitSha: string };
type ReleasePublisherDependencies = {
  fetcher?: typeof fetch;
  verifyAncestor?: (ancestor: string, descendant: string) => Promise<boolean>;
  wait?: (milliseconds: number) => Promise<void>;
};

function releaseMarker(value: unknown): ReleaseMarker {
  const commitSha = String((value as { commitSha?: unknown } | null)?.commitSha || '')
    .trim()
    .toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(commitSha))
    throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'Production release marker is invalid.');
  return { commitSha };
}

/**
 * Publishes only a fixed, independently verified receipt. Retrying is limited
 * to the identical idempotent receipt after a transport/5xx failure; no 4xx
 * rejection is retried and no state is inferred from a failed request.
 */
export async function publishVerifiedIdeReleaseCheckpoint(
  input: {
    ticketId: number;
    jobId: string;
    manifestDigest: string;
    commitSha: string;
    releaseConfirmed: boolean;
    apiUrl: string;
    token: string;
    webReleaseUrl: string;
    requiresWebRelease: boolean;
  },
  dependencies: ReleasePublisherDependencies = {}
): Promise<InboxIdeReleaseCheckpointMetadata> {
  if (!input.releaseConfirmed)
    throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'Production release has not been confirmed.');
  if (!Number.isSafeInteger(input.ticketId) || input.ticketId <= 0 || !/^[a-f0-9-]{8,}$/i.test(input.jobId))
    throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'Release receipt identity is invalid.');
  if (
    !/^[a-f0-9]{64}$/i.test(input.manifestDigest) ||
    !/^[a-f0-9]{40}$/i.test(input.commitSha) ||
    input.token.length < 32
  )
    throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'Release receipt evidence is incomplete.');
  const fetcher = dependencies.fetcher ?? fetch;
  const verifyAncestor = dependencies.verifyAncestor;
  if (!verifyAncestor) throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'Release ancestry verifier is unavailable.');
  const readMarker = async (url: string): Promise<ReleaseMarker> => {
    const response = await fetcher(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(WORKER_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'Production release marker is unavailable.');
    return releaseMarker(await response.json());
  };
  const apiRelease = await readMarker(`${input.apiUrl}/release`);
  if (!(await verifyAncestor(input.commitSha.toLowerCase(), apiRelease.commitSha)))
    throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'Production API marker does not contain the approved commit.');
  const webRelease = input.requiresWebRelease ? await readMarker(input.webReleaseUrl) : null;
  if (webRelease && !(await verifyAncestor(input.commitSha.toLowerCase(), webRelease.commitSha)))
    throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'Production web marker does not contain the approved commit.');
  const metadata: InboxIdeReleaseCheckpointMetadata = {
    jobId: input.jobId,
    manifestDigest: input.manifestDigest.toLowerCase(),
    commitSha: input.commitSha.toLowerCase(),
    apiRelease: apiRelease.commitSha,
    webRelease: webRelease?.commitSha ?? null,
  };
  const body = JSON.stringify(metadata);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetcher(`${input.apiUrl}/ide-release-checkpoints/${input.ticketId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(WORKER_FETCH_TIMEOUT_MS),
      });
      if (response.ok) return metadata;
      if (![502, 503, 504].includes(response.status))
        throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'Release checkpoint was rejected.');
    } catch (error) {
      if (error instanceof CodexCliError) throw error;
    }
    if (attempt === 0)
      await (
        dependencies.wait ?? ((milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)))
      )(1_000);
  }
  throw new CodexCliError('DEPLOY_PIPELINE_FAILED', 'Release checkpoint endpoint is unavailable.');
}
