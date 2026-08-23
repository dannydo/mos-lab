import type { FastifyInstance } from 'fastify';
import {
  ACADEMY_TALENT_STRANDS_5_MIN_MAX,
  ACADEMY_TALENT_TIERS,
  type AcademyTalentLadderConfiguration,
  type AcademyTalentLadderTierConfiguration,
  type AcademyTalentTier,
  type AcademyTalentTierKey,
  type UpdateAcademyTalentLadderConfigurationRequest,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from './academy-sales.service.js';

/** Global CRM configuration key; no per-browser or per-campaign state. */
export const ACADEMY_TALENT_LADDER_CONFIG_KEY = 'ACADEMY_TALENT_LADDER_CONFIG';

const DEFAULT_BUBBLE_HEIGHTS: Record<AcademyTalentTierKey, number> = {
  level1: 20,
  level2: 29,
  level3: 38,
  level4: 47,
  level5: 57,
  level6: 67,
};

const DEFAULT_TIER_COLORS = ['#94a3b8', '#f97316', '#6366f1', '#10b981', '#f59e0b', '#a855f7'];
const MAX_LADDER_TIERS = 10;

type StoredLadderTier = Pick<
  AcademyTalentLadderTierConfiguration,
  | 'key'
  | 'title'
  | 'strands'
  | 'scholarshipPercent'
  | 'sampleRewardPercent'
  | 'kitRewardPercent'
  | 'bubbleHeightPercent'
>;

function defaultTiers(): AcademyTalentLadderTierConfiguration[] {
  return ACADEMY_TALENT_TIERS.map((tier) => ({
    key: tier.key,
    title: tier.title,
    strands: tier.strands,
    scholarshipPercent: tier.scholarshipPercent,
    sampleRewardPercent: tier.sampleRewardPercent,
    kitRewardPercent: tier.kitRewardPercent,
    bubbleHeightPercent: DEFAULT_BUBBLE_HEIGHTS[tier.key],
  }));
}

function asInteger(value: unknown, label: string, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new AcademySalesError(`${label} phải là số nguyên từ ${min} đến ${max}.`);
  }
  return parsed;
}

function isTierKey(value: unknown): value is AcademyTalentTierKey {
  return typeof value === 'string' && /^[a-z][a-z0-9_-]{0,63}$/i.test(value);
}

function normalizeSubmittedTiers(value: unknown, allowLegacyMaterialRewards = false): StoredLadderTier[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_LADDER_TIERS) {
    throw new AcademySalesError(`Cấu hình bậc thang cần có từ 1 đến ${MAX_LADDER_TIERS} mốc.`, 400);
  }

  const seen = new Set<AcademyTalentTierKey>();
  const legacyStrandsByKey = new Map<string, number>(ACADEMY_TALENT_TIERS.map((tier) => [tier.key, tier.strands]));
  const tiers: StoredLadderTier[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') throw new AcademySalesError('Mốc học bổng không hợp lệ.', 400);
    const item = raw as Record<string, unknown>;
    if (!isTierKey(item.key) || seen.has(item.key)) {
      throw new AcademySalesError('Mỗi mốc học bổng chỉ được cấu hình một lần.', 400);
    }
    const title = String(item.title || '').trim();
    if (!title || title.length > 80) {
      throw new AcademySalesError('Tên mốc phải có từ 1 đến 80 ký tự.', 400);
    }
    seen.add(item.key);
    const scholarshipPercent = asInteger(item.scholarshipPercent, 'Phần trăm học bổng', 0, 100);
    const legacyMaterialReward = Math.min(scholarshipPercent, 20);
    const legacyStrands = legacyStrandsByKey.get(item.key);
    if (item.strands === undefined && (!allowLegacyMaterialRewards || legacyStrands === undefined)) {
      throw new AcademySalesError('Mốc số sợi là bắt buộc.', 400);
    }
    tiers.push({
      key: item.key,
      title,
      strands:
        item.strands === undefined
          ? legacyStrands!
          : asInteger(item.strands, 'Mốc số sợi', 1, ACADEMY_TALENT_STRANDS_5_MIN_MAX),
      scholarshipPercent,
      sampleRewardPercent:
        item.sampleRewardPercent === undefined && allowLegacyMaterialRewards
          ? legacyMaterialReward
          : asInteger(item.sampleRewardPercent, 'Ưu đãi mẫu', 0, 100),
      kitRewardPercent:
        item.kitRewardPercent === undefined && allowLegacyMaterialRewards
          ? legacyMaterialReward
          : asInteger(item.kitRewardPercent, 'Ưu đãi đồ nghề', 0, 100),
      bubbleHeightPercent: asInteger(item.bubbleHeightPercent, 'Độ cao bubble', 0, 80),
    });
  }

  const orderedTiers = [...tiers].sort((left, right) => left.strands - right.strands);
  for (let index = 1; index < orderedTiers.length; index += 1) {
    if (orderedTiers[index].strands <= orderedTiers[index - 1].strands) {
      throw new AcademySalesError('Mốc số sợi phải tăng dần và không được trùng nhau.', 400);
    }
  }
  return orderedTiers;
}

