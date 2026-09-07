import { randomUUID } from 'node:crypto';
import { spawn, execFile as execFileCallback } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { InboxIdeTaskProvisioningRequest } from '@mos-lab/shared';

const execFile = promisify(execFileCallback);
const REQUEST_TIMEOUT_MS = 20_000;
const TURN_COMPLETION_TIMEOUT_MS = 45_000;

type ProvisioningLedger = Record<string, { taskId: string; worktreePath: string }>;
type ProvisionerDeps = {
  createTask: (request: InboxIdeTaskProvisioningRequest, cwd: string) => Promise<string>;
  prepareWorktree: (request: InboxIdeTaskProvisioningRequest) => Promise<string>;
  fetch: typeof fetch;
  ledgerPath: string;
  token: string;
  apiUrl: string;
  provisionerId: string;
};

function clean(value: unknown, limit: number) {
  return String(value || '')
    .trim()
    .slice(0, limit);
}

function runtimePath() {
  return resolve(homedir(), '.codex/runtime/mos-ide-task-provisioner-state.json');
}

function readToken() {
  const secretFile = resolve(homedir(), '.codex/secrets/mos-ide-task-bridge.env');
  const token =
    readFileSync(secretFile, 'utf8')
      .match(/^MOS_IDE_TASK_BRIDGE_TOKEN=(.+)$/m)?.[1]
      ?.trim() || '';
  if (token.length < 32) throw new Error('IDE task bridge token is unavailable.');
  return token;
}

export function readProvisioningLedger(path: string): ProvisioningLedger {
  if (!existsSync(path)) return {};
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('IDE provisioner ledger is invalid.');
  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([requestId, value]) =>
        /^[a-f0-9-]{36}$/i.test(requestId) &&
        value &&
        typeof value === 'object' &&
        typeof (value as { taskId?: unknown }).taskId === 'string' &&
        typeof (value as { worktreePath?: unknown }).worktreePath === 'string'
    )
  ) as ProvisioningLedger;
}

