import { FastifyInstance } from 'fastify';
import type mysql from 'mysql2/promise';
import {
  CVL_TRAINING_MENTORSHIP_CONFIG_KEY,
  CvlMenteeLifecycleSummary,
  CvlTrainingMentorshipConfig,
  CvlTrainingMentorshipConfigResponse,
  CvlTrainingMentorshipPair,
  CvlTrainingMentorshipStaffOption,
  DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG,
  SafeAny,
  getVietnamDateYmd,
  resolveCvlTrainingLifecycleStatus,
  validateStrictOneToOneMentorshipPairs,
} from '@mos-lab/shared';
import { TeamService } from '../../../teams/team.service.js';
import {
  clearReconcileCooldown,
  getCachedMentorshipConfig,
  normalizeCvlTrainingMentorshipConfig,
  sanitizeCvlTrainingMentorshipPair,
  sanitizeStoreCode,
  setCachedMentorshipConfig,
} from './cvl-training-mentorship.helpers.js';

export async function getMentorshipConfig(fastify: FastifyInstance): Promise<CvlTrainingMentorshipConfig> {
  const now = Date.now();
  const cached = getCachedMentorshipConfig(now);
  if (cached) {
    return cached;
  }

  try {
    const record = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: CVL_TRAINING_MENTORSHIP_CONFIG_KEY },
    });

    if (record?.value) {
      const parsed = JSON.parse(record.value);
      const normalized = normalizeCvlTrainingMentorshipConfig(parsed);
      setCachedMentorshipConfig(normalized, now);
      return normalized;
    }
  } catch (err) {
    fastify.log.warn({ err }, 'Failed to read CVL_TRAINING_MENTORSHIP_CONFIG, using default');
  }

  const fallback = structuredClone(DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG);
  setCachedMentorshipConfig(fallback, now);
  return fallback;
}

export async function saveMentorshipConfig(
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

  const validation = validateStrictOneToOneMentorshipPairs(pairs);
  if (!validation.valid) {
    const err = new Error(validation.errors[0] || 'Cấu hình Mentor – Mentee 1-kèm-1 bị trùng lịch.') as Error & {
      statusCode?: number;
      validationErrors?: string[];
    };
    err.statusCode = 400;
    err.validationErrors = validation.errors;
    throw err;
  }

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

  setCachedMentorshipConfig(nextConfig, Date.now());
  clearReconcileCooldown();
  return nextConfig;
}

export async function getActivePairsFromCrmPoolImpl(
  crmPool: mysql.Pool,
  targetDate?: string
): Promise<CvlTrainingMentorshipPair[]> {
  try {
    const [rows] = await crmPool.query<mysql.RowDataPacket[]>(
      'SELECT `value` FROM crm_config WHERE `key` = ? LIMIT 1',
      [CVL_TRAINING_MENTORSHIP_CONFIG_KEY]
    );
    const raw = rows?.[0]?.value;
    const cfg = raw
      ? normalizeCvlTrainingMentorshipConfig(JSON.parse(String(raw)))
      : structuredClone(DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG);
    const d = targetDate ? targetDate.slice(0, 10) : '';
    return cfg.pairs.filter((p) => p.isActive && (!d || (d >= p.startDate && d <= p.endDate)));
  } catch {
    const d = targetDate ? targetDate.slice(0, 10) : '';
    return DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG.pairs.filter(
      (p) => p.isActive && (!d || (d >= p.startDate && d <= p.endDate))
    );
  }
}

/**
 * Trả về danh sách ứng viên CC Mentor & CVL Mentee đang hoạt động để Admin chọn trong Modal cấu hình.
 */
