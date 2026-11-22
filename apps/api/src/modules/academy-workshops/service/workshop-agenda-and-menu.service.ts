import type { FastifyInstance } from 'fastify';
import type {
  AcademyWorkshopPublicMediaUploadResult,
  CreateAcademyWorkshopAgendaItemRequest,
  CreateAcademyWorkshopMenuItemRequest,
  CreateAcademyWorkshopPublicMediaUploadRequest,
  ReorderAcademyWorkshopAgendaRequest,
  SafeAny,
  SaveAcademyWorkshopMenuTemplateRequest,
  SetAcademyWorkshopAgendaResourceRequest,
  UpdateAcademyWorkshopAgendaItemRequest,
  UpdateAcademyWorkshopMenuItemRequest,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../../academy-sales/academy-sales.service.js';
import { AcademyWorkshopMenuTemplateService } from '../academy-workshop-menu-template.service.js';
import { AcademyWorkshopStorageService } from '../academy-workshop-storage.service.js';
import {
  agendaItemIdForResource,
  assertAgendaStructureEditable,
  assertCanEditAgenda,
  assertCanEditMenu,
  assertCanEditWorkshopMedia,
  menuCategory,
  normalizeAgenda,
  positiveId,
  syncAgendaDrivenEndsAt,
} from './workshop-helpers.js';
import { menuItem, toAcademyWorkshopAgendaItem } from './workshop-mappers.js';
import { getWorkshopById, getWorkshopRowById } from './workshop-core.service.js';

function normalizeMenuItem(input: {
  category: unknown;
  name: unknown;
  description?: unknown;
  imageUrl?: unknown;
  isAvailable?: unknown;
}) {
  const category = menuCategory(input.category);
  const name = String(input.name || '').trim();
  const description = String(input.description || '').trim() || null;
  const imageUrl = String(input.imageUrl || '').trim() || null;
  if (!name || name.length > 180) throw new AcademySalesError('Tên món là bắt buộc và tối đa 180 ký tự.');
  if (description && description.length > 2_000) throw new AcademySalesError('Mô tả món tối đa 2.000 ký tự.');
  if (!imageUrl) throw new AcademySalesError('Mỗi món cần có ít nhất một ảnh minh họa.');
  if (imageUrl && imageUrl.length > 512) throw new AcademySalesError('Đường dẫn ảnh món tối đa 512 ký tự.');
  if (imageUrl && !/^(https?:\/\/|\/)/i.test(imageUrl)) {
    throw new AcademySalesError('Đường dẫn ảnh món phải bắt đầu bằng https://, http:// hoặc /.');
  }
  return {
    category,
    name,
    description,
    imageUrl,
    isAvailable: input.isAvailable === undefined ? true : Boolean(input.isAvailable),
  };
}

export async function createWorkshopAgendaItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CreateAcademyWorkshopAgendaItemRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditAgenda(actor);
  assertAgendaStructureEditable(row);
  const [item] = normalizeAgenda([{ ...input, sortOrder: row.agendaItems.length + 1 }]);
  const created = await fastify.prisma.crm.$transaction(async (tx) => {
    const created = await tx.crmAcademyWorkshopAgendaItem.create({
      data: { ...item, workshopId: row.id },
    });
    await syncAgendaDrivenEndsAt(tx, row, [...row.agendaItems, created]);
    return created;
  });
  return toAcademyWorkshopAgendaItem(created);
}

