import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../../generated/crm-client/index.js';
import type {
  AcademyCourse,
  AcademyFollowUpTask,
  AcademyPlaybook,
  CreateAcademyFollowUpRequest,
  ListAcademyFollowUpsParams,
  UpdateAcademyFollowUpRequest,
  UpsertAcademyCourseRequest,
  UpsertAcademyPlaybookRequest,
} from '@mos-lab/shared';
import {
  AcademySalesError,
  asDate,
  assertAcademyAccess,
  clampPagination,
  getAcademyIctDayBounds,
  isManager,
  sanitizeAcademyCourseRichText,
  taskAccessWhere,
  visibleStaffIds,
  type AcademyActor,
} from './academy-sales-helpers.js';
import { toCourse, toFollowUp, toPlaybook } from './academy-sales-mappers.js';
import { getAccessibleAcademyLead } from './academy-leads.service.js';

export async function listAcademyFollowUps(
  fastify: FastifyInstance,
  actor: AcademyActor,
  params: ListAcademyFollowUpsParams
) {
  assertAcademyAccess(actor);
  const page = clampPagination(params.page, 1, 100000);
  const limit = clampPagination(params.limit, 20, 100);
  const clauses: Prisma.CrmAcademyFollowUpTaskWhereInput[] = [await taskAccessWhere(fastify, actor)];
  if (params.status && params.status !== 'ALL') clauses.push({ status: params.status });
  const now = new Date();
  const today = getAcademyIctDayBounds(now);
  if (params.bucket === 'OVERDUE') clauses.push({ status: 'PENDING', dueAt: { lt: today.start } });
  if (params.bucket === 'TODAY') clauses.push({ status: 'PENDING', dueAt: { gte: today.start, lte: today.end } });
  if (params.bucket === 'UPCOMING') clauses.push({ status: 'PENDING', dueAt: { gt: today.end } });
  if (params.bucket === 'UNDATED') clauses.push({ status: 'PENDING', dueAt: null });
  const search = String(params.search || '').trim();
  if (search) clauses.push({ OR: [{ content: { contains: search } }, { lead: { name: { contains: search } } }] });
  const where: Prisma.CrmAcademyFollowUpTaskWhereInput = { AND: clauses };
  const [rows, total] = await Promise.all([
    fastify.prisma.crm.crmAcademyFollowUpTask.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        lead: { select: { name: true } },
        assignee: { select: { id: true, displayName: true, email: true } },
      },
    }),
    fastify.prisma.crm.crmAcademyFollowUpTask.count({ where }),
  ]);
  return { data: rows.map(toFollowUp), total, page, limit };
}

export async function createAcademyFollowUp(
  fastify: FastifyInstance,
  actor: AcademyActor,
  input: CreateAcademyFollowUpRequest
): Promise<AcademyFollowUpTask> {
  await getAccessibleAcademyLead(fastify, actor, input.leadId);
  const content = String(input.content || '').trim();
  if (!content) throw new AcademySalesError('Nội dung follow-up là bắt buộc.');
  if (input.assigneeStaffId) {
    const visibleIds = await visibleStaffIds(fastify, actor);
    if (visibleIds && !visibleIds.includes(input.assigneeStaffId)) {
      throw new AcademySalesError('Bạn chỉ có thể giao task cho thành viên trong phạm vi phụ trách.', 403);
    }
  }
  const task = await fastify.prisma.crm.crmAcademyFollowUpTask.create({
    data: {
      leadId: input.leadId,
      content,
      dueAt: asDate(input.dueAt),
      pancakeLink: input.pancakeLink?.trim() || null,
      assigneeStaffId: input.assigneeStaffId === undefined ? actor.id : input.assigneeStaffId,
    },
    include: { lead: { select: { name: true } }, assignee: { select: { id: true, displayName: true, email: true } } },
  });
  return toFollowUp(task);
}

export async function updateAcademyFollowUp(
  fastify: FastifyInstance,
  actor: AcademyActor,
  taskId: number,
  input: UpdateAcademyFollowUpRequest
): Promise<AcademyFollowUpTask> {
  assertAcademyAccess(actor);
  const existing = await fastify.prisma.crm.crmAcademyFollowUpTask.findUnique({ where: { id: taskId } });
  if (!existing) throw new AcademySalesError('Không tìm thấy follow-up task.', 404);
  const taskScope = await taskAccessWhere(fastify, actor);
  const permitted = await fastify.prisma.crm.crmAcademyFollowUpTask.findFirst({
    where: { AND: [{ id: taskId }, taskScope] },
    select: { id: true },
  });
  if (!permitted) throw new AcademySalesError('Bạn không có quyền sửa follow-up task.', 403);
  if (input.assigneeStaffId !== undefined && input.assigneeStaffId !== null) {
    const visibleIds = await visibleStaffIds(fastify, actor);
    if (visibleIds && !visibleIds.includes(input.assigneeStaffId)) {
      throw new AcademySalesError('Bạn chỉ có thể giao task cho thành viên trong phạm vi phụ trách.', 403);
    }
  }
  const data: Prisma.CrmAcademyFollowUpTaskUpdateInput = {};
  if (input.content !== undefined) {
    const content = String(input.content || '').trim();
    if (!content) throw new AcademySalesError('Nội dung follow-up là bắt buộc.');
    data.content = content;
  }
  if (input.dueAt !== undefined) data.dueAt = asDate(input.dueAt);
  if (input.pancakeLink !== undefined) data.pancakeLink = input.pancakeLink?.trim() || null;
  if (input.assigneeStaffId !== undefined)
    data.assignee = input.assigneeStaffId ? { connect: { id: input.assigneeStaffId } } : { disconnect: true };
  if (input.status !== undefined) {
    data.status = input.status;
    data.completedAt = input.status === 'DONE' ? new Date() : null;
  }
  const task = await fastify.prisma.crm.crmAcademyFollowUpTask.update({
    where: { id: taskId },
    data,
    include: { lead: { select: { name: true } }, assignee: { select: { id: true, displayName: true, email: true } } },
  });
  return toFollowUp(task);
}

