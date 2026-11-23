import { FastifyInstance } from 'fastify';
import { registerCustomerCrudRoutes } from './detail/customer-crud.routes.js';
import { registerCustomerDetailedRoute } from './detail/customer-detailed.routes.js';
import { registerCustomerPaginatedRoutes } from './detail/customer-paginated.routes.js';
import { registerCustomerSummaryRoute } from './detail/customer-summary.routes.js';

export async function registerCustomerDetailRoutes(fastify: FastifyInstance) {
  await registerCustomerCrudRoutes(fastify);
  await registerCustomerDetailedRoute(fastify);
  await registerCustomerSummaryRoute(fastify);
  await registerCustomerPaginatedRoutes(fastify);
}