export function writeProvisioningLedger(path: string, ledger: ProvisioningLedger) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(ledger)}\n`, { mode: 0o600 });
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
  chmodSync(path, 0o600);
}

function bridgeHeaders(token: string, provisionerId?: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(provisionerId ? { 'X-IDE-Provisioner-ID': provisionerId } : {}),
  };
}

async function bridgeJson(fetcher: typeof fetch, url: string, init: RequestInit) {
  const response = await fetcher(url, init);
  if (!response.ok) throw new Error(`IDE task bridge rejected request (${response.status}).`);
  return (await response.json()) as { data?: unknown };
}

export async function createCodexTask(request: InboxIdeTaskProvisioningRequest, cwd: string): Promise<string> {
  const command = clean(process.env.MOS_CODEX_APP_SERVER_COMMAND, 500) || 'codex';
  const child = spawn(command, ['app-server', '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '';
  let stderr = '';
  const responses = new Map<number, (value: unknown) => void>();
  const completedTurns = new Set<string>();
  const turnWaiters = new Map<string, () => void>();
  const fail = (error: Error) => {
    for (const resolveResponse of responses.values()) resolveResponse({ error });
    responses.clear();
  };
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    for (;;) {
      const end = buffer.indexOf('\n');
      if (end < 0) break;
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (!line) continue;
      try {
        const message = JSON.parse(line) as { id?: number; result?: unknown; error?: unknown };
        if (typeof message.id === 'number') {
          const resolveResponse = responses.get(message.id);
          if (resolveResponse) {
            responses.delete(message.id);
            resolveResponse(message.error ? { error: new Error(JSON.stringify(message.error)) } : message.result);
          }
        }
        const completedTurnId =
          message && typeof message === 'object' && (message as { method?: unknown }).method === 'turn/completed'
            ? clean((message as { params?: { turn?: { id?: unknown } } }).params?.turn?.id, 160)
            : '';
        if (completedTurnId) {
          completedTurns.add(completedTurnId);
          turnWaiters.get(completedTurnId)?.();
          turnWaiters.delete(completedTurnId);
        }
      } catch {
        fail(new Error('Codex App Server returned malformed JSON-RPC.'));
      }
    }
  });
  child.stderr.on('data', (chunk: string) => {
    stderr = `${stderr}${chunk}`.slice(-1000);
  });
  child.on('error', (error) => fail(error));
  child.on('exit', (code) =>
    fail(new Error(`Codex App Server exited (${code ?? 'unknown'}): ${stderr || 'no detail'}`))
  );
  let id = 0;
  const requestRpc = (method: string, params: Record<string, unknown>) =>
    new Promise<unknown>((resolveResponse, reject) => {
      const requestId = ++id;
      const timeout = setTimeout(() => {
        responses.delete(requestId);
        reject(new Error(`Codex App Server ${method} timed out.`));
      }, REQUEST_TIMEOUT_MS);
      responses.set(requestId, (value) => {
        clearTimeout(timeout);
        if (value && typeof value === 'object' && 'error' in value) reject((value as { error: Error }).error);
        else resolveResponse(value);
      });
      child.stdin.write(`${JSON.stringify({ id: requestId, method, params })}\n`);
    });
  const waitForTurnCompletion = (turnId: string) =>
    new Promise<void>((resolveCompletion, reject) => {
      if (completedTurns.has(turnId)) return resolveCompletion();
      const timeout = setTimeout(() => {
        turnWaiters.delete(turnId);
        reject(new Error('Codex App Server task did not materialize before timeout.'));
      }, TURN_COMPLETION_TIMEOUT_MS);
      turnWaiters.set(turnId, () => {
        clearTimeout(timeout);
        resolveCompletion();
      });
    });
  try {
    await requestRpc('initialize', {
      clientInfo: { name: 'mos-ide-task-provisioner', version: '1.0.0' },
      capabilities: { optOutNotificationMethods: ['thread/started'] },
    });
    child.stdin.write(`${JSON.stringify({ method: 'initialized' })}\n`);
    const started = (await requestRpc('thread/start', {
      cwd,
      ephemeral: false,
      sandbox: 'workspace-write',
      approvalPolicy: 'on-request',
      developerInstructions: `This is the visible IDE task for ${request.ticketKey}. Do not begin code, commit, push, merge, deploy, migrate, or access ticket evidence until the trusted local bridge delivers an active handoff. Never place credentials or receipt nonces in the conversation.`,
      threadSource: 'mos-ide-provisioner',
    })) as { thread?: { id?: unknown } };
    const taskId = clean(started?.thread?.id, 160);
    if (!/^[A-Za-z0-9_-]{8,160}$/.test(taskId)) throw new Error('Codex App Server did not return a valid task id.');
    // A started turn is what materializes the task in the desktop task registry.
    // Its bounded placeholder text expressly prohibits work before the private
    // bridge handoff arrives.
    const startedTurn = (await requestRpc('turn/start', {
      threadId: taskId,
      input: [
        {
          type: 'text',
          text: 'This task is waiting for a trusted IDE handoff. Do not use tools, edit files, run tests, commit, push, merge, deploy, migrate, or inspect ticket data. Reply only: Handoff not delivered.',
        },
      ],
      turnTrigger: 'mos-ide-provisioner',
    })) as { turn?: { id?: unknown } };
    const turnId = clean(startedTurn?.turn?.id, 160);
    if (!turnId) throw new Error('Codex App Server did not return a task turn id.');
    await waitForTurnCompletion(turnId);
    return taskId;
  } finally {
    child.kill('SIGTERM');
  }
}

export async function prepareIdeWorktree(request: InboxIdeTaskProvisioningRequest): Promise<string> {
  const configuredRepository = clean(process.env.MOS_IDE_PROVISIONER_REPOSITORY, 500);
  const configuredRoot = clean(process.env.MOS_IDE_PROVISIONER_WORKTREE_ROOT, 500);
  if (!configuredRepository.startsWith('/') || !configuredRoot.startsWith('/'))
    throw new Error(
      'IDE provisioner requires absolute MOS_IDE_PROVISIONER_REPOSITORY and MOS_IDE_PROVISIONER_WORKTREE_ROOT.'
    );
  const repository = resolve(configuredRepository);
  const root = resolve(configuredRoot);
  if (!existsSync(repository)) throw new Error('IDE provisioner repository is unavailable.');
  if (!/^[A-Za-z0-9._/-]{1,160}$/.test(request.branchName) || request.branchName.includes('..'))
    throw new Error('IDE provisioning branch is invalid.');
  const worktreePath = resolve(root, `ide-${request.jobId}`);
  if (!worktreePath.startsWith(`${root}/`)) throw new Error('IDE provisioning worktree path escaped its root.');
  if (existsSync(worktreePath))
    throw new Error('IDE provisioning worktree already exists; refusing to reuse an unverified path.');
  mkdirSync(root, { recursive: true, mode: 0o700 });
  await execFile('git', ['-C', repository, 'worktree', 'add', '-b', request.branchName, worktreePath, 'HEAD'], {
    timeout: REQUEST_TIMEOUT_MS,
  });
  return worktreePath;
}

export async function runProvisionerOnce(deps: ProvisionerDeps): Promise<'IDLE' | 'BOUND'> {
  const next = await bridgeJson(deps.fetch, `${deps.apiUrl}/ide-task-bridge/provisioning/next`, {
    headers: bridgeHeaders(deps.token, deps.provisionerId),
  });
  const request = next.data as InboxIdeTaskProvisioningRequest | null;
  if (!request) return 'IDLE';
  if (!/^[a-f0-9-]{36}$/i.test(request.jobId) || !/^[a-f0-9-]{36}$/i.test(request.requestId))
    throw new Error('IDE task bridge returned an invalid provisioning request.');
  const ledger = readProvisioningLedger(deps.ledgerPath);
  let existing = ledger[request.requestId];
  try {
    if (!existing) {
      const worktreePath = await deps.prepareWorktree(request);
      const taskId = await deps.createTask(request, worktreePath);
      existing = { taskId, worktreePath };
      ledger[request.requestId] = existing;
      writeProvisioningLedger(deps.ledgerPath, ledger);
    }
    await bridgeJson(
      deps.fetch,
      `${deps.apiUrl}/ide-task-bridge/provisioning/${encodeURIComponent(request.jobId)}/complete`,
      {
        method: 'POST',
        headers: { ...bridgeHeaders(deps.token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.requestId, taskId: existing.taskId }),
      }
    );
    delete ledger[request.requestId];
    writeProvisioningLedger(deps.ledgerPath, ledger);
    return 'BOUND';
  } catch (error) {
    if (!existing) {
      await bridgeJson(
        deps.fetch,
        `${deps.apiUrl}/ide-task-bridge/provisioning/${encodeURIComponent(request.jobId)}/defer`,
        {
          method: 'POST',
          headers: { ...bridgeHeaders(deps.token), 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: request.requestId, failureCode: 'CODEX_APP_SERVER_UNAVAILABLE' }),
        }
      );
    }
    throw error;
  }
}

async function main() {
  const token = readToken();
  const apiUrl = clean(
    process.env.MOS_IDE_PROVISIONER_API_URL || process.env.MOS_API_URL || 'https://api.lab.masteros.app/api',
    500
  ).replace(/\/$/, '');
  const provisionerId = clean(process.env.MOS_IDE_PROVISIONER_ID || 'danny-codex-desktop', 100);
  const result = await runProvisionerOnce({
    createTask: createCodexTask,
    prepareWorktree: prepareIdeWorktree,
    fetch,
    ledgerPath: runtimePath(),
    token,
    apiUrl,
    provisionerId,
  });
  process.stdout.write(`IDE task provisioner: ${result}.\n`);
}

if (process.argv[1]?.endsWith('ide-task-provisioner.ts')) void main();
