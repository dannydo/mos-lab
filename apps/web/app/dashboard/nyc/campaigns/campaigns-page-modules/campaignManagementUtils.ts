import dayjs from 'dayjs';
import type {
  Campaign,
  CampaignPromotionType,
  CreateCampaignDto,
  CreateCampaignPromotionDto,
  CreateCampaignTouchpointDto,
  SharedPoolConfig,
  UpdateCampaignDto,
} from '@mos-lab/shared';
import {
  type FixedFinalPriceServiceCategory,
  type FixedFinalPriceServiceOption,
  splitFixedFinalPriceSelection,
  validateFixedFinalPricePromotion,
} from '~/lib/campaign-fixed-price';
import { removeVietnameseTones } from '~/lib/utils/search';
import {
  CAMPAIGN_DEFAULT_PROMOTIONS,
  CAMPAIGN_DEFAULT_TOUCHPOINTS,
  CAMPAIGN_SIDEBAR_STORAGE_KEYS,
  type CampaignDetailRecord,
  type CampaignFormPromotion,
  type CampaignFormTouchpoint,
  type CampaignFormValues,
} from './campaignManagementTypes';

const DEFAULT_TOUCHPOINT_ICONS = ['Smile', 'Handshake', 'Kiss', 'Heart', 'BedDouble'] as const;
const ADMIN_ROLE_ALLOWLIST = new Set(['admin', 'manager', 'oc', 'ls']);

export function resolveDefaultTouchpointIcon(index: number): string {
  return DEFAULT_TOUCHPOINT_ICONS[index] ?? 'Sparkles';
}

export function readSidebarShowCustomCampaigns(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = window.localStorage.getItem(CAMPAIGN_SIDEBAR_STORAGE_KEYS.showCustomCampaigns);
  return saved !== null ? saved === 'true' : true;
}

export function writeSidebarShowCustomCampaigns(checked: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CAMPAIGN_SIDEBAR_STORAGE_KEYS.showCustomCampaigns, String(checked));
  window.dispatchEvent(new Event(CAMPAIGN_SIDEBAR_STORAGE_KEYS.toggleEvent));
}

export function readCampaignVisibilityMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  const saved = window.localStorage.getItem(CAMPAIGN_SIDEBAR_STORAGE_KEYS.campaignVisibility);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function writeCampaignVisibilityMap(map: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CAMPAIGN_SIDEBAR_STORAGE_KEYS.campaignVisibility, JSON.stringify(map));
  window.dispatchEvent(new Event(CAMPAIGN_SIDEBAR_STORAGE_KEYS.toggleEvent));
}

export function isCampaignVisibleInSidebar(
  campaign: Pick<Campaign, 'id' | 'slug'>,
  visibilityMap: Record<string, boolean>
): boolean {
  return visibilityMap[campaign.slug] !== false && visibilityMap[String(campaign.id)] !== false;
}

export function readStoredCampaignUser(): { role: string; userName: string } {
  if (typeof window === 'undefined') return { role: '', userName: '' };
  const storedUser = window.localStorage.getItem('mos_user');
  if (!storedUser) return { role: '', userName: '' };
  try {
    const user = JSON.parse(storedUser) as { role?: string; username?: string; email?: string };
    return {
      role: user.role || '',
      userName: user.username || user.email || '',
    };
  } catch {
    return { role: '', userName: '' };
  }
}

export function isCampaignAdminUser(role: string, userName: string): boolean {
  const normalizedRole = role.toLowerCase();
  const normalizedUserName = userName.toLowerCase();
  return (
    ADMIN_ROLE_ALLOWLIST.has(normalizedRole) ||
    normalizedUserName === 'danhdo@gmail.com' ||
    normalizedUserName === 'admin'
  );
}

export function filterCampaignsByQuery(campaigns: Campaign[], searchQuery: string): Campaign[] {
  const trimmed = searchQuery.trim();
  if (!trimmed) return campaigns;
  const query = removeVietnameseTones(trimmed.toLowerCase());
  return campaigns.filter((campaign) => {
    const nameMatch = removeVietnameseTones((campaign.name || '').toLowerCase()).includes(query);
    const slugMatch = removeVietnameseTones((campaign.slug || '').toLowerCase()).includes(query);
    const descMatch = removeVietnameseTones((campaign.description || '').toLowerCase()).includes(query);
    return nameMatch || slugMatch || descMatch;
  });
}

