import type { FastifyInstance } from 'fastify';
import {
  removeVietnameseTones,
  type AcademyWorkshopDesignDifficultyLevel,
  type AcademyWorkshopDesignTemplate,
  type ListAcademyWorkshopDesignTemplatesParams,
  type SafeAny,
  type SaveAcademyWorkshopDesignTemplateRequest,
  type UpdateAcademyWorkshopDesignTemplateRequest,
} from '@mos-lab/shared';
import { AcademySalesError, canManageAcademySales, type AcademyActor } from '../academy-sales/academy-sales.service.js';

const TEMPLATE_INCLUDE = {
  items: {
    include: { images: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] } },
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
  },
};

function templateId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AcademySalesError('Mẫu thiết kế mi không hợp lệ.');
  return id;
}

function canManageTemplateLibrary(actor: AcademyActor) {
  return canManageAcademySales(actor) || actor.academyAccess === true;
}

function normalizeDifficultyLevel(value: unknown): AcademyWorkshopDesignDifficultyLevel {
  const level = String(value || '')
    .trim()
    .toUpperCase();
  if (level === 'ADVANCED' || level === 'MASTER') return level;
  return 'BASIC';
}

function normalizeTemplateInput(input: SaveAcademyWorkshopDesignTemplateRequest) {
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim() || null;
  if (!title || title.length > 180) {
    throw new AcademySalesError('Tên bộ mẫu thiết kế mi là bắt buộc và tối đa 180 ký tự.');
  }
  if (description && description.length > 2_000) {
    throw new AcademySalesError('Mô tả bộ mẫu thiết kế mi tối đa 2.000 ký tự.');
  }
  return { title, description };
}

function normalizeTemplateItems(items: SafeAny[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AcademySalesError('Cần có ít nhất một mẫu thiết kế mi để lưu thành bộ mẫu.');
  }
  return items.map((designItem, index) => {
    const name = String(designItem.name || '').trim();
    const description = String(designItem.description || '').trim() || null;
    const difficultyLevel = normalizeDifficultyLevel(designItem.difficultyLevel);
    const priceVnd = Math.max(0, Math.round(Number(designItem.priceVnd) || 0));
    if (!name || name.length > 180 || (description && description.length > 2_000)) {
      throw new AcademySalesError(`Mẫu thiết kế mi #${index + 1} không hợp lệ, không thể lưu thành bộ mẫu.`);
    }
    if (!Number.isFinite(priceVnd) || priceVnd < 0 || priceVnd > 100_000_000) {
      throw new AcademySalesError(`Phụ thu của mẫu thiết kế mi #${index + 1} không hợp lệ.`);
    }
    const images = (designItem.images || []).map((image: SafeAny, imageIndex: number) => {
      const imageUrl = String(image.imageUrl || '').trim();
      const altText = String(image.altText || '').trim() || null;
      if (!imageUrl || imageUrl.length > 512 || !/^(https?:\/\/|\/)/i.test(imageUrl)) {
        throw new AcademySalesError(`Ảnh #${imageIndex + 1} của mẫu thiết kế #${index + 1} không hợp lệ.`);
      }
      if (altText && altText.length > 180) {
        throw new AcademySalesError(`Mô tả ảnh #${imageIndex + 1} của mẫu thiết kế #${index + 1} quá dài.`);
      }
      return {
        imageUrl,
        altText,
        sortOrder: Math.max(0, Math.round(Number(image.sortOrder) || 0)),
      };
    });
    return {
      name,
      description,
      difficultyLevel,
      priceVnd,
      sortOrder: Math.max(0, Math.round(Number(designItem.sortOrder) || 0)),
      isAvailable: Boolean(designItem.isAvailable ?? true),
      images,
    };
  });
}

