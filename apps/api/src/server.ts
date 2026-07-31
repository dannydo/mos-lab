import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import compress from '@fastify/compress';
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
import { smsRoutes } from './modules/sms/routes.js';
import { allocationRoutes } from './modules/allocation/routes.js';
import { campaignRoutes } from './modules/campaigns/routes.js';
import { startRecordingAnalyzer } from './modules/omicall/analyzer.js';

// Load environment variables
dotenv.config();

// BigInt JSON serialization patch
(BigInt.prototype as unknown as SafeAny).toJSON = function () {
  return Number(this);
};

const server = Fastify({
  logger: true,
});

const start = async () => {
  try {
    // Register CORS
    await server.register(cors, {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    });

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
            description: 'Kỹ thuật viên',
          },
        ],
      });
      server.log.info('Seeded default roles successfully');
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
    await server.register(smsRoutes, { prefix: '/api' });
    await server.register(allocationRoutes, { prefix: '/api' });
    await server.register(campaignRoutes, { prefix: '/api' });

    // Start background analyzer polling for AI laugh detection
    startRecordingAnalyzer(server);

    const port = Number(process.env.PORT) || 3001;
    await server.listen({ port, host: '0.0.0.0' });

    server.log.info(`Server is running at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
