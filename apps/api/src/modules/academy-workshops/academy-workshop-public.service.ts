import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type {
  AcademyWorkshopMenuCategory,
  AcademyWorkshopMenuSelectionInput,
  AcademyWorkshopPublicPhase,
  AcademyWorkshopPublicRegistrationInfo,
  AcademyWorkshopSharedJoinInfo,
  JoinAcademyWorkshopWithGoogleRequest,
  RegisterAcademyWorkshopWithGoogleRequest,
  RegisterAcademyWorkshopWithZaloRequest,
  RegisterAcademyWorkshopResponse,
  SelectAcademyWorkshopParticipantRequest,
} from '@mos-lab/shared';
import { ACADEMY_WORKSHOP_MENU_CATEGORIES, ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS } from '@mos-lab/shared';
import type { GoogleIdentity } from '../auth/google-identity.service.js';
import { isZaloSocialLoginConfigured, type ZaloSocialIdentity } from '../auth/zalo-social-identity.service.js';
import {
  AcademySalesError,
  buildAcademyLeadSearchText,
  normalizeAcademyPhone,
} from '../academy-sales/academy-sales.service.js';
import { resolveAcademyWorkshopPublicOrigin } from './academy-workshop.service.js';

const CLOSED_WORKSHOP_STATUSES = new Set(['CANCELLED', 'ARCHIVED']);
const LOBBY_OPEN_WORKSHOP_STATUSES = new Set(['CHECKIN_OPEN', 'LIVE', 'PAUSED']);
const PUBLIC_REGISTRATION_CODE = /^[A-Za-z0-9_-]{12,48}$/;
const MENU_CATEGORIES = new Set<AcademyWorkshopMenuCategory>(ACADEMY_WORKSHOP_MENU_CATEGORIES);

function registrationCode(value: unknown): string {
  const code = String(value || '').trim();
  if (!PUBLIC_REGISTRATION_CODE.test(code)) throw new AcademySalesError('Link đăng ký workshop không hợp lệ.', 404);
  return code;
}

function registrationPhase(workshop: { status: string; registrationOpen: boolean }): AcademyWorkshopPublicPhase {
  if (workshop.status === 'CHECKIN_OPEN') return 'CHECKIN';
  if (workshop.status === 'LIVE' || workshop.status === 'PAUSED') return 'LIVE';
  if (workshop.status === 'COMPLETED') return 'COMPLETED';
  if (workshop.status === 'SCHEDULED' && workshop.registrationOpen) return 'REGISTRATION';
  return 'CLOSED';
}

export function getAcademyWorkshopPublicRegistrationPhase(workshop: {
  status: string;
  registrationOpen: boolean;
}): AcademyWorkshopPublicPhase {
  return registrationPhase(workshop);
}

export function assertAcademyWorkshopLobbyOpen(workshop: { status: string }) {
  if (!LOBBY_OPEN_WORKSHOP_STATUSES.has(workshop.status)) {
    throw new AcademySalesError('Workshop chưa mở check-in. Vui lòng quay lại khi Academy thông báo.', 409);
  }
}

function cleanText(value: unknown, maxLength: number): string | null {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

export function normalizeAcademyWorkshopPhone(value: unknown): string {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0084')) digits = digits.slice(2);
  if (digits.startsWith('84') && digits.length >= 10) digits = `0${digits.slice(2)}`;
  return digits;
}

function displayCode(value: unknown): string {
  const code = String(value || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(code)) throw new AcademySalesError('Mã workshop không hợp lệ.', 404);
  return code;
}

function googleLeadExternalKey(subject: string): string {
  return `GOOGLE:${subject}`.slice(0, 191);
}

function workshopQrTokenHash(): string {
  return createHash('sha256').update(randomBytes(32).toString('base64url')).digest('hex');
}

function publicWorkshop(workshop: {
  id: number;
  campaign: { name: string; slug: string };
  startsAt: Date;
  endsAt: Date;
  location: string;
  status: string;
}): AcademyWorkshopSharedJoinInfo['workshop'] {
  return {
    id: workshop.id,
    name: workshop.campaign.name,
    slug: workshop.campaign.slug,
    startsAt: workshop.startsAt.toISOString(),
    endsAt: workshop.endsAt.toISOString(),
    location: workshop.location,
    status: workshop.status as AcademyWorkshopSharedJoinInfo['workshop']['status'],
  };
}

type WorkshopRegistrationInput = {
  name?: string | null;
  phone: string;
  email?: string | null;
  goal?: string | null;
  referrer?: string | null;
  menuSelections?: AcademyWorkshopMenuSelectionInput[];
  equipmentPackageId?: number;
};

type ExternalWorkshopRegistrationIdentity = {
  provider: 'GOOGLE' | 'ZALO';
  subject: string;
  name: string;
  email?: string | null;
  avatarUrl: string | null;
};

function registrationExternalKey(identity: ExternalWorkshopRegistrationIdentity): string {
  return `${identity.provider}:${identity.subject}`.slice(0, 191);
}

type PublicMenuItem = {
  id: number;
  category: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
};

type PublicEquipmentPackage = {
  id: number;
  name: string;
  description: string | null;
  includedItemsJson: string;
  priceVnd: number;
  images?: Array<{ id: number; imageUrl: string; altText: string | null; sortOrder: number }>;
};

function equipmentItems(value: unknown): string[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 16);
  } catch {
    return [];
  }
}

