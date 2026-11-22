import { FastifyInstance } from 'fastify';
import { registerBookingCreateRoutes } from './booking-routes/booking-create.routes.js';
import { registerBookingLifecycleRoutes } from './booking-routes/booking-lifecycle.routes.js';
import { registerBookingUpdateRoutes } from './booking-routes/booking-update.routes.js';
import { registerBookingSlotsRoutes } from './booking-routes/booking-slots.routes.js';

export async function registerBookingRoutes(fastify: FastifyInstance) {
  await registerBookingCreateRoutes(fastify);
  await registerBookingLifecycleRoutes(fastify);
  await registerBookingUpdateRoutes(fastify);
  await registerBookingSlotsRoutes(fastify);
}