export async function listAcademyPlaybooks(fastify: FastifyInstance, actor: AcademyActor): Promise<AcademyPlaybook[]> {
  assertAcademyAccess(actor);
  const records = await fastify.prisma.crm.crmAcademyPlaybook.findMany({
    where: isManager(actor) ? {} : { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });
  return records.map(toPlaybook);
}

export async function upsertAcademyPlaybook(
  fastify: FastifyInstance,
  actor: AcademyActor,
  input: UpsertAcademyPlaybookRequest,
  id?: number
): Promise<AcademyPlaybook> {
  if (!isManager(actor)) {
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc Marketing & Sales được sửa playbook.', 403);
  }
  const title = String(input.title || '').trim();
  const category = String(input.category || '').trim();
  const content = String(input.content || '').trim();
  if (!title || !category || !content) {
    throw new AcademySalesError('Tiêu đề, danh mục và nội dung playbook là bắt buộc.');
  }
  const data = {
    title,
    category,
    content,
    description: input.description?.trim() || null,
    sortOrder: Math.max(0, Math.round(Number(input.sortOrder) || 0)),
    isActive: input.isActive ?? true,
  };
  const record = id
    ? await fastify.prisma.crm.crmAcademyPlaybook.update({ where: { id }, data })
    : await fastify.prisma.crm.crmAcademyPlaybook.create({ data });
  return toPlaybook(record);
}

export async function listAcademyCourses(fastify: FastifyInstance, actor: AcademyActor): Promise<AcademyCourse[]> {
  assertAcademyAccess(actor);
  const records = await fastify.prisma.crm.crmAcademyCourse.findMany({
    where: isManager(actor) ? {} : { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return records.map(toCourse);
}

export async function upsertAcademyCourse(
  fastify: FastifyInstance,
  actor: AcademyActor,
  input: UpsertAcademyCourseRequest,
  id?: number
): Promise<AcademyCourse> {
  if (!isManager(actor)) {
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc Marketing & Sales được sửa khóa học.', 403);
  }
  const code = String(input.code || '')
    .trim()
    .toLowerCase();
  const name = String(input.name || '').trim();
  if (!code || !name) throw new AcademySalesError('Mã và tên khóa học là bắt buộc.');
  const nameEn = input.nameEn === undefined ? undefined : input.nameEn?.trim() || null;
  if (nameEn && nameEn.length > 255) throw new AcademySalesError('Tên tiếng Anh không được vượt quá 255 ký tự.');
  const lessonCount = input.lessonCount === undefined ? undefined : Math.round(Number(input.lessonCount));
  if (lessonCount !== undefined && (!Number.isFinite(lessonCount) || lessonCount < 1)) {
    throw new AcademySalesError('Số buổi học phải là số nguyên lớn hơn 0.');
  }
  const lashModelCount = input.lashModelCount === undefined ? undefined : Math.round(Number(input.lashModelCount));
  if (lashModelCount !== undefined && (!Number.isFinite(lashModelCount) || lashModelCount < 0)) {
    throw new AcademySalesError('Số mẫu nối mi cần phải là số nguyên từ 0 trở lên.');
  }
  const market = input.market === undefined ? undefined : String(input.market).trim().toUpperCase();
  if (market !== undefined && market !== 'DOMESTIC' && market !== 'OVERSEAS') {
    throw new AcademySalesError('Nhóm học viên của khóa học không hợp lệ.');
  }
  const data = {
    code,
    name,
    ...(nameEn !== undefined ? { nameEn } : {}),
    tag: input.tag?.trim() || null,
    description: input.description?.trim() || null,
    ...(market !== undefined ? { market } : {}),
    ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl?.trim() || null } : {}),
    listPriceVnd: Math.max(0, Math.round(Number(input.listPriceVnd) || 0)),
    promoPriceVnd: Math.max(0, Math.round(Number(input.promoPriceVnd) || 0)),
    teacherBonusVnd: Math.max(0, Math.round(Number(input.teacherBonusVnd) || 0)),
    kitName: input.kitName?.trim() || null,
    kitUrl: input.kitUrl?.trim() || null,
    kitPriceVnd: Math.max(0, Math.round(Number(input.kitPriceVnd) || 0)),
    samplePriceVnd: Math.max(0, Math.round(Number(input.samplePriceVnd) || 0)),
    ...(lessonCount !== undefined ? { lessonCount } : {}),
    ...(lashModelCount !== undefined ? { lashModelCount } : {}),
    ...(input.syllabusHtml !== undefined ? { syllabusHtml: sanitizeAcademyCourseRichText(input.syllabusHtml) } : {}),
    syllabus: JSON.stringify(input.syllabus || []),
    sortOrder: Math.max(0, Math.round(Number(input.sortOrder) || 0)),
    isActive: input.isActive ?? true,
  };
  const record = id
    ? await fastify.prisma.crm.crmAcademyCourse.update({ where: { id }, data })
    : await fastify.prisma.crm.crmAcademyCourse.create({ data });
  return toCourse(record);
}
