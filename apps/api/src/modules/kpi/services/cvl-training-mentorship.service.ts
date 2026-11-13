import { FastifyInstance } from 'fastify';
import {
  CVL_TRAINING_MENTORSHIP_CONFIG_KEY,
  CvlTrainingMentorshipConfig,
  CvlTrainingMentorshipConfigResponse,
  CvlTrainingMentorshipPair,
  CvlTrainingMentorshipStaffOption,
  DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG,
  SafeAny,
  intersectDateRanges,
  isDateRangeOverlapping,
} from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CACHE_TTL_MS = 30_000;

let cachedConfig: CvlTrainingMentorshipConfig | null = null;
let cacheTimestamp = 0;

function sanitizeStoreCode(raw?: string | null): string {
  const upper = String(raw || 'DT')
    .trim()
    .toUpperCase();
  if (upper.includes('ESTELLA') || upper === 'EP') return 'EP';
  if (upper.includes('PXL') || upper.includes('PHAN')) return 'PXL';
  return 'DT';
}

export function sanitizeCvlTrainingMentorshipPair(
  raw: Partial<CvlTrainingMentorshipPair>,
  index: number
): CvlTrainingMentorshipPair | null {
  const menteeId = Math.floor(Number(raw.menteeLegacyStaffId || 0));
  const mentorId = Math.floor(Number(raw.mentorLegacyStaffId || 0));
  if (!Number.isInteger(menteeId) || menteeId <= 0) return null;
  if (!Number.isInteger(mentorId) || mentorId <= 0) return null;

  const startDate = String(raw.startDate || '').slice(0, 10);
  const endDate = String(raw.endDate || '').slice(0, 10);
  if (!ISO_DATE_RE.test(startDate) || !ISO_DATE_RE.test(endDate) || startDate > endDate) {
    return null;
  }

  const fixedAllowanceVnd = Math.max(0, Math.round(Number(raw.fixedAllowanceVnd ?? 1_000_000)));
  const rawShare = Number(raw.menteeBonusShareRate ?? 0.5);
  const menteeBonusShareRate = Number.isFinite(rawShare) ? Math.min(2, Math.max(0, rawShare)) : 0.5;
  const rawThreshold = Number(raw.minComboRateThreshold ?? 0.2);
  const minComboRateThreshold = Number.isFinite(rawThreshold) ? Math.min(1, Math.max(0, rawThreshold)) : 0.2;

  const id =
    String(raw.id || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '-') || `pair-${menteeId}-${mentorId}-${startDate}-${index}`;

  return {
    id,
    menteeLegacyStaffId: menteeId,
    menteeDisplayName: String(raw.menteeDisplayName || `CVL #${menteeId}`).trim(),
    mentorLegacyStaffId: mentorId,
    mentorDisplayName: String(raw.mentorDisplayName || `CC #${mentorId}`).trim(),
    storeCode: sanitizeStoreCode(raw.storeCode),
    startDate,
    endDate,
    fixedAllowanceVnd,
    menteeBonusShareRate,
    minComboRateThreshold,
    isActive: raw.isActive !== false,
    note: raw.note ? String(raw.note).trim() : undefined,
  };
}

export function normalizeCvlTrainingMentorshipConfig(raw: unknown): CvlTrainingMentorshipConfig {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG);
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.pairs)) {
    return structuredClone(DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG);
  }
  const pairs: CvlTrainingMentorshipPair[] = [];
  obj.pairs.forEach((item, idx) => {
    const cleaned = sanitizeCvlTrainingMentorshipPair(item as Partial<CvlTrainingMentorshipPair>, idx);
    if (cleaned) pairs.push(cleaned);
  });
  return {
    pairs,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
    updatedBy: typeof obj.updatedBy === 'string' ? obj.updatedBy : undefined,
  };
}

/**
 * Xây dựng mệnh đề SQL loại trừ mọi đơn hàng thuộc về Mentee CVL đang trong kỳ Training.
 * Dùng cho tất cả báo cáo của CC (CC Xoay, CC Daily Sales Bonus, CC Tip, CC Paystub)
 * theo Điều răn CC-006: "Tất cả CC check-in/out giúp CVL không nhận được gì hết từ CVL, kể cả bonus vòng xoay."
 */
export function buildExcludeTrainingCvlOrderSql(
  pairs: CvlTrainingMentorshipPair[],
  orderIdExpr: string,
  orderDateExpr: string
): string {
  const active = (pairs || []).filter(
    (p) =>
      p.isActive &&
      Number.isInteger(p.menteeLegacyStaffId) &&
      p.menteeLegacyStaffId > 0 &&
      ISO_DATE_RE.test(p.startDate) &&
      ISO_DATE_RE.test(p.endDate)
  );
  if (active.length === 0) return '';

  const clauses = active.map(
    (p) =>
      `(os_tr.assigned_staff_id = ${p.menteeLegacyStaffId} AND DATE(${orderDateExpr}) BETWEEN '${p.startDate}' AND '${p.endDate}')`
  );

  return ` AND NOT EXISTS (SELECT 1 FROM \`order_service\` os_tr WHERE os_tr.order_id = ${orderIdExpr} AND (${clauses.join(' OR ')}))`;
}

