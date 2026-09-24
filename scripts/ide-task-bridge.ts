import { mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';

function speakAsync(message: string): void {
  const speakBin = resolve(homedir(), '.gemini/antigravity/bin/speak');
  if (existsSync(speakBin)) {
    try {
      const child = spawn(speakBin, [message], { detached: true, stdio: 'ignore' });
      child.unref();
    } catch {
      // non-blocking
    }
  }
}

function resolveToken(): string {
  const candidates = [
    resolve(homedir(), '.gemini/antigravity/secrets/mos-ag-task-bridge.env'),
    resolve(homedir(), '.codex/secrets/mos-ide-task-bridge.env'),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf8');
      const token =
        content.match(/^MOS_AG_TASK_BRIDGE_TOKEN=(.+)$/m)?.[1]?.trim() ||
        content.match(/^MOS_IDE_TASK_BRIDGE_TOKEN=(.+)$/m)?.[1]?.trim();
      if (token && token.length >= 32) return token;
    }
  }
  throw new Error('IDE task bridge token is unavailable.');
}

function resolveCheckpointToken(): string {
  if (process.env.MOS_IDE_RELEASE_CHECKPOINT_TOKEN) return process.env.MOS_IDE_RELEASE_CHECKPOINT_TOKEN.trim();
  const envFiles = [
    resolve(process.cwd(), 'apps/api/.env'),
    resolve(process.cwd(), '.env'),
    resolve(homedir(), 'projects/mos-lab/apps/api/.env'),
    resolve(homedir(), '.gemini/antigravity/secrets/mos-ag-task-bridge.env'),
    resolve(homedir(), '.codex/secrets/mos-ide-task-bridge.env'),
  ];
  for (const f of envFiles) {
    if (existsSync(f)) {
      const c = readFileSync(f, 'utf8');
      const token = c.match(/^MOS_IDE_RELEASE_CHECKPOINT_TOKEN=(.+)$/m)?.[1]?.trim();
      if (token && token.length >= 32) return token;
    }
  }
  throw new Error('MOS_IDE_RELEASE_CHECKPOINT_TOKEN is unavailable.');
}

function resolveApiUrl(): string {
  if (process.env.MOS_API_URL) return process.env.MOS_API_URL.replace(/\/$/, '');
  const configFiles = [
    resolve(homedir(), '.gemini/antigravity/secrets/mos-ag-task-provisioner.env'),
    resolve(homedir(), '.codex/secrets/mos-ide-task-provisioner.env'),
  ];
  for (const file of configFiles) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf8');
      const url =
        content.match(/^MOS_AG_PROVISIONER_API_URL=(.+)$/m)?.[1]?.trim() ||
        content.match(/^MOS_IDE_PROVISIONER_API_URL=(.+)$/m)?.[1]?.trim();
      if (url) return url.replace(/\/$/, '');
    }
  }
  return 'https://api.lab.masteros.app/api';
}

