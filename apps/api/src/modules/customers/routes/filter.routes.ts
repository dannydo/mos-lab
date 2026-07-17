import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';

export async function registerFilterRoutes(fastify: FastifyInstance) {
  // GET /api/saved-filters
  // Retrieve saved customer filters
  fastify.get('/saved-filters', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
      });
      if (!config) {
        return [];
      }
      return JSON.parse(config.value);
    } catch (error) {
      fastify.log.error(error as Error, 'Get saved filters error:');
      return [];
    }
  });

  // POST /api/saved-filters
  // Save or update a filter
  fastify.post('/saved-filters', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, name, criteria } = request.body as {
      id?: string;
      name: string;
      criteria: SafeAny;
    };

    if (!name || !criteria) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Name and criteria are required' });
    }

    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
      });

      let filters: SafeAny[] = [];
      if (config) {
        filters = JSON.parse(config.value);
      }

      const filterId = id || Math.random().toString(36).substring(2, 9);
      const newFilter = {
        id: filterId,
        name,
        criteria,
        createdAt: new Date().toISOString(),
      };

      if (id) {
        const idx = filters.findIndex((f) => f.id === id);
        if (idx > -1) {
          filters[idx] = newFilter;
        } else {
          filters.push(newFilter);
        }
      } else {
        filters.push(newFilter);
      }

      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
        update: { value: JSON.stringify(filters) },
        create: { key: 'CUSTOMER_SAVED_FILTERS', value: JSON.stringify(filters) },
      });

      return newFilter;
    } catch (error) {
      fastify.log.error(error as Error, 'Save filter error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to save filter' });
    }
  });

  // DELETE /api/saved-filters/:id
  // Delete a saved filter
  fastify.delete('/saved-filters/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
      });

      if (!config) {
        return reply.status(404).send({ error: 'Not Found', message: 'Filters not found' });
      }

      let filters: SafeAny[] = JSON.parse(config.value);
      filters = filters.filter((f) => f.id !== id);

      await fastify.prisma.crm.crmConfig.update({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
        data: { value: JSON.stringify(filters) },
      });

      return { success: true };
    } catch (error) {
      fastify.log.error(error as Error, 'Delete filter error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to delete filter' });
    }
  });
}
