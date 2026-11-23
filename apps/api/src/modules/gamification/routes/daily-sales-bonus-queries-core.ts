import { CvlTrainingMentorshipPair } from '@mos-lab/shared';
import { buildExcludeTrainingCvlOrderSql } from '../../kpi/services/cvl-training-mentorship.service.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeDatePart(value: string | undefined, fallback: string): string {
  const datePart = value?.includes('T') ? value.split('T')[0] : value;
  return datePart && ISO_DATE_PATTERN.test(datePart) ? datePart : fallback;
}

export function buildActualCheckinOrdersCte(activeTrainingPairs: CvlTrainingMentorshipPair[] = []): string {
  const excludeActualSql = buildExcludeTrainingCvlOrderSql(activeTrainingPairs, 'o.id', 'ro.actual_booking_date_start');
  const excludeBookingSql = buildExcludeTrainingCvlOrderSql(activeTrainingPairs, 'o.id', 'o.booking_date_start');
  return `
    WITH filtered_orders AS (
      SELECT ro.order_id AS orderId, ro.actual_booking_date_start AS checkinTime
      FROM report_order ro
      INNER JOIN \`order\` o ON o.id = ro.order_id
      WHERE o.order_state = 'Completed'
        AND ro.actual_booking_date_start >= ?
        AND ro.actual_booking_date_start <= ?
        ${excludeActualSql}

      UNION ALL

      SELECT o.id AS orderId, o.booking_date_start AS checkinTime
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND ro.actual_booking_date_start IS NULL
        AND o.booking_date_start >= ?
        AND o.booking_date_start <= ?
        ${excludeBookingSql}
    )
  `;
}

export function actualCheckinQueryParams(startPart: string, endPart: string): string[] {
  const start = startPart.includes(' ') ? startPart : `${startPart} 00:00:00`;
  const end = endPart.includes(' ') ? endPart : `${endPart} 23:59:59`;
  return [start, end, start, end];
}

// Query Combos (Net cash value subtracts unpaid debt) with 50/50 Split for CC IN != CC OUT
export function buildComboTransactionQuery(filteredOrdersCte: string, subStaffFilter: string): string {
  return `
        ${filteredOrdersCte}
        SELECT 
          sub.order_service_id,
          sub.order_id,
          sub.order_time,
          sub.customer_name,
          sub.store_code,
          sub.item_title,
          sub.item_type,
          sub.quantity,
          sub.gross_value,
          sub.net_value,
          sub.debt_amount,
          sub.is_split,
          sub.cc_in_name,
          sub.cc_out_name
        FROM (
          -- CC IN != CC OUT -> 50% to CC IN (New Combo)
          SELECT 
            osc.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Combo #', osc.service_id, ' - ', COALESCE(sl.service_name, 'Gói Combo')) as item_title,
            'Combo' as item_type,
            osc.quantity * 0.5 as quantity,
            osc.total_price * 0.5 as gross_value,
            GREATEST(0, (osc.total_price - osc.tax_amount - COALESCE(ud.debt_amount, 0))) * 0.5 as net_value,
            COALESCE(ud.debt_amount, 0) * 0.5 as debt_amount,
            1 as is_split,
            os.check_in_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_service_combo\` osc ON osc.order_id = fo.orderId
          JOIN \`order_service\` os ON os.id = osc.order_service_id
          LEFT JOIN \`service_language\` sl ON sl.service_id = osc.service_id AND sl.language_id = 1
          LEFT JOIN \`user_debt\` ud ON ud.order_id = fo.orderId AND ud.debt_amount > 0
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          WHERE os.check_in_staff_id IS NOT NULL AND os.check_out_staff_id IS NOT NULL AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- CC IN != CC OUT -> 50% to CC OUT (New Combo)
          SELECT 
            osc.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Combo #', osc.service_id, ' - ', COALESCE(sl.service_name, 'Gói Combo')) as item_title,
            'Combo' as item_type,
            osc.quantity * 0.5 as quantity,
            osc.total_price * 0.5 as gross_value,
            GREATEST(0, (osc.total_price - osc.tax_amount - COALESCE(ud.debt_amount, 0))) * 0.5 as net_value,
            COALESCE(ud.debt_amount, 0) * 0.5 as debt_amount,
            1 as is_split,
            os.check_out_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_service_combo\` osc ON osc.order_id = fo.orderId
          JOIN \`order_service\` os ON os.id = osc.order_service_id
          LEFT JOIN \`service_language\` sl ON sl.service_id = osc.service_id AND sl.language_id = 1
          LEFT JOIN \`user_debt\` ud ON ud.order_id = fo.orderId AND ud.debt_amount > 0
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          WHERE os.check_in_staff_id IS NOT NULL AND os.check_out_staff_id IS NOT NULL AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- Same CC or single CC -> 100% to single staff (New Combo)
          SELECT 
            osc.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Combo #', osc.service_id, ' - ', COALESCE(sl.service_name, 'Gói Combo')) as item_title,
            'Combo' as item_type,
            osc.quantity * 1.0 as quantity,
            osc.total_price * 1.0 as gross_value,
            GREATEST(0, (osc.total_price - osc.tax_amount - COALESCE(ud.debt_amount, 0))) * 1.0 as net_value,
            COALESCE(ud.debt_amount, 0) * 1.0 as debt_amount,
            0 as is_split,
            COALESCE(
              os.check_in_staff_id,
              os.check_out_staff_id,
              os.assigned_staff_id,
              o.assigned_staff_id,
              o.created_staff_id
            ) as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_service_combo\` osc ON osc.order_id = fo.orderId
          JOIN \`order_service\` os ON os.id = osc.order_service_id
          LEFT JOIN \`service_language\` sl ON sl.service_id = osc.service_id AND sl.language_id = 1
          LEFT JOIN \`user_debt\` ud ON ud.order_id = fo.orderId AND ud.debt_amount > 0
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          WHERE (os.check_in_staff_id IS NULL OR os.check_out_staff_id IS NULL OR os.check_in_staff_id = os.check_out_staff_id)
        ) sub
        ${subStaffFilter}
      `;
}

