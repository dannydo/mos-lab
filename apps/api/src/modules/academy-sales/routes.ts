import type { FastifyInstance } from 'fastify';
import { requireAcademyWorkspaceAccess } from './routes/academy-sales-route-helpers.js';
import { registerAcademyCampaignRoutes } from './routes/academy-campaigns.routes.js';
import { registerAcademyTalentRoutes } from './routes/academy-talent.routes.js';
import { registerAcademyLeadAndCatalogRoutes } from './routes/academy-leads-and-catalog.routes.js';

export async function academySalesRoutes(fastify: FastifyInstance) {
  // This plugin owns the complete /academy-sales surface. Guarding it here
  // means a copied URL or a raw API call cannot bypass the sidebar decision.
  fastify.addHook('preHandler', requireAcademyWorkspaceAccess);

  registerAcademyCampaignRoutes(fastify);
  registerAcademyTalentRoutes(fastify);
  registerAcademyLeadAndCatalogRoutes(fastify);
}