export function buildCreateCampaignInitialValues(): CampaignFormValues {
  return {
    name: '',
    slug: '',
    description: '',
    dates: null,
    status: 'ACTIVE',
    showInSidebar: true,
    operationMode: 'PERSONAL',
    sharedPoolBatchSize: 100,
    sharedPoolMaxClaims: 1,
    sharedPoolTtl: 15,
    sharedPoolCooldown: 60,
    sharedPoolWarningThreshold: 30,
    sharedPoolCriticalThreshold: 10,
    recycleThinking: 7,
    recycleNoAnswer: 3,
    recycleBusy: 3,
    recycleError: 3,
    touchpoints: CAMPAIGN_DEFAULT_TOUCHPOINTS.map((tp) => ({ ...tp })),
    promotions: CAMPAIGN_DEFAULT_PROMOTIONS.map((promotion) => ({ ...promotion })),
  };
}

export function parseSharedPoolConfig(
  raw: Campaign['sharedPoolConfig'] | string | null | undefined
): Partial<SharedPoolConfig> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Partial<SharedPoolConfig>) : {};
    } catch {
      return {};
    }
  }
  return raw;
}

export function mapCampaignDetailsToFormValues(
  details: CampaignDetailRecord,
  visibilityMap: Record<string, boolean>
): CampaignFormValues {
  const dates: CampaignFormValues['dates'] =
    details.startDate && details.endDate
      ? [dayjs(details.startDate), dayjs(details.endDate)]
      : details.startDate
        ? [dayjs(details.startDate), null]
        : null;

  const sharedPoolConfig = parseSharedPoolConfig(details.sharedPoolConfig);
  const rawTouchpoints = details.touchpoints || details.CampaignTouchpoint || [];
  const rawPromotions = details.promotions || details.CampaignPromotion || [];

  return {
    name: details.name,
    slug: details.slug,
    description: details.description ?? undefined,
    dates,
    status: details.status,
    showInSidebar: isCampaignVisibleInSidebar(details, visibilityMap),
    operationMode: details.operationMode || 'PERSONAL',
    sharedPoolBatchSize: sharedPoolConfig.batchSize || 100,
    sharedPoolMaxClaims: sharedPoolConfig.maxClaimsPerStaff || 1,
    sharedPoolTtl: sharedPoolConfig.claimTtlMinutes || 15,
    sharedPoolCooldown: sharedPoolConfig.cooldownMinutes || 60,
    sharedPoolWarningThreshold: sharedPoolConfig.warningThreshold || 30,
    sharedPoolCriticalThreshold: sharedPoolConfig.criticalThreshold || 10,
    recycleThinking: sharedPoolConfig.recycleRules?.THINKING ?? 7,
    recycleNoAnswer: sharedPoolConfig.recycleRules?.NO_ANSWER ?? 3,
    recycleBusy: sharedPoolConfig.recycleRules?.BUSY ?? 3,
    recycleError: sharedPoolConfig.recycleRules?.ERROR ?? 3,
    assignedStaffIds: details.assignedStaffIds || [],
    touchpoints: rawTouchpoints.map((tp, index) => ({
      label: tp.label,
      key: tp.key,
      icon: tp.icon || resolveDefaultTouchpointIcon(index),
      daysMin: tp.daysMin,
      daysMax: tp.daysMax,
      color: tp.color || 'blue',
      sortOrder: tp.sortOrder,
    })),
    promotions: rawPromotions.map((promotion) => ({
      name: promotion.name,
      code: promotion.code ?? undefined,
      type: promotion.type,
      value: promotion.value,
      description: promotion.description ?? undefined,
      eligibleServiceIds: promotion.eligibleServiceIds,
      eligibleServiceCategoryKeys: promotion.eligibleServiceCategoryKeys,
      eligibleServiceSelection: [
        ...(promotion.eligibleServiceCategoryKeys || []).map((key) => `category:${key}`),
        ...(promotion.eligibleServiceIds || []).map(String),
      ],
    })),
  };
}

export function buildCampaignTouchpointsDto(
  rawTouchpoints: CampaignFormTouchpoint[] | undefined
): CreateCampaignTouchpointDto[] {
  return (rawTouchpoints || [])
    .filter((tp) => tp && (tp.label || tp.key))
    .map((tp, index) => ({
      key: tp.key || `TP_${index + 1}`,
      label: tp.label || `Chạm ${index + 1}`,
      icon: tp.icon || resolveDefaultTouchpointIcon(index),
      daysMin: Number(tp.daysMin) || 0,
      daysMax:
        tp.daysMax !== undefined && tp.daysMax !== null && tp.daysMax !== ''
          ? Number(tp.daysMax)
          : Number(tp.daysMin) || 0,
      color: typeof tp.color === 'string' ? tp.color : 'blue',
      sortOrder: index + 1,
    }));
}

