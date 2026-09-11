import type { FastifyInstance } from 'fastify';
import type { CustomerVisitProjectionValue, ProjectionOperationalSummary } from '@mos-lab/shared';

export const CUSTOMER_VISIT_PROJECTION_KEY = 'customer-visit';
export const CUSTOMER_VISIT_FORMULA_VERSION = 'visit-v1';

type CanonicalVisitRow = {
  userId: number;
  lastVisitAt: Date | string | null;
};

type ProjectionJob = {
  id: number;
  entityKey: string;
  sourceRevision: string;
};

const ictDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function uniquePositiveIds(values: readonly number[]): number[] {
  return Array.from(new Set(values.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0)));
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function ictDateKey(value: Date): string {
  const parts = ictDateFormatter.formatToParts(value);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get('year')}-${byType.get('month')}-${byType.get('day')}`;
}

/** Date-only difference in the business timezone, matching the legacy DATEDIFF intent. */
export function daysSinceVisit(lastVisitAt: Date | string | null, now = new Date()): number | null {
  const parsed = lastVisitAt instanceof Date ? lastVisitAt : lastVisitAt ? new Date(lastVisitAt) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  const from = Date.parse(`${ictDateKey(parsed)}T00:00:00.000Z`);
  const to = Date.parse(`${ictDateKey(now)}T00:00:00.000Z`);
  return Math.floor((to - from) / 86_400_000);
}

export function customerVisitSourceRevision(userId: number, lastVisitAt: Date | string | null): string {
  return `${CUSTOMER_VISIT_FORMULA_VERSION}:${userId}:${iso(lastVisitAt) || 'none'}`;
}

function fromProjection(row: {
  legacyUserId: number;
  lastVisitAt: Date | null;
  computedAt: Date;
}): CustomerVisitProjectionValue {
  return {
    legacyUserId: row.legacyUserId,
    lastVisitAt: iso(row.lastVisitAt),
    daysSinceLastVisit: daysSinceVisit(row.lastVisitAt),
    freshness: 'FRESH',
    computedAt: row.computedAt.toISOString(),
  };
}

/**
 * Central canonical calculation. Preserve the existing Campaign semantics:
 * COALESCE(MAX(actual), MAX(booking)), not MAX(COALESCE(actual, booking)).
 */
async function canonicalVisits(fastify: FastifyInstance, ids: number[]): Promise<CanonicalVisitRow[]> {
  if (ids.length === 0) return [];
  const idList = ids.join(',');
  return fastify.prisma.legacy.$queryRawUnsafe<CanonicalVisitRow[]>(`
    SELECT
      o.user_id AS userId,
      COALESCE(MAX(ro.actual_booking_date_start), MAX(o.booking_date_start)) AS lastVisitAt
    FROM \`order\` o
    LEFT JOIN report_order ro ON o.id = ro.order_id
    WHERE o.user_id IN (${idList}) AND o.order_state = 'Completed'
    GROUP BY o.user_id
  `);
}

export class CustomerVisitProjectionService {
  /**
   * Fast read path. Missing data uses the existing canonical query for only
   * those rows and schedules a durable rebuild; it never silently serves stale
   * values as though they were live.
   */
  static async readForCustomers(
    fastify: FastifyInstance,
    rawIds: readonly number[]
  ): Promise<CustomerVisitProjectionValue[]> {
    const ids = uniquePositiveIds(rawIds);
    if (ids.length === 0) return [];

    const stored = await fastify.prisma.crm.crmCustomerVisitProjection.findMany({
      where: {
        legacyUserId: { in: ids },
        formulaVersion: CUSTOMER_VISIT_FORMULA_VERSION,
        status: 'FRESH',
      },
      select: { legacyUserId: true, lastVisitAt: true, computedAt: true },
    });
    const values = new Map(stored.map((row) => [row.legacyUserId, fromProjection(row)]));
    const missing = ids.filter((id) => !values.has(id));
    if (missing.length === 0) return ids.map((id) => values.get(id)!);

    // The canonical fallback is intentionally limited to only missing rows.
    const fallbackRows = await this.readCanonicalForCustomers(fastify, missing);
    for (const row of fallbackRows) values.set(row.legacyUserId, row);
    void this.enqueue(fastify, missing, 'READ_MISS').catch((error) =>
      fastify.log.warn({ error, count: missing.length }, 'Customer visit projection enqueue failed')
    );
    return ids.map((id) => values.get(id)!);
  }

