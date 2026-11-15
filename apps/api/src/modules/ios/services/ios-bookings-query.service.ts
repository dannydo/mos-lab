import { FastifyInstance } from 'fastify';
import {
  canViewUnmaskedCustomerPhone,
  IosBookingListResponse,
  isAdminOrSuperAdminRole,
  resolveLockedIosRoleForUser,
} from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from '../mock-data.js';
import { getLegacyPool } from './db-pools.js';
import { IosAuthContext } from './ios-auth.service.js';
import { BookingOverrideRecord, defaultIosOverrideRepo } from './ios-overrides.service.js';
import { fetchLiveOrderSnapshots } from './ios-bookings-sql.service.js';
import { settleIosOrderWithLegacyPhp } from './ios-legacy-bridge.service.js';
import {
  buildDemoStaffMonthlyStats,
  fetchLiveStaffMonthlyStats,
  invalidateStaffStatsCache,
  resolveYearMonthFromDate,
} from './ios-staff-stats.service.js';
import {
  applyIosScopeAndCounts,
  buildDemoModeBookings,
  mapLiveOrdersToBookings,
} from './ios-bookings-mapper.service.js';
import { buildDemoCvSelfSpeedProfile, fetchLiveCvSelfSpeedProfiles } from './ios-cv-self-speed.service.js';
import { collectPromotionIdsFromSources, fetchPromotionsByIds } from './ios-promotions.service.js';
import { CvlTrainingMentorshipService } from '../../kpi/services/cvl-training-mentorship.service.js';
import {
  enrichSimulationBookings,
  getSimulationOverrideRepository,
  loadSimulationAttemptCountsBatch,
  loadSimulationCustomBookings,
  resolveSimulationContextActor,
} from './ios-simulation.service.js';