export function buildCampaignPromotionsDto(
  rawPromotions: CampaignFormPromotion[] | undefined,
  fixedFinalPriceServices: FixedFinalPriceServiceOption[],
  fixedFinalPriceCategories: FixedFinalPriceServiceCategory[]
): CreateCampaignPromotionDto[] {
  return (rawPromotions || [])
    .filter((promotion) => promotion && promotion.name && String(promotion.name).trim() !== '')
    .map((promotion) => {
      const type = (promotion.type || 'PERCENT_DISCOUNT') as CampaignPromotionType;
      const value = Number(promotion.value);
      const { eligibleServiceIds, eligibleServiceCategoryKeys } = splitFixedFinalPriceSelection(
        promotion.eligibleServiceSelection
      );

      validateFixedFinalPricePromotion(
        type,
        value,
        eligibleServiceIds,
        eligibleServiceCategoryKeys,
        fixedFinalPriceServices,
        fixedFinalPriceCategories
      );

      return {
        name: String(promotion.name).trim(),
        code: promotion.code ? String(promotion.code).trim() : undefined,
        type,
        value,
        eligibleServiceIds: type === 'FIXED_FINAL_PRICE' ? eligibleServiceIds : undefined,
        eligibleServiceCategoryKeys: type === 'FIXED_FINAL_PRICE' ? eligibleServiceCategoryKeys : undefined,
        description: promotion.description ? String(promotion.description).trim() : undefined,
      };
    });
}

export function buildSharedPoolConfigPayload(
  values: CampaignFormValues,
  editingCampaign: Campaign | null
): SharedPoolConfig | undefined {
  if ((values.operationMode || 'PERSONAL') !== 'SHARED_POOL') {
    return undefined;
  }

  return {
    batchSize: Number(values.sharedPoolBatchSize) || 100,
    claimTtlMinutes: Number(values.sharedPoolTtl) || 15,
    maxClaimsPerStaff: Number(values.sharedPoolMaxClaims) || 1,
    cooldownMinutes: Number(values.sharedPoolCooldown) || 60,
    warningThreshold: Number(values.sharedPoolWarningThreshold) || 30,
    criticalThreshold: Number(values.sharedPoolCriticalThreshold) || 10,
    isPaused: editingCampaign?.sharedPoolConfig?.isPaused ?? false,
    recycleRules: {
      THINKING: Number(values.recycleThinking) || 7,
      NO_ANSWER: Number(values.recycleNoAnswer) || 3,
      BUSY: Number(values.recycleBusy) || 3,
      ERROR: Number(values.recycleError) || 3,
    },
  };
}

export function buildCampaignMutationPayloads(
  values: CampaignFormValues,
  editingCampaign: Campaign | null,
  fixedFinalPriceServices: FixedFinalPriceServiceOption[],
  fixedFinalPriceCategories: FixedFinalPriceServiceCategory[]
): { updateDto?: UpdateCampaignDto; createDto?: CreateCampaignDto } {
  const startDate = values.dates && values.dates[0] ? values.dates[0].format('YYYY-MM-DD') : undefined;
  const endDate = values.dates && values.dates[1] ? values.dates[1].format('YYYY-MM-DD') : undefined;
  const operationMode = values.operationMode || 'PERSONAL';
  const touchpoints = buildCampaignTouchpointsDto(values.touchpoints);
  const promotions = buildCampaignPromotionsDto(values.promotions, fixedFinalPriceServices, fixedFinalPriceCategories);
  const sharedPoolConfig = buildSharedPoolConfigPayload(values, editingCampaign);

  if (editingCampaign) {
    return {
      updateDto: {
        name: values.name,
        description: values.description,
        startDate,
        endDate,
        status: values.status,
        operationMode,
        sharedPoolConfig,
        assignedStaffIds: values.assignedStaffIds || null,
        touchpoints,
        promotions,
      },
    };
  }

  return {
    createDto: {
      name: values.name,
      slug: values.slug || undefined,
      description: values.description,
      startDate,
      endDate,
      status: values.status || 'ACTIVE',
      operationMode,
      sharedPoolConfig,
      assignedStaffIds: values.assignedStaffIds || null,
      touchpoints,
      promotions,
    },
  };
}

export function extractCampaignApiError(error: unknown, fallback: string): string {
  const errObj = error as { response?: { data?: { message?: string } }; message?: string } | null | undefined;
  return errObj?.response?.data?.message || errObj?.message || fallback;
}
