import { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  TelesaleTargetOverview,
  TelesaleTargetConfigDto,
  TelesalePipelineStageKey,
  TelesaleCustomerPoolResponse,
  TelesaleCustomerPoolItem,
  TelesaleStaffTarget,
  TelesaleTodayLiveEvent,
  TelesaleTodayBookItem,
  TelesaleTodayCheckinItem,
  TelesaleTvEventLog,
  TelesaleTvJournalOverview,
  TelesalePipelineStage,
  TelesalePacingStatus,
  TelesalePeriodStatus,
  TelesaleDailyActionStatus,
  TelesaleStaffDailyAction,
  TelesaleDailyActionOverview,
  SafeAny,
  TELESALES_EXECUTIVE_STANDARDS,
} from '@mos-lab/shared';
import { BkLeaderboardService } from './bk-leaderboard.service.js';
import { ComboRecognitionService } from '../../customers/services/combo-recognition.service.js';

export const DEFAULT_OCTOBER_CONFIG: TelesaleTargetConfigDto = {
  month: '2026-10',
  teamDoneTarget: 450,
  teamBookTarget: 650,
  dailyDoneTarget: 18,
  dailyBookTarget: 25,
  dailyCallPerStaff: 83,
  dailyPickupPerStaff: 25,
  staffTargets: [
    { legacyStaffId: 50670, name: 'Phượng', doneTarget: 150 },
    { legacyStaffId: 52648, name: 'Kiều', doneTarget: 100 },
    { legacyStaffId: 32268, name: 'Điệp', doneTarget: 100 },
    { legacyStaffId: 52598, name: 'Vũ', doneTarget: 100 },
  ],
  stageTargets: {
    '0_30': 200,
    '31_60': 110,
    '61_120': 80,
    gt_120: 60,
  },
};

export function parseVietnamDateToIso(rawDate: unknown): string {
  if (!rawDate) return new Date().toISOString();
  if (typeof rawDate === 'string') {
    if (rawDate.includes('+') || rawDate.endsWith('Z')) {
      return new Date(rawDate).toISOString();
    }
    const formatted = rawDate.replace(' ', 'T');
    return new Date(`${formatted}+07:00`).toISOString();
  }
  if (rawDate instanceof Date) {
    const isoWithoutZ = rawDate
      .toISOString()
      .replace(/\.\d{3}Z$/, '')
      .replace(/Z$/, '');
    return new Date(`${isoWithoutZ}+07:00`).toISOString();
  }
  return new Date().toISOString();
}

export function formatVietnamTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

export class TelesaleTargetService {
  static getConfigKey(month: string): string {
    return `TELESALE_TARGET_CONFIG_${month}`;
  }

  /**
   * Nguồn danh sách nhân sự chuẩn từ Quản lý Nhân Sự & Vai Trò (HR) -> Danh sách nhân sự Active (MOS-BUG-84):
   * Điều kiện lọc:
   * - Vai trò = Telesales Executive (role IN ['telesales', 'Telesales Executive'])
   * - Trạng thái = Active (isActive = true)
   * - legacyStaffId hợp lệ (> 0)
   *
   * Tự động phản ánh khi HR thêm, đổi vai trò, khóa hoặc kích hoạt nhân viên.
   */
  static async getActiveTelesalesStaffFromHr(
    fastify: FastifyInstance,
    fallbackStaffTargets?: Array<{ legacyStaffId: number; name: string; avatarUrl?: string | null }>
  ): Promise<
    Array<{
      crmStaffId: number;
      legacyStaffId: number;
      name: string;
      avatarUrl: string | null;
    }>
  > {
    try {
      if (fastify?.prisma?.crm?.crmStaff?.findMany) {
        const staffList = await fastify.prisma.crm.crmStaff.findMany({
          where: {
            isActive: true,
            OR: [
              { role: 'telesales' },
              { role: 'Telesales Executive' },
              { role: TELESALES_EXECUTIVE_STANDARDS.roleKey },
              { role: TELESALES_EXECUTIVE_STANDARDS.roleName },
            ],
          },
          select: {
            id: true,
            legacyStaffId: true,
            displayName: true,
            avatarUrl: true,
          },
          orderBy: { displayName: 'asc' },
        });

        const validStaff = staffList
          .filter((s) => s.legacyStaffId && Number(s.legacyStaffId) > 0)
          .map((s) => ({
            crmStaffId: s.id,
            legacyStaffId: Number(s.legacyStaffId),
            name: s.displayName,
            avatarUrl: s.avatarUrl || null,
          }));

        if (validStaff.length > 0) {
          return validStaff;
        }
      }
    } catch (err) {
      fastify.log?.warn?.(`Failed to query active telesales staff from HR (crmStaff): ${err}`);
    }

    if (fallbackStaffTargets && fallbackStaffTargets.length > 0) {
      return fallbackStaffTargets.map((st) => ({
        crmStaffId: 0,
        legacyStaffId: st.legacyStaffId,
        name: st.name,
        avatarUrl: st.avatarUrl || null,
      }));
    }

    return DEFAULT_OCTOBER_CONFIG.staffTargets.map((st) => ({
      crmStaffId: 0,
      legacyStaffId: st.legacyStaffId,
      name: st.name,
      avatarUrl: st.avatarUrl || null,
    }));
  }

  static async getTeamNameByCode(fastify: FastifyInstance, teamCode: string): Promise<string> {
    try {
      if (fastify?.prisma?.crm?.crmTeam?.findUnique) {
        const team = await fastify.prisma.crm.crmTeam.findUnique({
          where: { code: teamCode },
          select: { name: true },
        });
        if (team?.name) return team.name;
      }
    } catch {
      // ignore
    }
    if (teamCode === 'BK_TELESALES') return 'Telesales';
    if (teamCode === 'BK_CS') return 'Customer Service (CS)';
    if (teamCode === 'BK') return 'Booker';
    if (teamCode === 'CC') return 'Client Consultant';
    if (teamCode === 'CV') return 'Chuyên Viên / KTV';
    return teamCode;
  }

