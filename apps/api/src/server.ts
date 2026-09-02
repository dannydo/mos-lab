process.env.TZ = 'Asia/Ho_Chi_Minh';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import compress from '@fastify/compress';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import prismaPlugin from './plugins/prisma.js';
import cachePlugin from './plugins/cache.js';
import { healthRoutes } from './modules/health/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { customerRoutes } from './modules/customers/routes.js';
import { planRoutes } from './modules/plans/routes.js';
import { callRoutes } from './modules/calls/routes.js';
import { kpiRoutes } from './modules/kpi/routes.js';
import { staffRoutes } from './modules/staff/routes.js';
import { rolesRoutes } from './modules/roles/routes.js';
import { tableConfigRoutes } from './modules/table-config/routes.js';
import { omicallRoutes } from './modules/omicall/routes.js';
import { gamificationRoutes } from './modules/gamification/routes.js';
import { catalogRoutes } from './modules/catalog/routes.js';
import { teamRoutes } from './modules/teams/routes.js';
import { menuAccessRoutes } from './modules/menu-access/routes.js';
import { smsRoutes } from './modules/sms/routes.js';
import { allocationRoutes } from './modules/allocation/routes.js';
import { campaignRoutes } from './modules/campaigns/routes.js';
import { csRoutes } from './modules/cs/routes.js';
import { qaShopRoutes } from './modules/qa-shop/routes.js';
import { falRoutes } from './modules/fal/routes.js';
import { postHubRoutes } from './modules/post-hub/routes.js';
import { academySalesRoutes } from './modules/academy-sales/routes.js';
import { academyWorkshopRoutes } from './modules/academy-workshops/routes.js';
import { academyWorkshopPublicRoutes } from './modules/academy-workshops/public.routes.js';
import { holidayWorkRoutes } from './modules/holiday-work/routes.js';
import { uiExperienceRoutes } from './modules/ui-experiences/routes.js';
import { bugReportRoutes } from './modules/bug-reports/routes.js';
import { startBugReportCleanup } from './modules/bug-reports/bug-report.service.js';
import { RequestClassificationService } from './modules/bug-reports/request-classification.service.js';
import { startPancakeAcademySync } from './modules/academy-sales/pancake-sync.service.js';
import { startRecordingAnalyzer } from './modules/omicall/analyzer.js';

import { CampaignPromotionSyncService } from './modules/campaigns/campaign-promotion-sync.service.js';

// Load environment variables
dotenv.config();

// BigInt JSON serialization patch
(BigInt.prototype as unknown as SafeAny).toJSON = function () {
  return Number(this);
};

const server = Fastify({
  logger: true,
  bodyLimit: 50 * 1024 * 1024, // 50MB payload limit for audit submissions with photos
});

function isDevelopmentLanOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || url.port !== '4000') return false;
    if (/^10\./.test(url.hostname) || /^192\.168\./.test(url.hostname)) return true;
    const match = url.hostname.match(/^172\.(\d{1,2})\./);
    return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
  } catch {
    return false;
  }
}

