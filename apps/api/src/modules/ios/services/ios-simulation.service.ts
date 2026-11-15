import { FastifyInstance } from 'fastify';
import {
  BookingOverrideRecord,
  CrmConfigStoreAdapter,
  createMysqlConfigStore,
  createOverrideRepository,
  LEGACY_CUSTOMER_AVATARS_KEY,
  LEGACY_LIVE_OVERRIDES_KEY,
  BOOKING_OVERRIDE_KEY_PREFIX,
  CUSTOMER_AVATAR_KEY_PREFIX,
  CUSTOMER_COMBO_EXPIRY_KEY_PREFIX,
  CUSTOMER_NATURAL_LASH_KEY_PREFIX,
  LEGACY_SETTLE_KEY_PREFIX,
} from './ios-overrides.service.js';
import { IosAuthContext } from './ios-auth.service.js';
import { computeBookingFinancials } from './ios-bookings-formatters.js';
import { CvlTrainingMentorshipService } from '../../kpi/services/cvl-training-mentorship.service.js';
import {
  canAccessIosConsultationApp,
  IOS_SIM_BOOKING_ID_MIN,
  IosBookingItem,
  IosCartProductItem,
  IosSimulationAttemptSummary,
  IosSimulationMenteeOption,
  IosUpdateSimulationAttemptRequest,
  NaturalLashConsultationAttributes,
  SafeAny,
} from '@mos-lab/shared';

export const SIM_BOOKING_OVERRIDE_PREFIX = 'IOS_SIM_BK_OVR:';
export const SIM_NATURAL_LASH_PREFIX = 'IOS_SIM_NLASH:';
export const SIM_CUSTOM_BOOKING_PREFIX = 'IOS_SIM_CUSTOM_BK:';
export const SIM_AVATAR_PREFIX = 'IOS_SIM_AVT:';
export const SIM_COMBO_EXPIRY_PREFIX = 'IOS_SIM_COMBO_EXP:';
export const SIM_SETTLE_PREFIX = 'IOS_SIM_SETTLE:';

import { hasCompletedSimulationSnapshot } from './ios-simulation-attempts.service.js';

export {
  SIM_ATTEMPT_PREFIX,
  getSimAttemptsKey,
  loadSimulationAttempts,
  loadSimulationAttemptCountsBatch,
  appendSimulationAttempt,
  updateSimulationAttempt,
  hasCompletedSimulationSnapshot,
  reconcileSimulationAttemptsForBooking,
} from './ios-simulation-attempts.service.js';

export const SIM_NLASH_CLEARED_TOMBSTONE = JSON.stringify({ __simCleared: true });

export interface SimulationContextResolution {
  actorStaffId: number;
  actorStaffName: string;
  targetStaffId: number;
  targetStaffName: string;
  isReadOnlyMentorView: boolean;
}

export class IosSimulationForbiddenError extends Error {
  statusCode = 403;
  code: string;
  constructor(message: string, code = 'SIM_FORBIDDEN') {
    super(message);
    this.code = code;
  }
}

export function getSimBookingOverridePrefixForStaff(staffId: number): string {
  return `${SIM_BOOKING_OVERRIDE_PREFIX}${staffId}:`;
}

export function getSimNaturalLashKey(staffId: number, customerId: number): string {
  return `${SIM_NATURAL_LASH_PREFIX}${staffId}:${customerId}`;
}

export function getSimCustomBookingsKey(staffId: number, date: string): string {
  return `${SIM_CUSTOM_BOOKING_PREFIX}${staffId}:${date.slice(0, 10)}`;
}

function isSimClearedTombstone(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return Boolean(parsed && typeof parsed === 'object' && parsed.__simCleared === true);
  } catch {
    return false;
  }
}

