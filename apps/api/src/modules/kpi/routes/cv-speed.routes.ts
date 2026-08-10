import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import {
  CvSpeedProfile,
  CvSpeedMatrix,
  CvSpeedMatrixRow,
  CvSpeedMatrixCell,
  CvSpeedRanking,
  CvSpeedMonthlyTrend,
  CvSpeedDetail,
  CvSpeedPrediction,
  CvSpeedSeedResult,
  LashServiceMode,
  SpeedRating,
  ConfidenceLevel,
  ModelLayer,
  SafeAny,
} from '@mos-lab/shared';
import { predictCvSpeed, detectServiceMode, detectServiceModeBatch } from '../services/cv-speed-model.service.js';
import { runNightlyCvSpeedSeed, getActiveCvStaffList } from '../services/cv-speed-seed.service.js';
import { parseLashSpecs } from '../../catalog/services/lash-benchmark.service.js';

const STANDARD_STYLES = ['Classic', 'Mink', 'Volume', 'Ultralight', 'Hyperlight', 'Ivylight', 'Under Mink'];

const STANDARD_MODES: LashServiceMode[] = ['normal_clean', 'normal_removal', 'retain'];
const STANDARD_COUNTS = [30, 60, 70, 80, 90, 100, 120, 140];

interface DetailCacheEntry {
  data: CvSpeedDetail;
  expiresAt: number;
}
const cvDetailCache = new Map<number, DetailCacheEntry>();
const CV_DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;

export function clearCvSpeedDetailCache(staffId?: number) {
  if (staffId) {
    cvDetailCache.delete(staffId);
  } else {
    cvDetailCache.clear();
  }
}

