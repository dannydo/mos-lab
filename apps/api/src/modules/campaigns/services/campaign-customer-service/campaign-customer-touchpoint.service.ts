/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import type { CampaignTouchpointLog, ToggleCampaignTouchpointLogDto } from '@mos-lab/shared';

/**
 * Upsert CrmCampaignTouchpointLog when a Booker or Admin toggles a touchpoint check mark.
 */
export async function toggleTouchpointLog(
  fastify: FastifyInstance,
  campaignId: number,
  customerId: number,
  touchpointId: number,
  dto: ToggleCampaignTouchpointLogDto,
  staffId: number,
  staffName: string,
  restrictToAssignedStaffId?: number
): Promise<CampaignTouchpointLog> {
  const campaignCustomer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
    where: {
      campaignId,
      OR: [{ legacyUserId: customerId }, { id: customerId }],
      removedAt: null,
    },
    include: {
      campaign: {
        select: { operationMode: true },
      },
    },
  });

  if (!campaignCustomer) {
    throw new Error('Khách hàng không ở trong chiến dịch này');
  }

  if (restrictToAssignedStaffId) {
    if (campaignCustomer.campaign?.operationMode === 'SHARED_POOL') {
      const now = new Date();
      const isClaimedByMe =
        campaignCustomer.poolStatus === 'CLAIMED' &&
        campaignCustomer.claimedByStaffId === restrictToAssignedStaffId &&
        Boolean(campaignCustomer.claimExpiresAt && campaignCustomer.claimExpiresAt > now);
      if (!isClaimedByMe) {
        const error = new Error('Bạn cần nhận (Claim) khách hàng này trong Shared Pool trước khi thao tác.');
        (error as any).statusCode = 403;
        throw error;
      }
    } else {
      const assignment = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
        where: {
          legacyUserId: campaignCustomer.legacyUserId,
          staffId: restrictToAssignedStaffId,
        },
        select: { id: true },
      });
      if (!assignment) {
        const error = new Error('Telesales chỉ được thao tác trên khách hàng đã được phân bổ cho mình.');
        (error as any).statusCode = 403;
        throw error;
      }
    }
  }

  const now = new Date();

  const finalStatus =
    dto.status === null || (dto.status as any) === '' ? null : dto.status || (dto.isChecked ? 'SUCCESS' : null);
  const finalIsChecked = finalStatus !== null || dto.isChecked;

  const log = await fastify.prisma.crm.crmCampaignTouchpointLog.upsert({
    where: {
      campaignCustomerId_touchpointId: {
        campaignCustomerId: campaignCustomer.id,
        touchpointId,
      },
    },
    update: {
      isChecked: finalIsChecked,
      status: finalStatus,
      completedAt: now,
      completedByStaffId: staffId,
      completedByStaffName: staffName,
      note: dto.note || null,
    },
    create: {
      campaignCustomerId: campaignCustomer.id,
      touchpointId,
      isChecked: finalIsChecked,
      status: finalStatus,
      completedAt: now,
      completedByStaffId: staffId,
      completedByStaffName: staffName,
      note: dto.note || null,
    },
  });

  if (dto.callbackDate && !isNaN(new Date(dto.callbackDate).getTime())) {
    const cbDate = new Date(dto.callbackDate);
    try {
      await fastify.prisma.crm.crmDailyPlan.upsert({
        where: {
          legacyUserId_plannedDate: {
            legacyUserId: campaignCustomer.legacyUserId,
            plannedDate: cbDate,
          },
        },
        create: {
          legacyUserId: campaignCustomer.legacyUserId,
          staffId,
          plannedDate: cbDate,
          bucket: 'CAMPAIGN_CALLBACK',
          priority: 1,
          status: 'PLANNED',
        },
        update: {
          staffId,
          status: 'PLANNED',
        },
      });
    } catch (e) {
      fastify.log.error(e, 'Failed to upsert daily plan for campaign touchpoint callback');
    }
  }

  return {
    id: log.id,
    campaignCustomerId: log.campaignCustomerId,
    touchpointId: log.touchpointId,
    isChecked: log.isChecked,
    status: (log.status as any) || (log.isChecked ? 'SUCCESS' : null),
    completedAt: log.completedAt ? log.completedAt.toISOString() : null,
    completedByStaffId: log.completedByStaffId,
    completedByStaffName: log.completedByStaffName,
    note: log.note,
  };
}
