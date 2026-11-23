import dayjs from 'dayjs';
import type {
  Campaign,
  CampaignPromotion,
  CampaignPromotionType,
  CampaignTouchpoint,
  CustomerCampaignPromotionInfo,
  CustomerCampaignPromotionItem,
  CustomerServiceFilterCategory,
  CustomerServiceFilterOption,
  Staff,
  UpdateCampaignDto,
} from '@mos-lab/shared';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import type { CampaignTouchpointItem } from '~/components/campaign/CampaignTouchpointCell';
import {
  type FixedFinalPriceServiceCategory,
  type FixedFinalPriceServiceOption,
  getFixedFinalPriceServiceCategories,
  getFixedFinalPriceServiceOptions,
  splitFixedFinalPriceSelection,
  validateFixedFinalPricePromotion,
} from '~/lib/campaign-fixed-price';
import type {
  BookingStatusFilterOption,
  CampaignDetailUser,
  CampaignEditFormValues,
  RandomSelectionFilterOptions,
} from './campaignDetailTypes';

export const CAMPAIGN_PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];
const VALID_CAMPAIGN_PAGE_SIZES = new Set([10, 20, 50, 100]);
const DEFAULT_TOUCHPOINT_ICONS = ['Smile', 'Handshake', 'Kiss', 'Heart', 'BedDouble'] as const;

export const CAMPAIGN_BOOKING_STATUS_OPTIONS: BookingStatusFilterOption[] = [
  {
    value: 'ALL',
    label: 'Tất cả',
    iconKey: 'filter',
    activeClassName: 'bg-amber-500 text-white shadow-xs font-semibold',
  },
  {
    value: 'BOOKED',
    label: 'Booked',
    iconKey: 'calendar',
    activeClassName: 'bg-sky-600 text-white shadow-xs font-semibold',
  },
  {
    value: 'DONE',
    label: 'Done',
    iconKey: 'check',
    activeClassName: 'bg-emerald-600 text-white shadow-xs font-semibold',
  },
  {
    value: 'MISSED',
    label: 'Missed',
    iconKey: 'warning',
    activeClassName: 'bg-rose-600 text-white shadow-xs font-semibold',
  },
];

export function resolveDefaultTouchpointIcon(index: number): string {
  return DEFAULT_TOUCHPOINT_ICONS[index] ?? 'BedDouble';
}

export function getCampaignCustomerKey(record: any): number | string {
  return record.legacyUserId || record.customerId || record.id;
}

export function getCampaignCustomerRowClassName(record: any, themeMode: string): string {
  const hasCallback = record.callbackDate
    ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
    : false;
  if (hasCallback) {
    return themeMode === 'dark' ? 'row-hope-dark' : 'row-hope-light';
  }

  const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
  if (isBookingInFuture) {
    const state = record.lastBookingState;
    const isBooked = state === 'New' || state === 'Confirmed';
    if (isBooked) {
      return themeMode === 'dark' ? 'row-booked-future-dark' : 'row-booked-future-light';
    }
  }

  const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
  if (isBookingInPast) {
    const state = record.lastBookingState;
    const isMissed =
      state &&
      state !== 'Completed' &&
      state !== 'ServiceCompleted' &&
      state !== 'CheckIn' &&
      state !== 'CheckOut' &&
      state !== 'ServiceStart';
    if (isMissed) {
      return themeMode === 'dark' ? 'row-missed-dark' : 'row-missed-light';
    }
  }

  return '';
}

export function readSavedCampaignPageSize(): number {
  if (typeof window === 'undefined') return 10;
  const saved = window.localStorage.getItem('mos_campaign_pageSize');
  if (!saved) return 10;
  const val = parseInt(saved, 10);
  return VALID_CAMPAIGN_PAGE_SIZES.has(val) ? val : 10;
}

export function writeSavedCampaignPageSize(pageSize: number): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('mos_campaign_pageSize', pageSize.toString());
  }
}

export function readSavedCampaignPage(slug: string): number | null {
  if (typeof window === 'undefined' || !slug) return null;
  const savedPage = window.localStorage.getItem(`mos_campaign_page_${slug}`);
  if (!savedPage) return null;
  const pVal = parseInt(savedPage, 10);
  return !isNaN(pVal) && pVal > 0 ? pVal : null;
}

export function writeSavedCampaignPage(slug: string, page: number): void {
  if (typeof window !== 'undefined' && slug) {
    window.localStorage.setItem(`mos_campaign_page_${slug}`, page.toString());
  }
}

export function readStoredCampaignUser(): CampaignDetailUser | null {
  if (typeof window === 'undefined') return null;
  const storedUser = window.localStorage.getItem('mos_user');
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser) as CampaignDetailUser | null;
  } catch {
    return null;
  }
}

