import mysql from 'mysql2/promise';
import {
  IosCvHistoricalCaseSample,
  IosCvLashMaterialKey,
  IosCvSelfSpeedHistoryProfile,
  normalizeHistoricalOrderRowToSample,
} from '@mos-lab/shared';

interface CvSelfSpeedCacheEntry {
  profile: IosCvSelfSpeedHistoryProfile;
  expiresAt: number;
}

const cvSelfSpeedCache = new Map<number, CvSelfSpeedCacheEntry>();
const CV_SELF_SPEED_CACHE_TTL_MS = 30_000;

export function invalidateCvSelfSpeedCache(staffIds?: number[]): void {
  if (!staffIds || staffIds.length === 0) {
    cvSelfSpeedCache.clear();
    return;
  }
  for (const rawId of staffIds) {
    const id = Number(rawId);
    if (Number.isFinite(id) && id > 0) {
      cvSelfSpeedCache.delete(id);
    }
  }
}

function estimateStandardBenchmarkMinutes(sample: IosCvHistoricalCaseSample): number {
  const count = sample.countPerEye || 60;
  let base =
    count <= 30
      ? 25
      : count <= 50
        ? 50
        : count <= 60
          ? 55
          : count <= 70
            ? 60
            : count <= 80
              ? 68
              : count <= 100
                ? 80
                : 95;

  const multByMaterial: Record<IosCvLashMaterialKey, number> = {
    undermink: 0.9,
    classic: 0.95,
    mink: 1.0,
    ivylight: 1.05,
    volume: 1.1,
    hyperlight: 1.15,
    ultralight: 1.25,
  };
  base = base * (multByMaterial[sample.materialKey] || 1.0);
  if (sample.mode === 'Retain') {
    base = base * 0.78;
  }
  return Math.max(20, Math.round(base));
}

export function buildCompactSpeedProfileFromSamples(
  staffId: number,
  allSamplesNewestFirst: IosCvHistoricalCaseSample[]
): IosCvSelfSpeedHistoryProfile {
  const bucketCounts = new Map<string, number>();
  const keptSamples: IosCvHistoricalCaseSample[] = [];
  let ratioSum = 0;
  let ratioCount = 0;

  for (const sample of allSamplesNewestFirst) {
    const stdMin = estimateStandardBenchmarkMinutes(sample);
    if (stdMin > 0) {
      ratioSum += sample.durationMinutes / stdMin;
      ratioCount += 1;
    }

    const bucketKey = `${sample.materialKey}|${sample.mode}|${sample.fanNum}|${sample.countPerEye}`;
    const currentBucketLen = bucketCounts.get(bucketKey) || 0;
    if (currentBucketLen < 4 && keptSamples.length < 120) {
      bucketCounts.set(bucketKey, currentBucketLen + 1);
      keptSamples.push(sample);
    }
  }

  const rawRatio = ratioCount > 0 ? ratioSum / ratioCount : 1.0;
  const overallSpeedRatio = Math.round(Math.max(0.75, Math.min(1.25, rawRatio)) * 1000) / 1000;

  return {
    staffId,
    samples: keptSamples,
    overallSpeedRatio,
  };
}

