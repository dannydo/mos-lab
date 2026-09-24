import axios from 'axios';
import api, { resolveApiBaseUrl, resolveMediaUrl } from '../api';

export interface ApiRequestOptions {
  signal?: AbortSignal;
  isPolling?: boolean;
  priority?: 'high' | 'low' | 'auto';
  timeout?: number;
}

// In-flight request deduplication & short-term cache map for GET endpoints.
// Keep this bounded: list filters can generate a large number of distinct keys
// during a long dashboard session.
const MAX_SHORT_LIVED_GET_CACHE_ENTRIES = 250;
const inFlightRequests = new Map<string, { promise: Promise<unknown>; expiresAt: number }>();
const inFlightOnlyRequests = new Map<string, Promise<unknown>>();

export function stableCacheKey(url: string, params?: unknown): string {
  return `${url}_${stableSerialize(params ?? {})}`;
}

export function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toJSON());
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

function pruneShortLivedGetCache(now: number): void {
  for (const [key, entry] of inFlightRequests) {
    if (entry.expiresAt <= now) inFlightRequests.delete(key);
  }

  while (inFlightRequests.size > MAX_SHORT_LIVED_GET_CACHE_ENTRIES) {
    const oldestKey = inFlightRequests.keys().next().value;
    if (oldestKey === undefined) break;
    inFlightRequests.delete(oldestKey);
  }
}

export async function dedupeApiGet<T>(
  url: string,
  params?: Record<string, unknown>,
  ttlMs: number = 3000,
  options?: ApiRequestOptions
): Promise<T> {
  const cacheKey = stableCacheKey(url, params);
  const now = Date.now();
  pruneShortLivedGetCache(now);
  const existing = inFlightRequests.get(cacheKey);

  if (existing && existing.expiresAt > now) {
    return existing.promise as Promise<T>;
  }

  const promise = (async () => {
    try {
      const response = await api.get(url, {
        params,
        signal: options?.signal,
        isPolling: options?.isPolling,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return response.data as T;
    } catch (err) {
      inFlightRequests.delete(cacheKey);
      throw err;
    }
  })();

  inFlightRequests.set(cacheKey, { promise, expiresAt: now + Math.max(0, ttlMs) });
  pruneShortLivedGetCache(now);
  return promise as Promise<T>;
}

/**
 * Drops completed short-lived GET entries after a write. It intentionally does
 * not cancel an existing request; a post-mutation refetch receives a new
 * request rather than a cache entry produced before the write completed.
 */
export function invalidateApiGetCache(urlPrefixes: readonly string[]): void {
  for (const cacheKey of inFlightRequests.keys()) {
    if (urlPrefixes.some((prefix) => cacheKey.startsWith(prefix))) {
      inFlightRequests.delete(cacheKey);
    }
  }
  for (const cacheKey of inFlightOnlyRequests.keys()) {
    if (urlPrefixes.some((prefix) => cacheKey.startsWith(prefix))) {
      inFlightOnlyRequests.delete(cacheKey);
    }
  }
}

export function invalidateAcademySalesReadCache(): void {
  invalidateApiGetCache(['/academy-sales/']);
}

// Coalesce concurrent reads without retaining completed data. This is safe for
// mutation follow-ups that must always fetch fresh results, while avoiding
// duplicate requests caused by React Strict Mode during page initialization.
export function dedupeInFlightApiGet<T>(url: string, params?: unknown, options?: ApiRequestOptions): Promise<T> {
  const cacheKey = stableCacheKey(url, params);
  const existing = inFlightOnlyRequests.get(cacheKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = api
    .get(url, {
      params,
      signal: options?.signal,
      isPolling: options?.isPolling,
      priority: options?.priority,
      timeout: options?.timeout,
    })
    .then((response) => response.data as T);

  inFlightOnlyRequests.set(cacheKey, promise);

  if (options?.signal) {
    options.signal.addEventListener(
      'abort',
      () => {
        if (inFlightOnlyRequests.get(cacheKey) === promise) {
          inFlightOnlyRequests.delete(cacheKey);
        }
      },
      { once: true }
    );
  }

  promise.then(
    () => {
      if (inFlightOnlyRequests.get(cacheKey) === promise) {
        inFlightOnlyRequests.delete(cacheKey);
      }
    },
    () => {
      if (inFlightOnlyRequests.get(cacheKey) === promise) {
        inFlightOnlyRequests.delete(cacheKey);
      }
    }
  );

  return promise;
}

class PollingCoordinator {
  private controllers = new Map<string, AbortController>();

  getSignal(key: string): AbortSignal {
    const existing = this.controllers.get(key);
    if (existing) {
      existing.abort(new DOMException('Superceded by newer polling cycle', 'AbortError'));
    }
    const next = new AbortController();
    this.controllers.set(key, next);
    return next.signal;
  }

  abort(key: string, reason?: string): void {
    const existing = this.controllers.get(key);
    if (existing) {
      existing.abort(new DOMException(reason || 'Polling aborted', 'AbortError'));
      this.controllers.delete(key);
    }
  }

  abortAll(reason?: string): void {
    for (const controller of this.controllers.values()) {
      controller.abort(new DOMException(reason || 'All polling aborted', 'AbortError'));
    }
    this.controllers.clear();
  }
}

export const pollingCoordinator = new PollingCoordinator();

export async function pollWithAbort<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  onSuccess?: (data: T) => void
): Promise<T | undefined> {
  const signal = pollingCoordinator.getSignal(key);
  try {
    const data = await fetcher(signal);
    if (!signal.aborted) {
      onSuccess?.(data);
      return data;
    }
  } catch (err: unknown) {
    if (axios.isCancel(err) || (err instanceof Error && (err.name === 'AbortError' || err.name === 'CanceledError'))) {
      return undefined;
    }
    throw err;
  }
  return undefined;
}

export { api, resolveApiBaseUrl, resolveMediaUrl };
export default api;
