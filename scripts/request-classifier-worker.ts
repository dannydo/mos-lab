import type { RequestClassifierWorkerJobKind } from '@mos-lab/shared';
import WebSocket from 'ws';
import {
  HEARTBEAT_INTERVAL_MS,
  POLL_INTERVAL_MS,
  buildCodexExecArgs,
  buildCodexImplementationArgs,
  CodexCliError,
  formatInboxFollowUpFailure,
  formatInboxImplementationFailure,
  formatInboxPlanFailure,
  implementationWorktreeRoot,
  inboxFollowUpFailureCode,
  inboxImplementationFailureCode,
  inboxImplementationFailureSummary,
  inboxPlanFailureCode,
  isCodexImplementationHelpCompatible,
  resolveCodexCliPath,
  safeCodexCliFailureSummary,
  safeCodexCliJsonFailureSummary,
  type CodexCliFailureCode,
  type CodexCliRuntime,
} from './workers/classifier/codex-cli.js';
import { executeCodexCli } from './workers/classifier/codex-runner.js';
import {
  buildInboxFollowUpPrompt,
  inboxFollowUpOriginalEvidenceFiles,
  inboxImplementationSchema,
  missingOriginalEvidenceFollowUpResult,
  parseCodexClassification,
  parseCodexConversation,
  parseCodexInboxFollowUp,
  parseCodexInboxImplementation,
  parseCodexInboxPlan,
} from './workers/classifier/codex-schemas.js';
import { processInboxImplementationOne } from './workers/classifier/job-processor-implementation.js';
import {
  processConversationOne,
  processInboxFollowUpOne,
  processInboxPlanOne,
  processOne,
  processQualityGateRecoverySelfChecks,
} from './workers/classifier/job-processors-intake.js';
import {
  inboxVisualQaSyntheticStorage,
  privateVisualQaFailureCode,
  privateVisualQaScenarioForChangedFiles,
  runPrivateVisualQaScenario,
  runPrivateVisualQaSelfCheck,
  withWorkerOwnedVisualQaEvidence,
  type PrivateVisualQaFailureCode,
  type PrivateVisualQaScenario,
} from './workers/classifier/private-visual-qa.js';
import {
  clearActiveWorkerJob,
  configuration,
  getConnectionMode,
  recordWorkerOutcome,
  renewImplementationLeaseWithRetry,
  safeBridgeFailureCode,
  sendWorkerHealthHeartbeat,
  updateConnectionMode,
  websocketUrl,
} from './workers/classifier/worker-transport.js';
import { publishVerifiedIdeReleaseCheckpoint } from './workers/classifier/worktree-and-deploy.js';

export {
  buildCodexExecArgs,
  buildCodexImplementationArgs,
  buildInboxFollowUpPrompt,
  CodexCliError,
  executeCodexCli,
  formatInboxFollowUpFailure,
  formatInboxImplementationFailure,
  formatInboxPlanFailure,
  implementationWorktreeRoot,
  inboxFollowUpFailureCode,
  inboxFollowUpOriginalEvidenceFiles,
  inboxImplementationFailureCode,
  inboxImplementationFailureSummary,
  inboxImplementationSchema,
  inboxPlanFailureCode,
  inboxVisualQaSyntheticStorage,
  isCodexImplementationHelpCompatible,
  missingOriginalEvidenceFollowUpResult,
  parseCodexClassification,
  parseCodexConversation,
  parseCodexInboxFollowUp,
  parseCodexInboxImplementation,
  parseCodexInboxPlan,
  privateVisualQaFailureCode,
  privateVisualQaScenarioForChangedFiles,
  processInboxImplementationOne,
  publishVerifiedIdeReleaseCheckpoint,
  renewImplementationLeaseWithRetry,
  resolveCodexCliPath,
  runPrivateVisualQaScenario,
  runPrivateVisualQaSelfCheck,
  safeBridgeFailureCode,
  safeCodexCliFailureSummary,
  safeCodexCliJsonFailureSummary,
  withWorkerOwnedVisualQaEvidence,
  type CodexCliFailureCode,
  type CodexCliRuntime,
  type PrivateVisualQaFailureCode,
  type PrivateVisualQaScenario,
};

let draining = false;
async function runWorkerStep(kind: RequestClassifierWorkerJobKind, run: () => Promise<boolean>): Promise<boolean> {
  try {
    return await run();
  } catch (error) {
    clearActiveWorkerJob();
    recordWorkerOutcome(kind, 'FAILED', 'ERROR', safeBridgeFailureCode(error));
    void sendWorkerHealthHeartbeat();
    console.log(`Worker task class=${kind.toLowerCase()} phase=isolated code=${safeBridgeFailureCode(error)}`);
    return false;
  }
}

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (
      (await runWorkerStep('INBOX_IMPLEMENTATION', processQualityGateRecoverySelfChecks)) ||
      (await runWorkerStep('CLASSIFICATION', processOne)) ||
      (await runWorkerStep('CONVERSATION', processConversationOne)) ||
      (await runWorkerStep('INBOX_FOLLOW_UP', processInboxFollowUpOne)) ||
      (await runWorkerStep('INBOX_PLAN', processInboxPlanOne))
    ) {
      /* one serial worker preserves leases */
    }
  } catch (error) {
    clearActiveWorkerJob();
    recordWorkerOutcome('BRIDGE', 'FAILED', 'ERROR', safeBridgeFailureCode(error));
    void sendWorkerHealthHeartbeat();
    console.log('Worker bridge request failed.');
  } finally {
    draining = false;
  }
}

function runRealtime(): void {
  const config = configuration();
  let retryMs = 1_000;
  const connect = () => {
    const socket = new WebSocket(websocketUrl(config.apiUrl), {
      headers: { Authorization: `Bearer ${config.token}`, 'X-Worker-Id': config.workerId },
    });
    socket.on('open', () => {
      retryMs = 1_000;
      recordWorkerOutcome('BRIDGE', 'SUCCEEDED', 'INFO', 'CONNECTED');
      updateConnectionMode('WEBSOCKET');
      void drain();
    });
    socket.on('message', () => void drain());
    socket.on('error', () => undefined);
    socket.on('close', () => {
      updateConnectionMode('RECONNECTING');
      const delay = retryMs + Math.floor(Math.random() * 250);
      retryMs = Math.min(30_000, retryMs * 2);
      setTimeout(connect, delay);
    });
  };
  connect();
}

async function main(): Promise<void> {
  const once = process.argv.includes('--once');
  if (once) {
    await sendWorkerHealthHeartbeat();
    await drain();
    return;
  }
  await sendWorkerHealthHeartbeat();
  runRealtime();
  setInterval(() => {
    if (getConnectionMode() !== 'WEBSOCKET') updateConnectionMode('POLLING');
    void drain();
  }, POLL_INTERVAL_MS);
  setInterval(() => void sendWorkerHealthHeartbeat(), HEARTBEAT_INTERVAL_MS);
}

if (process.argv[1]?.endsWith('request-classifier-worker.ts')) {
  main().catch(() => {
    console.error('Request classifier worker could not start. Check its local configuration.');
    process.exitCode = 1;
  });
}
