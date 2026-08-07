import { FastifyInstance } from 'fastify';
import { CreateSurveyRatingDto, HappyCallTask, ListHappyCallsParams } from '@mos-lab/shared';

type SafeAny = any;

export class HappyCallService {
  /**
   * Generate Happy Call tasks for all completed orders from yesterday.
   * Uses round-robin assignment with CS staff from ACTIVE_CS_STAFF_CONFIG.
   */
  async generateDailyTasks(fastify: FastifyInstance): Promise<{ created: number; skipped: number }> {
    // 1. Get active CS staff IDs from ACTIVE_CS_STAFF_CONFIG
    const csConfig = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_CS_STAFF_CONFIG' },
    });
    let csStaffIds: number[] = [];
    if (csConfig && csConfig.value) {
      try {
        csStaffIds = JSON.parse(csConfig.value);
      } catch (e) {
        /* ignore */
      }
    }
    if (!csStaffIds.length) {
      // Fallback 1: get active CRM staff with role 'cs'
      const staffs = await fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true, role: 'cs' },
        select: { id: true },
      });
      csStaffIds = staffs.map((s) => s.id);
    }
    if (!csStaffIds.length) {
      // Fallback 2: get any active CRM staff
      const staffs = await fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      csStaffIds = staffs.map((s) => s.id);
    }
    if (!csStaffIds.length) {
      // Fallback 3: get active staff IDs from legacy DB user_profile
      const legacyStaffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id AS id FROM user_profile WHERE user_id > 0 LIMIT 10`
      );
      csStaffIds = legacyStaffs.map((s) => Number(s.id));
    }
    if (!csStaffIds.length) {
      return { created: 0, skipped: 0 };
    }

    // 2. Get completed orders from the last 14 days using raw SQL
    const completedOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `
      SELECT 
        o.id AS orderId,
        o.user_id AS customerId,
        COALESCE(ro.actual_booking_date_start, o.booking_date_start) AS checkoutDate,
        (SELECT os.check_in_staff_id FROM order_service os WHERE os.order_id = o.id AND os.check_in_staff_id IS NOT NULL LIMIT 1) AS ccInStaffId,
        (SELECT os.check_out_staff_id FROM order_service os WHERE os.order_id = o.id AND os.check_out_staff_id IS NOT NULL LIMIT 1) AS ccOutStaffId,
        o.created_staff_id AS bookerStaffId,
        (
          SELECT os2.assigned_staff_id FROM order_service os2 
          WHERE os2.order_id = o.id AND os2.assigned_staff_id IS NOT NULL
          LIMIT 1
        ) AS technicianId
      FROM \`order\` o
      LEFT JOIN report_order ro ON o.id = ro.order_id
      WHERE o.order_state = 'Completed'
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      ORDER BY o.id DESC
    `
    );

    if (!completedOrders.length) return { created: 0, skipped: 0 };

    // Check which orders already have tasks
    const orderIds = completedOrders.map((o: SafeAny) => Number(o.orderId));
    const existingTasks = await fastify.prisma.crm.crmHappyCallTask.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true },
    });
    const existingSet = new Set(existingTasks.map((t) => t.orderId));

    const newOrders = completedOrders.filter((o: SafeAny) => !existingSet.has(Number(o.orderId)));

    // Round-robin assignment
    let staffIndex = 0;
    const today = new Date();
    let created = 0;

    for (const order of newOrders) {
      const assignedStaffId = csStaffIds[staffIndex % csStaffIds.length];
      staffIndex++;

      // Scheduled date is the day after checkout date (or today if checkout date unavailable)
      let scheduledDate = new Date(today.toISOString().slice(0, 10) + 'T00:00:00.000Z');
      if (order.checkoutDate) {
        const checkoutDt = new Date(order.checkoutDate);
        checkoutDt.setDate(checkoutDt.getDate() + 1);
        scheduledDate = new Date(checkoutDt.toISOString().slice(0, 10) + 'T00:00:00.000Z');
      }

      await fastify.prisma.crm.crmHappyCallTask.create({
        data: {
          orderId: Number(order.orderId),
          customerId: Number(order.customerId),
          assignedCsStaffId: assignedStaffId,
          status: 'PENDING',
          attemptCount: 0,
          scheduledDate,
          checkoutDate: order.checkoutDate ? new Date(order.checkoutDate) : null,
          technicianId: order.technicianId ? Number(order.technicianId) : null,
          ccInStaffId: order.ccInStaffId ? Number(order.ccInStaffId) : null,
          ccOutStaffId: order.ccOutStaffId ? Number(order.ccOutStaffId) : null,
          bookerStaffId: order.bookerStaffId ? Number(order.bookerStaffId) : null,
        },
      });
      created++;
    }

    return { created, skipped: existingSet.size };
  }

  /**
   * List happy call tasks with filters and pagination.
   * Enriches with customer names and staff names from legacy DB.
   */
  async listTasks(
    fastify: FastifyInstance,
    params: ListHappyCallsParams & { search?: string }
  ): Promise<{ data: HappyCallTask[]; total: number }> {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: SafeAny = {};
    if (params.status) where.status = params.status;
    if (params.assignedCsStaffId) where.assignedCsStaffId = Number(params.assignedCsStaffId);
    if (params.scheduledDate) {
      where.scheduledDate = new Date(params.scheduledDate + 'T00:00:00.000Z');
    } else if (params.dateFrom || params.dateTo) {
      const from = params.dateFrom ? new Date(params.dateFrom + 'T00:00:00.000Z') : undefined;
      const to = params.dateTo ? new Date(params.dateTo + 'T23:59:59.999Z') : undefined;

      where.OR = [];
      if (from && to) {
        where.OR.push({ checkoutDate: { gte: from, lte: to } }, { scheduledDate: { gte: from, lte: to } });
      } else if (from) {
        where.OR.push({ checkoutDate: { gte: from } }, { scheduledDate: { gte: from } });
      } else if (to) {
        where.OR.push({ checkoutDate: { lte: to } }, { scheduledDate: { lte: to } });
      }
    }

    const [tasks, total] = await Promise.all([
      fastify.prisma.crm.crmHappyCallTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      fastify.prisma.crm.crmHappyCallTask.count({ where }),
    ]);

    if (!tasks.length) return { data: [], total };

    // Batch enrich with customer names from legacy DB
    const customerIds = [...new Set(tasks.map((t) => t.customerId))];
    const allStaffIds = [
      ...new Set([
        ...tasks.map((t) => t.assignedCsStaffId).filter(Boolean),
        ...tasks.map((t) => t.technicianId).filter(Boolean),
        ...tasks.map((t) => t.ccInStaffId).filter(Boolean),
        ...tasks.map((t) => t.ccOutStaffId).filter(Boolean),
        ...tasks.map((t) => t.bookerStaffId).filter(Boolean),
      ] as number[]),
    ];

    const customerMap = new Map<number, { name: string; phone: string; avatar: string | null }>();
    const staffMap = new Map<number, string>();

    if (customerIds.length > 0) {
      const customers = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT u.id, COALESCE(up.full_name, up.first_name, up.username) AS name, up.username AS phone, up.avatar
         FROM user u LEFT JOIN user_profile up ON u.id = up.user_id
         WHERE u.id IN (${customerIds.join(',')})`
      );
      for (const c of customers) {
        customerMap.set(Number(c.id), { name: c.name || '', phone: c.phone || '', avatar: c.avatar || null });
      }
    }

    if (allStaffIds.length > 0) {
      // 1. Get from CRM staff table first (Primary source for CRM CS staff and department leads)
      const crmStaff = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: allStaffIds } },
        select: { id: true, displayName: true },
      });
      for (const s of crmStaff) {
        if (s.displayName) staffMap.set(s.id, s.displayName);
      }

      // 2. Fallback to legacy user_profile for remaining staff IDs
      const remainingIds = allStaffIds.filter((id) => !staffMap.has(id));
      if (remainingIds.length > 0) {
        const legacyStaff = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT up.user_id AS id, COALESCE(up.full_name, up.first_name, up.username) AS name
           FROM user_profile up WHERE up.user_id IN (${remainingIds.join(',')})`
        );
        for (const s of legacyStaff) {
          staffMap.set(Number(s.id), s.name || '');
        }
      }
    }

    // Get service names for orders
    const orderIds = tasks.map((t) => t.orderId);
    const serviceMap = new Map<number, string>();
    if (orderIds.length > 0) {
      const services = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT os.order_id, MIN(sl.service_name) AS name
         FROM order_service os
         JOIN service s ON os.service_id = s.id
         LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
         WHERE os.order_id IN (${orderIds.join(',')})
         GROUP BY os.order_id`
      );
      for (const s of services) {
        serviceMap.set(Number(s.order_id), s.name || 'Dịch vụ');
      }
    }

    const data: HappyCallTask[] = tasks.map((t: SafeAny) => {
      const customer = customerMap.get(t.customerId);
      return {
        id: t.id,
        orderId: t.orderId,
        customerId: t.customerId,
        customerName: customer?.name || '',
        customerPhone: customer?.phone || '',
        customerAvatar: customer?.avatar || null,
        assignedCsStaffId: t.assignedCsStaffId,
        assignedCsStaffName: staffMap.get(t.assignedCsStaffId) || '',
        status: t.status,
        attemptCount: t.attemptCount,
        scheduledDate: t.scheduledDate?.toISOString() || '',
        completedAt: t.completedAt?.toISOString() || null,
        createdAt: t.createdAt?.toISOString() || '',
        checkoutDate: t.checkoutDate?.toISOString() || '',
        technicianName: t.technicianId ? staffMap.get(t.technicianId) || null : null,
        technicianId: t.technicianId,
        ccInName: t.ccInStaffId ? staffMap.get(t.ccInStaffId) || null : null,
        ccInStaffId: t.ccInStaffId,
        ccOutName: t.ccOutStaffId ? staffMap.get(t.ccOutStaffId) || null : null,
        ccOutStaffId: t.ccOutStaffId,
        bookerName: t.bookerStaffId ? staffMap.get(t.bookerStaffId) || null : null,
        bookerStaffId: t.bookerStaffId,
        serviceName: serviceMap.get(t.orderId) || 'Dịch vụ',
      };
    });

    return { data, total };
  }

  /**
   * Update Happy Call task status.
   * Auto-escalates to MESSAGED after 3 NO_ANSWER attempts.
   */
  async updateStatus(fastify: FastifyInstance, taskId: number, status: string) {
    const task = await fastify.prisma.crm.crmHappyCallTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Happy Call task không tồn tại');

    const updateData: SafeAny = { status };

    if (status === 'NO_ANSWER') {
      updateData.attemptCount = task.attemptCount + 1;
      if (task.attemptCount + 1 >= 3) {
        updateData.status = 'MESSAGED';
      }
    } else if (status === 'COMPLETED' || status === 'UNREACHABLE') {
      updateData.completedAt = new Date();
    }

    return fastify.prisma.crm.crmHappyCallTask.update({
      where: { id: taskId },
      data: updateData,
    });
  }

  /**
   * Submit survey rating for a happy call task.
   * Auto-creates tickets for ratings <= 3 (URGENT for <=2, HIGH for 3).
   */
  async submitSurvey(
    fastify: FastifyInstance,
    taskId: number,
    dto: CreateSurveyRatingDto
  ): Promise<{ survey: SafeAny; ticketsCreated: number }> {
    const task = await fastify.prisma.crm.crmHappyCallTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Happy Call task không tồn tại');

    // Map dto fields (support both flat fields and nested dto.ratings format)
    const ratingsObj = (dto as any).ratings || {};
    const technicianQualityRating = dto.technicianQualityRating ?? ratingsObj.cv ?? ratingsObj.ktv ?? null;
    const staffAttitudeRating = dto.staffAttitudeRating ?? ratingsObj.attitude ?? null;
    const facilityRating = dto.facilityRating ?? ratingsObj.space ?? null;
    const valueForMoneyRating = dto.valueForMoneyRating ?? ratingsObj.price ?? null;
    const checkInExperienceRating = dto.checkInExperienceRating ?? ratingsObj.consultation ?? null;
    const checkOutExperienceRating = dto.checkOutExperienceRating ?? ratingsObj.checkout ?? null;
    const bookingExperienceRating = dto.bookingExperienceRating ?? ratingsObj.wait_time ?? null;

    let overallRating = dto.overallRating ?? ratingsObj.overall;
    if (overallRating == null) {
      const validRatings = [
        technicianQualityRating,
        staffAttitudeRating,
        facilityRating,
        valueForMoneyRating,
        checkInExperienceRating,
        checkOutExperienceRating,
        bookingExperienceRating,
      ].filter((r) => r != null) as number[];

      if (validRatings.length > 0) {
        overallRating = Math.round(validRatings.reduce((a, b) => a + b, 0) / validRatings.length);
      } else {
        overallRating = 5;
      }
    }

    const surveyData = {
      happyCallTaskId: taskId,
      orderId: task.orderId,
      customerId: task.customerId,
      overallRating,
      technicianQualityRating,
      staffAttitudeRating,
      facilityRating,
      valueForMoneyRating,
      checkInExperienceRating,
      checkOutExperienceRating,
      bookingExperienceRating,
      customerNote: dto.customerNote || null,
      csNote: dto.csNote || null,
      technicianId: task.technicianId,
      ccInStaffId: task.ccInStaffId,
      ccOutStaffId: task.ccOutStaffId,
      bookerStaffId: task.bookerStaffId,
    };

    // Upsert survey rating
    const existing = await fastify.prisma.crm.crmSurveyRating.findUnique({
      where: { happyCallTaskId: taskId },
    });

    let survey: SafeAny;
    if (existing) {
      survey = await fastify.prisma.crm.crmSurveyRating.update({
        where: { id: existing.id },
        data: surveyData,
      });
    } else {
      survey = await fastify.prisma.crm.crmSurveyRating.create({
        data: surveyData,
      });
    }

    // Mark task as completed
    await fastify.prisma.crm.crmHappyCallTask.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // Auto-create tickets for ratings <= 3
    let ticketsCreated = 0;
    const handlerConfig = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'TICKET_DEPARTMENT_HANDLER_CONFIG' },
    });
    let handlerMap: Record<string, number> = {};
    if (handlerConfig && handlerConfig.value) {
      try {
        handlerMap = JSON.parse(handlerConfig.value);
      } catch (e) {}
    }

    const ratingChecks = [
      { rating: technicianQualityRating, type: 'TECHNICIAN_QUALITY', department: 'CV', staffId: task.technicianId },
      {
        rating: staffAttitudeRating,
        type: 'STAFF_ATTITUDE',
        department: 'CC',
        staffId: task.ccOutStaffId || task.ccInStaffId,
      },
      { rating: facilityRating, type: 'FACILITY_ISSUE', department: 'FACILITY', staffId: null },
      { rating: valueForMoneyRating, type: 'PRICING_COMPLAINT', department: 'MANAGEMENT', staffId: null },
      { rating: bookingExperienceRating, type: 'STAFF_ATTITUDE', department: 'BK', staffId: task.bookerStaffId },
    ];

    const lowRatingItems = ratingChecks.filter((check) => check.rating != null && check.rating <= 3);

    if (lowRatingItems.length > 0) {
      const ticketCode = await this.generateTicketCode(fastify);
      const minRating = Math.min(...lowRatingItems.map((i) => i.rating!));
      const priority = minRating <= 2 ? 'URGENT' : 'HIGH';
      const slaHours = priority === 'URGENT' ? 4 : 24;
      const slaDueDate = new Date();
      slaDueDate.setHours(slaDueDate.getHours() + slaHours);

      const mainType = lowRatingItems[0].type;
      const mainDept =
        lowRatingItems.length === 1
          ? lowRatingItems[0].department
          : handlerMap['CSKH']
            ? 'CSKH'
            : lowRatingItems[0].department;

      const descriptions = lowRatingItems.map((i) => `- Bộ phận ${i.department}: ${i.rating}/5 sao`).join('\n');

      const masterTicket = await fastify.prisma.crm.crmCsTicket.create({
        data: {
          ticketCode,
          surveyRatingId: survey.id,
          happyCallTaskId: taskId,
          orderId: task.orderId,
          customerId: task.customerId,
          type: mainType,
          priority,
          status: 'OPEN',
          department: mainDept,
          relatedStaffId: lowRatingItems[0].staffId,
          assignedCsStaffId: task.assignedCsStaffId,
          description: `Khách hàng có ${lowRatingItems.length} vấn đề cần xử lý:\n${descriptions}\n\nGhi chú từ KH: ${dto.customerNote || 'N/A'}\nGhi chú từ CS: ${dto.csNote || 'N/A'}`,
          slaDueDate,
        },
      });

      const checkoutTime = task.checkoutDate ? new Date(task.checkoutDate).getTime() : Date.now();
      const isWithin3DayWarranty = Date.now() - checkoutTime <= 72 * 60 * 60 * 1000;

      for (const item of lowRatingItems) {
        const handlerId = handlerMap[item.department] || null;
        const isCv = item.department === 'CV';

        let issueSummary = `Phàn nàn ${item.rating}/5 sao cho bộ phận ${item.department}`;
        if (isCv && dto.technicalIssueTags && dto.technicalIssueTags.length > 0) {
          issueSummary += ` (${dto.technicalIssueTags.join(', ')})`;
        }

        await fastify.prisma.crm.crmCsTicketSubtask.create({
          data: {
            ticketId: masterTicket.id,
            department: item.department,
            assignedStaffId: handlerId,
            status: 'PENDING',
            issueSummary,
            technicalIssueTags: isCv && dto.technicalIssueTags ? JSON.stringify(dto.technicalIssueTags) : null,
            isWithin3DayWarranty: isCv ? isWithin3DayWarranty : false,
            previousTechnicianId: isCv ? task.technicianId : null,
          },
        });
      }

      ticketsCreated = 1;
    } else if (dto.overallRating <= 3) {
      const ticketCode = await this.generateTicketCode(fastify);
      const priority = dto.overallRating <= 2 ? 'URGENT' : 'HIGH';
      const slaHours = priority === 'URGENT' ? 4 : 24;
      const slaDueDate = new Date();
      slaDueDate.setHours(slaDueDate.getHours() + slaHours);

      const masterTicket = await fastify.prisma.crm.crmCsTicket.create({
        data: {
          ticketCode,
          surveyRatingId: survey.id,
          happyCallTaskId: taskId,
          orderId: task.orderId,
          customerId: task.customerId,
          type: 'IMPROVEMENT_SUGGESTION',
          priority,
          status: 'OPEN',
          department: 'CSKH',
          assignedCsStaffId: task.assignedCsStaffId,
          description: `Đánh giá chung ${dto.overallRating}/5 sao. Ghi chú KH: ${dto.customerNote || 'N/A'}`,
          slaDueDate,
        },
      });

      await fastify.prisma.crm.crmCsTicketSubtask.create({
        data: {
          ticketId: masterTicket.id,
          department: 'CSKH',
          assignedStaffId: handlerMap['CSKH'] || task.assignedCsStaffId,
          status: 'PENDING',
          issueSummary: `Đánh giá chung ${dto.overallRating}/5 sao`,
        },
      });

      ticketsCreated = 1;
    }

    return { survey, ticketsCreated };
  }

  /**
   * Generate a unique ticket code: TK-YYYYMMDD-NNN
   */
  async generateTicketCode(fastify: FastifyInstance): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TK-${dateStr}-`;

    const lastTicket = await fastify.prisma.crm.crmCsTicket.findFirst({
      where: { ticketCode: { startsWith: prefix } },
      orderBy: { ticketCode: 'desc' },
    });

    let nextNum = 1;
    if (lastTicket) {
      const lastNum = parseInt(lastTicket.ticketCode.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(3, '0')}`;
  }
}

export const happyCallService = new HappyCallService();
