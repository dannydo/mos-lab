import { LashServiceMode, SpeedRating, ConfidenceLevel, ModelLayer, CvSpeedPrediction, SafeAny } from '@mos-lab/shared';
import { parseLashSpecs } from '../../catalog/services/lash-benchmark.service.js';

export interface LogFitResult {
  a: number;
  b: number;
  rSquared: number;
  isMonotonic: boolean;
}

/**
 * Fit logarithmic regression model y = a + b * ln(n)
 * where n = lashCount and y = timeMinutes.
 */
export function fitLogarithmicModel(dataPoints: Array<{ lashCount: number; timeMinutes: number }>): LogFitResult {
  if (!dataPoints || dataPoints.length < 2) {
    return { a: 0, b: 0, rSquared: 0, isMonotonic: false };
  }

  const validPoints = dataPoints.filter((p) => p.lashCount > 0 && p.timeMinutes > 0);
  if (validPoints.length < 2) {
    return { a: 0, b: 0, rSquared: 0, isMonotonic: false };
  }

  const n = validPoints.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  const points = validPoints.map((p) => ({
    x: Math.log(p.lashCount),
    y: p.timeMinutes,
  }));

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  const denominator = sumX2 - n * meanX * meanX;
  if (Math.abs(denominator) < 1e-9) {
    return { a: Math.round(meanY * 100) / 100, b: 0, rSquared: 0, isMonotonic: false };
  }

  const b = (sumXY - n * meanX * meanY) / denominator;
  const a = meanY - b * meanX;

  // Calculate R^2 (coefficient of determination)
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const yHat = a + b * p.x;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - yHat) ** 2;
  }

  const rSquared = ssTot > 1e-9 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;
  const isMonotonic = b > 0;

  return {
    a: Math.round(a * 100) / 100,
    b: Math.round(b * 100) / 100,
    rSquared: Math.round(rSquared * 100) / 100,
    isMonotonic,
  };
}

/**
 * Determine CV rolling window (in months) based on seniority & experience:
 * - Junior (< 6 months working OR < 200 total lash cases): 3 months
 * - Mid-level (6-12 months working): 4 months
 * - Senior (>= 12 months working): 6 months
 */
export async function getCvRollingWindowMonths(legacyPrisma: SafeAny, staffId: number): Promise<number> {
  try {
    const firstBonusRow = (await legacyPrisma.$queryRawUnsafe(`
      SELECT MIN(date_created) as first_date
      FROM staff_bonus
      WHERE user_id = ${Number(staffId)}
    `)) as Array<{ first_date: Date }>;

    const firstDate = firstBonusRow[0]?.first_date ? new Date(firstBonusRow[0].first_date) : null;

    const caseCountRow = (await legacyPrisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT os.id) as cnt
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN staff_bonus sb ON sb.order_service_id = os.id
      WHERE (os.assigned_staff_id = ${Number(staffId)} OR sb.user_id = ${Number(staffId)})
        AND o.order_state = 'Completed'
    `)) as Array<{ cnt: number }>;

    const totalCases = Number(caseCountRow[0]?.cnt || 0);

    if (!firstDate) {
      return 3; // Junior fallback
    }

    const now = new Date();
    const monthsWorking = Math.max(
      0,
      (now.getFullYear() - firstDate.getFullYear()) * 12 + (now.getMonth() - firstDate.getMonth())
    );

    if (monthsWorking >= 12 && totalCases >= 200) {
      return 6; // Senior
    }
    if (monthsWorking < 6 || totalCases < 200) {
      return 3; // Junior
    }
    return 4; // Mid-level
  } catch {
    return 3;
  }
}

/**
 * Detect customer service mode:
 * - 'retain': Refill service (serviceType === 'Retain')
 * - 'normal_removal': Customer has prior lash completed order in past 2 months
 * - 'normal_clean': Customer has no prior lash completed order in past 2 months
 */
export async function detectServiceMode(
  legacyPrisma: SafeAny,
  customerId: number,
  serviceType?: string
): Promise<LashServiceMode> {
  if (serviceType && serviceType.toLowerCase() === 'retain') {
    return 'retain';
  }

  if (!customerId || customerId <= 0) {
    return 'normal_clean';
  }

  try {
    const historyRow = (await legacyPrisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT o.id) as cnt
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      LEFT JOIN report_order ro ON o.id = ro.order_id
      WHERE o.user_id = ${Number(customerId)}
        AND o.order_state = 'Completed'
        AND s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
    `)) as Array<{ cnt: number }>;

    const priorOrders = Number(historyRow[0]?.cnt || 0);
    return priorOrders > 0 ? 'normal_removal' : 'normal_clean';
  } catch {
    return 'normal_clean';
  }
}

