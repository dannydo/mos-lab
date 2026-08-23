import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * The cache is used for filter-specific dashboard reads, so its key space can
   * grow continuously during a long-lived process. Keep it bounded and use the
   * Map insertion order as a small LRU queue.
   */
  constructor(private readonly maxEntries: number = 500) {}

  get size(): number {
    return this.store.size;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Refresh insertion order so frequently-read entries survive eviction.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = 15000): void {
    if (ttlMs <= 0 || this.maxEntries <= 0) return;

    this.deleteExpired();
    this.store.delete(key);
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });

    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
  }

  clear(): void {
    this.store.clear();
  }

  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.store.keys()) {
      // Global/sticky regular expressions retain lastIndex between tests.
      regex.lastIndex = 0;
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  private deleteExpired(now: number = Date.now()): void {
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

export const memoryCache = new MemoryCache();

declare module 'fastify' {
  interface FastifyInstance {
    cache: MemoryCache;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate('cache', memoryCache);
});