function buildPublicEquipment(
  packages: PublicEquipmentPackage[],
  selectionEnabled: boolean
): AcademyWorkshopPublicRegistrationInfo['workshop']['equipment'] {
  return {
    required: selectionEnabled && packages.length > 0,
    packages: packages.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      includedItems: equipmentItems(item.includedItemsJson),
      priceVnd: Math.max(0, Math.round(Number(item.priceVnd) || 0)),
      images: (item.images || []).map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        altText: image.altText,
      })),
    })),
  };
}

function validateEquipmentSelection(
  input: unknown,
  availablePackages: PublicEquipmentPackage[]
): { equipmentPackageId: number; packageName: string; packageContentsJson: string; priceVnd: number } | null {
  if (!availablePackages.length) return null;
  const equipmentPackageId = Math.round(Number(input));
  if (!Number.isInteger(equipmentPackageId) || equipmentPackageId <= 0) {
    throw new AcademySalesError('Vui lòng chọn một bộ dụng cụ thực hành.');
  }
  const selected = availablePackages.find((item) => item.id === equipmentPackageId);
  if (!selected) {
    throw new AcademySalesError('Bộ dụng cụ bạn chọn không còn khả dụng. Vui lòng chọn lại.');
  }
  const packageContents = equipmentItems(selected.includedItemsJson);
  if (!packageContents.length) {
    throw new AcademySalesError('Bộ dụng cụ được chọn chưa có danh sách chi tiết. Vui lòng liên hệ Academy.', 409);
  }
  return {
    equipmentPackageId: selected.id,
    packageName: selected.name,
    packageContentsJson: JSON.stringify(packageContents),
    priceVnd: Math.max(0, Math.round(Number(selected.priceVnd) || 0)),
  };
}

function buildPublicMenu(
  items: PublicMenuItem[],
  selectionEnabled: boolean
): AcademyWorkshopPublicRegistrationInfo['workshop']['menu'] {
  return {
    required: selectionEnabled && items.length > 0,
    categories: ACADEMY_WORKSHOP_MENU_CATEGORIES.map((category) => ({
      category,
      label: ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[category],
      items: items
        .filter((item) => item.category === category)
        .map((item) => ({ id: item.id, name: item.name, description: item.description, imageUrl: item.imageUrl })),
    })),
  };
}

function validateMenuSelections(
  input: AcademyWorkshopMenuSelectionInput[] | undefined,
  availableItems: PublicMenuItem[]
): Array<{ category: AcademyWorkshopMenuCategory; menuItemId: number; itemName: string }> {
  if (!availableItems.length) return [];

  const configuredCategories = new Set(
    availableItems
      .map((item) => item.category)
      .filter((category): category is AcademyWorkshopMenuCategory =>
        MENU_CATEGORIES.has(category as AcademyWorkshopMenuCategory)
      )
  );
  const incompleteCategory = ACADEMY_WORKSHOP_MENU_CATEGORIES.find((category) => !configuredCategories.has(category));
  if (incompleteCategory) {
    throw new AcademySalesError(
      `Thực đơn workshop chưa có ${ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[incompleteCategory]}. Vui lòng liên hệ Academy.`,
      409
    );
  }

  const selections = Array.isArray(input) ? input : [];
  if (selections.length !== ACADEMY_WORKSHOP_MENU_CATEGORIES.length) {
    throw new AcademySalesError('Vui lòng chọn đủ nước ép, món chính và tráng miệng.');
  }

  const selectedCategories = new Set<AcademyWorkshopMenuCategory>();
  return selections.map((selection) => {
    const category = selection?.category;
    const menuItemId = Math.round(Number(selection?.menuItemId));
    if (!MENU_CATEGORIES.has(category) || selectedCategories.has(category)) {
      throw new AcademySalesError('Lựa chọn thực đơn không hợp lệ.');
    }
    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      throw new AcademySalesError('Món ăn được chọn không hợp lệ.');
    }
    const item = availableItems.find((candidate) => candidate.id === menuItemId && candidate.category === category);
    if (!item) {
      throw new AcademySalesError('Một món bạn chọn không còn phục vụ. Vui lòng chọn lại.');
    }
    selectedCategories.add(category);
    return { category, menuItemId: item.id, itemName: item.name };
  });
}