/**
 * Xây dựng mệnh đề SQL kiểm tra một đơn hàng có thuộc kỳ Training của đúng 1 Mentee CVL cụ thể hay không.
 */
export function buildIsMenteeTrainingWindowSql(
  menteePairs: CvlTrainingMentorshipPair[],
  orderDateExpr: string
): string {
  const active = (menteePairs || []).filter(
    (p) => p.isActive && ISO_DATE_RE.test(p.startDate) && ISO_DATE_RE.test(p.endDate)
  );
  if (active.length === 0) return '1 = 0';
  return `(${active.map((p) => `(DATE(${orderDateExpr}) BETWEEN '${p.startDate}' AND '${p.endDate}')`).join(' OR ')})`;
}

/**
 * Ngăn không cho nhân sự khác (kể cả CVL khác) nhận trùng thưởng gói/dưỡng mi trên đơn của một Mentee CVL đang Training.
 */
export function buildExcludeOtherMenteeTrainingOrderSql(
  pairs: CvlTrainingMentorshipPair[],
  currentStaffId: number,
  orderIdExpr: string,
  orderDateExpr: string
): string {
  const safeCurrentId = Math.floor(Number(currentStaffId || 0));
  const others = (pairs || []).filter(
    (p) =>
      p.isActive &&
      Number.isInteger(p.menteeLegacyStaffId) &&
      p.menteeLegacyStaffId > 0 &&
      p.menteeLegacyStaffId !== safeCurrentId &&
      ISO_DATE_RE.test(p.startDate) &&
      ISO_DATE_RE.test(p.endDate)
  );
  if (others.length === 0) return '';
  const clauses = others.map(
    (p) =>
      `(os_oth_tr.assigned_staff_id = ${p.menteeLegacyStaffId} AND DATE(${orderDateExpr}) BETWEEN '${p.startDate}' AND '${p.endDate}')`
  );
  return ` AND NOT EXISTS (SELECT 1 FROM \`order_service\` os_oth_tr WHERE os_oth_tr.order_id = ${orderIdExpr} AND (${clauses.join(' OR ')}))`;
}

/**
 * Biểu thức SQL khớp dòng staff_tip thuộc về Chuyên Viên thực hiện dịch vụ,
 * bao gồm phần Tip Check-in/Check-out (<= 20%) mà CC bấm giùm cho Mentee CVL trong kỳ Training.
 */
export function buildCvTipStaffMatchSql(
  pairs: CvlTrainingMentorshipPair[],
  tipAlias: string,
  assignedStaffExpr: string,
  orderDateExpr: string
): string {
  const active = (pairs || []).filter(
    (p) =>
      p.isActive &&
      Number.isInteger(p.menteeLegacyStaffId) &&
      p.menteeLegacyStaffId > 0 &&
      ISO_DATE_RE.test(p.startDate) &&
      ISO_DATE_RE.test(p.endDate)
  );
  if (active.length === 0) {
    return `${tipAlias}.user_id = ${assignedStaffExpr}`;
  }
  const trainingClauses = active.map(
    (p) =>
      `(${assignedStaffExpr} = ${p.menteeLegacyStaffId} AND DATE(${orderDateExpr}) BETWEEN '${p.startDate}' AND '${p.endDate}')`
  );
  return `(
    ${tipAlias}.user_id = ${assignedStaffExpr}
    OR (
      ${tipAlias}.user_id <> ${assignedStaffExpr}
      AND COALESCE(${tipAlias}.tip_percentage, 0) > 0
      AND COALESCE(${tipAlias}.tip_percentage, 0) <= 20
      AND COALESCE(${tipAlias}.is_academy, 0) = 0
      AND (${trainingClauses.join(' OR ')})
    )
  )`;
}

export class CvlTrainingMentorshipService {
  static clearCache(): void {
    cachedConfig = null;
    cacheTimestamp = 0;
  }

  static async getConfig(fastify: FastifyInstance): Promise<CvlTrainingMentorshipConfig> {
    const now = Date.now();
    if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedConfig;
    }

