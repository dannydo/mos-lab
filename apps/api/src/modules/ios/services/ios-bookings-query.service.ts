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
import { defaultIosOverrideRepo } from './ios-overrides.service.js';
import { fetchLiveOrderSnapshots } from './ios-bookings-sql.service.js';
import { buildDemoStaffMonthlyStats, fetchLiveStaffMonthlyStats } from './ios-staff-stats.service.js';
import {
  applyIosScopeAndCounts,
  buildDemoModeBookings,
  mapLiveOrdersToBookings,
} from './ios-bookings-mapper.service.js';

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
  const storeId = query.storeId !== undefined && query.storeId !== '' ? Number(query.storeId) : 6;
  const segment = (query.segment || 'INCOMING').toUpperCase();
  const todayVn = resolveTodayVietnamDate();
  const targetDate = query.date || todayVn;

  const isAdmin = authUser.careerTier === 'ADMIN' || isAdminOrSuperAdminRole(authUser.role || '');
  const effectiveRole = resolveLockedIosRoleForUser(
    isAdmin ? 'admin' : authUser.careerTier || authUser.role,
    query.role
  );
  const canViewFullPhone = isAdmin && effectiveRole !== 'CVL' ? true : canViewUnmaskedCustomerPhone(effectiveRole);

  const rawScope = (
    query.scope || (effectiveRole === 'CVL' ? 'MY_CUSTOMERS' : isAdmin ? 'STORE_ALL' : 'MY_CUSTOMERS')
  ).toUpperCase();
  const scope = effectiveRole === 'CVL' ? 'MY_CUSTOMERS' : rawScope;

  const explicitStaffId = query.staffId ? Number(query.staffId) : undefined;
  const activeStaffId =
    authUser.careerTier === 'CVL' && !isAdmin
      ? authUser.legacyStaffId || 13783
      : explicitStaffId || authUser.legacyStaffId || 13783;

  const limit = Math.min(Math.max(Number(query.limit) || 40, 1), 100);
  const isDemoMode = isIosDemoModeRequested(query.demo);

  if (isDemoMode) {
    const demoBookingIds = INITIAL_BOOKINGS.map((b) => b.id);
    const demoCustomerIds = INITIAL_BOOKINGS.map((b) => b.customerId).filter((id) => id > 0);
    const [overrides, customerAvatarMap] = await Promise.all([
      defaultIosOverrideRepo.loadBookingOverridesBatch(demoBookingIds),
      defaultIosOverrideRepo.loadCustomerAvatarsBatch(demoCustomerIds),
    ]);

    const allDemoBookings = buildDemoModeBookings({
      overrides,
      customerAvatarMap,
      storeId,
      activeStaffId,
      canViewFullPhone,
    });

    const { effectiveList, counts } = applyIosScopeAndCounts(allDemoBookings, {
      effectiveRole,
      scope,
      activeStaffId,
    });

    const staffStats = buildDemoStaffMonthlyStats(allDemoBookings, activeStaffId, targetDate);

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
      count: effectiveList.length,
      bookings: effectiveList,
      staffStats,
      timestamp: new Date().toISOString(),
    };
  }

  const pool = getLegacyPool();
  const [{ orders, customerContext }, staffStats] = await Promise.all([
    fetchLiveOrderSnapshots(pool, { storeId, targetDate, limit }),
    fetchLiveStaffMonthlyStats(pool, activeStaffId, targetDate, (meta, msg) => fastify.log.warn(meta, msg)),
  ]);

  const liveOrderIds = orders.map((o) => o.id);
  const liveCustomerIds = Array.from(new Set(orders.map((o) => Number(o.user_id)).filter((id) => id > 0)));

  const [overrides, customerAvatarMap] = await Promise.all([
    defaultIosOverrideRepo.loadBookingOverridesBatch(liveOrderIds),
    defaultIosOverrideRepo.loadCustomerAvatarsBatch(liveCustomerIds),
  ]);

  const allMappedBookings = mapLiveOrdersToBookings({
    orders,
    customerContext,
    overrides,
    customerAvatarMap,
    storeId,
    targetDate,
    todayVn,
    activeStaffId,
    canViewFullPhone,
  });

  const { effectiveList, counts } = applyIosScopeAndCounts(allMappedBookings, {
    effectiveRole,
    scope,
    activeStaffId,
  });

  return {
    success: true,
    source: 'mysql_live',
    demoMode: false,
    storeId,
    segment,
    role: effectiveRole,
    scope,
    activeStaffId,
    targetDate,
    counts,
    count: effectiveList.length,
    bookings: effectiveList,
    staffStats,
    timestamp: new Date().toISOString(),
  };
}
