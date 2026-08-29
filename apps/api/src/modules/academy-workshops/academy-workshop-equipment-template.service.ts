import type { FastifyInstance } from 'fastify';
import {
  removeVietnameseTones,
  type AcademyWorkshopEquipmentTemplate,
  type ListAcademyWorkshopEquipmentTemplatesParams,
  type SafeAny,
  type SaveAcademyWorkshopEquipmentTemplateRequest,
  type UpdateAcademyWorkshopEquipmentTemplateRequest,
} from '@mos-lab/shared';
import { AcademySalesError, canManageAcademySales, type AcademyActor } from '../academy-sales/academy-sales.service.js';

const TEMPLATE_INCLUDE = {
  packages: {
    include: { images: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] } },
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
  },
};

function templateId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AcademySalesError('Mẫu bộ dụng cụ không hợp lệ.');
  return id;
}

function canManageTemplateLibrary(actor: AcademyActor) {
  return canManageAcademySales(actor) || actor.academyAccess === true;
}

function equipmentItems(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : (() => {
        try {
          const parsed = JSON.parse(String(value || ''));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();
  return Array.from(
    new Set(
      source
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => item.slice(0, 180))
    )
  );
}

function normalizeTemplateInput(input: SaveAcademyWorkshopEquipmentTemplateRequest) {
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim() || null;
  if (!title || title.length > 180) {
    throw new AcademySalesError('Tên mẫu bộ dụng cụ là bắt buộc và tối đa 180 ký tự.');
  }
  if (description && description.length > 2_000) {
    throw new AcademySalesError('Mô tả mẫu bộ dụng cụ tối đa 2.000 ký tự.');
  }
  return { title, description };
}

function normalizeTemplatePackages(packages: SafeAny[]) {
  if (!Array.isArray(packages) || packages.length === 0) {
    throw new AcademySalesError('Cần có ít nhất một bộ dụng cụ để lưu thành mẫu.');
  }
  return packages.map((equipmentPackage, index) => {
    const name = String(equipmentPackage.name || '').trim();
    const description = String(equipmentPackage.description || '').trim() || null;
    const includedItems = equipmentItems(equipmentPackage.includedItems ?? equipmentPackage.includedItemsJson);
    const priceVnd = Math.round(Number(equipmentPackage.priceVnd));
    if (!name || name.length > 180 || (description && description.length > 2_000)) {
      throw new AcademySalesError(`Bộ dụng cụ #${index + 1} không hợp lệ, không thể lưu thành mẫu.`);
    }
    if (!includedItems.length || includedItems.length > 16) {
      throw new AcademySalesError(`Danh sách của bộ dụng cụ #${index + 1} không hợp lệ, không thể lưu thành mẫu.`);
    }
    if (!Number.isFinite(priceVnd) || priceVnd < 0 || priceVnd > 100_000_000) {
      throw new AcademySalesError(`Phụ thu của bộ dụng cụ #${index + 1} không hợp lệ, không thể lưu thành mẫu.`);
    }
    const images = (equipmentPackage.images || []).map((image: SafeAny, imageIndex: number) => {
      const imageUrl = String(image.imageUrl || '').trim();
      const altText = String(image.altText || '').trim() || null;
      if (!imageUrl || imageUrl.length > 512 || !/^(https?:\/\/|\/)/i.test(imageUrl)) {
        throw new AcademySalesError(`Ảnh #${imageIndex + 1} của bộ dụng cụ #${index + 1} không hợp lệ.`);
      }
      if (altText && altText.length > 180) {
        throw new AcademySalesError(`Mô tả ảnh #${imageIndex + 1} của bộ dụng cụ #${index + 1} quá dài.`);
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
      includedItemsJson: JSON.stringify(includedItems),
      priceVnd,
      sortOrder: Math.max(0, Math.round(Number(equipmentPackage.sortOrder) || 0)),
      isAvailable: Boolean(equipmentPackage.isAvailable),
      images,
    };
  });
}

export function toAcademyWorkshopEquipmentTemplate(row: SafeAny): AcademyWorkshopEquipmentTemplate {
  return {
    id: Number(row.id),
    title: String(row.title),
    description: row.description ?? null,
    packages: (row.packages || []).map((equipmentPackage: SafeAny) => ({
      id: Number(equipmentPackage.id),
      templateId: Number(equipmentPackage.templateId),
      name: String(equipmentPackage.name),
      description: equipmentPackage.description ?? null,
      includedItems: equipmentItems(equipmentPackage.includedItemsJson),
      priceVnd: Math.max(0, Math.round(Number(equipmentPackage.priceVnd) || 0)),
      sortOrder: Math.max(0, Math.round(Number(equipmentPackage.sortOrder) || 0)),
      isAvailable: Boolean(equipmentPackage.isAvailable),
      images: (equipmentPackage.images || []).map((image: SafeAny) => ({
        id: Number(image.id),
        templatePackageId: Number(image.templatePackageId),
        imageUrl: String(image.imageUrl),
        altText: image.altText ?? null,
        sortOrder: Math.max(0, Math.round(Number(image.sortOrder) || 0)),
      })),
    })),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export class AcademyWorkshopEquipmentTemplateService {
  private static assertCanManageTemplateLibrary(actor: AcademyActor) {
    if (!canManageTemplateLibrary(actor)) {
      throw new AcademySalesError(
        'Chỉ Admin, Quản lý hoặc thành viên Academy được lưu và quản lý mẫu bộ dụng cụ.',
        403
      );
    }
  }

  static async getRequired(fastify: FastifyInstance, value: number) {
    const row = await fastify.prisma.crm.crmAcademyWorkshopEquipmentTemplate.findUnique({
      where: { id: templateId(value) },
      include: TEMPLATE_INCLUDE,
    });
    if (!row) throw new AcademySalesError('Không tìm thấy mẫu bộ dụng cụ.', 404);
    return row;
  }

  static async list(
    fastify: FastifyInstance,
    _actor: AcademyActor,
    params: ListAcademyWorkshopEquipmentTemplatesParams = {}
  ) {
    const page = Math.max(1, Math.round(Number(params.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.round(Number(params.limit) || 20)));
    const search = removeVietnameseTones(String(params.search || ''));
    const rows = await fastify.prisma.crm.crmAcademyWorkshopEquipmentTemplate.findMany({
      include: TEMPLATE_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    const filtered = search
      ? rows.filter((row) => removeVietnameseTones(`${row.title} ${row.description || ''}`).includes(search))
      : rows;
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit).map(toAcademyWorkshopEquipmentTemplate),
      total: filtered.length,
      page,
      limit,
    };
  }

  static async createFromWorkshop(
    fastify: FastifyInstance,
    actor: AcademyActor,
    input: SaveAcademyWorkshopEquipmentTemplateRequest,
    packages: SafeAny[]
  ) {
    this.assertCanManageTemplateLibrary(actor);
    const template = normalizeTemplateInput(input);
    const equipmentPackages = normalizeTemplatePackages(packages);
    const duplicate = await fastify.prisma.crm.crmAcademyWorkshopEquipmentTemplate.findUnique({
      where: { title: template.title },
      select: { id: true },
    });
    if (duplicate) throw new AcademySalesError('Tên mẫu bộ dụng cụ đã tồn tại.', 409);

    const created = await fastify.prisma.crm.crmAcademyWorkshopEquipmentTemplate.create({
      data: {
        ...template,
        createdByStaffId: actor.id,
        packages: {
          create: equipmentPackages.map(({ images, ...equipmentPackage }) => ({
            ...equipmentPackage,
            images: { create: images },
          })),
        },
      },
      include: TEMPLATE_INCLUDE,
    });
    return toAcademyWorkshopEquipmentTemplate(created);
  }

  static async update(
    fastify: FastifyInstance,
    actor: AcademyActor,
    value: number,
    input: UpdateAcademyWorkshopEquipmentTemplateRequest
  ) {
    this.assertCanManageTemplateLibrary(actor);
    const existing = await this.getRequired(fastify, value);
    const template = normalizeTemplateInput(input);
    const equipmentPackages = normalizeTemplatePackages(input.packages);
    const duplicate = await fastify.prisma.crm.crmAcademyWorkshopEquipmentTemplate.findUnique({
      where: { title: template.title },
      select: { id: true },
    });
    if (duplicate && duplicate.id !== existing.id) {
      throw new AcademySalesError('Tên mẫu bộ dụng cụ đã tồn tại.', 409);
    }

    const updated = await fastify.prisma.crm.$transaction(async (tx) => {
      // A template is an editable blueprint. Workshops that used it already own
      // their copied packages, so replacing these rows affects future applies only.
      await tx.crmAcademyWorkshopEquipmentTemplatePackage.deleteMany({ where: { templateId: existing.id } });
      return tx.crmAcademyWorkshopEquipmentTemplate.update({
        where: { id: existing.id },
        data: {
          ...template,
          packages: {
            create: equipmentPackages.map(({ images, ...equipmentPackage }) => ({
              ...equipmentPackage,
              images: { create: images },
            })),
          },
        },
        include: TEMPLATE_INCLUDE,
      });
    });
    return toAcademyWorkshopEquipmentTemplate(updated);
  }

  static async replacePackagesFromWorkshop(
    fastify: FastifyInstance,
    actor: AcademyActor,
    value: number,
    packages: SafeAny[]
  ) {
    this.assertCanManageTemplateLibrary(actor);
    const existing = await this.getRequired(fastify, value);
    const equipmentPackages = normalizeTemplatePackages(packages);
    const updated = await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmAcademyWorkshopEquipmentTemplatePackage.deleteMany({ where: { templateId: existing.id } });
      return tx.crmAcademyWorkshopEquipmentTemplate.update({
        where: { id: existing.id },
        data: {
          packages: {
            create: equipmentPackages.map(({ images, ...equipmentPackage }) => ({
              ...equipmentPackage,
              images: { create: images },
            })),
          },
        },
        include: TEMPLATE_INCLUDE,
      });
    });
    return toAcademyWorkshopEquipmentTemplate(updated);
  }

  static async delete(fastify: FastifyInstance, actor: AcademyActor, value: number) {
    this.assertCanManageTemplateLibrary(actor);
    const existing = await this.getRequired(fastify, value);
    await fastify.prisma.crm.crmAcademyWorkshopEquipmentTemplate.delete({ where: { id: existing.id } });
  }
}
