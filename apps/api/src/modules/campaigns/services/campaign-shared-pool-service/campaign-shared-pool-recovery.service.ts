/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import type { SharedPoolRecoveryDto, SharedPoolRecoveryResponse } from '@mos-lab/shared';
import { findCampaignCustomer, resolveStaffDisplayName } from './campaign-shared-pool-helpers.js';

/**
 * Safely recover/rollback customer state in Campaign Shared Pool (Manager / Admin).
 * Invariants:
 * 1. Never delete old history (Append-only).
 * 2. Append a new audit log for every recovery.
 * 3. Mandatory reason input.
 * 4. Record acting staff and timestamp.
 * 5. Verify current customer state.
 * 6. Warn if data drifted since the target log entry.
 */
export async function recoverCustomerState(
  fastify: FastifyInstance,
  campaignId: number,
  staffId: number,
  dto: SharedPoolRecoveryDto
): Promise<SharedPoolRecoveryResponse> {
  const trimmedReason = (dto.reason || '').trim();
  if (!trimmedReason) {
    throw new Error('Bắt buộc nhập lý do khi thực hiện khôi phục.');
  }

  const customer = await findCampaignCustomer(fastify, campaignId, dto.customerId);
  if (!customer) {
    throw new Error('Khách hàng không tồn tại trong chiến dịch.');
  }

  const staffDisplayName = await resolveStaffDisplayName(fastify, staffId, 'Quản lý');
  const now = new Date();

  const previousState = {
    poolStatus: customer.poolStatus,
    claimedByStaffId: customer.claimedByStaffId,
    claimedByStaffName: customer.claimedByStaffName,
    claimedAt: customer.claimedAt,
    claimExpiresAt: customer.claimExpiresAt,
    cooldownUntil: customer.cooldownUntil,
    availableAt: customer.availableAt,
    lastCallResult: customer.lastCallResult,
  };

  let targetNextStatus: string;
  const nextClaimedByStaffId: number | null = null;
  const nextClaimedByStaffName: string | null = null;
  const nextClaimedAt: Date | null = null;
  const nextClaimExpiresAt: Date | null = null;
  let nextCooldownUntil: Date | null = null;
  let nextAvailableAt: Date | null = null;
  let actionDesc: string;

  if (dto.action === 'ROLLBACK_TO_LOG') {
    if (!dto.logId) {
      throw new Error('Thiếu ID bản ghi lịch sử cần khôi phục.');
    }
    const targetLog = await fastify.prisma.crm.crmCampaignSharedPoolLog.findUnique({
      where: { id: dto.logId },
    });
    if (!targetLog || targetLog.campaignId !== campaignId || targetLog.campaignCustomerId !== customer.id) {
      throw new Error('Bản ghi lịch sử không hợp lệ hoặc không thuộc về khách hàng này.');
    }

    const subsequentLogsCount = await fastify.prisma.crm.crmCampaignSharedPoolLog.count({
      where: {
        campaignCustomerId: customer.id,
        id: { gt: targetLog.id },
      },
    });

    let targetMeta: any = null;
    if (targetLog.metadata) {
      try {
        targetMeta = JSON.parse(targetLog.metadata);
      } catch {
        // Ignore malformed metadata JSON
      }
    }

    let intendedPrevStatus = targetMeta?.previousPoolStatus || targetMeta?.previousState?.poolStatus || null;

    if (!intendedPrevStatus) {
      if (targetLog.action === 'CLAIM') {
        intendedPrevStatus = 'AVAILABLE';
      } else if (targetLog.action === 'EXCLUDE') {
        intendedPrevStatus = 'AVAILABLE';
      } else if (targetLog.action === 'STATUS_UPDATE' || targetLog.action === 'CALL') {
        intendedPrevStatus = 'AVAILABLE';
      } else {
        intendedPrevStatus = 'AVAILABLE';
      }
    }

    const isDrifted =
      subsequentLogsCount > 0 ||
      customer.poolStatus !==
        (targetMeta?.nextPoolStatus || (targetLog.action === 'CLAIM' ? 'CLAIMED' : customer.poolStatus));

    if (isDrifted && !dto.forceOverride) {
      return {
        success: false,
        requiresConfirmation: true,
        driftDetected: true,
        message: `Dữ liệu khách hàng đã phát sinh thêm ${subsequentLogsCount} thao tác sau bản ghi này. Trạng thái hiện tại: "${customer.poolStatus}". Bạn có chắc chắn muốn ghi đè khôi phục về trạng thái trước (${intendedPrevStatus}) không?`,
        currentStatus: customer.poolStatus,
        targetPreviousStatus: intendedPrevStatus,
      };
    }

    targetNextStatus = intendedPrevStatus;
    actionDesc = `Hoàn tác về trạng thái trước bản ghi #${targetLog.id} (${targetLog.action})`;
  } else if (dto.action === 'RELEASE_CLAIM' || dto.action === 'FORCE_UNLOCK') {
    targetNextStatus = 'AVAILABLE';
    actionDesc = 'Cưỡng chế giải phóng Lock/Claim (Force Unlock)';
  } else if (dto.action === 'RESTORE_EXCLUDED') {
    targetNextStatus = 'AVAILABLE';
    actionDesc = 'Khôi phục khách hàng từ ĐÃ LOẠI (EXCLUDED) sang SẴN SÀNG (AVAILABLE)';
  } else if (dto.action === 'RESET_RECYCLE') {
    targetNextStatus = 'AVAILABLE';
    nextCooldownUntil = null;
    nextAvailableAt = null;
    actionDesc = 'Reset trạng thái Recycle, đưa ngay về Pool sẵn sàng';
  } else if (dto.action === 'RESET_POOL_STATUS') {
    targetNextStatus = dto.targetPoolStatus || 'AVAILABLE';
    actionDesc = `Reset trạng thái Pool sang "${targetNextStatus}"`;
  } else {
    throw new Error(`Hành động khôi phục không hợp lệ: ${dto.action}`);
  }

  const updatedCustomer = await fastify.prisma.crm.crmCampaignCustomer.update({
    where: { id: customer.id },
    data: {
      poolStatus: targetNextStatus,
      claimedByStaffId: nextClaimedByStaffId,
      claimedByStaffName: nextClaimedByStaffName,
      claimedAt: nextClaimedAt,
      claimExpiresAt: nextClaimExpiresAt,
      cooldownUntil: nextCooldownUntil,
      availableAt: nextAvailableAt,
    },
  });

  const nextState = {
    poolStatus: targetNextStatus,
    claimedByStaffId: nextClaimedByStaffId,
    claimedByStaffName: nextClaimedByStaffName,
    cooldownUntil: nextCooldownUntil,
    availableAt: nextAvailableAt,
  };

  await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
    data: {
      campaignId,
      campaignCustomerId: customer.id,
      legacyUserId: customer.legacyUserId,
      staffId,
      staffName: staffDisplayName,
      action: 'RECOVERY_OVERRIDE',
      note: `[KHÔI PHỤC] ${actionDesc}. Lý do: ${trimmedReason}`,
      metadata: JSON.stringify({
        recoveryAction: dto.action,
        reason: trimmedReason,
        rolledBackFromLogId: dto.logId || null,
        targetPoolStatus: dto.targetPoolStatus || null,
        forceOverride: Boolean(dto.forceOverride),
        previousState,
        nextState,
        previousPoolStatus: customer.poolStatus,
        nextPoolStatus: targetNextStatus,
        result: 'SUCCESS',
      }),
      createdAt: now,
    },
  });

  return {
    success: true,
    message: `Đã khôi phục thành công khách hàng sang trạng thái "${targetNextStatus}".`,
    customer: updatedCustomer,
  };
}