export function resolveTodayVietnamDate(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function isIosDemoModeRequested(demoParam?: string | boolean): boolean {
  if (demoParam === true) return true;
  const normalized = String(demoParam || '')
    .trim()
    .toLowerCase();
  return normalized === '1' || normalized === 'true';
}

export async function queryIosBookingsList(
  fastify: FastifyInstance,
  authUser: IosAuthContext,
  query: Record<string, string | undefined>
): Promise<IosBookingListResponse> {
  const isAdmin = authUser.careerTier === 'ADMIN' || isAdminOrSuperAdminRole(authUser.role || '');
  const isSimulationMode = isIosDemoModeRequested(query.sim);
  const isDemoMode = !isSimulationMode && isIosDemoModeRequested(query.demo);
  const requestedStoreId = query.storeId !== undefined && query.storeId !== '' ? Number(query.storeId) : undefined;
  const storeId =
    !isAdmin && !isSimulationMode && authUser.clientStoreId && authUser.clientStoreId !== 4
      ? authUser.clientStoreId
      : (requestedStoreId ?? (authUser.clientStoreId && authUser.clientStoreId !== 4 ? authUser.clientStoreId : 6));
  const segment = (query.segment || 'INCOMING').toUpperCase();
  const todayVn = resolveTodayVietnamDate();
  const targetDate = query.date || todayVn;

  const effectiveRole = resolveLockedIosRoleForUser(
    isAdmin ? 'admin' : authUser.careerTier || authUser.role,
    query.role
  );
  const canViewFullPhone = isAdmin && effectiveRole !== 'CVL' ? true : canViewUnmaskedCustomerPhone(effectiveRole);

  const rawScope = (query.scope || (effectiveRole === 'CVL' ? 'MY_CUSTOMERS' : 'STORE_ALL')).toUpperCase();
  const scope =
    effectiveRole === 'CVL'
      ? 'MY_CUSTOMERS'
      : effectiveRole === 'CC' || effectiveRole === 'STORE'
        ? 'STORE_ALL'
        : rawScope;

  const explicitStaffId = query.staffId ? Number(query.staffId) : undefined;
  const activeStaffId =
    authUser.careerTier === 'CVL' && !isAdmin
      ? authUser.legacyStaffId || 13783
      : explicitStaffId || authUser.legacyStaffId || 13783;

  const defaultLimit = scope === 'STORE_ALL' ? 200 : 100;
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), 250);

  const simCtx = isSimulationMode
    ? await resolveSimulationContextActor(
        fastify,
        authUser,
        query.menteeStaffId ? Number(query.menteeStaffId) : undefined,
        targetDate
      )
    : null;
  const simEffectiveRole = simCtx?.isReadOnlyMentorView ? 'CVL' : effectiveRole;
  const simScope = simCtx?.isReadOnlyMentorView ? 'MY_CUSTOMERS' : scope;
  const simActiveStaffId = simCtx ? simCtx.targetStaffId : activeStaffId;
  const simCanViewFullPhone = simCtx?.isReadOnlyMentorView
    ? false
    : canViewUnmaskedCustomerPhone(simEffectiveRole) && (!isAdmin || simEffectiveRole !== 'CVL');
  const { yearNum, monthNum } = resolveYearMonthFromDate(targetDate);
  const monthFirstDay = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
  const monthLastDay = new Date(Date.UTC(yearNum, monthNum, 0)).toISOString().slice(0, 10);
  const activeTrainingPairs = await CvlTrainingMentorshipService.getActivePairsForRange(
    fastify,
    monthFirstDay,
    monthLastDay
  );

  if (isDemoMode) {
    const demoBookingIds = INITIAL_BOOKINGS.map((b) => b.id);
    const demoCustomerIds = INITIAL_BOOKINGS.map((b) => b.customerId).filter((id) => id > 0);
    const [overrides, customerAvatarMap, customerNaturalLashMap, customerComboExpiryMap] = await Promise.all([
      defaultIosOverrideRepo.loadBookingOverridesBatch(demoBookingIds),
      defaultIosOverrideRepo.loadCustomerAvatarsBatch(demoCustomerIds),
      defaultIosOverrideRepo.loadCustomerNaturalLashProfilesBatch(demoCustomerIds),
      defaultIosOverrideRepo.loadCustomerComboExpiryOverridesBatch(demoCustomerIds),
    ]);

    const allDemoBookings = buildDemoModeBookings({
      overrides,
      customerAvatarMap,
      customerNaturalLashMap,
      customerComboExpiryMap,
      storeId,
      activeStaffId,
      canViewFullPhone,
      targetDate,
      todayVn,
      activeTrainingPairs,
    });

    const { effectiveList, counts } = applyIosScopeAndCounts(allDemoBookings, {
      effectiveRole,
      scope,
      activeStaffId,
      targetDate,
      todayVn,
    });

    const demoSpeedByStaff = new Map<number, ReturnType<typeof buildDemoCvSelfSpeedProfile>>();
    const getDemoSpeedProfile = (sid: number) => {
      const targetSid = sid > 0 ? sid : activeStaffId;
      let profile = demoSpeedByStaff.get(targetSid);
      if (!profile) {
        profile = buildDemoCvSelfSpeedProfile(targetSid);
        demoSpeedByStaff.set(targetSid, profile);
      }
      return profile;
    };

    const staffStats = {
      ...buildDemoStaffMonthlyStats(allDemoBookings, activeStaffId, targetDate),
      cvSelfSpeedHistory: getDemoSpeedProfile(activeStaffId),
    };
    const enrichedDemoList = effectiveList.map((b) => ({
      ...b,
      cvSelfSpeedHistory: getDemoSpeedProfile(Number(b.assignedStaffId) || activeStaffId),
    }));

    return {
      success: true,
      source: 'demo_mode',
      demoMode: true,
      storeId,
      segment,
      role: effectiveRole,
      scope,
      activeStaffId,
      targetDate,
      counts,
      count: enrichedDemoList.length,
      ...(effectiveRole !== 'CVL' ? { totalStoreCount: allDemoBookings.length } : {}),
      bookings: enrichedDemoList,
      staffStats,
      timestamp: new Date().toISOString(),
    };
  }

  const pool = getLegacyPool();
  const rawSimDraftBookings =
    isSimulationMode && simCtx ? await loadSimulationCustomBookings(simCtx.targetStaffId, targetDate) : [];
  const simDraftBookings = rawSimDraftBookings.filter(
    (b) => !b.storeId || Number(b.storeId) === Number(storeId)
  );
  const activeRepo =
    isSimulationMode && simCtx ? getSimulationOverrideRepository(simCtx.targetStaffId) : defaultIosOverrideRepo;

  let [{ orders, customerContext }, staffStats] = await Promise.all([
    fetchLiveOrderSnapshots(pool, { storeId, targetDate, limit }),
    fetchLiveStaffMonthlyStats(
      pool,
      simActiveStaffId,
      targetDate,
      (meta, msg) => fastify.log.warn(meta, msg),
      activeTrainingPairs
    ),
  ]);

  const liveOrderIds = orders.map((o) => o.id);
  const allOrderIds = Array.from(new Set([...liveOrderIds, ...simDraftBookings.map((b) => Number(b.id))]));
  const liveCustomerIds = Array.from(
    new Set(
      [...orders.map((o) => Number(o.user_id)), ...simDraftBookings.map((b) => Number(b.customerId))].filter(
        (id) => id > 0
      )
    )
  );

  const [overrides, customerAvatarMap, customerNaturalLashMap, customerComboExpiryMap, attemptMetaMap] =
    await Promise.all([
      activeRepo.loadBookingOverridesBatch(allOrderIds),
      activeRepo.loadCustomerAvatarsBatch(liveCustomerIds),
      activeRepo.loadCustomerNaturalLashProfilesBatch(liveCustomerIds),
      activeRepo.loadCustomerComboExpiryOverridesBatch(liveCustomerIds),
      isSimulationMode && simCtx
        ? loadSimulationAttemptCountsBatch(simCtx.targetStaffId, allOrderIds)
        : Promise.resolve(new Map<number, { count: number; latestAttemptId?: string }>()),
    ]);

  const promoIds = collectPromotionIdsFromSources(orders, overrides);
  const promotionsById = await fetchPromotionsByIds(pool, promoIds);

  // Tự động đối soát & hạch toán bù (Idempotent Backfill) — TUYỆT ĐỐI BỎ QUA trong Simulation Mode
  let reconciledAny = false;
  if (!isSimulationMode) {
    for (const row of orders) {
      const orderId = Number(row.id);
      const ovr = overrides[String(orderId)];
      if (!ovr || ovr.status !== 'DONE' || row.order_state === 'Completed') continue;

      const settleStatus = String(ovr.billing?.settlementStatus || '');
      if (
        settleStatus === 'SETTLED_COMPLETED' ||
        settleStatus === 'PENDING_COUNTER_SETTLEMENT' ||
        settleStatus === 'DEMO_ONLY'
      ) {
        continue;
      }

      await defaultIosOverrideRepo.withBookingLock(orderId, async () => {
        const freshOvr: BookingOverrideRecord = (await defaultIosOverrideRepo.loadBookingOverride(orderId)) || ovr;
        const assignedStaffId = Number(freshOvr.assignedStaffId || freshOvr.checkOutStaffId || activeStaffId);
        const checkInStaffId = Number(freshOvr.checkInStaffId || assignedStaffId || activeStaffId);
        const checkOutStaffId = Number(freshOvr.checkOutStaffId || assignedStaffId || activeStaffId);

        const settlement = await settleIosOrderWithLegacyPhp(
          {
            bookingId: orderId,
            mergedOverride: freshOvr,
            checkInStaffId,
            assignedStaffId,
            checkOutStaffId,
          },
          {
            loadSettlementReceipt: (id) => defaultIosOverrideRepo.loadSettlementReceipt(id),
            saveSettlementReceipt: (id, receipt) => defaultIosOverrideRepo.saveSettlementReceipt(id, receipt),
          }
        );

        if (
          settlement.settlementStatus === 'SETTLED_COMPLETED' ||
          settlement.settlementStatus === 'PENDING_COUNTER_SETTLEMENT'
        ) {
          const updatedOvr: BookingOverrideRecord = {
            ...freshOvr,
            orderState: settlement.orderState,
            billing: {
              ...(freshOvr.billing || {}),
              settlementStatus: settlement.settlementStatus,
              ...(settlement.bankTransferRef ? { bankTransferRef: settlement.bankTransferRef } : {}),
              legacySyncedAt: settlement.settledAt,
            },
          };
          await defaultIosOverrideRepo.saveBookingOverride(orderId, updatedOvr);
          overrides[String(orderId)] = updatedOvr;
          reconciledAny = true;
          invalidateStaffStatsCache([activeStaffId, assignedStaffId, checkInStaffId, checkOutStaffId]);
        }
      });
    }
  }

  if (!isSimulationMode && reconciledAny) {
    [{ orders, customerContext }, staffStats] = await Promise.all([
      fetchLiveOrderSnapshots(pool, { storeId, targetDate, limit }),
      fetchLiveStaffMonthlyStats(
        pool,
        simActiveStaffId,
        targetDate,
        (meta, msg) => fastify.log.warn(meta, msg),
        activeTrainingPairs
      ),
    ]);
  }

  const baseMappedBookings = mapLiveOrdersToBookings({
    orders,
    customerContext,
    overrides,
    customerAvatarMap,
    customerNaturalLashMap,
    customerComboExpiryMap,
    storeId,
    targetDate,
    todayVn,
    activeStaffId: simActiveStaffId,
    canViewFullPhone: simCanViewFullPhone,
    activeTrainingPairs,
    promotionsById,
  });

  const allMappedBookings =
    isSimulationMode && simCtx
      ? enrichSimulationBookings({
          mappedBookings: baseMappedBookings,
          customDraftBookings: simDraftBookings,
          simOverridesMap: overrides,
          simNaturalLashMap: customerNaturalLashMap,
          attemptMetaMap,
          targetStaffId: simCtx.targetStaffId,
          isReadOnlyMentorView: simCtx.isReadOnlyMentorView,
        })
      : baseMappedBookings;

  const { effectiveList, counts } = applyIosScopeAndCounts(allMappedBookings, {
    effectiveRole: simEffectiveRole,
    scope: simScope,
    activeStaffId: simActiveStaffId,
    targetDate,
    todayVn,
  });

  const speedStaffIds = Array.from(
    new Set([simActiveStaffId, ...effectiveList.map((b) => Number(b.assignedStaffId || 0)).filter((id) => id > 0)])
  );
  const speedProfilesMap = await fetchLiveCvSelfSpeedProfiles(pool, speedStaffIds, (meta, msg) =>
    fastify.log.warn(meta, msg)
  );
  const staffStatsWithSpeed = {
    ...staffStats,
    cvSelfSpeedHistory: speedProfilesMap.get(simActiveStaffId),
  };
  const enrichedLiveList = effectiveList.map((b) => ({
    ...b,
    cvSelfSpeedHistory: speedProfilesMap.get(Number(b.assignedStaffId) || simActiveStaffId),
  }));

  return {
    success: true,
    source: 'mysql_live',
    demoMode: false,
    ...(isSimulationMode && simCtx
      ? {
          simulationMode: true,
          simulationActorStaffId: simCtx.targetStaffId,
          simulationActorStaffName: simCtx.targetStaffName,
          isReadOnlyMentorView: simCtx.isReadOnlyMentorView,
        }
      : { simulationMode: false }),
    storeId,
    segment,
    role: simEffectiveRole,
    scope: simScope,
    activeStaffId: simActiveStaffId,
    targetDate,
    counts,
    count: enrichedLiveList.length,
    ...(simEffectiveRole !== 'CVL' ? { totalStoreCount: allMappedBookings.length } : {}),
    bookings: enrichedLiveList,
    staffStats: staffStatsWithSpeed,
    timestamp: new Date().toISOString(),
  };
}
