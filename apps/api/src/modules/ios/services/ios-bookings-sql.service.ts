import mysql from 'mysql2/promise';
import {
  createEmptyCustomerEnrichmentContext,
  fetchCustomerEnrichmentContext,
  IosCustomerEnrichmentContext,
  LastVisitSpecSummary,
} from './ios-customer-enrichment.service.js';

export type { IosCustomerEnrichmentContext, LastVisitSpecSummary };
export { createEmptyCustomerEnrichmentContext };

export interface RawIosOrderSnapshot {
  id: number;
  order_number: string | null;
  order_state: string | null;
  booking_date_start: Date | string | null;
  booking_duration_minute: number | null;
  total_price: number | null;
  client_store_id: number | null;
  booking_note: string | null;
  user_id: number | null;
  combo_sale_required: number | null;
  is_new: number | null;
  promotion_id: unknown;
  customer_name: string;
  customer_phone: string;
  customer_avatar: string | null;
  booker_name: string;
  booker_avatar: string | null;
  service_name: string;
  service_key: string | null;
  is_temporary: number | null;
  service_type: string;
  staff_name: string;
  staff_avatar: string | null;
  assigned_staff_id: number | null;
  booked_staff_id: number | null;
  check_in_staff_id: number | null;
  check_out_staff_id: number | null;
  check_in_staff_name: string | null;
  check_in_staff_avatar: string | null;
  check_out_staff_name: string | null;
  check_out_staff_avatar: string | null;
  total_visits: number;
}

