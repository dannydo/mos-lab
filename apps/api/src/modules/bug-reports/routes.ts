import type { FastifyInstance } from 'fastify';
import { registerBugReportIdeBridgeRoutes } from './routes/bug-report-ide-bridge.routes.js';
import { registerBugReportInboxAdminRoutes } from './routes/bug-report-inbox-admin.routes.js';
import { registerBugReportReporterRoutes } from './routes/bug-report-reporter.routes.js';
import {
  canManageBugInbox,
  canReadBugInbox,
  consumeClassifierWorkerRateLimit,
  isValidAgentAuthorization,
} from './routes/bug-report-route-guards.js';
import { registerBugReportWorkerAgentRoutes } from './routes/bug-report-worker-agent.routes.js';
import { registerBugReportWorkerImplRoutes } from './routes/bug-report-worker-impl.routes.js';

export { canManageBugInbox, canReadBugInbox, consumeClassifierWorkerRateLimit, isValidAgentAuthorization };

export async function bugReportRoutes(fastify: FastifyInstance) {
  registerBugReportIdeBridgeRoutes(fastify);
  registerBugReportReporterRoutes(fastify);
  registerBugReportInboxAdminRoutes(fastify);
  registerBugReportWorkerAgentRoutes(fastify);
  registerBugReportWorkerImplRoutes(fastify);
}