export async function cvSpeedRoutes(fastify: FastifyInstance) {
  const addRoute = (method: 'get' | 'post', path: string, handler: SafeAny) => {
    fastify[method](`/kpi/cv-speed${path}`, { preHandler: [requireAuth] }, handler);
    fastify[method](`/cv-speed${path}`, { preHandler: [requireAuth] }, handler);
  };

  // 1. GET /profiles
  addRoute('get', '/profiles', async (request: SafeAny, reply: SafeAny) => {
    const { staffId, lashStyle, serviceMode } = request.query as {
      staffId?: string;
      lashStyle?: string;
      serviceMode?: string;
    };

    try {
      const where: SafeAny = {};
      if (staffId) where.staffId = parseInt(staffId, 10);
      if (lashStyle) where.lashStyle = lashStyle;
      if (serviceMode) where.serviceMode = serviceMode;

      const profiles = await fastify.prisma.crm.crmCvSpeedProfile.findMany({
        where,
        orderBy: [{ staffId: 'asc' }, { lashStyle: 'asc' }, { lashCount: 'asc' }],
      });

      if (profiles.length === 0 && !staffId && !lashStyle) {
        fastify.log.info('[CvSpeedRoutes] crm_cv_speed_profile is empty, triggering background seed...');
        runNightlyCvSpeedSeed(fastify.prisma.crm, fastify.prisma.legacy).catch((e) =>
          fastify.log.error(e, 'Error during background seed')
        );
      }

      const response: CvSpeedProfile[] = profiles.map((p) => ({
        id: p.id,
        staffId: p.staffId,
        staffName: p.staffName,
        lashStyle: p.lashStyle,
        serviceMode: p.serviceMode as LashServiceMode,
        lashCount: p.lashCount,
        cleaningMinutes: p.cleaningMinutes,
        extensionMinutes: p.extensionMinutes,
        prepQcMinutes: p.prepQcMinutes,
        totalMinutes: p.totalMinutes,
        modelLayer: p.modelLayer as ModelLayer,
        sampleSize: p.sampleSize,
        confidence: p.confidence as ConfidenceLevel,
        regA: p.regA,
        regB: p.regB,
        regRSquared: p.regRSquared,
        benchmarkTotalMinutes: p.benchmarkTotalMinutes,
        speedDeltaPercent: p.speedDeltaPercent,
        speedRating: p.speedRating as SpeedRating,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }));

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV speed profiles');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy danh sách CV speed profiles.' });
    }
  });

  // 2. GET /matrix
  addRoute('get', '/matrix', async (request: SafeAny, reply: SafeAny) => {
    const { serviceMode = 'normal_clean' } = request.query as { serviceMode?: string };

    try {
      const activeCvs = await getActiveCvStaffList(fastify.prisma.crm, fastify.prisma.legacy);
      const activeCvIds = activeCvs.map((c) => c.id);

      const dbProfiles = await fastify.prisma.crm.crmCvSpeedProfile.findMany({
        where: {
          staffId: { in: activeCvIds },
          serviceMode,
        },
      });

      if (dbProfiles.length === 0) {
        fastify.log.info('[CvSpeedRoutes] dbProfiles is empty in /matrix, triggering background seed...');
        runNightlyCvSpeedSeed(fastify.prisma.crm, fastify.prisma.legacy).catch((e) =>
          fastify.log.error(e, 'Error during background seed from /matrix')
        );
      }

      const profileMap = new Map<string, CvSpeedMatrixCell>();
      dbProfiles.forEach((p) => {
        const key = `${p.staffId}_${p.lashStyle}_${p.lashCount}`;
        profileMap.set(key, {
          totalMinutes: p.totalMinutes,
          speedRating: p.speedRating as SpeedRating,
          modelLayer: p.modelLayer as ModelLayer,
          sampleSize: p.sampleSize,
          confidence: p.confidence as ConfidenceLevel,
        });
      });

      const rows: CvSpeedMatrixRow[] = [];

      for (const cv of activeCvs) {
        const rowProfiles: Record<string, CvSpeedMatrixCell> = {};

        for (const style of STANDARD_STYLES) {
          for (const count of STANDARD_COUNTS) {
            const key = `${cv.id}_${style}_${count}`;
            const existing = profileMap.get(key);

            if (existing) {
              rowProfiles[`${style}_${count}`] = existing;
            } else {
              // Fast in-memory fallback (0ms) instead of heavy DB regression loop
              const baseMin = style.includes('Volume') ? 35 : 30;
              const estTotal = baseMin + Math.round(count * 0.6) + (serviceMode === 'normal_removal' ? 5 : 0);
              rowProfiles[`${style}_${count}`] = {
                totalMinutes: estTotal,
                speedRating: 'normal',
                modelLayer: 3,
                sampleSize: 0,
                confidence: 'low',
              };
            }
          }
        }

        rows.push({
          staffId: cv.id,
          staffName: cv.name,
          avatarUrl: cv.avatarUrl,
          profiles: rowProfiles,
        });
      }

      const response: CvSpeedMatrix = {
        data: rows,
        lashStyles: STANDARD_STYLES,
        lashCounts: STANDARD_COUNTS,
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV speed matrix');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải ma trận tốc độ CV.' });
    }
  });

  // 3. GET /ranking
  addRoute('get', '/ranking', async (request: SafeAny, reply: SafeAny) => {
    const {
      lashStyle = 'Classic',
      lashCount = 60,
      serviceMode = 'normal_clean',
    } = request.query as {
      lashStyle?: string;
      lashCount?: number | string;
      serviceMode?: string;
    };

    const countNum = typeof lashCount === 'string' ? parseInt(lashCount, 10) : lashCount;

    try {
      const activeCvs = await getActiveCvStaffList(fastify.prisma.crm, fastify.prisma.legacy);
      const activeCvIds = activeCvs.map((c) => c.id);

      const dbProfiles = await fastify.prisma.crm.crmCvSpeedProfile.findMany({
        where: {
          staffId: { in: activeCvIds },
          lashStyle,
          serviceMode,
          lashCount: countNum,
        },
      });

      const profileMap = new Map<number, SafeAny>();
      dbProfiles.forEach((p) => profileMap.set(p.staffId, p));

      // Batch query trend for all staff in 1 fast query instead of 34 sequential queries
      const trendMap = await getStaffTrendsBatch(fastify.prisma.legacy, activeCvIds);

      const rankingEntries = [];

      for (const cv of activeCvs) {
        const dbProf = profileMap.get(cv.id);
        let predictedTime = 60;
        let sampleSize = 0;
        let confidence: ConfidenceLevel = 'low';
        let speedRating: SpeedRating = 'normal';

        if (dbProf) {
          predictedTime = dbProf.totalMinutes;
          sampleSize = dbProf.sampleSize;
          confidence = dbProf.confidence as ConfidenceLevel;
          speedRating = dbProf.speedRating as SpeedRating;
        } else {
          // Fast in-memory fallback (0ms)
          const baseMin = lashStyle.includes('Volume') ? 35 : 30;
          predictedTime = baseMin + Math.round(countNum * 0.6) + (serviceMode === 'normal_removal' ? 5 : 0);
          sampleSize = 0;
          confidence = 'low';
          speedRating = 'normal';
        }

        const cleaningMinutes = Math.round(dbProf ? dbProf.cleaningMinutes : predictedTime * 0.15);
        const prepQcMinutes = Math.round(dbProf ? dbProf.prepQcMinutes : predictedTime * 0.1);
        const extensionMinutes = Math.max(1, predictedTime - cleaningMinutes - prepQcMinutes);

        const trend = trendMap.get(cv.id) || 'stable';

        rankingEntries.push({
          staffId: cv.id,
          staffName: cv.name,
          avatarUrl: cv.avatarUrl,
          predictedTime,
          phaseBreakdown: {
            cleaning: cleaningMinutes,
            extension: extensionMinutes,
            prepQc: prepQcMinutes,
          },
          sampleSize,
          confidence,
          speedRating,
          trend,
        });
      }

      rankingEntries.sort((a, b) => a.predictedTime - b.predictedTime);

      const response: CvSpeedRanking[] = rankingEntries.map((e, index) => ({
        rank: index + 1,
        ...e,
      }));

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV speed ranking');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy bảng xếp hạng tốc độ CV.' });
    }
  });

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

    try {
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
          AND (
            os.assigned_staff_id = ${cvId}
            OR EXISTS (SELECT 1 FROM staff_bonus sb WHERE sb.order_service_id = os.id AND sb.user_id = ${cvId})
          )
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
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
        expiresAt: now + CV_DETAIL_CACHE_TTL_MS,
      });

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV speed detail');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải chi tiết tốc độ CV.' });
    }
  });

  const handlePredict = async (
    staffId?: string | number,
    lashStyle = 'Classic',
    serviceMode = 'normal_clean',
    lashCount: string | number = 80
  ): Promise<CvSpeedPrediction> => {
    if (!staffId) {
      throw { statusCode: 400, message: 'Thiếu tham số staffId.' };
    }

    const cvId = typeof staffId === 'string' ? parseInt(staffId, 10) : staffId;
    const countNum = typeof lashCount === 'string' ? parseInt(lashCount, 10) : lashCount;

    const storedProfile = await fastify.prisma.crm.crmCvSpeedProfile.findFirst({
      where: {
        staffId: cvId,
        lashStyle,
        serviceMode,
        lashCount: countNum,
      },
    });

    if (storedProfile) {
      return {
        staffId: cvId,
        lashStyle,
        serviceMode: serviceMode as LashServiceMode,
        lashCount: countNum,
        predictedMinutes: {
          cleaning: storedProfile.cleaningMinutes,
          extension: storedProfile.extensionMinutes,
          prepQc: storedProfile.prepQcMinutes,
          total: storedProfile.totalMinutes,
        },
        modelLayer: storedProfile.modelLayer as ModelLayer,
        sampleSize: storedProfile.sampleSize,
        confidence: storedProfile.confidence as ConfidenceLevel,
        speedRating: storedProfile.speedRating as SpeedRating,
        benchmarkMinutes: storedProfile.benchmarkTotalMinutes ?? 60,
        speedDeltaPercent: storedProfile.speedDeltaPercent,
        regA: storedProfile.regA,
        regB: storedProfile.regB,
        regRSquared: storedProfile.regRSquared,
      };
    }

    return predictCvSpeed(
      fastify.prisma.crm,
      fastify.prisma.legacy,
      cvId,
      lashStyle,
      serviceMode as LashServiceMode,
      countNum
    );
  };

  // 6a. GET /predict
  addRoute('get', '/predict', async (request: SafeAny, reply: SafeAny) => {
    const {
      staffId,
      lashStyle = 'Classic',
      serviceMode = 'normal_clean',
      lashCount = 80,
    } = request.query as {
      staffId?: string;
      lashStyle?: string;
      serviceMode?: string;
      lashCount?: string | number;
    };

    try {
      const response = await handlePredict(staffId, lashStyle, serviceMode, lashCount);
      return reply.send(response);
    } catch (err: SafeAny) {
      if (err?.statusCode === 400) {
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
      fastify.log.error(err as Error, 'Error predicting CV speed');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi khi dự đoán thời gian nối mi.' });
    }
  });

  // 6b. POST /predict
  addRoute('post', '/predict', async (request: SafeAny, reply: SafeAny) => {
    const {
      staffId,
      lashStyle = 'Classic',
      serviceMode = 'normal_clean',
      lashCount = 80,
    } = (request.body as {
      staffId?: string | number;
      lashStyle?: string;
      serviceMode?: string;
      lashCount?: string | number;
    }) || {};

    try {
      const response = await handlePredict(staffId, lashStyle, serviceMode, lashCount);
      return reply.send(response);
    } catch (err: SafeAny) {
      if (err?.statusCode === 400) {
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
      fastify.log.error(err as Error, 'Error predicting CV speed');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi khi dự đoán thời gian nối mi.' });
    }
  });

  // 7. POST /seed
  addRoute('post', '/seed', async (_request: SafeAny, reply: SafeAny) => {
    try {
      const result: CvSpeedSeedResult = await runNightlyCvSpeedSeed(fastify.prisma.crm, fastify.prisma.legacy);
      return reply.send(result);
    } catch (err) {
      fastify.log.error(err as Error, 'Error triggering CV speed seed');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Lỗi khi chạy tính toán dữ liệu mẫu tốc độ CV.' });
    }
  });

  // 8. GET /seed/status
  addRoute('get', '/seed/status', async (_request: SafeAny, reply: SafeAny) => {
    try {
      const totalProfiles = await fastify.prisma.crm.crmCvSpeedProfile.count();
      const lastUpdatedRow = await fastify.prisma.crm.crmCvSpeedProfile.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });
      const staffGroup = await fastify.prisma.crm.crmCvSpeedProfile.groupBy({
        by: ['staffId'],
      });

      return reply.send({
        totalProfiles,
        activeStaffCount: staffGroup.length,
        lastUpdatedAt: lastUpdatedRow?.updatedAt ? lastUpdatedRow.updatedAt.toISOString() : null,
        isSeeded: totalProfiles > 0,
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching seed status');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy trạng thái seed.' });
    }
  });

  // 9. GET /styles
  addRoute('get', '/styles', async (_request: SafeAny, reply: SafeAny) => {
    try {
      const benchmarks = await fastify.prisma.crm.crmLashTypeBenchmark.findMany({
        orderBy: [{ lashStyle: 'asc' }, { lashCount: 'asc' }],
      });

      return reply.send({
        lashStyles: STANDARD_STYLES,
        lashCounts: STANDARD_COUNTS,
        serviceModes: STANDARD_MODES,
        benchmarksCount: benchmarks.length,
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching lash styles');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải danh sách kiểu mi.' });
    }
  });
}

