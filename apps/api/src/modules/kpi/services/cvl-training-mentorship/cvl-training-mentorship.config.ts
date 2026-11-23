import { FastifyInstance } from 'fastify';
import type mysql from 'mysql2/promise';
import {
  CVL_TRAINING_MENTORSHIP_CONFIG_KEY,
  CvlTrainingMentorshipConfig,
  CvlTrainingMentorshipConfigResponse,
  CvlTrainingMentorshipPair,
  CvlTrainingMentorshipStaffOption,
  DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG,
  SafeAny,
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
