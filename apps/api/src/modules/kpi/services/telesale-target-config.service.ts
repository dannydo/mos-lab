import { FastifyInstance } from 'fastify';
import { TelesaleTargetConfigDto } from '@mos-lab/shared';
import {
  DEFAULT_OCTOBER_CONFIG,
  TELESALE_CONFIG_KEY_PREFIX,
  getTelesaleConfigKey,
  parseVietnamDateToIso,
  formatVietnamTime,
  type ActiveTelesaleStaffItem,
  type FallbackStaffTargetItem,
  type OverviewCacheInvalidator,
} from './telesale-target-config/config-helpers.js';
import {
  getActiveTelesalesStaffFromHr as resolveActiveTelesalesStaffFromHr,
  getTeamNameByCode as resolveTeamNameByCode,
  getActiveStaffFromTeam as resolveActiveStaffFromTeam,
} from './telesale-target-config/team-staff-resolver.js';
import {
  calculateTeamWorkDaysPacing as computeTeamWorkDaysPacing,
  type TeamWorkDaysPacingResult,
} from './telesale-target-config/workdays-pacing.js';

export { DEFAULT_OCTOBER_CONFIG, parseVietnamDateToIso, formatVietnamTime, type OverviewCacheInvalidator };

export class TelesaleTargetConfigService {
  private static cacheInvalidators: OverviewCacheInvalidator[] = [];

  static registerCacheInvalidator(invalidator: OverviewCacheInvalidator): void {
    if (!this.cacheInvalidators.includes(invalidator)) {
      this.cacheInvalidators.push(invalidator);
    }
  }

  static invalidateOverview(month?: string): void {
    for (const inv of this.cacheInvalidators) {
      try {
        inv(month);
      } catch {
        // ignore
      }
    }
  }

  static getConfigKey(month: string): string {
    return getTelesaleConfigKey(month);
  }

  static async getActiveTelesalesStaffFromHr(
    fastify: FastifyInstance,
    fallbackStaffTargets?: FallbackStaffTargetItem[]
  ): Promise<ActiveTelesaleStaffItem[]> {
    return resolveActiveTelesalesStaffFromHr(fastify, fallbackStaffTargets);
  }

  static async getTeamNameByCode(fastify: FastifyInstance, teamCode: string): Promise<string> {
    return resolveTeamNameByCode(fastify, teamCode);
  }

  static async getActiveStaffFromTeam(
    fastify: FastifyInstance,
    teamCode = 'BK_TELESALES',
    fallbackStaffTargets?: FallbackStaffTargetItem[]
  ): Promise<ActiveTelesaleStaffItem[]> {
    return resolveActiveStaffFromTeam(fastify, teamCode, fallbackStaffTargets, (f, fb) =>
      this.getActiveTelesalesStaffFromHr(f, fb)
    );
  }