export function isCampaignDetailAdmin(currentUser: CampaignDetailUser | null): boolean {
  if (!currentUser) return false;
  const username = currentUser.username?.toLowerCase();
  return (
    isAdminOrSuperAdminRole(currentUser.role) ||
    currentUser.role === 'manager' ||
    currentUser.role === 'oc' ||
    currentUser.role === 'ls' ||
    username === 'admin' ||
    username === 'danhdo@gmail.com'
  );
}

export function toBookingPromotionItem(promotion: CampaignPromotion): CustomerCampaignPromotionItem {
  const value = Math.round(Number(promotion.value || 0));
  const label =
    promotion.type === 'PERCENT_DISCOUNT'
      ? `Giảm ${value}%`
      : promotion.type === 'FIXED_DISCOUNT'
        ? `Giảm ${value.toLocaleString('vi-VN')}đ`
        : promotion.type === 'FIXED_FINAL_PRICE'
          ? `Đồng giá ${value.toLocaleString('vi-VN')}đ`
          : promotion.name;

  return {
    id: promotion.id,
    campaignId: promotion.campaignId,
    name: promotion.name,
    code: promotion.code,
    type: promotion.type,
    value,
    eligibleServiceIds: promotion.eligibleServiceIds || [],
    eligibleServiceCategoryKeys: promotion.eligibleServiceCategoryKeys || [],
    description: promotion.description,
    isActive: promotion.isActive,
    label,
    legacyPromotionId: promotion.legacyPromotionId || null,
  };
}

export function buildInitialCampaignPromotionContext(
  campaign: Campaign | null,
  promotions: CampaignPromotion[],
  serviceFilterCategories: CustomerServiceFilterCategory[],
  serviceFilterOptions: CustomerServiceFilterOption[]
): CustomerCampaignPromotionInfo[] {
  if (!campaign) return [];

  const fixedPriceServices = getFixedFinalPriceServiceOptions(serviceFilterOptions);
  const fixedPriceCategories = getFixedFinalPriceServiceCategories(serviceFilterCategories, fixedPriceServices);
  const activePromotions = promotions
    .filter((promotion) => promotion.isActive !== false)
    .map((promotion) => {
      const item = toBookingPromotionItem(promotion);
      if (promotion.type !== 'FIXED_FINAL_PRICE') return item;

      const categoryKeys = item.eligibleServiceCategoryKeys || [];
      const categoryMatches = fixedPriceCategories.filter((category) => categoryKeys.includes(category.key));
      return {
        ...item,
        eligibleServiceIds: Array.from(
          new Set([...(item.eligibleServiceIds || []), ...categoryMatches.flatMap((category) => category.serviceIds)])
        ),
        eligibleServiceCategoryLabels: categoryMatches.map((category) => category.label),
      };
    });

  return activePromotions.length === 0
    ? []
    : [
        {
          campaignId: campaign.id,
          campaignName: campaign.name,
          campaignSlug: campaign.slug,
          promotions: activePromotions,
        },
      ];
}

export function buildCampaignEditFormInitialValues(
  campaign: Campaign,
  touchpoints: CampaignTouchpoint[],
  promotions: CampaignPromotion[]
): CampaignEditFormValues {
  const dates =
    campaign.startDate && campaign.endDate
      ? ([dayjs(campaign.startDate), dayjs(campaign.endDate)] as [dayjs.Dayjs, dayjs.Dayjs])
      : null;
  return {
    name: campaign.name,
    slug: campaign.slug,
    status: campaign.status,
    description: campaign.description,
    dates,
    assignedStaffIds: campaign.assignedStaffIds || [],
    touchpoints: touchpoints.map((t, idx) => ({
      id: t.id,
      key: t.key,
      label: t.label,
      icon: t.icon || resolveDefaultTouchpointIcon(idx),
      daysMin: t.daysMin,
      daysMax: t.daysMax ?? undefined,
      color: t.color || 'blue',
    })),
    promotions: promotions.map((p) => ({
      name: p.name,
      type: p.type,
      value: p.value,
      code: p.code || '',
      eligibleServiceSelection: [
        ...(p.eligibleServiceCategoryKeys || []).map((key) => `category:${key}`),
        ...(p.eligibleServiceIds || []).map(String),
      ],
    })),
  };
}

