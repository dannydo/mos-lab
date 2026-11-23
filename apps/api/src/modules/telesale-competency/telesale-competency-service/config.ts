import { FastifyInstance } from 'fastify';
import {
  TelesaleTier,
  TelesaleCompetencyGlobalConfig,
  DEFAULT_TELESALE_COMPETENCY_CONFIG,
  TelesaleCompetencyConfigVersion,
  TelesaleConfigValidationResult,
  DEFAULT_TELESALE_CONFIG_VERSION,
} from '@mos-lab/shared';
import { CONFIG_KEY, VERSIONS_KEY, OperatorActor, readCrmConfigJsonSafe, upsertCrmConfigJson } from './constants.js';

/**
 * ---------------------------------------------------------
 * Quản Lý Phiên Bản Cấu Hình Khung Năng Lực (MOS-FEAT-142)
 * ---------------------------------------------------------
 */

/**
 * Lấy danh sách tất cả các phiên bản cấu hình (Draft, Published, Archived)
 */
export async function listConfigVersions(fastify?: FastifyInstance): Promise<TelesaleCompetencyConfigVersion[]> {
  const list = await readCrmConfigJsonSafe<TelesaleCompetencyConfigVersion[]>(fastify, VERSIONS_KEY);
  if (Array.isArray(list) && list.length > 0) {
    return list.sort((a, b) => b.versionNumber - a.versionNumber);
  }

  // Khởi tạo mặc định nếu chưa có
  const initialList = [DEFAULT_TELESALE_CONFIG_VERSION];
  try {
    await upsertCrmConfigJson(fastify, VERSIONS_KEY, initialList);
  } catch {
    // non-blocking
  }
  return initialList;
}

/**
 * Lấy chi tiết một phiên bản cấu hình theo ID
 */
export async function getConfigVersion(
  fastify: FastifyInstance | undefined,
  versionId: string
): Promise<TelesaleCompetencyConfigVersion | null> {
  const list = await listConfigVersions(fastify);
  return list.find((v) => v.versionId === versionId) || null;
}

/**
 * Lấy phiên bản cấu hình có hiệu lực cho một tháng cụ thể (Không hồi tố kỳ cũ)
 */
export async function getVersionForMonth(
  fastify: FastifyInstance | undefined,
  month = '2026-10'
): Promise<TelesaleCompetencyConfigVersion> {
  const list = await listConfigVersions(fastify);
  // Lọc các bản đã ban hành có effectiveDate <= month
  const published = list
    .filter((v) => v.status === 'PUBLISHED' && v.effectiveDate <= month)
    .sort((a, b) => {
      if (a.effectiveDate !== b.effectiveDate) {
        return b.effectiveDate.localeCompare(a.effectiveDate);
      }
      return b.versionNumber - a.versionNumber;
    });

  if (published.length > 0) {
    return published[0];
  }

  // Fallback: Bản ban hành mới nhất hoặc mặc định
  const anyPublished = list.find((v) => v.status === 'PUBLISHED');
  return anyPublished || DEFAULT_TELESALE_CONFIG_VERSION;
}

/**
 * Kiểm tra tính hợp lệ của phiên bản cấu hình trước khi ban hành
 */