export const registerCvSpeedRoutes = cvSpeedRoutes;

async function getStaffTrendsBatch(
  legacyPrisma: SafeAny,
  staffIds: number[]
): Promise<Map<number, 'improving' | 'declining' | 'stable'>> {
  const map = new Map<number, 'improving' | 'declining' | 'stable'>();
  if (!staffIds || staffIds.length === 0) return map;

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
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
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
  } catch (err) {
    // Return empty map on error
  }

  return map;
}

async function getCvAverageSpeedWindow(
  legacyPrisma: SafeAny,
  staffId: number,
  lashStyle: string,
  startMonthAgo: number,
  endMonthAgo: number
): Promise<number> {
  try {
    const rows = (await legacyPrisma.$queryRawUnsafe(`
      SELECT ROUND(AVG(COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0))) as avg_time
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN report_order_service ros ON os.id = ros.order_service_id
      LEFT JOIN report_order ro ON o.id = ro.order_id
      JOIN staff_bonus sb ON sb.order_service_id = os.id
        WHERE o.order_state = 'Completed'
          AND (os.assigned_staff_id = ${staffId} OR sb.user_id = ${staffId})
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL ${endMonthAgo} MONTH)
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) < DATE_SUB(NOW(), INTERVAL ${startMonthAgo} MONTH)
    `)) as Array<{ avg_time: number }>;

    return Number(rows[0]?.avg_time || 0);
  } catch {
    return 0;
  }
}
