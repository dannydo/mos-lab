import type { FastifyInstance } from 'fastify';
import type { CareerRole, StaffCareerStatus } from '@mos-lab/shared';
import { getCareerConfig } from './career-config.service.js';
import { resolveNextTargetRole } from './career-helpers.js';
import { getStaffProgression } from './career-progression.service.js';

/**
 * Kích hoạt Ải Trùm Cuối (Bắt đầu 30 ngày thử thách tự tư vấn chốt combo)
 */
export async function activateCareerTrialGate(
  fastify: FastifyInstance,
  staffId: number,
  actorId: number
): Promise<StaffCareerStatus> {
  const status = await getStaffProgression(fastify, staffId);
  if (!status.qualifiedQuests.qaAuditCompleted) {
    const reason = status.metrics.qaAudit?.hasFailedAudit
      ? 'Không thể mở ải thử thách do có bài kiểm tra QA/QC tác phong hoặc phòng nối mi bị FAILED'
      : 'Không thể mở ải thử thách do chưa đạt tần suất kiểm tra QA/QC tác phong & phòng mi định kỳ (tối thiểu 1 lần/tuần)';
    throw new Error(reason);
  }

  const config = await getCareerConfig(fastify);
  const now = new Date();
  const endsAt = new Date(now.getTime() + config.cvToCc.trialDurationDays * 24 * 60 * 60 * 1000);

  await fastify.prisma.crm.crmCareerProgression.upsert({
    where: { staffId },
    create: {
      staffId,
      currentRole: 'CV',
      targetRole: 'CC',
      status: 'TRIAL_GATE',
      trialStartedAt: now,
      trialEndsAt: endsAt,
      promotedBy: actorId,
    },
    update: {
      status: 'TRIAL_GATE',
      trialStartedAt: now,
      trialEndsAt: endsAt,
      promotedBy: actorId,
    },
  });

  return getStaffProgression(fastify, staffId);
}

/**
 * Xác nhận thăng cấp chính thức
 */
export async function promoteCareerStaff(
  fastify: FastifyInstance,
  staffId: number,
  newRole: CareerRole,
  actorId: number,
  force = false
): Promise<StaffCareerStatus> {
  const status = await getStaffProgression(fastify, staffId);
  if (!force && !status.qualifiedQuests.qaAuditCompleted) {
    const reason = status.metrics.qaAudit?.hasFailedAudit
      ? 'Không thể duyệt thăng cấp do có bài kiểm tra QA/QC tác phong hoặc phòng nối mi bị FAILED'
      : 'Không thể duyệt thăng cấp do chưa đạt tần suất kiểm tra QA/QC tác phong & phòng mi định kỳ (tối thiểu 1 lần/tuần)';
    throw new Error(reason);
  }

  const now = new Date();
  const targetRole = resolveNextTargetRole(newRole);

  // 1. Update Career Progression record
  await fastify.prisma.crm.crmCareerProgression.upsert({
    where: { staffId },
    create: {
      staffId,
      currentRole: newRole,
      targetRole,
      status: 'PROMOTED',
      promotedAt: now,
      promotedBy: actorId,
    },
    update: {
      currentRole: newRole,
      targetRole,
      status: 'PROMOTED',
      promotedAt: now,
      promotedBy: actorId,
    },
  });

  // 2. Update role in crmStaff
  const roleKey = newRole.toLowerCase();
  await fastify.prisma.crm.crmStaff.update({
    where: { id: staffId },
    data: { role: roleKey },
  });

  return getStaffProgression(fastify, staffId);
}

/**
 * Quản lý trực tiếp thiết lập chức danh cho nhân sự (Thăng cấp / Hạ cấp tùy ý)
 */
export async function setCareerStaffRole(
  fastify: FastifyInstance,
  staffId: number,
  newRole: CareerRole,
  actorId: number,
  _reason?: string
): Promise<StaffCareerStatus> {
  const now = new Date();
  const targetRole = resolveNextTargetRole(newRole);
  const statusValue = newRole === 'CV' ? 'IN_PROGRESS' : 'PROMOTED';

  await fastify.prisma.crm.crmCareerProgression.upsert({
    where: { staffId },
    create: {
      staffId,
      currentRole: newRole,
      targetRole,
      status: statusValue,
      promotedAt: now,
      promotedBy: actorId,
    },
    update: {
      currentRole: newRole,
      targetRole,
      status: statusValue,
      promotedAt: now,
      promotedBy: actorId,
    },
  });

  const roleKey = newRole.toLowerCase();
  await fastify.prisma.crm.crmStaff.update({
    where: { id: staffId },
    data: { role: roleKey },
  });

  return getStaffProgression(fastify, staffId);
}

/**
 * Hạ cấp nhân sự
 */
export async function demoteCareerStaff(
  fastify: FastifyInstance,
  staffId: number,
  newRole: CareerRole,
  actorId: number,
  reason?: string
): Promise<StaffCareerStatus> {
  return setCareerStaffRole(fastify, staffId, newRole, actorId, reason);
}

/**
 * Chuyển sang nhánh Chuyên gia Kỹ thuật Bậc Cao (Master Technician)
 */
export async function switchCareerToSpecialistPath(
  fastify: FastifyInstance,
  staffId: number,
  actorId: number
): Promise<StaffCareerStatus> {
  await fastify.prisma.crm.crmCareerProgression.upsert({
    where: { staffId },
    create: {
      staffId,
      currentRole: 'MASTER_TECH',
      targetRole: 'MASTER_TECH',
      status: 'SPECIALIST_PATH',
      promotedBy: actorId,
    },
    update: {
      currentRole: 'MASTER_TECH',
      targetRole: 'MASTER_TECH',
      status: 'SPECIALIST_PATH',
      promotedBy: actorId,
    },
  });

  return getStaffProgression(fastify, staffId);
}
