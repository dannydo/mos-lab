import { FastifyInstance } from 'fastify';
import {
  TelesaleTargetConfigDto,
  TelesalePeriodStatus,
  TelesalePacingStatus,
  TELESALES_EXECUTIVE_STANDARDS,
} from '@mos-lab/shared';

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

export type OverviewCacheInvalidator = (month?: string) => void;

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
    if (teamCode === 'CV') return 'Chuyên Viên (CV)';
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
}
