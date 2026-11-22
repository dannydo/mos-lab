import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../../middlewares/auth.js';
import { CvSpeedDetail, CvSpeedMatrix, CvSpeedRanking, LashServiceMode, SafeAny } from '@mos-lab/shared';
import type { StaffPhaseMetrics } from '../../services/cv-speed-model.service.js';

export const STANDARD_STYLES = ['Classic', 'Mink', 'Volume', 'Ultralight', 'Hyperlight', 'Ivylight', 'Under Mink'];
export const STANDARD_MODES: LashServiceMode[] = ['normal_clean', 'normal_removal', 'retain'];
export const STANDARD_COUNTS = [30, 60, 70, 80, 90, 100, 120, 140];

interface DetailCacheEntry {
  data: CvSpeedDetail;
  expiresAt: number;
}
export const cvDetailCache = new Map<number, DetailCacheEntry>();
export const inFlightDetailPromises = new Map<number, Promise<CvSpeedDetail>>();
export const CV_DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;

interface MatrixCacheEntry {
  data: CvSpeedMatrix;
  expiresAt: number;
}
export const cvMatrixCache = new Map<string, MatrixCacheEntry>();
export const inFlightMatrixPromises = new Map<string, Promise<CvSpeedMatrix>>();
export const CV_MATRIX_CACHE_TTL_MS = 15 * 60 * 1000;

interface RankingCacheEntry {
  data: CvSpeedRanking[];
  expiresAt: number;
}
export const cvRankingCache = new Map<string, RankingCacheEntry>();
export const inFlightRankingPromises = new Map<string, Promise<CvSpeedRanking[]>>();
export const CV_RANKING_CACHE_TTL_MS = 15 * 60 * 1000;

interface SpeedFactorsCacheEntry {
  data: Map<number, StaffPhaseMetrics>;
  expiresAt: number;
}
let speedFactorsCache: SpeedFactorsCacheEntry | null = null;
let inFlightSpeedFactorsPromise: Promise<Map<number, StaffPhaseMetrics>> | null = null;
const SPEED_FACTORS_CACHE_TTL_MS = 60 * 60 * 1000;

interface StaffTrendsCacheEntry {
  data: Map<number, 'improving' | 'declining' | 'stable'>;
  expiresAt: number;
}
let staffTrendsCache: StaffTrendsCacheEntry | null = null;
let inFlightStaffTrendsPromise: Promise<Map<number, 'improving' | 'declining' | 'stable'>> | null = null;
const STAFF_TRENDS_CACHE_TTL_MS = 30 * 60 * 1000;

export type CvSpeedRouteRegistrar = (method: 'get' | 'post', path: string, handler: SafeAny) => void;

export function createCvSpeedRouteRegistrar(fastify: FastifyInstance): CvSpeedRouteRegistrar {
  return (method: 'get' | 'post', path: string, handler: SafeAny) => {
    fastify[method](`/kpi/cv-speed${path}`, { preHandler: [requireAuth] }, handler);
    fastify[method](`/cv-speed${path}`, { preHandler: [requireAuth] }, handler);
  };
}

export function clearCvSpeedCache(staffId?: number) {
  if (staffId) {
    cvDetailCache.delete(staffId);
    inFlightDetailPromises.delete(staffId);
  } else {
    cvDetailCache.clear();
    inFlightDetailPromises.clear();
  }
  cvMatrixCache.clear();
  cvRankingCache.clear();
  speedFactorsCache = null;
  staffTrendsCache = null;
}

export const clearCvSpeedDetailCache = clearCvSpeedCache;

