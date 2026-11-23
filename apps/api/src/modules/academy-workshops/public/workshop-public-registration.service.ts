import type { FastifyInstance } from 'fastify';
import type { AcademyWorkshopPublicRegistrationInfo, RegisterAcademyWorkshopResponse } from '@mos-lab/shared';
import { isZaloSocialLoginConfigured } from '../../auth/zalo-social-identity.service.js';
import {
  AcademySalesError,
  buildAcademyLeadSearchText,
  normalizeAcademyPhone,
} from '../../academy-sales/academy-sales.service.js';
import { resolveAcademyWorkshopPublicOrigin } from '../academy-workshop.service.js';
import {
  buildPublicDesign,
  buildPublicEquipment,
  buildPublicMenu,
  cleanText,
  CLOSED_WORKSHOP_STATUSES,
  registrationCode,
  registrationExternalKey,
  registrationPhase,
  validateDesignSelection,
  validateEquipmentSelection,
  validateMenuSelections,
  workshopQrTokenHash,
  type ExternalWorkshopRegistrationIdentity,
  type WorkshopRegistrationInput,
} from './workshop-public-helpers.js';

export async function findExistingWorkshopRegistration(
  fastify: FastifyInstance,
  rawRegistrationCode: unknown,
  identity: ExternalWorkshopRegistrationIdentity
): Promise<RegisterAcademyWorkshopResponse | null> {
  const code = registrationCode(rawRegistrationCode);
  const externalKey = registrationExternalKey(identity);
  const email = cleanText(identity.email, 150);
  const participant = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findFirst({
    where: {
      workshop: { registrationCode: code },
      campaignLead: {
        lead: {
          OR: [{ externalKey }, ...(email ? [{ email }] : [])],
        },
      },
    },
    select: { id: true, attendanceStatus: true },
  });

  if (!participant) return null;
  return {
    participantId: participant.id,
    attendanceStatus: participant.attendanceStatus as RegisterAcademyWorkshopResponse['attendanceStatus'],
    alreadyRegistered: true,
    message: 'Bạn đã đăng ký workshop này. Academy sẽ liên hệ để xác nhận.',
  };
}

