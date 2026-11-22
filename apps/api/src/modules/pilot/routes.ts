import type { FastifyInstance } from 'fastify';
import { registerPilotCatalogSopRoutes } from './routes/pilot-catalog-sop.routes.js';
import { registerPilotSessionRoutes } from './routes/pilot-sessions.routes.js';

export async function pilotRoutes(fastify: FastifyInstance) {
  registerPilotCatalogSopRoutes(fastify);
  registerPilotSessionRoutes(fastify);
}
