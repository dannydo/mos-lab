import { FastifyInstance } from 'fastify';
import { CvSpeedDetail, CvSpeedMonthlyTrend, SafeAny } from '@mos-lab/shared';
import { detectServiceModeBatch } from '../../services/cv-speed-model.service.js';
import { parseLashSpecs } from '../../../catalog/services/lash-benchmark.service.js';
import {
  CV_DETAIL_CACHE_TTL_MS,
  cvDetailCache,
  inFlightDetailPromises,
  type CvSpeedRouteRegistrar,
} from './cv-speed-cache-and-batch.js';

export function registerCvSpeedDetailAndTrendRoutes(fastify: FastifyInstance, addRoute: CvSpeedRouteRegistrar) {
  // 4. GET /trend/:staffId
  addRoute('get', '/trend/:staffId', async (request: SafeAny, reply: SafeAny) => {
    const { staffId } = request.params as { staffId: string };
    const { lashStyle = 'Classic' } = request.query as { lashStyle?: string };

    const cvId = parseInt(staffId, 10);

    try {
      const monthlyRows = (await fastify.prisma.legacy.$queryRawUnsafe(`
        SELECT
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m') as month_str,
          ROUND(AVG(COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0))) as avg_time
        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        JOIN service s ON os.service_id = s.id
        JOIN report_order_service ros ON os.id = ros.order_service_id
        LEFT JOIN report_order ro ON o.id = ro.order_id
        JOIN staff_bonus sb ON sb.order_service_id = os.id
        WHERE o.order_state = 'Completed'
          AND (os.assigned_staff_id = ${cvId} OR sb.user_id = ${cvId})
          AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) > 15
          AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) < 200
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY month_str
        ORDER BY month_str ASC
      `)) as Array<{ month_str: string; avg_time: number }>;

      const benchmarkRow = await fastify.prisma.crm.crmLashTypeBenchmark.findFirst({
        where: { lashStyle },
      });
      const benchmarkMinutes = benchmarkRow?.benchmarkMinutes || 60;

      const response: CvSpeedMonthlyTrend[] = monthlyRows.map((r) => ({
        month: r.month_str,
        avgTotalMinutes: Number(r.avg_time || 60),
        benchmarkMinutes,
      }));

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV speed trend');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy dữ liệu xu hướng CV.' });
    }
  });

  // 5. GET /detail/:staffId
  addRoute('get', '/detail/:staffId', async (request: SafeAny, reply: SafeAny) => {
    const { staffId } = request.params as { staffId: string };
    const cvId = parseInt(staffId, 10);

    const now = Date.now();
    const cached = cvDetailCache.get(cvId);
    if (cached && cached.expiresAt > now) {
      return reply.send(cached.data);
    }

    const inFlight = inFlightDetailPromises.get(cvId);
    if (inFlight) {
      const data = await inFlight;
      return reply.send(data);
    }

    const computePromise = (async () => {
      const staffProfilePromise = fastify.prisma.legacy.$queryRawUnsafe(`
        SELECT full_name, avatar FROM user_profile WHERE user_id = ${cvId} LIMIT 1
      `) as Promise<Array<{ full_name: string | null; avatar: string | null }>>;

      const recentRowsPromise = fastify.prisma.legacy.$queryRawUnsafe(`
        SELECT
          os.id as order_service_id,
          o.id as order_id,
          o.user_id,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d %H:%i') as date_str,
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
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          AND (
            os.assigned_staff_id = ${cvId}
            OR EXISTS (SELECT 1 FROM staff_bonus sb WHERE sb.order_service_id = os.id AND sb.user_id = ${cvId})
          )
          AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) > 15
          AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) < 200
        ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        LIMIT 50
      `) as Promise<
        Array<{
          order_service_id: number;
          order_id: number;
          user_id: number;
          date_str: string;
          service_key: string;
          service_name: string;
          service_type: string;
          cleaning_minute: number;
          servicing_minute: number;
          preparation_minute: number;
          pre_servicing_minute: number;
        }>
      >;

      const monthlyRowsPromise = fastify.prisma.legacy.$queryRawUnsafe(`
        SELECT
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m') as month_str,
          ROUND(AVG(COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0))) as avg_time
        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        JOIN report_order_service ros ON os.id = ros.order_service_id
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          AND (
            os.assigned_staff_id = ${cvId}
            OR EXISTS (SELECT 1 FROM staff_bonus sb WHERE sb.order_service_id = os.id AND sb.user_id = ${cvId})
          )
        GROUP BY month_str
        ORDER BY month_str ASC
      `) as Promise<Array<{ month_str: string; avg_time: number }>>;

      const [staffProfileRow, recentRows, monthlyRows] = await Promise.all([
        staffProfilePromise,
        recentRowsPromise,
        monthlyRowsPromise,
      ]);

      const staffName = staffProfileRow[0]?.full_name?.trim() || `Chuyên viên ${cvId}`;
      let avatarUrl = staffProfileRow[0]?.avatar || null;
      if (avatarUrl && avatarUrl.startsWith('http://')) {
        avatarUrl = avatarUrl.replace('http://', 'https://');
      }

      // Batch resolve service mode in 1 SQL query (0ms)
      const itemsToResolve = recentRows.map((r) => ({
        customerId: Number(r.user_id),
        serviceType: r.service_type,
      }));
      const modeMap = await detectServiceModeBatch(fastify.prisma.legacy, itemsToResolve);

      let totalClean = 0;
      let totalExt = 0;
      let totalPrep = 0;

      const recentCases = [];
      for (const r of recentRows) {
        const specs = parseLashSpecs(r.service_key, r.service_name);
        const mode = modeMap.get(Number(r.user_id)) || 'normal_clean';

        const cleaning = Number(r.cleaning_minute || 0);
        const extension = Number(r.servicing_minute || 0);
        const prepQc = Number(r.preparation_minute || 0) + Number(r.pre_servicing_minute || 0);
        const total = cleaning + extension + prepQc;

        totalClean += cleaning;
        totalExt += extension;
        totalPrep += prepQc;

        recentCases.push({
          orderId: Number(r.order_id),
          date: r.date_str,
          lashStyle: specs.lashStyle,
          serviceMode: mode,
          lashCount: specs.lashCount || 60,
          cleaningMinutes: cleaning,
          extensionMinutes: extension,
          prepQcMinutes: prepQc,
          totalMinutes: total,
        });
      }

      const caseCnt = recentCases.length || 1;
      const phaseBreakdown = {
        cleaning: Math.round(totalClean / caseCnt),
        extension: Math.round(totalExt / caseCnt),
        prepQc: Math.round(totalPrep / caseCnt),
      };

      const monthlyTrend: CvSpeedMonthlyTrend[] = monthlyRows.map((r) => ({
        month: r.month_str,
        avgTotalMinutes: Number(r.avg_time || 60),
        benchmarkMinutes: 60,
      }));

      const overallAvg = recentCases.reduce((acc, c) => acc + c.totalMinutes, 0) / caseCnt;
      const overallDelta = ((overallAvg - 60) / 60) * 100;

      const response: CvSpeedDetail = {
        staffId: cvId,
        staffName,
        avatarUrl,
        totalCases: recentCases.length,
        avgSpeedVsBenchmarkPercent: Math.round(overallDelta),
        overallScore: Math.max(50, Math.min(100, Math.round(100 - overallDelta))),
        phaseBreakdown,
        recentCases,
        monthlyTrend,
      };

      cvDetailCache.set(cvId, {
        data: response,
        expiresAt: Date.now() + CV_DETAIL_CACHE_TTL_MS,
      });

      return response;
    })();

    inFlightDetailPromises.set(cvId, computePromise);
    try {
      const response = await computePromise;
      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV speed detail');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải chi tiết tốc độ CV.' });
    } finally {
      inFlightDetailPromises.delete(cvId);
    }
  });
}
