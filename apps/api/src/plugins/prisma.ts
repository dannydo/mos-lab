import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client';
import { PrismaClient as CrmPrismaClient } from '../generated/crm-client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: {
      legacy: LegacyPrismaClient;
      crm: CrmPrismaClient;
    };
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (fastify: FastifyInstance) => {
  const legacy = new LegacyPrismaClient({
    datasources: {
      db: {
        url: process.env.LEGACY_DATABASE_URL,
      },
    },
  });

  const crm = new CrmPrismaClient({
    datasources: {
      db: {
        url: process.env.CRM_DATABASE_URL,
      },
    },
  });

  // Connect on start
  await Promise.all([legacy.$connect(), crm.$connect()]);

  fastify.decorate('prisma', { legacy, crm });

  // Disconnect on close
  fastify.addHook('onClose', async (instance: FastifyInstance) => {
    await Promise.all([instance.prisma.legacy.$disconnect(), instance.prisma.crm.$disconnect()]);
  });
});

export default prismaPlugin;
