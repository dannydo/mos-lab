import { createHash, randomBytes } from 'node:crypto';
import type {
  AcademyWorkshopMenuCategory,
  AcademyWorkshopMenuSelectionInput,
  AcademyWorkshopPublicPhase,
  AcademyWorkshopPublicRegistrationInfo,
  AcademyWorkshopSharedJoinInfo,
} from '@mos-lab/shared';
import { ACADEMY_WORKSHOP_MENU_CATEGORIES, ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS } from '@mos-lab/shared';
import { AcademySalesError } from '../../academy-sales/academy-sales.service.js';

export const CLOSED_WORKSHOP_STATUSES = new Set(['CANCELLED', 'ARCHIVED']);
export const LOBBY_OPEN_WORKSHOP_STATUSES = new Set(['CHECKIN_OPEN', 'LIVE', 'PAUSED']);
export const PUBLIC_REGISTRATION_CODE = /^[A-Za-z0-9_-]{12,48}$/;
export const MENU_CATEGORIES = new Set<AcademyWorkshopMenuCategory>(ACADEMY_WORKSHOP_MENU_CATEGORIES);

export type WorkshopRegistrationInput = {
  name?: string | null;
  phone: string;
  email?: string | null;
  goal?: string | null;
  referrer?: string | null;
  menuSelections?: AcademyWorkshopMenuSelectionInput[];
  equipmentPackageId?: number;
  designItemId?: number;
};

export type ExternalWorkshopRegistrationIdentity = {
  provider: 'GOOGLE' | 'ZALO';
  subject: string;
  name: string;
  email?: string | null;
  avatarUrl: string | null;
};

export type PublicMenuItem = {
  id: number;
  category: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
};

export type PublicEquipmentPackage = {
  id: number;
  name: string;
  description: string | null;
  includedItemsJson: string;
  priceVnd: number;
  isIncludedInFee?: boolean;
  images?: Array<{ id: number; imageUrl: string; altText: string | null; sortOrder: number }>;
};

export type PublicDesignItem = {
  id: number;
  name: string;
  description: string | null;
  difficultyLevel: string;
  priceVnd: number;
  images?: Array<{ id: number; imageUrl: string; altText: string | null; sortOrder: number }>;
};

export function registrationCode(value: unknown): string {
  const code = String(value || '').trim();
  if (!PUBLIC_REGISTRATION_CODE.test(code)) throw new AcademySalesError('Link đăng ký workshop không hợp lệ.', 404);
  return code;
}

export function registrationPhase(workshop: {
  status: string;
  registrationOpen: boolean;
  scheduledPublishAt?: Date | string | null;
}): AcademyWorkshopPublicPhase {
  if (workshop.status === 'CHECKIN_OPEN') return 'CHECKIN';
  if (workshop.status === 'LIVE' || workshop.status === 'PAUSED') return 'LIVE';
  if (workshop.status === 'COMPLETED') return 'COMPLETED';
  const isScheduled =
    workshop.status === 'SCHEDULED' ||
    (workshop.status === 'DRAFT' &&
      workshop.scheduledPublishAt &&
      new Date(workshop.scheduledPublishAt).getTime() <= Date.now());
  if (isScheduled && workshop.registrationOpen) return 'REGISTRATION';
  return 'CLOSED';
}

export function getAcademyWorkshopPublicRegistrationPhase(workshop: {
  status: string;
  registrationOpen: boolean;
  scheduledPublishAt?: Date | string | null;
}): AcademyWorkshopPublicPhase {
  return registrationPhase(workshop);
}

export function assertAcademyWorkshopLobbyOpen(workshop: { status: string }) {
  if (!LOBBY_OPEN_WORKSHOP_STATUSES.has(workshop.status)) {
    throw new AcademySalesError('Workshop chưa mở check-in. Vui lòng quay lại khi Academy thông báo.', 409);
  }
}

