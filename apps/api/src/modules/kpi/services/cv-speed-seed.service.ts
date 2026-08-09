import { LashServiceMode, CvSpeedSeedResult, CvSpeedPrediction, SafeAny } from '@mos-lab/shared';
import {
  fitLogarithmicModel,
  getCvRollingWindowMonths,
  computeSpeedRating,
  computeConfidence,
  predictCvSpeed,
} from './cv-speed-model.service.js';
import { parseLashSpecs } from '../../catalog/services/lash-benchmark.service.js';

export const STANDARD_LASH_STYLES: string[] = [
  'Classic',
  'Mink',
  'Volume 3D',
  'Volume 4D',
  'Volume 5D',
  'Ultralight',
  'Hyperlight',
  'Flawless',
  'Ivylight',
  'Under Mink',
];

export const STANDARD_SERVICE_MODES: LashServiceMode[] = ['normal_clean', 'normal_removal', 'retain'];

export const STANDARD_LASH_COUNTS: number[] = [30, 60, 70, 80, 90, 100, 120, 140];

export const DEFAULT_FALLBACK_CV_IDS: number[] = [47510, 48026, 46092, 37790, 34295, 51659];

/**
 * Fetch active CV staff IDs from crmConfig (ACTIVE_CV_STAFF_CONFIG) or legacy DB.
 */
async function getActiveCvStaffIds(crmPrisma: any, legacyPrisma: any): Promise<number[]> {
  let candidateIds: number[] = [];
  try {
    const record = await crmPrisma.crmConfig.findUnique({
      where: { key: 'ACTIVE_CV_STAFF_CONFIG' },
    });

    if (record && record.value) {
      const parsed = JSON.parse(record.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        candidateIds = parsed.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0);
      }
    }
  } catch (err) {
    // Fallback to legacy DB query
  }

  if (candidateIds.length === 0) {
    try {
      const rows = (await legacyPrisma.$queryRawUnsafe(`
        SELECT DISTINCT sb.user_id AS staff_id
        FROM staff_bonus sb
        JOIN user_profile up ON up.user_id = sb.user_id
        WHERE sb.bonus_type = 'Banana'
          AND sb.date_created >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
          AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0
          AND up.user_group_id IN (4, 45)
        LIMIT 20
      `)) as Array<{ staff_id: number }>;

      if (rows && rows.length > 0) {
        candidateIds = rows.map((r) => Number(r.staff_id)).filter((id) => id > 0);
      }
    } catch (err) {
      // Fallback
    }
  }

  if (candidateIds.length === 0) {
    candidateIds = DEFAULT_FALLBACK_CV_IDS;
  }

  // Filter against user_profile to guarantee only active Chuyên viên (group 4, 45) are returned
  try {
    const activeRows = (await legacyPrisma.$queryRawUnsafe(`
      SELECT user_id FROM user_profile 
      WHERE user_id IN (${candidateIds.join(',')}) 
        AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0 
        AND user_group_id IN (4, 45)
    `)) as Array<{ user_id: number }>;

    if (activeRows && activeRows.length > 0) {
      return activeRows.map((r) => Number(r.user_id));
    }
  } catch (err) {
    // Fallback to candidateIds if query fails
  }

  return candidateIds;
}

export interface StaffInfo {
  id: number;
  name: string;
  avatarUrl: string | null;
}

/**
 * Fetch staff display names & avatar URLs from legacy user_profile table.
 */
async function getStaffInfoMap(legacyPrisma: any, staffIds: number[]): Promise<Map<number, StaffInfo>> {
  const map = new Map<number, StaffInfo>();
  if (!staffIds || staffIds.length === 0) return map;

  try {
    const rows = (await legacyPrisma.$queryRawUnsafe(`
      SELECT up.user_id as id, up.full_name, up.avatar
      FROM user_profile up
      WHERE up.user_id IN (${staffIds.join(',')})
    `)) as Array<{ id: number; full_name: string | null; avatar: string | null }>;

    for (const r of rows) {
      const id = Number(r.id);
      const name = r.full_name && r.full_name.trim() ? r.full_name.trim() : `Chuyên viên ${id}`;
      let avatarUrl = r.avatar || null;
      if (avatarUrl && avatarUrl.startsWith('http://')) {
        avatarUrl = avatarUrl.replace('http://', 'https://');
      }
      map.set(id, { id, name, avatarUrl });
    }
  } catch (err) {
    console.error('[CvSpeedSeed] Error fetching staff profile info:', err);
  }

  return map;
}

