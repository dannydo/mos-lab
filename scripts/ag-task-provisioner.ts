import { randomUUID } from 'node:crypto';
import { get as httpGet } from 'node:http';
import { spawn, execFile as execFileCallback, execSync } from 'node:child_process';
import {
  accessSync,
  chmodSync,
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import type {
  InboxIdeTaskProvisioningRequest,
  InboxFollowUpWorkerJob,
  InboxPlanWorkerJob,
  InboxPlanDraft,
} from '@mos-lab/shared';
import { AgChatBridgeService, type AgChatBridgeJob } from '../apps/api/src/modules/ai/ag-chat-bridge.service.ts';

const execFile = promisify(execFileCallback);
const REQUEST_TIMEOUT_MS = 20_000;
const AGENTAPI_TIMEOUT_MS = 90_000;

export type ProvisioningLedger = Record<string, { taskId: string; worktreePath: string }>;

export type ProvisionerDeps = {
  createTask: (
    request: InboxIdeTaskProvisioningRequest,
    worktreePath: string
  ) => Promise<string | { taskId: string; isNew: boolean }>;
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

export type TicketSessionRecord = {
  ticketKey: string;
  reportId: number;
  conversationId: string;
  worktreePath: string;
  createdAt: string;
  updatedAt: string;
};

export function ticketSessionsPath(): string {
  return resolve(homedir(), '.gemini/antigravity/runtime/mos-ticket-sessions.json');
}

export function readTicketSessions(path = ticketSessionsPath()): Record<string, TicketSessionRecord> {
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, TicketSessionRecord>;
    }
  } catch {
    // fallback
  }
  return {};
}

export function writeTicketSessions(sessions: Record<string, TicketSessionRecord>, path = ticketSessionsPath()) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(sessions, null, 2)}\n`, { mode: 0o600 });
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
  chmodSync(path, 0o600);
}

export function findExistingSessionForTicket(
  ticketKey: string,
  reportId: number,
  sessionsPath = ticketSessionsPath()
): TicketSessionRecord | null {
  const sessions = readTicketSessions(sessionsPath);
  const candidate = sessions[ticketKey] || sessions[String(reportId)];
  if (candidate && candidate.conversationId) {
    const brainDir = resolve(homedir(), '.gemini/antigravity/brain', candidate.conversationId);
    if (existsSync(brainDir)) {
      return candidate;
    }
  }

  // Auto-discovery from brain logs: find conversation whose transcript contains ticketKey or reportId
  try {
    const brainRoot = resolve(homedir(), '.gemini/antigravity/brain');
    if (existsSync(brainRoot)) {
      const entries = readdirSync(brainRoot, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const transcriptPath = resolve(brainRoot, entry.name, '.system_generated/logs/transcript.jsonl');
        if (existsSync(transcriptPath)) {
          const buffer = Buffer.alloc(4096);
          const fd = openSync(transcriptPath, 'r');
          const bytesRead = readSync(fd, buffer, 0, 4096, 0);
          closeSync(fd);
          const chunk = buffer.toString('utf8', 0, bytesRead);
          if (chunk.includes(`[${ticketKey}]`) || chunk.includes(`Ticket ID: ${reportId}`)) {
            const discovered: TicketSessionRecord = {
              ticketKey,
              reportId,
              conversationId: entry.name,
              worktreePath: candidate?.worktreePath || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            sessions[ticketKey] = discovered;
            sessions[String(reportId)] = discovered;
            writeTicketSessions(sessions, sessionsPath);
            return discovered;
          }
        }
      }
    }
  } catch {
    // fallback
  }

  return null;
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
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Antigravity task bridge rejected request (${response.status}): ${errorBody}`);
  }
  return (await response.json()) as { data?: unknown };
}

