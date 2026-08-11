import { FastifyInstance } from 'fastify';
import { LashTypeBenchmark, LashEtaEstimate, LashBenchmarkSeedResult } from '@mos-lab/shared';

// ─── Lash Style Parsing from service_key / service_name ──────────────────────

interface ParsedLashSpecs {
  lashStyle: string;
  lashCount: number | null;
}

/**
 * Parse lash_style and lash_count from service_key and service_name.
 * Maps naming conventions like 'classic-440', 'ultralight-5d-100' etc.
 * into structured { lashStyle, lashCount }.
 */
export function parseLashSpecs(serviceKey: string, serviceName: string): ParsedLashSpecs {
  const key = (serviceKey || '').toLowerCase();
  const name = (serviceName || '').toLowerCase();
  const combined = `${key} ${name}`;

  // Determine lash style from service_key prefix
  let lashStyle = 'Classic';
  if (key.startsWith('ivylight-') || combined.includes('ivylight')) {
    lashStyle = 'Ivylight';
  } else if (key.startsWith('flawless-') || combined.includes('flawless')) {
    lashStyle = 'Flawless';
  } else if (key.startsWith('mink-') || combined.includes('mink')) {
    lashStyle = 'Mink';
  } else if (key.startsWith('hyperlight-') || combined.includes('hyperlight')) {
    lashStyle = 'Hyperlight';
  } else if (key.startsWith('ultralight-') || combined.includes('ultralight') || combined.includes('ultra light')) {
    lashStyle = 'Ultralight';
  } else if (key.startsWith('volume-') || combined.includes('volume')) {
    lashStyle = 'Volume 3D';
  } else if (key.startsWith('under-mink-') || combined.includes('under mink') || combined.includes('lashes under')) {
    lashStyle = 'Under Mink';
  } else if (key.startsWith('classic-') || combined.includes('classic')) {
    lashStyle = 'Classic';
  }

  // Detect lash count ONLY if explicitly written with "sợi" / "lashes" in name or explicit suffix
  let lashCount: number | null = null;
  const countMatch = combined.match(/(\d{2,3})\s*(sợi|soi|lashes|sợ)/);
  if (countMatch) {
    lashCount = parseInt(countMatch[1], 10);
  }

  return { lashStyle, lashCount };
}

// ─── Benchmark Row Interface (Internal) ─────────────────────────────────────

interface BenchmarkCalcRow {
  lashStyle: string;
  serviceType: string;
  lashCount: number | null;
  benchmarkMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  sampleSize: number;
}

// ─── LashBenchmarkService ────────────────────────────────────────────────────

