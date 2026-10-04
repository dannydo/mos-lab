import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    const dbUrl = process.env.LEGACY_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/management';
    pool = mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

// Curated high quality beauty portraits for lash clients without uploaded photos
const FALLBACK_AVATARS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=256',
];

function resolveCustomerAvatar(dbAvatar: string | null | undefined, customerId: number): string {
  if (dbAvatar && typeof dbAvatar === 'string' && dbAvatar.trim().startsWith('http')) {
    return dbAvatar.trim();
  }
  return FALLBACK_AVATARS[customerId % FALLBACK_AVATARS.length];
}

function resolveStaffAvatar(dbAvatar: string | null | undefined): string {
  if (dbAvatar && typeof dbAvatar === 'string' && dbAvatar.trim().startsWith('http')) {
    return dbAvatar.trim();
  }
  return 'https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg';
}

function formatTimeSlot(dateStart: Date | string | null, durationMinutes: number): string {
  if (!dateStart) return '09:00 - 10:30';
  const start = new Date(dateStart);
  if (isNaN(start.getTime())) return '09:00 - 10:30';

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return `${startStr} - ${endStr}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') ? Number(searchParams.get('storeId')) : 6;
    const segment = (searchParams.get('segment') || 'ALL').toUpperCase();
    const limit = Math.min(Number(searchParams.get('limit')) || 25, 50);

    const pool = getPool();

    // 1. Fetch Segment Counts for this store
    const [countRows] = await pool.query<mysql.RowDataPacket[]>(
      `
      SELECT 
        SUM(CASE WHEN order_state IN ('New', 'Confirmed', 'Pending') THEN 1 ELSE 0 END) AS incoming_count,
        SUM(CASE WHEN order_state IN ('CheckIn', 'ServiceStart', 'In-progress') THEN 1 ELSE 0 END) AS servicing_count,
        SUM(CASE WHEN order_state IN ('Completed', 'CheckOut') THEN 1 ELSE 0 END) AS done_count,
        SUM(CASE WHEN order_state IN ('Cancelled', 'Missed') THEN 1 ELSE 0 END) AS cancel_count
      FROM \`order\`
      WHERE (? = 0 OR client_store_id = ?);
    `,
      [storeId, storeId]
    );

    const counts = {
      incoming: Number(countRows[0]?.incoming_count || 0),
      servicing: Number(countRows[0]?.servicing_count || 0),
      done: Number(countRows[0]?.done_count || 0),
      cancel: Number(countRows[0]?.cancel_count || 0),
    };

    // 2. Build Condition according to order_state
    let stateCondition = '';
    const queryParams: (number | string)[] = [];

    if (segment === 'INCOMING') {
      stateCondition = "AND o.order_state IN ('New', 'Confirmed', 'Pending')";
    } else if (segment === 'SERVICING') {
      stateCondition = "AND o.order_state IN ('CheckIn', 'ServiceStart', 'In-progress')";
    } else if (segment === 'DONE') {
      stateCondition = "AND o.order_state IN ('Completed', 'CheckOut')";
    } else if (segment === 'CANCEL') {
      stateCondition = "AND o.order_state IN ('Cancelled', 'Missed')";
    }

    let storeCondition = '';
    if (storeId > 0) {
      storeCondition = 'AND o.client_store_id = ?';
      queryParams.push(storeId);
    }

    queryParams.push(limit);

    const sql = `
      SELECT 
        o.id,
        o.order_number,
        o.order_state,
        o.booking_date_start,
        o.booking_duration_minute,
        o.total_price,
        o.client_store_id,
        o.booking_note,
        o.user_id,
        COALESCE(up.full_name, 'Khách Vãng Lai') AS customer_name,
        COALESCE(uc.phone_number, '0901.xxx.xxx') AS customer_phone,
        up.avatar AS customer_avatar,
        COALESCE(sl.service_name, s.service_key, 'Nối mi Design Wings') AS service_name,
        COALESCE(sp.full_name, 'Chưa phân công') AS staff_name,
        sp.avatar AS staff_avatar,
        os.assigned_staff_id,
        (SELECT COUNT(*) FROM \`order\` o2 WHERE o2.user_id = o.user_id AND o2.order_state = 'Completed') AS total_visits
      FROM \`order\` o
      LEFT JOIN user_profile up ON up.user_id = o.user_id
      LEFT JOIN user_contact uc ON uc.user_id = o.user_id AND uc.is_disabled = 0
      LEFT JOIN (
        SELECT order_id, MIN(id) as min_os_id FROM order_service GROUP BY order_id
      ) first_os ON first_os.order_id = o.id
      LEFT JOIN order_service os ON os.id = first_os.min_os_id
      LEFT JOIN service s ON s.id = os.service_id
      LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
      LEFT JOIN user_profile sp ON sp.user_id = os.assigned_staff_id
      WHERE 1=1
        ${stateCondition}
        ${storeCondition}
      ORDER BY o.id DESC
      LIMIT ?;
    `;

    const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, queryParams);

    // Map rows to BookingItem
    const bookings = rows.map((r, index) => {
      const state = r.order_state;
      let status: 'INCOMING' | 'CHECKED_IN' | 'SERVICING' | 'DONE' | 'CANCELLED' = 'INCOMING';
      if (state === 'CheckIn') status = 'CHECKED_IN';
      else if (state === 'ServiceStart' || state === 'In-progress') status = 'SERVICING';
      else if (state === 'Completed' || state === 'CheckOut') status = 'DONE';
      else if (state === 'Cancelled' || state === 'Missed') status = 'CANCELLED';

      const duration = r.booking_duration_minute || 90;
      const price = Number(r.total_price) || 390000;
      const orderNum = r.order_number ? `BK-${r.order_number}` : `BK-${r.id}`;

      return {
        id: r.id,
        orderNumber: orderNum,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerId: r.user_id,
        customerAvatar: resolveCustomerAvatar(r.customer_avatar, r.user_id),
        assignedStaffAvatar: resolveStaffAvatar(r.staff_avatar),
        customerVisits: Number(r.total_visits) || 1,
        customerNote: r.booking_note || '',
        timeSlot: formatTimeSlot(r.booking_date_start, duration),
        serviceName: r.service_name,
        servicePrice: price,
        serviceDuration: duration,
        assignedStaffName: r.staff_name !== 'Chưa phân công' ? r.staff_name : undefined,
        assignedStaffId: r.assigned_staff_id || undefined,
        assignedBed: `Giường 0${(index % 6) + 1}`,
        status,
        attributes: {
          style: 'Tự Nhiên',
          curl: 'CC',
          length: '10-12mm',
          thickness: '0.07',
          notes: r.booking_note || 'Khách thích tự nhiên nhẹ nhàng',
        },
        billing: {
          subtotal: price,
          serviceTotal: price,
          productTotal: 0,
          paymentMethod: 'VIETQR' as const,
          tipAmount: 0,
          tipCvShare: 0,
          tipCcShare: 0,
          grandTotal: price,
        },
      };
    });

    return NextResponse.json({
      success: true,
      storeId,
      segment,
      counts,
      count: bookings.length,
      bookings,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching real bookings from MySQL:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Database query error',
        counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
        bookings: [],
      },
      { status: 500 }
    );
  }
}