export function validateConfigVersion(version: TelesaleCompetencyConfigVersion): TelesaleConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Kiểm tra 4 trụ cột A, B, C, D
  const pw = version.pillarsWeight;
  if (!pw) {
    errors.push('Thiếu cấu hình trọng số 4 trụ cột');
  } else {
    const sum =
      Number(pw.pillarAWeight || 0) +
      Number(pw.pillarBWeight || 0) +
      Number(pw.pillarCWeight || 0) +
      Number(pw.pillarDWeight || 0);
    if (Math.abs(sum - 100) > 0.01) {
      errors.push(
        `Tổng trọng số 4 trụ cột (A: ${pw.pillarAWeight} + B: ${pw.pillarBWeight} + C: ${pw.pillarCWeight} + D: ${pw.pillarDWeight} = ${sum}%) phải bằng đúng 100%`
      );
    }
  }

  // 2. Kiểm tra ngày hiệu lực
  if (!version.effectiveDate || !/^\d{4}-\d{2}$/.test(version.effectiveDate)) {
    errors.push('Ngày bắt đầu hiệu lực không hợp lệ (định dạng chuẩn YYYY-MM, ví dụ: 2026-11)');
  }

  // 3. Kiểm tra Trụ cột A & 5 chỉ số KPI
  const pA = version.pillarAConfig;
  if (!pA) {
    errors.push('Thiếu cấu hình chi tiết Trụ cột A');
  } else {
    const kpis = [pA.doneKpi, pA.newCustomersKpi, pA.revenueKpi, pA.conversionKpi, pA.callProductivityKpi];
    for (const kpi of kpis) {
      if (!kpi || typeof kpi.maxScore !== 'number' || kpi.maxScore <= 0) {
        errors.push(`Điểm tối đa của chỉ số ${kpi?.name || 'KPI'} phải lớn hơn 0`);
      }
    }
    const kpiSum = kpis.reduce((acc, k) => acc + (k?.maxScore || 0), 0);
    const expectedA = pw?.pillarAWeight || 40;
    if (Math.abs(kpiSum - expectedA) > 0.01) {
      warnings.push(
        `Tổng điểm tối đa 5 chỉ số Trụ cột A (${kpiSum}đ) chưa khớp với trọng số Trụ cột A (${expectedA}đ). Hệ thống sẽ chuẩn hóa tự động khi tính điểm.`
      );
    }
  }

  // 4. Kiểm tra danh mục 9 Level
  if (!Array.isArray(version.levelTargets) || version.levelTargets.length !== 9) {
    errors.push('Cần cấu hình đầy đủ đúng 9 Level (Level 1 đến Level 9)');
  } else {
    for (let i = 0; i < version.levelTargets.length; i++) {
      const item = version.levelTargets[i];
      if (item.doneTarget <= 0) {
        errors.push(`Level ${item.level}: KPI Done phải lớn hơn 0`);
      }
      if (i > 0 && item.doneTarget < version.levelTargets[i - 1].doneTarget) {
        errors.push(
          `Level ${item.level} (${item.doneTarget} Done) không được thấp hơn Level ${item.level - 1} (${version.levelTargets[i - 1].doneTarget} Done)`
        );
      }
    }
  }

  // 5. Kiểm tra quy tắc các bậc Tier & Fresher
  const tiers: TelesaleTier[] = ['FRESHER', 'JUNIOR', 'MID_LEVEL', 'SENIOR'];
  for (const t of tiers) {
    const rule = version.tierRules?.[t];
    if (!rule) {
      errors.push(`Thiếu cấu hình điều kiện cho chức danh ${t}`);
    } else {
      if (rule.passingScore < 50 || rule.passingScore > 100) {
        errors.push(`Chức danh ${rule.label}: Điểm chuẩn phải nằm trong khoảng 50 - 100 điểm`);
      }
      if (rule.consecutiveMonthsRequired < 1) {
        errors.push(`Chức danh ${rule.label}: Số tháng liên tiếp đạt chuẩn phải >= 1`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Tạo một bản nháp cấu hình mới
 */
export async function createDraftVersion(
  fastify: FastifyInstance,
  payload: Partial<TelesaleCompetencyConfigVersion>,
  author: OperatorActor
): Promise<TelesaleCompetencyConfigVersion> {
  const list = await listConfigVersions(fastify);
  const nextVersionNumber = Math.max(...list.map((v) => v.versionNumber), 0) + 1;
  const baseVersion = list.find((v) => v.versionId === payload.versionId) || list[0] || DEFAULT_TELESALE_CONFIG_VERSION;

  const draft: TelesaleCompetencyConfigVersion = {
    ...baseVersion,
    versionId: `cfg-v${nextVersionNumber}-${Date.now().toString(36)}`,
    versionNumber: nextVersionNumber,
    name: payload.name || `Bản Nháp Khung Năng Lực v${nextVersionNumber}`,
    status: 'DRAFT',
    effectiveDate: payload.effectiveDate || new Date().toISOString().slice(0, 7),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: undefined,
    publishedByStaffId: undefined,
    publishedByName: undefined,
    authorStaffId: author.id,
    authorName: author.name || 'Admin',
    changelog: payload.changelog || 'Khởi tạo bản nháp mới',
    pillarsWeight: payload.pillarsWeight || baseVersion.pillarsWeight,
    pillarAConfig: payload.pillarAConfig || baseVersion.pillarAConfig,
    levelTargets: payload.levelTargets || baseVersion.levelTargets,
    tierRules: payload.tierRules || baseVersion.tierRules,
    standardWorkingDays: payload.standardWorkingDays || baseVersion.standardWorkingDays,
    maxOverflowBonusRate: payload.maxOverflowBonusRate || baseVersion.maxOverflowBonusRate,
  };

  list.unshift(draft);
  await upsertCrmConfigJson(fastify, VERSIONS_KEY, list);

  return draft;
}

/**
 * Cập nhật bản nháp cấu hình
 */
export async function updateDraftVersion(
  fastify: FastifyInstance,
  versionId: string,
  payload: Partial<TelesaleCompetencyConfigVersion>
): Promise<TelesaleCompetencyConfigVersion> {
  const list = await listConfigVersions(fastify);
  const index = list.findIndex((v) => v.versionId === versionId);
  if (index === -1) {
    throw new Error(`Không tìm thấy phiên bản cấu hình ID: ${versionId}`);
  }

  const current = list[index];
  if (current.status !== 'DRAFT') {
    throw new Error('Không thể chỉnh sửa trực tiếp phiên bản đã ban hành hoặc đã lưu trữ. Vui lòng tạo bản nháp mới.');
  }

  const updated: TelesaleCompetencyConfigVersion = {
    ...current,
    name: payload.name !== undefined ? payload.name : current.name,
    effectiveDate: payload.effectiveDate !== undefined ? payload.effectiveDate : current.effectiveDate,
    changelog: payload.changelog !== undefined ? payload.changelog : current.changelog,
    pillarsWeight: payload.pillarsWeight
      ? { ...current.pillarsWeight, ...payload.pillarsWeight }
      : current.pillarsWeight,
    pillarAConfig: payload.pillarAConfig
      ? { ...current.pillarAConfig, ...payload.pillarAConfig }
      : current.pillarAConfig,
    levelTargets: payload.levelTargets ? payload.levelTargets : current.levelTargets,
    tierRules: payload.tierRules ? { ...current.tierRules, ...payload.tierRules } : current.tierRules,
    standardWorkingDays:
      payload.standardWorkingDays !== undefined ? payload.standardWorkingDays : current.standardWorkingDays,
    maxOverflowBonusRate:
      payload.maxOverflowBonusRate !== undefined ? payload.maxOverflowBonusRate : current.maxOverflowBonusRate,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updated;
  await upsertCrmConfigJson(fastify, VERSIONS_KEY, list);

  return updated;
}

/**
 * Xóa bản nháp cấu hình
 */
export async function deleteDraftVersion(fastify: FastifyInstance, versionId: string): Promise<boolean> {
  const list = await listConfigVersions(fastify);
  const target = list.find((v) => v.versionId === versionId);
  if (!target) {
    throw new Error(`Không tìm thấy phiên bản cấu hình ID: ${versionId}`);
  }
  if (target.status !== 'DRAFT') {
    throw new Error('Chỉ được phép xóa bản nháp (DRAFT). Không thể xóa phiên bản đã ban hành.');
  }

  const nextList = list.filter((v) => v.versionId !== versionId);
  await upsertCrmConfigJson(fastify, VERSIONS_KEY, nextList);
  return true;
}

/**
 * Ban hành chính thức phiên bản cấu hình (PUBLISH)
 */
export async function publishConfigVersion(
  fastify: FastifyInstance,
  versionId: string,
  effectiveDate: string,
  publisher: OperatorActor
): Promise<TelesaleCompetencyConfigVersion> {
  const list = await listConfigVersions(fastify);
  const index = list.findIndex((v) => v.versionId === versionId);
  if (index === -1) {
    throw new Error(`Không tìm thấy phiên bản cấu hình ID: ${versionId}`);
  }

  const target = list[index];
  const validation = validateConfigVersion({
    ...target,
    effectiveDate: effectiveDate || target.effectiveDate,
  });
  if (!validation.valid) {
    throw new Error(`Cấu hình chưa hợp lệ: ${validation.errors.join('; ')}`);
  }

  // Ban hành target
  const published: TelesaleCompetencyConfigVersion = {
    ...target,
    status: 'PUBLISHED',
    effectiveDate: effectiveDate || target.effectiveDate,
    publishedAt: new Date().toISOString(),
    publishedByStaffId: publisher.id,
    publishedByName: publisher.name || 'Admin',
    updatedAt: new Date().toISOString(),
  };

  // Chuyển bản trước đó cùng effectiveDate sang ARCHIVED
  for (let i = 0; i < list.length; i++) {
    if (i !== index && list[i].status === 'PUBLISHED' && list[i].effectiveDate === published.effectiveDate) {
      list[i].status = 'ARCHIVED';
      list[i].updatedAt = new Date().toISOString();
    }
  }

  list[index] = published;
  await upsertCrmConfigJson(fastify, VERSIONS_KEY, list);

  return published;
}

/**
 * ---------------------------------------------------------
 * Cấu hình toàn cục Legacy Fallback (Backward Compatibility)
 * ---------------------------------------------------------
 */

/**
 * Lấy cấu hình toàn cục
 */
export async function getConfig(fastify?: FastifyInstance): Promise<TelesaleCompetencyGlobalConfig> {
  const parsed = await readCrmConfigJsonSafe<Partial<TelesaleCompetencyGlobalConfig>>(fastify, CONFIG_KEY);
  if (parsed) {
    return {
      ...DEFAULT_TELESALE_COMPETENCY_CONFIG,
      ...parsed,
    };
  }
  return DEFAULT_TELESALE_COMPETENCY_CONFIG;
}

/**
 * Cập nhật cấu hình toàn cục
 */
export async function saveConfig(
  fastify: FastifyInstance,
  config: Partial<TelesaleCompetencyGlobalConfig>
): Promise<TelesaleCompetencyGlobalConfig> {
  const current = await getConfig(fastify);
  const updated: TelesaleCompetencyGlobalConfig = {
    ...current,
    ...config,
    tiers: {
      ...current.tiers,
      ...(config.tiers || {}),
    },
    pillarAWeights: {
      ...current.pillarAWeights,
      ...(config.pillarAWeights || {}),
    },
  };

  await upsertCrmConfigJson(fastify, CONFIG_KEY, updated);

  return updated;
}
