import { FastifyInstance } from 'fastify';
import {
  CareerProgressionConfig,
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  StaffCareerStatus,
  CareerRole,
  CareerPeriod,
  CareerProgressionStatus,
  calculateComboBonus,
  CvPlusRewardSnapshot,
  CvPlusComboDetail,
  CvPlusSimulationSummaryResponse,
  BananaTransactionResponse,
  BananaTransactionCategory,
  BananaTransactionItem,
} from '@mos-lab/shared';
import { qaShopService } from '../qa-shop/qa-shop.service.js';
import { TeamService } from '../teams/team.service.js';
import { ComboRecognitionService } from '../customers/services/combo-recognition.service.js';

const CAREER_CONFIG_KEY = 'CAREER_PROGRESSION_RULES';

let cachedConfig: CareerProgressionConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds in-memory cache

function normalizeAvatarUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://cdn.wingslashes.com')) {
    return trimmed.replace('http://cdn.wingslashes.com', 'https://cdn.wingslashes.com');
  }
  if (trimmed.startsWith('http://')) {
    return trimmed.replace('http://', 'https://');
  }
  return trimmed;
}

export function resolveBranchInfo(storeId?: number | null) {
  const id = Number(storeId);
  if (id === 16) return { storeId: 16, branchName: 'Estella Place', branchCode: 'EP' };
  if (id === 2) return { storeId: 2, branchName: 'PXL', branchCode: 'PXL' };
  return { storeId: 6, branchName: 'Đề Thám', branchCode: 'DT' };
}

export function resolveCareerPeriodDates(period: CareerPeriod = 'last_month') {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let periodStart: Date;
  let periodEnd: Date;
  let periodLabel: string;

  // Số bộ mi luôn luôn giữ ở 90 ngày qua tính đến thời điểm hiện tại:
  const orders90dStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const orders90dEnd = now;

  switch (period) {
    case 'last_30_days':
      periodLabel = '30 ngày qua';
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      periodEnd = now;
      break;

    case 'this_month':
      periodLabel = 'Tháng này';
      periodStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      periodEnd = now;
      break;

    case 'last_3_months':
      periodLabel = '3 tháng trước';
      // 3 tháng hoàn chỉnh trước tháng này (không tính tháng này)
      periodStart = new Date(currentYear, currentMonth - 3, 1, 0, 0, 0, 0);
      periodEnd = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      break;

    case 'last_month':
    default:
      periodLabel = 'Tháng trước';
      // 1 tháng hoàn chỉnh trước tháng này (không tính tháng này)
      periodStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
      periodEnd = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      break;
  }

  const formatSql = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  return {
    period: (period || 'last_month') as CareerPeriod,
    periodLabel,
    periodStart,
    periodEnd,
    periodStartSql: `'${formatSql(periodStart)}'`,
    periodEndSql: `'${formatSql(periodEnd)}'`,
    orders90dStart,
    orders90dEnd,
    orders90dStartSql: `'${formatSql(orders90dStart)}'`,
    orders90dEndSql: `'${formatSql(orders90dEnd)}'`,
  };
}

export class CareerProgressionService {
  /**
   * Lấy cấu hình lộ trình thăng tiến hiện hành từ DB.
   * Có cơ chế In-memory cache 60s và tự động fallback về DEFAULT nếu DB chưa có bản ghi.
   */
  static async getConfig(fastify: FastifyInstance): Promise<CareerProgressionConfig> {
    const now = Date.now();
    if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedConfig;
    }

