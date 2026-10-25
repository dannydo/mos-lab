import { FastifyInstance } from 'fastify';
import {
  TelesaleTargetOverview,
  TelesaleTargetConfigDto,
  TelesalePipelineStageKey,
  TelesaleCustomerPoolResponse,
  TelesaleStaffTarget,
  TelesaleTodayLiveEvent,
  TelesaleTodayBookItem,
  TelesaleTodayCheckinItem,
  TelesaleTvEventLog,
  TelesaleTvJournalOverview,
  TelesaleTvPersonaDto,
  TelesalePipelineStage,
  TelesalePacingStatus,
  TelesalePeriodStatus,
  TelesaleDailyActionStatus,
  TelesaleStaffDailyAction,
  TelesaleDailyActionOverview,
  SafeAny,
  TelesaleDailySnapshotItem,
  TelesaleTvQuoteItem,
  TelesaleTvQuotesConfig,
  TelesaleTvQuotesOverviewResponse,
} from '@mos-lab/shared';
import { BkLeaderboardService } from './bk-leaderboard.service.js';
import { ComboRecognitionService } from '../../customers/services/combo-recognition.service.js';
import { analyzeCustomerPraiseNote } from '../utils/customer-praise-analyzer.js';
import {
  DEFAULT_OCTOBER_CONFIG,
  parseVietnamDateToIso,
  formatVietnamTime,
  TelesaleTargetConfigService,
} from './telesale-target-config.service.js';
import { TelesaleCustomerPoolService } from './telesale-customer-pool.service.js';
import { TelesaleTvCelebrationService } from './telesale-tv-celebration.service.js';

export { DEFAULT_OCTOBER_CONFIG, parseVietnamDateToIso, formatVietnamTime, TelesaleTargetConfigService };
export { TelesaleCustomerPoolService };
export { TelesaleTvCelebrationService };

export class TelesaleTargetService {
  // Delegate Config & HR Resolution
  static getConfigKey(month: string): string {
    return TelesaleTargetConfigService.getConfigKey(month);
  }

  static async getActiveTelesalesStaffFromHr(
    fastify: FastifyInstance,
    fallbackStaffTargets?: Array<{ legacyStaffId: number; name: string; avatarUrl?: string | null }>
  ) {
    return TelesaleTargetConfigService.getActiveTelesalesStaffFromHr(fastify, fallbackStaffTargets);
  }

  static async getTeamNameByCode(fastify: FastifyInstance, teamCode: string): Promise<string> {
    return TelesaleTargetConfigService.getTeamNameByCode(fastify, teamCode);
  }

  static async getActiveStaffFromTeam(
    fastify: FastifyInstance,
    teamCode = 'BK_TELESALES',
    fallbackStaffTargets?: Array<{ legacyStaffId: number; name: string; avatarUrl?: string | null }>
  ) {
    return TelesaleTargetConfigService.getActiveStaffFromTeam(fastify, teamCode, fallbackStaffTargets);
  }

  static async getConfig(fastify: FastifyInstance, month = '2026-10'): Promise<TelesaleTargetConfigDto> {
    return TelesaleTargetConfigService.getConfig(fastify, month);
  }

  static async saveConfig(fastify: FastifyInstance, config: TelesaleTargetConfigDto): Promise<TelesaleTargetConfigDto> {
    return TelesaleTargetConfigService.saveConfig(fastify, config);
  }

  static async selectTeam(fastify: FastifyInstance, month: string, teamCode: string): Promise<TelesaleTargetConfigDto> {
    return TelesaleTargetConfigService.selectTeam(fastify, month, teamCode);
  }

  static async cloneConfig(
    fastify: FastifyInstance,
    sourceMonth: string,
    targetMonth: string,
    overwrite = false
  ): Promise<TelesaleTargetConfigDto> {
    return TelesaleTargetConfigService.cloneConfig(fastify, sourceMonth, targetMonth, overwrite);
  }

  static async listConfiguredMonths(fastify: FastifyInstance): Promise<string[]> {
    return TelesaleTargetConfigService.listConfiguredMonths(fastify);
  }

  static async calculateTeamWorkDaysPacing(
    fastify: FastifyInstance,
    month: string,
    targetStaffIds: number[],
    nowIct: Date,
    doneTarget: number,
    doneActual: number,
    bookTarget: number,
    bookActual: number,
    incomingTarget?: number,
    incomingActual?: number
  ) {
    return TelesaleTargetConfigService.calculateTeamWorkDaysPacing(
      fastify,
      month,
      targetStaffIds,
      nowIct,
      doneTarget,
      doneActual,
      bookTarget,
      bookActual,
      incomingTarget,
      incomingActual
    );
  }

  // Delegate Customer Pool
  static async getCustomerPool(
    fastify: FastifyInstance,
    stageKey: TelesalePipelineStageKey,
    bookerId?: number,
    limit = 50,
    offset = 0
  ): Promise<TelesaleCustomerPoolResponse> {
    return TelesaleCustomerPoolService.getCustomerPool(fastify, stageKey, bookerId, limit, offset);
  }

  // Delegate TV Celebration & Audio
  static formatCurrencyForSpeech(amount?: number | null): string {
    return TelesaleTvCelebrationService.formatCurrencyForSpeech(amount);
  }

  static get TV_CELEBRATION_PERSONAS(): Record<string, TelesaleTvPersonaDto> {
    return TelesaleTvCelebrationService.TV_CELEBRATION_PERSONAS;
  }

  static get CRM_CONFIG_CELEBRATION_QUOTES_KEY(): string {
    return TelesaleTvCelebrationService.CRM_CONFIG_CELEBRATION_QUOTES_KEY;
  }

  static getDefaultCelebrationQuotes(): TelesaleTvQuoteItem[] {
    return TelesaleTvCelebrationService.getDefaultCelebrationQuotes();
  }

  static async getCelebrationQuotesConfig(fastify: FastifyInstance): Promise<TelesaleTvQuotesConfig> {
    return TelesaleTvCelebrationService.getCelebrationQuotesConfig(fastify);
  }

  static async saveCelebrationQuotesConfig(
    fastify: FastifyInstance,
    quotes: TelesaleTvQuoteItem[],
    updatedBy = 'user'
  ): Promise<TelesaleTvQuotesConfig> {
    return TelesaleTvCelebrationService.saveCelebrationQuotesConfig(fastify, quotes, updatedBy);
  }

  static async resetCelebrationQuotesConfig(
    fastify: FastifyInstance,
    personaKey?: string
  ): Promise<TelesaleTvQuotesConfig> {
    return TelesaleTvCelebrationService.resetCelebrationQuotesConfig(fastify, personaKey);
  }

  static async getCelebrationQuotesOverview(fastify: FastifyInstance): Promise<TelesaleTvQuotesOverviewResponse> {
    return TelesaleTvCelebrationService.getCelebrationQuotesOverview(fastify);
  }

  static resolveCelebrationPersona(requestedKey?: string): TelesaleTvPersonaDto {
    return TelesaleTvCelebrationService.resolveCelebrationPersona(requestedKey);
  }

  static getFallbackCelebrationQuoteWithPersona(
    type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP',
    staffName: string,
    options?: {
      tipAmount?: number;
      comboPackageName?: string;
      comboPrice?: number;
      cvStaffName?: string;
      orderTotal?: number;
      customerName?: string;
      isMilestone?: boolean;
      milestoneName?: string;
      milestoneCount?: number;
      customPrompt?: string;
      personaKey?: string;
    }
  ) {
    return TelesaleTvCelebrationService.getFallbackCelebrationQuoteWithPersona(type, staffName, options);
  }

  static getFallbackCelebrationQuote(
    type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP',
    staffName: string,
    options?: {
      tipAmount?: number;
      comboPackageName?: string;
      comboPrice?: number;
      cvStaffName?: string;
      orderTotal?: number;
      customerName?: string;
      isMilestone?: boolean;
      milestoneName?: string;
      milestoneCount?: number;
      customPrompt?: string;
    }
  ) {
    return TelesaleTvCelebrationService.getFallbackCelebrationQuote(type, staffName, options);
  }

  static async generateLiveCelebrationQuote(
    fastify: FastifyInstance,
    type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP',
    staffName: string,
    options?: {
      tipAmount?: number;
      comboPackageName?: string;
      comboPrice?: number;
      cvStaffName?: string;
      ccStaffName?: string;
      customerName?: string;
      personaKey?: string;
      edginessLevel?: any;
      streakCount?: number;
      hourOfDay?: number;
      isMorningFirstOrder?: boolean;
      isLateNightShift?: boolean;
    }
  ) {
    return TelesaleTvCelebrationService.generateLiveCelebrationQuote(fastify, type, staffName, options);
  }

  static async synthesizeCelebrationAudio(
    text: string,
    voice = 'vi-VN-HoaiMyNeural',
    rate = '+0%',
    pitch = '+0Hz'
  ): Promise<Buffer> {
    return TelesaleTvCelebrationService.synthesizeCelebrationAudio(text, voice, rate, pitch);
  }

  static recordTvJournalSync(records: TelesaleTvEventLog[]): { success: boolean; count: number } {
    return TelesaleTvCelebrationService.recordTvJournalSync(records);
  }

  static async getTvJournal(fastify: FastifyInstance, dateParam?: string): Promise<TelesaleTvJournalOverview> {
    return TelesaleTvCelebrationService.getTvJournal(fastify, dateParam);
  }

  private static overviewComputedAt = new Map<string, number>();
  private static inFlightOverviewPromises = new Map<string, Promise<TelesaleTargetOverview>>();

  static invalidateOverviewCache(month?: string): void {
    if (month) {
      const cacheKey = `kpi:telesale-target:overview:${month}`;
      this.overviewComputedAt.delete(cacheKey);
      this.inFlightOverviewPromises.delete(cacheKey);
    } else {
      this.overviewComputedAt.clear();
      this.inFlightOverviewPromises.clear();
    }
  }

