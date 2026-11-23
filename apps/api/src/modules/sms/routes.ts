import type { FastifyInstance } from 'fastify';
import { registerSmsTemplateRoutes } from './routes/sms-templates.routes.js';
import { registerSmsMessagingRoutes } from './routes/sms-messaging.routes.js';

export async function smsRoutes(fastify: FastifyInstance) {
  registerSmsTemplateRoutes(fastify);
  registerSmsMessagingRoutes(fastify);
}