function parseStoredTiers(value: string | null | undefined): StoredLadderTier[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { tiers?: unknown } | unknown;
    return normalizeSubmittedTiers(
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as { tiers?: unknown }).tiers : parsed,
      true
    );
  } catch {
    return null;
  }
}

function attachRubric(tiers: StoredLadderTier[]): AcademyTalentLadderTierConfiguration[] {
  return [...tiers].sort((left, right) => left.strands - right.strands);
}

/** Converts the admin-managed global policy into the scoring rubric shape. */
export function academyTalentLadderCalculationTiers(
  configuration: AcademyTalentLadderConfiguration
): AcademyTalentTier[] {
  return [...configuration.tiers]
    .sort((left, right) => left.strands - right.strands)
    .map((tier, index) => {
      const defaultTier = ACADEMY_TALENT_TIERS.find((candidate) => candidate.key === tier.key);
      return {
        key: tier.key,
        title: tier.title,
        strands: tier.strands,
        scholarshipPercent: tier.scholarshipPercent,
        sampleRewardPercent: tier.sampleRewardPercent,
        kitRewardPercent: tier.kitRewardPercent,
        color: defaultTier?.color || DEFAULT_TIER_COLORS[index % DEFAULT_TIER_COLORS.length],
      };
    });
}

export class AcademyTalentLadderConfigurationService {
  static async get(fastify: FastifyInstance): Promise<AcademyTalentLadderConfiguration> {
    const record = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: ACADEMY_TALENT_LADDER_CONFIG_KEY },
      select: { value: true, updatedAt: true },
    });
    const storedTiers = parseStoredTiers(record?.value);
    return {
      tiers: storedTiers ? attachRubric(storedTiers) : defaultTiers(),
      updatedAt: record?.updatedAt?.toISOString() || null,
    };
  }

  static async getCalculationTiers(fastify: FastifyInstance): Promise<AcademyTalentTier[]> {
    return academyTalentLadderCalculationTiers(await this.get(fastify));
  }

  /** The policy version is attached to a future invoice snapshot for audit. */
  static async getCalculationPolicy(fastify: FastifyInstance) {
    const [configuration, audit] = await Promise.all([
      this.get(fastify),
      fastify.prisma.crm.crmAcademyTalentPolicyAudit.findFirst({
        where: { configKey: ACADEMY_TALENT_LADDER_CONFIG_KEY },
        select: { id: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    return {
      tiers: academyTalentLadderCalculationTiers(configuration),
      auditId: audit?.id ?? null,
    };
  }

  static async update(
    fastify: FastifyInstance,
    actor: AcademyActor,
    input: UpdateAcademyTalentLadderConfigurationRequest
  ): Promise<AcademyTalentLadderConfiguration> {
    const tiers = normalizeSubmittedTiers(input?.tiers);
    const record = await fastify.prisma.crm.$transaction(async (tx) => {
      const saved = await tx.crmConfig.upsert({
        where: { key: ACADEMY_TALENT_LADDER_CONFIG_KEY },
        update: { value: JSON.stringify({ tiers }) },
        create: { key: ACADEMY_TALENT_LADDER_CONFIG_KEY, value: JSON.stringify({ tiers }) },
        select: { value: true, updatedAt: true },
      });
      await tx.crmAcademyTalentPolicyAudit.create({
        data: {
          configKey: ACADEMY_TALENT_LADDER_CONFIG_KEY,
          policySnapshotJson: JSON.stringify({ tiers }),
          changedByStaffId: actor.id,
        },
      });
      return saved;
    });
    return {
      tiers: attachRubric(tiers),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
