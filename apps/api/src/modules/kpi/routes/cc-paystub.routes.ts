import { FastifyInstance } from 'fastify';
import { registerCcPaystubMainRoutes } from './cc-paystub-routes/cc-paystub-main.routes.js';
import { registerCcWorkLogsRoutes } from './cc-paystub-routes/cc-work-logs.routes.js';
import { registerCcAllowanceRoutes } from './cc-paystub-routes/cc-allowances.routes.js';
import { registerCcLegacySyncRoutes } from './cc-paystub-routes/cc-legacy-sync.routes.js';

export async function registerCcPaystubRoutes(fastify: FastifyInstance) {
  registerCcPaystubMainRoutes(fastify);
  registerCcWorkLogsRoutes(fastify);
  registerCcAllowanceRoutes(fastify);
  registerCcLegacySyncRoutes(fastify);
}
