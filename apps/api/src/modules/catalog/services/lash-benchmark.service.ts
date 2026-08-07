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
  if (key.startsWith('flawless-') || combined.includes('flawless')) {
    lashStyle = 'Flawless';
  } else if (key.startsWith('hyperlight-') || combined.includes('hyperlight')) {
    lashStyle = 'Hyperlight';
  } else if (key.startsWith('ultralight-') || combined.includes('ultralight') || combined.includes('ultra light')) {
    // Detect fan density for ultralight
    if (combined.includes('5d')) lashStyle = 'Volume 5D';
    else if (combined.includes('4d')) lashStyle = 'Volume 4D';
    else if (combined.includes('3d')) lashStyle = 'Volume 3D';
    else lashStyle = 'Ultralight';
  } else if (key.startsWith('volume-') || combined.includes('volume')) {
    if (combined.includes('5d')) lashStyle = 'Volume 5D';
    else if (combined.includes('4d')) lashStyle = 'Volume 4D';
    else lashStyle = 'Volume 3D';
  } else if (key.startsWith('under-mink-') || combined.includes('under mink') || combined.includes('lashes under')) {
    lashStyle = 'Under Mink';
  } else if (key.startsWith('mink-') || combined.includes('mink')) {
    lashStyle = 'Mink';
  } else if (key.startsWith('classic-') || combined.includes('classic')) {
    lashStyle = 'Classic';
  }

  // Detect lash count from service name (e.g. "100 sợi", "70 soi", "120 lashes")
  let lashCount: number | null = null;
  const countMatch = combined.match(/(\d{2,3})\s*(sợi|soi|lashes|sợ)/);
  if (countMatch) {
    lashCount = parseInt(countMatch[1], 10);
  } else {
    // Fallback: detect common counts in key like 'classic-70' or in name
    const keyCountMatch = combined.match(/[-_\s](\d{2,3})(?:\s|$|[-_])/);
    if (keyCountMatch) {
      const num = parseInt(keyCountMatch[1], 10);
      // Only treat as lash count if it's a reasonable range (50-200)
      if (num >= 50 && num <= 200) {
        lashCount = num;
      }
    }
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
    // Join with service + service_language to get service_key and service_name
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
        os.duration_minute
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      WHERE o.order_state = 'Completed'
        AND COALESCE(
          (SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1),
          o.booking_date_start
        ) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND os.duration_minute > 15
        AND os.duration_minute < 200
        AND s.service_type IN ('Normal', 'Retain', 'Fix', 'Adjust', 'Removal', 'Log', 'Replace')
        AND s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
      ORDER BY s.service_key, s.service_type, os.duration_minute
    `);

    if (!rows.length) return [];

    // Group rows by (lashStyle, serviceType, lashCount)
    const groups = new Map<string, number[]>();
    for (const row of rows) {
      const specs = parseLashSpecs(row.service_key, row.service_name);
      // Normalize service_type: Adjust → Fix, Removal → Fix, Log → Fix
      let normType = row.service_type;
      if (['Adjust', 'Removal', 'Log'].includes(normType)) {
        normType = 'Fix';
      }

      const key = `${specs.lashStyle}|${normType}|${specs.lashCount ?? 'null'}`;
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
    let inserted = 0;
    let updated = 0;

    for (const b of benchmarks) {
      const existing = await fastify.prisma.crm.crmLashTypeBenchmark.findFirst({
        where: {
          lashStyle: b.lashStyle,
          serviceType: b.serviceType,
          lashCount: b.lashCount,
        },
      });

      if (existing) {
        // Only update auto-generated rows; skip admin-edited ones
        if (existing.isAutoGenerated) {
          await fastify.prisma.crm.crmLashTypeBenchmark.update({
            where: { id: existing.id },
            data: {
              benchmarkMinutes: b.benchmarkMinutes,
              minMinutes: b.minMinutes,
              maxMinutes: b.maxMinutes,
              sampleSize: b.sampleSize,
            },
          });
          updated++;
        }
      } else {
        await fastify.prisma.crm.crmLashTypeBenchmark.create({
          data: {
            lashStyle: b.lashStyle,
            serviceType: b.serviceType,
            lashCount: b.lashCount,
            benchmarkMinutes: b.benchmarkMinutes,
            minMinutes: b.minMinutes,
            maxMinutes: b.maxMinutes,
            sampleSize: b.sampleSize,
            isAutoGenerated: true,
          },
        });
        inserted++;
      }
    }

    const total = await fastify.prisma.crm.crmLashTypeBenchmark.count();
    return { inserted, updated, total };
  }

  /**
   * List all benchmarks from CRM table.
   */
  static async listBenchmarks(fastify: FastifyInstance): Promise<LashTypeBenchmark[]> {
    const rows = await fastify.prisma.crm.crmLashTypeBenchmark.findMany({
      orderBy: [{ lashStyle: 'asc' }, { serviceType: 'asc' }, { lashCount: 'asc' }],
    });
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

    // ─── Layer 1: Check customer history for this lash style ─────────
    const customerHistory = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ avg_duration: number; cnt: number }>>(`
      SELECT
        ROUND(AVG(os.duration_minute)) as avg_duration,
        COUNT(*) as cnt
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      WHERE o.order_state = 'Completed'
        AND o.user_id = ${customerId}
        AND s.service_type IN (${queryServiceTypes})
        AND os.duration_minute > 15 AND os.duration_minute < 200
        AND ${styleFilter}
        AND COALESCE(
          (SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1),
          o.booking_date_start
        ) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    `);

    const cvHistory = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ avg_duration: number; cnt: number }>>(`
      SELECT
        ROUND(AVG(os.duration_minute)) as avg_duration,
        COUNT(*) as cnt
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      LEFT JOIN staff_bonus sb ON sb.order_service_id = os.id AND sb.staff_id != 0
      WHERE o.order_state = 'Completed'
        AND sb.staff_id = ${cvStaffId}
        AND sb.bonus_type = 'Banana'
        AND s.service_type IN (${queryServiceTypes})
        AND os.duration_minute > 15 AND os.duration_minute < 200
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
    };
    return styleMap[lashStyle] || '(1=1)';
  }
}
