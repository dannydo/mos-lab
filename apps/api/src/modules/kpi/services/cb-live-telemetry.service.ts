import { FastifyInstance } from 'fastify';
import {
  CbDailyRecord,
  CbDrilldownItem,
  CbForecastTelemetry,
  CbLiveTelemetryResponse,
  CbTargetConfig,
  CbTelemetryQueryParams,
  SafeAny,
} from '@mos-lab/shared';

function getIctNow(): Date {
  const now = new Date();
  const ictOffsetMs = 7 * 60 * 60 * 1000;
  return new Date(now.getTime() + ictOffsetMs);
}

function formatIctYm(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export class CbLiveTelemetryService {
  /**
   * Resolve target config for given month and scope.
   * If not found in crmConfig, default to November 2026 targets if month === '2026-11',
   * otherwise return configured: false as per guidelines (e.g. month 10).
   */
  public static async getTargetConfig(
    fastify: FastifyInstance,
    month: string,
    storeScope: 'DE_THAM_ESTELLA' | 'DE_THAM' | 'ESTELLA' | 'ALL' = 'DE_THAM_ESTELLA'
  ): Promise<CbTargetConfig> {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const configKey = `CB_TARGET_${month}_${storeScope}`;

    try {
      const existing = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: configKey },
      });
      if (existing?.value) {
        const parsed = JSON.parse(existing.value);
        return {
          ...parsed,
          configured: true,
          month,
          storeScope,
          daysInMonth,
          updatedAt: existing.updatedAt?.toISOString(),
        };
      }
    } catch {
      // Fallback if config table is unreachable
    }

    // Default configuration for November 2026
    if (month === '2026-11') {
      const comboSalesTarget = 550_000_000;
      const productSalesTarget = 10_000_000;
      const totalSalesTarget = comboSalesTarget + productSalesTarget; // 560,000,000
      const dailyPlanPace = Math.round(totalSalesTarget / daysInMonth); // 18,666,667 (~18.7M)

      return {
        configured: true,
        month,
        storeScope,
        comboSalesTarget,
        productSalesTarget,
        totalSalesTarget,
        dailyPlanPace,
        greenFunnelBookTarget: 780,
        greenFunnelDoneTarget: 540,
        greenFunnelConversionTarget: 10.0,
        packageUsageDoneTarget: 1000,
        repeatComboSalesTarget: 349_000_000,
        aovPackageUsageTarget: 5_550_000,
        daysInMonth,
      };
    }

    // Month 10 or other months without custom target
    return {
      configured: false,
      month,
      storeScope,
      comboSalesTarget: 0,
      productSalesTarget: 0,
      totalSalesTarget: 0,
      dailyPlanPace: 0,
      greenFunnelBookTarget: 0,
      greenFunnelDoneTarget: 0,
      greenFunnelConversionTarget: 0,
      packageUsageDoneTarget: 0,
      repeatComboSalesTarget: 0,
      aovPackageUsageTarget: 0,
      daysInMonth,
    };
  }

  /**
   * Save custom target configuration to crmConfig
   */
  public static async saveTargetConfig(
    fastify: FastifyInstance,
    target: Partial<CbTargetConfig> & { month: string; storeScope?: string; userStaffName?: string }
  ): Promise<CbTargetConfig> {
    const scope = (target.storeScope || 'DE_THAM_ESTELLA') as 'DE_THAM_ESTELLA' | 'DE_THAM' | 'ESTELLA' | 'ALL';
    const configKey = `CB_TARGET_${target.month}_${scope}`;
    const [y, m] = target.month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();

    const comboSalesTarget = Number(target.comboSalesTarget || 0);
    const productSalesTarget = Number(target.productSalesTarget || 0);
    const totalSalesTarget = comboSalesTarget + productSalesTarget;
    const dailyPlanPace = daysInMonth > 0 ? Math.round(totalSalesTarget / daysInMonth) : 0;

    const fullConfig: CbTargetConfig = {
      configured: true,
      month: target.month,
      storeScope: scope,
      comboSalesTarget,
      productSalesTarget,
      totalSalesTarget,
      dailyPlanPace,
      greenFunnelBookTarget: Number(target.greenFunnelBookTarget || 0),
      greenFunnelDoneTarget: Number(target.greenFunnelDoneTarget || 0),
      greenFunnelConversionTarget: Number(target.greenFunnelConversionTarget || 0),
      packageUsageDoneTarget: Number(target.packageUsageDoneTarget || 0),
      repeatComboSalesTarget: Number(target.repeatComboSalesTarget || 0),
      aovPackageUsageTarget: Number(target.aovPackageUsageTarget || 0),
      daysInMonth,
      updatedAt: new Date().toISOString(),
      updatedBy: target.userStaffName || 'Admin',
    };

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: configKey },
      create: {
        key: configKey,
        value: JSON.stringify(fullConfig),
      },
      update: {
        value: JSON.stringify(fullConfig),
      },
    });

    return fullConfig;
  }

  /**
   * Main telemetry method
   */
  public static async getTelemetry(
    fastify: FastifyInstance,
    params: CbTelemetryQueryParams
  ): Promise<CbLiveTelemetryResponse> {
    const nowIct = getIctNow();
    const currentMonthStr = formatIctYm(nowIct);
    let startStr: string;
    let endStr: string;
    let selectedMonth: string;

    if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
      selectedMonth = params.month;
      const [y, m] = params.month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      startStr = `${params.month}-01 00:00:00`;
      endStr = `${params.month}-${String(lastDay).padStart(2, '0')} 23:59:59`;
    } else if (params.dateFrom && params.dateTo) {
      startStr = `${params.dateFrom.slice(0, 10)} 00:00:00`;
      endStr = `${params.dateTo.slice(0, 10)} 23:59:59`;
      selectedMonth = params.dateFrom.slice(0, 7);
    } else {
      selectedMonth = currentMonthStr;
      const y = nowIct.getUTCFullYear();
      const m = nowIct.getUTCMonth() + 1;
      const lastDay = new Date(y, m, 0).getDate();
      startStr = `${currentMonthStr}-01 00:00:00`;
      endStr = `${currentMonthStr}-${String(lastDay).padStart(2, '0')} 23:59:59`;
    }

    // Branch Store Scope Filter (Guideline: Default is De Tham [6] + Estella [16])
    let storeScope: 'DE_THAM_ESTELLA' | 'DE_THAM' | 'ESTELLA' | 'ALL' = 'DE_THAM_ESTELLA';
    let storeFilterSql = 'AND o.client_store_id IN (6, 16)';

    if (params.storeScope === 'DE_THAM' || params.storeId === '6') {
      storeScope = 'DE_THAM';
      storeFilterSql = 'AND o.client_store_id = 6';
    } else if (params.storeScope === 'ESTELLA' || params.storeId === '16') {
      storeScope = 'ESTELLA';
      storeFilterSql = 'AND o.client_store_id = 16';
    } else if (params.storeScope === 'ALL' || params.storeId === 'ALL') {
      storeScope = 'ALL';
      storeFilterSql = '';
    }

    // Load Target Config
    const targets = await this.getTargetConfig(fastify, selectedMonth, storeScope);

    // 1. DOANH SỐ GÓI VÀ SẢN PHẨM CHƯA VAT (TOÀN KỲ)
    const comboSalesRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        COALESCE(SUM(GREATEST(0, COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0))), 0) AS combo_sales_net,
        COUNT(DISTINCT osc.id) AS combo_item_count,
        COUNT(DISTINCT osc.order_id) AS combo_order_count
      FROM \`order\` o
      JOIN \`order_service_combo\` osc ON osc.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
    `);

    const productSalesRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        COALESCE(SUM(GREATEST(0, COALESCE(NULLIF(op.total_price - COALESCE(op.tax_amount, 0), 0), 0))), 0) AS product_sales_net,
        COUNT(DISTINCT op.id) AS product_item_count,
        COUNT(DISTINCT op.order_id) AS product_order_count
      FROM \`order\` o
      JOIN \`order_product\` op ON op.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
    `);

    const comboSalesNet = Math.round(Number(comboSalesRaw?.[0]?.combo_sales_net || 0));
    const comboOrderCount = Number(comboSalesRaw?.[0]?.combo_order_count || 0);
    const comboItemCount = Number(comboSalesRaw?.[0]?.combo_item_count || 0);
    const productSalesNet = Math.round(Number(productSalesRaw?.[0]?.product_sales_net || 0));
    const productOrderCount = Number(productSalesRaw?.[0]?.product_order_count || 0);
    const productItemCount = Number(productSalesRaw?.[0]?.product_item_count || 0);

    const comboAov = comboOrderCount > 0 ? Math.round(comboSalesNet / comboOrderCount) : 0;
    const totalSalesNet = comboSalesNet + productSalesNet;

    // 2. ĐỘNG CƠ VÒNG XANH (GREEN FUNNEL PULSE)
    const greenFunnelRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        COUNT(DISTINCT o.id) AS green_visits_count,
        COUNT(DISTINCT osc.order_id) AS green_combo_orders_count
      FROM \`order\` o
      LEFT JOIN \`order_service_combo\` osc ON osc.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND COALESCE(o.combo_sale_required, 0) <> 0
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
    `);

    const greenVisitsCount = Number(greenFunnelRaw?.[0]?.green_visits_count || 0);
    const greenComboOrdersCount = Number(greenFunnelRaw?.[0]?.green_combo_orders_count || 0);
    const greenVisitsTarget = targets.configured ? targets.greenFunnelDoneTarget : 540;
    const benchmarkRatePercent = targets.configured ? targets.greenFunnelConversionTarget : 10.0;
    const closingRatePercent =
      greenVisitsCount > 0 ? Number(((greenComboOrdersCount / greenVisitsCount) * 100).toFixed(1)) : 0;
    const greenProgressPercent =
      greenVisitsTarget > 0 ? Number(Math.min(100, (greenVisitsCount / greenVisitsTarget) * 100).toFixed(1)) : 0;

    let greenStatus: 'BELOW_BENCHMARK' | 'ON_TRACK' | 'EXCEEDING' = 'BELOW_BENCHMARK';
    if (closingRatePercent >= benchmarkRatePercent + 2.0) {
      greenStatus = 'EXCEEDING';
    } else if (closingRatePercent >= benchmarkRatePercent) {
      greenStatus = 'ON_TRACK';
    }

    // 3. ĐỘNG CƠ DÙNG GÓI (RETENTION PULSE)
    const retentionRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        COUNT(DISTINCT o.id) AS balance_deduction_visits_count,
        COUNT(DISTINCT o.user_id) AS unique_pax_count
      FROM \`order\` o
      JOIN \`order_service\` os ON os.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND os.user_service_balance_transaction_id IS NOT NULL 
        AND os.user_service_balance_transaction_id > 0
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
    `);

    const balanceDeductionVisitsCount = Number(retentionRaw?.[0]?.balance_deduction_visits_count || 0);
    const uniquePaxCount = Number(retentionRaw?.[0]?.unique_pax_count || 0);
    const targetVisits = targets.configured ? targets.packageUsageDoneTarget : 1000;
    const retentionProgressPercent =
      targetVisits > 0 ? Number(Math.min(100, (balanceDeductionVisitsCount / targetVisits) * 100).toFixed(1)) : 0;

    // Đơn mua tiếp và doanh số mua tiếp từ khách dùng gói
    const repurchaseRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        COUNT(DISTINCT o.id) AS repurchase_orders_count,
        COALESCE(SUM(GREATEST(0, COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0))), 0) AS repurchase_combo_net
      FROM \`order\` o
      LEFT JOIN \`order_service_combo\` osc ON osc.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
        AND (
          EXISTS (SELECT 1 FROM \`order_service_combo\` osc2 WHERE osc2.order_id = o.id)
          OR EXISTS (SELECT 1 FROM \`order_product\` op2 WHERE op2.order_id = o.id)
        )
        AND o.user_id IN (
          SELECT DISTINCT o2.user_id
          FROM \`order\` o2
          JOIN \`order_service\` os2 ON os2.order_id = o2.id
          WHERE o2.order_state = 'Completed'
            AND os2.user_service_balance_transaction_id IS NOT NULL 
            AND os2.user_service_balance_transaction_id > 0
        )
    `);

    const repurchaseOrdersCount = Number(repurchaseRaw?.[0]?.repurchase_orders_count || 0);
    const repurchaseComboSalesNet = Math.round(Number(repurchaseRaw?.[0]?.repurchase_combo_net || 0));

    // Tổng số lượt Done chung trong kỳ
    const totalDoneRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT COUNT(DISTINCT o.id) AS total_done_count
      FROM \`order\` o
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
    `);
    const totalDoneVisits = Number(totalDoneRaw?.[0]?.total_done_count || 0);
    const uniquePaxPerVisit = uniquePaxCount > 0 ? Number((totalDoneVisits / uniquePaxCount).toFixed(2)) : 0;

    // 4. PHÂN TÍCH THEO NGÀY (DAILY BREAKDOWN & RUN-RATE CUMULATIVE)
    const dailyComboRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
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

    const dailyGreenRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
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

    const dailyUsageRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
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
    for (const r of dailyComboRaw) comboMap.set(String(r.day_val).slice(0, 10), Math.round(Number(r.combo_net || 0)));

    const prodMap = new Map<string, number>();
    for (const r of dailyProductRaw) prodMap.set(String(r.day_val).slice(0, 10), Math.round(Number(r.product_net || 0)));

    const greenMap = new Map<string, number>();
    for (const r of dailyGreenRaw) greenMap.set(String(r.day_val).slice(0, 10), Number(r.green_count || 0));

    const usageMap = new Map<string, number>();
    for (const r of dailyUsageRaw) usageMap.set(String(r.day_val).slice(0, 10), Number(r.usage_count || 0));

    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDayOfMonth = new Date(y, m, 0).getDate();
    const dailyRecords: CbDailyRecord[] = [];
    let runningCumulativeSales = 0;

    for (let day = 1; day <= lastDayOfMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${selectedMonth}-${dayStr}`;
      const cNet = comboMap.get(dateKey) || 0;
      const pNet = prodMap.get(dateKey) || 0;
      const tNet = cNet + pNet;
      const gCount = greenMap.get(dateKey) || 0;
      const uCount = usageMap.get(dateKey) || 0;

      runningCumulativeSales += tNet;
      const targetCum = targets.dailyPlanPace * day;
      const variance = targets.configured ? tNet - targets.dailyPlanPace : 0;

      dailyRecords.push({
        date: dateKey,
        displayDate: `${dayStr}/${String(m).padStart(2, '0')}`,
        comboSalesNet: cNet,
        productSalesNet: pNet,
        totalSalesNet: tNet,
        greenVisitsCount: gCount,
        packageUsageVisitsCount: uCount,
        varianceToPace: variance,
        cumulativeSales: runningCumulativeSales,
        targetCumulativeSales: targetCum,
      });
    }

    // 5. DỰ BÁO CHỐT THÁNG (FORECAST) THEO NHỊP 7 NGÀY GẦN NHẤT (Guideline Mục 6.1)
    // Lấy 7 ngày có dữ liệu gần nhất tính đến thời điểm hiện tại
    const isCurrentMonth = selectedMonth === currentMonthStr;
    const currentIctDay = isCurrentMonth ? nowIct.getUTCDate() : lastDayOfMonth;
    const completedDays = Math.min(currentIctDay, lastDayOfMonth);
    const recent7DaysSlice = dailyRecords.slice(Math.max(0, completedDays - 7), completedDays);
    const last7DaysTotal = recent7DaysSlice.reduce((acc, cur) => acc + cur.totalSalesNet, 0);
    const last7DaysCount = Math.max(1, recent7DaysSlice.length);
    const last7DaysAvg = Math.round(last7DaysTotal / last7DaysCount);

    const remainingDays = Math.max(0, lastDayOfMonth - completedDays);
    const forecastTotal = totalSalesNet + remainingDays * last7DaysAvg;
    const forecastPercent =
      targets.totalSalesTarget > 0 ? Number(((forecastTotal / targets.totalSalesTarget) * 100).toFixed(1)) : 0;
    const forecastVariance = targets.configured ? forecastTotal - targets.totalSalesTarget : 0;

    let forecastStatus: 'ON_TRACK' | 'BORDERLINE' | 'BEHIND' = 'ON_TRACK';
    if (forecastPercent < 100.0) {
      forecastStatus = 'BEHIND';
    } else if (forecastPercent < 103.0) {
      forecastStatus = 'BORDERLINE';
    }

    const summaryFormula = targets.configured
      ? `7 ngày qua: ${Math.round(last7DaysTotal / 1_000_000)}M • TB ${(last7DaysAvg / 1_000_000).toFixed(2)}M/ngày; ${Math.round(totalSalesNet / 1_000_000)}M đã đạt + ${remainingDays} ngày x ${(last7DaysAvg / 1_000_000).toFixed(2)}M`
      : 'Chưa có cấu hình mục tiêu để tính dự báo';

    // Cảnh báo nhịp (Pacing Status)
    let pacingStatus: 'ĐÚNG TIẾN ĐỘ' | 'SÁT MỤC TIÊU' | 'HỤT MỤC TIÊU' | 'CHƯA CẤU HÌNH' = 'ĐÚNG TIẾN ĐỘ';
    if (!targets.configured) {
      pacingStatus = 'CHƯA CẤU HÌNH';
    } else if (forecastPercent < 100.0) {
      pacingStatus = 'HỤT MỤC TIÊU';
    } else if (forecastPercent < 103.0) {
      pacingStatus = 'SÁT MỤC TIÊU';
    }

    // % Đạt các thẻ chính
    const comboAttainmentPercent =
      targets.comboSalesTarget > 0 ? Number(((comboSalesNet / targets.comboSalesTarget) * 100).toFixed(1)) : 0;
    const productAttainmentPercent =
      targets.productSalesTarget > 0 ? Number(((productSalesNet / targets.productSalesTarget) * 100).toFixed(1)) : 0;
    const totalAttainmentPercent =
      targets.totalSalesTarget > 0 ? Number(((totalSalesNet / targets.totalSalesTarget) * 100).toFixed(1)) : 0;
    const shortfallOrSurplus = targets.configured ? totalSalesNet - targets.totalSalesTarget : 0;

    return {
      targets,
      revenue: {
        comboSalesNet,
        productSalesNet,
        totalSalesNet,
        comboOrderCount,
        comboItemCount,
        productOrderCount,
        productItemCount,
        comboAov,
        comboAttainmentPercent,
        productAttainmentPercent,
        totalAttainmentPercent,
        shortfallOrSurplus,
      },
      greenFunnel: {
        greenVisitsCount,
        greenVisitsTarget,
        greenComboOrdersCount,
        closingRatePercent,
        benchmarkRatePercent,
        progressPercent: greenProgressPercent,
        status: greenStatus,
        greenBookingsCount: 780,
      },
      retention: {
        balanceDeductionVisitsCount,
        targetVisits,
        repurchaseOrdersCount,
        repurchaseComboSalesNet,
        uniquePaxCount,
        progressPercent: retentionProgressPercent,
      },
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
      meta: {
        lastSyncAt: new Date().toISOString(),
        dateFrom: startStr.slice(0, 10),
        dateTo: endStr.slice(0, 10),
        month: selectedMonth,
        isCurrentMonth,
        storeScope,
        pacingStatus,
        uniquePaxPerVisit,
        totalDoneVisits,
      },
    };
  }

  /**
   * Drilldown orders for auditing transactions (Guideline Câu hỏi 6)
   */
  public static async getDrilldown(
    fastify: FastifyInstance,
    params: {
      category: 'COMBO' | 'PRODUCT' | 'GREEN_FUNNEL' | 'PACKAGE_USAGE';
      month: string;
      storeScope?: string;
      limit?: number;
    }
  ): Promise<CbDrilldownItem[]> {
    const selectedMonth = params.month || '2026-11';
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const startStr = `${selectedMonth}-01 00:00:00`;
    const endStr = `${selectedMonth}-${String(lastDay).padStart(2, '0')} 23:59:59`;
    const limit = Math.min(100, Number(params.limit || 50));

    let storeFilterSql = 'AND o.client_store_id IN (6, 16)';
    if (params.storeScope === 'DE_THAM') storeFilterSql = 'AND o.client_store_id = 6';
    else if (params.storeScope === 'ESTELLA') storeFilterSql = 'AND o.client_store_id = 16';
    else if (params.storeScope === 'ALL') storeFilterSql = '';

    if (params.category === 'COMBO') {
      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          o.id,
          o.booking_date_start,
          COALESCE(csl.client_store_name, 'Unknown') as store_name,
          COALESCE(u.user_first_name, 'Khách hàng') as customer_name,
          GREATEST(0, COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0)) as amount_net,
          osc.service_title as details
        FROM \`order\` o
        JOIN \`order_service_combo\` osc ON osc.order_id = o.id
        LEFT JOIN \`client_store_language\` csl ON csl.client_store_id = o.client_store_id AND csl.language_id = 1
        LEFT JOIN \`user\` u ON u.id = o.user_id
        WHERE o.order_state = 'Completed'
          AND o.booking_date_start >= '${startStr}'
          AND o.booking_date_start <= '${endStr}'
          ${storeFilterSql}
        ORDER BY o.booking_date_start DESC
        LIMIT ${limit}
      `);
      return rows.map((r) => ({
        id: Number(r.id),
        bookingDateStart: String(r.booking_date_start),
        storeName: String(r.store_name),
        customerName: String(r.customer_name),
        amountNet: Math.round(Number(r.amount_net || 0)),
        category: 'COMBO',
        details: String(r.details || ''),
      }));
    }

    if (params.category === 'PRODUCT') {
      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          o.id,
          o.booking_date_start,
          COALESCE(csl.client_store_name, 'Unknown') as store_name,
          COALESCE(u.user_first_name, 'Khách hàng') as customer_name,
          GREATEST(0, COALESCE(NULLIF(op.total_price - COALESCE(op.tax_amount, 0), 0), 0)) as amount_net,
          op.product_title as details
        FROM \`order\` o
        JOIN \`order_product\` op ON op.order_id = o.id
        LEFT JOIN \`client_store_language\` csl ON csl.client_store_id = o.client_store_id AND csl.language_id = 1
        LEFT JOIN \`user\` u ON u.id = o.user_id
        WHERE o.order_state = 'Completed'
          AND o.booking_date_start >= '${startStr}'
          AND o.booking_date_start <= '${endStr}'
          ${storeFilterSql}
        ORDER BY o.booking_date_start DESC
        LIMIT ${limit}
      `);
      return rows.map((r) => ({
        id: Number(r.id),
        bookingDateStart: String(r.booking_date_start),
        storeName: String(r.store_name),
        customerName: String(r.customer_name),
        amountNet: Math.round(Number(r.amount_net || 0)),
        category: 'PRODUCT',
        details: String(r.details || ''),
      }));
    }

    if (params.category === 'GREEN_FUNNEL') {
      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          o.id,
          o.booking_date_start,
          COALESCE(csl.client_store_name, 'Unknown') as store_name,
          COALESCE(u.user_first_name, 'Khách hàng') as customer_name,
          COALESCE(o.total_price - o.tax_amount, 0) as amount_net,
          CASE WHEN EXISTS (SELECT 1 FROM \`order_service_combo\` osc WHERE osc.order_id = o.id) THEN 'Đã chốt gói' ELSE 'Chưa chốt gói' END as details
        FROM \`order\` o
        LEFT JOIN \`client_store_language\` csl ON csl.client_store_id = o.client_store_id AND csl.language_id = 1
        LEFT JOIN \`user\` u ON u.id = o.user_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(o.combo_sale_required, 0) <> 0
          AND o.booking_date_start >= '${startStr}'
          AND o.booking_date_start <= '${endStr}'
          ${storeFilterSql}
        ORDER BY o.booking_date_start DESC
        LIMIT ${limit}
      `);
      return rows.map((r) => ({
        id: Number(r.id),
        bookingDateStart: String(r.booking_date_start),
        storeName: String(r.store_name),
        customerName: String(r.customer_name),
        amountNet: Math.round(Number(r.amount_net || 0)),
        category: 'GREEN_FUNNEL',
        details: String(r.details || ''),
      }));
    }

    // PACKAGE_USAGE
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        o.id,
        o.booking_date_start,
        COALESCE(csl.client_store_name, 'Unknown') as store_name,
        COALESCE(u.user_first_name, 'Khách hàng') as customer_name,
        COALESCE(o.total_price - o.tax_amount, 0) as amount_net,
        os.service_title as details
      FROM \`order\` o
      JOIN \`order_service\` os ON os.order_id = o.id
      LEFT JOIN \`client_store_language\` csl ON csl.client_store_id = o.client_store_id AND csl.language_id = 1
      LEFT JOIN \`user\` u ON u.id = o.user_id
      WHERE o.order_state = 'Completed'
        AND os.user_service_balance_transaction_id IS NOT NULL 
        AND os.user_service_balance_transaction_id > 0
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
      ORDER BY o.booking_date_start DESC
      LIMIT ${limit}
    `);
    return rows.map((r) => ({
      id: Number(r.id),
      bookingDateStart: String(r.booking_date_start),
      storeName: String(r.store_name),
      customerName: String(r.customer_name),
      amountNet: Math.round(Number(r.amount_net || 0)),
      category: 'PACKAGE_USAGE',
      details: String(r.details || ''),
    }));
  }
}
