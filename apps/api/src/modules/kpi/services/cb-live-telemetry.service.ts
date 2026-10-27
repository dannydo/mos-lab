import { FastifyInstance } from 'fastify';
import { CbLiveTelemetryResponse, CbTelemetryQueryParams, SafeAny } from '@mos-lab/shared';

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

    const storeIdFilter =
      params.storeId && params.storeId !== 'ALL' && !isNaN(Number(params.storeId))
        ? `AND o.client_store_id = ${Number(params.storeId)}`
        : '';

    // 1. DOANH SỐ THỰC THU (LIVE) - Gói & Sản phẩm chưa VAT
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
        ${storeIdFilter}
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
        ${storeIdFilter}
    `);

    const comboSalesNet = Math.round(Number(comboSalesRaw?.[0]?.combo_sales_net || 0));
    const comboOrderCount = Number(comboSalesRaw?.[0]?.combo_order_count || 0);
    const comboItemCount = Number(comboSalesRaw?.[0]?.combo_item_count || 0);
    const productSalesNet = Math.round(Number(productSalesRaw?.[0]?.product_sales_net || 0));
    const productOrderCount = Number(productSalesRaw?.[0]?.product_order_count || 0);
    const productItemCount = Number(productSalesRaw?.[0]?.product_item_count || 0);

    const comboAov = comboOrderCount > 0 ? Math.round(comboSalesNet / comboOrderCount) : 0;
    const totalSalesNet = comboSalesNet + productSalesNet;

    // 2. ĐỘNG CƠ VÒNG XANH (LIVE) - Green Funnel Pulse
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
        ${storeIdFilter}
    `);

    const greenVisitsCount = Number(greenFunnelRaw?.[0]?.green_visits_count || 0);
    const greenComboOrdersCount = Number(greenFunnelRaw?.[0]?.green_combo_orders_count || 0);
    const greenVisitsTarget = 540;
    const benchmarkRatePercent = 10.0;
    const closingRatePercent =
      greenVisitsCount > 0 ? Number(((greenComboOrdersCount / greenVisitsCount) * 100).toFixed(1)) : 0;
    const greenProgressPercent = Number(Math.min(100, (greenVisitsCount / greenVisitsTarget) * 100).toFixed(1));

    let greenStatus: 'BELOW_BENCHMARK' | 'ON_TRACK' | 'EXCEEDING' = 'BELOW_BENCHMARK';
    if (closingRatePercent >= 12.0) {
      greenStatus = 'EXCEEDING';
    } else if (closingRatePercent >= benchmarkRatePercent) {
      greenStatus = 'ON_TRACK';
    }

    // 3. ĐỘNG CƠ DÙNG GÓI (LIVE) - Retention Pulse
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
        ${storeIdFilter}
    `);

    const balanceDeductionVisitsCount = Number(retentionRaw?.[0]?.balance_deduction_visits_count || 0);
    const uniquePaxCount = Number(retentionRaw?.[0]?.unique_pax_count || 0);
    const targetVisits = 1000;
    const retentionProgressPercent = Number(
      Math.min(100, (balanceDeductionVisitsCount / targetVisits) * 100).toFixed(1)
    );

    // Repurchase orders from customers who have package balance / active usage
    const repurchaseRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT COUNT(DISTINCT o.id) AS repurchase_orders_count
      FROM \`order\` o
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= '${startStr}'
        AND o.booking_date_start <= '${endStr}'
        ${storeIdFilter}
        AND (
          EXISTS (SELECT 1 FROM \`order_service_combo\` osc WHERE osc.order_id = o.id)
          OR EXISTS (SELECT 1 FROM \`order_product\` op WHERE op.order_id = o.id)
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

    return {
      revenue: {
        comboSalesNet,
        productSalesNet,
        totalSalesNet,
        comboOrderCount,
        comboItemCount,
        productOrderCount,
        productItemCount,
        comboAov,
      },
      greenFunnel: {
        greenVisitsCount,
        greenVisitsTarget,
        greenComboOrdersCount,
        closingRatePercent,
        benchmarkRatePercent,
        progressPercent: greenProgressPercent,
        status: greenStatus,
      },
      retention: {
        balanceDeductionVisitsCount,
        targetVisits,
        repurchaseOrdersCount,
        uniquePaxCount,
        progressPercent: retentionProgressPercent,
      },
      meta: {
        lastSyncAt: new Date().toISOString(),
        dateFrom: startStr.slice(0, 10),
        dateTo: endStr.slice(0, 10),
        month: selectedMonth,
        isCurrentMonth: selectedMonth === currentMonthStr,
      },
    };
  }
}
