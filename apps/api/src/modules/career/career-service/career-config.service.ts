import type { FastifyInstance } from 'fastify';
import {
  CareerProgressionConfig,
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  DEFAULT_FM_FLOOR_FARM_CONFIG,
  type FmFloorFarmConfig,
  type MaintenanceAndDemotionRules,
} from '@mos-lab/shared';

function mergeFmFloorFarmConfig(
  base: FmFloorFarmConfig | undefined,
  override: Partial<FmFloorFarmConfig> | undefined
): FmFloorFarmConfig {
  return {
    ...DEFAULT_FM_FLOOR_FARM_CONFIG,
    ...(base || {}),
    ...(override || {}),
  };
}

function mergeMaintenanceRules(
  base: MaintenanceAndDemotionRules | undefined,
  override: Partial<MaintenanceAndDemotionRules> | undefined,
  cvPlusPlusReq: CareerProgressionConfig['cvPlusToCvPlusPlus']
): MaintenanceAndDemotionRules {
  const defaultRules = DEFAULT_CAREER_PROGRESSION_CONFIG.maintenanceRules!;
  return {
    cvPlus: {
      minSelfComboRate:
        override?.cvPlus?.minSelfComboRate ?? base?.cvPlus?.minSelfComboRate ?? defaultRules.cvPlus.minSelfComboRate,
      maxFixRate: override?.cvPlus?.maxFixRate ?? base?.cvPlus?.maxFixRate ?? defaultRules.cvPlus.maxFixRate,
      minHappinessIndex:
        override?.cvPlus?.minHappinessIndex ?? base?.cvPlus?.minHappinessIndex ?? defaultRules.cvPlus.minHappinessIndex,
      consecutiveFailedMonthsToDemote:
        override?.cvPlus?.consecutiveFailedMonthsToDemote ??
        base?.cvPlus?.consecutiveFailedMonthsToDemote ??
        defaultRules.cvPlus.consecutiveFailedMonthsToDemote,
    },
    cvPlusPlus: {
      minSelfComboRate:
        cvPlusPlusReq.minSelfComboRate ??
        override?.cvPlusPlus?.minSelfComboRate ??
        base?.cvPlusPlus?.minSelfComboRate ??
        defaultRules.cvPlusPlus.minSelfComboRate,
      minHappinessIndex:
        override?.cvPlusPlus?.minHappinessIndex ??
        base?.cvPlusPlus?.minHappinessIndex ??
        defaultRules.cvPlusPlus.minHappinessIndex,
      consecutiveFailedMonthsToDemote:
        cvPlusPlusReq.consecutiveFailedMonthsToDemote ??
        override?.cvPlusPlus?.consecutiveFailedMonthsToDemote ??
        base?.cvPlusPlus?.consecutiveFailedMonthsToDemote ??
        defaultRules.cvPlusPlus.consecutiveFailedMonthsToDemote,
    },
  };
}

const CAREER_CONFIG_KEY = 'CAREER_PROGRESSION_RULES';

let cachedConfig: CareerProgressionConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds in-memory cache

/**
 * Lấy cấu hình lộ trình thăng tiến hiện hành từ DB.
 * Có cơ chế In-memory cache 60s và tự động fallback về DEFAULT nếu DB chưa có bản ghi.
 */