export async function getWorkshopPublicRegistrationInfo(
  fastify: FastifyInstance,
  rawRegistrationCode: unknown
): Promise<AcademyWorkshopPublicRegistrationInfo> {
  const workshop = await fastify.prisma.crm.crmAcademyWorkshop.findUnique({
    where: { registrationCode: registrationCode(rawRegistrationCode) },
    include: {
      campaign: { select: { name: true, slug: true, description: true } },
      agendaItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      menuItems: {
        where: { isAvailable: true },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, category: true, name: true, description: true, imageUrl: true },
      },
      equipmentPackages: {
        where: { isAvailable: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          includedItemsJson: true,
          priceVnd: true,
          isIncludedInFee: true,
          images: {
            select: { id: true, imageUrl: true, altText: true, sortOrder: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      },
      designs: {
        where: { isAvailable: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          difficultyLevel: true,
          priceVnd: true,
          images: {
            select: { id: true, imageUrl: true, altText: true, sortOrder: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      },
      _count: { select: { participants: true } },
    },
  });
  if (!workshop || CLOSED_WORKSHOP_STATUSES.has(workshop.status)) {
    throw new AcademySalesError('Workshop không tồn tại hoặc không còn mở công khai.', 404);
  }

  const phase = registrationPhase(workshop);
  const canJoin = phase === 'CHECKIN' || phase === 'LIVE';
  const equipmentSelectionEnabled = workshop.equipmentAgendaItemId != null && workshop.equipmentPackages.length > 0;
  const designSelectionEnabled = workshop.designAgendaItemId != null && workshop.designs.length > 0;
  const menuSelectionEnabled = workshop.menuAgendaItemId != null && workshop.menuItems.length > 0;
  return {
    phase,
    canRegister: phase === 'REGISTRATION' && workshop._count.participants < workshop.capacity,
    zaloAuthAvailable: isZaloSocialLoginConfigured(),
    workshop: {
      name: workshop.campaign.name,
      slug: workshop.campaign.slug,
      description: workshop.campaign.description,
      heroImageUrl: workshop.heroImageUrl ?? null,
      startsAt: workshop.startsAt.toISOString(),
      endsAt: workshop.endsAt.toISOString(),
      publishedAt: workshop.publishedAt ? workshop.publishedAt.toISOString() : null,
      scheduledPublishAt: workshop.scheduledPublishAt ? workshop.scheduledPublishAt.toISOString() : null,
      menuSelectionDeadline: (workshop.menuSelectionDeadline || workshop.startsAt).toISOString(),
      equipmentSelectionDeadline: (workshop.equipmentSelectionDeadline || workshop.startsAt).toISOString(),
      designSelectionDeadline: (workshop.designSelectionDeadline || workshop.startsAt).toISOString(),
      location: workshop.location,
      capacity: workshop.capacity,
      remainingSeats: Math.max(0, workshop.capacity - workshop._count.participants),
      feeVnd: workshop.feeVnd,
      equipment: buildPublicEquipment(workshop.equipmentPackages, equipmentSelectionEnabled),
      design: buildPublicDesign(workshop.designs, designSelectionEnabled),
      agenda: workshop.agendaItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        kind: item.kind as AcademyWorkshopPublicRegistrationInfo['workshop']['agenda'][number]['kind'],
        plannedDurationSeconds: item.plannedDurationSeconds,
        sortOrder: item.sortOrder,
        equipmentSelectionEnabled: equipmentSelectionEnabled && workshop.equipmentAgendaItemId === item.id,
        designSelectionEnabled: designSelectionEnabled && workshop.designAgendaItemId === item.id,
        menuSelectionEnabled: menuSelectionEnabled && workshop.menuAgendaItemId === item.id,
      })),
      menu: buildPublicMenu(workshop.menuItems, menuSelectionEnabled),
      joinUrl: canJoin
        ? `${resolveAcademyWorkshopPublicOrigin()}/academy/workshops/lobby/${encodeURIComponent(workshop.displayCode)}`
        : null,
    },
  };
}

export async function registerForWorkshop(
  fastify: FastifyInstance,
  rawRegistrationCode: unknown,
  input: WorkshopRegistrationInput,
  externalIdentity?: ExternalWorkshopRegistrationIdentity
): Promise<RegisterAcademyWorkshopResponse> {
  const code = registrationCode(rawRegistrationCode);
  const name = cleanText(externalIdentity?.name, 150) || cleanText(input.name, 150);
  const phone = cleanText(input.phone, 50);
  const phoneNormalized = normalizeAcademyPhone(phone);
  const email = cleanText(externalIdentity?.email, 150) || cleanText(input.email, 150);
  const goal = cleanText(input.goal, 2_000);
  const referrer = cleanText(input.referrer, 300);
  const externalKey = externalIdentity ? registrationExternalKey(externalIdentity) : null;
  const avatarUrl = externalIdentity?.avatarUrl || null;
  if (!name) throw new AcademySalesError('Vui lòng nhập họ và tên.');
  if (!phoneNormalized || phoneNormalized.length < 8 || phoneNormalized.length > 15) {
    throw new AcademySalesError('Vui lòng nhập số điện thoại hợp lệ.');
  }

  return fastify.prisma.crm.$transaction(async (tx) => {
    // Lock the workshop row during the capacity decision so concurrent public
    // registrations cannot overbook the event.
    const locked = await tx.$queryRawUnsafe<
      Array<{
        id: number;
        campaign_id: number;
        capacity: number;
        status: string;
        registration_open: number;
        starts_at: Date;
        published_at: Date | null;
        scheduled_publish_at: Date | null;
        menu_selection_deadline: Date | null;
        equipment_selection_deadline: Date | null;
        design_selection_deadline: Date | null;
        menu_agenda_item_id: number | null;
        equipment_agenda_item_id: number | null;
        design_agenda_item_id: number | null;
      }>
    >(
      `SELECT id, campaign_id, capacity, status, registration_open, starts_at, published_at, scheduled_publish_at, menu_selection_deadline, equipment_selection_deadline, design_selection_deadline, menu_agenda_item_id, equipment_agenda_item_id, design_agenda_item_id
       FROM crm_academy_workshops WHERE registration_code = ? FOR UPDATE`,
      code
    );
    const workshop = locked[0];
    if (!workshop || CLOSED_WORKSHOP_STATUSES.has(workshop.status)) {
      throw new AcademySalesError('Workshop không tồn tại hoặc không còn mở công khai.', 404);
    }
    if (
      registrationPhase({
        status: workshop.status,
        registrationOpen: Boolean(workshop.registration_open),
        scheduledPublishAt: workshop.scheduled_publish_at,
      }) !== 'REGISTRATION'
    ) {
      throw new AcademySalesError('Đăng ký online hiện đã đóng. Vui lòng liên hệ Academy để được hỗ trợ.', 409);
    }

    if (workshop.status === 'DRAFT') {
      await tx.crmAcademyWorkshop.update({
        where: { id: workshop.id },
        data: {
          status: 'SCHEDULED',
          publishedAt: workshop.scheduled_publish_at || new Date(),
          scheduledPublishAt: null,
        },
      });
    }

    const menuSelectionDeadlineMs = new Date(workshop.menu_selection_deadline || workshop.starts_at).getTime();
    const equipmentSelectionDeadlineMs = new Date(
      workshop.equipment_selection_deadline || workshop.starts_at
    ).getTime();
    const designSelectionDeadlineMs = new Date(workshop.design_selection_deadline || workshop.starts_at).getTime();
    const menuSelectionsAreLocked = !Number.isFinite(menuSelectionDeadlineMs) || menuSelectionDeadlineMs <= Date.now();
    const equipmentSelectionIsLocked =
      !Number.isFinite(equipmentSelectionDeadlineMs) || equipmentSelectionDeadlineMs <= Date.now();
    const designSelectionIsLocked =
      !Number.isFinite(designSelectionDeadlineMs) || designSelectionDeadlineMs <= Date.now();
    if (workshop.menu_agenda_item_id && menuSelectionsAreLocked && input.menuSelections?.length) {
      throw new AcademySalesError('Đã hết hạn thay đổi thực đơn.', 409);
    }
    if (workshop.equipment_agenda_item_id && equipmentSelectionIsLocked && input.equipmentPackageId != null) {
      throw new AcademySalesError('Đã hết hạn thay đổi bộ dụng cụ.', 409);
    }
    if (workshop.design_agenda_item_id && designSelectionIsLocked && input.designItemId != null) {
      throw new AcademySalesError('Đã hết hạn thay đổi mẫu thiết kế mi.', 409);
    }

    const availableMenuItems = await tx.crmAcademyWorkshopMenuItem.findMany({
      where: { workshopId: workshop.id, isAvailable: true },
      select: { id: true, category: true, name: true, description: true, imageUrl: true },
    });
    const menuSelections = workshop.menu_agenda_item_id
      ? validateMenuSelections(input.menuSelections, availableMenuItems)
      : [];
    const availableEquipmentPackages = await tx.crmAcademyWorkshopEquipmentPackage.findMany({
      where: { workshopId: workshop.id, isAvailable: true },
      select: {
        id: true,
        name: true,
        description: true,
        includedItemsJson: true,
        priceVnd: true,
        isIncludedInFee: true,
      },
    });
    const equipmentSelection = workshop.equipment_agenda_item_id
      ? validateEquipmentSelection(input.equipmentPackageId, availableEquipmentPackages)
      : null;
    const availableDesignItems = await tx.crmAcademyWorkshopDesignItem.findMany({
      where: { workshopId: workshop.id, isAvailable: true },
      select: { id: true, name: true, description: true, difficultyLevel: true, priceVnd: true },
    });
    const designSelection = workshop.design_agenda_item_id
      ? validateDesignSelection(input.designItemId, availableDesignItems)
      : null;

    let lead = externalKey ? await tx.crmAcademyLead.findUnique({ where: { externalKey } }) : null;
    if (!lead) {
      lead = await tx.crmAcademyLead.findFirst({
        where: { phoneNormalized },
        orderBy: { updatedAt: 'desc' },
      });
    }
    if (!lead && email) {
      lead = await tx.crmAcademyLead.findFirst({
        where: { email },
        orderBy: { updatedAt: 'desc' },
      });
    }
    const providerLabel = externalIdentity?.provider === 'ZALO' ? 'Zalo' : 'Google';
    const source = externalIdentity ? `${providerLabel} Workshop registration` : 'Workshop public link';
    const note = referrer ? `Đăng ký workshop · Người giới thiệu: ${referrer}` : `Đăng ký workshop từ ${source}`;
    if (!lead) {
      lead = await tx.crmAcademyLead.create({
        data: {
          ...(externalKey ? { externalKey } : {}),
          name,
          phone,
          phoneNormalized,
          email,
          ...(avatarUrl ? { avatarUrl } : {}),
          sourceSystem: externalIdentity?.provider || 'WORKSHOP_PUBLIC',
          source,
          goal,
          note,
          status: 'SCHEDULED',
          searchText: buildAcademyLeadSearchText({ name, phone, email, source, goal, note }),
        },
      });
    } else if (externalIdentity || (!lead.email && email) || (!lead.goal && goal)) {
      const nextName = externalIdentity ? name : lead.name;
      const nextEmail = externalIdentity ? email || lead.email : lead.email || email;
      const nextGoal = lead.goal || goal;
      const nextAvatarUrl = avatarUrl || lead.avatarUrl;
      lead = await tx.crmAcademyLead.update({
        where: { id: lead.id },
        data: {
          name: nextName,
          ...(externalKey && !lead.externalKey ? { externalKey } : {}),
          email: nextEmail,
          goal: nextGoal,
          ...(nextAvatarUrl ? { avatarUrl: nextAvatarUrl } : {}),
          searchText: buildAcademyLeadSearchText({
            name: nextName,
            phone: lead.phone,
            email: nextEmail,
            source: lead.source,
            goal: nextGoal,
            note: lead.note,
          }),
        },
      });
    }

    const membership = await tx.crmAcademyCampaignLead.upsert({
      where: { campaignId_leadId: { campaignId: workshop.campaign_id, leadId: lead.id } },
      create: { campaignId: workshop.campaign_id, leadId: lead.id },
      update: { removedAt: null, removedReason: null, removedByStaffId: null },
    });
    const existing = await tx.crmAcademyWorkshopParticipant.findUnique({ where: { campaignLeadId: membership.id } });
    if (existing) {
      return {
        participantId: existing.id,
        attendanceStatus: existing.attendanceStatus as RegisterAcademyWorkshopResponse['attendanceStatus'],
        alreadyRegistered: true,
        message: 'Bạn đã đăng ký workshop này. Academy sẽ liên hệ để xác nhận.',
      };
    }

    const participantCount = await tx.crmAcademyWorkshopParticipant.count({ where: { workshopId: workshop.id } });
    if (participantCount >= workshop.capacity) {
      throw new AcademySalesError('Workshop đã đủ chỗ. Vui lòng liên hệ Academy để vào danh sách chờ.', 409);
    }

    const participant = await tx.crmAcademyWorkshopParticipant.create({
      data: {
        workshopId: workshop.id,
        campaignLeadId: membership.id,
        qrTokenHash: workshopQrTokenHash(),
        attendanceStatus: 'PENDING',
        ...(menuSelections.length
          ? {
              menuSelections: {
                create: menuSelections.map((selection) => ({
                  category: selection.category,
                  menuItemId: selection.menuItemId,
                  itemName: selection.itemName,
                })),
              },
            }
          : {}),
        ...(equipmentSelection
          ? {
              equipmentSelection: {
                create: equipmentSelection,
              },
            }
          : {}),
        ...(designSelection
          ? {
              designSelection: {
                create: designSelection,
              },
            }
          : {}),
      },
    });
    await tx.crmAcademyWorkshopParticipantEvent.create({
      data: {
        workshopId: workshop.id,
        participantId: participant.id,
        eventType: externalIdentity ? `SELF_REGISTERED_PUBLIC_${externalIdentity.provider}` : 'SELF_REGISTERED_PUBLIC',
        metadataJson: JSON.stringify({
          source: externalIdentity
            ? `public_registration_${externalIdentity.provider.toLowerCase()}`
            : 'public_registration_link',
          provider: externalIdentity?.provider,
          leadId: lead.id,
        }),
      },
    });
    return {
      participantId: participant.id,
      attendanceStatus: 'PENDING',
      alreadyRegistered: false,
      message: externalIdentity
        ? `Đã xác minh ${providerLabel} và nhận đăng ký. Academy sẽ liên hệ để xác nhận chỗ tham dự của bạn.`
        : 'Đã nhận đăng ký. Academy sẽ liên hệ để xác nhận chỗ tham dự của bạn.',
    };
  });
}