export function cleanText(value: unknown, maxLength: number): string | null {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

export function normalizeAcademyWorkshopPhone(value: unknown): string {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0084')) digits = digits.slice(2);
  if (digits.startsWith('84') && digits.length >= 10) digits = `0${digits.slice(2)}`;
  return digits;
}

export function displayCode(value: unknown): string {
  const code = String(value || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(code)) throw new AcademySalesError('Mã workshop không hợp lệ.', 404);
  return code;
}

export function googleLeadExternalKey(subject: string): string {
  return `GOOGLE:${subject}`.slice(0, 191);
}

export function workshopQrTokenHash(): string {
  return createHash('sha256').update(randomBytes(32).toString('base64url')).digest('hex');
}

export function publicWorkshop(workshop: {
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

export function registrationExternalKey(identity: ExternalWorkshopRegistrationIdentity): string {
  return `${identity.provider}:${identity.subject}`.slice(0, 191);
}

export function equipmentItems(value: unknown): string[] {
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

export function buildPublicEquipment(
  packages: PublicEquipmentPackage[],
  selectionEnabled: boolean
): AcademyWorkshopPublicRegistrationInfo['workshop']['equipment'] {
  const includedPackage = packages.find((item) => Boolean(item.isIncludedInFee));
  const basePrice = includedPackage ? Math.max(0, Math.round(Number(includedPackage.priceVnd) || 0)) : 0;
  return {
    required: selectionEnabled && packages.length > 0,
    packages: packages.map((item) => {
      const priceVnd = Math.max(0, Math.round(Number(item.priceVnd) || 0));
      const effectivePriceVnd = includedPackage ? Math.max(0, priceVnd - basePrice) : priceVnd;
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        includedItems: equipmentItems(item.includedItemsJson),
        priceVnd,
        effectivePriceVnd,
        isIncludedInFee: Boolean(item.isIncludedInFee),
        images: (item.images || []).map((image) => ({
          id: image.id,
          imageUrl: image.imageUrl,
          altText: image.altText,
        })),
      };
    }),
  };
}

export function validateEquipmentSelection(
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
  const includedPackage = availablePackages.find((item) => Boolean(item.isIncludedInFee));
  const basePrice = includedPackage ? Math.max(0, Math.round(Number(includedPackage.priceVnd) || 0)) : 0;
  const selectedPrice = Math.max(0, Math.round(Number(selected.priceVnd) || 0));
  const effectivePriceVnd = includedPackage ? Math.max(0, selectedPrice - basePrice) : selectedPrice;

  return {
    equipmentPackageId: selected.id,
    packageName: selected.name,
    packageContentsJson: JSON.stringify(packageContents),
    priceVnd: effectivePriceVnd,
  };
}

export function buildPublicDesign(
  items: PublicDesignItem[],
  selectionEnabled: boolean
): AcademyWorkshopPublicRegistrationInfo['workshop']['design'] {
  return {
    required: selectionEnabled && items.length > 0,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      difficultyLevel: (['BASIC', 'ADVANCED', 'MASTER'].includes(item.difficultyLevel)
        ? item.difficultyLevel
        : 'BASIC') as 'BASIC' | 'ADVANCED' | 'MASTER',
      priceVnd: Math.max(0, Math.round(Number(item.priceVnd) || 0)),
      images: (item.images || []).map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        altText: image.altText,
      })),
    })),
  };
}

export function validateDesignSelection(
  input: unknown,
  availableItems: PublicDesignItem[]
): { designItemId: number; designName: string; difficultyLevel: string; priceVnd: number } | null {
  if (!availableItems.length) return null;
  const designItemId = Math.round(Number(input));
  if (!Number.isInteger(designItemId) || designItemId <= 0) {
    throw new AcademySalesError('Vui lòng chọn một mẫu thiết kế mi thực hành.');
  }
  const selected = availableItems.find((item) => item.id === designItemId);
  if (!selected) {
    throw new AcademySalesError('Mẫu thiết kế mi bạn chọn không còn khả dụng. Vui lòng chọn lại.');
  }
  return {
    designItemId: selected.id,
    designName: selected.name,
    difficultyLevel: selected.difficultyLevel,
    priceVnd: Math.max(0, Math.round(Number(selected.priceVnd) || 0)),
  };
}

export function buildPublicMenu(
  items: PublicMenuItem[],
  selectionEnabled: boolean
): AcademyWorkshopPublicRegistrationInfo['workshop']['menu'] {
  const categories = ACADEMY_WORKSHOP_MENU_CATEGORIES.map((category) => ({
    category,
    label: ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[category],
    items: items
      .filter((item) => item.category === category)
      .map((item) => ({ id: item.id, name: item.name, description: item.description, imageUrl: item.imageUrl })),
  })).filter((category) => category.items.length > 0);

  return {
    required: selectionEnabled && categories.length > 0,
    categories,
  };
}

export function validateMenuSelections(
  input: AcademyWorkshopMenuSelectionInput[] | undefined,
  availableItems: PublicMenuItem[]
): Array<{ category: AcademyWorkshopMenuCategory; menuItemId: number; itemName: string }> {
  if (!availableItems.length) return [];

  const configuredCategories = ACADEMY_WORKSHOP_MENU_CATEGORIES.filter((category) =>
    availableItems.some((item) => item.category === category)
  );

  const selections = Array.isArray(input) ? input : [];
  if (selections.length !== configuredCategories.length) {
    const labels = configuredCategories.map((category) => ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[category]);
    throw new AcademySalesError(`Vui lòng chọn đủ ${labels.join(', ')}.`);
  }

  const selectedCategories = new Set<AcademyWorkshopMenuCategory>();
  return selections.map((selection) => {
    const category = selection?.category;
    const menuItemId = Math.round(Number(selection?.menuItemId));
    if (
      !MENU_CATEGORIES.has(category) ||
      !configuredCategories.includes(category) ||
      selectedCategories.has(category)
    ) {
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