    try {
      const record = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: CVL_TRAINING_MENTORSHIP_CONFIG_KEY },
      });

      if (record?.value) {
        const parsed = JSON.parse(record.value);
        cachedConfig = normalizeCvlTrainingMentorshipConfig(parsed);
        cacheTimestamp = now;
        return cachedConfig;
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Failed to read CVL_TRAINING_MENTORSHIP_CONFIG, using default');
    }

    cachedConfig = structuredClone(DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG);
    cacheTimestamp = now;
    return cachedConfig;
  }

  static async saveConfig(
    fastify: FastifyInstance,
    payload: Partial<CvlTrainingMentorshipConfig>,
    updatedBy?: string
  ): Promise<CvlTrainingMentorshipConfig> {
    const rawPairs = Array.isArray(payload?.pairs) ? payload.pairs : [];
    const pairs: CvlTrainingMentorshipPair[] = [];
    rawPairs.forEach((item, idx) => {
      const cleaned = sanitizeCvlTrainingMentorshipPair(item, idx);
      if (cleaned) pairs.push(cleaned);
    });

    const nextConfig: CvlTrainingMentorshipConfig = {
      pairs,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'admin',
    };

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: CVL_TRAINING_MENTORSHIP_CONFIG_KEY },
      create: {
        key: CVL_TRAINING_MENTORSHIP_CONFIG_KEY,
        value: JSON.stringify(nextConfig),
      },
      update: {
        value: JSON.stringify(nextConfig),
      },
    });

    cachedConfig = nextConfig;
    cacheTimestamp = Date.now();
    return nextConfig;
  }

  static async getActivePairsForRange(
    fastify: FastifyInstance,
    dateFrom: string,
    dateTo: string
  ): Promise<CvlTrainingMentorshipPair[]> {
    const config = await this.getConfig(fastify);
    const s = dateFrom.slice(0, 10);
    const e = dateTo.slice(0, 10);
    return config.pairs.filter((p) => p.isActive && isDateRangeOverlapping(p.startDate, p.endDate, s, e));
  }

  static async getActivePairsForMentee(
    fastify: FastifyInstance,
    menteeLegacyStaffId: number,
    dateFrom: string,
    dateTo: string
  ): Promise<CvlTrainingMentorshipPair[]> {
    const pairs = await this.getActivePairsForRange(fastify, dateFrom, dateTo);
    return pairs.filter((p) => p.menteeLegacyStaffId === menteeLegacyStaffId);
  }

  static findMatchingTrainingPairForOrder(
    pairs: CvlTrainingMentorshipPair[],
    assignedStaffId: number | undefined | null,
    orderDate: string
  ): CvlTrainingMentorshipPair | null {
    const staffId = Number(assignedStaffId || 0);
    if (!staffId) return null;
    const d = String(orderDate || '').slice(0, 10);
    if (!ISO_DATE_RE.test(d)) return null;
    return (
      pairs.find((p) => p.isActive && p.menteeLegacyStaffId === staffId && d >= p.startDate && d <= p.endDate) || null
    );
  }

  /**
   * Tính phần Tip tư vấn/checkout (+10% / +20%) mà CC đứng tên bấm giùm trên đơn của Mentee CVL
   * trong kỳ Training để cộng hoàn trả vào consultDeltaTip của Mentee CVL (không ghi đè bảng staff_tip gốc).
   */
  static async queryTransferredCcTipsByMentee(
    fastify: FastifyInstance,
    pairs: CvlTrainingMentorshipPair[],
    rangeStartDate: string,
    rangeEndDate: string
  ): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    if (!pairs || pairs.length === 0) return result;

    const effectiveWindows: Array<{ menteeId: number; startDate: string; endDate: string }> = [];
    for (const pair of pairs) {
      if (!pair.isActive) continue;
      const window = intersectDateRanges(pair.startDate, pair.endDate, rangeStartDate, rangeEndDate);
      if (window) {
        effectiveWindows.push({
          menteeId: pair.menteeLegacyStaffId,
          startDate: window.startDate,
          endDate: window.endDate,
        });
      }
    }
    if (effectiveWindows.length === 0) return result;

    const menteeIds = Array.from(new Set(effectiveWindows.map((w) => w.menteeId)));
    const clauses = effectiveWindows.map(
      (w) =>
        `(os_p.assigned_staff_id = ${w.menteeId} AND COALESCE(ro.date, DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))) BETWEEN '${w.startDate}' AND '${w.endDate}')`
    );

    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT
        os_p.assigned_staff_id AS mentee_id,
        COALESCE(SUM(st.tip_amount), 0) AS transferred_tip
      FROM (
        SELECT DISTINCT os.order_id, os.assigned_staff_id
        FROM \`order_service\` os
        WHERE os.assigned_staff_id IN (${menteeIds.join(',')})
          AND NOT EXISTS (
            SELECT 1 FROM \`order_service\` os2
            WHERE os2.order_id = os.order_id
              AND os2.assigned_staff_id IS NOT NULL
              AND os2.assigned_staff_id > 0
              AND os2.assigned_staff_id < os.assigned_staff_id
          )
      ) os_p
      JOIN \`order\` o ON o.id = os_p.order_id
      LEFT JOIN \`report_order\` ro ON ro.order_id = o.id
      JOIN \`staff_tip\` st ON st.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND st.user_id <> os_p.assigned_staff_id
        AND COALESCE(st.tip_percentage, 0) > 0
        AND COALESCE(st.tip_percentage, 0) <= 20
        AND COALESCE(st.is_academy, 0) = 0
        AND (${clauses.join(' OR ')})
      GROUP BY os_p.assigned_staff_id
    `);

    for (const row of rows) {
      const id = Number(row.mentee_id || 0);
      const amt = Math.round(Number(row.transferred_tip || 0));
      if (id > 0 && amt > 0) {
        result.set(id, (result.get(id) || 0) + amt);
      }
    }
    return result;
  }

  /**
   * Trả về danh sách ứng viên CC Mentor & CVL Mentee đang hoạt động để Admin chọn trong Modal cấu hình.
   */
  static async getConfigWithStaffOptions(fastify: FastifyInstance): Promise<CvlTrainingMentorshipConfigResponse> {
    const [config, activeCcIds, activeCvIds, crmCvlRows] = await Promise.all([
      this.getConfig(fastify),
      TeamService.getActiveStaffIdsWithFallback(fastify, 'CC', 'ACTIVE_CC_STAFF_CONFIG').catch(() => []),
      TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG').catch(() => []),
      fastify.prisma.crm.crmStaff
        .findMany({
          where: {
            isActive: true,
            legacyStaffId: { not: null },
            OR: [
              { role: { in: ['cv_plus', 'cv_plus_plus', 'cc'] } },
              { careerProgression: { is: { currentRole: { in: ['CV_PLUS', 'CV_PLUS_PLUS'] } } } },
            ],
          },
          select: {
            legacyStaffId: true,
            displayName: true,
            role: true,
            careerProgression: { select: { currentRole: true } },
          },
        })
        .catch(() => []),
    ]);

    const candidateIds = new Set<number>([
      ...activeCcIds,
      ...activeCvIds,
      ...config.pairs.flatMap((p) => [p.mentorLegacyStaffId, p.menteeLegacyStaffId]),
    ]);
    for (const s of crmCvlRows) {
      if (s.legacyStaffId) candidateIds.add(s.legacyStaffId);
    }

    const idList = Array.from(candidateIds).filter((id) => Number.isInteger(id) && id > 0);
    const legacyProfiles = idList.length
      ? await fastify.prisma.legacy
          .$queryRawUnsafe<SafeAny[]>(
            `SELECT u.id AS user_id, u.user_group_id, up.full_name, cs.client_store_key
             FROM \`user\` u
             JOIN \`user_profile\` up ON up.user_id = u.id
             LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
             WHERE u.id IN (${idList.join(',')})`
          )
          .catch(() => [])
      : [];

    const profileMap = new Map<number, { name: string; storeCode: string; groupId: number }>();
    for (const p of legacyProfiles) {
      profileMap.set(Number(p.user_id), {
        name: String(p.full_name || '').trim(),
        storeCode: sanitizeStoreCode(p.client_store_key),
        groupId: Number(p.user_group_id || 0),
      });
    }

    const ccSet = new Set<number>(activeCcIds);
    const cvlSet = new Set<number>();
    for (const s of crmCvlRows) {
      if (!s.legacyStaffId) continue;
      if (s.role === 'cc') ccSet.add(s.legacyStaffId);
      else cvlSet.add(s.legacyStaffId);
    }
    for (const p of config.pairs) {
      ccSet.add(p.mentorLegacyStaffId);
      cvlSet.add(p.menteeLegacyStaffId);
    }
    // Also allow selecting any active CV from Legacy if Admin wants to assign a newly-promoted CVL
    for (const id of activeCvIds) {
      cvlSet.add(id);
    }

    const ccMentors: CvlTrainingMentorshipStaffOption[] = Array.from(ccSet)
      .map((id) => {
        const prof = profileMap.get(id);
        return {
          legacyStaffId: id,
          displayName: prof?.name || `CC #${id}`,
          storeCode: prof?.storeCode || 'DT',
          roleGroup: 'CC' as const,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));

    const cvlMentees: CvlTrainingMentorshipStaffOption[] = Array.from(cvlSet)
      .filter((id) => !ccSet.has(id) || config.pairs.some((p) => p.menteeLegacyStaffId === id))
      .map((id) => {
        const prof = profileMap.get(id);
        return {
          legacyStaffId: id,
          displayName: prof?.name || `CVL #${id}`,
          storeCode: prof?.storeCode || 'DT',
          roleGroup: 'CVL' as const,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));

    return {
      config,
      staffOptions: {
        ccMentors,
        cvlMentees,
      },
    };
  }
}
