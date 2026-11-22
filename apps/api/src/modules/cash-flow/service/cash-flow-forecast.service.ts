import type { FastifyInstance } from 'fastify';
import type { CashFlowForecastResponse, CashFlowForecastSummary, CashFlowTimelinePoint } from '@mos-lab/shared';
import { CcKpiService } from '../../kpi/services/cc-kpi.service.js';
import { mapCashAccount, mapCashFlowEntry } from './cash-flow-mappers.js';

/**
 * Lấy dữ liệu dự báo dòng tiền theo kỳ và chi nhánh
 */
export async function getCashFlowForecast(
  fastify: FastifyInstance,
  params: {
    startDate?: string;
    endDate?: string;
    storeId?: number;
    accountId?: number;
  }
): Promise<CashFlowForecastResponse> {
  const today = new Date();
  const startDateStr = params.startDate || today.toISOString().slice(0, 10);
  const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const endDateStr = params.endDate || futureDate.toISOString().slice(0, 10);

  const startDateTime = new Date(`${startDateStr}T00:00:00.000Z`);
  const endDateTime = new Date(`${endDateStr}T23:59:59.999Z`);

  // 1. Lấy danh sách tài khoản tiền
  const accounts = await fastify.prisma.crm.crmCashAccount.findMany({
    where: {
      isActive: true,
      ...(params.storeId ? { storeId: params.storeId } : {}),
      ...(params.accountId ? { id: params.accountId } : {}),
    },
    orderBy: { id: 'asc' },
  });

  const totalCurrentBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalSafetyThreshold = accounts.reduce((sum, a) => sum + a.minSafetyThreshold, 0);

  // 2. Lấy các bản ghi thu chi trong khoảng thời gian
  const entries = await fastify.prisma.crm.crmCashFlowEntry.findMany({
    where: {
      expectedDate: {
        gte: startDateTime,
        lte: endDateTime,
      },
      status: { not: 'CANCELLED' },
      ...(params.storeId ? { storeId: params.storeId } : {}),
      ...(params.accountId ? { accountId: params.accountId } : {}),
    },
    orderBy: [{ expectedDate: 'asc' }, { priority: 'desc' }],
  });

  // 3. Đồng bộ live doanh thu Wings Lashes từ MOS (tham chiếu CC Leaderboard)
  let wingsLashesAchieved = 0;
  let wingsLashesTotalProjected = 0;
  let wingsLashesProjectedAdditional = 0;

  try {
    const bonusRes = await CcKpiService.getCcDailySalesBonus(fastify, {
      dateFrom: startDateStr,
      dateTo: endDateStr,
      storeId: params.storeId ? String(params.storeId) : 'ALL',
    });
    if (bonusRes?.summary) {
      wingsLashesAchieved = Math.round(bonusRes.summary.totalSales || 0);
      wingsLashesTotalProjected = Math.round(bonusRes.summary.projectedTotalSales || wingsLashesAchieved);
      wingsLashesProjectedAdditional = Math.max(0, wingsLashesTotalProjected - wingsLashesAchieved);
    }
  } catch {
    // Fallback direct legacy orders query
    try {
      const legacyOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          order_state: 'Completed',
          booking_date_only: {
            gte: startDateTime,
            lte: endDateTime,
          },
          ...(params.storeId ? { client_store_id: params.storeId } : {}),
        },
        select: {
          total_price: true,
        },
      });
      wingsLashesAchieved = legacyOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
      wingsLashesTotalProjected = wingsLashesAchieved;
      wingsLashesProjectedAdditional = 0;
    } catch {
      // Safe fallback
    }
  }

  // 4. Phân loại các khoản thu thủ công: Wings Academy & Dự án khác
  // Chỉ tính các khoản chưa thu (status !== 'CANCELLED' && status !== 'COLLECTED') vào dự kiến
  let academyExpectedInflow = 0;
  let otherProjectsExpectedInflow = 0;
  let otherManualExpectedInflow = 0;
  let manualCollectedInflow = 0;

  for (const e of entries) {
    if (e.flowType === 'INFLOW') {
      if (e.status === 'COLLECTED') {
        manualCollectedInflow += e.totalAmount;
      } else {
        if (e.category === 'REVENUE_ACADEMY') {
          academyExpectedInflow += e.totalAmount;
        } else if (e.category === 'REVENUE_OTHER') {
          otherProjectsExpectedInflow += e.totalAmount;
        } else {
          otherManualExpectedInflow += e.totalAmount;
        }
      }
    }
  }

  // Tổng dự kiến Thu = Dự kiến thêm Wings Lashes + Dự kiến thu Academy + Dự kiến thu Dự án khác
  // (Chỉ tính phần dự kiến phát sinh từ hiện tại đến cuối kỳ, không cộng doanh thu đã đạt)
  const totalExpectedInflow =
    wingsLashesProjectedAdditional + academyExpectedInflow + otherProjectsExpectedInflow + otherManualExpectedInflow;
  const totalActualInflow = wingsLashesAchieved + manualCollectedInflow;

  // 5. Xây dựng Timeline theo từng ngày
  const timeline: CashFlowTimelinePoint[] = [];
  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  let runningBalance = totalCurrentBalance;
  let minForecastBalance = totalCurrentBalance;
  let isShortfallRisk = false;
  let shortfallDate: string | null = null;
  const shortfallRiskAlerts: CashFlowForecastResponse['shortfallRiskAlerts'] = [];

  let totalExpectedOutflow = 0;
  let totalActualOutflow = 0;
  let criticalOutflowPending = 0;
  let totalVatOutflow = 0;

  const outflowCategoryBreakdown: Record<string, number> = {};
  const priorityOutflowBreakdown: Record<string, number> = {};

  const todayStr = today.toISOString().slice(0, 10);
  const projectionStartDateStr = startDateStr > todayStr ? startDateStr : todayStr;
  let remainingDaysCount = 0;
  if (projectionStartDateStr <= endDateStr) {
    const dStart = new Date(projectionStartDateStr);
    const dEnd = new Date(endDateStr);
    remainingDaysCount = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }
  const dailyProjectedLashes =
    remainingDaysCount > 0 ? Math.round(wingsLashesProjectedAdditional / remainingDaysCount) : 0;

  const currentDateCursor = new Date(startDateTime);
  while (currentDateCursor <= endDateTime) {
    const dateStr = currentDateCursor.toISOString().slice(0, 10);
    const dayOfWeek = dayNames[currentDateCursor.getUTCDay()];

    // Tìm các entries của ngày hôm đó
    const dayEntries = entries.filter((e) => {
      const entryDate = new Date(e.expectedDate).toISOString().slice(0, 10);
      return entryDate === dateStr;
    });

    const dayInflows = dayEntries.filter((e) => e.flowType === 'INFLOW');
    const dayOutflows = dayEntries.filter((e) => e.flowType === 'OUTFLOW');

    let dayExpectedInflow = 0;
    let dayActualInflow = 0;
    let dayExpectedOutflow = 0;
    let dayActualOutflow = 0;

    // Phân bổ phần dự kiến thêm của Wings Lashes cho các ngày từ hôm nay trở đi
    if (dateStr >= todayStr && dateStr <= endDateStr) {
      dayExpectedInflow += dailyProjectedLashes;
    }

    for (const inf of dayInflows) {
      if (inf.status === 'COLLECTED') {
        dayActualInflow += inf.totalAmount;
      } else {
        dayExpectedInflow += inf.totalAmount;
      }
    }

    for (const outf of dayOutflows) {
      if (outf.status === 'PAID') {
        dayActualOutflow += outf.totalAmount;
      } else {
        dayExpectedOutflow += outf.totalAmount;
        if (outf.priority === 'CRITICAL' || outf.priority === 'HIGH') {
          criticalOutflowPending += outf.totalAmount;
        }
      }
      totalVatOutflow += outf.vatAmount;
      outflowCategoryBreakdown[outf.category] = (outflowCategoryBreakdown[outf.category] || 0) + outf.totalAmount;
      priorityOutflowBreakdown[outf.priority] = (priorityOutflowBreakdown[outf.priority] || 0) + outf.totalAmount;
    }

    const openingBal = runningBalance;
    // Dòng tiền ròng trong ngày: (Thu thực tế + Thu dự kiến) - (Chi thực tế + Chi dự kiến)
    const dayNetFlow = dayActualInflow + dayExpectedInflow - (dayActualOutflow + dayExpectedOutflow);
    runningBalance += dayNetFlow;

    if (runningBalance < minForecastBalance) {
      minForecastBalance = runningBalance;
    }

    const isBelowSafety = runningBalance < totalSafetyThreshold;
    if (isBelowSafety) {
      isShortfallRisk = true;
      if (!shortfallDate) {
        shortfallDate = dateStr;
      }
      const highPriorityOutflows = dayOutflows.filter(
        (o) => (o.priority === 'CRITICAL' || o.priority === 'HIGH') && o.status !== 'PAID'
      );
      shortfallRiskAlerts.push({
        date: dateStr,
        forecastBalance: runningBalance,
        deficitAmount: totalSafetyThreshold - runningBalance,
        criticalPendingOutflows: highPriorityOutflows.map(mapCashFlowEntry),
      });
    }

    totalExpectedOutflow += dayExpectedOutflow;
    totalActualOutflow += dayActualOutflow;

    timeline.push({
      date: dateStr,
      dayOfWeek,
      openingBalance: openingBal,
      expectedInflow: dayExpectedInflow,
      actualInflow: dayActualInflow,
      expectedOutflow: dayExpectedOutflow,
      actualOutflow: dayActualOutflow,
      closingBalance: runningBalance,
      isBelowSafety,
      inflowCount: dayInflows.length,
      outflowCount: dayOutflows.length,
      inflows: dayInflows.map(mapCashFlowEntry),
      outflows: dayOutflows.map(mapCashFlowEntry),
    });

    // Tăng thêm 1 ngày (UTC)
    currentDateCursor.setUTCDate(currentDateCursor.getUTCDate() + 1);
  }

  const summary: CashFlowForecastSummary = {
    openingBalance: totalCurrentBalance,
    totalExpectedInflow,
    totalActualInflow,
    totalExpectedOutflow,
    totalActualOutflow,
    closingForecastBalance: runningBalance,
    currentActualBalance: totalCurrentBalance + totalActualInflow - totalActualOutflow,
    netCashFlowForecast: totalExpectedInflow + totalActualInflow - (totalExpectedOutflow + totalActualOutflow),
    varianceAmount: totalActualInflow - totalActualOutflow - (totalExpectedInflow - totalExpectedOutflow),
    isShortfallRisk,
    shortfallDate,
    minForecastBalance,
    minSafetyThreshold: totalSafetyThreshold,
    criticalOutflowPending,
    totalVatOutflow,
    inflowBreakdown: {
      wingsLashesAchieved,
      wingsLashesProjectedAdditional,
      wingsLashesTotalProjected,
      academyExpectedInflow,
      otherProjectsExpectedInflow,
      totalExpectedInflow,
    },
    inflowCategoryBreakdown: {
      REVENUE_SERVICE: wingsLashesTotalProjected,
      REVENUE_ACADEMY: academyExpectedInflow,
      REVENUE_OTHER: otherProjectsExpectedInflow,
    },
    outflowCategoryBreakdown,
    priorityOutflowBreakdown,
  };

  return {
    summary,
    timeline,
    accounts: accounts.map(mapCashAccount),
    shortfallRiskAlerts,
  };
}