export async function fetchLiveCvSelfSpeedProfiles(
  pool: mysql.Pool,
  staffIds: number[],
  logWarn?: (meta: unknown, msg: string) => void
): Promise<Map<number, IosCvSelfSpeedHistoryProfile>> {
  const uniqueIds = Array.from(new Set(staffIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)));
  const result = new Map<number, IosCvSelfSpeedHistoryProfile>();
  if (uniqueIds.length === 0) return result;

  const now = Date.now();
  const missingIds: number[] = [];

  for (const id of uniqueIds) {
    const cached = cvSelfSpeedCache.get(id);
    if (cached && cached.expiresAt > now) {
      result.set(id, cached.profile);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) {
    return result;
  }

  try {
    const placeholders = missingIds.map(() => '?').join(',');
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT
         ros.assigned_staff_id,
         ros.service_type,
         ros.attribute_volume,
         ros.total_lashes_count_required,
         ros.preparation_minute,
         ros.pre_servicing_minute,
         ros.cleaning_minute,
         ros.servicing_minute,
         s.service_key,
         s.is_temporary,
         sl.service_name
       FROM report_order_service ros
       JOIN \`order\` o ON o.id = ros.order_id
       LEFT JOIN service s ON s.id = ros.service_id
       LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
       WHERE ros.assigned_staff_id IN (${placeholders})
         AND o.order_state = 'Completed'
         AND (s.is_temporary IS NULL OR s.is_temporary = 0)
         AND (
           COALESCE(ros.preparation_minute, 0) +
           COALESCE(ros.pre_servicing_minute, 0) +
           COALESCE(ros.cleaning_minute, 0) +
           COALESCE(ros.servicing_minute, 0)
         ) BETWEEN 16 AND 199
         AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       ORDER BY o.booking_date_start DESC, ros.id DESC`,
      missingIds
    );

    const groupedByStaff = new Map<number, IosCvHistoricalCaseSample[]>();
    for (const id of missingIds) {
      groupedByStaff.set(id, []);
    }

    for (const row of rows || []) {
      const sid = Number(row.assigned_staff_id);
      if (!sid) continue;
      const sample = normalizeHistoricalOrderRowToSample({
        serviceKey: row.service_key ? String(row.service_key) : null,
        serviceName: row.service_name ? String(row.service_name) : null,
        serviceType: row.service_type ? String(row.service_type) : null,
        attributeVolume: row.attribute_volume ? String(row.attribute_volume) : null,
        totalLashesCountRequired:
          row.total_lashes_count_required !== undefined && row.total_lashes_count_required !== null
            ? Number(row.total_lashes_count_required)
            : null,
        isTemporary: row.is_temporary !== undefined && row.is_temporary !== null ? Number(row.is_temporary) : null,
        preparationMinute: Number(row.preparation_minute || 0),
        preServicingMinute: Number(row.pre_servicing_minute || 0),
        cleaningMinute: Number(row.cleaning_minute || 0),
        servicingMinute: Number(row.servicing_minute || 0),
      });
      if (!sample) continue;
      const list = groupedByStaff.get(sid);
      if (list) list.push(sample);
    }

    const expiresAt = Date.now() + CV_SELF_SPEED_CACHE_TTL_MS;
    for (const sid of missingIds) {
      const profile = buildCompactSpeedProfileFromSamples(sid, groupedByStaff.get(sid) || []);
      cvSelfSpeedCache.set(sid, { profile, expiresAt });
      result.set(sid, profile);
    }
  } catch (err) {
    logWarn?.({ err }, 'Could not query CV self speed history profiles');
    for (const sid of missingIds) {
      result.set(sid, { staffId: sid, samples: [], overallSpeedRatio: 1.0 });
    }
  }

  return result;
}

export function buildDemoCvSelfSpeedProfile(staffId: number): IosCvSelfSpeedHistoryProfile {
  return {
    staffId,
    overallSpeedRatio: 0.96,
    samples: [
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 58 },
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 62 },
      { materialKey: 'hyperlight', mode: 'Normal', fanNum: 4, countPerEye: 70, durationMinutes: 60 },
      { materialKey: 'hyperlight', mode: 'Retain', fanNum: 4, countPerEye: 70, durationMinutes: 42 },
      { materialKey: 'hyperlight', mode: 'Retain', fanNum: 4, countPerEye: 70, durationMinutes: 46 },
      { materialKey: 'hyperlight', mode: 'Retain', fanNum: 4, countPerEye: 70, durationMinutes: 44 },
      { materialKey: 'classic', mode: 'Normal', fanNum: 1, countPerEye: 70, durationMinutes: 52 },
      { materialKey: 'classic', mode: 'Normal', fanNum: 1, countPerEye: 70, durationMinutes: 55 },
      { materialKey: 'classic', mode: 'Normal', fanNum: 1, countPerEye: 70, durationMinutes: 51 },
      { materialKey: 'mink', mode: 'Normal', fanNum: 1, countPerEye: 70, durationMinutes: 61 },
      { materialKey: 'mink', mode: 'Normal', fanNum: 1, countPerEye: 70, durationMinutes: 64 },
      { materialKey: 'mink', mode: 'Normal', fanNum: 1, countPerEye: 70, durationMinutes: 59 },
      { materialKey: 'undermink', mode: 'Normal', fanNum: 1, countPerEye: 30, durationMinutes: 22 },
      { materialKey: 'undermink', mode: 'Normal', fanNum: 1, countPerEye: 30, durationMinutes: 24 },
      { materialKey: 'undermink', mode: 'Normal', fanNum: 1, countPerEye: 30, durationMinutes: 23 },
    ],
  };
}