/**
 * Batch detect customer service mode for a list of customer IDs & items in 1 single SQL query.
 */
export async function detectServiceModeBatch(
  legacyPrisma: SafeAny,
  items: Array<{ customerId: number; serviceType?: string }>
): Promise<Map<number, LashServiceMode>> {
  const result = new Map<number, LashServiceMode>();
  if (!items || items.length === 0) return result;

  const validCustomerIds: number[] = [];

  for (const item of items) {
    if (item.serviceType && item.serviceType.toLowerCase() === 'retain') {
      result.set(item.customerId, 'retain');
    } else if (item.customerId && item.customerId > 0) {
      validCustomerIds.push(item.customerId);
    }
  }

  const uniqueIds = Array.from(new Set(validCustomerIds));
  if (uniqueIds.length === 0) {
    return result;
  }

  try {
    const rows = (await legacyPrisma.$queryRawUnsafe(`
      SELECT o.user_id, COUNT(DISTINCT o.id) as cnt
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      LEFT JOIN report_order ro ON o.id = ro.order_id
      WHERE o.user_id IN (${uniqueIds.join(',')})
        AND o.order_state = 'Completed'
        AND s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
      GROUP BY o.user_id
    `)) as Array<{ user_id: number; cnt: number }>;

    const priorSet = new Set<number>();
    rows.forEach((r) => {
      if (Number(r.cnt || 0) > 0) {
        priorSet.add(Number(r.user_id));
      }
    });

    for (const cid of uniqueIds) {
      if (!result.has(cid)) {
        result.set(cid, priorSet.has(cid) ? 'normal_removal' : 'normal_clean');
      }
    }
  } catch {
    for (const cid of uniqueIds) {
      if (!result.has(cid)) {
        result.set(cid, 'normal_clean');
      }
    }
  }

  return result;
}

/**
 * Compute speed rating relative to benchmark:
 * - 'fast' (Green): < -10% vs benchmark
 * - 'slow' (Red): > +10% vs benchmark
 * - 'normal' (Yellow): -10% to +10%
 */
export function computeSpeedRating(predictedTotal: number, benchmarkTotal: number): SpeedRating {
  if (!benchmarkTotal || benchmarkTotal <= 0) return 'normal';
  const deltaPercent = ((predictedTotal - benchmarkTotal) / benchmarkTotal) * 100;
  if (deltaPercent < -10) return 'fast';
  if (deltaPercent > 10) return 'slow';
  return 'normal';
}

/**
 * Compute confidence level based on layer & sample size
 */
export function computeConfidence(sampleSize: number, layer: number): ConfidenceLevel {
  if (layer === 1 && sampleSize >= 5) return 'high';
  if (layer === 2 && sampleSize >= 3) return 'medium';
  return 'low';
}

/**
 * 3-Layer Speed Estimation Cascade per CV per (lashStyle, serviceMode, lashCount)
 */
