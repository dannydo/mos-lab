import { FastifyInstance } from 'fastify';
import { getManagedStaffIdsForManager, maskStaffSensitiveData } from './staff-routes-modules/staff-access.helpers.js';
import { registerStaffAvatarRoutes } from './staff-routes-modules/staff-avatar.routes.js';
import { registerStaffCreateDeleteRoutes } from './staff-routes-modules/staff-create-delete.routes.js';
import { registerStaffLegacySyncRoutes } from './staff-routes-modules/staff-legacy-sync.routes.js';
import { registerStaffMergeRoutes } from './staff-routes-modules/staff-merge.routes.js';
import { registerStaffOffDayRoutes } from './staff-routes-modules/staff-off-days.routes.js';
import { registerStaffOnboardingRoutes } from './staff-routes-modules/staff-onboarding.routes.js';
import { registerStaffReadRoutes } from './staff-routes-modules/staff-read.routes.js';
import { registerStaffUpdateRoutes } from './staff-routes-modules/staff-update.routes.js';

export { getManagedStaffIdsForManager, maskStaffSensitiveData };

export async function staffRoutes(fastify: FastifyInstance) {
  registerStaffReadRoutes(fastify);
  registerStaffCreateDeleteRoutes(fastify);
  registerStaffUpdateRoutes(fastify);
  registerStaffOnboardingRoutes(fastify);
  registerStaffLegacySyncRoutes(fastify);
  registerStaffMergeRoutes(fastify);
  registerStaffOffDayRoutes(fastify);
  registerStaffAvatarRoutes(fastify);
}