function mapKeyToSimStorage(
  key: string,
  staffId: number
): {
  simKey: string | null;
  liveFallbackKey: string | null;
  isNaturalLash?: boolean;
} {
  if (key.startsWith(BOOKING_OVERRIDE_KEY_PREFIX)) {
    const id = key.slice(BOOKING_OVERRIDE_KEY_PREFIX.length);
    return { simKey: `${SIM_BOOKING_OVERRIDE_PREFIX}${staffId}:${id}`, liveFallbackKey: null };
  }
  if (key.startsWith(CUSTOMER_NATURAL_LASH_KEY_PREFIX)) {
    const id = key.slice(CUSTOMER_NATURAL_LASH_KEY_PREFIX.length);
    return {
      simKey: `${SIM_NATURAL_LASH_PREFIX}${staffId}:${id}`,
      liveFallbackKey: key,
      isNaturalLash: true,
    };
  }
  if (key.startsWith(CUSTOMER_AVATAR_KEY_PREFIX)) {
    const id = key.slice(CUSTOMER_AVATAR_KEY_PREFIX.length);
    return { simKey: `${SIM_AVATAR_PREFIX}${staffId}:${id}`, liveFallbackKey: key };
  }
  if (key.startsWith(CUSTOMER_COMBO_EXPIRY_KEY_PREFIX)) {
    const id = key.slice(CUSTOMER_COMBO_EXPIRY_KEY_PREFIX.length);
    return { simKey: `${SIM_COMBO_EXPIRY_PREFIX}${staffId}:${id}`, liveFallbackKey: key };
  }
  if (key.startsWith(LEGACY_SETTLE_KEY_PREFIX)) {
    const id = key.slice(LEGACY_SETTLE_KEY_PREFIX.length);
    return { simKey: `${SIM_SETTLE_PREFIX}${staffId}:${id}`, liveFallbackKey: null };
  }
  if (key === LEGACY_LIVE_OVERRIDES_KEY || key === LEGACY_CUSTOMER_AVATARS_KEY) {
    return { simKey: null, liveFallbackKey: null };
  }
  return { simKey: `IOS_SIM_MISC:${staffId}:${key}`, liveFallbackKey: null };
}

function mapPrefixToSimPrefix(prefix: string, staffId: number): string {
  if (prefix === BOOKING_OVERRIDE_KEY_PREFIX) return getSimBookingOverridePrefixForStaff(staffId);
  if (prefix === CUSTOMER_NATURAL_LASH_KEY_PREFIX) return `${SIM_NATURAL_LASH_PREFIX}${staffId}:`;
  if (prefix === CUSTOMER_AVATAR_KEY_PREFIX) return `${SIM_AVATAR_PREFIX}${staffId}:`;
  if (prefix === CUSTOMER_COMBO_EXPIRY_KEY_PREFIX) return `${SIM_COMBO_EXPIRY_PREFIX}${staffId}:`;
  if (prefix === LEGACY_SETTLE_KEY_PREFIX) return `${SIM_SETTLE_PREFIX}${staffId}:`;
  return `IOS_SIM_MISC:${staffId}:${prefix}`;
}

/**
 * Wraps a CrmConfigStoreAdapter so all reads/writes from `createOverrideRepository`
 * live strictly inside `IOS_SIM_*:<staffId>:*` keys.
 * Natural lash, avatar, and combo-expiry profiles perform READ-ONLY fallback to live keys
 * unless explicitly cleared with a simulation tombstone, and NEVER mutate live keys.
 */
