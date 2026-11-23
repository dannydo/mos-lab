import mysql from 'mysql2/promise';
import { FastifyInstance } from 'fastify';
import {
  canAccessIosConsultationApp,
  getVietnamDateYmd,
  IOS_SIM_BOOKING_ID_MIN,
  IosBookingItem,
  IosBookingServiceCatalogItem,
  IosCreateBookingRequest,
  IosCreateBookingResponse,
  IosCustomerLookupCandidate,
  isAdminOrSuperAdminRole,
  normalizeCustomerDateOfBirth,
  resolveAssignedSalonStoreId,
  SafeAny,
} from '@mos-lab/shared';
import { getLegacyPool } from './db-pools.js';
import { IosAuthContext } from './ios-auth.service.js';
import { CrmConfigStoreAdapter, defaultIosOverrideRepo } from './ios-overrides.service.js';
import { formatPhoneNumberDots } from './ios-bookings-formatters.js';
import { fetchCustomerEnrichmentContext } from './ios-customer-enrichment.service.js';
import { getSimulationOverrideRepository, saveSimulationCustomBooking } from './ios-simulation.service.js';
import { CustomerCreationService } from '../../customers/services/customer-creation.service.js';
import { BookingSaleClassificationService } from '../../customers/services/booking-sale-classification.service.js';
import { UserServiceTypeService } from '../../customers/services/user-service-type.service.js';
import { BookingAuditService } from '../../customers/services/booking-audit.service.js';

const FALLBACK_SERVICE_CATALOG: IosBookingServiceCatalogItem[] = [
  { serviceId: 1, serviceName: 'Classic 1D', serviceGroup: 'LashesTop', price: 550000, durationMinute: 90 },
  { serviceId: 2, serviceName: 'Flawless Mink 1D', serviceGroup: 'LashesTop', price: 880000, durationMinute: 70 },
  { serviceId: 3, serviceName: 'HyperLight 3X', serviceGroup: 'LashesTop', price: 660000, durationMinute: 70 },
  { serviceId: 4, serviceName: 'HyperLight 4X', serviceGroup: 'LashesTop', price: 770000, durationMinute: 70 },
  { serviceId: 5, serviceName: 'UltraLight 3D', serviceGroup: 'LashesTop', price: 550000, durationMinute: 60 },
];

function normalizeTimeHm(raw: string | undefined): string {
  const cleaned = String(raw || '').trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    const now = new Date();
    const vn = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
    return vn;
  }
  const hh = Math.min(23, Math.max(0, Number(match[1])));
  const mm = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function to12hFormat(hm: string): string {
  const [hhStr, mmStr] = hm.split(':');
  const hh = Number(hhStr || 10);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${mmStr || '00'} ${suffix}`;
}

function formatSqlDateTimeRange(
  dateYmd: string,
  hm: string,
  durationMinutes: number
): {
  mysqlStart: string;
  mysqlEnd: string;
  startDate: Date;
} {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const [hh, mm] = hm.split(':').map(Number);
  const startDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 10, mm || 0, 0));
  const endDate = new Date(startDate.getTime() + Math.max(30, durationMinutes) * 60_000);
  const fmt = (dt: Date) =>
    `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')} ` +
    `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}:00`;
  return {
    mysqlStart: fmt(startDate),
    mysqlEnd: fmt(endDate),
    startDate,
  };
}

function nextSyntheticBookingId(): number {
  return IOS_SIM_BOOKING_ID_MIN + (Date.now() % 30_000_000) * 10 + Math.floor(Math.random() * 10);
}

function nextSyntheticCustomerId(): number {
  return 950_000_000 + (Date.now() % 30_000_000) * 10 + Math.floor(Math.random() * 10);
}