export async function getConfigWithStaffOptionsImpl(
  fastify: FastifyInstance,
  loadConfig: () => Promise<CvlTrainingMentorshipConfig>
): Promise<CvlTrainingMentorshipConfigResponse> {
  const [config, activeCcIds, activeCvIds, crmCvlRows] = await Promise.all([
    loadConfig(),
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
          id: true,
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
  const officialCvlRoleMap = new Map<number, 'CVL' | 'CVLL'>();
  const crmMetaByLegacyId = new Map<number, { crmStaffId: number; currentRole: string }>();
  const cvlSet = new Set<number>();

  for (const s of crmCvlRows) {
    if (!s.legacyStaffId) continue;
    const progRole = String(s.careerProgression?.currentRole || '').toUpperCase();
    const staffRole = String(s.role || '').toUpperCase();
    const resolvedRole = progRole || staffRole;
    crmMetaByLegacyId.set(s.legacyStaffId, { crmStaffId: s.id, currentRole: resolvedRole });

    if (s.role === 'cc') {
      ccSet.add(s.legacyStaffId);
    } else {
      cvlSet.add(s.legacyStaffId);
      if (resolvedRole === 'CV_PLUS_PLUS' || resolvedRole === 'CVLL') {
        officialCvlRoleMap.set(s.legacyStaffId, 'CVLL');
      } else if (resolvedRole === 'CV_PLUS' || resolvedRole === 'CVL') {
        officialCvlRoleMap.set(s.legacyStaffId, 'CVL');
      }
    }
  }
  for (const p of config.pairs) {
    if (!officialCvlRoleMap.has(p.mentorLegacyStaffId) && !ccSet.has(p.mentorLegacyStaffId)) {
      ccSet.add(p.mentorLegacyStaffId);
    }
    cvlSet.add(p.menteeLegacyStaffId);
  }
  // Also allow selecting any active CV from Legacy if Admin wants to assign a newly-promoted CVL
  for (const id of activeCvIds) {
    cvlSet.add(id);
  }

  const mentorRoleRank = (group: CvlTrainingMentorshipStaffOption['roleGroup']): number => {
    if (group === 'CC') return 0;
    if (group === 'CVLL') return 1;
    return 2;
  };

  const mentorCandidateIds = new Set<number>([...ccSet, ...officialCvlRoleMap.keys()]);
  const ccMentors: CvlTrainingMentorshipStaffOption[] = Array.from(mentorCandidateIds)
    .map((id) => {
      const prof = profileMap.get(id);
      const roleGroup: CvlTrainingMentorshipStaffOption['roleGroup'] = ccSet.has(id)
        ? 'CC'
        : officialCvlRoleMap.get(id) || 'CVL';
      return {
        legacyStaffId: id,
        displayName: prof?.name || `${roleGroup} #${id}`,
        storeCode: prof?.storeCode || 'DT',
        roleGroup,
      };
    })
    .sort(
      (a, b) =>
        mentorRoleRank(a.roleGroup) - mentorRoleRank(b.roleGroup) || a.displayName.localeCompare(b.displayName, 'vi')
    );

  const cvlMentees: CvlTrainingMentorshipStaffOption[] = Array.from(cvlSet)
    .filter((id) => !ccSet.has(id) || config.pairs.some((p) => p.menteeLegacyStaffId === id))
    .map((id) => {
      const prof = profileMap.get(id);
      const roleGroup: CvlTrainingMentorshipStaffOption['roleGroup'] = officialCvlRoleMap.get(id) || 'CV';
      return {
        legacyStaffId: id,
        displayName: prof?.name || `CVL #${id}`,
        storeCode: prof?.storeCode || 'DT',
        roleGroup,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));

  const todayYmd = getVietnamDateYmd();
  const menteeLifecycleByStaffId: Record<number, CvlMenteeLifecycleSummary> = {};
  for (const m of cvlMentees) {
    const crmMeta = crmMetaByLegacyId.get(m.legacyStaffId);
    const lifecycle = resolveCvlTrainingLifecycleStatus({
      legacyStaffId: m.legacyStaffId,
      currentRole: crmMeta?.currentRole,
      pairs: config.pairs,
      todayYmd,
    });
    const refPair = lifecycle.activePair || lifecycle.pendingPair;
    menteeLifecycleByStaffId[m.legacyStaffId] = {
      crmStaffId: crmMeta?.crmStaffId,
      status: lifecycle.status,
      currentRole: crmMeta?.currentRole,
      ...(lifecycle.activePair ? { activePairId: lifecycle.activePair.id } : {}),
      ...(lifecycle.pendingPair ? { pendingPairId: lifecycle.pendingPair.id } : {}),
      ...(refPair ? { mentorDisplayName: refPair.mentorDisplayName } : {}),
    };
  }

  return {
    config,
    staffOptions: {
      ccMentors,
      cvlMentees,
    },
    menteeLifecycleByStaffId,
  };
}

export interface ResolveMentorshipOutcomeInput {
  pairId: string;
  action: 'GRADUATE' | 'EXTEND' | 'RETURN_TO_CV';
  newStartDate?: string;
  newEndDate?: string;
  mentorLegacyStaffId?: number;
  mentorDisplayName?: string;
  note?: string;
}

/**
 * Chốt kết quả kỳ Training của Mentee CVL:
 * - GRADUATE: duyệt lên CVL Chính thức (CV_PLUS, giữ quyền /ios-app, bảo toàn cặp Training làm lịch sử).
 * - EXTEND: chốt cặp cũ sang EXTENDED và mở cặp kỳ mới (kiểm tra ràng buộc 1-kèm-1).
 * - RETURN_TO_CV: trả về CV thường (tự động thu hồi quyền /ios-app).
 */
export async function resolveMentorshipOutcomeImpl(
  fastify: FastifyInstance,
  loadConfig: () => Promise<CvlTrainingMentorshipConfig>,
  input: ResolveMentorshipOutcomeInput,
  actor: { id: number; name: string }
): Promise<CvlTrainingMentorshipConfig> {
  const currentConfig = await loadConfig();
  const idx = currentConfig.pairs.findIndex((p) => p.id === input.pairId);
  if (idx < 0) {
    const err = new Error(`Không tìm thấy cặp đào tạo "${input.pairId}".`) as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  const target = currentConfig.pairs[idx];
  const todayYmd = getVietnamDateYmd();
  const nowIso = new Date().toISOString();
  const nextPairs = [...currentConfig.pairs];

  const crmStaff = await fastify.prisma.crm.crmStaff.findFirst({
    where: { legacyStaffId: target.menteeLegacyStaffId },
    select: { id: true },
  });

  if (input.action === 'GRADUATE') {
    nextPairs[idx] = {
      ...target,
      outcome: 'GRADUATED',
      resolvedAt: nowIso,
      resolvedBy: actor.name,
      ...(input.note ? { note: input.note } : {}),
    };
    const saved = await saveMentorshipConfig(fastify, { pairs: nextPairs }, actor.name);
    if (crmStaff) {
      await fastify.prisma.crm.crmCareerProgression.upsert({
        where: { staffId: crmStaff.id },
        create: {
          staffId: crmStaff.id,
          currentRole: 'CV_PLUS',
          targetRole: 'CV_PLUS_PLUS',
          status: 'PROMOTED',
          promotedAt: new Date(),
          promotedBy: actor.id,
        },
        update: {
          currentRole: 'CV_PLUS',
          targetRole: 'CV_PLUS_PLUS',
          status: 'PROMOTED',
          promotedAt: new Date(),
          promotedBy: actor.id,
        },
      });
      await fastify.prisma.crm.crmStaff.update({
        where: { id: crmStaff.id },
        data: { role: 'cv_plus' },
      });
    }
    return saved;
  }

  if (input.action === 'RETURN_TO_CV') {
    const cappedEndDate =
      target.endDate > todayYmd ? (todayYmd >= target.startDate ? todayYmd : target.endDate) : target.endDate;
    nextPairs[idx] = {
      ...target,
      endDate: cappedEndDate,
      isActive: target.startDate <= todayYmd,
      outcome: 'RETURNED_TO_CV',
      resolvedAt: nowIso,
      resolvedBy: actor.name,
      ...(input.note ? { note: input.note } : {}),
    };
    const saved = await saveMentorshipConfig(fastify, { pairs: nextPairs }, actor.name);
    if (crmStaff) {
      await fastify.prisma.crm.crmCareerProgression.upsert({
        where: { staffId: crmStaff.id },
        create: {
          staffId: crmStaff.id,
          currentRole: 'CV',
          targetRole: 'CV_PLUS',
          status: 'IN_PROGRESS',
          promotedBy: actor.id,
        },
        update: {
          currentRole: 'CV',
          targetRole: 'CV_PLUS',
          status: 'IN_PROGRESS',
          promotedBy: actor.id,
        },
      });
      await fastify.prisma.crm.crmStaff.update({
        where: { id: crmStaff.id },
        data: { role: 'cv' },
      });
    }
    return saved;
  }

  // EXTEND
  const newStart = String(input.newStartDate || '').slice(0, 10);
  const newEnd = String(input.newEndDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newStart) || !/^\d{4}-\d{2}-\d{2}$/.test(newEnd) || newStart > newEnd) {
    const err = new Error('Ngày bắt đầu / kết thúc kỳ gia hạn không hợp lệ.') as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  nextPairs[idx] = {
    ...target,
    outcome: 'EXTENDED',
    resolvedAt: nowIso,
    resolvedBy: actor.name,
  };
  nextPairs.push({
    ...target,
    id: `pair-${target.menteeLegacyStaffId}-${newStart}-${Date.now()}`,
    mentorLegacyStaffId: input.mentorLegacyStaffId || target.mentorLegacyStaffId,
    mentorDisplayName: input.mentorDisplayName || target.mentorDisplayName,
    startDate: newStart,
    endDate: newEnd,
    isActive: true,
    outcome: 'ACTIVE',
    resolvedAt: undefined,
    resolvedBy: undefined,
    note: input.note || `Gia hạn Training CVL (${newStart} → ${newEnd})`,
  });

  return saveMentorshipConfig(fastify, { pairs: nextPairs }, actor.name);
}