export async function predictCvSpeed(
  crmPrisma: SafeAny,
  legacyPrisma: SafeAny,
  staffId: number,
  lashStyle: string,
  serviceMode: LashServiceMode,
  lashCount: number,
  preFetchedCases?: Array<{
    lashStyle: string;
    serviceMode?: LashServiceMode;
    lashCount: number;
    cleaning: number;
    extension: number;
    prepQc: number;
    total: number;
  }>,
  preFetchedBenchmarkMinutes?: number,
  overallStaffSpeedFactor?: number
): Promise<CvSpeedPrediction> {
  let parsedCases: Array<{
    lashStyle: string;
    lashCount: number;
    cleaning: number;
    extension: number;
    prepQc: number;
    total: number;
  }> = [];

  if (preFetchedCases) {
    parsedCases = preFetchedCases.filter((c) => {
      const matchStyle = c.lashStyle === lashStyle;
      const matchMode = serviceMode === 'retain' ? c.serviceMode === 'retain' : c.serviceMode !== 'retain';
      return matchStyle && matchMode;
    });
  } else {
    const windowMonths = await getCvRollingWindowMonths(legacyPrisma, staffId);

    // Helper SQL filter for lash style
    const styleCondition = getStyleSqlFilter(lashStyle);

    // Helper SQL filter for service mode
    let serviceModeCondition = "s.service_type != 'Retain'";
    if (serviceMode === 'retain') {
      serviceModeCondition = "s.service_type = 'Retain'";
    }

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
      JOIN staff_bonus sb ON sb.order_service_id = os.id
      WHERE o.order_state = 'Completed'
        AND (os.assigned_staff_id = ${Number(staffId)} OR sb.user_id = ${Number(staffId)})
        AND ${serviceModeCondition}
        AND ${styleCondition}
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

    parsedCases = rawCases.map((c) => {
      const specs = parseLashSpecs(c.service_key, c.service_name);
      const cleaning = Number(c.cleaning_minute || 0);
      const extension = Number(c.servicing_minute || 0);
      const prepQc = Number(c.preparation_minute || 0) + Number(c.pre_servicing_minute || 0);
      const total = cleaning + extension + prepQc;
      return {
        lashStyle: specs.lashStyle,
        lashCount: specs.lashCount || 60,
        cleaning,
        extension,
        prepQc,
        total,
      };
    });
  }

  // Query benchmark for comparison
  let rawBenchmarkMinutes = preFetchedBenchmarkMinutes;
  if (rawBenchmarkMinutes === undefined) {
    const benchmarkRow = await crmPrisma.crmLashTypeBenchmark.findFirst({
      where: {
        lashStyle,
        ...(lashCount ? { lashCount } : {}),
      },
      orderBy: { lashCount: 'asc' },
    });

    rawBenchmarkMinutes = benchmarkRow?.benchmarkMinutes || getFallbackBenchmark(lashStyle, serviceMode, lashCount);
  }

  const benchmarkTotalMinutes: number = rawBenchmarkMinutes || getFallbackBenchmark(lashStyle, serviceMode, lashCount);

  // Layer 1: Direct exact match data points >= 5
  const exactCases = parsedCases.filter((c) => c.lashCount === lashCount);
  if (exactCases.length >= 5) {
    const sortedTotal = exactCases.map((c) => c.total).sort((a, b) => a - b);
    const sortedClean = exactCases.map((c) => c.cleaning).sort((a, b) => a - b);
    const sortedExt = exactCases.map((c) => c.extension).sort((a, b) => a - b);
    const sortedPrep = exactCases.map((c) => c.prepQc).sort((a, b) => a - b);

    const medianTotal = Math.round(sortedTotal[Math.floor(sortedTotal.length / 2)]);
    const medianClean = Math.round(sortedClean[Math.floor(sortedClean.length / 2)]);
    const medianExt = Math.round(sortedExt[Math.floor(sortedExt.length / 2)]);
    const medianPrep = Math.round(sortedPrep[Math.floor(sortedPrep.length / 2)]);

    const speedDeltaPercent = Math.round(((medianTotal - benchmarkTotalMinutes) / benchmarkTotalMinutes) * 1000) / 10;
    const speedRating = computeSpeedRating(medianTotal, benchmarkTotalMinutes);

    return {
      staffId,
      lashStyle,
      serviceMode,
      lashCount,
      predictedMinutes: {
        cleaning: medianClean,
        extension: medianExt,
        prepQc: medianPrep,
        total: medianTotal,
      },
      modelLayer: 1 as ModelLayer,
      sampleSize: exactCases.length,
      confidence: 'high' as ConfidenceLevel,
      speedRating,
      benchmarkMinutes: benchmarkTotalMinutes,
      speedDeltaPercent,
    };
  }

  // Layer 2: Logarithmic Regression Interpolation (>= 3 data points across count series)
  if (parsedCases.length >= 3) {
    const dataPoints = parsedCases.map((c) => ({ lashCount: c.lashCount, timeMinutes: c.total }));
    const logFit = fitLogarithmicModel(dataPoints);

    if (logFit.isMonotonic && logFit.rSquared >= 0.5) {
      const predTotal = Math.max(20, Math.round(logFit.a + logFit.b * Math.log(lashCount)));
      const avgCleanRatio = parsedCases.reduce((acc, c) => acc + c.cleaning / (c.total || 1), 0) / parsedCases.length;
      const avgPrepRatio = parsedCases.reduce((acc, c) => acc + c.prepQc / (c.total || 1), 0) / parsedCases.length;

      const predClean = Math.max(5, Math.round(predTotal * (avgCleanRatio || 0.15)));
      const predPrep = Math.max(5, Math.round(predTotal * (avgPrepRatio || 0.1)));
      const predExt = Math.max(10, predTotal - predClean - predPrep);

      const speedDeltaPercent = Math.round(((predTotal - benchmarkTotalMinutes) / benchmarkTotalMinutes) * 1000) / 10;
      const speedRating = computeSpeedRating(predTotal, benchmarkTotalMinutes);

      return {
        staffId,
        lashStyle,
        serviceMode,
        lashCount,
        predictedMinutes: {
          cleaning: predClean,
          extension: predExt,
          prepQc: predPrep,
          total: predTotal,
        },
        modelLayer: 2 as ModelLayer,
        sampleSize: parsedCases.length,
        confidence: 'medium' as ConfidenceLevel,
        regA: logFit.a,
        regB: logFit.b,
        regRSquared: logFit.rSquared,
        speedRating,
        benchmarkMinutes: benchmarkTotalMinutes,
        speedDeltaPercent,
      };
    }
  }

  // Layer 3: Global Benchmark Fallback (with CV overall relative speed factor)
  let speedRatio = overallStaffSpeedFactor && overallStaffSpeedFactor > 0 ? overallStaffSpeedFactor : 1.0;
  if (parsedCases.length > 0) {
    const cvAvg = parsedCases.reduce((acc, c) => acc + c.total, 0) / parsedCases.length;
    const bmAvg = benchmarkTotalMinutes || 60;
    speedRatio = Math.max(0.7, Math.min(1.3, cvAvg / bmAvg));
  }

  const predTotal = Math.max(25, Math.round(benchmarkTotalMinutes * speedRatio));
  const predClean = Math.round(predTotal * 0.15);
  const predPrep = Math.round(predTotal * 0.1);
  const predExt = predTotal - predClean - predPrep;

  const speedDeltaPercent = Math.round(((predTotal - benchmarkTotalMinutes) / benchmarkTotalMinutes) * 1000) / 10;
  const speedRating = computeSpeedRating(predTotal, benchmarkTotalMinutes);

  return {
    staffId,
    lashStyle,
    serviceMode,
    lashCount,
    predictedMinutes: {
      cleaning: predClean,
      extension: predExt,
      prepQc: predPrep,
      total: predTotal,
    },
    modelLayer: 3 as ModelLayer,
    sampleSize: parsedCases.length,
    confidence: 'low' as ConfidenceLevel,
    speedRating,
    benchmarkMinutes: benchmarkTotalMinutes,
    speedDeltaPercent,
  };
}

