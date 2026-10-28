import { FastifyInstance } from 'fastify';
import {
  CbAttributionGroup,
  CbAttributionTelemetry,
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
          greenFunnelBookTarget: parsed.greenFunnelBookTarget || 780,
          greenFunnelDoneTarget: parsed.greenFunnelDoneTarget || 540,
          greenFunnelConversionTarget: parsed.greenFunnelConversionTarget || 10.0,
          packageUsageDoneTarget: parsed.packageUsageDoneTarget || 1000,
          repeatComboSalesTarget: parsed.repeatComboSalesTarget || 349_000_000,
          aovPackageUsageTarget: parsed.aovPackageUsageTarget || 5_550_000,
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
      greenFunnelBookTarget: 780,
      greenFunnelDoneTarget: 540,
      greenFunnelConversionTarget: 10.0,
      packageUsageDoneTarget: 1000,
      repeatComboSalesTarget: 349_000_000,
      aovPackageUsageTarget: 5_550_000,
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
      greenFunnelBookTarget: Number(target.greenFunnelBookTarget || 780),
      greenFunnelDoneTarget: Number(target.greenFunnelDoneTarget || 540),
      greenFunnelConversionTarget: Number(target.greenFunnelConversionTarget || 10.0),
      packageUsageDoneTarget: Number(target.packageUsageDoneTarget || 1000),
      repeatComboSalesTarget: Number(target.repeatComboSalesTarget || 349_000_000),
      aovPackageUsageTarget: Number(target.aovPackageUsageTarget || 5_550_000),
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

    // Determine Period State (Guideline Mục 11 & B)
    let periodState: 'future' | 'in_progress' | 'closed' = 'in_progress';
    if (selectedMonth > currentMonthStr) {
      periodState = 'future';
    } else if (selectedMonth < currentMonthStr) {
      periodState = 'closed';
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

    // 2. PHÂN RÃ NGUỒN DOANH SỐ LOẠI TRỪ NHAU 100% (MUTUALLY EXCLUSIVE ATTRIBUTION - Guideline Mục 4.3 & 12)
    // Nhóm 1: Vòng Xanh (combo_sale_required <> 0)
    // Nhóm 2: Dùng gói ngoài VX (combo_sale_required = 0/null và có order_service trừ balance)
    // Nhóm 3: Khách lẻ khác (còn lại)
    const attributionSalesRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
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
        COUNT(DISTINCT o.id) AS order_count,
        COUNT(DISTINCT osc.id) AS item_count,
        COALESCE(SUM(GREATEST(0, COALESCE(NULLIF(osc.total_price - osc.tax_amount, 0), osc.service_price - osc.discount_amount - osc.tax_amount, 0))), 0) AS combo_net
      FROM \`order\` o
      JOIN \`order_service_combo\` osc ON osc.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
      GROUP BY source_group
    `);

    const attributionDoneRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
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
        COUNT(DISTINCT o.id) AS done_visits_count
      FROM \`order\` o
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
      GROUP BY source_group
    `);

    const doneMap = new Map<string, number>();
    for (const r of attributionDoneRaw) {
      doneMap.set(String(r.source_group), Number(r.done_visits_count || 0));
    }

    const salesMap = new Map<string, { orders: number; items: number; net: number }>();
    for (const r of attributionSalesRaw) {
      salesMap.set(String(r.source_group), {
        orders: Number(r.order_count || 0),
        items: Number(r.item_count || 0),
        net: Math.round(Number(r.combo_net || 0)),
      });
    }

    const vxDone = doneMap.get('VONG_XANH') || 0;
    const vxSales = salesMap.get('VONG_XANH') || { orders: 0, items: 0, net: 0 };
    const dgDone = doneMap.get('DUNG_GOI_NGOAI_VX') || 0;
    const dgSales = salesMap.get('DUNG_GOI_NGOAI_VX') || { orders: 0, items: 0, net: 0 };
    const lkDone = doneMap.get('LE_KHAC') || 0;
    const lkSales = salesMap.get('LE_KHAC') || { orders: 0, items: 0, net: 0 };

    const vongXanhGroup: CbAttributionGroup = {
      sourceGroup: 'VONG_XANH',
      name: 'Vòng Xanh (Khách lẻ Done)',
      doneVisitsCount: vxDone,
      comboOrderCount: vxSales.orders,
      comboItemCount: vxSales.items,
      comboSalesNet: vxSales.net,
      comboAov: vxSales.orders > 0 ? Math.round(vxSales.net / vxSales.orders) : 0,
    };

    const dungGoiGroup: CbAttributionGroup = {
      sourceGroup: 'DUNG_GOI_NGOAI_VX',
      name: 'Khách đang dùng gói (ngoài VX)',
      doneVisitsCount: dgDone,
      comboOrderCount: dgSales.orders,
      comboItemCount: dgSales.items,
      comboSalesNet: dgSales.net,
      comboAov: dgSales.orders > 0 ? Math.round(dgSales.net / dgSales.orders) : 0,
    };

    const leKhacGroup: CbAttributionGroup = {
      sourceGroup: 'LE_KHAC',
      name: 'Khách lẻ khác',
      doneVisitsCount: lkDone,
      comboOrderCount: lkSales.orders,
      comboItemCount: lkSales.items,
      comboSalesNet: lkSales.net,
      comboAov: lkSales.orders > 0 ? Math.round(lkSales.net / lkSales.orders) : 0,
    };

    const sumAttributionOrders = vxSales.orders + dgSales.orders + lkSales.orders;
    const sumAttributionNet = vxSales.net + dgSales.net + lkSales.net;
    const reconciliationStatus =
      sumAttributionOrders === comboOrderCount && Math.abs(sumAttributionNet - comboSalesNet) < 1000
        ? 'MATCHED'
        : 'DISCREPANCY';

    const attribution: CbAttributionTelemetry = {
      vongXanh: vongXanhGroup,
      dungGoiNgoaiVx: dungGoiGroup,
      leKhac: leKhacGroup,
      totalComboSalesNet: sumAttributionNet,
      totalComboOrderCount: sumAttributionOrders,
      totalDoneVisitsCount: vxDone + dgDone + lkDone,
      reconciliationStatus,
    };

    // 3. ĐỘNG CƠ VÒNG XANH (GREEN FUNNEL PULSE)
    const greenVisitsCount = vxDone;
    const greenComboOrdersCount = vxSales.orders;
    const greenVisitsTarget = targets.greenFunnelDoneTarget || 540;
    const benchmarkRatePercent = targets.greenFunnelConversionTarget || 10.0;
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

    // 4. ĐỘNG CƠ DÙNG GÓI (RETENTION PULSE - Guideline 2.2: Hai số đo rõ ràng)
    // Số đo 1: Tổng lượt Done có giao dịch trừ gói (so với mốc 1.000)
    const allPackageUsageDoneRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        COUNT(DISTINCT o.id) AS total_package_usage_done,
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

    const balanceDeductionVisitsCount = Number(allPackageUsageDoneRaw?.[0]?.total_package_usage_done || 0);
    const targetVisits = targets.packageUsageDoneTarget || 1000;
    const retentionProgressPercent =
      targetVisits > 0 ? Number(Math.min(100, (balanceDeductionVisitsCount / targetVisits) * 100).toFixed(1)) : 0;

    // Tổng số khách duy nhất toàn kỳ
    const totalDoneRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        COUNT(DISTINCT o.id) AS total_done_count,
        COUNT(DISTINCT o.user_id) AS all_unique_pax_count
      FROM \`order\` o
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeFilterSql}
    `);
    const totalDoneVisits = Number(totalDoneRaw?.[0]?.total_done_count || 0);
    const uniquePaxCount = Number(totalDoneRaw?.[0]?.all_unique_pax_count || 0);
    const uniquePaxPerVisit = uniquePaxCount > 0 ? Number((totalDoneVisits / uniquePaxCount).toFixed(2)) : 0;

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
    for (const r of dailyComboTotalRaw) comboMap.set(String(r.day_val).slice(0, 10), Math.round(Number(r.combo_net || 0)));

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

    let forecastTotal = totalSalesNet;
    let forecastPercent = 0;
    let forecastVariance = 0;
    let last7DaysTotal = 0;
    let last7DaysAvg = 0;
    let forecastStatus: 'ON_TRACK' | 'BORDERLINE' | 'BEHIND' = 'ON_TRACK';
    let summaryFormula = '';

    if (periodState === 'future') {
      forecastTotal = targets.totalSalesTarget;
      forecastPercent = 0;
      forecastVariance = 0;
      summaryFormula = `Kỳ chiến dịch Tháng ${m}/${y} chưa bắt đầu; nhịp kế hoạch ${(targets.dailyPlanPace / 1_000_000).toFixed(1)}M/ngày.`;
      forecastStatus = 'ON_TRACK';
    } else if (periodState === 'closed') {
      forecastTotal = totalSalesNet;
      forecastPercent = targets.totalSalesTarget > 0 ? Number(((totalSalesNet / targets.totalSalesTarget) * 100).toFixed(1)) : 100;
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
        greenBookingsCount: targets.greenFunnelBookTarget || 780,
      },
      retention: {
        balanceDeductionVisitsCount,
        packageUsageNonGreenVisitsCount: dgDone,
        targetVisits,
        repurchaseOrdersCount: dgSales.orders,
        repurchaseComboSalesNet: dgSales.net,
        uniquePaxCount,
        progressPercent: retentionProgressPercent,
      },
      attribution,
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
        periodState,
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
    const selectedMonth = params.month || '2026-10';
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
          CASE 
            WHEN COALESCE(o.combo_sale_required, 0) <> 0 THEN 'Nguồn: Vòng Xanh'
            WHEN EXISTS (
              SELECT 1 FROM \`order_service\` os 
              WHERE os.order_id = o.id 
                AND os.user_service_balance_transaction_id IS NOT NULL 
                AND os.user_service_balance_transaction_id > 0
            ) THEN 'Nguồn: Dùng gói ngoài VX'
            ELSE 'Nguồn: Khách lẻ khác'
          END as source_tag,
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
        details: `${r.source_tag} • ${String(r.details || '')}`,
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
        CONCAT(
          CASE 
            WHEN COALESCE(o.combo_sale_required, 0) <> 0 THEN '[Vòng Xanh có dùng gói] '
            ELSE '[Dùng gói ngoài VX] '
          END,
          CASE 
            WHEN EXISTS (SELECT 1 FROM \`order_service_combo\` osc WHERE osc.order_id = o.id) THEN 'Đã mua tiếp gói • '
            ELSE ''
          END,
          os.service_title
        ) as details
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
