import type { FastifyInstance } from 'fastify';
import { registerWorkshopCoreAndMenuRoutes } from './routes/workshop-core-and-menu.routes.js';
import { registerWorkshopEquipmentAndDesignRoutes } from './routes/workshop-equipment-and-designs.routes.js';
import { registerWorkshopLiveAndRewardRoutes } from './routes/workshop-live-and-rewards.routes.js';
import { registerWorkshopParticipantRoutes } from './routes/workshop-participants.routes.js';
import { requireWorkshopAccess } from './routes/workshop-route-helpers.js';
import { registerWorkshopTemplateRoutes } from './routes/workshop-templates.routes.js';

export async function academyWorkshopRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireWorkshopAccess);

  registerWorkshopTemplateRoutes(fastify);
  registerWorkshopCoreAndMenuRoutes(fastify);
  registerWorkshopEquipmentAndDesignRoutes(fastify);
  registerWorkshopParticipantRoutes(fastify);
  registerWorkshopLiveAndRewardRoutes(fastify);
}