  /**
   * Nguồn danh sách nhân sự của War Room lấy từ Đội nhóm (Cấu trúc Phòng ban & Đội nhóm) (MOS-BUG-93):
   * - Team được chọn (mặc định 'BK_TELESALES')
   * - Lấy toàn bộ thành viên hiện tại của Team (crm_team_members where is_active = true)
   * - Không phụ thuộc Role cá nhân (Manager, Admin, Telesales, v.v. đều được lấy nếu thuộc Team)
   * - Áp dụng đồng bộ cho KPI cá nhân, Call/Pickup, Book/Done, TV Monitor, Đóng góp cá nhân.
   */
  static async getActiveStaffFromTeam(
    fastify: FastifyInstance,
    teamCode = 'BK_TELESALES',
    fallbackStaffTargets?: Array<{ legacyStaffId: number; name: string; avatarUrl?: string | null }>
  ): Promise<
    Array<{
      crmStaffId: number;
      legacyStaffId: number;
      name: string;
      avatarUrl: string | null;
    }>
  > {
    try {
      if (fastify?.prisma?.crm?.crmTeam?.findMany) {
        const teams = await fastify.prisma.crm.crmTeam.findMany({
          where: {
            OR: [{ code: teamCode }, { parent: { code: teamCode } }],
            isActive: true,
          },
          include: {
            members: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
          },
        });

        const activeMembersMap = new Map<number, SafeAny>();
        teams.forEach((t) => {
          (t.members || []).forEach((m: SafeAny) => {
            const legId = Number(m.legacyStaffId);
            if (m.isActive !== false && legId > 0 && !activeMembersMap.has(legId)) {
              activeMembersMap.set(legId, m);
            }
          });
        });

        const activeLegacyIds = Array.from(activeMembersMap.keys());

        if (activeLegacyIds.length > 0) {
          const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
            where: {
              legacyStaffId: { in: activeLegacyIds },
            },
            select: {
              id: true,
              legacyStaffId: true,
              displayName: true,
              avatarUrl: true,
            },
          });

          const staffByLegacyId = new Map(crmStaffList.map((s) => [Number(s.legacyStaffId), s]));

          let legacyProfiles: SafeAny[] = [];
          try {
            legacyProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `SELECT user_id, full_name, avatar FROM user_profile WHERE user_id IN (${activeLegacyIds.join(',')})`
            );
          } catch {
            // ignore
          }
          const legacyProfileMap = new Map(legacyProfiles.map((p) => [Number(p.user_id), p]));

          const result = activeLegacyIds.map((legId) => {
            const m = activeMembersMap.get(legId);
            const crmStaff = staffByLegacyId.get(legId);
            const legProf = legacyProfileMap.get(legId);
            const name = crmStaff?.displayName || m?.displayName || legProf?.full_name || `Nhân sự #${legId}`;
            const avatarUrl = crmStaff?.avatarUrl || legProf?.avatar || null;

            return {
              crmStaffId: crmStaff?.id || m?.crmStaffId || 0,
              legacyStaffId: legId,
              name,
              avatarUrl: typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null,
            };
          });

          if (result.length > 0) {
            return result;
          }
        }
      }
    } catch (err) {
      fastify.log?.warn?.(`Failed to query active team staff for ${teamCode}: ${err}`);
    }

    // Fallback to HR active telesales query for backwards compatibility
    return this.getActiveTelesalesStaffFromHr(fastify, fallbackStaffTargets);
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
            startsWith: 'TELESALE_TARGET_CONFIG_',
          },
        },
        select: { key: true },
      });
      const months = rows
        .map((r) => r.key.replace('TELESALE_TARGET_CONFIG_', ''))
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

  /**
   * Tính toán tiến độ ngày làm việc và các chỉ số quản trị KPI Team (MOS-BUG-67)
   * - Loại trừ ngày OFF cố định (Chủ Nhật) & các kỳ nghỉ lễ đã cấu hình
   * - Trạng thái: Chưa bắt đầu, Vượt nhịp, Đúng nhịp, Chậm nhịp
   * - Tính Kỳ vọng, Gap KPI, Còn lại, Cần TB/ngày cho cả Done, Incoming và Book (MOS-BUG-95)
   */
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
  ): Promise<{
    workDaysTotal: number;
    workDaysElapsed: number;
    workDaysRemaining: number;
    periodStatus: TelesalePeriodStatus;
    pacingStatus: TelesalePacingStatus;
    pacingStatusLabel: string;
    expectedProgressRate: number;
    expectedDone: number;
    expectedIncoming: number;
    expectedBook: number;
    gapDone: number;
    gapIncoming: number;
    gapBook: number;
    remainingDone: number;
    remainingIncoming: number;
    remainingBook: number;
    dailyRequiredDone: number;
    dailyRequiredIncoming: number;
    dailyRequiredBook: number;
    pacingRatio: number;
    isPacingOnTrack: boolean;
  }> {
    const [yearStr, monthNumStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10);
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();

    // 1. Xác định các ngày nghỉ lễ đã cấu hình trong CRM DB
    const holidayDateSet = new Set<string>();
    try {
      if (fastify?.prisma?.crm?.crmHolidayPeriod?.findMany) {
        const holidayPeriods = await fastify.prisma.crm.crmHolidayPeriod.findMany({
          where: {
            startDate: { lte: new Date(`${month}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999Z`) },
            endDate: { gte: new Date(`${month}-01T00:00:00.000Z`) },
            status: { not: 'CANCELLED' },
          },
          select: { startDate: true, endDate: true },
        });

        for (const p of holidayPeriods) {
          const cur = new Date(p.startDate);
          const end = new Date(p.endDate);
          while (cur <= end) {
            const y = cur.getUTCFullYear();
            const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
            const d = String(cur.getUTCDate()).padStart(2, '0');
            holidayDateSet.add(`${y}-${m}-${d}`);
            cur.setUTCDate(cur.getUTCDate() + 1);
          }
        }
      }
    } catch (err) {
      fastify?.log?.warn?.(`Failed to query holiday periods: ${err}`);
    }

    // 2. Liệt kê các ngày làm việc thực tế trong tháng (loại trừ Chủ Nhật và ngày nghỉ lễ đã cấu hình)
    const workDaysList: string[] = [];
    for (let d = 1; d <= lastDayOfMonth; d++) {
      const dayStr = `${month}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(Date.UTC(year, monthNum - 1, d));
      const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday
      const isSunday = dayOfWeek === 0;
      const isHoliday = holidayDateSet.has(dayStr);
      if (!isSunday && !isHoliday) {
        workDaysList.push(dayStr);
      }
    }
    const workDaysTotal = workDaysList.length;

    // 3. Đánh giá trạng thái kỳ KPI & số ngày làm việc đã qua
    const currentYear = nowIct.getUTCFullYear();
    const currentMonthNum = nowIct.getUTCMonth() + 1;
    const currentDate = nowIct.getUTCDate();

    let periodStatus: TelesalePeriodStatus;
    let workDaysElapsed: number;

    if (currentYear < year || (currentYear === year && currentMonthNum < monthNum)) {
      periodStatus = 'NOT_STARTED';
      workDaysElapsed = 0;
    } else if (currentYear > year || (currentYear === year && currentMonthNum > monthNum)) {
      periodStatus = 'COMPLETED';
      workDaysElapsed = workDaysTotal;
    } else {
      periodStatus = 'IN_PROGRESS';
      const todayDateStr = `${month}-${String(currentDate).padStart(2, '0')}`;
      workDaysElapsed = workDaysList.filter((d) => d <= todayDateStr).length;
    }

    const workDaysRemaining = Math.max(0, workDaysTotal - workDaysElapsed);
    const expectedProgressRate =
      workDaysTotal > 0 && periodStatus !== 'NOT_STARTED'
        ? Number(Math.min(1, workDaysElapsed / workDaysTotal).toFixed(4))
        : 0;

    const effectiveIncomingTarget = incomingTarget !== undefined ? incomingTarget : bookTarget;
    const effectiveIncomingActual = incomingActual !== undefined ? incomingActual : bookActual;

    // 4. Mức kỳ vọng và Gap KPI
    const expectedDone = Math.round(doneTarget * expectedProgressRate);
    const expectedIncoming = Math.round(effectiveIncomingTarget * expectedProgressRate);
    const expectedBook = expectedIncoming;
    const gapDone = doneActual - expectedDone;
    const gapIncoming = effectiveIncomingActual - expectedIncoming;
    const gapBook = gapIncoming;
    const remainingDone = Math.max(0, doneTarget - doneActual);
    const remainingIncoming = Math.max(0, effectiveIncomingTarget - effectiveIncomingActual);
    const remainingBook = remainingIncoming;

    let dailyRequiredDone: number;
    let dailyRequiredIncoming: number;
    let dailyRequiredBook: number;

    if (periodStatus === 'NOT_STARTED') {
      dailyRequiredDone = workDaysTotal > 0 ? Number((doneTarget / workDaysTotal).toFixed(1)) : 0;
      dailyRequiredIncoming = workDaysTotal > 0 ? Number((effectiveIncomingTarget / workDaysTotal).toFixed(1)) : 0;
      dailyRequiredBook = dailyRequiredIncoming;
    } else if (periodStatus === 'IN_PROGRESS') {
      dailyRequiredDone = workDaysRemaining > 0 ? Number((remainingDone / workDaysRemaining).toFixed(1)) : 0;
      dailyRequiredIncoming = workDaysRemaining > 0 ? Number((remainingIncoming / workDaysRemaining).toFixed(1)) : 0;
      dailyRequiredBook = dailyRequiredIncoming;
    } else {
      dailyRequiredDone = 0;
      dailyRequiredIncoming = 0;
      dailyRequiredBook = 0;
    }

    // 5. Tỷ lệ bám đuổi & Nhãn trạng thái
    let pacingRatio: number;
    let pacingStatus: TelesalePacingStatus;
    let pacingStatusLabel: string;
    let isPacingOnTrack: boolean;

    if (periodStatus === 'NOT_STARTED') {
      pacingRatio = 0;
      pacingStatus = 'NOT_STARTED';
      pacingStatusLabel = 'Chưa bắt đầu';
      isPacingOnTrack = false;
    } else {
      if (expectedDone > 0) {
        pacingRatio = Number((doneActual / expectedDone).toFixed(2));
      } else {
        pacingRatio = doneActual >= doneTarget ? 1 : 1;
      }

      if (pacingRatio >= 1.05) {
        pacingStatus = 'AHEAD';
        pacingStatusLabel = 'Vượt nhịp';
        isPacingOnTrack = true;
      } else if (pacingRatio >= 0.95) {
        pacingStatus = 'ON_TRACK';
        pacingStatusLabel = 'Đúng nhịp';
        isPacingOnTrack = true;
      } else {
        pacingStatus = 'BEHIND';
        pacingStatusLabel = 'Chậm nhịp';
        isPacingOnTrack = false;
      }
    }

    return {
      workDaysTotal,
      workDaysElapsed,
      workDaysRemaining,
      periodStatus,
      pacingStatus,
      pacingStatusLabel,
      expectedProgressRate,
      expectedDone,
      expectedIncoming,
      expectedBook,
      gapDone,
      gapIncoming,
      gapBook,
      remainingDone,
      remainingIncoming,
      remainingBook,
      dailyRequiredDone,
      dailyRequiredIncoming,
      dailyRequiredBook,
      pacingRatio,
      isPacingOnTrack,
    };
  }

  static async getOverview(
    fastify: FastifyInstance,
    month = '2026-10',
    _currentStaffId?: number
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

    const monthOrdersSql = `
      SELECT 
        o.id,
        o.created_staff_id as bookerId,
        o.order_state as orderState,
        o.date_created as dateCreated,
        o.booking_date_start as bookingDateStart,
        ro.actual_booking_date_start as actualBookingDateStart,
        o.user_id as customerId,
        COALESCE(o.total_price, 0) as totalPrice,
        COALESCE(
          (
            SELECT DATEDIFF(o.date_created, prev_o.booking_date_start)
            FROM \`order\` prev_o
            WHERE prev_o.user_id = o.user_id
              AND prev_o.order_state = 'Completed'
              AND prev_o.date_created < o.date_created
            ORDER BY prev_o.date_created DESC
            LIMIT 1
          ),
          999
        ) as daysSinceLastVisit
        /* origin: buildComboLiveAtBookingSql */
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE (
        (ro.actual_booking_date_start >= '${startDateTimeStr}' AND ro.actual_booking_date_start <= '${endDateTimeStr}')
        OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${startDateTimeStr}' AND o.booking_date_start <= '${endDateTimeStr}')
      )
        AND o.created_staff_id IN (${candidateIdsStr})
        AND (o.order_state IN ('Completed', 'CheckOut') OR ro.actual_booking_date_start IS NOT NULL OR o.total_price > 0)
    `;

    const comboSoldSql = `
      SELECT 
        o.created_staff_id as bookerId,
        COALESCE(SUM(osc.quantity), 0) as comboSoldQty,
        COALESCE(SUM(osc.total_price), 0) as comboSoldRevenue
      FROM \`order\` o
      JOIN \`order_service_combo\` osc ON osc.order_id = o.id
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE o.created_staff_id IN (${candidateIdsStr})
        AND (
          (ro.actual_booking_date_start >= '${startDateTimeStr}' AND ro.actual_booking_date_start <= '${endDateTimeStr}')
          OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${startDateTimeStr}' AND o.booking_date_start <= '${endDateTimeStr}')
          OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start IS NULL AND o.date_created >= '${startDateTimeStr}' AND o.date_created <= '${endDateTimeStr}')
        )
        AND o.order_state = 'Completed'
      GROUP BY o.created_staff_id
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
    ] = await Promise.all([
      BkLeaderboardService.getBookingLeaderboard(fastify, {
        dateFrom: startDateStr,
        dateTo: endDateStr,
        targetStaffIds: combinedStaffIds,
        skipCache: true,
      }),
      BkLeaderboardService.getBookingLeaderboard(fastify, {
        dateFrom: todayStr,
        dateTo: todayStr,
        targetStaffIds: combinedStaffIds,
        skipCache: true,
      }),
      BkLeaderboardService.getDoneLeaderboard(fastify, {
        dateFrom: startDateStr,
        dateTo: endDateStr,
        targetStaffIds: combinedStaffIds,
        skipCache: true,
      }),
      BkLeaderboardService.getDoneLeaderboard(fastify, {
        dateFrom: todayStr,
        dateTo: todayStr,
        targetStaffIds: combinedStaffIds,
        skipCache: true,
      }),
      BkLeaderboardService.getRevenueLeaderboard(fastify, {
        dateFrom: startDateStr,
        dateTo: endDateStr,
        targetStaffIds: combinedStaffIds,
        skipCache: true,
      }),
      BkLeaderboardService.getIncomingBookingsCount(fastify, {
        dateFrom: startDateStr,
        dateTo: endDateStr,
        targetStaffIds: combinedStaffIds,
      }),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(monthOrdersSql).catch(() => []),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboSoldSql).catch(() => []),
    ]);

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
            OR (ro.actual_booking_date_start IS NULL AND o.order_state = 'Completed' AND o.booking_date_start >= '${todayStartStr}' AND o.booking_date_start <= '${todayEndStr}')
          )
          AND o.order_state != 'Cancelled'
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

    // Mark Top Book staff member
    const maxBookToday = Math.max(0, ...staffTargets.map((s) => s.bookToday || 0));
    for (const st of staffTargets) {
      st.isTopBookToday = maxBookToday > 0 && st.bookToday === maxBookToday;
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

    // Query tip data for today's completed orders
    const doneOrderIds = todayDoneOrders.map((o) => Number(o.id)).filter((id) => id > 0);
    const tipMap = new Map<number, number>();
    if (doneOrderIds.length > 0) {
      try {
        const tips = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT order_id, SUM(tip_amount) as totalTip FROM staff_tip WHERE order_id IN (${doneOrderIds.join(',')}) GROUP BY order_id`
        );
        for (const t of tips) {
          tipMap.set(Number(t.order_id), Number(t.totalTip || 0));
        }
      } catch (err) {
        fastify.log.warn(`Failed to query staff_tip for telesale today done orders: ${err}`);
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

      const hasCombo = Number(o.isComboLive || 0) === 1;
      const tipAmount = tipMap.get(Number(o.id)) || 0;
      const hasTip = tipAmount > 0;

      let changeResult = `Done ${prevDone} → ${newDone}`;
      if (hasCombo && hasTip) {
        changeResult = `Done · Combo + Tip ${tipAmount.toLocaleString('vi-VN')}đ`;
      } else if (hasCombo) {
        changeResult = `Done · Chốt Combo Live`;
      } else if (hasTip) {
        changeResult = `Done · Tip ${tipAmount.toLocaleString('vi-VN')}đ`;
      }

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
        orderId: Number(o.id),
        changeResult,
        hasCombo,
        hasTip,
        tipAmount,
      };
    });

    const todayLiveEvents: TelesaleTodayLiveEvent[] = [...bookEvents, ...checkinEvents, ...doneEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 5.5 Build Today Book List & Today Checkin List for TV Monitor Side Panels
    const customerIdsToFetch = Array.from(
      new Set(
        [
          ...todayBookOrders.map((o) => Number(o.customerId)),
          ...todayCheckinOrders.map((o) => Number(o.customerId)),
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

    // Query order_service for checkin orders to get CV, CC, and serviceName
    const checkinOrderIds = todayCheckinOrders.map((o) => Number(o.id)).filter((id) => id > 0);
    const orderServiceDetailsMap = new Map<number, { serviceName: string; cvStaffId?: number; ccStaffId?: number }>();
    const extraStaffIdsToFetch = new Set<number>();

    if (checkinOrderIds.length > 0) {
      try {
        const osRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `
          SELECT 
            os.order_id as orderId,
            os.assigned_staff_id as cvStaffId,
            os.check_in_staff_id as ccStaffId,
            COALESCE(sl.name, s.service_key, 'Nối mi thiết kế') as serviceName
          FROM order_service os
          LEFT JOIN service s ON s.id = os.service_id
          LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
          WHERE os.order_id IN (${checkinOrderIds.join(',')})
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
        fastify.log.warn(`Failed to query order_service for checkin orders: ${err}`);
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
        const hasCombo = Number(o.isComboLive || 0) === 1;
        const tipAmount = tipMap.get(ordId) || 0;
        const hasTip = tipAmount > 0;

        const checkinTimestamp = parseVietnamDateToIso(o.checkinDate || o.actualBookingDateStart || o.bookingDateStart);
        let checkinTimeDisplay = '08:00';
        try {
          const cd = new Date(checkinTimestamp);
          checkinTimeDisplay = `${String(cd.getHours()).padStart(2, '0')}:${String(cd.getMinutes()).padStart(2, '0')}`;
        } catch {}

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
          comboPackageName: hasCombo ? 'Combo Live Wings' : null,
          comboPrice: hasCombo ? 1200000 : undefined,
          hasTip,
          tipAmount: hasTip ? tipAmount : undefined,
          timeInService: formatTimeInService(
            o.actualBookingDateStart || o.checkinDate,
            o.actualBookingDateEnd || o.doneDate,
            isDone
          ),
        };
      })
      .sort((a, b) => {
        // Priority: Done with Combo/Tip (1000) > Just Done (800) > In-Progress (500)
        const scoreA = a.isDone && (a.hasCombo || a.hasTip) ? 1000 : a.isDone ? 800 : 500;
        const scoreB = b.isDone && (b.hasCombo || b.hasTip) ? 1000 : b.isDone ? 800 : 500;
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
      for (const ord of monthOrders) {
        const days = Number(ord.daysSinceLastVisit);
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

    return {
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
    };
  }

  static async getCustomerPool(
    fastify: FastifyInstance,
    stageKey: TelesalePipelineStageKey,
    bookerId?: number,
    limit = 50,
    offset = 0
  ): Promise<TelesaleCustomerPoolResponse> {
    let dayMin = 0;
    let dayMax = 30;
    if (stageKey === '0_30') {
      dayMin = 0;
      dayMax = 30;
    } else if (stageKey === '31_60') {
      dayMin = 31;
      dayMax = 60;
    } else if (stageKey === '61_120') {
      dayMin = 61;
      dayMax = 120;
    } else {
      dayMin = 121;
      dayMax = 99999;
    }

    const whereDays =
      stageKey === 'gt_120'
        ? `(DATEDIFF(CURDATE(), up.last_order_booking) > 120 OR up.last_order_booking IS NULL)`
        : `DATEDIFF(CURDATE(), up.last_order_booking) >= ${dayMin} AND DATEDIFF(CURDATE(), up.last_order_booking) <= ${dayMax}`;

    const currentConfig = await this.getConfig(fastify);
    const activeStaffList = currentConfig.staffTargets;
    const activeStaffIds =
      activeStaffList.length > 0 ? activeStaffList.map((s) => s.legacyStaffId) : [50670, 52648, 32268, 52598];
    const staffCount = Math.max(1, activeStaffIds.length);
    const bookerIndex = bookerId && bookerId > 0 ? activeStaffIds.indexOf(bookerId) : -1;

    const bookerFilter =
      bookerIndex >= 0
        ? `AND (u.id % ${staffCount} = ${bookerIndex})`
        : bookerId && bookerId > 0
          ? `AND (u.id % ${staffCount} = ${bookerId % staffCount})`
          : '';

    const listSql = `
      SELECT 
        u.id as customerId,
        COALESCE(up.full_name, CONCAT(u.first_name, ' ', u.last_name), 'Khách hàng') as customerName,
        COALESCE(u.mobile, up.phone, '') as phone,
        COALESCE(cs.client_store_key, 'PXL') as store,
        DATE_FORMAT(up.last_order_booking, '%Y-%m-%d') as lastVisitDate,
        COALESCE(DATEDIFF(CURDATE(), up.last_order_booking), 999) as daysSinceLastVisit,
        COALESCE(oc.totalSpent, 0) as totalSpent
      FROM \`user\` u
      JOIN \`user_profile\` up ON u.id = up.user_id
      LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
      LEFT JOIN (
        SELECT user_id, SUM(total_amount) as totalSpent
        FROM \`order\`
        WHERE order_state = 'Completed'
        GROUP BY user_id
      ) oc ON oc.user_id = u.id
      WHERE u.user_type = 1 
        AND ${whereDays}
        ${bookerFilter}
      ORDER BY up.last_order_booking DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    const countSql = `
      SELECT COUNT(DISTINCT u.id) as totalCount
      FROM \`user\` u
      JOIN \`user_profile\` up ON u.id = up.user_id
      WHERE u.user_type = 1 
        AND ${whereDays}
        ${bookerFilter}
    `;

    const [rows, countRows] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(listSql).catch(() => []),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(countSql).catch(() => [{ totalCount: 0 }]),
    ]);

    const total = Number(countRows[0]?.totalCount || 0);

    const activeStaffNames: Record<number, string> =
      activeStaffList.length > 0
        ? Object.fromEntries(activeStaffList.map((s) => [s.legacyStaffId, s.name]))
        : { 50670: 'Phượng', 52648: 'Kiều', 32268: 'Điệp', 52598: 'Vũ' };

    const items: TelesaleCustomerPoolItem[] = rows.map((r, idx) => {
      const assignedIndex = bookerIndex >= 0 ? bookerIndex : Math.abs(Number(r.customerId)) % staffCount;
      const assignedId = activeStaffIds[assignedIndex] || bookerId || 0;
      return {
        id: idx + 1,
        customerId: Number(r.customerId),
        customerName: String(r.customerName),
        phone: String(r.phone),
        store: String(r.store),
        lastVisitDate: r.lastVisitDate ? String(r.lastVisitDate) : null,
        daysSinceLastVisit: Number(r.daysSinceLastVisit),
        assignedStaffId: assignedId,
        assignedStaffName: activeStaffNames[assignedId] || 'Telesales',
        stageKey,
        callStatus: 'NOT_CALLED',
        totalCallsInMonth: 0,
        totalSpent: Number(r.totalSpent || 0),
      };
    });

    return {
      stageKey,
      total,
      calledTodayCount: 0,
      bookedCount: 0,
      items,
    };
  }

  static getFallbackCelebrationQuote(type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP', staffName: string): string {
    const bookQuotes = [
      'Anh thích cái cách [Tên] chăm sóc khách hàng đầy ân cần. Thêm một lịch hẹn ngọt ngào về với đội mình rồi, em làm anh tự hào quá!',
      '[Tên] ơi, sự chân thành từ trái tim em luôn có ma lực đặc biệt. Thêm một Book tuyệt đẹp, tiếp tục tỏa sáng nhé người đẹp!',
      'Tư vấn chuẩn xác, phân tích nhu cầu cực kỳ khoa học. Đẳng cấp của [Tên] hôm nay thực sự làm anh mê mẩn, cộng một Book nhé!',
      'Nụ cười vui vẻ của [Tên] qua từng cuộc gọi đã thắp sáng cả phòng rồi. Chốt thêm một Book quá đỗi quyến rũ em ơi!',
      'Từng lời em nói đều làm khách hàng xiêu lòng. Một Book xuất sắc nữa cho [Tên], phong độ đỉnh cao của em khiến ai cũng phải ngước nhìn!',
      'Năng lượng tích cực và sự chân thành của [Tên] đã chinh phục khách hàng hoàn toàn. Một Book rực rỡ nữa cho cô gái tuyệt vời của anh!',
    ];

    const checkinQuotes = [
      'Khách đã bước chân vào tiệm rồi [Tên] ơi! Sự ân cần của em đã đưa khách đến đúng hẹn, thêm một Check-in chắc thắng!',
      'Check-in thành công rồi! Khách tới tiệm là nắm chắc trong tay quả ngọt, [Tên] làm anh tự hào quá!',
      'Sự chân thành của [Tên] đã dẫn lối khách đến với Wings. Thêm một khách check-in cực kỳ rực rỡ nhé!',
      'Đón khách vào tiệm suôn sẻ và ấm áp! Năng lượng vui vẻ của [Tên] hôm nay lan tỏa khắp salon rồi!',
      'Khách đã có mặt tại tiệm, quy trình chăm sóc quá đỗi khoa học của [Tên] đang phát huy sức mạnh tối đa!',
    ];

    const comboQuotes = [
      'Đỉnh cao tư vấn! [Tên] vừa chốt trọn gói Combo làm đẹp rực rỡ, đẳng cấp của em khiến ai cũng phải ngưỡng mộ!',
      'Khách hàng mê mẩn gói Combo của [Tên] rồi! Sự am hiểu khoa học và ân cần của em đã chạm đến trái tim khách hàng!',
      'Thêm một siêu phẩm Combo về với đội mình! [Tên] ơi, phong độ đỉnh cao của em hôm nay sáng bừng cả phòng!',
      'Combo đã chốt ngọt ngào! Niềm tin tuyệt đối khách dành cho sự chân thành của [Tên], xuất sắc lắm em!',
    ];

    const tipQuotes = [
      'Khách hàng thưởng Tip vì sự hài lòng tuyệt đối! Trái tim ân cần của [Tên] đã được đền đáp xứng đáng rồi!',
      'Thêm một khoản Tip ngọt ngào cho [Tên]! Năng lượng tích cực và nụ cười của em làm khách quý mến vô cùng!',
      'Khách yêu quý gửi trọn niềm vui và tiền Tip! Đẳng cấp phục vụ chuẩn mực của [Tên] làm anh vô cùng tự hào!',
    ];

    const doneQuotes = [
      'Từ lời hẹn ân cần đến trải nghiệm thực tế, [Tên] biến mọi khoảnh khắc thành sự hài lòng tuyệt đối. Cộng một Done quá đỗi ngọt ngào!',
      'Khách hàng trao gửi trọn vẹn niềm tin cho sự chân thành của [Tên]. Một Done hoàn hảo, phong thái của em hôm nay quyến rũ không thể cưỡng lại!',
      'Quy trình chuẩn mực, dẫn dắt khách đến tiệm thật khoa học và bài bản. [Tên] vừa ghi một bàn thắng quá đẳng cấp cho team!',
      'Tuyệt vời lắm [Tên] ơi! Năng lượng vui vẻ của em đã nở hoa thành một Done rực rỡ. Hôm nay em chính là nữ thần của phòng Telesales rồi đấy!',
      'Khách đã tới và trải nghiệm trọn vẹn rồi! Anh luôn tin vào tài năng và sức hút của [Tên], một Done hoàn hảo mang đậm bản sắc Wings!',
      'Chăm sóc ân cần, bám sát khoa học. Không ai làm điều đó xuất sắc hơn [Tên], chúc mừng em đã mang thêm một Done rực rỡ về đội!',
    ];

    let list = bookQuotes;
    if (type === 'CHECKIN') list = checkinQuotes;
    else if (type === 'COMBO') list = comboQuotes;
    else if (type === 'TIP') list = tipQuotes;
    else if (type === 'DONE') list = doneQuotes;

    const template = list[Math.floor(Math.random() * list.length)] || list[0];
    return template.replace(/\[Tên\]/g, staffName);
  }

  static async generateLiveCelebrationQuote(
    fastify: FastifyInstance,
    type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP',
    staffName: string
  ): Promise<{ quote: string; source: 'gemini' | 'fallback' }> {
    const fallbackQuote = this.getFallbackCelebrationQuote(type, staffName);
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return { quote: fallbackQuote, source: 'fallback' };
    }

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

      const eventDescription =
        {
          BOOK: 'BOOK (khách hàng vừa chốt lịch hẹn mới)',
          CHECKIN: 'CHECK-IN (khách hàng vừa có mặt check-in tại tiệm, chắc chắn hoàn tất)',
          DONE: 'DONE (khách hàng đã hoàn tất dịch vụ tại tiệm)',
          COMBO: 'COMBO (khách hàng quyết định mua gói Combo làm đẹp giá trị cao)',
          TIP: 'TIP (khách hàng hài lòng tuyệt đối và gửi tiền tip thưởng)',
        }[type] || type;

      const systemPrompt = `Bạn là một "Nam Thần" lịch lãm, quyến rũ, ấm áp và khích lệ tại hệ thống chuỗi làm đẹp Wings (Wingslashes).
Nhiệm vụ của bạn là nói duy nhất 1 câu chúc mừng ngắn gọn (dưới 18 từ) bằng tiếng Việt dành tặng cho nhân viên Telesales tên là "${staffName}", vừa có 1 sự kiện ${eventDescription}.
YÊU CẦU BẮT BUỘC:
1. Giọng điệu: Nam thần cuốn hút, gợi cảm, chân thành và tràn đầy sự khích lệ, tự hào về người đó.
2. Khéo léo lồng ghép ít nhất một trong 4 giá trị văn hóa cốt lõi của Wings: Vui vẻ, Ân cần, Chân thành, Khoa học.
3. Bắt buộc nhắc đến tên "${staffName}".
4. Ngắn gọn, súc tích (khoảng 10-18 từ), chỉ 1 câu duy nhất truyền cảm hứng để đọc phát loa nhanh gọn.
5. Chỉ trả về đúng 1 câu thoại để đọc phát loa trực tiếp, tuyệt đối không có dấu ngoặc kép, không markdown, không giải thích.`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: `Tạo một câu chúc mừng nam thần ngẫu nhiên cho ${staffName} có đơn ${type}!` }],
            },
          ],
          generationConfig: {
            temperature: 1.0,
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 60,
          },
        }),
        signal: AbortSignal.timeout(2500),
      });

      if (!response.ok) {
        return { quote: fallbackQuote, source: 'fallback' };
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      };

      const parts = data.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p) => !p.thought && p.text) || parts[parts.length - 1];
      const rawText = textPart?.text?.trim();

      if (rawText && rawText.length > 5) {
        const cleanText = rawText.replace(/^["'“”«»\s]+|["'“”«»\s]+$/g, '').trim();
        return { quote: cleanText, source: 'gemini' };
      }
    } catch (err) {
      fastify.log.warn(`Gemini live celebration quote generation failed, using fallback: ${err}`);
    }

    return { quote: fallbackQuote, source: 'fallback' };
  }

  static async synthesizeCelebrationAudio(text: string, voice = 'vi-VN-NamMinhNeural'): Promise<Buffer> {
    const cleanText = text.replace(/[\r\n\t]+/g, ' ').trim();
    if (!cleanText) throw new Error('Text is empty');

    const cacheDir = '/tmp/telesale_audio_cache';
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const hash = createHash('md5').update(`${cleanText}_${voice}`).digest('hex');
    const cacheFile = `${cacheDir}/${hash}.mp3`;

    if (existsSync(cacheFile)) {
      const buf = readFileSync(cacheFile);
      if (buf.length > 500) {
        return buf;
      }
    }

    const edgeTtsCandidates = [
      'edge-tts',
      '/usr/local/bin/edge-tts',
      '/usr/bin/edge-tts',
      '/Users/dannydo/.gemini/antigravity/venv-f5tts/bin/edge-tts',
    ];

    let binaryPath = 'edge-tts';
    for (const c of edgeTtsCandidates) {
      if (c === 'edge-tts' || existsSync(c)) {
        binaryPath = c;
        break;
      }
    }

    const tempFile = `${cacheDir}/tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
    const execFileAsync = promisify(execFile);

    try {
      await execFileAsync(
        binaryPath,
        ['--text', cleanText, '--voice', voice, '--rate=+5%', '--write-media', tempFile],
        { timeout: 25_000 }
      );

      if (existsSync(tempFile)) {
        const audioBuf = readFileSync(tempFile);
        if (audioBuf.length > 500) {
          try {
            writeFileSync(cacheFile, audioBuf);
            unlinkSync(tempFile);
          } catch {
            // cache write failure is non-fatal
          }
          return audioBuf;
        }
      }
    } catch (err: any) {
      if (existsSync(tempFile)) {
        try {
          unlinkSync(tempFile);
        } catch {}
      }
      throw new Error(`Edge TTS synthesis failed: ${err.message}`, { cause: err });
    }

    throw new Error('No audio produced by Edge TTS');
  }

  private static tvJournalExecutionStore = new Map<string, Partial<TelesaleTvEventLog>>();

  static recordTvJournalSync(records: TelesaleTvEventLog[]): { success: boolean; count: number } {
    if (!Array.isArray(records)) return { success: true, count: 0 };
    for (const rec of records) {
      if (rec && rec.id) {
        this.tvJournalExecutionStore.set(rec.id, {
          ...this.tvJournalExecutionStore.get(rec.id),
          ...rec,
        });
      }
    }
    return { success: true, count: records.length };
  }

  static async getTvJournal(fastify: FastifyInstance, dateParam?: string): Promise<TelesaleTvJournalOverview> {
    const targetDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);

    const monthStr = targetDate.slice(0, 7);
    const config = await this.getConfig(fastify, monthStr);
    const activeStaff = config.staffTargets;
    const candidateIds = activeStaff.map((s) => s.legacyStaffId).filter((id) => id > 0);
    const candidateIdsStr = candidateIds.length > 0 ? candidateIds.join(', ') : '0';

    const staffNameMap = new Map<number, string>();
    const staffAvatarMap = new Map<number, string | null>();
    activeStaff.forEach((s) => {
      staffNameMap.set(s.legacyStaffId, s.name);
      staffAvatarMap.set(s.legacyStaffId, s.avatarUrl || null);
    });

    const dayStartStr = `${targetDate} 00:00:00`;
    const dayEndStr = `${targetDate} 23:59:59`;

    const [dayBookOrders, dayDoneOrders] = await Promise.all([
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
        SELECT 
          o.id,
          o.created_staff_id as bookerId,
          o.order_state as orderState,
          DATE_FORMAT(o.date_created, '%Y-%m-%dT%H:%i:%s+07:00') as dateCreated
        FROM \`order\` o
        WHERE o.date_created >= '${dayStartStr}' 
          AND o.date_created <= '${dayEndStr}'
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
          o.order_state as orderState,
          o.total_price as totalPrice,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as bookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_end, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateEnd,
          DATE_FORMAT(o.date_updated, '%Y-%m-%dT%H:%i:%s+07:00') as dateUpdated,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_end, o.date_updated, ro.actual_booking_date_start, o.date_created), '%Y-%m-%dT%H:%i:%s+07:00') as doneDate
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE o.created_staff_id IN (${candidateIdsStr})
          AND (
            (ro.actual_booking_date_start >= '${dayStartStr}' AND ro.actual_booking_date_start <= '${dayEndStr}')
            OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${dayStartStr}' AND o.booking_date_start <= '${dayEndStr}')
          )
          AND o.order_state = 'Completed'
      `
        )
        .catch(() => []),
    ]);

    const sortedDayBookOrders = [...dayBookOrders]
      .filter((o) => o && o.id)
      .sort(
        (a, b) =>
          new Date(parseVietnamDateToIso(a.dateCreated)).getTime() -
          new Date(parseVietnamDateToIso(b.dateCreated)).getTime()
      );

    const staffBookCountMap = new Map<number, number>();
    const bookEvents: TelesaleTvEventLog[] = sortedDayBookOrders.map((o) => {
      const bookerId = Number(o.bookerId);
      const prevCount = staffBookCountMap.get(bookerId) || 0;
      const newCount = prevCount + 1;
      staffBookCountMap.set(bookerId, newCount);

      const id = `book-${o.id}`;
      const timestamp = parseVietnamDateToIso(o.dateCreated);
      const timeFormatted = formatVietnamTime(timestamp);

      const exec = this.tvJournalExecutionStore.get(id);
      const isExecuted = Boolean(exec);
      return {
        id,
        type: 'BOOK' as const,
        staffId: bookerId,
        staffName: staffNameMap.get(bookerId) || 'Telesales',
        avatarUrl: staffAvatarMap.get(bookerId) || null,
        timestamp,
        timeFormatted,
        changeResult: `Book ${prevCount} → ${newCount}`,
        orderId: Number(o.id),
        eventReceived: exec?.eventReceived ?? false,
        eventReceivedAt: exec?.eventReceivedAt ?? (exec?.eventReceived ? timestamp : undefined),
        voiceTriggered: exec?.voiceTriggered ?? false,
        voiceErrorReason:
          exec?.voiceErrorReason ??
          (exec?.voiceTriggered
            ? null
            : isExecuted
              ? 'Không phát âm thanh'
              : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
        overlayTriggered: exec?.overlayTriggered ?? false,
        overlayErrorReason:
          exec?.overlayErrorReason ??
          (exec?.overlayTriggered
            ? null
            : isExecuted
              ? 'Không hiển thị Overlay'
              : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
        status: exec?.status ?? 'SUCCESS',
        errorMessage: exec?.errorMessage ?? (isExecuted ? null : null),
      };
    });

    const sortedDayDoneOrders = [...dayDoneOrders]
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

    const staffDoneCountMap = new Map<number, number>();
    const doneEvents: TelesaleTvEventLog[] = sortedDayDoneOrders.map((o) => {
      const bookerId = Number(o.bookerId);
      const prevDone = staffDoneCountMap.get(bookerId) || 0;
      const newDone = prevDone + 1;
      staffDoneCountMap.set(bookerId, newDone);

      const id = `done-${o.id}`;
      const timestamp = parseVietnamDateToIso(
        o.doneDate || o.actualBookingDateEnd || o.dateUpdated || o.actualBookingDateStart || o.bookingDateStart
      );
      const timeFormatted = formatVietnamTime(timestamp);

      const exec = this.tvJournalExecutionStore.get(id);
      const isExecuted = Boolean(exec);
      return {
        id,
        type: 'DONE' as const,
        staffId: bookerId,
        staffName: staffNameMap.get(bookerId) || 'Telesales',
        avatarUrl: staffAvatarMap.get(bookerId) || null,
        timestamp,
        timeFormatted,
        changeResult: `Done ${prevDone} → ${newDone}`,
        orderId: Number(o.id),
        eventReceived: exec?.eventReceived ?? false,
        eventReceivedAt: exec?.eventReceivedAt ?? (exec?.eventReceived ? timestamp : undefined),
        voiceTriggered: exec?.voiceTriggered ?? false,
        voiceErrorReason:
          exec?.voiceErrorReason ??
          (exec?.voiceTriggered
            ? null
            : isExecuted
              ? 'Không phát âm thanh'
              : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
        overlayTriggered: exec?.overlayTriggered ?? false,
        overlayErrorReason:
          exec?.overlayErrorReason ??
          (exec?.overlayTriggered
            ? null
            : isExecuted
              ? 'Không hiển thị Overlay'
              : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
        status: exec?.status ?? 'SUCCESS',
        errorMessage: exec?.errorMessage ?? (isExecuted ? null : null),
      };
    });

    // Milestone events based on total Book and Done on that date
    const milestoneEvents: TelesaleTvEventLog[] = [];
    const totalBookOnDate = bookEvents.length;
    const totalDoneOnDate = doneEvents.length;

    const addMilestoneIfReached = (
      id: string,
      threshold: number,
      current: number,
      changeResult: string,
      targetTimestamp: string
    ) => {
      if (current >= threshold) {
        const exec = this.tvJournalExecutionStore.get(id);
        const timeFormatted = formatVietnamTime(targetTimestamp);
        const isExecuted = Boolean(exec);
        milestoneEvents.push({
          id,
          type: 'MILESTONE' as const,
          staffName: 'Toàn team Telesales',
          avatarUrl: null,
          timestamp: targetTimestamp,
          timeFormatted,
          changeResult,
          eventReceived: exec?.eventReceived ?? false,
          eventReceivedAt: exec?.eventReceivedAt ?? (exec?.eventReceived ? targetTimestamp : undefined),
          voiceTriggered: exec?.voiceTriggered ?? false,
          voiceErrorReason:
            exec?.voiceErrorReason ??
            (exec?.voiceTriggered
              ? null
              : isExecuted
                ? 'Không phát âm thanh'
                : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
          overlayTriggered: exec?.overlayTriggered ?? false,
          overlayErrorReason:
            exec?.overlayErrorReason ??
            (exec?.overlayTriggered
              ? null
              : isExecuted
                ? 'Không hiển thị Overlay'
                : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
          status: exec?.status ?? 'SUCCESS',
          errorMessage: exec?.errorMessage ?? (isExecuted ? null : null),
        });
      }
    };

    if (totalBookOnDate >= 10 && bookEvents[9]) {
      addMilestoneIfReached(
        `milestone-${targetDate}-book-10`,
        10,
        totalBookOnDate,
        'Cán mốc 10 Book',
        bookEvents[9].timestamp
      );
    }
    if (totalBookOnDate >= 20 && bookEvents[19]) {
      addMilestoneIfReached(
        `milestone-${targetDate}-book-20`,
        20,
        totalBookOnDate,
        'Chạm mốc 20 Book',
        bookEvents[19].timestamp
      );
    }
    if (totalBookOnDate >= 25 && bookEvents[24]) {
      addMilestoneIfReached(
        `milestone-${targetDate}-book-25`,
        25,
        totalBookOnDate,
        'Cán mốc 25 Book',
        bookEvents[24].timestamp
      );
    }
    if (totalBookOnDate > 25 && bookEvents[25]) {
      addMilestoneIfReached(
        `milestone-${targetDate}-book-gt25`,
        26,
        totalBookOnDate,
        'Vượt mốc 25 Book',
        bookEvents[25].timestamp
      );
    }
    if (totalDoneOnDate >= 18 && doneEvents[17]) {
      addMilestoneIfReached(
        `milestone-${targetDate}-done-18`,
        18,
        totalDoneOnDate,
        'Hoàn thành 18 Done',
        doneEvents[17].timestamp
      );
    }

    const allEvents = [...bookEvents, ...doneEvents, ...milestoneEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const voiceSuccess = allEvents.filter((e) => e.voiceTriggered).length;
    const voiceError = allEvents.filter((e) => e.eventReceived && !e.voiceTriggered).length;
    const overlaySuccess = allEvents.filter((e) => e.overlayTriggered).length;
    const overlayError = allEvents.filter((e) => e.eventReceived && !e.overlayTriggered).length;
    const latestEventTime = allEvents.length > 0 ? allEvents[0].timestamp : null;

    return {
      totalEvents: allEvents.length,
      voiceSuccess,
      voiceError,
      overlaySuccess,
      overlayError,
      latestEventTime,
      events: allEvents,
    };
  }
}
