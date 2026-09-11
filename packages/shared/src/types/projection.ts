/**
 * Read-model projection state. A projection is durable, reconcilable data;
 * it is deliberately not a best-effort TTL cache.
 */
export type ProjectionFreshness = 'FRESH' | 'PENDING' | 'STALE' | 'FAILED' | 'FALLBACK';

export interface CustomerVisitProjectionValue {
  legacyUserId: number;
  lastVisitAt: string | null;
  daysSinceLastVisit: number | null;
  freshness: ProjectionFreshness;
  computedAt: string | null;
}

export interface ProjectionOperationalSummary {
  projectionKey: string;
  freshCount: number;
  pendingCount: number;
  failedCount: number;
  oldestComputedAt: string | null;
}
