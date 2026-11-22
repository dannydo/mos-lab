import { FastifyInstance } from 'fastify';
import type { CbDailyRecord, CbForecastTelemetry, CbTargetConfig, SafeAny } from '@mos-lab/shared';

export interface CbDailyAndForecastParams {
  startStr: string;
  endStr: string;
  storeFilterSql: string;
  selectedMonth: string;
  currentMonthStr: string;
  nowIct: Date;
  periodState: 'future' | 'in_progress' | 'closed';
  targets: CbTargetConfig;
  totalSalesNet: number;
}

export interface CbDailyAndForecastResult {
  daily: CbDailyRecord[];
  forecast: CbForecastTelemetry;
  pacingStatus: 'ĐÚNG TIẾN ĐỘ' | 'SÁT MỤC TIÊU' | 'HỤT MỤC TIÊU' | 'CHƯA CẤU HÌNH';
  isCurrentMonth: boolean;
}

export async function buildCbDailyAndForecast(
  fastify: FastifyInstance,
  params: CbDailyAndForecastParams
): Promise<CbDailyAndForecastResult> {
  const {
    startStr,
    endStr,
    storeFilterSql,
    selectedMonth,
    currentMonthStr,
    nowIct,
    periodState,
    targets,
    totalSalesNet,
  } = params;

  // 5. PHÂN TÍCH THEO NGÀY (DAILY BREAKDOWN & RUN-RATE CUMULATIVE)
  const dailyAttributionRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        DATE(o.booking_date_start) AS day_val,
        CASE 
          WHEN COALESCE(o.combo_sale_required, 0) <> 0 THEN 'VONG_XANH'
          WHEN EXISTS (
            SELECT 1 FROM \`order_service\` os 
            WHERE os.order_id = o.id 
              AND os.user_service_balance_transaction_id IS NOT NULL 
              AND os.user_service_balance_transaction_id > 0
          ) THEN 'DUNG_GOI_NGOAI_VX'
          ELSE 'LE_KHAC'
        END AS source_group,
        COUNT(DISTINCT o.id) AS combo_order_count,
        COALESCE(SUM(GREATEST(0, COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0))), 0) AS combo_net
      FROM \`order\` o
      JOIN \`order_service_combo\` osc ON osc.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
      GROUP BY DATE(o.booking_date_start), source_group
    `);

  const dailyComboTotalRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        DATE(o.booking_date_start) AS day_val,
        COALESCE(SUM(GREATEST(0, COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0))), 0) AS combo_net
      FROM \`order\` o
      JOIN \`order_service_combo\` osc ON osc.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
      GROUP BY DATE(o.booking_date_start)
    `);

  const dailyProductRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        DATE(o.booking_date_start) AS day_val,
        COALESCE(SUM(GREATEST(0, COALESCE(NULLIF(op.total_price - COALESCE(op.tax_amount, 0), 0), 0))), 0) AS product_net
      FROM \`order\` o
      JOIN \`order_product\` op ON op.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
      GROUP BY DATE(o.booking_date_start)
    `);

  const dailyGreenDoneRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        DATE(o.booking_date_start) AS day_val,
        COUNT(DISTINCT o.id) AS green_count
      FROM \`order\` o
      WHERE o.order_state = 'Completed'
        AND COALESCE(o.combo_sale_required, 0) <> 0
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
      GROUP BY DATE(o.booking_date_start)
    `);

  const dailyUsageDoneRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        DATE(o.booking_date_start) AS day_val,
        COUNT(DISTINCT o.id) AS usage_count
      FROM \`order\` o
      JOIN \`order_service\` os ON os.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND os.user_service_balance_transaction_id IS NOT NULL 
        AND os.user_service_balance_transaction_id > 0
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
      GROUP BY DATE(o.booking_date_start)
    `);

  const comboMap = new Map<string, number>();
  for (const r of dailyComboTotalRaw)
    comboMap.set(String(r.day_val).slice(0, 10), Math.round(Number(r.combo_net || 0)));

  const prodMap = new Map<string, number>();
  for (const r of dailyProductRaw) prodMap.set(String(r.day_val).slice(0, 10), Math.round(Number(r.product_net || 0)));

  const greenDoneMap = new Map<string, number>();
  for (const r of dailyGreenDoneRaw) greenDoneMap.set(String(r.day_val).slice(0, 10), Number(r.green_count || 0));

  const usageDoneMap = new Map<string, number>();
  for (const r of dailyUsageDoneRaw) usageDoneMap.set(String(r.day_val).slice(0, 10), Number(r.usage_count || 0));

  const greenOrdersMap = new Map<string, number>();
  const usageOrdersMap = new Map<string, number>();
  for (const r of dailyAttributionRaw) {
    const dKey = String(r.day_val).slice(0, 10);
    if (r.source_group === 'VONG_XANH') greenOrdersMap.set(dKey, Number(r.combo_order_count || 0));
    if (r.source_group === 'DUNG_GOI_NGOAI_VX') usageOrdersMap.set(dKey, Number(r.combo_order_count || 0));
  }

  const [y, m] = selectedMonth.split('-').map(Number);
  const lastDayOfMonth = new Date(y, m, 0).getDate();
  const dailyRecords: CbDailyRecord[] = [];
  let runningCumulativeSales = 0;
  const todayIctStr = nowIct.toISOString().slice(0, 10);

  for (let day = 1; day <= lastDayOfMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${selectedMonth}-${dayStr}`;
    const cNet = comboMap.get(dateKey) || 0;
    const pNet = prodMap.get(dateKey) || 0;
    const tNet = cNet + pNet;
    const gCount = greenDoneMap.get(dateKey) || 0;
    const gOrders = greenOrdersMap.get(dateKey) || 0;
    const uCount = usageDoneMap.get(dateKey) || 0;
    const uOrders = usageOrdersMap.get(dateKey) || 0;

    runningCumulativeSales += tNet;
    const targetCum = targets.dailyPlanPace * day;
    const variance = targets.configured ? tNet - targets.dailyPlanPace : 0;
    const isClosedDate = dateKey < todayIctStr;

    dailyRecords.push({
      date: dateKey,
      displayDate: `${dayStr}/${String(m).padStart(2, '0')}`,
      comboSalesNet: cNet,
      productSalesNet: pNet,
      totalSalesNet: tNet,
      greenVisitsCount: gCount,
      greenComboOrdersCount: gOrders,
      packageUsageVisitsCount: uCount,
      packageUsageComboOrdersCount: uOrders,
      dailyPlanTarget: targets.dailyPlanPace,
      varianceToPace: variance,
      cumulativeSales: runningCumulativeSales,
      targetCumulativeSales: targetCum,
      isClosedDate,
    });
  }

  // 6. DỰ BÁO CHỐT THÁNG (FORECAST - Guideline Mục 6.1 & B)
  const isCurrentMonth = selectedMonth === currentMonthStr;
  const currentIctDay = isCurrentMonth ? nowIct.getUTCDate() : lastDayOfMonth;
  const completedDays = Math.min(currentIctDay, lastDayOfMonth);
  const remainingDays = Math.max(0, lastDayOfMonth - completedDays);

  let forecastTotal: number;
  let forecastPercent: number;
  let forecastVariance: number;
  let last7DaysTotal = 0;
  let last7DaysAvg = 0;
  let forecastStatus: 'ON_TRACK' | 'BORDERLINE' | 'BEHIND';
  let summaryFormula: string;

  if (periodState === 'future') {
    forecastTotal = targets.totalSalesTarget;
    forecastPercent = 0;
    forecastVariance = 0;
    summaryFormula = `Kỳ chiến dịch Tháng ${m}/${y} chưa bắt đầu; nhịp kế hoạch ${(targets.dailyPlanPace / 1_000_000).toFixed(1)}M/ngày.`;
    forecastStatus = 'ON_TRACK';
  } else if (periodState === 'closed') {
    forecastTotal = totalSalesNet;
    forecastPercent =
      targets.totalSalesTarget > 0 ? Number(((totalSalesNet / targets.totalSalesTarget) * 100).toFixed(1)) : 100;
    forecastVariance = targets.configured ? totalSalesNet - targets.totalSalesTarget : 0;
    summaryFormula = `Kỳ đã kết thúc chốt sổ; tổng doanh số đạt ${Math.round(totalSalesNet / 1_000_000)}M (${forecastPercent}%).`;
    forecastStatus = forecastPercent >= 100 ? 'ON_TRACK' : 'BEHIND';
  } else {
    // in_progress
    const closedRecords = dailyRecords.filter((d) => d.isClosedDate && d.totalSalesNet > 0);
    const recentSlice = (closedRecords.length > 0 ? closedRecords : dailyRecords.slice(0, completedDays)).slice(-7);
    last7DaysTotal = recentSlice.reduce((acc, cur) => acc + cur.totalSalesNet, 0);
    const last7DaysCount = Math.max(1, recentSlice.length);
    last7DaysAvg = Math.round(last7DaysTotal / last7DaysCount);

    forecastTotal = totalSalesNet + remainingDays * last7DaysAvg;
    forecastPercent =
      targets.totalSalesTarget > 0 ? Number(((forecastTotal / targets.totalSalesTarget) * 100).toFixed(1)) : 0;
    forecastVariance = targets.configured ? forecastTotal - targets.totalSalesTarget : 0;

    if (forecastPercent < 100.0) {
      forecastStatus = 'BEHIND';
    } else if (forecastPercent < 103.0) {
      forecastStatus = 'BORDERLINE';
    } else {
      forecastStatus = 'ON_TRACK';
    }

    summaryFormula = targets.configured
      ? `7 ngày qua: ${Math.round(last7DaysTotal / 1_000_000)}M • TB ${(last7DaysAvg / 1_000_000).toFixed(2)}M/ngày; ${Math.round(totalSalesNet / 1_000_000)}M đã đạt + ${remainingDays} ngày x ${(last7DaysAvg / 1_000_000).toFixed(2)}M`
      : 'Chưa có cấu hình mục tiêu để tính dự báo';
  }

  // Cảnh báo nhịp (Pacing Status)
  let pacingStatus: 'ĐÚNG TIẾN ĐỘ' | 'SÁT MỤC TIÊU' | 'HỤT MỤC TIÊU' | 'CHƯA CẤU HÌNH' = 'ĐÚNG TIẾN ĐỘ';
  if (!targets.configured) {
    pacingStatus = 'CHƯA CẤU HÌNH';
  } else if (periodState === 'future') {
    pacingStatus = 'ĐÚNG TIẾN ĐỘ';
  } else if (forecastPercent < 100.0) {
    pacingStatus = 'HỤT MỤC TIÊU';
  } else if (forecastPercent < 103.0) {
    pacingStatus = 'SÁT MỤC TIÊU';
  }

  return {
    daily: dailyRecords,
    forecast: {
      last7DaysAvg,
      last7DaysTotal,
      remainingDays,
      forecastTotal,
      forecastPercent,
      forecastVariance,
      summaryFormula,
      status: forecastStatus,
    },
    pacingStatus,
    isCurrentMonth,
  };
}
