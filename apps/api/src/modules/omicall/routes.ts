import type { FastifyInstance } from 'fastify';
import { registerOmicallWebhookRoutes } from './routes/omicall-webhook.routes.js';
import { registerOmicallConfigRoutes } from './routes/omicall-config.routes.js';
import { registerOmicallLogRoutes } from './routes/omicall-logs.routes.js';
import { registerOmicallRatingRoutes } from './routes/omicall-rating.routes.js';

export async function omicallRoutes(fastify: FastifyInstance) {
  registerOmicallWebhookRoutes(fastify);
  registerOmicallConfigRoutes(fastify);
  registerOmicallLogRoutes(fastify);
  registerOmicallRatingRoutes(fastify);
}
