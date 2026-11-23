import type { FastifyInstance } from 'fastify';
import type { SafeAny, StaffHourlyProductivity } from '@mos-lab/shared';
import { ComboRecognitionService } from '../../customers/services/combo-recognition.service.js';
import {
  BranchTipStats,
  buildBranchTipStatsSummary,
  buildShopTipStatsSql,
  CareerPeriodDates,
  computeHourlyProductivity,
  resolveStaffBranchStats,
} from './career-helpers.js';
import { fetchStaffHourlyProductivity } from './career-productivity-queries.js';

export interface StaffProgressionLegacyMetrics {
  ordersCount: number;
  periodOrders: number;
  fixCount: number;
  fixRate: number;
  totalTip: number;
  periodTip: number;
  tipRatioAboveShop: number;
  shopAvgTip: number;
  staffAvgTip: number;
  staffTipRate: number;
  shopTipRate: number;
  tippedOrdersCount: number;
  staffBranch: BranchTipStats;
  selfComboCount: number;
  selfComboRate: number;
  happinessIndex: number;
  happyCount: number;
  totalHi: number;
  bananaCount: number;
  bananaBalance: number;
  monthlyPoints: number;
  ccLevel: number;
  ccBonusCash: number;
  ccTipShare: number;
  lastMonthWorkingHours: number;
  avg90dWorkingHours: number;
  payrollHourlyRate: number;
  payrollWorkingHours: number;
  payrollNetIncome: number;
  payrollSocialSecurity: number;
  payrollGrossIncome: number;
  payrollBonusAmount: number;
  payrollWageAmount: number;
  payrollTipAmount: number;
  payrollAllowanceAmount: number;
  payrollDate: string | null;
  payrollMonthLabel: string | null;
  productivity: StaffHourlyProductivity;
}

/**
 * Truy vấn avatar fallback từ legacy user_profile nếu crm_staff chưa có avatarUrl.
 */
