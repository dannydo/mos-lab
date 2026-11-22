import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';

export const BK_CLIENT_PHONE_SELECT_SQL = `COALESCE((
          SELECT uc.phone_number
          FROM user_contact uc
          WHERE uc.user_id = o.user_id AND uc.is_disabled = 0
          ORDER BY uc.id DESC
          LIMIT 1
        ), '') as clientPhone`;

export function parseBkDateRangeParts(dateFrom?: string, dateTo?: string): { startPart: string; endPart: string } {
  const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
  const endStr = dateTo || new Date().toLocaleDateString('en-CA');
  return {
    startPart: startStr.includes('T') ? startStr.split('T')[0] : startStr,
    endPart: endStr.includes('T') ? endStr.split('T')[0] : endStr,
  };
}

export function buildBkStoreFilter(storeId?: string): string {
  if (storeId && storeId !== 'ALL') {
    return `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
  }
  return '';
}

export function buildBkOrderDateWindowCondition(startPart: string, endPart: string): string {
  return `(
        (ro.actual_booking_date_start >= '${startPart} 00:00:00' AND ro.actual_booking_date_start <= '${endPart} 23:59:59')
        OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${startPart} 00:00:00' AND o.booking_date_start <= '${endPart} 23:59:59')
      )`;
}

export interface BkSwrCacheState<T = SafeAny> {
  inFlight: Map<string, Promise<T>>;
  computedAt: Map<string, number>;
}

export function createBkSwrCacheState<T = SafeAny>(): BkSwrCacheState<T> {
  return {
    inFlight: new Map<string, Promise<T>>(),
    computedAt: new Map<string, number>(),
  };
}

export async function resolveWithBkSwrCache<T>(options: {
  fastify: FastifyInstance;
  cacheKey: string;
  state: BkSwrCacheState<T>;
  freshTtlMs: number;
  staleMaxAgeMs?: number;
  cacheTtlMs: number;
  logTag: string;
  compute: (ctx: { skipCache: () => void }) => Promise<T>;
}): Promise<T> {
  const { fastify, cacheKey, state, freshTtlMs, staleMaxAgeMs, cacheTtlMs, logTag, compute } = options;
  const now = Date.now();
  const cached = fastify.cache?.get<T>(cacheKey);

  const runAndPersist = async (): Promise<T> => {
    let shouldCache = true;
    const result = await compute({
      skipCache: () => {
        shouldCache = false;
      },
    });
    if (shouldCache) {
      state.computedAt.set(cacheKey, Date.now());
      fastify.cache?.set(cacheKey, result, cacheTtlMs);
    }
    return result;
  };

  if (cached) {
    const computedAt = state.computedAt.get(cacheKey) || now;
    const age = now - computedAt;

    if (age < freshTtlMs) {
      return cached;
    }

    if (staleMaxAgeMs === undefined || age < staleMaxAgeMs) {
      if (!state.inFlight.has(cacheKey)) {
        const revalidatePromise = (async () => {
          try {
            return await runAndPersist();
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            fastify.log?.warn?.({ err }, `${logTag} Background SWR revalidation failed: ${errMsg}`);
            return cached;
          } finally {
            state.inFlight.delete(cacheKey);
          }
        })();
        state.inFlight.set(cacheKey, revalidatePromise);
      }
      return cached;
    }
  }

  const inFlight = state.inFlight.get(cacheKey);
  if (inFlight) {
    return await inFlight;
  }

  const computePromise = runAndPersist().finally(() => {
    state.inFlight.delete(cacheKey);
  });
  state.inFlight.set(cacheKey, computePromise);
  return await computePromise;
}
