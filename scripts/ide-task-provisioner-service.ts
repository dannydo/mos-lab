import {
  createCodexTask,
  prepareIdeWorktree,
  readManagedRuntimeConfig,
  readToken,
  runProvisionerOnce,
  runtimePath,
} from './ide-task-provisioner.js';

const POLL_INTERVAL_MS = 30_000;

function delay(ms: number) {
  return new Promise<void>((resolveDelay) => setTimeout(resolveDelay, ms));
}

/** One bounded poll is exported so reconnect/idempotency stays testable. */
export async function runManagedProvisionerPoll() {
  const config = readManagedRuntimeConfig();
  return runProvisionerOnce({
    apiUrl: config.apiUrl,
    createTask: createCodexTask,
    fetch,
    ledgerPath: runtimePath(),
    prepareWorktree: prepareIdeWorktree,
    provisionerId: config.provisionerId,
    token: readToken(),
  });
}

async function main() {
  // launchd owns restarts. A failed poll never fabricates a task or consumes a
  // nonce; it simply retries the same server-side provisioning request later.
  for (;;) {
    try {
      await runManagedProvisionerPoll();
    } catch (error) {
      process.stderr.write(
        `IDE task provisioner poll deferred: ${error instanceof Error ? error.message : 'unknown error'}\n`
      );
    }
    await delay(POLL_INTERVAL_MS);
  }
}

if (process.argv[1]?.endsWith('ide-task-provisioner-service.ts')) void main();
