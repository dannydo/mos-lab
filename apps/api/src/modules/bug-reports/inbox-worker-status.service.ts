import type { FastifyInstance } from 'fastify';
import {
  classifyAgNodeFromProvisionerId,
  formatBugReportKey,
  type InboxDualWorkersHealth,
  type InboxWorkerStatusSummary,
} from '@mos-lab/shared';

const WORKER_ONLINE_THRESHOLD_MS = 45_000;
export const MAX_CODING_SLOTS_PER_NODE = 2;

export class InboxWorkerStatusService {
  private static agWinLastSeenAt: Date | null = null;
  private static agMacLastSeenAt: Date | null = null;
  private static agLastSeenAt: Date | null = null;
  private static codexLastSeenAt: Date | null = null;
  private static agWinProvisionerId: string | null = null;
  private static agMacProvisionerId: string | null = null;
  private static agProvisionerId: string | null = null;
  private static codexProvisionerId: string | null = null;

  static recordHeartbeat(
    worker: 'AG' | 'IDE' | 'AG_WIN' | 'AG_MAC',
    provisionerId?: string,
    fastify?: FastifyInstance,
    recordedAt = new Date()
  ): void {
    if (worker === 'IDE') {
      this.codexLastSeenAt = recordedAt;
      if (provisionerId) this.codexProvisionerId = provisionerId;
      if (typeof fastify?.prisma?.crm?.crmConfig?.upsert === 'function') {
        const payload = JSON.stringify({
          lastSeenAt: recordedAt.toISOString(),
          provisionerId: provisionerId || null,
        });
        void fastify.prisma.crm.crmConfig
          .upsert({
            where: { key: 'INBOX_WORKER_HEARTBEAT_CODEX' },
            create: { key: 'INBOX_WORKER_HEARTBEAT_CODEX', value: payload },
            update: { value: payload },
          })
          .catch(() => {
            // Non-blocking fallback
          });
      }
      return;
    }

    const node: 'AG_WIN' | 'AG_MAC' =
      worker === 'AG_WIN' || worker === 'AG_MAC' ? worker : classifyAgNodeFromProvisionerId(provisionerId);
    if (node === 'AG_WIN') {
      this.agWinLastSeenAt = recordedAt;
      if (provisionerId) this.agWinProvisionerId = provisionerId;
    } else {
      this.agMacLastSeenAt = recordedAt;
      if (provisionerId) this.agMacProvisionerId = provisionerId;
    }
    this.agLastSeenAt = recordedAt;
    if (provisionerId) this.agProvisionerId = provisionerId;

    if (typeof fastify?.prisma?.crm?.crmConfig?.upsert === 'function') {
      const configKey = `INBOX_WORKER_HEARTBEAT_${node}`;
      const payload = JSON.stringify({
        lastSeenAt: recordedAt.toISOString(),
        provisionerId: provisionerId || null,
      });
      void fastify.prisma.crm.crmConfig
        .upsert({
          where: { key: configKey },
          create: { key: configKey, value: payload },
          update: { value: payload },
        })
        .catch(() => {
          // Non-blocking fallback
        });
    }
  }