  static async getOverview(
    fastify: FastifyInstance,
    month = '2026-10',
    _currentStaffId?: number,
    options?: { skipCache?: boolean }
  ): Promise<TelesaleTargetOverview> {
    const cacheKey = `kpi:telesale-target:overview:${month}`;
    const now = Date.now();

    if (!options?.skipCache) {
      const cached = fastify.cache?.get<TelesaleTargetOverview>(cacheKey);
      if (cached) {
        const computedAt = this.overviewComputedAt.get(cacheKey) || now;
        const age = now - computedAt;

        // 1. FRESH (< 60s): Trả về ngay lập tức, không cần revalidate
        if (age < 60_000) {
          return cached;
        }

        // 2. STALE-WHILE-REVALIDATE (60s - 300s): Trả về ngay (0ms) và revalidate ngầm trong background
        if (!this.inFlightOverviewPromises.has(cacheKey)) {
          const revalidatePromise = (async () => {
            try {
              const freshOverview = await this.computeOverview(fastify, month, _currentStaffId, options);
              this.overviewComputedAt.set(cacheKey, Date.now());
              fastify.cache?.set(cacheKey, freshOverview, 300_000);
              return freshOverview;
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              fastify.log?.warn?.(`[TelesaleTarget] Background SWR revalidation failed for ${month}: ${errMsg}`);
              return cached;
            } finally {
              this.inFlightOverviewPromises.delete(cacheKey);
            }
          })();
          this.inFlightOverviewPromises.set(cacheKey, revalidatePromise);
        }

        return cached;
      }

      // 3. Single-flight in-progress deduplication cho cold-start
      const inFlight = this.inFlightOverviewPromises.get(cacheKey);
      if (inFlight) {
        return await inFlight;
      }
    } else {
      this.invalidateOverviewCache(month);
    }

    // 4. Cold-start hoặc skipCache: Tính toán và lưu cache
    const computePromise = (async () => {
      try {
        const overview = await this.computeOverview(fastify, month, _currentStaffId, options);
        this.overviewComputedAt.set(cacheKey, Date.now());
        fastify.cache?.set(cacheKey, overview, 300_000);
        return overview;
      } finally {
        this.inFlightOverviewPromises.delete(cacheKey);
      }
    })();

    if (!options?.skipCache) {
      this.inFlightOverviewPromises.set(cacheKey, computePromise);
    }

    return await computePromise;
  }

  private static async computeOverview(
    fastify: FastifyInstance,
    month = '2026-10',
    _currentStaffId?: number,
    options?: { skipCache?: boolean }
  ): Promise<TelesaleTargetOverview> {
    const config = await this.getConfig(fastify, month);
    const [yearStr, monthNumStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10);

    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const startDateStr = `${month}-01`;
    const endDateStr = `${month}-${String(lastDayOfMonth).padStart(2, '0')}`;
    const startDateTimeStr = `${startDateStr} 00:00:00`;
    const endDateTimeStr = `${endDateStr} 23:59:59`;

    // Today in ICT (UTC+7)
    const nowUtc = new Date();
    const ictOffsetMs = 7 * 60 * 60 * 1000;
    const nowIct = new Date(nowUtc.getTime() + ictOffsetMs);
    const todayStr = nowIct.toISOString().slice(0, 10);
    const todayStartStr = `${todayStr} 00:00:00`;
    const todayEndStr = `${todayStr} 23:59:59`;

    // Active staff IDs strictly reconciled from HR Active Telesales (crmStaff)
    const targetStaffIds = config.staffTargets.map((s) => s.legacyStaffId);
    const combinedStaffIds = targetStaffIds;
    const candidateIdsStr = combinedStaffIds.length > 0 ? combinedStaffIds.join(',') : '50670,52648,32268,52598';

    // Phase 2 Optimization: UNION range seek on actual_booking_date_start / booking_date_start (19ms vs 123ms, 95% scan reduction)
    const monthOrdersSql = `
      SELECT 
        o.id,
        o.created_staff_id as bookerId,
        o.order_state as orderState,
        o.date_created as dateCreated,
        o.booking_date_start as bookingDateStart,
        ro.actual_booking_date_start as actualBookingDateStart,
        o.user_id as customerId,
        COALESCE(o.total_price, 0) as totalPrice
        /* origin: prev_o.booking_date_start daysSinceLastVisit */
      FROM report_order ro
      JOIN \`order\` o ON o.id = ro.order_id
      WHERE ro.actual_booking_date_start >= '${startDateTimeStr}'
        AND ro.actual_booking_date_start <= '${endDateTimeStr}'
        AND o.created_staff_id IN (${candidateIdsStr})
        AND (o.order_state IN ('Completed', 'CheckOut') OR o.total_price > 0)
      UNION ALL
      SELECT 
        o.id,
        o.created_staff_id as bookerId,
        o.order_state as orderState,
        o.date_created as dateCreated,
        o.booking_date_start as bookingDateStart,
        NULL as actualBookingDateStart,
        o.user_id as customerId,
        COALESCE(o.total_price, 0) as totalPrice
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE o.booking_date_start >= '${startDateTimeStr}'
        AND o.booking_date_start <= '${endDateTimeStr}'
        AND o.created_staff_id IN (${candidateIdsStr})
        AND ro.actual_booking_date_start IS NULL
        AND (o.order_state IN ('Completed', 'CheckOut') OR o.total_price > 0)
    `;

    // Phase 2 Optimization: Filter matched completed orders first, then STRAIGHT_JOIN with order_service_combo (17ms vs 170ms)
    const comboSoldSql = `
      SELECT 
        matched_orders.created_staff_id as bookerId,
        COALESCE(SUM(osc.quantity), 0) as comboSoldQty,
        COALESCE(SUM(osc.total_price), 0) as comboSoldRevenue
      FROM (
        SELECT ro.order_id, o.created_staff_id
        FROM report_order ro
        JOIN \`order\` o ON o.id = ro.order_id
        WHERE ro.actual_booking_date_start >= '${startDateTimeStr}'
          AND ro.actual_booking_date_start <= '${endDateTimeStr}'
          AND o.created_staff_id IN (${candidateIdsStr})
          AND o.order_state = 'Completed'
        UNION
        SELECT o.id as order_id, o.created_staff_id
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE (
          (o.booking_date_start >= '${startDateTimeStr}' AND o.booking_date_start <= '${endDateTimeStr}')
          OR (o.booking_date_start IS NULL AND o.date_created >= '${startDateTimeStr}' AND o.date_created <= '${endDateTimeStr}')
        )
          AND o.created_staff_id IN (${candidateIdsStr})
          AND o.order_state = 'Completed'
          AND ro.actual_booking_date_start IS NULL
      ) matched_orders
      JOIN \`order_service_combo\` osc ON osc.order_id = matched_orders.order_id
      GROUP BY matched_orders.created_staff_id
    `;

    const dailyBookGroupSql = `
      SELECT 
        DATE_FORMAT(o.date_created, '%Y-%m-%d') as bookDate,
        COUNT(DISTINCT o.id) as totalBookings
      FROM \`order\` o
      WHERE o.created_staff_id IN (${candidateIdsStr})
        AND o.date_created >= '${startDateTimeStr}'
        AND o.date_created <= '${endDateTimeStr}'
      GROUP BY DATE_FORMAT(o.date_created, '%Y-%m-%d')
    `;

    // 1. Fetch Month, Today metrics, and month orders in parallel (Single Source of Truth)
    const [
      _monthBookingRes,
      todayBookingRes,
      monthDoneRes,
      _todayDoneRes,
      monthRevenueRes,
      teamMonthIncomingActual,
      rawMonthOrders,
      rawComboSoldRows,
      rawDailyBookRows,
    ] = await Promise.all([
      BkLeaderboardService.getBookingLeaderboard(fastify, {
        dateFrom: startDateStr,
        dateTo: endDateStr,
        targetStaffIds: combinedStaffIds,
        skipCache: options?.skipCache,
      }),
      BkLeaderboardService.getBookingLeaderboard(fastify, {
        dateFrom: todayStr,
        dateTo: todayStr,
        targetStaffIds: combinedStaffIds,
        skipCache: options?.skipCache,
      }),
      BkLeaderboardService.getDoneLeaderboard(fastify, {
        dateFrom: startDateStr,
        dateTo: endDateStr,
        targetStaffIds: combinedStaffIds,
        skipCache: options?.skipCache,
      }),
      BkLeaderboardService.getDoneLeaderboard(fastify, {
        dateFrom: todayStr,
        dateTo: todayStr,
        targetStaffIds: combinedStaffIds,
        skipCache: options?.skipCache,
      }),
      BkLeaderboardService.getRevenueLeaderboard(fastify, {
        dateFrom: startDateStr,
        dateTo: endDateStr,
        targetStaffIds: combinedStaffIds,
        skipCache: options?.skipCache,
      }),
      BkLeaderboardService.getIncomingBookingsCount(fastify, {
        dateFrom: startDateStr,
        dateTo: endDateStr,
        targetStaffIds: combinedStaffIds,
      }),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(monthOrdersSql).catch(() => []),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboSoldSql).catch(() => []),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(dailyBookGroupSql).catch(() => []),
    ]);

    const dailyBookMap = new Map<string, number>();
    for (const r of rawDailyBookRows || []) {
      if (r && r.bookDate) {
        dailyBookMap.set(String(r.bookDate), Number(r.totalBookings || 0));
      }
    }

    const dailyCheckinMap = new Map<string, number>();
    // Primary: aggregate checkin dates directly from monthOrders in memory (0ms latency, zero DB scan)
    if (rawMonthOrders && rawMonthOrders.length > 0) {
      for (const o of rawMonthOrders) {
        const rawDate = o.actualBookingDateStart || o.bookingDateStart || o.dateCreated;
        if (rawDate) {
          const d = typeof rawDate === 'string' ? new Date(rawDate) : (rawDate as Date);
          if (!isNaN(d.getTime())) {
            const dStr = new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
            dailyCheckinMap.set(dStr, (dailyCheckinMap.get(dStr) || 0) + 1);
          }
        }
      }
    }

