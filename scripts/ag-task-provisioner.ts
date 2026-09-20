import { randomUUID } from 'node:crypto';
import { spawn, execFile as execFileCallback } from 'node:child_process';
import {
  accessSync,
  chmodSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { InboxIdeTaskProvisioningRequest } from '@mos-lab/shared';

const execFile = promisify(execFileCallback);
const REQUEST_TIMEOUT_MS = 20_000;
const AGENTAPI_TIMEOUT_MS = 90_000;

export type ProvisioningLedger = Record<string, { taskId: string; worktreePath: string }>;

export type ProvisionerDeps = {
  createTask: (request: InboxIdeTaskProvisioningRequest, worktreePath: string) => Promise<string>;
  prepareWorktree: (request: InboxIdeTaskProvisioningRequest) => Promise<string>;
  notifyVoice?: (message: string) => Promise<void>;
  fetch: typeof fetch;
  ledgerPath: string;
  token: string;
  apiUrl: string;
  provisionerId: string;
};

export type AgTaskProvisionerRuntimeConfig = {
  apiUrl: string;
  provisionerId: string;
  repository: string;
  worktreeRoot: string;
};

function clean(value: unknown, limit: number): string {
  return String(value || '')
    .trim()
    .slice(0, limit);
}

export function resolveAgentApiCommand(env: NodeJS.ProcessEnv = process.env): string {
  const configured = clean(env.MOS_AG_AGENTAPI_COMMAND, 500);
  const candidates = [
    configured,
    resolve(homedir(), '.gemini/antigravity/bin/agentapi'),
    '/Applications/Antigravity.app/Contents/Resources/bin/language_server',
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue to next candidate
    }
  }
  return 'agentapi';
}

export function runtimePath(): string {
  return resolve(homedir(), '.gemini/antigravity/runtime/mos-ag-task-provisioner-state.json');
}

export function tokenPath(): string {
  const custom = resolve(homedir(), '.gemini/antigravity/secrets/mos-ag-task-bridge.env');
  if (existsSync(custom)) return custom;
  return resolve(homedir(), '.codex/secrets/mos-ide-task-bridge.env');
}

export function runtimeConfigPath(): string {
  const custom = resolve(homedir(), '.gemini/antigravity/secrets/mos-ag-task-provisioner.env');
  if (existsSync(custom)) return custom;
  return resolve(homedir(), '.codex/secrets/mos-ide-task-provisioner.env');
}

export function readToken(): string {
  const secretFile = tokenPath();
  if (!existsSync(secretFile)) throw new Error('Task bridge token file does not exist.');
  const content = readFileSync(secretFile, 'utf8');
  const token =
    content.match(/^MOS_AG_TASK_BRIDGE_TOKEN=(.+)$/m)?.[1]?.trim() ||
    content.match(/^MOS_IDE_TASK_BRIDGE_TOKEN=(.+)$/m)?.[1]?.trim() ||
    '';
  if (token.length < 32) throw new Error('Antigravity task bridge token is unavailable or invalid.');
  return token;
}

function readRequiredConfigValue(values: Map<string, string>, primaryKey: string, fallbackKey?: string): string {
  const primary = clean(values.get(primaryKey), 500);
  if (primary) return primary;
  if (fallbackKey) {
    const fallback = clean(values.get(fallbackKey), 500);
    if (fallback) return fallback;
  }
  throw new Error(`Provisioner managed runtime config is missing ${primaryKey}.`);
}

export function readManagedRuntimeConfig(path = runtimeConfigPath()): AgTaskProvisionerRuntimeConfig {
  if (!existsSync(path)) throw new Error(`Provisioner managed runtime config does not exist at ${path}.`);
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink())
    throw new Error('Provisioner managed runtime config must be a regular file.');
  if ((stats.mode & 0o077) !== 0)
    throw new Error('Provisioner managed runtime config must not be group/world-readable.');
  const values = new Map<string, string>();
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values.set(match[1], match[2].trim());
  }
  const repository = readRequiredConfigValue(values, 'MOS_AG_PROVISIONER_REPOSITORY', 'MOS_IDE_PROVISIONER_REPOSITORY');
  const worktreeRoot = readRequiredConfigValue(
    values,
    'MOS_AG_PROVISIONER_WORKTREE_ROOT',
    'MOS_IDE_PROVISIONER_WORKTREE_ROOT'
  );
  const apiUrl = readRequiredConfigValue(values, 'MOS_AG_PROVISIONER_API_URL', 'MOS_IDE_PROVISIONER_API_URL').replace(
    /\/$/,
    ''
  );
  const provisionerId = clean(
    values.get('MOS_AG_PROVISIONER_ID') || values.get('MOS_IDE_PROVISIONER_ID') || 'danny-antigravity-desktop',
    100
  );
  if (!repository.startsWith('/') || !worktreeRoot.startsWith('/') || !/^https?:\/\//.test(apiUrl) || !provisionerId)
    throw new Error('Provisioner managed runtime config is invalid.');
  return { apiUrl, provisionerId, repository, worktreeRoot };
}