export async function fetchLiveOrderSnapshots(
  pool: mysql.Pool,
  params: { storeId: number; targetDate: string; limit: number }
): Promise<{ orders: RawIosOrderSnapshot[]; customerContext: IosCustomerEnrichmentContext }> {
  const { storeId, targetDate, limit } = params;
  const storeCondition = storeId > 0 ? 'AND o.client_store_id = ?' : '';
  const queryParams: (number | string)[] = [];
  if (storeId > 0) queryParams.push(storeId);
  queryParams.push(`${targetDate} 00:00:00`, `${targetDate} 23:59:59`, targetDate, limit);

  const [orderRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT
       o.id,
       o.order_number,
       o.order_state,
       o.booking_date_start,
       o.booking_duration_minute,
       o.total_price,
       o.client_store_id,
       o.booking_note,
       o.user_id,
       o.user_contact_id,
       o.created_staff_id AS order_created_staff_id,
       o.combo_sale_required,
       o.is_new,
       o.promotion_id,
       up.full_name AS customer_name,
       up.avatar AS customer_avatar,
       direct_uc.phone_number AS direct_contact_phone,
       order_booker_up.full_name AS order_booker_name,
       order_booker_up.avatar AS order_booker_avatar
     FROM \`order\` o
     LEFT JOIN user_profile up ON up.user_id = o.user_id
     LEFT JOIN user_contact direct_uc ON direct_uc.id = o.user_contact_id
     LEFT JOIN user_profile order_booker_up ON order_booker_up.user_id = o.created_staff_id
     WHERE 1=1
       ${storeCondition}
       AND ((o.booking_date_start >= ? AND o.booking_date_start <= ?) OR o.booking_date_only = ?)
     ORDER BY o.booking_date_start ASC, o.id ASC
     LIMIT ?`,
    queryParams
  );

  if (orderRows.length === 0) {
    return { orders: [], customerContext: createEmptyCustomerEnrichmentContext() };
  }

  const orderIds = Array.from(new Set(orderRows.map((r) => Number(r.id)).filter((id) => id > 0)));
  const customerIds = Array.from(new Set(orderRows.map((r) => Number(r.user_id)).filter((id) => id > 0)));
  const missingContactUserIds = Array.from(
    new Set(orderRows.filter((r) => !r.direct_contact_phone && Number(r.user_id) > 0).map((r) => Number(r.user_id)))
  );

  const emptyQueryResult = Promise.resolve([[] as mysql.RowDataPacket[], []] as unknown as [
    mysql.RowDataPacket[],
    mysql.FieldPacket[],
  ]);

  const primaryServicePromise =
    orderIds.length > 0
      ? pool.query<mysql.RowDataPacket[]>(
          `SELECT
             os.id AS os_id,
             os.order_id,
             os.service_type,
             os.created_staff_id AS os_created_staff_id,
             os.assigned_staff_id,
             os.booked_staff_id,
             os.check_in_staff_id,
             os.check_out_staff_id,
             s.service_key,
             s.is_temporary,
             sl.service_name,
             os_booker_up.full_name AS os_booker_name,
             os_booker_up.avatar AS os_booker_avatar,
             sp.full_name AS staff_name,
             sp.avatar AS staff_avatar,
             checkin_up.full_name AS check_in_staff_name,
             checkin_up.avatar AS check_in_staff_avatar,
             checkout_up.full_name AS check_out_staff_name,
             checkout_up.avatar AS check_out_staff_avatar
           FROM order_service os
           LEFT JOIN service s ON s.id = os.service_id
           LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
           LEFT JOIN user_profile os_booker_up ON os_booker_up.user_id = os.created_staff_id
           LEFT JOIN user_profile sp ON sp.user_id = os.assigned_staff_id
           LEFT JOIN user_profile checkin_up ON checkin_up.user_id = os.check_in_staff_id
           LEFT JOIN user_profile checkout_up ON checkout_up.user_id = os.check_out_staff_id
           WHERE os.order_id IN (${orderIds.map(() => '?').join(',')})
           ORDER BY os.id ASC`,
          orderIds
        )
      : emptyQueryResult;

  const fallbackContactPromise =
    missingContactUserIds.length > 0
      ? pool.query<mysql.RowDataPacket[]>(
          `SELECT user_id, phone_number
           FROM user_contact
           WHERE user_id IN (${missingContactUserIds.map(() => '?').join(',')})
             AND is_disabled = 0
           ORDER BY id DESC`,
          missingContactUserIds
        )
      : emptyQueryResult;

  const visitCountsPromise =
    customerIds.length > 0
      ? pool.query<mysql.RowDataPacket[]>(
          `SELECT user_id, COUNT(*) AS total_visits
           FROM \`order\`
           WHERE user_id IN (${customerIds.map(() => '?').join(',')})
             AND order_state = 'Completed'
           GROUP BY user_id`,
          customerIds
        )
      : emptyQueryResult;

  const [[osRows], [contactRows], [visitRows], customerContext] = await Promise.all([
    primaryServicePromise,
    fallbackContactPromise,
    visitCountsPromise,
    fetchCustomerEnrichmentContext(pool, customerIds),
  ]);

  const primaryOsByOrderId = new Map<number, mysql.RowDataPacket>();
  for (const row of osRows) {
    const oid = Number(row.order_id);
    if (oid > 0 && !primaryOsByOrderId.has(oid)) {
      primaryOsByOrderId.set(oid, row);
    }
  }

  const latestPhoneByUserId = new Map<number, string>();
  for (const row of contactRows) {
    const uid = Number(row.user_id);
    if (uid > 0 && row.phone_number && !latestPhoneByUserId.has(uid)) {
      latestPhoneByUserId.set(uid, String(row.phone_number));
    }
  }

  const totalVisitsByUserId = new Map<number, number>();
  for (const row of visitRows) {
    const uid = Number(row.user_id);
    if (uid > 0) {
      totalVisitsByUserId.set(uid, Number(row.total_visits) || 0);
    }
  }

  const orders: RawIosOrderSnapshot[] = orderRows.map((r) => {
    const orderId = Number(r.id);
    const userId = r.user_id ? Number(r.user_id) : null;
    const os = primaryOsByOrderId.get(orderId);
    const resolvedBookerName = os?.os_created_staff_id ? os.os_booker_name : r.order_booker_name;
    const resolvedBookerAvatar = os?.os_created_staff_id ? os.os_booker_avatar : r.order_booker_avatar;

    return {
      id: orderId,
      order_number: r.order_number ? String(r.order_number) : null,
      order_state: r.order_state ? String(r.order_state) : null,
      booking_date_start: r.booking_date_start ?? null,
      booking_duration_minute: r.booking_duration_minute !== null ? Number(r.booking_duration_minute) : null,
      total_price: r.total_price !== null ? Number(r.total_price) : null,
      client_store_id: r.client_store_id !== null ? Number(r.client_store_id) : null,
      booking_note: r.booking_note ? String(r.booking_note) : null,
      user_id: userId,
      combo_sale_required: r.combo_sale_required !== null ? Number(r.combo_sale_required) : null,
      is_new: r.is_new !== null ? Number(r.is_new) : null,
      promotion_id: r.promotion_id,
      customer_name: r.customer_name ? String(r.customer_name) : 'Khách Vãng Lai',
      customer_phone:
        (r.direct_contact_phone ? String(r.direct_contact_phone) : undefined) ||
        (userId ? latestPhoneByUserId.get(userId) : undefined) ||
        '0901.xxx.xxx',
      customer_avatar: r.customer_avatar ? String(r.customer_avatar) : null,
      booker_name: resolvedBookerName ? String(resolvedBookerName) : 'Tư vấn',
      booker_avatar: resolvedBookerAvatar ? String(resolvedBookerAvatar) : null,
      service_name: String(os?.service_name || os?.service_key || 'New Flawless Mink 770'),
      service_key: os?.service_key ? String(os.service_key) : null,
      is_temporary: os?.is_temporary !== undefined && os?.is_temporary !== null ? Number(os.is_temporary) : null,
      service_type: os?.service_type ? String(os.service_type) : 'Normal',
      staff_name: os?.staff_name ? String(os.staff_name) : 'Chưa phân công',
      staff_avatar: os?.staff_avatar ? String(os.staff_avatar) : null,
      assigned_staff_id: os?.assigned_staff_id ? Number(os.assigned_staff_id) : null,
      booked_staff_id: os?.booked_staff_id ? Number(os.booked_staff_id) : null,
      check_in_staff_id: os?.check_in_staff_id ? Number(os.check_in_staff_id) : null,
      check_out_staff_id: os?.check_out_staff_id ? Number(os.check_out_staff_id) : null,
      check_in_staff_name: os?.check_in_staff_name ? String(os.check_in_staff_name) : null,
      check_in_staff_avatar: os?.check_in_staff_avatar ? String(os.check_in_staff_avatar) : null,
      check_out_staff_name: os?.check_out_staff_name ? String(os.check_out_staff_name) : null,
      check_out_staff_avatar: os?.check_out_staff_avatar ? String(os.check_out_staff_avatar) : null,
      total_visits: userId ? (totalVisitsByUserId.get(userId) ?? 0) : 0,
    };
  });

  return { orders, customerContext };
}