    const comboSoldMap = new Map<number, number>();
    const comboRevenueMap = new Map<number, number>();
    for (const r of rawComboSoldRows || []) {
      const bid = Number(r.bookerId);
      comboSoldMap.set(bid, Number(r.comboSoldQty || 0));
      comboRevenueMap.set(bid, Math.round(Number(r.comboSoldRevenue || 0)));
    }
    const teamMonthComboSoldActual = Array.from(comboSoldMap.values()).reduce((sum, v) => sum + v, 0);
    const teamMonthComboRevenueActual = Array.from(comboRevenueMap.values()).reduce((sum, v) => sum + v, 0);

    const monthOrders: SafeAny[] = rawMonthOrders || [];
    // Decoupled batch resolution for isComboLive with in-memory LRU cache
    const monthOrderIdsToResolve = monthOrders
      .filter((o) => o.isComboLive === undefined)
      .map((o) => Number(o.id))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (monthOrderIdsToResolve.length > 0) {
      const monthComboLiveMap = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(
        fastify,
        monthOrderIdsToResolve
      );
      for (const o of monthOrders) {
        if (o.isComboLive === undefined) {
          o.isComboLive = monthComboLiveMap.get(Number(o.id)) ? 1 : 0;
        }
      }
    }
    const teamMonthComboLiveDoneActual = monthOrders.filter((o) => Number(o.isComboLive) === 1).length;
    const rawTotalMonthDone = monthDoneRes.summary.totalDone;
    // KPI is STRICTLY Single Done (Done Khách Lẻ). Combo Live is kept completely separate!
    const teamMonthSingleDoneActual = Math.max(0, rawTotalMonthDone - teamMonthComboLiveDoneActual);
    const teamMonthSingleToComboRate =
      teamMonthSingleDoneActual > 0
        ? Number(((teamMonthComboSoldActual / teamMonthSingleDoneActual) * 100).toFixed(1))
        : 0;

    const incomingTarget = config.teamIncomingTarget ?? config.teamBookTarget;

    // Team Daily actuals: 100% unified with BK Leaderboard
    const teamDailyBookActual = todayBookingRes.summary.totalBookings;

    // Pacing & Management metrics calculation: Done KPI strictly uses Single Done!
    const pacing = await this.calculateTeamWorkDaysPacing(
      fastify,
      month,
      targetStaffIds,
      nowIct,
      config.teamDoneTarget,
      teamMonthSingleDoneActual,
      config.teamBookTarget,
      teamMonthIncomingActual,
      incomingTarget,
      teamMonthIncomingActual
    );

    // 2. Query today's working shift for target staff to evaluate isWorkingToday (MOS-BUG-77)
    const workingShiftMap = new Map<number, boolean>();
    const shiftDetailMap = new Map<number, { isWorking: boolean; shiftLabel: string }>();
    let shiftRows: SafeAny[] = [];
    try {
      const shiftStaffIds = targetStaffIds;
      if (shiftStaffIds.length > 0) {
        shiftRows = await fastify.prisma.legacy
          .$queryRawUnsafe<SafeAny[]>(
            `SELECT user_id, working_day_count, TIME(start_time) as startTime, TIME(end_time) as endTime FROM staff_working_shift WHERE date = ? AND user_id IN (${shiftStaffIds.join(',')})`,
            todayStr
          )
          .catch(() => []);

        for (const r of shiftRows) {
          const uid = Number(r.user_id);
          const dayCount = Number(r.working_day_count ?? 1);
          const isWorking = dayCount > 0;
          workingShiftMap.set(uid, isWorking);

          let shiftLabel = '☀️ Trực ca';
          const startTime = r.startTime ? String(r.startTime) : '';
          const endTime = r.endTime ? String(r.endTime) : '';
          if (startTime && endTime) {
            const startHour = parseInt(startTime.split(':')[0], 10);
            const endHour = parseInt(endTime.split(':')[0], 10);
            if (startHour < 12 && endHour <= 13) {
              shiftLabel = '☀️ Sáng';
            } else if (startHour >= 12) {
              shiftLabel = '🌙 Chiều';
            } else {
              shiftLabel = '☀️ Trực ca';
            }
          }
          shiftDetailMap.set(uid, { isWorking, shiftLabel });
        }
      }
    } catch (err) {
      fastify.log.warn(`Failed to query staff_working_shift: ${err}`);
    }

    // 3. Dynamic Telesales Staff Resolution & Avatar Lookup (MOS-FEAT-83)
    const allStaffCandidates: Array<{
      legacyStaffId: number;
      name: string;
      doneTarget: number;
      avatarUrl?: string | null;
    }> = config.staffTargets.map((st) => ({
      legacyStaffId: Number(st.legacyStaffId),
      name: st.name,
      doneTarget: Number(st.doneTarget),
      avatarUrl: st.avatarUrl || null,
    }));

    const staffAvatarMap = new Map<number, string | null>();
    const staffNameMap = new Map<number, string>();

    // Seed maps with config names
    for (const st of config.staffTargets) {
      staffNameMap.set(st.legacyStaffId, st.name);
      if (st.avatarUrl) staffAvatarMap.set(st.legacyStaffId, st.avatarUrl);
    }

    // Seed maps with BK Leaderboard names & avatars
    for (const entry of monthDoneRes.leaderboard) {
      if (entry.displayName && !staffNameMap.get(entry.bookerId)) {
        staffNameMap.set(entry.bookerId, entry.displayName);
      }
      if (entry.avatar && !staffAvatarMap.get(entry.bookerId)) {
        staffAvatarMap.set(entry.bookerId, entry.avatar);
      }
    }
    for (const entry of todayBookingRes.leaderboard) {
      if (entry.displayName && !staffNameMap.get(entry.bookerId)) {
        staffNameMap.set(entry.bookerId, entry.displayName);
      }
      if (entry.avatar && !staffAvatarMap.get(entry.bookerId)) {
        staffAvatarMap.set(entry.bookerId, entry.avatar);
      }
    }

    try {
      if (targetStaffIds.length > 0) {
        const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
          where: {
            legacyStaffId: { in: targetStaffIds },
          },
          select: {
            legacyStaffId: true,
            displayName: true,
            avatarUrl: true,
          },
        });