  static async getConfig(fastify: FastifyInstance, month = '2026-10'): Promise<TelesaleTargetConfigDto> {
    let baseConfig: TelesaleTargetConfigDto = { ...DEFAULT_OCTOBER_CONFIG, month };
    let hasSavedRow = false;
    try {
      const row = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: this.getConfigKey(month) },
      });
      if (row?.value) {
        hasSavedRow = true;
        const parsed = JSON.parse(row.value) as TelesaleTargetConfigDto;
        if (!parsed.dailyCallPerStaff) parsed.dailyCallPerStaff = 83;
        if (!parsed.dailyPickupPerStaff) parsed.dailyPickupPerStaff = 25;
        baseConfig = parsed;
      }
    } catch (err) {
      fastify.log.warn(`Failed to read telesale config for ${month}, using default: ${err}`);
    }

    const appliedTeamCode = baseConfig.teamCode || 'BK_TELESALES';
    const appliedTeamName = baseConfig.teamName || (await this.getTeamNameByCode(fastify, appliedTeamCode));

    // Nguồn nhân sự của War Room = thành viên hiện tại của Team được chọn (MOS-BUG-93)
    const activeStaff = await this.getActiveStaffFromTeam(fastify, appliedTeamCode, baseConfig.staffTargets);
    const existingStaffTargets = baseConfig.staffTargets || [];
    const existingTargetMap = new Map(
      existingStaffTargets.map((st) => [Number(st.legacyStaffId), Number(st.doneTarget)])
    );

    const defaultDoneTarget =
      activeStaff.length > 0 ? Math.round(Number(baseConfig.teamDoneTarget || 450) / activeStaff.length) : 100;

    const reconciledStaffTargets = activeStaff.map((s) => {
      const staffId = Number(s.legacyStaffId);
      const customTarget = existingTargetMap.get(staffId);
      return {
        legacyStaffId: staffId,
        name: s.name,
        doneTarget:
          customTarget !== undefined && !isNaN(customTarget) && customTarget > 0 ? customTarget : defaultDoneTarget,
        avatarUrl: s.avatarUrl || null,
      };
    });

    // Tự động chuẩn hóa dữ liệu crmConfig nếu có staffTargets không thuộc Team hoặc thiếu thành viên
    if (hasSavedRow && fastify?.prisma?.crm?.crmConfig?.update) {
      const activeIdsSet = new Set(activeStaff.map((hr) => Number(hr.legacyStaffId)));
      const existingIdsSet = new Set(existingStaffTargets.map((st) => Number(st.legacyStaffId)));

      const hasInvalidStaff = existingStaffTargets.some((st) => !activeIdsSet.has(Number(st.legacyStaffId)));
      const hasMissingStaff = activeStaff.some((hr) => !existingIdsSet.has(Number(hr.legacyStaffId)));
      const missingTeamInfo = !baseConfig.teamCode;

      if (hasInvalidStaff || hasMissingStaff || missingTeamInfo) {
        const updatedValue = JSON.stringify({
          ...baseConfig,
          teamCode: appliedTeamCode,
          teamName: appliedTeamName,
          staffTargets: reconciledStaffTargets,
        });
        fastify.prisma.crm.crmConfig
          .update({
            where: { key: this.getConfigKey(month) },
            data: { value: updatedValue, updatedAt: new Date() },
          })
          .catch((err) => fastify.log.warn(`Auto-repair telesale config error: ${err}`));
      }
    }

    return {
      ...baseConfig,
      month,
      teamCode: appliedTeamCode,
      teamName: appliedTeamName,
      staffTargets: reconciledStaffTargets,
    };
  }

  static async saveConfig(fastify: FastifyInstance, config: TelesaleTargetConfigDto): Promise<TelesaleTargetConfigDto> {
    const sumStages =
      Number(config.stageTargets['0_30'] || 0) +
      Number(config.stageTargets['31_60'] || 0) +
      Number(config.stageTargets['61_120'] || 0) +
      Number(config.stageTargets.gt_120 || 0);

    if (sumStages !== Number(config.teamDoneTarget)) {
      throw new Error(
        `Tổng mục tiêu Done của 4 nhóm khách hàng (${sumStages}) phải khớp chính xác với KPI Done của Team (${config.teamDoneTarget})!`
      );
    }

    const appliedTeamCode = config.teamCode || 'BK_TELESALES';
    const appliedTeamName = config.teamName || (await this.getTeamNameByCode(fastify, appliedTeamCode));

    // Đảm bảo staffTargets lấy toàn bộ thành viên hiện tại của Team (MOS-BUG-93)
    const activeStaff = await this.getActiveStaffFromTeam(fastify, appliedTeamCode, config.staffTargets);
    const incomingTargetMap = new Map(
      (config.staffTargets || []).map((st) => [Number(st.legacyStaffId), Number(st.doneTarget)])
    );
    const defaultDoneTarget =
      activeStaff.length > 0 ? Math.round(Number(config.teamDoneTarget) / activeStaff.length) : 100;

    const cleanStaffTargets = activeStaff.map((s) => {
      const staffId = Number(s.legacyStaffId);
      const customTarget = incomingTargetMap.get(staffId);
      return {
        legacyStaffId: staffId,
        name: s.name,
        doneTarget:
          customTarget !== undefined && !isNaN(customTarget) && customTarget > 0 ? customTarget : defaultDoneTarget,
        avatarUrl: s.avatarUrl || null,
      };
    });

    const cleanConfig: TelesaleTargetConfigDto = {
      ...config,
      teamCode: appliedTeamCode,
      teamName: appliedTeamName,
      staffTargets: cleanStaffTargets,
    };

    const key = this.getConfigKey(config.month);
    const value = JSON.stringify(cleanConfig);

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });

    // Invalidate cached overview for this month
    fastify.cache?.invalidatePattern(`^kpi:telesale-target:overview:${config.month}`);
    this.invalidateOverview(config.month);

    return cleanConfig;
  }

  static async selectTeam(fastify: FastifyInstance, month: string, teamCode: string): Promise<TelesaleTargetConfigDto> {
    if (!teamCode || typeof teamCode !== 'string') {
      throw new Error('Mã team không hợp lệ');
    }
    const currentConfig = await this.getConfig(fastify, month);
    const teamName = await this.getTeamNameByCode(fastify, teamCode);

    const activeStaff = await this.getActiveStaffFromTeam(fastify, teamCode);
    const defaultDoneTarget =
      activeStaff.length > 0 ? Math.round(Number(currentConfig.teamDoneTarget || 450) / activeStaff.length) : 100;

    const newStaffTargets = activeStaff.map((s) => ({
      legacyStaffId: Number(s.legacyStaffId),
      name: s.name,
      doneTarget: defaultDoneTarget,
      avatarUrl: s.avatarUrl || null,
    }));

    const updatedConfig: TelesaleTargetConfigDto = {
      ...currentConfig,
      teamCode,
      teamName,
      staffTargets: newStaffTargets,
    };

    const key = this.getConfigKey(month);
    const value = JSON.stringify(updatedConfig);

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });

    // Invalidate cached overview for this month
    fastify.cache?.invalidatePattern(`^kpi:telesale-target:overview:${month}`);
    this.invalidateOverview(month);

    return updatedConfig;
  }

  static async cloneConfig(
    fastify: FastifyInstance,
    sourceMonth: string,
    targetMonth: string,
    overwrite = false
  ): Promise<TelesaleTargetConfigDto> {
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(sourceMonth) || !monthRegex.test(targetMonth)) {
      throw new Error('Định dạng tháng không hợp lệ (cần định dạng YYYY-MM, ví dụ: 2026-11)');
    }
    if (sourceMonth === targetMonth) {
      throw new Error('Tháng đích phải khác tháng nguồn');
    }

    const targetKey = this.getConfigKey(targetMonth);
    const existing = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: targetKey },
    });

    if (existing?.value && !overwrite) {
      throw new Error(`Kế hoạch tháng ${targetMonth} đã tồn tại! Vui lòng chọn ghi đè nếu bạn muốn thay thế.`);
    }

    const sourceConfig = await this.getConfig(fastify, sourceMonth);
    const clonedConfig: TelesaleTargetConfigDto = {
      ...sourceConfig,
      month: targetMonth,
    };

    return await this.saveConfig(fastify, clonedConfig);
  }

  static async listConfiguredMonths(fastify: FastifyInstance): Promise<string[]> {
    try {
      const rows = await fastify.prisma.crm.crmConfig.findMany({
        where: {
          key: {
            startsWith: TELESALE_CONFIG_KEY_PREFIX,
          },
        },
        select: { key: true },
      });
      const months = rows
        .map((r) => r.key.replace(TELESALE_CONFIG_KEY_PREFIX, ''))
        .filter((m) => /^\d{4}-\d{2}$/.test(m));

      if (!months.includes('2026-10')) {
        months.push('2026-10');
      }

      return Array.from(new Set(months)).sort();
    } catch (err) {
      fastify.log.warn(`Failed to list configured telesale months: ${err}`);
      return ['2026-10'];
    }
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
  ): Promise<TeamWorkDaysPacingResult> {
    return computeTeamWorkDaysPacing(
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
}
