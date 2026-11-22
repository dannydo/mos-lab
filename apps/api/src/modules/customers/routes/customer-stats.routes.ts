import { FastifyInstance } from 'fastify';
import { registerCustomerGeneralStatsRoutes } from './customer-stats-routes/customer-stats-general.routes.js';
import { registerCustomerLocaStatsRoutes } from './customer-stats-routes/customer-loca-stats.routes.js';
import { registerCustomerNycStatsRoutes } from './customer-stats-routes/customer-nyc-stats.routes.js';

export type {
  CustomerStatsQuery,
  CustomerStatsResult,
  CampaignStatsResult,
} from './customer-stats-routes/customer-stats.types.js';

export async function registerCustomerStatsRoutes(fastify: FastifyInstance) {
  await registerCustomerGeneralStatsRoutes(fastify);
  await registerCustomerLocaStatsRoutes(fastify);
  await registerCustomerNycStatsRoutes(fastify);
}