export function readProvisioningLedger(path: string): ProvisioningLedger {
  if (!existsSync(path)) return {};
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Antigravity provisioner ledger is invalid.');
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
    'X-Execution-Engine': 'AG',
    ...(provisionerId ? { 'X-AG-Provisioner-ID': provisionerId, 'X-IDE-Provisioner-ID': provisionerId } : {}),
  };
}

async function bridgeJson(fetcher: typeof fetch, url: string, init: RequestInit) {
  const response = await fetcher(url, init);
  if (!response.ok) throw new Error(`Antigravity task bridge rejected request (${response.status}).`);
  return (await response.json()) as { data?: unknown };
}

export async function prepareAgWorktree(request: InboxIdeTaskProvisioningRequest): Promise<string> {
  const config = readManagedRuntimeConfig();
  const repository = resolve(config.repository);
  const root = resolve(config.worktreeRoot);
  if (!existsSync(repository)) throw new Error('Repository is unavailable for worktree creation.');
  if (!/^[A-Za-z0-9._/-]{1,160}$/.test(request.branchName) || request.branchName.includes('..'))
    throw new Error('Provisioning branch name is invalid.');
  const worktreePath = resolve(root, `ag-${request.jobId}`);
  if (!worktreePath.startsWith(`${root}/`)) throw new Error('Provisioning worktree path escaped its root.');
  if (existsSync(worktreePath)) {
    return worktreePath;
  }
  mkdirSync(root, { recursive: true, mode: 0o700 });
  await execFile('git', ['-C', repository, 'fetch', 'origin', 'main'], { timeout: REQUEST_TIMEOUT_MS });
  await execFile('git', ['-C', repository, 'worktree', 'add', '-b', request.branchName, worktreePath, 'origin/main'], {
    timeout: REQUEST_TIMEOUT_MS,
  });
  return worktreePath;
}

export function buildAgentPrompt(request: InboxIdeTaskProvisioningRequest, worktreePath: string): string {
  return `# 🎯 Nhiệm vụ mOS Inbox: [${request.ticketKey}] ${request.title}

- **Ticket ID**: ${request.reportId} (${request.ticketKey})
- **Worktree**: ${worktreePath}
- **Branch**: ${request.branchName}
- **Job ID**: ${request.jobId}
- **Request ID**: ${request.requestId}
- **Source Version**: ${request.sourceVersion}
- **Plan Version**: ${request.planVersion}

## 📌 Quy trình Thực thi Chuẩn mOS Inbox Flow (Kinh Thánh mOS Điều răn UI-007):
1. **Chuyển thư mục công việc**: Làm việc trực tiếp bên trong worktree riêng biệt này:
   \`cd ${worktreePath}\`
2. **Tiếp nhận Handoff ngay khi bắt đầu (Gate 1 Handshake)**:
   \`npx tsx scripts/ide-task-bridge.ts receive --out /tmp/handoff-${request.reportId}.json\`
3. **Triển khai code và test**: Viết code và bổ sung các bài kiểm thử tương ứng theo đúng phương án đã duyệt.
4. **Chạy kiểm chứng toàn diện**: Chạy \`pnpm verify:quick\`, \`pnpm check:ui-contract\` để đảm bảo không phát sinh regression.
5. **Nộp Code/Test Receipt để kích hoạt Cổng 2 (Gate 2 Activation)**:
   - Thu thập \`changedFiles\`, \`diffStat\`, \`baseCommit\`, \`patchHash\` từ worktree.
   - Chuẩn bị tệp biên nhận \`/tmp/receipt-${request.reportId}.json\` gồm \`handoff\` (lấy từ tệp handoff ở bước 2), \`result\` (summary, tests - lưu ý cần có test Playwright visual QA PASSED nếu sửa \`apps/web/\`, risksAndRollback), \`changedFiles\`, \`diffStat\`, \`baseCommit\`, \`patchHash\`.
   - Nộp biên nhận: \`npx tsx scripts/ide-task-bridge.ts submit --receipt /tmp/receipt-${request.reportId}.json\`
   - Sau lệnh này, trạng thái ticket trên mOS Inbox tự động chuyển sang **\`AWAITING_DANNY_COMMIT_REVIEW\`** ("Chờ Danny duyệt commit") và hiển thị nút "Duyệt commit" trên web.
6. **Lắng nghe Duyệt Web & Tự Động Toàn Bộ (Single-Approval Web Workflow)**:
   - Danny CHỈ DUYỆT TRÊN WEB (Duyệt commit & Duyệt deploy), tuyệt đối không yêu cầu Danny duyệt thêm trong chat.
   - Ngay sau khi nộp receipt, chạy lệnh lắng nghe nền kèm cờ \`--auto-deploy\`:
     \`npx tsx scripts/ide-task-bridge.ts wait-and-commit --worktree ${worktreePath} --message "feat(${request.ticketKey.toLowerCase()}): ${request.title.replace(/"/g, '')}" --auto-deploy\`
   - Báo cáo trên chat và phát giọng nói qua \`/Users/dannydo/.gemini/antigravity/bin/speak\`.
   - Ngay khi Danny bấm "Duyệt commit" trên web, lệnh tự động commit và nộp commit receipt.
   - Ngay khi Danny bấm "Duyệt deploy" trên web, lệnh tự động merge vào main, push lên origin, deploy lên VPS, kiểm chứng release markers và nộp checkpoint đóng ticket hoàn tất! Danny không cần mở AG can thiệp bất kỳ thao tác nào.
`;
}

