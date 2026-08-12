import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = 15000): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }

  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
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
