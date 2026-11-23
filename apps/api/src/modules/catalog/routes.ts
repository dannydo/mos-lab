import { FastifyInstance } from 'fastify';
import { CustomerServiceFilterCatalogService } from '../customers/services/customer-service-filter-catalog.service.js';
import { registerCatalogAnalyticsRoutes } from './routes/catalog-analytics.routes.js';
import { registerCatalogBenchmarksAndBranchesRoutes } from './routes/catalog-benchmarks-and-branches.routes.js';
import { registerCatalogCombosRoutes } from './routes/catalog-combos.routes.js';
import { registerCatalogProductsRoutes } from './routes/catalog-products.routes.js';
import { registerCatalogServicesRoutes } from './routes/catalog-services.routes.js';

export async function catalogRoutes(fastify: FastifyInstance) {
  // Invalidate cached customer service filter options whenever catalog metadata mutates
  fastify.addHook('onResponse', async (request, reply) => {
    if (request.method !== 'GET' && reply.statusCode < 400) {
      CustomerServiceFilterCatalogService.invalidateOptionsCache(fastify);
    }
  });

  registerCatalogServicesRoutes(fastify);
  registerCatalogCombosRoutes(fastify);
  registerCatalogProductsRoutes(fastify);
  registerCatalogAnalyticsRoutes(fastify);
  registerCatalogBenchmarksAndBranchesRoutes(fastify);
}