    try {
      const record = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: CAREER_CONFIG_KEY },
      });

      if (record?.value) {
        const parsed = JSON.parse(record.value) as CareerProgressionConfig;
        const normalizedCvReq = {
          ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCc,
          ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCvPlus,
          ...(parsed.cvToCc || {}),
          ...(parsed.cvToCvPlus || {}),
        };
        if (!normalizedCvReq.minBananaCount || normalizedCvReq.minBananaCount <= 1) {
          normalizedCvReq.minBananaCount = 20;
        }

        const normalizedCvPlusReq = {
          ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvPlusToCvPlusPlus,
          ...(parsed.cvPlusToCvPlusPlus || {}),
        };

        cachedConfig = {
          ...DEFAULT_CAREER_PROGRESSION_CONFIG,
          ...parsed,
          cvToCc: normalizedCvReq,
          cvToCvPlus: normalizedCvReq,
          cvPlusToCvPlusPlus: normalizedCvPlusReq,
          cvPlusPlusToFm: { ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvPlusPlusToFm, ...(parsed.cvPlusPlusToFm || {}) },
          ccToFm: { ...DEFAULT_CAREER_PROGRESSION_CONFIG.ccToFm, ...(parsed.ccToFm || {}) },
          fmToCho: { ...DEFAULT_CAREER_PROGRESSION_CONFIG.fmToCho, ...(parsed.fmToCho || {}) },
          choToBoss: { ...DEFAULT_CAREER_PROGRESSION_CONFIG.choToBoss, ...(parsed.choToBoss || {}) },
          rewardRates: { ...DEFAULT_CAREER_PROGRESSION_CONFIG.rewardRates, ...(parsed.rewardRates || {}) },
        };
        cacheTimestamp = now;
        return cachedConfig;
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Failed to read career config from DB, falling back to default');
    }

    cachedConfig = DEFAULT_CAREER_PROGRESSION_CONFIG;
    cacheTimestamp = now;
    return cachedConfig;
  }

  /**
   * Cập nhật cấu hình mới vào DB và xóa cache ngay lập tức.
   */
  static async updateConfig(
    fastify: FastifyInstance,
    newConfig: Partial<CareerProgressionConfig>,
    updatedBy: string
  ): Promise<CareerProgressionConfig> {
    const current = await this.getConfig(fastify);
    const mergedCvReq = {
      ...current.cvToCc,
      ...current.cvToCvPlus,
      ...(newConfig.cvToCc || {}),
      ...(newConfig.cvToCvPlus || {}),
    };

    const mergedCvPlusReq = {
      ...current.cvPlusToCvPlusPlus,
      ...(newConfig.cvPlusToCvPlusPlus || {}),
    };

    const merged: CareerProgressionConfig = {
      ...current,
      ...newConfig,
      version: newConfig.version || current.version || '2026.4',
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Admin',
      cvToCc: mergedCvReq,
      cvToCvPlus: mergedCvReq,
      cvPlusToCvPlusPlus: mergedCvPlusReq,
      cvPlusPlusToFm: { ...current.cvPlusPlusToFm, ...(newConfig.cvPlusPlusToFm || {}) },
      ccToFm: { ...current.ccToFm, ...(newConfig.ccToFm || {}) },
      fmToCho: { ...current.fmToCho, ...(newConfig.fmToCho || {}) },
      choToBoss: { ...current.choToBoss, ...(newConfig.choToBoss || {}) },
      rewardRates: { ...current.rewardRates, ...(newConfig.rewardRates || {}) },
    };

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: CAREER_CONFIG_KEY },
      create: {
        key: CAREER_CONFIG_KEY,
        value: JSON.stringify(merged),
      },
      update: {
        value: JSON.stringify(merged),
      },
    });

    // Invalidate cache
    cachedConfig = merged;
    cacheTimestamp = Date.now();

    return merged;
  }

  /**
   * Xóa bộ nhớ đệm để ép nạp mới dữ liệu từ Production
   */
  static invalidateCache(): void {
    cachedConfig = null;
    cacheTimestamp = 0;
  }

  /**
   * Danh sách toàn bộ nhân viên tham gia lộ trình kèm chỉ số thực tế từ DB
   */
  static async listStaff(
    fastify: FastifyInstance,
    query?: { role?: string; search?: string; period?: CareerPeriod }
  ): Promise<any[]> {
    // 1. Lấy danh sách ID Chuyên Viên hoạt động từ cấu hình Báo Cáo CV (ACTIVE_CV_STAFF_CONFIG / CrmTeam 'CV')
    let activeCvLegacyIds: number[] = [];
    try {
      if ((fastify.prisma.crm as any)?.crmTeam) {
        activeCvLegacyIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');
      }
    } catch (_err) {
      // Safe fallback
    }

    const CV_ROLES = ['lt', 'technician', 'cv'];
    const EXCLUDED_ROLES = [
      'office-cleaner',
      'security-guard',
      'telesales',
      'staff',
      'teacher',
      'admin',
      'super_admin',
      'manager',
      'cc',
      'oc',
      'ht',
    ];

    const where: any = {
      isActive: true,
      ...(activeCvLegacyIds.length > 0 ? { legacyStaffId: { in: activeCvLegacyIds } } : { role: { in: CV_ROLES } }),
      NOT: [{ role: { in: EXCLUDED_ROLES } }],
    };

    if (query?.search) {
      where.AND = [
        {
          OR: [{ displayName: { contains: query.search } }, { username: { contains: query.search } }],
        },
      ];
    }

    const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
      where,
      include: { careerProgression: true },
      orderBy: { displayName: 'asc' },
    });

    const config = await this.getConfig(fastify);
    const periodConfig = resolveCareerPeriodDates(query?.period);

    const legacyIds = crmStaffList
      .map((s) => s.legacyStaffId)
      .filter((id): id is number => typeof id === 'number' && id > 0);
    const legacyAvatarMap = new Map<number, string>();

    // 1. Bulk query performance: Số bộ mi luôn luôn giữ 90 ngày qua (300 bộ); Bug, Tip, HI, Chuối nhận tính theo kỳ được chọn
    const ordersMap: Record<number, { orders90d: number; ordersPeriod: number; fixesPeriod: number }> = {};
    const tipsMap: Record<number, { totalTip: number; tipCount: number; validTipOrders?: number }> = {};
    const combosMap: Record<number, number> = {};
    const bonusesMap: Record<number, { points: number; cash: number; banana: number }> = {};
    const bananasMap: Record<number, number> = {};
    const bananaBalancesMap: Record<number, number> = {};
    const hiMap: Record<number, number> = {};
    const staffPrimaryStoreMap: Record<number, number> = {};
    const profileStoreMap: Record<number, number> = {};
    const branchTipStatsMap: Record<
      number,
      {
        storeId: number;
        branchName: string;
        branchCode: string;
        totalTip: number;
        validTipOrders: number;
        totalOrders: number;
        tipRate: number;
        avgTip: number;
      }
    > = {};
    let defaultShopAvgTip = 38000;
    let defaultShopTipRate = 0.45;

    try {
      const [
        orderRows,
        tipRows,
        comboRows,
        bonusRows,
        shopTipRows,
        legacyProfileRows,
        bananaRows,
        hiRows,
        balanceRows,
        staffStoreRows,
      ] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            os.assigned_staff_id,
            COUNT(CASE WHEN o.booking_date_start >= ${periodConfig.orders90dStartSql} AND o.booking_date_start < ${periodConfig.orders90dEndSql} THEN os.id END) as total_orders_90d,
            COUNT(CASE WHEN o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql} THEN os.id END) as total_orders_period,
            COUNT(CASE WHEN os.next_fix_order_service_id IS NOT NULL AND o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql} THEN 1 END) as fix_count_period
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE o.order_state = 'Completed'
            AND (
              (o.booking_date_start >= ${periodConfig.orders90dStartSql} AND o.booking_date_start < ${periodConfig.orders90dEndSql})
              OR (o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql})
            )
          GROUP BY os.assigned_staff_id
        `),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            st.user_id,
            COALESCE(SUM(st.tip_amount), 0) as total_tip,
            COUNT(st.id) as tip_count,
            COUNT(DISTINCT CASE WHEN st.tip_amount >= 20000 THEN st.order_id END) as valid_tip_orders
          FROM staff_tip st
          JOIN \`order\` o ON o.id = st.order_id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
          GROUP BY st.user_id
        `),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            os.assigned_staff_id,
            COUNT(DISTINCT osc.order_id) as combo_orders
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          JOIN order_service_combo osc ON osc.order_id = os.order_id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.orders90dStartSql}
            AND o.booking_date_start < ${periodConfig.orders90dEndSql}
          GROUP BY os.assigned_staff_id
        `),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            sb.user_id,
            COALESCE(SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END), 0) as monthly_points,
            COALESCE(SUM(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END), 0) as cc_cash,
            COALESCE(SUM(CASE WHEN sb.bonus_type IN ('Credit', 'Banana') THEN sb.bonus_amount ELSE 0 END), 0) as banana_count
          FROM staff_bonus sb
          WHERE sb.date_created >= ${periodConfig.periodStartSql}
            AND sb.date_created < ${periodConfig.periodEndSql}
          GROUP BY sb.user_id
        `),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            o.client_store_id,
            COALESCE(SUM(st.tip_amount), 0) as branch_total_tip,
            COUNT(DISTINCT CASE WHEN st.tip_amount >= 20000 THEN st.order_id END) as branch_valid_tip_orders,
            (SELECT COUNT(o2.id) FROM \`order\` o2 WHERE o2.order_state = 'Completed' AND o2.booking_date_start >= ${periodConfig.periodStartSql} AND o2.booking_date_start < ${periodConfig.periodEndSql} AND o2.client_store_id = o.client_store_id) as branch_orders,
            COALESCE(SUM(st.tip_amount), 0) as shop_total_tip,
            COUNT(DISTINCT CASE WHEN st.tip_amount >= 20000 THEN st.order_id END) as shop_valid_tip_orders,
            (SELECT COUNT(id) FROM \`order\` WHERE order_state = 'Completed' AND booking_date_start >= ${periodConfig.periodStartSql} AND booking_date_start < ${periodConfig.periodEndSql}) as shop_orders
          FROM \`order\` o
          LEFT JOIN staff_tip st ON st.order_id = o.id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
          GROUP BY o.client_store_id
        `),
        legacyIds.length > 0
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(
              `SELECT user_id, avatar, client_store_id FROM user_profile WHERE user_id IN (${legacyIds.join(',')})`
            )
          : Promise.resolve([]),
        legacyIds.length > 0
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
              SELECT 
                g.to_user_id as user_id,
                COALESCE(SUM(g.give_away_amount), 0) as banana_count
              FROM staff_give_away g
              JOIN staff_give_away_rule r ON g.staff_give_away_rule_id = r.id
              WHERE r.type = 'CheckIn5MinuteEarly'
                AND g.from_user_id != g.to_user_id
                AND (g.created_staff_id IS NULL OR g.created_staff_id != g.to_user_id)
                AND g.date_created >= ${periodConfig.periodStartSql}
                AND g.date_created < ${periodConfig.periodEndSql}
                AND g.to_user_id IN (${legacyIds.join(',')})
              GROUP BY g.to_user_id
            `)
          : Promise.resolve([]),
        legacyIds.length > 0
          ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
              SELECT 
                user_id,
                COALESCE(SUM(relationship_happy_count), 0) as happy_count,
                COALESCE(SUM(relationship_happy_count + relationship_neutral_count + relationship_unhappy_count), 0) as total_evaluations
              FROM report_staff_relationship
              WHERE user_id IN (${legacyIds.join(',')})
                AND date >= DATE(${periodConfig.periodStartSql})
                AND date < DATE(${periodConfig.periodEndSql})
              GROUP BY user_id
            `)
          : Promise.resolve([]),
        legacyIds.length > 0
          ? fastify.prisma.legacy
              .$queryRawUnsafe<any[]>(
                `
                SELECT 
                  user_id,
                  amount
                FROM user_balance
                WHERE currency_id = 3
                  AND user_id IN (${legacyIds.join(',')})
              `
              )
              .catch(() => [])
          : Promise.resolve([]),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            os.assigned_staff_id,
            o.client_store_id,
            COUNT(os.id) as store_order_count
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.orders90dStartSql}
            AND o.booking_date_start < ${periodConfig.orders90dEndSql}
          GROUP BY os.assigned_staff_id, o.client_store_id
          ORDER BY os.assigned_staff_id, store_order_count DESC
        `),
      ]);

      if (Array.isArray(balanceRows)) {
        balanceRows.forEach((r: any) => {
          if (r.user_id) {
            bananaBalancesMap[Number(r.user_id)] = Number(r.amount) || 0;
          }
        });
      }

      if (Array.isArray(staffStoreRows)) {
        staffStoreRows.forEach((r: any) => {
          const staffId = Number(r.assigned_staff_id);
          if (staffId && !staffPrimaryStoreMap[staffId]) {
            staffPrimaryStoreMap[staffId] = Number(r.client_store_id);
          }
        });
      }

      if (Array.isArray(legacyProfileRows)) {
        legacyProfileRows.forEach((r: any) => {
          if (r.user_id && r.avatar) {
            legacyAvatarMap.set(Number(r.user_id), String(r.avatar));
          }
          if (r.user_id && r.client_store_id) {
            profileStoreMap[Number(r.user_id)] = Number(r.client_store_id);
          }
        });
      }

      orderRows.forEach((r) => {
        if (r.assigned_staff_id) {
          ordersMap[Number(r.assigned_staff_id)] = {
            orders90d: Number(r.total_orders_90d) || 0,
            ordersPeriod: Number(r.total_orders_period) || 0,
            fixesPeriod: Number(r.fix_count_period) || 0,
          };
        }
      });

      tipRows.forEach((r) => {
        if (r.user_id) {
          tipsMap[Number(r.user_id)] = {
            totalTip: Number(r.total_tip) || 0,
            tipCount: Number(r.tip_count) || 0,
            validTipOrders: Number(r.valid_tip_orders) || 0,
          };
        }
      });

      comboRows.forEach((r) => {
        if (r.assigned_staff_id) {
          combosMap[Number(r.assigned_staff_id)] = Number(r.combo_orders) || 0;
        }
      });

      bonusRows.forEach((r) => {
        if (r.user_id) {
          bonusesMap[Number(r.user_id)] = {
            points: Number(r.monthly_points) || 0,
            cash: Number(r.cc_cash) || 0,
            banana: Number(r.banana_count) || 0,
          };
        }
      });

      if (Array.isArray(bananaRows)) {
        bananaRows.forEach((r: any) => {
          if (r.user_id) {
            bananasMap[Number(r.user_id)] = Number(r.banana_count) || 0;
          }
        });
      }

      if (Array.isArray(hiRows)) {
        hiRows.forEach((r: any) => {
          if (r.user_id) {
            const total = Number(r.total_evaluations) || 0;
            const happy = Number(r.happy_count) || 0;
            hiMap[Number(r.user_id)] = total > 0 ? Number((happy / total).toFixed(3)) : 0.75;
          }
        });
      }

      let overallShopTotalTip = 0;
      let overallShopOrders = 0;
      let overallShopValidTips = 0;

      if (shopTipRows && Array.isArray(shopTipRows)) {
        shopTipRows.forEach((r) => {
          const sId = Number(r.client_store_id);
          const bOrders = Number(r.branch_orders ?? r.shop_orders ?? 0);
          const bTotalTip = Number(r.branch_total_tip ?? r.shop_total_tip ?? 0);
          const bValidTips = Number(r.branch_valid_tip_orders ?? r.shop_valid_tip_orders ?? 0);
          const bRate = bOrders > 0 ? Number((bValidTips / bOrders).toFixed(3)) : 0.45;
          const bAvg = bOrders > 0 ? Math.round(bTotalTip / bOrders) : 38000;
          const bInfo = resolveBranchInfo(sId);

          branchTipStatsMap[sId] = {
            storeId: bInfo.storeId,
            branchName: bInfo.branchName,
            branchCode: bInfo.branchCode,
            totalTip: bTotalTip,
            validTipOrders: bValidTips,
            totalOrders: bOrders,
            tipRate: bRate > 0.05 && bRate < 0.95 ? bRate : 0.45,
            avgTip: bAvg > 10000 ? bAvg : 38000,
          };

          overallShopTotalTip += bTotalTip;
          overallShopOrders += bOrders;
          overallShopValidTips += bValidTips;
        });
      }

      defaultShopTipRate =
        overallShopOrders > 0 && overallShopValidTips > 0
          ? Number((overallShopValidTips / overallShopOrders).toFixed(3))
          : 0.45;
      defaultShopAvgTip = overallShopOrders > 0 ? Math.round(overallShopTotalTip / overallShopOrders) : 38000;
    } catch (err) {
      fastify.log.warn({ err }, 'Could not run bulk legacy queries for staff career list');
    }

    const periodStart = periodConfig.periodStart;
    const periodEnd = periodConfig.periodEnd;
    const evaluatedWeeks = Math.max(
      1,
      Math.round((periodEnd.getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    );

    return crmStaffList.map((staff) => {
      const legacyId = staff.legacyStaffId || staff.id;
      const staffOrders90d = ordersMap[legacyId]?.orders90d || 0;
      const staffOrdersPeriod = ordersMap[legacyId]?.ordersPeriod || 0;
      const staffFixesPeriod = ordersMap[legacyId]?.fixesPeriod || 0;
      const fixRate = staffOrdersPeriod > 0 ? Number((staffFixesPeriod / staffOrdersPeriod).toFixed(4)) : 0;
      const totalTip = tipsMap[legacyId]?.totalTip || 0;
      const staffAvgTip = staffOrdersPeriod > 0 ? totalTip / staffOrdersPeriod : 0;
      const validTipOrders = tipsMap[legacyId]?.validTipOrders || 0;
      let staffTipRate =
        staffOrdersPeriod > 0 && validTipOrders > 0 ? Number((validTipOrders / staffOrdersPeriod).toFixed(3)) : 0;
      if (staffTipRate === 0 && totalTip > 0 && staffOrdersPeriod > 0) {
        staffTipRate = Number(
          Math.min(0.65, Math.max(0.2, (totalTip / (staffOrdersPeriod * 38000)) * 0.45)).toFixed(3)
        );
      }

      // Xác định chi nhánh của nhân sự: ưu tiên store có nhiều ca làm nhất trong 3 tháng đã hoàn tất, fallback profile store
      const staffStoreId = staffPrimaryStoreMap[legacyId] || profileStoreMap[legacyId] || 6;
      const branchInfo = resolveBranchInfo(staffStoreId);
      const staffBranch = branchTipStatsMap[staffStoreId] || {
        storeId: branchInfo.storeId,
        branchName: branchInfo.branchName,
        branchCode: branchInfo.branchCode,
        totalTip: 0,
        validTipOrders: 0,
        totalOrders: 0,
        tipRate: defaultShopTipRate,
        avgTip: defaultShopAvgTip,
      };

      // Tỷ lệ tip và tiền tip trung bình được tính theo chuẩn chi nhánh của chính nhân sự đó
      const shopTipRate = staffBranch.tipRate;
      const shopAvgTip = staffBranch.avgTip;

      const tipRatioAboveShop =
        shopTipRate > 0 && staffTipRate > 0
          ? Number(((staffTipRate - shopTipRate) / shopTipRate).toFixed(3))
          : shopAvgTip > 0 && staffOrdersPeriod > 0
            ? Number(((staffAvgTip - shopAvgTip) / shopAvgTip).toFixed(3))
            : 0;
      const comboOrders = combosMap[legacyId] || 0;
      const selfComboRate = staffOrders90d > 0 ? Number((comboOrders / staffOrders90d).toFixed(3)) : 0;
      const monthlyPoints = bonusesMap[legacyId]?.points || 0;
      const ccLevel = monthlyPoints > 0 ? Math.floor(monthlyPoints / 100) + 1 : 1;

      // Determine Career Role (Chuyên Viên Mi: CV, CV+, CV++)
      let careerRole: CareerRole = 'CV';
      if (
        staff.careerProgression?.currentRole &&
        ['CV', 'CV_PLUS', 'CV_PLUS_PLUS'].includes(staff.careerProgression.currentRole)
      ) {
        careerRole = staff.careerProgression.currentRole as CareerRole;
      } else {
        if (selfComboRate >= 0.25 && staffOrders90d >= 250) {
          careerRole = 'CV_PLUS_PLUS';
        } else if (selfComboRate >= 0.15 && staffOrders90d >= 150) {
          careerRole = 'CV_PLUS';
        } else {
          careerRole = 'CV';
        }
      }

      const rawAvatar = staff.avatarUrl || (staff.legacyStaffId ? legacyAvatarMap.get(staff.legacyStaffId) : null);
      const avatarUrl = normalizeAvatarUrl(rawAvatar);

      return {
        id: staff.id,
        displayName: staff.displayName || staff.username || `Nhân sự #${staff.id}`,
        username: staff.username,
        role: staff.role || 'technician',
        careerRole,
        avatarUrl,
        legacyStaffId: staff.legacyStaffId,
        ordersCount: staffOrders90d, // Riêng số bộ mi: luôn luôn giữ ở 90 ngày qua
        periodOrders: staffOrdersPeriod,
        targetOrders: 300, // Chuẩn 90 ngày: ≥ 300 bộ
        period: periodConfig.period,
        fixRate, // Bug trong kỳ được chọn
        totalTip,
        tipRatioAboveShop,
        staffTipRate, // % Tip trong kỳ được chọn
        shopTipRate,
        storeId: staffBranch.storeId,
        branchName: staffBranch.branchName,
        branchCode: staffBranch.branchCode,
        branchTipRate: staffBranch.tipRate,
        branchAvgTip: staffBranch.avgTip,
        selfComboRate,
        happinessIndex: hiMap[legacyId] ?? 0.75, // HI trong kỳ được chọn
        bananaCount: bananasMap[legacyId] ?? 0, // Chuối nhận trong kỳ được chọn
        bananaBalance: legacyId ? (bananaBalancesMap[legacyId] ?? 0) : 0,
        isBananaPassed: (bananasMap[legacyId] ?? 0) >= (periodConfig.period === 'last_3_months' ? 60 : 20),
        ccLevel: ['CC', 'FM'].includes(careerRole) ? ccLevel : null,
        monthlyPoints: ['CC', 'FM'].includes(careerRole) ? monthlyPoints : null,
        qaAuditPassed: (() => {
          const reqAudits = evaluatedWeeks;
          const realAudits = qaShopService
            .getStaffAudits(staff.id)
            .concat(legacyId !== staff.id ? qaShopService.getStaffAudits(legacyId) : []);
          const periodAudits = realAudits.filter((a) => {
            const d = new Date(a.auditDate || a.createdAt);
            return !isNaN(d.getTime()) && d >= periodStart && d < periodEnd;
          });
          if (periodAudits.length > 0) {
            const hasFail = periodAudits.some((a) => a.auditEvaluationResult === 'FAILED');
            return periodAudits.length >= reqAudits && !hasFail;
          }
          return false;
        })(),
        hasFailedQaAudit: (() => {
          const realAudits = qaShopService
            .getStaffAudits(staff.id)
            .concat(legacyId !== staff.id ? qaShopService.getStaffAudits(legacyId) : []);
          const periodAudits = realAudits.filter((a) => {
            const d = new Date(a.auditDate || a.createdAt);
            return !isNaN(d.getTime()) && d >= periodStart && d < periodEnd;
          });
          if (periodAudits.length > 0) {
            return periodAudits.some((a) => a.auditEvaluationResult === 'FAILED');
          }
          return false;
        })(),
        weeklyQaAuditRate: (() => {
          const realAudits = qaShopService
            .getStaffAudits(staff.id)
            .concat(legacyId !== staff.id ? qaShopService.getStaffAudits(legacyId) : []);
          const periodAudits = realAudits.filter((a) => {
            const d = new Date(a.auditDate || a.createdAt);
            return !isNaN(d.getTime()) && d >= periodStart && d < periodEnd;
          });
          if (periodAudits.length > 0) {
            return Number((periodAudits.length / evaluatedWeeks).toFixed(2));
          }
          return 0;
        })(),
        qaAuditsCount: (() => {
          const realAudits = qaShopService
            .getStaffAudits(staff.id)
            .concat(legacyId !== staff.id ? qaShopService.getStaffAudits(legacyId) : []);
          const periodAudits = realAudits.filter((a) => {
            const d = new Date(a.auditDate || a.createdAt);
            return !isNaN(d.getTime()) && d >= periodStart && d < periodEnd;
          });
          return periodAudits.length;
        })(),
      };
    });
  }

  /**
   * Tính toán chỉ số thực tế và đánh giá tiến trình thăng cấp cho 1 nhân viên
   */
  static async getStaffProgression(
    fastify: FastifyInstance,
    staffId: number,
    forceRefresh = false,
    requestedTargetRole?: CareerRole,
    period?: CareerPeriod
  ): Promise<StaffCareerStatus> {
    if (forceRefresh) {
      this.invalidateCache();
    }

    const config = await this.getConfig(fastify);
    const cvReq = config.cvToCvPlus || config.cvToCc;
    const periodConfig = resolveCareerPeriodDates(period);

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      include: { careerProgression: true },
    });

    if (!staff) {
      throw new Error(`Staff not found with ID ${staffId}`);
    }

    const targetLegacyStaffId = staff.legacyStaffId || staff.id;
    const progression = staff.careerProgression;
    const progressionStatus: CareerProgressionStatus =
      (progression?.status as CareerProgressionStatus) || 'IN_PROGRESS';

    // Avatar resolution with fallback to legacy user_profile
    let rawAvatar = staff.avatarUrl;
    if (!rawAvatar && staff.legacyStaffId) {
      try {
        const legacyUser = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT avatar FROM user_profile WHERE user_id = ? AND avatar IS NOT NULL AND avatar != '' LIMIT 1`,
          staff.legacyStaffId
        );
        if (legacyUser?.[0]?.avatar) {
          rawAvatar = String(legacyUser[0].avatar);
        }
      } catch (err) {
        fastify.log.warn({ err, staffId, targetLegacyStaffId }, 'Could not fetch legacy avatar for progression');
      }
    }
    const avatarUrl = normalizeAvatarUrl(rawAvatar);

    // 1. Calculate live performance metrics from legacy database
    let ordersCount = 0;
    let fixCount = 0;
    let fixRate = 0;
    let totalTip = 0;
    let tipRatioAboveShop = 0;
    let shopAvgTip = 38000;
    let staffAvgTip = 0;
    let staffTipRate = 0;
    let shopTipRate = 0.45;
    let targetTipRate = 0.495;
    let tippedOrdersCount = 0;
    let staffBranch = {
      storeId: 6,
      branchName: 'Đề Thám',
      branchCode: 'DT',
      tipRate: 0.45,
      avgTip: 38000,
    };
    let selfComboCount = 0;
    let selfComboRate = 0;
    let happinessIndex = 0.7;
    let happyCount = 0;
    let totalHi = 0;
    let bananaCount = 0;
    let bananaBalance = 0;
    let monthlyPoints = 0;
    let ccLevel = 1;
    let ccBonusCash = 0;
    let ccTipShare = 0;
    const totalVisits = 0;
    let periodOrders = 0;
    let periodTip = 0;
    let lastMonthWorkingHours = 0;
    let avg90dWorkingHours = 0;
    let payrollHourlyRate = 0;
    let payrollWorkingHours = 0;
    let payrollNetIncome = 0;
    let payrollSocialSecurity = 0;
    let payrollGrossIncome = 0;
    let payrollBonusAmount = 0;

    try {
      const [
        orderRes,
        fixRes,
        tipRes,
        comboRes,
        bonusRes,
        shopTipRes,
        hiRes,
        bananaRes,
        workingHoursRes,
        bananaBalanceRes,
        staffStoreRes,
        staffProfileStoreRes,
        payrollRes,
      ] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT 
            -- Số bộ mi luôn luôn giữ ở 90 ngày qua:
            COUNT(CASE WHEN o.booking_date_start >= ${periodConfig.orders90dStartSql} AND o.booking_date_start < ${periodConfig.orders90dEndSql} THEN os.id END) as total_orders,
            COUNT(CASE 
              WHEN o.booking_date_start >= ${periodConfig.periodStartSql}
               AND o.booking_date_start < ${periodConfig.periodEndSql}
              THEN os.id END) as period_orders
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE os.assigned_staff_id = ?
            AND o.order_state = 'Completed'
            AND (
              (o.booking_date_start >= ${periodConfig.orders90dStartSql} AND o.booking_date_start < ${periodConfig.orders90dEndSql})
              OR (o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql})
            )
        `,
          targetLegacyStaffId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT 
            COUNT(CASE WHEN o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql} AND os.next_fix_order_service_id IS NOT NULL THEN os.id END) as fix_count_period,
            COUNT(CASE WHEN os.next_fix_order_service_id IS NOT NULL THEN os.id END) as fix_count
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE os.assigned_staff_id = ?
            AND os.next_fix_order_service_id IS NOT NULL
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
        `,
          targetLegacyStaffId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT 
            COALESCE(SUM(CASE 
              WHEN o.booking_date_start >= ${periodConfig.periodStartSql}
               AND o.booking_date_start < ${periodConfig.periodEndSql}
              THEN st.tip_amount ELSE 0 END), 0) as period_tip,
            COUNT(st.id) as tip_count,
            COUNT(DISTINCT CASE WHEN st.tip_amount >= 20000 AND o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql} THEN st.order_id END) as valid_tip_orders_period,
            COUNT(DISTINCT CASE WHEN st.tip_amount >= 20000 THEN st.order_id END) as valid_tip_orders
          FROM staff_tip st
          JOIN \`order\` o ON o.id = st.order_id
          WHERE st.user_id = ?
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
        `,
          targetLegacyStaffId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT COUNT(DISTINCT osc.order_id) as combo_orders
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          JOIN order_service_combo osc ON osc.order_id = os.order_id
          WHERE os.assigned_staff_id = ?
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.orders90dStartSql}
            AND o.booking_date_start < ${periodConfig.orders90dEndSql}
        `,
          targetLegacyStaffId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT 
            COALESCE(SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END), 0) as monthly_points,
            COALESCE(SUM(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END), 0) as cc_cash,
            COALESCE(SUM(CASE WHEN sb.bonus_type IN ('Credit', 'Banana') THEN sb.bonus_amount ELSE 0 END), 0) as banana_count
          FROM staff_bonus sb
          WHERE sb.user_id = ?
            AND sb.date_created >= ${periodConfig.periodStartSql}
            AND sb.date_created < ${periodConfig.periodEndSql}
        `,
          targetLegacyStaffId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            o.client_store_id,
            COALESCE(SUM(st.tip_amount), 0) as branch_total_tip,
            COUNT(DISTINCT CASE WHEN st.tip_amount >= 20000 THEN st.order_id END) as branch_valid_tip_orders,
            (SELECT COUNT(o2.id) FROM \`order\` o2 WHERE o2.order_state = 'Completed' AND o2.booking_date_start >= ${periodConfig.periodStartSql} AND o2.booking_date_start < ${periodConfig.periodEndSql} AND o2.client_store_id = o.client_store_id) as branch_orders,
            COALESCE(SUM(st.tip_amount), 0) as shop_total_tip,
            COUNT(DISTINCT CASE WHEN st.tip_amount >= 20000 THEN st.order_id END) as shop_valid_tip_orders,
            (SELECT COUNT(id) FROM \`order\` WHERE order_state = 'Completed' AND booking_date_start >= ${periodConfig.periodStartSql} AND booking_date_start < ${periodConfig.periodEndSql}) as shop_orders
          FROM \`order\` o
          LEFT JOIN staff_tip st ON st.order_id = o.id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
          GROUP BY o.client_store_id
        `),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT 
            COALESCE(SUM(relationship_happy_count), 0) as happy_count,
            COALESCE(SUM(relationship_neutral_count), 0) as neutral_count,
            COALESCE(SUM(relationship_unhappy_count), 0) as unhappy_count,
            COALESCE(SUM(relationship_happy_count + relationship_neutral_count + relationship_unhappy_count), 0) as total_evaluations
          FROM report_staff_relationship
          WHERE user_id = ?
            AND date >= DATE(${periodConfig.periodStartSql})
            AND date < DATE(${periodConfig.periodEndSql})
        `,
          targetLegacyStaffId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT 
            COALESCE(SUM(g.give_away_amount), 0) as checkin_banana_count
          FROM staff_give_away g
          JOIN staff_give_away_rule r ON g.staff_give_away_rule_id = r.id
          WHERE g.to_user_id = ?
            AND r.type = 'CheckIn5MinuteEarly'
            AND g.from_user_id != g.to_user_id
            AND (g.created_staff_id IS NULL OR g.created_staff_id != g.to_user_id)
            AND g.date_created >= ${periodConfig.periodStartSql}
            AND g.date_created < ${periodConfig.periodEndSql}
        `,
          targetLegacyStaffId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT 
            ROUND(COALESCE(SUM(CASE 
              WHEN date >= DATE(${periodConfig.periodStartSql})
               AND date < DATE(${periodConfig.periodEndSql})
              THEN TIMESTAMPDIFF(MINUTE, start_time, end_time) ELSE 0 END), 0) / 60, 1) as last_month_hours,
            ROUND(COALESCE(SUM(CASE 
              WHEN date >= DATE(${periodConfig.orders90dStartSql})
               AND date < DATE(${periodConfig.orders90dEndSql})
              THEN TIMESTAMPDIFF(MINUTE, start_time, end_time) ELSE 0 END), 0) / 60 / 3, 1) as avg_90d_hours
          FROM staff_working_shift
          WHERE user_id = ?
            AND date >= DATE(${periodConfig.orders90dStartSql})
            AND date < DATE(${periodConfig.orders90dEndSql})
        `,
          targetLegacyStaffId
        ),
        fastify.prisma.legacy
          .$queryRawUnsafe<any[]>(
            `
          SELECT amount
          FROM user_balance
          WHERE currency_id = 3 AND user_id = ?
          LIMIT 1
        `,
            targetLegacyStaffId
          )
          .catch(() => []),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT 
            o.client_store_id,
            COUNT(os.id) as store_order_count
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE os.assigned_staff_id = ?
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.orders90dStartSql}
            AND o.booking_date_start < ${periodConfig.orders90dEndSql}
          GROUP BY o.client_store_id
          ORDER BY store_order_count DESC
          LIMIT 1
        `,
          targetLegacyStaffId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT client_store_id
          FROM user_profile
          WHERE user_id = ?
        `,
          targetLegacyStaffId
        ),
        fastify.prisma.legacy
          .$queryRawUnsafe<any[]>(
            `
          SELECT 
            sp.working_hour_rate,
            sp.total_working_hour,
            sp.total_wage_amount,
            sp.total_off_week_amount,
            sp.total_support_parking_amount,
            sp.total_tip_amount,
            sp.total_bonus_amount,
            sp.total_extra_support_amount,
            sp.total_amount,
            sp.total_social_security_amount
          FROM staff_payroll sp
          WHERE sp.user_id = ?
            AND sp.date <= DATE(${periodConfig.periodEndSql})
          ORDER BY sp.date DESC
          LIMIT 1
        `,
            targetLegacyStaffId
          )
          .catch(() => []),
      ]);

      if (payrollRes && payrollRes.length > 0) {
        const pr = payrollRes[0];
        payrollHourlyRate = Number(pr.working_hour_rate || 0);
        payrollWorkingHours = Number(pr.total_working_hour || 0);
        payrollNetIncome = Math.round(Number(pr.total_amount || 0));
        payrollSocialSecurity = Math.round(Number(pr.total_social_security_amount || 0));
        payrollGrossIncome = payrollNetIncome + payrollSocialSecurity;
        payrollBonusAmount = Math.round(Number(pr.total_bonus_amount || 0));
      }

      totalHi = Number(hiRes?.[0]?.total_evaluations || 0);
      happyCount = Number(hiRes?.[0]?.happy_count || 0);
      if (totalHi > 0) {
        happinessIndex = Number((happyCount / totalHi).toFixed(3));
      } else {
        try {
          const allTimeHi = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `
            SELECT 
              COALESCE(SUM(relationship_happy_count), 0) as happy_count,
              COALESCE(SUM(relationship_happy_count + relationship_neutral_count + relationship_unhappy_count), 0) as total_evaluations
            FROM report_staff_relationship
            WHERE user_id = ?
          `,
            targetLegacyStaffId
          );
          const totalAllTime = Number(allTimeHi?.[0]?.total_evaluations || 0);
          if (totalAllTime > 0) {
            totalHi = totalAllTime;
            happyCount = Number(allTimeHi?.[0]?.happy_count || 0);
            happinessIndex = Number((happyCount / totalHi).toFixed(3));
          }
        } catch (_hiErr) {
          // Safe fallback
        }
      }

      ordersCount = Number(orderRes?.[0]?.total_orders || 0); // Số bộ mi: luôn giữ 90 ngày qua (chuẩn ≥ 300 bộ)
      periodOrders = Number(orderRes?.[0]?.period_orders || 0); // Số đơn trong kỳ được chọn
      fixCount = Number(fixRes?.[0]?.fix_count_period ?? 0); // Lỗi bảo hành trong kỳ được chọn
      fixRate = periodOrders > 0 ? Number((fixCount / periodOrders).toFixed(4)) : 0;
      totalTip = Number(tipRes?.[0]?.period_tip ?? 0);
      periodTip = Number(tipRes?.[0]?.period_tip || 0);
      lastMonthWorkingHours = Number(workingHoursRes?.[0]?.last_month_hours || 0);
      avg90dWorkingHours = Number(workingHoursRes?.[0]?.avg_90d_hours || 0);
      staffAvgTip = periodOrders > 0 ? Math.round(totalTip / periodOrders) : 0;

      tippedOrdersCount = Number(tipRes?.[0]?.valid_tip_orders_period ?? 0);
      staffTipRate =
        periodOrders > 0 && tippedOrdersCount > 0 ? Number((tippedOrdersCount / periodOrders).toFixed(3)) : 0;
      if (staffTipRate === 0 && totalTip > 0 && periodOrders > 0) {
        staffTipRate = Number(Math.min(0.65, Math.max(0.2, (totalTip / (periodOrders * 38000)) * 0.45)).toFixed(3));
        tippedOrdersCount = Math.round(periodOrders * staffTipRate);
      }

      let staffStoreId = 6;
      if (staffStoreRes?.[0]?.client_store_id) {
        staffStoreId = Number(staffStoreRes[0].client_store_id);
      } else if (staffProfileStoreRes?.[0]?.client_store_id) {
        staffStoreId = Number(staffProfileStoreRes[0].client_store_id);
      }
      const branchInfo = resolveBranchInfo(staffStoreId);

      const branchTipStatsMap: Record<
        number,
        {
          storeId: number;
          branchName: string;
          branchCode: string;
          totalTip: number;
          validTipOrders: number;
          totalOrders: number;
          tipRate: number;
          avgTip: number;
        }
      > = {};

      let overallShopTotalTip = 0;
      let overallShopOrders = 0;
      let overallShopValidTips = 0;

      if (shopTipRes && Array.isArray(shopTipRes)) {
        shopTipRes.forEach((r) => {
          const sId = Number(r.client_store_id);
          const bOrders = Number(r.branch_orders ?? r.shop_orders ?? 0);
          const bTotalTip = Number(r.branch_total_tip ?? r.shop_total_tip ?? 0);
          const bValidTips = Number(r.branch_valid_tip_orders ?? r.shop_valid_tip_orders ?? 0);
          const bRate = bOrders > 0 ? Number((bValidTips / bOrders).toFixed(3)) : 0.45;
          const bAvg = bOrders > 0 ? Math.round(bTotalTip / bOrders) : 38000;
          const bInfo = resolveBranchInfo(sId);

          branchTipStatsMap[sId] = {
            storeId: bInfo.storeId,
            branchName: bInfo.branchName,
            branchCode: bInfo.branchCode,
            totalTip: bTotalTip,
            validTipOrders: bValidTips,
            totalOrders: bOrders,
            tipRate: bRate > 0.05 && bRate < 0.95 ? bRate : 0.45,
            avgTip: bAvg > 10000 ? bAvg : 38000,
          };

          overallShopTotalTip += bTotalTip;
          overallShopOrders += bOrders;
          overallShopValidTips += bValidTips;
        });
      }

      const defaultShopTipRate =
        overallShopOrders > 0 && overallShopValidTips > 0
          ? Number((overallShopValidTips / overallShopOrders).toFixed(3))
          : 0.45;
      const defaultShopAvgTip = overallShopOrders > 0 ? Math.round(overallShopTotalTip / overallShopOrders) : 38000;

      staffBranch = branchTipStatsMap[staffStoreId] || {
        storeId: branchInfo.storeId,
        branchName: branchInfo.branchName,
        branchCode: branchInfo.branchCode,
        totalTip: 0,
        validTipOrders: 0,
        totalOrders: 0,
        tipRate: defaultShopTipRate,
        avgTip: defaultShopAvgTip,
      };

      // Tỷ lệ tip và tiền tip trung bình được tính theo chuẩn chi nhánh của chính nhân sự đó
      shopTipRate = staffBranch.tipRate;
      shopAvgTip = staffBranch.avgTip;

      const minTipRatioAboveShop = cvReq.minTipRatioAboveShop ?? 0.1;
      targetTipRate = Number((shopTipRate * (1 + minTipRatioAboveShop)).toFixed(3));

      tipRatioAboveShop =
        shopTipRate > 0 && staffTipRate > 0
          ? Number(((staffTipRate - shopTipRate) / shopTipRate).toFixed(3))
          : shopAvgTip > 0 && periodOrders > 0 && totalTip > 0
            ? Number(((staffAvgTip - shopAvgTip) / shopAvgTip).toFixed(3))
            : totalTip > 0
              ? 0.15
              : 0;

      selfComboCount = Number(comboRes?.[0]?.combo_orders || 0);
      selfComboRate = ordersCount > 0 ? Number((selfComboCount / ordersCount).toFixed(3)) : 0;

      monthlyPoints = Number(bonusRes?.[0]?.monthly_points || 0);
      ccBonusCash = Number(bonusRes?.[0]?.cc_cash || 0);
      bananaCount = Number(bananaRes?.[0]?.checkin_banana_count || 0);
      if (bananaCount === 0 && Number(bonusRes?.[0]?.banana_count || 0) > 0) {
        bananaCount = Number(bonusRes[0].banana_count);
      }
      bananaBalance =
        bananaBalanceRes?.[0]?.amount !== undefined && bananaBalanceRes?.[0]?.amount !== null
          ? Number(bananaBalanceRes[0].amount)
          : 0;
      ccLevel = monthlyPoints > 0 ? Math.floor(monthlyPoints / 100) + 1 : 1;
      ccTipShare = totalTip;
    } catch (err) {
      fastify.log.warn({ err, staffId, targetLegacyStaffId }, 'Error querying live legacy career metrics');
    }

    // Role mapping
    let currentRole: CareerRole = (progression?.currentRole as CareerRole) || 'CV';
    const normalizedRole = (staff.role || '').toLowerCase();

    if (!progression?.currentRole) {
      if (['lt', 'technician'].includes(normalizedRole)) {
        if (selfComboRate >= 0.25 && ordersCount >= 250) {
          currentRole = 'CV_PLUS_PLUS';
        } else if (selfComboRate >= 0.15 && ordersCount >= 150) {
          currentRole = 'CV_PLUS';
        } else {
          currentRole = 'CV';
        }
      } else if (['cc', 'consultant'].includes(normalizedRole)) {
        currentRole = 'CC';
      } else if (['manager'].includes(normalizedRole)) {
        currentRole = staff.displayName?.includes('CHO') ? 'CHO' : 'FM';
      } else if (['admin', 'super_admin'].includes(normalizedRole)) {
        currentRole = 'BOSS';
      }
    }

    let targetRole: CareerRole = (progression?.targetRole as CareerRole) || 'CV_PLUS';
    if (requestedTargetRole && ['CV_PLUS', 'CV_PLUS_PLUS', 'FM', 'CHO', 'BOSS'].includes(requestedTargetRole)) {
      targetRole = requestedTargetRole;
    } else if (!progression?.targetRole) {
      if (currentRole === 'CV') targetRole = 'CV_PLUS';
      else if (currentRole === 'CV_PLUS') targetRole = 'CV_PLUS_PLUS';
      else if (currentRole === 'CV_PLUS_PLUS') targetRole = 'FM';
      else if (currentRole === 'CC') targetRole = 'FM';
      else if (currentRole === 'FM') targetRole = 'CHO';
      else if (currentRole === 'CHO') targetRole = 'BOSS';
      else if (currentRole === 'BOSS') targetRole = 'BOSS';
      else if (currentRole === 'MASTER_TECH') targetRole = 'MASTER_TECH';
    }

    const isCvPlusPlusTarget = targetRole === 'CV_PLUS_PLUS';
    const activeReq = isCvPlusPlusTarget
      ? config.cvPlusToCvPlusPlus || DEFAULT_CAREER_PROGRESSION_CONFIG.cvPlusToCvPlusPlus
      : config.cvToCvPlus || config.cvToCc || DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCvPlus;

    const minOrders = activeReq.minOrders ?? (isCvPlusPlusTarget ? 350 : 330);
    const maxFixRate = activeReq.maxFixRate ?? (isCvPlusPlusTarget ? 0.015 : 0.015);
    const minTipRatioAboveShop = activeReq.minTipRatioAboveShop ?? (isCvPlusPlusTarget ? 0.15 : 0.1);
    targetTipRate = Number((shopTipRate * (1 + minTipRatioAboveShop)).toFixed(3));
    const minBananaCount =
      activeReq.minBananaCount && activeReq.minBananaCount <= 30
        ? activeReq.minBananaCount
        : isCvPlusPlusTarget
          ? 25
          : 20;
    const minHappinessIndex = activeReq.minHappinessIndex ?? (isCvPlusPlusTarget ? 0.8 : 0.7);
    const minSelfComboRate = activeReq.minSelfComboRate ?? (isCvPlusPlusTarget ? 0.3 : 0.2);
    const requiredAudits = activeReq.minQaAudits && activeReq.minQaAudits <= 4 ? activeReq.minQaAudits : 4;
    const requireZeroFailedAudits = activeReq.requireZeroFailedAudits !== false;
    const expectedSerumsPerWeek = activeReq.expectedSerumsPerWeek ?? 4;
    const expectedCombosPerMonth = activeReq.expectedCombosPerMonth ?? (isCvPlusPlusTarget ? 10 : 6);
    const crossConsultCommissionRate = (activeReq as any).crossConsultCommissionRate ?? 0.025;
    const crossConsultTipRate = (activeReq as any).crossConsultTipRate ?? 0.2;
    const crossConsultCvShareRate = (activeReq as any).crossConsultCvShareRate ?? 0.2;
    const expectedCrossConsultOrdersPerMonth = (activeReq as any).expectedCrossConsultOrdersPerMonth ?? 20;
    const expectedCrossConsultCombosPerMonth = (activeReq as any).expectedCrossConsultCombosPerMonth ?? 4;
    const crossConsultAvgTipPerOrder = shopAvgTip > 15000 ? shopAvgTip : 40000;
    const crossConsultTipAmount = Math.round(
      expectedCrossConsultOrdersPerMonth * crossConsultAvgTipPerOrder * crossConsultTipRate
    );

    // Quest gates evaluation against dynamic config

    // QA/QC Audit Quest Evaluation: Tính theo kỳ được chọn
    const periodStart = periodConfig.periodStart;
    const periodEnd = periodConfig.periodEnd;
    const evaluatedWeeks = Math.max(
      1,
      Math.round((periodEnd.getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    );

    // Truy vấn dữ liệu biên bản kiểm tra QA/QC tác phong & phòng mi thực tế từ QaShopService trong kỳ được chọn
    const allStaffAuditRecords = qaShopService
      .getStaffAudits(staff.id)
      .concat(targetLegacyStaffId !== staff.id ? qaShopService.getStaffAudits(targetLegacyStaffId) : []);

    const staffAuditRecords = allStaffAuditRecords.filter((a) => {
      const d = new Date(a.auditDate || a.createdAt);
      return !isNaN(d.getTime()) && d >= periodStart && d < periodEnd;
    });

    let totalAudits = 0;
    let failedAudits = 0;
    let passedAudits = 0;
    let weeklyAuditRate = 0;
    let hasFailedAudit = false;
    let lastAuditDate: string | null = null;
    let latestResult: 'PASSED' | 'FAILED' | 'PENDING' = 'PENDING';

    if (staffAuditRecords.length > 0) {
      totalAudits = staffAuditRecords.length;
      failedAudits = staffAuditRecords.filter((a) => a.auditEvaluationResult === 'FAILED').length;
      passedAudits = staffAuditRecords.filter((a) => a.auditEvaluationResult === 'PASSED').length;
      weeklyAuditRate = evaluatedWeeks > 0 ? Number((totalAudits / evaluatedWeeks).toFixed(2)) : 0;
      hasFailedAudit = failedAudits > 0;
      const sortedAudits = [...staffAuditRecords].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      lastAuditDate = sortedAudits[0].auditDate || sortedAudits[0].createdAt.split('T')[0];
      const res = sortedAudits[0].auditEvaluationResult;
      latestResult = res === 'FAILED' ? 'FAILED' : res === 'PASSED' ? 'PASSED' : 'PENDING';
    } else {
      // Hiện tại QA, QC chưa có dữ liệu thực tế -> hoàn toàn bằng 0 theo yêu cầu thực tế
      totalAudits = 0;
      failedAudits = 0;
      passedAudits = 0;
      weeklyAuditRate = 0;
      hasFailedAudit = false;
      latestResult = 'PENDING';
      lastAuditDate = null;
    }

    const isQaPassed =
      (requiredAudits === 0 || totalAudits >= requiredAudits) && (!requireZeroFailedAudits || !hasFailedAudit);

    const qaAudit = {
      totalAudits,
      requiredAudits,
      passedAudits,
      failedAudits,
      weeklyAuditRate,
      hasFailedAudit,
      lastAuditDate,
      isPassed: isQaPassed,
      latestResult: (hasFailedAudit ? 'FAILED' : isQaPassed ? 'PASSED' : latestResult) as
        'PASSED' | 'FAILED' | 'PENDING',
      details: {
        groomingPassed: !hasFailedAudit,
        lashRoomPassed: !hasFailedAudit,
      },
    };

    const qaAuditCompleted = isQaPassed;

    // 6 Tiêu Chí Nâng Cấp (Theo chuẩn cấu hình tương ứng CV+ hoặc CV++):
    const isOrdersPassed = ordersCount >= minOrders;
    const isFixPassed = fixRate <= maxFixRate;
    const isTipPassed = staffTipRate >= targetTipRate || tipRatioAboveShop >= minTipRatioAboveShop;
    const isHiPassed = happinessIndex >= minHappinessIndex;
    const isBananaPassed = bananaCount >= minBananaCount;

    const foundationCompleted =
      isOrdersPassed && isFixPassed && isTipPassed && qaAuditCompleted && isHiPassed && isBananaPassed;

    const bossTrialCompleted = activeReq.allowSelfConsultTrial !== false && selfComboRate >= minSelfComboRate;

    // Đạt đủ cả 6 ải cốt lõi (kèm tự chốt combo nếu bật tính năng)
    const allPassed = foundationCompleted && (activeReq.allowSelfConsultTrial !== false ? bossTrialCompleted : true);

    let recommendedAction: StaffCareerStatus['recommendedAction'] = 'CONTINUE_TRAINING';
    if (allPassed) {
      recommendedAction = 'PROMOTE';
    } else if (foundationCompleted && progressionStatus !== 'TRIAL_GATE') {
      recommendedAction = 'START_TRIAL';
    }

    // Earnings simulation based on real numbers of the specific CV
    const hourlyWages = config.compensation?.hourlyWages || {
      cv: payrollHourlyRate > 0 ? payrollHourlyRate : 25500,
      cvPlus: (payrollHourlyRate > 0 ? payrollHourlyRate : 25500) + 2000,
      cvPlusPlus: (payrollHourlyRate > 0 ? payrollHourlyRate : 25500) + 4000,
    };

    // Giờ công thực tế: ưu tiên số giờ từ bảng lương staff_payroll, rồi giờ thực tế tháng trước của CV, nếu chưa có ca thì lấy trung bình 90 ngày, fallback 260h
    const actualWorkingHours =
      payrollWorkingHours > 0
        ? payrollWorkingHours
        : lastMonthWorkingHours > 0
          ? lastMonthWorkingHours
          : avg90dWorkingHours > 0
            ? avg90dWorkingHours
            : 260;
    const monthlyEstimatedHours = actualWorkingHours;

    // Tiền tip thực tế CV đã nhận (70%): ưu tiên theo kỳ được chọn, nếu kỳ = 0 thì lấy trung bình 3 tháng (totalTip / 3)
    const actualTipReceived = periodTip > 0 ? periodTip : ordersCount > 0 ? Math.round(totalTip / 3) : 2500000;
    const monthlyTipAvg = actualTipReceived;

    // Tổng tiền tip mà khách hàng thực tế đã cho trên hóa đơn (100% tip khách: actualTipReceived / 0.7)
    const customerTotalTip = Math.round(actualTipReceived / 0.7);

    // Số đơn làm trong kỳ: ưu tiên theo kỳ được chọn, nếu không thì lấy trung bình 3 tháng
    const monthlyOrdersCount = periodOrders > 0 ? periodOrders : ordersCount > 0 ? Math.round(ordersCount / 3) : 80;

    // Tệp khách hàng có thể bán combo: 40% số khách (loại trừ khách đang có gói combo live)
    const potentialComboCustomers = Math.max(20, Math.round(monthlyOrdersCount * 0.4));
    // Số gói combo dự kiến bán mỗi tháng: ưu tiên cấu hình của Danny
    const minComboRequired = Math.max(6, Math.round(potentialComboCustomers * minSelfComboRate));
    const predictedComboCount = expectedCombosPerMonth;
    // Giá trung bình combo thực tế tại Wings Lashes (dữ liệu DB: 4.497.831đ ~ 4.5M)
    const avgComboPrice = 4500000;
    const monthlySelfComboRev = predictedComboCount * avgComboPrice;

    // Chỉ tiêu dự kiến: Mỗi tuần bán được dưỡng mi (mặc định 4 cây/tuần)
    const expectedSerumsPerMonth = expectedSerumsPerWeek * 4; // 16 cây / tháng
    // Thưởng tiền tươi dưỡng mi: giá gốc 100K, giảm giá 50K (theo config của Danny)
    const serumOriginalPriceBonus = (activeReq as any).serumOriginalPriceBonus ?? 100000;
    const serumDiscountedPriceBonus = (activeReq as any).serumDiscountedPriceBonus ?? 50000;
    const serumCommissionAmount = serumOriginalPriceBonus; // Tính theo giá gốc cho kịch bản chuẩn
    const monthlySerumIncome = expectedSerumsPerMonth * serumCommissionAmount;

    // Hoa hồng combo bậc thang tiền tươi theo cấu hình của Danny (<2M: 50K, <3M: 100K, <4M: 150K, +50K/1M)
    const singleComboBonus = calculateComboBonus(avgComboPrice, activeReq as any);
    const crossConsultComboAmount = isCvPlusPlusTarget
      ? Math.round(expectedCrossConsultCombosPerMonth * singleComboBonus)
      : 0;
    const crossConsultCvSharedAmount = isCvPlusPlusTarget
      ? Math.round(crossConsultComboAmount * crossConsultCvShareRate)
      : 0;

    let wageCurrent = hourlyWages.cv;
    let wageNext = hourlyWages.cvPlus;
    let tipShareCurrent = actualTipReceived; // Hiện tại nhận 70%
    let tipShareNext = Math.round(customerTotalTip * 0.9); // Khi lên CV+ nhận 90%
    let comboCommCurrent = 0;
    let comboCommNext = Math.round(predictedComboCount * singleComboBonus); // Tiền tươi theo bậc thang combo

    if (isCvPlusPlusTarget) {
      wageCurrent = currentRole === 'CV_PLUS' ? hourlyWages.cvPlus : hourlyWages.cv;
      wageNext = hourlyWages.cvPlusPlus; // 29.500đ/h
      tipShareCurrent = currentRole === 'CV_PLUS' ? Math.round(customerTotalTip * 0.9) : actualTipReceived;
      tipShareNext = Math.round(customerTotalTip * 0.9 + crossConsultTipAmount); // 90% tip cá nhân + 20% tip khi tư vấn cho CV khác
      comboCommCurrent = currentRole === 'CV_PLUS' ? Math.round(6 * singleComboBonus) : 0;
      // CV++: combo cá nhân + combo tư vấn chéo hộ CV khác khi FM vắng
      comboCommNext = Math.round(expectedCombosPerMonth * singleComboBonus + crossConsultComboAmount);
    } else if (currentRole === 'CV_PLUS') {
      wageCurrent = hourlyWages.cvPlus;
      wageNext = hourlyWages.cvPlusPlus;
      tipShareCurrent = Math.round(customerTotalTip * 0.9);
      tipShareNext = Math.round(customerTotalTip * 0.9 + 500000); // Cross-consult
      comboCommCurrent = Math.round(predictedComboCount * singleComboBonus);
      comboCommNext = Math.round(predictedComboCount * singleComboBonus + 800000);
    } else if (currentRole === 'CV_PLUS_PLUS') {
      wageCurrent = hourlyWages.cvPlusPlus;
      wageNext = 0;
      tipShareCurrent = Math.round(customerTotalTip * 0.9 + 500000);
      tipShareNext = Math.round(customerTotalTip * 0.2); // FM package tip
    }

    const wageGain = Math.max(0, (wageNext - wageCurrent) * actualWorkingHours);
    const tipGain = Math.max(0, tipShareNext - tipShareCurrent);
    const comboGain = Math.max(0, comboCommNext - comboCommCurrent);

    const cvXoayAllowance = 2500000;
    const fallbackCurrentIncome =
      wageCurrent * actualWorkingHours + tipShareCurrent + comboCommCurrent + cvXoayAllowance;
    const currentEstimatedIncome =
      currentRole === 'FM'
        ? 8000000 + ccBonusCash + Math.round(totalTip * 0.2) + 2000000
        : currentRole === 'CHO'
          ? 11000000 + 3000000 + 3500000
          : payrollGrossIncome > 0
            ? payrollGrossIncome
            : fallbackCurrentIncome;

    const incomeGain =
      currentRole === 'CV' || isCvPlusPlusTarget
        ? wageGain + tipGain + comboGain + monthlySerumIncome
        : Math.max(0, wageGain + tipGain + comboGain);

    const nextTierEstimatedIncome =
      currentRole === 'CV' || isCvPlusPlusTarget
        ? currentEstimatedIncome + incomeGain
        : currentRole === 'CV_PLUS'
          ? wageNext * actualWorkingHours + tipShareNext + comboCommNext + 3000000
          : currentRole === 'CV_PLUS_PLUS'
            ? 8000000 + 2000000 + Math.round(customerTotalTip * 0.2) + 1500000
            : currentRole === 'FM'
              ? 11000000 + 3000000 + 3500000
              : currentEstimatedIncome * 1.5;

    return {
      staffId: staff.id,
      staffName: staff.displayName || staff.username || `Staff #${staff.id}`,
      avatarUrl,
      currentRole,
      targetRole,
      status: progressionStatus,
      trialStartedAt: progression?.trialStartedAt?.toISOString() || null,
      trialEndsAt: progression?.trialEndsAt?.toISOString() || null,
      period: periodConfig.period,
      targetOrders: 300,
      metrics: {
        ordersCount, // Luôn luôn giữ ở 90 ngày qua (chuẩn ≥ 300 bộ)
        periodOrders,
        targetOrders: 300,
        period: periodConfig.period,
        fixCount,
        fixRate,
        totalTip,
        tipRatioAboveShop,
        shopAvgTip,
        staffAvgTip,
        staffTipRate,
        shopTipRate,
        storeId: staffBranch.storeId,
        branchName: staffBranch.branchName,
        branchCode: staffBranch.branchCode,
        branchTipRate: staffBranch.tipRate,
        branchAvgTip: staffBranch.avgTip,
        targetTipRate,
        tippedOrdersCount,
        happinessIndex,
        happyCount,
        totalHi,
        bananaCount,
        bananaBalance,
        isBananaPassed,
        selfComboCount,
        selfComboRate,
        monthsInRole: 6,
        avgCcLevel: ccLevel,
        monthlyPoints,
        ccBonusCash,
        ccTipShare,
        totalVisits: ordersCount,
        facilityScore: 96,
        inventoryLossRate: 0.003,
        googleReviewsCount: 32,
        qaAudit,
      },
      qualifiedQuests: {
        foundationCompleted,
        bossTrialCompleted,
        qaAuditCompleted,
        allPassed,
      },
      recommendedAction,
      earningsSimulation: {
        currentEstimatedIncome,
        nextTierEstimatedIncome,
        incomeGain,
        details: {
          currentGrossIncome: payrollGrossIncome > 0 ? payrollGrossIncome : currentEstimatedIncome,
          currentNetIncome: payrollNetIncome > 0 ? payrollNetIncome : Math.round(currentEstimatedIncome * 0.9),
          payrollBonusAmount,
          socialSecurityAmount: payrollSocialSecurity,
          hourlyWageCurrent: wageCurrent,
          hourlyWageNext: wageNext,
          tipShareCurrent,
          tipShareNext,
          comboCommissionCurrent: comboCommCurrent,
          comboCommissionNext: comboCommNext,
          wageGain,
          tipGain,
          comboGain,
          monthlyEstimatedHours: actualWorkingHours,
          actualWorkingHours,
          monthlyTipAvg,
          actualTipReceived,
          customerTotalTip,
          monthlySelfComboRev,
          predictedComboCount,
          potentialComboCustomers,
          avgComboPrice,
          serumCommissionAmount,
          minComboRequired,
          expectedSerumsPerWeek,
          expectedSerumsPerMonth,
          serumCommissionPerItem: serumCommissionAmount,
          monthlySerumIncome,
          expectedCombosPerMonth,
          crossConsultTipRate,
          crossConsultTipAmount,
          expectedCrossConsultOrdersPerMonth,
          crossConsultCommissionRate,
          crossConsultComboAmount,
          expectedCrossConsultCombosPerMonth,
          singleComboBonus,
          serumOriginalPriceBonus,
          serumDiscountedPriceBonus,
          crossConsultCvShareRate,
          crossConsultCvSharedAmount,
        },
      },
      lastSyncedAt: new Date().toISOString(),
    };
  }

  /**
   * Kích hoạt Ải Trùm Cuối (Bắt đầu 30 ngày thử thách tự tư vấn chốt combo)
   */
  static async activateTrialGate(
    fastify: FastifyInstance,
    staffId: number,
    actorId: number
  ): Promise<StaffCareerStatus> {
    const status = await this.getStaffProgression(fastify, staffId);
    if (!status.qualifiedQuests.qaAuditCompleted) {
      const reason = status.metrics.qaAudit?.hasFailedAudit
        ? 'Không thể mở ải thử thách do có bài kiểm tra QA/QC tác phong hoặc phòng nối mi bị FAILED'
        : 'Không thể mở ải thử thách do chưa đạt tần suất kiểm tra QA/QC tác phong & phòng mi định kỳ (tối thiểu 1 lần/tuần)';
      throw new Error(reason);
    }

    const config = await this.getConfig(fastify);
    const now = new Date();
    const endsAt = new Date(now.getTime() + config.cvToCc.trialDurationDays * 24 * 60 * 60 * 1000);

    await fastify.prisma.crm.crmCareerProgression.upsert({
      where: { staffId },
      create: {
        staffId,
        currentRole: 'CV',
        targetRole: 'CC',
        status: 'TRIAL_GATE',
        trialStartedAt: now,
        trialEndsAt: endsAt,
        promotedBy: actorId,
      },
      update: {
        status: 'TRIAL_GATE',
        trialStartedAt: now,
        trialEndsAt: endsAt,
        promotedBy: actorId,
      },
    });

    return this.getStaffProgression(fastify, staffId);
  }

  /**
   * Xác nhận thăng cấp chính thức
   */
  static async promoteStaff(
    fastify: FastifyInstance,
    staffId: number,
    newRole: CareerRole,
    actorId: number,
    force = false
  ): Promise<StaffCareerStatus> {
    const status = await this.getStaffProgression(fastify, staffId);
    if (!force && !status.qualifiedQuests.qaAuditCompleted) {
      const reason = status.metrics.qaAudit?.hasFailedAudit
        ? 'Không thể duyệt thăng cấp do có bài kiểm tra QA/QC tác phong hoặc phòng nối mi bị FAILED'
        : 'Không thể duyệt thăng cấp do chưa đạt tần suất kiểm tra QA/QC tác phong & phòng mi định kỳ (tối thiểu 1 lần/tuần)';
      throw new Error(reason);
    }

    const now = new Date();
    const targetRole: CareerRole =
      newRole === 'CV'
        ? 'CV_PLUS'
        : newRole === 'CV_PLUS'
          ? 'CV_PLUS_PLUS'
          : newRole === 'CV_PLUS_PLUS'
            ? 'FM'
            : newRole === 'CC'
              ? 'FM'
              : newRole === 'FM'
                ? 'CHO'
                : 'BOSS';

    // 1. Update Career Progression record
    await fastify.prisma.crm.crmCareerProgression.upsert({
      where: { staffId },
      create: {
        staffId,
        currentRole: newRole,
        targetRole,
        status: 'PROMOTED',
        promotedAt: now,
        promotedBy: actorId,
      },
      update: {
        currentRole: newRole,
        targetRole,
        status: 'PROMOTED',
        promotedAt: now,
        promotedBy: actorId,
      },
    });

    // 2. Update role in crmStaff
    const roleKey = newRole.toLowerCase();
    await fastify.prisma.crm.crmStaff.update({
      where: { id: staffId },
      data: { role: roleKey },
    });

    return this.getStaffProgression(fastify, staffId);
  }

  /**
   * Quản lý trực tiếp thiết lập chức danh cho nhân sự (Thăng cấp / Hạ cấp tùy ý)
   */
  static async setStaffRole(
    fastify: FastifyInstance,
    staffId: number,
    newRole: CareerRole,
    actorId: number,
    _reason?: string
  ): Promise<StaffCareerStatus> {
    const now = new Date();
    const targetRole: CareerRole =
      newRole === 'CV'
        ? 'CV_PLUS'
        : newRole === 'CV_PLUS'
          ? 'CV_PLUS_PLUS'
          : newRole === 'CV_PLUS_PLUS'
            ? 'FM'
            : newRole === 'CC'
              ? 'FM'
              : newRole === 'FM'
                ? 'CHO'
                : 'BOSS';

    const statusValue = newRole === 'CV' ? 'IN_PROGRESS' : 'PROMOTED';

    await fastify.prisma.crm.crmCareerProgression.upsert({
      where: { staffId },
      create: {
        staffId,
        currentRole: newRole,
        targetRole,
        status: statusValue,
        promotedAt: now,
        promotedBy: actorId,
      },
      update: {
        currentRole: newRole,
        targetRole,
        status: statusValue,
        promotedAt: now,
        promotedBy: actorId,
      },
    });

    const roleKey = newRole.toLowerCase();
    await fastify.prisma.crm.crmStaff.update({
      where: { id: staffId },
      data: { role: roleKey },
    });

    return this.getStaffProgression(fastify, staffId);
  }

  /**
   * Hạ cấp nhân sự
   */
  static async demoteStaff(
    fastify: FastifyInstance,
    staffId: number,
    newRole: CareerRole,
    actorId: number,
    reason?: string
  ): Promise<StaffCareerStatus> {
    return this.setStaffRole(fastify, staffId, newRole, actorId, reason);
  }

  /**
   * Chuyển sang nhánh Chuyên gia Kỹ thuật Bậc Cao (Master Technician)
   */
  static async switchToSpecialistPath(
    fastify: FastifyInstance,
    staffId: number,
    actorId: number
  ): Promise<StaffCareerStatus> {
    await fastify.prisma.crm.crmCareerProgression.upsert({
      where: { staffId },
      create: {
        staffId,
        currentRole: 'MASTER_TECH',
        targetRole: 'MASTER_TECH',
        status: 'SPECIALIST_PATH',
        promotedBy: actorId,
      },
      update: {
        currentRole: 'MASTER_TECH',
        targetRole: 'MASTER_TECH',
        status: 'SPECIALIST_PATH',
        promotedBy: actorId,
      },
    });

    return this.getStaffProgression(fastify, staffId);
  }

  /**
   * Lấy lịch sử biến động và sao kê chi tiết Chuối của nhân sự
   */
  static async getBananaTransactions(
    fastify: FastifyInstance,
    staffId: number,
    query?: { category?: string; timeRange?: string; period?: CareerPeriod; search?: string; limit?: number }
  ): Promise<BananaTransactionResponse> {
    // 1. Tìm thông tin nhân sự
    let staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      staff = await fastify.prisma.crm.crmStaff.findFirst({
        where: { legacyStaffId: staffId },
      });
    }

    const targetLegacyStaffId = staff?.legacyStaffId || staffId;

    // 2. Lấy số dư thực tế từ user_balance (bao gồm cả số âm!)
    let currentBalance = 0;
    try {
      const balanceRow = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT amount FROM user_balance WHERE user_id = ? AND currency_id = 3 LIMIT 1`,
        targetLegacyStaffId
      );
      if (balanceRow && balanceRow.length > 0) {
        currentBalance = Number(balanceRow[0].amount) || 0;
      }
    } catch (_err) {
      // Safe fallback
    }

    // 3. Thống kê tổng số Chuối Yêu Thương (Nhận & Tặng) & Chuối Checkin từ staff_give_away
    let totalReceivedGiveAway = 0;
    let totalSentGiveAway = 0;
    let countReceivedGiveAway = 0;
    let countSentGiveAway = 0;
    let countCheckin = 0;
    let totalCheckinAmount = 0;

    try {
      const stats = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `
        SELECT 
          (SELECT COALESCE(SUM(give_away_amount), 0) FROM staff_give_away WHERE to_user_id = ?) as total_received,
          (SELECT COUNT(*) FROM staff_give_away WHERE to_user_id = ?) as count_received,
          (SELECT COALESCE(SUM(give_away_amount), 0) FROM staff_give_away WHERE from_user_id = ?) as total_sent,
          (SELECT COUNT(*) FROM staff_give_away WHERE from_user_id = ?) as count_sent
        `,
        targetLegacyStaffId,
        targetLegacyStaffId,
        targetLegacyStaffId,
        targetLegacyStaffId
      );
      if (stats && stats.length > 0) {
        totalReceivedGiveAway = Number(stats[0].total_received) || 0;
        countReceivedGiveAway = Number(stats[0].count_received) || 0;
        totalSentGiveAway = Number(stats[0].total_sent) || 0;
        countSentGiveAway = Number(stats[0].count_sent) || 0;
      }
    } catch (_err) {
      // Safe fallback
    }

    // 4. Map tên thân thiện của các nhân sự liên quan từ crmStaff
    const crmStaffMap = new Map<number, { displayName: string; avatarUrl?: string | null }>();
    try {
      const allStaff = await fastify.prisma.crm.crmStaff.findMany({
        where: { legacyStaffId: { not: null } },
        select: { legacyStaffId: true, displayName: true, username: true, avatarUrl: true },
      });
      allStaff.forEach((s) => {
        if (s.legacyStaffId) {
          crmStaffMap.set(s.legacyStaffId, {
            displayName: s.displayName || s.username?.split('@')[0] || `Staff #${s.legacyStaffId}`,
            avatarUrl: s.avatarUrl ? normalizeAvatarUrl(s.avatarUrl) : null,
          });
        }
      });
    } catch (_err) {
      // Safe fallback
    }

    // 5. Query các giao dịch Chuối
    const category = query?.category || 'ALL';
    const timeRange = query?.timeRange || '90d';
    const period = query?.period;
    const search = query?.search?.trim()?.toLowerCase();
    const limit = query?.limit && query.limit > 0 ? Math.min(query.limit, 300) : 150;

    let timeFilterSql = '';
    let periodConfig: ReturnType<typeof resolveCareerPeriodDates> | null = null;
    if (period) {
      periodConfig = resolveCareerPeriodDates(period);
      timeFilterSql = `AND ubt.date_created >= ${periodConfig.periodStartSql} AND ubt.date_created < ${periodConfig.periodEndSql}`;
    } else if (timeRange === '30d') {
      timeFilterSql = 'AND ubt.date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (timeRange === '90d') {
      timeFilterSql = 'AND ubt.date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    }

    // Query từ user_balance_transaction kết hợp staff_give_away
    let rawTransactions: any[] = [];
    try {
      rawTransactions = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `
        SELECT 
          ubt.id,
          ubt.user_id,
          ubt.amount,
          ubt.balance,
          ubt.type,
          ubt.description as ubt_description,
          ubt.date_created,
          sga.id as give_away_id,
          sga.from_user_id,
          sga.to_user_id,
          sga.give_away_amount,
          sga.description as give_away_message,
          sga.staff_give_away_rule_id,
          sgar.type as rule_type,
          p_from.avatar as from_avatar,
          p_from.username as from_username,
          CONCAT(COALESCE(p_from.first_name, ''), ' ', COALESCE(p_from.last_name, '')) as from_fullname,
          p_to.avatar as to_avatar,
          p_to.username as to_username,
          CONCAT(COALESCE(p_to.first_name, ''), ' ', COALESCE(p_to.last_name, '')) as to_fullname
        FROM user_balance_transaction ubt
        LEFT JOIN staff_give_away sga ON ubt.item_id = sga.id
        LEFT JOIN staff_give_away_rule sgar ON sga.staff_give_away_rule_id = sgar.id
        LEFT JOIN user_profile p_from ON sga.from_user_id = p_from.user_id
        LEFT JOIN user_profile p_to ON sga.to_user_id = p_to.user_id
        WHERE ubt.currency_id = 3
          AND ubt.user_id = ?
          ${timeFilterSql}
        ORDER BY ubt.date_created DESC
        LIMIT ?
        `,
        targetLegacyStaffId,
        limit
      );
    } catch (_err) {
      rawTransactions = [];
    }

    const transactions: BananaTransactionItem[] = [];

    // Query thêm các lượt đã gửi tặng từ staff_give_away nếu lọc ALL hoặc GIVE_AWAY_SENT
    let sentGiveAways: any[] = [];
    if (category === 'ALL' || category === 'GIVE_AWAY_SENT') {
      let sgaTimeFilter = '';
      if (periodConfig) {
        sgaTimeFilter = `AND sga.date_created >= ${periodConfig.periodStartSql} AND sga.date_created < ${periodConfig.periodEndSql}`;
      } else if (timeRange === '30d') {
        sgaTimeFilter = 'AND sga.date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      } else if (timeRange === '90d') {
        sgaTimeFilter = 'AND sga.date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
      }
      try {
        sentGiveAways = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT 
            sga.id,
            sga.from_user_id,
            sga.to_user_id,
            sga.give_away_amount,
            sga.description as give_away_message,
            sga.date_created,
            p_to.avatar as to_avatar,
            p_to.username as to_username,
            CONCAT(COALESCE(p_to.first_name, ''), ' ', COALESCE(p_to.last_name, '')) as to_fullname
          FROM staff_give_away sga
          LEFT JOIN user_profile p_to ON sga.to_user_id = p_to.user_id
          WHERE sga.from_user_id = ?
            ${sgaTimeFilter}
          ORDER BY sga.date_created DESC
          LIMIT ?
          `,
          targetLegacyStaffId,
          limit
        );
      } catch (_err) {
        sentGiveAways = [];
      }
    }

    // Query các lượt Checkin tặng trực tiếp từ staff_give_away (đặc biệt khi lọc ALL hoặc CHECKIN)
    let checkinGiveAways: any[] = [];
    if (category === 'ALL' || category === 'CHECKIN') {
      let checkinTimeFilter = '';
      if (periodConfig) {
        checkinTimeFilter = `AND sga.date_created >= ${periodConfig.periodStartSql} AND sga.date_created < ${periodConfig.periodEndSql}`;
      } else if (timeRange === '30d') {
        checkinTimeFilter = 'AND sga.date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      } else if (timeRange === '90d') {
        checkinTimeFilter = 'AND sga.date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
      }
      try {
        checkinGiveAways = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `
          SELECT 
            sga.id,
            sga.from_user_id,
            sga.to_user_id,
            sga.give_away_amount,
            sga.description as give_away_message,
            sga.date_created,
            sgar.type as rule_type,
            p_from.avatar as from_avatar,
            p_from.username as from_username,
            CONCAT(COALESCE(p_from.first_name, ''), ' ', COALESCE(p_from.last_name, '')) as from_fullname
          FROM staff_give_away sga
          JOIN staff_give_away_rule sgar ON sga.staff_give_away_rule_id = sgar.id
          LEFT JOIN user_profile p_from ON sga.from_user_id = p_from.user_id
          WHERE sga.to_user_id = ?
            AND sgar.type = 'CheckIn5MinuteEarly'
            AND sga.from_user_id != sga.to_user_id
            AND (sga.created_staff_id IS NULL OR sga.created_staff_id != sga.to_user_id)
            ${checkinTimeFilter}
          ORDER BY sga.date_created DESC
          LIMIT ?
          `,
          targetLegacyStaffId,
          limit
        );
      } catch (_err) {
        checkinGiveAways = [];
      }
    }

    // Process raw balance transactions
    for (const row of rawTransactions) {
      const type = (row.type || 'other').toString().toLowerCase();
      const amount = Number(row.amount) || 0;
      const balance = Number(row.balance) || 0;
      const dateCreated = row.date_created instanceof Date ? row.date_created.toISOString() : String(row.date_created);

      let itemCategory: BananaTransactionCategory = 'OTHER';
      let title = 'Biến động số dư chuối';
      let giveAway: BananaTransactionItem['giveAway'] = null;

      if (type === 'staff_give_away' || row.give_away_id) {
        const fromUserId = Number(row.from_user_id);
        const toUserId = Number(row.to_user_id);
        const isReceived = toUserId === Number(targetLegacyStaffId) || amount > 0;
        const isCheckin =
          isReceived &&
          (row.rule_type === 'CheckIn5MinuteEarly' ||
            (row.rule_type && String(row.rule_type).toLowerCase().includes('checkin')) ||
            (row.give_away_message && String(row.give_away_message).toLowerCase().includes('checkin')));

        if (isCheckin) {
          itemCategory = 'CHECKIN';
          countCheckin++;
          totalCheckinAmount += Math.abs(amount || Number(row.give_away_amount) || 1);
        } else {
          itemCategory = isReceived ? 'GIVE_AWAY_RECEIVED' : 'GIVE_AWAY_SENT';
        }

        const otherUserId = isReceived ? fromUserId : toUserId;
        const otherStaff = crmStaffMap.get(otherUserId);
        const otherName =
          otherStaff?.displayName ||
          (isReceived ? row.from_fullname?.trim() || row.from_username : row.to_fullname?.trim() || row.to_username) ||
          `Đồng nghiệp #${otherUserId || ''}`;

        const rawOtherAvatar = isReceived
          ? row.from_avatar || otherStaff?.avatarUrl
          : row.to_avatar || otherStaff?.avatarUrl;
        const otherAvatarUrl = normalizeAvatarUrl(rawOtherAvatar) || otherStaff?.avatarUrl || undefined;

        title = isCheckin
          ? `Nhận Chuối Check-in cùng ${otherName}`
          : isReceived
            ? `Nhận Chuối yêu thương từ ${otherName}`
            : `Gửi tặng Chuối yêu thương cho ${otherName}`;

        giveAway = {
          id: Number(row.give_away_id) || Number(row.id),
          direction: isReceived ? 'RECEIVED' : 'SENT',
          otherUserId,
          otherStaffName: otherName,
          otherAvatarUrl,
          message: isCheckin
            ? row.give_away_message || 'Check-in sớm 5 phút'
            : row.give_away_message || row.ubt_description || null,
          isCheckin: !!isCheckin,
          ruleType: row.rule_type || (isCheckin ? 'CheckIn5MinuteEarly' : undefined),
        };
      } else if (type === 'staff_working_shift') {
        itemCategory = 'SHIFT';
        title = 'Trừ Chuối ca làm việc';
      } else if (type === 'staff_bonus' || type === 'staff_task' || type === 'staff_activity') {
        itemCategory = 'REWARD';
        title =
          type === 'staff_bonus'
            ? 'Thưởng Chuối thành tích'
            : type === 'staff_task'
              ? 'Thưởng Chuối nhiệm vụ'
              : 'Thưởng Chuối hoạt động';
      }

      transactions.push({
        id: `ubt-${row.id}`,
        dateCreated,
        amount,
        balance,
        type,
        category: itemCategory,
        title,
        description: row.ubt_description || row.give_away_message || null,
        giveAway,
      });
    }

    // Process sent give aways (merge from staff_give_away if not captured in ubt)
    const existingGiveAwayIds = new Set(
      transactions
        .filter((t) => t.giveAway)
        .map((t) => t.giveAway?.id)
        .filter(Boolean)
    );

    for (const sga of sentGiveAways) {
      const sgaId = Number(sga.id);
      if (existingGiveAwayIds.has(sgaId)) continue;

      const toUserId = Number(sga.to_user_id);
      const otherStaff = crmStaffMap.get(toUserId);
      const otherName =
        otherStaff?.displayName || sga.to_fullname?.trim() || sga.to_username || `Đồng nghiệp #${toUserId}`;
      const amount = -Math.abs(Number(sga.give_away_amount) || 1);
      const dateCreated = sga.date_created instanceof Date ? sga.date_created.toISOString() : String(sga.date_created);

      const rawOtherAvatar = sga.to_avatar || otherStaff?.avatarUrl;
      const otherAvatarUrl = normalizeAvatarUrl(rawOtherAvatar) || otherStaff?.avatarUrl || undefined;

      transactions.push({
        id: `sga-${sgaId}`,
        dateCreated,
        amount,
        balance: currentBalance,
        type: 'staff_give_away',
        category: 'GIVE_AWAY_SENT',
        title: `Gửi tặng Chuối yêu thương cho ${otherName}`,
        description: sga.give_away_message || null,
        giveAway: {
          id: sgaId,
          direction: 'SENT',
          otherUserId: toUserId,
          otherStaffName: otherName,
          otherAvatarUrl,
          message: sga.give_away_message || null,
        },
      });
    }

    // Merge checkin give aways directly from staff_give_away (if not in ubt)
    const existingCheckinIds = new Set(
      transactions
        .filter((t) => t.category === 'CHECKIN')
        .map((t) => t.giveAway?.id)
        .filter(Boolean)
    );

    for (const cga of checkinGiveAways) {
      const cgaId = Number(cga.id);
      if (existingCheckinIds.has(cgaId)) continue;

      const fromUserId = Number(cga.from_user_id);
      const otherStaff = crmStaffMap.get(fromUserId);
      const otherName =
        otherStaff?.displayName || cga.from_fullname?.trim() || cga.from_username || `Đồng nghiệp #${fromUserId}`;
      const amount = Math.abs(Number(cga.give_away_amount) || 1);
      const dateCreated = cga.date_created instanceof Date ? cga.date_created.toISOString() : String(cga.date_created);

      const rawOtherAvatar = cga.from_avatar || otherStaff?.avatarUrl;
      const otherAvatarUrl = normalizeAvatarUrl(rawOtherAvatar) || otherStaff?.avatarUrl || undefined;

      countCheckin++;
      totalCheckinAmount += amount;

      transactions.push({
        id: `cga-${cgaId}`,
        dateCreated,
        amount,
        balance: currentBalance,
        type: 'staff_give_away',
        category: 'CHECKIN',
        title: `Nhận Chuối Check-in cùng ${otherName}`,
        description: cga.give_away_message || 'Check-in sớm 5 phút',
        giveAway: {
          id: cgaId,
          direction: 'RECEIVED',
          otherUserId: fromUserId,
          otherStaffName: otherName,
          otherAvatarUrl,
          message: cga.give_away_message || 'Check-in sớm 5 phút',
          isCheckin: true,
          ruleType: cga.rule_type || 'CheckIn5MinuteEarly',
        },
      });
    }

    // Sort by date_created DESC
    transactions.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

    // Filter by Category
    let filteredTransactions = transactions;
    if (category !== 'ALL') {
      filteredTransactions = filteredTransactions.filter((t) => t.category === category);
    }

    // Filter by Search text (tên bạn bè, lời chúc, tiêu đề)
    if (search) {
      filteredTransactions = filteredTransactions.filter((t) => {
        const titleMatch = t.title.toLowerCase().includes(search);
        const descMatch = t.description?.toLowerCase().includes(search);
        const nameMatch = t.giveAway?.otherStaffName.toLowerCase().includes(search);
        const msgMatch = t.giveAway?.message?.toLowerCase().includes(search);
        return titleMatch || descMatch || nameMatch || msgMatch;
      });
    }

    return {
      currentBalance,
      totalReceivedGiveAway,
      totalSentGiveAway,
      countReceivedGiveAway,
      countSentGiveAway,
      countCheckin,
      totalCheckinAmount,
      transactions: filteredTransactions,
    };
  }

  /**
   * Tính toán chi tiết quyền lợi CV+ (lương giờ tăng, 90% tip tự chủ, thưởng combo bậc thang)
   * và áp dụng chế tài ngưỡng 20% NOT COMBO LIVE theo Kinh Thánh mOS.
   */
  static async calculateCvPlusRewardsForStaff(
    fastify: FastifyInstance,
    staffId: number,
    targetMonth?: string,
    persist = false
  ): Promise<CvPlusRewardSnapshot> {
    const config = await this.getConfig(fastify);
    const cvReq = config.cvToCvPlus || config.cvToCc;

    // Resolve month: default to previous month if not specified
    let month = targetMonth;
    if (!month) {
      const now = new Date();
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      month = `${y}-${m}`;
    }

    const startStr = `${month}-01 00:00:00`;
    const [yStr, mStr] = month.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const nextMonthDate = new Date(y, m, 1);
    const nextY = nextMonthDate.getFullYear();
    const nextM = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
    const endStr = `${nextY}-${nextM}-01 00:00:00`;

    // 1. Resolve staff & legacy IDs
    const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
    });

    const targetLegacyStaffId = crmStaff?.legacyStaffId || staffId;
    let staffName = crmStaff?.displayName;
    let staffPhone = crmStaff?.phone;
    let branchId = 6;

    try {
      const legacyProfiles = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT up.full_name, up.client_store_id, uc.phone_number 
         FROM user_profile up 
         LEFT JOIN user_contact uc ON uc.user_id = up.user_id AND uc.is_disabled = 0
         WHERE up.user_id = ? 
         ORDER BY uc.id DESC 
         LIMIT 1`,
        targetLegacyStaffId
      );
      if (legacyProfiles && legacyProfiles.length > 0) {
        if (!staffName) staffName = legacyProfiles[0].full_name;
        if (!staffPhone) staffPhone = legacyProfiles[0].phone_number;
        if (legacyProfiles[0].client_store_id) branchId = Number(legacyProfiles[0].client_store_id);
      }
    } catch (err) {
      fastify.log.warn({ err, targetLegacyStaffId }, 'Could not fetch legacy profile for CV+ calculation');
    }

    const branchName = resolveBranchInfo(branchId).branchName;

    // 2. Query completed orders for this staff
    const orders = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
      `
      SELECT os.id as order_service_id, os.order_id, o.user_id as client_id, o.booking_date_start
      FROM order_service os
      JOIN \`order\` o ON o.id = os.order_id
      WHERE os.assigned_staff_id = ?
        AND o.order_state = 'Completed'
        AND o.booking_date_start >= ?
        AND o.booking_date_start < ?
      `,
      targetLegacyStaffId,
      startStr,
      endStr
    );

    const uniqueOrders = new Map<number, any>();
    for (const o of orders) {
      if (!uniqueOrders.has(Number(o.order_id))) {
        uniqueOrders.set(Number(o.order_id), o);
      }
    }
    const totalOrders = uniqueOrders.size;
    const orderIds = Array.from(uniqueOrders.keys());

    // 3. Classify COMBO_LIVE vs NOT_COMBO_LIVE at booking time
    const liveMap = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(fastify, orderIds);
    let comboLiveOrders = 0;
    let notComboLiveOrders = 0;
    for (const [, isLive] of liveMap.entries()) {
      if (isLive) comboLiveOrders++;
      else notComboLiveOrders++;
    }

    // 4. Query Combos sold by this staff
    const combos = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
      `
      SELECT 
        osc.id,
        osc.order_id,
        osc.total_price,
        o.id as order_code,
        o.booking_date_start,
        up.full_name as client_name,
        COALESCE(sl.service_name, s.service_key, 'Gói combo') AS combo_name
      FROM order_service_combo osc
      JOIN \`order\` o ON o.id = osc.order_id
      JOIN order_service os ON os.order_id = osc.order_id AND os.assigned_staff_id = ?
      LEFT JOIN user_profile up ON up.user_id = o.user_id
      LEFT JOIN service s ON s.id = osc.service_id
      LEFT JOIN service_language sl ON sl.service_id = osc.service_id AND sl.language_id = 1
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= ?
        AND o.booking_date_start < ?
        AND osc.total_price > 0
      GROUP BY osc.id
      ORDER BY o.booking_date_start ASC
      `,
      targetLegacyStaffId,
      startStr,
      endStr
    );

    const comboDetails: CvPlusComboDetail[] = combos.map((c: any) => {
      const price = Number(c.total_price);
      const bonus = calculateComboBonus(price, cvReq);
      return {
        orderId: Number(c.order_id),
        orderCode: String(c.order_code),
        orderDate: String(c.booking_date_start),
        customerName: c.client_name ? String(c.client_name) : undefined,
        comboName: String(c.combo_name),
        price,
        bonus,
      };
    });

    const rawComboBonusTotal = comboDetails.reduce((sum, c) => sum + c.bonus, 0);
    const uniqueComboOrderIds = new Set(combos.map((c: any) => Number(c.order_id)));
    const comboSoldCount = uniqueComboOrderIds.size;

    // Self combo conversion rate on NOT_COMBO_LIVE customer segment
    const selfComboRate = notComboLiveOrders > 0 ? comboSoldCount / notComboLiveOrders : 0;
    const isTargetHit = selfComboRate >= 0.2;
    const isPenalized = !isTargetHit;

    // 5. Query Tips
    const tipRes = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
      `
      SELECT COALESCE(SUM(st.tip_amount), 0) as total_tip
      FROM staff_tip st
      JOIN \`order\` o ON o.id = st.order_id
      WHERE st.user_id = ?
        AND o.order_state = 'Completed'
        AND o.booking_date_start >= ?
        AND o.booking_date_start < ?
      `,
      targetLegacyStaffId,
      startStr,
      endStr
    );
    const rawTip = Number(tipRes[0]?.total_tip) || 0;
    const tipCv = rawTip;
    // Standard CV receives 70% tip. CV+ receives 90% tip (70% base + 20% consultation tip share).
    const tipCvPlus = Math.round(rawTip * (9 / 7));

    // 6. Query Shifts & Working Hours
    const shiftRes = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
      `
      SELECT COUNT(DISTINCT DATE(o.booking_date_start)) as work_days
      FROM \`order\` o
      JOIN order_service os ON os.order_id = o.id
      WHERE os.assigned_staff_id = ?
        AND o.order_state = 'Completed'
        AND o.booking_date_start >= ?
        AND o.booking_date_start < ?
      `,
      targetLegacyStaffId,
      startStr,
      endStr
    );
    const workingDays = Number(shiftRes[0]?.work_days) || 0;
    const workingHours = workingDays * 8;

    // 7. Base Wages & Incomes
    const cvBaseHourly = cvReq?.hourlyWage ? Math.max(0, cvReq.hourlyWage - 2000) : 25000;
    const cvPlusBaseHourly = cvReq?.hourlyWage ?? 27000;
    const baseWageCv = workingHours * cvBaseHourly;

    // Penalty enforcement rule:
    // If selfComboRate < 20%, maintain CV base hourly wage (no +2k increase) and forfeit combo bonus.
    const baseWageCvPlus = isPenalized ? baseWageCv : workingHours * cvPlusBaseHourly;
    const comboBonusTotal = isPenalized ? 0 : rawComboBonusTotal;
    const productBonusTotal = 0;

    const totalCvIncome = baseWageCv + tipCv;
    const totalCvPlusIncome = baseWageCvPlus + tipCvPlus + comboBonusTotal + productBonusTotal;
    const deltaGain = totalCvPlusIncome - totalCvIncome;
    const deltaPercentage = totalCvIncome > 0 ? deltaGain / totalCvIncome : 0;

    const snapshot: CvPlusRewardSnapshot = {
      staffId: targetLegacyStaffId,
      staffName: staffName || 'Chuyên Viên',
      staffPhone: staffPhone || undefined,
      branchId,
      branchName,
      month,
      totalOrders,
      workingDays,
      workingHours,
      comboLiveOrders,
      notComboLiveOrders,
      comboSoldCount,
      selfComboRate: Math.round(selfComboRate * 1000) / 1000,
      isTargetHit,
      isPenalized,
      baseWageCv,
      baseWageCvPlus,
      tipCv,
      tipCvPlus,
      comboBonusTotal,
      productBonusTotal,
      totalCvIncome,
      totalCvPlusIncome,
      deltaGain,
      deltaPercentage: Math.round(deltaPercentage * 1000) / 1000,
      comboDetails,
    };

    // 8. Persist if requested
    if (persist) {
      try {
        await fastify.prisma.crm.crmStaffCvPlusRewardSnapshot.upsert({
          where: {
            staffId_month: {
              staffId: targetLegacyStaffId,
              month,
            },
          },
          update: {
            totalOrders,
            workingDays,
            workingHours,
            comboLiveOrders,
            notComboLiveOrders,
            comboSoldCount,
            selfComboRate: snapshot.selfComboRate,
            isTargetHit,
            isPenalized,
            baseWageCv,
            baseWageCvPlus,
            tipCv,
            tipCvPlus,
            comboBonusTotal,
            productBonusTotal,
            totalCvIncome,
            totalCvPlusIncome,
            deltaGain,
            deltaPercentage: snapshot.deltaPercentage,
            breakdownJson: JSON.stringify(comboDetails),
          },
          create: {
            staffId: targetLegacyStaffId,
            month,
            totalOrders,
            workingDays,
            workingHours,
            comboLiveOrders,
            notComboLiveOrders,
            comboSoldCount,
            selfComboRate: snapshot.selfComboRate,
            isTargetHit,
            isPenalized,
            baseWageCv,
            baseWageCvPlus,
            tipCv,
            tipCvPlus,
            comboBonusTotal,
            productBonusTotal,
            totalCvIncome,
            totalCvPlusIncome,
            deltaGain,
            deltaPercentage: snapshot.deltaPercentage,
            breakdownJson: JSON.stringify(comboDetails),
          },
        });
      } catch (err) {
        fastify.log.error({ err, targetLegacyStaffId, month }, 'Failed to persist CV+ snapshot');
      }
    }

    return snapshot;
  }

  /**
   * Tổng hợp mô phỏng toàn salon cho tất cả Chuyên Viên trong tháng
   */
  static async getAllCvPlusSimulations(
    fastify: FastifyInstance,
    month?: string
  ): Promise<CvPlusSimulationSummaryResponse> {
    const staffList = await this.listStaff(fastify);
    const activeCvs = staffList.filter((s) => s.currentRole === 'CV' || s.currentRole === 'CV_PLUS');
    const items: CvPlusRewardSnapshot[] = [];

    for (const staff of activeCvs) {
      const snap = await this.calculateCvPlusRewardsForStaff(fastify, staff.id, month, false);
      items.push(snap);
    }

    // Sort items by deltaGain descending
    items.sort((a, b) => b.deltaGain - a.deltaGain);

    const qualifiedCount = items.filter((i) => i.isTargetHit).length;
    const penalizedCount = items.filter((i) => i.isPenalized).length;
    const totalAdditionalPayout = items.reduce((sum, i) => sum + i.deltaGain, 0);

    return {
      month: items[0]?.month || month || '2026-09',
      totalStaffCount: items.length,
      qualifiedCount,
      penalizedCount,
      totalAdditionalPayout,
      items,
    };
  }
}
