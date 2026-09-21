import type { FastifyInstance } from 'fastify';
import { formatBugReportKey, type InboxDualWorkersHealth, type InboxWorkerStatusSummary } from '@mos-lab/shared';

const WORKER_ONLINE_THRESHOLD_MS = 45_000;

export class InboxWorkerStatusService {
  private static agLastSeenAt: Date | null = null;
  private static codexLastSeenAt: Date | null = null;
  private static agProvisionerId: string | null = null;
  private static codexProvisionerId: string | null = null;

  static recordHeartbeat(
    worker: 'AG' | 'IDE',
    provisionerId?: string,
    fastify?: FastifyInstance,
    recordedAt = new Date()
  ): void {
    if (worker === 'AG') {
      this.agLastSeenAt = recordedAt;
      if (provisionerId) this.agProvisionerId = provisionerId;
    } else {
      this.codexLastSeenAt = recordedAt;
      if (provisionerId) this.codexProvisionerId = provisionerId;
    }

    if (typeof fastify?.prisma?.crm?.crmConfig?.upsert === 'function') {
      const configKey = `INBOX_WORKER_HEARTBEAT_${worker}`;
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

  static async getDualWorkersStatus(fastify: FastifyInstance, now = new Date()): Promise<InboxDualWorkersHealth> {
    // Restore from crm_config if in-memory timestamps are missing
    if ((!this.agLastSeenAt || !this.codexLastSeenAt) && fastify?.prisma?.crm?.crmConfig) {
      try {
        const configs = await fastify.prisma.crm.crmConfig.findMany({
          where: {
            key: { in: ['INBOX_WORKER_HEARTBEAT_AG', 'INBOX_WORKER_HEARTBEAT_CODEX'] },
          },
        });
        for (const config of configs) {
          try {
            const parsed = JSON.parse(config.value) as { lastSeenAt?: string; provisionerId?: string };
            if (parsed.lastSeenAt) {
              const date = new Date(parsed.lastSeenAt);
              if (config.key === 'INBOX_WORKER_HEARTBEAT_AG' && !this.agLastSeenAt) {
                this.agLastSeenAt = date;
                if (parsed.provisionerId) this.agProvisionerId = parsed.provisionerId;
              } else if (config.key === 'INBOX_WORKER_HEARTBEAT_CODEX' && !this.codexLastSeenAt) {
                this.codexLastSeenAt = date;
                if (parsed.provisionerId) this.codexProvisionerId = parsed.provisionerId;
              }
            }
          } catch {
            // Ignore malformed config
          }
        }
      } catch {
        // Ignore DB read failure
      }
    }

    const agOnline = Boolean(
      this.agLastSeenAt && Math.abs(now.getTime() - this.agLastSeenAt.getTime()) <= WORKER_ONLINE_THRESHOLD_MS
    );
    const codexOnline = Boolean(
      this.codexLastSeenAt && Math.abs(now.getTime() - this.codexLastSeenAt.getTime()) <= WORKER_ONLINE_THRESHOLD_MS
    );

    // Query active implementation jobs for both workers
    let agActiveJob: InboxWorkerStatusSummary['activeTask'] = null;
    let codexActiveJob: InboxWorkerStatusSummary['activeTask'] = null;

    if (fastify?.prisma?.crm?.crmInboxImplementationJob) {
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
          const owner = job.executionOwner === 'AG' ? 'AG' : 'IDE';
          const taskSummary = {
            ticketId: job.reportId,
            ticketKey: formatBugReportKey(job.reportId, job.report?.requestType === 'FEATURE' ? 'FEATURE' : 'BUG'),
            title: job.report?.title || undefined,
            phase: formatPhase(job.executionPhase, job.status),
            startedAt: job.startedAt?.toISOString() ?? null,
            lastProgressAt: job.lastProgressAt?.toISOString() ?? null,
          };

          if (owner === 'AG' && !agActiveJob) {
            agActiveJob = taskSummary;
          } else if (owner === 'IDE' && !codexActiveJob) {
            codexActiveJob = taskSummary;
          }
        }
      } catch {
        // Ignore query error, return empty active tasks
      }
    }

    return {
      ag: {
        id: 'AG',
        name: 'Antigravity (AG)',
        isOnline: agOnline,
        lastSeenAt: this.agLastSeenAt?.toISOString() ?? null,
        activeTask: agActiveJob,
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
    this.agLastSeenAt = null;
    this.codexLastSeenAt = null;
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
