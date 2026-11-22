import { FastifyInstance } from 'fastify';
import { registerCvSeniorityConfigRoutes } from './cv-paystub-routes/cv-seniority-config.routes.js';
import { registerCvPaystubMainRoutes } from './cv-paystub-routes/cv-paystub-main.routes.js';
import { registerCvWorkLogsRoutes } from './cv-paystub-routes/cv-work-logs.routes.js';
import { registerCvAllowanceRoutes } from './cv-paystub-routes/cv-allowances.routes.js';

export async function registerCvPaystubRoutes(fastify: FastifyInstance) {
  registerCvSeniorityConfigRoutes(fastify);
  registerCvPaystubMainRoutes(fastify);
  registerCvWorkLogsRoutes(fastify);
  registerCvAllowanceRoutes(fastify);
}
