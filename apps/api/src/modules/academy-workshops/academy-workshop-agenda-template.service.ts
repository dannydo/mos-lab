import type { FastifyInstance } from 'fastify';
import {
  removeVietnameseTones,
  type AcademyWorkshopAgendaTemplate,
  type CreateAcademyWorkshopAgendaTemplateRequest,
  type ListAcademyWorkshopAgendaTemplatesParams,
  type SafeAny,
  type UpdateAcademyWorkshopAgendaTemplateRequest,
  type UpsertAcademyWorkshopAgendaItemRequest,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../academy-sales/academy-sales.service.js';

const AGENDA_KINDS = new Set(['CONTENT', 'TALENT_TEST', 'GAME', 'BREAK', 'SALES', 'OTHER']);
const TEMPLATE_INCLUDE = {
  items: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
};

function manager(actor: AcademyActor) {
  return ['admin', 'super_admin', 'manager'].includes(actor.role);
}

function templateId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AcademySalesError('Mẫu agenda không hợp lệ.');
  return id;
}

export function normalizeAcademyWorkshopAgendaDefinition(input: UpsertAcademyWorkshopAgendaItemRequest[]): Array<{
  title: string;
  description: string | null;
  kind: string;
  plannedDurationSeconds: number;
  sortOrder: number;
}> {
  if (!Array.isArray(input) || input.length === 0) {
    throw new AcademySalesError('Mẫu agenda cần có ít nhất một mục.');
  }
  return input.map((item, index) => {
    const title = String(item.title || '').trim();
    const plannedDurationSeconds = Math.round(Number(item.plannedDurationSeconds));
    if (
      !title ||
      title.length > 180 ||
      !AGENDA_KINDS.has(item.kind) ||
      plannedDurationSeconds < 30 ||
      plannedDurationSeconds > 8 * 60 * 60
    ) {
      throw new AcademySalesError(`Mục agenda #${index + 1} không hợp lệ.`);
    }
    return {
      title,
      description: String(item.description || '').trim() || null,
      kind: item.kind,
      plannedDurationSeconds,
      sortOrder: index + 1,
    };
  });
}

export function toAcademyWorkshopAgendaTemplate(row: SafeAny): AcademyWorkshopAgendaTemplate {
  return {
    id: Number(row.id),
    title: String(row.title),
    description: row.description ?? null,
    items: (row.items || []).map((item: SafeAny) => ({
      id: Number(item.id),
      templateId: Number(item.templateId),
      title: String(item.title),
      description: item.description ?? null,
      kind: item.kind,
      plannedDurationSeconds: Number(item.plannedDurationSeconds),
      sortOrder: Number(item.sortOrder),
    })),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export class AcademyWorkshopAgendaTemplateService {
  private static assertManager(actor: AcademyActor) {
    if (!manager(actor)) throw new AcademySalesError('Chỉ Admin hoặc Quản lý được quản lý mẫu agenda.', 403);
  }

  static async getRequired(fastify: FastifyInstance, value?: number | null) {
    const row = value
      ? await fastify.prisma.crm.crmAcademyWorkshopAgendaTemplate.findUnique({
          where: { id: templateId(value) },
          include: TEMPLATE_INCLUDE,
        })
      : await fastify.prisma.crm.crmAcademyWorkshopAgendaTemplate.findFirst({
          include: TEMPLATE_INCLUDE,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
    if (!row) throw new AcademySalesError('Chưa có mẫu agenda. Hãy tạo mẫu đầu tiên trong Thư viện agenda.', 409);
    return row;
  }

  static async list(
    fastify: FastifyInstance,
    _actor: AcademyActor,
    params: ListAcademyWorkshopAgendaTemplatesParams = {}
  ) {
    const page = Math.max(1, Math.round(Number(params.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.round(Number(params.limit) || 20)));
    const search = removeVietnameseTones(String(params.search || ''));
    const rows = await fastify.prisma.crm.crmAcademyWorkshopAgendaTemplate.findMany({
      include: TEMPLATE_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    const filtered = search
      ? rows.filter((row) => removeVietnameseTones(`${row.title} ${row.description || ''}`).includes(search))
      : rows;
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit).map(toAcademyWorkshopAgendaTemplate),
      total: filtered.length,
      page,
      limit,
    };
  }

  static async create(
    fastify: FastifyInstance,
    actor: AcademyActor,
    input: CreateAcademyWorkshopAgendaTemplateRequest
  ) {
    this.assertManager(actor);
    const title = String(input.title || '').trim();
    if (!title || title.length > 180) throw new AcademySalesError('Tên mẫu agenda là bắt buộc và tối đa 180 ký tự.');
    if (await fastify.prisma.crm.crmAcademyWorkshopAgendaTemplate.findUnique({ where: { title } })) {
      throw new AcademySalesError('Tên mẫu agenda đã tồn tại.', 409);
    }
    const items = normalizeAcademyWorkshopAgendaDefinition(input.items);
    const created = await fastify.prisma.crm.crmAcademyWorkshopAgendaTemplate.create({
      data: {
        title,
        description: String(input.description || '').trim() || null,
        createdByStaffId: actor.id,
        items: { create: items },
      },
      include: TEMPLATE_INCLUDE,
    });
    return toAcademyWorkshopAgendaTemplate(created);
  }

  static async update(
    fastify: FastifyInstance,
    actor: AcademyActor,
    value: number,
    input: UpdateAcademyWorkshopAgendaTemplateRequest
  ) {
    this.assertManager(actor);
    const existing = await this.getRequired(fastify, value);
    const title = input.title === undefined ? existing.title : String(input.title || '').trim();
    if (!title || title.length > 180) throw new AcademySalesError('Tên mẫu agenda là bắt buộc và tối đa 180 ký tự.');
    const duplicate = await fastify.prisma.crm.crmAcademyWorkshopAgendaTemplate.findFirst({
      where: { title, NOT: { id: existing.id } },
      select: { id: true },
    });
    if (duplicate) throw new AcademySalesError('Tên mẫu agenda đã tồn tại.', 409);
    const items = input.items === undefined ? null : normalizeAcademyWorkshopAgendaDefinition(input.items);
    const updated = await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmAcademyWorkshopAgendaTemplate.update({
        where: { id: existing.id },
        data: {
          title,
          description:
            input.description === undefined ? existing.description : String(input.description || '').trim() || null,
        },
      });
      if (items) {
        await tx.crmAcademyWorkshopAgendaTemplateItem.deleteMany({ where: { templateId: existing.id } });
        await tx.crmAcademyWorkshopAgendaTemplateItem.createMany({
          data: items.map((item) => ({ ...item, templateId: existing.id })),
        });
      }
      return tx.crmAcademyWorkshopAgendaTemplate.findUniqueOrThrow({
        where: { id: existing.id },
        include: TEMPLATE_INCLUDE,
      });
    });
    return toAcademyWorkshopAgendaTemplate(updated);
  }

  static async delete(fastify: FastifyInstance, actor: AcademyActor, value: number) {
    this.assertManager(actor);
    const existing = await this.getRequired(fastify, value);
    const count = await fastify.prisma.crm.crmAcademyWorkshopAgendaTemplate.count();
    if (count <= 1) throw new AcademySalesError('Cần giữ lại ít nhất một mẫu agenda để tạo workshop mới.', 409);
    await fastify.prisma.crm.crmAcademyWorkshopAgendaTemplate.delete({ where: { id: existing.id } });
  }
}
