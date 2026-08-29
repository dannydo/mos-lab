import type { FastifyInstance } from 'fastify';
import {
  ACADEMY_WORKSHOP_MENU_CATEGORIES,
  removeVietnameseTones,
  type AcademyWorkshopMenuCategory,
  type AcademyWorkshopMenuTemplate,
  type ListAcademyWorkshopMenuTemplatesParams,
  type SafeAny,
  type SaveAcademyWorkshopMenuTemplateRequest,
} from '@mos-lab/shared';
import { AcademySalesError, canManageAcademySales, type AcademyActor } from '../academy-sales/academy-sales.service.js';

const MENU_CATEGORIES = new Set<AcademyWorkshopMenuCategory>(ACADEMY_WORKSHOP_MENU_CATEGORIES);
const TEMPLATE_INCLUDE = {
  items: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
};

function templateId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AcademySalesError('Mẫu thực đơn không hợp lệ.');
  return id;
}

function canManageTemplateLibrary(actor: AcademyActor) {
  return canManageAcademySales(actor) || actor.academyAccess === true;
}

function normalizeTemplateItems(items: SafeAny[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AcademySalesError('Cần có ít nhất một món để lưu thành mẫu thực đơn.');
  }

  return items.map((item, index) => {
    const category = item.category as AcademyWorkshopMenuCategory;
    const name = String(item.name || '').trim();
    const description = String(item.description || '').trim() || null;
    const imageUrl = String(item.imageUrl || '').trim() || null;
    if (!MENU_CATEGORIES.has(category) || !name || name.length > 180 || (description && description.length > 2_000)) {
      throw new AcademySalesError(`Món #${index + 1} không hợp lệ, không thể lưu thành mẫu.`);
    }
    if (imageUrl && (imageUrl.length > 512 || !/^(https?:\/\/|\/)/i.test(imageUrl))) {
      throw new AcademySalesError(`Ảnh của món #${index + 1} không hợp lệ, không thể lưu thành mẫu.`);
    }
    return {
      category,
      name,
      description,
      imageUrl,
      sortOrder: Math.max(0, Math.round(Number(item.sortOrder) || 0)),
      isAvailable: Boolean(item.isAvailable),
    };
  });
}

function normalizeTemplateInput(input: SaveAcademyWorkshopMenuTemplateRequest) {
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim() || null;
  if (!title || title.length > 180) {
    throw new AcademySalesError('Tên mẫu thực đơn là bắt buộc và tối đa 180 ký tự.');
  }
  if (description && description.length > 2_000) {
    throw new AcademySalesError('Mô tả mẫu thực đơn tối đa 2.000 ký tự.');
  }
  return { title, description };
}

export function toAcademyWorkshopMenuTemplate(row: SafeAny): AcademyWorkshopMenuTemplate {
  return {
    id: Number(row.id),
    title: String(row.title),
    description: row.description ?? null,
    items: (row.items || []).map((item: SafeAny) => ({
      id: Number(item.id),
      templateId: Number(item.templateId),
      category: item.category as AcademyWorkshopMenuCategory,
      name: String(item.name),
      description: item.description ?? null,
      imageUrl: item.imageUrl ?? null,
      sortOrder: Math.max(0, Math.round(Number(item.sortOrder) || 0)),
      isAvailable: Boolean(item.isAvailable),
    })),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export class AcademyWorkshopMenuTemplateService {
  private static assertCanManageTemplateLibrary(actor: AcademyActor) {
    if (!canManageTemplateLibrary(actor)) {
      throw new AcademySalesError('Chỉ Admin, Quản lý hoặc thành viên Academy được lưu và quản lý mẫu thực đơn.', 403);
    }
  }

  static async getRequired(fastify: FastifyInstance, value: number) {
    const row = await fastify.prisma.crm.crmAcademyWorkshopMenuTemplate.findUnique({
      where: { id: templateId(value) },
      include: TEMPLATE_INCLUDE,
    });
    if (!row) throw new AcademySalesError('Không tìm thấy mẫu thực đơn.', 404);
    return row;
  }

  static async list(
    fastify: FastifyInstance,
    _actor: AcademyActor,
    params: ListAcademyWorkshopMenuTemplatesParams = {}
  ) {
    const page = Math.max(1, Math.round(Number(params.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.round(Number(params.limit) || 20)));
    const search = removeVietnameseTones(String(params.search || ''));
    const rows = await fastify.prisma.crm.crmAcademyWorkshopMenuTemplate.findMany({
      include: TEMPLATE_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    const filtered = search
      ? rows.filter((row) => removeVietnameseTones(`${row.title} ${row.description || ''}`).includes(search))
      : rows;
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit).map(toAcademyWorkshopMenuTemplate),
      total: filtered.length,
      page,
      limit,
    };
  }

  static async createFromWorkshop(
    fastify: FastifyInstance,
    actor: AcademyActor,
    input: SaveAcademyWorkshopMenuTemplateRequest,
    menuItems: SafeAny[]
  ) {
    this.assertCanManageTemplateLibrary(actor);
    const template = normalizeTemplateInput(input);
    const items = normalizeTemplateItems(menuItems);
    const duplicate = await fastify.prisma.crm.crmAcademyWorkshopMenuTemplate.findUnique({
      where: { title: template.title },
      select: { id: true },
    });
    if (duplicate) throw new AcademySalesError('Tên mẫu thực đơn đã tồn tại.', 409);

    const created = await fastify.prisma.crm.crmAcademyWorkshopMenuTemplate.create({
      data: {
        ...template,
        createdByStaffId: actor.id,
        items: { create: items },
      },
      include: TEMPLATE_INCLUDE,
    });
    return toAcademyWorkshopMenuTemplate(created);
  }

  static async replaceItemsFromWorkshop(
    fastify: FastifyInstance,
    actor: AcademyActor,
    value: number,
    items: SafeAny[]
  ) {
    this.assertCanManageTemplateLibrary(actor);
    const existing = await this.getRequired(fastify, value);
    const templateItems = normalizeTemplateItems(items);
    const updated = await fastify.prisma.crm.$transaction(async (tx) => {
      // A workshop owns its copied menu items, so only future applies receive
      // this refreshed template content.
      await tx.crmAcademyWorkshopMenuTemplateItem.deleteMany({ where: { templateId: existing.id } });
      return tx.crmAcademyWorkshopMenuTemplate.update({
        where: { id: existing.id },
        data: { items: { create: templateItems } },
        include: TEMPLATE_INCLUDE,
      });
    });
    return toAcademyWorkshopMenuTemplate(updated);
  }

  static async delete(fastify: FastifyInstance, actor: AcademyActor, value: number) {
    this.assertCanManageTemplateLibrary(actor);
    const existing = await this.getRequired(fastify, value);
    await fastify.prisma.crm.crmAcademyWorkshopMenuTemplate.delete({ where: { id: existing.id } });
  }
}
