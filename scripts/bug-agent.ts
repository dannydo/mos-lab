import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AgentBugBundle,
  AgentBugQueueItem,
  AgentMarkBugFixedRequest,
  AgentMarkBugFixedResponse,
  AgentReviewBugReportRequest,
  AgentReviewBugReportResponse,
} from '@mos-lab/shared';

const DEFAULT_API_URL = 'https://api.lab.masteros.app/api';

function loadLocalAgentEnv(): void {
  for (const filePath of [resolve('.env'), resolve('apps/api/.env')]) {
    if (!existsSync(filePath)) continue;
    const contents = readFileSync(filePath, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*(MOS_BUG_AGENT_TOKEN|MOS_BUG_AGENT_API_URL)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]]) continue;
      const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
      process.env[match[1]] = value;
    }
  }
}

function getConfiguration(): { apiUrl: string; token: string } {
  loadLocalAgentEnv();
  const apiUrl = String(process.env.MOS_BUG_AGENT_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
  const token = String(process.env.MOS_BUG_AGENT_TOKEN || '').trim();
  if (token.length < 32) {
    throw new Error('Thiếu MOS_BUG_AGENT_TOKEN (tối thiểu 32 ký tự) trong environment hoặc apps/api/.env.');
  }
  return { apiUrl, token };
}

async function agentFetch(path: string, init?: RequestInit): Promise<Response> {
  const { apiUrl, token } = getConfiguration();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    let detail = body.slice(0, 500);
    try {
      const parsed = JSON.parse(body) as { message?: string; error?: string };
      detail = parsed.message || parsed.error || detail;
    } catch {
      // The bounded response text is enough for a non-JSON upstream failure.
    }
    throw new Error(`Agent Bridge trả về HTTP ${response.status}: ${detail}`);
  }
  return response;
}

function normalizeKey(value: string): string {
  const match = value
    .trim()
    .toUpperCase()
    .match(/^MOS-BUG-(\d+)$/);
  if (!match || Number(match[1]) <= 0) throw new Error('Mã ticket phải có dạng MOS-BUG-123.');
  return `MOS-BUG-${Number(match[1])}`;
}

function attachmentFileName(id: number, fileName: string): string {
  const safeName =
    basename(fileName)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `image-${id}`;
  return `attachment-${id}-${safeName}`;
}

export async function listApprovedQueue(): Promise<AgentBugQueueItem[]> {
  const response = await agentFetch('/agent/bug-reports');
  const payload = (await response.json()) as { data: AgentBugQueueItem[] };
  return payload.data;
}

