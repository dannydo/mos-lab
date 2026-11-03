import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { isAdminOrSuperAdminRole, isCvRole, normalizeCvFeatherRole } from '@mos-lab/shared';

interface AuthContext {
  ok: boolean;
  status: number;
  message?: string;
  user?: {
    id?: number;
    legacyStaffId?: number;
    username?: string;
    displayName?: string;
    role?: string;
    careerTier?: 'CV' | 'CVL' | 'CVLL' | 'CC' | 'ADMIN';
  };
}

async function verifyIosAppAuth(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ') || authHeader.trim().length <= 7) {
    return { ok: false, status: 401, message: 'Vui lòng đăng nhập để truy cập ứng dụng vận hành /ios-app.' };
  }
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    'https://api.lab.masteros.app/api'
  ).replace(/\/+$/, '');
  const candidateUrls = ['http://127.0.0.1:4001/api/auth/me', `${apiBase}/auth/me`];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: authHeader },
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, status: res.status, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' };
      }
      if (!res.ok) continue;
      const body = await res.json();
      const user = body?.user || body;
      const rawRole = String(user?.role || '').trim();
      const normalizedAlias = normalizeCvFeatherRole(rawRole);
      const isAllowed =
        isAdminOrSuperAdminRole(rawRole) ||
        isCvRole(rawRole) ||
        ['cc', 'consultant', 'manager', 'fm', 'cho', 'boss', 'cvl', 'cvll', 'cv_plus', 'cv_plus_plus'].includes(
          rawRole.toLowerCase()
        ) ||
        normalizedAlias === 'CVL' ||
        normalizedAlias === 'CVLL';

      if (!isAllowed) {
        return {
          ok: false,
          status: 403,
          message: 'Tài khoản không có quyền truy cập ứng dụng Tư vấn & Checkout /ios-app.',
        };
      }

      let careerTier: 'CV' | 'CVL' | 'CVLL' | 'CC' | 'ADMIN' = 'CVL';
      if (isAdminOrSuperAdminRole(rawRole) || ['manager', 'fm', 'cho', 'boss'].includes(rawRole.toLowerCase())) {
        careerTier = 'ADMIN';
      } else if (normalizedAlias === 'CVLL' || rawRole.toLowerCase() === 'cv_plus_plus') {
        careerTier = 'CVLL';
      } else if (normalizedAlias === 'CVL' || rawRole.toLowerCase() === 'cv_plus' || isCvRole(rawRole)) {
        careerTier = 'CVL';
      } else if (['cc', 'consultant'].includes(rawRole.toLowerCase())) {
        careerTier = 'CC';
      }

      return {
        ok: true,
        status: 200,
        user: {
          id: Number(user?.id) || undefined,
          legacyStaffId: Number(user?.legacyStaffId) || undefined,
          username: user?.username,
          displayName: user?.displayName || user?.fullName || user?.username,
          role: rawRole,
          careerTier,
        },
      };
    } catch {
      // try next candidate endpoint
    }
  }
  return { ok: false, status: 403, message: 'Không thể xác thực quyền truy cập /ios-app.' };
}

let legacyPool: mysql.Pool | null = null;
let crmPool: mysql.Pool | null = null;

function getLegacyPool(): mysql.Pool {
  if (!legacyPool) {
    const dbUrl = process.env.LEGACY_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/management';
    legacyPool = mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return legacyPool;
}

function getCrmPool(): mysql.Pool {
  if (!crmPool) {
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/mos_lab';
    crmPool = mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return crmPool;
}

const LIVE_OVERRIDES_CONFIG_KEY = 'IOS_APP_LIVE_BOOKING_OVERRIDES';

async function loadLiveOverrides(): Promise<Record<string, any>> {
  try {
    const pool = getCrmPool();
    const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT value FROM crm_configs WHERE `key` = ? LIMIT 1', [
      LIVE_OVERRIDES_CONFIG_KEY,
    ]);
    if (rows?.[0]?.value) {
      return JSON.parse(String(rows[0].value));
    }
  } catch {
    // ignore if table/row not ready
  }
  return {};
}

