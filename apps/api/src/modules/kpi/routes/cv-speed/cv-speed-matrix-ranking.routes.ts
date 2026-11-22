import { FastifyInstance } from 'fastify';
import {
  ConfidenceLevel,
  CvSpeedMatrix,
  CvSpeedMatrixCell,
  CvSpeedMatrixRow,
  CvSpeedProfile,
  CvSpeedRanking,
  LashServiceMode,
  ModelLayer,
  SafeAny,
  SpeedRating,
} from '@mos-lab/shared';
import { getActiveCvStaffList, runNightlyCvSpeedSeed } from '../../services/cv-speed-seed.service.js';
import {
  CV_MATRIX_CACHE_TTL_MS,
  CV_RANKING_CACHE_TTL_MS,
  STANDARD_COUNTS,
  STANDARD_STYLES,
  cvMatrixCache,
  cvRankingCache,
  getStaffOverallSpeedFactors,
  getStaffTrendsBatch,
  inFlightMatrixPromises,
  inFlightRankingPromises,
  type CvSpeedRouteRegistrar,
} from './cv-speed-cache-and-batch.js';

export function registerCvSpeedMatrixAndRankingRoutes(fastify: FastifyInstance, addRoute: CvSpeedRouteRegistrar) {
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
    // `all` is a dashboard aggregate sentinel, not a persisted profile mode. Use the
    // normal-clean matrix rather than treating every profile as missing and reseeding.
    const effectiveServiceMode: LashServiceMode =
      serviceMode === 'all' ? 'normal_clean' : (serviceMode as LashServiceMode);

    const now = Date.now();
    const cacheKey = `matrix:${effectiveServiceMode}`;
    const cached = cvMatrixCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return reply.send(cached.data);
    }

    const inFlight = inFlightMatrixPromises.get(cacheKey);
    if (inFlight) {
      const data = await inFlight;
      return reply.send(data);
    }

    const computePromise = (async () => {
      try {
        const activeCvs = await getActiveCvStaffList(fastify.prisma.crm, fastify.prisma.legacy);
        const activeCvIds = activeCvs.map((c) => c.id);

        const dbProfiles = await fastify.prisma.crm.crmCvSpeedProfile.findMany({
          where: {
            staffId: { in: activeCvIds },
            serviceMode: effectiveServiceMode,
          },
        });

        if (dbProfiles.length < activeCvs.length * STANDARD_STYLES.length * STANDARD_COUNTS.length * 0.5) {
          fastify.log.info('[CvSpeedRoutes] dbProfiles is incomplete in /matrix, triggering background seed...');
          runNightlyCvSpeedSeed(fastify.prisma.crm, fastify.prisma.legacy).catch((e) =>
            fastify.log.error(e, 'Error during background seed from /matrix')
          );
        }

        const speedFactorMap = await getStaffOverallSpeedFactors(fastify.prisma.legacy, activeCvIds);

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
          const cvRatio = speedFactorMap.get(cv.id)?.ratio || 1.0;

          for (const style of STANDARD_STYLES) {
            for (const count of STANDARD_COUNTS) {
              const key = `${cv.id}_${style}_${count}`;
              const existing = profileMap.get(key);

              if (existing) {
                rowProfiles[`${style}_${count}`] = existing;
              } else {
                // Personalized in-memory fallback based on staff member's overall working speed ratio
                const baseMin = style.includes('Volume') || style.includes('Ultralight') ? 35 : 30;
                const bmTotal = baseMin + Math.round(count * 0.6) + (effectiveServiceMode === 'normal_removal' ? 5 : 0);
                const estTotal = Math.round(bmTotal * cvRatio);
                const speedRating: SpeedRating =
                  estTotal <= bmTotal * 0.95 ? 'fast' : estTotal >= bmTotal * 1.05 ? 'slow' : 'normal';

                rowProfiles[`${style}_${count}`] = {
                  totalMinutes: estTotal,
                  speedRating,
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

        cvMatrixCache.set(cacheKey, {
          data: response,
          expiresAt: Date.now() + CV_MATRIX_CACHE_TTL_MS,
        });

        return response;
      } finally {
        inFlightMatrixPromises.delete(cacheKey);
      }
    })();

    inFlightMatrixPromises.set(cacheKey, computePromise);

    try {
      const response = await computePromise;
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
    const now = Date.now();
    const cacheKey = `ranking:${lashStyle}:${countNum}:${serviceMode}`;

    const cached = cvRankingCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return reply.send(cached.data);
    }

    const inFlight = inFlightRankingPromises.get(cacheKey);
    if (inFlight) {
      const data = await inFlight;
      return reply.send(data);
    }

    const computePromise = (async () => {
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

        if (dbProfiles.length < activeCvIds.length) {
          fastify.log.info('[CvSpeedRoutes] dbProfiles incomplete in /ranking, triggering background seed...');
          runNightlyCvSpeedSeed(fastify.prisma.crm, fastify.prisma.legacy).catch((e) =>
            fastify.log.error(e, 'Error during background seed from /ranking')
          );
        }

        const profileMap = new Map<number, SafeAny>();
        dbProfiles.forEach((p) => profileMap.set(p.staffId, p));

        // Batch query trend & overall speed factors for all staff in 1 fast parallel execution
        const [trendMap, speedFactorMap] = await Promise.all([
          getStaffTrendsBatch(fastify.prisma.legacy, activeCvIds),
          getStaffOverallSpeedFactors(fastify.prisma.legacy, activeCvIds),
        ]);

        let styleMultiplier = 1.0;
        if (lashStyle === 'Under Mink') styleMultiplier = 0.55;
        else if (lashStyle === 'Classic') styleMultiplier = 0.95;
        else if (lashStyle === 'Mink' || lashStyle === 'Flawless') styleMultiplier = 1.0;
        else if (lashStyle === 'Ivylight') styleMultiplier = 1.05;
        else if (lashStyle === 'Volume') styleMultiplier = 1.15;
        else if (lashStyle === 'Hyperlight') styleMultiplier = 1.25;
        else if (lashStyle === 'Ultralight') styleMultiplier = 1.35;

        const baseMin = Math.round((30 + Math.round(countNum * 0.6)) * styleMultiplier);
        const benchmarkTotal = baseMin + (serviceMode === 'normal_removal' ? 5 : 0);

        const rankingEntries = [];

        for (const cv of activeCvs) {
          const dbProf = profileMap.get(cv.id);
          let predictedTime: number;
          let sampleSize: number;
          let confidence: ConfidenceLevel;
          let speedRating: SpeedRating;

          if (dbProf) {
            predictedTime = dbProf.totalMinutes;
            sampleSize = dbProf.sampleSize;
            confidence = dbProf.confidence as ConfidenceLevel;
            speedRating = dbProf.speedRating as SpeedRating;
          } else {
            // Dynamic fallback adjusted by staff member's overall 12-month historical working pace
            const staffMetrics = speedFactorMap.get(cv.id);
            const staffRatio = staffMetrics?.ratio || 1.0;
            predictedTime = Math.round(benchmarkTotal * staffRatio);
            sampleSize = 0;
            confidence = 'low';
            speedRating =
              predictedTime <= benchmarkTotal * 0.95
                ? 'fast'
                : predictedTime >= benchmarkTotal * 1.05
                  ? 'slow'
                  : 'normal';
          }

          const staffMetrics = speedFactorMap.get(cv.id);
          const cleaningMinutes = Math.round(dbProf ? dbProf.cleaningMinutes : staffMetrics?.avgCleaning || 10);
          const prepQcMinutes = Math.round(dbProf ? dbProf.prepQcMinutes : staffMetrics?.avgPrepQc || 8);
          const extensionMinutes = Math.max(5, predictedTime - cleaningMinutes - prepQcMinutes);

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

        cvRankingCache.set(cacheKey, {
          data: response,
          expiresAt: Date.now() + CV_RANKING_CACHE_TTL_MS,
        });

        return response;
      } finally {
        inFlightRankingPromises.delete(cacheKey);
      }
    })();

    inFlightRankingPromises.set(cacheKey, computePromise);

    try {
      const response = await computePromise;
      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV speed ranking');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy bảng xếp hạng tốc độ CV.' });
    }
  });
}