/**
 * Helper: Enforce strictly increasing total minutes as lash count increases.
 */
function enforceMonotonicity(predictions: CvSpeedPrediction[]): CvSpeedPrediction[] {
  const sorted = [...predictions].sort((a, b) => a.lashCount - b.lashCount);
  const result: CvSpeedPrediction[] = [];

  let prevTotal = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item: CvSpeedPrediction = { ...sorted[i], predictedMinutes: { ...sorted[i].predictedMinutes } };

    if (i > 0 && item.predictedMinutes.total <= prevTotal) {
      const countDiff = item.lashCount - sorted[i - 1].lashCount;
      const minIncrement = Math.max(1, Math.round(countDiff * 0.3));
      const newTotal = prevTotal + minIncrement;

      item.predictedMinutes.total = newTotal;
      item.predictedMinutes.extension = newTotal - item.predictedMinutes.cleaning - item.predictedMinutes.prepQc;

      if (item.benchmarkMinutes > 0) {
        item.speedDeltaPercent =
          Math.round(((newTotal - item.benchmarkMinutes) / item.benchmarkMinutes) * 100 * 10) / 10;
        item.speedRating = computeSpeedRating(newTotal, item.benchmarkMinutes);
      }
    }

    prevTotal = item.predictedMinutes.total;
    result.push(item);
  }

  return result;
}

/**
 * Run nightly model recalculation for all active CVs across all lash styles, service modes, and counts.
 * Upserts result into crm_cv_speed_profile.
 */
/**
 * Run nightly model recalculation for all active CVs across all lash styles, service modes, and counts.
 * Upserts result into crm_cv_speed_profile.
 */
