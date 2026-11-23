import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import type {
  RequestClassifierWorkerConnectionMode,
  RequestClassifierWorkerHeartbeatRequest,
  RequestClassifierWorkerJobKind,
} from '@mos-lab/shared';
import {
  DEFAULT_API_URL,
  IMPLEMENTATION_LEASE_RENEWAL_ATTEMPTS,
  IMPLEMENTATION_LEASE_RENEWAL_BACKOFF_MS,
  WORKER_FETCH_TIMEOUT_MS,
} from './codex-cli.js';

export function loadLocalWorkerEnv(): void {
  for (const filePath of ['.env', 'apps/api/.env']) {
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const match = line.match(
        /^\s*(MOS_REQUEST_CLASSIFIER_WORKER_TOKEN|MOS_REQUEST_CLASSIFIER_API_URL|MOS_REQUEST_CLASSIFIER_WORKER_ID|MOS_REQUEST_CLASSIFIER_WORKER_VERSION|MOS_IDE_RELEASE_CHECKPOINT_TOKEN|MOS_IDE_RELEASE_WEB_RELEASE_URL)\s*=\s*(.*?)\s*$/
      );
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

export function configuration() {
  loadLocalWorkerEnv();
  const token = String(process.env.MOS_REQUEST_CLASSIFIER_WORKER_TOKEN || '').trim();
  if (token.length < 32) throw new Error('Thiếu MOS_REQUEST_CLASSIFIER_WORKER_TOKEN (tối thiểu 32 ký tự).');
  return {
    apiUrl: String(process.env.MOS_REQUEST_CLASSIFIER_API_URL || DEFAULT_API_URL).replace(/\/+$/, ''),
    token,
    workerId: String(process.env.MOS_REQUEST_CLASSIFIER_WORKER_ID || `mac-${hostname()}`)
      .trim()
      .slice(0, 100),
    workerVersion: String(process.env.MOS_REQUEST_CLASSIFIER_WORKER_VERSION || 'request-classifier-worker-v2')
      .trim()
      .slice(0, 100),
  };
}

export async function workerFetch(path: string, init?: RequestInit): Promise<Response> {
  const config = configuration();
  const timeoutSignal = AbortSignal.timeout(WORKER_FETCH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      ...init,
      signal,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'X-Worker-Id': config.workerId,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error('Worker bridge request timed out.');
    }
    throw error;
  }
  if (!response.ok)
    throw new Error(
      `Worker bridge ${
        path.includes('inbox-plans')
          ? 'inbox-plan'
          : path.includes('inbox-implementations')
            ? 'inbox-implementation'
            : path.includes('inbox-follow-ups')
              ? 'inbox-follow-up'
              : 'classifier'
      } HTTP ${response.status}`
    );
  return response;
}

/**
 * The trusted production deploy intentionally restarts the API. Its final
 * callback is safe to retry because it carries the same lease token and the
 * server remains the sole authority for the state transition.
 */
export async function workerFetchAfterProductionRestart(path: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await workerFetch(path, init);
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolveWait) => setTimeout(resolveWait, 1_000 * 2 ** attempt));
    }
  }
  throw lastError;
}

/**
 * A running implementation has a twelve-minute server lease. A single
 * transient bridge failure must not terminate Codex immediately and turn into
 * a reporter-visible retry.
 */
export async function renewImplementationLeaseWithRetry(
  renew: () => Promise<void>,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolveWait) => setTimeout(resolveWait, milliseconds))
): Promise<boolean> {
  for (let attempt = 0; attempt < IMPLEMENTATION_LEASE_RENEWAL_ATTEMPTS; attempt += 1) {
    try {
      await renew();
      return true;
    } catch {
      if (attempt < IMPLEMENTATION_LEASE_RENEWAL_ATTEMPTS - 1) {
        await wait(IMPLEMENTATION_LEASE_RENEWAL_BACKOFF_MS * 2 ** attempt);
      }
    }
  }
  return false;
}

type ActiveWorkerJob = { kind: RequestClassifierWorkerJobKind; startedAt: string } | null;

const workerSessionId = randomUUID();
let heartbeatSequence = 0;
let connectionMode: RequestClassifierWorkerConnectionMode = 'STARTING';
let activeWorkerJob: ActiveWorkerJob = null;
let latestWorkerOutcome: RequestClassifierWorkerHeartbeatRequest['latestOutcome'] = null;

export function getConnectionMode(): RequestClassifierWorkerConnectionMode {
  return connectionMode;
}

export function clearActiveWorkerJob(): void {
  activeWorkerJob = null;
}

export function safeBridgeFailureCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/HTTP 401|HTTP 403/.test(message)) return 'BRIDGE_AUTH_FAILED';
  if (/HTTP 404/.test(message)) return 'BRIDGE_PROTOCOL_MISMATCH';
  if (/HTTP 429/.test(message)) return 'BRIDGE_RATE_LIMITED';
  if (/HTTP 5\d\d/.test(message)) return 'BRIDGE_SERVER_ERROR';
  return 'BRIDGE_REQUEST_FAILED';
}

export function recordWorkerOutcome(
  kind: RequestClassifierWorkerJobKind | 'BRIDGE',
  status: 'SUCCEEDED' | 'FAILED',
  severity: 'INFO' | 'WARNING' | 'ERROR',
  code: string
): void {
  latestWorkerOutcome = { kind, status, severity, code, occurredAt: new Date().toISOString() };
}

export function beginWorkerJob(kind: RequestClassifierWorkerJobKind): void {
  activeWorkerJob = { kind, startedAt: new Date().toISOString() };
  void sendWorkerHealthHeartbeat();
}

export function finishWorkerJob(
  kind: RequestClassifierWorkerJobKind,
  status: 'SUCCEEDED' | 'FAILED',
  severity: 'INFO' | 'WARNING',
  code: string
): void {
  activeWorkerJob = null;
  recordWorkerOutcome(kind, status, severity, code);
  void sendWorkerHealthHeartbeat();
}

export function updateConnectionMode(next: RequestClassifierWorkerConnectionMode): void {
  connectionMode = next;
  void sendWorkerHealthHeartbeat();
}

/**
 * This is intentionally one-way operational telemetry. It contains no ticket
 * identifiers, employee text, attachments, prompts, authorization data, or
 * structured Codex output.
 */
export async function sendWorkerHealthHeartbeat(): Promise<void> {
  const config = configuration();
  const payload: RequestClassifierWorkerHeartbeatRequest = {
    workerId: config.workerId,
    workerVersion: config.workerVersion || 'request-classifier-worker-v2',
    sessionId: workerSessionId,
    sequence: ++heartbeatSequence,
    sentAt: new Date().toISOString(),
    connectionMode,
    activeJob: activeWorkerJob,
    latestOutcome: latestWorkerOutcome,
  };
  try {
    await workerFetch('/request-classifier/health/heartbeat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    console.log('Worker health heartbeat unavailable.');
  }
}

export function websocketUrl(apiUrl: string): string {
  return `${apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')}/request-classifier/stream`;
}