  static async hydrateHeartbeatsFromDb(fastify?: FastifyInstance): Promise<void> {
    if (
      (!this.agWinLastSeenAt || !this.agMacLastSeenAt || !this.codexLastSeenAt) &&
      typeof fastify?.prisma?.crm?.crmConfig?.findMany === 'function'
    ) {
      try {
        const configs = await fastify.prisma.crm.crmConfig.findMany({
          where: {
            key: {
              in: [
                'INBOX_WORKER_HEARTBEAT_AG_WIN',
                'INBOX_WORKER_HEARTBEAT_AG_MAC',
                'INBOX_WORKER_HEARTBEAT_AG',
                'INBOX_WORKER_HEARTBEAT_CODEX',
              ],
            },
          },
        });
        for (const config of configs) {
          try {
            const parsed = JSON.parse(config.value) as { lastSeenAt?: string; provisionerId?: string };
            if (!parsed.lastSeenAt) continue;
            const date = new Date(parsed.lastSeenAt);
            if (Number.isNaN(date.getTime())) continue;
            if (config.key === 'INBOX_WORKER_HEARTBEAT_AG_WIN' && !this.agWinLastSeenAt) {
              this.agWinLastSeenAt = date;
              if (parsed.provisionerId) this.agWinProvisionerId = parsed.provisionerId;
            } else if (config.key === 'INBOX_WORKER_HEARTBEAT_AG_MAC' && !this.agMacLastSeenAt) {
              this.agMacLastSeenAt = date;
              if (parsed.provisionerId) this.agMacProvisionerId = parsed.provisionerId;
            } else if (config.key === 'INBOX_WORKER_HEARTBEAT_AG') {
              const legacyNode = classifyAgNodeFromProvisionerId(parsed.provisionerId);
              if (legacyNode === 'AG_WIN' && !this.agWinLastSeenAt) {
                this.agWinLastSeenAt = date;
                if (parsed.provisionerId) this.agWinProvisionerId = parsed.provisionerId;
              } else if (legacyNode === 'AG_MAC' && !this.agMacLastSeenAt) {
                this.agMacLastSeenAt = date;
                if (parsed.provisionerId) this.agMacProvisionerId = parsed.provisionerId;
              }
              if (!this.agLastSeenAt) this.agLastSeenAt = date;
            } else if (config.key === 'INBOX_WORKER_HEARTBEAT_CODEX' && !this.codexLastSeenAt) {
              this.codexLastSeenAt = date;
              if (parsed.provisionerId) this.codexProvisionerId = parsed.provisionerId;
            }
          } catch {
            // Ignore malformed config
          }
        }
      } catch {
        // Ignore DB read failure
      }
    }
  }

  static async isNodeOnline(
    fastify: FastifyInstance | undefined,
    node: 'AG_WIN' | 'AG_MAC',
    now = new Date()
  ): Promise<boolean> {
    await this.hydrateHeartbeatsFromDb(fastify);
    const ts = node === 'AG_WIN' ? this.agWinLastSeenAt : this.agMacLastSeenAt;
    return Boolean(ts && Math.abs(now.getTime() - ts.getTime()) <= WORKER_ONLINE_THRESHOLD_MS);
  }

  static async countNodeActiveCodingSessions(fastify: FastifyInstance, node: 'AG_WIN' | 'AG_MAC'): Promise<number> {
    if (typeof fastify?.prisma?.crm?.crmInboxImplementationJob?.count !== 'function') {
      return 0;
    }
    try {
      return await fastify.prisma.crm.crmInboxImplementationJob.count({
        where: {
          executionOwner: node === 'AG_WIN' ? 'AG_WIN' : { in: ['AG_MAC', 'AG'] },
          status: 'PENDING',
          ideTaskId: { not: null },
          ideHandoffRevokedAt: null,
          executionPhase: { in: ['IDE_HANDOFF_READY', 'RUNNING'] },
        },
      });
    } catch {
      return 0;
    }
  }