export function createSimulationNamespacedStore(
  baseStore: CrmConfigStoreAdapter,
  staffId: number
): CrmConfigStoreAdapter {
  const safeStaffId = Math.max(1, Math.floor(Number(staffId || 0)));

  return {
    async getOne(key: string): Promise<string | null> {
      const mapped = mapKeyToSimStorage(key, safeStaffId);
      if (!mapped.simKey) return null;

      const simVal = await baseStore.getOne(mapped.simKey);
      if (simVal !== null) {
        if (mapped.isNaturalLash && isSimClearedTombstone(simVal)) {
          return null;
        }
        return simVal;
      }

      if (mapped.liveFallbackKey) {
        return baseStore.getOne(mapped.liveFallbackKey);
      }
      return null;
    },

    async getMany(keys: string[]): Promise<Map<string, string>> {
      const result = new Map<string, string>();
      if (keys.length === 0) return result;

      const lookupTargets = keys.map((origKey) => ({
        origKey,
        ...mapKeyToSimStorage(origKey, safeStaffId),
      }));

      const simKeys = Array.from(new Set(lookupTargets.map((t) => t.simKey).filter((k): k is string => Boolean(k))));
      const simMap = await baseStore.getMany(simKeys);

      const fallbackKeysNeeded: string[] = [];
      for (const target of lookupTargets) {
        if (!target.simKey) continue;
        const simVal = simMap.get(target.simKey);
        if (simVal !== undefined) {
          if (target.isNaturalLash && isSimClearedTombstone(simVal)) {
            continue;
          }
          result.set(target.origKey, simVal);
        } else if (target.liveFallbackKey) {
          fallbackKeysNeeded.push(target.liveFallbackKey);
        }
      }

      if (fallbackKeysNeeded.length > 0) {
        const liveMap = await baseStore.getMany(Array.from(new Set(fallbackKeysNeeded)));
        for (const target of lookupTargets) {
          if (!result.has(target.origKey) && target.liveFallbackKey) {
            const simVal = target.simKey ? simMap.get(target.simKey) : undefined;
            if (simVal === undefined) {
              const liveVal = liveMap.get(target.liveFallbackKey);
              if (liveVal !== undefined) {
                result.set(target.origKey, liveVal);
              }
            }
          }
        }
      }

      return result;
    },

    async getByPrefix(prefix: string): Promise<Map<string, string>> {
      const simPrefix = mapPrefixToSimPrefix(prefix, safeStaffId);
      const rawMap = await baseStore.getByPrefix(simPrefix);
      const translated = new Map<string, string>();
      for (const [simKey, val] of rawMap.entries()) {
        if (simKey.startsWith(simPrefix)) {
          if (prefix === CUSTOMER_NATURAL_LASH_KEY_PREFIX && isSimClearedTombstone(val)) continue;
          translated.set(`${prefix}${simKey.slice(simPrefix.length)}`, val);
        }
      }
      return translated;
    },

    async upsert(key: string, value: string): Promise<void> {
      const mapped = mapKeyToSimStorage(key, safeStaffId);
      if (!mapped.simKey) return;
      await baseStore.upsert(mapped.simKey, value);
    },

    async remove(key: string): Promise<void> {
      const mapped = mapKeyToSimStorage(key, safeStaffId);
      if (!mapped.simKey) return;
      if (mapped.isNaturalLash) {
        // Tombstone hides live profile inside this staff's simulation without deleting real data
        await baseStore.upsert(mapped.simKey, SIM_NLASH_CLEARED_TOMBSTONE);
        return;
      }
      await baseStore.remove(mapped.simKey);
    },

    async removeByPrefix(prefix: string): Promise<void> {
      const simPrefix = mapPrefixToSimPrefix(prefix, safeStaffId);
      await baseStore.removeByPrefix(simPrefix);
    },
  };
}

let cachedMysqlBaseStore: CrmConfigStoreAdapter | null = null;
const cachedDefaultSimRepos = new Map<number, ReturnType<typeof createOverrideRepository>>();

function resolveBaseStore(baseStore?: CrmConfigStoreAdapter): CrmConfigStoreAdapter {
  if (baseStore) return baseStore;
  if (!cachedMysqlBaseStore) {
    cachedMysqlBaseStore = createMysqlConfigStore();
  }
  return cachedMysqlBaseStore;
}

export function getSimulationOverrideRepository(staffId: number, baseStore?: CrmConfigStoreAdapter) {
  const safeStaffId = Math.max(1, Math.floor(Number(staffId || 0)));
  if (!baseStore) {
    const existing = cachedDefaultSimRepos.get(safeStaffId);
    if (existing) return existing;
    const repo = createOverrideRepository(createSimulationNamespacedStore(resolveBaseStore(), safeStaffId));
    cachedDefaultSimRepos.set(safeStaffId, repo);
    return repo;
  }
  return createOverrideRepository(createSimulationNamespacedStore(baseStore, safeStaffId));
}

function safeParseArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function loadSimulationCustomBookings(
  staffId: number,
  date: string,
  baseStore?: CrmConfigStoreAdapter
): Promise<IosBookingItem[]> {
  const store = resolveBaseStore(baseStore);
  const raw = await store.getOne(getSimCustomBookingsKey(staffId, date));
  return safeParseArray<IosBookingItem>(raw);
}

export async function findSimulationCustomBookingById(
  staffId: number,
  bookingId: number,
  baseStore?: CrmConfigStoreAdapter
): Promise<IosBookingItem | null> {
  const store = resolveBaseStore(baseStore);
  const prefix = `${SIM_CUSTOM_BOOKING_PREFIX}${staffId}:`;
  const allDatesMap = await store.getByPrefix(prefix);
  for (const raw of allDatesMap.values()) {
    const list = safeParseArray<IosBookingItem>(raw);
    const match = list.find((item) => Number(item.id) === Number(bookingId));
    if (match) return match;
  }
  return null;
}

export async function saveSimulationCustomBooking(
  staffId: number,
  date: string,
  booking: IosBookingItem,
  baseStore?: CrmConfigStoreAdapter
): Promise<void> {
  const store = resolveBaseStore(baseStore);
  const key = getSimCustomBookingsKey(staffId, date);
  const current = await loadSimulationCustomBookings(staffId, date, store);
  const next = current.filter((item) => Number(item.id) !== Number(booking.id));
  next.push({
    ...booking,
    isSimulationBooking: true,
    isSimulationDraftBooking: true,
  });
  await store.upsert(key, JSON.stringify(next));
}

