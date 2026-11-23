import { FastifyInstance } from 'fastify';
import { registerCustomerAssignRevokeRoutes } from './allocation/assign-revoke.routes.js';
import { registerCustomerRetainQuotaRoutes } from './allocation/retain-quota.routes.js';
import { registerCustomerAssignmentHistoryRoutes } from './allocation/assignment-history-timeline.routes.js';

export async function registerCustomerAllocationRoutes(fastify: FastifyInstance) {
  registerCustomerAssignRevokeRoutes(fastify);
  registerCustomerRetainQuotaRoutes(fastify);
  registerCustomerAssignmentHistoryRoutes(fastify);
}
