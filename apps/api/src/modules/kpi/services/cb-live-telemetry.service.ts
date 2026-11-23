import { FastifyInstance } from 'fastify';
import {
  CbAttributionGroup,
  CbAttributionTelemetry,
  CbDrilldownItem,
  CbLiveTelemetryResponse,
  CbTargetConfig,
  CbTelemetryQueryParams,
  SafeAny,
} from '@mos-lab/shared';
import {
  getIctNow,
  formatIctYm,
  resolveCbStoreScope,
  getCbTargetConfig,
  saveCbTargetConfig,
  type CbStoreScope,
} from './cb-live-telemetry/cb-target-config.js';
import { buildCbDailyAndForecast } from './cb-live-telemetry/cb-telemetry-daily-forecast.js';
import { getCbDrilldown } from './cb-live-telemetry/cb-drilldown.js';

export class CbLiveTelemetryService {
  /**
   * Resolve target config for given month and scope.
   * If not found in crmConfig, default to November 2026 targets if month === '2026-11',
   * otherwise return configured: false as per guidelines (e.g. month 10).
   */
  public static async getTargetConfig(
    fastify: FastifyInstance,
    month: string,
    storeScope: CbStoreScope = 'DE_THAM_ESTELLA'
  ): Promise<CbTargetConfig> {
    return getCbTargetConfig(fastify, month, storeScope);
  }

  /**
   * Save custom target configuration to crmConfig
   */
  public static async saveTargetConfig(
    fastify: FastifyInstance,
    target: Partial<CbTargetConfig> & { month: string; storeScope?: string; userStaffName?: string }
  ): Promise<CbTargetConfig> {
    return saveCbTargetConfig(fastify, target);
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
    const { storeScope, storeFilterSql } = resolveCbStoreScope(params.storeScope, params.storeId);

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

    const { daily, forecast, pacingStatus, isCurrentMonth } = await buildCbDailyAndForecast(fastify, {
      startStr,
      endStr,
      storeFilterSql,
      selectedMonth,
      currentMonthStr,
      nowIct,
      periodState,
      targets,
      totalSalesNet,
    });

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
      daily,
      forecast,
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
    return getCbDrilldown(fastify, params);
  }
}
