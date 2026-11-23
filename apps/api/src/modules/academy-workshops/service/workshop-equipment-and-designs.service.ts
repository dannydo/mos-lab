import type { FastifyInstance } from 'fastify';
import type {
  AcademyWorkshopPublicMediaUploadResult,
  CreateAcademyWorkshopDesignItemImageRequest,
  CreateAcademyWorkshopDesignItemRequest,
  CreateAcademyWorkshopEquipmentPackageImageRequest,
  CreateAcademyWorkshopEquipmentPackageRequest,
  CreateAcademyWorkshopPublicMediaUploadRequest,
  SafeAny,
  SaveAcademyWorkshopDesignTemplateRequest,
  SaveAcademyWorkshopEquipmentTemplateRequest,
  SetAcademyWorkshopAgendaResourceRequest,
  UpdateAcademyWorkshopDesignItemImageRequest,
  UpdateAcademyWorkshopDesignItemRequest,
  UpdateAcademyWorkshopEquipmentPackageImageRequest,
  UpdateAcademyWorkshopEquipmentPackageRequest,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../../academy-sales/academy-sales.service.js';
import { AcademyWorkshopDesignTemplateService } from '../academy-workshop-design-template.service.js';
import { AcademyWorkshopEquipmentTemplateService } from '../academy-workshop-equipment-template.service.js';
import { AcademyWorkshopStorageService } from '../academy-workshop-storage.service.js';
import {
  agendaItemIdForResource,
  assertCanEditDesign,
  assertCanEditEquipment,
  equipmentItems,
  normalizeDifficultyLevel,
  normalizeEquipmentImage,
  parseJson,
  positiveId,
} from './workshop-helpers.js';
import { designItem, designItemImage, equipmentPackage, equipmentPackageImage } from './workshop-mappers.js';
import { getWorkshopById, getWorkshopRowById } from './workshop-core.service.js';

function normalizeEquipmentPackage(input: {
  name: unknown;
  description?: unknown;
  includedItems: unknown;
  priceVnd: unknown;
  isAvailable?: unknown;
  isIncludedInFee?: unknown;
}) {
  const name = String(input.name || '').trim();
  const description = String(input.description || '').trim() || null;
  const includedItems = equipmentItems(input.includedItems);
  const priceVnd = Math.round(Number(input.priceVnd));
  if (!name || name.length > 180) throw new AcademySalesError('Tên bộ dụng cụ là bắt buộc và tối đa 180 ký tự.');
  if (description && description.length > 2_000) throw new AcademySalesError('Mô tả bộ dụng cụ tối đa 2.000 ký tự.');
  if (!includedItems.length) throw new AcademySalesError('Mỗi bộ dụng cụ cần có ít nhất một món đi kèm.');
  if (includedItems.length > 16) throw new AcademySalesError('Mỗi bộ dụng cụ tối đa 16 món đi kèm.');
  if (!Number.isFinite(priceVnd) || priceVnd < 0 || priceVnd > 100_000_000) {
    throw new AcademySalesError('Giá bộ dụng cụ phải là số tiền VND hợp lệ.');
  }
  return {
    name,
    description,
    includedItemsJson: JSON.stringify(includedItems),
    priceVnd,
    isAvailable: input.isAvailable === undefined ? true : Boolean(input.isAvailable),
    isIncludedInFee: Boolean(input.isIncludedInFee),
  };
}

function normalizeDesignItem(input: {
  name: unknown;
  description?: unknown;
  difficultyLevel?: unknown;
  priceVnd?: unknown;
  isAvailable?: unknown;
}) {
  const name = String(input.name || '').trim();
  const description = String(input.description || '').trim() || null;
  const difficultyLevel = normalizeDifficultyLevel(input.difficultyLevel);
  const priceVnd = Math.max(0, Math.round(Number(input.priceVnd) || 0));
  if (!name || name.length > 180) throw new AcademySalesError('Tên mẫu thiết kế mi là bắt buộc và tối đa 180 ký tự.');
  if (description && description.length > 2_000) {
    throw new AcademySalesError('Mô tả mẫu thiết kế mi tối đa 2.000 ký tự.');
  }
  if (!Number.isFinite(priceVnd) || priceVnd < 0 || priceVnd > 100_000_000) {
    throw new AcademySalesError('Phụ thu mẫu thiết kế mi phải là số tiền VND hợp lệ.');
  }
  return {
    name,
    description,
    difficultyLevel,
    priceVnd,
    isAvailable: input.isAvailable === undefined ? true : Boolean(input.isAvailable),
  };
}

export async function uploadWorkshopEquipmentImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CreateAcademyWorkshopPublicMediaUploadRequest
): Promise<AcademyWorkshopPublicMediaUploadResult> {
  await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  return AcademyWorkshopStorageService.uploadPublicMedia(workshopId, 'equipment-images', input);
}

export async function setWorkshopEquipmentAgendaItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: SetAcademyWorkshopAgendaResourceRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  const agendaItemId = agendaItemIdForResource(row, input.agendaItemId == null ? null : Number(input.agendaItemId));
  await fastify.prisma.crm.crmAcademyWorkshop.update({
    where: { id: row.id },
    data: { equipmentAgendaItemId: agendaItemId },
  });
  return getWorkshopById(fastify, actor, row.id);
}

export async function createWorkshopEquipmentPackage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CreateAcademyWorkshopEquipmentPackageRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  const item = normalizeEquipmentPackage(input);
  if (item.isIncludedInFee) {
    await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackage.updateMany({
      where: { workshopId: row.id },
      data: { isIncludedInFee: false },
    });
  }
  const sortOrder = Math.max(0, ...row.equipmentPackages.map((current: SafeAny) => Number(current.sortOrder) || 0)) + 1;
  const created = await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackage.create({
    data: { ...item, workshopId: row.id, sortOrder },
  });
  return equipmentPackage(created);
}

export async function updateWorkshopEquipmentPackage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  equipmentPackageId: number,
  input: UpdateAcademyWorkshopEquipmentPackageRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  const itemId = positiveId(equipmentPackageId, 'Bộ dụng cụ');
  const existing = row.equipmentPackages.find((item: SafeAny) => item.id === itemId);
  if (!existing) throw new AcademySalesError('Không tìm thấy bộ dụng cụ thực hành.', 404);
  const item = normalizeEquipmentPackage({
    name: input.name === undefined ? existing.name : input.name,
    description: input.description === undefined ? existing.description : input.description,
    includedItems:
      input.includedItems === undefined ? parseJson<unknown[]>(existing.includedItemsJson, []) : input.includedItems,
    priceVnd: input.priceVnd === undefined ? existing.priceVnd : input.priceVnd,
    isAvailable: input.isAvailable === undefined ? existing.isAvailable : input.isAvailable,
    isIncludedInFee: input.isIncludedInFee === undefined ? existing.isIncludedInFee : input.isIncludedInFee,
  });
  if (item.isIncludedInFee) {
    await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackage.updateMany({
      where: { workshopId: row.id, id: { not: existing.id } },
      data: { isIncludedInFee: false },
    });
  }
  const updated = await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackage.update({
    where: { id: existing.id },
    data: item,
  });
  return equipmentPackage(updated);
}

export async function deleteWorkshopEquipmentPackage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  equipmentPackageId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  const itemId = positiveId(equipmentPackageId, 'Bộ dụng cụ');
  if (!row.equipmentPackages.some((item: SafeAny) => item.id === itemId)) {
    throw new AcademySalesError('Không tìm thấy bộ dụng cụ thực hành.', 404);
  }
  await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackage.delete({ where: { id: itemId } });
}

export async function saveWorkshopEquipmentAsTemplate(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: SaveAcademyWorkshopEquipmentTemplateRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  return AcademyWorkshopEquipmentTemplateService.createFromWorkshop(fastify, actor, input, row.equipmentPackages || []);
}

export async function refreshWorkshopEquipmentTemplateFromWorkshop(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  equipmentTemplateId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  return AcademyWorkshopEquipmentTemplateService.replacePackagesFromWorkshop(
    fastify,
    actor,
    equipmentTemplateId,
    row.equipmentPackages || []
  );
}

export async function applyWorkshopEquipmentTemplate(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  equipmentTemplateId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  const template = await AcademyWorkshopEquipmentTemplateService.getRequired(fastify, equipmentTemplateId);

  await fastify.prisma.crm.$transaction(async (tx) => {
    // Selections retain their package name, contents, and price snapshots.
    // The nullable package foreign key is intentionally cleared by the database.
    await tx.crmAcademyWorkshopEquipmentPackage.deleteMany({ where: { workshopId: row.id } });
    for (const pkg of template.packages) {
      await tx.crmAcademyWorkshopEquipmentPackage.create({
        data: {
          workshopId: row.id,
          name: pkg.name,
          description: pkg.description,
          includedItemsJson: pkg.includedItemsJson,
          priceVnd: pkg.priceVnd,
          sortOrder: pkg.sortOrder,
          isAvailable: pkg.isAvailable,
          isIncludedInFee: pkg.isIncludedInFee ?? false,
          images: {
            create: pkg.images.map((image) => ({
              imageUrl: image.imageUrl,
              altText: image.altText,
              sortOrder: image.sortOrder,
            })),
          },
        },
      });
    }
    await tx.crmAcademyWorkshop.update({ where: { id: row.id }, data: { equipmentTemplateId: template.id } });
  });
  return getWorkshopById(fastify, actor, row.id);
}

export async function createWorkshopEquipmentPackageImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  equipmentPackageId: number,
  input: CreateAcademyWorkshopEquipmentPackageImageRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  const packageId = positiveId(equipmentPackageId, 'Bộ dụng cụ');
  const selectedPackage = row.equipmentPackages.find((item: SafeAny) => item.id === packageId);
  if (!selectedPackage) throw new AcademySalesError('Không tìm thấy bộ dụng cụ thực hành.', 404);
  const image = normalizeEquipmentImage(input);
  const sortOrder =
    Math.max(0, ...(selectedPackage.images || []).map((item: SafeAny) => Number(item.sortOrder) || 0)) + 1;
  const created = await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackageImage.create({
    data: { ...image, equipmentPackageId: selectedPackage.id, sortOrder },
  });
  return equipmentPackageImage(created);
}

export async function updateWorkshopEquipmentPackageImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  equipmentPackageId: number,
  imageId: number,
  input: UpdateAcademyWorkshopEquipmentPackageImageRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  const packageId = positiveId(equipmentPackageId, 'Bộ dụng cụ');
  const selectedPackage = row.equipmentPackages.find((item: SafeAny) => item.id === packageId);
  if (!selectedPackage) throw new AcademySalesError('Không tìm thấy bộ dụng cụ thực hành.', 404);
  const selectedImage = (selectedPackage.images || []).find((item: SafeAny) => item.id === positiveId(imageId, 'Ảnh'));
  if (!selectedImage) throw new AcademySalesError('Không tìm thấy ảnh của bộ dụng cụ.', 404);
  const image = normalizeEquipmentImage({
    imageUrl: input.imageUrl === undefined ? selectedImage.imageUrl : input.imageUrl,
    altText: input.altText === undefined ? selectedImage.altText : input.altText,
  });
  const updated = await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackageImage.update({
    where: { id: selectedImage.id },
    data: image,
  });
  return equipmentPackageImage(updated);
}

export async function deleteWorkshopEquipmentPackageImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  equipmentPackageId: number,
  imageId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditEquipment(actor);
  const packageId = positiveId(equipmentPackageId, 'Bộ dụng cụ');
  const selectedPackage = row.equipmentPackages.find((item: SafeAny) => item.id === packageId);
  if (!selectedPackage) throw new AcademySalesError('Không tìm thấy bộ dụng cụ thực hành.', 404);
  const currentImage = (selectedPackage.images || []).find((item: SafeAny) => item.id === positiveId(imageId, 'Ảnh'));
  if (!currentImage) throw new AcademySalesError('Không tìm thấy ảnh của bộ dụng cụ.', 404);
  await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackageImage.delete({ where: { id: currentImage.id } });
}

export async function uploadWorkshopDesignImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CreateAcademyWorkshopPublicMediaUploadRequest
): Promise<AcademyWorkshopPublicMediaUploadResult> {
  await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  return AcademyWorkshopStorageService.uploadPublicMedia(workshopId, 'design-images', input);
}

export async function setWorkshopDesignAgendaItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: SetAcademyWorkshopAgendaResourceRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  const agendaItemId = agendaItemIdForResource(row, input.agendaItemId == null ? null : Number(input.agendaItemId));
  await fastify.prisma.crm.crmAcademyWorkshop.update({
    where: { id: row.id },
    data: { designAgendaItemId: agendaItemId },
  });
  return getWorkshopById(fastify, actor, row.id);
}

export async function createWorkshopDesignItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CreateAcademyWorkshopDesignItemRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  const item = normalizeDesignItem(input);
  const sortOrder = Math.max(0, ...(row.designs || []).map((current: SafeAny) => Number(current.sortOrder) || 0)) + 1;
  const created = await fastify.prisma.crm.crmAcademyWorkshopDesignItem.create({
    data: { ...item, workshopId: row.id, sortOrder },
    include: { images: true },
  });
  return designItem(created);
}

export async function updateWorkshopDesignItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  designItemId: number,
  input: UpdateAcademyWorkshopDesignItemRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  const itemId = positiveId(designItemId, 'Mẫu thiết kế mi');
  const existing = (row.designs || []).find((item: SafeAny) => item.id === itemId);
  if (!existing) throw new AcademySalesError('Không tìm thấy mẫu thiết kế mi.', 404);
  const item = normalizeDesignItem({
    name: input.name === undefined ? existing.name : input.name,
    description: input.description === undefined ? existing.description : input.description,
    difficultyLevel: input.difficultyLevel === undefined ? existing.difficultyLevel : input.difficultyLevel,
    priceVnd: input.priceVnd === undefined ? existing.priceVnd : input.priceVnd,
    isAvailable: input.isAvailable === undefined ? existing.isAvailable : input.isAvailable,
  });
  const updated = await fastify.prisma.crm.crmAcademyWorkshopDesignItem.update({
    where: { id: existing.id },
    data: item,
    include: { images: true },
  });
  return designItem(updated);
}