export async function updateWorkshopAgendaItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  agendaItemId: number,
  input: UpdateAcademyWorkshopAgendaItemRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditAgenda(actor);
  assertAgendaStructureEditable(row);
  const existing = row.agendaItems.find((item: SafeAny) => item.id === positiveId(agendaItemId, 'Agenda ID'));
  if (!existing) throw new AcademySalesError('Không tìm thấy mục agenda.', 404);
  const [item] = normalizeAgenda([
    {
      title: input.title === undefined ? existing.title : input.title,
      description: input.description === undefined ? existing.description : input.description,
      kind: input.kind === undefined ? existing.kind : input.kind,
      plannedDurationSeconds:
        input.plannedDurationSeconds === undefined ? existing.plannedDurationSeconds : input.plannedDurationSeconds,
      sortOrder: existing.sortOrder,
    },
  ]);
  const updated = await fastify.prisma.crm.$transaction(async (tx) => {
    const updated = await tx.crmAcademyWorkshopAgendaItem.update({
      where: { id: existing.id },
      data: item,
    });
    await syncAgendaDrivenEndsAt(
      tx,
      row,
      row.agendaItems.map((current: SafeAny) => (current.id === updated.id ? updated : current))
    );
    return updated;
  });
  return toAcademyWorkshopAgendaItem(updated);
}

export async function deleteWorkshopAgendaItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  agendaItemId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditAgenda(actor);
  assertAgendaStructureEditable(row);
  const itemId = positiveId(agendaItemId, 'Agenda ID');
  if (!row.agendaItems.some((item: SafeAny) => item.id === itemId)) {
    throw new AcademySalesError('Không tìm thấy mục agenda.', 404);
  }
  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmAcademyWorkshopAgendaItem.delete({ where: { id: itemId } });
    const remainingAgenda = row.agendaItems.filter((item: SafeAny) => item.id !== itemId);
    await Promise.all(
      remainingAgenda.map((item: SafeAny, index: number) =>
        tx.crmAcademyWorkshopAgendaItem.update({ where: { id: item.id }, data: { sortOrder: index + 1 } })
      )
    );
    await syncAgendaDrivenEndsAt(tx, row, remainingAgenda);
  });
}

export async function reorderWorkshopAgenda(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: ReorderAcademyWorkshopAgendaRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditAgenda(actor);
  assertAgendaStructureEditable(row);
  const ids = Array.isArray(input.agendaItemIds) ? input.agendaItemIds.map(Number) : [];
  const existingIds = row.agendaItems.map((item: SafeAny) => Number(item.id));
  if (
    ids.length !== existingIds.length ||
    new Set(ids).size !== ids.length ||
    ids.some((itemId) => !Number.isInteger(itemId) || !existingIds.includes(itemId))
  ) {
    throw new AcademySalesError('Thứ tự agenda không hợp lệ.');
  }
  await fastify.prisma.crm.$transaction(async (tx) => {
    await Promise.all(
      ids.map((itemId, index) =>
        tx.crmAcademyWorkshopAgendaItem.update({
          where: { id: itemId },
          data: { sortOrder: index + 1 },
        })
      )
    );
    await syncAgendaDrivenEndsAt(tx, row, row.agendaItems);
  });
  return (await getWorkshopById(fastify, actor, row.id)).agenda;
}

export async function uploadWorkshopHeroImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CreateAcademyWorkshopPublicMediaUploadRequest
): Promise<AcademyWorkshopPublicMediaUploadResult> {
  await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditWorkshopMedia(actor);
  return AcademyWorkshopStorageService.uploadPublicMedia(workshopId, 'hero-images', input);
}

export async function uploadWorkshopQuizImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CreateAcademyWorkshopPublicMediaUploadRequest
): Promise<AcademyWorkshopPublicMediaUploadResult> {
  await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditWorkshopMedia(actor);
  return AcademyWorkshopStorageService.uploadPublicMedia(workshopId, 'quiz-images', input);
}

export async function uploadWorkshopMenuImage(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CreateAcademyWorkshopPublicMediaUploadRequest
): Promise<AcademyWorkshopPublicMediaUploadResult> {
  await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditMenu(actor);
  return AcademyWorkshopStorageService.uploadPublicMedia(workshopId, 'menu-items', input);
}

export async function setWorkshopMenuAgendaItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: SetAcademyWorkshopAgendaResourceRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditMenu(actor);
  const agendaItemId = agendaItemIdForResource(row, input.agendaItemId == null ? null : Number(input.agendaItemId));
  await fastify.prisma.crm.crmAcademyWorkshop.update({
    where: { id: row.id },
    data: { menuAgendaItemId: agendaItemId },
  });
  return getWorkshopById(fastify, actor, row.id);
}

