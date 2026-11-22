import { FastifyInstance } from 'fastify';
import { getVatRateConfig, registerDashboardConfigRoutes } from './dashboard/dashboard-config.routes.js';
import { registerDashboardTodayRoutes } from './dashboard/dashboard-today.routes.js';
import { registerDashboardRevenueHourlyRoutes } from './dashboard/dashboard-revenue-hourly.routes.js';
import { registerDashboardRevenueDetailRoutes } from './dashboard/dashboard-revenue-detail.routes.js';

export { getVatRateConfig };

export async function registerDashboardRoutes(fastify: FastifyInstance) {
  await registerDashboardConfigRoutes(fastify);
  await registerDashboardTodayRoutes(fastify);
  await registerDashboardRevenueHourlyRoutes(fastify);
  await registerDashboardRevenueDetailRoutes(fastify);
}