export async function resolveSimulationContextActor(
  fastify: FastifyInstance,
  authUser: IosAuthContext,
  requestedMenteeStaffId?: number,
  targetDate?: string
): Promise<SimulationContextResolution> {
  if (!canAccessIosConsultationApp(authUser.role)) {
    throw new IosSimulationForbiddenError(
      'Tài khoản không có quyền truy cập Phòng Tập Luyện Mô Phỏng.',
      'IOS_FORBIDDEN'
    );
  }

  const actorStaffId = Number(authUser.legacyStaffId || 13783);
  const actorStaffName = String(authUser.displayName || `Nhân sự #${actorStaffId}`);
  const menteeId = Number(requestedMenteeStaffId || 0);

  if (!menteeId || menteeId === actorStaffId) {
    return {
      actorStaffId,
      actorStaffName,
      targetStaffId: actorStaffId,
      targetStaffName: actorStaffName,
      isReadOnlyMentorView: false,
    };
  }

  if (authUser.careerTier === 'CVL') {
    throw new IosSimulationForbiddenError(
      'Tài khoản Chuyên Viên Tự Chủ chỉ được xem dữ liệu tập luyện của chính mình.',
      'SIM_CVL_SELF_ONLY'
    );
  }

  if (authUser.careerTier === 'ADMIN') {
    return {
      actorStaffId,
      actorStaffName,
      targetStaffId: menteeId,
      targetStaffName: `Mentee #${menteeId}`,
      isReadOnlyMentorView: true,
    };
  }

  if (authUser.careerTier === 'CC') {
    const refDate = (targetDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const activePairs = await CvlTrainingMentorshipService.getActivePairsForRange(fastify, refDate, refDate);
    const matchedPair = activePairs.find(
      (p) => Number(p.mentorLegacyStaffId) === actorStaffId && Number(p.menteeLegacyStaffId) === menteeId
    );
    if (!matchedPair) {
      throw new IosSimulationForbiddenError(
        'Bạn chỉ có thể xem bài tập luyện của Chuyên Viên Tự Chủ đang thuộc cặp Mentor Training với bạn.',
        'SIM_MENTOR_NOT_PAIRED'
      );
    }
    return {
      actorStaffId,
      actorStaffName,
      targetStaffId: menteeId,
      targetStaffName: matchedPair.menteeDisplayName || `Mentee #${menteeId}`,
      isReadOnlyMentorView: true,
    };
  }

  throw new IosSimulationForbiddenError('Vai trò không được phép xem sandbox người khác.', 'SIM_FORBIDDEN');
}

export async function listAccessibleSimulationMentees(
  fastify: FastifyInstance,
  authUser: IosAuthContext,
  targetDate?: string
): Promise<IosSimulationMenteeOption[]> {
  if (!canAccessIosConsultationApp(authUser.role) || authUser.careerTier === 'CVL') {
    return [];
  }
  const refDate = (targetDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const activePairs = await CvlTrainingMentorshipService.getActivePairsForRange(fastify, refDate, refDate);
  const actorStaffId = Number(authUser.legacyStaffId || 0);

  const visiblePairs =
    authUser.careerTier === 'ADMIN'
      ? activePairs
      : activePairs.filter((p) => Number(p.mentorLegacyStaffId) === actorStaffId);

  const byMentee = new Map<number, IosSimulationMenteeOption>();
  for (const p of visiblePairs) {
    if (!byMentee.has(p.menteeLegacyStaffId)) {
      byMentee.set(p.menteeLegacyStaffId, {
        menteeStaffId: p.menteeLegacyStaffId,
        menteeName: p.menteeDisplayName || `CVL #${p.menteeLegacyStaffId}`,
        mentorStaffId: p.mentorLegacyStaffId,
        mentorName: p.mentorDisplayName || `CC #${p.mentorLegacyStaffId}`,
        startDate: p.startDate,
        endDate: p.endDate,
      });
    }
  }
  return Array.from(byMentee.values());
}

function applySimulationDraftOverride(
  draft: IosBookingItem,
  override: BookingOverrideRecord | undefined,
  naturalLashProfile: NaturalLashConsultationAttributes | undefined,
  targetStaffId: number
): IosBookingItem {
  if (!override || override._simForceIncoming) {
    return {
      ...draft,
      status: 'INCOMING',
      orderState: 'Confirmed',
      checkInStaffId: undefined,
      checkInStaffName: undefined,
      checkInStaffTier: undefined,
      checkOutStaffId: undefined,
      checkOutStaffName: undefined,
      checkOutStaffTier: undefined,
      selectedCombo: null,
      selectedUnderCombo: null,
      comboRedemption: null,
      cartProducts: [],
      promotionId: null,
      appliedPromotion: null,
      servicePromotionId: null,
      servicePromotion: null,
      comboPromotionId: null,
      comboPromotion: null,
      underComboPromotionId: null,
      underComboPromotion: null,
      survey: undefined,
      progress: undefined,
      billing: undefined,
      attributes: naturalLashProfile ? ({ ...naturalLashProfile } as IosBookingItem['attributes']) : undefined,
      isSimulationBooking: true,
      isSimulationDraftBooking: true,
    };
  }

  const cartProducts: IosCartProductItem[] = Array.isArray(override.cartProducts)
    ? override.cartProducts
    : draft.cartProducts || [];
  const mergedAttributes =
    naturalLashProfile || override.attributes
      ? {
          ...(naturalLashProfile || {}),
          ...(override.attributes || {}),
        }
      : draft.attributes;

  const assignedStaffId = Number(override.assignedStaffId || draft.assignedStaffId || targetStaffId);
  const checkInStaffId = override.checkInStaffId ? Number(override.checkInStaffId) : draft.checkInStaffId;
  const checkOutStaffId = override.checkOutStaffId ? Number(override.checkOutStaffId) : draft.checkOutStaffId;
  const selectedCombo = override.selectedCombo !== undefined ? override.selectedCombo : draft.selectedCombo;
  const selectedUnderCombo =
    override.selectedUnderCombo !== undefined ? override.selectedUnderCombo : draft.selectedUnderCombo;
  const comboRedemption = override.comboRedemption !== undefined ? override.comboRedemption : draft.comboRedemption;
  const upgradePrice = Number(override.upgradePrice ?? draft.upgradePrice ?? 0);

  const financials = computeBookingFinancials({
    servicePrice: Number(draft.servicePrice || 0),
    upgradePrice,
    serviceName: override.upgradedServiceName || draft.serviceName,
    isComboLive: Boolean(draft.comboLiveStatus?.isComboLive),
    hasUnderMink: Boolean(mergedAttributes?.hasUnderMink),
    underMinkServiceType: mergedAttributes?.underMinkServiceType,
    hasUnderMinkCombo: Boolean(draft.underMinkComboStatus?.hasUnderCombo),
    selectedCombo,
    selectedUnderCombo,
    comboRedemption,
    cartProducts,
    overrideBilling: override.billing,
    assignedStaffId,
    checkInStaffId,
    checkOutStaffId,
    activeStaffId: targetStaffId,
    dbOrderState: override.orderState || 'Confirmed',
    promotionId: override.promotionId ?? null,
    appliedPromotion: override.appliedPromotion ?? null,
    servicePromotion: override.servicePromotion ?? null,
    comboPromotion: override.comboPromotion ?? null,
    underComboPromotion: override.underComboPromotion ?? null,
  });

  return {
    ...draft,
    status: (override.status || draft.status || 'INCOMING') as IosBookingItem['status'],
    orderState: override.orderState || draft.orderState || 'Confirmed',
    serviceName: override.upgradedServiceName || draft.serviceName,
    upgradePrice,
    assignedStaffId,
    assignedStaffName: override.assignedStaffName || draft.assignedStaffName,
    assignedStaffTier: override.assignedStaffTier || draft.assignedStaffTier,
    checkInStaffId,
    checkInStaffName: override.checkInStaffName || draft.checkInStaffName,
    checkInStaffTier: override.checkInStaffTier || draft.checkInStaffTier,
    checkOutStaffId,
    checkOutStaffName: override.checkOutStaffName || draft.checkOutStaffName,
    checkOutStaffTier: override.checkOutStaffTier || draft.checkOutStaffTier,
    assignedBed: override.assignedBed || draft.assignedBed,
    attributes: mergedAttributes as IosBookingItem['attributes'],
    selectedCombo,
    selectedUnderCombo,
    comboRedemption,
    cartProducts,
    promotionId: override.promotionId ?? null,
    appliedPromotion: override.appliedPromotion ?? null,
    servicePromotionId: override.servicePromotionId ?? null,
    servicePromotion: override.servicePromotion ?? null,
    comboPromotionId: override.comboPromotionId ?? null,
    comboPromotion: override.comboPromotion ?? null,
    underComboPromotionId: override.underComboPromotionId ?? null,
    underComboPromotion: override.underComboPromotion ?? null,
    survey: override.survey || draft.survey,
    progress: override.progress || draft.progress,
    cvRewardBreakdown: financials.cvRewardBreakdown,
    billing:
      override.billing || override.status === 'DONE' || cartProducts.length > 0 || selectedCombo
        ? financials.billing
        : undefined,
    isSimulationBooking: true,
    isSimulationDraftBooking: true,
  };
}

export function enrichSimulationBookings(params: {
  mappedBookings: IosBookingItem[];
  customDraftBookings: IosBookingItem[];
  simOverridesMap: Record<string, BookingOverrideRecord>;
  simNaturalLashMap: Record<string, NaturalLashConsultationAttributes>;
  attemptMetaMap: Map<number, { count: number; latestAttemptId?: string }>;
  targetStaffId: number;
  isReadOnlyMentorView: boolean;
}): IosBookingItem[] {
  const {
    mappedBookings,
    customDraftBookings,
    simOverridesMap,
    simNaturalLashMap,
    attemptMetaMap,
    targetStaffId,
    isReadOnlyMentorView,
  } = params;

  const adjustedBase = mappedBookings.map((booking) => {
    const override = simOverridesMap[String(booking.id)];
    if (override?._simForceIncoming) {
      const nl = simNaturalLashMap[String(booking.customerId)];
      return {
        ...booking,
        status: 'INCOMING' as const,
        orderState: 'Confirmed',
        checkInStaffId: undefined,
        checkInStaffName: undefined,
        checkInStaffTier: undefined,
        checkOutStaffId: undefined,
        checkOutStaffName: undefined,
        checkOutStaffTier: undefined,
        selectedCombo: null,
        selectedUnderCombo: null,
        comboRedemption: null,
        cartProducts: [],
        promotionId: null,
        appliedPromotion: null,
        servicePromotionId: null,
        servicePromotion: null,
        comboPromotionId: null,
        comboPromotion: null,
        underComboPromotionId: null,
        underComboPromotion: null,
        survey: undefined,
        progress: undefined,
        billing: undefined,
        attributes: nl ? ({ ...nl } as IosBookingItem['attributes']) : undefined,
      };
    }

    if (
      override &&
      (override.status === 'INCOMING' ||
        override.status === 'CHECKED_IN' ||
        (override.status === 'SERVICING' &&
          !override.progress?.completedAt &&
          !override.billing?.completedAt &&
          !override.completedAt))
    ) {
      return {
        ...booking,
        status: override.status,
        orderState:
          override.orderState ||
          (override.status === 'CHECKED_IN'
            ? 'Check-in'
            : override.status === 'SERVICING'
              ? 'Preparation'
              : 'Confirmed'),
        ...(override.status === 'CHECKED_IN'
          ? {
              progress: undefined,
              survey: undefined,
              billing: override.billing && !override.billing.completedAt ? booking.billing : undefined,
            }
          : {}),
      };
    }

    return booking;
  });

  const mergedDrafts = customDraftBookings.map((draft) => {
    const override = simOverridesMap[String(draft.id)];
    const nl = simNaturalLashMap[String(draft.customerId)];
    return applySimulationDraftOverride(draft, override, nl, targetStaffId);
  });

  const combined = [...adjustedBase, ...mergedDrafts];
  combined.sort((a, b) => String(a.timeSlot || '').localeCompare(String(b.timeSlot || '')));

  return combined.map((b) => {
    const override = simOverridesMap[String(b.id)];
    const meta = attemptMetaMap.get(Number(b.id));
    const rawCount = meta?.count || 0;
    const attemptCount =
      rawCount > 0
        ? rawCount
        : hasCompletedSimulationSnapshot(override, {
              isLiveCompleted: b.status === 'DONE' && !override?._simForceIncoming,
            })
          ? 1
          : 0;
    return {
      ...b,
      isSimulationBooking: true,
      isSimulationDraftBooking: Boolean(b.isSimulationDraftBooking || Number(b.id) >= IOS_SIM_BOOKING_ID_MIN),
      simulationAttemptCount: attemptCount,
      simulationLatestAttemptId: meta?.latestAttemptId,
      simulationFastForwardUnlocked: attemptCount >= 1,
      simulationReadOnly: isReadOnlyMentorView,
    };
  });
}
