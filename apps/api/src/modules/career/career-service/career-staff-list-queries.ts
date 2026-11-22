import type { FastifyInstance } from 'fastify';
import type { SafeAny } from '@mos-lab/shared';
import { ComboRecognitionService } from '../../customers/services/combo-recognition.service.js';
import {
  BranchTipStatsSummary,
  buildBranchTipStatsSummary,
  buildShopTipStatsSql,
  CareerPeriodDates,
} from './career-helpers.js';

export interface BulkCareerMetrics {
  legacyAvatarMap: Map<number, string>;
  ordersMap: Record<number, { orders90d: number; ordersPeriod: number; fixesPeriod: number }>;
  tipsMap: Record<number, { totalTip: number; tipCount: number; validTipOrders?: number }>;
  combosMap: Record<number, { period: number; ninetyDays: number }>;
  notComboLiveOrdersPeriodMap: Record<number, number>;
  notComboLiveOrders90dMap: Record<number, number>;
  bonusesMap: Record<number, { points: number; cash: number; banana: number }>;
  bananasMap: Record<number, number>;
  bananaBalancesMap: Record<number, number>;
  hiMap: Record<number, number>;
  staffPrimaryStoreMap: Record<number, number>;
  profileStoreMap: Record<number, number>;
  branchSummary: BranchTipStatsSummary;
}

/**
 * Truy vấn hàng loạt chỉ số hiệu suất từ Legacy DB cho danh sách nhân sự lộ trình thăng tiến.
 */