export function buildCampaignEditUpdateDto(
  values: CampaignEditFormValues,
  fixedFinalPriceServices: FixedFinalPriceServiceOption[],
  fixedFinalPriceCategories: FixedFinalPriceServiceCategory[]
): UpdateCampaignDto {
  const dates = values.dates;
  const startDate = dates?.[0] ? dates[0].format('YYYY-MM-DD') : undefined;
  const endDate = dates?.[1] ? dates[1].format('YYYY-MM-DD') : undefined;

  const updatedTouchpoints = (values.touchpoints || []).map((t, index) => ({
    id: t.id,
    key: t.key ? t.key.trim() : t.id ? `tp_${t.id}` : `step_${index + 1}`,
    label: t.label ? t.label.trim() : `Chạm ${index + 1}`,
    icon: t.icon || resolveDefaultTouchpointIcon(index),
    daysMin: typeof t.daysMin === 'number' ? t.daysMin : 0,
    daysMax: typeof t.daysMax === 'number' ? t.daysMax : undefined,
    color: t.color || 'blue',
  }));

  const updatedPromotions = (values.promotions || []).map((p) => {
    const type = p.type as CampaignPromotionType;
    const value = Number(p.value);
    const { eligibleServiceIds, eligibleServiceCategoryKeys } = splitFixedFinalPriceSelection(
      p.eligibleServiceSelection
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
      name: p.name ? p.name.trim() : '',
      code: p.code ? p.code.trim() : undefined,
      type,
      value,
      eligibleServiceIds: type === 'FIXED_FINAL_PRICE' ? eligibleServiceIds : undefined,
      eligibleServiceCategoryKeys: type === 'FIXED_FINAL_PRICE' ? eligibleServiceCategoryKeys : undefined,
      description: p.description,
    };
  });

  return {
    name: values.name,
    slug: values.slug || undefined,
    description: values.description ?? undefined,
    startDate,
    endDate,
    status: values.status,
    assignedStaffIds: values.assignedStaffIds || null,
    touchpoints: updatedTouchpoints,
    promotions: updatedPromotions,
  };
}

export function filterBookerStaffList(staffList: Staff[], assignedStaffIds?: number[] | null): Staff[] {
  const hasAssignedFilter = Array.isArray(assignedStaffIds) && assignedStaffIds.length > 0;
  const assignedSet = hasAssignedFilter ? new Set(assignedStaffIds.map((id) => Number(id))) : null;

  const seenNames = new Set<string>();
  return staffList
    .filter((s: any) => {
      const role = (s.role || s.staff_role || '').toLowerCase();
      const isBooker = role === 'telesales' || role === 'booker';
      if (!isBooker) return false;
      if (assignedSet && !assignedSet.has(Number(s.id))) return false;
      return true;
    })
    .filter((s: any) => {
      const nameKey = (s.displayName || s.name || s.username || '').trim().toLowerCase();
      if (!nameKey || seenNames.has(nameKey)) return false;
      seenNames.add(nameKey);
      return true;
    });
}

export function buildDisplayTouchpoints(touchpoints: CampaignTouchpoint[]): CampaignTouchpointItem[] {
  return touchpoints
    .filter((tp) => tp.key !== 'all')
    .map((tp, idx) => ({
      id: tp.id,
      key: tp.key,
      label: tp.label?.replace(/^Chạm\s*/i, '').replace(/^Chăm sóc\s*/i, '') || tp.key,
      icon: tp.icon || resolveDefaultTouchpointIcon(idx),
      daysMin: tp.daysMin,
      daysMax: tp.daysMax,
      color: tp.color,
    }));
}

export function filterRandomSelectionCandidates(basePool: any[], options: RandomSelectionFilterOptions): any[] {
  return basePool.filter((record: any) => {
    if (options.excludeAssigned) {
      const bookerName = record.assignedBookerName || record.assignedBooker?.name || record.assignedStaff?.displayName;
      if (bookerName) return false;
    }

    if (options.excludeUnconfirmedAllocation && record.isPendingAccept) {
      return false;
    }

    if (options.excludeFutureBooking) {
      const lastBookingDate = record.lastBookingDate || record.bookingDate;
      const lastBookingState = record.lastBookingState || record.bookingState;
      const isBookingInFuture = lastBookingDate ? new Date(lastBookingDate) > new Date() : false;
      if (isBookingInFuture) {
        const isBooked = lastBookingState === 'New' || lastBookingState === 'Confirmed';
        if (isBooked) return false;
      }
    }

    return true;
  });
}

export function pickRandomCandidates(candidates: any[], count: number): any[] {
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function resolveSharedPoolWsUrl(campaignId: number): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const configured = process.env.NEXT_PUBLIC_API_URL;
  let wsUrl = `${protocol}//${host}:4001/api/campaigns/${campaignId}/shared-pool/stream`;

  if (configured && !configured.startsWith('/')) {
    try {
      const url = new URL(configured, window.location.origin);
      const wsProto = url.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${wsProto}//${url.host}${url.pathname.replace(/\/$/, '')}/campaigns/${campaignId}/shared-pool/stream`;
    } catch {
      // Fallback to default local API host URL
    }
  }

  return wsUrl;
}
