// Campaign Routes
import { FastifyInstance } from 'fastify';
import { registerCampaignLifecycleRoutes } from './routes/campaign-lifecycle.routes.js';
import { registerCampaignCustomersAndPromotionsRoutes } from './routes/campaign-customers-promotions.routes.js';
import { registerCampaignSharedPoolRoutes } from './routes/campaign-shared-pool.routes.js';

export async function campaignRoutes(fastify: FastifyInstance) {
  registerCampaignLifecycleRoutes(fastify);
  registerCampaignCustomersAndPromotionsRoutes(fastify);
  registerCampaignSharedPoolRoutes(fastify);
}