const start = async () => {
  try {
    // Register CORS
    const configuredCorsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
    await server.register(cors, {
      origin: (origin, callback) => {
        callback(null, !origin || origin === configuredCorsOrigin || isDevelopmentLanOrigin(origin));
      },
      credentials: true,
    });

    // Must be registered before any route which opts into websocket handling.
    await server.register(websocket);

    // Register JWT
    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'super_secret_mos_lab_jwt_key_development_only',
    });

    // Register Swagger Documentation
    await server.register(swagger, {
      openapi: {
        info: {
          title: 'mos-lab CRM API',
          description: 'Fastify Backend API for mos-lab CRM & KPI Gamification Platform',
          version: '1.0.0',
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    });

    await server.register(swaggerUi, {
      routePrefix: '/documentation',
    });

    // Register Compression (Gzip / Brotli)
    await server.register(compress, {
      threshold: 1024, // Only compress responses larger than 1KB
      global: true,
    });

    // Register In-Memory Cache Plugin
    await server.register(cachePlugin);

    // Register Prisma plugin
    await server.register(prismaPlugin);

    // Seed default roles if empty
    const roleCount = await server.prisma.crm.crmRole.count();
    if (roleCount === 0) {
      await server.prisma.crm.crmRole.createMany({
        data: [
          {
            key: 'super_admin',
            name: 'Super Admin',
            color: 'magenta',
            viewKPI: true,
            viewTeamKPI: true,
            manageStaff: true,
            isSystem: true,
            description: 'Quản trị tối cao: cấu hình quyền hệ thống và audit bảo mật',
          },
          {
            key: 'admin',
            name: 'Administrator',
            color: 'red',
            viewKPI: true,
            viewTeamKPI: true,
            manageStaff: true,
            isSystem: true,
            description: 'Toàn quyền quản trị hệ thống',
          },
          {
            key: 'manager',
            name: 'Manager',
            color: 'purple',
            viewKPI: true,
            viewTeamKPI: true,
            manageStaff: false,
            isSystem: true,
            description: 'Quản lý bộ phận',
          },
          {
            key: 'oc',
            name: 'Operations Coordinator',
            color: 'blue',
            viewKPI: true,
            viewTeamKPI: true,
            manageStaff: false,
            isSystem: true,
            description: 'Điều phối vận hành',
          },
          {
            key: 'cc',
            name: 'Customer Care',
            color: 'cyan',
            viewKPI: true,
            viewTeamKPI: false,
            manageStaff: false,
            isSystem: true,
            description: 'Chăm sóc khách hàng',
          },
          {
            key: 'ls',
            name: 'Leader Sales',
            color: 'gold',
            viewKPI: true,
            viewTeamKPI: true,
            manageStaff: false,
            isSystem: true,
            description: 'Trưởng nhóm Telesales',
          },
          {
            key: 'telesales',
            name: 'Telesales Executive',
            color: 'orange',
            viewKPI: true,
            viewTeamKPI: false,
            manageStaff: false,
            isSystem: true,
            description: 'Nhân viên Telesales',
          },
          {
            key: 'technician',
            name: 'Technician',
            color: 'green',
            viewKPI: false,
            viewTeamKPI: false,
            manageStaff: false,
            isSystem: true,
            description: 'Chuyên viên',
          },
          {
            key: 'qa_qc',
            name: 'QA & QC',
            color: 'purple',
            viewKPI: true,
            viewTeamKPI: true,
            manageStaff: false,
            isSystem: true,
            description: 'Kiểm soát & Đảm bảo chất lượng',
          },
        ],
      });
      server.log.info('Seeded default roles successfully');
    } else {
      // Ensure system roles introduced after the initial seed also exist.
      const missingSystemRoles = [
        {
          key: 'super_admin',
          name: 'Super Admin',
          color: 'magenta',
          viewKPI: true,
          viewTeamKPI: true,
          manageStaff: true,
          isSystem: true,
          description: 'Quản trị tối cao: cấu hình quyền hệ thống và audit bảo mật',
        },
        {
          key: 'qa_qc',
          name: 'QA & QC',
          color: 'purple',
          viewKPI: true,
          viewTeamKPI: true,
          manageStaff: false,
          isSystem: true,
          description: 'Kiểm soát & Đảm bảo chất lượng',
        },
      ];
      for (const systemRole of missingSystemRoles) {
        const existingRole = await server.prisma.crm.crmRole.findUnique({ where: { key: systemRole.key } });
        if (!existingRole) {
          await server.prisma.crm.crmRole.create({ data: systemRole });
          server.log.info(`Auto-seeded missing ${systemRole.key} role successfully`);
        }
      }
    }

    // Register routes
    await server.register(healthRoutes, { prefix: '/api' });
    await server.register(authRoutes, { prefix: '/api' });
    await server.register(customerRoutes, { prefix: '/api' });
    await server.register(planRoutes, { prefix: '/api' });
    await server.register(callRoutes, { prefix: '/api' });
    await server.register(kpiRoutes, { prefix: '/api' });
    await server.register(staffRoutes, { prefix: '/api' });
    await server.register(rolesRoutes, { prefix: '/api' });
    await server.register(tableConfigRoutes, { prefix: '/api' });
    await server.register(omicallRoutes, { prefix: '/api' });
    await server.register(gamificationRoutes, { prefix: '/api' });
    await server.register(catalogRoutes, { prefix: '/api' });
    await server.register(teamRoutes, { prefix: '/api' });
    await server.register(menuAccessRoutes, { prefix: '/api' });
    await server.register(smsRoutes, { prefix: '/api' });
    await server.register(allocationRoutes, { prefix: '/api' });
    await server.register(campaignRoutes, { prefix: '/api' });
    await server.register(csRoutes, { prefix: '/api' });
    await server.register(qaShopRoutes, { prefix: '/api' });
    await server.register(falRoutes, { prefix: '/api' });
    await server.register(postHubRoutes, { prefix: '/api' });
    await server.register(academySalesRoutes, { prefix: '/api' });
    await server.register(academyWorkshopRoutes, { prefix: '/api' });
    await server.register(academyWorkshopPublicRoutes, { prefix: '/api' });
    await server.register(holidayWorkRoutes, { prefix: '/api' });
    await server.register(uiExperienceRoutes, { prefix: '/api' });
    await server.register(bugReportRoutes, { prefix: '/api' });

    startPancakeAcademySync(server);

    // Start background analyzer polling for AI laugh detection
    startRecordingAnalyzer(server);
    startBugReportCleanup(server);
    const cleanupClassifications = () =>
      RequestClassificationService.cleanupExpired(server).catch((error) =>
        server.log.warn({ error }, 'Request classification cleanup failed')
      );
    const classificationCleanupInitial = setTimeout(cleanupClassifications, 45_000);
    classificationCleanupInitial.unref();
    const classificationCleanupInterval = setInterval(cleanupClassifications, 10 * 60 * 1000);
    classificationCleanupInterval.unref();

    // Run backfill migration for existing CRM promotions to sync to legacy DB
    CampaignPromotionSyncService.backfillExistingPromotions(server).catch((err) => {
      server.log.warn('Backfill campaign promotions error:', err);
    });

    const port = Number(process.env.PORT) || 3001;
    await server.listen({ port, host: '0.0.0.0' });

    server.log.info(`Server is running at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