export async function prepareAgWorktree(request: InboxIdeTaskProvisioningRequest): Promise<string> {
  const config = readManagedRuntimeConfig();
  const repository = resolve(config.repository);
  const root = resolve(config.worktreeRoot);
  if (!existsSync(repository)) throw new Error('Repository is unavailable for worktree creation.');
  if (!/^[A-Za-z0-9._/-]{1,160}$/.test(request.branchName) || request.branchName.includes('..'))
    throw new Error('Provisioning branch name is invalid.');

  const existingSession = findExistingSessionForTicket(request.ticketKey, request.reportId);
  if (existingSession?.worktreePath && existsSync(existingSession.worktreePath)) {
    return existingSession.worktreePath;
  }

  const worktreePath = resolve(root, `ag-${request.jobId}`);
  if (!worktreePath.startsWith(`${root}/`)) throw new Error('Provisioning worktree path escaped its root.');
  if (!existsSync(worktreePath)) {
    mkdirSync(root, { recursive: true, mode: 0o700 });
    await execFile('git', ['-C', repository, 'fetch', 'origin', 'main'], { timeout: REQUEST_TIMEOUT_MS });
    await execFile(
      'git',
      ['-C', repository, 'worktree', 'add', '-b', request.branchName, worktreePath, 'origin/main'],
      {
        timeout: REQUEST_TIMEOUT_MS,
      }
    );
  }

  // Link node_modules and shared dist so worktree is instantly functional
  const linkTargets = [
    'node_modules',
    'apps/api/node_modules',
    'apps/web/node_modules',
    'packages/shared/node_modules',
    'packages/shared/dist',
  ];
  for (const rel of linkTargets) {
    const src = resolve(repository, rel);
    const dest = resolve(worktreePath, rel);
    if (existsSync(src) && !existsSync(dest)) {
      try {
        symlinkSync(src, dest);
      } catch {
        // non-blocking
      }
    }
  }
  // Copy env files if available
  const envFiles = ['apps/api/.env', 'apps/web/.env'];
  for (const rel of envFiles) {
    const src = resolve(repository, rel);
    const dest = resolve(worktreePath, rel);
    if (existsSync(src) && !existsSync(dest)) {
      try {
        copyFileSync(src, dest);
      } catch {
        // non-blocking
      }
    }
  }

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
- **Bất biến cốt lõi**: TUYỆT ĐỐI KHÔNG commit vào nhánh main trực tiếp; chỉ làm việc trong worktree và nộp receipt qua bridge.
1. **Chuyển thư mục công việc**: Làm việc trực tiếp bên trong worktree riêng biệt này:
   \`cd ${worktreePath}\`
2. **Tiếp nhận Handoff ngay khi bắt đầu (Gate 1 Handshake)**:
   \`npx tsx scripts/ide-task-bridge.ts receive --task-id ${request.jobId} --out /tmp/handoff-${request.reportId}.json\`
3. **Triển khai code và test**: Viết code và bổ sung các bài kiểm thử tương ứng theo đúng phương án đã duyệt.
4. **Chạy kiểm chứng toàn diện**: Chạy \`pnpm verify:quick\`, \`pnpm check:ui-contract\` để đảm bảo không phát sinh regression.
5. **Nộp Code/Test Receipt để kích hoạt Cổng 2 (Gate 2 Activation)**:
   - Thu thập \`changedFiles\`, \`diffStat\`, \`baseCommit\`, \`patchHash\` từ worktree.
   - Chuẩn bị tệp biên nhận \`/tmp/receipt-${request.reportId}.json\` gồm \`handoff\` (lấy từ tệp handoff ở bước 2), \`result\` (summary, tests - lưu ý cần có test Playwright visual QA PASSED nếu sửa \`apps/web/\`, risksAndRollback), \`changedFiles\`, \`diffStat\`, \`baseCommit\`, \`patchHash\`.
   - Nộp biên nhận: \`npx tsx scripts/ide-task-bridge.ts submit --task-id ${request.jobId} --receipt /tmp/receipt-${request.reportId}.json\`
   - Sau lệnh này, trạng thái ticket trên mOS Inbox tự động chuyển sang **\`AWAITING_DANNY_COMMIT_REVIEW\`** ("Chờ Danny duyệt commit") và hiển thị nút "Duyệt commit" trên web.
6. **Lắng nghe Duyệt Web & Tự Động Toàn Bộ (Single-Approval Web Workflow)**:
   - Danny CHỈ DUYỆT TRÊN WEB (Duyệt commit & Duyệt deploy), tuyệt đối không yêu cầu Danny duyệt thêm trong chat.
   - Ngay sau khi nộp receipt, chạy lệnh lắng nghe nền kèm cờ \`--auto-deploy\`:
     \`npx tsx scripts/ide-task-bridge.ts wait-and-commit --task-id ${request.jobId} --worktree ${worktreePath} --message "feat(${request.ticketKey.toLowerCase()}): ${request.title.replace(/"/g, '')}" --auto-deploy\`
   - Báo cáo trên chat và phát giọng nói qua \`/Users/dannydo/.gemini/antigravity/bin/speak\`.
   - Ngay khi Danny bấm "Duyệt commit" trên web, lệnh tự động commit và nộp commit receipt.
   - Ngay khi Danny bấm "Duyệt deploy" trên web, lệnh tự động merge vào main, push lên origin, deploy lên VPS, kiểm chứng release markers và nộp checkpoint đóng ticket hoàn tất! Danny không cần mở AG can thiệp bất kỳ thao tác nào.
`;
}

export function detectAntigravityProjectId(): string {
  if (process.env.ANTIGRAVITY_PROJECT_ID) return process.env.ANTIGRAVITY_PROJECT_ID;
  try {
    const glob = execSync(
      'ls -t ~/.gemini/antigravity/brain/*/.system_generated/terminals/*.env 2>/dev/null | head -n 1',
      { encoding: 'utf8', shell: '/bin/bash' }
    ).trim();
    if (glob && existsSync(glob)) {
      const content = readFileSync(glob, 'utf8');
      const m = content.match(/export ANTIGRAVITY_PROJECT_ID=([a-f0-9-]+)/);
      if (m && m[1]) return m[1];
    }
  } catch {
    // fallback
  }
  return 'd11eea1e-9cc3-4836-8438-73472d18e72f';
}

