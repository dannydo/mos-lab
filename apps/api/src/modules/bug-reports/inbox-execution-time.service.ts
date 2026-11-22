import type { FastifyInstance } from 'fastify';
import type {
  InboxExecutionDashboardQuery,
  InboxExecutionDashboardSummary,
  InboxTicketExecutionTiming,
} from '@mos-lab/shared';
import { calculateTicketExecutionTiming, type RawTicketTimingSource } from './service/inbox-execution-time-calc.js';
import {
  aggregateExecutionDashboard,
  calculateMedian,
  calculatePercentile,
} from './service/inbox-execution-time-dashboard.js';

export type { RawTicketTimingSource };
export { calculateTicketExecutionTiming, aggregateExecutionDashboard, calculateMedian, calculatePercentile };

const TICKET_TIMING_INCLUDE = {
  audits: {
    select: {
      id: true,
      action: true,
      note: true,
      createdAt: true,
    },
    orderBy: { id: 'asc' as const },
  },
  inboxPlanJobs: {
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      leasedBy: true,
      leaseExpiresAt: true,
      resultAction: true,
    },
    orderBy: { id: 'asc' as const },
  },
  inboxFollowUpJobs: {
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      leasedBy: true,
      leaseExpiresAt: true,
      resultAction: true,
    },
    orderBy: { id: 'asc' as const },
  },
  inboxImplementationJobs: {
    select: {
      id: true,
      status: true,
      executionPhase: true,
      retrySequence: true,
      startedAt: true,
      completedAt: true,
      updatedAt: true,
      createdAt: true,
      leaseExpiresAt: true,
      leaseHeartbeatAt: true,
      lastProgressAt: true,
    },
    orderBy: { id: 'asc' as const },
  },
};

export class InboxExecutionTimeService {
  constructor(private readonly fastify: FastifyInstance) {}

  async getTicketTiming(reportId: number): Promise<InboxTicketExecutionTiming | null> {
    const report = await this.fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: TICKET_TIMING_INCLUDE,
    });

    if (!report) return null;
    return calculateTicketExecutionTiming(report);
  }

  async getDashboardSummary(query: InboxExecutionDashboardQuery): Promise<InboxExecutionDashboardSummary> {
    const period = query.period || 'WEEK';
    const now = new Date();
    let startDate: Date;
    const endDate = now;

    if (query.dateFrom) {
      startDate = new Date(query.dateFrom);
    } else if (period === 'WEEK') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'MONTH') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(0);
    }

    const where: {
      createdAt?: { gte?: Date; lte?: Date };
      requestType?: string;
    } = {};

    if (period !== 'ALL' || query.dateFrom) {
      where.createdAt = { gte: startDate, lte: endDate };
    }

    if (query.requestType && query.requestType !== 'ALL') {
      where.requestType = query.requestType;
    }

    const reports = await this.fastify.prisma.crm.crmBugReport.findMany({
      where,
      include: TICKET_TIMING_INCLUDE,
      orderBy: { id: 'desc' },
    });

    const ticketsTiming = reports.map((r) => calculateTicketExecutionTiming(r, now));

    return aggregateExecutionDashboard(ticketsTiming, period, startDate.toISOString(), endDate.toISOString());
  }
}
