import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  canAccessIosConsultationApp,
  isAdminOrSuperAdminRole,
  normalizeCvFeatherRole,
  formatComboName,
  maskPhoneNumber,
  canViewUnmaskedCustomerPhone,
  SafeAny,
} from '@mos-lab/shared';
import { INITIAL_BOOKINGS, BookingItem } from './mock-data.js';

function getLashUploadsDir(): string {
  const vpsBase = '/home/web/mos-data/lash-progress';
  return vpsBase;
}

function getLocalFallbackDir(): string {
  return path.resolve(process.cwd(), 'uploads/lash-progress');
}

async function persistProgressPhotoToCloud(bookingId: number, type: string, dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length < 3) return dataUrl;
    const ext = matches[1].replace('jpeg', 'jpg');
    const buffer = Buffer.from(matches[2], 'base64');

    const filename = `${bookingId}_${type}_${Date.now()}.${ext}`;

    // 1. VPS storage
    try {
      const vpsDir = getLashUploadsDir();
      await fs.mkdir(vpsDir, { recursive: true });
      await fs.writeFile(path.join(vpsDir, filename), buffer);
    } catch {
      // 2. Fallback to local cwd
      const localDir = getLocalFallbackDir();
      await fs.mkdir(localDir, { recursive: true });
      await fs.writeFile(path.join(localDir, filename), buffer);
    }

    return `/api/ios/photos/${filename}`;
  } catch (err) {
    console.warn('[modules/ios/routes] Failed to save progress photo:', err);
    return dataUrl;
  }
}

let legacyPool: mysql.Pool | null = null;
let crmPool: mysql.Pool | null = null;

function getLegacyPool(): mysql.Pool {
  if (!legacyPool) {
    const dbUrl = process.env.LEGACY_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/management';
    legacyPool = mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 4,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return legacyPool;
}

function getCrmPool(): mysql.Pool {
  if (!crmPool) {
    const dbUrl =
      process.env.CRM_DATABASE_URL || process.env.DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/mos_lab';
    crmPool = mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 4,
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
    const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT value FROM crm_config WHERE `key` = ? LIMIT 1', [
      LIVE_OVERRIDES_CONFIG_KEY,
    ]);
    if (rows?.[0]?.value) {
      return JSON.parse(String(rows[0].value));
    }
  } catch {
    // ignore
  }
  return {};
}