export async function lookupIosCustomersForBooking(
  _fastify: FastifyInstance | null,
  authUser: IosAuthContext,
  queryText: string
): Promise<IosCustomerLookupCandidate[]> {
  if (!canAccessIosConsultationApp(authUser.role, authUser.teamCodes)) {
    return [];
  }
  const q = String(queryText || '').trim();
  if (q.length < 2) {
    return [];
  }

  let pool: mysql.Pool;
  try {
    pool = getLegacyPool();
  } catch {
    return [];
  }

  try {
    const likePattern = `%${q}%`;
    const numericId = /^\d+$/.test(q) ? Number(q) : -1;
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT
         u.id AS customerId,
         up.full_name AS fullName,
         up.last_order_booking AS lastVisitDate,
         (
           SELECT uc.phone_number
           FROM user_contact uc
           WHERE uc.user_id = u.id AND uc.is_disabled = 0
           ORDER BY uc.id DESC
           LIMIT 1
         ) AS rawPhone,
         (
           SELECT COUNT(*)
           FROM \`order\` o
           WHERE o.user_id = u.id AND o.order_state NOT IN ('Cancel', 'Deleted')
         ) AS customerVisits
       FROM user u
       INNER JOIN user_profile up ON up.user_id = u.id
       WHERE up.provider = 'Customer'
         AND up.is_disabled = 0
         AND (
           up.full_name LIKE ?
           OR u.id = ?
           OR EXISTS (
             SELECT 1 FROM user_contact uc2
             WHERE uc2.user_id = u.id AND uc2.is_disabled = 0 AND uc2.phone_number LIKE ?
           )
         )
       ORDER BY up.last_order_booking DESC, u.id DESC
       LIMIT 15`,
      [likePattern, numericId, likePattern]
    );

    if (rows.length === 0) return [];
    const customerIds = rows.map((r) => Number(r.customerId)).filter((id) => id > 0);
    const [balanceRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT
         usb.user_id,
         (usb.normal_count + usb.retain_count) AS remaining_sessions,
         COALESCE(sl.service_name, s.service_key, 'Gói Combo Mi') AS combo_name
       FROM user_service_balance usb
       LEFT JOIN service s ON s.id = usb.service_id
       LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
       WHERE usb.user_id IN (${customerIds.map(() => '?').join(',')})
         AND (usb.normal_count + usb.retain_count) > 0
         AND (usb.date_expired IS NULL OR DATE(usb.date_expired) >= CURDATE())
       ORDER BY usb.id DESC`,
      customerIds
    );

    const balanceByCust = new Map<number, { comboName: string; remainingSessions: number }>();
    for (const br of balanceRows) {
      const uid = Number(br.user_id);
      if (!balanceByCust.has(uid)) {
        balanceByCust.set(uid, {
          comboName: String(br.combo_name || 'Combo Mi'),
          remainingSessions: Number(br.remaining_sessions || 0),
        });
      }
    }

    const nlMap = await defaultIosOverrideRepo.loadCustomerNaturalLashProfilesBatch(customerIds);

    return rows.map((r) => {
      const cid = Number(r.customerId);
      const combo = balanceByCust.get(cid);
      const lastVisitRaw = r.lastVisitDate ? String(r.lastVisitDate).slice(0, 10) : null;
      return {
        customerId: cid,
        fullName: String(r.fullName || `Khách #${cid}`),
        // Always mask phone on lookup cards (UI-010 safety)
        maskedPhone: formatPhoneNumberDots(r.rawPhone ? String(r.rawPhone) : '', true),
        customerVisits: Math.max(1, Number(r.customerVisits || 1)),
        lastVisitDate: lastVisitRaw,
        hasActiveCombo: Boolean(combo),
        comboName: combo?.comboName || null,
        remainingSessions: combo?.remainingSessions,
        naturalLashRecorded: Boolean(nlMap[String(cid)]),
      };
    });
  } catch {
    return [];
  }
}

