import { FastifyInstance } from 'fastify';
import { registerDailySalesBonusConfigAndConsultantRoutes } from './routes/daily-sales-bonus-config.routes.js';
import { registerDailySalesBonusTransactionsRoutes } from './routes/daily-sales-bonus-transactions.routes.js';

export async function gamificationRoutes(fastify: FastifyInstance) {
  registerDailySalesBonusConfigAndConsultantRoutes(fastify);
  registerDailySalesBonusTransactionsRoutes(fastify);
}