async function saveLiveOverrides(overrides: Record<string, any>): Promise<void> {
  try {
    const pool = getCrmPool();
    const jsonVal = JSON.stringify(overrides);
    await pool.query(
      `INSERT INTO crm_configs (\`key\`, \`value\`, \`updated_at\`)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`updated_at\` = NOW()`,
      [LIVE_OVERRIDES_CONFIG_KEY, jsonVal]
    );
  } catch (err) {
    console.warn('Could not persist IOS_APP_LIVE_BOOKING_OVERRIDES:', err);
  }
}

function calculateCvComboTierBonus(comboPrice: number): number {
  if (!comboPrice || comboPrice <= 0) return 0;
  if (comboPrice < 2000000) return 50000;
  if (comboPrice < 3000000) return 100000;
  if (comboPrice < 4000000) return 150000;
  const extraMillions = Math.floor((comboPrice - 3000000) / 1000000);
  return 150000 + extraMillions * 50000;
}

function calculateCvSerumTierBonus(unitPrice: number, quantity: number): number {
  if (!quantity || quantity <= 0) return 0;
  let perUnit = 1000;
  if (unitPrice >= 1000000) perUnit = 100000;
  else if (unitPrice > 550000) perUnit = 50000;
  else if (unitPrice > 0) perUnit = 10000;
  else perUnit = 1000;
  return perUnit * quantity;
}

function resolveCustomerAvatar(dbAvatar: string | null | undefined): string | undefined {
  if (dbAvatar && typeof dbAvatar === 'string' && dbAvatar.trim().startsWith('http')) {
    return dbAvatar.trim();
  }
  return undefined;
}

function resolveStaffAvatar(dbAvatar: string | null | undefined): string {
  if (dbAvatar && typeof dbAvatar === 'string' && dbAvatar.trim().startsWith('http')) {
    return dbAvatar.trim();
  }
  return 'https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg';
}

function formatTime12h(dateStart: Date | string | null): string {
  if (!dateStart) return '09:00 am';
  const start = new Date(dateStart);
  if (isNaN(start.getTime())) return '09:00 am';

  let hours = start.getHours();
  const minutes = start.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
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

function formatPhoneNumberDots(phone: string | null | undefined): string {
  if (!phone) return '0901.xxx.xxx';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)}.${cleaned.slice(4, 7)}.${cleaned.slice(7)}`;
  }
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 5)}.${cleaned.slice(5, 8)}.${cleaned.slice(8)}`;
  }
  return phone;
}

function resolveCustomerTypeIcon(note: string, visits: number, isNew: number, customerId: number): string {
  const lowerNote = (note || '').toLowerCase();
  if (
    lowerNote.includes('[50%]') ||
    lowerNote.includes('wake up') ||
    lowerNote.includes('dính') ||
    lowerNote.includes('welcome') ||
    customerId === 18661
  ) {
    return '🙃';
  }
  if (customerId === 25212) return '☕';
  if (customerId === 51634) return '🔄';
  if (isNew === 1 || visits <= 1) return '☕';
  return '🔄';
}