export class AcademyWorkshopPublicJoinService {
  static async findExistingRegistration(
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

  private static async selfCheckIn<T extends { id: number; workshopId: number; checkedInAt?: Date | null }>(
    fastify: FastifyInstance,
    participant: T,
    method: 'ROSTER_SELECTION' | 'GOOGLE'
  ): Promise<T> {
    if (participant.checkedInAt) return participant;
    const now = new Date();
    const checkedIn = await fastify.prisma.crm.$transaction(async (tx) => {
      const claimed = await tx.crmAcademyWorkshopParticipant.updateMany({
        where: { id: participant.id, checkedInAt: null },
        data: { checkedInAt: now, checkedInByStaffId: null },
      });
      if (claimed.count) {
        await tx.crmAcademyWorkshopParticipantEvent.create({
          data: {
            workshopId: participant.workshopId,
            participantId: participant.id,
            eventType: 'SELF_CHECKED_IN',
            metadataJson: JSON.stringify({ method }),
            occurredAt: now,
          },
        });
      }
      return Boolean(claimed.count);
    });
    return checkedIn ? ({ ...participant, checkedInAt: now } as T) : participant;
  }

  static async sharedJoinInfo(
    fastify: FastifyInstance,
    rawDisplayCode: unknown
  ): Promise<AcademyWorkshopSharedJoinInfo> {
    const workshop = await fastify.prisma.crm.crmAcademyWorkshop.findUnique({
      where: { displayCode: displayCode(rawDisplayCode) },
      include: {
        campaign: { select: { name: true, slug: true } },
        participants: {
          include: {
            campaignLead: {
              include: { lead: { select: { name: true, phone: true, avatarUrl: true } } },
            },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!workshop || CLOSED_WORKSHOP_STATUSES.has(workshop.status)) {
      throw new AcademySalesError('Workshop không tồn tại hoặc đã đóng.', 404);
    }
    assertAcademyWorkshopLobbyOpen(workshop);
    return {
      workshop: publicWorkshop(workshop),
      participants: workshop.participants.map((participant) => ({
        id: participant.id,
        name: participant.campaignLead.lead.name,
        avatarUrl: participant.campaignLead.lead.avatarUrl,
        requiresPhone: Boolean(normalizeAcademyWorkshopPhone(participant.campaignLead.lead.phone)),
      })),
    };
  }

  static async registrationInfo(
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
        menuSelectionDeadline: (workshop.menuSelectionDeadline || workshop.startsAt).toISOString(),
        equipmentSelectionDeadline: (workshop.equipmentSelectionDeadline || workshop.startsAt).toISOString(),
        location: workshop.location,
        capacity: workshop.capacity,
        remainingSeats: Math.max(0, workshop.capacity - workshop._count.participants),
        feeVnd: workshop.feeVnd,
        equipment: buildPublicEquipment(workshop.equipmentPackages, equipmentSelectionEnabled),
        agenda: workshop.agendaItems.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          kind: item.kind as AcademyWorkshopPublicRegistrationInfo['workshop']['agenda'][number]['kind'],
          plannedDurationSeconds: item.plannedDurationSeconds,
          sortOrder: item.sortOrder,
          equipmentSelectionEnabled: equipmentSelectionEnabled && workshop.equipmentAgendaItemId === item.id,
          menuSelectionEnabled: menuSelectionEnabled && workshop.menuAgendaItemId === item.id,
        })),
        menu: buildPublicMenu(workshop.menuItems, menuSelectionEnabled),
        joinUrl: canJoin
          ? `${resolveAcademyWorkshopPublicOrigin()}/academy/workshops/lobby/${encodeURIComponent(workshop.displayCode)}`
          : null,
      },
    };
  }

