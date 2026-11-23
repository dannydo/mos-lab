/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import { CampaignStatus, SharedPoolConfig } from '@mos-lab/shared';
import { normalizeFixedFinalPriceCategoryKeys } from '../../customers/services/customer-service-filter-catalog.service.js';

export type CampaignReadOptions = {
  /** Managers retain archived records for audit and restoration; staff do not. */
  includeArchived?: boolean;
};

export const CAMPAIGN_DETAIL_INCLUDE = {
  creator: { select: { id: true, displayName: true, username: true } },
  touchpoints: { orderBy: { sortOrder: 'asc' as const } },
  promotions: true,
  _count: {
    select: {
      customers: { where: { removedAt: null } },
      touchpoints: true,
      promotions: true,
    },
  },
};

export function normalizeEligibleServiceIds(value: unknown): number[] {
  let rawIds: unknown[] = [];
  if (Array.isArray(value)) {
    rawIds = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      rawIds = Array.isArray(parsed) ? parsed : [];
    } catch {
      rawIds = [];
    }
  }

  return Array.from(new Set(rawIds.map((id) => Number(id)).filter((id) => Number.isSafeInteger(id) && id > 0)));
}

export function normalizeEligibleServiceCategoryKeys(value: unknown): string[] {
  let rawKeys: unknown[] = [];
  if (Array.isArray(value)) {
    rawKeys = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      rawKeys = Array.isArray(parsed) ? parsed : [];
    } catch {
      rawKeys = [];
    }
  }

  return normalizeFixedFinalPriceCategoryKeys(rawKeys.map((key) => String(key || '')));
}

export function campaignVisibilityWhere(
  baseWhere: Record<string, unknown>,
  options: CampaignReadOptions
): Record<string, unknown> {
  if (options.includeArchived) return baseWhere;
  return {
    AND: [baseWhere, { status: { not: 'ARCHIVED' } }],
  };
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

export function parseSharedPoolConfigJson(raw: unknown): SharedPoolConfig | null {
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as SharedPoolConfig);
}

export function mapCampaignToDto(c: any): any {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || null,
    startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : null,
    endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : null,
    status: c.status as CampaignStatus,
    operationMode: c.operationMode || 'PERSONAL',
    sharedPoolConfig: parseSharedPoolConfigJson(c.sharedPoolConfig),
    currentBatchNumber: c.currentBatchNumber || 1,
    createdBy: c.createdBy,
    assignedStaffIds: c.assignedStaffIds
      ? typeof c.assignedStaffIds === 'string'
        ? JSON.parse(c.assignedStaffIds) || []
        : c.assignedStaffIds
      : [],
    deletedAt: c.deletedAt ? new Date(c.deletedAt).toISOString() : null,
    creatorName: c.creator?.displayName || c.creator?.username || null,
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
    touchpoints: (c.touchpoints || []).map((tp: any) => ({
      id: tp.id,
      campaignId: tp.campaignId,
      key: tp.key,
      label: tp.label,
      icon: tp.icon,
      daysMin: tp.daysMin,
      daysMax: tp.daysMax,
      color: tp.color,
      sortOrder: tp.sortOrder,
    })),
    promotions: (c.promotions || []).map((p: any) => ({
      id: p.id,
      campaignId: p.campaignId,
      name: p.name,
      code: p.code,
      type: p.type,
      value: p.value,
      eligibleServiceIds: normalizeEligibleServiceIds(p.eligibleServiceIds),
      eligibleServiceCategoryKeys: normalizeEligibleServiceCategoryKeys(p.eligibleServiceCategoryKeys),
      description: p.description,
      isActive: p.isActive,
      createdAt: new Date(p.createdAt).toISOString(),
    })),
    _count: c._count
      ? {
          customers: c._count.customers,
          touchpoints: c._count.touchpoints,
          promotions: c._count.promotions,
        }
      : undefined,
  };
}
