import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';

export async function fetchNewLocaComboMap(
  fastify: FastifyInstance,
  customerIds: number[],
  dateFrom?: string,
  dateTo?: string
): Promise<Map<number, SafeAny>> {
  const newComboMap = new Map<number, SafeAny>();
  if (customerIds.length === 0) return newComboMap;

  const dFromStr = dateFrom
    ? dateFrom.slice(0, 19).replace('T', ' ')
    : new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, 19).replace('T', ' ');
  const dToStr = dateTo
    ? dateTo.slice(0, 19).replace('T', ' ')
    : new Date(new Date().setHours(23, 59, 59, 999)).toISOString().slice(0, 19).replace('T', ' ');

  // 1. Fetch user_service_balance records for combo purchased in date range per customer
  const usbRecords = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `
    SELECT 
      usb.id,
      usb.user_id as userId,
      usb.date_created as dateCreated,
      usb.created_staff_id as createdStaffId,
      CONCAT(
        COALESCE(sl.service_name, s.service_key, usb.service_group, 'Combo Mới Mua'),
        IF(sp.service_price_package_key IS NOT NULL AND sp.service_price_package_key != '', CONCAT(' (', sp.service_price_package_key, ')'), '')
      ) as comboName,
      COALESCE(sp.service_price, usb.total_normal_balance_amount + usb.total_retain_balance_amount, 0) as comboPrice,
      up.full_name as creatorStaffName
    FROM user_service_balance usb
    LEFT JOIN service s ON usb.service_id = s.id
    LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
    LEFT JOIN service_price sp ON usb.service_price_id = sp.id
    LEFT JOIN user_profile up ON usb.created_staff_id = up.user_id
    WHERE usb.user_id IN (${customerIds.join(',')})
      AND usb.date_created >= ? AND usb.date_created <= ?
      AND (COALESCE(sp.service_price, 0) > 0 OR (usb.total_normal_balance_amount + usb.total_retain_balance_amount) > 0)
      AND (sp.service_price_package_key IS NULL OR (
        LOWER(sp.service_price_package_key) NOT LIKE '%single%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
      ))
      AND (sl.service_name IS NULL OR (
        LOWER(sl.service_name) NOT LIKE '%single%'
        AND LOWER(sl.service_name) NOT LIKE '%refill%'
        AND LOWER(sl.service_name) NOT LIKE '%balance%'
      ))
    ORDER BY usb.date_created DESC
  `,
    dFromStr,
    dToStr
  );

  // 2. Fetch combo orders per customer in date range (direct combo sales in order_service_combo and order_service)
  const comboOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `
    SELECT 
      o.id as orderId,
      o.user_id as userId,
      COALESCE(osc.date_created, ro.actual_booking_date_start, o.booking_date_start) as dateCreated,
      o.created_staff_id as createdStaffId,
      up_created.full_name as createdStaffName,
      COALESCE(NULLIF(osc.total_price, 0), sp.service_price, 0) as comboPrice,
      CONCAT(
        COALESCE(sl.service_name, s.service_key, osc.service_group, 'Combo Mới Mua'),
        IF(sp.service_price_package_key IS NOT NULL AND sp.service_price_package_key != '', CONCAT(' (', sp.service_price_package_key, ')'), '')
      ) as comboName,
      COALESCE(up_in_osc.full_name, up_in_os.full_name) as checkInName,
      COALESCE(up_out_osc.full_name, up_out_os.full_name) as checkOutName,
      up_cv.full_name as cvName
    FROM \`order\` o
    JOIN order_service_combo osc ON osc.order_id = o.id
    LEFT JOIN report_order ro ON o.id = ro.order_id
    LEFT JOIN service s ON osc.service_id = s.id
    LEFT JOIN service_language sl ON osc.service_id = sl.service_id AND sl.language_id = 1
    LEFT JOIN service_price sp ON osc.service_price_id = sp.id
    LEFT JOIN user_profile up_created ON o.created_staff_id = up_created.user_id
    LEFT JOIN user_profile up_in_osc ON osc.check_in_staff_id = up_in_osc.user_id
    LEFT JOIN user_profile up_out_osc ON osc.check_out_staff_id = up_out_osc.user_id
    LEFT JOIN order_service os ON os.order_id = o.id
    LEFT JOIN user_profile up_in_os ON os.check_in_staff_id = up_in_os.user_id
    LEFT JOIN user_profile up_out_os ON os.check_out_staff_id = up_out_os.user_id
    LEFT JOIN user_profile up_cv ON os.assigned_staff_id = up_cv.user_id
    WHERE o.user_id IN (${customerIds.join(',')})
      AND o.order_state = 'Completed'
      AND COALESCE(osc.date_created, ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(osc.date_created, ro.actual_booking_date_start, o.booking_date_start) <= ?
      AND COALESCE(NULLIF(osc.total_price, 0), sp.service_price, 0) > 0
      AND (sp.service_price_package_key IS NULL OR (
        LOWER(sp.service_price_package_key) NOT LIKE '%single%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
      ))
      AND (sl.service_name IS NULL OR (
        LOWER(sl.service_name) NOT LIKE '%single%'
        AND LOWER(sl.service_name) NOT LIKE '%refill%'
        AND LOWER(sl.service_name) NOT LIKE '%balance%'
      ))

    UNION

    SELECT 
      o.id as orderId,
      o.user_id as userId,
      COALESCE(os.date_created, ro.actual_booking_date_start, o.booking_date_start) as dateCreated,
      o.created_staff_id as createdStaffId,
      up_created.full_name as createdStaffName,
      COALESCE(NULLIF(os.total_price, 0), sp.service_price, 0) as comboPrice,
      CONCAT(
        COALESCE(sl.service_name, s.service_key, os.service_group, 'Combo Mới Mua'),
        IF(sp.service_price_package_key IS NOT NULL AND sp.service_price_package_key != '', CONCAT(' (', sp.service_price_package_key, ')'), '')
      ) as comboName,
      up_in.full_name as checkInName,
      up_out.full_name as checkOutName,
      up_cv.full_name as cvName
    FROM \`order\` o
    JOIN order_service os ON os.order_id = o.id
    LEFT JOIN report_order ro ON o.id = ro.order_id
    LEFT JOIN service s ON os.service_id = s.id
    LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
    LEFT JOIN service_price sp ON os.service_price_id = sp.id
    LEFT JOIN user_profile up_created ON o.created_staff_id = up_created.user_id
    LEFT JOIN user_profile up_in ON os.check_in_staff_id = up_in.user_id
    LEFT JOIN user_profile up_out ON os.check_out_staff_id = up_out.user_id
    LEFT JOIN user_profile up_cv ON os.assigned_staff_id = up_cv.user_id
    WHERE o.user_id IN (${customerIds.join(',')})
      AND o.order_state = 'Completed'
      AND COALESCE(os.date_created, ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(os.date_created, ro.actual_booking_date_start, o.booking_date_start) <= ?
      AND (os.user_service_type = 'combo' OR s.service_group = 'combo')
      AND COALESCE(NULLIF(os.total_price, 0), sp.service_price, 0) > 0
      AND (sp.service_price_package_key IS NULL OR (
        LOWER(sp.service_price_package_key) NOT LIKE '%single%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
      ))
      AND (sl.service_name IS NULL OR (
        LOWER(sl.service_name) NOT LIKE '%single%'
        AND LOWER(sl.service_name) NOT LIKE '%refill%'
        AND LOWER(sl.service_name) NOT LIKE '%balance%'
      ))
    ORDER BY dateCreated DESC
    `,
    dFromStr,
    dToStr,
    dFromStr,
    dToStr
  );

  const customerUsbMap = new Map<number, SafeAny>();
  usbRecords.forEach((u) => {
    const uid = Number(u.userId);
    if (!customerUsbMap.has(uid)) {
      customerUsbMap.set(uid, u);
    }
  });

  const customerOrderMap = new Map<number, SafeAny>();
  comboOrders.forEach((co) => {
    const uid = Number(co.userId);
    if (!customerOrderMap.has(uid)) {
      customerOrderMap.set(uid, co);
    }
  });

  customerIds.forEach((uid) => {
    const usb = customerUsbMap.get(uid);
    const ord = customerOrderMap.get(uid);
    if (usb || ord) {
      const creatorStaffName = (usb?.creatorStaffName || ord?.createdStaffName || '').trim();
      const bookerName = ord?.createdStaffName || creatorStaffName || 'System';

      // CC Out: CheckOut staff or creator staff (Người bán CC)
      const rawCcOut = ord?.checkOutName || creatorStaffName || '';
      const ccOutName = rawCcOut ? rawCcOut : 'Chưa nhận';

      // CC In: CheckIn staff or fallback to CC Out
      const rawCcIn = ord?.checkInName || (ccOutName !== 'Chưa nhận' ? ccOutName : '');
      const ccInName = rawCcIn ? rawCcIn : 'Chưa nhận';

      // CV (Chuyên viên): Assigned staff on service / order
      const rawCv = ord?.cvName || '';
      const cvName = rawCv ? rawCv : 'Chưa phân công';

      const comboName = usb?.comboName || ord?.comboName || 'Combo Mới Mua';
      const comboPrice = Number(usb?.comboPrice || ord?.comboPrice || 0);
      const purchaseDate = usb?.dateCreated
        ? new Date(usb.dateCreated).toISOString()
        : ord?.dateCreated
          ? new Date(ord.dateCreated).toISOString()
          : null;

      newComboMap.set(uid, {
        comboName,
        comboPrice,
        purchaseDate,
        bookerName,
        ccInName,
        ccOutName,
        cvName,
      });
    }
  });

  return newComboMap;
}