  static async getDualWorkersStatus(fastify: FastifyInstance, now = new Date()): Promise<InboxDualWorkersHealth> {
    await this.hydrateHeartbeatsFromDb(fastify);

    const winOnline = Boolean(
      this.agWinLastSeenAt && Math.abs(now.getTime() - this.agWinLastSeenAt.getTime()) <= WORKER_ONLINE_THRESHOLD_MS
    );
    const macOnline = Boolean(
      this.agMacLastSeenAt && Math.abs(now.getTime() - this.agMacLastSeenAt.getTime()) <= WORKER_ONLINE_THRESHOLD_MS
    );
    const codexOnline = Boolean(
      this.codexLastSeenAt && Math.abs(now.getTime() - this.codexLastSeenAt.getTime()) <= WORKER_ONLINE_THRESHOLD_MS
    );

    let winActiveJob: InboxWorkerStatusSummary['activeTask'] = null;
    let macActiveJob: InboxWorkerStatusSummary['activeTask'] = null;
    let codexActiveJob: InboxWorkerStatusSummary['activeTask'] = null;
    let winCodingCount = 0;
    let macCodingCount = 0;

    if (fastify?.prisma?.crm?.crmInboxImplementationJob) {
      [winCodingCount, macCodingCount] = await Promise.all([
        this.countNodeActiveCodingSessions(fastify, 'AG_WIN'),
        this.countNodeActiveCodingSessions(fastify, 'AG_MAC'),
      ]);

      try {
        const activeJobs = await fastify.prisma.crm.crmInboxImplementationJob.findMany({
          where: {
            status: { in: ['RUNNING', 'PENDING', 'AWAITING_COMMIT_REVIEW', 'AWAITING_DEPLOY_REVIEW'] },
            OR: [
              { status: 'RUNNING', leaseExpiresAt: { gt: now } },
              { status: 'PENDING', ideProvisioningState: 'LEASED', ideProvisioningLeaseExpiresAt: { gt: now } },
              { status: 'AWAITING_COMMIT_REVIEW' },
              { status: 'AWAITING_DEPLOY_REVIEW' },
            ],
          },
          include: { report: { select: { id: true, requestType: true, title: true } } },
          orderBy: [{ updatedAt: 'desc' }, { startedAt: 'asc' }],
          take: 10,
        });

        for (const job of activeJobs) {
          const taskSummary = {
            ticketId: job.reportId,
            ticketKey: formatBugReportKey(job.reportId, job.report?.requestType === 'FEATURE' ? 'FEATURE' : 'BUG'),
            title: job.report?.title || undefined,
            phase: formatPhase(job.executionPhase, job.status),
            startedAt: job.startedAt?.toISOString() ?? null,
            lastProgressAt: job.lastProgressAt?.toISOString() ?? null,
          };

          if ((job.executionOwner === 'AG_WIN' || job.executionOwner === 'AUTO') && !winActiveJob) {
            winActiveJob = taskSummary;
          } else if ((job.executionOwner === 'AG_MAC' || job.executionOwner === 'AG') && !macActiveJob) {
            macActiveJob = taskSummary;
          } else if (job.executionOwner === 'IDE' && !codexActiveJob) {
            codexActiveJob = taskSummary;
          }
        }
      } catch {
        // Ignore query error, return empty active tasks
      }
    }

    const combinedLastSeenAt =
      this.agWinLastSeenAt && this.agMacLastSeenAt
        ? this.agWinLastSeenAt.getTime() >= this.agMacLastSeenAt.getTime()
          ? this.agWinLastSeenAt
          : this.agMacLastSeenAt
        : this.agWinLastSeenAt || this.agMacLastSeenAt || this.agLastSeenAt;

    return {
      agWin: {
        id: 'AG_WIN',
        name: 'Win AG',
        isOnline: winOnline,
        lastSeenAt: this.agWinLastSeenAt?.toISOString() ?? null,
        activeCodingCount: winCodingCount,
        maxCodingSlots: MAX_CODING_SLOTS_PER_NODE,
        activeTask: winActiveJob,
      },
      agMac: {
        id: 'AG_MAC',
        name: 'Mac AG',
        isOnline: macOnline,
        lastSeenAt: this.agMacLastSeenAt?.toISOString() ?? null,
        activeCodingCount: macCodingCount,
        maxCodingSlots: MAX_CODING_SLOTS_PER_NODE,
        activeTask: macActiveJob,
      },
      ag: {
        id: 'AG',
        name: 'Antigravity (AG)',
        isOnline: winOnline || macOnline,
        lastSeenAt: combinedLastSeenAt?.toISOString() ?? null,
        activeCodingCount: winCodingCount + macCodingCount,
        maxCodingSlots: MAX_CODING_SLOTS_PER_NODE * 2,
        activeTask: winActiveJob || macActiveJob,
      },
      codex: {
        id: 'IDE',
        name: 'Codex IDE',
        isOnline: codexOnline,
        lastSeenAt: this.codexLastSeenAt?.toISOString() ?? null,
        activeTask: codexActiveJob,
      },
    };
  }

  // Visible for testing
  static resetForTesting(): void {
    this.agWinLastSeenAt = null;
    this.agMacLastSeenAt = null;
    this.agLastSeenAt = null;
    this.codexLastSeenAt = null;
    this.agWinProvisionerId = null;
    this.agMacProvisionerId = null;
    this.agProvisionerId = null;
    this.codexProvisionerId = null;
  }
}

function formatPhase(phase: string, status: string): string {
  if (status === 'AWAITING_COMMIT_REVIEW') return 'Chờ Danny duyệt commit';
  if (status === 'AWAITING_DEPLOY_REVIEW') return 'Chờ Danny duyệt deploy';
  if (phase === 'COMMITTING') return 'Đang tạo commit';
  if (phase === 'DEPLOYING') return 'Đang deploy';
  if (phase === 'IDE_PROVISIONING_LEASED') return 'Đang khởi tạo worktree';
  return 'Đang code/test';
}