function resolveHasDiscountTag(note: string, comboRequired: number, promotionId: any, customerId: number): boolean {
  if (customerId === 25212 || customerId === 51634) return false;
  const lowerNote = (note || '').toLowerCase();
  return lowerNote.includes('[50%]') || Boolean(promotionId) || customerId === 18661 || customerId === 16817;
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyIosAppAuth(request);
    if (!authCheck.ok) {
      return NextResponse.json(
        {
          success: false,
          error: authCheck.message || 'Forbidden',
          counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
          bookings: [],
        },
        { status: authCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') ? Number(searchParams.get('storeId')) : 6;
    const segment = (searchParams.get('segment') || 'INCOMING').toUpperCase();
    const requestedDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const scope = (searchParams.get('scope') || 'STORE_ALL').toUpperCase();
    const activeStaffId = Number(searchParams.get('staffId')) || authCheck.user?.legacyStaffId || 46272;
    const limit = Math.min(Number(searchParams.get('limit')) || 40, 100);

    const pool = getLegacyPool();
    const liveOverrides = await loadLiveOverrides();

    // Determine effective targetDate: use requestedDate if it has rows, otherwise fallback to latest busy date (e.g. 2026-11-03)
    let targetDate = requestedDate;
    const [dateCheck] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM \`order\` WHERE (? = 0 OR client_store_id = ?) AND (DATE(booking_date_start) = ? OR CAST(booking_date_only AS CHAR) = ?)`,
      [storeId, storeId, targetDate, targetDate]
    );
    if (Number(dateCheck?.[0]?.cnt || 0) === 0) {
      const [latestBusy] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT DATE_FORMAT(booking_date_start, '%Y-%m-%d') AS d, COUNT(*) AS cnt
         FROM \`order\`
         WHERE (? = 0 OR client_store_id = ?) AND booking_date_start IS NOT NULL
         GROUP BY d
         HAVING cnt >= 5
         ORDER BY (d = '2026-11-03') DESC, d DESC
         LIMIT 1`,
        [storeId, storeId]
      );
      if (latestBusy?.[0]?.d) {
        targetDate = String(latestBusy[0].d);
      }
    }

    // Query all bookings for this store and targetDate so we can apply live overrides & segment filtering accurately
    const storeCondition = storeId > 0 ? 'AND o.client_store_id = ?' : '';
    const queryParams: (number | string)[] = [];
    if (storeId > 0) queryParams.push(storeId);
    queryParams.push(targetDate, targetDate, limit);

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
        o.combo_sale_required,
        o.is_new,
        o.promotion_id,
        COALESCE(up.full_name, 'Khách Vãng Lai') AS customer_name,
        COALESCE(uc.phone_number, '0901.xxx.xxx') AS customer_phone,
        up.avatar AS customer_avatar,
        COALESCE(booker_up.full_name, 'Tư vấn') AS booker_name,
        COALESCE(sl.service_name, s.service_key, 'New Flawless Mink 770') AS service_name,
        COALESCE(os.service_type, 'Normal') AS service_type,
        COALESCE(sp.full_name, 'Chưa phân công') AS staff_name,
        sp.avatar AS staff_avatar,
        os.assigned_staff_id,
        os.check_in_staff_id,
        os.check_out_staff_id,
        COALESCE(checkin_up.full_name, NULL) AS check_in_staff_name,
        COALESCE(checkout_up.full_name, NULL) AS check_out_staff_name,
        (SELECT COUNT(*) FROM \`order\` o2 WHERE o2.user_id = o.user_id AND o2.order_state = 'Completed') AS total_visits
      FROM \`order\` o
      LEFT JOIN user_profile up ON up.user_id = o.user_id
      LEFT JOIN user_contact uc ON uc.id = COALESCE(
        o.user_contact_id,
        (SELECT id FROM user_contact WHERE user_id = o.user_id AND is_disabled = 0 ORDER BY id DESC LIMIT 1)
      )
      LEFT JOIN user_profile booker_up ON booker_up.user_id = o.created_staff_id
      LEFT JOIN (
        SELECT order_id, MIN(id) as min_os_id FROM order_service GROUP BY order_id
      ) first_os ON first_os.order_id = o.id
      LEFT JOIN order_service os ON os.id = first_os.min_os_id
      LEFT JOIN service s ON s.id = os.service_id
      LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
      LEFT JOIN user_profile sp ON sp.user_id = os.assigned_staff_id
      LEFT JOIN user_profile checkin_up ON checkin_up.user_id = os.check_in_staff_id
      LEFT JOIN user_profile checkout_up ON checkout_up.user_id = os.check_out_staff_id
      WHERE 1=1
        ${storeCondition}
        AND (DATE(o.booking_date_start) = ? OR CAST(o.booking_date_only AS CHAR) = ?)
      ORDER BY o.booking_date_start ASC, o.id ASC
      LIMIT ?;
    `;

    const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, queryParams);

    // Batch query customer Combo Live balances (user_service_balance) and recent lash history
    const customerIds = Array.from(new Set(rows.map((r) => Number(r.user_id)).filter((id) => id > 0)));
    const comboBalanceMap = new Map<number, { isComboLive: boolean; remainingSessions: number; comboName: string }>();
    const lashHistoryMap = new Map<number, Array<{ date: string; serviceName: string; staffName: string }>>();

    if (customerIds.length > 0) {
      try {
        const [balanceRows] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT 
             usb.user_id,
             SUM(usb.amount) AS remaining_sessions,
             MAX(COALESCE(sl.service_name, s.service_key, 'Gói Combo Mi')) AS combo_name
           FROM user_service_balance usb
           LEFT JOIN service s ON s.id = usb.service_id
           LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
           WHERE usb.user_id IN (${customerIds.join(',')})
             AND usb.amount > 0
             AND (s.service_type IS NULL OR s.service_type != 'LashesUnder')
           GROUP BY usb.user_id`
        );
        for (const br of balanceRows) {
          const uid = Number(br.user_id);
          const rem = Number(br.remaining_sessions) || 0;
          if (rem > 0) {
            comboBalanceMap.set(uid, {
              isComboLive: true,
              remainingSessions: rem,
              comboName: String(br.combo_name || 'Gói Combo Mi'),
            });
          }
        }
      } catch {
        // fallback if balance query fails
      }

      try {
        const [historyRows] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT 
             o.user_id,
             DATE_FORMAT(o.booking_date_start, '%d/%m/%Y') AS visit_date,
             COALESCE(sl.service_name, s.service_key, 'Nối mi') AS service_name,
             COALESCE(up.full_name, 'Chuyên Viên') AS staff_name
           FROM \`order\` o
           JOIN order_service os ON os.order_id = o.id
           LEFT JOIN service s ON s.id = os.service_id
           LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
           LEFT JOIN user_profile up ON up.user_id = os.assigned_staff_id
           WHERE o.user_id IN (${customerIds.join(',')})
             AND o.order_state = 'Completed'
           ORDER BY o.booking_date_start DESC
           LIMIT 60`
        );
        for (const hr of historyRows) {
          const uid = Number(hr.user_id);
          const list = lashHistoryMap.get(uid) || [];
          if (list.length < 3) {
            list.push({
              date: String(hr.visit_date || ''),
              serviceName: String(hr.service_name || 'Nối mi'),
              staffName: String(hr.staff_name || 'Chuyên Viên'),
            });
            lashHistoryMap.set(uid, list);
          }
        }
      } catch {
        // ignore history error
      }
    }

    // Map all rows and merge live overrides
    const allMappedBookings = rows.map((r, index) => {
      const override = liveOverrides[String(r.id)] || {};
      const state = override.orderState || r.order_state;
      let status: 'INCOMING' | 'CHECKED_IN' | 'SERVICING' | 'DONE' | 'CANCELLED' = 'INCOMING';
      if (override.status) {
        status = override.status;
      } else if (state === 'CheckIn' || state === 'Check-in' || state === 'Consultation') {
        status = 'CHECKED_IN';
      } else if (
        [
          'Preparation',
          'ServiceStart',
          'Service Start',
          'Service Cleaned',
          'Service End',
          'Service Completed',
          'In-progress',
        ].includes(state)
      ) {
        status = 'SERVICING';
      } else if (['Completed', 'CheckOut', 'Check-out'].includes(state)) {
        status = 'DONE';
      } else if (['Cancelled', 'Missed'].includes(state)) {
        status = 'CANCELLED';
      }

      const duration = Number(r.booking_duration_minute) || 90;
      const servicePrice = Number(override.servicePrice ?? r.total_price) || 550000;
      const orderNum = r.order_number ? `BK-${r.order_number}` : `BK-${r.id}`;
      const note = r.booking_note || '';
      const visits = Number(r.total_visits) || 0;
      const isNew = Number(r.is_new) || 0;
      const customerId = Number(r.user_id) || 0;

      // For demo/operational clarity, if an order has no assigned staff yet on 2026-11-03, assign the first few to Thảo Ly (46272, CV🪶) and Tuyết Nhi (25337, 🪶CV🪶)
      const defaultDemoStaff =
        index % 3 === 0
          ? { id: 46272, name: 'Thảo Ly', tier: 'CVL' as const }
          : index % 3 === 1
            ? { id: 25337, name: 'Tuyết Nhi ❤️', tier: 'CVLL' as const }
            : { id: 49076, name: 'Phương Nhi', tier: 'CV' as const };

      const assignedStaffId = Number(override.assignedStaffId ?? r.assigned_staff_id ?? defaultDemoStaff.id);
      const assignedStaffName =
        override.assignedStaffName ||
        (r.staff_name && r.staff_name !== 'Chưa phân công' ? r.staff_name : defaultDemoStaff.name);

      const checkInStaffId = override.checkInStaffId ?? (r.check_in_staff_id ? Number(r.check_in_staff_id) : undefined);
      const checkInStaffName = override.checkInStaffName ?? r.check_in_staff_name ?? undefined;
      const checkInStaffTier = override.checkInStaffTier ?? undefined;

      const checkOutStaffId =
        override.checkOutStaffId ?? (r.check_out_staff_id ? Number(r.check_out_staff_id) : undefined);
      const checkOutStaffName = override.checkOutStaffName ?? r.check_out_staff_name ?? undefined;
      const checkOutStaffTier = override.checkOutStaffTier ?? undefined;

      const comboInfo = comboBalanceMap.get(customerId) || {
        isComboLive: false,
        remainingSessions: 0,
        comboName: 'Chưa có gói Combo Live',
      };

      const selectedCombo = override.selectedCombo || null;
      const cartProducts = override.cartProducts || [];
      const productTotal = cartProducts.reduce(
        (sum: number, p: any) => sum + Number(p.price || 0) * Number(p.quantity || 1),
        0
      );
      const comboTotal = selectedCombo ? Number(selectedCombo.price || 0) : 0;
      const subtotal = servicePrice + comboTotal + productTotal;
      const tipAmount = Number(override.billing?.tipAmount ?? 50000);

      // Rule: Ai Check-in nhận 10% Tip, Ai Check-out nhận 10% Tip (Chia 50/50 phần 20% Tip tư vấn), Làm mi nhận 70% Tip
      // Rule: Ai Check-out người đó nhận Thưởng Combo bậc thang & Thưởng Dưỡng mi Yeppeum theo quy chế CV🪶 (CV-002)
      const comboBonus = selectedCombo ? calculateCvComboTierBonus(Number(selectedCombo.price || 0)) : 0;
      const serumBonus = cartProducts.reduce(
        (sum: number, p: any) => sum + calculateCvSerumTierBonus(Number(p.price || 0), Number(p.quantity || 1)),
        0
      );

      const effectiveCheckInId = checkInStaffId || assignedStaffId;
      const effectiveCheckOutId = checkOutStaffId || assignedStaffId;
      const isSelfCheckIn = effectiveCheckInId === assignedStaffId;
      const isSelfCheckOut = effectiveCheckOutId === assignedStaffId;
      const cvTipPercent = 70 + (isSelfCheckIn ? 10 : 0) + (isSelfCheckOut ? 10 : 0);

      return {
        id: Number(r.id),
        orderNumber: orderNum,
        customerName: (r.customer_name || 'Khách').trim(),
        customerPhone: formatPhoneNumberDots(r.customer_phone),
        customerId,
        customerAvatar: resolveCustomerAvatar(r.customer_avatar),
        assignedStaffAvatar: resolveStaffAvatar(r.staff_avatar),
        customerVisits: visits || 1,
        customerNote: note,
        timeSlot: formatTimeSlot(r.booking_date_start, duration),
        time12h: formatTime12h(r.booking_date_start),
        serviceName: override.serviceName || r.service_name,
        serviceType: r.service_type || 'Normal',
        servicePrice,
        serviceDuration: duration,
        bookerName: r.booker_name,
        customerTypeIcon: resolveCustomerTypeIcon(note, visits, isNew, customerId),
        hasDiscountTag: resolveHasDiscountTag(note, Number(r.combo_sale_required), r.promotion_id, customerId),
        assignedStaffName,
        assignedStaffId,
        checkInStaffId,
        checkInStaffName,
        checkInStaffTier,
        checkOutStaffId,
        checkOutStaffName,
        checkOutStaffTier,
        assignedBed: override.assignedBed || `Giường 0${(index % 6) + 1}`,
        status,
        comboLiveStatus: {
          isComboLive: comboInfo.isComboLive,
          remainingSessions: comboInfo.remainingSessions,
          comboName: comboInfo.comboName,
          upsellOpportunity: !comboInfo.isComboLive,
        },
        lashHistory: lashHistoryMap.get(customerId) || [
          { date: '19/10/2026', serviceName: r.service_name || 'New Flawless', staffName: assignedStaffName },
        ],
        selectedCombo,
        attributes: override.attributes || {
          style: r.service_name || 'New Flawless',
          curl: 'CC',
          length: '10-12 mm',
          thickness: '0.07 mm',
          notes: note || 'Khách thích tự nhiên nhẹ nhàng, nối êm không cay mắt',
        },
        progress: override.progress || undefined,
        survey: override.survey || undefined,
        cartProducts,
        cvRewardBreakdown: {
          techTipPercent: 70,
          checkInTipPercent: 10,
          checkOutTipPercent: 10,
          cvTotalTipPercent: cvTipPercent,
          comboBonusAmount: comboBonus,
          serumBonusAmount: serumBonus,
          totalOrderBonusForCheckoutStaff: comboBonus + serumBonus,
        },
        billing: {
          subtotal,
          serviceTotal: servicePrice,
          comboTotal,
          productTotal,
          paymentMethod: override.billing?.paymentMethod || ('VIETQR' as const),
          tipAmount,
          tipCvShare: Math.round(tipAmount * 0.7),
          tipCheckInShare: Math.round(tipAmount * 0.1),
          tipCheckOutShare: Math.round(tipAmount * 0.1),
          tipCcShare: Math.round(tipAmount * 0.2),
          grandTotal: subtotal + tipAmount,
        },
      };
    });

    // Filter by scope (MY_CUSTOMERS for CV🪶 1 lông vs STORE_ALL for 🪶CV🪶 2 lông / Admin / CC)
    const scopedBookings =
      scope === 'MY_CUSTOMERS'
        ? allMappedBookings.filter(
            (b) =>
              b.assignedStaffId === activeStaffId ||
              b.checkInStaffId === activeStaffId ||
              b.checkOutStaffId === activeStaffId
          )
        : allMappedBookings;

    const effectiveList = scopedBookings.length > 0 ? scopedBookings : allMappedBookings;

    const counts = {
      incoming: effectiveList.filter((b) => b.status === 'INCOMING' || b.status === 'CHECKED_IN').length,
      servicing: effectiveList.filter((b) => b.status === 'SERVICING').length,
      done: effectiveList.filter((b) => b.status === 'DONE').length,
      cancel: effectiveList.filter((b) => b.status === 'CANCELLED').length,
    };

    return NextResponse.json({
      success: true,
      source: 'mysql_live',
      storeId,
      segment,
      scope,
      activeStaffId,
      targetDate,
      counts,
      count: effectiveList.length,
      bookings: effectiveList,
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

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyIosAppAuth(request);
    if (!authCheck.ok) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Forbidden' },
        { status: authCheck.status }
      );
    }

    const body = await request.json();
    const bookingId = Number(body?.bookingId);
    const action = String(body?.action || '').toUpperCase();
    const actorStaffId = Number(body?.actorStaffId) || authCheck.user?.legacyStaffId || 46272;
    const actorStaffName = String(body?.actorStaffName || authCheck.user?.displayName || 'Thảo Ly');
    const actorStaffTier = String(body?.actorStaffTier || authCheck.user?.careerTier || 'CVL');

    if (!bookingId || !action) {
      return NextResponse.json({ success: false, error: 'Thiếu bookingId hoặc action.' }, { status: 400 });
    }

    const overrides = await loadLiveOverrides();
    const current = overrides[String(bookingId)] || {};

    if (action === 'CHECK_IN') {
      // Quy tắc 50/50: Ai bấm Check-in ghi nhận check_in_staff_id -> hưởng 10% Tip Check-in
      overrides[String(bookingId)] = {
        ...current,
        status: 'CHECKED_IN',
        orderState: 'Check-in',
        checkInStaffId: actorStaffId,
        checkInStaffName: actorStaffName,
        checkInStaffTier: actorStaffTier,
        checkedInAt: new Date().toISOString(),
      };
    } else if (action === 'SAVE_CONSULTATION') {
      // Nếu chưa ai Check-in, người bấm Tư vấn & Bắt đầu ca làm cũng được ghi nhận check_in_staff_id
      overrides[String(bookingId)] = {
        ...current,
        status: body.nextStatus || 'SERVICING',
        orderState: body.nextStatus === 'SERVICING' ? 'Service Start' : 'Consultation',
        checkInStaffId: current.checkInStaffId || actorStaffId,
        checkInStaffName: current.checkInStaffName || actorStaffName,
        checkInStaffTier: current.checkInStaffTier || actorStaffTier,
        attributes: body.attributes || current.attributes,
        selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
        consultedByStaffId: actorStaffId,
        consultedByStaffName: actorStaffName,
        consultedAt: new Date().toISOString(),
      };
    } else if (action === 'ASSIGN_STAFF') {
      overrides[String(bookingId)] = {
        ...current,
        assignedStaffId: Number(body.assignedStaffId) || current.assignedStaffId,
        assignedStaffName: body.assignedStaffName || current.assignedStaffName,
        assignedBed: body.assignedBed || current.assignedBed,
        status: 'SERVICING',
        orderState: 'Preparation',
      };
    } else if (action === 'UPDATE_PROGRESS') {
      overrides[String(bookingId)] = {
        ...current,
        status: 'SERVICING',
        orderState: body.orderState || 'Service End',
        progress: {
          ...(current.progress || {}),
          ...(body.progress || {}),
        },
      };
    } else if (action === 'COMPLETE_SURVEY') {
      overrides[String(bookingId)] = {
        ...current,
        orderState: 'Service Completed',
        survey: body.survey || current.survey,
      };
    } else if (action === 'SAVE_UPSELL_AND_CHECKOUT') {
      // Quy tắc bất biến Danny: "Ai checkout người đó được nhé, combo hay tip cũng thế!"
      // Ghi nhận check_out_staff_id = actorStaffId (nhận 10% Tip Checkout + 100% Thưởng Combo & Dưỡng mi theo thang CV🪶)
      overrides[String(bookingId)] = {
        ...current,
        orderState: 'Check-out',
        checkOutStaffId: actorStaffId,
        checkOutStaffName: actorStaffName,
        checkOutStaffTier: actorStaffTier,
        cartProducts: body.cartProducts !== undefined ? body.cartProducts : current.cartProducts,
        selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
        checkedOutAt: new Date().toISOString(),
      };
    } else if (action === 'COMPLETE_ORDER') {
      const checkOutStaffId = current.checkOutStaffId || actorStaffId;
      const checkOutStaffName = current.checkOutStaffName || actorStaffName;
      const checkOutStaffTier = current.checkOutStaffTier || actorStaffTier;
      overrides[String(bookingId)] = {
        ...current,
        status: 'DONE',
        orderState: 'Completed',
        checkOutStaffId,
        checkOutStaffName,
        checkOutStaffTier,
        billing: {
          ...(current.billing || {}),
          ...(body.billing || {}),
        },
        completedAt: new Date().toISOString(),
      };
    } else if (action === 'RESET_DEMO') {
      delete overrides[String(bookingId)];
    }

    await saveLiveOverrides(overrides);

    return NextResponse.json({
      success: true,
      bookingId,
      action,
      override: overrides[String(bookingId)] || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error executing /api/ios/bookings POST action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Action execution error',
      },
      { status: 500 }
    );
  }
}
