import type { FastifyInstance } from 'fastify';
import {
  FM_SHOP_FUND_SPECS,
  type FmBranchCode,
  type FmWeeklyQuestDefinition,
  type FmWeeklyQuestDetailItem,
  type FmWeeklyQuestLedgerEntry,
  type FmWeeklyQuestLiveEval,
  type SafeAny,
} from '@mos-lab/shared';
import { FAL_RULE_VALUES_SQL } from '../kpi/services/cc-kpi.service.js';

export function resolveIsoWeekRange(weekKey?: string | null): {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  monthKey: string;
} {
  const now = new Date();
  const vietnamNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  let year = vietnamNow.getUTCFullYear();
  let weekNum = 1;

  const match = String(weekKey || '')
    .trim()
    .match(/^(\d{4})-W(\d{2})$/i);

  if (match) {
    year = Number(match[1]);
    weekNum = Math.max(1, Math.min(53, Number(match[2])));
  } else {
    // ISO week calculation from current ICT date
    const temp = new Date(Date.UTC(vietnamNow.getUTCFullYear(), vietnamNow.getUTCMonth(), vietnamNow.getUTCDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    year = temp.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    weekNum = Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  // Monday of ISO week
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
  const monday = new Date(week1Monday.getTime() + (weekNum - 1) * 7 * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const canonicalWeek = `${year}-W${String(weekNum).padStart(2, '0')}`;
  return {
    weekKey: canonicalWeek,
    weekStart: fmt(monday),
    weekEnd: fmt(sunday),
    monthKey: fmt(monday).slice(0, 7),
  };
}

export function computeUnderminkEvaluation(
  items: FmWeeklyQuestDetailItem[],
  minPerCv: number,
  minPassRatioPct = 85
): { passed: boolean; metricSummary: string; detailItems: FmWeeklyQuestDetailItem[] } {
  if (items.length === 0) {
    return {
      passed: false,
      metricSummary: 'Chưa ghi nhận ca CV phát sinh trong tuần',
      detailItems: [],
    };
  }
  const safeThreshold = Math.max(1, Math.min(100, Math.round(minPassRatioPct)));
  const passCount = items.filter((item) => item.passed).length;
  const passRatioPct = Math.round((passCount / items.length) * 100);
  const passed = passRatioPct >= safeThreshold;
  return {
    passed,
    metricSummary: `${passCount}/${items.length} CV (${passRatioPct}%) đạt ≥${minPerCv} bộ (chuẩn ≥${safeThreshold}%)`,
    detailItems: items,
  };
}

export function computeFalWeeklyEvaluation(
  counts: { fixCount: number; adjustCount: number; logCount: number; activeCvCount: number },
  caps: { maxFix: number; maxAdjust: number; maxLog: number }
): { passed: boolean; metricSummary: string; detailItems: FmWeeklyQuestDetailItem[] } {
  const effectiveMaxFix = caps.maxFix + (counts.activeCvCount >= 13 ? 1 : 0);
  const fixOk = counts.fixCount <= effectiveMaxFix;
  const adjOk = counts.adjustCount <= caps.maxAdjust;
  const logOk = counts.logCount <= caps.maxLog;
  const passed = fixOk && adjOk && logOk;
  const scaleTag = counts.activeCvCount >= 13 ? ` · ≥13 CV (${counts.activeCvCount} CV)` : '';

  return {
    passed,
    metricSummary: `${counts.fixCount}F · ${counts.adjustCount}A · ${counts.logCount}L (Trần ${effectiveMaxFix}F · ${caps.maxAdjust}A · ${caps.maxLog}L${scaleTag})`,
    detailItems: [
      { label: 'Fix (Bảo hành mi)', countText: `${counts.fixCount}/${effectiveMaxFix}`, passed: fixOk },
      { label: 'Adjust (Chỉnh nối)', countText: `${counts.adjustCount}/${caps.maxAdjust}`, passed: adjOk },
      { label: 'Log (Ghi nhận kỹ thuật)', countText: `${counts.logCount}/${caps.maxLog}`, passed: logOk },
    ],
  };
}

async function evaluateUnderminkQuest(
  fastify: FastifyInstance,
  storeId: number,
  weekStart: string,
  weekEnd: string,
  minPerCv: number,
  minPassRatioPct: number
): Promise<{ passed: boolean; metricSummary: string; detailItems: FmWeeklyQuestDetailItem[] }> {
  try {
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `
      SELECT
        os.assigned_staff_id AS staffId,
        COALESCE(tech_p.full_name, CONCAT('CV #', os.assigned_staff_id)) AS staffName,
        SUM(
          CASE
            WHEN LOWER(COALESCE(sl.service_name, s.service_key, '')) LIKE '%under%' THEN 1
            ELSE 0
          END
        ) AS underCount
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN report_order ro ON o.id = ro.order_id
      JOIN service s ON os.service_id = s.id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      LEFT JOIN user_profile tech_p ON os.assigned_staff_id = tech_p.user_id
      WHERE o.client_store_id = ${Number(storeId)}
        AND o.order_state = 'Completed'
        AND ro.date BETWEEN '${weekStart}' AND '${weekEnd}'
        AND os.assigned_staff_id > 0
      GROUP BY os.assigned_staff_id, tech_p.full_name
      ORDER BY underCount ASC, staffName ASC
      `
    );

    const detailItems: FmWeeklyQuestDetailItem[] = (rows || []).map((r) => {
      const count = Number(r.underCount || 0);
      return {
        staffId: Number(r.staffId),
        label: String(r.staffName || `CV #${r.staffId}`),
        countText: `${count}/${minPerCv} bộ`,
        passed: count >= minPerCv,
      };
    });

    return computeUnderminkEvaluation(detailItems, minPerCv, minPassRatioPct);
  } catch (err) {
    fastify.log?.warn?.({ err }, 'evaluateUnderminkQuest legacy query failed');
    return {
      passed: false,
      metricSummary: 'Chưa thể đồng bộ dữ liệu Undermink từ hệ thống cửa hàng',
      detailItems: [],
    };
  }
}

async function evaluateBananaNoLateQuest(
  fastify: FastifyInstance,
  storeId: number,
  weekStart: string,
  weekEnd: string,
  maxLateCount: number
): Promise<{ passed: boolean; metricSummary: string; detailItems: FmWeeklyQuestDetailItem[] }> {
  try {
    const [lateActivityRows, refundRows] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT
          sa.id AS activityId,
          sa.user_id AS staffId,
          COALESCE(up.full_name, CONCAT('NV #', sa.user_id)) AS staffName,
          ABS(sa.amount) AS bananaAmount,
          sarl.staff_activity_rule_title AS ruleTitle,
          DATE_FORMAT(COALESCE(sws.date, sa.date_created), '%d/%m') AS dayLabel
        FROM \`staff_activity\` sa
        JOIN \`user_profile\` up ON up.user_id = sa.user_id
        JOIN \`staff_activity_rule\` sar ON sar.id = sa.staff_activity_rule_id
        JOIN \`staff_activity_rule_language\` sarl ON sarl.staff_activity_rule_id = sar.id AND sarl.language_id = 1
        LEFT JOIN \`staff_working_shift\` sws ON sws.id = sa.item_id AND sa.type = 'staff_working_shift'
        WHERE COALESCE(sa.client_store_id, up.client_store_id) = ${Number(storeId)}
          AND sa.amount < 0
          AND LOWER(sarl.staff_activity_rule_title) LIKE '%đi trễ%'
          AND sa.date_created >= '${weekStart} 00:00:00'
          AND sa.date_created <= '${weekEnd} 23:59:59'
        ORDER BY sa.date_created DESC
        `
      ),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT
          ubt.user_id AS staffId,
          ubt.amount
        FROM \`user_balance_transaction\` ubt
        WHERE ubt.currency_id = 3
          AND ubt.amount > 0
          AND (ubt.parent_id IS NOT NULL OR ubt.template_id = 102 OR ubt.tracking_key LIKE '%user_balance_transaction_id%')
          AND ubt.date_created >= '${weekStart} 00:00:00'
          AND ubt.date_created <= '${weekEnd} 23:59:59'
        `
      ),
    ]);

    const refundedAmountsByUser = new Map<number, number[]>();
    for (const r of refundRows || []) {
      const uid = Number(r.staffId || 0);
      const list = refundedAmountsByUser.get(uid) || [];
      list.push(Math.abs(Number(r.amount || 0)));
      refundedAmountsByUser.set(uid, list);
    }

    const unwaivedLates: FmWeeklyQuestDetailItem[] = [];
    for (const row of lateActivityRows || []) {
      const uid = Number(row.staffId || 0);
      const amt = Math.abs(Number(row.bananaAmount || 0));
      const refunds = refundedAmountsByUser.get(uid) || [];
      const matchIdx = refunds.findIndex((v) => v === amt);
      if (matchIdx >= 0) {
        refunds.splice(matchIdx, 1);
        continue; // Waived / refunded
      }
      unwaivedLates.push({
        staffId: uid,
        label: String(row.staffName || `NV #${uid}`),
        countText: `${row.dayLabel || ''} · -${amt} chuối`,
        passed: false,
      });
    }

    const lateCount = unwaivedLates.length;
    const passed = lateCount <= maxLateCount;
    return {
      passed,
      metricSummary: passed
        ? `0 ca đi trễ · Đủ điều kiện 100% tặng chuối`
        : `Phát sinh ${lateCount} ca đi trễ (trần ≤ ${maxLateCount})`,
      detailItems: unwaivedLates,
    };
  } catch (err) {
    fastify.log?.warn?.({ err }, 'evaluateBananaNoLateQuest legacy query failed');
    return {
      passed: false,
      metricSummary: 'Chưa thể đồng bộ dữ liệu đi trễ / chuối từ hệ thống',
      detailItems: [],
    };
  }
}