export async function runNightlyCvSpeedSeed(crmPrisma: any, legacyPrisma: any): Promise<CvSpeedSeedResult> {
  const activeCvIds = await getActiveCvStaffIds(crmPrisma, legacyPrisma);
  const staffMap = await getStaffInfoMap(legacyPrisma, activeCvIds);

  // 1. Bulk fetch all benchmarks into a map
  const allBenchmarks = await crmPrisma.crmLashTypeBenchmark.findMany();
  const benchmarkMap = new Map<string, number>();
  allBenchmarks.forEach((b: any) => {
    benchmarkMap.set(`${b.lashStyle}_${b.lashCount}`, b.benchmarkMinutes);
  });

  let profilesProcessed = 0;

  for (const staffId of activeCvIds) {
    const staffInfo = staffMap.get(staffId);
    const staffName = staffInfo?.name || `Chuyên viên ${staffId}`;
    const windowMonths = await getCvRollingWindowMonths(legacyPrisma, staffId);

    // 2. Pre-fetch ALL historical cases for this staff member in 1 fast query
    let staffCases: Array<{
      lashStyle: string;
      serviceMode: LashServiceMode;
      lashCount: number;
      cleaning: number;
      extension: number;
      prepQc: number;
      total: number;
    }> = [];

    try {
      const rawCases = (await legacyPrisma.$queryRawUnsafe(`
        SELECT
          s.service_key,
          COALESCE(sl.service_name, s.service_key) as service_name,
          s.service_type,
          COALESCE(ros.cleaning_minute, 0) as cleaning_minute,
          COALESCE(ros.servicing_minute, 0) as servicing_minute,
          COALESCE(ros.preparation_minute, 0) as preparation_minute,
          COALESCE(ros.pre_servicing_minute, 0) as pre_servicing_minute
        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        JOIN service s ON os.service_id = s.id
        JOIN report_order_service ros ON os.id = ros.order_service_id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        WHERE o.order_state = 'Completed'
          AND (
            os.assigned_staff_id = ${Number(staffId)}
            OR EXISTS (SELECT 1 FROM staff_bonus sb WHERE sb.order_service_id = os.id AND sb.user_id = ${Number(staffId)})
          )
          AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) > 15
          AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) < 200
          AND COALESCE(
            (SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1),
            o.booking_date_start
          ) >= DATE_SUB(
            COALESCE(
              (SELECT MAX(o2.booking_date_start) FROM \`order\` o2 WHERE o2.order_state = 'Completed'),
              NOW()
            ),
            INTERVAL 12 MONTH
          )
      `)) as Array<{
        service_key: string;
        service_name: string;
        service_type: string;
        cleaning_minute: number;
        servicing_minute: number;
        preparation_minute: number;
        pre_servicing_minute: number;
      }>;

      staffCases = rawCases.map((c) => {
        const specs = parseLashSpecs(c.service_key, c.service_name);
        const cleaning = Number(c.cleaning_minute || 0);
        const extension = Number(c.servicing_minute || 0);
        const prepQc = Number(c.preparation_minute || 0) + Number(c.pre_servicing_minute || 0);
        const total = cleaning + extension + prepQc;
        const mode: LashServiceMode = c.service_type === 'Retain' ? 'retain' : 'normal_clean';
        return {
          lashStyle: specs.lashStyle,
          serviceMode: mode,
          lashCount: specs.lashCount || 60,
          cleaning,
          extension,
          prepQc,
          total,
        };
      });
    } catch (err) {
      console.error(`[CvSpeedSeed] Error fetching rawCases for staff ${staffId}:`, err);
      staffCases = [];
    }

    for (const style of STANDARD_LASH_STYLES) {
      for (const mode of STANDARD_SERVICE_MODES) {
        // Generate predictions for all standard counts for this (staff, style, mode)
        const rawPredictions: CvSpeedPrediction[] = [];
        for (const count of STANDARD_LASH_COUNTS) {
          const bmMinutes = benchmarkMap.get(`${style}_${count}`);
          const pred = await predictCvSpeed(
            crmPrisma,
            legacyPrisma,
            staffId,
            style,
            mode,
            count,
            staffCases,
            bmMinutes
          );
          rawPredictions.push(pred);
        }

        // Enforce Monotonicity Invariant: total time must strictly increase as lash count increases
        const monotonicPredictions = enforceMonotonicity(rawPredictions);

        // Upsert into crm_cv_speed_profile
        for (const pred of monotonicPredictions) {
          await crmPrisma.crmCvSpeedProfile.upsert({
            where: {
              staffId_lashStyle_serviceMode_lashCount: {
                staffId: pred.staffId,
                lashStyle: pred.lashStyle,
                serviceMode: pred.serviceMode,
                lashCount: pred.lashCount,
              },
            },
            update: {
              staffName,
              cleaningMinutes: pred.predictedMinutes.cleaning,
              extensionMinutes: pred.predictedMinutes.extension,
              prepQcMinutes: pred.predictedMinutes.prepQc,
              totalMinutes: pred.predictedMinutes.total,
              modelLayer: pred.modelLayer,
              sampleSize: pred.sampleSize,
              confidence: pred.confidence,
              regA: pred.regA ?? null,
              regB: pred.regB ?? null,
              regRSquared: pred.regRSquared ?? null,
              benchmarkTotalMinutes: pred.benchmarkMinutes,
              speedDeltaPercent: pred.speedDeltaPercent,
              speedRating: pred.speedRating,
            },
            create: {
              staffId: pred.staffId,
              staffName,
              lashStyle: pred.lashStyle,
              serviceMode: pred.serviceMode,
              lashCount: pred.lashCount,
              cleaningMinutes: pred.predictedMinutes.cleaning,
              extensionMinutes: pred.predictedMinutes.extension,
              prepQcMinutes: pred.predictedMinutes.prepQc,
              totalMinutes: pred.predictedMinutes.total,
              modelLayer: pred.modelLayer,
              sampleSize: pred.sampleSize,
              confidence: pred.confidence,
              regA: pred.regA ?? null,
              regB: pred.regB ?? null,
              regRSquared: pred.regRSquared ?? null,
              benchmarkTotalMinutes: pred.benchmarkMinutes,
              speedDeltaPercent: pred.speedDeltaPercent,
              speedRating: pred.speedRating,
            },
          });
          profilesProcessed++;
        }
      }
    }
  }

  return {
    success: true,
    profilesProcessed,
    cvsCount: activeCvIds.length,
    timestamp: new Date().toISOString(),
  };
}

export async function getActiveCvStaffList(crmPrisma: SafeAny, legacyPrisma: SafeAny): Promise<StaffInfo[]> {
  const activeCvIds = await getActiveCvStaffIds(crmPrisma, legacyPrisma);
  const staffMap = await getStaffInfoMap(legacyPrisma, activeCvIds);

  return activeCvIds.map((id) => staffMap.get(id) || { id, name: `Chuyên viên ${id}`, avatarUrl: null });
}

export const CvSpeedSeedService = {
  runNightlyCvSpeedSeed,
  getActiveCvStaffList,
};