async function saveLiveOverrides(overrides: Record<string, any>): Promise<void> {
  try {
    const pool = getCrmPool();
    const jsonVal = JSON.stringify(overrides);
    await pool.query(
      `INSERT INTO crm_config (\`key\`, \`value\`, \`updated_at\`)
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

function formatPhoneNumberDots(phone: string | null | undefined, isMasked: boolean = false): string {
  if (!phone) return isMasked ? '**** ******' : '0901.xxx.xxx';
  if (isMasked) {
    return maskPhoneNumber(phone);
  }
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

interface IosAuthUser {
  id?: number;
  legacyStaffId?: number;
  username?: string;
  displayName?: string;
  role?: string;
  careerTier?: 'CVL' | 'CVLL' | 'CC' | 'ADMIN';
}

async function resolveIosAuth(fastify: FastifyInstance, request: FastifyRequest): Promise<IosAuthUser | null> {
  const authHeader = request.headers.authorization || '';

  if (process.env.NODE_ENV !== 'production') {
    if (!authHeader || authHeader === 'Bearer mock-token-for-dev' || authHeader.trim().length <= 7) {
      return {
        id: 1,
        legacyStaffId: 13783,
        username: 'superadmin_dev',
        displayName: 'Khanh Cao',
        role: 'super_admin',
        careerTier: 'ADMIN',
      };
    }
  }

  if (!authHeader.toLowerCase().startsWith('bearer ') || authHeader.trim().length <= 7) {
    return null;
  }

  try {
    await request.jwtVerify();
    const payload = request.user as SafeAny;
    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, displayName: true, role: true, legacyStaffId: true },
    });

    const rawRole = String(staff?.role || payload.role || '').toLowerCase();
    const careerTier = normalizeCvFeatherRole(rawRole) || (isAdminOrSuperAdminRole(rawRole) ? 'ADMIN' : 'CVL');

    return {
      id: staff?.id || payload.id,
      legacyStaffId: staff?.legacyStaffId || payload.legacyStaffId || undefined,
      username: staff?.username || payload.username,
      displayName: staff?.displayName || payload.displayName,
      role: rawRole,
      careerTier,
    };
  } catch {
    return null;
  }
}

export async function iosRoutes(fastify: FastifyInstance) {
  // GET /api/ios/photos/:filename
  fastify.get('/ios/photos/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }

    const vpsPath = path.join(getLashUploadsDir(), filename);
    const localPath = path.join(getLocalFallbackDir(), filename);

    let fileBuffer: Buffer | null = null;
    try {
      fileBuffer = await fs.readFile(vpsPath);
    } catch {
      try {
        fileBuffer = await fs.readFile(localPath);
      } catch {
        fileBuffer = null;
      }
    }

    if (!fileBuffer) {
      return reply.status(404).send({ error: 'File not found' });
    }

    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    return reply
      .header('Content-Type', contentType)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(fileBuffer);
  });

  // GET /api/ios/bookings
  fastify.get('/ios/bookings', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) {
        return reply.status(401).send({
          success: false,
          error: 'Vui lòng đăng nhập để truy cập ứng dụng vận hành /ios-app.',
          counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
          bookings: [],
        });
      }

      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Tài khoản không có quyền truy cập ứng dụng /ios-app.',
          counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
          bookings: [],
        });
      }

      const query = request.query as Record<string, string | undefined>;
      const storeId = query.storeId ? Number(query.storeId) : 6;
      const segment = (query.segment || 'INCOMING').toUpperCase();

      const todayVn = (() => {
        try {
          return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date());
        } catch {
          return new Date().toISOString().split('T')[0];
        }
      })();

      const requestedDate = query.date || todayVn;
      const requestedRole = (query.role || '').toUpperCase();
      const isAdmin = authUser.careerTier === 'ADMIN' || isAdminOrSuperAdminRole(authUser.role || '');
      const effectiveRole =
        requestedRole || (authUser.careerTier !== 'ADMIN' ? authUser.careerTier : undefined) || 'CVL';
      const canViewFullPhone = isAdmin && effectiveRole !== 'CVL' ? true : canViewUnmaskedCustomerPhone(effectiveRole);

      const rawScope = (
        query.scope || (effectiveRole === 'CVL' ? 'MY_CUSTOMERS' : isAdmin ? 'STORE_ALL' : 'MY_CUSTOMERS')
      ).toUpperCase();
      const scope = effectiveRole === 'CVL' ? 'MY_CUSTOMERS' : rawScope;

      const explicitStaffId = query.staffId ? Number(query.staffId) : undefined;
      const activeStaffId = explicitStaffId || authUser.legacyStaffId || (effectiveRole === 'CVL' ? 13783 : 13783);

      const limit = Math.min(Number(query.limit) || 40, 100);

      const pool = getLegacyPool();
      const liveOverrides = await loadLiveOverrides();

      const explicitDate = query.date;
      let targetDate = explicitDate || requestedDate;
      if (!explicitDate) {
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
             ORDER BY d DESC
             LIMIT 1`,
            [storeId, storeId]
          );
          if (latestBusy?.[0]?.d) {
            targetDate = String(latestBusy[0].d);
          }
        }
      }

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
          booker_up.avatar AS booker_avatar,
          COALESCE(sl.service_name, s.service_key, 'New Flawless Mink 770') AS service_name,
          s.service_key,
          s.is_temporary,
          COALESCE(os.service_type, 'Normal') AS service_type,
          COALESCE(sp.full_name, 'Chưa phân công') AS staff_name,
          sp.avatar AS staff_avatar,
          os.assigned_staff_id,
          os.booked_staff_id,
          os.check_in_staff_id,
          os.check_out_staff_id,
          COALESCE(checkin_up.full_name, NULL) AS check_in_staff_name,
          checkin_up.avatar AS check_in_staff_avatar,
          COALESCE(checkout_up.full_name, NULL) AS check_out_staff_name,
          checkout_up.avatar AS check_out_staff_avatar,
          (SELECT COUNT(*) FROM \`order\` o2 WHERE o2.user_id = o.user_id AND o2.order_state = 'Completed') AS total_visits
        FROM \`order\` o
        LEFT JOIN user_profile up ON up.user_id = o.user_id
        LEFT JOIN user_contact uc ON uc.id = COALESCE(
          o.user_contact_id,
          (SELECT id FROM user_contact WHERE user_id = o.user_id AND is_disabled = 0 ORDER BY id DESC LIMIT 1)
        )
        LEFT JOIN (
          SELECT order_id, MIN(id) as min_os_id FROM order_service GROUP BY order_id
        ) first_os ON first_os.order_id = o.id
        LEFT JOIN order_service os ON os.id = first_os.min_os_id
        LEFT JOIN user_profile booker_up ON booker_up.user_id = COALESCE(os.created_staff_id, o.created_staff_id)
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

      const customerIds = Array.from(new Set(rows.map((r) => Number(r.user_id)).filter((id) => id > 0)));
      const comboBalanceMap = new Map<number, any>();
      const underMinkComboMap = new Map<number, any>();
      const lashHistoryMap = new Map<number, Array<{ date: string; serviceName: string; staffName: string }>>();
      const lastVisitSpecsMap = new Map<number, any>();

      if (customerIds.length > 0) {
        try {
          const [historyRows] = await pool.query<mysql.RowDataPacket[]>(
            `SELECT 
               o.user_id,
               os.id AS os_id,
               DATE_FORMAT(o.booking_date_start, '%d/%m/%Y') AS visit_date,
               s.service_key,
               COALESCE(sl.service_name, s.service_key, 'Nối mi') AS service_name,
               COALESCE(up.full_name, 'Chuyên Viên') AS staff_name
             FROM \`order\` o
             JOIN order_service os ON os.order_id = o.id
             LEFT JOIN service s ON s.id = os.service_id
             LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
             LEFT JOIN user_profile up ON up.user_id = os.assigned_staff_id
             WHERE o.user_id IN (${customerIds.join(',')})
               AND o.order_state = 'Completed'
             ORDER BY o.booking_date_start DESC, os.id ASC
             LIMIT 80`
          );
          const latestUpperOsIds: number[] = [];
          const osToUserMap = new Map<number, { userId: number; serviceKey: string }>();
          for (const hr of historyRows) {
            const uid = Number(hr.user_id);
            const list = lashHistoryMap.get(uid) || [];
            const svcName = String(hr.service_name || 'Nối mi');
            const svcKey = String(hr.service_key || '');
            if (list.length < 3) {
              list.push({
                date: String(hr.visit_date || ''),
                serviceName: svcName,
                staffName: String(hr.staff_name || 'Chuyên Viên'),
              });
              lashHistoryMap.set(uid, list);
            }
            const isUnder =
              svcKey.toLowerCase().includes('under') ||
              svcKey.toLowerCase().includes('flawless.mink-390') ||
              svcName.toLowerCase().includes('under') ||
              svcName.toLowerCase().includes('mi dưới');
            if (!isUnder && !lastVisitSpecsMap.has(uid) && hr.os_id) {
              const osId = Number(hr.os_id);
              const svcLower = svcKey.toLowerCase();
              let mat = 'Flawless Mink';
              if (svcLower.includes('hyperlight')) mat = 'HyperLight';
              else if (svcLower.includes('ivylight')) mat = 'Ivylight';
              else if (svcLower.includes('classic')) mat = 'New Classic';
              else if (svcLower.includes('volume')) mat = 'Volume';
              else if (svcLower.includes('ultralight')) mat = 'UltraLight';
              lastVisitSpecsMap.set(uid, { serviceKey: svcKey, material: mat });
              latestUpperOsIds.push(osId);
              osToUserMap.set(osId, { userId: uid, serviceKey: svcKey });
            }
          }

          if (latestUpperOsIds.length > 0) {
            const [bonusAttrRows] = await pool.query<mysql.RowDataPacket[]>(
              `SELECT 
                 sb.order_service_id,
                 sbr.type,
                 COALESCE(ao.attribute_option_key, sbr.value_required, '') AS opt_key
               FROM staff_bonus sb
               JOIN staff_bonus_rule sbr ON sbr.id = sb.staff_bonus_rule_id
               LEFT JOIN attribute_option ao ON sbr.value_required REGEXP '^[0-9]+$' AND ao.id = CAST(sbr.value_required AS UNSIGNED)
               WHERE sb.order_service_id IN (${latestUpperOsIds.join(',')})
                 AND sb.bonus_type = 'BonusPoint'`
            );
            for (const bar of bonusAttrRows) {
              const osId = Number(bar.order_service_id);
              const info = osToUserMap.get(osId);
              if (!info) continue;
              const current = lastVisitSpecsMap.get(info.userId) || { serviceKey: info.serviceKey };
              const t = String(bar.type || '');
              const k = String(bar.opt_key || '').toLowerCase();
              const svcLower = info.serviceKey.toLowerCase();

              if (t === 'OrderServiceAttributeLashes' && /^\d+$/.test(k)) {
                const unit =
                  svcLower.includes('mink') || svcLower.includes('classic') || svcLower.includes('ivy') ? 'sợi' : 'fan';
                current.count = `${k} ${unit}`;
              } else if (t === 'OrderServiceAttributeFan' && k) {
                const numMatch = k.match(/\d+/);
                const dNum = numMatch ? numMatch[0] : '';
                if (svcLower.includes('hyperlight')) {
                  current.volume = dNum === '1' || dNum === '2' ? '2X' : `${dNum}X`;
                } else if (svcLower.includes('ivylight')) {
                  current.volume = `${dNum || '4'}L`;
                } else if (svcLower.includes('ultralight')) {
                  current.volume = `${dNum || '4'}D`;
                }
              } else if (t === 'OrderServiceAttributeDesign' && k) {
                if (k === 'doll') current.style = 'Doll';
                else if (k === 'wing') current.style = 'Wing';
                else if (k === 'kim-k') current.style = 'Katun';
                else if (k === 'natural') current.style = 'Natural';
              } else if (t === 'OrderServiceAttributeColor' && k) {
                if (k === 'brown' || k === 'purple' || k === 'blue') {
                  current.color = 'Nâu Tự Nhiên (Choco Brown)';
                } else if (k === 'black') {
                  current.color = 'Đen Tuyền (Jet Black)';
                }
              }
              lastVisitSpecsMap.set(info.userId, current);
            }
          }
        } catch {
          // ignore
        }

        try {
          const [balanceRows] = await pool.query<mysql.RowDataPacket[]>(
            `SELECT 
               usb.id,
               usb.user_id,
               (usb.normal_count + usb.retain_count) AS remaining_sessions,
               usb.normal_count AS normal_remaining,
               usb.retain_count AS retain_remaining,
               COALESCE(sl.service_name, s.service_key, 'Gói Combo Mi') AS combo_name,
               s.service_key AS service_key,
               sp.service_price_package_key AS package_key,
               sp.retain_last_day_required AS retain_days_limit
             FROM user_service_balance usb
             LEFT JOIN service s ON s.id = usb.service_id
             LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
             LEFT JOIN service_price sp ON sp.id = usb.service_price_id
             WHERE usb.user_id IN (${customerIds.join(',')})
               AND (usb.normal_count > 0 OR usb.retain_count > 0)
               AND (usb.service_group IS NULL OR usb.service_group != 'LashesUnder')
               AND (s.service_type IS NULL OR s.service_type != 'LashesUnder')
               AND (s.service_key IS NULL OR s.service_key NOT LIKE '%under%')
             ORDER BY usb.id DESC`
          );
          const groupedByUser = new Map<number, mysql.RowDataPacket[]>();
          for (const br of balanceRows) {
            const uid = Number(br.user_id);
            const arr = groupedByUser.get(uid) || [];
            arr.push(br);
            groupedByUser.set(uid, arr);
          }
          for (const [uid, userRows] of groupedByUser.entries()) {
            const lastVisitSvcKey = (lastVisitSpecsMap.get(uid)?.serviceKey || '').replace(/-refill$/i, '');
            const primaryRow =
              (lastVisitSvcKey &&
                userRows.find((r) => String(r.service_key || '').replace(/-refill$/i, '') === lastVisitSvcKey)) ||
              userRows[0];
            const rem = Number(primaryRow.remaining_sessions) || 0;
            if (rem > 0) {
              const rawServiceName = String(primaryRow.combo_name || 'Gói Combo Mi');
              const pkgKey = String(primaryRow.package_key || '').trim();
              const displayComboName = formatComboName(rawServiceName, pkgKey);
              comboBalanceMap.set(uid, {
                isComboLive: true,
                remainingSessions: rem,
                normalRemaining: Number(primaryRow.normal_remaining) || 0,
                retainRemaining: Number(primaryRow.retain_remaining) || 0,
                comboName: displayComboName,
                serviceKey: primaryRow.service_key ? String(primaryRow.service_key) : undefined,
                packageKey: pkgKey || undefined,
                retainDaysLimit: Number(primaryRow.retain_days_limit) || 25,
              });
            }
          }
        } catch {
          // ignore
        }

        try {
          const [underBalanceRows] = await pool.query<mysql.RowDataPacket[]>(
            `SELECT 
               usb.user_id,
               SUM(usb.normal_count + usb.retain_count) AS remaining_sessions,
               SUM(usb.normal_count) AS normal_remaining,
               SUM(usb.retain_count) AS retain_remaining,
               MAX(COALESCE(sl.service_name, s.service_key, 'Under Mink 390')) AS combo_name,
               MAX(sp.service_price_package_key) AS package_key
             FROM user_service_balance usb
             LEFT JOIN service s ON s.id = usb.service_id
             LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
             LEFT JOIN service_price sp ON sp.id = usb.service_price_id
             WHERE usb.user_id IN (${customerIds.join(',')})
               AND (usb.normal_count > 0 OR usb.retain_count > 0)
               AND (usb.service_group = 'LashesUnder' OR s.service_type = 'LashesUnder' OR s.service_key LIKE '%under%')
             GROUP BY usb.user_id`
          );
          for (const ubr of underBalanceRows) {
            const uid = Number(ubr.user_id);
            const rem = Number(ubr.remaining_sessions) || 0;
            if (rem > 0) {
              const pkgKey = String(ubr.package_key || '').trim();
              const rawName = String(ubr.combo_name || 'Under Mink 390');
              underMinkComboMap.set(uid, {
                hasUnderCombo: true,
                remainingSessions: rem,
                normalRemaining: Number(ubr.normal_remaining) || 0,
                retainRemaining: Number(ubr.retain_remaining) || 0,
                comboName: formatComboName(rawName, pkgKey),
                packageKey: pkgKey || undefined,
              });
            }
          }
        } catch {
          // ignore
        }
      }

      const allMappedBookings: BookingItem[] = rows.map((r, index) => {
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
        } else if (targetDate < todayVn && (state === 'New' || state === 'Confirmed')) {
          status = 'DONE';
        }

        const duration = Number(r.booking_duration_minute) || 90;
        const servicePrice = Number(override.servicePrice ?? r.total_price) || 550000;
        const orderNum = r.order_number ? `BK-${r.order_number}` : `BK-${r.id}`;
        const note = r.booking_note || '';
        const visits = Number(r.total_visits) || 0;
        const isNew = Number(r.is_new) || 0;
        const customerId = Number(r.user_id) || 0;

        const isDbUnassigned = !r.assigned_staff_id || Number(r.assigned_staff_id) === 0;
        const isUnassignedQueue = !override.assignedStaffId && isDbUnassigned;

        const assignedStaffId = isUnassignedQueue ? 0 : Number(override.assignedStaffId ?? r.assigned_staff_id ?? 0);
        const assignedStaffName = isUnassignedQueue
          ? 'Chờ phân công (Đầu tua)'
          : override.assignedStaffName ||
            (r.staff_name && r.staff_name !== 'Chưa phân công' ? r.staff_name : 'Chuyên Viên');

        const checkInStaffId =
          override.checkInStaffId ?? (r.check_in_staff_id ? Number(r.check_in_staff_id) : undefined);
        const checkInStaffName = override.checkInStaffName ?? r.check_in_staff_name ?? undefined;
        const checkInStaffTier = override.checkInStaffTier ?? undefined;

        const checkOutStaffId =
          override.checkOutStaffId ?? (r.check_out_staff_id ? Number(r.check_out_staff_id) : undefined);
        const checkOutStaffName = override.checkOutStaffName ?? r.check_out_staff_name ?? undefined;
        const checkOutStaffTier = override.checkOutStaffTier ?? undefined;

        const comboInfo = comboBalanceMap.get(customerId) || {
          isComboLive: false,
          remainingSessions: 0,
          normalRemaining: 0,
          retainRemaining: 0,
          comboName: 'Chưa có gói ❖ Live',
          serviceKey: undefined,
          packageKey: undefined,
          retainDaysLimit: 21,
        };

        const selectedCombo = override.selectedCombo || null;
        const cartProducts = override.cartProducts || [];
        const productTotal = cartProducts.reduce(
          (sum: number, p: any) => sum + Number(p.price || 0) * Number(p.quantity || 1),
          0
        );
        const comboTotal = selectedCombo ? Number(selectedCombo.price || 0) : 0;
        const upgradePrice = Number(override.upgradePrice || 0);
        const isClientComboLive = Boolean(comboInfo.isComboLive);
        const effectiveServiceTotal = selectedCombo ? 0 : isClientComboLive ? upgradePrice : servicePrice;
        const subtotal = effectiveServiceTotal + comboTotal + productTotal;
        const tipAmount = Number(override.billing?.tipAmount ?? 50000);

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

        const isAnyPlaceholder = (name?: string | null) =>
          !name ||
          name.toLowerCase().includes('any') ||
          String(r.service_key || '')
            .toLowerCase()
            .includes('any') ||
          Number(r.is_temporary) === 1;

        let effectiveServiceName =
          override.serviceName && !isAnyPlaceholder(override.serviceName) ? override.serviceName : '';

        if (!effectiveServiceName) {
          if (!isAnyPlaceholder(r.service_name)) {
            effectiveServiceName = r.service_name;
          } else if (comboInfo.isComboLive && comboInfo.comboName) {
            effectiveServiceName = comboInfo.comboName;
          } else if (lashHistoryMap.get(customerId)?.length) {
            const validHistory = lashHistoryMap.get(customerId)!.find((h) => !isAnyPlaceholder(h.serviceName));
            if (validHistory?.serviceName) {
              effectiveServiceName = validHistory.serviceName;
            }
          }
        }

        if (!effectiveServiceName) {
          const mat = lastVisitSpecsMap.get(customerId)?.material || 'HyperLight';
          if (mat === 'HyperLight') {
            effectiveServiceName = 'New Hyperlight 550';
          } else if (mat === 'Ivylight') {
            effectiveServiceName = 'Ivylight 4L 1220';
          } else {
            effectiveServiceName = visits > 1 ? 'New Flawless Mink 770' : 'Chưa chọn mẫu mi (Tư vấn)';
          }
        }

        return {
          id: Number(r.id),
          orderNumber: orderNum,
          customerName: (r.customer_name || 'Khách').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim(),
          customerPhone: formatPhoneNumberDots(r.customer_phone, !canViewFullPhone),
          customerId,
          customerAvatar: resolveCustomerAvatar(r.customer_avatar),
          assignedStaffAvatar: resolveStaffAvatar(r.staff_avatar),
          customerVisits: visits || 1,
          customerNote: note,
          timeSlot: formatTimeSlot(r.booking_date_start, duration),
          time12h: formatTime12h(r.booking_date_start),
          serviceName: effectiveServiceName,
          serviceType: override.serviceType || r.service_type || 'Normal',
          servicePrice,
          serviceDuration: duration,
          bookerName: r.booker_name,
          bookerAvatar: resolveCustomerAvatar(r.booker_avatar),
          customerTypeIcon: resolveCustomerTypeIcon(note, visits, isNew, customerId),
          hasDiscountTag: resolveHasDiscountTag(note, Number(r.combo_sale_required), r.promotion_id, customerId),
          assignedStaffName,
          assignedStaffId,
          isUnassignedQueue,
          isNextQueueCustomer: isUnassignedQueue,
          isBookedInAdvance:
            !isUnassignedQueue &&
            assignedStaffId > 0 &&
            Boolean(
              (r.booked_staff_id && Number(r.booked_staff_id) > 0 && Number(r.booked_staff_id) === assignedStaffId) ||
              note.toLowerCase().includes('book') ||
              note.toLowerCase().includes('chỉ định')
            ),
          isTuaAssigned:
            !isUnassignedQueue &&
            assignedStaffId > 0 &&
            !(
              (r.booked_staff_id && Number(r.booked_staff_id) > 0 && Number(r.booked_staff_id) === assignedStaffId) ||
              note.toLowerCase().includes('book') ||
              note.toLowerCase().includes('chỉ định')
            ),
          bookingAccessTag: isUnassignedQueue
            ? ('NEXT_QUEUE_CUSTOMER' as const)
            : assignedStaffId === activeStaffId || checkInStaffId === activeStaffId || checkOutStaffId === activeStaffId
              ? ('MY_BOOKED_CUSTOMER' as const)
              : ('STORE_CUSTOMER' as const),
          checkInStaffId,
          checkInStaffName,
          checkInStaffTier,
          checkInStaffAvatar: resolveCustomerAvatar(r.check_in_staff_avatar),
          checkOutStaffId,
          checkOutStaffName,
          checkOutStaffTier,
          checkOutStaffAvatar: resolveCustomerAvatar(r.check_out_staff_avatar),
          assignedBed: override.assignedBed || `Giường 0${(index % 6) + 1}`,
          status,
          comboLiveStatus: {
            isComboLive: comboInfo.isComboLive,
            remainingSessions: comboInfo.remainingSessions,
            normalRemaining: comboInfo.normalRemaining,
            retainRemaining: comboInfo.retainRemaining,
            comboName: comboInfo.comboName,
            serviceKey: comboInfo.serviceKey,
            packageKey: comboInfo.packageKey,
            retainDaysLimit: comboInfo.retainDaysLimit ?? 25,
            upsellOpportunity: !comboInfo.isComboLive,
          },
          underMinkComboStatus: underMinkComboMap.get(customerId),
          lashHistory: lashHistoryMap.get(customerId) || [
            {
              date: index % 4 === 2 ? '01/10/2026' : '19/10/2026',
              serviceName: comboInfo.isComboLive
                ? comboInfo.comboName
                : isAnyPlaceholder(r.service_name)
                  ? 'New Hyperlight 550'
                  : r.service_name,
              staffName: assignedStaffName,
            },
          ],
          selectedCombo,
          attributes:
            override.attributes ||
            (() => {
              const svcLower = effectiveServiceName.toLowerCase();
              const isHyper = svcLower.includes('hyperlight');
              const isClassic = svcLower.includes('classic');
              const isIvy = svcLower.includes('ivylight');
              const isUltra = svcLower.includes('ultralight');
              const defaultMat = isHyper
                ? 'HyperLight'
                : isClassic
                  ? 'New Classic'
                  : isIvy
                    ? 'Ivylight'
                    : isUltra
                      ? 'UltraLight'
                      : 'Flawless Mink';
              const defaultVol = isHyper ? '2X' : isIvy ? '4L' : isUltra ? '4D' : '1D';
              const defaultCount = isHyper ? '70 fan' : isIvy ? '90 nhịp' : '90 sợi';
              return {
                material: lastVisitSpecsMap.get(customerId)?.material || defaultMat,
                style: lastVisitSpecsMap.get(customerId)?.style || 'Natural',
                volume: lastVisitSpecsMap.get(customerId)?.volume || defaultVol,
                count: lastVisitSpecsMap.get(customerId)?.count || defaultCount,
                color: lastVisitSpecsMap.get(customerId)?.color,
                curl: 'C',
                length: '10-12 mm',
                thickness: defaultMat === 'Flawless Mink' ? '0.07 mm' : '0.10 mm',
                notes: note || 'Khách thích tự nhiên nhẹ nhàng, nối êm không cay mắt',
              };
            })(),
          progress: override.progress || undefined,
          survey: override.survey || undefined,
          upgradePrice: Number(override.upgradePrice || 0),
          cvRotationPoints: override.cvRotationPoints,
          cvRotationBreakdown: override.cvRotationBreakdown,
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
            serviceTotal: effectiveServiceTotal,
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

      // Merge overrides for mock IDs if they were edited
      const existingIds = new Set(allMappedBookings.map((b) => b.id));
      for (const mockBooking of INITIAL_BOOKINGS) {
        if (!existingIds.has(mockBooking.id)) {
          const override = liveOverrides[String(mockBooking.id)];
          if (override) {
            allMappedBookings.push({
              ...mockBooking,
              status: override.status || mockBooking.status,
              progress: override.status === 'INCOMING' ? undefined : override.progress || mockBooking.progress,
              attributes: override.attributes || mockBooking.attributes,
              selectedCombo: override.selectedCombo !== undefined ? override.selectedCombo : mockBooking.selectedCombo,
              checkInStaffId: override.checkInStaffId || mockBooking.assignedStaffId,
              checkInStaffName: override.checkInStaffName || mockBooking.assignedStaffName,
              checkInStaffTier: override.checkInStaffTier || 'CVL',
              assignedStaffId: override.assignedStaffId || mockBooking.assignedStaffId,
              assignedStaffName: override.assignedStaffName || mockBooking.assignedStaffName,
              upgradePrice:
                override.upgradePrice !== undefined ? Number(override.upgradePrice) : mockBooking.upgradePrice,
              cvRotationPoints:
                override.cvRotationPoints !== undefined ? override.cvRotationPoints : mockBooking.cvRotationPoints,
              cvRotationBreakdown: override.cvRotationBreakdown || mockBooking.cvRotationBreakdown,
            } as any);
          }
        }
      }

      // Filter by scope (Kinh Thánh mOS Điều răn UI-010):
      let nextUnassignedIncluded = false;
      const shouldApplyCvlPrivacyScope = effectiveRole === 'CVL' || scope === 'MY_CUSTOMERS';
      const effectiveList = shouldApplyCvlPrivacyScope
        ? allMappedBookings.filter((b) => {
            const isOwnCustomer =
              !b.isUnassignedQueue &&
              b.assignedStaffId > 0 &&
              (b.assignedStaffId === activeStaffId ||
                b.checkInStaffId === activeStaffId ||
                b.checkOutStaffId === activeStaffId);
            if (isOwnCustomer) return true;

            const isNextCandidate = b.isUnassignedQueue && (b.status === 'INCOMING' || b.status === 'CHECKED_IN');
            if (isNextCandidate && !nextUnassignedIncluded) {
              nextUnassignedIncluded = true;
              return true;
            }
            return false;
          })
        : allMappedBookings;

      const counts = {
        incoming: effectiveList.filter((b) => b.status === 'INCOMING' || b.status === 'CHECKED_IN').length,
        servicing: effectiveList.filter((b) => b.status === 'SERVICING').length,
        done: effectiveList.filter((b) => b.status === 'DONE').length,
        cancel: effectiveList.filter((b) => b.status === 'CANCELLED').length,
      };

      const now = new Date();
      const targetMonthDate = targetDate ? new Date(targetDate) : now;
      const monthNum = isNaN(targetMonthDate.getTime()) ? now.getMonth() + 1 : targetMonthDate.getMonth() + 1;
      const yearNum = isNaN(targetMonthDate.getTime()) ? now.getFullYear() : targetMonthDate.getFullYear();
      const monthStart = `${yearNum}-${String(monthNum).padStart(2, '0')}-01 00:00:00`;
      const nextMonthNum = monthNum === 12 ? 1 : monthNum + 1;
      const nextYearNum = monthNum === 12 ? yearNum + 1 : yearNum;
      const monthEnd = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-01 00:00:00`;

      let staffStats = {
        staffId: activeStaffId,
        month: monthNum,
        monthLabel: `tháng ${monthNum}`,
        monthlyRevenue: 16253200,
        monthlyRevenueFormatted: '16.253.200 đ',
        completedShiftsCount: 9,
        satisfactionRate: 100,
        rating: 5.0,
      };

      try {
        const [techRows] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT 
            COALESCE(SUM(total_order), 0) as totalOrders,
            COALESCE(SUM(total_paid_cash_amount + total_paid_credit_card_amount + total_paid_bank_transfer_amount), 0) as totalRev
           FROM report_staff_technician
           WHERE user_id = ? AND date >= DATE(?) AND date < DATE(?)`,
          [activeStaffId, monthStart, monthEnd]
        );

        const [liveOrderRows] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT 
            COUNT(DISTINCT o.id) as liveOrders,
            COALESCE(SUM(o.total_price), 0) as liveOrderRev
           FROM \`order\` o
           JOIN order_service os ON o.id = os.order_id
           WHERE os.assigned_staff_id = ?
             AND o.order_state = 'Completed'
             AND o.booking_date_start >= ? AND o.booking_date_start < ?`,
          [activeStaffId, monthStart, monthEnd]
        );

        const totalOrders = Math.max(
          Number(techRows?.[0]?.totalOrders || 0),
          Number(liveOrderRows?.[0]?.liveOrders || 0)
        );
        const totalRev = Math.max(Number(techRows?.[0]?.totalRev || 0), Number(liveOrderRows?.[0]?.liveOrderRev || 0));

        const [relRows] = await pool.query<mysql.RowDataPacket[]>(
          `SELECT 
            COALESCE(SUM(relationship_happy_count), 0) as happyCount,
            COALESCE(SUM(relationship_neutral_count), 0) as neutralCount,
            COALESCE(SUM(relationship_unhappy_count), 0) as unhappyCount,
            COALESCE(SUM(relationship_happy_count + relationship_neutral_count + relationship_unhappy_count), 0) as totalEval
           FROM report_staff_relationship
           WHERE user_id = ? AND date >= DATE(?) AND date < DATE(?)`,
          [activeStaffId, monthStart, monthEnd]
        );

        const happy = Number(relRows?.[0]?.happyCount || 0);
        const unhappy = Number(relRows?.[0]?.unhappyCount || 0);
        const totalEval = Number(relRows?.[0]?.totalEval || 0);

        let satRate = 100;
        if (totalEval > 0) {
          if (unhappy === 0) {
            satRate = 100;
          } else {
            satRate = Math.round((happy / totalEval) * 100);
          }
        }

        staffStats = {
          staffId: activeStaffId,
          month: monthNum,
          monthLabel: `tháng ${monthNum}`,
          monthlyRevenue: totalRev,
          monthlyRevenueFormatted: totalRev.toLocaleString('vi-VN') + ' đ',
          completedShiftsCount: totalOrders,
          satisfactionRate: satRate,
          rating: 5.0,
        };
      } catch (err) {
        fastify.log.warn({ err }, 'Could not query live staffStats');
      }

      return reply.send({
        success: true,
        source: 'mysql_live',
        storeId,
        segment,
        role: effectiveRole,
        scope,
        activeStaffId,
        targetDate,
        counts,
        count: effectiveList.length,
        bookings: effectiveList,
        staffStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      fastify.log.error(error, 'Error fetching real bookings from MySQL');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Database query error',
        counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
        bookings: [],
      });
    }
  });

  // POST /api/ios/bookings
  fastify.post('/ios/bookings', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const body = request.body as SafeAny;
      const bookingId = Number(body?.bookingId);
      const action = String(body?.action || '').toUpperCase();
      const isLockedCvl = authUser.careerTier === 'CVL';
      const actorStaffId = isLockedCvl
        ? authUser.legacyStaffId || 13783
        : Number(body?.actorStaffId) || authUser.legacyStaffId || 13783;
      const actorStaffName = String(body?.actorStaffName || authUser.displayName || 'Khanh Cao');
      const actorStaffTier = isLockedCvl ? 'CVL' : String(body?.actorStaffTier || authUser.careerTier || 'CVL');

      if (!bookingId || !action) {
        return reply.status(400).send({ success: false, error: 'Thiếu bookingId hoặc action.' });
      }

      const overrides = await loadLiveOverrides();
      const current = overrides[String(bookingId)] || {};

      if (
        isLockedCvl &&
        action !== 'RESET_DEMO' &&
        current.assignedStaffId &&
        Number(current.assignedStaffId) > 0 &&
        Number(current.assignedStaffId) !== actorStaffId &&
        Number(current.checkInStaffId) !== actorStaffId &&
        Number(current.checkOutStaffId) !== actorStaffId
      ) {
        return reply.status(403).send({
          success: false,
          error:
            'CV🪶 chỉ được phép thao tác trên khách hàng kế tiếp (Đầu tua) hoặc khách book của chính mình, không được truy cập khách của Chuyên Viên khác.',
        });
      }

      if (action === 'CHECK_IN') {
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
        overrides[String(bookingId)] = {
          ...current,
          status: body.nextStatus || 'SERVICING',
          orderState: body.nextStatus === 'SERVICING' ? 'Service Start' : 'Consultation',
          checkInStaffId: current.checkInStaffId || actorStaffId,
          checkInStaffName: current.checkInStaffName || actorStaffName,
          checkInStaffTier: current.checkInStaffTier || actorStaffTier,
          attributes: body.attributes || current.attributes,
          selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
          serviceName: body.skuPricing?.skuName || current.serviceName,
          servicePrice: body.skuPricing?.skuPrice ?? current.servicePrice,
          serviceType: body.skuPricing?.serviceType || current.serviceType,
          upgradePrice: body.skuPricing?.upgradePrice ?? current.upgradePrice,
          cvRotationPoints: body.skuPricing?.cvPoints ?? current.cvRotationPoints,
          cvRotationBreakdown: body.skuPricing?.cvBreakdown ?? current.cvRotationBreakdown,
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
        const incomingProgress = { ...(body.progress || {}) };

        if (
          incomingProgress.beforePhotoUrl &&
          typeof incomingProgress.beforePhotoUrl === 'string' &&
          incomingProgress.beforePhotoUrl.startsWith('data:image/')
        ) {
          incomingProgress.beforePhotoUrl = await persistProgressPhotoToCloud(
            bookingId,
            'before',
            incomingProgress.beforePhotoUrl
          );
        }
        if (
          incomingProgress.cleanedPhotoUrl &&
          typeof incomingProgress.cleanedPhotoUrl === 'string' &&
          incomingProgress.cleanedPhotoUrl.startsWith('data:image/')
        ) {
          incomingProgress.cleanedPhotoUrl = await persistProgressPhotoToCloud(
            bookingId,
            'cleaned',
            incomingProgress.cleanedPhotoUrl
          );
        }
        if (
          incomingProgress.afterPhotoUrl &&
          typeof incomingProgress.afterPhotoUrl === 'string' &&
          incomingProgress.afterPhotoUrl.startsWith('data:image/')
        ) {
          incomingProgress.afterPhotoUrl = await persistProgressPhotoToCloud(
            bookingId,
            'after',
            incomingProgress.afterPhotoUrl
          );
        }

        overrides[String(bookingId)] = {
          ...current,
          status: 'SERVICING',
          orderState: body.orderState || 'Service End',
          progress: {
            ...(current.progress || {}),
            ...incomingProgress,
            cloudSynced: true,
            cloudSyncedAt: new Date().toISOString(),
          },
        };
      } else if (action === 'COMPLETE_SURVEY') {
        overrides[String(bookingId)] = {
          ...current,
          orderState: 'Service Completed',
          survey: body.survey || current.survey,
        };
      } else if (action === 'SAVE_UPSELL_AND_CHECKOUT') {
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
          progress: {
            ...(current.progress || {}),
            completedAt: new Date().toISOString(),
            timerRunning: false,
            currentStep: 1,
          },
          completedAt: new Date().toISOString(),
        };
      } else if (action === 'REVERT_TO_INCOMING') {
        const idKey = String(bookingId);
        delete overrides[idKey];
        overrides[idKey] = {
          status: 'INCOMING',
          orderState: 'Confirmed',
        };
      } else if (action === 'RESET_DEMO') {
        delete overrides[String(bookingId)];
      }

      await saveLiveOverrides(overrides);

      const activeOverride = overrides[String(bookingId)] || null;

      return reply.send({
        success: true,
        bookingId,
        action,
        override: activeOverride,
        cloudSynced: true,
        cloudSyncedAt: new Date().toISOString(),
        progress: activeOverride?.progress || null,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      fastify.log.error(error, 'Error executing /api/ios/bookings POST action');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Action execution error',
      });
    }
  });
}