export async function deleteWorkshopDesignItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  designItemId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  const itemId = positiveId(designItemId, 'Mẫu thiết kế mi');
  if (!(row.designs || []).some((item: SafeAny) => item.id === itemId)) {
    throw new AcademySalesError('Không tìm thấy mẫu thiết kế mi.', 404);
  }
  await fastify.prisma.crm.crmAcademyWorkshopDesignItem.delete({ where: { id: itemId } });
}

export async function saveWorkshopDesignAsTemplate(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: SaveAcademyWorkshopDesignTemplateRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  return AcademyWorkshopDesignTemplateService.createFromWorkshop(fastify, actor, input, row.designs || []);
}

export async function refreshWorkshopDesignTemplateFromWorkshop(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  designTemplateId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  return AcademyWorkshopDesignTemplateService.replaceItemsFromWorkshop(
    fastify,
    actor,
    designTemplateId,
    row.designs || []
  );
}

export async function applyWorkshopDesignTemplate(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  designTemplateId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  const template = await AcademyWorkshopDesignTemplateService.getRequired(fastify, designTemplateId);

  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmAcademyWorkshopDesignItem.deleteMany({ where: { workshopId: row.id } });
    for (const item of template.items) {
      await tx.crmAcademyWorkshopDesignItem.create({
        data: {
          workshopId: row.id,
          name: item.name,
          description: item.description,
          difficultyLevel: item.difficultyLevel,
          priceVnd: item.priceVnd,
          sortOrder: item.sortOrder,
          isAvailable: item.isAvailable,
          images: {
            create: item.images.map((image) => ({
              imageUrl: image.imageUrl,
              altText: image.altText,
              sortOrder: image.sortOrder,
            })),
          },
        },
      });
    }
    await tx.crmAcademyWorkshop.update({ where: { id: row.id }, data: { designTemplateId: template.id } });
  });
  return getWorkshopById(fastify, actor, row.id);
}

export async function createWorkshopDesignItemImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  designItemId: number,
  input: CreateAcademyWorkshopDesignItemImageRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  const itemId = positiveId(designItemId, 'Mẫu thiết kế mi');
  const selectedItem = (row.designs || []).find((item: SafeAny) => item.id === itemId);
  if (!selectedItem) throw new AcademySalesError('Không tìm thấy mẫu thiết kế mi.', 404);
  const image = normalizeEquipmentImage(input);
  const sortOrder = Math.max(0, ...(selectedItem.images || []).map((item: SafeAny) => Number(item.sortOrder) || 0)) + 1;
  const created = await fastify.prisma.crm.crmAcademyWorkshopDesignItemImage.create({
    data: { ...image, designItemId: selectedItem.id, sortOrder },
  });
  return designItemImage(created);
}

export async function updateWorkshopDesignItemImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  designItemId: number,
  imageId: number,
  input: UpdateAcademyWorkshopDesignItemImageRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  const itemId = positiveId(designItemId, 'Mẫu thiết kế mi');
  const selectedItem = (row.designs || []).find((item: SafeAny) => item.id === itemId);
  if (!selectedItem) throw new AcademySalesError('Không tìm thấy mẫu thiết kế mi.', 404);
  const selectedImage = (selectedItem.images || []).find((item: SafeAny) => item.id === positiveId(imageId, 'Ảnh'));
  if (!selectedImage) throw new AcademySalesError('Không tìm thấy ảnh của mẫu thiết kế.', 404);
  const image = normalizeEquipmentImage({
    imageUrl: input.imageUrl === undefined ? selectedImage.imageUrl : input.imageUrl,
    altText: input.altText === undefined ? selectedImage.altText : input.altText,
  });
  const updated = await fastify.prisma.crm.crmAcademyWorkshopDesignItemImage.update({
    where: { id: selectedImage.id },
    data: image,
  });
  return designItemImage(updated);
}

export async function deleteWorkshopDesignItemImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  designItemId: number,
  imageId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditDesign(actor);
  const itemId = positiveId(designItemId, 'Mẫu thiết kế mi');
  const selectedItem = (row.designs || []).find((item: SafeAny) => item.id === itemId);
  if (!selectedItem) throw new AcademySalesError('Không tìm thấy mẫu thiết kế mi.', 404);
  const currentImage = (selectedItem.images || []).find((item: SafeAny) => item.id === positiveId(imageId, 'Ảnh'));
  if (!currentImage) throw new AcademySalesError('Không tìm thấy ảnh của mẫu thiết kế.', 404);
  await fastify.prisma.crm.crmAcademyWorkshopDesignItemImage.delete({ where: { id: currentImage.id } });
}
