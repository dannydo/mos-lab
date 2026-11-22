import { FastifyInstance } from 'fastify';
import { registerCcRoutes } from './routes/cc.routes.js';
import { registerCcPaystubRoutes } from './routes/cc-paystub.routes.js';
import { registerCcTipRoutes } from './routes/cc-tip.routes.js';
import { registerExportRoutes } from './routes/export.routes.js';
import { registerCvRoutes } from './routes/cv.routes.js';
import { registerCvTipRoutes } from './routes/cv-tip.routes.js';
import { registerCvPaystubRoutes } from './routes/cv-paystub.routes.js';
import { registerCvSpeedRoutes } from './routes/cv-speed.routes.js';
import { registerCvDisciplineRoutes } from './routes/cv-discipline.routes.js';
import { registerBkRoutes } from './routes/bk.routes.js';
import { registerTelesaleTargetRoutes } from './routes/telesale-target.routes.js';
import { registerFinancialGoalsRoutes } from './routes/financial-goals.routes.js';
import { registerCsTipRoutes } from './routes/cs-tip.routes.js';
import { registerPackageAuditRoutes } from './routes/package-audit.routes.js';
import { registerCbTelemetryRoutes } from './routes/cb-telemetry.routes.js';
import { registerCvlTrainingMentorshipRoutes } from './routes/cvl-training-mentorship.routes.js';
import { registerBookerExportRoutes } from './kpi-routes-modules/booker-export.routes.js';
import { registerKpiConfigRoutes } from './kpi-routes-modules/kpi-config.routes.js';
import { registerKpiSummaryAndTrendsRoutes } from './kpi-routes-modules/kpi-summary-and-trends.routes.js';
import { registerKpiLeaderboardRoutes } from './kpi-routes-modules/kpi-leaderboard.routes.js';
import { registerBookerAppointmentsRoutes } from './kpi-routes-modules/booker-appointments.routes.js';

export async function kpiRoutes(fastify: FastifyInstance) {
  await registerCcRoutes(fastify);
  await registerCcPaystubRoutes(fastify);
  await registerCcTipRoutes(fastify);
  await registerExportRoutes(fastify);
  await registerCvRoutes(fastify);
  await registerCvTipRoutes(fastify);
  await registerCvPaystubRoutes(fastify);
  await registerCvSpeedRoutes(fastify);
  await registerCvDisciplineRoutes(fastify);
  await registerBkRoutes(fastify);
  await registerTelesaleTargetRoutes(fastify);
  await registerFinancialGoalsRoutes(fastify);
  await registerCsTipRoutes(fastify);
  await registerPackageAuditRoutes(fastify);
  await registerCbTelemetryRoutes(fastify);
  await registerCvlTrainingMentorshipRoutes(fastify);

  registerBookerExportRoutes(fastify);
  registerKpiConfigRoutes(fastify);
  registerKpiSummaryAndTrendsRoutes(fastify);
  registerKpiLeaderboardRoutes(fastify);
  registerBookerAppointmentsRoutes(fastify);
}
