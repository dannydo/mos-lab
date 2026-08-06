import { FastifyInstance } from 'fastify';
import { CsDashboardParams, CsDashboardStats } from '@mos-lab/shared';

type SafeAny = any;

export class DashboardService {
  async getDashboardStats(fastify: FastifyInstance, params: CsDashboardParams): Promise<CsDashboardStats> {
    const { dateFrom, dateTo } = params;

    const taskWhere: SafeAny = {};
    const surveyWhere: SafeAny = {};
    const ticketWhere: SafeAny = {};

    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom + 'T00:00:00.000Z') : undefined;
      const to = dateTo ? new Date(dateTo + 'T23:59:59.999Z') : undefined;

      surveyWhere.createdAt = {};
      ticketWhere.createdAt = {};
      taskWhere.OR = [];

      if (from && to) {
        surveyWhere.createdAt.gte = from;
        surveyWhere.createdAt.lte = to;
        ticketWhere.createdAt.gte = from;
        ticketWhere.createdAt.lte = to;
        taskWhere.OR.push({ checkoutDate: { gte: from, lte: to } }, { scheduledDate: { gte: from, lte: to } });
      } else if (from) {
        surveyWhere.createdAt.gte = from;
        ticketWhere.createdAt.gte = from;
        taskWhere.OR.push({ checkoutDate: { gte: from } }, { scheduledDate: { gte: from } });
      } else if (to) {
        surveyWhere.createdAt.lte = to;
        ticketWhere.createdAt.lte = to;
        taskWhere.OR.push({ checkoutDate: { lte: to } }, { scheduledDate: { lte: to } });
      }
    }

    // 1. Happy Call Stats
    const totalCalls = await fastify.prisma.crm.crmHappyCallTask.count({ where: taskWhere });
    const completedCalls = await fastify.prisma.crm.crmHappyCallTask.count({
      where: { ...taskWhere, status: 'COMPLETED' },
    });
    const noAnswerCalls = await fastify.prisma.crm.crmHappyCallTask.count({
      where: { ...taskWhere, status: 'NO_ANSWER' },
    });

    const completionRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

    // 2. Ratings Stats
    const ratings = await fastify.prisma.crm.crmSurveyRating.aggregate({
      where: surveyWhere,
      _avg: {
        overallRating: true,
        technicianQualityRating: true,
        staffAttitudeRating: true,
        facilityRating: true,
      },
    });

    // 3. Ticket Stats
    const totalTickets = await fastify.prisma.crm.crmCsTicket.count({ where: ticketWhere });
    const openTickets = await fastify.prisma.crm.crmCsTicket.count({
      where: { ...ticketWhere, status: 'OPEN' },
    });
    const resolvedTickets = await fastify.prisma.crm.crmCsTicket.count({
      where: { ...ticketWhere, status: 'RESOLVED' },
    });
    const slaBreachedTickets = await fastify.prisma.crm.crmCsTicket.count({
      where: { ...ticketWhere, status: { notIn: ['RESOLVED', 'CLOSED'] }, slaDueDate: { lt: new Date() } },
    });

    // 4. Satisfaction Breakdown
    const breakdownData = await fastify.prisma.crm.crmSurveyRating.groupBy({
      by: ['overallRating'],
      where: surveyWhere,
      _count: { overallRating: true },
    });

    const satisfactionBreakdown = breakdownData
      .map((b) => ({
        rating: b.overallRating,
        count: b._count.overallRating,
      }))
      .sort((a, b) => b.rating - a.rating);

    return {
      happyCall: {
        total: totalCalls,
        completed: completedCalls,
        completionRate: Math.round(completionRate),
        noAnswer: noAnswerCalls,
      },
      ratings: {
        overallAverage: Number((ratings._avg.overallRating || 0).toFixed(1)),
        technicianAverage: Number((ratings._avg.technicianQualityRating || 0).toFixed(1)),
        staffAttitudeAverage: Number((ratings._avg.staffAttitudeRating || 0).toFixed(1)),
        facilityAverage: Number((ratings._avg.facilityRating || 0).toFixed(1)),
      },
      tickets: {
        total: totalTickets,
        open: openTickets,
        resolved: resolvedTickets,
        slaBreached: slaBreachedTickets,
      },
      satisfactionBreakdown,
    };
  }

  /**
   * Detailed performance metrics per CS staff member
   */
  async getCsStaffPerformance(fastify: FastifyInstance, params: CsDashboardParams): Promise<SafeAny[]> {
    const { dateFrom, dateTo } = params;

    // Get active CS staff config
    const csConfig = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_CS_STAFF_CONFIG' },
    });

    let csStaffIds: number[] = [];
    if (csConfig && csConfig.value) {
      try {
        csStaffIds = JSON.parse(csConfig.value);
      } catch (e) {}
    }

    if (!csStaffIds.length) {
      const staffs = await fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true, role: 'cs' },
        select: { id: true },
      });
      csStaffIds = staffs.map((s) => s.id);
    }

    // Get staff info
    const staffList = await fastify.prisma.crm.crmStaff.findMany({
      where: { id: { in: csStaffIds } },
      select: { id: true, displayName: true, avatarUrl: true, email: true },
    });

    const dateWhere: SafeAny = {};
    const taskDateWhere: SafeAny = {};
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom + 'T00:00:00.000Z') : undefined;
      const to = dateTo ? new Date(dateTo + 'T23:59:59.999Z') : undefined;
      dateWhere.createdAt = {};
      if (from) dateWhere.createdAt.gte = from;
      if (to) dateWhere.createdAt.lte = to;

      taskDateWhere.OR = [];
      if (from && to) {
        taskDateWhere.OR.push({ checkoutDate: { gte: from, lte: to } }, { scheduledDate: { gte: from, lte: to } });
      } else if (from) {
        taskDateWhere.OR.push({ checkoutDate: { gte: from } }, { scheduledDate: { gte: from } });
      } else if (to) {
        taskDateWhere.OR.push({ checkoutDate: { lte: to } }, { scheduledDate: { lte: to } });
      }
    }

    const performanceData = await Promise.all(
      staffList.map(async (staff) => {
        const staffTaskWhere = { ...taskDateWhere, assignedCsStaffId: staff.id };

        const [
          totalTasks,
          completedTasks,
          noAnswerTasks,
          messagedTasks,
          unreachableTasks,
          ticketsCount,
          urgentTicketsCount,
          ratings,
        ] = await Promise.all([
          fastify.prisma.crm.crmHappyCallTask.count({ where: staffTaskWhere }),
          fastify.prisma.crm.crmHappyCallTask.count({ where: { ...staffTaskWhere, status: 'COMPLETED' } }),
          fastify.prisma.crm.crmHappyCallTask.count({ where: { ...staffTaskWhere, status: 'NO_ANSWER' } }),
          fastify.prisma.crm.crmHappyCallTask.count({ where: { ...staffTaskWhere, status: 'MESSAGED' } }),
          fastify.prisma.crm.crmHappyCallTask.count({ where: { ...staffTaskWhere, status: 'UNREACHABLE' } }),
          fastify.prisma.crm.crmCsTicket.count({ where: { ...dateWhere, assignedCsStaffId: staff.id } }),
          fastify.prisma.crm.crmCsTicket.count({
            where: { ...dateWhere, assignedCsStaffId: staff.id, priority: 'URGENT' },
          }),
          fastify.prisma.crm.crmSurveyRating.aggregate({
            where: {
              ...dateWhere,
              happyCallTask: { assignedCsStaffId: staff.id },
            },
            _avg: {
              overallRating: true,
              technicianQualityRating: true,
              staffAttitudeRating: true,
              facilityRating: true,
            },
            _count: { overallRating: true },
          }),
        ]);

        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          staffId: staff.id,
          staffName: staff.displayName,
          avatarUrl: staff.avatarUrl,
          email: staff.email,
          totalTasks,
          completedTasks,
          completionRate,
          noAnswerTasks,
          messagedTasks,
          unreachableTasks,
          ticketsCount,
          urgentTicketsCount,
          surveyCount: ratings._count.overallRating || 0,
          avgOverallRating: Number((ratings._avg.overallRating || 0).toFixed(1)),
          avgTechRating: Number((ratings._avg.technicianQualityRating || 0).toFixed(1)),
          avgAttitudeRating: Number((ratings._avg.staffAttitudeRating || 0).toFixed(1)),
          avgFacilityRating: Number((ratings._avg.facilityRating || 0).toFixed(1)),
        };
      })
    );

    // Sort by completion rate DESC, then avg rating DESC
    return performanceData.sort(
      (a, b) => b.completionRate - a.completionRate || b.avgOverallRating - a.avgOverallRating
    );
  }

  async getStaffRankings(fastify: FastifyInstance, params: CsDashboardParams) {
    const { dateFrom, dateTo } = params;

    const whereClause: SafeAny = {};
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom + 'T00:00:00.000Z');
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    // Group by technicianId and calculate avg
    const techRankingsData = await fastify.prisma.crm.crmSurveyRating.groupBy({
      by: ['technicianId'],
      where: { ...whereClause, technicianId: { not: null } },
      _avg: { technicianQualityRating: true },
      _count: { technicianQualityRating: true },
      orderBy: { _avg: { technicianQualityRating: 'desc' } },
      take: 10,
    });

    const staffIds = techRankingsData.map((r) => r.technicianId).filter(Boolean) as number[];
    const staffMap = new Map<number, string>();
    if (staffIds.length > 0) {
      const legacyStaff = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT up.user_id AS id, COALESCE(up.full_name, up.first_name, up.username) AS name
         FROM user_profile up WHERE up.user_id IN (${staffIds.join(',')})`
      );
      for (const s of legacyStaff) staffMap.set(Number(s.id), s.name || '');
    }

    return techRankingsData.map((r) => ({
      staffId: r.technicianId!,
      staffName: staffMap.get(r.technicianId!) || 'N/A',
      department: 'CV',
      averageRating: Number((r._avg.technicianQualityRating || 0).toFixed(1)),
      ratingCount: r._count.technicianQualityRating,
    }));
  }

  async getRatingTrends(fastify: FastifyInstance, params: CsDashboardParams) {
    const { dateFrom, dateTo } = params;

    const now = new Date();
    const startDate = dateFrom
      ? new Date(dateFrom + 'T00:00:00.000Z')
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo + 'T23:59:59.999Z') : now;

    const ratings = await fastify.prisma.crm.crmSurveyRating.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, overallRating: true },
    });

    const trendsMap: Record<string, { total: number; count: number }> = {};

    ratings.forEach((r) => {
      const d = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
      const dateStr = d.toISOString().slice(0, 10);
      if (!trendsMap[dateStr]) {
        trendsMap[dateStr] = { total: 0, count: 0 };
      }
      trendsMap[dateStr].total += r.overallRating;
      trendsMap[dateStr].count += 1;
    });

    return Object.keys(trendsMap)
      .map((date) => ({
        date,
        averageRating: Number((trendsMap[date].total / trendsMap[date].count).toFixed(1)),
        count: trendsMap[date].count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const dashboardService = new DashboardService();