export class LashBenchmarkService {
  /**
   * Calculate benchmark statistics from Legacy DB (6-month rolling window).
   * Uses P25/P50/P75 percentiles with outlier filtering (15min < duration < 200min).
   */
  static async calculateBenchmarks(fastify: FastifyInstance): Promise<BenchmarkCalcRow[]> {
    // Query all completed order_service records from the last 6 months
    // Uses report_order_service ACTUAL tracked time (iPad progress states)
    // NOT os.duration_minute which is a catalog preset from service table
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<
      Array<{
        service_key: string;
        service_name: string;
        service_type: string;
        duration_minute: number;
      }>
    >(`
      SELECT
        s.service_key,
        COALESCE(sl.service_name, s.service_key) as service_name,
        s.service_type,
        (COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0) +
         COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0)) as duration_minute
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      JOIN report_order_service ros ON os.id = ros.order_service_id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      WHERE o.order_state = 'Completed'
        AND COALESCE(
          (SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1),
          o.booking_date_start
        ) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND (COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0) +
             COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0)) > 15
        AND (COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0) +
             COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0)) < 200
        AND s.service_type IN ('Normal', 'Retain', 'Fix', 'Adjust', 'Removal', 'Log', 'Replace')
        AND s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
      ORDER BY s.service_key, s.service_type, duration_minute
    `);

    if (!rows.length) return [];

    // Group rows by (lashStyle, serviceType, lashCount)
    const groups = new Map<string, number[]>();
    for (const row of rows) {
      const specs = parseLashSpecs(row.service_key, row.service_name);
      const lashCount = specs.lashCount;

      // Normalize service_type: Adjust → Fix, Removal → Fix, Log → Fix
      let normType = row.service_type;
      if (['Adjust', 'Removal', 'Log'].includes(normType)) {
        normType = 'Fix';
      }

      const key = `${specs.lashStyle}|${normType}|${lashCount ?? 'null'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(Number(row.duration_minute));
    }

    // Calculate percentiles for each group
    const results: BenchmarkCalcRow[] = [];
    for (const [key, durations] of groups) {
      if (durations.length < 3) continue; // Skip groups with too few samples

      const [lashStyle, serviceType, lashCountStr] = key.split('|');
      const sorted = durations.sort((a, b) => a - b);
      const n = sorted.length;

      const p25 = sorted[Math.floor(n * 0.25)];
      const p50 = sorted[Math.floor(n * 0.5)]; // Median
      const p75 = sorted[Math.floor(n * 0.75)];

      results.push({
        lashStyle,
        serviceType,
        lashCount: lashCountStr === 'null' ? null : parseInt(lashCountStr, 10),
        benchmarkMinutes: Math.round(p50),
        minMinutes: Math.round(p25),
        maxMinutes: Math.round(p75),
        sampleSize: n,
      });
    }

    return results;
  }

  /**
   * Seed/update CRM benchmark table from calculated Legacy DB stats.
   * Uses upsert to merge with existing admin-edited rows.
   */
  static async seedBenchmarks(fastify: FastifyInstance): Promise<LashBenchmarkSeedResult> {
    const benchmarks = await this.calculateBenchmarks(fastify);

    // Clear out previous auto-generated rows so new detailed lash-count benchmarks populate cleanly
    await fastify.prisma.crm.crmLashTypeBenchmark.deleteMany({
      where: { isAutoGenerated: true },
    });

    if (benchmarks.length > 0) {
      await fastify.prisma.crm.crmLashTypeBenchmark.createMany({
        data: benchmarks.map((b) => ({
          lashStyle: b.lashStyle,
          serviceType: b.serviceType,
          lashCount: b.lashCount,
          benchmarkMinutes: b.benchmarkMinutes,
          minMinutes: b.minMinutes,
          maxMinutes: b.maxMinutes,
          sampleSize: b.sampleSize,
          isAutoGenerated: true,
        })),
      });
    }

    const total = await fastify.prisma.crm.crmLashTypeBenchmark.count();
    return { inserted: benchmarks.length, updated: 0, total };
  }

  /**
   * List all benchmarks from CRM table.
   * Auto-seeds if the table is currently empty.
   */
  static async listBenchmarks(fastify: FastifyInstance): Promise<LashTypeBenchmark[]> {
    let rows = await fastify.prisma.crm.crmLashTypeBenchmark.findMany({
      orderBy: [{ lashStyle: 'asc' }, { serviceType: 'asc' }, { lashCount: 'asc' }],
    });

    if (rows.length === 0) {
      fastify.log.info('[LashBenchmarkService] crm_lash_type_benchmarks is empty, auto-seeding from Legacy DB...');
      try {
        await this.seedBenchmarks(fastify);
        rows = await fastify.prisma.crm.crmLashTypeBenchmark.findMany({
          orderBy: [{ lashStyle: 'asc' }, { serviceType: 'asc' }, { lashCount: 'asc' }],
        });
      } catch (err) {
        fastify.log.error(err, '[LashBenchmarkService] Auto-seed benchmarks failed');
      }
    }

    return rows.map((r) => ({
      id: r.id,
      lashStyle: r.lashStyle,
      serviceType: r.serviceType,
      lashCount: r.lashCount,
      benchmarkMinutes: r.benchmarkMinutes,
      minMinutes: r.minMinutes,
      maxMinutes: r.maxMinutes,
      sampleSize: r.sampleSize,
      isAutoGenerated: r.isAutoGenerated,
      updatedAt: r.updatedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * Update a single benchmark row (Admin edit).
   */
  static async updateBenchmark(
    fastify: FastifyInstance,
    id: number,
    data: { benchmarkMinutes?: number; minMinutes?: number; maxMinutes?: number }
  ): Promise<LashTypeBenchmark> {
    const row = await fastify.prisma.crm.crmLashTypeBenchmark.update({
      where: { id },
      data: {
        ...data,
        isAutoGenerated: false, // Mark as manually edited
      },
    });
    return {
      id: row.id,
      lashStyle: row.lashStyle,
      serviceType: row.serviceType,
      lashCount: row.lashCount,
      benchmarkMinutes: row.benchmarkMinutes,
      minMinutes: row.minMinutes,
      maxMinutes: row.maxMinutes,
      sampleSize: row.sampleSize,
      isAutoGenerated: row.isAutoGenerated,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * 3-Layer Hybrid ETA Estimation.
   *
   * Layer 1: Customer has ≥2 completed orders with same lash style
   *   → ETA = ROUND(0.6 × AVG(customer history) + 0.4 × AVG(CV history))
   *
   * Layer 2: Customer is new/first-time for this style, but CV has history
   *   → ETA = AVG(CV history for this style)
   *
   * Layer 3: No history data available
   *   → ETA = benchmark_minutes from lash_type_benchmark table
   *   → Fallback: service.duration_minute_standard
   */
  static async estimateETA(
    fastify: FastifyInstance,
    params: {
      customerId: number;
      cvStaffId: number;
      lashStyle: string;
      serviceType: string;
      lashCount: number | null;
      fallbackDurationStandard?: number;
    }
  ): Promise<LashEtaEstimate> {
    const { customerId, cvStaffId, lashStyle, serviceType, lashCount, fallbackDurationStandard } = params;

    // Normalize service_type for querying
    const queryServiceTypes = serviceType === 'Fix' ? "'Fix','Adjust','Removal','Log'" : `'${serviceType}'`;

    // Build lash style filter for SQL (match by service_key pattern)
    const styleFilter = this.buildStyleSqlFilter(lashStyle);

    // Helper alias for actual tracked time
    const actualDurExpr = `(COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0) + COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0))`;

    // ─── Layer 1: Check customer history for this lash style ─────────
    const customerHistory = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ avg_duration: number; cnt: number }>>(`
      SELECT
        ROUND(AVG(${actualDurExpr})) as avg_duration,
        COUNT(*) as cnt
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      JOIN report_order_service ros ON os.id = ros.order_service_id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      WHERE o.order_state = 'Completed'
        AND o.user_id = ${customerId}
        AND s.service_type IN (${queryServiceTypes})
        AND ${actualDurExpr} > 15 AND ${actualDurExpr} < 200
        AND ${styleFilter}
        AND COALESCE(
          (SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1),
          o.booking_date_start
        ) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    `);

    const cvHistory = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ avg_duration: number; cnt: number }>>(`
      SELECT
        ROUND(AVG(${actualDurExpr})) as avg_duration,
        COUNT(*) as cnt
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      JOIN report_order_service ros ON os.id = ros.order_service_id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      LEFT JOIN staff_bonus sb ON sb.order_service_id = os.id AND sb.staff_id != 0
      WHERE o.order_state = 'Completed'
        AND sb.staff_id = ${cvStaffId}
        AND sb.bonus_type = 'Banana'
        AND s.service_type IN (${queryServiceTypes})
        AND ${actualDurExpr} > 15 AND ${actualDurExpr} < 200
        AND ${styleFilter}
        AND COALESCE(
          (SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1),
          o.booking_date_start
        ) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    `);

    const custAvg = customerHistory[0]?.avg_duration ? Number(customerHistory[0].avg_duration) : null;
    const custCnt = Number(customerHistory[0]?.cnt || 0);
    const cvAvg = cvHistory[0]?.avg_duration ? Number(cvHistory[0].avg_duration) : null;
    const cvCnt = Number(cvHistory[0]?.cnt || 0);

    // Layer 1: Both customer and CV have sufficient history
    if (custCnt >= 2 && custAvg && cvAvg) {
      return {
        etaMinutes: Math.round(0.6 * custAvg + 0.4 * cvAvg),
        layer: 1,
        confidence: 'high',
        source: `Khách hàng ${custCnt} ca (${custAvg}p) × CV ${cvCnt} ca (${cvAvg}p)`,
      };
    }

    // Layer 2: CV has history for this lash style
    if (cvCnt >= 1 && cvAvg) {
      return {
        etaMinutes: Math.round(cvAvg),
        layer: 2,
        confidence: 'medium',
        source: `CV trung bình ${cvCnt} ca ${lashStyle} (${cvAvg}p)`,
      };
    }

    // ─── Layer 3: Fallback to benchmark table ────────────────────────
    const benchmark = await fastify.prisma.crm.crmLashTypeBenchmark.findFirst({
      where: {
        lashStyle,
        serviceType: serviceType === 'Fix' ? 'Fix' : serviceType,
        ...(lashCount ? { lashCount } : {}),
      },
      orderBy: { lashCount: 'asc' },
    });

    if (benchmark) {
      return {
        etaMinutes: benchmark.benchmarkMinutes,
        layer: 3,
        confidence: 'low',
        source: `Benchmark chuẩn ${lashStyle} (P50: ${benchmark.benchmarkMinutes}p, mẫu: ${benchmark.sampleSize})`,
      };
    }

    // Ultimate fallback: use service.duration_minute_standard
    return {
      etaMinutes: fallbackDurationStandard || 60,
      layer: 3,
      confidence: 'low',
      source: `Fallback duration_minute_standard (${fallbackDurationStandard || 60}p)`,
    };
  }

  /**
   * Batch ETA estimation for multiple busy CVs — only 3 SQL queries total.
   * Returns a Map<staffId, EtaResult> for each busy CV entry.
   */
  static async batchEstimateETA(
    fastify: FastifyInstance,
    busyCvEntries: Array<{
      staffId: number;
      customerId: number;
      lashStyle: string;
      serviceType: string;
      lashCount: number | null;
      bookingStartStr: string; // ICT formatted "YYYY-MM-DD HH:mm:ss"
    }>
  ): Promise<
    Map<
      number,
      {
        etaMinutes: number;
        elapsedMinutes: number;
        remainingMinutes: number;
        progressPercent: number;
        layer: 1 | 2 | 3;
        confidence: 'high' | 'medium' | 'low';
        lashStyle: string;
        lashCount: number | null;
        source: string;
      }
    >
  > {
    const result = new Map<number, any>();
    if (busyCvEntries.length === 0) return result;

    const staffIds = busyCvEntries.map((e) => e.staffId);
    const customerIds = [...new Set(busyCvEntries.map((e) => e.customerId).filter((id) => id > 0))];

    // Helper: actual tracked time from report_order_service (iPad progress states)
    const adur = `(COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0) + COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0))`;

    // ── Query 1: CV history — AVG(actual duration) per staff for lash services in 6 months ──
    const cvHistoryRows = await fastify.prisma.legacy.$queryRawUnsafe<
      Array<{ staff_id: number; service_type: string; avg_dur: number; cnt: number }>
    >(`
      SELECT
        sb.staff_id,
        s.service_type,
        ROUND(AVG(${adur})) as avg_dur,
        COUNT(*) as cnt
      FROM staff_bonus sb
      JOIN order_service os ON sb.order_service_id = os.id
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      JOIN report_order_service ros ON os.id = ros.order_service_id
      WHERE o.order_state = 'Completed'
        AND sb.bonus_type = 'Banana'
        AND sb.staff_id IN (${staffIds.join(',')})
        AND ${adur} > 15 AND ${adur} < 200
        AND s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
        AND COALESCE(
          (SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1),
          o.booking_date_start
        ) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY sb.staff_id, s.service_type
    `);

    // Build CV history map: staffId -> { serviceType -> { avg, cnt } }
    const cvHistMap = new Map<number, Map<string, { avg: number; cnt: number }>>();
    for (const r of cvHistoryRows) {
      const sid = Number(r.staff_id);
      if (!cvHistMap.has(sid)) cvHistMap.set(sid, new Map());
      cvHistMap.get(sid)!.set(String(r.service_type), { avg: Number(r.avg_dur), cnt: Number(r.cnt) });
    }

    // ── Query 2: Customer history — AVG(actual duration) per customer for lash services in 6 months ──
    const custHistMap = new Map<number, { avg: number; cnt: number }>();
    if (customerIds.length > 0) {
      const custHistoryRows = await fastify.prisma.legacy.$queryRawUnsafe<
        Array<{ user_id: number; avg_dur: number; cnt: number }>
      >(`
        SELECT
          o.user_id,
          ROUND(AVG(${adur})) as avg_dur,
          COUNT(*) as cnt
        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        JOIN service s ON os.service_id = s.id
        JOIN report_order_service ros ON os.id = ros.order_service_id
        WHERE o.order_state = 'Completed'
          AND o.user_id IN (${customerIds.join(',')})
          AND ${adur} > 15 AND ${adur} < 200
          AND s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
          AND COALESCE(
            (SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1),
            o.booking_date_start
          ) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY o.user_id
      `);
      for (const r of custHistoryRows) {
        custHistMap.set(Number(r.user_id), { avg: Number(r.avg_dur), cnt: Number(r.cnt) });
      }
    }

    // ── Query 3: Load all benchmarks from CRM table ──
    const benchmarks = await fastify.prisma.crm.crmLashTypeBenchmark.findMany();
    const benchmarkMap = new Map<string, { minutes: number; sample: number }>();
    for (const b of benchmarks) {
      // Key with lashCount
      const keyWithCount = `${b.lashStyle}|${b.serviceType}|${b.lashCount ?? 'null'}`;
      benchmarkMap.set(keyWithCount, { minutes: b.benchmarkMinutes, sample: b.sampleSize });
      // Key without lashCount (fallback)
      const keyNoCount = `${b.lashStyle}|${b.serviceType}|null`;
      if (!benchmarkMap.has(keyNoCount)) {
        benchmarkMap.set(keyNoCount, { minutes: b.benchmarkMinutes, sample: b.sampleSize });
      }
    }

    // ── Compute ETA per CV entry ──
    const now = new Date();
    const tzOffset = 7 * 60 * 60 * 1000; // ICT UTC+7
    const nowMs = now.getTime() + tzOffset;

    for (const entry of busyCvEntries) {
      const { staffId, customerId, lashStyle, serviceType, lashCount, bookingStartStr } = entry;

      // Calculate elapsed minutes
      const startMs = new Date(bookingStartStr.replace(' ', 'T') + '+07:00').getTime();
      const elapsedMinutes = Math.max(0, Math.round((nowMs - startMs) / 60000));

      // Normalize service type for lookup
      const normType = ['Adjust', 'Removal', 'Log'].includes(serviceType) ? 'Fix' : serviceType;

      // Layer 1: Both customer (≥2 visits) and CV have history
      const custHist = custHistMap.get(customerId);
      const cvTypeHist = cvHistMap.get(staffId)?.get(normType);
      const cvAllHist = cvHistMap.get(staffId)?.get('Normal') || cvHistMap.get(staffId)?.get('Retain');

      let etaMinutes: number;
      let layer: 1 | 2 | 3;
      let confidence: 'high' | 'medium' | 'low';
      let source: string;

      if (custHist && custHist.cnt >= 2 && (cvTypeHist || cvAllHist)) {
        const cvAvg = cvTypeHist?.avg ?? cvAllHist!.avg;
        const cvCnt = cvTypeHist?.cnt ?? cvAllHist!.cnt;
        etaMinutes = Math.round(0.6 * custHist.avg + 0.4 * cvAvg);
        layer = 1;
        confidence = 'high';
        source = `Khách ${custHist.cnt} ca (${custHist.avg}p) × CV ${cvCnt} ca (${cvAvg}p)`;
      } else if (cvTypeHist || cvAllHist) {
        // Layer 2: CV has history
        const cvAvg = cvTypeHist?.avg ?? cvAllHist!.avg;
        const cvCnt = cvTypeHist?.cnt ?? cvAllHist!.cnt;
        etaMinutes = Math.round(cvAvg);
        layer = 2;
        confidence = 'medium';
        source = `CV trung bình ${cvCnt} ca ${lashStyle} (${cvAvg}p)`;
      } else {
        // Layer 3: Benchmark table fallback
        const bmKey = `${lashStyle}|${normType}|${lashCount ?? 'null'}`;
        const bmFallback = `${lashStyle}|${normType}|null`;
        const bm = benchmarkMap.get(bmKey) || benchmarkMap.get(bmFallback);
        if (bm) {
          etaMinutes = bm.minutes;
          source = `Benchmark ${lashStyle} (P50: ${bm.minutes}p, mẫu: ${bm.sample})`;
        } else {
          etaMinutes = normType === 'Retain' ? 75 : normType === 'Fix' ? 30 : 90;
          source = `Fallback mặc định (${etaMinutes}p)`;
        }
        layer = 3;
        confidence = 'low';
      }

      const remainingMinutes = etaMinutes - elapsedMinutes;
      const progressPercent = etaMinutes > 0 ? Math.min(150, Math.round((elapsedMinutes / etaMinutes) * 100)) : 100;

      result.set(staffId, {
        etaMinutes,
        elapsedMinutes,
        remainingMinutes,
        progressPercent,
        layer,
        confidence,
        lashStyle,
        lashCount,
        source,
      });
    }

    return result;
  }

  /**
   * Build SQL WHERE clause fragment to filter by lash style.
   */
  private static buildStyleSqlFilter(lashStyle: string): string {
    const styleMap: Record<string, string> = {
      Classic: "(s.service_key LIKE 'classic-%')",
      Mink: "(s.service_key LIKE 'mink-%' AND s.service_key NOT LIKE 'under-mink-%')",
      'Under Mink': "(s.service_key LIKE 'under-mink-%' OR s.service_group = 'LashesUnder')",
      'Volume 3D':
        "((s.service_key LIKE 'volume-%' OR s.service_key LIKE 'ultralight-%') AND LOWER(COALESCE(sl.service_name, '')) LIKE '%3d%')",
      'Volume 4D':
        "((s.service_key LIKE 'volume-%' OR s.service_key LIKE 'ultralight-%') AND LOWER(COALESCE(sl.service_name, '')) LIKE '%4d%')",
      'Volume 5D':
        "((s.service_key LIKE 'volume-%' OR s.service_key LIKE 'ultralight-%') AND LOWER(COALESCE(sl.service_name, '')) LIKE '%5d%')",
      Ultralight:
        "(s.service_key LIKE 'ultralight-%' AND LOWER(COALESCE(sl.service_name, '')) NOT LIKE '%3d%' AND LOWER(COALESCE(sl.service_name, '')) NOT LIKE '%4d%' AND LOWER(COALESCE(sl.service_name, '')) NOT LIKE '%5d%')",
      Hyperlight: "(s.service_key LIKE 'hyperlight-%')",
      Flawless: "(s.service_key LIKE 'flawless-%')",
      Ivylight: "(s.service_key LIKE 'ivylight-%')",
      'Ivylight 3L': "(s.service_key LIKE 'ivylight-%' AND LOWER(COALESCE(sl.service_name, '')) LIKE '%3l%')",
      'Ivylight 4L': "(s.service_key LIKE 'ivylight-%' AND LOWER(COALESCE(sl.service_name, '')) LIKE '%4l%')",
      'Ivylight 5L': "(s.service_key LIKE 'ivylight-%' AND LOWER(COALESCE(sl.service_name, '')) LIKE '%5l%')",
    };
    return styleMap[lashStyle] || '(1=1)';
  }
}