export async function getCareerConfig(fastify: FastifyInstance): Promise<CareerProgressionConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const record = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: CAREER_CONFIG_KEY },
    });

    if (record?.value) {
      const parsed = JSON.parse(record.value) as CareerProgressionConfig;
      const normalizedCvReq = {
        ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCc,
        ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCvPlus,
        ...(parsed.cvToCc || {}),
        ...(parsed.cvToCvPlus || {}),
      };
      delete normalizedCvReq.comboUnder3mBonus;
      delete normalizedCvReq.comboUnder4mBonus;
      if (!normalizedCvReq.minBananaCount || normalizedCvReq.minBananaCount <= 1) {
        normalizedCvReq.minBananaCount = 20;
      }

      const normalizedCvPlusReq = {
        ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvPlusToCvPlusPlus,
        ...(parsed.cvPlusToCvPlusPlus || {}),
      };
      delete normalizedCvPlusReq.comboUnder3mBonus;
      delete normalizedCvPlusReq.comboUnder4mBonus;

      const mergedMaintenance = mergeMaintenanceRules(
        DEFAULT_CAREER_PROGRESSION_CONFIG.maintenanceRules,
        parsed.maintenanceRules,
        normalizedCvPlusReq
      );

      const resolvedConfig: CareerProgressionConfig = {
        ...DEFAULT_CAREER_PROGRESSION_CONFIG,
        ...parsed,
        cvToCc: normalizedCvReq,
        cvToCvPlus: normalizedCvReq,
        cvPlusToCvPlusPlus: normalizedCvPlusReq,
        cvPlusPlusToFm: { ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvPlusPlusToFm, ...(parsed.cvPlusPlusToFm || {}) },
        ccToFm: { ...DEFAULT_CAREER_PROGRESSION_CONFIG.ccToFm, ...(parsed.ccToFm || {}) },
        fmToCho: { ...DEFAULT_CAREER_PROGRESSION_CONFIG.fmToCho, ...(parsed.fmToCho || {}) },
        choToBoss: { ...DEFAULT_CAREER_PROGRESSION_CONFIG.choToBoss, ...(parsed.choToBoss || {}) },
        rewardRates: { ...DEFAULT_CAREER_PROGRESSION_CONFIG.rewardRates, ...(parsed.rewardRates || {}) },
        fmFloorFarm: mergeFmFloorFarmConfig(DEFAULT_CAREER_PROGRESSION_CONFIG.fmFloorFarm, parsed.fmFloorFarm),
        maintenanceRules: mergedMaintenance,
      };
      cachedConfig = resolvedConfig;
      cacheTimestamp = now;
      return resolvedConfig;
    }
  } catch (err) {
    fastify.log.warn({ err }, 'Failed to read career config from DB, falling back to default');
  }

  cachedConfig = DEFAULT_CAREER_PROGRESSION_CONFIG;
  cacheTimestamp = now;
  return cachedConfig;
}

/**
 * Cập nhật cấu hình mới vào DB và xóa cache ngay lập tức.
 */
export async function updateCareerConfig(
  fastify: FastifyInstance,
  newConfig: Partial<CareerProgressionConfig>,
  updatedBy: string
): Promise<CareerProgressionConfig> {
  const current = await getCareerConfig(fastify);
  const mergedCvReq = {
    ...current.cvToCc,
    ...current.cvToCvPlus,
    ...(newConfig.cvToCc || {}),
    ...(newConfig.cvToCvPlus || {}),
  };
  delete mergedCvReq.comboUnder3mBonus;
  delete mergedCvReq.comboUnder4mBonus;

  const mergedCvPlusReq = {
    ...current.cvPlusToCvPlusPlus,
    ...(newConfig.cvPlusToCvPlusPlus || {}),
  };
  delete mergedCvPlusReq.comboUnder3mBonus;
  delete mergedCvPlusReq.comboUnder4mBonus;

  const mergedMaintenance = mergeMaintenanceRules(
    current.maintenanceRules,
    newConfig.maintenanceRules,
    mergedCvPlusReq
  );

  const merged: CareerProgressionConfig = {
    ...current,
    ...newConfig,
    version: newConfig.version || current.version || '2026.5',
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || 'Admin',
    cvToCc: mergedCvReq,
    cvToCvPlus: mergedCvReq,
    cvPlusToCvPlusPlus: mergedCvPlusReq,
    cvPlusPlusToFm: { ...current.cvPlusPlusToFm, ...(newConfig.cvPlusPlusToFm || {}) },
    ccToFm: { ...current.ccToFm, ...(newConfig.ccToFm || {}) },
    fmToCho: { ...current.fmToCho, ...(newConfig.fmToCho || {}) },
    choToBoss: { ...current.choToBoss, ...(newConfig.choToBoss || {}) },
    rewardRates: { ...current.rewardRates, ...(newConfig.rewardRates || {}) },
    fmFloorFarm: mergeFmFloorFarmConfig(current.fmFloorFarm, newConfig.fmFloorFarm),
    maintenanceRules: mergedMaintenance,
  };

  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: CAREER_CONFIG_KEY },
    create: {
      key: CAREER_CONFIG_KEY,
      value: JSON.stringify(merged),
    },
    update: {
      value: JSON.stringify(merged),
    },
  });

  // Invalidate cache
  cachedConfig = merged;
  cacheTimestamp = Date.now();

  return merged;
}

/**
 * Xóa bộ nhớ đệm để ép nạp mới dữ liệu từ Production
 */
export function invalidateCareerConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}
