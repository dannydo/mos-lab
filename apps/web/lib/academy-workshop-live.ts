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
  const apiUrl = resolveApiBaseUrl();
  const absoluteApiUrl = typeof window === 'undefined' ? apiUrl : new URL(apiUrl, window.location.origin).toString();
  return `${absoluteApiUrl.replace(/^http/, 'ws').replace(/\/$/, '')}/academy/workshops/ws`;
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
  let retryCount = 0;

  const connect = () => {
    if (disposed) return;
    socket = new WebSocket(academyWorkshopWebSocketUrl());
    socket.addEventListener('open', () => {
      retryCount = 0;
      options.onConnection?.(true);
      socket?.send(JSON.stringify({ type: 'AUTH', token: options.token, workshopId: options.workshopId }));
    });
    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as AcademyWorkshopRealtimeEvent;
        if (payload.type === 'STATE_SNAPSHOT') options.onState(payload.data);
      } catch {
        // Ignore non-protocol frames so a malformed broadcast cannot crash live UI.
      }
    });
    socket.addEventListener('close', () => {
      options.onConnection?.(false);
      if (disposed) return;
      const delay = Math.min(10_000, 500 * 2 ** retryCount++);
      retryTimer = setTimeout(connect, delay);
    });
    socket.addEventListener('error', () => socket?.close());
  };

  connect();
  return () => {
    disposed = true;
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
