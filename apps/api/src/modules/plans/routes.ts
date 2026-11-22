import type { FastifyInstance } from 'fastify';
import { registerPlanCrudRoutes } from './routes/plan-crud.routes.js';
import { registerPlanWeeklyRoutes } from './routes/plan-weekly.routes.js';
import { registerPlanSuggestRoutes } from './routes/plan-suggest.routes.js';

export async function planRoutes(fastify: FastifyInstance) {
  registerPlanCrudRoutes(fastify);
  registerPlanWeeklyRoutes(fastify);
  registerPlanSuggestRoutes(fastify);
}
