import { FastifyInstance } from 'fastify';
import { registerCvTipLeaderboardRoutes } from './cv-tip-routes/cv-tip-leaderboard.routes.js';
import { registerCvTipRecordsRoutes } from './cv-tip-routes/cv-tip-records.routes.js';
import { registerCvTipCustomerHistoryRoutes } from './cv-tip-routes/cv-tip-customer-history.routes.js';

export async function registerCvTipRoutes(fastify: FastifyInstance) {
  registerCvTipLeaderboardRoutes(fastify);
  registerCvTipRecordsRoutes(fastify);
  registerCvTipCustomerHistoryRoutes(fastify);
}