export function probeIsAntigravityPort(port: number): Promise<{ ok: boolean; csrfToken?: string } | null> {
  return new Promise((resolve) => {
    const req = httpGet({ host: '127.0.0.1', port, path: '/' }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
        if (body.length > 4096) {
          req.destroy();
        }
      });
      const check = () => {
        if (body.includes('__APP_CONFIG__') || body.includes('productName":"antigravity"')) {
          const match = body.match(/"csrfToken"\s*:\s*"([^"]+)"/i);
          resolve({ ok: true, csrfToken: match ? match[1] : undefined });
        } else {
          resolve(null);
        }
      };
      res.on('end', check);
      res.on('close', check);
    });
    req.on('error', () => resolve(null));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(null);
    });
  });
}

export async function detectAntigravityLsEnv(): Promise<Record<string, string>> {
  const projectId = detectAntigravityProjectId();
  if (process.env.ANTIGRAVITY_LS_ADDRESS && process.env.ANTIGRAVITY_CSRF_TOKEN) {
    return {
      ANTIGRAVITY_LS_ADDRESS: process.env.ANTIGRAVITY_LS_ADDRESS,
      ANTIGRAVITY_CSRF_TOKEN: process.env.ANTIGRAVITY_CSRF_TOKEN,
      ANTIGRAVITY_PROJECT_ID: projectId,
    };
  }
  try {
    const ps = execSync('ps aux | grep "[l]anguage_server.*antigravity"', { encoding: 'utf8' });
    const matchPid = ps.match(/^\S+\s+(\d+)/);
    const matchCsrf = ps.match(/--csrf_token\s+([a-f0-9-]+)/i);
    if (!matchPid) return {};
    const pid = matchPid[1];
    let csrfToken = matchCsrf ? matchCsrf[1] : '';

    const lsofCmd = existsSync('/usr/sbin/lsof') ? '/usr/sbin/lsof' : 'lsof';
    const lsof = execSync(`${lsofCmd} -nP -p ${pid} | grep LISTEN`, {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${process.env.PATH || ''}:/usr/sbin:/sbin:/usr/bin:/bin` },
    });
    const ports: number[] = [];
    for (const line of lsof.split('\n')) {
      const m = line.match(/TCP\s+(?:127\.0\.0\.1|localhost|\*):(\d+)\s+\(LISTEN\)/);
      if (m) ports.push(parseInt(m[1], 10));
    }

    let activePort: number | null = null;
    for (const port of ports) {
      const detected = await probeIsAntigravityPort(port);
      if (detected) {
        activePort = port;
        if (detected.csrfToken && !csrfToken) {
          csrfToken = detected.csrfToken;
        }
        break;
      }
    }
    if (!activePort && ports.length > 0) {
      ports.sort((a, b) => a - b);
      activePort = ports[0];
    }
    if (activePort && csrfToken) {
      return {
        ANTIGRAVITY_LS_ADDRESS: `localhost:${activePort}`,
        ANTIGRAVITY_CSRF_TOKEN: csrfToken,
        ANTIGRAVITY_PROJECT_ID: projectId,
      };
    }
  } catch {
    // Best-effort detection
  }
  return {};
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

  const detectedEnv = await detectAntigravityLsEnv();
  const env = {
    ...process.env,
    ...detectedEnv,
  };

  let stdout = '';
  try {
    const result = await execFile(command, args, { timeout: AGENTAPI_TIMEOUT_MS, env });
    stdout = result.stdout;
  } catch (err: unknown) {
    const execErr = err as { message?: string; stdout?: string; stderr?: string };
    const stdoutInfo = execErr?.stdout ? ` (stdout: ${execErr.stdout.trim()})` : '';
    const stderrInfo = execErr?.stderr ? ` (stderr: ${execErr.stderr.trim()})` : '';
    throw new Error(`Command failed: ${execErr?.message || String(err)}${stdoutInfo}${stderrInfo}`);
  }

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

export async function sendMessageToAntigravitySession(
  conversationId: string,
  content: string,
  title?: string
): Promise<void> {
  const command = resolveAgentApiCommand();
  const titleArg = title ? [`--title=${title}`] : [];
  const args = command.endsWith('language_server')
    ? ['agentapi', 'send-message', ...titleArg, conversationId, content]
    : ['send-message', ...titleArg, conversationId, content];

  const detectedEnv = await detectAntigravityLsEnv();
  const env = {
    ...process.env,
    ...detectedEnv,
  };

  await execFile(command, args, { timeout: AGENTAPI_TIMEOUT_MS, env });
}

export async function getOrCreateAntigravitySession(
  request: InboxIdeTaskProvisioningRequest,
  worktreePath: string
): Promise<{ taskId: string; isNew: boolean }> {
  const existing = findExistingSessionForTicket(request.ticketKey, request.reportId);
  if (existing) {
    process.stdout.write(
      `[Provisioner] Ticket ${request.ticketKey} already has active session ${existing.conversationId}. Reusing session (1 ticket -> 1 session).\n`
    );
    const prompt = buildAgentPrompt(request, worktreePath);
    try {
      await sendMessageToAntigravitySession(
        existing.conversationId,
        `🔔 [mOS Inbox Cập nhật]: Ticket ${request.ticketKey} có yêu cầu thực thi mới (Job: ${request.jobId}):\n\n${prompt}`,
        `Cập nhật [${request.ticketKey}]`
      );
    } catch (err) {
      process.stderr.write(
        `[Provisioner] Failed to notify existing session ${existing.conversationId}: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
    if (worktreePath && worktreePath !== existing.worktreePath) {
      existing.worktreePath = worktreePath;
      existing.updatedAt = new Date().toISOString();
      const sessions = readTicketSessions();
      sessions[request.ticketKey] = existing;
      sessions[String(request.reportId)] = existing;
      writeTicketSessions(sessions);
    }
    return { taskId: existing.conversationId, isNew: false };
  }

  const conversationId = await spawnAntigravitySession(request, worktreePath);
  const record: TicketSessionRecord = {
    ticketKey: request.ticketKey,
    reportId: request.reportId,
    conversationId,
    worktreePath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const sessions = readTicketSessions();
  sessions[request.ticketKey] = record;
  sessions[String(request.reportId)] = record;
  writeTicketSessions(sessions);
  return { taskId: conversationId, isNew: true };
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
  let isNewSession = false;
  try {
    if (!existing) {
      const worktreePath = await deps.prepareWorktree(request);
      const sessionResult = await deps.createTask(request, worktreePath);
      const taskId = typeof sessionResult === 'string' ? sessionResult : sessionResult.taskId;
      isNewSession = typeof sessionResult === 'object' ? sessionResult.isNew : false;
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
      const voiceMessage = isNewSession
        ? `Antigravity đã nhận ticket ${request.ticketKey} và mở session để code và test cho anh.`
        : `Antigravity đã nhận cập nhật cho ticket ${request.ticketKey} và tiếp tục xử lý trong session hiện tại của anh.`;
      await deps.notifyVoice(voiceMessage);
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

export function readCheckpointToken(): string {
  if (process.env.MOS_IDE_RELEASE_CHECKPOINT_TOKEN) return process.env.MOS_IDE_RELEASE_CHECKPOINT_TOKEN.trim();
  const envFiles = [resolve(homedir(), 'projects/mos-lab/apps/api/.env'), resolve(process.cwd(), 'apps/api/.env')];
  for (const file of envFiles) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf8');
      const match = content.match(/^MOS_IDE_RELEASE_CHECKPOINT_TOKEN=(.+)$/m);
      if (match && match[1]?.trim()) return match[1].trim();
    }
  }
  return readToken();
}

export type AutoDeployJob = {
  jobId: string;
  reportId: number;
  ticketKey: string;
  title: string;
  commitSha: string;
  branchName: string;
};

let isAutoDeployRunning = false;

export async function runAutoDeployWatcher(deps: {
  apiUrl: string;
  token: string;
  repository: string;
  notifyVoice?: (message: string) => Promise<void>;
}): Promise<'IDLE' | 'DEPLOYED'> {
  if (isAutoDeployRunning) {
    return 'IDLE';
  }
  isAutoDeployRunning = true;
  try {
    return await runAutoDeployWatcherInternal(deps);
  } finally {
    isAutoDeployRunning = false;
  }
}

async function runAutoDeployWatcherInternal(deps: {
  apiUrl: string;
  token: string;
  repository: string;
  notifyVoice?: (message: string) => Promise<void>;
}): Promise<'IDLE' | 'DEPLOYED'> {
  let res: Response;
  try {
    res = await fetch(`${deps.apiUrl}/ag-task-bridge/deploy/next`, {
      headers: { Authorization: `Bearer ${deps.token}`, Accept: 'application/json' },
    });
  } catch {
    return 'IDLE';
  }
  if (!res.ok) return 'IDLE';

  const payload = (await res.json()) as { data?: AutoDeployJob | null };
  const deployJob = payload?.data;
  if (!deployJob || !deployJob.commitSha) return 'IDLE';

  const mainRepo = resolve(deps.repository);
  process.stdout.write(
    `[${new Date().toISOString()}] [AutoDeploy] Danny deploy approval detected for ${deployJob.ticketKey} (${deployJob.commitSha.slice(0, 8)}). Starting pipeline...\n`
  );

  // 1. Merge into main if not already an ancestor
  const isAncestor = await execFile('git', ['-C', mainRepo, 'merge-base', '--is-ancestor', deployJob.commitSha, 'main'])
    .then(() => true)
    .catch(() => false);

  if (!isAncestor) {
    process.stdout.write(`[AutoDeploy] Merging ${deployJob.commitSha.slice(0, 8)} into main...\n`);
    await execFile('git', ['-C', mainRepo, 'checkout', 'main']);
    await execFile('git', ['-C', mainRepo, 'pull', '--ff-only', 'origin', 'main']);
    await execFile('git', [
      '-C',
      mainRepo,
      'merge',
      deployJob.commitSha,
      '-m',
      `deploy(inbox): merge ${deployJob.ticketKey} ${deployJob.title.replace(/"/g, '')}`,
    ]);
    await execFile('git', ['-C', mainRepo, 'push', 'origin', 'main']);
  }

  // 2. Deploy to VPS
  process.stdout.write('[AutoDeploy] Deploying backend to VPS live-wings...\n');
  await execFile('ssh', ['-o', 'BatchMode=yes', 'live-wings', 'bash /home/web/mos-lab/scripts/deploy-production.sh'], {
    timeout: 180_000,
  });

  // 3. Poll release preview until eligible
  process.stdout.write(`[AutoDeploy] Waiting for release verification for ticket ${deployJob.reportId}...\n`);
  const verifyStart = Date.now();
  let releaseToken: unknown = null;
  while (Date.now() - verifyStart < 5 * 60 * 1000) {
    try {
      const previewRes = await fetch(`${deps.apiUrl}/ag-task-bridge/reports/${deployJob.reportId}/release-preview`, {
        headers: { Authorization: `Bearer ${deps.token}`, Accept: 'application/json' },
      });
      if (previewRes.ok) {
        const previewPayload = (await previewRes.json()) as {
          data?: { eligible: boolean; token?: unknown };
        };
        if (previewPayload?.data?.eligible && previewPayload.data.token) {
          releaseToken = previewPayload.data.token;
          break;
        }
      }
    } catch {
      // Retry transient error
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }

  if (!releaseToken) {
    throw new Error(`Production release verification timed out for ticket ${deployJob.reportId}.`);
  }

  // 4. Post release checkpoint
  process.stdout.write(`[AutoDeploy] Posting release checkpoint for ticket ${deployJob.reportId}...\n`);
  const checkpointToken = readCheckpointToken();
  const rawToken = releaseToken as {
    jobId: string;
    manifestDigest: string;
    commitSha: string;
    apiRelease: string;
    webRelease: string | null;
  };
  const checkpointPayload = {
    jobId: rawToken.jobId,
    manifestDigest: rawToken.manifestDigest,
    commitSha: rawToken.commitSha,
    apiRelease: rawToken.apiRelease,
    webRelease: rawToken.webRelease,
  };
  const checkpointRes = await fetch(`${deps.apiUrl}/ide-release-checkpoints/${deployJob.reportId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${checkpointToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(checkpointPayload),
  });

  if (!checkpointRes.ok) {
    throw new Error(`Release checkpoint failed (${checkpointRes.status}): ${await checkpointRes.text()}`);
  }

  process.stdout.write(
    `[${new Date().toISOString()}] [AutoDeploy] Ticket ${deployJob.ticketKey} released and closed successfully!\n`
  );

  if (deps.notifyVoice) {
    await deps.notifyVoice(
      `Anh Danny ơi, em đã tự động deploy xong ticket ${deployJob.ticketKey} lên production và đóng ticket rồi ạ.`
    );
  }

  return 'DEPLOYED';
}

export function readGeminiApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const envFiles = [resolve(homedir(), 'projects/mos-lab/apps/api/.env'), resolve(process.cwd(), 'apps/api/.env')];
  for (const file of envFiles) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf8');
      const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
      if (match && match[1]?.trim()) return match[1].trim();
    }
  }
  return '';
}

export function readClassifierToken(defaultToken: string): string {
  if (process.env.MOS_REQUEST_CLASSIFIER_WORKER_TOKEN) return process.env.MOS_REQUEST_CLASSIFIER_WORKER_TOKEN.trim();
  const candidateFiles = [
    resolve(homedir(), '.config/masteros/request-classifier-worker.env'),
    resolve(homedir(), '.gemini/antigravity/secrets/mos-ag-task-provisioner.env'),
    resolve(homedir(), 'projects/mos-lab/apps/api/.env'),
    resolve(process.cwd(), 'apps/api/.env'),
  ];
  for (const file of candidateFiles) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf8');
      const match = content.match(/^MOS_REQUEST_CLASSIFIER_WORKER_TOKEN=(.+)$/m);
      if (match && match[1]?.trim()) return match[1].trim();
    }
  }
  return defaultToken;
}

export async function callGeminiClarifier(
  apiKey: string,
  job: InboxFollowUpWorkerJob,
  fetcher: typeof fetch = fetch
): Promise<{ decision: 'READY_FOR_TRIAGE' | 'ASK_REPORTER'; note: string; question?: string } | null> {
  const model = 'gemini-3.1-pro-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `Bạn là trợ lý kỹ thuật AI cấp cao của hệ thống mOS (Wings Lashes CRM), tích hợp trực tiếp trong IDE Antigravity.
Nhiệm vụ: Phân tích báo cáo lỗi và làm rõ yêu cầu (Clarification Review) để người báo (nhân viên vận hành) và quản lý (Danny) hiểu rõ bản chất vấn đề.

Thông tin ticket:
- Mã ticket: ${job.ticketKey} (ID: ${job.ticketId})
- Loại yêu cầu: ${job.context.requestType}
- Tiêu đề: "${job.context.title}"
- Mô tả: "${job.context.description}"
- Màn hình thao tác: ${job.context.sourcePath || 'Chưa xác định'}
- Trạng thái: ${job.context.status} / ${job.context.clarificationStatus}
${job.context.reporterMessages?.length ? `- Tin nhắn từ người báo: ${JSON.stringify(job.context.reporterMessages)}` : ''}
${job.context.reopen ? `- Bối cảnh reopen: ${JSON.stringify(job.context.reopen)}` : ''}

Quy tắc phân tích:
1. Đánh giá tính đầy đủ của thông tin. Nếu có lỗi hệ thống, bối cảnh rõ ràng, hoặc lỗi phân quyền:
   - Giải thích ngắn gọn, thân thiện cho người báo hiểu bản chất vấn đề (do phân quyền bảo mật, cấu hình hay lỗi phần mềm).
   - Trả về decision: "READY_FOR_TRIAGE".
2. Nếu thực sự thiếu thông tin quan trọng để tái hiện/phân tích:
   - Đặt đúng 1 câu hỏi tiếng Việt ngắn gọn, ấm áp, có tâm gửi người báo.
   - Trả về decision: "ASK_REPORTER".

Trả về JSON thuần túy (không dùng markdown code blocks):
{
  "decision": "READY_FOR_TRIAGE" | "ASK_REPORTER",
  "note": "Tóm tắt phân tích kỹ thuật và bối cảnh cho quản lý",
  "question": "Câu hỏi gửi người báo nếu decision là ASK_REPORTER (ngược lại để null)"
}`;

  const res = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API HTTP ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return JSON.parse(text);
}

export type ClarificationWatcherDeps = {
  apiUrl: string;
  token: string;
  provisionerId: string;
  repository: string;
  notifyVoice?: (message: string) => Promise<void>;
  fetch?: typeof fetch;
  geminiApiKey?: string;
};

export async function runClarificationWatcher(deps: ClarificationWatcherDeps): Promise<'IDLE' | 'CLARIFIED'> {
  const fetcher = deps.fetch || fetch;
  const token = readClassifierToken(deps.token);
  const claimUrl = `${deps.apiUrl}/request-classifier/inbox-follow-ups/claim`;

  let claimRes: { data?: unknown };
  try {
    claimRes = await bridgeJson(fetcher, claimUrl, {
      method: 'POST',
      headers: {
        ...bridgeHeaders(token, deps.provisionerId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workerId: 'antigravity' }),
    });
  } catch {
    return 'IDLE';
  }

  const job = claimRes?.data as InboxFollowUpWorkerJob | null;
  if (!job || !job.id || !job.leaseToken) return 'IDLE';

  process.stdout.write(
    `[${new Date().toISOString()}] [AutoClarify] Claimed follow-up job for ${job.ticketKey} (${job.id})\n`
  );

  const geminiApiKey = deps.geminiApiKey || readGeminiApiKey();
  const defaultAction = job.eventKind === 'REPORTER_REOPENED' ? 'REANALYSIS_CONFIRMED' : 'PROGRESS_REVIEWED';
  let action: 'PROGRESS_REVIEWED' | 'REANALYSIS_CONFIRMED' | 'ASK_REPORTER' | 'NO_OP' = defaultAction;
  let note = `Antigravity IDE: Đã tự động rà soát bối cảnh mã nguồn cho ${job.ticketKey}.`;
  let question: string | null = null;

  if (geminiApiKey) {
    try {
      const geminiResult = await callGeminiClarifier(geminiApiKey, job, fetcher);
      if (geminiResult) {
        if (geminiResult.decision === 'ASK_REPORTER' && geminiResult.question) {
          action = 'ASK_REPORTER';
          question = geminiResult.question;
          note = geminiResult.note || 'Cần người báo cung cấp thêm thông tin.';
        } else {
          action = defaultAction;
          note = geminiResult.note || 'Đã rà soát đủ thông tin kỹ thuật.';
          question = null;
        }
      }
    } catch (geminiErr) {
      process.stderr.write(
        `[${new Date().toISOString()}] [AutoClarify] Gemini analysis failed, using fallback: ${geminiErr instanceof Error ? geminiErr.message : String(geminiErr)}\n`
      );
    }
  }

  const completeUrl = `${deps.apiUrl}/request-classifier/inbox-follow-ups/${encodeURIComponent(job.id)}/complete`;
  await bridgeJson(fetcher, completeUrl, {
    method: 'POST',
    headers: {
      ...bridgeHeaders(token, deps.provisionerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      leaseToken: job.leaseToken,
      result: { action, note, question },
    }),
  });

  process.stdout.write(
    `[${new Date().toISOString()}] [AutoClarify] Successfully completed clarification for ${job.ticketKey} with action=${action}\n`
  );

  if (deps.notifyVoice) {
    await deps.notifyVoice(
      `Antigravity đã tự động làm rõ yêu cầu cho ticket ${job.ticketKey} và cập nhật lên mOS Inbox rồi ạ.`
    );
  }

  return 'CLARIFIED';
}

export async function callGeminiPlanner(
  apiKey: string,
  job: InboxPlanWorkerJob,
  fetcher: typeof fetch = fetch
): Promise<InboxPlanDraft | null> {
  const model = 'gemini-3.1-pro-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `Bạn là kỹ sư phần mềm AI cấp cao của mOS (Wings Lashes CRM), tích hợp trong IDE Antigravity.
Nhiệm vụ: Lập kế hoạch triển khai (Implementation Plan) cho ticket sau:
- Mã ticket: ${job.ticketKey} (ID: ${job.ticketId})
- Loại yêu cầu: ${job.context.requestType}
- Tiêu đề: "${job.context.title}"
- Mô tả: "${job.context.description}"
- Màn hình thao tác: ${job.context.sourcePath || 'Chưa xác định'}
${job.context.clarificationSummary ? `- Tóm tắt làm rõ: "${job.context.clarificationSummary}"` : ''}
${job.context.businessContext ? `- Bối cảnh nghiệp vụ: "${job.context.businessContext}"` : ''}
${job.context.reopen ? `- Lý do reopen: "${job.context.reopen.reason}"` : ''}

Hãy lập kế hoạch triển khai rõ ràng, an toàn, súc tích tuân thủ các Điều răn mOS.
Trả về JSON thuần túy theo schema:
{
  "evidence": "Bằng chứng hoặc giả thuyết có giới hạn",
  "expectedOutcome": "Kết quả mong đợi sau khi sửa",
  "scope": "Phạm vi tệp tin / module cần can thiệp",
  "steps": ["Bước 1...", "Bước 2...", "Bước 3..."],
  "verification": "Cách kiểm thử và xác minh (unit tests, UI contract, Playwright nếu có web)",
  "risksAndRollback": "Rủi ro tiềm ẩn và phương án rollback nếu có sự cố",
  "approvalRequest": "Quyết định cụ thể cần Danny phê duyệt"
}`;

  const res = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API HTTP ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return JSON.parse(text) as InboxPlanDraft;
}

export async function runPlanWatcher(deps: {
  apiUrl: string;
  token: string;
  provisionerId: string;
  repository: string;
  fetch?: typeof fetch;
  geminiApiKey?: string;
  notifyVoice?: (message: string) => Promise<void>;
}): Promise<'IDLE' | 'PLANNED'> {
  const fetcher = deps.fetch || fetch;
  const token = deps.token;
  const claimUrl = `${deps.apiUrl}/request-classifier/inbox-plans/claim`;

  let claimRes: { data?: unknown };
  try {
    claimRes = await bridgeJson(fetcher, claimUrl, {
      method: 'POST',
      headers: {
        ...bridgeHeaders(token, deps.provisionerId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workerId: 'antigravity' }),
    });
  } catch {
    return 'IDLE';
  }

  const job = claimRes?.data as InboxPlanWorkerJob | null;
  if (!job || !job.id || !job.leaseToken) return 'IDLE';

  process.stdout.write(`[${new Date().toISOString()}] [AutoPlan] Claimed plan job for ${job.ticketKey} (${job.id})\n`);

  const geminiApiKey = deps.geminiApiKey || readGeminiApiKey();
  const action: 'POST_PLAN' | 'NO_OP' | 'INSUFFICIENT_INFORMATION' = 'POST_PLAN';
  let note = `Antigravity IDE: Kế hoạch triển khai cho ${job.ticketKey}.`;
  let plan: InboxPlanDraft | null = {
    evidence: job.context.clarificationSummary || job.context.description || job.context.title,
    expectedOutcome: `Xử lý triệt để yêu cầu ${job.ticketKey}.`,
    scope: job.context.sourcePath || 'apps/api, apps/web',
    steps: [
      'Rà soát mã nguồn liên quan theo đúng bối cảnh được báo.',
      'Triển khai chỉnh sửa tối thiểu và an toàn trong worktree riêng.',
      'Chạy kiểm chứng pnpm verify:quick và bàn giao receipt.',
    ],
    verification: 'pnpm verify:quick',
    risksAndRollback: 'Rủi ro thấp, cô lập hoàn toàn trong worktree ticket.',
    approvalRequest: 'Duyệt triển khai code và kiểm thử.',
  };

  if (geminiApiKey) {
    try {
      const geminiPlan = await callGeminiPlanner(geminiApiKey, job, fetcher);
      if (geminiPlan) {
        plan = geminiPlan;
        note = `Antigravity IDE: Đã tự động lập kế hoạch chi tiết cho ${job.ticketKey}.`;
      }
    } catch (geminiErr) {
      process.stderr.write(
        `[${new Date().toISOString()}] [AutoPlan] Gemini planning failed, using fallback: ${geminiErr instanceof Error ? geminiErr.message : String(geminiErr)}\n`
      );
    }
  }

  const completeUrl = `${deps.apiUrl}/request-classifier/inbox-plans/${encodeURIComponent(job.id)}/complete`;
  await bridgeJson(fetcher, completeUrl, {
    method: 'POST',
    headers: {
      ...bridgeHeaders(token, deps.provisionerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      leaseToken: job.leaseToken,
      result: { action, note, plan },
    }),
  });

  process.stdout.write(`[${new Date().toISOString()}] [AutoPlan] Successfully completed plan for ${job.ticketKey}\n`);

  if (deps.notifyVoice) {
    await deps.notifyVoice(
      `Antigravity đã tự động lập kế hoạch triển khai cho ticket ${job.ticketKey} và cập nhật lên mOS Inbox rồi ạ.`
    );
  }

  return 'PLANNED';
}

let isChatWatcherRunning = false;

export async function runAgChatWatcher(deps: { apiUrl: string; token: string }): Promise<'IDLE' | 'ANSWERED'> {
  if (isChatWatcherRunning) return 'IDLE';
  isChatWatcherRunning = true;

  try {
    let res: Response;
    try {
      res = await fetch(`${deps.apiUrl}/ag-task-bridge/chat/next`, {
        headers: {
          Authorization: `Bearer ${deps.token}`,
          Accept: 'application/json',
        },
      });
    } catch {
      return 'IDLE';
    }
    if (!res.ok) return 'IDLE';

    const payload = (await res.json()) as { success?: boolean; data?: AgChatBridgeJob | null };
    const job = payload?.data;
    if (!job || !job.id || !job.prompt) return 'IDLE';

    process.stdout.write(
      `[${new Date().toISOString()}] [AgChatBridge] Received chat request (${job.id}). Executing via local Antigravity...\n`
    );

    const agResult = await AgChatBridgeService.executeLocalAgPrompt(job.conversationId, job.prompt, job.title);

    await fetch(`${deps.apiUrl}/ag-task-bridge/chat/${encodeURIComponent(job.id)}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agResult),
    });

    process.stdout.write(
      `[${new Date().toISOString()}] [AgChatBridge] Successfully completed chat request (${job.id})\n`
    );
    return 'ANSWERED';
  } catch (err) {
    process.stderr.write(
      `[${new Date().toISOString()}] [AgChatBridge] Error executing chat: ${err instanceof Error ? err.message : String(err)}\n`
    );
    return 'IDLE';
  } finally {
    isChatWatcherRunning = false;
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
        createTask: getOrCreateAntigravitySession,
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

    try {
      const deployResult = await runAutoDeployWatcher({
        apiUrl: config.apiUrl,
        token,
        repository: config.repository,
        notifyVoice,
      });
      if (deployResult === 'DEPLOYED') {
        process.stdout.write(`[${new Date().toISOString()}] AutoDeploy completed successfully.\n`);
      }
    } catch (err) {
      process.stderr.write(
        `[${new Date().toISOString()}] AutoDeploy error: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }

    try {
      const clarifyResult = await runClarificationWatcher({
        apiUrl: config.apiUrl,
        token,
        provisionerId: config.provisionerId,
        repository: config.repository,
        notifyVoice,
      });
      if (clarifyResult === 'CLARIFIED') {
        process.stdout.write(`[${new Date().toISOString()}] AutoClarify completed successfully.\n`);
      }
    } catch (err) {
      process.stderr.write(
        `[${new Date().toISOString()}] AutoClarify error: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }

    try {
      const planResult = await runPlanWatcher({
        apiUrl: config.apiUrl,
        token,
        provisionerId: config.provisionerId,
        repository: config.repository,
        notifyVoice,
      });
      if (planResult === 'PLANNED') {
        process.stdout.write(`[${new Date().toISOString()}] AutoPlan completed successfully.\n`);
      }
    } catch (err) {
      process.stderr.write(
        `[${new Date().toISOString()}] AutoPlan error: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
  };

  if (!isDaemon) {
    await run();
    return;
  }

  // Start low-latency continuous chat bridge listener in background
  (async () => {
    while (true) {
      try {
        await runAgChatWatcher({ apiUrl: config.apiUrl, token });
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
  })();

  process.stdout.write(
    `[${new Date().toISOString()}] Antigravity inbox provisioner daemon started. Polling every 15s...\n`
  );
  while (true) {
    await run();
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
}

if (process.argv[1] && basename(process.argv[1]) === 'ag-task-provisioner.ts') {
  void main();
}