export async function fetchIosBookingServiceCatalog(
  _fastify: FastifyInstance | null
): Promise<IosBookingServiceCatalogItem[]> {
  try {
    const pool = getLegacyPool();
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT
         s.id AS serviceId,
         COALESCE(sl.service_name, s.service_key) AS serviceName,
         COALESCE(NULLIF(s.service_group, ''), 'LashesTop') AS serviceGroup,
         COALESCE(s.duration_minute_standard, 75) AS durationMinute,
         COALESCE(sp.service_price, 550000) AS price
       FROM service s
       LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
       LEFT JOIN service_price sp ON sp.service_id = s.id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
       WHERE s.is_disabled = 0
         AND (s.service_group IS NULL OR s.service_group IN ('LashesTop', 'Lashes', 'LashesUnder', ''))
         AND COALESCE(sl.service_name, '') <> ''
       ORDER BY s.id ASC
       LIMIT 40`
    );
    if (rows.length > 0) {
      const seen = new Set<number>();
      const catalog: IosBookingServiceCatalogItem[] = [];
      for (const r of rows) {
        const sid = Number(r.serviceId);
        if (!seen.has(sid) && sid > 0) {
          seen.add(sid);
          catalog.push({
            serviceId: sid,
            serviceName: String(r.serviceName),
            serviceGroup: String(r.serviceGroup || 'LashesTop'),
            price: Number(r.price || 550000),
            durationMinute: Number(r.durationMinute || 75),
          });
        }
      }
      if (catalog.length > 0) return catalog;
    }
  } catch {
    // Fallback when running isolated tests
  }
  return FALLBACK_SERVICE_CATALOG;
}

export async function createIosDualModeBooking(
  fastify: FastifyInstance | null,
  authUser: IosAuthContext,
  input: IosCreateBookingRequest,
  baseStore?: CrmConfigStoreAdapter
): Promise<{ statusCode: number; payload: IosCreateBookingResponse }> {
  if (!canAccessIosConsultationApp(authUser.role, authUser.teamCodes)) {
    return {
      statusCode: 403,
      payload: {
        success: false,
        simulationMode: Boolean(input.simulationMode),
        error: 'Tài khoản không có quyền tạo lịch hẹn trên /ios-app.',
      },
    };
  }

  const isAdmin = authUser.careerTier === 'ADMIN' || isAdminOrSuperAdminRole(authUser.role || '');
  const isSimulationMode = Boolean(input.simulationMode);
  const actorStaffId = Number(authUser.legacyStaffId || 13783);
  const actorStaffName = String(authUser.displayName || `Nhân sự #${actorStaffId}`);
  const isCvl = authUser.careerTier === 'CVL';
  const targetDate = String(input.date || getVietnamDateYmd()).slice(0, 10);
  const timeHm = normalizeTimeHm(input.timeSlot);
  const assignedStoreId = resolveAssignedSalonStoreId(authUser.clientStoreId);
  const requestedStoreId = Number(input.storeId);
  const storeId =
    isAdmin && Number.isFinite(requestedStoreId) && requestedStoreId > 0 ? requestedStoreId : assignedStoreId;

  const catalog = await fetchIosBookingServiceCatalog(fastify);
  const matchedService =
    catalog.find((s) => Number(s.serviceId) === Number(input.serviceId)) || catalog[0] || FALLBACK_SERVICE_CATALOG[0];

  const finalServiceId = Number(input.serviceId || matchedService.serviceId || 1);
  const finalServiceName = String(input.serviceName || matchedService.serviceName || 'Classic 1D');
  const finalServicePrice = Number(input.servicePrice ?? matchedService.price ?? 550000);
  const finalServiceDuration = Number(input.serviceDuration || matchedService.durationMinute || 75);

  // Enforce UI-010: CVL may only create bookings assigned to themselves
  const effectiveAssignedStaffId = isCvl
    ? actorStaffId
    : input.assignedStaffId !== undefined
      ? Number(input.assignedStaffId || 0)
      : actorStaffId;
  const effectiveAssignedStaffName =
    effectiveAssignedStaffId === actorStaffId
      ? actorStaffName
      : effectiveAssignedStaffId > 0
        ? `CV #${effectiveAssignedStaffId}`
        : 'Chờ phân công (Đầu tua)';

  if (isSimulationMode) {
    const syntheticBookingId = nextSyntheticBookingId();
    let finalCustomerId = Number(input.existingCustomerId || 0);
    let finalCustomerName = String(input.customerName || '').trim();
    let rawPhone = String(input.customerPhone || '').trim();
    let customerVisits = 1;
    let lastVisitDate: string | undefined;
    let customerDateOfBirth: string | null = null;
    let comboLiveStatus: IosBookingItem['comboLiveStatus'];
    let underMinkComboStatus: IosBookingItem['underMinkComboStatus'];
    let comboWallets: IosBookingItem['comboWallets'];
    let lashHistory: IosBookingItem['lashHistory'];
    let diamondBalance = 0;

    if (input.customerMode === 'EXISTING') {
      if (!finalCustomerId || finalCustomerId <= 0) {
        return {
          statusCode: 400,
          payload: {
            success: false,
            simulationMode: true,
            error: 'Vui lòng chọn một khách hàng quay lại từ danh sách tìm kiếm.',
          },
        };
      }
      try {
        const pool = getLegacyPool();
        const [[custRow]] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT up.full_name, up.last_order_booking,
             DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') AS customer_dob,
             (SELECT uc.phone_number FROM user_contact uc WHERE uc.user_id = up.user_id AND uc.is_disabled = 0 ORDER BY uc.id DESC LIMIT 1) AS phone_number,
             (SELECT COUNT(*) FROM \`order\` o WHERE o.user_id = up.user_id AND o.order_state NOT IN ('Cancel','Deleted')) AS visits
           FROM user_profile up
           LEFT JOIN user u ON u.id = up.user_id
           WHERE up.user_id = ?
           LIMIT 1`,
          [finalCustomerId]
        );
        if (custRow) {
          finalCustomerName = String(custRow.full_name || finalCustomerName || `Khách #${finalCustomerId}`);
          rawPhone = String(custRow.phone_number || rawPhone || '');
          customerVisits = Math.max(1, Number(custRow.visits || 1));
          lastVisitDate = custRow.last_order_booking ? String(custRow.last_order_booking).slice(0, 10) : undefined;
          customerDateOfBirth = normalizeCustomerDateOfBirth(custRow.customer_dob);
        }
        const enrichment = await fetchCustomerEnrichmentContext(pool, [finalCustomerId]);
        comboLiveStatus = enrichment.comboBalanceMap.get(finalCustomerId);
        underMinkComboStatus = enrichment.underMinkComboMap.get(finalCustomerId);
        comboWallets = enrichment.comboWalletsMap.get(finalCustomerId);
        lashHistory = enrichment.lashHistoryMap.get(finalCustomerId);
        diamondBalance = enrichment.diamondBalanceMap.get(finalCustomerId) || 0;
      } catch {
        finalCustomerName = finalCustomerName || `Khách #${finalCustomerId}`;
        customerVisits = 2;
      }
    } else {
      if (!finalCustomerName) {
        return {
          statusCode: 400,
          payload: {
            success: false,
            simulationMode: true,
            error: 'Vui lòng nhập họ tên khách hàng mới.',
          },
        };
      }
      finalCustomerId = nextSyntheticCustomerId();
      customerVisits = 1;
    }

    const simRepo = getSimulationOverrideRepository(actorStaffId, baseStore);
    const existingNl = await simRepo.loadCustomerNaturalLashProfile(finalCustomerId);

    const draftBooking: IosBookingItem = {
      id: syntheticBookingId,
      orderNumber: `SIM-${String(syntheticBookingId).slice(-5)}`,
      customerName: finalCustomerName,
      customerPhone: formatPhoneNumberDots(rawPhone || '0900000000', isCvl),
      customerId: finalCustomerId,
      customerDateOfBirth,
      customerVisits,
      customerNote: String(input.bookingNote || '').trim() || 'Đặt lịch trong Phòng Tập Luyện Mô Phỏng',
      timeSlot: `${timeHm} (${finalServiceDuration}m)`,
      time12h: to12hFormat(timeHm),
      serviceName: finalServiceName,
      servicePrice: finalServicePrice,
      serviceDuration: finalServiceDuration,
      originalBookedServiceName: finalServiceName,
      originalBookedServicePrice: finalServicePrice,
      bookerName: actorStaffName,
      assignedStaffId: effectiveAssignedStaffId,
      assignedStaffName: effectiveAssignedStaffName,
      assignedStaffTier: isCvl ? 'CVL' : authUser.careerTier || 'CC',
      isUnassignedQueue: !effectiveAssignedStaffId,
      isBookedInAdvance: effectiveAssignedStaffId > 0,
      bookingAccessTag: effectiveAssignedStaffId > 0 ? 'MY_BOOKED_CUSTOMER' : 'NEXT_QUEUE_CUSTOMER',
      status: 'INCOMING',
      orderState: 'Confirmed',
      comboLiveStatus,
      underMinkComboStatus,
      comboWallets,
      diamondBalance,
      storeId,
      lastVisitDate,
      lashHistory,
      attributes: existingNl ? ({ ...existingNl } as IosBookingItem['attributes']) : undefined,
      isSimulationBooking: true,
      isSimulationDraftBooking: true,
      simulationAttemptCount: 0,
      simulationFastForwardUnlocked: false,
    };

    await saveSimulationCustomBooking(actorStaffId, targetDate, draftBooking, baseStore);

    return {
      statusCode: 200,
      payload: {
        success: true,
        simulationMode: true,
        bookingId: syntheticBookingId,
        customerId: finalCustomerId,
        booking: draftBooking,
      },
    };
  }

  // LIVE MODE: Persist real customer & legacy MySQL order
  if (!fastify) {
    return {
      statusCode: 500,
      payload: {
        success: false,
        simulationMode: false,
        error: 'Thiếu kết nối Fastify để tạo lịch hẹn Live.',
      },
    };
  }

  try {
    let finalCustomerId = Number(input.existingCustomerId || 0);
    let finalCustomerName = String(input.customerName || '').trim();
    let finalCustomerPhone = String(input.customerPhone || '').trim();
    let finalCustomerDob: string | null = null;

    if (input.customerMode === 'EXISTING') {
      if (!finalCustomerId || finalCustomerId <= 0) {
        return {
          statusCode: 400,
          payload: {
            success: false,
            simulationMode: false,
            error: 'Vui lòng chọn khách hàng quay lại từ danh sách tìm kiếm.',
          },
        };
      }
      const existingRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT up.full_name,
           DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') AS customer_dob,
           (SELECT uc.phone_number FROM user_contact uc WHERE uc.user_id = up.user_id AND uc.is_disabled = 0 ORDER BY uc.id DESC LIMIT 1) AS phone_number
         FROM user_profile up
         LEFT JOIN user u ON u.id = up.user_id
         WHERE up.user_id = ? LIMIT 1`,
        finalCustomerId
      );
      if (existingRows.length > 0) {
        finalCustomerName = String(existingRows[0].full_name || finalCustomerName || `Khách #${finalCustomerId}`);
        finalCustomerPhone = String(existingRows[0].phone_number || finalCustomerPhone || '');
        finalCustomerDob = normalizeCustomerDateOfBirth(existingRows[0].customer_dob);
      }
    } else {
      if (!finalCustomerName || !finalCustomerPhone) {
        return {
          statusCode: 400,
          payload: {
            success: false,
            simulationMode: false,
            error: 'Khách mới bắt buộc nhập đầy đủ Tên khách hàng và Số điện thoại.',
          },
        };
      }
      const existingByPhone = await CustomerCreationService.findCustomerIdByPhone(fastify, finalCustomerPhone);
      if (existingByPhone) {
        finalCustomerId = existingByPhone;
      } else {
        const created = await CustomerCreationService.create(
          fastify,
          {
            id: Number(authUser.id || 0),
            displayName: actorStaffName,
          },
          { name: finalCustomerName, phone: finalCustomerPhone }
        );
        finalCustomerId = created.customer.id;
        finalCustomerName = created.customer.name;
        finalCustomerPhone = created.customer.phone;
      }
    }

    const { mysqlStart, mysqlEnd, startDate } = formatSqlDateTimeRange(targetDate, timeHm, finalServiceDuration);
    const serviceGroup = matchedService.serviceGroup || 'LashesTop';

    const { isNew, comboSaleRequired } = await BookingSaleClassificationService.determineBookingSaleClassification(
      fastify,
      finalCustomerId,
      startDate,
      serviceGroup
    );
    const userServiceType = await UserServiceTypeService.determineUserServiceType(
      fastify,
      finalCustomerId,
      mysqlStart,
      serviceGroup
    );

    const orderKey = 'ios_bk_' + Math.random().toString(36).slice(2, 12);
    const techIdOrNull = effectiveAssignedStaffId > 0 ? effectiveAssignedStaffId : null;
    const finalNote = String(input.bookingNote || '').trim();

    await fastify.prisma.legacy.$executeRawUnsafe(
      `INSERT INTO \`order\` (
        client_id, client_business_id, created_staff_id, order_key, client_store_id,
        user_id, currency_id, booking_note, booking_channels, booking_duration_minute,
        booking_date_start, booking_date_end, total_quantity, total_price, order_state,
        last_day_order_completed, combo_sale_required, is_new, is_debt, date_created, date_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      11,
      1,
      actorStaffId,
      orderKey,
      storeId,
      finalCustomerId,
      1,
      finalNote,
      isCvl ? 'WalkIn' : 'CC',
      finalServiceDuration,
      mysqlStart,
      mysqlEnd,
      1,
      finalServicePrice,
      'Confirmed',
      0,
      comboSaleRequired,
      isNew,
      0
    );

    const insertedOrder = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT id FROM \`order\` WHERE order_key = ? LIMIT 1`,
      orderKey
    );
    if (insertedOrder.length === 0) {
      throw new Error('Không thể khởi tạo đơn hàng mới trong Legacy DB.');
    }
    const orderId = Number(insertedOrder[0].id);

    await fastify.prisma.legacy.$executeRawUnsafe(
      `INSERT INTO order_booking_date_change (
        created_staff_id, order_id, client_store_id, assigned_staff_id,
        booking_note, booking_duration_minute, booking_date_start, booking_date_end, date_created
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      actorStaffId,
      orderId,
      storeId,
      techIdOrNull,
      finalNote,
      finalServiceDuration,
      mysqlStart,
      mysqlEnd
    );

    await fastify.prisma.legacy.$executeRawUnsafe(
      `INSERT INTO order_service (
        client_id, client_business_id, user_id, order_id, service_id,
        service_type, service_group, user_service_type, assigned_staff_id, booked_staff_id,
        duration_minute, quantity, service_price, discount_amount, paid_credit_amount,
        tax_amount, balance_price, upgrade_price, downgrade_price, refund_price, total_price, date_created
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      11,
      1,
      finalCustomerId,
      orderId,
      finalServiceId,
      'Normal',
      serviceGroup,
      userServiceType || 'lead_book',
      techIdOrNull,
      techIdOrNull,
      finalServiceDuration,
      1,
      finalServicePrice,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      finalServicePrice
    );

    await BookingAuditService.logAction(fastify, {
      orderId,
      actionType: 'EDIT',
      actorStaffId,
      actorStaffName,
      reasonCategory: 'IOS_BOOKING_CREATE',
      reasonNote: 'Tạo lịch hẹn từ /ios-app',
      newData: { source: 'ios-app', customerMode: input.customerMode, serviceId: finalServiceId },
    });

    return {
      statusCode: 200,
      payload: {
        success: true,
        simulationMode: false,
        bookingId: orderId,
        customerId: finalCustomerId,
        booking: {
          id: orderId,
          orderNumber: `#${orderId}`,
          customerName: finalCustomerName,
          customerPhone: formatPhoneNumberDots(finalCustomerPhone, isCvl),
          customerId: finalCustomerId,
          customerDateOfBirth: finalCustomerDob,
          customerVisits: isNew ? 1 : 2,
          customerNote: finalNote,
          timeSlot: `${timeHm} (${finalServiceDuration}m)`,
          time12h: to12hFormat(timeHm),
          serviceName: finalServiceName,
          servicePrice: finalServicePrice,
          serviceDuration: finalServiceDuration,
          assignedStaffId: effectiveAssignedStaffId,
          assignedStaffName: effectiveAssignedStaffName,
          status: 'INCOMING',
          orderState: 'Confirmed',
          storeId,
        },
      },
    };
  } catch (err: SafeAny) {
    return {
      statusCode: err?.statusCode || 400,
      payload: {
        success: false,
        simulationMode: false,
        error: err?.message || 'Không thể tạo lịch hẹn mới.',
      },
    };
  }
}