export function toAcademyWorkshopDesignTemplate(row: SafeAny): AcademyWorkshopDesignTemplate {
  return {
    id: Number(row.id),
    title: String(row.title),
    description: row.description ?? null,
    items: (row.items || []).map((designItem: SafeAny) => ({
      id: Number(designItem.id),
      templateId: Number(designItem.templateId),
      name: String(designItem.name),
      description: designItem.description ?? null,
      difficultyLevel: normalizeDifficultyLevel(designItem.difficultyLevel),
      priceVnd: Math.max(0, Math.round(Number(designItem.priceVnd) || 0)),
      sortOrder: Math.max(0, Math.round(Number(designItem.sortOrder) || 0)),
      isAvailable: Boolean(designItem.isAvailable),
      images: (designItem.images || []).map((image: SafeAny) => ({
        id: Number(image.id),
        templateItemId: Number(image.templateItemId),
        imageUrl: String(image.imageUrl),
        altText: image.altText ?? null,
        sortOrder: Math.max(0, Math.round(Number(image.sortOrder) || 0)),
      })),
    })),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export class AcademyWorkshopDesignTemplateService {
  private static assertCanManageTemplateLibrary(actor: AcademyActor) {
    if (!canManageTemplateLibrary(actor)) {
      throw new AcademySalesError(
        'Chỉ Admin, Quản lý hoặc thành viên Academy được lưu và quản lý mẫu thiết kế mi.',
        403
      );
    }
  }

  static async getRequired(fastify: FastifyInstance, value: number) {
    const row = await fastify.prisma.crm.crmAcademyWorkshopDesignTemplate.findUnique({
      where: { id: templateId(value) },
      include: TEMPLATE_INCLUDE,
    });
    if (!row) throw new AcademySalesError('Không tìm thấy mẫu thiết kế mi.', 404);
    return row;
  }

  static async list(
    fastify: FastifyInstance,
    _actor: AcademyActor,
    params: ListAcademyWorkshopDesignTemplatesParams = {}
  ) {
    const page = Math.max(1, Math.round(Number(params.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.round(Number(params.limit) || 20)));
    const search = removeVietnameseTones(String(params.search || ''));
    const rows = await fastify.prisma.crm.crmAcademyWorkshopDesignTemplate.findMany({
      include: TEMPLATE_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    const filtered = search
      ? rows.filter((row) => removeVietnameseTones(`${row.title} ${row.description || ''}`).includes(search))
      : rows;
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit).map(toAcademyWorkshopDesignTemplate),
      total: filtered.length,
      page,
      limit,
    };
  }

  static async createFromWorkshop(
    fastify: FastifyInstance,
    actor: AcademyActor,
    input: SaveAcademyWorkshopDesignTemplateRequest,
    items: SafeAny[]
  ) {
    this.assertCanManageTemplateLibrary(actor);
    const template = normalizeTemplateInput(input);
    const designItems = normalizeTemplateItems(items);
    const duplicate = await fastify.prisma.crm.crmAcademyWorkshopDesignTemplate.findUnique({
      where: { title: template.title },
      select: { id: true },
    });
    if (duplicate) throw new AcademySalesError('Tên mẫu thiết kế mi đã tồn tại.', 409);

    const created = await fastify.prisma.crm.crmAcademyWorkshopDesignTemplate.create({
      data: {
        ...template,
        createdByStaffId: actor.id,
        items: {
          create: designItems.map(({ images, ...designItem }) => ({
            ...designItem,
            images: { create: images },
          })),
        },
      },
      include: TEMPLATE_INCLUDE,
    });
    return toAcademyWorkshopDesignTemplate(created);
  }

  static async update(
    fastify: FastifyInstance,
    actor: AcademyActor,
    value: number,
    input: UpdateAcademyWorkshopDesignTemplateRequest
  ) {
    this.assertCanManageTemplateLibrary(actor);
    const existing = await this.getRequired(fastify, value);
    const template = normalizeTemplateInput(input);
    const designItems = normalizeTemplateItems(input.items);
    const duplicate = await fastify.prisma.crm.crmAcademyWorkshopDesignTemplate.findUnique({
      where: { title: template.title },
      select: { id: true },
    });
    if (duplicate && duplicate.id !== existing.id) {
      throw new AcademySalesError('Tên mẫu thiết kế mi đã tồn tại.', 409);
    }

    const updated = await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmAcademyWorkshopDesignTemplateItem.deleteMany({ where: { templateId: existing.id } });
      return tx.crmAcademyWorkshopDesignTemplate.update({
        where: { id: existing.id },
        data: {
          ...template,
          items: {
            create: designItems.map(({ images, ...designItem }) => ({
              ...designItem,
              images: { create: images },
            })),
          },
        },
        include: TEMPLATE_INCLUDE,
      });
    });
    return toAcademyWorkshopDesignTemplate(updated);
  }

  static async replaceItemsFromWorkshop(
    fastify: FastifyInstance,
    actor: AcademyActor,
    value: number,
    items: SafeAny[]
  ) {
    this.assertCanManageTemplateLibrary(actor);
    const existing = await this.getRequired(fastify, value);
    const designItems = normalizeTemplateItems(items);
    const updated = await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmAcademyWorkshopDesignTemplateItem.deleteMany({ where: { templateId: existing.id } });
      return tx.crmAcademyWorkshopDesignTemplate.update({
        where: { id: existing.id },
        data: {
          items: {
            create: designItems.map(({ images, ...designItem }) => ({
              ...designItem,
              images: { create: images },
            })),
          },
        },
        include: TEMPLATE_INCLUDE,
      });
    });
    return toAcademyWorkshopDesignTemplate(updated);
  }

  static async delete(fastify: FastifyInstance, actor: AcademyActor, value: number) {
    this.assertCanManageTemplateLibrary(actor);
    const existing = await this.getRequired(fastify, value);
    await fastify.prisma.crm.crmAcademyWorkshopDesignTemplate.delete({ where: { id: existing.id } });
  }
}
