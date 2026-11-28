import mysql from 'mysql2/promise';
import { FastifyInstance } from 'fastify';
import { canAccessIosConsultationApp, IosBookingServiceCatalogItem, IosCustomerLookupCandidate } from '@mos-lab/shared';
import { getLegacyPool } from './db-pools.js';
import { IosAuthContext } from './ios-auth.service.js';
import { defaultIosOverrideRepo } from './ios-overrides.service.js';
import { formatPhoneNumberDots } from './ios-bookings-formatters.js';

export const FALLBACK_SERVICE_CATALOG: IosBookingServiceCatalogItem[] = [
  { serviceId: 1, serviceName: 'Classic 1D', serviceGroup: 'LashesTop', price: 550000, durationMinute: 90 },
  { serviceId: 2, serviceName: 'Flawless Mink 1D', serviceGroup: 'LashesTop', price: 880000, durationMinute: 70 },
  { serviceId: 3, serviceName: 'HyperLight 3X', serviceGroup: 'LashesTop', price: 660000, durationMinute: 70 },
  { serviceId: 4, serviceName: 'HyperLight 4X', serviceGroup: 'LashesTop', price: 770000, durationMinute: 70 },
  { serviceId: 5, serviceName: 'UltraLight 3D', serviceGroup: 'LashesTop', price: 550000, durationMinute: 60 },
  {
    serviceId: 127,
    serviceName: 'Flawless Under Mink 390K (Mi Dưới Mới)',
    serviceGroup: 'LashesUnder',
    price: 390000,
    durationMinute: 25,
  },
  {
    serviceId: 128,
    serviceName: 'Dặm Mi Dưới 250K',
    serviceGroup: 'LashesUnder',
    price: 250000,
    durationMinute: 20,
  },
];

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
       ORDER BY (s.service_group = 'LashesUnder') ASC, s.id ASC
       LIMIT 60`
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