export async function spawnAntigravitySession(
  request: InboxIdeTaskProvisioningRequest,
  worktreePath: string
): Promise<string> {
  const command = resolveAgentApiCommand();
  const prompt = buildAgentPrompt(request, worktreePath);
  const title = `[${request.ticketKey}] ${request.title.slice(0, 80)}`;

  const args = command.endsWith('language_server')
    ? ['agentapi', 'new-conversation', `--title=${title}`, prompt]
    : ['new-conversation', `--title=${title}`, prompt];

  const { stdout } = await execFile(command, args, { timeout: AGENTAPI_TIMEOUT_MS });
  try {
    const parsed = JSON.parse(stdout) as {
      response?: {
        newConversation?: {
          conversationId?: string;
        };
      };
    };
    const conversationId = parsed?.response?.newConversation?.conversationId;
    if (!conversationId) {
      throw new Error(`agentapi did not return conversationId. Raw stdout: ${stdout.slice(0, 200)}`);
    }
    return conversationId;
  } catch (err) {
    throw new Error(`Failed to parse agentapi output: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function notifyVoice(message: string): Promise<void> {
  const speakBin = resolve(homedir(), '.gemini/antigravity/bin/speak');
  if (existsSync(speakBin)) {
    try {
      await execFile(speakBin, [message], { timeout: 10_000 });
    } catch {
      // Voice feedback failure should never abort provisioning
    }
  }
}

export async function runProvisionerOnce(deps: ProvisionerDeps): Promise<'IDLE' | 'BOUND'> {
  const next = await bridgeJson(deps.fetch, `${deps.apiUrl}/ag-task-bridge/provisioning/next`, {
    headers: bridgeHeaders(deps.token, deps.provisionerId),
  });
  const request = next.data as InboxIdeTaskProvisioningRequest | null;
  if (!request) return 'IDLE';
  if (!/^[a-f0-9-]{36}$/i.test(request.jobId) || !/^[a-f0-9-]{36}$/i.test(request.requestId))
    throw new Error('Antigravity task bridge returned an invalid provisioning request.');

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
        headers: { ...bridgeHeaders(deps.token, deps.provisionerId), 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.requestId, taskId: existing.taskId }),
      }
    );

    delete ledger[request.requestId];
    writeProvisioningLedger(deps.ledgerPath, ledger);

    if (deps.notifyVoice) {
      await deps.notifyVoice(
        `Antigravity đã nhận ticket ${request.ticketKey} và mở session mới để code và test cho anh.`
      );
    }

    return 'BOUND';
  } catch (error) {
    if (!existing) {
      try {
        await bridgeJson(
          deps.fetch,
          `${deps.apiUrl}/ide-task-bridge/provisioning/${encodeURIComponent(request.jobId)}/defer`,
          {
            method: 'POST',
            headers: { ...bridgeHeaders(deps.token, deps.provisionerId), 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: request.requestId, failureCode: 'AGENTAPI_UNAVAILABLE' }),
          }
        );
      } catch {
        // Defer attempt is best-effort
      }
    }
    throw error;
  }
}

export async function main() {
  const isDaemon = process.argv.includes('--daemon');
  const token = readToken();
  const config = readManagedRuntimeConfig();
  const ledger = runtimePath();

  const run = async () => {
    try {
      const result = await runProvisionerOnce({
        createTask: spawnAntigravitySession,
        prepareWorktree: prepareAgWorktree,
        notifyVoice,
        fetch,
        ledgerPath: ledger,
        token,
        apiUrl: config.apiUrl,
        provisionerId: config.provisionerId,
      });
      if (result === 'BOUND') {
        process.stdout.write(`[${new Date().toISOString()}] Antigravity task provisioned successfully.\n`);
      }
    } catch (err) {
      process.stderr.write(
        `[${new Date().toISOString()}] Provisioner error: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
  };

  if (!isDaemon) {
    await run();
    return;
  }

  process.stdout.write(
    `[${new Date().toISOString()}] Antigravity inbox provisioner daemon started. Polling every 15s...\n`
  );
  await run();
  setInterval(() => void run(), 15_000);
}

if (process.argv[1] && basename(process.argv[1]) === 'ag-task-provisioner.ts') {
  void main();
}