export async function createWorkshopMenuItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CreateAcademyWorkshopMenuItemRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditMenu(actor);
  const item = normalizeMenuItem(input);
  const sortOrder =
    Math.max(
      0,
      ...row.menuItems
        .filter((current: SafeAny) => current.category === item.category)
        .map((current: SafeAny) => Number(current.sortOrder) || 0)
    ) + 1;
  const created = await fastify.prisma.crm.crmAcademyWorkshopMenuItem.create({
    data: { ...item, workshopId: row.id, sortOrder },
  });
  return menuItem(created);
}

export async function updateWorkshopMenuItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  menuItemId: number,
  input: UpdateAcademyWorkshopMenuItemRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditMenu(actor);
  const itemId = positiveId(menuItemId, 'Món ăn');
  const existing = row.menuItems.find((item: SafeAny) => item.id === itemId);
  if (!existing) throw new AcademySalesError('Không tìm thấy món ăn trong thực đơn.', 404);
  const item = normalizeMenuItem({
    category: input.category === undefined ? existing.category : input.category,
    name: input.name === undefined ? existing.name : input.name,
    description: input.description === undefined ? existing.description : input.description,
    imageUrl: input.imageUrl === undefined ? existing.imageUrl : input.imageUrl,
    isAvailable: input.isAvailable === undefined ? existing.isAvailable : input.isAvailable,
  });
  const sortOrder =
    item.category === existing.category
      ? existing.sortOrder
      : Math.max(
          0,
          ...row.menuItems
            .filter((current: SafeAny) => current.id !== existing.id && current.category === item.category)
            .map((current: SafeAny) => Number(current.sortOrder) || 0)
        ) + 1;
  const updated = await fastify.prisma.crm.crmAcademyWorkshopMenuItem.update({
    where: { id: existing.id },
    data: { ...item, sortOrder },
  });
  return menuItem(updated);
}

export async function deleteWorkshopMenuItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  menuItemId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditMenu(actor);
  const itemId = positiveId(menuItemId, 'Món ăn');
  if (!row.menuItems.some((item: SafeAny) => item.id === itemId)) {
    throw new AcademySalesError('Không tìm thấy món ăn trong thực đơn.', 404);
  }
  await fastify.prisma.crm.crmAcademyWorkshopMenuItem.delete({ where: { id: itemId } });
}

export async function saveWorkshopMenuAsTemplate(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: SaveAcademyWorkshopMenuTemplateRequest
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditMenu(actor);
  return AcademyWorkshopMenuTemplateService.createFromWorkshop(fastify, actor, input, row.menuItems || []);
}

export async function refreshWorkshopMenuTemplateFromWorkshop(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  menuTemplateId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditMenu(actor);
  return AcademyWorkshopMenuTemplateService.replaceItemsFromWorkshop(
    fastify,
    actor,
    menuTemplateId,
    row.menuItems || []
  );
}

export async function applyWorkshopMenuTemplate(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  menuTemplateId: number
) {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  assertCanEditMenu(actor);
  const template = await AcademyWorkshopMenuTemplateService.getRequired(fastify, menuTemplateId);
  const menuItems = template.items.map((item) => ({
    workshopId: row.id,
    category: item.category,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    sortOrder: item.sortOrder,
    isAvailable: item.isAvailable,
  }));

  await fastify.prisma.crm.$transaction(async (tx) => {
    // Existing participant selections preserve their category/name snapshots.
    // The nullable foreign key is intentionally cleared by the database.
    await tx.crmAcademyWorkshopMenuItem.deleteMany({ where: { workshopId: row.id } });
    await tx.crmAcademyWorkshopMenuItem.createMany({ data: menuItems });
    await tx.crmAcademyWorkshop.update({ where: { id: row.id }, data: { menuTemplateId: template.id } });
  });
  return getWorkshopById(fastify, actor, row.id);
}
