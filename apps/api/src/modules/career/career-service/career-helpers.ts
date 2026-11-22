import type { CareerPeriod, CareerRole, SafeAny, StaffCareerStatus } from '@mos-lab/shared';
import { qaShopService } from '../../qa-shop/qa-shop.service.js';

export type CvRewardCalculationMode = 'ACTUAL_PAYROLL' | 'SIMULATION';

export interface BranchTipStats {
  storeId: number;
  branchName: string;
  branchCode: string;
  totalTip: number;
  validTipOrders: number;
  totalOrders: number;
  tipRate: number;
  avgTip: number;
}

export interface BranchTipStatsSummary {
  branchTipStatsMap: Record<number, BranchTipStats>;
  defaultShopTipRate: number;
  defaultShopAvgTip: number;
}

export interface StaffQaAuditEvaluation {
  qaAudit: NonNullable<StaffCareerStatus['metrics']['qaAudit']>;
  evaluatedWeeks: number;
}

export function normalizeAvatarUrl(url?: string | null): string | null {
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

/**
 * Điều răn CV-002: Trong kỳ lương thực tế (ACTUAL_PAYROLL), ai bấm Checkout (check_out_staff_id)
 * người đó nhận thưởng gói Combo & Dưỡng mi Yeppeum. Nếu CC bấm Checkout (check_out_staff_id = CC),
 * CVL không được cộng trùng thưởng gói của ca đó.
 */
export function buildCheckoutAttributionSqlCondition(mode: CvRewardCalculationMode = 'SIMULATION'): string {
  if (mode === 'ACTUAL_PAYROLL') {
    return '(os.check_out_staff_id = ? OR ((os.check_out_staff_id IS NULL OR os.check_out_staff_id = 0) AND os.assigned_staff_id = ?))';
  }
  return '(os.check_out_staff_id = ? OR os.assigned_staff_id = ?)';
}

/**
 * Tách chuẩn xác phần Tip kỹ thuật 70% và phần Tip tư vấn/checkout (+10% / +20%) từ bảng staff_tip.
 * StaffTipRunner của Legacy PHP đã ghi thẳng tỷ lệ thực nhận (90%, 80%, 70%, 20%, 10%) vào tip_percentage,
 * nên tuyệt đối không nhân (9/7) hoặc (2/7) lên dòng đã mang tip_percentage > 70 (tránh đội thành 115.7%).
 */
export function resolveCvTipSplitFromRows(
  rows: Array<{ tip_amount?: number | string | null; tip_percentage?: number | string | null }>,
  mode: CvRewardCalculationMode = 'SIMULATION'
): {
  totalLedgerTip: number;
  baseTechTip: number;
  consultDeltaTip: number;
  tipCv: number;
  tipCvPlus: number;
} {
  let totalLedgerTip = 0;
  let baseTechTip = 0;
  let simulatedTipCvPlus = 0;

  for (const r of rows) {
    const amt = Math.round(Number(r?.tip_amount || 0));
    if (amt <= 0) continue;
    const rawPct = Number(r?.tip_percentage || 0);
    const pct = rawPct > 0 ? rawPct : 70;

    totalLedgerTip += amt;

    if (pct >= 70) {
      const rowBase70 = pct === 70 ? amt : Math.round((amt * 70) / pct);
      baseTechTip += rowBase70;
      if (mode === 'SIMULATION' && pct === 70) {
        simulatedTipCvPlus += Math.round((amt * 9) / 7);
      } else {
        simulatedTipCvPlus += amt;
      }
    } else {
      // Dòng tip thuần Check-in / Check-out (10% hoặc 20%) khi Chuyên Viên khác làm dịch vụ
      simulatedTipCvPlus += amt;
    }
  }

  const consultDeltaTip = Math.max(0, totalLedgerTip - baseTechTip);
  return {
    totalLedgerTip,
    baseTechTip,
    consultDeltaTip,
    tipCv: baseTechTip,
    tipCvPlus: mode === 'ACTUAL_PAYROLL' ? totalLedgerTip : simulatedTipCvPlus,
  };
}

export function resolveCareerPeriodDates(period: CareerPeriod = 'last_30_days') {
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
    case 'last_month':
      periodLabel = 'Tháng trước';
      // 1 tháng hoàn chỉnh trước tháng này (không tính tháng này)
      periodStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
      periodEnd = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
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

    case 'last_30_days':
    default:
      periodLabel = '30 ngày qua';
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      periodEnd = now;
      break;
  }

  const formatSql = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  return {
    period: (period || 'last_30_days') as CareerPeriod,
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

export type CareerPeriodDates = ReturnType<typeof resolveCareerPeriodDates>;

export function buildShopTipStatsSql(periodStartSql: string, periodEndSql: string): string {
  return `
          SELECT 
            o.client_store_id,
            COUNT(DISTINCT o.id) as branch_orders,
            COUNT(DISTINCT CASE WHEN tip_summary.customer_tip >= 20000 THEN o.id END) as branch_valid_tip_orders,
            COALESCE(SUM(tip_summary.customer_tip), 0) as branch_total_tip
          FROM \`order\` o
          LEFT JOIN (
            SELECT 
              st.order_id,
              MAX(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END) as customer_tip
            FROM staff_tip st
            JOIN \`order\` o_tip ON o_tip.id = st.order_id
            WHERE o_tip.order_state = 'Completed'
              AND o_tip.booking_date_start >= ${periodStartSql}
              AND o_tip.booking_date_start < ${periodEndSql}
            GROUP BY st.order_id
          ) tip_summary ON tip_summary.order_id = o.id
          WHERE o.order_state = 'Completed'
            AND o.booking_date_start >= ${periodStartSql}
            AND o.booking_date_start < ${periodEndSql}
          GROUP BY o.client_store_id
        `;
}

export function buildBranchTipStatsSummary(shopTipRows?: SafeAny[] | null): BranchTipStatsSummary {
  const branchTipStatsMap: Record<number, BranchTipStats> = {};
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

  const defaultShopTipRate =
    overallShopOrders > 0 && overallShopValidTips > 0
      ? Number((overallShopValidTips / overallShopOrders).toFixed(3))
      : 0.45;
  const defaultShopAvgTip = overallShopOrders > 0 ? Math.round(overallShopTotalTip / overallShopOrders) : 38000;

  return { branchTipStatsMap, defaultShopTipRate, defaultShopAvgTip };
}

export function resolveStaffBranchStats(staffStoreId: number, summary: BranchTipStatsSummary): BranchTipStats {
  const branchInfo = resolveBranchInfo(staffStoreId);
  return (
    summary.branchTipStatsMap[staffStoreId] || {
      storeId: branchInfo.storeId,
      branchName: branchInfo.branchName,
      branchCode: branchInfo.branchCode,
      totalTip: 0,
      validTipOrders: 0,
      totalOrders: 0,
      tipRate: summary.defaultShopTipRate,
      avgTip: summary.defaultShopAvgTip,
    }
  );
}

export function evaluateStaffQaAudits(
  staffId: number,
  legacyId: number,
  periodStart: Date,
  periodEnd: Date,
  requiredAudits: number,
  requireZeroFailedAudits: boolean
): StaffQaAuditEvaluation {
  const evaluatedWeeks = Math.max(
    1,
    Math.round((periodEnd.getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  );

  // Truy vấn dữ liệu biên bản kiểm tra QA/QC tác phong & phòng mi thực tế từ QaShopService trong kỳ được chọn
  const allStaffAuditRecords = qaShopService
    .getStaffAudits(staffId)
    .concat(legacyId !== staffId ? qaShopService.getStaffAudits(legacyId) : []);

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
  }

  const isPassed =
    (requiredAudits === 0 || totalAudits >= requiredAudits) && (!requireZeroFailedAudits || !hasFailedAudit);

  return {
    evaluatedWeeks,
    qaAudit: {
      totalAudits,
      requiredAudits,
      passedAudits,
      failedAudits,
      weeklyAuditRate,
      hasFailedAudit,
      lastAuditDate,
      isPassed,
      latestResult: (hasFailedAudit ? 'FAILED' : isPassed ? 'PASSED' : latestResult) as 'PASSED' | 'FAILED' | 'PENDING',
      details: {
        groomingPassed: !hasFailedAudit,
        lashRoomPassed: !hasFailedAudit,
      },
    },
  };
}

export function resolveNextTargetRole(newRole: CareerRole): CareerRole {
  if (newRole === 'CV') return 'CV_PLUS';
  if (newRole === 'CV_PLUS') return 'CV_PLUS_PLUS';
  if (newRole === 'CV_PLUS_PLUS') return 'FM';
  if (newRole === 'CC') return 'FM';
  if (newRole === 'FM') return 'CHO';
  return 'BOSS';
}