export async function getStaffTrendsBatch(
  legacyPrisma: SafeAny,
  staffIds: number[]
): Promise<Map<number, 'improving' | 'declining' | 'stable'>> {
  const map = new Map<number, 'improving' | 'declining' | 'stable'>();
  if (!staffIds || staffIds.length === 0) return map;

  const now = Date.now();
  if (staffTrendsCache && staffTrendsCache.expiresAt > now) {
    return staffTrendsCache.data;
  }

  if (inFlightStaffTrendsPromise) {
    return await inFlightStaffTrendsPromise;
  }

  inFlightStaffTrendsPromise = (async () => {
    try {
      const rows = (await legacyPrisma.$queryRawUnsafe(`
        SELECT
          os.assigned_staff_id as staff_id,
          AVG(CASE WHEN COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 3 MONTH) THEN (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) ELSE NULL END) as recent_avg,
          AVG(CASE WHEN COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) < DATE_SUB(NOW(), INTERVAL 3 MONTH) THEN (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) ELSE NULL END) as prior_avg
        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        JOIN report_order_service ros ON os.id = ros.order_service_id
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND os.assigned_staff_id IN (${staffIds.join(',')})
          AND (
            ro.actual_booking_date_start >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 6 MONTH))
          )
        GROUP BY os.assigned_staff_id
      `)) as Array<{ staff_id: number; recent_avg: number | null; prior_avg: number | null }>;

      for (const r of rows) {
        const recent = Number(r.recent_avg || 0);
        const prior = Number(r.prior_avg || 0);
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (recent > 0 && prior > 0) {
          const diffPercent = ((recent - prior) / prior) * 100;
          if (diffPercent < -5) trend = 'improving';
          else if (diffPercent > 5) trend = 'declining';
        }
        map.set(Number(r.staff_id), trend);
      }

      staffTrendsCache = {
        data: map,
        expiresAt: Date.now() + STAFF_TRENDS_CACHE_TTL_MS,
      };
      return map;
    } catch {
      return map;
    } finally {
      inFlightStaffTrendsPromise = null;
    }
  })();

  return await inFlightStaffTrendsPromise;
}

export async function getStaffOverallSpeedFactors(
  legacyPrisma: SafeAny,
  staffIds: number[]
): Promise<Map<number, StaffPhaseMetrics>> {
  const map = new Map<number, StaffPhaseMetrics>();
  if (!staffIds || staffIds.length === 0) return map;

  const now = Date.now();
  if (speedFactorsCache && speedFactorsCache.expiresAt > now) {
    return speedFactorsCache.data;
  }

  if (inFlightSpeedFactorsPromise) {
    return await inFlightSpeedFactorsPromise;
  }

  inFlightSpeedFactorsPromise = (async () => {
    try {
      const rows = (await legacyPrisma.$queryRawUnsafe(`
        SELECT
          sb.user_id AS staff_id,
          ROUND(AVG(COALESCE(ros.cleaning_minute, 0))) AS avg_clean,
          ROUND(AVG(COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0))) AS avg_prep,
          ROUND(AVG(COALESCE(ros.servicing_minute, 0))) AS avg_ext,
          ROUND(AVG(COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0))) AS avg_time
        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        JOIN report_order_service ros ON os.id = ros.order_service_id
        LEFT JOIN report_order ro ON ro.order_id = o.id
        JOIN staff_bonus sb ON sb.order_service_id = os.id
        WHERE o.order_state = 'Completed'
          AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
          AND sb.user_id IN (${staffIds.join(',')})
          AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) BETWEEN 15 AND 200
        GROUP BY sb.user_id
      `)) as Array<{ staff_id: number; avg_clean: number; avg_prep: number; avg_ext: number; avg_time: number | null }>;

      const validRows = rows.filter((r) => r.staff_id && Number(r.avg_time) > 0);
      if (validRows.length > 0) {
        const globalAvg = validRows.reduce((acc, r) => acc + Number(r.avg_time), 0) / validRows.length;
        validRows.forEach((r) => {
          const staffAvg = Number(r.avg_time);
          const ratio = Math.max(0.75, Math.min(1.3, staffAvg / (globalAvg || 60)));
          map.set(Number(r.staff_id), {
            ratio,
            avgCleaning: Math.max(3, Math.min(25, Number(r.avg_clean || 10))),
            avgPrepQc: Math.max(3, Math.min(35, Number(r.avg_prep || 10))),
            avgExtension: Math.max(15, Number(r.avg_ext || 45)),
          });
        });
      }

      speedFactorsCache = {
        data: map,
        expiresAt: Date.now() + SPEED_FACTORS_CACHE_TTL_MS,
      };
      return map;
    } catch {
      return map;
    } finally {
      inFlightSpeedFactorsPromise = null;
    }
  })();

  return await inFlightSpeedFactorsPromise;
}