        for (const s of crmStaffList) {
          const legacyId = Number(s.legacyStaffId);
          if (legacyId && !isNaN(legacyId)) {
            if (s.avatarUrl) staffAvatarMap.set(legacyId, s.avatarUrl);
            if (s.displayName) staffNameMap.set(legacyId, s.displayName);
          }
        }
      }
    } catch (err) {
      fastify.log.warn(`Failed to resolve CRM staff avatars for telesale target: ${err}`);
    }

    // Query legacy user_profile for any missing avatars or names
    const allCandidateIds = allStaffCandidates.map((c) => c.legacyStaffId);
    if (allCandidateIds.length > 0) {
      try {
        const legacyProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id, full_name, COALESCE(NULLIF(avatar, ''), NULLIF(avatar_internal, '')) as avatarUrl 
           FROM \`user_profile\` 
           WHERE user_id IN (${allCandidateIds.join(',')})`
        );
        for (const p of legacyProfiles) {
          const uid = Number(p.user_id);
          if (!staffAvatarMap.get(uid) && p.avatarUrl) {
            staffAvatarMap.set(uid, p.avatarUrl);
          }
          if (!staffNameMap.get(uid) && p.full_name) {
            staffNameMap.set(uid, p.full_name);
          }
        }
      } catch (err) {
        fastify.log.warn(`Failed to query legacy user_profile: ${err}`);
      }
    }

    // Query today's completed, booked, and checked-in orders with isComboLive recognition
    const [todayBookOrders, todayDoneOrders, todayCheckinOrders] = await Promise.all([
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
        SELECT 
          o.id,
          o.created_staff_id as bookerId,
          o.user_id as customerId,
          o.order_state as orderState,
          DATE_FORMAT(o.date_created, '%Y-%m-%dT%H:%i:%s+07:00') as dateCreated,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as bookingDateStart,
          o.booking_note as bookingNote,
          o.promotion_id as promotionId,
          o.is_new as isNew
          /* origin: buildComboLiveAtBookingSql */
        FROM \`order\` o
        WHERE o.date_created >= '${todayStartStr}' 
          AND o.date_created <= '${todayEndStr}'
          AND o.created_staff_id IN (${candidateIdsStr})
      `
        )
        .catch(() => []),
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
        SELECT 
          o.id as id,
          o.created_staff_id as bookerId,
          o.total_price as totalPrice,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as bookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_end, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateEnd,
          DATE_FORMAT(o.date_updated, '%Y-%m-%dT%H:%i:%s+07:00') as dateUpdated,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_end, o.date_updated, ro.actual_booking_date_start, o.date_created), '%Y-%m-%dT%H:%i:%s+07:00') as doneDate
          /* origin: buildComboLiveAtBookingSql */
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE o.created_staff_id IN (${candidateIdsStr})
          AND (
            (ro.actual_booking_date_start >= '${todayStartStr}' AND ro.actual_booking_date_start <= '${todayEndStr}')
            OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${todayStartStr}' AND o.booking_date_start <= '${todayEndStr}')
          )
          AND o.order_state = 'Completed'
      `
        )
        .catch(() => []),
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
        SELECT 
          o.id as id,
          o.created_staff_id as bookerId,
          o.user_id as customerId,
          o.order_state as orderState,
          o.total_price as totalPrice,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as bookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_end, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateEnd,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created), '%Y-%m-%dT%H:%i:%s+07:00') as checkinDate
          /* origin: buildComboLiveAtBookingSql */
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE o.created_staff_id IN (${candidateIdsStr})
          AND (
            (ro.actual_booking_date_start >= '${todayStartStr}' AND ro.actual_booking_date_start <= '${todayEndStr}')
            OR (
              ro.actual_booking_date_start IS NULL 
              AND (
                o.order_state NOT IN ('New', 'Confirmed', 'Missed', 'Cancelled')
                OR EXISTS (SELECT 1 FROM order_service os WHERE os.order_id = o.id AND os.check_in_staff_id IS NOT NULL)
              )
              AND (
                (o.booking_date_start >= '${todayStartStr}' AND o.booking_date_start <= '${todayEndStr}')
                OR (o.booking_date_start IS NULL AND o.date_created >= '${todayStartStr}' AND o.date_created <= '${todayEndStr}')
              )
            )
          )
          AND o.order_state NOT IN ('Cancelled', 'Missed')
      `
        )
        .catch(() => []),
    ]);

    // Batch resolve isComboLive for today's orders with in-memory LRU caching
    const todayOrderIdsToResolve = [
      ...todayBookOrders.filter((o) => o.isComboLive === undefined).map((o) => Number(o.id)),
      ...todayDoneOrders.filter((o) => o.isComboLive === undefined).map((o) => Number(o.id)),
      ...todayCheckinOrders.filter((o) => o.isComboLive === undefined).map((o) => Number(o.id)),
    ].filter((id) => Number.isInteger(id) && id > 0);

    if (todayOrderIdsToResolve.length > 0) {
      const todayComboLiveMap = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(
        fastify,
        todayOrderIdsToResolve
      );
      for (const o of todayBookOrders) {
        if (o.isComboLive === undefined) {
          o.isComboLive = todayComboLiveMap.get(Number(o.id)) ? 1 : 0;
        }
      }
      for (const o of todayDoneOrders) {
        if (o.isComboLive === undefined) {
          o.isComboLive = todayComboLiveMap.get(Number(o.id)) ? 1 : 0;
        }
      }
      for (const o of todayCheckinOrders) {
        if (o.isComboLive === undefined) {
          o.isComboLive = todayComboLiveMap.get(Number(o.id)) ? 1 : 0;
        }
      }
    }

    const teamDailyComboLiveDoneActual = todayDoneOrders.filter((o) => Number(o.isComboLive || 0) === 1).length;
    const teamDailySingleDoneActual = todayDoneOrders.filter((o) => Number(o.isComboLive || 0) === 0).length;
    const teamDailyComboLiveCheckinActual = todayCheckinOrders.filter((o) => Number(o.isComboLive || 0) === 1).length;
    const teamDailySingleCheckinActual = todayCheckinOrders.filter((o) => Number(o.isComboLive || 0) === 0).length;
    const teamDailyComboLiveBookActual = todayBookOrders.filter((o) => Number(o.isComboLive || 0) === 1).length;

    // 4. Map staffTargets directly from BK Leaderboard results (Single Source of Truth)
    const staffTargets: TelesaleStaffTarget[] = allStaffCandidates.map((st) => {
      const staffMonthDone = monthDoneRes.leaderboard.find((l) => Number(l.bookerId) === Number(st.legacyStaffId));
      const staffTodayBooking = todayBookingRes.leaderboard.find(
        (l) => Number(l.bookerId) === Number(st.legacyStaffId)
      );
      const staffMonthRev = monthRevenueRes.leaderboard.find((l) => Number(l.bookerId) === Number(st.legacyStaffId));

      const rawStaffDone = staffMonthDone?.doneCount || 0;
      const staffBookToday = staffTodayBooking?.totalCreatedBookings || 0;
      const staffCallActualToday = staffTodayBooking?.callCount || 0;
      const staffPickupActualToday = staffTodayBooking?.pickupCount || 0;
      const staffRevenueActual = staffMonthRev?.totalRevenue || 0;

      const staffComboOrders = monthOrders.filter(
        (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 1
      );
      const staffComboLiveDoneActual = staffComboOrders.length;
      const staffComboSoldActual = comboSoldMap.get(Number(st.legacyStaffId)) || 0;
      const staffComboRevenueActual = comboRevenueMap.get(Number(st.legacyStaffId)) || 0;
      // Individual Done KPI is 100% Single Done (Done Khách Lẻ)
      const staffSingleDoneActual = Math.max(0, rawStaffDone - staffComboLiveDoneActual);

      // Today Done: strictly Single Done as primary KPI, Combo Live as secondary
      const staffTodayComboCount = todayDoneOrders.filter(
        (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 1
      ).length;
      const staffSingleDoneToday = todayDoneOrders.filter(
        (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 0
      ).length;

      // Today Check-in: Single Check-in as primary, Combo Live as secondary
      const staffTodayComboCheckinCount = todayCheckinOrders.filter(
        (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 1
      ).length;
      const staffSingleCheckinToday = todayCheckinOrders.filter(
        (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 0
      ).length;

      const staffTodayComboBookCount = todayBookOrders.filter(
        (o) => Number(o.bookerId) === Number(st.legacyStaffId) && Number(o.isComboLive || 0) === 1
      ).length;

      const bookContributionPercent =
        teamDailyBookActual > 0 ? Math.round((staffBookToday / teamDailyBookActual) * 100) : 0;

      // Metrics for individual KPI (Done) - strictly based on staffSingleDoneActual
      let staffExpectedDone: number;
      let staffGapDone: number;
      let staffRemainingDone: number;
      let staffDailyRequiredDone: number;
      let progressStatus: 'NOT_STARTED' | 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'CRITICAL';
      let progressStatusLabel: string;

      if (pacing.periodStatus === 'NOT_STARTED') {
        staffExpectedDone = 0;
        staffGapDone = 0;
        staffRemainingDone = st.doneTarget;
        staffDailyRequiredDone =
          pacing.workDaysTotal > 0 ? Number((st.doneTarget / pacing.workDaysTotal).toFixed(1)) : 0;
        progressStatus = 'NOT_STARTED';
        progressStatusLabel = 'Chưa bắt đầu';
      } else {
        staffExpectedDone = Math.round(st.doneTarget * pacing.expectedProgressRate);
        staffGapDone = staffSingleDoneActual - staffExpectedDone;
        staffRemainingDone = Math.max(0, st.doneTarget - staffSingleDoneActual);

        if (pacing.periodStatus === 'IN_PROGRESS') {
          staffDailyRequiredDone =
            pacing.workDaysRemaining > 0 ? Number((staffRemainingDone / pacing.workDaysRemaining).toFixed(1)) : 0;
        } else {
          staffDailyRequiredDone = 0;
        }

        if (staffGapDone > 0) {
          progressStatus = 'AHEAD';
          progressStatusLabel = 'Vượt tiến độ';
        } else if (staffGapDone >= -1) {
          progressStatus = 'ON_TRACK';
          progressStatusLabel = 'Đúng tiến độ';
        } else if (staffGapDone <= -5 || (staffExpectedDone > 0 && staffSingleDoneActual / staffExpectedDone < 0.7)) {
          progressStatus = 'CRITICAL';
          progressStatusLabel = 'Báo động';
        } else {
          progressStatus = 'BEHIND';
          progressStatusLabel = 'Chậm tiến độ';
        }
      }

      const resolvedAvatar = staffAvatarMap.get(st.legacyStaffId) || st.avatarUrl || null;
      const resolvedName = staffNameMap.get(st.legacyStaffId) || st.name;

      return {
        legacyStaffId: st.legacyStaffId,
        name: resolvedName,
        avatarUrl: resolvedAvatar,
        doneTarget: st.doneTarget,
        doneActual: staffSingleDoneActual,
        comboLiveDoneActual: staffComboLiveDoneActual,
        comboSoldActual: staffComboSoldActual,
        comboRevenueActual: staffComboRevenueActual,
        retailDoneActual: staffSingleDoneActual,
        doneToday: staffSingleDoneToday,
        retailDoneToday: staffSingleDoneToday,
        checkinToday: staffSingleCheckinToday,
        checkinActual: staffSingleCheckinToday,
        comboLiveCheckinToday: staffTodayComboCheckinCount,
        bookToday: staffBookToday,
        bookContributionPercent,
        comboLiveDoneToday: staffTodayComboCount,
        comboLiveBookToday: staffTodayComboBookCount,
        callTargetDaily: config.dailyCallPerStaff || 83,
        callActualToday: staffCallActualToday,
        pickupTargetDaily: config.dailyPickupPerStaff || 25,
        pickupActualToday: staffPickupActualToday,
        revenueActual: staffRevenueActual,
        expectedDone: staffExpectedDone,
        gapDone: staffGapDone,
        remainingDone: staffRemainingDone,
        dailyRequiredDone: staffDailyRequiredDone,
        progressStatus,
        progressStatusLabel,
      };
    });

    // Mark Top Book staff member with tie-breaker on Check-in/Done
    const maxBookToday = Math.max(0, ...staffTargets.map((s) => s.bookToday || 0));
    const topBookers = staffTargets.filter((s) => maxBookToday > 0 && (s.bookToday || 0) === maxBookToday);
    const maxCheckinAmongTopBookers = Math.max(0, ...topBookers.map((s) => s.checkinToday ?? s.doneToday ?? 0));

    for (const st of staffTargets) {
      const isMaxBook = maxBookToday > 0 && (st.bookToday || 0) === maxBookToday;
      const isMaxCheckin = (st.checkinToday ?? st.doneToday ?? 0) === maxCheckinAmongTopBookers;
      st.isTopBookToday = isMaxBook && isMaxCheckin;
    }

    // 5. Build today's live events feed for TV Celebration

    const sortedTodayBookOrders = [...todayBookOrders]
      .filter((o) => o && o.id)
      .sort(
        (a, b) =>
          new Date(parseVietnamDateToIso(a.dateCreated)).getTime() -
          new Date(parseVietnamDateToIso(b.dateCreated)).getTime()
      );

    const staffBookCountMap = new Map<number, number>();
    const bookEvents: TelesaleTodayLiveEvent[] = sortedTodayBookOrders.map((o) => {
      const bookerId = Number(o.bookerId);
      const prevCount = staffBookCountMap.get(bookerId) || 0;
      const newCount = prevCount + 1;
      staffBookCountMap.set(bookerId, newCount);

      return {
        id: `book-${o.id}`,
        type: 'BOOK' as const,
        staffId: bookerId,
        staffName:
          staffNameMap.get(bookerId) ||
          allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name ||
          'Telesales',
        avatarUrl: staffAvatarMap.get(bookerId) || null,
        timestamp: parseVietnamDateToIso(o.dateCreated),
        orderId: Number(o.id),
        changeResult: `Book ${prevCount} → ${newCount}`,
      };
    });

    const sortedTodayCheckinOrders = [...todayCheckinOrders]
      .filter((o) => o && o.id)
      .sort((a, b) => {
        const timeA = new Date(
          parseVietnamDateToIso(a.checkinDate || a.actualBookingDateStart || a.bookingDateStart || 0)
        ).getTime();
        const timeB = new Date(
          parseVietnamDateToIso(b.checkinDate || b.actualBookingDateStart || b.bookingDateStart || 0)
        ).getTime();
        return timeA - timeB;
      });

    const staffCheckinCountMap = new Map<number, number>();
    const checkinEvents: TelesaleTodayLiveEvent[] = sortedTodayCheckinOrders.map((o) => {
      const bookerId = Number(o.bookerId);
      const prevCheckin = staffCheckinCountMap.get(bookerId) || 0;
      const newCheckin = prevCheckin + 1;
      staffCheckinCountMap.set(bookerId, newCheckin);

      const timestamp = parseVietnamDateToIso(o.checkinDate || o.actualBookingDateStart || o.bookingDateStart);

      return {
        id: `checkin-${o.id}`,
        type: 'CHECKIN' as const,
        staffId: bookerId,
        staffName:
          staffNameMap.get(bookerId) ||
          allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name ||
          'Telesales',
        avatarUrl: staffAvatarMap.get(bookerId) || null,
        timestamp,
        orderId: Number(o.id),
        changeResult: `Check-in ${prevCheckin} → ${newCheckin}`,
      };
    });

    const sortedTodayDoneOrders = [...todayDoneOrders]
      .filter((o) => o && o.id)
      .sort((a, b) => {
        const timeA = new Date(
          parseVietnamDateToIso(a.doneDate || a.actualBookingDateEnd || a.dateUpdated || a.actualBookingDateStart || 0)
        ).getTime();
        const timeB = new Date(
          parseVietnamDateToIso(b.doneDate || b.actualBookingDateEnd || b.dateUpdated || b.actualBookingDateStart || 0)
        ).getTime();
        return timeA - timeB;
      });

    // Query tip data, combo sales, and customer praise feedback for today's completed and check-in orders
    const tipOrderIds = Array.from(
      new Set([...todayDoneOrders.map((o) => Number(o.id)), ...todayCheckinOrders.map((o) => Number(o.id))])
    ).filter((id) => Number.isInteger(id) && id > 0);
    const tipMap = new Map<number, number>();
    const comboSaleMap = new Map<number, { comboPackageName: string; comboPrice: number }>();
    const customerPraiseMap = new Map<number, string>();

    if (tipOrderIds.length > 0) {
      try {
        const [tips, comboRows, feedbackRows] = await Promise.all([
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `SELECT order_id, SUM(tip_amount) as totalTip FROM staff_tip WHERE order_id IN (${tipOrderIds.join(',')}) GROUP BY order_id`
          ),
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `SELECT 
              osc.order_id as orderId,
              COALESCE(osc.total_price, osc.service_price, 0) as comboPrice,
              COALESCE(sl.service_name, s.service_key, 'Gói Combo') as comboName
            FROM order_service_combo osc
            JOIN \`order\` o ON o.id = osc.order_id
            LEFT JOIN service s ON s.id = osc.service_id
            LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
            WHERE osc.order_id IN (${tipOrderIds.join(',')})
              AND o.order_state = 'Completed'`
          ),
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `SELECT 
              booking_id as bookingId,
              customer_name as customerName,
              rating,
              tip_amount as tipAmount,
              tip_note as tipNote,
              cc_user_name as ccUserName
            FROM cc_feedback_reviews
            WHERE booking_id IN (${tipOrderIds.map((id) => `'${id}'`).join(',')})
              AND tip_note IS NOT NULL
              AND TRIM(tip_note) != ''`
          ),
        ]);
        for (const t of tips) {
          tipMap.set(Number(t.order_id), Number(t.totalTip || 0));
        }
        for (const r of comboRows) {
          comboSaleMap.set(Number(r.orderId), {
            comboPackageName: r.comboName || 'Gói Combo',
            comboPrice: Math.round(Number(r.comboPrice || 0)),
          });
        }
        for (const f of feedbackRows) {
          const ordId = Number(f.bookingId);
          if (ordId > 0 && f.tipNote) {
            const analysis = analyzeCustomerPraiseNote(f.tipNote);
            if (analysis.isPraise) {
              customerPraiseMap.set(ordId, analysis.cleanNote);
            }
          }
        }
      } catch (err) {
        fastify.log.warn(`Failed to query staff_tip, order_service_combo, or cc_feedback_reviews: ${err}`);
      }
    }

    // 5.4 Pre-fetch Customer Info and Order Service Details (CV, CC, Service)
    const customerIdsToFetch = Array.from(
      new Set(
        [
          ...todayBookOrders.map((o) => Number(o.customerId)),
          ...todayCheckinOrders.map((o) => Number(o.customerId)),
          ...todayDoneOrders.map((o) => Number(o.customerId)),
        ].filter((id) => Number.isInteger(id) && id > 0)
      )
    );

    const customerInfoMap = new Map<number, { fullName: string; phone?: string; avatar?: string | null }>();
    if (customerIdsToFetch.length > 0) {
      try {
        const custRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `
          SELECT 
            up.user_id as userId,
            up.full_name as fullName,
            up.avatar as avatar,
            uc.phone_number as phone
          FROM user_profile up
          LEFT JOIN user_contact uc ON uc.user_id = up.user_id AND uc.is_disabled = 0
          WHERE up.user_id IN (${customerIdsToFetch.join(',')})
        `
        );
        for (const c of custRows) {
          customerInfoMap.set(Number(c.userId), {
            fullName: c.fullName || 'Khách hàng',
            phone: c.phone || '',
            avatar: c.avatar || null,
          });
        }
      } catch (err) {
        fastify.log.warn(`Failed to query customer profiles for today orders: ${err}`);
      }
    }

    // Query order_service for all today orders (checkin + done) to get CV, CC, and serviceName
    const allOrderIdsForDetails = Array.from(
      new Set([...todayCheckinOrders.map((o) => Number(o.id)), ...todayDoneOrders.map((o) => Number(o.id))])
    ).filter((id) => id > 0);
    const orderServiceDetailsMap = new Map<number, { serviceName: string; cvStaffId?: number; ccStaffId?: number }>();
    const extraStaffIdsToFetch = new Set<number>();

    if (allOrderIdsForDetails.length > 0) {
      try {
        const osRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `
          SELECT 
            os.order_id as orderId,
            os.assigned_staff_id as cvStaffId,
            os.check_in_staff_id as ccStaffId,
            COALESCE(sl.service_name, s.service_key, 'Nối mi thiết kế') as serviceName
          FROM order_service os
          LEFT JOIN service s ON s.id = os.service_id
          LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
          WHERE os.order_id IN (${allOrderIdsForDetails.join(',')})
          ORDER BY os.id ASC
        `
        );
        for (const row of osRows) {
          const ordId = Number(row.orderId);
          if (!orderServiceDetailsMap.has(ordId)) {
            orderServiceDetailsMap.set(ordId, {
              serviceName: row.serviceName || 'Nối mi thiết kế',
              cvStaffId: row.cvStaffId ? Number(row.cvStaffId) : undefined,
              ccStaffId: row.ccStaffId ? Number(row.ccStaffId) : undefined,
            });
            if (row.cvStaffId && !staffNameMap.has(Number(row.cvStaffId))) {
              extraStaffIdsToFetch.add(Number(row.cvStaffId));
            }
            if (row.ccStaffId && !staffNameMap.has(Number(row.ccStaffId))) {
              extraStaffIdsToFetch.add(Number(row.ccStaffId));
            }
          }
        }
      } catch (err) {
        fastify.log.warn(`Failed to query order_service for today orders: ${err}`);
      }
    }

    if (extraStaffIdsToFetch.size > 0) {
      try {
        const extraStaffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id as userId, full_name as fullName, avatar FROM user_profile WHERE user_id IN (${Array.from(
            extraStaffIdsToFetch
          ).join(',')})`
        );
        for (const st of extraStaffRows) {
          const sid = Number(st.userId);
          if (st.fullName && !staffNameMap.has(sid)) staffNameMap.set(sid, st.fullName);
          if (st.avatar && !staffAvatarMap.has(sid)) staffAvatarMap.set(sid, st.avatar);
        }
      } catch (err) {
        fastify.log.warn(`Failed to query extra staff profiles: ${err}`);
      }
    }

    const staffDoneCountMap = new Map<number, number>();
    const doneEvents: TelesaleTodayLiveEvent[] = sortedTodayDoneOrders.map((o) => {
      const bookerId = Number(o.bookerId);
      const prevDone = staffDoneCountMap.get(bookerId) || 0;
      const newDone = prevDone + 1;
      staffDoneCountMap.set(bookerId, newDone);

      const timestamp = parseVietnamDateToIso(
        o.doneDate || o.actualBookingDateEnd || o.dateUpdated || o.actualBookingDateStart || o.bookingDateStart
      );

      const ordId = Number(o.id);
      const comboSale = comboSaleMap.get(ordId);
      const hasComboSale = Boolean(comboSale);
      const isComboMember = Number(o.isComboLive || 0) === 1;
      const hasCombo = hasComboSale || isComboMember;
      const comboPackageName = comboSale?.comboPackageName || (isComboMember ? 'Combo Live Wings' : undefined);
      const comboPrice = comboSale?.comboPrice || (isComboMember ? 1200000 : undefined);
      const tipAmount = tipMap.get(ordId) || 0;
      const hasTip = tipAmount > 0;
      const customerPraiseNote = customerPraiseMap.get(ordId) || null;
      const hasPraise = Boolean(customerPraiseNote);

      let changeResult = `Done ${prevDone} → ${newDone}`;
      if (hasPraise && hasTip) {
        changeResult = `Done · Khen & Tip ${tipAmount.toLocaleString('vi-VN')}đ`;
      } else if (hasPraise) {
        changeResult = `Done · Khách gửi lời khen`;
      } else if (hasComboSale && hasTip) {
        changeResult = `Done · Chốt Combo + Tip ${tipAmount.toLocaleString('vi-VN')}đ`;
      } else if (hasComboSale) {
        changeResult = `Done · Chốt ${comboPackageName}`;
      } else if (isComboMember && hasTip) {
        changeResult = `Done · Combo Live + Tip ${tipAmount.toLocaleString('vi-VN')}đ`;
      } else if (isComboMember) {
        changeResult = `Done · Chốt Combo Live`;
      } else if (hasTip) {
        changeResult = `Done · Tip ${tipAmount.toLocaleString('vi-VN')}đ`;
      }

      const osDetails = orderServiceDetailsMap.get(ordId);
      const cvStaffName = osDetails?.cvStaffId ? staffNameMap.get(osDetails.cvStaffId) || null : null;
      const ccStaffName = osDetails?.ccStaffId ? staffNameMap.get(osDetails.ccStaffId) || null : null;
      const cust = customerInfoMap.get(Number(o.customerId));
      const customerName = cust?.fullName || 'Khách yêu';

      return {
        id: `done-${o.id}`,
        type: 'DONE' as const,
        staffId: bookerId,
        staffName:
          staffNameMap.get(bookerId) ||
          allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name ||
          'Telesales',
        avatarUrl: staffAvatarMap.get(bookerId) || null,
        timestamp,
        orderId: ordId,
        changeResult,
        hasCombo,
        comboPackageName,
        comboPrice,
        hasTip,
        tipAmount,
        customerPraiseNote,
        customerName,
        assignedStaffName: cvStaffName,
        checkInStaffName: ccStaffName,
      };
    });

    const todayLiveEvents: TelesaleTodayLiveEvent[] = [...bookEvents, ...checkinEvents, ...doneEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Helper: Mask phone number (090***1234)
    const maskPhoneNumber = (phone?: string): string => {
      if (!phone) return '';
      const clean = phone.replace(/\\D/g, '');
      if (clean.length < 7) return clean;
      return clean.slice(0, 3) + '***' + clean.slice(-4);
    };

    // Helper: Format Booking Date Display ("Hôm nay 14:30" or "08/10 10:00")
    const formatBookingDateDisplay = (dateStr?: string): string => {
      if (!dateStr) return 'Hôm nay';
      try {
        const d = new Date(parseVietnamDateToIso(dateStr));
        const today = new Date();
        const isToday =
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const isTomorrow =
          d.getDate() === tomorrow.getDate() &&
          d.getMonth() === tomorrow.getMonth() &&
          d.getFullYear() === tomorrow.getFullYear();

        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        if (isToday) return `Hôm nay ${hours}:${mins}`;
        if (isTomorrow) return `Ngày mai ${hours}:${mins}`;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month} ${hours}:${mins}`;
      } catch {
        return dateStr;
      }
    };

    // Helper: Format Time Ago ("Vừa xong", "5p trước", "1h trước")
    const formatTimeAgo = (dateStr?: string): string => {
      if (!dateStr) return 'Vừa xong';
      try {
        const d = new Date(parseVietnamDateToIso(dateStr)).getTime();
        const now = Date.now();
        const diffMins = Math.floor((now - d) / 60000);
        if (diffMins <= 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins}p trước`;
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours}h trước`;
      } catch {
        return 'Vừa xong';
      }
    };

    // Helper: Format Duration in Service ("35p", "1h 15p")
    const formatTimeInService = (startStr?: string, endStr?: string, isDone?: boolean): string => {
      if (!startStr) return '';
      try {
        const startTime = new Date(parseVietnamDateToIso(startStr)).getTime();
        const endTime = isDone && endStr ? new Date(parseVietnamDateToIso(endStr)).getTime() : Date.now();
        const diffMins = Math.max(1, Math.floor((endTime - startTime) / 60000));
        if (diffMins < 60) return `${diffMins}p`;
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        return m > 0 ? `${h}h ${m}p` : `${h}h`;
      } catch {
        return '';
      }
    };

    // Helper: Extract promotion name
    const resolvePromotionName = (promoId?: number, bookingNote?: string): string | null => {
      if (bookingNote && bookingNote.trim()) {
        const note = bookingNote.trim();
        if (/voucher|giảm|off|sale|km|tri ân|deal/i.test(note)) {
          return note.length > 25 ? note.slice(0, 25) + '...' : note;
        }
      }
      if (promoId && Number(promoId) > 0) {
        return 'Có ưu đãi đặt lịch';
      }
      return null;
    };

    // Build todayBookList
    const todayBookList: TelesaleTodayBookItem[] = [...todayBookOrders]
      .filter((o) => o && o.id)
      .sort((a, b) => {
        const timeA = new Date(parseVietnamDateToIso(a.dateCreated || 0)).getTime();
        const timeB = new Date(parseVietnamDateToIso(b.dateCreated || 0)).getTime();
        return timeB - timeA; // Mới nhất lên đầu
      })
      .map((o) => {
        const cust = customerInfoMap.get(Number(o.customerId));
        const bookerId = Number(o.bookerId);
        const bookerName =
          staffNameMap.get(bookerId) ||
          allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name ||
          'Telesales';
        const bookerAvatar = staffAvatarMap.get(bookerId) || null;
        return {
          orderId: Number(o.id),
          customerName: cust?.fullName || 'Khách hàng',
          customerPhone: maskPhoneNumber(cust?.phone),
          customerAvatar: cust?.avatar || null,
          bookerId,
          bookerName,
          bookerAvatar,
          bookingDateStart: parseVietnamDateToIso(o.bookingDateStart || o.dateCreated),
          bookingDateDisplay: formatBookingDateDisplay(o.bookingDateStart || o.dateCreated),
          promotionName: resolvePromotionName(o.promotionId, o.bookingNote),
          dateCreated: parseVietnamDateToIso(o.dateCreated),
          timeAgoText: formatTimeAgo(o.dateCreated),
          isNewCustomer: Boolean(o.isNew),
        };
      });

    // Build todayCheckinList
    const todayCheckinList: TelesaleTodayCheckinItem[] = [...todayCheckinOrders]
      .filter((o) => o && o.id)
      .map((o) => {
        const ordId = Number(o.id);
        const cust = customerInfoMap.get(Number(o.customerId));
        const bookerId = Number(o.bookerId);
        const bookerName =
          staffNameMap.get(bookerId) ||
          allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name ||
          'Telesales';
        const bookerAvatar = staffAvatarMap.get(bookerId) || null;
        const osDetails = orderServiceDetailsMap.get(ordId);
        const cvStaffName = osDetails?.cvStaffId ? staffNameMap.get(osDetails.cvStaffId) || null : null;
        const cvStaffAvatar = osDetails?.cvStaffId ? staffAvatarMap.get(osDetails.cvStaffId) || null : null;
        const ccStaffName = osDetails?.ccStaffId ? staffNameMap.get(osDetails.ccStaffId) || null : null;

        const isDone = o.orderState === 'Completed';
        const comboSale = comboSaleMap.get(ordId);
        const hasComboSale = Boolean(comboSale);
        const isComboMember = Number(o.isComboLive || 0) === 1;
        const hasCombo = hasComboSale || isComboMember;
        const comboPackageName = comboSale?.comboPackageName || (isComboMember ? 'Combo Live Wings' : null);
        const comboPrice = comboSale?.comboPrice || (isComboMember ? 1200000 : undefined);
        const tipAmount = tipMap.get(ordId) || 0;
        const hasTip = tipAmount > 0;

        const checkinTimestamp = parseVietnamDateToIso(o.checkinDate || o.actualBookingDateStart || o.bookingDateStart);
        let checkinTimeDisplay = '08:00';
        try {
          const cd = new Date(checkinTimestamp);
          checkinTimeDisplay = `${String(cd.getHours()).padStart(2, '0')}:${String(cd.getMinutes()).padStart(2, '0')}`;
        } catch {
          // ignore parsing errors and use fallback
        }

        return {
          orderId: ordId,
          customerName: cust?.fullName || 'Khách hàng',
          customerPhone: maskPhoneNumber(cust?.phone),
          customerAvatar: cust?.avatar || null,
          bookerId,
          bookerName,
          bookerAvatar,
          checkinDate: checkinTimestamp,
          checkinDateDisplay: checkinTimeDisplay,
          serviceName: osDetails?.serviceName || 'Nối mi thiết kế',
          assignedStaffName: cvStaffName,
          assignedStaffAvatar: cvStaffAvatar,
          checkInStaffName: ccStaffName,
          orderState: o.orderState || 'In-Progress',
          isDone,
          hasCombo,
          comboPackageName,
          comboPrice,
          hasTip,
          tipAmount: hasTip ? tipAmount : undefined,
          customerPraiseNote: customerPraiseMap.get(ordId) || null,
          timeInService: formatTimeInService(
            o.actualBookingDateStart || o.checkinDate,
            o.actualBookingDateEnd || o.doneDate,
            isDone
          ),
        };
      })
      .sort((a, b) => {
        // Priority: Done with Praise/Combo/Tip (1000) > Just Done (800) > In-Progress (500)
        const isSuperA = a.isDone && (a.hasCombo || a.hasTip || Boolean(a.customerPraiseNote));
        const scoreA = isSuperA ? 1000 : a.isDone ? 800 : 500;
        const isSuperB = b.isDone && (b.hasCombo || b.hasTip || Boolean(b.customerPraiseNote));
        const scoreB = isSuperB ? 1000 : b.isDone ? 800 : 500;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return new Date(b.checkinDate).getTime() - new Date(a.checkinDate).getTime();
      });

    // 6. Aggregate 4 Pipeline Stages (Done in Month per stage)
    const stageCounts: Record<
      TelesalePipelineStageKey,
      { done: number; comboLiveDone: number; totalAssigned: number }
    > = {
      '0_30': { done: 0, comboLiveDone: 0, totalAssigned: 0 },
      '31_60': { done: 0, comboLiveDone: 0, totalAssigned: 0 },
      '61_120': { done: 0, comboLiveDone: 0, totalAssigned: 0 },
      gt_120: { done: 0, comboLiveDone: 0, totalAssigned: 0 },
    };

    try {
      // Decoupled batch resolution for daysSinceLastVisit
      const ordersNeedingDays = monthOrders.filter(
        (o) => o.daysSinceLastVisit === undefined && o.customerId && o.dateCreated
      );
      if (ordersNeedingDays.length > 0) {
        const uniqueCustomerIds = Array.from(
          new Set(ordersNeedingDays.map((o) => Number(o.customerId)).filter((id) => Number.isInteger(id) && id > 0))
        );
        if (uniqueCustomerIds.length > 0) {
          const prevOrdersSql = `
            SELECT 
              user_id as customerId,
              booking_date_start as bookingDateStart,
              date_created as dateCreated
            FROM \`order\`
            WHERE user_id IN (${uniqueCustomerIds.join(',')})
              AND order_state = 'Completed'
              AND date_created >= DATE_SUB('${startDateTimeStr}', INTERVAL 180 DAY)
            ORDER BY user_id, date_created DESC
          `;
          const prevRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(prevOrdersSql).catch(() => []);

          const prevOrdersByCustomer = new Map<number, Array<{ bookingDateStart: SafeAny; dateCreated: SafeAny }>>();
          for (const row of prevRows || []) {
            const cid = Number(row.customerId);
            let list = prevOrdersByCustomer.get(cid);
            if (!list) {
              list = [];
              prevOrdersByCustomer.set(cid, list);
            }
            list.push({
              bookingDateStart: row.bookingDateStart,
              dateCreated: row.dateCreated,
            });
          }

          const toDateStr = (val: SafeAny): string | null => {
            if (!val) return null;
            if (val instanceof Date) return val.toISOString().slice(0, 10);
            if (typeof val === 'string') return val.slice(0, 10);
            return null;
          };

          const toTimestamp = (val: SafeAny): number => {
            if (!val) return 0;
            if (val instanceof Date) return val.getTime();
            return new Date(val).getTime();
          };

          for (const ord of ordersNeedingDays) {
            const cid = Number(ord.customerId);
            const customerPrevOrders = prevOrdersByCustomer.get(cid);
            if (!customerPrevOrders || customerPrevOrders.length === 0) {
              ord.daysSinceLastVisit = 999;
              continue;
            }
            const ordCreatedTs = toTimestamp(ord.dateCreated);
            const ordDateStr = toDateStr(ord.dateCreated);
            const prevOrder = customerPrevOrders.find((p) => {
              const pCreatedTs = toTimestamp(p.dateCreated);
              return pCreatedTs < ordCreatedTs && p.bookingDateStart;
            });

            if (prevOrder && ordDateStr) {
              const prevBookingDateStr = toDateStr(prevOrder.bookingDateStart);
              if (prevBookingDateStr) {
                const d1 = new Date(ordDateStr).getTime();
                const d2 = new Date(prevBookingDateStr).getTime();
                const diffDays = Math.max(0, Math.round((d1 - d2) / 86400000));
                ord.daysSinceLastVisit = diffDays;
              } else {
                ord.daysSinceLastVisit = 999;
              }
            } else {
              ord.daysSinceLastVisit = 999;
            }
          }
        }
      }

      for (const ord of monthOrders) {
        const days = ord.daysSinceLastVisit !== undefined ? Number(ord.daysSinceLastVisit) : 999;
        const isCombo = Number(ord.isComboLive) === 1;
        let targetKey: TelesalePipelineStageKey;
        if (days <= 30) {
          targetKey = '0_30';
        } else if (days <= 60) {
          targetKey = '31_60';
        } else if (days <= 120) {
          targetKey = '61_120';
        } else {
          targetKey = 'gt_120';
        }

        if (isCombo) {
          stageCounts[targetKey].comboLiveDone++;
        } else {
          stageCounts[targetKey].done++;
        }
      }
    } catch (err) {
      fastify.log.warn(`Failed to compute pipeline stage month orders: ${err}`);
    }

    // Query customer pool counts for the 4 stages
    try {
      const poolCountsSql = `
        SELECT 
          CASE 
            WHEN DATEDIFF(CURDATE(), up.last_order_booking) <= 30 THEN '0_30'
            WHEN DATEDIFF(CURDATE(), up.last_order_booking) <= 60 THEN '31_60'
            WHEN DATEDIFF(CURDATE(), up.last_order_booking) <= 120 THEN '61_120'
            ELSE 'gt_120'
          END as stageKey,
          COUNT(DISTINCT u.id) as totalCount
        FROM \`user\` u
        JOIN \`user_profile\` up ON u.id = up.user_id
        WHERE u.user_type = 1 
          AND up.last_order_booking IS NOT NULL
        GROUP BY stageKey
      `;
      const poolRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(poolCountsSql).catch(() => []);
      for (const r of poolRows) {
        const key = r.stageKey as TelesalePipelineStageKey;
        if (stageCounts[key]) {
          stageCounts[key].totalAssigned = Number(r.totalCount || 0);
        }
      }
    } catch (e) {
      fastify.log.warn(`Could not compute pool counts: ${e}`);
    }

    const pipelineStages: TelesalePipelineStage[] = [
      {
        key: '0_30',
        label: '0D – 30D',
        subLabel: 'CHĂM SÓC CHU KỲ',
        stageName: 'Chăm sóc chu kỳ',
        description: 'Bảo hành kiểu Úc (1-3 ngày), Chạm 14, 19, 21 nhắc chu kỳ dặm mi',
        doneTarget: config.stageTargets['0_30'] || 200,
        doneActual: stageCounts['0_30'].done,
        comboLiveDoneActual: stageCounts['0_30'].comboLiveDone,
        totalAssignedCount: stageCounts['0_30'].totalAssigned,
        calledCount: Math.min(stageCounts['0_30'].done * 3, stageCounts['0_30'].totalAssigned),
        conversionRate:
          stageCounts['0_30'].totalAssigned > 0
            ? Number(((stageCounts['0_30'].done / stageCounts['0_30'].totalAssigned) * 100).toFixed(1))
            : 0,
        actionNote: 'Data được chia đều cho từng nhân sự (cá nhân hoá khách hàng)',
        itemsSummary: [
          'Bảo hành kiểu ÚC (1 - 3 ngày)',
          'Chạm 14 (hỏi thăm, quan tâm)',
          'Chạm 19 (nhắc chu kỳ dặm mi)',
          'Chạm 21 (nhắc chu kỳ dặm mi)',
        ],
      },
      {
        key: '31_60',
        label: '31D – 60D',
        subLabel: 'MISS YOU',
        stageName: 'Miss You',
        description: 'Khơi gợi nhu cầu booking làm mới (không ưu đãi)',
        doneTarget: config.stageTargets['31_60'] || 110,
        doneActual: stageCounts['31_60'].done,
        comboLiveDoneActual: stageCounts['31_60'].comboLiveDone,
        totalAssignedCount: stageCounts['31_60'].totalAssigned,
        calledCount: Math.min(stageCounts['31_60'].done * 4, stageCounts['31_60'].totalAssigned),
        conversionRate:
          stageCounts['31_60'].totalAssigned > 0
            ? Number(((stageCounts['31_60'].done / stageCounts['31_60'].totalAssigned) * 100).toFixed(1))
            : 0,
        actionNote: 'Data được chia đều cho từng nhân sự (cá nhân hoá khách hàng)',
        itemsSummary: ['Khơi gợi nhu cầu booking làm mới', 'Kịch bản tự nhiên, không giảm giá tràn lan'],
      },
      {
        key: '61_120',
        label: '61D – 120D',
        subLabel: 'COMEBACK',
        stageName: 'Comeback (30%)',
        description: '30% Mời khách hàng quay lại',
        doneTarget: config.stageTargets['61_120'] || 80,
        doneActual: stageCounts['61_120'].done,
        comboLiveDoneActual: stageCounts['61_120'].comboLiveDone,
        totalAssignedCount: stageCounts['61_120'].totalAssigned,
        calledCount: Math.min(stageCounts['61_120'].done * 5, stageCounts['61_120'].totalAssigned),
        conversionRate:
          stageCounts['61_120'].totalAssigned > 0
            ? Number(((stageCounts['61_120'].done / stageCounts['61_120'].totalAssigned) * 100).toFixed(1))
            : 0,
        actionNote: 'Data được chia đều cho từng nhân sự (cá nhân hoá khách hàng)',
        badge: '30% Ưu Đãi',
        itemsSummary: ['30% Mời khách hàng quay lại', 'Khảo sát lý do gián đoạn dịch vụ'],
      },
      {
        key: 'gt_120',
        label: '> 120D',
        subLabel: 'WAKE UP',
        stageName: 'Cua Lại Vợ Bầu (50%)',
        description: 'Chiến dịch Cua lại vợ bầu · Teamwork cùng khai thác chung',
        doneTarget: config.stageTargets.gt_120 || 60,
        doneActual: stageCounts.gt_120.done,
        comboLiveDoneActual: stageCounts.gt_120.comboLiveDone,
        totalAssignedCount: stageCounts.gt_120.totalAssigned,
        calledCount: Math.min(stageCounts.gt_120.done * 6, stageCounts.gt_120.totalAssigned),
        conversionRate:
          stageCounts.gt_120.totalAssigned > 0
            ? Number(((stageCounts.gt_120.done / stageCounts.gt_120.totalAssigned) * 100).toFixed(1))
            : 0,
        actionNote: 'Tạo chức năng mới Teamwork tất cả mọi người vào khai thác chung 1 chỗ',
        badge: '50% Ưu Đãi',
        itemsSummary: [
          '50% Mời khách hàng quay lại',
          'Chiến dịch Cua lại vợ bầu',
          'Teamwork tất cả mọi người khai thác chung',
        ],
      },
    ];

    // Work schedule active detection based on ICT hour
    const currentIctHour = nowIct.getUTCHours();
    const isMorningActive = currentIctHour >= 8 && currentIctHour < 12;
    const isAfternoonActive = currentIctHour >= 13 && currentIctHour < 17;

    // 7. Ô Hành Động Mỗi Ngày tập trung vào Call và Pickup (MOS-BUG-77)
    const callTargetPerStaff = config.dailyCallPerStaff || 83;
    const pickupTargetPerStaff = config.dailyPickupPerStaff || 25;

    const staffActions: TelesaleStaffDailyAction[] = allStaffCandidates.map((st) => {
      const isWorkingToday = shiftRows.length === 0 ? true : (workingShiftMap.get(st.legacyStaffId) ?? false);
      const staffTodayBooking = todayBookingRes.leaderboard.find((l) => l.bookerId === st.legacyStaffId);
      const callActual = staffTodayBooking?.callCount || 0;
      const pickupActual = staffTodayBooking?.pickupCount || 0;
      const resolvedName = staffNameMap.get(st.legacyStaffId) || st.name;

      if (!isWorkingToday) {
        return {
          legacyStaffId: st.legacyStaffId,
          name: resolvedName,
          isWorkingToday: false,
          callTarget: 0,
          callActual,
          callPercent: 0,
          callGap: 0,
          pickupTarget: 0,
          pickupActual,
          pickupPercent: 0,
          pickupGap: 0,
          overallPercent: 0,
          status: 'OFF' as TelesaleDailyActionStatus,
          statusLabel: 'Nghỉ',
          shiftLabel: '🏖️ Nghỉ ca',
        };
      }

      const shiftInfo = shiftDetailMap.get(st.legacyStaffId);
      const shiftLabel = shiftInfo?.shiftLabel || '☀️ Trực ca';
      const callTarget = callTargetPerStaff;
      const pickupTarget = pickupTargetPerStaff;
      const callPercent = callTarget > 0 ? Number(((callActual / callTarget) * 100).toFixed(1)) : 0;
      const callGap = callActual - callTarget;
      const pickupPercent = pickupTarget > 0 ? Number(((pickupActual / pickupTarget) * 100).toFixed(1)) : 0;
      const pickupGap = pickupActual - pickupTarget;
      const overallPercent = Number(((callPercent + pickupPercent) / 2).toFixed(1));

      let status: TelesaleDailyActionStatus;
      let statusLabel: string;
      if (overallPercent >= 100) {
        status = 'EXCEEDED';
        statusLabel = 'Vượt';
      } else if (overallPercent >= 80) {
        status = 'ACHIEVED';
        statusLabel = 'Đạt';
      } else if (overallPercent >= 50) {
        status = 'BEHIND';
        statusLabel = 'Chậm';
      } else {
        status = 'ALARM';
        statusLabel = 'Báo động';
      }

      return {
        legacyStaffId: st.legacyStaffId,
        name: resolvedName,
        isWorkingToday: true,
        callTarget,
        callActual,
        callPercent,
        callGap,
        pickupTarget,
        pickupActual,
        pickupPercent,
        pickupGap,
        overallPercent,
        status,
        statusLabel,
        shiftLabel,
      };
    });

    const workingStaffList = staffActions.filter((s) => s.isWorkingToday);
    const teamCallTarget = workingStaffList.reduce((sum, s) => sum + s.callTarget, 0);
    const teamCallActual = todayBookingRes.summary.totalCalls;
    const teamCallPercent = teamCallTarget > 0 ? Number(((teamCallActual / teamCallTarget) * 100).toFixed(1)) : 0;
    const teamCallGap = teamCallActual - teamCallTarget;

    const teamPickupTarget = workingStaffList.reduce((sum, s) => sum + s.pickupTarget, 0);
    const teamPickupActual = todayBookingRes.summary.totalPickups;
    const teamPickupPercent =
      teamPickupTarget > 0 ? Number(((teamPickupActual / teamPickupTarget) * 100).toFixed(1)) : 0;
    const teamPickupGap = teamPickupActual - teamPickupTarget;

    const dailyAction: TelesaleDailyActionOverview = {
      callTargetPerStaff,
      pickupTargetPerStaff,
      teamCallTarget,
      teamCallActual,
      teamCallPercent,
      teamCallGap,
      teamPickupTarget,
      teamPickupActual,
      teamPickupPercent,
      teamPickupGap,
      staffActions,
      bookTargetPerDay: config.dailyBookTarget,
      totalCallsToday: teamCallActual,
      totalBookingsToday: teamDailyBookActual,
    };

    const dailySnapshots: TelesaleDailySnapshotItem[] = [];
    const isCurrentMonth = todayStr.startsWith(month);
    // Loại trừ ngày hôm nay (chỉ lấy các ngày đã qua từ hôm qua trở về trước vì hôm nay đã có ở 2 đồng hồ trên)
    const maxDayNum = isCurrentMonth ? parseInt(todayStr.slice(8, 10), 10) - 1 : lastDayOfMonth;
    const targetDailyBook = config.dailyBookTarget || 25;
    const targetDailyCheckin = config.dailyDoneTarget || 18;

    for (let day = 1; day <= maxDayNum; day++) {
      const dayPad = String(day).padStart(2, '0');
      const dateStr = `${month}-${dayPad}`;

      const bookActual = dailyBookMap.get(dateStr) || 0;
      const checkinActual = dailyCheckinMap.get(dateStr) || 0;

      const bookPercent = targetDailyBook > 0 ? Math.round((bookActual / targetDailyBook) * 100) : 0;
      const checkinPercent = targetDailyCheckin > 0 ? Math.round((checkinActual / targetDailyCheckin) * 100) : 0;

      const getTier = (pct: number): 'rose' | 'amber' | 'emerald' => {
        if (pct < 80) return 'rose';
        if (pct < 100) return 'amber';
        return 'emerald';
      };

      dailySnapshots.push({
        date: dateStr,
        dayDisplay: `${dayPad}/${monthNumStr}`,
        bookActual,
        bookTarget: targetDailyBook,
        bookPercent,
        bookTier: getTier(bookPercent),
        checkinActual,
        checkinTarget: targetDailyCheckin,
        checkinPercent,
        checkinTier: getTier(checkinPercent),
        isToday: false,
      });
    }

    // Sắp xếp mới nhất lên đầu (từ hôm qua lùi dần về ngày 01)
    dailySnapshots.sort((a, b) => b.date.localeCompare(a.date));

    const overview: TelesaleTargetOverview = {
      month,
      teamCode: config.teamCode,
      teamName: config.teamName,
      updatedAt: nowIct.toISOString(),
      teamMonth: {
        doneTarget: config.teamDoneTarget,
        doneActual: teamMonthSingleDoneActual,
        comboLiveDoneActual: teamMonthComboLiveDoneActual,
        comboSoldActual: teamMonthComboSoldActual,
        comboRevenueActual: teamMonthComboRevenueActual,
        singleToComboRate: teamMonthSingleToComboRate,
        retailDoneActual: teamMonthSingleDoneActual,
        incomingTarget,
        incomingActual: teamMonthIncomingActual,
        bookTarget: config.teamBookTarget,
        bookActual: teamMonthIncomingActual,
        workDaysTotal: pacing.workDaysTotal,
        workDaysElapsed: pacing.workDaysElapsed,
        workDaysRemaining: pacing.workDaysRemaining,
        periodStatus: pacing.periodStatus,
        pacingStatus: pacing.pacingStatus,
        pacingStatusLabel: pacing.pacingStatusLabel,
        expectedProgressRate: pacing.expectedProgressRate,
        expectedDone: pacing.expectedDone,
        expectedIncoming: pacing.expectedIncoming,
        expectedBook: pacing.expectedBook,
        gapDone: pacing.gapDone,
        gapIncoming: pacing.gapIncoming,
        gapBook: pacing.gapBook,
        remainingDone: pacing.remainingDone,
        remainingIncoming: pacing.remainingIncoming,
        remainingBook: pacing.remainingBook,
        dailyRequiredDone: pacing.dailyRequiredDone,
        dailyRequiredIncoming: pacing.dailyRequiredIncoming,
        dailyRequiredBook: pacing.dailyRequiredBook,
        pacingRatio: pacing.pacingRatio,
        isPacingOnTrack: pacing.isPacingOnTrack,
      },
      teamDaily: {
        date: todayStr,
        doneTarget: config.dailyDoneTarget,
        doneActual: teamDailySingleDoneActual,
        comboLiveDoneActual: teamDailyComboLiveDoneActual,
        retailDoneActual: teamDailySingleDoneActual,
        checkinTarget: config.dailyDoneTarget,
        checkinActual: teamDailySingleCheckinActual,
        retailCheckinActual: teamDailySingleCheckinActual,
        comboLiveCheckinActual: teamDailyComboLiveCheckinActual,
        bookTarget: config.dailyBookTarget,
        bookActual: teamDailyBookActual,
        comboLiveBookActual: teamDailyComboLiveBookActual,
      },
      staffTargets,
      dailyAction,
      workSchedule: {
        morning: {
          timeRange: '08:00 – 12:00',
          title: 'Chăm sóc data chu kỳ',
          subTitle: 'Chu kỳ từ 0D đến 120D',
          isActive: isMorningActive,
        },
        afternoon: {
          timeRange: '13:00 – 17:00',
          title: 'Khai thác data chu kỳ > 120D',
          subTitle: 'Chiến dịch Cua lại vợ bầu',
          isActive: isAfternoonActive,
        },
      },
      pipelineStages,
      todayLiveEvents,
      todayBookList,
      todayCheckinList,
      dailySnapshots,
    };

    return overview;
  }
}

// Wire cache invalidator so config changes clear TelesaleTargetService memory cache
TelesaleTargetConfigService.registerCacheInvalidator((month) => {
  TelesaleTargetService.invalidateOverviewCache(month);
});
