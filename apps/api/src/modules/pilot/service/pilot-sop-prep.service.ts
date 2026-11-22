import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import {
  DEFAULT_SOP_PREPARATION_CATEGORY_1,
  type SaveSopPrepCategory1Request,
  type SaveSopPrepCriterionRequest,
  type SopPreparationCategory1Document,
  type SopPrepEvidenceFile,
  type SopPrepFileType,
  type UploadSopPrepEvidenceRequest,
} from '@mos-lab/shared';
import { pilotMediaDir, PilotServiceError, SOP_PREP_CAT1_CONFIG_KEY } from './pilot-core.js';

// ═══════════════════════════════════════════
// SOP Preparation - Category 1: Clinical Data Collection & 5 Criteria Evidence (MOS-FEAT-176)
// ═══════════════════════════════════════════

export async function getPilotSopPreparationCategory1(
  fastify: FastifyInstance,
  _pilotCode = 'DARK_LASHES'
): Promise<SopPreparationCategory1Document> {
  const config = await fastify.prisma.crm.crmConfig.findUnique({
    where: { key: SOP_PREP_CAT1_CONFIG_KEY },
  });

  if (!config || !config.value) {
    const defaultDoc = DEFAULT_SOP_PREPARATION_CATEGORY_1;
    if (fastify.prisma.crm.crmConfig?.upsert) {
      try {
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: SOP_PREP_CAT1_CONFIG_KEY },
          create: {
            key: SOP_PREP_CAT1_CONFIG_KEY,
            value: JSON.stringify(defaultDoc),
          },
          update: {
            value: JSON.stringify(defaultDoc),
          },
        });
      } catch {
        // ignore cache upsert error in test or mock environment
      }
    }
    return defaultDoc;
  }

  try {
    return JSON.parse(config.value) as SopPreparationCategory1Document;
  } catch {
    return DEFAULT_SOP_PREPARATION_CATEGORY_1;
  }
}

export async function savePilotSopPreparationCategory1(
  fastify: FastifyInstance,
  input: SaveSopPrepCategory1Request
): Promise<SopPreparationCategory1Document> {
  const existing = await getPilotSopPreparationCategory1(fastify, input.pilotCode || 'DARK_LASHES');
  const now = new Date().toISOString();

  const updatedDoc: SopPreparationCategory1Document = {
    ...existing,
    status: input.status || existing.status,
    statusLabel:
      input.statusLabel ||
      (input.status === 'DRAFT_COMPLETED' ? 'Bản nháp – Đã hoàn thành thu thập' : 'Bản nháp – Chưa kiểm chứng'),
    lastUpdatedBy: input.lastUpdatedBy || existing.lastUpdatedBy || 'Cô Giang Phạm',
    lastUpdatedAt: now,
    criteria: input.criteria || existing.criteria,
  };

  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: SOP_PREP_CAT1_CONFIG_KEY },
    create: {
      key: SOP_PREP_CAT1_CONFIG_KEY,
      value: JSON.stringify(updatedDoc),
    },
    update: {
      value: JSON.stringify(updatedDoc),
    },
  });

  return updatedDoc;
}

export async function savePilotSopPrepCriterion(
  fastify: FastifyInstance,
  criterionId: number,
  input: SaveSopPrepCriterionRequest
): Promise<SopPreparationCategory1Document> {
  const existing = await getPilotSopPreparationCategory1(fastify, input.pilotCode || 'DARK_LASHES');
  const now = new Date().toISOString();

  const updatedCriteria = existing.criteria.map((crit) => {
    if (crit.id === criterionId) {
      return {
        ...crit,
        expertiseKnowledge: input.expertiseKnowledge ?? crit.expertiseKnowledge,
        practicalMethod: input.practicalMethod ?? crit.practicalMethod,
        evaluationGrounds: input.evaluationGrounds ?? crit.evaluationGrounds,
        status: input.status ?? crit.status,
        statusLabel: input.status === 'VERIFIED' ? 'Đã kiểm chứng thực tế' : 'Bản nháp – Chưa kiểm chứng',
        updatedBy: input.updatedBy ?? crit.updatedBy ?? 'Cô Giang Phạm',
        updatedAt: now,
        evidenceFiles: input.evidenceFiles ?? crit.evidenceFiles,
      };
    }
    return crit;
  });

  const updatedDoc: SopPreparationCategory1Document = {
    ...existing,
    lastUpdatedBy: input.updatedBy || 'Cô Giang Phạm',
    lastUpdatedAt: now,
    criteria: updatedCriteria,
  };

  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: SOP_PREP_CAT1_CONFIG_KEY },
    create: {
      key: SOP_PREP_CAT1_CONFIG_KEY,
      value: JSON.stringify(updatedDoc),
    },
    update: {
      value: JSON.stringify(updatedDoc),
    },
  });

  return updatedDoc;
}

