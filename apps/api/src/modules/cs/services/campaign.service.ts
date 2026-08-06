import { FastifyInstance } from 'fastify';
import { CsCampaign, ListCsCampaignsParams, CreateCsCampaignDto, UpdateCsCampaignDto } from '@mos-lab/shared';

type SafeAny = any;

export class CsCampaignService {
  async listCampaigns(
    fastify: FastifyInstance,
    params: ListCsCampaignsParams
  ): Promise<{ data: SafeAny[]; total: number }> {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: SafeAny = {};
    if (params.status) where.status = params.status;

    const [campaigns, total] = await Promise.all([
      fastify.prisma.crm.crmCsCampaign.findMany({
        where,
        include: { tasks: { select: { id: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      fastify.prisma.crm.crmCsCampaign.count({ where }),
    ]);

    // Enrich with creator names from CRM staff
    const staffIds = [...new Set(campaigns.map((c) => c.createdByStaffId))];
    const staffMap = new Map<number, string>();
    if (staffIds.length > 0) {
      const staff = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, displayName: true },
      });
      for (const s of staff) staffMap.set(s.id, s.displayName);
    }

    const data = campaigns.map((c: SafeAny) => {
      const tasks = c.tasks || [];
      const completed = tasks.filter((t: SafeAny) => t.status === 'COMPLETED').length;
      const pending = tasks.filter((t: SafeAny) => ['PENDING', 'CALLING', 'NO_ANSWER'].includes(t.status)).length;

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        target: c.target,
        status: c.status,
        dateFrom: c.dateFrom?.toISOString()?.slice(0, 10) || '',
        dateTo: c.dateTo?.toISOString()?.slice(0, 10) || '',
        filterBucket: c.filterBucket,
        sampleSize: c.sampleSize,
        totalCustomers: tasks.length,
        completedCalls: completed,
        pendingCalls: pending,
        avgRating: null,
        createdByStaffId: c.createdByStaffId,
        createdByStaffName: staffMap.get(c.createdByStaffId) || '',
        createdAt: c.createdAt?.toISOString() || '',
        updatedAt: c.updatedAt?.toISOString() || '',
      };
    });

    return { data, total };
  }

  async createCampaign(fastify: FastifyInstance, dto: CreateCsCampaignDto, staffId: number): Promise<SafeAny> {
    return fastify.prisma.crm.crmCsCampaign.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        target: dto.target,
        status: 'DRAFT',
        dateFrom: dto.dateFrom ? new Date(dto.dateFrom + 'T00:00:00.000Z') : null,
        dateTo: dto.dateTo ? new Date(dto.dateTo + 'T00:00:00.000Z') : null,
        filterBucket: dto.filterBucket || null,
        sampleSize: dto.sampleSize || null,
        createdByStaffId: staffId,
      },
    });
  }

  async activateCampaign(
    fastify: FastifyInstance,
    campaignId: number
  ): Promise<{ campaign: SafeAny; tasksCreated: number }> {
    const campaign = await fastify.prisma.crm.crmCsCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign không tồn tại');
    if (campaign.status !== 'DRAFT') throw new Error('Chỉ có thể kích hoạt Campaign ở trạng thái DRAFT');

    const dateFrom = campaign.dateFrom?.toISOString().slice(0, 10);
    const dateTo = campaign.dateTo?.toISOString().slice(0, 10);

    if (!dateFrom || !dateTo) throw new Error('Campaign phải có ngày bắt đầu và kết thúc');

    // Get completed orders in date range from legacy DB using raw SQL
    let orderQuery = `
      SELECT DISTINCT
        o.id AS orderId,
        o.user_id AS customerId
      FROM \`order\` o
      LEFT JOIN report_order ro ON o.id = ro.order_id
      WHERE o.order_state = 'Completed'
        AND DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) BETWEEN ? AND ?
      ORDER BY RAND()
    `;

    const queryParams: SafeAny[] = [dateFrom, dateTo];
    if (campaign.sampleSize) {
      orderQuery += ` LIMIT ?`;
      queryParams.push(campaign.sampleSize);
    }

    const orders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(orderQuery, ...queryParams);

    // Get active CS staff for round-robin
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
      const staffs = await fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true, role: 'cs' },
        select: { id: true },
      });
      csStaffIds = staffs.map((s) => s.id);
    }
    if (!csStaffIds.length) throw new Error('Chưa cấu hình nhân viên CS (ACTIVE_CS_STAFF_CONFIG)');

    // Create tasks with round-robin
    let staffIndex = 0;
    let tasksCreated = 0;
    for (const order of orders) {
      const assignedStaffId = csStaffIds[staffIndex % csStaffIds.length];
      staffIndex++;

      await fastify.prisma.crm.crmCsCampaignTask.create({
        data: {
          campaignId,
          orderId: Number(order.orderId),
          customerId: Number(order.customerId),
          assignedCsStaffId: assignedStaffId,
          status: 'PENDING',
          attemptCount: 0,
        },
      });
      tasksCreated++;
    }

    // Update campaign status
    const updatedCampaign = await fastify.prisma.crm.crmCsCampaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' },
    });

    return { campaign: updatedCampaign, tasksCreated };
  }

  async updateCampaign(fastify: FastifyInstance, campaignId: number, dto: UpdateCsCampaignDto): Promise<SafeAny> {
    return fastify.prisma.crm.crmCsCampaign.update({
      where: { id: campaignId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async getCampaignTasks(
    fastify: FastifyInstance,
    campaignId: number,
    params: SafeAny
  ): Promise<{ data: SafeAny[]; total: number }> {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const [tasks, total] = await Promise.all([
      fastify.prisma.crm.crmCsCampaignTask.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      fastify.prisma.crm.crmCsCampaignTask.count({ where: { campaignId } }),
    ]);

    if (!tasks.length) return { data: [], total };

    // Batch enrich from legacy DB
    const customerIds = [...new Set(tasks.map((t) => t.customerId))];
    const customerMap = new Map<number, { name: string; phone: string }>();
    if (customerIds.length > 0) {
      const customers = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT u.id, COALESCE(up.full_name, up.first_name, up.username) AS name, up.username AS phone
         FROM user u LEFT JOIN user_profile up ON u.id = up.user_id
         WHERE u.id IN (${customerIds.join(',')})`
      );
      for (const c of customers) {
        customerMap.set(Number(c.id), { name: c.name || '', phone: c.phone || '' });
      }
    }

    const staffIds = [...new Set(tasks.map((t) => t.assignedCsStaffId).filter(Boolean))] as number[];
    const staffMap = new Map<number, string>();
    if (staffIds.length > 0) {
      const crmStaff = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, displayName: true },
      });
      for (const s of crmStaff) staffMap.set(s.id, s.displayName);
    }

    const data = tasks.map((t: SafeAny) => {
      const customer = customerMap.get(t.customerId);
      return {
        id: t.id,
        campaignId: t.campaignId,
        orderId: t.orderId,
        customerId: t.customerId,
        customerName: customer?.name || '',
        customerPhone: customer?.phone || '',
        assignedCsStaffId: t.assignedCsStaffId,
        assignedCsStaffName: t.assignedCsStaffId ? staffMap.get(t.assignedCsStaffId) || '' : '',
        status: t.status,
        attemptCount: t.attemptCount,
        surveyRatingId: t.surveyRatingId,
        completedAt: t.completedAt?.toISOString() || null,
        createdAt: t.createdAt?.toISOString() || '',
      };
    });

    return { data, total };
  }
}

export const campaignService = new CsCampaignService();