// Query Products with 50/50 Split for CC IN != CC OUT
export function buildProductTransactionQuery(filteredOrdersCte: string, subStaffFilter: string): string {
  return `
        ${filteredOrdersCte}
        SELECT 
          sub.order_service_id,
          sub.order_id,
          sub.order_time,
          sub.customer_name,
          sub.store_code,
          sub.item_title,
          sub.item_type,
          sub.quantity,
          sub.gross_value,
          sub.net_value,
          sub.debt_amount,
          sub.is_split,
          sub.cc_in_name,
          sub.cc_out_name
        FROM (
          -- CC IN != CC OUT -> 50% to CC IN (Product)
          SELECT 
            op.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Sản Phẩm #', op.product_id, ' - ', COALESCE(pl.product_name, 'Sản Phẩm')) as item_title,
            'Product' as item_type,
            op.quantity * 0.5 as quantity,
            op.total_price * 0.5 as gross_value,
            GREATEST(0, (op.total_price - COALESCE(op.tax_amount, 0) - COALESCE(ud.debt_amount, 0))) * 0.5 as net_value,
            COALESCE(ud.debt_amount, 0) * 0.5 as debt_amount,
            1 as is_split,
            os.check_in_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_product\` op ON op.order_id = fo.orderId
          LEFT JOIN \`order_service\` os ON os.id = (
            SELECT os_sub.id FROM \`order_service\` os_sub 
            WHERE os_sub.order_id = fo.orderId 
              AND (os_sub.check_in_staff_id IS NOT NULL OR os_sub.check_out_staff_id IS NOT NULL) 
            LIMIT 1
          )
          LEFT JOIN \`user_debt\` ud ON ud.order_id = fo.orderId AND ud.debt_amount > 0
          LEFT JOIN \`product_language\` pl ON pl.product_id = op.product_id AND pl.language_id = 1
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          WHERE os.check_in_staff_id IS NOT NULL 
            AND os.check_out_staff_id IS NOT NULL 
            AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- CC IN != CC OUT -> 50% to CC OUT (Product)
          SELECT 
            op.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Sản Phẩm #', op.product_id, ' - ', COALESCE(pl.product_name, 'Sản Phẩm')) as item_title,
            'Product' as item_type,
            op.quantity * 0.5 as quantity,
            op.total_price * 0.5 as gross_value,
            GREATEST(0, (op.total_price - COALESCE(op.tax_amount, 0) - COALESCE(ud.debt_amount, 0))) * 0.5 as net_value,
            COALESCE(ud.debt_amount, 0) * 0.5 as debt_amount,
            1 as is_split,
            os.check_out_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_product\` op ON op.order_id = fo.orderId
          LEFT JOIN \`order_service\` os ON os.id = (
            SELECT os_sub.id FROM \`order_service\` os_sub 
            WHERE os_sub.order_id = fo.orderId 
              AND (os_sub.check_in_staff_id IS NOT NULL OR os_sub.check_out_staff_id IS NOT NULL) 
            LIMIT 1
          )
          LEFT JOIN \`user_debt\` ud ON ud.order_id = fo.orderId AND ud.debt_amount > 0
          LEFT JOIN \`product_language\` pl ON pl.product_id = op.product_id AND pl.language_id = 1
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          WHERE os.check_in_staff_id IS NOT NULL 
            AND os.check_out_staff_id IS NOT NULL 
            AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- Same CC or single CC -> 100% to single staff (Product)
          SELECT 
            op.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Sản Phẩm #', op.product_id, ' - ', COALESCE(pl.product_name, 'Sản Phẩm')) as item_title,
            'Product' as item_type,
            op.quantity * 1.0 as quantity,
            op.total_price * 1.0 as gross_value,
            GREATEST(0, (op.total_price - COALESCE(op.tax_amount, 0) - COALESCE(ud.debt_amount, 0))) * 1.0 as net_value,
            COALESCE(ud.debt_amount, 0) * 1.0 as debt_amount,
            0 as is_split,
            COALESCE(
              os.check_in_staff_id,
              os.check_out_staff_id,
              op.created_staff_id,
              o.assigned_staff_id,
              o.created_staff_id
            ) as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_product\` op ON op.order_id = fo.orderId
          LEFT JOIN \`order_service\` os ON os.id = (
            SELECT os_sub.id FROM \`order_service\` os_sub 
            WHERE os_sub.order_id = fo.orderId 
              AND (os_sub.check_in_staff_id IS NOT NULL OR os_sub.check_out_staff_id IS NOT NULL) 
            LIMIT 1
          )
          LEFT JOIN \`user_debt\` ud ON ud.order_id = fo.orderId AND ud.debt_amount > 0
          LEFT JOIN \`product_language\` pl ON pl.product_id = op.product_id AND pl.language_id = 1
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          WHERE (os.check_in_staff_id IS NULL OR os.check_out_staff_id IS NULL OR os.check_in_staff_id = os.check_out_staff_id)
        ) sub
        ${subStaffFilter}
      `;
}

