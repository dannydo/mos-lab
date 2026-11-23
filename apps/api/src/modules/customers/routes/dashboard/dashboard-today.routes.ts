import { FastifyInstance } from 'fastify';
import { SafeAny, shouldMaskCustomerPhone } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { fetchAndBuildDashboardTodayBase } from './dashboard-today-data.helper.js';
import { buildDashboardBranchesData } from './dashboard-today-branches.helper.js';

interface DashboardTodayResult {
  branchesData: Record<string, SafeAny>;
  bookingsCombo: SafeAny[];
  bookingsOc: SafeAny[];
  bookingsOther: SafeAny[];
}

interface DashboardTodayCacheEntry {
  data: DashboardTodayResult;
  expiresAt: number;
  staleUntil: number;
}

const dashboardTodayCache = new Map<string, DashboardTodayCacheEntry>();
const inFlightDashboardTodayPromises = new Map<string, Promise<DashboardTodayResult>>();

const MAX_DASHBOARD_CACHE_ENTRIES = 50;
function cleanDashboardTodayCache() {
  const now = Date.now();
  if (dashboardTodayCache.size > MAX_DASHBOARD_CACHE_ENTRIES) {
    for (const [key, entry] of dashboardTodayCache.entries()) {
      if (entry.staleUntil < now) {
        dashboardTodayCache.delete(key);
      }
    }
  }
}

async function computeDashboardToday(
  fastify: FastifyInstance,
  targetDateFrom: string,
  targetDateTo: string,
  endAt: string | undefined,
  canViewPhone: boolean
): Promise<DashboardTodayResult> {
  try {
    const base = await fetchAndBuildDashboardTodayBase({
      fastify,
      targetDateFrom,
      targetDateTo,
      endAt,
      canViewPhone,
    });

    const branchesData = await buildDashboardBranchesData({
      fastify,
      targetDateStr: targetDateFrom,
      canViewPhone,
      userProfiles: base.userProfiles,
      comingOrders: base.comingOrders,
      comingOrderIds: base.comingOrderIds,
      comingServices: base.comingServices,
      comingServiceIds: base.comingServiceIds,
      activeCcIds: base.activeCcIds,
      ccScheduleIds: base.ccScheduleIds,
      profileMap: base.profileMap,
      contactMap: base.contactMap,
      balancesByUserId: base.balancesByUserId,
      promoMap: base.promoMap,
      staffMap: base.staffMap,
      telesalesNames: base.telesalesNames,
      ccNoteByOrderId: base.ccNoteByOrderId,
      checkHasLiveCombo: base.checkHasLiveCombo,
    });

    return {
      branchesData,
      bookingsCombo: base.bookingsCombo,
      bookingsOc: base.bookingsOc,
      bookingsOther: base.bookingsOther,
    };
  } catch (error) {
    fastify.log.error(error, 'Compute dashboard today error:');
    throw error;
  }
}

export async function registerDashboardTodayRoutes(fastify: FastifyInstance) {
  // GET /api/dashboard/today - Real operational data for the "today" dashboard
  fastify.get('/dashboard/today', { preHandler: [requireAuth] }, async (request, reply) => {
    const { date, dateFrom, dateTo, endAt } = request.query as {
      date?: string;
      dateFrom?: string;
      dateTo?: string;
      endAt?: string;
    };
    const getVnDateStr = () => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    };
    const todayStr = getVnDateStr();
    const targetDateFrom = (dateFrom || date || todayStr).slice(0, 10);
    const targetDateTo = (dateTo || date || todayStr).slice(0, 10);
    const canViewPhone = !shouldMaskCustomerPhone(request.user?.role);
    const cacheKey = `dashboard:today:${targetDateFrom}:${targetDateTo}:${endAt || 'default'}:${canViewPhone ? 'full' : 'masked'}`;

    const now = Date.now();
    const isPastDate = targetDateTo < todayStr;
    const freshTtl = isPastDate ? 300_000 : 15_000; // 5 min for past, 15s for today
    const staleTtl = isPastDate ? 1_800_000 : 60_000; // 30 min for past, 60s for today

    cleanDashboardTodayCache();
    const cached = dashboardTodayCache.get(cacheKey);

    const triggerRevalidation = () => {
      const existing = inFlightDashboardTodayPromises.get(cacheKey);
      if (existing) return existing;
      const computePromise = computeDashboardToday(fastify, targetDateFrom, targetDateTo, endAt, canViewPhone)
        .then((result) => {
          const timestamp = Date.now();
          dashboardTodayCache.set(cacheKey, {
            data: result,
            expiresAt: timestamp + freshTtl,
            staleUntil: timestamp + staleTtl,
          });
          return result;
        })
        .finally(() => {
          inFlightDashboardTodayPromises.delete(cacheKey);
        });
      inFlightDashboardTodayPromises.set(cacheKey, computePromise);
      return computePromise;
    };

    if (cached) {
      if (cached.expiresAt > now) {
        reply.header('x-mos-cache', 'HIT');
        return reply.send(cached.data);
      }
      if (cached.staleUntil > now) {
        triggerRevalidation().catch((err) => {
          fastify.log.error(err, `Background computeDashboardToday failed for key ${cacheKey}`);
        });
        reply.header('x-mos-cache', 'STALE');
        return reply.send(cached.data);
      }
    }

    try {
      const pending = triggerRevalidation();
      const data = await pending;
      reply.header('x-mos-cache', 'MISS');
      return reply.send(data);
    } catch (error) {
      if (cached) {
        reply.header('x-mos-cache', 'ERROR-FALLBACK');
        return reply.send(cached.data);
      }
      fastify.log.error(error, 'Fetch dashboard today error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi tải dữ liệu vận hành hôm nay.',
      });
    }
  });
}
