import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  CODEX_STOP_GRACE_MS,
  CODEX_TIMEOUT_MS,
  CodexCliError,
  buildCodexExecArgs,
  resolveCodexCliPath,
  safeCodexCliFailureSummary,
  safeCodexCliJsonFailureSummary,
  type CodexCliFailureCode,
  type CodexCliLifecycle,
  type CodexCliRuntime,
  type SpawnProcess,
} from './codex-cli.js';

export function terminateCodexProcessGroup(processId: number | null, child: ChildProcess): () => void {
  if (processId && process.platform !== 'win32') {
    try {
      process.kill(-processId, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
    const escalation = setTimeout(() => {
      try {
        process.kill(-processId, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }, CODEX_STOP_GRACE_MS);
    escalation.unref();
    return () => clearTimeout(escalation);
  }
  child.kill('SIGTERM');
  return () => undefined;
}

export async function executeCodexCli(
  command: string,
  args: readonly string[],
  cwd: string,
  timeoutMs = CODEX_TIMEOUT_MS,
  spawnProcess: SpawnProcess = spawn,
  environment?: NodeJS.ProcessEnv,
  lifecycle?: CodexCliLifecycle,
  timeoutCode: CodexCliFailureCode = 'CODEX_EXEC_TIMEOUT'
): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    let finished = false;
    let spawned = false;
    let lifecycleReady = !lifecycle?.onStarted;
    let pendingTermination: { code: number | null; signal: NodeJS.Signals | null } | null = null;
    let forcedFailure: CodexCliError | null = null;
    let forceTimer: NodeJS.Timeout | null = null;
    let terminationGraceExpired = false;
    let cancelTermination: (() => void) | null = null;
    let timeout: NodeJS.Timeout | null = null;
    let stdoutTail = '';
    let stderrTail = '';
    const finish = (callback: () => void) => {
      if (finished) return;
      finished = true;
      if (timeout) clearTimeout(timeout);
      if (forceTimer) clearTimeout(forceTimer);
      cancelTermination?.();
      callback();
    };
    const child = spawnProcess(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: process.platform !== 'win32',
      ...(environment ? { env: environment } : {}),
    });
    const runtime: CodexCliRuntime = {
      processId: typeof child.pid === 'number' && child.pid > 0 ? child.pid : null,
      terminate: (code) => {
        if (finished || forcedFailure) return;
        forcedFailure = new CodexCliError(code);
        cancelTermination = terminateCodexProcessGroup(runtime.processId, child);
        forceTimer = setTimeout(() => {
          terminationGraceExpired = true;
          if (lifecycleReady) finish(() => reject(forcedFailure as CodexCliError));
        }, CODEX_STOP_GRACE_MS);
      },
    };
    timeout = setTimeout(() => {
      runtime.terminate(timeoutCode);
    }, timeoutMs);
    const markActivity = () => lifecycle?.onActivity?.();
    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdoutTail = `${stdoutTail}${String(chunk)}`.slice(-2_048);
      markActivity();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderrTail = `${stderrTail}${String(chunk)}`.slice(-2_048);
      markActivity();
    });
    child.once('error', () => {
      if (!spawned) {
        finish(() => reject(new CodexCliError('CODEX_EXEC_FAILED')));
        return;
      }
      runtime.terminate('CODEX_EXEC_FAILED');
    });
    const handleTermination = (code: number | null, signal: NodeJS.Signals | null) => {
      if (!lifecycleReady) {
        pendingTermination = { code, signal };
        return;
      }
      if (forcedFailure) {
        finish(() => reject(forcedFailure as CodexCliError));
        return;
      }
      if (code === 0) finish(resolvePromise);
      else if (signal) finish(() => reject(new CodexCliError('CODEX_EXEC_SIGNAL')));
      else
        finish(() =>
          reject(
            new CodexCliError(
              `CODEX_EXEC_EXIT_${typeof code === 'number' && Number.isInteger(code) ? code : -1}`,
              safeCodexCliJsonFailureSummary(stdoutTail) || safeCodexCliFailureSummary(stderrTail)
            )
          )
        );
    };
    const completeLifecycle = () => {
      lifecycleReady = true;
      if (pendingTermination) {
        handleTermination(pendingTermination.code, pendingTermination.signal);
        return;
      }
      if (forcedFailure && terminationGraceExpired) finish(() => reject(forcedFailure as CodexCliError));
    };
    child.once('spawn', () => {
      spawned = true;
      if (!lifecycle?.onStarted) return;
      Promise.resolve(lifecycle.onStarted(runtime))
        .then(completeLifecycle)
        .catch(() => {
          runtime.terminate('LEASE_START_FAILED');
          completeLifecycle();
        });
    });
    child.once('exit', handleTermination);
    child.once('close', handleTermination);
  });
}

export async function invokeStructuredCodex(
  schemaPath: string,
  workDir: string,
  outputName: string,
  prompt: string
): Promise<string> {
  const outputPath = join(workDir, outputName);
  await executeCodexCli(resolveCodexCliPath(), buildCodexExecArgs(schemaPath, outputPath, prompt), workDir);
  try {
    return await readFile(outputPath, 'utf8');
  } catch {
    throw new CodexCliError('CODEX_OUTPUT_MISSING');
  }
}
