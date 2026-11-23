import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { PilotSession } from '@mos-lab/shared';
import { formatPilotSession, pilotMediaDir, PilotServiceError } from './pilot-core.js';
import { deductPilotStockForSession } from './pilot-materials.service.js';

export async function checkInPilotSession(
  fastify: FastifyInstance,
  id: number,
  checkInAtStr?: string
): Promise<PilotSession> {
  const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
  }

  const checkInDate = checkInAtStr ? new Date(checkInAtStr) : new Date();

  const updated = await fastify.prisma.crm.crmPilotSession.update({
    where: { id },
    data: {
      checkInAt: checkInDate,
      status: 'CHECKED_IN',
    },
  });

  return formatPilotSession(updated);
}

export async function savePilotBeforePhoto(
  fastify: FastifyInstance,
  id: number,
  beforePhotoUrl: string
): Promise<PilotSession> {
  const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
  }
  if (!beforePhotoUrl || !beforePhotoUrl.trim()) {
    throw new PilotServiceError('Ảnh trước khi làm (Before Photo) không được để trống.', 400);
  }

  const updated = await fastify.prisma.crm.crmPilotSession.update({
    where: { id },
    data: {
      beforePhotoUrl: beforePhotoUrl.trim(),
      status: 'BEFORE_PHOTO',
    },
  });

  return formatPilotSession(updated);
}

export async function markPilotServiceDone(
  fastify: FastifyInstance,
  id: number,
  serviceDoneAtStr?: string
): Promise<PilotSession> {
  const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
  }
  if (!existing.beforePhotoUrl) {
    throw new PilotServiceError(
      'Bắt buộc phải chụp/upload ảnh Trước khi làm (Before Photo) trước khi hoàn tất dịch vụ.',
      400
    );
  }

  const serviceDoneDate = serviceDoneAtStr ? new Date(serviceDoneAtStr) : new Date();

  const updated = await fastify.prisma.crm.crmPilotSession.update({
    where: { id },
    data: {
      serviceDoneAt: serviceDoneDate,
      status: 'SERVICE_DONE',
    },
  });

  try {
    await deductPilotStockForSession(fastify, id);
  } catch {
    // non-blocking stock deduction
  }

  return formatPilotSession(updated);
}

export async function savePilotAfterPhoto(
  fastify: FastifyInstance,
  id: number,
  afterPhotoUrl: string
): Promise<PilotSession> {
  const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
  }
  if (!afterPhotoUrl || !afterPhotoUrl.trim()) {
    throw new PilotServiceError('Ảnh sau khi làm (After Photo) không được để trống.', 400);
  }

  const updated = await fastify.prisma.crm.crmPilotSession.update({
    where: { id },
    data: {
      afterPhotoUrl: afterPhotoUrl.trim(),
      status: 'AFTER_PHOTO',
    },
  });

  return formatPilotSession(updated);
}

export async function savePilotFeedback(
  fastify: FastifyInstance,
  id: number,
  feedbackRating: number,
  feedbackNote?: string | null
): Promise<PilotSession> {
  const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
  }
  const rating = Number(feedbackRating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new PilotServiceError('Đánh giá của khách hàng phải là số từ 1 đến 5 sao.', 400);
  }

  const updated = await fastify.prisma.crm.crmPilotSession.update({
    where: { id },
    data: {
      feedbackRating: rating,
      feedbackNote: feedbackNote ? feedbackNote.trim() : null,
      csatScore: rating,
      status: 'FEEDBACK_DONE',
    },
  });

  return formatPilotSession(updated);
}

export async function checkOutPilotSession(
  fastify: FastifyInstance,
  id: number,
  checkOutAtStr?: string
): Promise<PilotSession> {
  const existing = await fastify.prisma.crm.crmPilotSession.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new PilotServiceError('Không tìm thấy ca dịch vụ pilot tương ứng.', 404);
  }
  const isIneligible = existing.status === 'INELIGIBLE' || existing.assessmentStatus === 'FAIL';
  if (!isIneligible) {
    if (!existing.afterPhotoUrl) {
      throw new PilotServiceError('Chưa có ảnh sau khi làm (After Photo). Bắt buộc upload trước khi Check-out.', 400);
    }
    if (!existing.feedbackRating && !existing.csatScore) {
      throw new PilotServiceError(
        'Chưa có đánh giá Feedback tại chỗ của khách. Bắt buộc hoàn tất trước khi Check-out.',
        400
      );
    }
  }

  const checkOutDate = checkOutAtStr ? new Date(checkOutAtStr) : new Date();
  const checkInDate = existing.checkInAt
    ? new Date(existing.checkInAt)
    : existing.createdAt
      ? new Date(existing.createdAt)
      : new Date();

  const diffMinutes = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000));

  const updated = await fastify.prisma.crm.crmPilotSession.update({
    where: { id },
    data: {
      checkOutAt: checkOutDate,
      totalDurationMinutes: diffMinutes,
      status: isIneligible ? 'INELIGIBLE' : 'CHECKED_OUT',
    },
  });

  return formatPilotSession(updated);
}

export async function uploadPilotPhoto(
  _fastify: FastifyInstance,
  input: { photoData: string; mimeType?: string; filename?: string }
): Promise<{ photoUrl: string }> {
  if (!input.photoData || !input.photoData.trim()) {
    throw new PilotServiceError('Dữ liệu ảnh không được để trống.', 400);
  }

  const trimmed = input.photoData.trim();
  let mime = input.mimeType || 'image/jpeg';
  let base64Data: string;

  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    mime = match[1];
    base64Data = match[2];
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return { photoUrl: trimmed };
  } else {
    base64Data = trimmed.replace(/\s/g, '');
  }

  const buffer = Buffer.from(base64Data, 'base64');

  let ext = 'jpg';
  if (mime.includes('png')) ext = 'png';
  else if (mime.includes('webp')) ext = 'webp';

  const dir = pilotMediaDir();
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const filePath = join(dir, filename);
  await writeFile(filePath, buffer);

  return { photoUrl: `/api/pilot/media/${filename}` };
}
