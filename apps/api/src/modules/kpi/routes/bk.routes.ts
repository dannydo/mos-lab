import { FastifyInstance } from 'fastify';
import { registerBkBookingRoutes } from './bk-routes/bk-booking.routes.js';
import { registerBkDoneRoutes } from './bk-routes/bk-done.routes.js';
import { registerBkTipRoutes } from './bk-routes/bk-tip.routes.js';
import { registerBkRevenueRoutes } from './bk-routes/bk-revenue.routes.js';
import { registerBkPaystubRoutes } from './bk-routes/bk-paystub.routes.js';
import { registerBkConfigRoutes } from './bk-routes/bk-config.routes.js';
import { registerBkGameRoutes } from './bk-routes/bk-games.routes.js';

export async function registerBkRoutes(fastify: FastifyInstance) {
  registerBkBookingRoutes(fastify);
  registerBkDoneRoutes(fastify);
  registerBkTipRoutes(fastify);
  registerBkRevenueRoutes(fastify);
  registerBkPaystubRoutes(fastify);
  registerBkConfigRoutes(fastify);
  registerBkGameRoutes(fastify);
}
