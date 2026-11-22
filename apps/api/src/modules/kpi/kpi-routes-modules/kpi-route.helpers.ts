import { FastifyInstance } from 'fastify';
import { type SafeAny } from '@mos-lab/shared';
import { getActiveBkTelesalesIds } from '../services/bk-salary.service.js';

export interface ConsultantSalaryStat {
  role: 'oc';
  baseSalary: number;
  salesReward: number;
  servicingReward: number;
  growthReward: number;
  storeServicingReward: number;
  checkins: number;
  checkinLateMin: number;
  totalSalary: number;
}

export interface TelesalesKpiScope {
  staffIds: number[];
  legacyUserIds: number[];
}

export function parseDateRange(dateFrom?: string, dateTo?: string, defaultDaysStart = 7) {
  const startStr =
    dateFrom || new Date(Date.now() - defaultDaysStart * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
  const endStr = dateTo || new Date().toLocaleDateString('en-CA');

  const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
  const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

  return {
    startStr: startPart,
    endStr: endPart,
    start: new Date(startPart + 'T00:00:00.000Z'),
    end: new Date(endPart + 'T23:59:59.999Z'),
  };
}

export function toKpiDayKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function normalizeStaffAvatarUrl(rawAvatar?: string | null): string | null {
  let avatarUrl = rawAvatar
    ? rawAvatar.startsWith('http') || rawAvatar.startsWith('data:')
      ? rawAvatar
      : `https://cdn.wingslashes.com${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`
    : null;
  if (avatarUrl) {
    avatarUrl = avatarUrl.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com/, 'https://cdn.wingslashes.com');
  }
  return avatarUrl;
}

export function computeClientBookingBonus(config: SafeAny, isRefill: boolean, discPercent: number): number {
  if (isRefill) {
    if (discPercent === 0) return config.clientBonusRefill.discount30;
    if (discPercent <= 30) return config.clientBonusRefill.discount30;
    if (discPercent <= 50) return config.clientBonusRefill.discount50;
    return config.clientBonusRefill.discountMore;
  }

  if (discPercent === 0) return config.clientBonusFullSet.discount0;
  if (discPercent <= 30) return config.clientBonusFullSet.discount30;
  if (discPercent <= 50) return config.clientBonusFullSet.discount50;
  return config.clientBonusFullSet.discountMore;
}

export async function calculateConsultantSalaryStats(
  fastify: SafeAny,
  start: Date,
  end: Date,
  targetUserId?: number
): Promise<Record<number, ConsultantSalaryStat>> {
  let query = `
    SELECT p.*, u.full_name, u.username
    FROM \`staff_payroll_client_consultant\` p
    LEFT JOIN \`user_profile\` u ON p.user_id = u.user_id
    WHERE p.date >= ? AND p.date <= ?
  `;
  const params: SafeAny[] = [start, end];
  if (targetUserId !== undefined) {
    query += ` AND p.user_id = ?`;
    params.push(targetUserId);
  }
  const payrolls = (await fastify.prisma.legacy.$queryRawUnsafe(query, ...params)) as SafeAny[];

  const stats: Record<number, ConsultantSalaryStat> = {};

  payrolls.forEach((p: SafeAny) => {
    const uid = Number(p.user_id);
    let baseSalary = 0;
    let salesReward = 0;
    let servicingReward = 0;
    let growthReward = 0;
    let storeServicingReward = 0;
    let checkins = 0;
    let checkinLateMin = 0;

    try {
      const growth = JSON.parse(p.final_staff_growth);
      baseSalary = growth.total_wage_amount || 0;
      growthReward = growth.total_reward_amount || 0;
      checkins = growth.total_order_check_in || 0;
      checkinLateMin = growth.total_check_in_late_minute || 0;
    } catch {
      /* ignore */
    }

    try {
      const sales = JSON.parse(p.final_staff_sales);
      salesReward = sales.total_reward_amount || 0;
    } catch {
      /* ignore */
    }

    try {
      const serv = JSON.parse(p.final_staff_servicing);
      servicingReward = serv.total_reward_amount || 0;
    } catch {
      /* ignore */
    }

    try {
      const store = JSON.parse(p.final_client_store_servicing);
      storeServicingReward = store.total_reward_amount || 0;
    } catch {
      /* ignore */
    }

    const totalSalary = baseSalary + salesReward + servicingReward + growthReward + storeServicingReward;

    if (!stats[uid]) {
      stats[uid] = {
        role: 'oc',
        baseSalary: 0,
        salesReward: 0,
        servicingReward: 0,
        growthReward: 0,
        storeServicingReward: 0,
        checkins: 0,
        checkinLateMin: 0,
        totalSalary: 0,
      };
    }

    stats[uid].baseSalary += baseSalary;
    stats[uid].salesReward += salesReward;
    stats[uid].servicingReward += servicingReward;
    stats[uid].growthReward += growthReward;
    stats[uid].storeServicingReward += storeServicingReward;
    stats[uid].checkins += checkins;
    stats[uid].checkinLateMin += checkinLateMin;
    stats[uid].totalSalary += totalSalary;
  });

  return stats;
}

/** Resolve the CRM and legacy identities once so KPI summary and trends use the same staff scope. */
export async function resolveTelesalesKpiScope(
  fastify: FastifyInstance,
  targetStaffId?: number
): Promise<TelesalesKpiScope> {
  const activeBkTelesalesIds = await getActiveBkTelesalesIds(fastify);
  if (activeBkTelesalesIds.length === 0) {
    return { staffIds: [], legacyUserIds: [] };
  }

  const staffList = await fastify.prisma.crm.crmStaff.findMany({
    where: {
      isActive: true,
      legacyStaffId: { in: activeBkTelesalesIds },
      ...(targetStaffId !== undefined ? { id: targetStaffId } : {}),
    },
    select: { id: true, displayName: true, legacyStaffId: true },
  });

  const staffNames = staffList.map((staff) => staff.displayName);
  const profiles =
    staffNames.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `
            SELECT user_id as userId, full_name as fullName
            FROM \`user_profile\`
            WHERE full_name IN (${staffNames.map(() => '?').join(',')})
          `,
          ...staffNames
        )
      : [];

  const profileIdByName = new Map<string, number>();
  profiles.forEach((profile: SafeAny) => {
    profileIdByName.set(
      String(profile.fullName || '')
        .toLowerCase()
        .trim(),
      Number(profile.userId)
    );
  });

  const legacyUserIds = Array.from(
    new Set(
      staffList
        .map((staff) =>
          staff.legacyStaffId
            ? Number(staff.legacyStaffId)
            : profileIdByName.get(staff.displayName.toLowerCase().trim())
        )
        .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
    )
  );

  return { staffIds: staffList.map((staff) => staff.id), legacyUserIds };
}
