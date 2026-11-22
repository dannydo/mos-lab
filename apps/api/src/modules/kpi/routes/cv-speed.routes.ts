import { FastifyInstance } from 'fastify';
import {
  clearCvSpeedCache,
  clearCvSpeedDetailCache,
  createCvSpeedRouteRegistrar,
} from './cv-speed/cv-speed-cache-and-batch.js';
import { registerCvSpeedMatrixAndRankingRoutes } from './cv-speed/cv-speed-matrix-ranking.routes.js';
import { registerCvSpeedDetailAndTrendRoutes } from './cv-speed/cv-speed-detail-trend.routes.js';
import { registerCvSpeedPredictAndSeedRoutes } from './cv-speed/cv-speed-predict-seed.routes.js';

export { clearCvSpeedCache, clearCvSpeedDetailCache };

export async function cvSpeedRoutes(fastify: FastifyInstance) {
  const addRoute = createCvSpeedRouteRegistrar(fastify);
  registerCvSpeedMatrixAndRankingRoutes(fastify, addRoute);
  registerCvSpeedDetailAndTrendRoutes(fastify, addRoute);
  registerCvSpeedPredictAndSeedRoutes(fastify, addRoute);
}

export const registerCvSpeedRoutes = cvSpeedRoutes;
