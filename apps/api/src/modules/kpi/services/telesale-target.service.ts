import type { FastifyInstance } from 'fastify';
import type {
  SafeAny,
  TelesaleCustomerPoolResponse,
  TelesalePipelineStageKey,
  TelesaleTargetConfigDto,
  TelesaleTargetOverview,
  TelesaleTvEventLog,
  TelesaleTvJournalOverview,
  TelesaleTvPersonaDto,
  TelesaleTvQuoteItem,
  TelesaleTvQuotesConfig,
  TelesaleTvQuotesOverviewResponse,
} from '@mos-lab/shared';
import {
  DEFAULT_OCTOBER_CONFIG,
  TelesaleTargetConfigService,
  formatVietnamTime,
  parseVietnamDateToIso,
} from './telesale-target-config.service.js';
import { TelesaleCustomerPoolService } from './telesale-customer-pool.service.js';
import { TelesaleTvCelebrationService } from './telesale-tv-celebration.service.js';
import {
  fetchOverviewBaseData,
  fetchTodayOrdersWithComboState,
  fetchWorkingShiftsAndStaffDirectory,
} from './telesale-target/overview-data-loader.js';
import { computePipelineStages } from './telesale-target/overview-pipeline-stages.js';
import {
  buildDailyActionOverview,
  buildDailySnapshots,
  buildStaffTargets,
} from './telesale-target/overview-staff-and-actions.js';
import { buildTodayFeeds } from './telesale-target/overview-today-feeds.js';

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
      edginessLevel?: SafeAny;
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

    const base = await fetchOverviewBaseData(fastify, {
      startDateStr,
      endDateStr,
      startDateTimeStr,
      endDateTimeStr,
      todayStr,
      combinedStaffIds,
      candidateIdsStr,
      options,
    });

    const incomingTarget = config.teamIncomingTarget ?? config.teamBookTarget;

    // Pacing & Management metrics calculation: Done KPI strictly uses Single Done!
    const pacing = await this.calculateTeamWorkDaysPacing(
      fastify,
      month,
      targetStaffIds,
      nowIct,
      config.teamDoneTarget,
      base.teamMonthSingleDoneActual,
      config.teamBookTarget,
      base.teamMonthIncomingActual,
      incomingTarget,
      base.teamMonthIncomingActual
    );

    const [directory, todayOrders] = await Promise.all([
      fetchWorkingShiftsAndStaffDirectory(fastify, config, {
        todayStr,
        targetStaffIds,
        monthDoneLeaderboard: base.monthDoneRes.leaderboard,
        todayBookingLeaderboard: base.todayBookingRes.leaderboard,
      }),
      fetchTodayOrdersWithComboState(fastify, {
        todayStartStr,
        todayEndStr,
        candidateIdsStr,
      }),
    ]);

    const staffTargets = buildStaffTargets({
      allStaffCandidates: directory.allStaffCandidates,
      monthDoneLeaderboard: base.monthDoneRes.leaderboard,
      todayBookingLeaderboard: base.todayBookingRes.leaderboard,
      monthRevenueLeaderboard: base.monthRevenueRes.leaderboard,
      monthOrders: base.monthOrders,
      todayDoneOrders: todayOrders.todayDoneOrders,
      todayCheckinOrders: todayOrders.todayCheckinOrders,
      todayBookOrders: todayOrders.todayBookOrders,
      comboSoldMap: base.comboSoldMap,
      comboRevenueMap: base.comboRevenueMap,
      teamDailyBookActual: base.teamDailyBookActual,
      pacing,
      config,
      staffAvatarMap: directory.staffAvatarMap,
      staffNameMap: directory.staffNameMap,
    });

    const [feeds, pipelineStages] = await Promise.all([
      buildTodayFeeds(fastify, {
        todayBookOrders: todayOrders.todayBookOrders,
        todayCheckinOrders: todayOrders.todayCheckinOrders,
        todayDoneOrders: todayOrders.todayDoneOrders,
        allStaffCandidates: directory.allStaffCandidates,
        staffNameMap: directory.staffNameMap,
        staffAvatarMap: directory.staffAvatarMap,
      }),
      computePipelineStages(fastify, {
        monthOrders: base.monthOrders,
        startDateTimeStr,
        config,
      }),
    ]);

    // Work schedule active detection based on ICT hour
    const currentIctHour = nowIct.getUTCHours();
    const isMorningActive = currentIctHour >= 8 && currentIctHour < 12;
    const isAfternoonActive = currentIctHour >= 13 && currentIctHour < 17;

    const dailyAction = buildDailyActionOverview({
      config,
      allStaffCandidates: directory.allStaffCandidates,
      shiftRows: directory.shiftRows,
      workingShiftMap: directory.workingShiftMap,
      shiftDetailMap: directory.shiftDetailMap,
      todayBookingRes: base.todayBookingRes,
      staffNameMap: directory.staffNameMap,
      teamDailyBookActual: base.teamDailyBookActual,
    });

    const dailySnapshots = buildDailySnapshots({
      month,
      monthNumStr,
      todayStr,
      lastDayOfMonth,
      config,
      dailyBookMap: base.dailyBookMap,
      dailyCheckinMap: base.dailyCheckinMap,
    });

    return {
      month,
      teamCode: config.teamCode,
      teamName: config.teamName,
      updatedAt: nowIct.toISOString(),
      teamMonth: {
        doneTarget: config.teamDoneTarget,
        doneActual: base.teamMonthSingleDoneActual,
        comboLiveDoneActual: base.teamMonthComboLiveDoneActual,
        comboSoldActual: base.teamMonthComboSoldActual,
        comboRevenueActual: base.teamMonthComboRevenueActual,
        singleToComboRate: base.teamMonthSingleToComboRate,
        retailDoneActual: base.teamMonthSingleDoneActual,
        incomingTarget,
        incomingActual: base.teamMonthIncomingActual,
        bookTarget: config.teamBookTarget,
        bookActual: base.teamMonthIncomingActual,
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
        doneActual: todayOrders.teamDailySingleDoneActual,
        comboLiveDoneActual: todayOrders.teamDailyComboLiveDoneActual,
        retailDoneActual: todayOrders.teamDailySingleDoneActual,
        checkinTarget: config.dailyDoneTarget,
        checkinActual: todayOrders.teamDailySingleCheckinActual,
        retailCheckinActual: todayOrders.teamDailySingleCheckinActual,
        comboLiveCheckinActual: todayOrders.teamDailyComboLiveCheckinActual,
        bookTarget: config.dailyBookTarget,
        bookActual: base.teamDailyBookActual,
        comboLiveBookActual: todayOrders.teamDailyComboLiveBookActual,
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
      todayLiveEvents: feeds.todayLiveEvents,
      todayBookList: feeds.todayBookList,
      todayCheckinList: feeds.todayCheckinList,
      dailySnapshots,
    };
  }
}

// Wire cache invalidator so config changes clear TelesaleTargetService memory cache
TelesaleTargetConfigService.registerCacheInvalidator((month) => {
  TelesaleTargetService.invalidateOverviewCache(month);
});