function getStyleSqlFilter(lashStyle: string): string {
  const map: Record<string, string> = {
    Classic: "(s.service_key LIKE 'classic-%')",
    Mink: "((s.service_key LIKE 'mink-%' AND s.service_key NOT LIKE 'under-mink-%') OR s.service_key LIKE 'flawless-%')",
    Flawless:
      "((s.service_key LIKE 'mink-%' AND s.service_key NOT LIKE 'under-mink-%') OR s.service_key LIKE 'flawless-%')",
    'Under Mink': "(s.service_key LIKE 'under-mink-%' OR s.service_group = 'LashesUnder')",
    Volume: "(s.service_key LIKE 'volume-%')",
    'Volume 3D': "(s.service_key LIKE 'volume-%')",
    'Volume 4D': "(s.service_key LIKE 'volume-%')",
    'Volume 5D': "(s.service_key LIKE 'volume-%')",
    Ultralight: "(s.service_key LIKE 'ultralight-%')",
    Hyperlight: "(s.service_key LIKE 'hyperlight-%')",
    Ivylight: "(s.service_key LIKE 'ivylight-%')",
  };
  return map[lashStyle] || '(1=1)';
}

function getFallbackBenchmark(lashStyle: string, serviceMode: LashServiceMode, lashCount: number): number {
  let base = 60;
  if (lashCount <= 30) base = 35;
  else if (lashCount <= 60) base = 50;
  else if (lashCount <= 70) base = 55;
  else if (lashCount <= 80) base = 62;
  else if (lashCount <= 90) base = 70;
  else if (lashCount <= 100) base = 78;
  else if (lashCount <= 120) base = 90;
  else base = 105;

  // Lash Style Difficulty Multipliers
  let styleMultiplier = 1.0;
  if (lashStyle === 'Under Mink') styleMultiplier = 0.55;
  else if (lashStyle === 'Classic') styleMultiplier = 0.95;
  else if (lashStyle === 'Mink' || lashStyle === 'Flawless') styleMultiplier = 1.0;
  else if (lashStyle === 'Ivylight') styleMultiplier = 1.05;
  else if (lashStyle === 'Volume') styleMultiplier = 1.15;
  else if (lashStyle === 'Hyperlight') styleMultiplier = 1.25;
  else if (lashStyle === 'Ultralight') styleMultiplier = 1.35;

  base = Math.round(base * styleMultiplier);

  if (serviceMode === 'retain') base = Math.round(base * 0.75);
  if (serviceMode === 'normal_removal') base = Math.round(base * 1.15);

  return base;
}