/**
 * Định dạng báo cáo CSV dự báo dòng tiền từ kết quả forecast
 */
export function formatCashFlowForecastCsv(forecast: CashFlowForecastResponse): string {
  const headers = [
    'Ngày',
    'Thứ',
    'Số dư đầu ngày (VNĐ)',
    'Thu dự kiến (VNĐ)',
    'Thu thực tế (VNĐ)',
    'Chi dự kiến (VNĐ)',
    'Chi thực tế (VNĐ)',
    'Số dư cuối ngày (VNĐ)',
    'Trạng thái',
  ];

  const rows: (string | number)[][] = forecast.timeline.map((t: CashFlowTimelinePoint) => [
    t.date,
    t.dayOfWeek,
    Math.round(t.openingBalance),
    Math.round(t.expectedInflow),
    Math.round(t.actualInflow),
    Math.round(t.expectedOutflow),
    Math.round(t.actualOutflow),
    Math.round(t.closingBalance),
    t.isBelowSafety ? 'NGUY HIỂM (Dưới ngưỡng)' : 'An toàn',
  ]);

  // UTF-8 BOM for Excel compatibility
  const csvContent =
    '\uFEFF' +
    [
      headers.join(','),
      ...rows.map((r: (string | number)[]) =>
        r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
  return csvContent;
}