export async function downloadBugBundle(
  keyInput: string,
  destinationRoot = resolve('scratch/bug-reports')
): Promise<string> {
  const key = normalizeKey(keyInput);
  const response = await agentFetch(`/agent/bug-reports/${encodeURIComponent(key)}`);
  const payload = (await response.json()) as { data: AgentBugBundle };
  const bundle = payload.data;
  const destination = resolve(destinationRoot, key);
  if (!destination.startsWith(`${resolve(destinationRoot)}${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new Error('Đường dẫn ticket không an toàn.');
  }
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const resolutionPath = resolve(destination, 'resolution.json');
  const resolutionTemplate: AgentMarkBugFixedRequest = {
    problemSummary: '',
    rootCause: '',
    solutionSummary: '',
    verificationSummary: '',
    changedFiles: [],
    commitSha: null,
    releaseUrl: null,
  };
  await Promise.all([
    writeFile(resolve(destination, 'report.md'), bundle.markdown, { encoding: 'utf8', mode: 0o600 }),
    writeFile(resolve(destination, 'context.json'), `${JSON.stringify(bundle.report.context, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    }),
    writeFile(resolve(destination, 'ticket.json'), `${JSON.stringify(bundle.report, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    }),
    writeFile(
      resolve(destination, 'similar-resolutions.json'),
      `${JSON.stringify(bundle.similarResolutions, null, 2)}\n`,
      {
        encoding: 'utf8',
        mode: 0o600,
      }
    ),
    ...(existsSync(resolutionPath)
      ? []
      : [
          writeFile(resolutionPath, `${JSON.stringify(resolutionTemplate, null, 2)}\n`, {
            encoding: 'utf8',
            mode: 0o600,
          }),
        ]),
    ...bundle.attachments.map(async (attachment) => {
      const attachmentResponse = await agentFetch(
        `/agent/bug-reports/${encodeURIComponent(key)}/attachments/${attachment.id}`
      );
      const buffer = Buffer.from(await attachmentResponse.arrayBuffer());
      await writeFile(resolve(destination, attachmentFileName(attachment.id, attachment.fileName)), buffer, {
        mode: 0o600,
      });
    }),
  ]);
  return destination;
}

export async function submitBugResolution(
  keyInput: string,
  resolutionFile?: string
): Promise<AgentMarkBugFixedResponse> {
  const key = normalizeKey(keyInput);
  const filePath = resolve(resolutionFile || `scratch/bug-reports/${key}/resolution.json`);
  if (!existsSync(filePath)) throw new Error(`Không tìm thấy resolution file: ${filePath}`);
  let resolution: AgentMarkBugFixedRequest;
  try {
    resolution = JSON.parse(readFileSync(filePath, 'utf8')) as AgentMarkBugFixedRequest;
  } catch {
    throw new Error(`Resolution file không phải JSON hợp lệ: ${filePath}`);
  }
  const response = await agentFetch(`/agent/bug-reports/${encodeURIComponent(key)}/fixed`, {
    method: 'PATCH',
    body: JSON.stringify(resolution),
  });
  return (await response.json()) as AgentMarkBugFixedResponse;
}

export async function submitClarificationReview(
  keyInput: string,
  request: AgentReviewBugReportRequest
): Promise<AgentReviewBugReportResponse> {
  const key = normalizeKey(keyInput);
  const response = await agentFetch(`/agent/bug-reports/${encodeURIComponent(key)}/clarification`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return (await response.json()) as AgentReviewBugReportResponse;
}

async function main(): Promise<void> {
  const argument = process.argv[2];
  if (!argument || argument === '--help' || argument === '-h') {
    console.log(
      'Dùng: pnpm bug:agent --list | pnpm bug:agent MOS-BUG-123 | pnpm bug:agent --ask MOS-BUG-123 "Câu hỏi" | pnpm bug:agent --ready MOS-BUG-123 "Kết luận biz logic" | pnpm bug:agent --fixed MOS-BUG-123 [resolution.json]'
    );
    return;
  }
  if (argument === '--list') {
    const queue = await listApprovedQueue();
    if (queue.length === 0) {
      console.log('Agent queue đang trống.');
      return;
    }
    console.table(
      queue.map(({ key, workType, priority, status, clarification, title, sourcePath, updatedAt }) => ({
        key,
        workType,
        priority: priority || '—',
        status,
        clarity: clarification.status,
        title,
        route: sourcePath,
        updatedAt,
      }))
    );
    return;
  }
  if (argument === '--ask' || argument === '--ready') {
    const key = process.argv[3];
    const message = process.argv.slice(4).join(' ').trim();
    if (!key) throw new Error(`Thiếu mã ticket cho ${argument}.`);
    if (!message) throw new Error(`Thiếu nội dung cho ${argument}.`);
    const result = await submitClarificationReview(key, {
      decision: argument === '--ask' ? 'ASK_REPORTER' : 'READY_FOR_TRIAGE',
      message,
      ...(argument === '--ready' ? { businessContext: message } : {}),
    });
    console.log(result.message || `Đã cập nhật bước làm rõ cho ${normalizeKey(key)}.`);
    return;
  }
  if (argument === '--fixed') {
    const key = process.argv[3];
    if (!key) throw new Error('Thiếu mã ticket cho --fixed.');
    const result = await submitBugResolution(key, process.argv[4]);
    console.log(result.message || `Đã gửi bản sửa ${normalizeKey(key)} cho người báo duyệt.`);
    return;
  }
  const destination = await downloadBugBundle(argument);
  console.log(`Đã tải bundle vào ${destination}`);
  console.log(`Mở ${resolve(destination, 'report.md')} để bắt đầu phân tích.`);
  console.log(
    `Sau khi sửa, điền ${resolve(destination, 'resolution.json')} rồi chạy pnpm bug:agent --fixed ${normalizeKey(argument)}`
  );
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
