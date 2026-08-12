import { FastifyInstance } from 'fastify';
import {
  CsTicket,
  ListCsTicketsParams,
  CreateCsTicketDto,
  UpdateCsTicketDto,
  ResolveCsTicketDto,
  CreateTicketCommentDto,
  CsTicketComment,
} from '@mos-lab/shared';
import { happyCallService } from './happy-call.service.js';

/* eslint-disable @typescript-eslint/no-explicit-any -- ticket subtasks and legacy raw-query rows have runtime-defined shapes. */
type SafeAny = any;

export class TicketService {
  async listTickets(
    fastify: FastifyInstance,
    params: ListCsTicketsParams
  ): Promise<{ data: CsTicket[]; total: number }> {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: SafeAny = {};
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;
    if (params.department) where.department = params.department;
    if (params.type) where.type = params.type;
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom + 'T00:00:00.000Z');
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo + 'T23:59:59.999Z');
    }
    if (params.search) {
      where.OR = [{ ticketCode: { contains: params.search } }, { description: { contains: params.search } }];
    }

    const [tickets, total] = await Promise.all([
      fastify.prisma.crm.crmCsTicket.findMany({
        where,
        include: {
          comments: { orderBy: { createdAt: 'asc' } },
          subtasks: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      fastify.prisma.crm.crmCsTicket.count({ where }),
    ]);

    if (!tickets.length) return { data: [], total };

    // Batch enrich with names from legacy DB
    const subtaskStaffIds = tickets.flatMap((t) => [
      ...(t.subtasks || []).map((s: any) => s.assignedStaffId).filter(Boolean),
      ...(t.subtasks || []).map((s: any) => s.resolvedByStaffId).filter(Boolean),
    ]);

    const customerIds = [...new Set(tickets.map((t) => t.customerId).filter(Boolean))] as number[];
    const staffIds = [
      ...new Set([
        ...tickets.map((t) => t.assignedCsStaffId).filter(Boolean),
        ...tickets.map((t) => t.relatedStaffId).filter(Boolean),
        ...tickets.map((t) => t.resolvedByStaffId).filter(Boolean),
        ...subtaskStaffIds,
      ] as number[]),
    ];

    const customerMap = new Map<number, { name: string; phone: string; avatar: string | null }>();
    const staffMap = new Map<number, string>();

    if (customerIds.length > 0) {
      const customers = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT u.id, COALESCE(up.full_name, up.first_name, up.username) AS name, up.username AS phone, up.avatar AS avatar
         FROM user u LEFT JOIN user_profile up ON u.id = up.user_id
         WHERE u.id IN (${customerIds.join(',')})`
      );
      for (const c of customers) {
        customerMap.set(Number(c.id), { name: c.name || '', phone: c.phone || '', avatar: c.avatar || null });
      }
    }

    if (staffIds.length > 0) {
      // 1. Get from CRM staff table first (Primary source for CRM CS staff and department leads)
      const crmStaff = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, displayName: true },
      });
      for (const s of crmStaff) {
        if (s.displayName) staffMap.set(s.id, s.displayName);
      }

      // 2. Fallback to legacy user_profile for remaining staff IDs
      const remainingStaffIds = staffIds.filter((id) => !staffMap.has(id));
      if (remainingStaffIds.length > 0) {
        const legacyStaff = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT up.user_id AS id, COALESCE(up.full_name, up.first_name, up.username) AS name
           FROM user_profile up WHERE up.user_id IN (${remainingStaffIds.join(',')})`
        );
        for (const s of legacyStaff) {
          staffMap.set(Number(s.id), s.name || '');
        }
      }
    }

    const now = new Date();
    const data: CsTicket[] = tickets.map((t: SafeAny) => {
      const customer = t.customerId ? customerMap.get(t.customerId) : null;
      const enrichedSubtasks = (t.subtasks || []).map((s: SafeAny) => {
        let parsedTags: string[] = [];
        if (s.technicalIssueTags) {
          try {
            parsedTags = JSON.parse(s.technicalIssueTags);
          } catch {
            // Invalid tag JSON intentionally becomes an empty tag list.
          }
        }
        return {
          id: s.id,
          ticketId: s.ticketId,
          department: s.department,
          assignedStaffId: s.assignedStaffId,
          assignedStaffName: s.assignedStaffId ? staffMap.get(s.assignedStaffId) || null : null,
          status: s.status,
          issueSummary: s.issueSummary,
          resolutionNote: s.resolutionNote,
          actionPlan: s.actionPlan,
          technicalIssueTags: parsedTags,
          warrantyType: s.warrantyType,
          isWithin3DayWarranty: s.isWithin3DayWarranty,
          previousTechnicianId: s.previousTechnicianId,
          previousTechnicianName: s.previousTechnicianId ? staffMap.get(s.previousTechnicianId) || null : null,
          replacementTechnicianId: s.replacementTechnicianId,
          replacementTechnicianName: s.replacementTechnicianId ? staffMap.get(s.replacementTechnicianId) || null : null,
          warrantyAppointmentDate: s.warrantyAppointmentDate?.toISOString() || null,
          nextFalOrderServiceId: s.nextFalOrderServiceId ? Number(s.nextFalOrderServiceId) : null,
          inspectionStoreName: s.inspectionStoreName || null,
          inspectionAppointmentDate: s.inspectionAppointmentDate?.toISOString() || null,
          inspectionResultNote: s.inspectionResultNote || null,
          resolvedAt: s.resolvedAt?.toISOString() || null,
          resolvedByStaffId: s.resolvedByStaffId,
          resolvedByStaffName: s.resolvedByStaffId ? staffMap.get(s.resolvedByStaffId) || null : null,
          createdAt: s.createdAt?.toISOString() || '',
        };
      });

      const subtaskDepts = enrichedSubtasks.map((s: any) => s.department);
      const uniqueDepts = subtaskDepts.length > 0 ? [...new Set(subtaskDepts)] : [t.department || 'CSKH'];

      return {
        id: t.id,
        ticketCode: t.ticketCode,
        surveyRatingId: t.surveyRatingId,
        happyCallTaskId: t.happyCallTaskId,
        orderId: t.orderId,
        customerId: t.customerId || 0,
        customerName: customer?.name || '',
        customerPhone: customer?.phone || '',
        customerAvatar: customer?.avatar || null,
        type: t.type,
        priority: t.priority,
        status: t.status,
        department: t.department || '',
        departments: uniqueDepts,
        subtasks: enrichedSubtasks,
        completedSubtasksCount: enrichedSubtasks.filter((s: any) => s.status === 'RESOLVED').length,
        totalSubtasksCount: enrichedSubtasks.length,
        relatedStaffId: t.relatedStaffId,
        relatedStaffName: t.relatedStaffId ? staffMap.get(t.relatedStaffId) || null : null,
        assignedCsStaffId: t.assignedCsStaffId || 0,
        assignedCsStaffName: t.assignedCsStaffId ? staffMap.get(t.assignedCsStaffId) || '' : '',
        description: t.description,
        slaDueDate: t.slaDueDate?.toISOString() || '',
        isOverdue: !['RESOLVED', 'CLOSED'].includes(t.status) && t.slaDueDate && new Date(t.slaDueDate) < now,
        resolutionNote: t.resolutionNote,
        actionPlan: t.actionPlan,
        resolvedAt: t.resolvedAt?.toISOString() || null,
        resolvedByStaffId: t.resolvedByStaffId,
        resolvedByStaffName: t.resolvedByStaffId ? staffMap.get(t.resolvedByStaffId) || null : null,
        createdAt: t.createdAt?.toISOString() || '',
        updatedAt: t.updatedAt?.toISOString() || '',
        comments: (t.comments || []).map((c: SafeAny) => ({
          id: c.id,
          ticketId: c.ticketId,
          staffId: c.staffId,
          staffName: c.staffName || '',
          content: c.content,
          isInternal: c.isInternal,
          createdAt: c.createdAt?.toISOString() || '',
        })),
      };
    });

    return { data, total };
  }

  async createTicket(fastify: FastifyInstance, dto: CreateCsTicketDto, csStaffId: number): Promise<SafeAny> {
    const ticketCode = await happyCallService.generateTicketCode(fastify);
    const priority = dto.priority || 'MEDIUM';
    const slaHours = priority === 'URGENT' ? 4 : priority === 'HIGH' ? 8 : priority === 'MEDIUM' ? 24 : 48;
    const slaDueDate = new Date();
    slaDueDate.setHours(slaDueDate.getHours() + slaHours);

    let customerIdNum: number | null = null;
    if (typeof dto.customerId === 'number' && !isNaN(dto.customerId) && dto.customerId > 0) {
      const found = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT id FROM user WHERE id = ? LIMIT 1`,
        dto.customerId
      );
      if (found && found.length > 0) {
        customerIdNum = Number(found[0].id);
      }
    } else if (dto.customerId != null) {
      const inputStr = String(dto.customerId).trim();
      if (inputStr) {
        const queryParam = !isNaN(Number(inputStr)) ? Number(inputStr) : -1;
        const found = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT u.id FROM user u 
           LEFT JOIN user_profile up ON u.id = up.user_id 
           WHERE u.id = ? OR up.username = ? OR up.full_name LIKE ? OR up.first_name LIKE ? LIMIT 1`,
          queryParam,
          inputStr,
          `%${inputStr}%`,
          `%${inputStr}%`
        );
        if (found && found.length > 0) {
          customerIdNum = Number(found[0].id);
        }
      }
    }

    if (!customerIdNum) {
      throw new Error('Không tìm thấy thông tin khách hàng trong hệ thống. Vui lòng chọn hoặc nhập đúng Mã KH / SĐT!');
    }

    const targetDepts: string[] =
      (dto as any).departments && Array.isArray((dto as any).departments) && (dto as any).departments.length > 0
        ? (dto as any).departments
        : [dto.department || 'CSKH'];

    const targetDept = targetDepts[0];
    const handlerMap = await this.getDepartmentHandlers(fastify);
    const assignedCsStaffId = csStaffId || handlerMap[targetDept] || 1;

    // Check if there is an existing OPEN Master Ticket for the same customer in the last 24h
    const existingMaster = await fastify.prisma.crm.crmCsTicket.findFirst({
      where: {
        customerId: customerIdNum,
        status: 'OPEN',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: { subtasks: true },
      orderBy: { createdAt: 'asc' },
    });

    if (existingMaster) {
      // Auto-merge into existing Master Ticket
      if (existingMaster.subtasks.length === 0 && existingMaster.department) {
        await fastify.prisma.crm.crmCsTicketSubtask.create({
          data: {
            ticketId: existingMaster.id,
            department: existingMaster.department,
            assignedStaffId: existingMaster.assignedCsStaffId || handlerMap[existingMaster.department] || null,
            status: 'PENDING',
            issueSummary: existingMaster.description || `Vấn đề bộ phận ${existingMaster.department}`,
          },
        });
      }

      for (const dept of targetDepts) {
        const handlerId = handlerMap[dept] || null;
        await fastify.prisma.crm.crmCsTicketSubtask.create({
          data: {
            ticketId: existingMaster.id,
            department: dept,
            assignedStaffId: handlerId,
            status: 'PENDING',
            issueSummary: `Vấn đề bổ sung [${dept}]: ${dto.description || 'Yêu cầu xử lý'}`,
          },
        });
      }

      const newDescription = `${existingMaster.description}\n\n[Bổ sung thêm vấn đề]: ${dto.description || ''}`;
      return fastify.prisma.crm.crmCsTicket.update({
        where: { id: existingMaster.id },
        data: { description: newDescription },
      });
    }

    const masterTicket = await fastify.prisma.crm.crmCsTicket.create({
      data: {
        ticketCode,
        orderId: dto.orderId || null,
        customerId: customerIdNum,
        type: dto.type || 'COMPLAINT',
        priority,
        status: 'OPEN',
        department: targetDept,
        relatedStaffId: dto.relatedStaffId || null,
        assignedCsStaffId,
        description: dto.description || '',
        slaDueDate,
      },
    });

    // Create subtasks for each department
    for (const dept of targetDepts) {
      const handlerId = handlerMap[dept] || null;
      await fastify.prisma.crm.crmCsTicketSubtask.create({
        data: {
          ticketId: masterTicket.id,
          department: dept,
          assignedStaffId: handlerId,
          status: 'PENDING',
          issueSummary: `Vấn đề bộ phận ${dept}: ${dto.description || 'Yêu cầu xử lý'}`,
        },
      });
    }

    return masterTicket;
  }

  async getDepartmentHandlers(fastify: FastifyInstance): Promise<Record<string, number>> {
    const config = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'TICKET_DEPARTMENT_HANDLER_CONFIG' },
    });
    if (!config || !config.value) return {};
    try {
      return JSON.parse(config.value);
    } catch {
      return {};
    }
  }

  async updateDepartmentHandlers(
    fastify: FastifyInstance,
    configMap: Record<string, number>
  ): Promise<Record<string, number>> {
    const value = JSON.stringify(configMap || {});
    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: 'TICKET_DEPARTMENT_HANDLER_CONFIG' },
      update: { value, updatedAt: new Date() },
      create: { key: 'TICKET_DEPARTMENT_HANDLER_CONFIG', value },
    });
    return configMap;
  }

  async updateTicket(fastify: FastifyInstance, ticketId: number, dto: UpdateCsTicketDto): Promise<SafeAny> {
    const ticket = await fastify.prisma.crm.crmCsTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket không tồn tại');

    const updateData: SafeAny = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.priority) {
      updateData.priority = dto.priority;
      const slaHours = dto.priority === 'URGENT' ? 4 : 24;
      const slaDueDate = new Date();
      slaDueDate.setHours(slaDueDate.getHours() + slaHours);
      updateData.slaDueDate = slaDueDate;
    }
    if (dto.department) updateData.department = dto.department;
    if (dto.relatedStaffId !== undefined) updateData.relatedStaffId = dto.relatedStaffId;
    if (dto.assignedCsStaffId) updateData.assignedCsStaffId = dto.assignedCsStaffId;

    return fastify.prisma.crm.crmCsTicket.update({
      where: { id: ticketId },
      data: updateData,
    });
  }

  async resolveTicket(
    fastify: FastifyInstance,
    ticketId: number,
    dto: ResolveCsTicketDto,
    staffId: number
  ): Promise<SafeAny> {
    const ticket = await fastify.prisma.crm.crmCsTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket không tồn tại');

    if (!dto.actionPlan || dto.actionPlan.trim().length === 0) {
      throw new Error('Action Plan (Hành động cải thiện) là bắt buộc khi đóng Ticket');
    }

    return fastify.prisma.crm.crmCsTicket.update({
      where: { id: ticketId },
      data: {
        status: 'RESOLVED',
        resolutionNote: dto.resolutionNote,
        actionPlan: dto.actionPlan,
        resolvedAt: new Date(),
        resolvedByStaffId: staffId,
      },
    });
  }

  async addComment(
    fastify: FastifyInstance,
    ticketId: number,
    dto: CreateTicketCommentDto,
    staffId: number,
    staffName: string
  ): Promise<CsTicketComment> {
    const ticket = await fastify.prisma.crm.crmCsTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket không tồn tại');

    const comment = await fastify.prisma.crm.crmCsTicketComment.create({
      data: {
        ticketId,
        staffId,
        staffName,
        content: dto.content,
        isInternal: dto.isInternal !== false,
      },
    });

    return comment as unknown as CsTicketComment;
  }

  async scheduleShopInspection(
    fastify: FastifyInstance,
    subtaskId: number,
    dto: { inspectionStoreName: string; inspectionAppointmentDate: string; note?: string },
    staffId: number,
    staffName: string
  ): Promise<SafeAny> {
    const subtask = await fastify.prisma.crm.crmCsTicketSubtask.findUnique({
      where: { id: subtaskId },
      include: { ticket: true },
    });
    if (!subtask) throw new Error('Subtask không tồn tại');

    const appointmentDate = new Date(dto.inspectionAppointmentDate);
    const updatedSubtask = await fastify.prisma.crm.crmCsTicketSubtask.update({
      where: { id: subtaskId },
      data: {
        status: 'APPOINTMENT_SCHEDULED',
        inspectionStoreName: dto.inspectionStoreName,
        inspectionAppointmentDate: appointmentDate,
        resolutionNote: dto.note || subtask.resolutionNote,
      },
    });

    const appointmentStr = `${String(appointmentDate.getDate()).padStart(2, '0')}/${String(appointmentDate.getMonth() + 1).padStart(2, '0')}/${appointmentDate.getFullYear()} ${String(appointmentDate.getHours()).padStart(2, '0')}:${String(appointmentDate.getMinutes()).padStart(2, '0')}`;
    await this.addComment(
      fastify,
      subtask.ticketId,
      {
        content: `📅 CSKH (${staffName}) đã đặt Lịch Hẹn Khách Đến Shop Soi Mi Trực Tiếp:\n- Store: ${dto.inspectionStoreName}\n- Thời gian: ${appointmentStr}${dto.note ? `\n- Ghi chú: ${dto.note}` : ''}`,
        isInternal: true,
      },
      staffId,
      staffName
    );

    return updatedSubtask;
  }

  async resolveSubtask(
    fastify: FastifyInstance,
    subtaskId: number,
    dto: {
      resolutionNote?: string;
      actionPlan: string;
      warrantyType?: string;
      replacementTechnicianId?: number;
      warrantyAppointmentDate?: string;
      inspectionResultNote?: string;
    },
    staffId: number,
    staffName: string
  ): Promise<SafeAny> {
    const subtask = await fastify.prisma.crm.crmCsTicketSubtask.findUnique({
      where: { id: subtaskId },
      include: { ticket: true },
    });
    if (!subtask) throw new Error('Subtask không tồn tại');

    if (!dto.actionPlan || dto.actionPlan.trim().length === 0) {
      throw new Error('Hành động cải thiện là bắt buộc khi giải quyết vấn đề nội bộ');
    }

    const subtaskUpdateData: SafeAny = {
      status: 'RESOLVED',
      resolutionNote: dto.resolutionNote || null,
      actionPlan: dto.actionPlan,
      resolvedAt: new Date(),
      resolvedByStaffId: staffId,
    };

    if (dto.warrantyType) subtaskUpdateData.warrantyType = dto.warrantyType;
    if (dto.replacementTechnicianId) subtaskUpdateData.replacementTechnicianId = dto.replacementTechnicianId;
    if (dto.warrantyAppointmentDate) subtaskUpdateData.warrantyAppointmentDate = new Date(dto.warrantyAppointmentDate);
    if (dto.inspectionResultNote) subtaskUpdateData.inspectionResultNote = dto.inspectionResultNote;

    const updatedSubtask = await fastify.prisma.crm.crmCsTicketSubtask.update({
      where: { id: subtaskId },
      data: subtaskUpdateData,
    });

    // Add internal audit comment to Master Ticket
    let falComment = `✅ Trưởng bộ phận ${subtask.department} (${staffName}) đã soi mi tại Shop & nộp Giải Pháp Nội Bộ:\n- Kết quả soi mi: ${dto.inspectionResultNote || 'N/A'}\n- Hành động: ${dto.actionPlan}${dto.resolutionNote ? `\n- Ghi chú: ${dto.resolutionNote}` : ''}`;
    if (dto.warrantyType) {
      if (dto.warrantyType === 'LOG_FREE') {
        falComment += `\n📋 Tùy chọn bảo hành: LOG (Tháo mi / Kiểm tra mi 0đ). CV tháo mi được tính điểm Banana. Không phạt CV hay CC cũ.`;
      } else if (dto.warrantyType === 'FIX_25M_FREE') {
        falComment += `\n🛠️ Tùy chọn bảo hành: FIX (Sửa mi <=25p 0đ). CV mới được Banana nếu <=25p. Gắn thu hồi thưởng (_punishBonus) CV cũ.`;
      } else if (dto.warrantyType === 'ADJUST_FREE') {
        falComment += `\n📐 Tùy chọn bảo hành: ADJUST (Chỉnh dáng mi 0đ). Gắn thu hồi thưởng (_punishBonus) CC cũ. KHÔNG phạt CV.`;
      } else if (dto.warrantyType === 'REPLACE_FULL_FREE') {
        falComment += `\n🔄 Tùy chọn bảo hành: REPLACE (Nối lại bộ mới 100% 0đ). Gắn thu hồi thưởng (_punishBonus) CV cũ.`;
      }
    }

    await this.addComment(
      fastify,
      subtask.ticketId,
      {
        content: falComment,
        isInternal: true,
      },
      staffId,
      staffName
    );

    // Check if ALL subtasks for this Master Ticket are RESOLVED
    const remainingPending = await fastify.prisma.crm.crmCsTicketSubtask.count({
      where: {
        ticketId: subtask.ticketId,
        status: 'PENDING',
      },
    });

    if (remainingPending === 0 && subtask.ticket.status === 'OPEN') {
      await fastify.prisma.crm.crmCsTicket.update({
        where: { id: subtask.ticketId },
        data: { status: 'PENDING_RESPONSE' },
      });
    }

    return updatedSubtask;
  }
}

export const ticketService = new TicketService();
