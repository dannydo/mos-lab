import { FastifyInstance } from 'fastify';
import {
  ConfidenceLevel,
  CvSpeedPrediction,
  CvSpeedSeedResult,
  isAdminOrSuperAdminRole,
  LashServiceMode,
  ModelLayer,
  SafeAny,
  SpeedRating,
} from '@mos-lab/shared';
import { predictCvSpeed } from '../../services/cv-speed-model.service.js';
import { runNightlyCvSpeedSeed } from '../../services/cv-speed-seed.service.js';
import {
  STANDARD_COUNTS,
  STANDARD_MODES,
  STANDARD_STYLES,
  clearCvSpeedCache,
  type CvSpeedRouteRegistrar,
} from './cv-speed-cache-and-batch.js';

export function registerCvSpeedPredictAndSeedRoutes(fastify: FastifyInstance, addRoute: CvSpeedRouteRegistrar) {
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
  addRoute('post', '/seed', async (request: SafeAny, reply: SafeAny) => {
    if (!isAdminOrSuperAdminRole(request.user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin mới có quyền chạy seed dữ liệu tốc độ CV.',
      });
    }
    try {
      const result: CvSpeedSeedResult = await runNightlyCvSpeedSeed(fastify.prisma.crm, fastify.prisma.legacy);
      clearCvSpeedCache();
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
