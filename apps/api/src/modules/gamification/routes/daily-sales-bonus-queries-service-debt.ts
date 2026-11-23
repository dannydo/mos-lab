// Query Single Services (Exclude Combo Upgrades) with 50/50 Split for CC IN != CC OUT
export function buildSingleServiceTransactionQuery(filteredOrdersCte: string, subStaffFilter: string): string {
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
          -- CC IN != CC OUT -> 50% to CC IN (Single Service)
          SELECT 
            os.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('DV #', os.service_id, ' - ', COALESCE(sl.service_name, os.service_group, 'Mi/SP')) as item_title,
            'Service' as item_type,
            os.quantity * 0.5 as quantity,
            os.total_price * 0.5 as gross_value,
            GREATEST(0, (os.total_price - COALESCE(os.tax_amount, 0) - COALESCE(ud.debt_amount, 0))) * 0.5 as net_value,
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
          WHERE COALESCE(os.upgrade_price, 0) = 0
            AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%combo%'
            AND LOWER(COALESCE(os.service_type, '')) NOT LIKE '%combo%'
            AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%product%'
            AND os.check_in_staff_id IS NOT NULL 
            AND os.check_out_staff_id IS NOT NULL 
            AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- CC IN != CC OUT -> 50% to CC OUT (Single Service)
          SELECT 
            os.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('DV #', os.service_id, ' - ', COALESCE(sl.service_name, os.service_group, 'Mi/SP')) as item_title,
            'Service' as item_type,
            os.quantity * 0.5 as quantity,
            os.total_price * 0.5 as gross_value,
            GREATEST(0, (os.total_price - COALESCE(os.tax_amount, 0) - COALESCE(ud.debt_amount, 0))) * 0.5 as net_value,
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
          WHERE COALESCE(os.upgrade_price, 0) = 0
            AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%combo%'
            AND LOWER(COALESCE(os.service_type, '')) NOT LIKE '%combo%'
            AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%product%'
            AND os.check_in_staff_id IS NOT NULL 
            AND os.check_out_staff_id IS NOT NULL 
            AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- Same CC or single CC -> 100% to single staff (Single Service)
          SELECT 
            os.id as order_service_id,
            fo.orderId as order_id,
            DATE_FORMAT(fo.checkinTime, '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(cs.client_store_key) as store_code,
            CONCAT('DV #', os.service_id, ' - ', COALESCE(sl.service_name, os.service_group, 'Mi/SP')) as item_title,
            'Service' as item_type,
            os.quantity * 1.0 as quantity,
            os.total_price * 1.0 as gross_value,
            GREATEST(0, (os.total_price - COALESCE(os.tax_amount, 0) - COALESCE(ud.debt_amount, 0))) * 1.0 as net_value,
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
          WHERE COALESCE(os.upgrade_price, 0) = 0
            AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%combo%'
            AND LOWER(COALESCE(os.service_type, '')) NOT LIKE '%combo%'
            AND LOWER(COALESCE(os.service_group, '')) NOT LIKE '%product%'
            AND (os.check_in_staff_id IS NULL OR os.check_out_staff_id IS NULL OR os.check_in_staff_id = os.check_out_staff_id)
        ) sub
        ${subStaffFilter}
      `;
}

// Query Debt Payments with 50/50 Split for CC IN != CC OUT
export function buildDebtPaymentTransactionQuery(params: {
  startStr: string;
  endStr: string;
  excludeTrainingDebtSql: string;
  subStaffFilter: string;
}): string {
  const { startStr, endStr, excludeTrainingDebtSql, subStaffFilter } = params;
  return `
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
          -- CC IN != CC OUT -> 50% to CC IN (Debt Collection)
          SELECT 
            udp.id as order_service_id,
            COALESCE(udp.order_id, ud.order_id) as order_id,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created), '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(COALESCE(cs_order.client_store_key, cs_debt.client_store_key, 'MOS')) as store_code,
            'Thu Nợ Khoản Nợ Cũ' as item_title,
            'Combo' as item_type,
            0.5 as quantity,
            udp.paid_amount * 0.5 as gross_value,
            udp.paid_amount * 0.5 as net_value,
            0 as debt_amount,
            1 as is_split,
            os.check_in_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM \`user_debt_payment\` udp
          JOIN \`user_debt\` ud ON ud.id = udp.user_debt_id
          LEFT JOIN \`order\` o ON o.id = udp.order_id
          LEFT JOIN report_order ro ON ro.order_id = o.id
          LEFT JOIN \`order_service\` os ON os.id = (
            SELECT os_sub.id FROM \`order_service\` os_sub WHERE os_sub.order_id = udp.order_id AND os_sub.check_in_staff_id IS NOT NULL LIMIT 1
          )
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = ud.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs_order ON cs_order.id = o.client_store_id
          LEFT JOIN \`client_store\` cs_debt ON cs_debt.id = ud.client_store_id
          WHERE udp.paid_amount > 0
            AND udp.is_completed = 1
            AND COALESCE(udp.is_cancelled, 0) = 0
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created) >= '${startStr} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created) <= '${endStr} 23:59:59'
            ${excludeTrainingDebtSql}
            AND os.check_in_staff_id IS NOT NULL AND os.check_out_staff_id IS NOT NULL AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- CC IN != CC OUT -> 50% to CC OUT (Debt Collection)
          SELECT 
            udp.id as order_service_id,
            COALESCE(udp.order_id, ud.order_id) as order_id,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created), '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(COALESCE(cs_order.client_store_key, cs_debt.client_store_key, 'MOS')) as store_code,
            'Thu Nợ Khoản Nợ Cũ' as item_title,
            'Combo' as item_type,
            0.5 as quantity,
            udp.paid_amount * 0.5 as gross_value,
            udp.paid_amount * 0.5 as net_value,
            0 as debt_amount,
            1 as is_split,
            os.check_out_staff_id as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM \`user_debt_payment\` udp
          JOIN \`user_debt\` ud ON ud.id = udp.user_debt_id
          LEFT JOIN \`order\` o ON o.id = udp.order_id
          LEFT JOIN report_order ro ON ro.order_id = o.id
          LEFT JOIN \`order_service\` os ON os.id = (
            SELECT os_sub.id FROM \`order_service\` os_sub WHERE os_sub.order_id = udp.order_id AND os_sub.check_out_staff_id IS NOT NULL LIMIT 1
          )
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = ud.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs_order ON cs_order.id = o.client_store_id
          LEFT JOIN \`client_store\` cs_debt ON cs_debt.id = ud.client_store_id
          WHERE udp.paid_amount > 0
            AND udp.is_completed = 1
            AND COALESCE(udp.is_cancelled, 0) = 0
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created) >= '${startStr} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created) <= '${endStr} 23:59:59'
            ${excludeTrainingDebtSql}
            AND os.check_in_staff_id IS NOT NULL AND os.check_out_staff_id IS NOT NULL AND os.check_in_staff_id != os.check_out_staff_id

          UNION ALL

          -- Single CC or same CC -> 100% to staff (Debt Collection)
          SELECT 
            udp.id as order_service_id,
            COALESCE(udp.order_id, ud.order_id) as order_id,
            DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created), '%d/%m/%Y %H:%i') as order_time,
            up_cust.full_name as customer_name,
            UPPER(COALESCE(cs_order.client_store_key, cs_debt.client_store_key, 'MOS')) as store_code,
            'Thu Nợ Khoản Nợ Cũ' as item_title,
            'Combo' as item_type,
            1.0 as quantity,
            udp.paid_amount * 1.0 as gross_value,
            udp.paid_amount * 1.0 as net_value,
            0 as debt_amount,
            0 as is_split,
            COALESCE(os.check_in_staff_id, os.check_out_staff_id, udp.created_staff_id, ud.user_debt_payment_staff_id, ud.created_staff_id) as staff_id,
            up_in.full_name as cc_in_name,
            up_out.full_name as cc_out_name
          FROM \`user_debt_payment\` udp
          JOIN \`user_debt\` ud ON ud.id = udp.user_debt_id
          LEFT JOIN \`order\` o ON o.id = udp.order_id
          LEFT JOIN report_order ro ON ro.order_id = o.id
          LEFT JOIN \`order_service\` os ON os.id = (
            SELECT os_sub.id FROM \`order_service\` os_sub WHERE os_sub.order_id = udp.order_id AND (os_sub.check_in_staff_id IS NOT NULL OR os_sub.check_out_staff_id IS NOT NULL) LIMIT 1
          )
          LEFT JOIN \`user_profile\` up_cust ON up_cust.user_id = ud.user_id
          LEFT JOIN \`user_profile\` up_in ON up_in.user_id = os.check_in_staff_id
          LEFT JOIN \`user_profile\` up_out ON up_out.user_id = os.check_out_staff_id
          LEFT JOIN \`client_store\` cs_order ON cs_order.id = o.client_store_id
          LEFT JOIN \`client_store\` cs_debt ON cs_debt.id = ud.client_store_id
          WHERE udp.paid_amount > 0
            AND udp.is_completed = 1
            AND COALESCE(udp.is_cancelled, 0) = 0
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created) >= '${startStr} 00:00:00'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start, udp.date_created) <= '${endStr} 23:59:59'
            ${excludeTrainingDebtSql}
            AND (os.check_in_staff_id IS NULL OR os.check_out_staff_id IS NULL OR os.check_in_staff_id = os.check_out_staff_id)
        ) sub
        ${subStaffFilter}
      `;
}
