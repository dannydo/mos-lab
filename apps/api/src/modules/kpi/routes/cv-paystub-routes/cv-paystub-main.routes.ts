import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../../middlewares/auth.js';
import { createEmptyCvPaystubResponse, parseDateRange } from './cv-paystub.helpers.js';
import { fetchActiveCvStaffProfiles, fetchCvPaystubSources } from './cv-paystub.queries.js';
import { indexPaystubSources } from './cv-paystub.indexer.js';
import { buildCvPaystubResponse } from './cv-paystub.calculator.js';

export function registerCvPaystubMainRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cv-paystub
  fastify.get('/kpi/cv-paystub', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const { startPart, endPart } = parseDateRange(dateFrom, dateTo);

    try {
      const { activeCvIds, filteredStaffProfiles } = await fetchActiveCvStaffProfiles(fastify, storeId);

      if (activeCvIds.length === 0) {
        return reply.send(createEmptyCvPaystubResponse(true));
      }

      if (filteredStaffProfiles.length === 0) {
        return reply.send(createEmptyCvPaystubResponse(false));
      }

      const validStaffIds = filteredStaffProfiles.map((s) => Number(s.userId));
      const sources = await fetchCvPaystubSources(fastify, validStaffIds, startPart, endPart);
      const indexed = await indexPaystubSources(fastify, validStaffIds, startPart, endPart, sources);
      const response = buildCvPaystubResponse(filteredStaffProfiles, endPart, indexed);

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV Paystub data');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy dữ liệu CV Live Paystub.' });
    }
  });
}