// Query Combo Upgrades with 50/50 Split for CC IN != CC OUT
export function buildComboUpgradeTransactionQuery(filteredOrdersCte: string, subStaffFilter: string): string {
  return `
        ${filteredOrdersCte}
        SELECT 
          sub.order_service_id,
          sub.order_id,
          sub.order_time,
          sub.customer_name,
          sub.store_code,
          sub.item_title,
          sub.item_type,
          sub.quantity,
          sub.gross_value,
          sub.net_value,
          sub.debt_amount,
          sub.is_split,
          sub.cc_in_name,
          sub.cc_out_name
        FROM (
          -- CC IN != CC OUT -> 50% to CC IN (Combo Upgrade)
          SELECT 
            os.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Nâng Cấp Combo DV #', os.service_id, ' - ', COALESCE(sl.service_name, os.service_group, 'Mi/SP')) as item_title,
            'Combo' as item_type,
            0.5 as quantity,
            os.upgrade_price * 0.5 as gross_value,
            GREATEST(0, (os.upgrade_price - COALESCE(ud.debt_amount, 0))) * 0.5 as net_value,
            COALESCE(ud.debt_amount, 0) * 0.5 as debt_amount,
            1 as is_split,
            os.check_in_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_service\` os ON os.order_id = fo.orderId
          LEFT JOIN \`service_language\` sl ON sl.service_id = os.service_id AND sl.language_id = 1
          LEFT JOIN \`user_debt\` ud ON ud.order_id = fo.orderId AND ud.debt_amount > 0
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          WHERE os.upgrade_price > 0
            AND os.check_in_staff_id IS NOT NULL AND os.check_out_staff_id IS NOT NULL AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- CC IN != CC OUT -> 50% to CC OUT (Combo Upgrade)
          SELECT 
            os.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Nâng Cấp Combo DV #', os.service_id, ' - ', COALESCE(sl.service_name, os.service_group, 'Mi/SP')) as item_title,
            'Combo' as item_type,
            0.5 as quantity,
            os.upgrade_price * 0.5 as gross_value,
            GREATEST(0, (os.upgrade_price - COALESCE(ud.debt_amount, 0))) * 0.5 as net_value,
            COALESCE(ud.debt_amount, 0) * 0.5 as debt_amount,
            1 as is_split,
            os.check_out_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_service\` os ON os.order_id = fo.orderId
          LEFT JOIN \`service_language\` sl ON sl.service_id = os.service_id AND sl.language_id = 1
          LEFT JOIN \`user_debt\` ud ON ud.order_id = fo.orderId AND ud.debt_amount > 0
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          WHERE os.upgrade_price > 0
            AND os.check_in_staff_id IS NOT NULL AND os.check_out_staff_id IS NOT NULL AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- Same CC or single CC -> 100% to single staff (Combo Upgrade)
          SELECT 
            os.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('Nâng Cấp Combo DV #', os.service_id, ' - ', COALESCE(sl.service_name, os.service_group, 'Mi/SP')) as item_title,
            'Combo' as item_type,
            1.0 as quantity,
            os.upgrade_price * 1.0 as gross_value,
            GREATEST(0, (os.upgrade_price - COALESCE(ud.debt_amount, 0))) * 1.0 as net_value,
            COALESCE(ud.debt_amount, 0) * 1.0 as debt_amount,
            0 as is_split,
            COALESCE(os.check_in_staff_id, os.check_out_staff_id, os.assigned_staff_id, o.created_staff_id) as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM filtered_orders fo
          JOIN \`order\` o ON o.id = fo.orderId
          JOIN \`order_service\` os ON os.order_id = fo.orderId
          LEFT JOIN \`service_language\` sl ON sl.service_id = os.service_id AND sl.language_id = 1
          LEFT JOIN \`user_debt\` ud ON ud.order_id = fo.orderId AND ud.debt_amount > 0
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = o.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
          WHERE os.upgrade_price > 0
            AND (os.check_in_staff_id IS NULL OR os.check_out_staff_id IS NULL OR os.check_in_staff_id = os.check_out_staff_id)
        ) sub
        ${subStaffFilter}
      `;
}
