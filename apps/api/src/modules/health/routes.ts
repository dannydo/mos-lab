import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  // Deliberately avoids database checks: the sidebar polls this lightweight release marker.
  fastify.get('/release', async () => ({
    deployedAt: process.env.DEPLOYED_AT || null,
  }));

  fastify.get('/health', async (request, reply) => {
    try {
      // Test legacy DB connection with simple query count
      // Using queryRaw to bypass client generation issues before db pull is complete
      const legacyResult = await fastify.prisma.legacy.$queryRawUnsafe<
        Array<{ count: bigint } | { 'COUNT(*)': bigint }>
      >('SELECT COUNT(*) as count FROM user');

      const countValue = legacyResult[0];
      const count = countValue ? ('count' in countValue ? countValue.count : (countValue as SafeAny)['COUNT(*)']) : 0n;

      // Test CRM DB connection
      await fastify.prisma.crm.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        databases: {
          legacy: 'connected',
          crm: 'connected',
        },
        legacy_users: Number(count),
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Health check failed:');
      reply.status(500).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: (error as SafeAny).message || 'Database connection error',
      });
    }
  });
}