  /** The exact legacy implementation retained for rollout fallback and parity tests. */
  static async readCanonicalForCustomers(
    fastify: FastifyInstance,
    rawIds: readonly number[]
  ): Promise<CustomerVisitProjectionValue[]> {
    const ids = uniquePositiveIds(rawIds);
    const canonical = await canonicalVisits(fastify, ids);
    const canonicalByUser = new Map(canonical.map((row) => [Number(row.userId), row.lastVisitAt || null]));
    return ids.map((legacyUserId) => {
      const lastVisitAt = canonicalByUser.get(legacyUserId) || null;
      return {
        legacyUserId,
        lastVisitAt: iso(lastVisitAt),
        daysSinceLastVisit: daysSinceVisit(lastVisitAt),
        freshness: 'FALLBACK',
        computedAt: null,
      };
    });
  }

  /** Coalesces duplicate rebuilds per customer; a newer request supersedes an in-flight lease. */
  static async enqueue(fastify: FastifyInstance, rawIds: readonly number[], reason: string): Promise<number> {
    const ids = uniquePositiveIds(rawIds);
    const safeReason = reason.slice(0, 80) || 'UNKNOWN';
    const now = new Date();
    // MySQL's emulated Prisma upsert can race on a composite unique key. Create
    // first and coalesce a duplicate into an update, preserving one durable job.
    for (const id of ids) {
      const entityKey = String(id);
      const sourceRevision = `${now.toISOString()}:${id}`;
      try {
        await fastify.prisma.crm.crmProjectionJob.create({
          data: {
            projectionKey: CUSTOMER_VISIT_PROJECTION_KEY,
            entityKey,
            sourceRevision,
            reason: safeReason,
            status: 'PENDING',
            availableAt: now,
          },
        });
      } catch (error: unknown) {
        const duplicate =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: string }).code === 'P2002';
        if (!duplicate) throw error;
        await fastify.prisma.crm.crmProjectionJob.update({
          where: {
            projectionKey_entityKey: { projectionKey: CUSTOMER_VISIT_PROJECTION_KEY, entityKey },
          },
          data: {
            sourceRevision,
            reason: safeReason,
            status: 'PENDING',
            availableAt: now,
            leasedBy: null,
            leaseExpiresAt: null,
            lastError: null,
          },
        });
      }
    }
    return ids.length;
  }

  static async enqueueRecentLegacyChanges(fastify: FastifyInstance, lookbackMinutes = 15): Promise<number> {
    const boundedMinutes = Math.min(Math.max(Math.floor(lookbackMinutes), 1), 24 * 60);
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ userId: number }>>(`
      SELECT DISTINCT user_id AS userId
      FROM \`order\`
      WHERE date_updated IS NOT NULL
        AND date_updated >= DATE_SUB(NOW(), INTERVAL ${boundedMinutes} MINUTE)
    `);
    return this.enqueue(
      fastify,
      rows.map((row) => Number(row.userId)),
      'LEGACY_DELTA'
    );
  }

  /** Re-reads canonical Legacy data for every active campaign customer. */
  static async enqueueCampaignReconciliation(fastify: FastifyInstance): Promise<number> {
    const rows = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: { removedAt: null },
      distinct: ['legacyUserId'],
      select: { legacyUserId: true },
    });
    return this.enqueue(
      fastify,
      rows.map((row) => row.legacyUserId),
      'RECONCILIATION'
    );
  }

  static async processBatch(fastify: FastifyInstance, workerId: string, limit = 50): Promise<number> {
    const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
    const jobs: ProjectionJob[] = [];
    for (let index = 0; index < boundedLimit; index += 1) {
      const job = await this.claimNext(fastify, workerId);
      if (!job) break;
      jobs.push(job);
    }
    if (jobs.length === 0) return 0;
    await this.processClaimedJobs(fastify, workerId, jobs);
    return jobs.length;
  }

  static async operationalSummary(fastify: FastifyInstance): Promise<ProjectionOperationalSummary> {
    const [freshCount, pendingCount, failedCount, oldest] = await Promise.all([
      fastify.prisma.crm.crmCustomerVisitProjection.count({
        where: { formulaVersion: CUSTOMER_VISIT_FORMULA_VERSION, status: 'FRESH' },
      }),
      fastify.prisma.crm.crmProjectionJob.count({
        where: { projectionKey: CUSTOMER_VISIT_PROJECTION_KEY, status: { in: ['PENDING', 'LEASED'] } },
      }),
      fastify.prisma.crm.crmProjectionJob.count({
        where: { projectionKey: CUSTOMER_VISIT_PROJECTION_KEY, status: 'FAILED' },
      }),
      fastify.prisma.crm.crmCustomerVisitProjection.findFirst({
        where: { formulaVersion: CUSTOMER_VISIT_FORMULA_VERSION, status: 'FRESH' },
        orderBy: { computedAt: 'asc' },
        select: { computedAt: true },
      }),
    ]);
    return {
      projectionKey: CUSTOMER_VISIT_PROJECTION_KEY,
      freshCount,
      pendingCount,
      failedCount,
      oldestComputedAt: oldest?.computedAt.toISOString() || null,
    };
  }

  private static async claimNext(fastify: FastifyInstance, workerId: string): Promise<ProjectionJob | null> {
    const now = new Date();
    const candidate = await fastify.prisma.crm.crmProjectionJob.findFirst({
      where: {
        projectionKey: CUSTOMER_VISIT_PROJECTION_KEY,
        availableAt: { lte: now },
        OR: [{ status: 'PENDING' }, { status: 'LEASED', leaseExpiresAt: { lt: now } }],
      },
      orderBy: [{ availableAt: 'asc' }, { id: 'asc' }],
      select: { id: true, entityKey: true, sourceRevision: true },
    });
    if (!candidate) return null;
    const leaseExpiresAt = new Date(now.getTime() + 60_000);
    const claimed = await fastify.prisma.crm.crmProjectionJob.updateMany({
      where: {
        id: candidate.id,
        sourceRevision: candidate.sourceRevision,
        OR: [{ status: 'PENDING' }, { status: 'LEASED', leaseExpiresAt: { lt: now } }],
      },
      data: { status: 'LEASED', leasedBy: workerId.slice(0, 100), leaseExpiresAt },
    });
    return claimed.count === 1 ? candidate : null;
  }

  private static async processClaimedJobs(
    fastify: FastifyInstance,
    workerId: string,
    jobs: ProjectionJob[]
  ): Promise<void> {
    const userIdByJob = new Map<number, ProjectionJob>();
    const invalidJobs: ProjectionJob[] = [];
    for (const job of jobs) {
      const legacyUserId = Number(job.entityKey);
      if (!Number.isSafeInteger(legacyUserId) || legacyUserId <= 0) invalidJobs.push(job);
      else userIdByJob.set(legacyUserId, job);
    }
    await Promise.all(invalidJobs.map((job) => this.failJob(fastify, workerId, job, 'Invalid projection entity key')));
    if (userIdByJob.size === 0) return;

    try {
      const rows = await canonicalVisits(fastify, [...userIdByJob.keys()]);
      const canonicalByUser = new Map(rows.map((row) => [Number(row.userId), row.lastVisitAt || null]));
      const now = new Date();
      await Promise.all(
        Array.from(userIdByJob, async ([legacyUserId, job]) => {
          const lastVisitAt = canonicalByUser.get(legacyUserId) || null;
          await fastify.prisma.crm.crmCustomerVisitProjection.upsert({
            where: { legacyUserId },
            create: {
              legacyUserId,
              lastVisitAt: lastVisitAt ? new Date(lastVisitAt) : null,
              sourceRevision: customerVisitSourceRevision(legacyUserId, lastVisitAt),
              formulaVersion: CUSTOMER_VISIT_FORMULA_VERSION,
              status: 'FRESH',
              computedAt: now,
              reconciledAt: now,
            },
            update: {
              lastVisitAt: lastVisitAt ? new Date(lastVisitAt) : null,
              sourceRevision: customerVisitSourceRevision(legacyUserId, lastVisitAt),
              formulaVersion: CUSTOMER_VISIT_FORMULA_VERSION,
              status: 'FRESH',
              computedAt: now,
              reconciledAt: now,
              lastError: null,
            },
          });
          await fastify.prisma.crm.crmProjectionJob.updateMany({
            where: {
              id: job.id,
              sourceRevision: job.sourceRevision,
              status: 'LEASED',
              leasedBy: workerId.slice(0, 100),
            },
            data: { status: 'DONE', leaseExpiresAt: null, leasedBy: null, lastError: null },
          });
        })
      );
    } catch (error) {
      await Promise.all(
        Array.from(userIdByJob.values(), (job) =>
          this.failJob(fastify, workerId, job, error instanceof Error ? error.message : 'Projection worker failed')
        )
      );
    }
  }

  private static async failJob(
    fastify: FastifyInstance,
    workerId: string,
    job: ProjectionJob,
    message: string
  ): Promise<void> {
    const retryAt = new Date(Date.now() + 60_000);
    await fastify.prisma.crm.crmProjectionJob.updateMany({
      where: { id: job.id, sourceRevision: job.sourceRevision, status: 'LEASED', leasedBy: workerId.slice(0, 100) },
      data: {
        status: 'PENDING',
        attempts: { increment: 1 },
        availableAt: retryAt,
        leaseExpiresAt: null,
        leasedBy: null,
        lastError: message.slice(0, 500),
      },
    });
  }
}