async function handleWaitAndDeploy(
  apiUrl: string,
  token: string,
  taskId: string,
  worktreePath: string,
  ticketIdOverride?: number
): Promise<void> {
  const ticketBranch = execFileSync('git', ['-C', worktreePath, 'rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  const commitSha = execFileSync('git', ['-C', worktreePath, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

  let ticketId = ticketIdOverride || 0;
  if (!ticketId) {
    const match = ticketBranch.match(/(?:feat|bug|task)-(\d+)/i);
    if (match) ticketId = parseInt(match[1], 10);
  }

  const pollIntervalMs = 3_000;
  const timeoutMs = 2 * 60 * 60 * 1000;
  const startTime = Date.now();

  process.stdout.write(`Listening for Danny's deploy approval on mOS Inbox (polling every 3s for task ${taskId})...\n`);

  let deployApproved = false;
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${apiUrl}/ide-task-bridge/tasks/${encodeURIComponent(taskId)}/release-preview`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          data?: {
            eligible: boolean;
            code: string | null;
            reportId?: number;
            token?: {
              jobId: string;
              manifestDigest: string;
              commitSha: string;
              apiRelease: string;
              webRelease: string | null;
            };
          };
        };

        if (payload?.data?.reportId && !ticketId) {
          ticketId = payload.data.reportId;
        }

        // When Danny approves deploy, code transitions from 'IDE_APPROVAL_BINDING_MISSING' to 'IDE_RELEASE_UNVERIFIED' or eligible
        if (payload?.data?.code === 'IDE_RELEASE_UNVERIFIED' || payload?.data?.eligible) {
          deployApproved = true;
          process.stdout.write("Danny's deploy approval detected on web! Starting automatic merge & deploy...\n");
          speakAsync(
            'Anh Danny đã duyệt deploy trên mOS Inbox. Em đang tự động merge và triển khai lên máy chủ rồi ạ.'
          );
          break;
        }
      }
    } catch {
      // Retry transient error
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  if (!deployApproved) throw new Error('Timed out waiting for deploy approval from mOS Inbox.');

  // 1. Merge into main
  const mainRepo = resolve(homedir(), 'projects/mos-lab');
  process.stdout.write(`Merging ${commitSha} into main at ${mainRepo}...\n`);

  let stashed = false;
  try {
    const status = execFileSync('git', ['-C', mainRepo, 'status', '--porcelain'], { encoding: 'utf8' });
    if (status.trim().length > 0) {
      execFileSync('git', ['-C', mainRepo, 'stash', 'push', '-u', '-m', `ag-auto-stash-before-deploy-${Date.now()}`], {
        stdio: 'inherit',
      });
      stashed = true;
    }
  } catch {
    // continue
  }

  try {
    execFileSync('git', ['-C', mainRepo, 'checkout', 'main'], { stdio: 'inherit' });
    try {
      execFileSync('git', ['-C', mainRepo, 'pull', '--ff-only'], { stdio: 'inherit' });
    } catch {
      try {
        execFileSync('git', ['-C', mainRepo, 'fetch', 'origin', 'main'], { stdio: 'inherit' });
        execFileSync('git', ['-C', mainRepo, 'merge', '--ff-only', 'origin/main'], { stdio: 'inherit' });
      } catch {
        // continue if already up to date
      }
    }

    let isAlreadyMerged = false;
    try {
      execFileSync('git', ['-C', mainRepo, 'merge-base', '--is-ancestor', commitSha, 'HEAD']);
      isAlreadyMerged = true;
    } catch {
      isAlreadyMerged = false;
    }

    if (!isAlreadyMerged) {
      try {
        execFileSync('git', ['-C', mainRepo, 'merge', commitSha, '-m', `deploy(inbox): merge ${ticketBranch}`], {
          stdio: 'inherit',
        });
      } catch (mergeErr) {
        process.stderr.write(`\n[BRIDGE ERROR] Merge conflict when merging ${commitSha} into main: ${mergeErr}\n`);
        speakAsync(
          'Anh Danny ơi, nhánh ticket bị xung đột khi merge vào main, cần xử lý xung đột git để hoàn tất deploy ạ.'
        );
        throw mergeErr;
      }

      // 2. Push to origin main
      process.stdout.write('Pushing main to origin...\n');
      try {
        execFileSync('git', ['-C', mainRepo, 'push', 'origin', 'main'], { stdio: 'inherit' });
      } catch (pushErr) {
        process.stderr.write(`\n[BRIDGE ERROR] Failed to push main to origin: ${pushErr}\n`);
        throw pushErr;
      }
    } else {
      process.stdout.write(`Commit ${commitSha} is already merged into main.\n`);
    }
  } finally {
    if (stashed) {
      try {
        execFileSync('git', ['-C', mainRepo, 'stash', 'pop'], { stdio: 'inherit' });
      } catch {
        process.stderr.write('Warning: Failed to pop git stash in mainRepo. Stash preserved in git stash list.\n');
      }
    }
  }

  // 3. Deploy to VPS
  process.stdout.write('Deploying backend to VPS live-wings...\n');
  execFileSync('ssh', ['-o', 'BatchMode=yes', 'live-wings', 'bash /home/web/mos-lab/scripts/deploy-production.sh'], {
    stdio: 'inherit',
  });

  // 4. Poll release preview until verified
  process.stdout.write('Waiting for production release verification (API & Web markers)...\n');
  const verifyStart = Date.now();
  let releaseToken: unknown = null;
  while (Date.now() - verifyStart < 5 * 60 * 1000) {
    try {
      const response = await fetch(`${apiUrl}/ide-task-bridge/tasks/${encodeURIComponent(taskId)}/release-preview`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          data?: {
            eligible: boolean;
            token?: unknown;
            code: string | null;
          };
        };
        if (payload?.data?.eligible && payload.data.token) {
          releaseToken = payload.data.token;
          process.stdout.write('Production release verified successfully!\n');
          break;
        }

        // Terminal state detection: If ticket was already settled or release checkpoint already recorded
        if (
          payload?.data?.code === 'IDE_RELEASE_ALREADY_RECORDED' ||
          payload?.data?.code === 'IDE_CURRENT_APPROVAL_MISSING'
        ) {
          process.stdout.write('Production release already recorded or settled on server. Exiting cleanly.\n');
          process.exit(0);
        }
      }
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }

  if (!releaseToken) {
    throw new Error('Production release verification timed out.');
  }

  // 5. Post release checkpoint
  process.stdout.write(`Posting official release checkpoint for ticket ${ticketId}...\n`);
  const checkpointToken = resolveCheckpointToken();
  const tokenData = releaseToken as {
    jobId: string;
    manifestDigest: string;
    commitSha: string;
    apiRelease: string;
    webRelease: string | null;
  };
  const checkpointPayload = {
    jobId: tokenData.jobId,
    manifestDigest: tokenData.manifestDigest,
    commitSha: tokenData.commitSha,
    apiRelease: tokenData.apiRelease,
    webRelease: tokenData.webRelease,
  };
  const checkpointRes = await fetch(`${apiUrl}/ide-release-checkpoints/${ticketId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${checkpointToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(checkpointPayload),
    signal: AbortSignal.timeout(15_000),
  });
  if (!checkpointRes.ok) {
    throw new Error(`Release checkpoint failed (${checkpointRes.status}): ${await checkpointRes.text()}`);
  }

  process.stdout.write(`Ticket ${ticketId} released and transitioned to AWAITING_REPORTER_ACCEPTANCE!\n`);

  speakAsync(
    'Anh Danny ơi, em đã tự động merge commit vào main và deploy xong lên production rồi ạ. Ticket đã chuyển sang chờ nghiệm thu.'
  );

  process.exit(0);
}

async function main() {
  const token = resolveToken();
  const [command, ...args] = process.argv.slice(2);
  const taskIdIndex = args.indexOf('--task-id');
  const taskId =
    (taskIdIndex !== -1 ? args[taskIdIndex + 1] : null) ||
    process.env.ANTIGRAVITY_CONVERSATION_ID ||
    process.env.MOS_IDE_TASK_ID;
  const outputPath = args[args.indexOf('--out') + 1];
  const receiptPath = args[args.indexOf('--receipt') + 1];
  if (!taskId || (command === 'receive' && !outputPath) || (['submit', 'commit'].includes(command) && !receiptPath))
    throw new Error(
      'Usage: ide-task-bridge receive [--task-id <id>] --out <path> | submit [--task-id <id>] --receipt <path> | commit [--task-id <id>] --receipt <path> | wait-and-commit [--task-id <id>] --worktree <path> [--message <msg>] [--auto-deploy] | wait-and-deploy [--task-id <id>] --worktree <path> [--ticketId <id>]'
    );
  if (!['receive', 'submit', 'commit', 'wait-and-commit', 'wait-and-deploy'].includes(command))
    throw new Error('IDE task bridge command is invalid.');
  const apiUrl = resolveApiUrl();
  if (command === 'receive') {
    const response = await fetch(`${apiUrl}/ide-task-bridge/tasks/${encodeURIComponent(taskId)}/handoff`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`IDE task handoff unavailable (${response.status}).`);
    const payload = await response.json();
    mkdirSync(dirname(resolve(outputPath)), { recursive: true, mode: 0o700 });
    writeFileSync(resolve(outputPath), `${JSON.stringify(payload.data)}\n`, { mode: 0o600 });
    chmodSync(resolve(outputPath), 0o600);
    process.stdout.write('IDE handoff delivered to the requested private file.\n');
    return;
  }

  if (command === 'wait-and-deploy') {
    const worktreePath = resolve(args[args.indexOf('--worktree') + 1] || process.cwd());
    const ticketIdIndex = args.indexOf('--ticketId');
    const ticketIdOverride = ticketIdIndex !== -1 ? parseInt(args[ticketIdIndex + 1], 10) : undefined;
    await handleWaitAndDeploy(apiUrl, token, taskId, worktreePath, ticketIdOverride);
    return;
  }

  if (command === 'wait-and-commit') {
    const worktreePath = resolve(args[args.indexOf('--worktree') + 1] || process.cwd());
    const commitMessage =
      (args.indexOf('--message') !== -1 ? args[args.indexOf('--message') + 1] : null) ||
      'feat: implementation completed through mOS Inbox';
    const autoDeploy = args.includes('--auto-deploy');
    const pollIntervalMs = 5_000;
    const timeoutMs = 2 * 60 * 60 * 1000; // 2 hours
    const startTime = Date.now();

    process.stdout.write(
      `Listening for Danny's commit approval on mOS Inbox (polling every 5s for task ${taskId})...\n`
    );

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${apiUrl}/ide-task-bridge/tasks/${encodeURIComponent(taskId)}/handoff`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(10_000),
        });
        if (response.ok) {
          const payload = (await response.json()) as {
            data?: {
              phase: string;
              jobId: string;
              sourceVersion: string;
              planVersion: string;
              receiptNonce: string;
            };
          };
          if (payload?.data?.phase === 'IDE_COMMIT_HANDOFF' && payload.data.receiptNonce) {
            process.stdout.write("Danny's commit approval detected! Automatically committing...\n");
            const handoff = payload.data;

            execFileSync('git', ['-C', worktreePath, 'add', '.'], { stdio: 'inherit' });
            execFileSync('git', ['-C', worktreePath, 'commit', '-m', commitMessage], { stdio: 'inherit' });
            const commitSha = execFileSync('git', ['-C', worktreePath, 'rev-parse', 'HEAD'], {
              encoding: 'utf8',
            }).trim();

            const commitReceipt = {
              handoff: {
                jobId: handoff.jobId,
                sourceVersion: handoff.sourceVersion,
                planVersion: handoff.planVersion,
                receiptNonce: handoff.receiptNonce,
              },
              commitSha,
            };

            const submitRes = await fetch(
              `${apiUrl}/ide-task-bridge/tasks/${encodeURIComponent(taskId)}/commit-receipt`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ receipt: commitReceipt }),
                signal: AbortSignal.timeout(15_000),
              }
            );
            if (!submitRes.ok) throw new Error(`Commit receipt submission failed (${submitRes.status}).`);

            process.stdout.write(
              `IDE commit ${commitSha} recorded successfully. Ticket transitioned to Gate 3 (AWAITING_DANNY_DEPLOY_APPROVAL).\n`
            );

            speakAsync(
              'Anh Danny đã duyệt commit trên mOS Inbox. Em đã tự động commit và chuyển sang Cổng 3 cho anh rồi ạ.'
            );

            if (autoDeploy) {
              process.stdout.write('Auto-deploy enabled: continuing to listen for Gate 3 (deploy approval)...\n');
              await handleWaitAndDeploy(apiUrl, token, taskId, worktreePath);
            }
            process.exit(0);
          }
        }
      } catch {
        // Transient network failure during polling; retry
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
    throw new Error('Timed out waiting for commit approval from mOS Inbox.');
  }

  const receipt = JSON.parse(readFileSync(resolve(receiptPath), 'utf8'));
  const response = await fetch(
    `${apiUrl}/ide-task-bridge/tasks/${encodeURIComponent(taskId)}/${command === 'commit' ? 'commit-receipt' : 'receipt'}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt }),
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!response.ok) throw new Error(`IDE task receipt rejected (${response.status}).`);
  process.stdout.write(
    `IDE ${command === 'commit' ? 'commit' : 'code/test'} receipt submitted through the trusted bridge.\n`
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
