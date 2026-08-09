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

  // Ensure is_foreign and is_foreign_overridden columns exist in user_profile
  try {
    const existingCols = await legacy.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profile' AND COLUMN_NAME IN ('is_foreign', 'is_foreign_overridden')
    `);
    const colNames = existingCols.map((c) => c.COLUMN_NAME);

    if (!colNames.includes('is_foreign')) {
      await legacy.$executeRawUnsafe(
        `ALTER TABLE \`user_profile\` ADD COLUMN \`is_foreign\` TINYINT(1) NOT NULL DEFAULT 0`
      );
    }
    if (!colNames.includes('is_foreign_overridden')) {
      await legacy.$executeRawUnsafe(
        `ALTER TABLE \`user_profile\` ADD COLUMN \`is_foreign_overridden\` TINYINT(1) NOT NULL DEFAULT 0`
      );
    }
  } catch (colErr) {
    console.error('[PrismaPlugin] Failed to check/add foreign columns to user_profile:', colErr);
  }

  fastify.decorate('prisma', { legacy, crm });

  // Disconnect on close
  fastify.addHook('onClose', async (instance: FastifyInstance) => {
    await Promise.all([instance.prisma.legacy.$disconnect(), instance.prisma.crm.$disconnect()]);
  });
});

export default prismaPlugin;
