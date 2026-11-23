import { FastifyInstance } from 'fastify';
import { registerCustomerListMainRoutes } from './list/customer-list-main.routes.js';
import { registerCustomerRandomIdsRoutes } from './list/customer-random-ids.routes.js';

export async function registerCustomerListRoutes(fastify: FastifyInstance) {
  await registerCustomerListMainRoutes(fastify);
  await registerCustomerRandomIdsRoutes(fastify);
}
