import { FastifyInstance } from 'fastify';
import { registerDashboardRoutes } from './routes/dashboard.routes.js';
import { bookingAuditRoutes } from './routes/booking-audit.routes.js';
import { registerLocaTouchpointRoutes } from './routes/loca-touchpoint.routes.js';
import { registerLocaStaffActivityRoutes } from './routes/loca-staff-activity.routes.js';
import { registerCustomerListRoutes } from './routes/customer-list.routes.js';
import { registerCustomerStatsRoutes } from './routes/customer-stats.routes.js';
import { registerCustomerMetaRoutes } from './routes/customer-meta.routes.js';
import { registerBookingRoutes } from './routes/booking.routes.js';
import { registerCustomerDetailRoutes } from './routes/customer-detail.routes.js';
import { registerCustomerNotesRoutes } from './routes/customer-notes.routes.js';
import { registerCustomerAllocationRoutes } from './routes/customer-allocation.routes.js';
import { registerAppointmentsRoutes } from './routes/appointments.routes.js';
import { registerCvStatusRoutes } from './routes/cv-status.routes.js';

export { resolveEffectiveAssignedStaffId } from './routes/helpers.js';

export async function customerRoutes(fastify: FastifyInstance) {
  // Existing sub-routes
  await registerDashboardRoutes(fastify);
  await bookingAuditRoutes(fastify);
  await registerLocaTouchpointRoutes(fastify);
  await registerLocaStaffActivityRoutes(fastify);

  // Modular domain sub-routes
  await registerCustomerListRoutes(fastify);
  await registerCustomerStatsRoutes(fastify);
  await registerCustomerMetaRoutes(fastify);
  await registerBookingRoutes(fastify);
  await registerCustomerDetailRoutes(fastify);
  await registerCustomerNotesRoutes(fastify);
  await registerCustomerAllocationRoutes(fastify);
  await registerAppointmentsRoutes(fastify);
  await registerCvStatusRoutes(fastify);
}