export async function fetchLegacyStaffAvatarFallback(
  fastify: FastifyInstance,
  staffId: number,
  legacyStaffId: number | null | undefined,
  targetLegacyStaffId: number
): Promise<string | null> {
  if (!legacyStaffId) return null;
  try {
    const legacyUser = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT avatar FROM user_profile WHERE user_id = ? AND avatar IS NOT NULL AND avatar != '' LIMIT 1`,
      legacyStaffId
    );
    if (legacyUser?.[0]?.avatar) {
      return String(legacyUser[0].avatar);
    }
  } catch (err) {
    fastify.log.warn({ err, staffId, targetLegacyStaffId }, 'Could not fetch legacy avatar for progression');
  }
  return null;
}

/**
 * Tính toán các chỉ số thực tế từ Legacy DB cho lộ trình thăng tiến của một nhân sự.
 */
export async function fetchStaffProgressionLegacyMetrics(
  fastify: FastifyInstance,
  staffId: number,
  targetLegacyStaffId: number,
  periodConfig: CareerPeriodDates
): Promise<StaffProgressionLegacyMetrics> {
  let ordersCount = 0;
  let fixCount = 0;
  let fixRate = 0;
  let totalTip = 0;
  let tipRatioAboveShop = 0;
  let shopAvgTip = 38000;
  let staffAvgTip = 0;
  let staffTipRate = 0;
  let shopTipRate = 0.45;
  let tippedOrdersCount = 0;
  let staffBranch: BranchTipStats = {
    storeId: 6,
    branchName: 'Đề Thám',
    branchCode: 'DT',
    totalTip: 0,
    validTipOrders: 0,
    totalOrders: 0,
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
  let payrollWageAmount = 0;
  let payrollTipAmount = 0;
  let payrollAllowanceAmount = 0;
  let payrollDate: string | null = null;
  let payrollMonthLabel: string | null = null;
  let productivity: StaffHourlyProductivity = computeHourlyProductivity({});

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
      staffPeriodOrdersRes,
      staff90dOrdersRes,
      fetchedProductivity,
    ] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
          SELECT 
            -- Số bộ mi luôn luôn giữ ở 90 ngày qua:
            COUNT(CASE WHEN o.booking_date_start >= ${periodConfig.orders90dStartSql} AND o.booking_date_start < ${periodConfig.orders90dEndSql} THEN os.id END) as total_orders,
            COUNT(DISTINCT CASE 
              WHEN o.booking_date_start >= ${periodConfig.periodStartSql}
               AND o.booking_date_start < ${periodConfig.periodEndSql}
              THEN o.id END) as period_orders
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
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
          SELECT 
            COALESCE(SUM(CASE 
              WHEN o.booking_date_start >= ${periodConfig.periodStartSql}
               AND o.booking_date_start < ${periodConfig.periodEndSql}
              THEN st.tip_amount ELSE 0 END), 0) as period_tip,
            COUNT(st.id) as tip_count,
            COUNT(DISTINCT CASE WHEN tip_summary.customer_tip >= 20000 AND o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql} THEN st.order_id END) as valid_tip_orders_period,
            COUNT(DISTINCT CASE WHEN tip_summary.customer_tip >= 20000 THEN st.order_id END) as valid_tip_orders
          FROM staff_tip st
          JOIN \`order\` o ON o.id = st.order_id
          LEFT JOIN (
            SELECT 
              st2.order_id,
              MAX(CASE WHEN st2.tip_percentage > 0 THEN st2.tip_amount / (st2.tip_percentage / 100) ELSE st2.tip_amount END) as customer_tip
            FROM staff_tip st2
            JOIN \`order\` o_tip ON o_tip.id = st2.order_id
            WHERE o_tip.order_state = 'Completed'
              AND o_tip.booking_date_start >= ${periodConfig.periodStartSql}
              AND o_tip.booking_date_start < ${periodConfig.periodEndSql}
            GROUP BY st2.order_id
          ) tip_summary ON tip_summary.order_id = o.id
          WHERE st.user_id = ?
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
        `,
        targetLegacyStaffId
      ),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
          SELECT 
            COUNT(DISTINCT CASE WHEN o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql} THEN osc.order_id END) as combo_orders_period,
            COUNT(DISTINCT CASE WHEN o.booking_date_start >= ${periodConfig.orders90dStartSql} AND o.booking_date_start < ${periodConfig.orders90dEndSql} THEN osc.order_id END) as combo_orders
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          JOIN order_service_combo osc ON osc.order_id = os.order_id
          WHERE os.assigned_staff_id = ?
            AND o.order_state = 'Completed'
            AND (
              (o.booking_date_start >= ${periodConfig.orders90dStartSql} AND o.booking_date_start < ${periodConfig.orders90dEndSql})
              OR (o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql})
            )
            AND osc.total_price > 0
        `,
        targetLegacyStaffId
      ),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        buildShopTipStatsSql(periodConfig.periodStartSql, periodConfig.periodEndSql)
      ),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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
        .$queryRawUnsafe<SafeAny[]>(
          `
          SELECT amount
          FROM user_balance
          WHERE currency_id = 3 AND user_id = ?
          LIMIT 1
        `,
          targetLegacyStaffId
        )
        .catch(() => []),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
          SELECT client_store_id
          FROM user_profile
          WHERE user_id = ?
        `,
        targetLegacyStaffId
      ),
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
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
          ORDER BY (sp.date_completed IS NOT NULL) DESC, sp.date DESC
          LIMIT 1
        `,
          targetLegacyStaffId
        )
        .catch(() => []),
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
          SELECT DISTINCT o.id as order_id
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE os.assigned_staff_id = ?
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
        `,
          targetLegacyStaffId
        )
        .catch(() => []),
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
          SELECT DISTINCT o.id as order_id
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE os.assigned_staff_id = ?
            AND o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.orders90dStartSql}
            AND o.booking_date_start < ${periodConfig.orders90dEndSql}
        `,
          targetLegacyStaffId
        )
        .catch(() => []),
      fetchStaffHourlyProductivity(fastify, targetLegacyStaffId, periodConfig),
    ]);

    productivity = fetchedProductivity;

    if (payrollRes && payrollRes.length > 0) {
      const pr = payrollRes[0];
      payrollHourlyRate = Number(pr.working_hour_rate || 0);
      payrollWorkingHours = Number(pr.total_working_hour || 0);
      payrollNetIncome = Math.round(Number(pr.total_amount || 0));
      payrollSocialSecurity = Math.round(Number(pr.total_social_security_amount || 0));
      payrollGrossIncome = payrollNetIncome + payrollSocialSecurity;
      payrollBonusAmount = Math.round(Number(pr.total_bonus_amount || 0));
      payrollWageAmount = Math.round(Number(pr.total_wage_amount || 0));
      payrollTipAmount = Math.round(Number(pr.total_tip_amount || 0));
      payrollAllowanceAmount = Math.round(
        Number(pr.total_support_parking_amount || 0) +
          Number(pr.total_off_week_amount || 0) +
          Number(pr.total_extra_support_amount || 0) -
          payrollSocialSecurity
      );
      if (pr.date) {
        const d = new Date(pr.date);
        payrollDate = d.toISOString();
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        payrollMonthLabel = `Tháng ${m < 10 ? '0' + m : m}/${y}`;
      }
    }

    totalHi = Number(hiRes?.[0]?.total_evaluations || 0);
    happyCount = Number(hiRes?.[0]?.happy_count || 0);
    if (totalHi > 0) {
      happinessIndex = Number((happyCount / totalHi).toFixed(3));
    } else {
      try {
        const allTimeHi = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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
      } catch {
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

    let staffStoreId = 6;
    if (staffStoreRes?.[0]?.client_store_id) {
      staffStoreId = Number(staffStoreRes[0].client_store_id);
    } else if (staffProfileStoreRes?.[0]?.client_store_id) {
      staffStoreId = Number(staffProfileStoreRes[0].client_store_id);
    }

    const branchSummary = buildBranchTipStatsSummary(shopTipRes);
    staffBranch = resolveStaffBranchStats(staffStoreId, branchSummary);

    // Tỷ lệ tip và tiền tip trung bình được tính theo chuẩn chi nhánh của chính nhân sự đó
    shopTipRate = staffBranch.tipRate;
    shopAvgTip = staffBranch.avgTip;

    tipRatioAboveShop =
      shopTipRate > 0 && staffTipRate > 0
        ? Number(((staffTipRate - shopTipRate) / shopTipRate).toFixed(3))
        : shopAvgTip > 0 && periodOrders > 0 && totalTip > 0
          ? Number(((staffAvgTip - shopAvgTip) / shopAvgTip).toFixed(3))
          : totalTip > 0
            ? 0.15
            : 0;

    const staffPeriodOrderIds = Array.isArray(staffPeriodOrdersRes)
      ? staffPeriodOrdersRes.map((o: SafeAny) => Number(o.order_id))
      : [];
    let notComboLiveOrdersPeriod = 0;
    if (staffPeriodOrderIds.length > 0) {
      try {
        const liveMap = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(fastify, staffPeriodOrderIds);
        for (const oid of staffPeriodOrderIds) {
          if (!liveMap.get(oid)) notComboLiveOrdersPeriod++;
        }
      } catch (liveErr) {
        fastify.log.warn({ liveErr }, 'Failed to classify staff period orders for combo live in getStaffProgression');
      }
    }

    const staff90dOrderIds = Array.isArray(staff90dOrdersRes)
      ? staff90dOrdersRes.map((o: SafeAny) => Number(o.order_id))
      : [];
    let notComboLiveOrders90d = 0;
    if (staff90dOrderIds.length > 0) {
      try {
        const liveMap90 = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(fastify, staff90dOrderIds);
        for (const oid of staff90dOrderIds) {
          if (!liveMap90.get(oid)) notComboLiveOrders90d++;
        }
      } catch (liveErr) {
        fastify.log.warn({ liveErr }, 'Failed to classify staff 90d orders for combo live in getStaffProgression');
      }
    }

    const comboPeriodCount = Number(comboRes?.[0]?.combo_orders_period ?? 0);
    const combo90dCount = Number(comboRes?.[0]?.combo_orders ?? 0);

    const ratePeriod =
      notComboLiveOrdersPeriod > 0
        ? Number((comboPeriodCount / notComboLiveOrdersPeriod).toFixed(3))
        : periodOrders > 0
          ? Number((comboPeriodCount / Math.max(1, Math.round(periodOrders * 0.4))).toFixed(3))
          : 0;

    const rate90d =
      notComboLiveOrders90d > 0
        ? Number((combo90dCount / notComboLiveOrders90d).toFixed(3))
        : ordersCount > 0
          ? Number((combo90dCount / Math.max(1, Math.round((ordersCount / 3) * 0.4 * 3))).toFixed(3))
          : 0;

    // Kinh Thánh mOS Điều răn CV-002: Tiêu chí thăng tiến Ải 1 & Ải 2 đánh giá theo năng lực 3 tháng liền (90 ngày)
    // tương ứng với chuẩn Sản lượng mi (≥ 330 bộ mi).
    // Khi nhân viên đạt chuẩn trong chu kỳ 90 ngày tích lũy hoặc trong kỳ hiện hành,
    // hệ thống ghi nhận tỷ lệ đạt chuẩn tốt nhất trên tệp Not Combo Live để không phạt oan chuyên viên.
    selfComboCount = periodConfig.period === 'last_3_months' ? combo90dCount : comboPeriodCount;
    selfComboRate = periodConfig.period === 'last_3_months' ? rate90d : ratePeriod;

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

  return {
    ordersCount,
    periodOrders,
    fixCount,
    fixRate,
    totalTip,
    periodTip,
    tipRatioAboveShop,
    shopAvgTip,
    staffAvgTip,
    staffTipRate,
    shopTipRate,
    tippedOrdersCount,
    staffBranch,
    selfComboCount,
    selfComboRate,
    happinessIndex,
    happyCount,
    totalHi,
    bananaCount,
    bananaBalance,
    monthlyPoints,
    ccLevel,
    ccBonusCash,
    ccTipShare,
    lastMonthWorkingHours,
    avg90dWorkingHours,
    payrollHourlyRate,
    payrollWorkingHours,
    payrollNetIncome,
    payrollSocialSecurity,
    payrollGrossIncome,
    payrollBonusAmount,
    payrollWageAmount,
    payrollTipAmount,
    payrollAllowanceAmount,
    payrollDate,
    payrollMonthLabel,
    productivity,
  };
}