async function evaluateFalWeeklyCapQuest(
  fastify: FastifyInstance,
  storeId: number,
  weekStart: string,
  weekEnd: string,
  caps: { maxFix: number; maxAdjust: number; maxLog: number }
): Promise<{ passed: boolean; metricSummary: string; detailItems: FmWeeklyQuestDetailItem[] }> {
  try {
    const [falRows, cvCountRows] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT
          SUM(CASE WHEN effectiveRule = 'Fix' THEN 1 ELSE 0 END) AS fixCount,
          SUM(CASE WHEN effectiveRule = 'Adjust' THEN 1 ELSE 0 END) AS adjustCount,
          SUM(CASE WHEN effectiveRule = 'Log' THEN 1 ELSE 0 END) AS logCount
        FROM (
          SELECT
            CASE
              WHEN os.next_fix_order_service_id > 0 THEN 'Fix'
              WHEN os.next_adjust_order_service_id > 0 THEN 'Adjust'
              WHEN os.next_log_order_service_id > 0 THEN 'Log'
              WHEN ros.service_type IN (${FAL_RULE_VALUES_SQL}) THEN ros.service_type
              WHEN s.service_type IN (${FAL_RULE_VALUES_SQL}) THEN s.service_type
              ELSE ''
            END AS effectiveRule
          FROM order_service os
          JOIN \`order\` o ON os.order_id = o.id
          JOIN report_order ro ON o.id = ro.order_id
          JOIN service s ON os.service_id = s.id
          LEFT JOIN report_order_service ros ON ros.order_service_id = os.id
          WHERE o.client_store_id = ${Number(storeId)}
            AND o.order_state = 'Completed'
            AND ro.date BETWEEN '${weekStart}' AND '${weekEnd}'
        ) fal_sub
        WHERE effectiveRule IN ('Fix', 'Adjust', 'Log')
        `
      ),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT COUNT(DISTINCT os.assigned_staff_id) AS activeCvCount
        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        JOIN report_order ro ON o.id = ro.order_id
        WHERE o.client_store_id = ${Number(storeId)}
          AND o.order_state = 'Completed'
          AND ro.date BETWEEN '${weekStart}' AND '${weekEnd}'
          AND os.assigned_staff_id > 0
        `
      ),
    ]);

    const row = falRows?.[0] || {};
    const activeCvCount = Number(cvCountRows?.[0]?.activeCvCount || 0);
    return computeFalWeeklyEvaluation(
      {
        fixCount: Number(row.fixCount || 0),
        adjustCount: Number(row.adjustCount || 0),
        logCount: Number(row.logCount || 0),
        activeCvCount,
      },
      caps
    );
  } catch (err) {
    fastify.log?.warn?.({ err }, 'evaluateFalWeeklyCapQuest legacy query failed');
    return {
      passed: false,
      metricSummary: 'Chưa thể đồng bộ dữ liệu FAL tuần từ hệ thống',
      detailItems: [],
    };
  }
}

export async function evaluateWeeklyQuest(
  fastify: FastifyInstance,
  branch: FmBranchCode,
  weekStart: string,
  weekEnd: string,
  quest: FmWeeklyQuestDefinition,
  ledgerEntry?: FmWeeklyQuestLedgerEntry
): Promise<FmWeeklyQuestLiveEval> {
  const storeId = FM_SHOP_FUND_SPECS[branch].storeId;
  let passed = Boolean(ledgerEntry?.manualPassed);
  let autoEvaluated = false;
  let metricSummary = ledgerEntry?.proofNote
    ? `Đã nộp minh chứng: ${ledgerEntry.proofNote}`
    : 'Chờ FM nộp minh chứng hoặc HR/CEO chốt';
  let detailItems: FmWeeklyQuestDetailItem[] = [];

  if (quest.type === 'undermink') {
    autoEvaluated = true;
    const res = await evaluateUnderminkQuest(
      fastify,
      storeId,
      weekStart,
      weekEnd,
      Math.max(1, Number(quest.targetConfig?.minUnderminkPerCv ?? 2)),
      Math.max(1, Math.min(100, Number(quest.targetConfig?.minPassRatioPct ?? 85)))
    );
    passed = ledgerEntry?.manualPassed !== undefined ? ledgerEntry.manualPassed : res.passed;
    metricSummary = res.metricSummary;
    detailItems = res.detailItems;
  } else if (quest.type === 'banana_no_late') {
    autoEvaluated = true;
    const res = await evaluateBananaNoLateQuest(
      fastify,
      storeId,
      weekStart,
      weekEnd,
      Math.max(0, Number(quest.targetConfig?.maxLateCount ?? 0))
    );
    passed = ledgerEntry?.manualPassed !== undefined ? ledgerEntry.manualPassed : res.passed;
    metricSummary = res.metricSummary;
    detailItems = res.detailItems;
  } else if (quest.type === 'fal_weekly_cap') {
    autoEvaluated = true;
    const res = await evaluateFalWeeklyCapQuest(fastify, storeId, weekStart, weekEnd, {
      maxFix: Math.max(0, Number(quest.targetConfig?.maxFix ?? 1)),
      maxAdjust: Math.max(0, Number(quest.targetConfig?.maxAdjust ?? 1)),
      maxLog: Math.max(0, Number(quest.targetConfig?.maxLog ?? 1)),
    });
    passed = ledgerEntry?.manualPassed !== undefined ? ledgerEntry.manualPassed : res.passed;
    metricSummary = res.metricSummary;
    detailItems = res.detailItems;
  }

  return {
    questId: quest.id,
    passed,
    autoEvaluated,
    metricSummary,
    detailItems,
    settled: Boolean(ledgerEntry?.settled),
    settledAmountVnd: Number(ledgerEntry?.settledAmountVnd || 0),
    settledAt: ledgerEntry?.settledAt || null,
    settledBy: ledgerEntry?.settledBy || null,
    fundTransactionId: ledgerEntry?.fundTransactionId || null,
    proofNote: ledgerEntry?.proofNote || null,
    proofUrl: ledgerEntry?.proofUrl || null,
    proofSubmittedBy: ledgerEntry?.proofSubmittedBy || null,
    proofSubmittedAt: ledgerEntry?.proofSubmittedAt || null,
  };
}
