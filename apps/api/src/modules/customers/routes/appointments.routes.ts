import { FastifyInstance } from 'fastify';
import { registerAppointmentsListRoutes } from './appointments-routes/appointments-list.routes.js';
import { registerAppointmentsMissedRoutes } from './appointments-routes/appointments-missed.routes.js';

export async function registerAppointmentsRoutes(fastify: FastifyInstance) {
  await registerAppointmentsListRoutes(fastify);
  await registerAppointmentsMissedRoutes(fastify);
}