export async function fetchBulkStaffCareerMetrics(
  fastify: FastifyInstance,
  legacyIds: number[],
  periodConfig: CareerPeriodDates
): Promise<BulkCareerMetrics> {
  const legacyAvatarMap = new Map<number, string>();
  const ordersMap: Record<number, { orders90d: number; ordersPeriod: number; fixesPeriod: number }> = {};
  const tipsMap: Record<number, { totalTip: number; tipCount: number; validTipOrders?: number }> = {};
  const combosMap: Record<number, { period: number; ninetyDays: number }> = {};
  const notComboLiveOrdersPeriodMap: Record<number, number> = {};
  const notComboLiveOrders90dMap: Record<number, number> = {};
  const bonusesMap: Record<number, { points: number; cash: number; banana: number }> = {};
  const bananasMap: Record<number, number> = {};
  const bananaBalancesMap: Record<number, number> = {};
  const hiMap: Record<number, number> = {};
  const staffPrimaryStoreMap: Record<number, number> = {};
  const profileStoreMap: Record<number, number> = {};
  let branchSummary: BranchTipStatsSummary = {
    branchTipStatsMap: {},
    defaultShopTipRate: 0.45,
    defaultShopAvgTip: 38000,
  };

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
      periodStaffOrdersRows,
      ninetyDaysStaffOrdersRows,
    ] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            os.assigned_staff_id,
            COUNT(CASE WHEN o.booking_date_start >= ${periodConfig.orders90dStartSql} AND o.booking_date_start < ${periodConfig.orders90dEndSql} THEN os.id END) as total_orders_90d,
            COUNT(DISTINCT CASE WHEN o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql} THEN o.id END) as total_orders_period,
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
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            st.user_id,
            COALESCE(SUM(st.tip_amount), 0) as total_tip,
            COUNT(st.id) as tip_count,
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
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
          GROUP BY st.user_id
        `),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            os.assigned_staff_id,
            COUNT(DISTINCT CASE WHEN o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql} THEN osc.order_id END) as combo_orders_period,
            COUNT(DISTINCT CASE WHEN o.booking_date_start >= ${periodConfig.orders90dStartSql} AND o.booking_date_start < ${periodConfig.orders90dEndSql} THEN osc.order_id END) as combo_orders_90d
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          JOIN order_service_combo osc ON osc.order_id = os.order_id
          WHERE o.order_state = 'Completed'
            AND (
              (o.booking_date_start >= ${periodConfig.orders90dStartSql} AND o.booking_date_start < ${periodConfig.orders90dEndSql})
              OR (o.booking_date_start >= ${periodConfig.periodStartSql} AND o.booking_date_start < ${periodConfig.periodEndSql})
            )
            AND osc.total_price > 0
          GROUP BY os.assigned_staff_id
        `),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
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
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        buildShopTipStatsSql(periodConfig.periodStartSql, periodConfig.periodEndSql)
      ),
      legacyIds.length > 0
        ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `SELECT user_id, avatar, client_store_id FROM user_profile WHERE user_id IN (${legacyIds.join(',')})`
          )
        : Promise.resolve([]),
      legacyIds.length > 0
        ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
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
        ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
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
            .$queryRawUnsafe<SafeAny[]>(
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
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
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
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
          SELECT DISTINCT os.assigned_staff_id, o.id as order_id
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.periodStartSql}
            AND o.booking_date_start < ${periodConfig.periodEndSql}
        `
        )
        .catch(() => []),
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
          SELECT DISTINCT os.assigned_staff_id, o.id as order_id
          FROM order_service os
          JOIN \`order\` o ON o.id = os.order_id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodConfig.orders90dStartSql}
            AND o.booking_date_start < ${periodConfig.orders90dEndSql}
        `
        )
        .catch(() => []),
    ]);

    const allOrderIdsToClassify = Array.from(
      new Set([
        ...(periodStaffOrdersRows || []).map((r: SafeAny) => Number(r.order_id)),
        ...(ninetyDaysStaffOrdersRows || []).map((r: SafeAny) => Number(r.order_id)),
      ])
    );

    if (allOrderIdsToClassify.length > 0) {
      try {
        const liveMap = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(
          fastify,
          allOrderIdsToClassify
        );

        if (Array.isArray(periodStaffOrdersRows)) {
          for (const r of periodStaffOrdersRows) {
            const staffId = Number(r.assigned_staff_id);
            const isLive = liveMap.get(Number(r.order_id));
            if (!isLive) {
              notComboLiveOrdersPeriodMap[staffId] = (notComboLiveOrdersPeriodMap[staffId] || 0) + 1;
            }
          }
        }

        if (Array.isArray(ninetyDaysStaffOrdersRows)) {
          for (const r of ninetyDaysStaffOrdersRows) {
            const staffId = Number(r.assigned_staff_id);
            const isLive = liveMap.get(Number(r.order_id));
            if (!isLive) {
              notComboLiveOrders90dMap[staffId] = (notComboLiveOrders90dMap[staffId] || 0) + 1;
            }
          }
        }
      } catch (liveErr) {
        fastify.log.warn({ liveErr }, 'Failed to batch classify combo live states in getStaffListSummary');
      }
    }

    if (Array.isArray(balanceRows)) {
      balanceRows.forEach((r: SafeAny) => {
        if (r.user_id) {
          bananaBalancesMap[Number(r.user_id)] = Number(r.amount) || 0;
        }
      });
    }

    if (Array.isArray(staffStoreRows)) {
      staffStoreRows.forEach((r: SafeAny) => {
        const staffId = Number(r.assigned_staff_id);
        if (staffId && !staffPrimaryStoreMap[staffId]) {
          staffPrimaryStoreMap[staffId] = Number(r.client_store_id);
        }
      });
    }

    if (Array.isArray(legacyProfileRows)) {
      legacyProfileRows.forEach((r: SafeAny) => {
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
        combosMap[Number(r.assigned_staff_id)] = {
          period: Number(r.combo_orders_period) || 0,
          ninetyDays: Number(r.combo_orders_90d) || 0,
        };
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
      bananaRows.forEach((r: SafeAny) => {
        if (r.user_id) {
          bananasMap[Number(r.user_id)] = Number(r.banana_count) || 0;
        }
      });
    }

    if (Array.isArray(hiRows)) {
      hiRows.forEach((r: SafeAny) => {
        if (r.user_id) {
          const total = Number(r.total_evaluations) || 0;
          const happy = Number(r.happy_count) || 0;
          hiMap[Number(r.user_id)] = total > 0 ? Number((happy / total).toFixed(3)) : 0.75;
        }
      });
    }

    branchSummary = buildBranchTipStatsSummary(shopTipRows);
  } catch (err) {
    fastify.log.warn({ err }, 'Could not run bulk legacy queries for staff career list');
  }

  return {
    legacyAvatarMap,
    ordersMap,
    tipsMap,
    combosMap,
    notComboLiveOrdersPeriodMap,
    notComboLiveOrders90dMap,
    bonusesMap,
    bananasMap,
    bananaBalancesMap,
    hiMap,
    staffPrimaryStoreMap,
    profileStoreMap,
    branchSummary,
  };
}