  static async register(
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
          menu_selection_deadline: Date | null;
          equipment_selection_deadline: Date | null;
          menu_agenda_item_id: number | null;
          equipment_agenda_item_id: number | null;
        }>
      >(
        `SELECT id, campaign_id, capacity, status, registration_open, starts_at, menu_selection_deadline, equipment_selection_deadline, menu_agenda_item_id, equipment_agenda_item_id
         FROM crm_academy_workshops WHERE registration_code = ? FOR UPDATE`,
        code
      );
      const workshop = locked[0];
      if (!workshop || CLOSED_WORKSHOP_STATUSES.has(workshop.status)) {
        throw new AcademySalesError('Workshop không tồn tại hoặc không còn mở công khai.', 404);
      }
      if (
        registrationPhase({ status: workshop.status, registrationOpen: Boolean(workshop.registration_open) }) !==
        'REGISTRATION'
      ) {
        throw new AcademySalesError('Đăng ký online hiện đã đóng. Vui lòng liên hệ Academy để được hỗ trợ.', 409);
      }

      const menuSelectionDeadlineMs = new Date(workshop.menu_selection_deadline || workshop.starts_at).getTime();
      const equipmentSelectionDeadlineMs = new Date(
        workshop.equipment_selection_deadline || workshop.starts_at
      ).getTime();
      const menuSelectionsAreLocked =
        !Number.isFinite(menuSelectionDeadlineMs) || menuSelectionDeadlineMs <= Date.now();
      const equipmentSelectionIsLocked =
        !Number.isFinite(equipmentSelectionDeadlineMs) || equipmentSelectionDeadlineMs <= Date.now();
      if (workshop.menu_agenda_item_id && menuSelectionsAreLocked && input.menuSelections?.length) {
        throw new AcademySalesError('Đã hết hạn thay đổi thực đơn.', 409);
      }
      if (workshop.equipment_agenda_item_id && equipmentSelectionIsLocked && input.equipmentPackageId != null) {
        throw new AcademySalesError('Đã hết hạn thay đổi bộ dụng cụ.', 409);
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
        select: { id: true, name: true, description: true, includedItemsJson: true, priceVnd: true },
      });
      const equipmentSelection = workshop.equipment_agenda_item_id
        ? validateEquipmentSelection(input.equipmentPackageId, availableEquipmentPackages)
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
        },
      });
      await tx.crmAcademyWorkshopParticipantEvent.create({
        data: {
          workshopId: workshop.id,
          participantId: participant.id,
          eventType: externalIdentity
            ? `SELF_REGISTERED_PUBLIC_${externalIdentity.provider}`
            : 'SELF_REGISTERED_PUBLIC',
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

  static async registerWithGoogle(
    fastify: FastifyInstance,
    rawRegistrationCode: unknown,
    input: RegisterAcademyWorkshopWithGoogleRequest,
    identity: GoogleIdentity
  ): Promise<RegisterAcademyWorkshopResponse> {
    return this.register(fastify, rawRegistrationCode, input, { ...identity, provider: 'GOOGLE' });
  }

  static async findExistingRegistrationWithGoogle(
    fastify: FastifyInstance,
    rawRegistrationCode: unknown,
    identity: GoogleIdentity
  ) {
    return this.findExistingRegistration(fastify, rawRegistrationCode, { ...identity, provider: 'GOOGLE' });
  }

  static async registerWithZalo(
    fastify: FastifyInstance,
    rawRegistrationCode: unknown,
    input: RegisterAcademyWorkshopWithZaloRequest,
    identity: ZaloSocialIdentity
  ): Promise<RegisterAcademyWorkshopResponse> {
    return this.register(fastify, rawRegistrationCode, input, { ...identity, provider: 'ZALO' });
  }

  static async findExistingRegistrationWithZalo(
    fastify: FastifyInstance,
    rawRegistrationCode: unknown,
    identity: ZaloSocialIdentity
  ) {
    return this.findExistingRegistration(fastify, rawRegistrationCode, { ...identity, provider: 'ZALO' });
  }

  static async selectParticipant(fastify: FastifyInstance, input: SelectAcademyWorkshopParticipantRequest) {
    const code = displayCode(input.displayCode);
    const participantId = Math.round(Number(input.participantId));
    if (!Number.isInteger(participantId) || participantId <= 0) {
      throw new AcademySalesError('Học viên không hợp lệ.');
    }
    const participant = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findFirst({
      where: { id: participantId, workshop: { displayCode: code } },
      include: {
        workshop: { include: { campaign: { select: { name: true, slug: true } } } },
        campaignLead: { include: { lead: { select: { phone: true } } } },
      },
    });
    if (!participant || CLOSED_WORKSHOP_STATUSES.has(participant.workshop.status)) {
      throw new AcademySalesError('Không tìm thấy học viên trong workshop.', 404);
    }
    assertAcademyWorkshopLobbyOpen(participant.workshop);
    const expectedPhone = normalizeAcademyWorkshopPhone(participant.campaignLead.lead.phone);
    if (expectedPhone) {
      const suppliedPhone = normalizeAcademyWorkshopPhone(input.phone);
      if (!suppliedPhone || suppliedPhone !== expectedPhone) {
        throw new AcademySalesError('Số điện thoại chưa khớp với hồ sơ học viên.', 403);
      }
    }
    return this.selfCheckIn(fastify, participant, 'ROSTER_SELECTION');
  }

  static async joinWithGoogle(
    fastify: FastifyInstance,
    input: JoinAcademyWorkshopWithGoogleRequest,
    identity: GoogleIdentity
  ) {
    const code = displayCode(input.displayCode);
    const email = identity.email.slice(0, 150);
    const name = identity.name.slice(0, 150) || email.split('@')[0] || 'Học viên Google';
    const avatarUrl = identity.avatarUrl || null;
    const externalKey = googleLeadExternalKey(identity.subject);
    const now = new Date();

    const participant = await fastify.prisma.crm.$transaction(async (tx) => {
      const workshop = await tx.crmAcademyWorkshop.findUnique({
        where: { displayCode: code },
        include: { campaign: { select: { id: true, name: true, slug: true } } },
      });
      if (!workshop || CLOSED_WORKSHOP_STATUSES.has(workshop.status)) {
        throw new AcademySalesError('Workshop không tồn tại hoặc đã đóng.', 404);
      }
      assertAcademyWorkshopLobbyOpen(workshop);

      let lead = await tx.crmAcademyLead.findUnique({ where: { externalKey } });
      if (!lead) {
        lead = await tx.crmAcademyLead.findFirst({
          where: { email },
          orderBy: { updatedAt: 'desc' },
        });
      }

      const searchText = buildAcademyLeadSearchText({
        name,
        email,
        source: lead?.source || 'Google Workshop',
        course: lead?.course,
        goal: lead?.goal,
        note: lead?.note,
      });

      if (lead) {
        lead = await tx.crmAcademyLead.update({
          where: { id: lead.id },
          data: {
            ...(!lead.externalKey ? { externalKey } : {}),
            name,
            email,
            ...(avatarUrl ? { avatarUrl } : {}),
            searchText,
          },
        });
      } else {
        lead = await tx.crmAcademyLead.upsert({
          where: { externalKey },
          create: {
            externalKey,
            sourceSystem: 'GOOGLE',
            source: 'Google Workshop',
            avatarUrl,
            name,
            email,
            searchText,
            status: 'SCHEDULED',
          },
          update: {
            name,
            email,
            ...(avatarUrl ? { avatarUrl } : {}),
            searchText,
          },
        });
      }

      const membership = await tx.crmAcademyCampaignLead.upsert({
        where: { campaignId_leadId: { campaignId: workshop.campaignId, leadId: lead.id } },
        create: { campaignId: workshop.campaignId, leadId: lead.id },
        update: { removedAt: null, removedReason: null, removedByStaffId: null },
      });
      const existing = await tx.crmAcademyWorkshopParticipant.findUnique({
        where: { campaignLeadId: membership.id },
      });
      if (existing) return { ...existing, workshop };

      const participantCount = await tx.crmAcademyWorkshopParticipant.count({
        where: { workshopId: workshop.id },
      });
      if (participantCount >= workshop.capacity) {
        throw new AcademySalesError('Workshop đã đủ sức chứa.', 409);
      }

      const participant = await tx.crmAcademyWorkshopParticipant.create({
        data: {
          workshopId: workshop.id,
          campaignLeadId: membership.id,
          qrTokenHash: workshopQrTokenHash(),
          attendanceStatus: 'CONFIRMED',
          attendanceConfirmedAt: now,
        },
      });
      await tx.crmAcademyWorkshopParticipantEvent.create({
        data: {
          workshopId: workshop.id,
          participantId: participant.id,
          eventType: 'SELF_REGISTERED_GOOGLE',
          metadataJson: JSON.stringify({ provider: 'GOOGLE', leadId: lead.id }),
          occurredAt: now,
        },
      });
      return { ...participant, workshop };
    });
    return this.selfCheckIn(fastify, participant, 'GOOGLE');
  }
}
