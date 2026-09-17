import type { AcademyWorkshopLiveState, AcademyWorkshopQuiz, AcademyWorkshopRealtimeEvent } from '@mos-lab/shared';
import { resolveApiBaseUrl } from './api';

type WorkshopCryptoSource = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

export function createAcademyWorkshopIdempotencyKey(
  source: WorkshopCryptoSource | undefined = typeof globalThis === 'undefined' ? undefined : globalThis.crypto
) {
  if (typeof source?.randomUUID === 'function') return source.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof source?.getRandomValues === 'function') {
    source.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  const entropy = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `workshop-${Date.now().toString(36)}-${entropy}`;
}

export function academyWorkshopWebSocketUrl() {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const configured = process.env.NEXT_PUBLIC_API_URL;
    if (configured && !configured.startsWith('/')) {
      try {
        const url = new URL(configured, window.location.origin);
        const wsProto = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProto}//${url.host}${url.pathname.replace(/\/$/, '')}/academy/workshops/ws`;
      } catch {
        // Fall back to direct port 4001
      }
    }
    // Fastify API runs on port 4001 (direct WebSocket upgrade, bypasses Next.js rewrites which do not support WS proxying)
    return `${protocol}//${host}:4001/api/academy/workshops/ws`;
  }
  const apiUrl = resolveApiBaseUrl();
  return `${apiUrl.replace(/^http/, 'ws').replace(/\/$/, '')}/academy/workshops/ws`;
}

export function connectAcademyWorkshopSocket(options: {
  token: string;
  workshopId?: number;
  onState: (state: AcademyWorkshopLiveState) => void;
  onConnection?: (connected: boolean) => void;
}) {
  let socket: WebSocket | null = null;
  let disposed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disconnectDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;
  let isConnected = false;

  const sanitizedToken = String(options.token || '')
    .replace(/^Bearer\s+/i, '')
    .trim();

  const reportConnection = (connected: boolean) => {
    if (disconnectDebounceTimer) {
      clearTimeout(disconnectDebounceTimer);
      disconnectDebounceTimer = null;
    }
    if (connected) {
      if (!isConnected) {
        isConnected = true;
        options.onConnection?.(true);
      }
    } else {
      // Debounce disconnect notification by 2000ms to eliminate visual jitter/flicker
      // during brief reconnects or packet reordering.
      disconnectDebounceTimer = setTimeout(() => {
        if (!disposed && isConnected) {
          isConnected = false;
          options.onConnection?.(false);
        }
      }, 2000);
    }
  };

  const connect = () => {
    if (disposed) return;
    try {
      socket = new WebSocket(academyWorkshopWebSocketUrl());
    } catch {
      reportConnection(false);
      return;
    }

    socket.addEventListener('open', () => {
      // Send AUTH frame immediately. Do NOT mark connected = true yet;
      // wait until the server confirms with the first STATE_SNAPSHOT.
      socket?.send(JSON.stringify({ type: 'AUTH', token: sanitizedToken, workshopId: options.workshopId }));
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as AcademyWorkshopRealtimeEvent;
        if (payload.type === 'STATE_SNAPSHOT') {
          retryCount = 0;
          reportConnection(true);
          options.onState(payload.data);
        } else if (payload.type === 'ERROR') {
          console.warn('[WorkshopWS] Received error from server:', payload.data);
        }
      } catch {
        // Ignore non-protocol frames so a malformed broadcast cannot crash live UI.
      }
    });

    socket.addEventListener('close', (event) => {
      reportConnection(false);
      if (disposed) return;

      // If unauthorized (4401), stop tight loop retries to avoid flickering and server hammering.
      if (event.code === 4401) {
        console.warn('[WorkshopWS] Authentication rejected (code 4401). Retrying in 15s.');
        retryTimer = setTimeout(connect, 15_000);
        return;
      }

      const delay = Math.min(10_000, 1000 * 2 ** Math.min(retryCount++, 4));
      retryTimer = setTimeout(connect, delay);
    });

    socket.addEventListener('error', () => {
      // Allow close event to handle reconnection gracefully
    });
  };

  connect();
  return () => {
    disposed = true;
    if (disconnectDebounceTimer) clearTimeout(disconnectDebounceTimer);
    isConnected = false;
    options.onConnection?.(false);
    if (retryTimer) clearTimeout(retryTimer);
    socket?.close();
  };
}

export function workshopRemainingMs(target: string | null | undefined, serverNow: string, receivedAtMs: number) {
  if (!target) return 0;
  const serverOffset = new Date(serverNow).getTime() - receivedAtMs;
  return new Date(target).getTime() - (Date.now() + serverOffset);
}

export function isWorkshopQuestionExpired(
  status: AcademyWorkshopQuiz['status'] | null | undefined,
  remainingSeconds: number
) {
  return status === 'QUESTION_OPEN' && remainingSeconds <= 0;
}

export function formatWorkshopClock(totalSeconds: number) {
  const absolute = Math.abs(Math.round(totalSeconds));
  const minutes = Math.floor(absolute / 60);
  const seconds = absolute % 60;
  return `${totalSeconds < 0 ? '+' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function workshopInitials(name: string) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}