export async function uploadPilotSopPrepEvidence(
  fastify: FastifyInstance,
  input: UploadSopPrepEvidenceRequest
): Promise<SopPrepEvidenceFile> {
  if (!input.fileData || !input.fileData.trim()) {
    throw new PilotServiceError('Dữ liệu tệp đính kèm không được để trống.', 400);
  }
  if (!input.fileName || !input.fileName.trim()) {
    throw new PilotServiceError('Tên tệp không được để trống.', 400);
  }
  if (!input.criterionId || input.criterionId < 1 || input.criterionId > 5) {
    throw new PilotServiceError('Tiêu chí liên kết không hợp lệ (phải từ 1 đến 5).', 400);
  }

  const trimmed = input.fileData.trim();
  let mime = (input.mimeType || '').toLowerCase();
  let base64Data: string;

  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    mime = match[1].toLowerCase();
    base64Data = match[2];
  } else {
    base64Data = trimmed.replace(/\s/g, '');
  }

  const buffer = Buffer.from(base64Data, 'base64');
  let ext = 'bin';
  if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
  else if (mime.includes('png')) ext = 'png';
  else if (mime.includes('webp')) ext = 'webp';
  else if (mime.includes('mp4')) ext = 'mp4';
  else if (mime.includes('webm')) ext = 'webm';
  else if (mime.includes('pdf')) ext = 'pdf';
  else if (mime.includes('msword')) ext = 'doc';
  else if (mime.includes('officedocument') || mime.includes('word')) ext = 'docx';
  else {
    const dotIndex = input.fileName.lastIndexOf('.');
    if (dotIndex !== -1) {
      ext = input.fileName.slice(dotIndex + 1).toLowerCase();
    }
  }

  let fileType: SopPrepFileType = 'other';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    fileType = 'image';
  } else if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
    fileType = 'video';
  } else if (
    mime.includes('pdf') ||
    mime.includes('msword') ||
    mime.includes('document') ||
    ['pdf', 'doc', 'docx', 'txt'].includes(ext)
  ) {
    fileType = 'document';
  }

  const dir = pilotMediaDir();
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const filePath = join(dir, filename);
  await writeFile(filePath, buffer);

  const now = new Date().toISOString();
  const evidenceFile: SopPrepEvidenceFile = {
    id: `ev-${randomUUID().slice(0, 8)}`,
    name: input.fileName,
    url: `/api/pilot/media/${filename}`,
    fileType,
    mimeType: mime || 'application/octet-stream',
    sizeBytes: buffer.length,
    description: input.description?.trim() || '',
    sourceOrigin: input.sourceOrigin?.trim() || 'Ca Pilot thực tế',
    pilotSessionCode: input.pilotSessionCode?.trim() || undefined,
    uploadedBy: input.uploadedBy?.trim() || 'Cô Giang Phạm',
    uploadedAt: now,
  };

  // Automatically append to the corresponding criterion in the document
  try {
    const existing = await getPilotSopPreparationCategory1(fastify, 'DARK_LASHES');
    const updatedCriteria = existing.criteria.map((crit) => {
      if (crit.id === input.criterionId) {
        return {
          ...crit,
          updatedAt: now,
          evidenceFiles: [...crit.evidenceFiles, evidenceFile],
        };
      }
      return crit;
    });

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: SOP_PREP_CAT1_CONFIG_KEY },
      create: {
        key: SOP_PREP_CAT1_CONFIG_KEY,
        value: JSON.stringify({
          ...existing,
          lastUpdatedAt: now,
          criteria: updatedCriteria,
        }),
      },
      update: {
        value: JSON.stringify({
          ...existing,
          lastUpdatedAt: now,
          criteria: updatedCriteria,
        }),
      },
    });
  } catch {
    // Non-blocking in mock environments
  }

  return evidenceFile;
}

export async function deletePilotSopPrepEvidence(
  fastify: FastifyInstance,
  criterionId: number,
  fileId: string
): Promise<SopPreparationCategory1Document> {
  const existing = await getPilotSopPreparationCategory1(fastify, 'DARK_LASHES');
  const now = new Date().toISOString();

  const updatedCriteria = existing.criteria.map((crit) => {
    if (crit.id === criterionId) {
      return {
        ...crit,
        updatedAt: now,
        evidenceFiles: crit.evidenceFiles.filter((f) => f.id !== fileId),
      };
    }
    return crit;
  });

  const updatedDoc: SopPreparationCategory1Document = {
    ...existing,
    lastUpdatedAt: now,
    criteria: updatedCriteria,
  };

  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: SOP_PREP_CAT1_CONFIG_KEY },
    create: {
      key: SOP_PREP_CAT1_CONFIG_KEY,
      value: JSON.stringify(updatedDoc),
    },
    update: {
      value: JSON.stringify(updatedDoc),
    },
  });

  return updatedDoc;
}
