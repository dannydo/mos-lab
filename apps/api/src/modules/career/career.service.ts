import { FastifyInstance } from 'fastify';
import {
  CareerProgressionConfig,
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  StaffCareerStatus,
  CareerRole,
  CareerProgressionStatus,
} from '@mos-lab/shared';
import { qaShopService } from '../qa-shop/qa-shop.service.js';
import { TeamService } from '../teams/team.service.js';

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
          normalizedCvReq.minBananaCount = 45;
        }

        cachedConfig = {
          ...DEFAULT_CAREER_PROGRESSION_CONFIG,
          ...parsed,
          cvToCc: normalizedCvReq,
          cvToCvPlus: normalizedCvReq,
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
  static async listStaff(fastify: FastifyInstance, query?: { role?: string; search?: string }): Promise<any[]> {
    // 1. Lấy danh sách ID thợ mi hoạt động từ cấu hình Báo Cáo CV (ACTIVE_CV_STAFF_CONFIG / CrmTeam 'CV')
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

    const legacyIds = crmStaffList
      .map((s) => s.legacyStaffId)
      .filter((id): id is number => typeof id === 'number' && id > 0);
    const legacyAvatarMap = new Map<number, string>();

    // 1. Bulk query performance from Legacy DB in last 90 days
    const ordersMap: Record<number, { orders: number; fixes: number }> = {};
    const tipsMap: Record<number, { totalTip: number; tipCount: number; validTipOrders?: number }> = {};
    const combosMap: Record<number, number> = {};
    const bonusesMap: Record<number, { points: number; cash: number; banana: number }> = {};
    const bananasMap: Record<number, number> = {};
    const hiMap: Record<number, number> = {};
    let shopAvgTip = 38000;
    const shopTipRate = 0.45;

    try {
      const [orderRows, tipRows, comboRows, bonusRows, shopTipRows, legacyProfileRows, bananaRows, hiRows] =
        await Promise.all([
          fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            os.assigned_staff_id,
            COUNT(os.id) as total_orders,
            COUNT(CASE WHEN os.next_fix_order_service_id IS NOT NULL THEN 1 END) as fix_count
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
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
            AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
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
            AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
          GROUP BY os.assigned_staff_id
        `),
          fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            sb.user_id,
            COALESCE(SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END), 0) as monthly_points,
            COALESCE(SUM(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END), 0) as cc_cash,
            COALESCE(SUM(CASE WHEN sb.bonus_type IN ('Credit', 'Banana') THEN sb.bonus_amount ELSE 0 END), 0) as banana_count
          FROM staff_bonus sb
          WHERE sb.date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)
          GROUP BY sb.user_id
        `),
          fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            COALESCE(SUM(st.tip_amount), 0) as shop_total_tip,
            COUNT(DISTINCT CASE WHEN st.tip_amount >= 20000 THEN st.order_id END) as shop_valid_tip_orders,
            (SELECT COUNT(id) FROM \`order\` WHERE order_state = 'Completed' AND booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)) as shop_orders
          FROM staff_tip st
          JOIN \`order\` o ON o.id = st.order_id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        `),
          legacyIds.length > 0
            ? fastify.prisma.legacy.$queryRawUnsafe<any[]>(
                `SELECT user_id, avatar FROM user_profile WHERE user_id IN (${legacyIds.join(',')}) AND avatar IS NOT NULL AND avatar != ''`
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
                AND g.date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)
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
                AND date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
              GROUP BY user_id
            `)
            : Promise.resolve([]),
        ]);

      if (Array.isArray(legacyProfileRows)) {
        legacyProfileRows.forEach((r: any) => {
          if (r.user_id && r.avatar) {
            legacyAvatarMap.set(Number(r.user_id), String(r.avatar));
          }
        });
      }

      orderRows.forEach((r) => {
        if (r.assigned_staff_id) {
          ordersMap[Number(r.assigned_staff_id)] = {
            orders: Number(r.total_orders) || 0,
            fixes: Number(r.fix_count) || 0,
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

      let shopTipRate = 0.45;
      if (shopTipRows && shopTipRows.length > 0) {
        const totalShopTip = Number(shopTipRows[0].shop_total_tip) || 0;
        const totalShopOrders = Number(shopTipRows[0].shop_orders) || 1;
        shopAvgTip = totalShopOrders > 0 ? Math.round(totalShopTip / totalShopOrders) : 38000;
        const shopValidTips = Number(shopTipRows[0].shop_valid_tip_orders) || 0;
        if (totalShopOrders > 0 && shopValidTips > 0) {
          const rawRate = shopValidTips / totalShopOrders;
          shopTipRate = rawRate > 0.1 && rawRate < 0.9 ? Number(rawRate.toFixed(3)) : 0.45;
        }
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Could not run bulk legacy queries for staff career list');
    }

    return crmStaffList.map((staff) => {
      const legacyId = staff.legacyStaffId || staff.id;
      const staffOrders = ordersMap[legacyId]?.orders || 0;
      const staffFixes = ordersMap[legacyId]?.fixes || 0;
      const fixRate = staffOrders > 0 ? Number((staffFixes / staffOrders).toFixed(4)) : 0;
      const totalTip = tipsMap[legacyId]?.totalTip || 0;
      const staffAvgTip = staffOrders > 0 ? totalTip / staffOrders : 0;
      const validTipOrders = tipsMap[legacyId]?.validTipOrders || 0;
      let staffTipRate = staffOrders > 0 && validTipOrders > 0 ? Number((validTipOrders / staffOrders).toFixed(3)) : 0;
      if (staffTipRate === 0 && totalTip > 0 && staffOrders > 0) {
        staffTipRate = Number(Math.min(0.65, Math.max(0.2, (totalTip / (staffOrders * 38000)) * 0.45)).toFixed(3));
      }
      const tipRatioAboveShop =
        shopTipRate > 0 && staffTipRate > 0
          ? Number(((staffTipRate - shopTipRate) / shopTipRate).toFixed(3))
          : shopAvgTip > 0 && staffOrders > 0
            ? Number(((staffAvgTip - shopAvgTip) / shopAvgTip).toFixed(3))
            : 0;
      const comboOrders = combosMap[legacyId] || 0;
      const selfComboRate = staffOrders > 0 ? Number((comboOrders / staffOrders).toFixed(3)) : 0;
      const monthlyPoints = bonusesMap[legacyId]?.points || 0;
      const ccLevel = monthlyPoints > 0 ? Math.floor(monthlyPoints / 100) + 1 : 1;

      // Determine Career Role (Chuyên viên Thợ Mi: CV, CV+, CV++)
      let careerRole: CareerRole = 'CV';
      if (
        staff.careerProgression?.currentRole &&
        ['CV', 'CV_PLUS', 'CV_PLUS_PLUS'].includes(staff.careerProgression.currentRole)
      ) {
        careerRole = staff.careerProgression.currentRole as CareerRole;
      } else {
        if (selfComboRate >= 0.25 && staffOrders >= 250) {
          careerRole = 'CV_PLUS_PLUS';
        } else if (selfComboRate >= 0.15 && staffOrders >= 150) {
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
        ordersCount: staffOrders,
        fixRate,
        totalTip,
        tipRatioAboveShop,
        staffTipRate,
        shopTipRate,
        selfComboRate,
        happinessIndex: hiMap[legacyId] ?? 0.75,
        bananaCount: bananasMap[legacyId] ?? 0,
        isBananaPassed: (bananasMap[legacyId] ?? 0) >= (config.cvToCvPlus?.minBananaCount ?? 45),
        ccLevel: ['CC', 'FM'].includes(careerRole) ? ccLevel : null,
        monthlyPoints: ['CC', 'FM'].includes(careerRole) ? monthlyPoints : null,
        qaAuditPassed: (() => {
          const reqAudits = config.cvToCvPlus?.minQaAudits ?? 12;
          const realAudits = qaShopService
            .getStaffAudits(staff.id)
            .concat(legacyId !== staff.id ? qaShopService.getStaffAudits(legacyId) : []);
          if (realAudits.length > 0) {
            const hasFail = realAudits.some((a) => a.auditEvaluationResult === 'FAILED');
            return realAudits.length >= reqAudits && !hasFail;
          }
          return reqAudits === 0;
        })(),
        hasFailedQaAudit: (() => {
          const realAudits = qaShopService
            .getStaffAudits(staff.id)
            .concat(legacyId !== staff.id ? qaShopService.getStaffAudits(legacyId) : []);
          if (realAudits.length > 0) {
            return realAudits.some((a) => a.auditEvaluationResult === 'FAILED');
          }
          return false;
        })(),
        weeklyQaAuditRate: (() => {
          const realAudits = qaShopService
            .getStaffAudits(staff.id)
            .concat(legacyId !== staff.id ? qaShopService.getStaffAudits(legacyId) : []);
          if (realAudits.length > 0) {
            return Number((realAudits.length / 12).toFixed(2));
          }
          return 0;
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
    requestedTargetRole?: CareerRole
  ): Promise<StaffCareerStatus> {
    if (forceRefresh) {
      this.invalidateCache();
    }

    const config = await this.getConfig(fastify);
    const cvReq = config.cvToCvPlus || config.cvToCc;

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
    let selfComboCount = 0;
    let selfComboRate = 0;
    let happinessIndex = 0.7;
    let bananaCount = 0;
    let monthlyPoints = 0;
    let ccLevel = 1;
    let ccBonusCash = 0;
    let ccTipShare = 0;
    const totalVisits = 0;
    let lastMonthOrders = 0;
    let lastMonthTip = 0;
    let lastMonthWorkingHours = 0;
    let avg90dWorkingHours = 0;

    try {
      const [orderRes, fixRes, tipRes, comboRes, bonusRes, shopTipRes, hiRes, bananaRes, workingHoursRes] =
        await Promise.all([
          fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `
          SELECT 
            COUNT(os.id) as total_orders,
            COUNT(CASE 
              WHEN o.booking_date_start >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01 00:00:00')
               AND o.booking_date_start <= CONCAT(LAST_DAY(DATE_SUB(NOW(), INTERVAL 1 MONTH)), ' 23:59:59')
              THEN os.id END) as last_month_orders
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE os.assigned_staff_id = ?
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        `,
            targetLegacyStaffId
          ),
          fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `
          SELECT COUNT(os.id) as fix_count
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE os.assigned_staff_id = ?
            AND os.next_fix_order_service_id IS NOT NULL
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        `,
            targetLegacyStaffId
          ),
          fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `
          SELECT 
            COALESCE(SUM(st.tip_amount), 0) as total_tip,
            COALESCE(SUM(CASE 
              WHEN o.booking_date_start >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01 00:00:00')
               AND o.booking_date_start <= CONCAT(LAST_DAY(DATE_SUB(NOW(), INTERVAL 1 MONTH)), ' 23:59:59')
              THEN st.tip_amount ELSE 0 END), 0) as last_month_tip,
            COUNT(st.id) as tip_count,
            COUNT(DISTINCT CASE WHEN st.tip_amount >= 20000 THEN st.order_id END) as valid_tip_orders
          FROM staff_tip st
          JOIN \`order\` o ON o.id = st.order_id
          WHERE st.user_id = ?
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
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
            AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
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
            AND sb.date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        `,
            targetLegacyStaffId
          ),
          fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT 
            COALESCE(SUM(st.tip_amount), 0) as shop_total_tip,
            COUNT(DISTINCT CASE WHEN st.tip_amount >= 20000 THEN st.order_id END) as shop_valid_tip_orders,
            (SELECT COUNT(id) FROM \`order\` WHERE order_state = 'Completed' AND booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)) as shop_orders
          FROM staff_tip st
          JOIN \`order\` o ON o.id = st.order_id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
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
            AND date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
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
            AND g.date_created >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        `,
            targetLegacyStaffId
          ),
          fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `
          SELECT 
            ROUND(COALESCE(SUM(CASE 
              WHEN date >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
               AND date <= LAST_DAY(DATE_SUB(NOW(), INTERVAL 1 MONTH))
              THEN TIMESTAMPDIFF(MINUTE, start_time, end_time) ELSE 0 END), 0) / 60, 1) as last_month_hours,
            ROUND(COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time)), 0) / 60 / 3, 1) as avg_90d_hours
          FROM staff_working_shift
          WHERE user_id = ?
            AND date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        `,
            targetLegacyStaffId
          ),
        ]);

      const totalHi = Number(hiRes?.[0]?.total_evaluations || 0);
      const happyCount = Number(hiRes?.[0]?.happy_count || 0);
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
            happinessIndex = Number((Number(allTimeHi?.[0]?.happy_count || 0) / totalAllTime).toFixed(3));
          }
        } catch (_hiErr) {
          // Safe fallback
        }
      }

      ordersCount = Number(orderRes?.[0]?.total_orders || 0);
      lastMonthOrders = Number(orderRes?.[0]?.last_month_orders || 0);
      fixCount = Number(fixRes?.[0]?.fix_count || 0);
      fixRate = ordersCount > 0 ? Number((fixCount / ordersCount).toFixed(4)) : 0;
      totalTip = Number(tipRes?.[0]?.total_tip ?? tipRes?.[0]?.staff_tip ?? 0);
      lastMonthTip = Number(tipRes?.[0]?.last_month_tip || 0);
      lastMonthWorkingHours = Number(workingHoursRes?.[0]?.last_month_hours || 0);
      avg90dWorkingHours = Number(workingHoursRes?.[0]?.avg_90d_hours || 0);
      staffAvgTip = ordersCount > 0 ? Math.round(totalTip / ordersCount) : 0;

      tippedOrdersCount = Number(tipRes?.[0]?.valid_tip_orders || 0);
      staffTipRate =
        ordersCount > 0 && tippedOrdersCount > 0 ? Number((tippedOrdersCount / ordersCount).toFixed(3)) : 0;
      if (staffTipRate === 0 && totalTip > 0 && ordersCount > 0) {
        staffTipRate = Number(Math.min(0.65, Math.max(0.25, (totalTip / (ordersCount * 38000)) * 0.45)).toFixed(3));
        tippedOrdersCount = Math.round(ordersCount * staffTipRate);
      }

      const shopTotalTip = Number(shopTipRes?.[0]?.shop_total_tip || 0);
      const shopOrders = Number(shopTipRes?.[0]?.shop_orders || 0);
      shopAvgTip = shopTotalTip > 0 && shopOrders > 0 ? Math.round(shopTotalTip / shopOrders) : 38000;
      shopTipRate = 0.45;
      const shopValidTips = Number(shopTipRes?.[0]?.shop_valid_tip_orders || 0);
      if (shopOrders > 0 && shopValidTips > 0) {
        const rawRate = shopValidTips / shopOrders;
        shopTipRate = rawRate > 0.1 && rawRate < 0.9 ? Number(rawRate.toFixed(3)) : 0.45;
      }

      const minTipRatioAboveShop = cvReq.minTipRatioAboveShop ?? 0.1;
      targetTipRate = Number((shopTipRate * (1 + minTipRatioAboveShop)).toFixed(3));

      tipRatioAboveShop =
        shopTipRate > 0 && staffTipRate > 0
          ? Number(((staffTipRate - shopTipRate) / shopTipRate).toFixed(3))
          : shopAvgTip > 0 && ordersCount > 0 && totalTip > 0
            ? Number(((staffAvgTip - shopAvgTip) / shopAvgTip).toFixed(3))
            : totalTip > 0
              ? 0.15
              : 0;

      selfComboCount = Number(comboRes?.[0]?.combo_orders || 0);
      selfComboRate = ordersCount > 0 ? Number((selfComboCount / ordersCount).toFixed(3)) : 0;

      monthlyPoints = Number(bonusRes?.[0]?.monthly_points || 0);
      ccBonusCash = Number(bonusRes?.[0]?.cc_cash || 0);
      bananaCount = Number(bananaRes?.[0]?.checkin_banana_count || 0);
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

    const minOrders = activeReq.minOrders ?? (isCvPlusPlusTarget ? 350 : 300);
    const maxFixRate = activeReq.maxFixRate ?? (isCvPlusPlusTarget ? 0.015 : 0.02);
    const minTipRatioAboveShop = activeReq.minTipRatioAboveShop ?? (isCvPlusPlusTarget ? 0.15 : 0.1);
    targetTipRate = Number((shopTipRate * (1 + minTipRatioAboveShop)).toFixed(3));
    const minBananaCount = activeReq.minBananaCount ?? (isCvPlusPlusTarget ? 60 : 45);
    const minHappinessIndex = activeReq.minHappinessIndex ?? (isCvPlusPlusTarget ? 0.8 : 0.7);
    const minSelfComboRate = activeReq.minSelfComboRate ?? (isCvPlusPlusTarget ? 0.3 : 0.2);
    const requiredAudits = activeReq.minQaAudits ?? 12;
    const requireZeroFailedAudits = activeReq.requireZeroFailedAudits !== false;
    const expectedSerumsPerWeek = activeReq.expectedSerumsPerWeek ?? 4;
    const expectedCombosPerMonth = activeReq.expectedCombosPerMonth ?? (isCvPlusPlusTarget ? 10 : 6);
    const crossConsultCommissionRate = (activeReq as any).crossConsultCommissionRate ?? 0.025;
    const crossConsultTipRate = (activeReq as any).crossConsultTipRate ?? 0.2;
    const expectedCrossConsultOrdersPerMonth = (activeReq as any).expectedCrossConsultOrdersPerMonth ?? 20;
    const expectedCrossConsultCombosPerMonth = (activeReq as any).expectedCrossConsultCombosPerMonth ?? 4;
    const crossConsultAvgTipPerOrder = shopAvgTip > 15000 ? shopAvgTip : 40000;
    const crossConsultTipAmount = Math.round(
      expectedCrossConsultOrdersPerMonth * crossConsultAvgTipPerOrder * crossConsultTipRate
    );
    const crossConsultComboAmount = Math.round(
      expectedCrossConsultCombosPerMonth * 4500000 * crossConsultCommissionRate
    );

    // Quest gates evaluation against dynamic config

    // QA/QC Audit Quest Evaluation (Kinh Thánh mOS Điều răn CAREER-QA-001)
    // Tối thiểu QA, QC 12 lần trong 3 tháng qua (cho phép Danny tự chỉnh qua config)
    const evaluatedWeeks = 12; // 90 ngày tương đương 12 tuần làm việc

    // Truy vấn dữ liệu biên bản kiểm tra QA/QC tác phong & phòng mi thực tế từ QaShopService
    const staffAuditRecords = qaShopService
      .getStaffAudits(staff.id)
      .concat(targetLegacyStaffId !== staff.id ? qaShopService.getStaffAudits(targetLegacyStaffId) : []);

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
      cv: 25500,
      cvPlus: 27500,
      cvPlusPlus: 29500,
    };

    // Giờ công thực tế: ưu tiên số giờ thực tế tháng trước của CV, nếu chưa có ca thì lấy trung bình 90 ngày, fallback 260h
    const actualWorkingHours =
      lastMonthWorkingHours > 0 ? lastMonthWorkingHours : avg90dWorkingHours > 0 ? avg90dWorkingHours : 260;
    const monthlyEstimatedHours = actualWorkingHours;

    // Tiền tip thực tế CV đã nhận (70%): ưu tiên tháng trước, nếu tháng trước = 0 thì lấy trung bình 3 tháng (totalTip / 3)
    const actualTipReceived = lastMonthTip > 0 ? lastMonthTip : ordersCount > 0 ? Math.round(totalTip / 3) : 2500000;
    const monthlyTipAvg = actualTipReceived;

    // Tổng tiền tip mà khách hàng thực tế đã cho trên hóa đơn (100% tip khách: actualTipReceived / 0.7)
    const customerTotalTip = Math.round(actualTipReceived / 0.7);

    // Số đơn làm trong tháng: ưu tiên tháng trước, nếu không thì lấy trung bình 3 tháng
    const monthlyOrdersCount =
      lastMonthOrders > 0 ? lastMonthOrders : ordersCount > 0 ? Math.round(ordersCount / 3) : 80;

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
    const lashSerumPrice = 1100000; // Giá bán lẻ Cây dưỡng mi Yeppeum 6ml (1.100.000đ)
    const serumCommissionAmount = Math.round(lashSerumPrice * 0.1); // Thưởng 10% = 110.000đ/cây
    const monthlySerumIncome = expectedSerumsPerMonth * serumCommissionAmount;

    let wageCurrent = hourlyWages.cv;
    let wageNext = hourlyWages.cvPlus;
    let tipShareCurrent = actualTipReceived; // Hiện tại nhận 70%
    let tipShareNext = Math.round(customerTotalTip * 0.9); // Khi lên CV+ nhận 90%
    let comboCommCurrent = 0;
    let comboCommNext = Math.round(monthlySelfComboRev * 0.025); // 2.5% hoa hồng tự tư vấn combo

    if (isCvPlusPlusTarget) {
      wageCurrent = currentRole === 'CV_PLUS' ? hourlyWages.cvPlus : hourlyWages.cv;
      wageNext = hourlyWages.cvPlusPlus; // 29.500đ/h
      tipShareCurrent = currentRole === 'CV_PLUS' ? Math.round(customerTotalTip * 0.9) : actualTipReceived;
      tipShareNext = Math.round(customerTotalTip * 0.9 + crossConsultTipAmount); // 90% tip cá nhân + 20% tip khi tư vấn cho CV khác
      comboCommCurrent = currentRole === 'CV_PLUS' ? Math.round(6 * avgComboPrice * 0.025) : 0;
      // CV++: combo cá nhân + combo tư vấn chéo hộ CV khác khi FM vắng
      comboCommNext = Math.round(expectedCombosPerMonth * avgComboPrice * 0.025 + crossConsultComboAmount);
    } else if (currentRole === 'CV_PLUS') {
      wageCurrent = hourlyWages.cvPlus;
      wageNext = hourlyWages.cvPlusPlus;
      tipShareCurrent = Math.round(customerTotalTip * 0.9);
      tipShareNext = Math.round(customerTotalTip * 0.9 + 500000); // Cross-consult
      comboCommCurrent = Math.round(monthlySelfComboRev * 0.025);
      comboCommNext = Math.round(monthlySelfComboRev * 0.03 + 800000);
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
    const currentEstimatedIncome =
      currentRole === 'FM'
        ? 8000000 + ccBonusCash + Math.round(totalTip * 0.2) + 2000000
        : currentRole === 'CHO'
          ? 11000000 + 3000000 + 3500000
          : wageCurrent * actualWorkingHours + tipShareCurrent + comboCommCurrent + cvXoayAllowance;

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
      metrics: {
        ordersCount,
        fixCount,
        fixRate,
        totalTip,
        tipRatioAboveShop,
        shopAvgTip,
        staffAvgTip,
        staffTipRate,
        shopTipRate,
        targetTipRate,
        tippedOrdersCount,
        happinessIndex,
        bananaCount,
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
    actorId: number
  ): Promise<StaffCareerStatus> {
    const status = await this.getStaffProgression(fastify, staffId);
    if (!status.qualifiedQuests.qaAuditCompleted) {
      const reason = status.metrics.qaAudit?.hasFailedAudit
        ? 'Không thể duyệt thăng cấp do có bài kiểm tra QA/QC tác phong hoặc phòng nối mi bị FAILED'
        : 'Không thể duyệt thăng cấp do chưa đạt tần suất kiểm tra QA/QC tác phong & phòng mi định kỳ (tối thiểu 1 lần/tuần)';
      throw new Error(reason);
    }

    const now = new Date();

    // 1. Update Career Progression record
    await fastify.prisma.crm.crmCareerProgression.upsert({
      where: { staffId },
      create: {
        staffId,
        currentRole: newRole,
        targetRole: newRole === 'CC' ? 'FM' : newRole === 'FM' ? 'CHO' : 'BOSS',
        status: 'PROMOTED',
        promotedAt: now,
        promotedBy: actorId,
      },
      update: {
        currentRole: newRole,
        targetRole: newRole === 'CC' ? 'FM' : newRole === 'FM' ? 'CHO' : 'BOSS',
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
}
