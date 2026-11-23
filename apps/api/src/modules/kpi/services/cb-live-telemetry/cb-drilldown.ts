import { FastifyInstance } from 'fastify';
import type { CbDrilldownItem, SafeAny } from '@mos-lab/shared';
import { resolveCbStoreScope } from './cb-target-config.js';

/**
 * Drilldown orders for auditing transactions (Guideline Câu hỏi 6)
 */
export async function getCbDrilldown(
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

  const { storeFilterSql } = resolveCbStoreScope(params.storeScope);

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
